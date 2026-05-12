# SLC-704 — Owner-Wiring (~80 Server Actions + Cron-Owner-Context + Workflow-Engine-Owner-Pass)

## Metadata
- **Slice ID:** SLC-704
- **Version:** V7
- **Feature:** FEAT-502 (Multi-User-Foundation)
- **Status:** planned
- **Priority:** High (verbindet Datenmodell aus SLC-701 mit Anwendungs-Code)
- **Created:** 2026-05-12
- **Estimated Effort:** ~6-8h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped
- **Architecture:** DEC-182, DEC-185, DEC-186, DEC-189, plus OTQ 5, OTQ 7
- **Reihenfolge-Pflicht:** **nach SLC-701** (owner_user_id-Spalten existieren) **und SLC-702** (`assertNotReadOnlyContext` Helper vorhanden). Vor SLC-705/706 sinnvoll, weil deren Read-Pfade sauberen Owner-Stand vorraussetzen.

## Goal

Alle bestehenden ~80 Server Actions + 5 Cron-Jobs + Workflow-Engine owner-aware machen. INSERT-Actions setzen `owner_user_id = auth.uid()` als Default. UPDATE/DELETE verlassen sich auf RLS (kein expliziter Code-Filter). Mutate-Actions im Read-Only-Mode (Drilldown-Vorbereitung fuer SLC-706) rufen `assertNotReadOnlyContext()` als erste Zeile. Cron-Jobs erben Owner-Context vom Source-Record (z.B. Briefing-Activity bekommt `owner_user_id = meeting.owner_user_id`). Nach SLC-704 ist der Owner-Lifecycle ueber alle Schreib-Pfade konsistent.

## Scope

**In Scope:**
- `docs/AUDIT_SERVER_ACTIONS_V7.md` (NEU) — Audit-Spreadsheet aller ~80 Server Actions: Pfad, Insert/Update/Delete, Owner-aware-Status pre/post, Notes
- ~80 Server Actions in `cockpit/src/lib/<domain>/actions.ts` (MOD) — INSERT-Actions setzen `owner_user_id`, alle Mutate-Actions rufen `assertNotReadOnlyContext()` zuerst
- 5 Cron-Job-Endpoints in `cockpit/src/app/api/cron/` (MOD):
  - `/api/cron/followup-runner` — erzeugte Activities erben Owner vom Source-Deal
  - `/api/cron/briefing-runner` — erzeugte Briefing-Activities erben Owner vom Meeting
  - `/api/cron/auto-winloss-runner` — Deal-Update behaelt Owner (kein neuer Insert)
  - `/api/cron/signal-extraction-runner` — erzeugte AI-Signals erben Owner vom Meeting/Mail
  - `/api/cron/automation-runner` — Workflow-erzeugte Records erben Owner vom Trigger-Source-Record
- `cockpit/src/lib/automation/dispatcher.ts` (MOD) — Workflow-Engine bekommt `triggerSource.owner_user_id` als Default-Owner fuer erzeugte Records
- `cockpit/__tests__/owner-wiring/insert-defaults.test.ts` (NEU) — Vitest fuer Insert-Defaults pro 8 Kerntabellen
- `cockpit/__tests__/owner-wiring/read-only-blocks.test.ts` (NEU) — Vitest dass `assertNotReadOnlyContext()` Mutate-Actions im Read-Only-Mode blockt
- `cockpit/__tests__/owner-wiring/cron-owner-inheritance.test.ts` (NEU) — Vitest dass Cron-erzeugte Records korrekten Owner haben

**Out of Scope:**
- Bulk-Reassign → SLC-707
- Drilldown-Routes selbst → SLC-706 (SLC-704 implementiert nur den Guard, der dort konsumiert wird)
- /team Aggregat-Queries → SLC-705
- Owner-Filter in Listing-UI (RLS uebernimmt das transparent)

## Acceptance Criteria

**AC1 (Audit-Spreadsheet):** `docs/AUDIT_SERVER_ACTIONS_V7.md` enthaelt eine Tabelle mit allen Server Actions des Repos:
- Pfad (z.B. `cockpit/src/lib/deals/actions.ts:createDeal`)
- Domain (deals, contacts, companies, ...)
- Operation (Insert/Update/Delete)
- Pre-Status (V6.6: Owner-aware? meist NEIN)
- Post-Status (V7: Owner-aware? JA)
- Notes (z.B. "Insert setzt owner_user_id = auth.uid()", "Mutate ruft assertNotReadOnlyContext()")

Tabelle wird als MT-1 erstellt durch systematisches `grep` ueber alle `actions.ts`-Files. Erwartung: 70-90 Actions total ueber ~12 Domains.

