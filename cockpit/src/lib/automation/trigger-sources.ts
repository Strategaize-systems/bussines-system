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
 * Alle bekannten Trigger-Quellen im Codebase.
 *
 * V1-Reduktion (Stand V6.2 SLC-622 / V6.3 MT-6 Doku-Update):
 * - 4 von ~12 Eintraegen dispatchen (`dispatches_now:true`): die zentralen
 *   primaeren User-Pfade in pipeline/actions.ts und lib/actions/activity-actions.ts.
 * - 8 Eintraege sind bewusst NICHT verdrahtet (`dispatches_now:false`) — siehe
 *   notes-Feld pro Eintrag fuer die spezifische Begruendung. Gemeinsamer Nenner:
 *   sekundaere User-Pfade (updateDeal, createMeeting, logCall, approveInsight)
 *   delegieren entweder an einen primaeren Pfad oder sind nicht workflow-relevant
 *   genug fuer V1; system-getriggerte Cron-Pfade (meeting-briefing, call-processing,
 *   meeting-summary) loesen V1 keine Workflows aus weil sie audit_log mit
 *   actor_id=NULL schreiben und einen eigenen dispatch-Pfad braeuchten.
 *
 * Slice-Annahme `(app)/deals/actions.ts` und `(app)/activities/actions.ts`
 * existiert nicht — alle Deal-Mutations leben in pipeline/actions.ts, alle
 * Activity-Mutations laufen ueber den zentralen activity-actions-Helper.
 */
export const TRIGGER_SOURCE_AUDIT: TriggerSourceEntry[] = [
  // -------- Zentrale Server Actions (User-getrieben) --------
  {
    path: "cockpit/src/app/(app)/pipeline/actions.ts",
    function_name: "moveDealToStage",
    trigger_event: "deal.stage_changed",
    dispatches_now: true,
    notes:
      "Primary stage-change Pfad (Pipeline-Board + Deal-Sheet). audit_log mit action='stage_change' RETURNING id, dann dispatch.",
  },
  {
    path: "cockpit/src/app/(app)/pipeline/actions.ts",
    function_name: "moveDealToPipeline",
    trigger_event: "deal.stage_changed",
    dispatches_now: true,
    notes:
      "Pipeline-Wechsel ist semantisch auch ein Stage-Change (Deal landet in erster Stage der Ziel-Pipeline).",
  },
  {
    path: "cockpit/src/app/(app)/pipeline/actions.ts",
    function_name: "createDeal",
    trigger_event: "deal.created",
    dispatches_now: true,
    notes:
      "Primary deal-create Pfad. audit_log RETURNING id wird als Anti-Loop-Token verwendet.",
  },
  {
    path: "cockpit/src/lib/actions/activity-actions.ts",
    function_name: "createActivity",
    trigger_event: "activity.created",
    dispatches_now: true,
    notes:
      "Zentraler Activity-Helper (DRY). Alle Aufrufer (mein-tag, focus, contacts, deals) profitieren automatisch.",
  },

  // -------- Sekundaere Server Actions (User-getrieben, ggf. ueber Helper) --------
  {
    path: "cockpit/src/app/(app)/pipeline/actions.ts",
    function_name: "updateDeal",
    trigger_event: "deal.stage_changed",
    dispatches_now: false,
    notes:
      "Generisches Deal-Update kann auch stage_id aendern. V1 verzichtet auf dispatch hier — moveDealToStage ist der primaere Pfad. V2 ergaenzt diff-basierten dispatch wenn stage_id im updatePayload abweicht.",
  },
  {
    path: "cockpit/src/app/(app)/meetings/actions.ts",
    function_name: "createMeeting",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "Falls Meeting auch eine Activity-Row anlegt (nicht jeder Meeting-Type tut das). V1 nicht verdrahtet — Meeting-Briefing-Cron erzeugt Activities ueber separaten Pfad.",
  },
  {
    path: "cockpit/src/app/(app)/calls/actions.ts",
    function_name: "logCall",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "User-loggter Anruf erzeugt Activity. V1 nicht verdrahtet — meist ueber zentralen Helper.",
  },
  {
    path: "cockpit/src/lib/actions/insight-actions.ts",
    function_name: "approveInsight",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "KI-Insight-Approval. V1 nicht verdrahtet — Insight-Activities sind selten und ggf. nicht workflow-relevant.",
  },

  // -------- Cron-Routes (System-getrieben) --------
  {
    path: "cockpit/src/app/api/cron/meeting-briefing/route.ts",
    function_name: "POST",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "Briefing-Cron erzeugt Briefing-Activity je Meeting. V1 nicht verdrahtet — Cron schreibt audit_log mit actor_id=NULL und braucht eigenen dispatch-Pfad. Erweiterung in V2 oder bei konkretem User-Use-Case.",
  },
  {
    path: "cockpit/src/app/api/cron/call-processing/route.ts",
    function_name: "POST",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "Call-Processing-Cron. V1 nicht verdrahtet (siehe meeting-briefing).",
  },
  {
    path: "cockpit/src/app/api/cron/meeting-summary/route.ts",
    function_name: "POST",
    trigger_event: "activity.created",
    dispatches_now: false,
    notes:
      "Meeting-Summary-Cron. V1 nicht verdrahtet (siehe meeting-briefing).",
  },
];

/**
 * Helper: alle Pfade die einen bestimmten Trigger-Event ausloesen.
 */
export function getDispatchersFor(event: TriggerEvent): TriggerSourceEntry[] {
  return TRIGGER_SOURCE_AUDIT.filter((e) => e.trigger_event === event);
}

/**
 * Helper: alle Pfade die NICHT dispatchen.
 * In V1 bewusst nicht-leer (~8 Eintraege) — sekundaere User-Pfade und
 * Cron-Routes mit dokumentiertem `dispatches_now:false`. Wenn ein V2 oder
 * spaeterer User-Use-Case einen dieser Pfade braucht, hier den Eintrag
 * auf `dispatches_now:true` umstellen, dispatchAutomationTrigger im
 * jeweiligen Handler einbauen und notes-Feld aktualisieren.
 */
export function getMissingDispatchers(): TriggerSourceEntry[] {
  return TRIGGER_SOURCE_AUDIT.filter((e) => !e.dispatches_now);
}
