use crate::errors::ErrorCode;
use crate::errors::ErrorCode::*;
use crate::states::*;
use anchor_lang::prelude::*;

// close_voter

pub fn close_voter(ctx: Context<CloseVoter>, poll_id: u64) -> Result<()> {
    let poll = &ctx.accounts.poll;
    if poll.id != poll_id {
        return Err(PollDoesNotExist.into());
    }
    let now = Clock::get()?.unix_timestamp as u64;
    if now <= poll.voting_end {
        return Err(PollNotEnded.into());
    }
    Ok(())
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct CloseVoter<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        mut,
        close = user,
        seeds = [b"voter", poll_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump
    )]
    pub voter: Account<'info, Voter>,
}

// close_rater

pub fn close_rater(ctx: Context<CloseRater>, poll_id: u64) -> Result<()> {
    let poll = &ctx.accounts.poll;
    if poll.id != poll_id {
        return Err(PollDoesNotExist.into());
    }
    let now = Clock::get()?.unix_timestamp as u64;
    if now <= poll.voting_end {
        return Err(PollNotEnded.into());
    }
    Ok(())
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct CloseRater<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        mut,
        close = user,
        seeds = [b"rater", poll_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump
    )]
    pub rater: Account<'info, Rater>,
}

// close_poll

pub fn close_poll(ctx: Context<ClosePoll>, poll_id: u64) -> Result<()> {
    let poll = &ctx.accounts.poll;
    if poll.id != poll_id {
        return Err(PollDoesNotExist.into());
    }
    let now = Clock::get()?.unix_timestamp as u64;
    if now <= poll.voting_end {
        return Err(PollNotEnded.into());
    }
    Ok(())
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct ClosePoll<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        close = creator,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump,
        constraint = poll.creator == creator.key() @ ErrorCode::Unauthorized
    )]
    pub poll: Account<'info, Poll>,
}

// close_candidate

pub fn close_candidate(ctx: Context<CloseCandidate>, poll_id: u64, _cid: u64) -> Result<()> {
    let poll = &ctx.accounts.poll;
    if poll.id != poll_id {
        return Err(PollDoesNotExist.into());
    }
    let now = Clock::get()?.unix_timestamp as u64;
    if now <= poll.voting_end {
        return Err(PollNotEnded.into());
    }
    Ok(())
}

#[derive(Accounts)]
#[instruction(poll_id: u64, cid: u64)]
pub struct CloseCandidate<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump,
        constraint = poll.creator == creator.key() @ ErrorCode::Unauthorized
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        mut,
        close = creator,
        seeds = [poll_id.to_le_bytes().as_ref(), cid.to_le_bytes().as_ref()],
        bump
    )]
    pub candidate: Account<'info, Candidate>,
}

// close_rating_result

pub fn close_rating_result(ctx: Context<CloseRatingResult>, poll_id: u64, _cid: u64) -> Result<()> {
    let poll = &ctx.accounts.poll;
    if poll.id != poll_id {
        return Err(PollDoesNotExist.into());
    }
    let now = Clock::get()?.unix_timestamp as u64;
    if now <= poll.voting_end {
        return Err(PollNotEnded.into());
    }
    Ok(())
}

#[derive(Accounts)]
#[instruction(poll_id: u64, cid: u64)]
pub struct CloseRatingResult<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump,
        constraint = poll.creator == creator.key() @ ErrorCode::Unauthorized
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        mut,
        close = creator,
        seeds = [b"rating_result", poll_id.to_le_bytes().as_ref(), cid.to_le_bytes().as_ref()],
        bump
    )]
    pub rating_result: Account<'info, RatingResult>,
}
