# SLC-621 — Workflow-Automation Foundation (Schema + Trigger-Dispatcher + Whitelist + Rule-CRUD)

## Meta
- Feature: FEAT-621
- Priority: Blocker
- Status: planned
- Created: 2026-05-05
- Estimated Effort: 5-7h

## Goal

Den deterministischen Wenn-Dann-Engine-Foundation-Block fuer V6.2 anlegen: MIG-029 Teil 1 (`automation_rules` + `automation_runs`-Tabellen mit Anti-Loop-UNIQUE), Trigger-Dispatcher-Helper als Code-Konfig fuer alle Trigger-Source-Server-Actions (3 zentrale Pfade + 4 Cron-Pfade), Field-Whitelist fuer `update_field` mit Validators als Code-Konfig (DEC-130, PII-Schutz), und Server Actions fuer Rule-CRUD (`saveAutomationRule`, `listAutomationRules`, `pauseAutomationRule`, `deleteAutomationRule`). Action-Executor selbst wird in SLC-622 angelegt — SLC-621 baut nur das Fundament: Schema + Dispatcher-Insert-Pfad + Anti-Loop-Marker + CRUD.

Im Anschluss-SLC-622 wird der Action-Executor + Cron-Fallback + 4 Action-Types live geschaltet. Im SLC-623 die Builder-UI.

## Scope

- **MIG-029 Teil 1** (`sql/migrations/029_v62_automation_and_campaigns.sql` neu, idempotent, Coolify-Apply via SLC-621):
  - `automation_rules`-Tabelle: `id, name, description, status (active|paused|disabled), trigger_event (deal.stage_changed|deal.created|activity.created), trigger_config JSONB, conditions JSONB, actions JSONB, references_stage_ids UUID[], paused_reason, created_by, created_at, updated_at, last_run_at, last_run_status`
  - `automation_runs`-Tabelle: `id, rule_id, trigger_event, trigger_entity_type, trigger_entity_id, trigger_event_audit_id, conditions_match, status (pending|running|success|partial_failed|failed|skipped), started_at, finished_at, action_results JSONB, error_message, created_at`
  - **Anti-Loop-UNIQUE-Constraint**: `UNIQUE (rule_id, trigger_entity_id, trigger_event_audit_id)`
  - 3 Indizes: `idx_automation_runs_pending` (Cron-Pickup-Filter), `idx_automation_runs_rule` (UI-Statistik), `idx_automation_rules_active` (Dispatcher-Lookup)
  - RLS `authenticated_full_access` auf beide Tabellen
  - GRANTS auf `authenticated, service_role`
  - SLC-621 nur Workflow-Anteil; SLC-624 ergaenzt MIG-029 um Campaigns-Anteil (zu dem Zeitpunkt wird die SQL-File ein zweites Mal applied — idempotent via `CREATE TABLE IF NOT EXISTS`)
- **Trigger-Source Code-Konfig** (`cockpit/src/lib/automation/trigger-sources.ts` neu): explizite Liste aller Server-Action- und Cron-Pfade die `dispatchAutomationTrigger` aufrufen MUESSEN, mit Trigger-Event-Mapping. Dient als Audit-Single-Source-of-Truth, damit V2-Trigger-Erweiterung nicht versehentlich Pfade vergisst:
  - `deals/actions.ts:updateDealStage` → `deal.stage_changed`
  - `deals/actions.ts:createDeal` → `deal.created`
  - `activities/actions.ts:createActivity` → `activity.created`
  - `pipeline/actions.ts:moveCardToStage` → `deal.stage_changed` (Drag&Drop-Pfad)
  - `lib/actions/activity-actions.ts:createActivity` (zentraler Helper) → `activity.created`
  - `meetings/actions.ts:createMeeting` (Activity-Insert?) → `activity.created` falls Activity erzeugt wird
  - `calls/actions.ts:logCall` → `activity.created` falls Activity erzeugt wird
  - `lib/actions/insight-actions.ts` (KI-Insight-Approval) → `activity.created` falls Activity erzeugt wird
  - **Cron-Side** (system-driven): `api/cron/meeting-briefing/route.ts` → `activity.created` (Briefing-Activity), `api/cron/call-processing/route.ts` → `activity.created`, `api/cron/meeting-summary/route.ts` → `activity.created` falls Summary-Activity
  - Audit-Hinweis: nicht-zentrale Aufrufer (`mein-tag`, `focus`, `actions/meetings.ts`) rufen ueber zentralen `lib/actions/activity-actions.ts:createActivity` Helper auf — Dispatcher dort einbauen reicht (DRY-Pattern). Wenn ein Pfad direkten Insert macht, muss er manuell dispatchen oder zum Helper migriert werden. Audit-Tabelle in der File dokumentiert.
