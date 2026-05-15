// SLC-713 MT-1 — `persistManualRun` extrahiert aus `winloss.ts` (Pure-Helper
// ohne "use server", analog Pattern `lib/team/bulk-reassign.ts`).
//
// Why: `winloss.ts` ist ein "use server"-Modul, das nur `runReport` als
// Server-Action exportieren soll. `persistManualRun` ist ein interner Helper,
// der das Audit-INSERT in `auto_winloss_runs` macht — er darf NICHT als
// eigene Server-Action exposed werden (umgeht authorizeReport).
//
// Defense-in-Depth: `await assertNotReadOnlyContext()` als first line laesst
// die Mutation im Drilldown-Read-Only-Context throwen. Symbolic per ISSUE-070
// — heute kein Live-Exploit-Pfad, aber Code-Symmetrie zu DEC-189.

import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { createAdminClient } from "@/lib/supabase/admin";

export async function classifyDealStatus(dealId: string): Promise<"won" | "lost"> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("deals")
    .select("status")
    .eq("id", dealId)
    .maybeSingle();
  const status = (data as { status?: string } | null)?.status;
  if (status === "won") return "won";
  if (status === "lost") return "lost";
  // Default fuer aktive Deals: target_status='won' damit Schema-Constraint
  // erfuellt ist. Der Prompt klassifiziert selbst (aktiv / gewonnen / verloren).
  return "won";
}

export async function persistManualRun(args: {
  dealId: string;
  userId: string;
  markdown: string;
  model: string;
  completedAt: string;
}): Promise<void> {
  await assertNotReadOnlyContext();

  const supabase = createAdminClient();
  const targetStatus = await classifyDealStatus(args.dealId);
  await supabase.from("auto_winloss_runs").insert({
    deal_id: args.dealId,
    target_status: targetStatus,
    triggered_by_user_id: args.userId,
    triggered_by_system: false,
    bedrock_output: args.markdown,
    bedrock_model: args.model,
    bedrock_completed_at: args.completedAt,
    status: "succeeded",
  });
}
