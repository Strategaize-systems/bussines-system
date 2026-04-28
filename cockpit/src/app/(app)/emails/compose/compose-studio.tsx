"use client";

// =============================================================
// ComposeStudio — 3-Panel-Layout-Container
// =============================================================
// Desktop: 3 Spalten (Vorlagen / Erfassen / Live-Preview)
// Mobile: 3 Tabs in derselben Route, State liegt im Container
//
// Live-Preview rendert via LivePreview-Komponente (DEC-095 renderBrandedHtml).
// Send-Action via sendComposedEmail (vom ComposeForm aus aufgerufen).

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { TemplatesPanel } from "./templates-panel";
import { ComposeForm } from "./compose-form";
import { NewTemplateDialog } from "./new-template-dialog";
import { LivePreview } from "./live-preview";
import type { EmailTemplate } from "@/app/(app)/settings/template-actions";
import type { Branding } from "@/types/branding";
import type { DealContext } from "./page";
import type { PlaceholderValues } from "@/lib/email/placeholders";
import { resolveVarsFromDeal } from "@/lib/email/variables";
import type { AttachmentMeta } from "@/lib/email/attachments-whitelist";

type Lang = "de" | "en" | "nl";

type MobileTab = "templates" | "compose" | "preview";

type ComposeStudioProps = {
  branding: Branding | null;
  templates: EmailTemplate[];
  dealContext: DealContext | null;
  initialContactId: string | null;
  initialCompanyId: string | null;
  initialTemplateId: string | null;
  senderFromAddress: string | null;
};

export function ComposeStudio({
  branding,
  templates,
  dealContext,
  initialContactId,
  initialCompanyId,
  initialTemplateId,
  senderFromAddress,
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

  // SLC-542 (DEC-104): compose_session_id ist stabil pro Page-Load (Tab-Session).
  // Reload generiert eine neue ID — bewusste Tech-Debt-Akzeptanz, da Cleanup-Cron
  // fuer verwaiste Storage-Files spaeter kommt.
  const [composeSessionId] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);

  const handleAddAttachment = useCallback((att: AttachmentMeta) => {
    setAttachments((prev) => [...prev, att]);
  }, []);

  const handleRemoveAttachment = useCallback((storagePath: string) => {
    setAttachments((prev) => prev.filter((a) => a.storagePath !== storagePath));
  }, []);

  const handleClearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

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

  // Live-Preview-Vars: empty-string-Defaults statt null, damit {{vorname}} im
  // Renderer ersetzt wird (siehe resolveVarsFromDeal). PlaceholderValues fuer
  // Templates bleibt nullable, weil Templates-Panel bei null-Werten den
  // Placeholder sichtbar laesst.
  const renderVars = useMemo(
    () =>
      resolveVarsFromDeal(
        dealContext ? { title: dealContext.dealTitle, name: null } : null,
        dealContext
          ? {
              first_name: dealContext.vorname,
              last_name: dealContext.nachname,
              position: dealContext.position,
            }
          : null,
        dealContext ? { name: dealContext.firma } : null,
      ),
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

  const previewSlot = (
    <LivePreview
      body={body}
      subject={subject}
      to={to}
      branding={branding}
      vars={renderVars}
      senderFromAddress={senderFromAddress}
      attachments={attachments}
    />
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
      composeSessionId={composeSessionId}
      attachments={attachments}
      onAddAttachment={handleAddAttachment}
      onRemoveAttachment={handleRemoveAttachment}
      onClearAttachments={handleClearAttachments}
    />
  );

  return (
    <>
      {/* Desktop: 3-Panel-Grid (md+) */}
      <div className="hidden md:grid md:grid-cols-[320px_minmax(0,1fr)_480px] md:gap-6">
        <aside className="min-h-[680px]">{templatesPanel}</aside>
        <main className="min-h-[680px]">{composeForm}</main>
        <aside className="min-h-[680px]">{previewSlot}</aside>
      </div>

      {/* Mobile: 3 Tabs in derselben Route */}
      <div className="md:hidden">
        <div className="mb-4 flex gap-1 rounded-lg border-2 border-slate-200 bg-slate-50 p-1 text-xs font-bold">
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
                  ? "flex-1 rounded-md bg-white px-3 py-2 text-[#120774] shadow-sm transition-all"
                  : "flex-1 rounded-md px-3 py-2 text-slate-500 transition-all hover:text-slate-900"
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
