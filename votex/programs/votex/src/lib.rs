use anchor_lang::prelude::*;

declare_id!("3epsb3wcM86jiXrSTCR3La8c5PFXs5P5RR4VR8rH2NZv");

#[program]
pub mod votex {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
