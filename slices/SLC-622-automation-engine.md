# SLC-622 — Workflow-Automation Engine (Action-Executor + Cron-Fallback + Stage-Soft-Disable)

## Meta
- Feature: FEAT-621
- Priority: Blocker
- Status: planned
- Created: 2026-05-05
- Estimated Effort: 5-7h

## Goal

Den Action-Executor + Cron-Fallback live schalten und damit aus der V6.2-Foundation (SLC-621) eine produktive Engine machen. Vier Action-Types implementieren: `create_task`, `send_email_template`, `create_activity`, `update_field`. Cron-Endpoint `/api/cron/automation-runner` mit 1-Minuten-Takt als Defense-in-Depth-Fallback. Stage-Delete-Soft-Disable (DEC-133): wenn eine Pipeline-Stage geloescht wird die von einer aktiven Regel referenziert wird, werden alle dependent rules auf `paused` gesetzt mit lesbarem `paused_reason`. Recursion-Counter `max 3 update_field per (deal_id, 60s)`. audit_log-Eintraege bei Side-Effects mit `actor_id=NULL` + `changes.triggered_by_user_id`.

Im Anschluss-SLC-623 wird die Builder-UI live geschaltet.

## Scope

- **Action-Executor** (`cockpit/src/lib/automation/executor.ts` neu):
  ```typescript
  export async function executeAutomationRun(runId: string): Promise<void>;
  ```
  - 1. UPDATE run SET status='running', WHERE status='pending' (idempotent — nur wenn noch pending)
  - 2. Lade rule + entity (deal/activity) via SELECT
  - 3. Re-Evaluate conditions (Defense-in-Depth gegen TOCTOU)
  - 4. Recursion-Counter pruepfen: SELECT count(*) FROM automation_runs WHERE trigger_entity_id=$X AND started_at > now() - interval '60 seconds' AND action_results @> '[{"action_index":0,"type":"update_field"}]'::jsonb. Wenn >=3: skip mit status='skipped', error_message='recursion-limit'
  - 5. Fuer jede Action in rule.actions: Action-Switch ausfuehren, action_results[i] anhaengen
  - 6. UPDATE run SET status=resolved, finished_at=now(), action_results=jsonb
  - 7. UPDATE rules SET last_run_at, last_run_status (Cache)
- **4 Action-Types** (in `cockpit/src/lib/automation/actions/` als Sub-Module):
  - `create_task.ts`: `executeCreateTask(rule, entity, params)` — ruft Server Action `createActivity({type:'task', deal_id, assignee_id, due_at, title})` mit `assignee-resolver.ts` (deal_owner|trigger_user|fixed_uuid). Title kann Template-Variablen enthalten ({{deal.title}}, {{contact.name}}) — Pure-Function `renderTemplate(template, scope)`.
  - `send_email_template.ts`: `executeSendEmailTemplate(rule, entity, params)` — laedt V5.3 `email_templates`-Row, rendert mit Template-Variablen, ruft existing `cockpit/src/lib/email/send.ts:sendEmail()` mit Draft-Mode oder Direct-Send (params.mode). NUR fuer Deal-Trigger (entity.contact_id muss existieren).
  - `create_activity.ts`: `executeCreateActivity(rule, entity, params)` — ruft `createActivity({type, deal_id, title, description, internal:true})`. Beispiel: Internal-Note mit fixem Text.
  - `update_field.ts`: `executeUpdateField(rule, entity, params)` — ruft Validator aus `field-whitelist.ts`, dann INSERT/UPDATE der Entity. Whitelist-Reject loggt action_result.outcome='failed', error_message='field-not-whitelisted'.
