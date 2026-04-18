// =============================================================
// Knowledge Backfill — Einmaliger Bestandsimport aller Quellen
// =LC-423: Idempotent, sequentiell, mit Rate-Limiting
// =============================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { indexMeeting, indexEmail, indexActivity, indexDocument } from "./indexer";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface BackfillSourceResult {
  processed: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface BackfillResult {
  meetings: BackfillSourceResult;
  emails: BackfillSourceResult;
  activities: BackfillSourceResult;
  documents: BackfillSourceResult;
  total: BackfillSourceResult;
  durationMs: number;
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function emptyResult(): BackfillSourceResult {
  return { processed: 0, skipped: 0, failed: 0, errors: [] };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getExistingSourceIds(sourceType: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("knowledge_chunks")
    .select("source_id")
    .eq("source_type", sourceType)
    .eq("status", "active");

  return new Set((data ?? []).map((r: { source_id: string }) => r.source_id));
}

// ---------------------------------------------------------------
// runBackfill
// ---------------------------------------------------------------

export async function runBackfill(options?: {
  limit?: number;
  offset?: number;
}): Promise<BackfillResult> {
  const start = Date.now();
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const [meetings, emails, activities, documents] = await Promise.all([
    backfillMeetings(limit, offset),
    backfillEmails(limit, offset),
    backfillActivities(limit, offset),
    backfillDocuments(limit, offset),
  ]);

  const total: BackfillSourceResult = {
    processed: meetings.processed + emails.processed + activities.processed + documents.processed,
    skipped: meetings.skipped + emails.skipped + activities.skipped + documents.skipped,
    failed: meetings.failed + emails.failed + activities.failed + documents.failed,
    errors: [...meetings.errors, ...emails.errors, ...activities.errors, ...documents.errors],
  };

  return {
    meetings,
    emails,
    activities,
    documents,
    total,
    durationMs: Date.now() - start,
  };
}

// ---------------------------------------------------------------
// Per-Source Backfill
// ---------------------------------------------------------------

async function backfillMeetings(limit: number, offset: number): Promise<BackfillSourceResult> {
  const admin = createAdminClient();
  const result = emptyResult();

  const { data: rows, error } = await admin
    .from("meetings")
    .select("id")
    .not("transcript", "is", null)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error || !rows) return result;

  const existing = await getExistingSourceIds("meeting");

  for (const row of rows) {
    if (existing.has(row.id)) {
      result.skipped++;
      continue;
    }

    const res = await indexMeeting(row.id);
    if (res.failed > 0) {
      result.failed++;
      result.errors.push(...res.errors.map((e) => `meeting/${row.id}: ${e}`));
    } else if (res.stored > 0) {
      result.processed++;
    } else {
      result.skipped++; // empty transcript after trim
    }

    await sleep(50);
  }

  console.log(`[backfill] Meetings: ${result.processed} processed, ${result.skipped} skipped, ${result.failed} failed`);
  return result;
}

async function backfillEmails(limit: number, offset: number): Promise<BackfillSourceResult> {
  const admin = createAdminClient();
  const result = emptyResult();

  const { data: rows, error } = await admin
    .from("email_messages")
    .select("id")
    .not("body_text", "is", null)
    .order("received_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error || !rows) return result;

  const existing = await getExistingSourceIds("email");

  for (const row of rows) {
    if (existing.has(row.id)) {
      result.skipped++;
      continue;
    }

    const res = await indexEmail(row.id);
    if (res.failed > 0) {
      result.failed++;
      result.errors.push(...res.errors.map((e) => `email/${row.id}: ${e}`));
    } else if (res.stored > 0) {
      result.processed++;
    } else {
      result.skipped++;
    }

    await sleep(50);
  }

  console.log(`[backfill] Emails: ${result.processed} processed, ${result.skipped} skipped, ${result.failed} failed`);
  return result;
}

async function backfillActivities(limit: number, offset: number): Promise<BackfillSourceResult> {
  const admin = createAdminClient();
  const result = emptyResult();

  const { data: rows, error } = await admin
    .from("activities")
    .select("id")
    .not("description", "is", null)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error || !rows) return result;

  const existing = await getExistingSourceIds("deal_activity");

  for (const row of rows) {
    if (existing.has(row.id)) {
      result.skipped++;
      continue;
    }

    const res = await indexActivity(row.id);
    if (res.failed > 0) {
      result.failed++;
      result.errors.push(...res.errors.map((e) => `activity/${row.id}: ${e}`));
    } else if (res.stored > 0) {
      result.processed++;
    } else {
      result.skipped++;
    }

    await sleep(50);
  }

  console.log(`[backfill] Activities: ${result.processed} processed, ${result.skipped} skipped, ${result.failed} failed`);
  return result;
}

async function backfillDocuments(limit: number, offset: number): Promise<BackfillSourceResult> {
  const admin = createAdminClient();
  const result = emptyResult();

  const { data: rows, error } = await admin
    .from("documents")
    .select("id, name")
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error || !rows) return result;

  const existing = await getExistingSourceIds("document");

  for (const row of rows) {
    if (existing.has(row.id)) {
      result.skipped++;
      continue;
    }

    const res = await indexDocument(row.id);
    if (res.failed > 0) {
      result.failed++;
      result.errors.push(...res.errors.map((e) => `document/${row.id}: ${e}`));
    } else if (res.stored > 0) {
      result.processed++;
    } else {
      result.skipped++; // unsupported format or empty
    }

    await sleep(50);
  }

  console.log(`[backfill] Documents: ${result.processed} processed, ${result.skipped} skipped, ${result.failed} failed`);
  return result;
}
