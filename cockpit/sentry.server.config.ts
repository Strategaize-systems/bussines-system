// BS V8.12 SLC-911 MT-1 — Sentry Server-Side Init (Node.js Runtime).
// Pattern aus immoscheckheft/sentry.server.config.ts (SLC-330, ~70-80% byte-identisch)
// + BS-Divergenz: beforeSend-Redact (SLC-907) + sendDefaultPii:false (R-911-2)
// + SENTRY_ENVIRONMENT/SENTRY_TRACES_SAMPLE_RATE-ENV (Coolify-Pre-Step).
//
// Wird via src/instrumentation.ts register() geladen wenn NEXT_RUNTIME=nodejs.
// DSN aus SENTRY_DSN (Server-Only ENV). Ohne DSN: @sentry/nextjs self-warned,
// kein Crash (AC-911-8).

import * as Sentry from "@sentry/nextjs";
import { redactSentryEvent } from "@/lib/monitoring/redact-event";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
  replaysSessionSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: redactSentryEvent,
});