- **Owner-Resolver** (`cockpit/src/lib/automation/assignee-resolver.ts` neu, DEC-134):
  ```typescript
  export type AssigneeSource = 'deal_owner' | 'trigger_user' | { uuid: string };
  export async function resolveAssignee(source: AssigneeSource, entity: Deal | Activity): Promise<string>;
  ```
  - `deal_owner` → entity.owner_id (oder created_by als Fallback)
  - `trigger_user` → triggerEventAuditId.actor_id (Lookup im audit_log)
  - `{uuid}` → uuid direkt
  - V1-trivial bei Single-User (alle Sources resolven zur selben User-ID).
- **Audit-Log Side-Effects** (DEC-131, DEC-118-Pattern): bei jedem erfolgreichen Action-Side-Effect (z.B. update_field auf deals.stage_id) wird zusaetzlich INSERT INTO audit_log mit `actor_id=NULL`, `entity_type='deal'`, `action='update'`, `context='Automation rule {{rule.name}} executed'`, `changes={"...": ..., "triggered_by_user_id": "..."}`. Das `triggered_by_user_id`-Feld in changes-JSONB erlaubt der UI spaeter zu zeigen "von wem ausgeloest" (via Trigger-Source-User-ID aus dem Original-audit_log).
- **Recursion-Counter** (DEC-129 + Risk-Mitigation): `cockpit/src/lib/automation/recursion-guard.ts` neu — `checkRecursionLimit(entityId, actionType): Promise<boolean>` returnt true wenn Limit erreicht. Limit V1: max 3 `update_field` pro (entity_id, 60s). Wenn erreicht: skip Action, action_result.outcome='skipped', error_message='recursion-limit-exceeded'.
- **Cron-Endpoint** (`cockpit/src/app/api/cron/automation-runner/route.ts` neu, Pattern aus `expire-proposals/route.ts`):
  - POST-Handler mit `verifyCronSecret(request)` Auth
  - Pickup pending+running runs >60s alt (App-Crash-Fallback)
  - LIMIT 50 pro Lauf (Throttling, soll innerhalb 60s durch sein)
  - Fuer jeden Run: `await executeAutomationRun(runId).catch(logErr)` (sequentiell, nicht parallel — vermeidet Race-Conditions auf gleicher Entity)
  - Returns NextResponse.json({success:true, picked:n})
  - **Coolify-Cron-Setup-Anleitung** in REL-024-Notes (wird in `/deploy SLC-622` ergaenzt): Cron-Expression `* * * * *`, ENV `CRON_SECRET=...` schon existing, Container `app`. Wird im Coolify-UI nach Deploy als 8. Cron-Eintrag manuell angelegt.
- **Stage-Delete-Soft-Disable** (DEC-133): bestehende Server Action `cockpit/src/app/(app)/settings/pipelines/actions.ts:deletePipelineStage` (oder analog) erweitern:
  - VOR Delete: SELECT id, name FROM automation_rules WHERE references_stage_ids @> ARRAY[$stageId]::uuid[] AND status='active'
  - Wenn Result vorhanden: UPDATE automation_rules SET status='paused', paused_reason='Pipeline-Stage "{{stageName}}" wurde geloescht'
  - Toast-Message zeigt "{{count}} Regel(n) wurden pausiert weil sie diese Stage referenziert haben"
  - DELETE der Stage fortsetzen (nicht blocken)
  - User kann pausierte Regeln in `/settings/automation` editieren oder reaktivieren (UI in SLC-623)
- **Trigger-Dispatcher Aufruf-Integration**:
  - SLC-621 hat `trigger-sources.ts` Audit-Liste angelegt, aber Dispatcher noch nicht in den Server Actions verdrahtet.
  - SLC-622 verdrahtet die zentralen Pfade aus der Audit-Liste:
    - `deals/actions.ts:updateDealStage` — nach `INSERT audit_log` und vor `revalidatePath`: `await dispatchAutomationTrigger({event:'deal.stage_changed', ...})`
    - `deals/actions.ts:createDeal` — analog
    - `activities/actions.ts:createActivity` (zentraler Helper falls existing) oder `lib/actions/activity-actions.ts:createActivity` — analog
    - `pipeline/actions.ts:moveCardToStage` — analog
  - Die 4 Cron-Pfade (meeting-briefing, call-processing, meeting-summary, plus eventuell direkt-Inserts in mein-tag/focus/meetings) verdrahtet die SLC-622 ebenfalls. Audit-Liste in `trigger-sources.ts` wird auf `dispatches_now: true` umgestellt.
  - **Worktree-Empfehlung NICHT**: V6.2 ist Internal-Tool, sequentielle Slice-Reihenfolge, keine Parallelitaet. Worktree-Skip ohne Begruendung.
