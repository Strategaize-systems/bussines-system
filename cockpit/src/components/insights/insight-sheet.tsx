"use client";

import { useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, Send } from "lucide-react";
import { saveInsight } from "./insight-actions";

const INSIGHT_CATEGORIES = [
  { value: "marktfeedback", label: "Marktfeedback", desc: "Trends, Nachfrage, Veränderungen" },
  { value: "produktfeedback", label: "Produktfeedback", desc: "Angebot, Leistung, Wahrnehmung" },
  { value: "wettbewerb", label: "Wettbewerb", desc: "Konkurrenz, Positionierung, Vergleich" },
  { value: "prozess", label: "Prozess", desc: "Internes, Abläufe, Verbesserungen" },
  { value: "kundenbedarf", label: "Kundenbedarf", desc: "Bedürfnisse, Pain Points, Wünsche" },
];

const selectClass = "select-premium";

interface InsightSheetProps {
  sourceType: "deal" | "activity";
  sourceId: string;
  sourceTitle: string;
  sourceContent?: string;
  trigger?: React.ReactNode;
}

export function InsightSheet({
  sourceType,
  sourceId,
  sourceTitle,
  sourceContent,
  trigger,
}: InsightSheetProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    if (!category) return;
    startTransition(async () => {
      const result = await saveInsight({
        category,
        comment,
        sourceType,
        sourceId,
        sourceTitle,
        sourceContent: sourceContent ?? "",
      });
      if (!result.error) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setCategory("");
          setComment("");
        }, 1500);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSuccess(false); } }}>
      <SheetTrigger>
        {trigger ?? (
          <Button size="sm" variant="outline" className="text-xs">
            <Lightbulb className="mr-1.5 h-3.5 w-3.5 text-[#f2b705]" />
            Insight senden
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Insight an Intelligence Studio</SheetTitle>
        </SheetHeader>

        <div className="px-8 pb-8 pt-4 space-y-5">
          {success ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <div className="mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#00a84f] to-[#4dcb8b] p-3 w-fit text-white">
                <Send className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-green-800">Insight gesendet!</p>
              <p className="text-xs text-green-600 mt-1">Wird in System 4 verarbeitet.</p>
            </div>
          ) : (
            <>
              {/* Source preview */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Quelle</p>
                <p className="text-sm font-semibold text-slate-800">{sourceTitle}</p>
                {sourceContent && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-3">{sourceContent}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Kategorie *</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="">— Kategorie wählen —</option>
                  {INSIGHT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label} — {c.desc}</option>
                  ))}
                </select>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Kommentar (optional)</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Zusätzlicher Kontext oder Einordnung..."
                  rows={3}
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!category || isPending}
                className="w-full"
              >
                {isPending ? (
                  "Sende..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Insight senden
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
