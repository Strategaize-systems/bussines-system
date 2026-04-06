"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTransition } from "react";
import { saveFitAssessment, type FitAssessment } from "./actions";

const selectClass = "select-premium";

const SCORE_OPTIONS = [
  { value: "", label: "—" },
  { value: "1", label: "1 (Niedrig)" },
  { value: "2", label: "2" },
  { value: "3", label: "3 (Mittel)" },
  { value: "4", label: "4" },
  { value: "5", label: "5 (Hoch)" },
];

const COMPANY_CRITERIA = [
  { field: "exit_relevance_score", label: "Exit-/Nachfolgebezug" },
  { field: "ai_readiness_score", label: "KI-/Strukturbedarf" },
  { field: "decision_maker_score", label: "Entscheiderzugang" },
  { field: "budget_score", label: "Budgetpotenzial" },
  { field: "complexity_score", label: "Komplexität passend?" },
  { field: "willingness_score", label: "Wille zur Mitarbeit?" },
  { field: "champion_score", label: "Interner Champion?" },
  { field: "strategic_score", label: "Strategische Relevanz" },
];

const MULTIPLIER_CRITERIA = [
  { field: "target_access_score", label: "Zugang zu Zielgruppe?" },
  { field: "trust_score", label: "Vertrauen?" },
  { field: "professionalism_score", label: "Professionalität?" },
  { field: "referral_quality_score", label: "Empfehlungsqualität?" },
  { field: "cooperation_score", label: "Zusammenarbeit?" },
  { field: "conflict_score", label: "Konfliktpotenzial? (5=kein Konflikt)" },
  { field: "brand_fit_score", label: "Markenfit?" },
];

const trafficLightColors: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

interface FitAssessmentFormProps {
  entityType: "company" | "multiplier";
  entityId: string;
  assessment: FitAssessment | null;
}

export function FitAssessmentForm({ entityType, entityId, assessment }: FitAssessmentFormProps) {
  const [isPending, startTransition] = useTransition();
  const criteria = entityType === "company" ? COMPANY_CRITERIA : MULTIPLIER_CRITERIA;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await saveFitAssessment(formData);
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="entity_type" value={entityType} />
      <input type="hidden" name="entity_id" value={entityId} />

      {/* Current score display */}
      {assessment && assessment.overall_score !== null && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className={`inline-block h-4 w-4 rounded-full ${trafficLightColors[assessment.traffic_light ?? ""] ?? "bg-gray-300"}`} />
          <div>
            <span className="text-sm font-medium">Score: {assessment.overall_score}/5</span>
            {assessment.verdict && (
              <span className="ml-2 text-sm text-muted-foreground">— {assessment.verdict}</span>
            )}
          </div>
        </div>
      )}

      {/* Score fields */}
      <div className="grid grid-cols-2 gap-3">
        {criteria.map((c) => (
          <div key={c.field} className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">{c.label}</Label>
            <select
              name={c.field}
              defaultValue={assessment?.[c.field as keyof FitAssessment]?.toString() ?? ""}
              className={selectClass}
            >
              {SCORE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Verdict */}
      <div className="space-y-2">
        <Label htmlFor="verdict">Verdict</Label>
        <select
          id="verdict"
          name="verdict"
          defaultValue={assessment?.verdict ?? ""}
          className={selectClass}
        >
          <option value="">— Auswählen —</option>
          <option value="weiterverfolgen">Weiterverfolgen</option>
          <option value="beobachten">Beobachten</option>
          <option value="raus">Raus</option>
        </select>
      </div>

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="reason">Begründung</Label>
        <Textarea
          id="reason"
          name="reason"
          rows={2}
          defaultValue={assessment?.reason ?? ""}
          placeholder="Warum diese Einschätzung?"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Speichern..." : "Bewertung speichern"}
      </Button>
    </form>
  );
}