- **Activity-Executor-Integration-Test** (`cockpit/src/__tests__/automation-engine.test.ts` neu): End-to-End-Test gegen Coolify-DB.
  - Test 1: Regel "wenn deal.stage_changed zu Stage X dann create_task" — INSERT deal, UPDATE stage, dispatchAutomationTrigger, await executeAutomationRun, verify activities-Insert.
  - Test 2: Regel mit Recursion-Loop — Regel "wenn deal.stage_changed dann update_field stage_id zu Z" + Regel "wenn deal.stage_changed dann update_field stage_id zu Y". Initial-Trigger, Recursion-Counter blockt 4. Lauf.
  - Test 3: Cron-Pickup — INSERT manueller automation_runs (status=pending, started_at=2 min alt), Cron-POST aufrufen, Run gepicked, status=success.
- **Cockpit-Records-Update**:
  - `slices/INDEX.md`: SLC-622 Status `planned -> done`
  - `features/INDEX.md`: FEAT-621 bleibt `in_progress` (V6.2 2/3 Workflow-Slices done)
  - `planning/backlog.json`: BL-135 bleibt `in_progress`
  - `docs/STATE.md`: naechste = SLC-623

## Out of Scope

- Builder-UI (SLC-623)
- Trockenlauf (SLC-623)
- Time-based Trigger (V6.2 Out-of-Scope)
- Webhook-Actions (V6.2 Out-of-Scope)
- A/B-Testing (V6.2 Out-of-Scope)
- Multi-Step-Sequence-Wartezeiten (V6.2 Out-of-Scope, Cadences-Sache)
- Auto-Detection ob Regel Endlosschleife produzieren wuerde (Recursion-Counter ist Reaktiv-Schutz, kein Pre-Check)
- Email-Template-Rendering mit Bedrock-LLM (V1 nutzt nur statische Template-Variablen via renderTemplate-Pure-Function)

## Acceptance Criteria

- AC1: `executeAutomationRun(runId)` setzt run.status='running', laedt rule + entity, evaluiert conditions re-evaluiert, fuehrt actions aus, setzt run.status auf finalen State.
- AC2: 4 Action-Types funktionieren end-to-end im Vitest gegen Coolify-DB (create_task, send_email_template draft-mode, create_activity, update_field).
- AC3: `update_field` auf nicht-whitelisted Field (z.B. `deals.title`) failed mit `outcome='failed'`, `error_message='field-not-whitelisted'`. Whitelist greift.
- AC4: `update_field` mit invaliden Value (z.B. `deals.value=-100`) failed mit `outcome='failed'`, `error_message='validation-failed'`.
- AC5: Best-Effort: Failure einer Action stoppt nicht die folgenden Actions (Vitest mit Rule [actionA fails, actionB succeeds] → run.status='partial_failed', action_results=[failed, success]).
- AC6: Recursion-Counter blockt 4. update_field-Action auf gleicher Deal-ID innerhalb 60s mit `outcome='skipped'`, `error_message='recursion-limit-exceeded'`.
- AC7: Side-Effect schreibt audit_log mit `actor_id=NULL`, `context='Automation rule {{name}} executed'`, `changes.triggered_by_user_id=<original-user>`.
- AC8: Cron-Endpoint `/api/cron/automation-runner` (POST mit CRON_SECRET-Header) picked stuck runs (>60s pending/running), executet sie, returnt {picked:n}.
- AC9: Cron-Endpoint ohne valid CRON_SECRET returnt 401.
- AC10: Stage-Delete einer von Regel referenzierten Stage fuehrt zu UPDATE rules SET status='paused', paused_reason='Pipeline-Stage "X" wurde geloescht'. Stage-Delete selbst geht erfolgreich durch.
- AC11: Toast-Message bei Stage-Delete zeigt korrekte Pause-Count.
- AC12: 7+ Trigger-Source-Pfade haben `dispatchAutomationTrigger`-Aufruf integriert (Audit-Liste in `trigger-sources.ts` zeigt `dispatches_now:true` fuer alle).
- AC13: End-to-End-Test "Stage-Change → Workflow-Trigger → Action-Executor → Activity-Insert" gruen (Vitest gegen Coolify-DB, Standard-Latenz <30s erfuellt).
- AC14: TypeScript-Build (`npm run build`) gruen.
- AC15: Vitest (`npm run test`) gruen — neue Tests fuer executor, recursion-guard, cron-endpoint, integration-test.
- AC16: ESLint (`npm run lint`) gruen.
- AC17: REL-024-Notes (in `docs/RELEASES.md` Draft) enthaelt Coolify-Cron-Setup-Anleitung fuer `automation-runner`.

