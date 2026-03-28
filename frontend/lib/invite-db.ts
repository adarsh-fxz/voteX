/**
 * Invite store backed by Upstash Redis (HTTP, serverless-safe).
 *
 * Data layout in Redis:
 *   invites:{pollId}:hashes   → Hash  { <sha256hex>: "unused" | <pubkey> }
 *                               "unused" = unclaimed,  pubkey = claimed by that wallet
 */

import { createHash } from "crypto";
import { Redis } from "@upstash/redis";

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

function hashesKey(pollId: string): string {
  return `invites:${pollId}:hashes`;
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}

// Store hashes for newly generated codes (sentinel "unused" = empty string).
export async function addInviteHashes(
  pollId: string,
  hashes: string[],
): Promise<void> {
  const r = redis();
  const key = hashesKey(pollId);
  // HSETNX — only sets if the field does not already exist (idempotent)
  for (const h of hashes) {
    await r.hsetnx(key, h, "unused");
  }
}

/**
 * Atomically validate and claim an invite code.
 *
 * Uses a Lua script executed via EVAL so the read-modify-write is a single
 * atomic operation — no race condition between concurrent requests.
 *
 * Returns:
 *   "ok"      – code was valid and unused; pubkey has been stored
 *   "invalid" – hash not found in this poll
 *   "used"    – code already claimed by another wallet
 */
export async function registerCode(
  pollId: string,
  code: string,
  pubkey: string,
): Promise<"ok" | "invalid" | "used"> {
  const r = redis();
  const h = hashCode(code);
  const key = hashesKey(pollId);

  // Lua script: atomically check and claim
  // Returns: 0 = not found (invalid), 1 = already claimed (used), 2 = claimed now (ok)
  const lua = `
    local v = redis.call('HGET', KEYS[1], ARGV[1])
    if not v then return 0 end
    if v ~= 'unused' then return 1 end
    redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
    return 2
  `;

  const result = (await r.eval(lua, [key], [h, pubkey])) as number;

  if (result === 0) return "invalid";
  if (result === 1) return "used";
  return "ok";
}

// Return all pubkeys that have successfully registered.
export async function listRegisteredPubkeys(pollId: string): Promise<string[]> {
  const r = redis();
  const all = await r.hgetall<Record<string, string>>(hashesKey(pollId));
  if (!all) return [];
  return Object.values(all).filter((v) => v !== "unused");
}

// Return total invite count and how many have been claimed (for the creator UI).
export async function inviteStats(
  pollId: string,
): Promise<{ total: number; claimed: number }> {
  const r = redis();
  const all = await r.hgetall<Record<string, string>>(hashesKey(pollId));
  if (!all) return { total: 0, claimed: 0 };
  const values = Object.values(all);
  return {
    total: values.length,
    claimed: values.filter((v) => v !== "unused").length,
  };
}
