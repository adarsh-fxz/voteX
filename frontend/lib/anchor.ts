import { AnchorProvider, type Idl, Program } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";
import type { Votex } from "@/types/votex";
import idl from "@/lib/idl/votex.json";
import { VOTEX_PROGRAM_ID } from "@/lib/constants";

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
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new Program(idl as Idl, provider);
}
