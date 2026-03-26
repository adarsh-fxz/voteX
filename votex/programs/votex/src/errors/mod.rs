use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Start date cannot be greater than end date")]
    InvalidDates,
    #[msg("Poll doesn't exist or not found")]
    PollDoesNotExist,
    #[msg("Candidate cannot register twice")]
    CandidateAlreadyRegistered,
    #[msg("Candidate is not in the poll")]
    CandidateNotRegistered,
    #[msg("Voter cannot vote twice")]
    VoterAlreadyVoted,
    #[msg("Poll not currently active")]
    PollNotActive,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
