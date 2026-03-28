"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useVotexProgram } from "@/hooks/useVotexProgram";
import {
  accessModeLabel,
  pollKindLabel,
  pollPhase,
  type PollAccount,
} from "@/lib/poll-utils";

export function PollsListClient() {
  const { readonlyProgram } = useVotexProgram();
  const [rows, setRows] = useState<{ id: string; poll: PollAccount }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadGenRef = useRef(0);

  useEffect(() => {
    const gen = ++loadGenRef.current;
    setErr(null);
    setLoading(true);
    (async () => {
      try {
        const all = await readonlyProgram.account.poll.all();
        if (gen !== loadGenRef.current) return;
        const mapped = all
          .map((a) => ({
            id: (a.account as PollAccount).id.toString(),
            poll: a.account as PollAccount,
          }))
          .sort((a, b) => Number(b.id) - Number(a.id));
        setRows(mapped);
      } catch (e) {
        if (gen !== loadGenRef.current) return;
        setErr(e instanceof Error ? e.message : "Failed to load polls");
      } finally {
        if (gen === loadGenRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [readonlyProgram]);

  if (loading) {
    return <p className="text-muted">Loading polls…</p>;
  }

  if (err) {
    return <p className="text-red-600">{err}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted">
        No polls yet.{" "}
        <Link href="/create" className="text-primary underline">
          Create one
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {rows.map(({ id, poll }) => (
        <li
          key={id}
          className="rounded-lg border border-border bg-surface p-4 shadow-sm"
        >
          <Link href={`/poll/${id}`} className="font-semibold text-primary">
            Poll #{id}
          </Link>
          <p className="mt-1 text-sm text-muted">
            {pollKindLabel(poll.kind)} · {accessModeLabel(poll.accessMode)} ·{" "}
            {pollPhase(poll)}
          </p>
        </li>
      ))}
    </ul>
  );
}