## Dependencies

- SLC-621 (Foundation) — Schema, Dispatcher, Field-Whitelist, Server Actions, Types
- V5.3 `email_templates`-Tabelle + `lib/email/send.ts`
- V5.6 `cron-secret`-Auth-Pattern (existing helper)
- V3 `audit_log`-Tabelle
- V2 Pipeline-Stages-Settings-Page mit `deletePipelineStage` Server Action
- Coolify-DB-Zugriff fuer Schema-Smoke-Test
- Coolify-Cron-Setup-Berechtigung (User legt Cron-Eintrag manuell an, per `feedback_manual_deploy.md` und `feedback_cron_job_instructions.md`)

## Risks

- **Risk:** Race-Condition zwischen Sync-Dispatch (App) und Cron-Fallback — derselbe Run wird von beiden gepickt.
  Mitigation: `executeAutomationRun` macht `UPDATE runs SET status='running' WHERE status='pending'` als atomare Lock-Pruefung. Cron-Pickup fragt nur `status IN ('pending', 'running') AND started_at < now() - 60s`. Race in den ersten 60s ausgeschlossen, danach ist Re-Run idempotent (Action-Side-Effects checken Audit-Log).
- **Risk:** Action-Idempotenz nicht garantiert — Cron-Re-Run koennte Action zweimal ausfuehren.
  Mitigation: V1 akzeptiert das als known-issue fuer create_task/create_activity (User loescht Duplikate manuell). update_field ist idempotent (selbe Werte = selbes Ergebnis). send_email_template ist idempotent im Draft-Mode (Drafts werden vom User vor Send geprueft); Direct-Send-Mode nicht V1-empfohlen, aber wenn aktiviert: Risk wird in Builder-UI-Tooltip erklaert.
- **Risk:** Recursion-Counter ist nur fuer update_field aktiv — andere Action-Types koennten in Endlos-Loops geraten.
  Mitigation: V1 hat 4 Action-Types und davon ist nur update_field zu Endlos-Effekten faehig (es modifiziert die Entity selbst). create_task/send_email_template/create_activity erzeugen neue Activities, die nicht den gleichen Trigger-Event-Audit-ID verwenden — Anti-Loop-UNIQUE greift. Wenn V2 neue Trigger-Events bringt (z.B. `activity.updated`), muss Recursion-Counter erweitert werden. Test-AC verifiziert das fuer V1.
