// =============================================================
// Push Notification Body Builder (SLC-418 / MT-3)
// =============================================================
// Builds a compact push notification body for meeting reminders.
// Target: ~140 chars max. Fields per FEAT-409 AC-7:
//   Title: Meeting title (in notification title)
//   Body: Participants short list, last contact date, open action items count
//   Click: navigates to /meetings/{id} (deal context available there)

export interface ReminderBodyInput {
  meetingTitle: string;
  meetingId: string;
  /** Contact names: ["Max Mustermann", "Anna Schmidt"] */
  contactNames: string[];
  /** ISO date of last interaction with primary contact, or null */
  lastContactDate: string | null;
  /** Number of open action items for the deal */
  openActionItems: number;
  /** Deal name for context */
  dealName: string | null;
}

export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
}

/**
 * Shorten a full name to "First L." format.
 * "Max Mustermann" → "Max M."
 */
function shortenName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || "?";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/**
 * Format a relative date like "vor 3 Tagen", "heute", "vor 2 Wochen".
 */
function relativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  if (days < 14) return `vor ${days} Tagen`;
  const weeks = Math.floor(days / 7);
  return `vor ${weeks} Wochen`;
}

export function buildReminderBody(input: ReminderBodyInput): PushPayload {
  const parts: string[] = [];

  // Participants short list: "mit Max M. + 2"
  if (input.contactNames.length > 0) {
    const first = shortenName(input.contactNames[0]);
    if (input.contactNames.length === 1) {
      parts.push(`mit ${first}`);
    } else {
      parts.push(`mit ${first} + ${input.contactNames.length - 1}`);
    }
  }

  // Last contact date
  if (input.lastContactDate) {
    parts.push(`Kontakt ${relativeDate(input.lastContactDate)}`);
  }

  // Open action items
  if (input.openActionItems > 0) {
    parts.push(
      input.openActionItems === 1
        ? "1 offene Aktion"
        : `${input.openActionItems} offene Aktionen`
    );
  }

  // Deal name (truncate if needed)
  if (input.dealName) {
    const maxDealLen = 30;
    const dealShort =
      input.dealName.length > maxDealLen
        ? input.dealName.slice(0, maxDealLen - 1) + "\u2026"
        : input.dealName;
    parts.push(dealShort);
  }

  return {
    title: input.meetingTitle,
    body: parts.join(" \u00b7 "), // middle dot separator
    tag: `meeting-${input.meetingId}`,
    url: `/termine`,
  };
}
