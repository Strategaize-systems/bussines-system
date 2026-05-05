// V6.2 SLC-621 MT-1 — Trigger-Source-Audit
//
// Single-Source-of-Truth aller Server-Action- und Cron-Pfade die Activities
// oder Deals erzeugen und damit `dispatchAutomationTrigger` aufrufen
// MUESSEN. Dient als Audit-Liste damit V2-Trigger-Erweiterung nicht
// versehentlich Pfade vergisst.
//
// Wenn ein Pfad neu hinzukommt: hier ergaenzen + dispatcher-Aufruf einbauen.

import type { TriggerEvent } from "@/types/automation";

export interface TriggerSourceEntry {
  /** Repository-relativer Pfad zur File. */
  path: string;
  /** Funktions- oder Handler-Name in der File. */
  function_name: string;
  /** Welcher Trigger-Event wird ausgeloest. */
  trigger_event: TriggerEvent;
  /** Wird heute schon dispatchAutomationTrigger aufgerufen? */
  dispatches_now: boolean;
  /** Optionaler Hinweis (Edge-Case, Sonderpfad, etc.). */
  notes?: string;
}

/**
 * Alle bekannten Trigger-Quellen im Codebase Stand 2026-05-05 (V6.2 SLC-621).
 *
 * SLC-621 baut nur die Audit-Liste. SLC-622 verdrahtet alle Pfade mit
 * `dispatches_now: true` (siehe SLC-622 MT-7).
 */
export const TRIGGER_SOURCE_AUDIT: TriggerSourceEntry[] = [
  // -------- Zentrale Server Actions (User-getrieben) --------
  {
    path: "cockpit/src/app/(app)/deals/actions.ts",
    function_name: "updateDealStage",
    trigger_event: "deal.stage_changed",
    dispatches_now: false,
    notes: "Primary stage-change Pfad, audit_log mit action='stage_change'.",
  },
  {
    path: "cockpit/src/app/(app)/deals/actions.ts",
    function_name: "createDeal",
    trigger_event: "deal.created",
    dispatches_now: false,
    notes: "Primary deal-create Pfad, audit_log mit action='create'.",
  },
  {
    path: "cockpit/src/app/(app)/activities/actions.ts",
    function_name: "createActivity",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "Primary activity-create Pfad. Falls existing oder ueber zentralen Helper aufgeloest, Helper bekommt dispatch.",
  },
  {
    path: "cockpit/src/lib/actions/activity-actions.ts",
    function_name: "createActivity",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "Zentraler Activity-Helper (DRY). Andere Pfade rufen ueber den - Helper bekommt dispatch und alle Aufrufer profitieren automatisch.",
  },
  {
    path: "cockpit/src/app/(app)/pipeline/actions.ts",
    function_name: "moveCardToStage",
    trigger_event: "deal.stage_changed",
    dispatches_now: false,
    notes: "Drag&Drop-Pfad im Pipeline-Board.",
  },

  // -------- Sekundaere Server Actions (User-getrieben, optional via Helper) --------
  {
    path: "cockpit/src/app/(app)/meetings/actions.ts",
    function_name: "createMeeting",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "Optional dispatch, falls Meeting auch eine Activity-Row anlegt (nicht jeder Meeting-Type tut das).",
  },
  {
    path: "cockpit/src/app/(app)/calls/actions.ts",
    function_name: "logCall",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "User-loggter Anruf erzeugt Activity. Falls existing Pfad - dispatch ergaenzen.",
  },
  {
    path: "cockpit/src/lib/actions/insight-actions.ts",
    function_name: "approveInsight",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "KI-Insight-Approval. Falls Approve eine Activity erzeugt, dispatch.",
  },
  {
    path: "cockpit/src/app/(app)/mein-tag/actions.ts",
    function_name: "(diverse)",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "Mein-Tag-Schnellaktionen. Wenn ueber zentralen Activity-Helper, automatisch abgedeckt.",
  },
  {
    path: "cockpit/src/app/(app)/focus/actions.ts",
    function_name: "(diverse)",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "Focus-View-Schnellaktionen. Wenn ueber zentralen Activity-Helper, automatisch abgedeckt.",
  },
  {
    path: "cockpit/src/app/actions/meetings.ts",
    function_name: "(diverse)",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes: "Globaler app-actions/meetings.ts Pfad (V3+).",
  },

  // -------- Cron-Routes (System-getrieben) --------
  {
    path: "cockpit/src/app/api/cron/meeting-briefing/route.ts",
    function_name: "POST",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "Briefing-Cron erzeugt Briefing-Activity je Meeting. dispatch nach Activity-Insert mit actor_id=NULL.",
  },
  {
    path: "cockpit/src/app/api/cron/call-processing/route.ts",
    function_name: "POST",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "Call-Processing-Cron erzeugt Call-Activity. dispatch nach Insert.",
  },
  {
    path: "cockpit/src/app/api/cron/meeting-summary/route.ts",
    function_name: "POST",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "Falls Meeting-Summary eine Activity-Row anlegt, dispatch ergaenzen.",
  },
];

/**
 * Helper: alle Pfade die einen bestimmten Trigger-Event ausloesen.
 */
export function getDispatchersFor(event: TriggerEvent): TriggerSourceEntry[] {
  return TRIGGER_SOURCE_AUDIT.filter((e) => e.trigger_event === event);
}

/**
 * Helper: alle Pfade die NOCH NICHT dispatchen (V1-Baseline-Audit).
 * Diese Liste sollte nach SLC-622 MT-7 leer sein.
 */
export function getMissingDispatchers(): TriggerSourceEntry[] {
  return TRIGGER_SOURCE_AUDIT.filter((e) => !e.dispatches_now);
}
