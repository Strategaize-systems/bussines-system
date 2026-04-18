// =============================================================
// Knowledge Indexer — Embed + Store Chunks in knowledge_chunks
// Uses EmbeddingProvider (SLC-421) + Chunker (SLC-422)
// =============================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { getEmbeddingProvider } from "@/lib/ai/embeddings";
import {
  chunkMeeting,
  chunkEmail,
  chunkActivity,
  chunkDocument,
  extractText,
  isExtractableFormat,
  type Chunk,
  type MeetingChunkInput,
  type EmailChunkInput,
  type ActivityChunkInput,
  type DocumentChunkInput,
} from "./chunker";

// ---------------------------------------------------------------
// embedAndStore (MT-7)
// ---------------------------------------------------------------

export interface EmbedResult {
  stored: number;
  failed: number;
  errors: string[];
}

/**
 * Embeds an array of chunks via the configured EmbeddingProvider
 * and stores them in knowledge_chunks.
 */
export async function embedAndStore(
  sourceType: string,
  sourceId: string,
  chunks: Chunk[],
): Promise<EmbedResult> {
  if (chunks.length === 0) return { stored: 0, failed: 0, errors: [] };

  const provider = getEmbeddingProvider();
  const admin = createAdminClient();
  const result: EmbedResult = { stored: 0, failed: 0, errors: [] };

  for (const chunk of chunks) {
    try {
      const embedding = await provider.embed(chunk.text);

      // Audit log
      console.log(
        `[indexer] Embedded chunk ${sourceType}/${sourceId}#${chunk.index}` +
        ` — provider=${provider.modelId()}, region=${process.env.EMBEDDING_REGION || "eu-central-1"}, dims=${embedding.length}`
      );

      const vectorStr = `[${embedding.join(",")}]`;

      const { error } = await admin
        .from("knowledge_chunks")
        .upsert({
          source_type: sourceType,
          source_id: sourceId,
          chunk_index: chunk.index,
          chunk_text: chunk.text,
          embedding: vectorStr,
          metadata: chunk.metadata,
          embedding_model: provider.modelId(),
          status: "active",
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "source_type,source_id,chunk_index",
        });

      if (error) {
        result.failed++;
        result.errors.push(`Chunk ${chunk.index}: ${error.message}`);
        console.error(`[indexer] Failed to store chunk ${chunk.index}:`, error.message);
      } else {
        result.stored++;
      }
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`Chunk ${chunk.index}: ${msg}`);
      console.error(`[indexer] Embedding failed for chunk ${chunk.index}:`, msg);
    }
  }

  return result;
}

// ---------------------------------------------------------------
// Re-Embedding Logic
// ---------------------------------------------------------------

/**
 * Deletes all existing active chunks for a source, then re-indexes.
 * Used when the source data has been updated.
 */
async function reindexSource(
  sourceType: string,
  sourceId: string,
  chunks: Chunk[],
): Promise<EmbedResult> {
  const admin = createAdminClient();

  // Mark old chunks as deleted
  await admin
    .from("knowledge_chunks")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .neq("status", "deleted");

  // Store new chunks
  const result = await embedAndStore(sourceType, sourceId, chunks);

  // If all new chunks stored successfully, purge old deleted ones
  if (result.failed === 0) {
    await admin
      .from("knowledge_chunks")
      .delete()
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
      .eq("status", "deleted");
  }

  return result;
}

// ---------------------------------------------------------------
// indexMeeting (MT-8)
// ---------------------------------------------------------------

export async function indexMeeting(meetingId: string): Promise<EmbedResult> {
  const admin = createAdminClient();
  const { data: meeting, error } = await admin
    .from("meetings")
    .select("id, title, scheduled_at, transcript, ai_summary, deal_id, contact_id, company_id")
    .eq("id", meetingId)
    .single();

  if (error || !meeting) {
    return { stored: 0, failed: 1, errors: [`Meeting ${meetingId} not found: ${error?.message}`] };
  }

  const input: MeetingChunkInput = {
    id: meeting.id,
    title: meeting.title,
    scheduled_at: meeting.scheduled_at,
    transcript: meeting.transcript,
    ai_summary: meeting.ai_summary as MeetingChunkInput["ai_summary"],
    deal_id: meeting.deal_id,
    contact_id: meeting.contact_id,
    company_id: meeting.company_id,
  };

  const chunks = chunkMeeting(input);
  if (chunks.length === 0) {
    return { stored: 0, failed: 0, errors: [] };
  }

  return reindexSource("meeting", meetingId, chunks);
}

