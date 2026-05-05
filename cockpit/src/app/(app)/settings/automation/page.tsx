import Link from "next/link";
import { Plus, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { listAutomationRules } from "./actions";
import { RuleList } from "./_components/rule-list";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const rules = await listAutomationRules();

  return (
    <main className="px-8 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Workflow-Automation
          </h1>
          <p className="text-sm text-muted-foreground">
            Wenn-Dann-Regeln fuer Routine-Reaktionen auf Stage-Wechsel, neue
            Deals oder Activities.
          </p>
        </div>
        <Link
          href="/settings/automation/new"
          className={`${buttonVariants({ variant: "default" })} gap-2 shrink-0`}
        >
          <Plus className="h-4 w-4" />
          Neue Regel
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
            <Zap className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Regeln</p>
            <p className="text-xs text-slate-500">
              Aktive Regeln werden automatisch bei passenden Trigger-Events
              ausgefuehrt. Pausierte Regeln laufen nicht.
            </p>
          </div>
        </div>

        <RuleList initialRules={rules} />
      </div>
    </main>
  );
}
