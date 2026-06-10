// /api/test-sentry — BS V8.12 SLC-911 Sentry-Verification-Endpoint.
// Pattern aus immoscheckheft/src/app/api/test-sentry/route.ts (SLC-330, 1:1
// portiert — kanonische Strategaize-Quelle, Memory feedback_test_sentry_endpoint_pattern).
//
// Spec-Deviation (Deviation-Rule 4, dokumentiert in RPT): Slice-Spec nannte
// `/api/_debug/throw` — stattdessen kanonischer `/api/test-sentry`-Pattern
// gewaehlt (BLOCKING strategaize-pattern-reuse.md + source:test-endpoint Tag +
// PUBLIC_PATHS in Auth-Middleware). Funktional identisch zu AC-911-2.
//
// Organische Errors koennten im Founder-Pilot-Mode (kein Customer-Traffic)
// lange ausbleiben — daher deterministischer Test-Trigger fuer AC-911-2.
//
// Usage:
//   GET /api/test-sentry?type=error   -> Sentry.captureException(Error), 500
//   GET /api/test-sentry?type=message -> Sentry.captureMessage(level=warning), 200
//   GET /api/test-sentry              -> Hilfe-JSON, 200
//
// Events werden mit tag `source=test-endpoint` markiert (Sentry-UI-Filter).

import { NextResponse } from "next/server";

import {
  captureException,
  captureMessage,
  isSentryEnabled,
} from "@/lib/monitoring/sentry";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const sentryActive = isSentryEnabled();
  const time = new Date().toISOString();

  if (type === "error") {
    const err = new Error(
      `Test-Sentry-Error-Endpoint triggered at ${time}. ` +
        `Verification of V8.12 SLC-911 AC-911-2 (Sentry-Dashboard Visibility).`,
    );
    captureException(err, {
      source: "test-endpoint",
      metadata: {
        trigger: "GET /api/test-sentry?type=error",
        time,
        verification: "V8.12 SLC-911 AC-911-2",
      },
    });
    return NextResponse.json(
      {
        status: "error-captured",
        sentry: sentryActive ? "enabled" : "disabled-no-dsn",
        message: "Test-Error was sent to Sentry. Check Sentry dashboard.",
        verification: "V8.12 SLC-911 AC-911-2",
        time,
      },
      { status: 500 },
    );
  }

  if (type === "message") {
    captureMessage(`Test-Sentry-Message-Endpoint triggered at ${time}`, {
      source: "test-endpoint",
      level: "warning",
      metadata: {
        trigger: "GET /api/test-sentry?type=message",
        time,
        verification: "V8.12 SLC-911 AC-911-2",
      },
    });
    return NextResponse.json(
      {
        status: "message-captured",
        sentry: sentryActive ? "enabled" : "disabled-no-dsn",
        level: "warning",
        message: "Test-Message was sent to Sentry. Check Sentry dashboard.",
        verification: "V8.12 SLC-911 AC-911-2",
        time,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      status: "help",
      sentry: sentryActive ? "enabled" : "disabled-no-dsn",
      usage: {
        "GET /api/test-sentry?type=error":
          "Sentry.captureException(Error) + HTTP 500",
        "GET /api/test-sentry?type=message":
          "Sentry.captureMessage(level=warning) + HTTP 200",
        "GET /api/test-sentry": "this help",
      },
      reference: "V8.12 SLC-911 AC-911-2 Verification-Endpoint",
      time,
    },
    { status: 200 },
  );
}
