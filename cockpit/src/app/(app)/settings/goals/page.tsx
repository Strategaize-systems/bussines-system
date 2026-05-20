import { listGoals } from "@/app/actions/goals";
import { listProducts } from "@/app/actions/products";
import { listActivityKpiTargets } from "@/app/actions/activity-kpis";
import { GoalList } from "@/components/goals/goal-list";
import { GoalForm } from "@/components/goals/goal-form";
import { CsvImportDialog } from "@/components/goals/csv-import-dialog";
import { ActivityKpiSettings } from "@/components/goals/activity-kpi-settings";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Target } from "lucide-react";

export default async function GoalsPage() {
  const [goals, products, activityTargets] = await Promise.all([
    listGoals(),
    listProducts("active"),
    listActivityKpiTargets(),
  ]);

  return (
    <main className="px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
            <Target className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ziele</h1>
            <p className="text-sm text-muted-foreground">
              Vertriebsziele verwalten und importieren
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportDialog
            products={products}
            trigger={
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                CSV Import
              </Button>
            }
          />
          <GoalForm
            products={products}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Neues Ziel
              </Button>
            }
          />
        </div>
      </div>

      <GoalList goals={goals} products={products} />

      <ActivityKpiSettings targets={activityTargets} />
    </main>
  );
}
