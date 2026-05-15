import { getImapSyncStatus } from "./imap-actions";
import { ImapStatus } from "./imap-status";
import { getProfile } from "@/lib/auth/get-profile";
import {
  Shield,
  Bell,
  FileText,
  Palette,
  Receipt,
  Zap,
  Megaphone,
  GitBranch,
  Mail,
  Clock,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import type { Role } from "@/lib/auth/types";

interface SettingsTile {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconWrapperClasses: string;
  iconClasses: string;
  visibleFor: readonly [Role, ...Role[]];
}

const ALL_ROLES: readonly [Role, Role, Role] = ["admin", "teamlead", "member"];
const ADMIN_TEAMLEAD: readonly [Role, Role] = ["admin", "teamlead"];
const ADMIN_ONLY: readonly [Role] = ["admin"];

// SLC-711 DEC-196: Permission-Matrix dreistufig (Admin / Admin+Teamlead / Alle).
const SETTINGS_TILES: readonly SettingsTile[] = [
  {
    href: "/settings/working-hours",
    label: "Arbeitszeit",
    description: "Start- und End-Zeit fuer Kalender-Working-Hours-Filter",
    icon: Clock,
    iconWrapperClasses: "bg-blue-50",
    iconClasses: "text-blue-700",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/settings/meetings",
    label: "Meeting-Einstellungen",
    description: "Erinnerungen, Kalender und KI-Agenda",
    icon: Bell,
    iconWrapperClasses: "bg-orange-50",
    iconClasses: "text-orange-600",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/settings/briefing",
    label: "Pre-Call Briefing",
    description: "Push-Notifications und Inhalt des Pre-Call-Briefings",
    icon: Bell,
    iconWrapperClasses: "bg-yellow-50",
    iconClasses: "text-yellow-700",
    visibleFor: ALL_ROLES,
  },
  {
    href: "/settings/branding",
    label: "Branding",
    description: "Logo, Farben, Schrift und Footer fuer ausgehende Mails",
    icon: Palette,
    iconWrapperClasses: "bg-violet-50",
    iconClasses: "text-violet-700",
    visibleFor: ADMIN_ONLY,
  },
  {
    href: "/settings/payment-terms",
    label: "Zahlungsbedingungen",
    description: "Vorlagen fuer Angebote (Default + Custom-Templates)",
    icon: Receipt,
    iconWrapperClasses: "bg-emerald-50",
    iconClasses: "text-emerald-700",
    visibleFor: ADMIN_ONLY,
  },
  {
    href: "/settings/compliance",
    label: "Einwilligungstexte",
    description: "DSGVO-Standardvorlagen fuer Meeting, E-Mail und Cal.com",
    icon: FileText,
    iconWrapperClasses: "bg-rose-50",
    iconClasses: "text-rose-700",
    visibleFor: ADMIN_ONLY,
  },
  {
    href: "/settings/pipelines",
    label: "Pipelines & Stages",
    description:
      "Pipelines anlegen, Stages konfigurieren und Reihenfolge festlegen",
    icon: GitBranch,
    iconWrapperClasses: "bg-indigo-50",
    iconClasses: "text-indigo-700",
    visibleFor: ADMIN_ONLY,
  },
  {
    href: "/settings/automation",
    label: "Workflow-Automation",
    description:
      "Wenn-Dann-Regeln fuer Routine-Reaktionen (Stage-Change, Activity, Deal-Create)",
    icon: Zap,
    iconWrapperClasses: "bg-amber-50",
    iconClasses: "text-amber-600",
    visibleFor: ADMIN_TEAMLEAD,
  },
  {
    href: "/settings/campaigns",
    label: "Kampagnen",
    description:
      "Kampagnen-Verwaltung mit Tracking-Links + Performance-KPIs (Klicks, Leads, Deals, Conversion-Rate)",
    icon: Megaphone,
    iconWrapperClasses: "bg-sky-50",
    iconClasses: "text-sky-600",
    visibleFor: ADMIN_TEAMLEAD,
  },
  {
    href: "/settings/templates",
    label: "E-Mail-Templates",
    description: "Mehrsprachige Vorlagen fuer ausgehende E-Mails (DE / NL / EN)",
    icon: Mail,
    iconWrapperClasses: "bg-cyan-50",
    iconClasses: "text-cyan-700",
    visibleFor: ADMIN_TEAMLEAD,
  },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  teamlead: "Teamlead",
  member: "Operator",
};

export default async function SettingsPage() {
  const profile = await getProfile();
  const role = profile.role;
  const visibleTiles = SETTINGS_TILES.filter((t) => t.visibleFor.includes(role));
  // SLC-711 DEC-196: IMAP ist Admin-Konzern → ImapStatus nur fuer Admin.
  const imapSync = role === "admin" ? await getImapSyncStatus() : null;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Einstellungen"
        subtitle="Pipelines, Stages und Templates konfigurieren"
      />
      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Role display */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <Shield className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Deine Rolle</p>
                <p className="text-sm text-slate-500">{ROLE_LABEL[role]}</p>
              </div>
            </div>
          </div>

          {visibleTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.href} href={tile.href} className="block">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${tile.iconWrapperClasses}`}
                    >
                      <Icon className={`h-4 w-4 ${tile.iconClasses}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {tile.label}
                      </p>
                      <p className="text-sm text-slate-500">{tile.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {imapSync ? <ImapStatus syncState={imapSync} /> : null}
        </div>
      </main>
    </div>
  );
}
