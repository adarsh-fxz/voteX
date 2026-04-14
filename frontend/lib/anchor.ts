import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import {
  Connection,
  PublicKey,
  SendTransactionError,
  Transaction,
  VersionedTransaction,
  type BlockhashWithExpiryBlockHeight,
  type ConfirmOptions,
  type Signer,
  type TransactionSignature,
} from "@solana/web3.js";
import type { Votex } from "@/types/votex";
import idl from "@/lib/idl/votex.json";
import { VOTEX_PROGRAM_ID } from "@/lib/constants";

/** Anchor's internal options shape (includes blockhash strategy when set by `.rpc()`). */
type ConfirmOpts = ConfirmOptions & {
  blockhash?: BlockhashWithExpiryBlockHeight;
};

class RawTransactionFailedError extends Error {
  constructor(
    message: string,
    readonly signature: string,
    readonly rawTransaction: Buffer,
  ) {
    super(message);
    this.name = "RawTransactionFailedError";
  }
}

function signatureFromSerializedTx(raw: Buffer): string {
  try {
    const vtx = VersionedTransaction.deserialize(raw);
    const sig = vtx.signatures[0];
    if (!sig) throw new Error("missing signature");
    return bs58.encode(sig);
  } catch {
    const leg = Transaction.from(raw);
    if (!leg.signature) throw new Error("missing signature");
    return bs58.encode(leg.signature);
  }
}

function maxSupportedTxVersionFromRaw(raw: Buffer): number | undefined {
  try {
    VersionedTransaction.deserialize(raw);
    return 0;
  } catch {
    return undefined;
  }
}

async function confirmOnce(
  connection: Connection,
  signature: string,
  options: ConfirmOpts | undefined,
): Promise<{ err: unknown }> {
  const o = options ?? {};
  if (o.blockhash) {
    const strategy = { signature, ...o.blockhash };
    if (o.maxRetries === 0) {
      const res = await connection.confirmTransaction(
        { ...strategy, abortSignal: AbortSignal.timeout(15_000) },
        o.commitment,
      );
      return { err: res.value.err };
    }
    const res = await connection.confirmTransaction(strategy, o.commitment);
    return { err: res.value.err };
  }
  const res = await connection.confirmTransaction(signature, o.commitment);
  return { err: res.value.err };
}

/**
 * Anchor's bundled `sendAndConfirmRawTransaction` retries the whole try/catch including
 * `sendRawTransaction`. After a confirmation timeout the tx may already be on-chain; the
 * resend then fails with "This transaction has already been processed". We send once and
 * only retry confirmation.
 */
async function safeSendAndConfirmRawTransaction(
  connection: Connection,
  rawTransaction: Buffer,
  options?: ConfirmOpts,
): Promise<string> {
  const sendOptions = options
    ? {
        skipPreflight: options.skipPreflight,
        preflightCommitment:
          options.preflightCommitment ?? options.commitment,
        maxRetries: options.maxRetries,
        minContextSlot: options.minContextSlot,
      }
    : {};

  let signature: string;
  try {
    signature = await connection.sendRawTransaction(rawTransaction, sendOptions);
  } catch (e) {
    if (
      e instanceof SendTransactionError &&
      /already been processed/i.test(e.message)
    ) {
      signature = signatureFromSerializedTx(rawTransaction);
    } else {
      throw e;
    }
  }

  const start = Date.now();
  while (Date.now() - start < 60_000) {
    try {
      const { err } = await confirmOnce(connection, signature, options);
      if (err) {
        throw new RawTransactionFailedError(
          `Raw transaction ${signature} failed (${JSON.stringify(err)})`,
          signature,
          rawTransaction,
        );
      }
      return signature;
    } catch (e) {
      if (e instanceof RawTransactionFailedError) throw e;
      if (e instanceof Error && e.name === "TimeoutError") continue;
      throw e;
    }
  }

  throw new Error("Transaction failed to confirm in 60s");
}

