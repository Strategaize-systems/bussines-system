"use client";

// V5.5 SLC-554: Expandable Versions-Liste fuer den Workspace-Header.
// Zeigt alle Versionen der parent_proposal_id-Kette sortiert nach version DESC.
// Versionen-Daten werden vom Server-Component vorgeladen und als Prop
// hereingereicht, damit der Header beim Mount keine Server-Action triggert.

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, GitBranch } from "lucide-react";

import { ProposalStatusBadge } from "./proposal-status-badge";
import type { ProposalVersionEntry } from "@/app/(app)/proposals/actions";
import { cn } from "@/lib/utils";

type ProposalVersionsListProps = {
  versions: ProposalVersionEntry[];
  currentProposalId: string;
};

export function ProposalVersionsList({
  versions,
  currentProposalId,
}: ProposalVersionsListProps) {
  const [open, setOpen] = useState(false);

  if (!versions.length) {
    return null;
  }

  const current = versions.find((v) => v.id === currentProposalId);
  const totalCount = versions.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:border-[#120774]/40 transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <GitBranch className="h-3 w-3" />
        V{current?.version ?? "?"}
        {totalCount > 1 && (
          <span className="text-slate-400 font-medium">({totalCount} Versionen)</span>
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-50 mt-1 w-72 rounded-lg border-2 border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b-2 border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Versionen
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {versions.map((v) => {
                const isCurrent = v.id === currentProposalId;
                const dateStr = formatVersionDate(v);
                return (
                  <li key={v.id}>
                    {isCurrent ? (
                      <div className="flex items-center justify-between px-3 py-2 bg-[#120774]/5 border-l-4 border-[#120774]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-[#120774]">
                            V{v.version} · aktuell
                          </span>
                          {dateStr && (
                            <span className="text-[10px] font-medium text-slate-500">
                              {dateStr}
                            </span>
                          )}
                        </div>
                        <ProposalStatusBadge status={v.status} />
                      </div>
                    ) : (
                      <Link
                        href={`/proposals/${v.id}/edit${v.status === "draft" ? "" : "?readonly=1"}`}
                        className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-slate-800">
                            V{v.version}
                          </span>
                          {dateStr && (
                            <span className="text-[10px] font-medium text-slate-500">
                              {dateStr}
                            </span>
                          )}
                        </div>
                        <ProposalStatusBadge status={v.status} />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function formatVersionDate(v: ProposalVersionEntry): string | null {
  const stamp =
    v.accepted_at ??
    v.rejected_at ??
    v.expired_at ??
    v.sent_at ??
    v.created_at;
  if (!stamp) return null;
  try {
    const d = new Date(stamp);
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return null;
  }
}
