"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, RotateCcw } from "lucide-react";

type SaveResult = { ok: true } | { ok: false; error: string };

type Props = {
  initialBody: string;
  updatedAt: string | null;
  onSave: (contentMd: string) => Promise<SaveResult>;
  onReset: () => Promise<SaveResult>;
};

/**
 * Markdown-Editor mit Live-Preview fuer Customer-DSE.
 *
 * Layout: 2-Panel (Textarea links, Preview rechts auf md+, gestapelt auf mobile).
 * Live-Preview via clientside dynamic-import `renderLegalMarkdown` (remark@15
 * stack — derselbe Renderer wie auf der Public-Route `/p/[slug]/datenschutz`).
 */
export function CustomerDseEditor({
  initialBody,
  updatedAt,
  onSave,
  onReset,
}: Props) {
  const [body, setBody] = useState(initialBody);
  const [savedBody, setSavedBody] = useState(initialBody);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const isDirty = body !== savedBody;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { renderLegalMarkdown } = await import("@/lib/legal/markdown");
      const html = await renderLegalMarkdown(body);
      if (!cancelled) setPreviewHtml(html);
    })();
    return () => {
      cancelled = true;
    };
  }, [body]);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await onSave(body);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setSavedBody(body);
      setMessage({ kind: "ok", text: "Gespeichert." });
    });
  }

  function handleReset() {
    if (
      !confirm(
        "Den aktuellen DSE-Text wirklich auf die Default-Vorlage zuruecksetzen? Aenderungen gehen verloren.",
      )
    ) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await onReset();
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      window.location.reload();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Markdown-Editor</CardTitle>
        <p className="text-sm text-muted-foreground">
          {updatedAt
            ? `Zuletzt gespeichert: ${new Date(updatedAt).toLocaleString("de-DE")}`
            : "Noch nicht gespeichert."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="customer-dse-body"
              className="text-sm font-medium text-slate-700"
            >
              Markdown
            </label>
            <textarea
              id="customer-dse-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={28}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm font-mono shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              disabled={isPending}
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700">
              Live-Vorschau
            </div>
            <div className="customer-dse-content rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm max-h-[44rem] overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
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
            onClick={handleReset}
            disabled={isPending}
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
