"use client";

import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import type { Program } from "@coral-xyz/anchor";
import type { Votex } from "@/types/votex";
import { createProgram, createReadonlyProgram } from "@/lib/anchor";

export function useVotexProgram(): {
  program: Program<Votex> | null;
  readonlyProgram: Program<Votex>;
} {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  const readonlyProgram = useMemo(
    () => createReadonlyProgram(connection),
    [connection],
  );

  const program = useMemo(() => {
    if (!anchorWallet) return null;
    return createProgram(connection, anchorWallet);
  }, [connection, anchorWallet]);

  return { program, readonlyProgram };
}
