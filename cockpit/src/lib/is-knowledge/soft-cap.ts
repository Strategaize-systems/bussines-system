// V8.7-A SLC-871 MT-6 — Soft-Cap Pure-Function fuer IS-Knowledge-Calls
// (DEC-252).
//
// Wird in KIWorkspace.tsx (Client-Side) gegen einen sessionStorage-Counter
// gecheckt, bevor die naechste Server-Action ausgeloest wird. Bei Cap-
// Erreichen wird der IS-Call uebersprungen und Footer-Meldung im
// AnswerPane gezeigt. Reset beim Tab-Reload (sessionStorage-Lifetime).
//
// Pure-Function-Extraktion per feedback_pure_helper_extraction_for_jsdom_
// free_tests — testbar in Vitest ohne jsdom oder window-Mock.

export const IS_KNOWLEDGE_SOFT_CAP = 20;
export const SOFT_CAP_STORAGE_KEY = "isKnowledgeCallCount";

/**
 * Prueft, ob der naechste IS-Knowledge-Call uebersprungen werden soll.
 * Cap wird standardmaessig auf IS_KNOWLEDGE_SOFT_CAP (= 20) gesetzt;
 * Caller kann fuer Tests overriden.
 */
export function shouldSkipIsCall(
  count: number,
  cap: number = IS_KNOWLEDGE_SOFT_CAP
): boolean {
  return count >= cap;
}
