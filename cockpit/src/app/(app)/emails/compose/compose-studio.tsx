"use client";

// =============================================================
// ComposeStudio — 3-Panel-Layout-Container (SLC-533 MT-2)
// =============================================================
// Desktop: 3 Spalten (Vorlagen / Erfassen / Live-Preview-Slot)
// Mobile: 3 Tabs in derselben Route, State liegt im Container
//
// Live-Preview-Render: Platzhalter, kommt in SLC-534
// Send-Action: kommt in SLC-534

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { TemplatesPanel } from "./templates-panel";
import { ComposeForm } from "./compose-form";
import { NewTemplateDialog } from "./new-template-dialog";
import type { EmailTemplate } from "@/app/(app)/settings/template-actions";
import type { Branding } from "@/types/branding";
import type { DealContext } from "./page";
import type { PlaceholderValues } from "@/lib/email/placeholders";

type Lang = "de" | "en" | "nl";

type MobileTab = "templates" | "compose" | "preview";

type ComposeStudioProps = {
  branding: Branding | null;
  templates: EmailTemplate[];
  dealContext: DealContext | null;
  initialContactId: string | null;
  initialCompanyId: string | null;
  initialTemplateId: string | null;
};

export function ComposeStudio({
  branding,
  templates,
  dealContext,
  initialContactId,
  initialCompanyId,
  initialTemplateId,
}: ComposeStudioProps) {
  const router = useRouter();

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(initialTemplateId);

  const initialLang: Lang =
    (dealContext?.contactLanguage as Lang) || "de";
  const [language, setLanguage] = useState<Lang>(initialLang);

  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("compose");

  const placeholderValues: PlaceholderValues = useMemo(
    () => ({
      vorname: dealContext?.vorname ?? null,
      nachname: dealContext?.nachname ?? null,
      firma: dealContext?.firma ?? null,
      position: dealContext?.position ?? null,
      deal: dealContext?.dealTitle ?? null,
    }),
    [dealContext],
  );

  const handleApplyTemplate = useCallback(
    ({
      subject: s,
      body: b,
      templateId: tid,
      language: lang,
    }: {
      subject: string;
      body: string;
      templateId: string;
      language: Lang;
    }) => {
      setSubject(s);
      setBody(b);
      setTemplateId(tid);
      setLanguage(lang);
      // Auf Mobile zur Erfassen-Spalte wechseln
      setMobileTab("compose");
    },
    [],
  );

  const handleTemplatesChanged = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleFormChange = useCallback(
    (changes: { to?: string; subject?: string; body?: string; followUpDate?: string }) => {
      if (changes.to !== undefined) setTo(changes.to);
      if (changes.subject !== undefined) setSubject(changes.subject);
      if (changes.body !== undefined) setBody(changes.body);
      if (changes.followUpDate !== undefined) setFollowUpDate(changes.followUpDate);
    },
    [],
  );

  // Live-Preview-Slot: Platzhalter fuer SLC-534. Layout-Stabilitaet vermeidet
  // Re-Layout zwischen Slices.
  const previewSlot = (
    <div className="flex h-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Live-Preview</h3>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-200 p-6 text-center">
        <span className="text-xs font-medium text-slate-500">
          Live-Preview kommt in SLC-534
        </span>
        <span className="text-[11px] text-slate-400">
          Branding-Renderer wird hier verdrahtet (Logo, Farben, Footer).
        </span>
        {branding && (
          <span className="mt-2 text-[10px] text-slate-400">
            Branding geladen: {branding.primaryColor ?? "Default-Farbe"}
          </span>
        )}
      </div>
    </div>
  );

  const templatesPanel = (
    <TemplatesPanel
      templates={templates}
      placeholderValues={placeholderValues}
      preferredLanguage={language}
      onApply={handleApplyTemplate}
      onCreateClick={() => setNewTemplateOpen(true)}
      onTemplatesChanged={handleTemplatesChanged}
    />
  );

  const composeForm = (
    <ComposeForm
      to={to}
      subject={subject}
      body={body}
      followUpDate={followUpDate}
      onChange={handleFormChange}
      dealId={dealContext?.dealId ?? null}
      contactId={initialContactId ?? dealContext?.contactId ?? null}
      companyId={initialCompanyId ?? null}
      templateId={templateId}
      language={language}
    />
  );

  return (
    <>
      {/* Desktop: 3-Panel-Grid (md+) */}
      <div className="hidden md:grid md:grid-cols-[300px_minmax(0,1fr)_460px] md:gap-4">
        <aside className="min-h-[640px]">{templatesPanel}</aside>
        <main className="min-h-[640px]">{composeForm}</main>
        <aside className="min-h-[640px]">{previewSlot}</aside>
      </div>

      {/* Mobile: 3 Tabs in derselben Route */}
      <div className="md:hidden">
        <div className="mb-3 flex gap-1 rounded-md bg-slate-100 p-0.5 text-[12px] font-medium">
          {(
            [
              { key: "templates" as const, label: "Vorlagen" },
              { key: "compose" as const, label: "Erfassen" },
              { key: "preview" as const, label: "Vorschau" },
            ]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMobileTab(opt.key)}
              className={
                mobileTab === opt.key
                  ? "flex-1 rounded bg-white px-2 py-1.5 text-slate-900 shadow-sm"
                  : "flex-1 rounded px-2 py-1.5 text-slate-500 hover:text-slate-900"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="min-h-[560px]">
          {mobileTab === "templates" && templatesPanel}
          {mobileTab === "compose" && composeForm}
          {mobileTab === "preview" && previewSlot}
        </div>
      </div>

      <NewTemplateDialog
        open={newTemplateOpen}
        onOpenChange={setNewTemplateOpen}
        defaultLanguage={language}
        onCreated={handleTemplatesChanged}
      />
    </>
  );
}
