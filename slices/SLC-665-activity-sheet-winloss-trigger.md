# SLC-665 — Activity-Sheet + Win/Loss-Auto-Trigger (BL-448 + BL-450, FEAT-664 + FEAT-666)

## Metadata
- **Slice ID:** SLC-665
- **Version:** V6.6
- **Feature:** FEAT-664 (Activity-Sheet) + FEAT-666 (Win/Loss-Auto-Trigger)
- **Status:** planned
- **Priority:** Blocker (einziger Backend-Slice in V6.6)
- **Created:** 2026-05-09
- **Estimated Effort:** ~3-4h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped
- **Architecture:** DEC-170 (Activity-Sheet als Reuse Task-Sheet via ItemSheet-Refactor) + DEC-171 (Win/Loss-Auto-Trigger als V6.2-Workflow-Action + auto_winloss_runs + 5-Min-Time-Window) + MIG-032
- **Reihenfolge-Pflicht:** **nach SLC-664** (Activity-Sheet baut auf neuem Deal-Detail-Layout). MIG-032 als ersten Schritt vor Workflow-Action-Code-Deploy.

## Goal

Zwei Themen, ein Slice (gemeinsame Acceptance-Criteria im Live-Smoke + gemeinsame MIG-032):

1. **Activity-Sheet** — Klick auf Activity-Item in Deal-Detail-Timeline oeffnet Detail-Sheet rechts (Reuse Task-Sheet via ItemSheet-Refactor mit Type-Discriminator). Sheet zeigt Risiken/Einwaende/Naechste-Schritte/Teilnehmer/Zusammenfassung wenn Bedrock-Summary vorhanden, sonst kompakte Basis-Daten.

2. **Win/Loss-Auto-Trigger** — Stage-Wechsel auf won/lost feuert via V6.2-Workflow-Action `auto_winloss_extract` automatisch einen Bedrock-Win/Loss-Run. Idempotenz via 5-Min-Time-Window. Read-API `/api/winloss/[deal_id]` mit Bearer-Auth fuer Intelligence Studio.

## Scope

**In Scope:**
- **MIG-032** (FIRST STEP, vor Workflow-Action-Code-Deploy): apply auf Hetzner via SSH+base64 (per memory `feedback_sql_on_hetzner`). 2 Aenderungen: (a) `user_settings` ADD working_hours_start/end TIME (fuer SLC-667 vorbereitet, SLC-665 nutzt es nicht direkt) (b) NEW TABLE `auto_winloss_runs` + Indizes + RLS.
- **Activity-Sheet:**
  - `cockpit/src/components/item-sheet/types.ts` (NEU) — `ItemSheetData`-Type-Discriminator
  - `cockpit/src/components/item-sheet/ItemSheet.tsx` (NEU oder Refactor aus Task-Sheet) — generische Component
  - `cockpit/src/components/item-sheet/ItemSheet.test.tsx` (NEU)
  - `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` MODIFY — Task-Sheet-Aufruf auf ItemSheet umstellen (Refactor-First, keine Verhaltens-Aenderung)
  - `cockpit/src/app/(app)/deals/[id]/deal-detail-client.tsx` MODIFY — Activity-Click-Handler oeffnet ItemSheet mit `kind: "activity"`
  - `cockpit/src/lib/activity/loadActivityWithBedrockSummary.ts` (NEU, Server-Action) — laedt Activity + ggf. signal-extract-output + meeting-briefing-output
