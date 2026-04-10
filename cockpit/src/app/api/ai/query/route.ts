// =============================================================
// AI Query API Route — POST /api/ai/query
// =============================================================
//
// Unified endpoint for all LLM queries. Handles:
// - Authentication (Supabase session)
// - Rate limiting (10 req/min per user)
// - Prompt assembly from templates
// - Bedrock invocation
// - Response parsing and validation
// - Structured error responses

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryLLM } from "@/lib/ai/bedrock-client";
import { parseLLMResponse, validateDealBriefing, validateDailySummary, validatePipelineSearchFilter, validateEmailImproveResult, validateEventClassifyResult } from "@/lib/ai/parser";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import {
  DEAL_BRIEFING_SYSTEM_PROMPT,
  buildDealBriefingPrompt,
} from "@/lib/ai/prompts/deal-briefing";
import {
  DAILY_SUMMARY_SYSTEM_PROMPT,
  buildDailySummaryPrompt,
} from "@/lib/ai/prompts/daily-summary";
import {
  PIPELINE_SEARCH_SYSTEM_PROMPT,
  buildPipelineSearchPrompt,
} from "@/lib/ai/prompts/pipeline-search";
import {
  EMAIL_IMPROVE_SYSTEM_PROMPT,
  buildEmailImprovePrompt,
} from "@/lib/ai/prompts/email-improve";
import {
  EVENT_CLASSIFY_SYSTEM_PROMPT,
  buildEventClassifyPrompt,
} from "@/lib/ai/prompts/event-classify";
import type {
  AIQueryRequest,
  AIQueryResponse,
  DealBriefingContext,
  DailySummaryContext,
  PipelineSearchContext,
  EmailImproveContext,
  EventClassifyContext,
  DealBriefing,
  DailySummary,
  PipelineSearchFilter,
  EmailImproveResult,
  EventClassifyResult,
} from "@/lib/ai/types";

