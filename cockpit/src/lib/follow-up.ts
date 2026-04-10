/**
 * Follow-up date calculation based on contact priority.
 * Used by: post-meeting dialog, email auto-follow-up, task creation.
 */

export type ContactPriority = "high" | "medium" | "low";

const FOLLOW_UP_DAYS: Record<ContactPriority, number> = {
  high: 2,
  medium: 5,
  low: 7,
};

/**
 * Calculate a follow-up date based on contact priority.
 * @param priority — contact priority level (defaults to "low" / 7 days)
 * @param baseDate — starting date (defaults to today)
 * @returns ISO date string (YYYY-MM-DD)
 */
export function calculateFollowUpDate(
  priority?: string | null,
  baseDate?: Date
): string {
  const days =
    FOLLOW_UP_DAYS[(priority as ContactPriority)] ?? FOLLOW_UP_DAYS.low;
  const date = baseDate ? new Date(baseDate) : new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Human-readable label for follow-up days */
export function getFollowUpLabel(priority?: string | null): string {
  const days =
    FOLLOW_UP_DAYS[(priority as ContactPriority)] ?? FOLLOW_UP_DAYS.low;
  return `${days} Tage`;
}

/** Get the number of days for a given priority */
export function getFollowUpDays(priority?: string | null): number {
  return FOLLOW_UP_DAYS[(priority as ContactPriority)] ?? FOLLOW_UP_DAYS.low;
}
