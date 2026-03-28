use crate::constants::ANCHOR_DISCRIMINATOR_SIZE;
use crate::errors::ErrorCode::*;
use crate::states::*;
use anchor_lang::prelude::*;

pub fn create_poll(
    ctx: Context<CreatePoll>,
    registration_end: u64,
    voting_start: u64,
    voting_end: u64,
    kind: PollKind,
    access_mode: AccessMode,
    metadata_uri: String,
) -> Result<()> {
    if registration_end >= voting_start || voting_start >= voting_end {
        return Err(InvalidTimeWindows.into());
    }
    if metadata_uri.len() > 60 {
        return Err(MetadataUriTooLong.into());
    }

    let counter = &mut ctx.accounts.counter;
    counter.count = counter.count.checked_add(1).ok_or(ArithmeticOverflow)?;

    let poll = &mut ctx.accounts.poll;

    poll.id = counter.count;
    poll.creator = ctx.accounts.user.key();
    poll.kind = kind;
    poll.access_mode = access_mode;
    poll.is_frozen = false;
    poll.merkle_version = 0;
    poll.candidates = 0;
    poll.committed_voter_count = 0;
    poll.registration_end = registration_end;
    poll.voting_start = voting_start;
    poll.voting_end = voting_end;
    poll.commit_time = 0;
    poll.merkle_root = [0u8; 32];
    poll.list_hash = [0u8; 32];
    poll.metadata_uri = metadata_uri;
    poll.content_cid = String::new();

    Ok(())
}

#[derive(Accounts)]
pub struct CreatePoll<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = ANCHOR_DISCRIMINATOR_SIZE + Poll::INIT_SPACE,
        seeds = [(counter.count + 1).to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        mut,
        seeds = [b"counter"],
        bump
    )]
    pub counter: Account<'info, Counter>,

    pub system_program: Program<'info, System>,
}
