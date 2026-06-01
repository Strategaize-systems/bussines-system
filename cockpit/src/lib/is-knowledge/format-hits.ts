// V8.7-A SLC-871 MT-4 — Pure-Helpers fuer IS-Knowledge-Hits-Rendering
// (DEC-255 + DEC-256). Keine Server-Side-Effekte, Vitest-testbar ohne
// Mocks oder jsdom.

import type { IsKnowledgeHit } from "@/components/ki-workspace/types";

import { IsKnowledgeError, type KnowledgeSearchHit } from "./types";

/**
 * Konvertiert die voll-typisierten IS-Hits (mit body_markdown etc.) zur
 * schlanken Wire-Form fuer das KI-Workspace UI. Behaelt nur id/title/
 * similarity — der Rest fliesst optional in den Bedrock-Prompt-Context,
 * nicht ins UI.
 */
export function toIsKnowledgeHits(
  hits: KnowledgeSearchHit[]
): IsKnowledgeHit[] {
  return hits.map((h) => ({
    id: h.id,
    title: h.title,
    similarity: h.similarity,
  }));
}

/**
 * Baut den Markdown-Block "Aus Strategaize-Wissens-Basis:" der in den
 * Bedrock-Userprompt eingefuegt wird. Sortierung absteigend nach
 * Similarity, default max 5 Items.
 *
 * Liefert leeren String bei 0 Hits — Caller kann mit if (block.length)
 * conditional anhaengen.
 */
export function formatHitsForBedrockContext(
  hits: KnowledgeSearchHit[],
  opts: { maxItems?: number } = {}
): string {
  if (hits.length === 0) return "";
  const limit = opts.maxItems ?? 5;
  const sorted = [...hits]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  const lines = ["**Aus Strategaize-Wissens-Basis:**", ""];
  for (const hit of sorted) {
    const percent = Math.round(hit.similarity * 100);
    lines.push(`- ${hit.title} (${percent}%)`);
    // body_markdown wird optional kompakt mitgegeben — Bedrock kann es als
    // Quell-Material verwenden. Truncate auf 400 chars pro Item, damit der
    // Context nicht explodiert.
    const bodyExcerpt = hit.body_markdown.slice(0, 400).trim();
    if (bodyExcerpt.length > 0) {
      lines.push(`  ${bodyExcerpt}`);
    }
  }
  return lines.join("\n");
}

/**
 * Mapped IsKnowledgeError.kind auf User-facing-Texte (DEC-256). Genutzt
 * in Server-Actions, um den isKnowledgeError-String fuer das AnswerPane
 * zu setzen.
 */
export function mapIsErrorToUserMessage(error: IsKnowledgeError): string {
  switch (error.kind) {
    case "auth":
      return "Strategaize-Wissens-Basis Authentifizierungs-Fehler, bitte System-Admin informieren";
    case "rate_limit":
      return "Strategaize-Wissens-Basis kurz ueberlastet, bitte gleich nochmal";
    case "timeout":
    case "network":
    case "server":
      return "Strategaize-Wissens-Basis aktuell nicht erreichbar";
  }
}

/**
 * Soft-Cap-Hinweis fuer AnswerPane-Footer wenn isKnowledgeError ==
 * SOFT_CAP_ERROR_MARKER. Marker-String wird in Server-Actions auf
 * isKnowledgeError gesetzt; KIWorkspace.tsx prueft den Marker und
 * rendert die Footer-Meldung statt der generischen Error-Box.
 */
export const SOFT_CAP_ERROR_MARKER = "soft_cap_reached";

export const SOFT_CAP_FOOTER_TEXT =
  "Strategaize-Wissens-Quote fuer diese Session aufgebraucht (20/20). " +
  "Frage trotzdem stellen — Antwort basiert nur auf Mandanten-Daten.";

export const IS_FOOTER_TEXT =
  "Diese Antwort nutzt Strategaize-Wissen + Mandanten-Daten";