**AC2 (Insert-Owner-Default):** Alle Insert-Server-Actions auf 8 Kerntabellen setzen `owner_user_id` explizit. Defaultwert = `auth.uid()` aus `await getProfile()`-Helper. Wenn Caller explizit `owner_user_id` uebergibt (z.B. fuer Workflow-Engine-Insert): wird genommen. Vitest pro 8 Tabellen verifiziert Owner-Set.

**AC3 (Mutate-Read-Only-Lock):** Jede Mutate-Action (Insert/Update/Delete) ruft als FIRST LINE `await assertNotReadOnlyContext()`. Bei aktivem Read-Only-Context (gesetzt von SLC-706 Drilldown-Pages) throws Error('Action im Read-Only-Modus blockiert'). Vitest mit mocked ReadOnlyContext deckt 3 Mutate-Actions × 8 Tabellen = 24 Tests.

**AC4 (Cron-Owner-Inheritance):** 5 Cron-Endpoints erben Owner vom Source-Record:
- followup-runner: erzeugte Activity hat `owner_user_id = deal.owner_user_id`
- briefing-runner: erzeugte Activity hat `owner_user_id = meeting.owner_user_id`
- auto-winloss-runner: UPDATE deal SET status, NICHT neuer Insert (behaelt Owner trivial)
- signal-extraction-runner: erzeugte AI-Signal-Row hat `owner_user_id = source.owner_user_id` (Meeting oder Mail)
- automation-runner: Workflow-Action-Inserts erben Owner vom Trigger-Source

Vitest pro Cron-Endpoint mit Mock-Source-Record-Owner verifiziert Inheritance.

**AC5 (Workflow-Engine-Owner-Pass, OTQ 5):** `lib/automation/dispatcher.ts` propagiert `triggerSource.owner_user_id` an alle Workflow-Action-Insert-Calls. Default-Fallback `NULL` wenn Source kein Owner (System-Record, sehr selten). Vitest mit Mock-Workflow-Rule + Mock-Trigger-Source verifiziert Pfad.

**AC6 (Meeting-Owner = Host-User, DEC-186):** `createMeeting`-Action setzt `owner_user_id = auth.uid()` (= Host = Click-to-Call-Ausloeser bei Calls, = Create-Action-Caller bei Meetings). Bei Teilnehmer-Cross-Visibility: Owner bleibt Host, RLS kann durch `can_see_owner()` auch Teilnehmer-Sicht erlauben falls Spec das fordert (NICHT V7-Scope — Teilnehmer = Owner-Match, andere = team-scope via RLS).

**AC7 (System-Records NULL-Owner):** Wenn Cron-Job ohne Source-Owner Insert macht (z.B. Bedrock-Cost-Audit-Eintrag), bleibt `owner_user_id = NULL`. RLS lässt nur Admin diese sehen (per MIG-035-Policy-Definition). Dokumentiert in COMPLIANCE.md-Section "System-Records".

**AC8 (Vitest-Suite Owner-Wiring):** Mindestens 50 neue Tests:
- 8 Insert-Default-Tests (1 pro Kerntabelle)
- 24 Mutate-Read-Only-Lock-Tests (3 Ops × 8 Tabellen)
- 5 Cron-Inheritance-Tests
- 5 Workflow-Engine-Tests
- ~10 Edge-Case-Tests (NULL-Source, Cross-Team-Insert, etc.)

Alle gegen Coolify-DB via node:20 (memory `reference_coolify_test_setup`).

**AC9 (TSC + Build + Lint + RLS-Matrix):** TSC + Build + Lint clean. 96 RLS-Matrix-Tests aus SLC-701 bleiben gruen (nur jetzt mit echten Owner-Set-by-Code-Records statt nur Backfill). Bestehende Tests V6.6 bleiben gruen.

**AC10 (Live-Smoke nach Coolify-Redeploy):** Admin loggt ein, erstellt Deal → Browser-Inspect zeigt `owner_user_id = admin-UUID`. Teamlead in Test-Team loggt ein, erstellt Lead → `owner_user_id = teamlead-UUID`. Member-Test-User in Test-Team loggt ein, erstellt Activity → `owner_user_id = member-UUID`. SQL-Smoke gegen Hetzner: `SELECT owner_user_id FROM activities ORDER BY created_at DESC LIMIT 3` zeigt 3 verschiedene Owner.

## Reuse

- `getProfile`, `assertRole`, `assertNotReadOnlyContext` aus SLC-702
- RLS-Helper-Functions aus SLC-701 (can_see_owner uebernimmt Read-Filter transparent)
- Bestehende audit_log-Insert-Pattern (V3)
- Bestehende Cron-Pattern (V4.1 followup-runner, V6.2 automation-runner, V6.6 auto-winloss-runner als Templates)
- Coolify-Test-Setup (memory `reference_coolify_test_setup`)

