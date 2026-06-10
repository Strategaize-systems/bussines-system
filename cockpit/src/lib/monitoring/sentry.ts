// BS V8.12 SLC-911 MT-2 — Sentry-Capture-Wrapper.
// Pattern aus immoscheckheft/src/lib/monitoring/sentry.ts (SLC-330, 1:1 portiert).
//
// Stabile Caller-Signatur (captureException/captureMessage/isSentryEnabled),
// damit Caller-Sites (global-error.tsx, /api/test-sentry, kuenftig Cost-Cap-Alert
// SLC-909) unabhaengig vom Sentry-SDK bleiben.
//
// Mapping Context auf Sentry-CaptureContext:
//   context.source   -> tags.source       (kategorisches Routing in Sentry-UI)
//   context.userId   -> user.id           (User-Context-Linking)
//   context.metadata -> extra             (frei-form Diagnose-Daten)
//
// Ohne SENTRY_DSN: @sentry/nextjs handled self-warning, kein Crash (AC-911-8).

import * as Sentry from "@sentry/nextjs";

interface CaptureContext {
  source?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

function toSentryContext(
  context?: CaptureContext,
): Parameters<typeof Sentry.captureException>[1] {
  if (!context) return undefined;
  const out: Parameters<typeof Sentry.captureException>[1] = {};
  if (context.source !== undefined) out.tags = { source: context.source };
  if (context.userId !== undefined) out.user = { id: context.userId };
  if (context.metadata !== undefined) out.extra = context.metadata;
  return out;
}

export function captureException(
  error: Error | unknown,
  context?: CaptureContext,
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(err, toSentryContext(context));
}

export function captureMessage(
  message: string,
  context?: CaptureContext & { level?: "error" | "warning" | "info" },
): void {
  const level = context?.level ?? "info";
  const sentryContext = toSentryContext(context);
  Sentry.captureMessage(message, { ...sentryContext, level });
}

export function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}
