import type { PaymentMilestone } from "@/types/proposal-payment";

// V5.6 SLC-563 — Mutex-Hook fuer Skonto-Toggle (DEC-116).
// Liefert true, wenn ein "100% Vorkasse"-Milestone existiert: in dem Fall ist
// die Forderung schon vor Leistungserbringung beglichen, ein Skonto-Anreiz
// fuer fruehzeitige Zahlung waere semantisch widerspruechlich.
export function useSkontoMutex(milestones: PaymentMilestone[]): boolean {
  return milestones.some(
    (m) => m.due_trigger === "on_signature" && m.percent === 100,
  );
}
