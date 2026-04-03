"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowRightLeft, Plus, Trash2, CheckCircle2, Clock, Building2,
} from "lucide-react";
import { createHandoff, updateHandoffStatus, deleteHandoff, type Handoff } from "./actions";
import Link from "next/link";

const selectClass = "select-premium";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Ausstehend", color: "bg-yellow-100 text-yellow-800" },
  in_progress: { label: "In Übergabe", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Abgeschlossen", color: "bg-green-100 text-green-800" },
};

interface HandoffsClientProps {
  handoffs: Handoff[];
  deals: { id: string; title: string }[];
  companies: { id: string; name: string }[];
}

export function HandoffsClient({ handoffs, deals, companies }: HandoffsClientProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const pendingCount = handoffs.filter((h) => h.status === "pending").length;
  const completedCount = handoffs.filter((h) => h.status === "completed").length;

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await createHandoff(formData);
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Übergaben</h1>
          <p className="text-sm font-medium text-slate-500">
            {handoffs.length} gesamt · {pendingCount} ausstehend · {completedCount} abgeschlossen
          </p>
        </div>
        <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(""); }}>
          <SheetTrigger>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Übergabe starten
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Neue Übergabe</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
              <form action={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deal</Label>
                    <select name="deal_id" className={selectClass}>
                      <option value="">— Deal wählen —</option>
                      {deals.map((d) => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Firma</Label>
                    <select name="company_id" className={selectClass}>
                      <option value="">— Firma wählen —</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Einstiegsschiene</Label>
                  <Input name="entry_track" placeholder="z.B. Blueprint Full, Quick Assessment" />
                </div>
                <div className="space-y-2">
                  <Label>Übergebene Kontakte</Label>
                  <Input name="contacts_transferring" placeholder="z.B. Hr. Müller (CEO), Fr. Schmidt (CFO)" />
                </div>
                <div className="space-y-2">
                  <Label>Vorinformationen</Label>
                  <Textarea name="pre_information" rows={2} placeholder="Relevanter Kontext für System 1" />
                </div>
                <div className="space-y-2">
                  <Label>Gesprächs-Insights</Label>
                  <Textarea name="conversation_insights" rows={2} placeholder="Wichtige Erkenntnisse aus BD-Gesprächen" />
                </div>
                <div className="space-y-2">
                  <Label>Erwartungen</Label>
                  <Textarea name="expectations" rows={2} placeholder="Was erwartet der Kunde?" />
                </div>
                <div className="space-y-2">
                  <Label>Enthaltene Dokumente</Label>
                  <Input name="documents_included" placeholder="z.B. Angebot V2, NDA" />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Speichern..." : "Übergabe starten"}
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="space-y-2">
        {handoffs.length > 0 ? (
          handoffs.map((handoff) => (
            <HandoffItem key={handoff.id} handoff={handoff} />
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Keine Übergaben vorhanden.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function HandoffItem({ handoff }: { handoff: Handoff }) {
  const [isPending, startTransition] = useTransition();
  const st = statusConfig[handoff.status] ?? statusConfig.pending;

  const handleStatusChange = (status: string) => {
    startTransition(async () => {
      await updateHandoffStatus(handoff.id, status);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteHandoff(handoff.id);
    });
  };

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-3">
        <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            {handoff.deals && <span className="font-medium">{handoff.deals.title}</span>}
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
              {st.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
            {handoff.companies && (
              <Link href={`/companies/${handoff.companies.id}`} className="flex items-center gap-1 hover:underline">
                <Building2 className="h-3 w-3" />
                {handoff.companies.name}
              </Link>
            )}
            {handoff.entry_track && <span>Schiene: {handoff.entry_track}</span>}
            {handoff.handed_off_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(handoff.handed_off_at).toLocaleDateString("de-DE")}
              </span>
            )}
          </div>
          {handoff.pre_information && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{handoff.pre_information}</p>
          )}
        </div>
        <div className="flex items-start gap-1 shrink-0">
          {handoff.status === "pending" && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleStatusChange("in_progress")} disabled={isPending} title="In Übergabe">
              <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" />
            </Button>
          )}
          {handoff.status === "in_progress" && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleStatusChange("completed")} disabled={isPending} title="Abschließen">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
