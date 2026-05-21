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
      <div className="flex min-h-screen bg-slate-50">
        <MobileLayoutShell
          role={profile.role}
          hideTeamSection={teamSize === 1}
        >
          {children}
        </MobileLayoutShell>
      </div>
    </TooltipProvider>
  );
}
