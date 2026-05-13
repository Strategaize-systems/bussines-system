// SLC-705 MT-2/3/5 — Sortierbare Team-Mitarbeiter-Aggregat-Tabelle
//
// Client-Component: zeigt pro Mitarbeiter Pipeline-Sum, offene Deals,
// offene Aufgaben, ueberfaellig, letzter Login. Spalten klick-sortierbar
// (numerisch oder string), NULLs sortieren immer ans Ende. Default
// Sort: pipeline_sum DESC. Empty-State mit Link auf /settings/team.
// Per-Row Drilldown-Link auf /team/[user_id]/mein-tag (404-Stub bis
// SLC-706 — bewusster Vorgriff).

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, ArrowUpDown, ExternalLink, Users } from "lucide-react";
import type { TeamMemberAggregate } from "@/lib/team/aggregate-queries";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  teamlead: "Teamlead",
  member: "Member",
};

const ROLE_TONE: Record<string, string> = {
  admin: "bg-blue-100 text-blue-800",
  teamlead: "bg-purple-100 text-purple-800",
  member: "bg-slate-100 text-slate-700",
};

type SortColumn =
  | "display_name"
  | "role"
  | "pipeline_sum"
  | "open_deals"
  | "open_activities"
  | "overdue_count"
  | "last_login_at";

type SortDir = "asc" | "desc";

const STRING_COLUMNS = new Set<SortColumn>(["display_name", "role"]);
const DATE_COLUMNS = new Set<SortColumn>(["last_login_at"]);

const euroFmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatLastLogin(iso: string | null): string {
  if (!iso) return "nie";
  return new Date(iso).toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function isNullish(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

interface Props {
  members: TeamMemberAggregate[];
}

export function TeamMembersAggregatTable({ members }: Props) {
  const [sortBy, setSortBy] = useState<SortColumn>("pipeline_sum");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedMembers = useMemo(() => {
    const copy = [...members];
    copy.sort((a, b) => {
      const av = a[sortBy] as unknown;
      const bv = b[sortBy] as unknown;
      // NULLs immer ans Ende, unabhaengig von Richtung
      const aNull = isNullish(av);
      const bNull = isNullish(bv);
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;

      let cmp = 0;
      if (STRING_COLUMNS.has(sortBy)) {
        cmp = String(av).localeCompare(String(bv), "de");
      } else if (DATE_COLUMNS.has(sortBy)) {
        cmp = new Date(String(av)).getTime() - new Date(String(bv)).getTime();
      } else {
        cmp = Number(av) - Number(bv);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [members, sortBy, sortDir]);

  function toggleSort(col: SortColumn) {
    if (col === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  if (members.length === 0) return <EmptyTeam />;

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead
              column="display_name"
              label="Mitglied"
              activeCol={sortBy}
              dir={sortDir}
              onClick={toggleSort}
            />
            <SortableHead
              column="role"
              label="Rolle"
              activeCol={sortBy}
              dir={sortDir}
              onClick={toggleSort}
            />
            <SortableHead
              column="pipeline_sum"
              label="Pipeline-Sum"
              activeCol={sortBy}
              dir={sortDir}
              onClick={toggleSort}
              align="right"
            />
            <SortableHead
              column="open_deals"
              label="Offene Deals"
              activeCol={sortBy}
              dir={sortDir}
              onClick={toggleSort}
              align="right"
            />
            <SortableHead
              column="open_activities"
              label="Offene Aufgaben"
              activeCol={sortBy}
              dir={sortDir}
              onClick={toggleSort}
              align="right"
            />
            <SortableHead
              column="overdue_count"
              label="Ueberfaellig"
              activeCol={sortBy}
              dir={sortDir}
              onClick={toggleSort}
              align="right"
            />
            <SortableHead
              column="last_login_at"
              label="Letzter Login"
              activeCol={sortBy}
              dir={sortDir}
              onClick={toggleSort}
            />
            <TableHead className="text-right">Aktion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMembers.map((m) => (
            <TableRow key={m.user_id}>
              <TableCell>
                <div className="font-medium text-slate-900">
                  {m.display_name || m.user_id}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={ROLE_TONE[m.role] ?? ROLE_TONE.member}>
                  {ROLE_LABEL[m.role] ?? m.role}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {euroFmt.format(m.pipeline_sum)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {m.open_deals}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {m.open_activities}
              </TableCell>
              <TableCell
                className={
                  m.overdue_count > 0
                    ? "text-right tabular-nums text-red-600 font-semibold"
                    : "text-right tabular-nums"
                }
              >
                {m.overdue_count}
              </TableCell>
              <TableCell className="text-slate-600">
                {formatLastLogin(m.last_login_at)}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/team/${m.user_id}/mein-tag`}
                  className="inline-flex items-center text-sm font-medium text-brand-primary hover:underline"
                >
                  <ExternalLink className="inline h-4 w-4 mr-1" />
                  Cockpit oeffnen
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SortableHead({
  column,
  label,
  activeCol,
  dir,
  onClick,
  align,
}: {
  column: SortColumn;
  label: string;
  activeCol: SortColumn;
  dir: SortDir;
  onClick: (c: SortColumn) => void;
  align?: "right";
}) {
  const active = activeCol === column;
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={() => onClick(column)}
        className="inline-flex items-center gap-0 select-none hover:text-slate-900 transition-colors cursor-pointer uppercase tracking-wide font-bold text-xs text-slate-600"
      >
        {label}
        <SortIcon active={active} dir={dir} />
      </button>
    </TableHead>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active)
    return <ArrowUpDown className="inline h-3.5 w-3.5 opacity-40 ml-1" />;
  return dir === "asc" ? (
    <ArrowUp className="inline h-3.5 w-3.5 ml-1" />
  ) : (
    <ArrowDown className="inline h-3.5 w-3.5 ml-1" />
  );
}

function EmptyTeam() {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-10 text-center shadow-sm">
      <Users className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-3 text-sm text-slate-500">
        Noch keine Team-Mitglieder. Lade jemanden ein in der{" "}
        <Link
          href="/settings/team"
          className="font-medium text-brand-primary underline-offset-2 hover:underline"
        >
          Team-Verwaltung
        </Link>
        .
      </p>
    </div>
  );
}
