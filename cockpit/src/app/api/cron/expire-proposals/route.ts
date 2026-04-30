// V5.5 SLC-554: Auto-Expire-Cron fuer Proposals (DEC-110, taeglich 02:00 Berlin).
//
// Pattern uebernommen aus recording-retention/route.ts: x-cron-secret-Header-
// Auth + Service-Role-Client + try/catch mit JSON-Response. Coolify-Cron
// triggert den Endpoint per `node -e fetch(...)` (siehe REL-020 Release-Notes).
//
// Idempotent: mehrfache Aufrufe pro Tag erzeugen keine Doppel-Eintraege —
// die UPDATE-WHERE-Klausel filtert auf `status='sent'`, expirte Rows werden
// beim zweiten Lauf nicht mehr getroffen.

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { expireOverdueProposals } from "@/app/(app)/proposals/actions";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await expireOverdueProposals();
    console.log(
      `[Cron/ExpireProposals] expired=${result.expiredCount} ids=${result.expiredIds.join(",")}`,
    );
    return NextResponse.json({
      success: true,
      expiredCount: result.expiredCount,
      expiredIds: result.expiredIds,
    });
  } catch (err) {
    console.error("[Cron/ExpireProposals] Fatal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