- **Trigger-Dispatcher-Helper** (`cockpit/src/lib/automation/dispatcher.ts` neu):
  ```typescript
  export async function dispatchAutomationTrigger(args: {
    event: TriggerEvent;
    entityType: 'deal' | 'activity';
    entityId: string;
    triggerEventAuditId?: string | null;
    changes?: Record<string, unknown>;
  }): Promise<void>;
  ```
  - SELECT alle aktiven Regeln mit passendem `trigger_event` (Index-gestuetzt)
  - App-Level-Condition-Match via `cockpit/src/lib/automation/condition-engine.ts` (neu, ~50 Zeilen, AND-only, kompakte JS-Engine, KEINE Library)
  - INSERT `automation_runs (status='pending')` mit `ON CONFLICT (rule_id, trigger_entity_id, trigger_event_audit_id) DO NOTHING` → Anti-Loop
  - Fire-and-forget (`void executeAutomationRun(runId).catch(logErr)`) — aber Executor-Stub erst in SLC-622 produktiv. In SLC-621 dispatcher inserted nur, executor-Call ist auskommentiert oder leer (TODO-SLC-622-Kommentar)
- **Anti-Loop-Token-Schema** fuer Triggers ohne audit_id (`deal.created`/`activity.created` mit fehlendem audit_log-Insert): Wenn Aufrufer KEIN `triggerEventAuditId` setzt, nutzt Dispatcher die `entityId` selbst als Anti-Loop-Token (Cast `entityId` als `triggerEventAuditId` in INSERT). Damit gilt: jeder Deal kann nur einmal denselben `deal.created`-Workflow triggern. Praktisch: wir setzen IMMER `triggerEventAuditId` aus dem audit_log-Insert (Pattern: createDeal inserted audit_log mit `action='create'` und reicht die ID zurueck), Fallback-Cast nur fuer Edge-Faelle in spaeteren V2-Erweiterungen relevant.
- **Field-Whitelist Code-Konfig** (`cockpit/src/lib/automation/field-whitelist.ts` neu, DEC-130):
  ```typescript
  type EntityType = 'deal' | 'contact' | 'company';
  interface FieldSpec {
    field: string;
    validate: (v: unknown) => boolean;
    coerce?: (v: unknown) => unknown;
  }
  export const UPDATE_FIELD_WHITELIST: Record<EntityType, FieldSpec[]> = {
    deal: [
      { field: 'stage_id', validate: validateUuid },
      { field: 'value', validate: v => typeof v === 'number' && v >= 0 && v <= 1e9 },
      { field: 'expected_close_date', validate: validateIsoDate },
    ],
    contact: [{ field: 'tags', validate: validateTagsArray }],
    company: [{ field: 'tags', validate: validateTagsArray }],
  };
  export function isFieldWhitelisted(entity: EntityType, field: string): boolean;
  export function validateFieldValue(entity: EntityType, field: string, value: unknown): { ok: boolean; error?: string };
  ```
  - **PII-Schutz** (DSGVO-relevant): Whitelist erlaubt explizit KEINE Felder `email`, `phone`, `name`, `title`, `description`, `email_address`. Test-AC pruepft das in SLC-622 explizit (negativ-Test).
  - Validators sind reine Pure-Functions: `validateUuid` (Regex), `validateIsoDate` (date-fns parse), `validateTagsArray` (Array<string> max 50 elements, jeder string max 100 chars).
