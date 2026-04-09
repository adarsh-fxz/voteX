use crate::constants::ANCHOR_DISCRIMINATOR_SIZE;
use crate::errors::ErrorCode::*;
use crate::states::*;
use anchor_lang::prelude::*;

#[event]
pub struct RatingCast {
    pub poll_id: u64,
    pub candidate_id: u64,
    pub judge: Pubkey,
    pub score: u8,
    pub slot: u64,
}

pub fn rate_candidate(
    ctx: Context<RateCandidate>,
    poll_id: u64,
    cid: u64,
    score: u8,
    proof: Vec<[u8; 32]>,
) -> Result<()> {
    if score < 1 || score > 5 {
        return Err(InvalidScore.into());
    }

    let poll = &mut ctx.accounts.poll;

    if poll.id != poll_id {
        return Err(PollDoesNotExist.into());
    }

    if poll.kind != PollKind::Rating {
        return Err(NotRatingPoll.into());
    }

    if cid == 0 || cid > 256 {
        return Err(InvalidCandidateId.into());
    }

    let candidate = &ctx.accounts.candidate;
    if !candidate.has_registered || candidate.poll_id != poll_id {
        return Err(CandidateNotRegistered.into());
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

    let word = ((cid - 1) / 64) as usize;
    let bit = ((cid - 1) % 64) as u32;
    let mask = 1u64.checked_shl(bit).ok_or(ArithmeticOverflow)?;

    let rater = &mut ctx.accounts.rater;
    if rater.rated_mask[word] & mask != 0 {
        return Err(JudgeAlreadyRated.into());
    }

    let rating_result = &mut ctx.accounts.rating_result;
    rating_result.total_score = rating_result
        .total_score
        .checked_add(score as u64)
        .ok_or(ArithmeticOverflow)?;
    rating_result.vote_count = rating_result
        .vote_count
        .checked_add(1)
        .ok_or(ArithmeticOverflow)?;

    emit!(RatingCast {
        poll_id,
        candidate_id: cid,
        judge: ctx.accounts.user.key(),
        score,
        slot: Clock::get()?.slot,
    });

    rater.rated_mask[word] |= mask;

    Ok(())
}

#[derive(Accounts)]
#[instruction(poll_id: u64, cid: u64)]
pub struct RateCandidate<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        seeds = [poll_id.to_le_bytes().as_ref(), cid.to_le_bytes().as_ref()],
        bump
    )]
    pub candidate: Account<'info, Candidate>,

    #[account(
        init_if_needed,
        payer = user,
        space = ANCHOR_DISCRIMINATOR_SIZE + Rater::INIT_SPACE,
        seeds = [b"rater", poll_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump
    )]
    pub rater: Account<'info, Rater>,

    #[account(
        mut,
        seeds = [b"rating_result", poll_id.to_le_bytes().as_ref(), cid.to_le_bytes().as_ref()],
        bump
    )]
    pub rating_result: Account<'info, RatingResult>,

    pub system_program: Program<'info, System>,
}
