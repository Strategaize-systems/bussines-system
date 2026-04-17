// =============================================================
// Server Push Helper (SLC-418 / MT-6)
// =============================================================
// Sends web push notifications via the web-push library.
// Handles 410 Gone (expired subscription) by clearing the DB entry.

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Configure VAPID once at module level
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@strategaizetransition.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

export interface PushResult {
  success: boolean;
  /** true if subscription was removed (410 Gone) */
  subscriptionRemoved?: boolean;
  error?: string;
}

/**
 * Send a push notification to a user by user_id.
 * Reads push_subscription from user_settings.
 * Returns { success: false } if no subscription found.
 * On 410 Gone: removes the stale subscription from DB.
 */
export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { success: false, error: "VAPID keys not configured" };
  }

  const admin = createAdminClient();

  // Fetch subscription
  const { data: settings } = await admin
    .from("user_settings")
    .select("push_subscription")
    .eq("user_id", userId)
    .single();

  const subscription = settings?.push_subscription;
  if (!subscription || typeof subscription !== "object" || !("endpoint" in subscription)) {
    return { success: false, error: "no_subscription" };
  }

  try {
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (err: unknown) {
    const statusCode =
      err && typeof err === "object" && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : 0;

    // 410 Gone or 404 — subscription expired, clean up
    if (statusCode === 410 || statusCode === 404) {
      console.log(`[Push] Subscription expired for user ${userId} (${statusCode}), removing`);
      await admin
        .from("user_settings")
        .update({ push_subscription: null, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      return { success: false, subscriptionRemoved: true, error: "subscription_expired" };
    }

    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Push] Failed to send to user ${userId}:`, message);
    return { success: false, error: message };
  }
}