- **Server Actions fuer Rule-CRUD** (`cockpit/src/app/(app)/settings/automation/actions.ts` neu):
  - `saveAutomationRule(input)` — INSERT/UPDATE in automation_rules, walk durch trigger_config + conditions zur Sammlung der `references_stage_ids` (denormalisierter Cache fuer DEC-133 Stage-Soft-Disable)
  - `listAutomationRules()` — SELECT mit JOIN auf last automation_run (LEFT JOIN LATERAL fuer last_run_status)
  - `pauseAutomationRule(id, reason?)` — UPDATE status='paused', paused_reason=reason
  - `activateAutomationRule(id)` — UPDATE status='active', paused_reason=null
  - `deleteAutomationRule(id)` — DELETE (CASCADE entfernt automation_runs)
  - Server-Action-Validation: trigger_event in 3-Whitelist, actions[].type in 4-Whitelist, alle update_field-Actions durch `isFieldWhitelisted` validiert
- **Type-Definitions** (`cockpit/src/types/automation.ts` neu):
  - `TriggerEvent`, `AutomationRule`, `AutomationRun`, `Condition`, `Action`, `ActionResult`, `ActionType`
- **Schema-Smoke-Test** als Vitest gegen Coolify-DB (`cockpit/src/__tests__/automation-schema.test.ts` neu): Apply-Idempotenz, Anti-Loop-UNIQUE-Constraint greift, RLS-Policies funktionieren, GRANTS sauber.
- **Cockpit-Records-Update**:
  - `slices/INDEX.md`: SLC-621 Status `planned -> done`
  - `features/INDEX.md`: FEAT-621 Status `planned -> in_progress` (V6.2 1/3 Workflow-Slices done)
  - `planning/backlog.json`: BL-135 Status bleibt `in_progress` (erste 3 Workflow-Slices)
  - `docs/STATE.md`: naechste = SLC-622

## Out of Scope

- Action-Executor-Logik (SLC-622)
- Cron-Fallback-Endpoint (SLC-622)
- Builder-UI (SLC-623)
- Trockenlauf-Modul (SLC-623)
- Stage-Delete-Soft-Disable-Trigger im `pipeline-stages/actions.ts` (SLC-622, dort braucht es den Pause-Mechanismus)
- Time-based Trigger (V6.2 Out-of-Scope laut FEAT-621)
- Webhook-Actions (V6.2 Out-of-Scope)
- Multi-Step-Sequence (V6.2 Out-of-Scope)
- Migration alter Activities/Deals zu Trigger-Events (Trockenlauf in SLC-623 simuliert das ohne Migration)

## Acceptance Criteria