- **Risk:** Cron-Endpoint bekommt keine Coolify-Cron-Anbindung (Setup vergessen).
  Mitigation: REL-024-Notes enthaelt Setup-Anleitung. `/deploy SLC-622` (oder kombiniert mit V6.2 Final-Deploy) erinnert den User. Anti-Loop hat App-Sync-Pfad als Primary, Cron ist Defense-in-Depth — selbst ohne Cron funktioniert die Engine im Happy-Path.
- **Risk:** Stage-Delete pausiert versehentlich ALLE Regeln einer Pipeline (z.B. wenn Pipeline geloescht wird, CASCADE entfernt alle Stages, Regeln auf jeder Stage werden pausiert).
  Mitigation: V1 V6.2 unterstuetzt nur explicit `deletePipelineStage`. Pipeline-Delete ist nicht V6.2-Scope (existing Behaviour). Wenn doch implementiert: Test-AC pruepft das.
- **Risk:** Side-Effect audit_log-Insert ohne `actor_id` verstoesst gegen RLS (RLS erzwingt actor_id NOT NULL?).
  Mitigation: V4.1 MIG-013 hat `audit_log.actor_id DROP NOT NULL` ausgefuehrt — System-Inserts mit `actor_id=NULL` sind erlaubt (Pattern aus existing Cron `recording-retention`, `meeting-briefing`). Verifiziert in V5.x.
- **Risk:** Trigger-Dispatcher integration in 7+ Server-Actions ist breit-angelegtes Refactoring.
  Mitigation: Helper ist Drop-In (eine Zeile pro Aufrufer). Audit-Liste in trigger-sources.ts zeigt explizit `dispatches_now:true/false` — Reviewer kann Vollstaendigkeit pruefen. MT-7 macht den Refactor in einem Block, nicht ueber mehrere MTs.
