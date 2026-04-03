import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col md:pl-60">
          <TopBar />
          <main className="flex-1 p-6 lg:p-8 max-w-[1400px]">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
