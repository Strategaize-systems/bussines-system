// SLC-665 MT-4 — Pure helpers fuer den ItemSheet-Activity-Branch.
// Werden vom Server-Action-Pfad (loadActivityWithBedrockSummary.ts) und
// von Vitest importiert. Bewusst ohne "use server"-Direktive damit
// nicht-async-Exports erlaubt sind.

import type {
  ActivityRow,
  ActivityBedrockSummary,
} from "@/components/item-sheet/types";

export function buildBedrockSummary(
  row: Record<string, unknown>
): ActivityBedrockSummary | undefined {
  const risiken = splitLines(row.risks);
  const einwaende = splitLines(row.objections);
  const naechsteSchritte = splitLines(row.next_steps);
  const teilnehmer = splitLines(row.participants);
  const zusammenfassung = (row.summary as string | null)?.trim() || undefined;

  const hasAny =
    risiken.length > 0 ||
    einwaende.length > 0 ||
    naechsteSchritte.length > 0 ||
    teilnehmer.length > 0 ||
    Boolean(zusammenfassung);

  if (!hasAny) return undefined;
  return {
    risiken,
    einwaende,
    naechsteSchritte,
    teilnehmer,
    zusammenfassung,
  };
}

export function detectAutoReply(activity: ActivityRow): boolean {
  if (activity.type !== "email" && activity.type !== "inbox") return false;
  const haystack = `${activity.title ?? ""} ${activity.description ?? ""} ${activity.summary ?? ""}`
    .toLowerCase();
  if (!haystack.trim()) return false;
  return (
    haystack.includes("out of office") ||
    haystack.includes("automatische antwort") ||
    haystack.includes("abwesenheit") ||
    haystack.includes("auto-reply") ||
    haystack.includes("autoreply")
  );
}

function splitLines(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n/)
    .map((s) => s.replace(/^[-*•]\s+/, "").trim())
    .filter((s) => s.length > 0);
}