- **Risk:** Trockenlauf in SLC-623 erwartet, dass alte audit_log-Eintraege re-konstruierbar sind, aber `audit_log` hat nur `created` ohne stage_change-Detail.
  Mitigation: existing audit_log hat `entity_type='deal', action='stage_change', changes={before, after}` Pattern (V2.1). Trockenlauf liest das. Bei activity-create gibt es einen audit_log-Eintrag mit `entity_type='activity', action='create'`. Falls fehlend: SLC-622 ergaenzt audit_log-Inserts in den 7+ verdrahteten Pfaden (defensiv).

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/lib/automation/executor.ts` | NEU — executeAutomationRun-Hauptfunktion |
| `cockpit/src/lib/automation/actions/create_task.ts` | NEU — create_task Action-Handler |
| `cockpit/src/lib/automation/actions/send_email_template.ts` | NEU — send_email_template Action-Handler |
| `cockpit/src/lib/automation/actions/create_activity.ts` | NEU — create_activity Action-Handler |
| `cockpit/src/lib/automation/actions/update_field.ts` | NEU — update_field Action-Handler |
| `cockpit/src/lib/automation/assignee-resolver.ts` | NEU — Owner-Resolution (DEC-134) |
| `cockpit/src/lib/automation/recursion-guard.ts` | NEU — Recursion-Counter (max 3 update_field per 60s) |
| `cockpit/src/lib/automation/template-renderer.ts` | NEU — Pure-Function fuer {{var}}-Rendering |
| `cockpit/src/lib/automation/dispatcher.ts` | MODIFY — Executor-Call enable (TODO-Kommentar entfernen) |
| `cockpit/src/lib/automation/trigger-sources.ts` | MODIFY — `dispatches_now:true` fuer alle integrierten Pfade |
| `cockpit/src/app/api/cron/automation-runner/route.ts` | NEU — Cron-Endpoint (Pattern aus expire-proposals) |
| `cockpit/src/app/(app)/deals/actions.ts` | MODIFY — dispatcher-Aufruf in updateDealStage + createDeal |
| `cockpit/src/app/(app)/activities/actions.ts` | MODIFY — dispatcher-Aufruf in createActivity |
| `cockpit/src/lib/actions/activity-actions.ts` | MODIFY — dispatcher-Aufruf im zentralen Helper |
| `cockpit/src/app/(app)/pipeline/actions.ts` | MODIFY — dispatcher-Aufruf in moveCardToStage |
| `cockpit/src/app/api/cron/meeting-briefing/route.ts` | MODIFY — dispatcher-Aufruf nach Briefing-Activity-Insert |
| `cockpit/src/app/api/cron/call-processing/route.ts` | MODIFY — dispatcher-Aufruf nach Call-Activity-Insert |
| `cockpit/src/app/api/cron/meeting-summary/route.ts` | MODIFY — dispatcher-Aufruf nach Summary-Activity-Insert (falls applicable) |
| `cockpit/src/app/(app)/settings/pipelines/actions.ts` | MODIFY — Stage-Delete-Soft-Disable mit Toast-Count |
| `cockpit/src/__tests__/automation-engine.test.ts` | NEU — End-to-End-Tests gegen Coolify-DB |
| `cockpit/src/lib/automation/__tests__/recursion-guard.test.ts` | NEU — Vitest fuer Recursion-Counter |
| `cockpit/src/lib/automation/__tests__/template-renderer.test.ts` | NEU — Vitest fuer Template-Rendering |
| `cockpit/src/lib/automation/__tests__/assignee-resolver.test.ts` | NEU — Vitest fuer Owner-Resolution |
| `docs/RELEASES.md` | MODIFY — REL-024-Notes Draft mit Cron-Setup-Anleitung |
| `slices/INDEX.md` | MODIFY — SLC-622 Status |
| `docs/STATE.md` | MODIFY — naechste = SLC-623 |

## Micro-Tasks

#### MT-1: Action-Module fuer 4 Action-Types schreiben
- Goal: Vier separate Action-Handler-Module mit einheitlicher Signature.
- Files: `cockpit/src/lib/automation/actions/{create_task,send_email_template,create_activity,update_field}.ts`
- Expected behavior: Jedes Modul exportiert `executeXxxAction(rule, entity, params, context): Promise<ActionResult>`. ActionResult-Shape: `{action_index, type, outcome:'success'|'failed'|'skipped', error_message?, audit_log_id?}`. update_field nutzt field-whitelist.ts Validators. send_email_template nutzt V5.3 email_templates + send.ts. create_task/create_activity nutzen existing createActivity-Server-Action.
- Verification: 4 Vitest-Cases pro Action gegen Coolify-DB. Each case: success-path + failure-path.
- Dependencies: SLC-621 abgeschlossen

#### MT-2: Owner-Resolver implementieren
- Goal: AssigneeSource resolution mit 3 Source-Types.
- Files: `cockpit/src/lib/automation/assignee-resolver.ts`, `cockpit/src/lib/automation/__tests__/assignee-resolver.test.ts`
- Expected behavior: `resolveAssignee(source, entity)` returnt User-UUID. deal_owner-Source liest `entity.owner_id || entity.created_by`. trigger_user-Source liest aus audit_log-Lookup ueber triggerEventAuditId. {uuid:...} returnt UUID direkt.
- Verification: 3 Vitest-Cases. Edge: deal ohne owner_id und ohne created_by → throw Error.
- Dependencies: none (kann parallel zu MT-1)

#### MT-3: Template-Renderer Pure-Function
- Goal: Variable-Substitution {{deal.title}} → "Mein Deal".
- Files: `cockpit/src/lib/automation/template-renderer.ts`, `cockpit/src/lib/automation/__tests__/template-renderer.test.ts`
- Expected behavior: `renderTemplate(template: string, scope: Record<string, unknown>): string`. Pattern `{{key}}` wird durch scope[key] ersetzt. Nested keys via dot-notation `{{deal.title}}`. Unbekannte keys werden zu leerer String (kein Throw, defensives Pattern). Max-Length 1000 chars Output (Sicherheit).
- Verification: 4 Vitest-Cases — happy-path, missing-key, nested-key, max-length-truncate.
- Dependencies: none

#### MT-4: Recursion-Guard implementieren
- Goal: Counter-Check `max 3 update_field per (entity_id, 60s)`.
- Files: `cockpit/src/lib/automation/recursion-guard.ts`, `cockpit/src/lib/automation/__tests__/recursion-guard.test.ts`
- Expected behavior: `checkRecursionLimit(entityId: string, actionType: ActionType): Promise<{allowed: boolean, count: number}>`. Query SELECT count(*) FROM automation_runs WHERE trigger_entity_id=$X AND started_at > now() - interval '60 seconds' AND action_results @> filter-jsonb. V1: nur fuer update_field (anderer ActionType returnt allowed:true). Limit konstant `MAX_UPDATE_FIELD_PER_ENTITY_PER_60S=3`.
- Verification: Vitest gegen Coolify-DB — 3 Inserts erlaubt, 4. blockt.
- Dependencies: none (Schema in SLC-621 fertig)

#### MT-5: Action-Executor zusammensetzen
- Goal: `executeAutomationRun(runId)` orchestriert alles.
- Files: `cockpit/src/lib/automation/executor.ts`
- Expected behavior: Lock pending->running, lade rule+entity, re-eval conditions, recursion-check, action-loop mit Action-Switch, audit_log-Insert bei Success-Side-Effects, finale UPDATE auf run.
- Verification: End-to-End Vitest "Stage-Change → Workflow → create_task" gegen Coolify-DB. run.status=success, action_results.length==1, activities-Tabelle hat Insert.
- Dependencies: MT-1, MT-2, MT-3, MT-4

#### MT-6: Cron-Endpoint anlegen
- Goal: `/api/cron/automation-runner` POST-Handler.
- Files: `cockpit/src/app/api/cron/automation-runner/route.ts`
- Expected behavior: verifyCronSecret, SELECT stuck runs LIMIT 50, sequential await executeAutomationRun fuer jeden, NextResponse.json. Pattern aus existing `expire-proposals/route.ts` 1:1 uebernehmen.
- Verification: Vitest-Mock-Test (auth-fail returnt 401). End-to-End-Test in MT-9 verifiziert Pickup.
- Dependencies: MT-5

#### MT-7: Trigger-Source Verdrahtung
- Goal: dispatchAutomationTrigger-Aufrufe in 7+ Pfaden integrieren.
- Files: `cockpit/src/app/(app)/deals/actions.ts`, `cockpit/src/app/(app)/activities/actions.ts`, `cockpit/src/lib/actions/activity-actions.ts`, `cockpit/src/app/(app)/pipeline/actions.ts`, `cockpit/src/app/api/cron/meeting-briefing/route.ts`, `cockpit/src/app/api/cron/call-processing/route.ts`, `cockpit/src/app/api/cron/meeting-summary/route.ts`, plus dispatcher.ts MODIFY (executor-Call enable), trigger-sources.ts MODIFY (dispatches_now:true)
- Expected behavior: Jede Server-Action / Cron-Route inserted audit_log mit RETURNING id, dann ruft `await dispatchAutomationTrigger({event, entityType, entityId, triggerEventAuditId, changes})`. Defensive: try/catch ums dispatch-statement, dass Workflow-Fehler nicht Server-Action blockt.
- Verification: TypeScript-Build gruen. Manueller Browser-Smoke: Stage-Change auf Deal → automation_runs-Insert in DB nachpruefen. Audit-Liste trigger-sources.ts zeigt alle dispatches_now:true.
- Dependencies: MT-5

#### MT-8: Stage-Delete-Soft-Disable
- Goal: deletePipelineStage erweitern um Auto-Pause referenzierender Regeln.
- Files: `cockpit/src/app/(app)/settings/pipelines/actions.ts`
- Expected behavior: Vor Delete SELECT FROM automation_rules mit references_stage_ids @> ARRAY[$id]. Wenn count>0: UPDATE rules SET status='paused', paused_reason. Toast-Count im Server-Action-Return.
- Verification: Vitest gegen Coolify-DB. INSERT rule mit references_stage_ids=[stageId], deletePipelineStage(stageId), verify rule.status='paused', paused_reason!=null. Stage selbst geloescht.
- Dependencies: SLC-621 abgeschlossen

#### MT-9: End-to-End-Integration-Tests
- Goal: 3 Test-Cases gegen Coolify-DB.
- Files: `cockpit/src/__tests__/automation-engine.test.ts`
- Expected behavior: Test 1 (Happy-Path): create rule mit deal.stage_changed → create_task, change deal stage, await dispatch+execute, verify activities-Insert + run.status=success. Test 2 (Recursion): create 4 update_field-runs in 60s, 4. wird skipped. Test 3 (Cron-Pickup): manual INSERT stuck run, POST cron-endpoint, verify run.status=success.
- Verification: `vitest run automation-engine.test.ts` gegen Coolify-DB gruen.
- Dependencies: MT-5, MT-6, MT-7

#### MT-10: REL-024-Notes Draft mit Cron-Setup
- Goal: docs/RELEASES.md ergaenzen um REL-024-Eintrag (Status: planned) mit expliziter Coolify-Cron-Setup-Anleitung.
- Files: `docs/RELEASES.md`
- Expected behavior: `### REL-024 — V6.2 Workflow-Automation + Kampagnen-Attribution` Eintrag mit `Date: planned`, `Scope: ...`, `Risks: Cron muss manuell in Coolify angelegt werden — sonst Cron-Fallback inaktiv (Sync-Pfad funktioniert weiter)`, `Rollback Notes: ...`. Eigener Sub-Block "Coolify-Cron-Setup nach Deploy": Container, Cron-Expression, ENV, exact-curl-Befehl als Smoke.
- Verification: REL-024-Eintrag liest sich self-explanatory. User folgt der Anleitung im /deploy-Schritt ohne Rueckfrage.
- Dependencies: MT-6