- **Win/Loss-Auto-Trigger:**
  - `cockpit/src/lib/automation/actions/auto_winloss_extract.ts` (NEU) — Workflow-Action mit Time-Window-Throttle + Bedrock-Call-Wrapper
  - `cockpit/src/lib/winloss/runWinLossExtract.ts` (NEU) — Bedrock-Wrapper-Pfad mit Reuse FEAT-114 Loss-Analysis-Logik (gleicher Prompt fuer won/lost)
  - System-Workflow-Rule-Anlage in `automation_rules` (Code-Konstante registriert Action-Type, einmaliger INSERT mit `is_system=true`, `trigger=deal.stage_changed`, `filter=new_stage_id IN (won_stage_id, lost_stage_id)`)
  - `cockpit/src/app/api/winloss/[deal_id]/route.ts` (NEU) — Read-API-Endpoint mit Bearer-Auth EXPORT_API_KEY (FEAT-622-Pattern)
  - `cockpit/src/lib/automation/actions/registry.ts` MODIFY (oder aequivalent) — neuer Action-Type `auto_winloss_extract` registriert
  - `cockpit/src/lib/ki-workspace/reports/winloss.ts` MODIFY (aus SLC-664) — manueller Re-Run nur wenn letzter Auto-Run aelter als 24h
  - Vitest-Tests fuer Idempotenz-Time-Window (5-Min-Throttle) + Read-API-Auth
- audit_log + automation_runs Insert pro Auto-Trigger-Run (V6.2-Pattern)

**Out of Scope:**
- Working-Hours-Setting-UI (`/settings/working-hours`) — SLC-667 (MIG-032 Schema ist vorbereitet, UI in SLC-667)
- Recording-Player im Activity-Sheet (V6.7+, kein V6.6)
- Backfill fuer historische Won/Lost-Deals — kein V6.6
- Activity-Inline-Edit im Sheet (kein V6.6)
- Multiplikatoren-Detail-KI-Workspace (Out of Scope FEAT-666)

## Acceptance Criteria

**MIG-032 + Setup:**

**AC1:** MIG-032 Sektion `auto_winloss_runs` ist auf Hetzner-Postgres applied (via SSH + base64, per memory `feedback_sql_on_hetzner`). `psql -c "\d auto_winloss_runs"` zeigt 11 Spalten + 2 Indizes + RLS aktiv. (working_hours-Cols werden in SLC-667 verifiziert.)

**AC2:** System-Workflow-Rule fuer `auto_winloss_extract` ist in `automation_rules` einmalig INSERTet mit `is_system=true`, `trigger=deal.stage_changed`. Kein Builder-UI-Eintrag.

**Activity-Sheet:**

**AC3:** ItemSheet-Refactor: Task-Sheet wurde extrahiert zu generischem `<ItemSheet>` mit Type-Discriminator `ItemSheetData = { kind: "task"; ... } | { kind: "activity"; ... }`. Mein-Tag-Task-Sheet nutzt jetzt ItemSheet (Verhalten unveraendert).

**AC4:** Klick auf Activity-Item in Deal-Detail-Timeline (Tabs > Timeline) oeffnet ItemSheet rechts mit `kind: "activity"`. Server-Action `loadActivityWithBedrockSummary` laedt Activity + ggf. Bedrock-Summary.

**AC5:** Sheet zeigt fuer Activities mit Bedrock-Summary (meeting + email-lang + call mit Recording): Sektionen Risiken / Einwaende / Naechste Schritte / Teilnehmer / Zusammenfassung. Sektionen rendern conditional (nur wenn Daten vorhanden).

**AC6:** Sheet zeigt fuer Activities ohne Bedrock-Summary (note + email-kurz/auto-reply): kompakte Basis-Daten + Auto-Reply-Hint wenn anwendbar. Sheet oeffnet IMMER (auch ohne Summary, DEC-170).

**AC7:** Sheet-Schliessen: X-Button + Klick-ausserhalb + ESC-Key (Reuse Task-Sheet-Logik aus FEAT-302).

**AC8:** Mobile (≤768px): ItemSheet wird zu Full-Screen-Sheet (volle Breite + Hoehe).

**Win/Loss-Auto-Trigger:**

