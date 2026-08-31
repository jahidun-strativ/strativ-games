"use client";

import { useMemo, useState } from "react";
import { Input } from "antd";
import { Search } from "lucide-react";
import { formatFull } from "@/lib/format";

export type AuditRow = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  summary: string;
  actorEmail: string | null;
  createdAt: Date;
};

// Entity → accent, so the log scans by area at a glance.
const ENTITY_TINT: Record<string, string> = {
  player: "bg-sky-400/15 text-sky-300",
  team: "bg-burnt-500/15 text-burnt-400",
  match: "bg-pitch-500/15 text-pitch-500",
  staff: "bg-gold-400/20 text-gold-500",
  season: "bg-purple-400/15 text-purple-300",
};

export function AuditLog({ rows }: { rows: AuditRow[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.summary.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        (r.actorEmail?.toLowerCase().includes(q) ?? false) ||
        (r.entity?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, query]);

  return (
    <div>
      <Input
        allowClear
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        prefix={<Search className="h-4 w-4 text-ink-400" />}
        placeholder="Search by action, person, or entity"
        className="mb-4 w-full sm:max-w-md"
      />

      {shown.length === 0 ? (
        <p className="tv-card px-4 py-6 text-sm text-ink-500">No matching activity.</p>
      ) : (
        <div className="tv-card-sm divide-y divide-line overflow-hidden">
          {shown.map((r) => (
            <div key={r.id} className="flex items-start gap-3 px-4 py-3">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  ENTITY_TINT[r.entity ?? ""] ?? "bg-ink-900/5 text-ink-500"
                }`}
              >
                {r.entity ?? "system"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{r.summary}</p>
                <p className="truncate text-xs text-ink-500">
                  {r.actorEmail ?? "system"}
                  <span className="text-ink-400"> · </span>
                  <span className="font-mono text-[11px]">{r.action}</span>
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[11px] text-ink-400">
                {formatFull(r.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
