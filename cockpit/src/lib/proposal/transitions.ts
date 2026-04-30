// V5.5 SLC-554: Whitelist fuer Status-Transitionen.
//
// Single source of truth fuer das Status-Lifecycle-Modell `draft → sent →
// accepted | rejected | expired`. Erweiterung um neue Status (z.B. revised)
// passiert hier — Server Action `transitionProposalStatus` und UI-Buttons
// lesen ALLOWED_TRANSITIONS.
//
// Legacy-Status (open/negotiation/won/lost) sind in V2 noch in der DB
// vorhanden, treffen aber kein Mapping → `isValidTransition` returnt false.
// Das ist gewollt: alte Records bleiben unberuehrt, neue Lifecycle-Aktionen
// laufen nur auf V5.5-Status.

export type ProposalStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired";

export const ALLOWED_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

export function isValidTransition(
  from: string,
  to: string,
): boolean {
  const allowed = ALLOWED_TRANSITIONS[from as ProposalStatus];
  if (!allowed) return false;
  return allowed.includes(to as ProposalStatus);
}

// Mapping von Status zu Timestamp-Spalte. `sent` setzt `sent_at` (existing
// V2-Spalte), die anderen drei nutzen die V5.5-Lifecycle-Spalten aus MIG-026.
export const STATUS_TIMESTAMP_COLUMN: Partial<
  Record<ProposalStatus, "sent_at" | "accepted_at" | "rejected_at" | "expired_at">
> = {
  sent: "sent_at",
  accepted: "accepted_at",
  rejected: "rejected_at",
  expired: "expired_at",
};
