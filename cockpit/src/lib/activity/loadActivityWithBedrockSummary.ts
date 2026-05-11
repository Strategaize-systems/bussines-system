"use server";

// SLC-665 MT-4 (DEC-170) — Activity + Bedrock-Summary Loader.
// Pure helpers stehen in ./activity-helpers (non-server, vitest-tauglich).

import { createClient } from "@/lib/supabase/server";
import {
  buildBedrockSummary,
  detectAutoReply,
} from "./activity-helpers";
import type {
  ActivityRow,
  ActivityBedrockSummary,
} from "@/components/item-sheet/types";

export interface LoadActivityResult {
  activity: ActivityRow;
  bedrockSummary?: ActivityBedrockSummary;
  autoReplyHint?: boolean;
}

export async function loadActivityWithBedrockSummary(
  activityId: string
): Promise<LoadActivityResult | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activities")
    .select(
      "id, type, title, description, summary, created_at, contact_id, company_id, deal_id, source_type, objections, risks, next_steps, participants, ai_generated"
    )
    .eq("id", activityId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;

  const activity: ActivityRow = {
    id: row.id as string,
    type: (row.type as string) ?? "note",
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    summary: (row.summary as string | null) ?? null,
    created_at: row.created_at as string,
    contact_id: (row.contact_id as string | null) ?? null,
    company_id: (row.company_id as string | null) ?? null,
    deal_id: (row.deal_id as string | null) ?? null,
    source_type: (row.source_type as string | null) ?? null,
  };

  return {
    activity,
    bedrockSummary: buildBedrockSummary(row),
    autoReplyHint: detectAutoReply(activity),
  };
}
