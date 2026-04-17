// =============================================================
// Push Subscription API — POST + DELETE /api/push/subscribe
// =============================================================
// POST: Save browser push subscription to user_settings
// DELETE: Remove push subscription from user_settings

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── POST: Save subscription ──────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  let subscription: unknown;
  try {
    subscription = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
  }

  // Basic shape validation: must have endpoint + keys
  if (
    !subscription ||
    typeof subscription !== "object" ||
    !("endpoint" in subscription) ||
    typeof (subscription as Record<string, unknown>).endpoint !== "string"
  ) {
    return NextResponse.json(
      { error: "Ungültige Push-Subscription (endpoint fehlt)" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("user_settings")
    .update({
      push_subscription: subscription,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("[Push/Subscribe] DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── DELETE: Remove subscription ──────────────────────────────

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { error } = await supabase
    .from("user_settings")
    .update({
      push_subscription: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("[Push/Unsubscribe] DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