// ---------------------------------------------------------------
// indexEmail (MT-8)
// ---------------------------------------------------------------

export async function indexEmail(emailId: string): Promise<EmbedResult> {
  const admin = createAdminClient();
  const { data: email, error } = await admin
    .from("email_messages")
    .select("id, thread_id, subject, body_text, received_at, deal_id, contact_id, company_id")
    .eq("id", emailId)
    .single();

  if (error || !email) {
    return { stored: 0, failed: 1, errors: [`Email ${emailId} not found: ${error?.message}`] };
  }

  const input: EmailChunkInput = {
    id: email.id,
    thread_id: email.thread_id,
    subject: email.subject,
    body_text: email.body_text,
    received_at: email.received_at,
    deal_id: email.deal_id,
    contact_id: email.contact_id,
    company_id: email.company_id,
  };

  const chunks = chunkEmail(input);
  if (chunks.length === 0) {
    return { stored: 0, failed: 0, errors: [] };
  }

  return reindexSource("email", emailId, chunks);
}

// ---------------------------------------------------------------
// indexActivity (MT-8)
// ---------------------------------------------------------------

export async function indexActivity(activityId: string): Promise<EmbedResult> {
  const admin = createAdminClient();
  const { data: activity, error } = await admin
    .from("activities")
    .select("id, type, title, description, deal_id, contact_id, company_id, created_at")
    .eq("id", activityId)
    .single();

  if (error || !activity) {
    return { stored: 0, failed: 1, errors: [`Activity ${activityId} not found: ${error?.message}`] };
  }

  const input: ActivityChunkInput = {
    id: activity.id,
    type: activity.type,
    title: activity.title,
    description: activity.description,
    deal_id: activity.deal_id,
    contact_id: activity.contact_id,
    company_id: activity.company_id,
    created_at: activity.created_at,
  };

  const chunks = chunkActivity(input);
  if (chunks.length === 0) {
    return { stored: 0, failed: 0, errors: [] };
  }

  return reindexSource("deal_activity", activityId, chunks);
}

// ---------------------------------------------------------------
// indexDocument (MT-8)
// ---------------------------------------------------------------

export async function indexDocument(documentId: string): Promise<EmbedResult> {
  const admin = createAdminClient();
  const { data: doc, error } = await admin
    .from("documents")
    .select("id, name, file_path, file_type, deal_id, contact_id, company_id, created_at")
    .eq("id", documentId)
    .single();

  if (error || !doc) {
    return { stored: 0, failed: 1, errors: [`Document ${documentId} not found: ${error?.message}`] };
  }

  if (!isExtractableFormat(doc.name)) {
    console.warn(`[indexer] Skipping document ${doc.name}: unsupported format`);
    return { stored: 0, failed: 0, errors: [] };
  }

  // Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await admin
    .storage
    .from("documents")
    .download(doc.file_path);

  if (downloadError || !fileData) {
    return { stored: 0, failed: 1, errors: [`Download failed for ${doc.name}: ${downloadError?.message}`] };
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const text = await extractText(doc.name, buffer);

  if (!text || text.trim().length === 0) {
    console.warn(`[indexer] No text extracted from document ${doc.name}`);
    return { stored: 0, failed: 0, errors: [] };
  }

  const input: DocumentChunkInput = {
    id: doc.id,
    name: doc.name,
    deal_id: doc.deal_id,
    contact_id: doc.contact_id,
    company_id: doc.company_id,
    created_at: doc.created_at,
  };

  const chunks = chunkDocument(input, text);
  if (chunks.length === 0) {
    return { stored: 0, failed: 0, errors: [] };
  }

  return reindexSource("document", documentId, chunks);
}
