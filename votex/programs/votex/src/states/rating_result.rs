use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RatingResult {
    pub poll_id: u64,
    pub candidate_id: u64,
    pub total_score: u64,
    pub vote_count: u64,
}
