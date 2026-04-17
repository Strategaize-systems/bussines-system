import { getUserSettings } from "@/app/actions/user-settings";
import { MeetingSettingsForm } from "@/components/settings/MeetingSettingsForm";

export default async function MeetingSettingsPage() {
  const settings = await getUserSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meeting-Einstellungen</h1>
        <p className="text-sm text-muted-foreground">
          Erinnerungen, Kalender-Integration und KI-Agenda konfigurieren
        </p>
      </div>

      <MeetingSettingsForm initial={settings} />
    </div>
  );
}
