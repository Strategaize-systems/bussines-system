"use client";

import { useState, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Pencil,
  Trash2,
  User,
  Building2,
  Trophy,
  XCircle,
  Clock,
} from "lucide-react";
import { ProposalSheet } from "./proposal-sheet";
import { deleteProposal, type Proposal } from "./actions";
import Link from "next/link";

const wonLostLabels: Record<string, string> = {
  price: "Preis",
  timing: "Timing",
  wrong_fit: "Falscher Fit",
  no_priority: "Keine Priorität",
  no_trust: "Kein Vertrauen",
  partner_unsuitable: "Partner ungeeignet",
  internally_blocked: "Intern blockiert",
  no_champion: "Kein Champion",
  no_budget: "Kein Budget",
  other: "Sonstiges",
};

const selectClass =
  "flex h-8 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Entwurf", color: "bg-gray-100 text-gray-800" },
  sent: { label: "Versendet", color: "bg-blue-100 text-blue-800" },
  open: { label: "Offen", color: "bg-yellow-100 text-yellow-800" },
  negotiation: { label: "Verhandlung", color: "bg-purple-100 text-purple-800" },
  won: { label: "Gewonnen", color: "bg-green-100 text-green-800" },
  lost: { label: "Verloren", color: "bg-red-100 text-red-800" },
};

interface ProposalsClientProps {
  proposals: Proposal[];
  deals: { id: string; title: string }[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
}

export function ProposalsClient({ proposals, deals, contacts, companies }: ProposalsClientProps) {
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    if (!statusFilter) return proposals;
    return proposals.filter((p) => p.status === statusFilter);
  }, [proposals, statusFilter]);

  const wonCount = proposals.filter((p) => p.status === "won").length;
  const lostCount = proposals.filter((p) => p.status === "lost").length;
  const activeCount = proposals.filter((p) => !["won", "lost"].includes(p.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Angebote</h1>
          <p className="text-sm text-muted-foreground">
            {proposals.length} Angebote gesamt
          </p>
        </div>
        <ProposalSheet deals={deals} contacts={contacts} companies={companies} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-xs text-muted-foreground">Aktiv</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Trophy className="h-5 w-5 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{wonCount}</div>
              <div className="text-xs text-muted-foreground">Gewonnen</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{lostCount}</div>
              <div className="text-xs text-muted-foreground">Verloren</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">Alle Status</option>
          <option value="draft">Entwurf</option>
          <option value="sent">Versendet</option>
          <option value="open">Offen</option>
          <option value="negotiation">Verhandlung</option>
          <option value="won">Gewonnen</option>
          <option value="lost">Verloren</option>
        </select>
        {statusFilter && (
          <span className="text-sm text-muted-foreground">
            {filtered.length} von {proposals.length}
          </span>
        )}
      </div>

      {/* Proposal List */}
      <div className="space-y-2">
        {filtered.length > 0 ? (
          filtered.map((proposal) => (
            <ProposalItem
              key={proposal.id}
              proposal={proposal}
              deals={deals}
              contacts={contacts}
              companies={companies}
            />
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Keine Angebote gefunden.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProposalItem({
  proposal,
  deals,
  contacts,
  companies,
}: {
  proposal: Proposal;
  deals: { id: string; title: string }[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const st = statusConfig[proposal.status] ?? statusConfig.draft;

  const handleDelete = () => {
    startTransition(async () => {
      await deleteProposal(proposal.id);
    });
  };

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{proposal.title}</span>
            <Badge variant="outline" className="text-[10px]">V{proposal.version}</Badge>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
              {st.label}
            </span>
          </div>

          {proposal.price_range && (
            <p className="text-xs text-muted-foreground mt-0.5">{proposal.price_range}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
            {proposal.deals && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {proposal.deals.title}
              </span>
            )}
            {proposal.contacts && (
              <Link href={`/contacts/${proposal.contacts.id}`} className="flex items-center gap-1 hover:underline">
                <User className="h-3 w-3" />
                {proposal.contacts.first_name} {proposal.contacts.last_name}
              </Link>
            )}
            {proposal.companies && (
              <Link href={`/companies/${proposal.companies.id}`} className="flex items-center gap-1 hover:underline">
                <Building2 className="h-3 w-3" />
                {proposal.companies.name}
              </Link>
            )}
            {proposal.won_lost_reason && (
              <span className={`font-medium ${proposal.status === "won" ? "text-green-600" : "text-red-600"}`}>
                Grund: {wonLostLabels[proposal.won_lost_reason] ?? proposal.won_lost_reason}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-start gap-1 shrink-0">
          <ProposalSheet
            deals={deals}
            contacts={contacts}
            companies={companies}
            proposal={proposal}
            trigger={
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
