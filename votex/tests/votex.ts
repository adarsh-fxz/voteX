import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Votex } from "../target/types/votex";

describe("voteX", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.votex as Program<Votex>;

  const user = provider.wallet;
  let PID: any, CID: any;

  it("Initializes and creates a poll", async () => {
    // Derive the PDA for the counter account
    const [counterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("counter")],
      program.programId,
    );

    // Attempt to fetch the counter account
    // skip initialization if it exists
    let counter: any;
    try {
      counter = await program.account.counter.fetch(counterPda);
      console.log(
        "Counter account already exists with count: ",
        counter.count.toString(),
      );
    } catch (error) {
      console.log("Counter account doesn't exist. Initializing...");
      await program.methods
        .initialize()
        .accounts({
          user: user.publicKey,
        })
        .rpc();

      // Fetch the counter after initialization
      counter = await program.account.counter.fetch(counterPda);
      console.log(
        "Counter account already exists with count: ",
        counter.count.toString(),
      );
    }

    // Increment count to predict the next poll ID for PDA
    PID = counter.count.add(new anchor.BN(1));
    const [pollPda] = PublicKey.findProgramAddressSync(
      [PID.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    const description = `Poll #${PID}`;
    const now = Math.floor(Date.now() / 1000);
    const start = new anchor.BN(now);
    const end = new anchor.BN(now + 86400);

    // Call create_poll with the correct accounts
    await program.methods
      .createPoll(description, start, end)
      .accounts({
        user: user.publicKey,
        poll: pollPda,
      })
      .rpc();

    // Verify that the poll was created with the correct data
    const poll = await program.account.poll.fetch(pollPda);
    console.log("Poll: ", poll);
  });

  it("Registers a candidate", async () => {
    const [registrationsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registrations")],
      program.programId,
    );

    const regs = await program.account.registrations.fetch(registrationsPda);
    CID = regs.count.add(new anchor.BN(1));

    const candidateName = `Candidate #${CID}`;
    const [candidatePda] = PublicKey.findProgramAddressSync(
      [PID.toArrayLike(Buffer, "le", 8), CID.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .registerCandidate(PID, candidateName)
      .accounts({
        user: user.publicKey,
        candidate: candidatePda,
      })
      .rpc();

    // Verify that the candidate was created with the correct data
    const candidate = await program.account.candidate.fetch(candidatePda);
    console.log("Candidate: ", candidate);
  });

  it("Votes for a candidate", async () => {
    // Derive the PDA for the candidate
    const [candidatePda] = PublicKey.findProgramAddressSync(
      [PID.toArrayLike(Buffer, "le", 8), CID.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    // Derive the PDA for the voter account
    const [voterPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("voter"),
        PID.toArrayLike(Buffer, "le", 8),
        user.publicKey.toBuffer(),
      ],
      program.programId,
    );

    // Perform the vote
    await program.methods
      .vote(PID, CID)
      .accounts({
        user: user.publicKey,
      })
      .rpc();

    // Verify that the voter was created with the correct data
    const voter = await program.account.voter.fetch(voterPda);
    console.log("Voter", voter);

    // Fetch and verify the updated candidate votes
    const updatedCandidate = await program.account.candidate.fetch(
      candidatePda,
    );
    console.log(
      "Candidate votes after voting: ",
      updatedCandidate.votes.toString(),
    );
  });
});