## Risks

- **R1 — Vollstaendigkeit der Audit-Liste:** Wenn eine Server Action vergessen wird, sind Inserts in der Tabelle ohne Owner = NULL = nicht sichtbar fuer Member. **Mitigation:** Audit-Spreadsheet als MT-1 mit systematischem `grep -r "use server"` ueber alle action.ts-Files. Plus Vitest auf 8 Tabellen × Insert-Smoke deckt Lücken auf.
- **R2 — Read-Only-Context-Bypass:** Wenn `assertNotReadOnlyContext()` nicht ueberall ausgerufen wird, kann Drilldown-Bug zu Mutate-Leck fuehren. **Mitigation:** AC3 fordert First-Line-Call in JEDER Mutate-Action. Lint-Rule oder Code-Review-Checklist als Defense-in-Depth (NICHT in SLC-704 implementiert, nur dokumentiert als Empfehlung).
- **R3 — Workflow-Engine-Trigger-Source-Owner-Drift (OTQ 5):** Wenn Trigger-Source-Record bereits NULL-Owner hat (System-Record), erbt Workflow-Action auch NULL. **Mitigation:** Per DEC-185 ist Workflow team-shared, NULL ist OK fuer System-Records. AC5 deckt NULL-Fallback explizit ab.
- **R4 — Cron-Job-Backwards-Compat:** Wenn alter Cron-Code mit Service-Role weiterlaeuft (kein Owner-Pass), entstehen Records ohne Owner. **Mitigation:** MT-4 modifiziert alle 5 Cron-Endpoints in einem Atomic-Commit. Coolify-Cron-Konfig aendert sich nicht (Endpoint-URL bleibt).
- **R5 — Performance-Regression durch zusaetzliche getProfile-Calls:** Wenn jede Mutate-Action getProfile aufruft, kann das langsam werden bei Bulk-Imports. **Mitigation:** React `cache()` aus SLC-702 macht per-Request-Cache, Bulk-Pfade rufen 1x. Falls hot-path: explizit per-Caller `userId` durchreichen statt getProfile.

## Verification Strategy

- **Pre:** Audit-Spreadsheet erstellen (MT-1) BEFORE Code-Aenderungen, damit Scope-Drift kontrolliert ist.
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** TSC + Build + Lint + Vitest (~50 neue + alle bestehenden) + RLS-Matrix-Re-Run + Live-Smoke 3 Rollen
- **QA-Pflicht:** /qa nach Slice — verifiziert AC1..AC10, Cross-Owner-Leak-Smoke wiederholt, Cron-Trigger-Smoke gegen Hetzner-Cron-Logs

---

## Micro-Tasks

### MT-1: Audit-Spreadsheet aller Server Actions
- Goal: Inventar aller ~80 Actions als Vor-Implementierungs-Schritt.
- Files: `docs/AUDIT_SERVER_ACTIONS_V7.md` (NEU)
- Expected behavior: Systematisches `grep -rn "use server"` ueber `cockpit/src/lib/**` + `cockpit/src/app/**/actions.ts`. Tabelle mit ~70-90 Eintraegen. Pro Eintrag: Pfad, Funktionsname, Operation (Insert/Update/Delete), Domain, Owner-aware-Status pre+post, Notes. Sortiert nach Domain.
- Verification: Tabelle vollstaendig (keine `actions.ts`-File ohne Eintrag).
- Dependencies: none

### MT-2: Tranche 1 — Core Mutate-Actions (deals/companies/contacts/leads)
- Goal: Insert-Defaults + Read-Only-Lock fuer Tranche 1.
- Files: `cockpit/src/lib/deals/actions.ts` (MOD), `cockpit/src/lib/companies/actions.ts` (MOD), `cockpit/src/lib/contacts/actions.ts` (MOD), `cockpit/src/lib/leads/actions.ts` (MOD), Tests pro Datei
- Expected behavior: Pro Insert-Action: `owner_user_id = await getProfile()).user_id` als Default. Pro Mutate: `await assertNotReadOnlyContext()` als first line. Insert-Default-Tests + Read-Only-Block-Tests gruen.
- Verification: Vitest Tranche-1 PASS.
- Dependencies: MT-1

### MT-3: Tranche 2 — Activities + Meetings + Calls
- Goal: analog MT-2 fuer Tranche 2.
- Files: `cockpit/src/lib/activities/actions.ts` (MOD), `cockpit/src/lib/meetings/actions.ts` (MOD), `cockpit/src/lib/calls/actions.ts` (MOD), Tests
- Expected behavior: Meeting+Call-Owner = `auth.uid()` per DEC-186 (Host-User). Vitest gruen.
- Verification: Vitest Tranche-2 PASS.
- Dependencies: MT-1

