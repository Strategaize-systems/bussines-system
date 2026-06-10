// BS V8.12 SLC-911 MT-2 — Next.js Instrumentation-Hook fuer Sentry.
// Pattern aus immoscheckheft/instrumentation.ts (SLC-330, 1:1 — nur Pfad
// relativ: src/ -> ../ Repo-Root).
//
// Wird von Next.js 16 automatisch beim Server-Start aufgerufen (Server +
// Edge-Runtime). Dynamischer Import laedt die Runtime-spezifische Sentry-Init
// erst wenn der jeweilige Runtime aktiv ist — vermeidet Bundle-Verschmutzung.

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
