import { getPipelines, getPipelineStages } from "../pipeline/actions";
import { PipelineConfig } from "./pipeline-config";
import { TemplatesConfig } from "./templates-config";
import { getEmailTemplates } from "./template-actions";
import { getImapSyncStatus } from "./imap-actions";
import { ImapStatus } from "./imap-status";
import { getCurrentUserRole } from "@/lib/audit";
import { Shield, Bell, FileText } from "lucide-react";
import Link from "next/link";
import type { PipelineStage } from "../pipeline/actions";

export default async function SettingsPage() {
  const [pipelines, role, templates, imapSync] = await Promise.all([
    getPipelines(),
    getCurrentUserRole(),
    getEmailTemplates(),
    getImapSyncStatus(),
  ]);

  // Load stages for all pipelines
  const stagesResults = await Promise.all(
    pipelines.map((p) => getPipelineStages(p.id))
  );

  const stagesByPipeline: Record<string, PipelineStage[]> = {};
  pipelines.forEach((p, i) => {
    stagesByPipeline[p.id] = stagesResults[i];
  });

  const roleLabel = role === "admin" ? "Administrator" : "Operator";

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">
          Pipelines, Stages und Templates konfigurieren
        </p>
      </div>

      {/* Role display */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
            <Shield className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Deine Rolle</p>
            <p className="text-sm text-slate-500">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Meeting settings link */}
      <Link href="/settings/meetings" className="block">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
              <Bell className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Meeting-Einstellungen</p>
              <p className="text-sm text-slate-500">Erinnerungen, Kalender und KI-Agenda</p>
            </div>
          </div>
        </div>
      </Link>

      {/* Compliance settings link */}
      <Link href="/settings/compliance" className="block">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <FileText className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Einwilligungstexte</p>
              <p className="text-sm text-slate-500">DSGVO-Standardvorlagen fuer Meeting, E-Mail und Cal.com</p>
            </div>
          </div>
        </div>
      </Link>

      <ImapStatus syncState={imapSync} />

      <PipelineConfig pipelines={pipelines} stagesByPipeline={stagesByPipeline} />

      <TemplatesConfig templates={templates} />
    </main>
  );
}
