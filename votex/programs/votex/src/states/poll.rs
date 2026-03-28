use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum PollKind {
    Normal,
    Rating,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AccessMode {
    Open,
    MerkleRestricted,
}

#[account]
#[derive(InitSpace)]
pub struct Poll {
    pub id: u64,
    pub creator: Pubkey,
    pub kind: PollKind,
    pub access_mode: AccessMode,
    pub is_frozen: bool,
    pub merkle_version: u8,
    pub candidates: u64,
    pub committed_voter_count: u64,
    pub registration_end: u64,
    pub voting_start: u64,
    pub voting_end: u64,
    pub commit_time: u64,
    pub merkle_root: [u8; 32],
    pub list_hash: [u8; 32],
    #[max_len(60)]
    pub metadata_uri: String,
    #[max_len(60)]
    pub content_cid: String,
}