- AC1: MIG-029 idempotent — kann zweimal hintereinander auf Coolify-DB ausgefuehrt werden ohne Fehler.
- AC2: Beide Tabellen `automation_rules` + `automation_runs` existieren mit korrekten Spalten, CHECKs, Indizes, RLS.
- AC3: Anti-Loop-UNIQUE-Constraint `automation_runs(rule_id, trigger_entity_id, trigger_event_audit_id)` greift — zweiter INSERT mit identischen Werten wird stille verworfen via ON CONFLICT DO NOTHING (Vitest verifiziert).
- AC4: `dispatchAutomationTrigger` SELECTed nur aktive Regeln (`status='active'`) und matcht `trigger_event` exakt.
- AC5: `dispatchAutomationTrigger` evaluiert AND-Conditions korrekt (Vitest mit 4 Pattern: alle match, keine match, einige match, leer-condition-array).
- AC6: `dispatchAutomationTrigger` inserted automation_runs mit `status='pending'` und korrektem `trigger_event_audit_id` (Vitest verifiziert).
- AC7: `dispatchAutomationTrigger` ist non-blocking — returnt sofort, fire-and-forget Promise (Vitest measured).
- AC8: `trigger-sources.ts` Code-Konfig listet alle 7+ relevanten Pfade mit Trigger-Event-Mapping (Audit-Liste).
- AC9: `field-whitelist.ts` lehnt PII-Felder explizit ab — `isFieldWhitelisted('contact', 'email')` returns false (Vitest negative-test).
- AC10: `field-whitelist.ts` akzeptiert nur die 4 Whitelist-Felder pro Entity-Type.
- AC11: `validateFieldValue('deal', 'value', -100)` returns `{ok: false}` (Range-Check).
- AC12: `validateFieldValue('deal', 'stage_id', 'not-a-uuid')` returns `{ok: false}`.
- AC13: `saveAutomationRule` validiert `trigger_event` Whitelist + `actions[].type` Whitelist + `update_field`-Targets via Whitelist.
- AC14: `saveAutomationRule` schreibt `references_stage_ids` korrekt aus trigger_config + conditions Walk.
- AC15: `listAutomationRules` returns Rules mit JOIN auf letzte automation_run (last_run_at, last_run_status).
- AC16: `pauseAutomationRule(id, "Test")` setzt status='paused' und paused_reason='Test'.
- AC17: `deleteAutomationRule(id)` triggert CASCADE delete auf automation_runs (Vitest verifiziert).
- AC18: TypeScript-Build (`npm run build`) gruen.
- AC19: Vitest (`npm run test`) gruen — neue Tests fuer dispatcher, field-whitelist, condition-engine, schema-smoke-test, server-actions.
- AC20: ESLint (`npm run lint`) gruen.
- AC21: Schema-Smoke-Test gegen Coolify-DB im node:20 Container (per `coolify-test-setup.md` Pattern) PASS.

## Dependencies

- V3 audit_log-Tabelle (existing) + insert-Pattern — Anti-Loop-Marker
- V4.1 audit_log.actor_id NULL-able — System-Side-Effects
- Coolify-DB-Zugriff fuer MIG-029-Apply
- V5.5 SLC-551 Server-Action-Pattern (Reuse-Vorlage)
- V5.7 SLC-571 Validator-Pattern (Reuse Pure-Functions)
- Style Guide V2 (BL-403) — wird erst in SLC-623 UI-relevant

## Risks

- **Risk:** Anti-Loop-UNIQUE-Constraint mit NULL in `trigger_event_audit_id` greift nicht (Postgres betrachtet NULL als verschieden).
  Mitigation: Aufrufer setzt IMMER `triggerEventAuditId` aus audit_log-Insert (Pattern: jede mutating Server Action inserted erst audit_log mit RETURNING id, dann dispatch mit der ID). Fallback: Dispatcher castet `entityId` als Anti-Loop-Token wenn `triggerEventAuditId` fehlt. AC verifiziert beide Pfade.
- **Risk:** `references_stage_ids`-Walk ist unvollstaendig — neuer Condition-Type `stage_in` greift in V2 Erweiterung, aber V1-Walk vergisst ihn.
  Mitigation: Walk ist in V1 nur fuer 2 Stellen (trigger_config.stage_id + conditions wo field='stage_id'). Bei V2-Erweiterung Walk-Helper anpassen. Test-AC pruepft beide V1-Stellen.
- **Risk:** Field-Whitelist veraltet wenn Schema-Migration ein Feld umbenennt (z.B. `deal.value` → `deal.amount`).
  Mitigation: Whitelist als Code-Konfig in Git versioned. Bei Schema-Aenderung wird Whitelist im selben PR angepasst. Reviewable.
