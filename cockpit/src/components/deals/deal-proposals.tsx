import { Badge } from "@/components/ui/badge";

const proposalStatus: Record<string, string> = {
  draft: "Entwurf",
  sent: "Versendet",
  open: "Offen",
  negotiation: "Verhandlung",
  won: "Gewonnen",
  lost: "Verloren",
};

interface DealProposalsProps {
  proposals: any[];
}

export function DealProposals({ proposals }: DealProposalsProps) {
  if (proposals.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Keine Angebote für diesen Deal.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {proposals.map((p: any) => (
        <div
          key={p.id}
          className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
        >
          <div>
            <span className="text-sm font-medium">{p.title}</span>
            <span className="ml-2 text-xs text-slate-400">V{p.version}</span>
          </div>
          <div className="flex items-center gap-2">
            {p.price_range && (
              <span className="text-xs text-slate-500">{p.price_range}</span>
            )}
            <Badge variant="outline" className="text-[10px]">
              {proposalStatus[p.status] ?? p.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