#### MT-11: Cockpit-Records aktualisieren + commit
- Goal: STATE.md, slices/INDEX.md, RPT-XXX nach Abschluss aktualisieren.
- Files: `slices/INDEX.md`, `docs/STATE.md`, `reports/RPT-XXX.md`
- Expected behavior: SLC-622 Status `planned -> done`, STATE.md Current Focus auf SLC-623.
- Verification: git diff zeigt 3+ modifizierte Files. Commit-Push.
- Dependencies: MT-1..MT-10 abgeschlossen

## QA-Fokus (fuer /qa SLC-622)

- **End-to-End-Workflow**: Browser-Smoke "Deal-Stage in Pipeline aendern → automation_runs-Insert + Action-Execution + activities-Insert in <30s" — manueller Test im Local-Dev-Server.
- **4 Action-Types live**: Manueller Test pro Action-Type via direkt-INSERT einer Test-Regel + Trigger.
- **PII-Schutz aktiv**: update_field auf `contacts.email` rejected.
- **Recursion-Counter**: 4 update_field-Runs in 60s — 4. wird skipped (Vitest gegen Coolify-DB).
- **Cron-Pickup**: stuck run nach 60s wird vom Cron-Endpoint gepicked und ausgefuehrt.
- **Stage-Delete-Soft-Disable**: Test-Pipeline anlegen, Stage referenzierende Regel anlegen, Stage loeschen → Regel pausiert.
- **audit_log-Side-Effects**: Workflow-Action loggt mit actor_id=NULL und triggered_by_user_id im changes-JSONB.
- **TypeScript + Vitest + ESLint**: gruen.
- **Live-Smoke nach Coolify-Deploy + manueller Cron-Anlage**: Stage-Change auf Live-System → automation_runs in DB nachpruefen.
- **REL-024-Notes**: Cron-Setup-Anleitung enthalten, User-Test ob Anleitung selbsterklaerend ist.