- **Risk:** Trigger-Dispatcher-Aufruf in `lib/actions/activity-actions.ts` (zentraler Helper) erfordert Refactor mehrerer call-sites.
  Mitigation: Helper ruft dispatcher selbst — alle bestehenden Aufrufer profitieren automatisch ohne Code-Aenderung. Wenn es Direct-Inserts gibt (nicht ueber Helper), trigger-sources.ts dokumentiert die Auditliste, MT-3 macht den Refactor explicit.
- **Risk:** Schema-Smoke-Test gegen Coolify-DB findet PII-Daten in automation_runs.error_message (z.B. SQL-Error mit echten User-Daten).
  Mitigation: Error-Message-Truncation (max 500 chars) + Sanitisation in Executor (SLC-622). In SLC-621 Schema selbst hat KEIN PII-Risiko.
- **Risk:** SaveAutomationRule mit fehlendem Validator (z.B. trigger_event ist 'foo') passiert DB-CHECK aber kommt zur Server-Action.
  Mitigation: Server-Action validiert client-side BEVOR DB-Insert. AC13 verifiziert das.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `sql/migrations/029_v62_automation_and_campaigns.sql` | NEU (Workflow-Anteil) — `automation_rules`, `automation_runs`, Indizes, UNIQUE-Constraint, RLS, GRANTS |
| `cockpit/src/types/automation.ts` | NEU — TriggerEvent, AutomationRule, AutomationRun, Condition, Action, ActionType, ActionResult |
| `cockpit/src/lib/automation/trigger-sources.ts` | NEU — Code-Konfig-Audit-Liste aller dispatch-Aufrufer mit Event-Mapping |
| `cockpit/src/lib/automation/dispatcher.ts` | NEU — `dispatchAutomationTrigger()` Helper |
| `cockpit/src/lib/automation/condition-engine.ts` | NEU — App-Level AND-only Condition-Matcher (kompakte JS-Engine ~50 Zeilen) |
| `cockpit/src/lib/automation/field-whitelist.ts` | NEU — UPDATE_FIELD_WHITELIST Konstante + Validator-Functions |
| `cockpit/src/lib/automation/__tests__/condition-engine.test.ts` | NEU — Vitest fuer 4 AND-Pattern |
| `cockpit/src/lib/automation/__tests__/field-whitelist.test.ts` | NEU — Vitest PII-Negative-Tests + Validators |
| `cockpit/src/app/(app)/settings/automation/actions.ts` | NEU — saveAutomationRule, listAutomationRules, pauseAutomationRule, activateAutomationRule, deleteAutomationRule |
| `cockpit/src/__tests__/automation-schema.test.ts` | NEU — Schema-Smoke-Test gegen Coolify-DB (Anti-Loop, RLS, GRANTS) |
| `slices/INDEX.md` | MODIFY — SLC-621 Status nach Abschluss von planned->done |
| `features/INDEX.md` | MODIFY — FEAT-621 Status auf in_progress |
| `docs/STATE.md` | MODIFY — naechste = SLC-622 |
| `planning/backlog.json` | unveraendert (BL-135 bleibt in_progress) |

## Micro-Tasks

#### MT-1: Trigger-Source-Audit erstellen
- Goal: Alle Server-Action- und Cron-Pfade auflisten die Activities oder Deals erzeugen, mit Trigger-Event-Mapping.
- Files: `cockpit/src/lib/automation/trigger-sources.ts`
- Expected behavior: Export einer Konstanten `TRIGGER_SOURCE_AUDIT: TriggerSourceEntry[]` mit `path`, `function_name`, `trigger_event`, `dispatches_now (boolean)`, `notes`. Zusaetzlich zwei Helper-Functions `getDispatchersFor(event)` und `getMissingDispatchers()`. Nur Code-Konfig — keine Runtime-Logic.
- Verification: TS-Build gruen. File ist nur Konstante + Lookups, kein Side-Effect. `getMissingDispatchers()` listet alle 7+ Pfade die NOCH NICHT dispatchen (V1-Baseline).
- Dependencies: none

