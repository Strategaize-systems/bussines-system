/**
 * Cal.com Webhook Endpoint
 * POST /api/webhooks/calcom
 * Receives Cal.com booking events → syncs to calendar_events.
 * SLC-407 / FEAT-406
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  handleWebhookEvent,
  type CalcomWebhookPayload,
} from "@/lib/calcom/webhook-handler";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify webhook signature
  const signature = request.headers.get("x-cal-signature-256");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: CalcomWebhookPayload;
  try {
    event = JSON.parse(rawBody) as CalcomWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await handleWebhookEvent(event);

    return NextResponse.json({
      ok: true,
      event: event.triggerEvent,
      ...result,
    });
  } catch (error) {
    console.error("[calcom-webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