### MT-4: Tranche 3 — Proposals + Email-Messages
- Goal: analog MT-2 fuer Tranche 3.
- Files: `cockpit/src/lib/proposals/actions.ts` (MOD), `cockpit/src/lib/email-messages/actions.ts` (MOD) oder Send-Pfade, Tests
- Expected behavior: Proposal-Owner = Creator (= getProfile()). Email-Send-Owner = Sender (= getProfile()). Versionierung behaelt Owner-pinned (V5.5-Pattern).
- Verification: Vitest Tranche-3 PASS.
- Dependencies: MT-1

### MT-5: Cron-Owner-Inheritance (OTQ 7)
- Goal: 5 Cron-Endpoints erben Owner vom Source.
- Files: `cockpit/src/app/api/cron/followup-runner/route.ts` (MOD), `cockpit/src/app/api/cron/briefing-runner/route.ts` (MOD), `cockpit/src/app/api/cron/auto-winloss-runner/route.ts` (MOD oder no-op), `cockpit/src/app/api/cron/signal-extraction-runner/route.ts` (MOD), `cockpit/src/app/api/cron/automation-runner/route.ts` (MOD), Tests
- Expected behavior: Pro Cron-Insert: `owner_user_id = sourceRecord.owner_user_id ?? null`. Cron-Inheritance-Tests pro Endpoint mit Mock-Source-Record gruen.
- Verification: Vitest Cron-Inheritance PASS. Live-Cron-Trigger gegen Hetzner zeigt korrekten Owner-Set.
- Dependencies: MT-1

### MT-6: Workflow-Engine-Owner-Pass (OTQ 5)
- Goal: dispatcher.ts propagiert Source-Owner.
- Files: `cockpit/src/lib/automation/dispatcher.ts` (MOD), `cockpit/__tests__/automation/owner-pass.test.ts` (NEU oder MOD)
- Expected behavior: Beim Rule-Match wird `triggerSource.owner_user_id` an alle Action-Insert-Calls gepasst. Default NULL bei System-Source.
- Verification: Vitest Owner-Pass-Tests PASS.
- Dependencies: MT-1, MT-2, MT-3, MT-4

### MT-7: RLS-Matrix Re-Run + Cross-Owner-Leak-Re-Verifikation
- Goal: Verifizieren dass nach Owner-Wiring keine Regression in RLS-Matrix.
- Files: keine neuen (nutzt SLC-701 MT-6)
- Expected behavior: 96 RLS-Matrix-Tests laufen erneut, alle PASS. Plus Live-Smoke gegen Coolify mit Admin/Teamlead/Member-Sessions, Cross-URL-Manipulation-Test (Member-Direkt-URL auf anderen Member-Deal liefert 404).
- Verification: 96/96 PASS + 3 Live-Smoke-Cases gruen.
- Dependencies: MT-2..MT-6

### MT-8: COMPLIANCE.md Section + Build/Test/Lint
- Goal: Slice-Closing.
- Files: `docs/COMPLIANCE.md` (MOD, neue Section "V7 Owner-Wiring + System-Records")
- Expected behavior: Doku-Section dokumentiert Owner-Lifecycle, Cron-Inheritance, Workflow-Pass, System-Records-Definition. TSC + Build + Lint + Test alle clean.
- Verification: Alle Tool-Outputs clean. COMPLIANCE.md-Section vorhanden.
- Dependencies: MT-2..MT-7

---

## Open Technical Questions Answered

- **OTQ 5 (Workflow-Engine-Owner-Pass):** AC5 + MT-6. `triggerSource.owner_user_id` durchgereicht, Fallback NULL bei System-Source.
- **OTQ 7 (Cron-Owner-Context):** AC4 + MT-5. 5 Cron-Endpoints erben Owner vom Source-Record.

## QA-Fokus

- 50+ neue Vitest-Tests gruen
- 96 RLS-Matrix-Tests bleiben gruen (Regression-Check)
- 3 Rollen × Create-Smoke zeigt korrekten Owner
- Cron-Trigger gegen Hetzner produzieren korrekt-owned Records
- AUDIT-Spreadsheet vollstaendig (kein Action-Eintrag fehlt)
- Live-Smoke 3 Browser-Sessions Cross-URL-Test 404

## Recommended Next Step nach SLC-704

**/qa SLC-704** — verifiziert AC1..AC10. Bei PASS: User-Coolify-Redeploy. Bei Live-PASS: weiter mit **/frontend SLC-705** (Team-Aggregat-Cockpit).
