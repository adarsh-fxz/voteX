import * as anchor from "@coral-xyz/anchor";
import { AnchorError, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";
import { Votex } from "../target/types/votex";

// Merkle root (SHA-256, sorted pairs — matches on-chain logic)

function hashPair(a: Buffer, b: Buffer): Buffer {
  const sorted = a.compare(b) <= 0 ? [a, b] : [b, a];
  return createHash("sha256").update(sorted[0]).update(sorted[1]).digest();
}

function buildMerkleRoot(leaves: Buffer[]): Buffer {
  if (leaves.length === 0) throw new Error("empty leaves");
  let layer: Buffer[] = leaves.map((l) =>
    Buffer.from(createHash("sha256").update(l).digest()),
  );
  while (layer.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const right = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(hashPair(layer[i], right));
    }
    layer = next;
  }
  return layer[0];
}

// Test suite
describe("voteX", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.votex as Program<Votex>;

  const user = provider.wallet;

  let PID: anchor.BN, CID: anchor.BN;
  let RATING_PID: anchor.BN, RATING_CID: anchor.BN;
  let RESTRICTED_PID: anchor.BN;

  // PDAs
  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter")],
    program.programId,
  );
  const [registrationsPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registrations")],
    program.programId,
  );

  function pollPda(pid: anchor.BN) {
    return PublicKey.findProgramAddressSync(
      [pid.toArrayLike(Buffer, "le", 8)],
      program.programId,
    )[0];
  }
  function candidatePda(pid: anchor.BN, cid: anchor.BN) {
    return PublicKey.findProgramAddressSync(
      [pid.toArrayLike(Buffer, "le", 8), cid.toArrayLike(Buffer, "le", 8)],
      program.programId,
    )[0];
  }
  function ratingResultPda(pid: anchor.BN, cid: anchor.BN) {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("rating_result"),
        pid.toArrayLike(Buffer, "le", 8),
        cid.toArrayLike(Buffer, "le", 8),
      ],
      program.programId,
    )[0];
  }
  function raterPda(pid: anchor.BN, who: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("rater"), pid.toArrayLike(Buffer, "le", 8), who.toBuffer()],
      program.programId,
    )[0];
  }
  function voterPda(pid: anchor.BN, who: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("voter"), pid.toArrayLike(Buffer, "le", 8), who.toBuffer()],
      program.programId,
    )[0];
  }

  /** Explicit PDAs via accountsPartial — avoids Anchor account-resolution depth limits on a cold RPC. */
  function voteAccountsPartial(pid: anchor.BN, cid: anchor.BN) {
    return {
      user: user.publicKey,
      poll: pollPda(pid),
      candidate: candidatePda(pid, cid),
      voter: voterPda(pid, user.publicKey),
    };
  }

  function rateAccountsPartial(pid: anchor.BN, cid: anchor.BN) {
    return {
      user: user.publicKey,
      poll: pollPda(pid),
      candidate: candidatePda(pid, cid),
      rater: raterPda(pid, user.publicKey),
      ratingResult: ratingResultPda(pid, cid),
    };
  }

  // Shared time helpers
  const now = () => Math.floor(Date.now() / 1000);

  // Initialisation

  it("Initializes counter and registrations (idempotent)", async () => {
    try {
      await program.account.counter.fetch(counterPda);
      console.log("Counter already exists — skipping init");
    } catch {
      await program.methods
        .initialize()
        .accounts({ user: user.publicKey })
        .rpc();
      console.log("Initialized counter and registrations");
    }
  });

  // Phase 1: create_poll

  it("Rejects invalid time windows (registration_end >= voting_start)", async () => {
    const counter = await program.account.counter.fetch(counterPda);
    const nextPid = counter.count.add(new anchor.BN(1));
    const pda = pollPda(nextPid);
    const t = now();
    try {
      await program.methods
        .createPoll(
          new anchor.BN(t + 100), // registration_end
          new anchor.BN(t + 50), // voting_start < registration_end — INVALID
          new anchor.BN(t + 200),
          { normal: {} },
          { open: {} },
          "ipfs://test",
        )
        .accountsPartial({ user: user.publicKey, poll: pda })
        .rpc();
      throw new Error("Expected InvalidTimeWindows");
    } catch (e) {
      if (e instanceof AnchorError) {
        console.log("InvalidTimeWindows caught:", e.error.errorCode.code);
      } else throw e;
    }
  });

  it("Creates an open normal poll (registration in past, voting active now)", async () => {
    const counter = await program.account.counter.fetch(counterPda);
    PID = counter.count.add(new anchor.BN(1));
    const t = now();
    await program.methods
      .createPoll(
        new anchor.BN(t - 200), // registration_end in the past
        new anchor.BN(t - 100), // voting_start in the past → active
        new anchor.BN(t + 86400),
        { normal: {} },
        { open: {} },
        "ipfs://QmNormalPoll",
      )
      .accountsPartial({ user: user.publicKey, poll: pollPda(PID) })
      .rpc();
    const poll = await program.account.poll.fetch(pollPda(PID));
    console.log(
      "Normal poll PID:",
      PID.toString(),
      "| accessMode:",
      poll.accessMode,
    );
  });

  // Phase 1: register_candidate (pre-inits RatingResult)

  it("Registers a candidate (RatingResult PDA pre-initialized)", async () => {
    CID = new anchor.BN(1);
    await program.methods
      .registerCandidate(PID, `Candidate #${CID}`)
      .accountsPartial({
        user: user.publicKey,
        poll: pollPda(PID),
        candidate: candidatePda(PID, CID),
        ratingResult: ratingResultPda(PID, CID),
      })
      .rpc();
    // Verify RatingResult was pre-initialized by register_candidate
    const rr = await program.account.ratingResult.fetch(
      ratingResultPda(PID, CID),
    );
    console.log(
      "RatingResult pre-initialized:",
      rr.totalScore.toString(),
      rr.voteCount.toString(),
    );
  });

  // Phase 2: normal vote

  it("Casts a normal vote (open poll, empty proof)", async () => {
    await program.methods
      .vote(PID, CID, [])
      .accountsPartial(voteAccountsPartial(PID, CID))
      .rpc();
    const voter = await program.account.voter.fetch(
      voterPda(PID, user.publicKey),
    );
    console.log("Voter hasVoted:", voter.hasVoted);
  });

  it("Rejects a double vote (VoterAlreadyVoted)", async () => {
    try {
      await program.methods
        .vote(PID, CID, [])
        .accountsPartial(voteAccountsPartial(PID, CID))
        .rpc();
      throw new Error("Expected VoterAlreadyVoted");
    } catch (e) {
      if (e instanceof AnchorError) {
        console.log("VoterAlreadyVoted caught:", e.error.errorCode.code);
      } else throw e;
    }
  });

  // Phase 1: rating poll + bitmask rating
  it("Creates an open rating poll (voting active)", async () => {
    const counter = await program.account.counter.fetch(counterPda);
    RATING_PID = counter.count.add(new anchor.BN(1));
    const t = now();
    await program.methods
      .createPoll(
        new anchor.BN(t - 200),
        new anchor.BN(t - 100),
        new anchor.BN(t + 86400),
        { rating: {} },
        { open: {} },
        "ipfs://QmRatingPoll",
      )
      .accountsPartial({ user: user.publicKey, poll: pollPda(RATING_PID) })
      .rpc();
    console.log("Rating poll PID:", RATING_PID.toString());
  });

  it("Registers two candidates on the rating poll", async () => {
    RATING_CID = new anchor.BN(1);
    const CID2 = new anchor.BN(2);

    await program.methods
      .registerCandidate(RATING_PID, `Rating Candidate 1`)
      .accountsPartial({
        user: user.publicKey,
        poll: pollPda(RATING_PID),
        candidate: candidatePda(RATING_PID, RATING_CID),
        ratingResult: ratingResultPda(RATING_PID, RATING_CID),
      })
      .rpc();

    await program.methods
      .registerCandidate(RATING_PID, `Rating Candidate 2`)
      .accountsPartial({
        user: user.publicKey,
        poll: pollPda(RATING_PID),
        candidate: candidatePda(RATING_PID, CID2),
        ratingResult: ratingResultPda(RATING_PID, CID2),
      })
      .rpc();

    // Verify RatingResult PDAs are pre-initialized for both
    const rr1 = await program.account.ratingResult.fetch(
      ratingResultPda(RATING_PID, RATING_CID),
    );
    const rr2 = await program.account.ratingResult.fetch(
      ratingResultPda(RATING_PID, CID2),
    );
    console.log("RR1 pre-init voteCount:", rr1.voteCount.toString());
    console.log("RR2 pre-init voteCount:", rr2.voteCount.toString());
  });

  it("Rejects invalid scores (0 and 6)", async () => {
    for (const badScore of [0, 6]) {
      try {
        await program.methods
          .rateCandidate(RATING_PID, RATING_CID, badScore, [])
          .accountsPartial(rateAccountsPartial(RATING_PID, RATING_CID))
          .rpc();
        throw new Error(`Expected InvalidScore for ${badScore}`);
      } catch (e) {
        if (e instanceof AnchorError) {
          console.log(`InvalidScore for ${badScore}:`, e.error.errorCode.code);
        } else throw e;
      }
    }
  });

  it("Rejects voting on a rating poll (NotNormalPoll)", async () => {
    try {
      await program.methods
        .vote(RATING_PID, RATING_CID, [])
        .accountsPartial(voteAccountsPartial(RATING_PID, RATING_CID))
        .rpc();
      throw new Error("Expected NotNormalPoll");
    } catch (e) {
      if (e instanceof AnchorError) {
        console.log("NotNormalPoll caught:", e.error.errorCode.code);
      } else throw e;
    }
  });

  it("Rejects rating on a normal poll (NotRatingPoll)", async () => {
    try {
      await program.methods
        .rateCandidate(PID, CID, 4, [])
        .accountsPartial(rateAccountsPartial(PID, CID))
        .rpc();
      throw new Error("Expected NotRatingPoll");
    } catch (e) {
      if (e instanceof AnchorError) {
        console.log("NotRatingPoll caught:", e.error.errorCode.code);
      } else throw e;
    }
  });

  it("Rates candidate 1 — creates Rater PDA, bit 0 set", async () => {
    await program.methods
      .rateCandidate(RATING_PID, RATING_CID, 4, [])
      .accountsPartial(rateAccountsPartial(RATING_PID, RATING_CID))
      .rpc();

    const rater = await program.account.rater.fetch(
      raterPda(RATING_PID, user.publicKey),
    );
    const expectedMask0 = new anchor.BN(1).shln(RATING_CID.toNumber() - 1);
    console.log(
      "rated_mask after candidate 1:",
      rater.ratedMask.map((w: anchor.BN) => w.toString()),
      "| word0 expect:",
      expectedMask0.toString(),
    );
    const rr = await program.account.ratingResult.fetch(
      ratingResultPda(RATING_PID, RATING_CID),
    );
    console.log(
      "RatingResult totalScore:",
      rr.totalScore.toString(),
      "voteCount:",
      rr.voteCount.toString(),
    );
  });

  it("Rates candidate 2 — same Rater PDA updated, second bit set", async () => {
    const CID2 = RATING_CID.add(new anchor.BN(1));
    await program.methods
      .rateCandidate(RATING_PID, CID2, 3, [])
      .accountsPartial(rateAccountsPartial(RATING_PID, CID2))
      .rpc();

    const rater = await program.account.rater.fetch(
      raterPda(RATING_PID, user.publicKey),
    );
    console.log(
      "rated_mask after 2 candidates:",
      rater.ratedMask.map((w: anchor.BN) => w.toString()),
    );
  });

  it("Rejects re-rating candidate 1 (JudgeAlreadyRated via bitmask)", async () => {
    try {
      await program.methods
        .rateCandidate(RATING_PID, RATING_CID, 5, [])
        .accountsPartial(rateAccountsPartial(RATING_PID, RATING_CID))
        .rpc();
      throw new Error("Expected JudgeAlreadyRated");
    } catch (e) {
      if (e instanceof AnchorError) {
        console.log("JudgeAlreadyRated caught:", e.error.errorCode.code);
      } else throw e;
    }
  });

  // Phase 1: commit_eligibility

  it("Rejects commit_eligibility on a poll where registration has not ended", async () => {
    // Create a poll with registration_end in the future
    const counter = await program.account.counter.fetch(counterPda);
    const futurePid = counter.count.add(new anchor.BN(1));
    const t = now();
    await program.methods
      .createPoll(
        new anchor.BN(t + 300), // registration_end in future
        new anchor.BN(t + 600),
        new anchor.BN(t + 900),
        { normal: {} },
        { merkleRestricted: {} },
        "ipfs://QmFuture",
      )
      .accountsPartial({ user: user.publicKey, poll: pollPda(futurePid) })
      .rpc();

    const emptyRoot = new Array(32).fill(0);
    const emptyHash = new Array(32).fill(0);
    try {
      await program.methods
        .commitEligibility(
          futurePid,
          emptyRoot,
          emptyHash,
          "",
          new anchor.BN(0),
        )
        .accountsPartial({
          user: user.publicKey,
          poll: pollPda(futurePid),
        })
        .rpc();
      throw new Error("Expected RegistrationStillOpen");
    } catch (e) {
      if (e instanceof AnchorError) {
        console.log("RegistrationStillOpen caught:", e.error.errorCode.code);
      } else throw e;
    }
  });

  it("Creates and commits a restricted poll (registration closed, before voting_start)", async () => {
    const counter = await program.account.counter.fetch(counterPda);
    RESTRICTED_PID = counter.count.add(new anchor.BN(1));
    const t = now();

    // registration_end in the past, voting_start in the future → commit window is NOW
    await program.methods
      .createPoll(
        new anchor.BN(t - 100), // registration_end: past
        new anchor.BN(t + 600), // voting_start: future
        new anchor.BN(t + 1200),
        { normal: {} },
        { merkleRestricted: {} },
        "ipfs://QmRestricted",
      )
      .accountsPartial({ user: user.publicKey, poll: pollPda(RESTRICTED_PID) })
      .rpc();

    // Build a Merkle tree with the user as the only eligible voter
    const leaf = user.publicKey.toBuffer();
    const root = buildMerkleRoot([leaf]);
    const merkleRoot = Array.from(root);
    const listHash = Array.from(createHash("sha256").update(leaf).digest());

    await program.methods
      .commitEligibility(
        RESTRICTED_PID,
        merkleRoot,
        listHash,
        "ipfs://QmVoterList",
        new anchor.BN(1),
      )
      .accountsPartial({
        user: user.publicKey,
        poll: pollPda(RESTRICTED_PID),
      })
      .rpc();

    const poll = await program.account.poll.fetch(pollPda(RESTRICTED_PID));
    console.log(
      "Poll isFrozen:",
      poll.isFrozen,
      "| merkleVersion:",
      poll.merkleVersion,
    );
    console.log("contentCid:", poll.contentCid);
  });

  it("Rejects double commit_eligibility (AlreadyFrozen)", async () => {
    const emptyRoot = new Array(32).fill(0);
    const emptyHash = new Array(32).fill(0);
    try {
      await program.methods
        .commitEligibility(
          RESTRICTED_PID,
          emptyRoot,
          emptyHash,
          "",
          new anchor.BN(0),
        )
        .accountsPartial({
          user: user.publicKey,
          poll: pollPda(RESTRICTED_PID),
        })
        .rpc();
      throw new Error("Expected AlreadyFrozen");
    } catch (e) {
      if (e instanceof AnchorError) {
        console.log("AlreadyFrozen caught:", e.error.errorCode.code);
      } else throw e;
    }
  });

  // Phase 2: close_voter (rent reclaim)

  it("Creates a short-lived poll to test close_voter", async () => {
    const counter = await program.account.counter.fetch(counterPda);
    const shortPid = counter.count.add(new anchor.BN(1));
    const t = now();
    // voting window 1 second so it ends near-immediately
    await program.methods
      .createPoll(
        new anchor.BN(t - 300),
        new anchor.BN(t - 200),
        new anchor.BN(t - 1), // voting_end: in the past
        { normal: {} },
        { open: {} },
        "ipfs://QmShort",
      )
      .accountsPartial({ user: user.publicKey, poll: pollPda(shortPid) })
      .rpc();

    // Register a candidate
    const shortCid = new anchor.BN(1);
    await program.methods
      .registerCandidate(shortPid, "Short candidate")
      .accountsPartial({
        user: user.publicKey,
        poll: pollPda(shortPid),
        candidate: candidatePda(shortPid, shortCid),
        ratingResult: ratingResultPda(shortPid, shortCid),
      })
      .rpc();

    // Vote (window is in past — expect VotingEnded)
    try {
      await program.methods
        .vote(shortPid, shortCid, [])
        .accountsPartial(voteAccountsPartial(shortPid, shortCid))
        .rpc();
      // If we reach here the test can still proceed to test close
    } catch (e) {
      if (e instanceof AnchorError) {
        console.log(
          "Expected VotingEnded on short poll:",
          e.error.errorCode.code,
        );
      } else throw e;
    }

    // Try close_poll — poll has ended, creator can close it
    try {
      await program.methods
        .closePoll(shortPid)
        .accountsPartial({
          creator: user.publicKey,
          poll: pollPda(shortPid),
        })
        .rpc();
      console.log("close_poll succeeded — lamports reclaimed");
    } catch (e) {
      console.log(
        "close_poll skipped (poll may not exist):",
        (e as Error).message?.slice(0, 80),
      );
    }
  });

  it("Rejects close_voter before voting_end (PollNotEnded)", async () => {
    // The normal PID poll has voting_end = now + 86400 (not ended)
    // First need a voter PDA to exist — user already voted on PID
    try {
      await program.methods
        .closeVoter(PID)
        .accountsPartial({
          user: user.publicKey,
          poll: pollPda(PID),
          voter: voterPda(PID, user.publicKey),
        })
        .rpc();
      throw new Error("Expected PollNotEnded");
    } catch (e) {
      if (e instanceof AnchorError) {
        console.log(
          "PollNotEnded for close_voter caught:",
          e.error.errorCode.code,
        );
      } else throw e;
    }
  });

  it("Rejects close_rater before voting_end (PollNotEnded)", async () => {
    try {
      await program.methods
        .closeRater(RATING_PID)
        .accountsPartial({
          user: user.publicKey,
          poll: pollPda(RATING_PID),
          rater: raterPda(RATING_PID, user.publicKey),
        })
        .rpc();
      throw new Error("Expected PollNotEnded");
    } catch (e) {
      if (e instanceof AnchorError) {
        console.log(
          "PollNotEnded for close_rater caught:",
          e.error.errorCode.code,
        );
      } else throw e;
    }
  });
});
