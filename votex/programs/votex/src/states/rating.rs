use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Rater {
    pub rated_mask: u32,
}
