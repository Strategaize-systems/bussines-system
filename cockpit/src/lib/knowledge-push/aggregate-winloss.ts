// V8.7-B SLC-355 MT-2 — Win/Loss-Bucketing (pure/read, DEC-289/DEC-290).
//
// Gruppiert succeeded auto_winloss_runs der letzten 7 Tage nach
// (Branche × Deal-Groesse × won/lost). KEINE company.name / contact /
// deal.title im Output — nur companies.industry (-> branche), Bucket-
// Dimensionen und die Roh-Markdowns (bedrock_output), die anschliessend
// durch den Bedrock-Pass (MT-3) und Redact (MT-5) laufen.

import {
  WINDOW_DAYS,
  getMinBucket,
  getSizeThresholds,
  sizeBucketOf,
  type SizeThresholds,
} from "./config";
import type { TargetStatus, WinLossBucket } from "./types";

// Minimale Supabase-Shape (kein @supabase/supabase-js-Import; Test injiziert Mock).
type WinLossSupabaseLike = {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: unknown
      ): {
        gte(
          column: string,
          value: string
        ): Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
    };
  };
};

export interface AggregateWinLossOptions {
  now: Date;
  minBucket?: number;
  sizeThresholds?: SizeThresholds;
}

interface WinLossRow {
  target_status: TargetStatus;
  bedrock_output: string | null;
  deals: {
    value: number | string | null;
    companies: { industry: string | null } | null;
  } | null;
}

const SELECT_COLUMNS =
  "target_status, bedrock_output, deals(value, company_id, companies(industry))";

function bucketKey(
  branche: string,
  sizeBucket: string,
  targetStatus: string
): string {
  return `${branche}|||${sizeBucket}|||${targetStatus}`;
}

export async function aggregateWinLoss(
  admin: WinLossSupabaseLike,
  opts: AggregateWinLossOptions
): Promise<WinLossBucket[]> {
  const minBucket = opts.minBucket ?? getMinBucket();
  const thresholds = opts.sizeThresholds ?? getSizeThresholds();
  const cutoff = new Date(
    opts.now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("auto_winloss_runs")
    .select(SELECT_COLUMNS)
    .eq("status", "succeeded")
    .gte("created_at", cutoff);

  if (error) {
    throw new Error(`aggregateWinLoss query failed: ${error.message}`);
  }

  const rows = (data ?? []) as WinLossRow[];
  const grouped = new Map<string, WinLossBucket>();

  for (const row of rows) {
    const markdown = row.bedrock_output?.trim();
    if (!markdown) continue; // Run ohne Analyse-Text -> ueberspringen

    const branche = row.deals?.companies?.industry?.trim() || "unknown";
    const rawValue = row.deals?.value;
    const value =
      rawValue === null || rawValue === undefined ? null : Number(rawValue);
    const sizeBucket = sizeBucketOf(value, thresholds);
    const targetStatus = row.target_status;

    const key = bucketKey(branche, sizeBucket, targetStatus);
    const existing = grouped.get(key);
    if (existing) {
      existing.dealCount += 1;
      existing.runMarkdowns.push(markdown);
    } else {
      grouped.set(key, {
        branche,
        sizeBucket,
        targetStatus,
        dealCount: 1,
        runMarkdowns: [markdown],
      });
    }
  }

  return Array.from(grouped.values()).filter((b) => b.dealCount >= minBucket);
}