**AC9:** Stage-Wechsel auf `won` (Stage-ID = won_stage_id) triggert via V6.2-Workflow-Engine die `auto_winloss_extract`-Action. Action prueft Time-Window (5 Min) — bei Hit "skipped:recent_run" in audit_log. Bei Miss: INSERT in `auto_winloss_runs` mit `status='pending'`, Bedrock-Call (FEAT-114-Logik), UPDATE `status='succeeded'` + `bedrock_output`. Plus INSERT in `automation_runs` + audit_log mit `event_type='auto_winloss_triggered'`.

**AC10:** Stage-Wechsel auf `lost` triggert ebenfalls — gleicher Pfad mit `target_status='lost'`.

**AC11:** Idempotenz: zweifaches Stage-Toggling won → lost → won innerhalb 5 Min triggert genau **2 Auto-Runs** (won + lost), nicht 3. Vitest mit fake-timer verifiziert.

**AC12:** Read-API GET `/api/winloss/[deal_id]` mit Bearer-Auth EXPORT_API_KEY returnt latest Run als JSON `{deal_id, target_status, triggered_at, bedrock_output, model, completed_at, status}`. Bei kein Run vorhanden: 404. Auth-Failure: 401.

**AC13:** Manueller Berichts-Button `[Win/Loss-Analyse]` im Deal-KI-Workspace (FEAT-664) triggert Re-Run nur wenn letzter Auto-Run aelter als 24h. "Erneut analysieren"-Button im AnswerPane overrided 24h-Cache.

**Slice-Level:**

**AC14:** TSC + `npm run test` (Vitest +N Tests inkl. Idempotenz-Time-Window-Test, Read-API-Auth-Test, ItemSheet-Test) + `npm run build` + `npm run lint` alle clean.

**AC15:** Live-Smoke (nach User-Coolify-Redeploy + MIG-032 applied):
- Activity-Sheet: User klickt Meeting-Activity in einem Deal-Detail-Timeline → Sheet zeigt Risiken/Einwaende/Zusammenfassung. Klickt eine Notiz → Sheet zeigt kompakte Basis-Daten.
- Win/Loss-Auto-Trigger: User wechselt Test-Deal von `qualified` auf `won` → in audit_log innerhalb 30s ein `auto_winloss_triggered`-Eintrag. Wechselt zurueck auf `lost` (innerhalb 5 Min) → 2. `auto_winloss_triggered`-Eintrag. Wechselt erneut auf `won` (innerhalb 5 Min) → KEIN 3. Eintrag (Throttle).
- Read-API: `curl -H "Authorization: Bearer $EXPORT_API_KEY" /api/winloss/[deal_id]` returnt 200 mit JSON.
- Manueller Button: `[Win/Loss-Analyse]` im Deal-KI-Workspace rendert (24h-Cache greift, da Auto-Run frisch).

## Reuse

- FEAT-302 Task-Sheet als Refactor-Quelle fuer ItemSheet
- FEAT-114 Loss-Analysis-Bedrock-Pfad fuer `runWinLossExtract.ts` (gleicher Prompt fuer won/lost)
- FEAT-621 Workflow-Engine (V6.2) fuer Action-Type-Registrierung
- FEAT-622 Campaign-Read-API-Pattern fuer `/api/winloss/[deal_id]` (Bearer-Auth EXPORT_API_KEY)
- FEAT-412 Signal-Extract-Output fuer Activity-Sheet-Bedrock-Summary
- V5.6 Meeting-Briefing-Output fuer Activity-Sheet-Bedrock-Summary
- shadcn-Sheet/Vaul (gleiche Library wie SLC-664 Pencil-Drawer)
- audit_log + automation_runs (V6.2)
- Migration-Pattern aus memory `coolify-test-setup.md` + `sql-migration-hetzner.md`

## Risks

