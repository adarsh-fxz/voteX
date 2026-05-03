/**
 * Flagged-poll store backed by Upstash Redis (HTTP, serverless-safe).
 *
 * Data layout in Redis:
 *   polls:flagged   → Hash  { <pollId>: <reason> }
 */

import { Redis } from "@upstash/redis";

const FLAG_KEY = "polls:flagged";

function redis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in .env.local",
    );
  }
  return new Redis({ url, token });
}

export async function flagPoll(pollId: string, reason: string): Promise<void> {
  await redis().hset(FLAG_KEY, { [pollId]: reason });
}

export async function unflagPoll(pollId: string): Promise<void> {
  await redis().hdel(FLAG_KEY, pollId);
}

export async function listFlaggedPolls(): Promise<Record<string, string>> {
  const all = await redis().hgetall<Record<string, string>>(FLAG_KEY);
  return all ?? {};
}

export async function getFlagReason(pollId: string): Promise<string | null> {
  const reason = await redis().hget<string>(FLAG_KEY, pollId);
  return reason ?? null;
}
