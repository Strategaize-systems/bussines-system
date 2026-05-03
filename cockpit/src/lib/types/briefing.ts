// =============================================================
// V5.6 SLC-564 — Pre-Call Briefing Type Definitions + Constants
// =============================================================
// Re-exports DealBriefing as BriefingPayload for the persisted-activity
// path. The cron runs LLM -> validateDealBriefing -> JSON.stringify into
// activities.description. ActivityBriefingCard parses it back via this type.

import type { DealBriefing } from "@/lib/ai/types";

export type BriefingPayload = DealBriefing;

export const MAX_BRIEFING_RETRIES = 3;

export interface BriefingPushData {
  dealId: string;
  meetingId: string;
  briefingActivityId: string;
  clickThroughUrl: string;
}
