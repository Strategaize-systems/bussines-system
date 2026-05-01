import type { PaymentMilestone } from "@/types/proposal-payment";

// V5.6 SLC-562 — Mutex-Hook fuer Skonto-Toggle.
// Liefert true, wenn ein "100% Vorkasse"-Milestone existiert (DEC-116).
// In SLC-562: keine Milestones existieren bis SLC-563 — Stub returns false.
// SLC-563 erweitert die Implementation, der API-Contract bleibt unveraendert.
export function useSkontoMutex(milestones: PaymentMilestone[]): boolean {
  // SLC-563: return milestones.some(m => m.due_trigger === "on_signature" && m.percent === 100)
  void milestones;
  return false;
}
