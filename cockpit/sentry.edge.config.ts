// BS V8.12 SLC-911 MT-1 — Sentry Edge-Runtime Init.
// Pattern aus immoscheckheft/sentry.edge.config.ts (SLC-330) + BS-Divergenz
// (beforeSend-Redact + sendDefaultPii:false + ENV-getriebene Sample-Rate).
//
// Wird via src/instrumentation.ts register() geladen wenn NEXT_RUNTIME=edge
// (Middleware + Edge-Routes). DSN aus SENTRY_DSN.

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
