"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, RotateCcw, Save, Info } from "lucide-react";
import { applyTemplateVariables } from "@/lib/compliance/variables";
import { COMPLIANCE_TOKENS } from "@/lib/compliance/tokens";
import {
  COMPLIANCE_TEMPLATE_LABELS,
  COMPLIANCE_TEMPLATE_DESCRIPTIONS,
  type ComplianceTemplateKey,
} from "@/lib/compliance/consent-templates";

type Props = {
  templateKey: ComplianceTemplateKey;
  initialBody: string;
  defaultBody: string;
  onSave: (
    key: ComplianceTemplateKey,
    body: string,
  ) => Promise<{ error: string }>;
  onReset: (key: ComplianceTemplateKey) => Promise<{ error: string }>;
  /** Aktuelle User-Variablen fuer die Copy-Vorschau (Profile-Daten). */
  userVars: Record<string, string>;
};

export function ComplianceTemplateBlock({
  templateKey,
  initialBody,
  defaultBody,
  onSave,
  onReset,
  userVars,
}: Props) {
  const [body, setBody] = useState(initialBody);
  const [savedBody, setSavedBody] = useState(initialBody);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const isDirty = body !== savedBody;
  const isAtDefault = body === defaultBody;

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await onSave(templateKey, body);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setSavedBody(body);
      setMessage({ kind: "ok", text: "Gespeichert." });
    });
  }

  function handleReset() {
    setMessage(null);
    startTransition(async () => {
      const result = await onReset(templateKey);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setBody(defaultBody);
      setSavedBody(defaultBody);
      setMessage({ kind: "ok", text: "Auf Default zurueckgesetzt." });
    });
  }

  async function handleCopy() {
    setMessage(null);
    const processed = applyTemplateVariables(body, userVars);
    try {
      await navigator.clipboard.writeText(processed);
      setMessage({ kind: "ok", text: "In Zwischenablage kopiert." });
    } catch {
      setMessage({
        kind: "error",
        text: "Kopieren fehlgeschlagen — bitte manuell markieren und kopieren.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {COMPLIANCE_TEMPLATE_LABELS[templateKey]}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {COMPLIANCE_TEMPLATE_DESCRIPTIONS[templateKey]}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor={`compliance-body-${templateKey}`}
            className="text-sm font-medium text-slate-700"
          >
            Markdown-Text
          </label>
          <textarea
            id={`compliance-body-${templateKey}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm font-mono shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            disabled={isPending}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-700">
            <Info className="h-3.5 w-3.5" />
            Verfuegbare Variablen
          </div>
          <ul className="grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2">
            {COMPLIANCE_TOKENS.map((token) => (
              <li key={token.name} className="flex items-baseline gap-2">
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-800">
                  {`{${token.name}}`}
                </code>
                <span className="text-[11px] text-slate-500">
                  {token.description}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">
            Unbekannte oder leere Variablen bleiben beim Kopieren sichtbar (z.B.{" "}
            <code className="rounded bg-white px-1 font-mono">
              {"{kontakt_name}"}
            </code>
            ), damit Du erkennst, was im Zieltext noch zu ersetzen ist.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-md p-2 text-sm ${
              message.kind === "ok"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-rose-50 text-rose-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSave} disabled={!isDirty || isPending}>
            <Save className="h-4 w-4" />
            Speichern
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={isPending}
            type="button"
          >
            <Copy className="h-4 w-4" />
            In Zwischenablage kopieren
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isAtDefault || isPending}
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            Auf Default zuruecksetzen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
