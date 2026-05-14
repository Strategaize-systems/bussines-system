import { MobileLayoutShell } from "@/components/layout/mobile-layout-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getProfile } from "@/lib/auth/get-profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-slate-50">
        <MobileLayoutShell role={profile.role}>{children}</MobileLayoutShell>
      </div>
    </TooltipProvider>
  );
}
