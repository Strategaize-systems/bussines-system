// SLC-663 MT-3 — Format-Helper für DealCard.

const eurFmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return eurFmt.format(value);
}

/**
 * Vorwärtsgewandte relative Datumsformatierung.
 *  - Datum in der Vergangenheit ⇒ "überfällig"
 *  - heute ⇒ "heute"
 *  - morgen ⇒ "morgen"
 *  - 2-13 Tage ⇒ "in N Tagen"
 *  - sonst ⇒ "in N Wochen"
 *
 * `now` ist injizierbar für deterministische Tests.
 */
export function formatDueDate(
  iso: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!iso) return null;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return null;

  const dueMid = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round(
    (dueMid.getTime() - nowMid.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return "überfällig";
  if (diffDays === 0) return "heute";
  if (diffDays === 1) return "morgen";
  if (diffDays < 14) return `in ${diffDays} Tagen`;
  const weeks = Math.round(diffDays / 7);
  return `in ${weeks} Wochen`;
}