- **R4.1 Win/Loss-Auto-Trigger duplicate runs (R4 Architecture):** Stage-Toggling-Edge-Case. **Mitigation:** Doppelter Schutz — 5-Min-Time-Window-Throttle (App-Level) + V6.2-Workflow-Recursion-Guard. Vitest mit fake-timer + Live-Smoke 3-fach Stage-Toggling.
- **R4.2 ItemSheet-Refactor-Regression:** Task-Sheet-Verhalten auf Mein Tag muss unveraendert bleiben. **Mitigation:** Refactor-First-Commit (Pure-Extraktion), keine Verhaltens-Aenderung. Bestehende Task-Sheet-Tests muessen weiter PASS sein. Erst danach Activity-Variante.
- **R4.3 MIG-032 Apply-Risk:** Schema-Migration auf Production. **Mitigation:** rein additive Aenderungen (CREATE TABLE + ALTER ADD COLUMN nullable). KEIN Lock-Wait erwartet. Apply via SSH+base64 (per memory). Rollback-SQL dokumentiert in MIG-032.
- **R4.4 Read-API-Auth-Drift:** Bearer-Auth muss konsistent zu V6.2 FEAT-622 sein. **Mitigation:** Pattern direkt aus `/api/campaigns/[id]/performance` kopieren.
- **R4.5 Activity-Sheet-Bedrock-Summary-Lookup:** Verschiedene Activity-Types haben Bedrock-Output an unterschiedlichen Stellen (signal_extract_run vs meeting_briefing). **Mitigation:** `loadActivityWithBedrockSummary` koppelt 2-3 Sources, returnt Optional-Felder. Conditional-Render im Sheet.

## Verification Strategy

- **Pre:** MIG-032-Schema lesen + auf Hetzner anwenden (FIRST STEP). Task-Sheet-Component lesen + ItemSheet-Refactor-Plan. FEAT-622 Read-API-Pattern lesen. V6.2-Workflow-Engine (Dispatcher + automation_rules-INSERT-Pattern) lesen.
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** TSC + Vitest (insb. Idempotenz-Test mit fake-timer) + Build + Lint + Live-Smoke (Activity-Sheet 2-fach + Auto-Trigger 3-fach Stage-Toggling + Read-API curl + Manueller Button).

---

## Micro-Tasks

### MT-1: MIG-032 Apply auf Hetzner (FIRST STEP)
- Goal: Schema-Migration via SSH+base64 anwenden.
- Files: `sql/migrations/032_v66_working_hours_and_winloss.sql` (NEU, basierend auf MIG-032-Spec)
- Expected behavior: Migration-File schreiben mit den exakten 2 Aenderungen aus MIG-032 (ALTER user_settings + CREATE TABLE auto_winloss_runs + 2 Indizes + RLS). Apply via:
  ```bash
  base64 -w 0 sql/migrations/032_v66_working_hours_and_winloss.sql
  ssh root@91.98.20.191 "echo 'BASE64_STRING' | base64 -d > /tmp/032.sql"
  ssh root@91.98.20.191 "docker exec -i <supabase-db-container> psql -U postgres -d postgres < /tmp/032.sql"
  ```
- Verification: SSH + `psql -c "\d auto_winloss_runs"` zeigt 11 Spalten + 2 Indizes + RLS aktiv. `psql -c "\d user_settings"` zeigt 2 neue Spalten + CHECK-Constraint.
- Dependencies: none (FIRST STEP)

### MT-2: System-Workflow-Rule INSERT
- Goal: Einmaliger INSERT in `automation_rules` fuer `auto_winloss_extract`-Action.
- Files: `sql/migrations/032b_system_winloss_rule.sql` (NEU, oder Code-Side-Effect)
- Expected behavior: INSERT INTO automation_rules mit `name='Auto Win/Loss Extract'`, `trigger='deal.stage_changed'`, `filter='new_stage_id IN (won_stage_id, lost_stage_id)'`, `action='auto_winloss_extract'`, `is_system=true`. Idempotent (ON CONFLICT DO NOTHING). Apply via SSH gleicher Pattern.
- Verification: `psql -c "SELECT id, name FROM automation_rules WHERE is_system=true AND action='auto_winloss_extract'"` returnt 1 Row.
- Dependencies: MT-1

