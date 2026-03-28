use crate::errors::ErrorCode::*;
use crate::states::*;
use anchor_lang::prelude::*;

pub fn commit_eligibility(
    ctx: Context<CommitEligibility>,
    poll_id: u64,
    merkle_root: [u8; 32],
    list_hash: [u8; 32],
    content_cid: String,
    committed_voter_count: u64,
) -> Result<()> {
    let poll = &mut ctx.accounts.poll;

    if poll.id != poll_id {
        return Err(PollDoesNotExist.into());
    }

    if ctx.accounts.user.key() != poll.creator {
        return Err(Unauthorized.into());
    }

    if poll.is_frozen {
        return Err(AlreadyFrozen.into());
    }

    if content_cid.len() > 60 {
        return Err(ContentCidTooLong.into());
    }

    let now = Clock::get()?.unix_timestamp as u64;

    if now <= poll.registration_end {
        return Err(RegistrationStillOpen.into());
    }

    if now >= poll.voting_start {
        return Err(EligibilityCommitTooLate.into());
    }

    poll.merkle_root = merkle_root;
    poll.list_hash = list_hash;
    poll.content_cid = content_cid;
    poll.committed_voter_count = committed_voter_count;
    poll.commit_time = now;
    poll.is_frozen = true;
    poll.merkle_version = poll.merkle_version.saturating_add(1);

    Ok(())
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct CommitEligibility<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,
}
