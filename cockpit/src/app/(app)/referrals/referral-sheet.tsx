"use client";

import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { createReferral } from "./actions";
import { useState, useTransition } from "react";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface ReferralSheetProps {
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  defaultReferrerId?: string;
}

export function ReferralSheet({ contacts, companies, deals, defaultReferrerId }: ReferralSheetProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await createReferral(formData);
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(""); }}>
      <SheetTrigger>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Empfehlung erfassen
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Neue Empfehlung</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Empfohlen von *</Label>
              <select name="referrer_id" required defaultValue={defaultReferrerId ?? ""} className={selectClass}>
                <option value="">— Multiplikator wählen —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empfohlener Kontakt</Label>
                <select name="referred_contact_id" className={selectClass}>
                  <option value="">— Auswählen —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Empfohlene Firma</Label>
                <select name="referred_company_id" className={selectClass}>
                  <option value="">— Auswählen —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deal</Label>
                <select name="deal_id" className={selectClass}>
                  <option value="">— Kein Deal —</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input name="referral_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qualität</Label>
                <select name="quality" className={selectClass}>
                  <option value="">— Auswählen —</option>
                  <option value="hoch">Hoch</option>
                  <option value="mittel">Mittel</option>
                  <option value="niedrig">Niedrig</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Ergebnis</Label>
                <select name="outcome" className={selectClass}>
                  <option value="">— Auswählen —</option>
                  <option value="offen">Offen</option>
                  <option value="gewonnen">Gewonnen</option>
                  <option value="verloren">Verloren</option>
                  <option value="nicht_qualifiziert">Nicht qualifiziert</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notizen</Label>
              <Textarea name="notes" rows={2} placeholder="Kontext zur Empfehlung" />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Speichern..." : "Empfehlung erfassen"}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