### MT-3: ItemSheet-Refactor (Task-Sheet → ItemSheet)
- Goal: Pure-Extraktion Task-Sheet zu generischem ItemSheet, ohne Verhaltens-Aenderung.
- Files: `cockpit/src/components/item-sheet/types.ts` (NEU), `ItemSheet.tsx` (NEU), bestehender Task-Sheet-Component (REFACTOR oder Wrapper darum), Mein-Tag-Aufruf (MODIFY)
- Expected behavior: `ItemSheetData = { kind: "task"; task: Task; ... } | { kind: "activity"; activity: Activity; bedrockSummary?: BedrockSummary }`. ItemSheet ist die generische Component. Mein-Tag-Task-Sheet bleibt funktional unveraendert (gleiche Props, gleicher Look). Bestehende Task-Sheet-Tests muessen weiter PASS sein.
- Verification: Vitest bestehende Tests gruen + 1 neuer Test fuer Type-Discriminator. Live-Smoke nach Mein-Tag: Task-Sheet oeffnet wie vorher.
- Dependencies: none

### MT-4: Activity-Variant + loadActivityWithBedrockSummary
- Goal: Activity-Sheet-Branch im ItemSheet + Server-Action fuer Bedrock-Summary-Load.
- Files: `cockpit/src/lib/activity/loadActivityWithBedrockSummary.ts` (NEU), ItemSheet.tsx MODIFY (Activity-Branch)
- Expected behavior: Server-Action laedt activity-Row + JOIN/LOOKUP signal_extract_run (V4.3) + meeting_briefing-Output (V5.6). Returnt `{activity, bedrockSummary?: {risiken, einwaende, naechsteSchritte, teilnehmer, zusammenfassung}}`. ItemSheet-Activity-Branch rendert conditional Sektionen.
- Verification: Vitest mit Mock-DB-Daten — 4 Tests (meeting-mit-Summary, email-kurz-ohne-Summary, note-ohne-Summary, call-mit-conditional-Summary).
- Dependencies: MT-3

### MT-5: Activity-Click-Handler in Deal-Detail-Timeline
- Goal: Klick auf Activity-Item oeffnet ItemSheet.
- Files: `cockpit/src/app/(app)/deals/[id]/deal-detail-client.tsx` MODIFY (oder Timeline-Sub-Component)
- Expected behavior: Click-Handler ruft `loadActivityWithBedrockSummary(activityId)`, oeffnet ItemSheet mit `kind: "activity"`. Schliessen-Logik konsistent.
- Verification: Build clean. Live-Smoke: Klick auf Meeting-Activity zeigt Sheet mit Sektionen, Klick auf Notiz zeigt Sheet kompakt.
- Dependencies: MT-4

### MT-6: Workflow-Action-Code (auto_winloss_extract)
- Goal: V6.2-Workflow-Action Implementation mit Time-Window-Throttle.
- Files: `cockpit/src/lib/automation/actions/auto_winloss_extract.ts` (NEU), `cockpit/src/lib/winloss/runWinLossExtract.ts` (NEU), Action-Registry MODIFY
- Expected behavior:
  - `runWinLossExtract({dealId, targetStatus})` reused FEAT-114-Bedrock-Pfad (gleicher Prompt fuer won/lost). Returnt `{markdown, model, completedAt}`.
  - `auto_winloss_extract.run({dealId, newStageId, oldStageId, triggeredByUserId})` Action:
    - Identifiziert `targetStatus` aus Stage-Mapping (won_stage_id → "won", lost_stage_id → "lost"). Wenn weder noch: skip.
    - Time-Window-Check: SELECT auto_winloss_runs WHERE deal_id+target_status AND triggered_at>NOW()-INTERVAL '5min'. Bei Hit: INSERT audit_log "skipped:recent_run", No-Op.
    - INSERT auto_winloss_runs status='pending'. Bedrock-Call. UPDATE status='succeeded' + bedrock_output + bedrock_model + bedrock_completed_at.
    - INSERT automation_runs (V6.2-Pattern) + audit_log event_type='auto_winloss_triggered'.
    - Bei Bedrock-Error: UPDATE status='failed' + error_message.
