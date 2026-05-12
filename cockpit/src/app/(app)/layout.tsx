import { Sidebar } from "@/components/layout/sidebar";
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
        <Sidebar role={profile.role} />
        <div className="flex flex-1 flex-col md:pl-64">
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
