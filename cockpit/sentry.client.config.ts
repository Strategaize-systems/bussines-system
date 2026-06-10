// BS V8.12 SLC-911 MT-1 — Sentry Client-Side Init.
// Pattern aus immoscheckheft/sentry.client.config.ts (SLC-330) + BS-Divergenz
// (beforeSend-Redact + sendDefaultPii:false + ENV-getriebene Sample-Rate).
//
// DSN aus NEXT_PUBLIC_SENTRY_DSN (Client-exposed ENV, Build-Var in Coolify).
// Ohne DSN: @sentry/nextjs self-warned, kein Crash (AC-911-8).

import * as Sentry from "@sentry/nextjs";
import { redactSentryEvent } from "@/lib/monitoring/redact-event";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
  replaysSessionSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: redactSentryEvent,
});
