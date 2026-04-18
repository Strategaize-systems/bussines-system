"use client";

import { useState, useCallback } from "react";
import type { RAGResult, RAGSource, ConfidenceLevel } from "@/lib/knowledge/search";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

type QueryState = "idle" | "loading" | "success" | "error";

export interface KnowledgeQueryState {
  state: QueryState;
  answer: string | null;
  sources: RAGSource[];
  confidence: ConfidenceLevel | null;
  queryTimeMs: number | null;
  error: string | null;
}

interface UseKnowledgeQueryReturn extends KnowledgeQueryState {
  query: (text: string, scope: "deal" | "all", dealId: string) => Promise<void>;
  reset: () => void;
}

// ---------------------------------------------------------------
// Hook
// ---------------------------------------------------------------

export function useKnowledgeQuery(): UseKnowledgeQueryReturn {
  const [state, setState] = useState<QueryState>("idle");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<RAGSource[]>([]);
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null);
  const [queryTimeMs, setQueryTimeMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setAnswer(null);
    setSources([]);
    setConfidence(null);
    setQueryTimeMs(null);
    setError(null);
  }, []);

  const query = useCallback(async (text: string, scope: "deal" | "all", dealId: string) => {
    if (!text.trim()) return;

    setState("loading");
    setAnswer(null);
    setSources([]);
    setConfidence(null);
    setQueryTimeMs(null);
    setError(null);

    try {
      const res = await fetch("/api/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text.trim(),
          scope,
          dealId,
        }),
      });

      if (res.status === 429) {
        setState("error");
        setError("Zu viele Anfragen. Bitte warte einen Moment.");
        return;
      }

      if (res.status === 401) {
        setState("error");
        setError("Nicht angemeldet. Bitte lade die Seite neu.");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setError(data.error || "Fehler bei der Abfrage.");
        return;
      }

      setAnswer(data.answer ?? null);
      setSources(data.sources ?? []);
      setConfidence(data.confidence ?? null);
      setQueryTimeMs(data.queryTimeMs ?? null);
      setState("success");
    } catch {
      setState("error");
      setError("Verbindungsfehler. Bitte versuche es erneut.");
    }
  }, []);

  return { state, answer, sources, confidence, queryTimeMs, error, query, reset };
}
