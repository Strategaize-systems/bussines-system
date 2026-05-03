import { Bell } from "lucide-react";
import { getBriefingSettings } from "./actions";
import { BriefingForm } from "./briefing-form";

export const dynamic = "force-dynamic";

export default async function BriefingSettingsPage() {
  const settings = await getBriefingSettings();
  // Server-rendered: VAPID_PUBLIC_KEY is enough (no NEXT_PUBLIC_ prefix needed
  // because the value is read on the server and passed as prop to the client).
  // Pattern matches /settings/meetings/page.tsx.
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? "";

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Pre-Call Briefing
        </h1>
        <p className="text-sm text-muted-foreground">
          Vor jedem Meeting mit Deal-Zuordnung wird automatisch ein KI-Briefing
          erstellt und an dich versendet.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
            <Bell className="h-4 w-4 text-purple-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Briefing-Konfiguration</p>
            <p className="text-xs text-slate-500">
              Trigger-Zeit und Liefer-Kanaele festlegen.
            </p>
          </div>
        </div>

        <BriefingForm
          initial={settings}
          vapidPublicKey={vapidPublicKey}
        />
      </div>
    </main>
  );
}
