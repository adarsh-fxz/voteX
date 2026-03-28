use crate::constants::ANCHOR_DISCRIMINATOR_SIZE;
use crate::errors::ErrorCode::*;
use crate::states::*;
use anchor_lang::prelude::*;

pub fn vote(
    ctx: Context<VoteCandidate>,
    poll_id: u64,
    cid: u64,
    proof: Vec<[u8; 32]>,
) -> Result<()> {
    let voter = &mut ctx.accounts.voter;
    let candidate = &mut ctx.accounts.candidate;
    let poll = &mut ctx.accounts.poll;

    if poll.id != poll_id {
        return Err(PollDoesNotExist.into());
    }

    if cid == 0 {
        return Err(InvalidCandidateId.into());
    }

    if poll.kind != PollKind::Normal {
        return Err(NotNormalPoll.into());
    }

    if !candidate.has_registered || candidate.poll_id != poll_id {
        return Err(CandidateNotRegistered.into());
    }

    if voter.has_voted {
        return Err(VoterAlreadyVoted.into());
    }

    let now = Clock::get()?.unix_timestamp as u64;
    if now < poll.voting_start {
        return Err(VotingNotStarted.into());
    }
    if now > poll.voting_end {
        return Err(VotingEnded.into());
    }

    if poll.access_mode == AccessMode::MerkleRestricted {
        if poll.is_frozen {
            let leaf = ctx.accounts.user.key().to_bytes();
            let valid = crate::merkle::verify_merkle_proof(&proof, &poll.merkle_root, &leaf);
            if !valid {
                return Err(InvalidMerkleProof.into());
            }
        } else {
            return Err(PollNotFrozen.into());
        }
    }

    voter.poll_id = poll_id;
    voter.cid = cid;
    voter.has_voted = true;

    candidate.votes = candidate.votes.checked_add(1).ok_or(ArithmeticOverflow)?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(poll_id: u64, cid: u64)]
pub struct VoteCandidate<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        mut,
        seeds = [
            poll_id.to_le_bytes().as_ref(),
            cid.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub candidate: Account<'info, Candidate>,

    #[account(
        init_if_needed,
        payer = user,
        space = ANCHOR_DISCRIMINATOR_SIZE + Voter::INIT_SPACE,
        seeds = [b"voter", poll_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump
    )]
    pub voter: Account<'info, Voter>,

    pub system_program: Program<'info, System>,
}
