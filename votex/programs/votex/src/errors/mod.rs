use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid time windows: registration_end must be before voting_start and voting_start before voting_end")]
    InvalidTimeWindows,
    #[msg("metadata_uri exceeds max length (60)")]
    MetadataUriTooLong,
    #[msg("content_cid exceeds max length (60)")]
    ContentCidTooLong,
    #[msg("candidate name exceeds max length (32)")]
    CandidateNameTooLong,
    #[msg("Poll doesn't exist or not found")]
    PollDoesNotExist,
    #[msg("Candidate cannot register twice")]
    CandidateAlreadyRegistered,
    #[msg("Candidate is not in the poll")]
    CandidateNotRegistered,
    #[msg("Voter cannot vote twice")]
    VoterAlreadyVoted,
    #[msg("Voting window is not open")]
    PollNotActive,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Score must be between 1 and 5")]
    InvalidScore,
    #[msg("Judge has already rated this candidate")]
    JudgeAlreadyRated,
    #[msg("This instruction is only for normal (single-choice) polls")]
    NotNormalPoll,
    #[msg("This instruction is only for rating-based polls")]
    NotRatingPoll,
    #[msg("Registration period has not ended yet")]
    RegistrationStillOpen,
    #[msg("Poll eligibility has already been committed and frozen")]
    AlreadyFrozen,
    #[msg("Merkle proof verification failed")]
    InvalidMerkleProof,
    #[msg("Voting has not started yet")]
    VotingNotStarted,
    #[msg("Voting period has ended")]
    VotingEnded,
    #[msg("Poll must be frozen before voting can begin")]
    PollNotFrozen,
    #[msg("Eligibility can no longer be committed after voting has started")]
    EligibilityCommitTooLate,
    #[msg("candidate id must be >= 1")]
    InvalidCandidateId,
    #[msg("Only the poll creator can perform this action")]
    Unauthorized,
    #[msg("Poll has not ended yet")]
    PollNotEnded,
}
