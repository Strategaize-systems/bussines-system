"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import type { Proposal } from "./actions";

const selectClass = "select-premium";

const WON_LOST_REASONS = [
  { value: "price", label: "Preis" },
  { value: "timing", label: "Timing" },
  { value: "wrong_fit", label: "Falscher Fit" },
  { value: "no_priority", label: "Keine Priorität" },
  { value: "no_trust", label: "Kein Vertrauen" },
  { value: "partner_unsuitable", label: "Partner ungeeignet" },
  { value: "internally_blocked", label: "Intern blockiert" },
  { value: "no_champion", label: "Kein Champion" },
  { value: "no_budget", label: "Kein Budget" },
  { value: "other", label: "Sonstiges" },
];

interface ProposalFormProps {
  proposal?: Proposal;
  deals: { id: string; title: string }[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}

export function ProposalForm({
  proposal,
  deals,
  contacts,
  companies,
  onSubmit,
  isPending,
}: ProposalFormProps) {
  const [status, setStatus] = useState(proposal?.status ?? "draft");
  const isOutcome = status === "won" || status === "lost";

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Angebotstitel *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={proposal?.title}
          placeholder="z.B. Blueprint-Beratung Phase 1"
          required
        />
      </div>

      {proposal && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClass}
            >
              <option value="draft">Entwurf</option>
              <option value="sent">Versendet</option>
              <option value="open">Offen</option>
              <option value="negotiation">Verhandlung</option>
              <option value="won">Gewonnen</option>
              <option value="lost">Verloren</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Version</Label>
            <Input value={`V${proposal.version}`} disabled className="h-9" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price_range">Preisrahmen</Label>
          <Input
            id="price_range"
            name="price_range"
            placeholder="z.B. €15.000–25.000"
            defaultValue={proposal?.price_range ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deal_id">Deal</Label>
          <select
            id="deal_id"
            name="deal_id"
            defaultValue={proposal?.deal_id ?? ""}
            className={selectClass}
          >
            <option value="">— Kein Deal —</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_id">Kontakt</Label>
          <select
            id="contact_id"
            name="contact_id"
            defaultValue={proposal?.contact_id ?? ""}
            className={selectClass}
          >
            <option value="">— Kein Kontakt —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="company_id">Firma</Label>
          <select
            id="company_id"
            name="company_id"
            defaultValue={proposal?.company_id ?? ""}
            className={selectClass}
          >
            <option value="">— Keine Firma —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scope_notes">Scope / Leistungsumfang</Label>
        <Textarea
          id="scope_notes"
          name="scope_notes"
          rows={2}
          defaultValue={proposal?.scope_notes ?? ""}
        />
      </div>

      {proposal && (
        <>
          <div className="space-y-2">
            <Label htmlFor="objections">Einwände</Label>
            <Input
              id="objections"
              name="objections"
              placeholder="z.B. Preis zu hoch, Zeitrahmen eng"
              defaultValue={proposal?.objections ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="negotiation_notes">Verhandlungsnotizen</Label>
            <Textarea
              id="negotiation_notes"
              name="negotiation_notes"
              rows={2}
              defaultValue={proposal?.negotiation_notes ?? ""}
            />
          </div>
        </>
      )}

      {isOutcome && (
        <>
          <Separator />
          <p className="text-sm font-medium text-muted-foreground">
            {status === "won" ? "Gewonnen" : "Verloren"} — Analyse
          </p>

          <div className="space-y-2">
            <Label htmlFor="won_lost_reason">Grund</Label>
            <select
              id="won_lost_reason"
              name="won_lost_reason"
              defaultValue={proposal?.won_lost_reason ?? ""}
              className={selectClass}
            >
              <option value="">— Auswählen —</option>
              {WON_LOST_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="won_lost_details">Details</Label>
            <Textarea
              id="won_lost_details"
              name="won_lost_details"
              rows={2}
              defaultValue={proposal?.won_lost_details ?? ""}
              placeholder="Was war der konkrete Grund?"
            />
          </div>
        </>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Speichern..." : proposal ? "Aktualisieren" : "Erstellen"}
      </Button>
    </form>
  );
}
