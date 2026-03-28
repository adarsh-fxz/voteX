import { clusterApiUrl } from "@solana/web3.js";

export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet");

export const SOLANA_CLUSTER_LABEL =
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

export const VOTEX_PROGRAM_ID =
  process.env.NEXT_PUBLIC_VOTEX_PROGRAM_ID ??
  "4HK16g4y8MftrLKsvmFCARkAENNkHfpE5zqBn7Voezwo";

export const APP_NAME = "VoteX";
