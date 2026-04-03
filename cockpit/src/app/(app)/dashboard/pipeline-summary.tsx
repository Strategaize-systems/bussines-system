import Link from "next/link";
import type { PipelineSummary } from "./actions";

interface PipelineSummaryCardsProps {
  summaries: PipelineSummary[];
}

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const pipelineLinks: Record<string, string> = {
  "Multiplikatoren": "/pipeline/multiplikatoren",
  "Unternehmer-Chancen": "/pipeline/unternehmer",
};

export function PipelineSummaryCards({ summaries }: PipelineSummaryCardsProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {summaries.map((s) => {
        const maxDeals = Math.max(...s.stages.map((st) => st.dealCount), 1);
        const href = pipelineLinks[s.pipeline.name] || "/pipeline/multiplikatoren";

        return (
          <Link key={s.pipeline.id} href={href} className="group">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-0.5"
              style={{ boxShadow: "0 1px 3px rgb(0 0 0 / 0.1)" }}
            >
              {/* Gradient header */}
              <div className="h-1 bg-gradient-to-r from-[#120774] via-[#4454b8] to-[#00a84f]" />

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{s.pipeline.name}</h3>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                      {s.totalDeals} Deals
                    </p>
                  </div>
                  <div className="text-xl font-bold tabular-nums"
                    style={{
                      background: "linear-gradient(to right, #00a84f, #4dcb8b)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {fmt.format(s.totalValue)}
                  </div>
                </div>

                <div className="space-y-2.5">
                  {s.stages.map((stage) => (
                    <div key={stage.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: stage.color || "#6366f1",
                              boxShadow: stage.dealCount > 0 ? `0 0 4px ${stage.color || "#6366f1"}60` : "none",
                            }}
                          />
                          <span className="text-xs font-medium text-slate-600">{stage.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500 tabular-nums">{stage.dealCount}</span>
                          {stage.dealValue > 0 && (
                            <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                              {fmt.format(stage.dealValue)}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(stage.dealCount / maxDeals) * 100}%`,
                            backgroundColor: stage.color || "#6366f1",
                            boxShadow: stage.dealCount > 0 ? `0 0 4px ${stage.color || "#6366f1"}40` : "none",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