#### MT-2: TypeScript-Types definieren
- Goal: Alle Automation-Types als Single-Source-of-Truth definieren.
- Files: `cockpit/src/types/automation.ts`
- Expected behavior: Exports fuer `TriggerEvent` (literal-union), `AutomationRule` (DB-Row-Shape), `AutomationRun`, `Condition`, `Action` (4 ActionType-Subtypes mit discriminated union), `ActionResult`, `ActionType`. Strict-Types, keine `any`.
- Verification: TS-Build gruen. Types werden in MT-3 + MT-4 + MT-5 importiert.
- Dependencies: none

#### MT-3: SQL-Migration MIG-029 Workflow-Anteil schreiben + applien
- Goal: `automation_rules` + `automation_runs` Tabellen anlegen, idempotent, mit Anti-Loop-UNIQUE.
- Files: `sql/migrations/029_v62_automation_and_campaigns.sql`
- Expected behavior: SQL-File enthaelt Workflow-Anteil mit `CREATE TABLE IF NOT EXISTS`, 3 Indizes, UNIQUE-Constraint, RLS-Policies, GRANTS. Apply auf Coolify-DB via `coolify-test-setup.md`-Pattern (base64 + docker exec postgres). Verifikation `\d automation_rules` + `\d automation_runs`.
- Verification: Apply zweimal hintereinander ohne Fehler. `\d automation_runs` zeigt UNIQUE-Constraint. SELECT 1 FROM information_schema-Query bestaetigt RLS aktiv.
- Dependencies: MT-2 (Types referenzieren Schema)

#### MT-4: Condition-Engine implementieren + testen
- Goal: AND-only App-Level-Condition-Matcher fuer den Dispatcher.
- Files: `cockpit/src/lib/automation/condition-engine.ts`, `cockpit/src/lib/automation/__tests__/condition-engine.test.ts`
- Expected behavior: Pure-Function `evaluateConditions(conditions: Condition[], entity: Record<string, unknown>): boolean`. Operators: `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `in`, `not_in`, `contains` (fuer Tags-Arrays). AND-only, leeres Array returnt true.
- Verification: 4 Vitest-Cases — alle match (true), keine match (false), eine match aber andere nicht (false), leeres Array (true). Alle gruen.
- Dependencies: MT-2

#### MT-5: Field-Whitelist + Validators
- Goal: Type-safe Field-Whitelist mit PII-Schutz.
- Files: `cockpit/src/lib/automation/field-whitelist.ts`, `cockpit/src/lib/automation/__tests__/field-whitelist.test.ts`
- Expected behavior: Konstante UPDATE_FIELD_WHITELIST mit 4 erlaubten Feldern (deal.stage_id, deal.value, deal.expected_close_date, contact.tags, company.tags). Helper `isFieldWhitelisted` + `validateFieldValue`. Validators: validateUuid (Regex), validateIsoDate, validateTagsArray.
- Verification: PII-Negative-Tests (`isFieldWhitelisted('contact', 'email')` = false fuer email/phone/name/title/description). Range-Check fuer value (negative = fail). UUID-Regex fuer stage_id.
- Dependencies: MT-2

#### MT-6: Trigger-Dispatcher implementieren
- Goal: `dispatchAutomationTrigger` Helper mit Anti-Loop-Insert.
- Files: `cockpit/src/lib/automation/dispatcher.ts`
- Expected behavior: Async-Function selected aktive Rules, evaluiert conditions, INSERT automation_runs mit ON CONFLICT DO NOTHING. Fire-and-forget executor-Call ist als `// TODO SLC-622: void executeAutomationRun(runId).catch(logErr)` Kommentar. Returns `Promise<void>` schnell (<50ms).
- Verification: Manueller Test gegen Coolify-DB — `dispatchAutomationTrigger({event:'deal.stage_changed',...})` inserted automation_runs. Zweiter Aufruf mit identischem audit_id wird vom UNIQUE-Constraint geblockt (verifiziert via SELECT count danach).
- Dependencies: MT-3, MT-4, MT-5

