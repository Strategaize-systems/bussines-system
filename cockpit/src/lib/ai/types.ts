// =============================================================
// AI Types — Shared type definitions for the LLM service layer
// =============================================================

/** Options for LLM invocation */
export interface LLMOptions {
  /** Sampling temperature (0.0–1.0). Lower = more deterministic. Default: 0.3 */
  temperature?: number;
  /** Maximum tokens in the response. Default: 2048 */
  maxTokens?: number;
  /** Timeout in milliseconds. Default: 30000 */
  timeoutMs?: number;
}

/** Generic wrapper for LLM responses */
export interface LLMResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  /** Raw LLM output before parsing (useful for debugging) */
  raw?: string;
}

// -------------------------------------------------------------
// Deal Briefing
// -------------------------------------------------------------

export interface DealBriefing {
  /** Executive summary of the deal situation */
  summary: string;
  /** Key facts extracted from the deal data */
  keyFacts: string[];
  /** Identified risks and open issues */
  openRisks: string[];
  /** Recommended next steps */
  suggestedNextSteps: string[];
  /** Confidence score 0–100 based on data completeness */
  confidence: number;
}

/** Input context for deal briefing prompt */
export interface DealBriefingContext {
  deal: {
    id: string;
    name: string;
    value?: number;
    stage?: string;
    probability?: number;
    expectedCloseDate?: string;
    notes?: string;
  };
  contacts?: Array<{
    name: string;
    role?: string;
    company?: string;
  }>;
  activities?: Array<{
    type: string;
    subject: string;
    date: string;
    notes?: string;
  }>;
  proposals?: Array<{
    title: string;
    value?: number;
    status?: string;
    date?: string;
  }>;
}

// -------------------------------------------------------------
// Daily Summary
// -------------------------------------------------------------

export interface DailySummary {
  /** Personalized greeting with context */
  greeting: string;
  /** Prioritized tasks for today */
  priorities: string[];
  /** Meeting preparation notes */
  meetingPrep: string[];
  /** Warnings about stagnant deals, overdue items, etc. */
  warnings: string[];
  /** Suggested focus area for the day */
  suggestedFocus: string;
}

/** Input context for daily summary prompt */
export interface DailySummaryContext {
  todaysTasks?: Array<{
    title: string;
    priority?: string;
    dueDate?: string;
  }>;
  upcomingMeetings?: Array<{
    title: string;
    time: string;
    attendees?: string[];
    dealName?: string;
  }>;
  stagnantDeals?: Array<{
    name: string;
    daysSinceLastActivity: number;
    value?: number;
    stage?: string;
  }>;
  overdueItems?: Array<{
    title: string;
    dueDate: string;
    type: string;
  }>;
  /** Yesterday's completed items (tasks, meetings, emails) */
  yesterdayCompleted?: Array<{
    title: string;
    type: string;
  }>;
  /** Yesterday's missed items (tasks that were due but not completed) */
  yesterdayMissed?: Array<{
    title: string;
  }>;
  /** Events since last login (new deals, stage changes) */
  unseenEvents?: Array<{
    description: string;
    type: string;
  }>;
}

// -------------------------------------------------------------
// Pipeline Search
// -------------------------------------------------------------

export interface PipelineSearchFilter {
  stage: string | null;
  minValue: number | null;
  maxValue: number | null;
  status: string | null;
  contactName: string | null;
  companyName: string | null;
  titleSearch: string | null;
  hasNextAction: boolean | null;
  isStagnant: boolean | null;
}

export interface PipelineSearchContext {
  query: string;
  stageNames: string[];
  pipelineName: string;
}

// -------------------------------------------------------------
// Email Improve
// -------------------------------------------------------------

export interface EmailImproveResult {
  improvedText: string;
  changes: string[];
}

export interface EmailImproveContext {
  text: string;
  mode: "correct" | "formal" | "summarize";
}

// -------------------------------------------------------------
// API Request / Response
// -------------------------------------------------------------

export type AIQueryType = "deal-briefing" | "daily-summary" | "pipeline-search" | "email-improve";

export interface AIQueryRequest {
  type: AIQueryType;
  context: DealBriefingContext | DailySummaryContext | PipelineSearchContext | EmailImproveContext;
}

export interface AIQueryResponse<T = DealBriefing | DailySummary> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// -------------------------------------------------------------
// Confirm-before-write (future Action Mode)
// -------------------------------------------------------------

export type ConfirmActionType =
  | "create-task"
  | "update-deal"
  | "send-email"
  | "create-activity";

export interface ConfirmAction {
  /** Type of action the AI wants to perform */
  type: ConfirmActionType;
  /** Structured data for the action */
  data: Record<string, unknown>;
  /** Human-readable preview of what will happen */
  preview: string;
}

export interface ConfirmResult {
  /** Whether the user confirmed the action */
  confirmed: boolean;
  /** The action that was confirmed or rejected */
  action: ConfirmAction;
}
