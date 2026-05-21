import { getImapSyncStatus } from "./imap-actions";
import { ImapStatus } from "./imap-status";
import { getProfile } from "@/lib/auth/get-profile";
import { Shield } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import type { Role } from "@/lib/auth/types";
import { filterVisibleSections } from "./sections";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  teamlead: "Teamlead",
  member: "Operator",
};

export default async function SettingsPage() {
  const profile = await getProfile();
  const role = profile.role;
  // SLC-711 DEC-196: IMAP ist Admin-Konzern → ImapStatus nur fuer Admin.
  const imapSync = role === "admin" ? await getImapSyncStatus() : null;

  const visibleSections = filterVisibleSections(role);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Einstellungen"
        subtitle="Pipelines, Stages und Templates konfigurieren"
      />
      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-8">
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

          {visibleSections.map((section) => (
            <section key={section.key} className="space-y-3">
              <div className="px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {section.title}
                </h2>
                <p className="text-sm text-slate-500">{section.description}</p>
              </div>
              <div className="space-y-3">
                {section.tiles.map((tile) => {
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
              </div>
            </section>
          ))}

          {imapSync ? <ImapStatus syncState={imapSync} /> : null}
        </div>
      </main>
    </div>
  );
}
