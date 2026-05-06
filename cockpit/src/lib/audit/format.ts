// V6.3 SLC-631 MT-5 (ISSUE-050) — Audit-Log Renderer fuer nested-changes.
//
// Ursache des Bugs: Workspace-Auto-Save in proposals/actions.ts (saveProposal)
// schreibt audit_log.changes als DOPPELT-verschachtelte Struktur:
//   { before: { tax_rate: { before: 9, after: 0 } }, after: same }
// Der bisherige Renderer in audit-log-client.tsx liest changes.before[key]
// und changes.after[key], was bei diesem Schema das innere {before,after}-
// Objekt liefert — JS rendert es als "[object Object]".
//
// Andere Audit-Aktionen (status_change, reverse_charge_toggled, V5.7 explicit
// flat-actions) schreiben flach: { before: {tax_rate: 9}, after: {tax_rate: 0} }.
// Beide Varianten existieren in der Live-DB nebeneinander.
//
// Loesung: Heuristisches Format-Detect — wenn der erste Wert in changes.before
// oder changes.after selbst ein {before, after}-Objekt ist, behandeln wir die
// Struktur als doppelt-verschachtelt. Andernfalls flach.

export type AuditChanges = {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
} | null;

export type FormattedAuditChange = {
  key: string;
  display: string;
};

function isFieldDiff(v: unknown): v is { before: unknown; after: unknown } {
  return (
    typeof v === "object" &&
    v !== null &&
    "before" in v &&
    "after" in v
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function isDoubleWrapped(
  changes: NonNullable<AuditChanges>,
): boolean {
  const sample = changes.before ?? changes.after;
  if (!sample || typeof sample !== "object") return false;
  const keys = Object.keys(sample);
  if (keys.length === 0) return false;
  return isFieldDiff((sample as Record<string, unknown>)[keys[0]]);
}

export function formatAuditChanges(
  changes: AuditChanges,
  action?: string,
): FormattedAuditChange[] {
  void action; // Reserviert fuer zukuenftige Action-spezifische Heuristiken
  if (!changes) return [];

  // Workspace-Auto-Save (action='update') schreibt doppelt-verschachtelt.
  // Wir detect das schemafrei am Sample, nicht ueber action, weil auch
  // andere zukuenftige Pfade so schreiben koennten.
  if (isDoubleWrapped(changes)) {
    const out: FormattedAuditChange[] = [];
    const fields = (changes.after ?? changes.before ?? {}) as Record<
      string,
      unknown
    >;
    for (const [key, val] of Object.entries(fields)) {
      if (isFieldDiff(val)) {
        out.push({
          key,
          display: `${key}: ${formatValue(val.before)} → ${formatValue(val.after)}`,
        });
      }
    }
    return out;
  }

  // Flat update/transition: {before:{field:val}, after:{field:val}}.
  if (changes.before && changes.after) {
    const out: FormattedAuditChange[] = [];
    const allKeys = new Set([
      ...Object.keys(changes.after),
      ...Object.keys(changes.before),
    ]);
    for (const key of allKeys) {
      const oldVal = (changes.before as Record<string, unknown>)[key];
      const newVal = (changes.after as Record<string, unknown>)[key];
      if (oldVal !== newVal) {
        out.push({
          key,
          display: `${key}: ${formatValue(oldVal)} → ${formatValue(newVal)}`,
        });
      }
    }
    return out;
  }

  // Create-Action: nur after.
  if (changes.after) {
    const out: FormattedAuditChange[] = [];
    for (const [key, val] of Object.entries(
      changes.after as Record<string, unknown>,
    )) {
      if (val !== null && val !== undefined) {
        out.push({ key, display: `${key}: ${formatValue(val)}` });
      }
    }
    return out;
  }

  // Delete-Action: nur before.
  if (changes.before) {
    const out: FormattedAuditChange[] = [];
    for (const [key, val] of Object.entries(
      changes.before as Record<string, unknown>,
    )) {
      if (val !== null && val !== undefined) {
        out.push({ key, display: `${key}: ${formatValue(val)}` });
      }
    }
    return out;
  }

  return [];
}
