// =============================================================
// Knowledge Query API — POST /api/knowledge/query
// SLC-424 MT-5: RAG Query Endpoint
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { queryKnowledge } from "@/lib/knowledge/search";
import type { SearchScope } from "@/lib/knowledge/search";

// ---------------------------------------------------------------
// POST /api/knowledge/query
// ---------------------------------------------------------------

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // 1. Auth check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  // 2. Rate limiting (10 req/min per user)
  const rateLimit = checkRateLimit(`knowledge:${user.id}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte einen Moment." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter ?? 60),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // 3. Parse and validate request body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungueltiger Request-Body" },
      { status: 400 },
    );
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query || query.length < 3) {
    return NextResponse.json(
      { error: "Frage muss mindestens 3 Zeichen lang sein." },
      { status: 400 },
    );
  }

  if (query.length > 2000) {
    return NextResponse.json(
      { error: "Frage darf maximal 2000 Zeichen lang sein." },
      { status: 400 },
    );
  }

  const scope = validateScope(body.scope);
  const dealId = typeof body.dealId === "string" ? body.dealId : undefined;
  const contactId = typeof body.contactId === "string" ? body.contactId : undefined;
  const companyId = typeof body.companyId === "string" ? body.companyId : undefined;

  // Validate scope has matching ID
  if (scope === "deal" && !dealId) {
    return NextResponse.json(
      { error: "dealId ist erforderlich fuer scope 'deal'" },
      { status: 400 },
    );
  }
  if (scope === "contact" && !contactId) {
    return NextResponse.json(
      { error: "contactId ist erforderlich fuer scope 'contact'" },
      { status: 400 },
    );
  }
  if (scope === "company" && !companyId) {
    return NextResponse.json(
      { error: "companyId ist erforderlich fuer scope 'company'" },
      { status: 400 },
    );
  }

  // 4. Optional: Load deal context for richer LLM answers
  //    ── SEC-891 IDOR-Mitigation (SEC-003) ──
  //    loadDealContext nutzt jetzt User-Client (RLS aktiv). Wenn der Caller
  //    den Deal nicht sehen darf, returnt loadDealContext null und wir returnen
  //    HTTP 404 BEVOR queryKnowledge() das Admin-Client (BYPASSRLS)
  //    search_knowledge_chunks-RPC aufruft. Partial-Mitigation; tieferer RPC-
  //    Fix (caller_uid-Filter, SEC-007) ist Sprint 2.
  //    Audit RPT-Cross-Repo 2026-05-30 SEC-003.
  let dealContext: { dealName?: string; stage?: string; contactName?: string; companyName?: string } | undefined;
  if (dealId) {
    dealContext = await loadDealContext(supabase, dealId);
    if (!dealContext) {
      return NextResponse.json(
        { error: "Deal nicht gefunden" },
        { status: 404 },
      );
    }
  }

  // 5. Execute RAG pipeline
  try {
    const result = await queryKnowledge(
      query,
      { scope, dealId, contactId, companyId },
      dealContext,
    );

    return NextResponse.json(result, {
      headers: {
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.limit - rateLimit.currentCount),
        "X-Query-Time-Ms": String(result.queryTimeMs),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[knowledge/query] Pipeline error:", message);

    return NextResponse.json(
      {
        answer: "Die Wissensbasis konnte die Frage momentan nicht verarbeiten.",
        sources: [],
        confidence: "low",
        queryTimeMs: Date.now() - startTime,
        error: message,
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function validateScope(value: unknown): SearchScope {
  if (value === "deal" || value === "contact" || value === "company" || value === "all") {
    return value;
  }
  return "deal"; // Default
}

async function loadDealContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dealId: string,
) {
  try {
    // SEC-891 SEC-003: User-Client (RLS aktiv) statt Admin-Client (BYPASSRLS).
    // Wenn der Caller den Deal nicht sehen kann, filtert RLS die Row weg →
    // maybeSingle() returnt null → wir returnen undefined → Caller-Handler
    // returnt 404 vor admin-RPC search_knowledge_chunks.
    const { data: deal } = await supabase
      .from("deals")
      .select(`
        title,
        pipeline_stages(name),
        contacts(first_name, last_name),
        companies(name)
      `)
      .eq("id", dealId)
      .maybeSingle();

    if (!deal) return undefined;

    const stage = (deal.pipeline_stages as { name?: string } | null)?.name;
    const contact = deal.contacts as { first_name?: string; last_name?: string } | null;
    const company = deal.companies as { name?: string } | null;

    return {
      dealName: deal.title || undefined,
      stage: stage || undefined,
      contactName: contact
        ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || undefined
        : undefined,
      companyName: company?.name || undefined,
    };
  } catch {
    return undefined;
  }
}