export async function POST(request: NextRequest) {
  // -------------------------------------------------------
  // 1. Authentication
  // -------------------------------------------------------
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, data: null, error: "Nicht autorisiert" } satisfies AIQueryResponse,
      { status: 401 }
    );
  }

  // -------------------------------------------------------
  // 2. Rate Limiting
  // -------------------------------------------------------
  const rateLimit = checkRateLimit(user.id);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: `Rate Limit erreicht (${rateLimit.limit} Anfragen/Minute). Bitte in ${rateLimit.retryAfter} Sekunden erneut versuchen.`,
      } satisfies AIQueryResponse,
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter ?? 60),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // -------------------------------------------------------
  // 3. Request Parsing
  // -------------------------------------------------------
  let body: AIQueryRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Ungueltige Anfrage: JSON konnte nicht gelesen werden",
      } satisfies AIQueryResponse,
      { status: 400 }
    );
  }

  if (!body.type || !body.context) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Ungueltige Anfrage: 'type' und 'context' sind erforderlich",
      } satisfies AIQueryResponse,
      { status: 400 }
    );
  }

  // -------------------------------------------------------
  // 4. Prompt Assembly
  // -------------------------------------------------------
  let systemPrompt: string;
  let userPrompt: string;

  switch (body.type) {
    case "deal-briefing": {
      const ctx = body.context as DealBriefingContext;
      if (!ctx.deal?.name) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Ungueltige Anfrage: Deal-Daten mit 'name' sind erforderlich",
          } satisfies AIQueryResponse,
          { status: 400 }
        );
      }
      systemPrompt = DEAL_BRIEFING_SYSTEM_PROMPT;
      userPrompt = buildDealBriefingPrompt(ctx);
      break;
    }

    case "daily-summary": {
      const ctx = body.context as DailySummaryContext;
      systemPrompt = DAILY_SUMMARY_SYSTEM_PROMPT;
      userPrompt = buildDailySummaryPrompt(ctx);
      break;
    }

    case "pipeline-search": {
      const ctx = body.context as PipelineSearchContext;
      if (!ctx.query) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Ungueltige Anfrage: 'query' ist erforderlich",
          } satisfies AIQueryResponse,
          { status: 400 }
        );
      }
      systemPrompt = PIPELINE_SEARCH_SYSTEM_PROMPT;
      userPrompt = buildPipelineSearchPrompt(ctx);
      break;
    }

    case "email-improve": {
      const ctx = body.context as EmailImproveContext;
      if (!ctx.text || !ctx.mode) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Ungueltige Anfrage: 'text' und 'mode' sind erforderlich",
          } satisfies AIQueryResponse,
          { status: 400 }
        );
      }
      systemPrompt = EMAIL_IMPROVE_SYSTEM_PROMPT;
      userPrompt = buildEmailImprovePrompt(ctx);
      break;
    }

    case "event-classify": {
      const ctx = body.context as EventClassifyContext;
      if (!ctx.items || ctx.items.length === 0) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Ungueltige Anfrage: 'items' Array ist erforderlich",
          } satisfies AIQueryResponse,
          { status: 400 }
        );
      }
      systemPrompt = EVENT_CLASSIFY_SYSTEM_PROMPT;
      userPrompt = buildEventClassifyPrompt(ctx);
      break;
    }

    default:
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: `Unbekannter Query-Typ: '${body.type}'. Erlaubt: 'deal-briefing', 'daily-summary', 'pipeline-search', 'email-improve', 'event-classify'`,
        } satisfies AIQueryResponse,
        { status: 400 }
      );
  }

  // -------------------------------------------------------
  // 5. Bedrock Invocation
  // -------------------------------------------------------
  const llmResult = await queryLLM(userPrompt, systemPrompt);

  if (!llmResult.success || !llmResult.data) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: `KI-Anfrage fehlgeschlagen: ${llmResult.error}`,
      } satisfies AIQueryResponse,
      { status: 502 }
    );
  }

  // -------------------------------------------------------
  // 6. Response Parsing & Validation
  // -------------------------------------------------------
  switch (body.type) {
    case "deal-briefing": {
      const parsed = parseLLMResponse<DealBriefing>(
        llmResult.data,
        validateDealBriefing
      );

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: `KI-Antwort konnte nicht verarbeitet werden: ${parsed.error}`,
          } satisfies AIQueryResponse,
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: parsed.data,
          error: null,
        } satisfies AIQueryResponse<DealBriefing>,
        {
          status: 200,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(
              rateLimit.limit - rateLimit.currentCount
            ),
          },
        }
      );
    }

    case "daily-summary": {
      const parsed = parseLLMResponse<DailySummary>(
        llmResult.data,
        validateDailySummary
      );

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: `KI-Antwort konnte nicht verarbeitet werden: ${parsed.error}`,
          } satisfies AIQueryResponse,
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: parsed.data,
          error: null,
        } satisfies AIQueryResponse<DailySummary>,
        {
          status: 200,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(
              rateLimit.limit - rateLimit.currentCount
            ),
          },
        }
      );
    }

    case "pipeline-search": {
      const parsed = parseLLMResponse<PipelineSearchFilter>(
        llmResult.data,
        validatePipelineSearchFilter
      );

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: `KI-Antwort konnte nicht verarbeitet werden: ${parsed.error}`,
          } satisfies AIQueryResponse,
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: parsed.data,
          error: null,
        } satisfies AIQueryResponse<PipelineSearchFilter>,
        {
          status: 200,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(
              rateLimit.limit - rateLimit.currentCount
            ),
          },
        }
      );
    }

    case "email-improve": {
      const parsed = parseLLMResponse<EmailImproveResult>(
        llmResult.data,
        validateEmailImproveResult
      );

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: `KI-Antwort konnte nicht verarbeitet werden: ${parsed.error}`,
          } satisfies AIQueryResponse,
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: parsed.data,
          error: null,
        } satisfies AIQueryResponse<EmailImproveResult>,
        {
          status: 200,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(
              rateLimit.limit - rateLimit.currentCount
            ),
          },
        }
      );
    }

    case "event-classify": {
      const parsed = parseLLMResponse<EventClassifyResult>(
        llmResult.data,
        validateEventClassifyResult
      );

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: `KI-Antwort konnte nicht verarbeitet werden: ${parsed.error}`,
          } satisfies AIQueryResponse,
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: parsed.data,
          error: null,
        } satisfies AIQueryResponse<EventClassifyResult>,
        {
          status: 200,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(
              rateLimit.limit - rateLimit.currentCount
            ),
          },
        }
      );
    }

    default:
      // This cannot be reached due to the earlier switch, but TypeScript needs it
      return NextResponse.json(
        { success: false, data: null, error: "Interner Fehler" } satisfies AIQueryResponse,
        { status: 500 }
      );
  }
}
