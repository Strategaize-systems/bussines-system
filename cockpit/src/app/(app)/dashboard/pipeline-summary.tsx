import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PipelineSummary } from "./actions";

interface PipelineSummaryCardsProps {
  summaries: PipelineSummary[];
}

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function PipelineSummaryCards({ summaries }: PipelineSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {summaries.map((s) => (
        <Card key={s.pipeline.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{s.pipeline.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {s.totalDeals} Deals · {fmt.format(s.totalValue)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {s.stages.map((stage) => (
                <div key={stage.id} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color || "#6366f1" }}
                  />
                  <span className="text-sm flex-1 truncate">{stage.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {stage.dealCount}
                  </span>
                  {stage.dealValue > 0 && (
                    <span className="text-xs font-medium tabular-nums">
                      {fmt.format(stage.dealValue)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
