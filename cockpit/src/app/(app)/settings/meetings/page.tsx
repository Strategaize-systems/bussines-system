import { getUserSettings } from "@/app/actions/user-settings";
import { MeetingSettingsForm } from "@/components/settings/MeetingSettingsForm";

export default async function MeetingSettingsPage() {
  const settings = await getUserSettings();
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meeting-Einstellungen</h1>
        <p className="text-sm text-muted-foreground">
          Erinnerungen, Kalender-Integration und KI-Agenda konfigurieren
        </p>
      </div>

      <MeetingSettingsForm initial={settings} vapidPublicKey={vapidPublicKey} />
    </main>
  );
}
