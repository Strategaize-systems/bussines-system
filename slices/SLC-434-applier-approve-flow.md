# SLC-434 — Applier + Approve-Flow

## Slice Info
- **Feature:** FEAT-402
- **Version:** V4.3
- **Priority:** High
- **Estimated Effort:** 1-1.5 Tage
- **Dependencies:** SLC-431, SLC-432

## Goal

Server Actions fuer Approve/Reject von Insight-Vorschlaegen. Bei Approve: proposed_changes JSONB lesen, Entity updaten (Deal/Kontakt), Activity-Eintrag als Audit-Trail erstellen. Auto-Expire fuer nicht bearbeitete Vorschlaege.

## Scope

- `/lib/ai/signals/applier.ts` — generischer Apply-Mechanismus
- Server Actions: approveInsightAction, rejectInsightAction, batchApproveInsightActions
- Activity-Eintrag bei Approve (type=ai_applied, ai_generated=true)
- Auto-Expire: Cron-Erweiterung oder Signal-Extract-Cron
- DEC-054 KI-Badge via Activities

## Out of Scope

- UI (SLC-435)
- KI-Badge-Rendering (SLC-436)

## Acceptance Criteria

1. approveInsightAction(id): Queue-Status → approved, Entity-Update, Activity-Eintrag
2. rejectInsightAction(id, reason?): Queue-Status → rejected, optional Grund
3. batchApproveInsightActions(ids): Batch-Approve fuer mehrere Items
4. Apply unterstuetzt: stage_suggestion, value_update, tag_addition, priority_change
5. Activity-Eintrag enthaelt: was geaendert wurde, Quelle (Meeting/E-Mail), Queue-Item-ID
6. Auto-Expire: Items aelter als AI_SIGNAL_EXPIRE_DAYS → expired
7. Build gruen

## Micro-Tasks

### MT-1: Applier-Kern-Logik
- Goal: Generischer Mechanismus der proposed_changes JSONB liest und Entity updated
- Files: `cockpit/src/lib/ai/signals/applier.ts`
- Expected behavior: applyProposedChange(entityType, entityId, proposedChanges) fuehrt korrekte UPDATE-Statements aus (deal.stage, deal.value, contact.priority, etc.)
- Verification: `npx tsc --noEmit`
- Dependencies: SLC-431/MT-3

### MT-2: Approve Server Action
- Goal: approveInsightAction als Server Action
- Files: `cockpit/src/lib/actions/insight-actions.ts`
- Expected behavior: Queue-Item laden, Applier aufrufen, Status=approved + decided_at + decided_by setzen, Activity erstellen, revalidatePath
- Verification: `npx tsc --noEmit`
- Dependencies: MT-1

### MT-3: Reject Server Action
- Goal: rejectInsightAction als Server Action
- Files: `cockpit/src/lib/actions/insight-actions.ts`
- Expected behavior: Queue-Item Status=rejected, decided_at, decided_by, optional rejection_reason in execution_result
- Verification: `npx tsc --noEmit`
- Dependencies: SLC-431/MT-4

### MT-4: Batch-Approve Server Action
- Goal: batchApproveInsightActions fuer Mehrfach-Genehmigung
- Files: `cockpit/src/lib/actions/insight-actions.ts`
- Expected behavior: Iteriert ueber IDs, ruft approveInsightAction pro Item, gibt Erfolgs-/Fehler-Count zurueck
- Verification: `npx tsc --noEmit`
- Dependencies: MT-2

### MT-5: Auto-Expire-Logik
- Goal: Nicht bearbeitete Vorschlaege nach AI_SIGNAL_EXPIRE_DAYS ablaufen lassen
- Files: `cockpit/src/app/api/cron/signal-extract/route.ts`
- Expected behavior: Am Ende des signal-extract Crons: UPDATE ai_action_queue SET status='expired' WHERE status='pending' AND source IN ('signal_meeting','signal_email','signal_manual') AND created_at < now() - interval 'X days'
- Verification: Alte pending Items werden zu expired
- Dependencies: SLC-433/MT-3

## QA Focus

- Approve fuehrt korrekte Entity-Updates durch (Stage, Value, Tags, Priority)
- Reject speichert optional Grund
- Activity-Eintrag ist korrekt verknuepft und in Timeline sichtbar
- Auto-Expire loescht keine Items die noch relevant sind (nur pending, nur Signal-Source)
- Bestehende Queue-Actions (Followup, Gatekeeper) sind nicht betroffen