#### MT-7: Server Actions fuer Rule-CRUD
- Goal: 5 Server Actions fuer Rule-Lifecycle.
- Files: `cockpit/src/app/(app)/settings/automation/actions.ts`
- Expected behavior: saveAutomationRule (INSERT/UPDATE), listAutomationRules (SELECT mit LATERAL JOIN auf last automation_run), pauseAutomationRule, activateAutomationRule, deleteAutomationRule. Alle mit Auth-Check (`requireUser()`), Server-Action-Validation gegen Whitelists, references_stage_ids-Walk in saveAutomationRule.
- Verification: Manueller Server-Action-Test im Dev-Server (POST-Body ohne UI). Roundtrip: save → list (ein Eintrag mit last_run_at=null) → pause (status='paused') → activate (status='active') → delete (CASCADE bestaetigt). references_stage_ids-Walk: Rule mit trigger_config.stage_id="X" und conditions[0].field="stage_id" value="Y" → references_stage_ids = ["X","Y"].
- Dependencies: MT-3, MT-5

#### MT-8: Schema-Smoke-Test gegen Coolify-DB
- Goal: End-to-End Smoke-Test der Schema + Anti-Loop + RLS + GRANTS.
- Files: `cockpit/src/__tests__/automation-schema.test.ts`
- Expected behavior: Vitest-Test gegen Coolify-DB im node:20 Container (per `.claude/rules/coolify-test-setup.md`). 3 Test-Faelle: (1) INSERT identische run-Tripel zweimal, zweiter wird ON CONFLICT verworfen (count=1), (2) RLS-Policy authenticated_full_access erlaubt SELECT mit jwt-claim, (3) CASCADE delete: automation_rules-DELETE entfernt zugehoerige automation_runs.
- Verification: `docker run --rm --network <coolify-net> -v /opt/<repo>:/app -w /app -e TEST_DATABASE_URL='...' node:20 npx vitest run automation-schema.test.ts` gruen.
- Dependencies: MT-3, MT-7

#### MT-9: Cockpit-Records aktualisieren + commit
- Goal: STATE.md, slices/INDEX.md, features/INDEX.md, RPT-XXX nach Abschluss aktualisieren.
- Files: `slices/INDEX.md`, `features/INDEX.md`, `docs/STATE.md`, `reports/RPT-XXX.md`
- Expected behavior: SLC-621 Status `planned -> done`, FEAT-621 Status `planned -> in_progress`, STATE.md Current Focus auf SLC-622. RPT-XXX nach mandatory-completion-report Pattern.
- Verification: git diff zeigt 4 modifizierte Files + 1 neue RPT. Commit-Push.
- Dependencies: MT-1..MT-8 abgeschlossen

## QA-Fokus (fuer /qa SLC-621)

- **Schema-Validierung**: `\d automation_rules` + `\d automation_runs` zeigen alle Spalten + Constraints korrekt.
- **Anti-Loop-Test**: Manueller `INSERT INTO automation_runs ... VALUES (rule_id, entity_id, audit_id, ...) RETURNING id` — zweimal mit identischem Tripel, zweiter ON CONFLICT verworfen.
- **PII-Schutz-Test**: `isFieldWhitelisted('contact', 'email')` false, alle PII-Felder gepruepft (email, phone, name, title, description).
- **Server-Action-Roundtrip**: save → list → pause → activate → delete als manueller Browser-Smoke gegen Local-Dev-Server (Hetzner).
- **TypeScript + Vitest + ESLint**: alle gruen.
- **Schema-Smoke gegen Coolify-DB**: vitest run automation-schema.test.ts gruen.
- **Performance**: dispatcher returnt < 50ms (Vitest mit performance.now()).
- **Code-Konfig-Audit**: trigger-sources.ts listet alle 7+ Pfade vollstaendig (Reviewer-Check).
