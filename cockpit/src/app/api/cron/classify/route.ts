import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyByRules } from "@/lib/ai/classifiers/rule-based";
import { classifyByLLM } from "@/lib/ai/classifiers/llm-based";
import { createAction, expireOldActions } from "@/lib/ai/action-queue";

export const maxDuration = 60;

const BATCH_SIZE = 20;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const supabase = createAdminClient();

    // ------------------------------------------------------------------
    // 1. Load unclassified emails (oldest first)
    // ------------------------------------------------------------------

    const { data: emails, error: fetchError } = await supabase
      .from("email_messages")
      .select(
        "id, from_address, from_name, subject, body_text, headers_json, in_reply_to, references_header, contact_id, company_id, deal_id, is_auto_reply, received_at"
      )
      .eq("classification", "unclassified")
      .order("received_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      throw new Error(`Failed to fetch unclassified emails: ${fetchError.message}`);
    }

    if (!emails || emails.length === 0) {
      const expired = await expireOldActions();
      console.log("[Cron/Classify] No unclassified emails. Expired actions:", expired);
      return NextResponse.json({
        success: true,
        processed: 0,
        ruleClassified: 0,
        llmClassified: 0,
        llmFailed: 0,
        expired,
      });
    }

    console.log(`[Cron/Classify] Processing ${emails.length} unclassified emails`);

    // ------------------------------------------------------------------
    // 2. Classify each email sequentially
    // ------------------------------------------------------------------

    let ruleClassified = 0;
    let llmClassified = 0;
    let llmFailed = 0;

    for (const email of emails) {
      // ------------------------------------------------------------------
      // Pass 1: Rule-based classification
      // ------------------------------------------------------------------

      const ruleResult = classifyByRules({
        from_address: email.from_address,
        from_name: email.from_name,
        subject: email.subject,
        headers_json: email.headers_json,
        in_reply_to: email.in_reply_to,
        references_header: email.references_header,
        contact_id: email.contact_id,
        company_id: email.company_id,
        deal_id: email.deal_id,
        is_auto_reply: email.is_auto_reply,
      });

      if (ruleResult.classification !== null) {
        // Rule matched — update email and move on
        const { error: updateError } = await supabase
          .from("email_messages")
          .update({
            classification: ruleResult.classification,
            priority: ruleResult.priority,
            analyzed_at: new Date().toISOString(),
          })
          .eq("id", email.id);

        if (updateError) {
          console.error(
            `[Cron/Classify] Rule update failed for ${email.id}:`,
            updateError.message
          );
        } else {
          ruleClassified++;
          console.log(
            `[Cron/Classify] Rule classified ${email.id}: ${ruleResult.classification} (${ruleResult.rule})`
          );
        }
        continue;
      }

      // ------------------------------------------------------------------
      // Pass 2: LLM classification (no rule matched)
      // ------------------------------------------------------------------

      // Gather CRM context
      let contactName: string | null = null;
      let companyName: string | null = null;
      let dealTitle: string | null = null;
      let dealStage: string | null = null;

      if (email.contact_id) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("first_name, last_name")
          .eq("id", email.contact_id)
          .single();

        if (contact) {
          contactName = [contact.first_name, contact.last_name]
            .filter(Boolean)
            .join(" ");
        }
      }

      if (email.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", email.company_id)
          .single();

        if (company) {
          companyName = company.name;
        }
      }

      if (email.deal_id) {
        const { data: deal } = await supabase
          .from("deals")
          .select("title, pipeline_stages(name)")
          .eq("id", email.deal_id)
          .single();

        if (deal) {
          dealTitle = deal.title;
          // pipeline_stages may come as object or array depending on FK cardinality
          const stage = deal.pipeline_stages as unknown as { name: string } | null;
          dealStage = stage?.name ?? null;
        }
      }

      // Call LLM classifier
      try {
        const llmResult = await classifyByLLM({
          subject: email.subject,
          from_address: email.from_address,
          from_name: email.from_name,
          body_text: email.body_text,
          received_at: email.received_at,
          contactName,
          companyName,
          dealTitle,
          dealStage,
        });

        if (!llmResult) {
          llmFailed++;
          console.error(
            `[Cron/Classify] LLM returned null for ${email.id} — will retry next run`
          );
          continue;
        }

        // Update email with LLM classification
        const { error: llmUpdateError } = await supabase
          .from("email_messages")
          .update({
            classification: llmResult.classification,
            priority: llmResult.priority,
            gatekeeper_summary: llmResult.gatekeeper_summary,
            analyzed_at: new Date().toISOString(),
          })
          .eq("id", email.id);

        if (llmUpdateError) {
          console.error(
            `[Cron/Classify] LLM update failed for ${email.id}:`,
            llmUpdateError.message
          );
          llmFailed++;
          continue;
        }

        llmClassified++;
        console.log(
          `[Cron/Classify] LLM classified ${email.id}: ${llmResult.classification} / ${llmResult.priority} / action=${llmResult.suggested_action}`
        );

        // Create action queue entry if action is not "info"
        if (llmResult.suggested_action !== "info") {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          try {
            await createAction({
              type: llmResult.suggested_action,
              action_description: llmResult.action_description,
              reasoning: llmResult.reasoning,
              entity_type: "email_message",
              entity_id: email.id,
              source: "gatekeeper",
              priority: llmResult.priority as "dringend" | "normal" | "niedrig",
              dedup_key: `gatekeeper-${email.id}`,
              expires_at: expiresAt.toISOString(),
            });
            console.log(
              `[Cron/Classify] Action created for ${email.id}: ${llmResult.suggested_action}`
            );
          } catch (actionError) {
            console.error(
              `[Cron/Classify] Action creation failed for ${email.id}:`,
              actionError
            );
          }
        }
      } catch (llmError) {
        llmFailed++;
        console.error(
          `[Cron/Classify] LLM error for ${email.id}:`,
          llmError
        );
      }
    }

    // ------------------------------------------------------------------
    // 3. Expire old pending actions
    // ------------------------------------------------------------------

    const expired = await expireOldActions();
    if (expired > 0) {
      console.log(`[Cron/Classify] Expired ${expired} old pending actions`);
    }

    // ------------------------------------------------------------------
    // 4. Return stats
    // ------------------------------------------------------------------

    const processed = ruleClassified + llmClassified + llmFailed;
    console.log(
      `[Cron/Classify] Done — processed=${processed}, rule=${ruleClassified}, llm=${llmClassified}, failed=${llmFailed}, expired=${expired}`
    );

    return NextResponse.json({
      success: true,
      processed,
      ruleClassified,
      llmClassified,
      llmFailed,
      expired,
    });
  } catch (err) {
    console.error("[Cron/Classify] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
