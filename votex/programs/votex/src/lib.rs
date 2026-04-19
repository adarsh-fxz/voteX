#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod merkle;
pub mod states;

use instructions::*;
#[allow(unused_imports)]
use states::*;

declare_id!("HFGLGj86P9gnjLVWnfvoWGjViiEFfwfdQYUtVJ131ZpH");

#[program]
pub mod votex {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize(ctx)
    }

    pub fn create_poll(
        ctx: Context<CreatePoll>,
        registration_end: u64,
        voting_start: u64,
        voting_end: u64,
        kind: states::PollKind,
        access_mode: states::AccessMode,
        metadata_uri: String,
    ) -> Result<()> {
        instructions::create_poll(
            ctx,
            registration_end,
            voting_start,
            voting_end,
            kind,
            access_mode,
            metadata_uri,
        )
    }

    pub fn commit_eligibility(
        ctx: Context<CommitEligibility>,
        poll_id: u64,
        merkle_root: [u8; 32],
        list_hash: [u8; 32],
        content_cid: String,
        committed_voter_count: u64,
    ) -> Result<()> {
        instructions::commit_eligibility(
            ctx,
            poll_id,
            merkle_root,
            list_hash,
            content_cid,
            committed_voter_count,
        )
    }

    pub fn register_candidate(
        ctx: Context<RegisterCandidate>,
        poll_id: u64,
        name: String,
    ) -> Result<()> {
        instructions::register_candidate(ctx, poll_id, name)
    }

    pub fn vote(
        ctx: Context<VoteCandidate>,
        poll_id: u64,
        cid: u64,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        instructions::vote(ctx, poll_id, cid, proof)
    }

    pub fn rate_candidate(
        ctx: Context<RateCandidate>,
        poll_id: u64,
        cid: u64,
        score: u8,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        instructions::rate_candidate(ctx, poll_id, cid, score, proof)
    }

    pub fn close_voter(ctx: Context<CloseVoter>, poll_id: u64) -> Result<()> {
        instructions::close_voter(ctx, poll_id)
    }

    pub fn close_rater(ctx: Context<CloseRater>, poll_id: u64) -> Result<()> {
        instructions::close_rater(ctx, poll_id)
    }

    pub fn close_poll(ctx: Context<ClosePoll>, poll_id: u64) -> Result<()> {
        instructions::close_poll(ctx, poll_id)
    }

    pub fn close_candidate(ctx: Context<CloseCandidate>, poll_id: u64, cid: u64) -> Result<()> {
        instructions::close_candidate(ctx, poll_id, cid)
    }

    pub fn close_rating_result(
        ctx: Context<CloseRatingResult>,
        poll_id: u64,
        cid: u64,
    ) -> Result<()> {
        instructions::close_rating_result(ctx, poll_id, cid)
    }
}
