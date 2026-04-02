"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Zap } from "lucide-react";
import { createSignal, deleteSignal, type Signal } from "./signal-actions";

const SIGNAL_TYPES = [
  { value: "hohes_interesse", label: "Hohes Interesse" },
  { value: "budgetsignal", label: "Budgetsignal" },
  { value: "einwand", label: "Einwand" },
  { value: "interne_blockade", label: "Interne Blockade" },
  { value: "champion_vorhanden", label: "Champion vorhanden" },
  { value: "timing_ungeeignet", label: "Timing ungeeignet" },
  { value: "falscher_fit", label: "Falscher Fit" },
  { value: "akuter_druck", label: "Akuter Druck" },
  { value: "hoher_multiplikatorwert", label: "Hoher Multiplikatorwert" },
];

const selectClass =
  "flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const signalColors: Record<string, string> = {
  hohes_interesse: "bg-green-100 text-green-800",
  budgetsignal: "bg-green-100 text-green-800",
  champion_vorhanden: "bg-green-100 text-green-800",
  akuter_druck: "bg-blue-100 text-blue-800",
  hoher_multiplikatorwert: "bg-purple-100 text-purple-800",
  einwand: "bg-yellow-100 text-yellow-800",
  timing_ungeeignet: "bg-yellow-100 text-yellow-800",
  interne_blockade: "bg-red-100 text-red-800",
  falscher_fit: "bg-red-100 text-red-800",
};

interface SignalListProps {
  signals: Signal[];
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

export function SignalList({ signals, contactId, companyId, dealId }: SignalListProps) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createSignal(formData);
      if (!result.error) setShowForm(false);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteSignal(id);
    });
  };

  const signalLabel = (type: string) =>
    SIGNAL_TYPES.find((s) => s.value === type)?.label ?? type;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Signale ({signals.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Signal
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <form action={handleSubmit} className="space-y-2 rounded-lg border p-3">
            {contactId && <input type="hidden" name="contact_id" value={contactId} />}
            {companyId && <input type="hidden" name="company_id" value={companyId} />}
            {dealId && <input type="hidden" name="deal_id" value={dealId} />}
            <select name="signal_type" required className={selectClass}>
              <option value="">— Signal-Typ —</option>
              {SIGNAL_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <Input name="description" placeholder="Beschreibung (optional)" className="h-8" />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "..." : "Speichern"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Abbrechen
              </Button>
            </div>
          </form>
        )}

        {signals.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {signals.map((signal) => (
              <div key={signal.id} className="group flex items-center gap-1">
                <Badge className={`${signalColors[signal.signal_type] ?? "bg-gray-100 text-gray-800"} text-xs`}>
                  <Zap className="mr-1 h-3 w-3" />
                  {signalLabel(signal.signal_type)}
                </Badge>
                <button
                  onClick={() => handleDelete(signal.id)}
                  className="hidden group-hover:inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-destructive/10"
                  disabled={isPending}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Keine Signale erfasst.</p>
        )}
      </CardContent>
    </Card>
  );
}
