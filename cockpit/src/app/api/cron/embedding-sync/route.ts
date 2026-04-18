import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmbeddingProvider } from "@/lib/ai/embeddings";

export const maxDuration = 30;

const MAX_RETRIES = 3;
const BATCH_LIMIT = 50;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const admin = createAdminClient();
  let processed = 0;
  let failed = 0;
  let skippedMaxRetries = 0;

  try {
    // Load chunks with status 'pending' or 'failed'
    const { data: chunks, error } = await admin
      .from("knowledge_chunks")
      .select("id, chunk_text, metadata, status")
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (error || !chunks || chunks.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        failed: 0,
        skipped_max_retries: 0,
        message: chunks?.length === 0 ? "No pending chunks" : error?.message,
      });
    }

    const provider = getEmbeddingProvider();

    for (const chunk of chunks) {
      const meta = (chunk.metadata ?? {}) as Record<string, unknown>;
      const retryCount = (meta.retry_count as number) ?? 0;

      // Skip if max retries exceeded
      if (chunk.status === "failed" && retryCount >= MAX_RETRIES) {
        skippedMaxRetries++;
        continue;
      }

      try {
        const embedding = await provider.embed(chunk.chunk_text);
        const vectorStr = `[${embedding.join(",")}]`;

        await admin
          .from("knowledge_chunks")
          .update({
            embedding: vectorStr,
            embedding_model: provider.modelId(),
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", chunk.id);

        processed++;

        console.log(
          `[embedding-sync] Processed chunk ${chunk.id}` +
          ` — provider=${provider.modelId()}, dims=${embedding.length}`
        );
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : "Unknown error";

        // Increment retry count
        await admin
          .from("knowledge_chunks")
          .update({
            status: "failed",
            metadata: { ...meta, retry_count: retryCount + 1, last_error: msg },
            updated_at: new Date().toISOString(),
          })
          .eq("id", chunk.id);

        console.error(`[embedding-sync] Failed chunk ${chunk.id} (retry ${retryCount + 1}/${MAX_RETRIES}):`, msg);
      }
    }

    console.log(`[embedding-sync] Done: processed=${processed}, failed=${failed}, skipped=${skippedMaxRetries}`);

    return NextResponse.json({
      success: true,
      processed,
      failed,
      skipped_max_retries: skippedMaxRetries,
    });
  } catch (err) {
    console.error("[embedding-sync] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
