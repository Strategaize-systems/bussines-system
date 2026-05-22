import { LegalFooter } from "@/components/layout/legal-footer";
import { MobileLayoutShell } from "@/components/layout/mobile-layout-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getProfile } from "@/lib/auth/get-profile";
import { getTeamSize } from "@/lib/team/team-size";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  const teamSize = await getTeamSize(profile);

  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <div className="flex flex-1">
          <MobileLayoutShell
            role={profile.role}
            hideTeamSection={teamSize === 1}
          >
            {children}
          </MobileLayoutShell>
        </div>
        {/* SLC-825 V8.2 — DSGVO-Public Footer-Links auch in logged-in App.
            md:pl-64 verschiebt den Footer rechts neben die fixed Sidebar. */}
        <div className="md:pl-64">
          <LegalFooter />
        </div>
      </div>
    </TooltipProvider>
  );
}