async function enrichFailedTxError(
  connection: Connection,
  err: RawTransactionFailedError,
): Promise<never> {
  const maxVer = maxSupportedTxVersionFromRaw(err.rawTransaction);
  const failedTx = await connection.getTransaction(err.signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: maxVer,
  });
  const logs = failedTx?.meta?.logMessages;
  if (logs?.length) {
    throw new SendTransactionError({
      action: "send",
      signature: err.signature,
      transactionMessage: err.message,
      logs,
    });
  }
  throw err;
}

/**
 * Same as AnchorProvider but fixes duplicate `sendRawTransaction` on confirmation timeout.
 */
class SafeSendAnchorProvider extends AnchorProvider {
  override async sendAndConfirm(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[],
    opts?: ConfirmOpts,
  ): Promise<TransactionSignature> {
    const o = opts ?? this.opts;
    if (tx instanceof VersionedTransaction) {
      if (signers?.length) tx.sign(signers);
    } else {
      tx.feePayer = tx.feePayer ?? this.wallet.publicKey;
      tx.recentBlockhash = (
        await this.connection.getLatestBlockhash(o.preflightCommitment)
      ).blockhash;
      if (signers?.length) {
        for (const s of signers) {
          tx.partialSign(s);
        }
      }
    }
    const signed = await this.wallet.signTransaction(tx);
    const rawTx = Buffer.from(signed.serialize());
    try {
      return await safeSendAndConfirmRawTransaction(
        this.connection,
        rawTx,
        o,
      );
    } catch (e) {
      if (e instanceof RawTransactionFailedError) {
        await enrichFailedTxError(this.connection, e);
      }
      throw e;
    }
  }

  override async sendAll(
    txWithSigners: {
      tx: Transaction | VersionedTransaction;
      signers?: Signer[];
    }[],
    opts?: ConfirmOpts,
  ): Promise<TransactionSignature[]> {
    const o = opts ?? this.opts;
    const recentBlockhash = (
      await this.connection.getLatestBlockhash(o.preflightCommitment)
    ).blockhash;

    const txs = txWithSigners.map((r) => {
      if (r.tx instanceof VersionedTransaction) {
        const vtx = r.tx;
        if (r.signers?.length) vtx.sign(r.signers);
        return vtx;
      }
      const leg = r.tx;
      const extra = r.signers ?? [];
      leg.feePayer = leg.feePayer ?? this.wallet.publicKey;
      leg.recentBlockhash = recentBlockhash;
      extra.forEach((kp) => {
        leg.partialSign(kp);
      });
      return leg;
    });

    const signedTxs = await this.wallet.signAllTransactions(txs);
    const sigs: TransactionSignature[] = [];

    for (let k = 0; k < signedTxs.length; k += 1) {
      const signed = signedTxs[k];
      const rawTx = Buffer.from(signed.serialize());
      try {
        sigs.push(
          await safeSendAndConfirmRawTransaction(this.connection, rawTx, o),
        );
      } catch (e) {
        if (e instanceof RawTransactionFailedError) {
          await enrichFailedTxError(this.connection, e);
        }
        throw e;
      }
    }
    return sigs;
  }
}

export function votexProgramId(): PublicKey {
  return new PublicKey(VOTEX_PROGRAM_ID);
}

// Read-only program (fetch accounts, simulate).
export function createReadonlyProgram(connection: Connection): Program<Votex> {
  const w: AnchorWallet = {
    publicKey: PublicKey.default,
    signTransaction: async <T extends Transaction | VersionedTransaction>(
      tx: T,
    ) => tx,
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      txs: T[],
    ) => txs,
  };
  const provider = new AnchorProvider(connection, w, {
    commitment: "confirmed",
  });
  return new Program(idl as Idl, provider);
}

export function createProgram(
  connection: Connection,
  wallet: AnchorWallet,
): Program<Votex> {
  const provider = new SafeSendAnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new Program(idl as Idl, provider);
}