- Verification: Vitest mit fake-timer + Mock-Bedrock + Mock-DB. 5 Tests: happy-won, happy-lost, time-window-skip, bedrock-error-status-failed, recursion-guard. Alle PASS.
- Dependencies: MT-1, MT-2

### MT-7: Read-API `/api/winloss/[deal_id]`
- Goal: Read-API-Endpoint fuer Intelligence Studio.
- Files: `cockpit/src/app/api/winloss/[deal_id]/route.ts` (NEU)
- Expected behavior: GET-Handler mit Bearer-Auth (verifiziert `Authorization: Bearer ${process.env.EXPORT_API_KEY}`, sonst 401). Query: SELECT latest auto_winloss_runs WHERE deal_id ORDER BY triggered_at DESC LIMIT 1. Returnt JSON `{deal_id, target_status, triggered_at, bedrock_output, model, completed_at, status}`. 404 bei kein Run.
- Verification: Vitest mit Mock-DB + 3 Tests: 200-mit-Run, 404-ohne-Run, 401-ohne-Auth. Live-Smoke mit `curl`.
- Dependencies: MT-1, MT-6

### MT-8: Manueller Re-Run-Logic in winloss.ts
- Goal: Manueller Berichts-Button im KI-Workspace nutzt Auto-Run-Output bei <24h, sonst Re-Run.
- Files: `cockpit/src/lib/ki-workspace/reports/winloss.ts` MODIFY (aus SLC-664)
- Expected behavior: `runReport({userId, dealId})` prueft latest auto_winloss_runs. Wenn `triggered_at > NOW() - INTERVAL '24 hours'` UND user-bypass-cache=false: returnt cached Output. Sonst: triggert manuellen Re-Run via `runWinLossExtract` (gleiche Funktion wie Auto-Trigger), schreibt neuen Eintrag in `auto_winloss_runs` mit `triggered_by_user_id` (NICHT NULL).
- Verification: Vitest 3 Tests: cache-hit-<24h, cache-miss->24h, bypass-cache-true.
- Dependencies: MT-6

### MT-9: Slice-Closing + Live-Smoke
- Goal: Build/Test/Lint-Gate + Live-Smoke (insb. 3-fach Stage-Toggling) + Records-Sync.
- Files: `slices/INDEX.md` (SLC-665 done), `planning/backlog.json` (BL-448 + BL-450 → done wenn alles durch — FEAT-664 + FEAT-666 nach SLC-665 done; FEAT-666 erst nach SLC-667 voll done weil Sidebar+Sparkles dort), `docs/STATE.md`, `docs/MIGRATIONS.md` (MIG-032 Date applied)
- Expected behavior: User deployt via Coolify (nach MIG-032-Apply). Live-Smoke: 2 Activity-Sheet-Smokes (meeting + note), 3-fach Stage-Toggling fuer Idempotenz-Test mit audit_log-Verifikation, Read-API-curl, Manueller Button. RPT-XXX Completion-Report.
- Verification: alle ACs PASS in Live-Browser + audit_log + DB-Direkt-Smoke.
- Dependencies: MT-1..MT-8

---

## Definition of Done

- 9 MTs verifiziert (AC-1..AC-15 erfuellt)
- MIG-032 applied auf Hetzner + System-Rule INSERT verifiziert
- Vitest +N Tests gruen (insb. Idempotenz-Time-Window mit fake-timer + Read-API-Auth)
- Build + Lint clean
- Live-Smoke Activity-Sheet 2-fach + Auto-Trigger 3-fach Stage-Toggling (audit_log nur 2 Eintraege) + Read-API curl + Manueller Button PASS
- Code committed + gepusht auf main + Coolify-Redeploy
- /qa als naechster Schritt
