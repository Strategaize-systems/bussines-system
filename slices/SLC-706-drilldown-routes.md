# SLC-706 — Drilldown-Routes (/team/[user_id]/... Read-Only-Sicht + view_as-Audit)

## Metadata
- **Slice ID:** SLC-706
- **Version:** V7
- **Feature:** FEAT-503 (Teamlead-Rolle mit Teamsicht)
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-12
- **Estimated Effort:** ~4-5h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped
- **Architecture:** DEC-188 (URL-Path), DEC-189 (Mutate-Lockdown), DEC-195 (audit_log.view_as_target_user_id)
- **Reihenfolge-Pflicht:** **nach SLC-704** — ReadOnlyContext-Helper aus SLC-702 wird hier erstmals konsumiert, Mutate-Actions aus SLC-704 mit `assertNotReadOnlyContext()`-Guard sind Voraussetzung. **nach SLC-705** — Cockpit-Oeffnen-Link aus /team zeigt auf SLC-706-Routes.

## Goal

Teamlead/Admin oeffnet pro Mitglied-Row in /team einen Read-Only-Drilldown auf `/team/[user_id]/mein-tag`, `/pipeline`, `/aktivitaeten`. Pages rendern Member-Sicht mit owner_user_id-Filter = target_user_id, ReadOnlyContext aktiv, alle Mutate-Buttons disabled, Banner "Du siehst Mitglied X (read-only) — zurueck zu deinem Cockpit". Jeder Drilldown schreibt `view_as`-Audit-Eintrag mit viewer_user_id + target_user_id + path. Mutate-Lockdown verifiziert dass Server Actions im Read-Only-Mode 403 antworten (Defense-in-Depth gegen UI-Bugs).

## Scope

**In Scope:**
- `cockpit/src/app/(authenticated)/team/[user_id]/layout.tsx` (NEU) — Drilldown-Layout, `assertRole(['admin','teamlead'])`, `can_see_owner($user_id)`-Check, ReadOnlyContextProvider-Wrap, Banner-Render, view_as-Audit-Insert
- `cockpit/src/app/(authenticated)/team/[user_id]/mein-tag/page.tsx` (NEU) — Read-Only-Variant von /mein-tag
- `cockpit/src/app/(authenticated)/team/[user_id]/pipeline/page.tsx` (NEU) — Read-Only-Variant von /pipeline
- `cockpit/src/app/(authenticated)/team/[user_id]/aktivitaeten/page.tsx` (NEU) — Read-Only-Variant von /aktivitaeten
- `cockpit/src/components/drilldown/drilldown-banner.tsx` (NEU) — Banner-Component mit Viewer + Target + Back-Link
- `cockpit/src/lib/team/view-as-audit.ts` (NEU) — Helper `logViewAs(viewer, target, path)`
- `cockpit/__tests__/drilldown/read-only-context.test.ts` (NEU) — Vitest dass ReadOnlyContext propagiert wird + Mutate blockiert
- `cockpit/__tests__/drilldown/view-as-audit.test.ts` (NEU) — Vitest fuer Audit-Insert
- `cockpit/__tests__/playwright/drilldown-smoke.spec.ts` (NEU) — E2E: Teamlead → Drilldown → Mutate-Attempt → 403

**Out of Scope:**
- Modify-Sicht im Drilldown ("Teamlead darf Member-Daten editieren") → V7.5+
- "Switch User"-Funktion (Session-Switching) → niemals (DEC-188 entschieden gegen)
- Bulk-Reassign UI → SLC-707
- Drilldown auf Calls/Meetings/Proposals/Mails → V7.5+ (V7 deckt nur mein-tag/pipeline/aktivitaeten ab gem. FEAT-503)

## Acceptance Criteria

**AC1 (Layout-Guard):** `/team/[user_id]/layout.tsx` ruft `assertRole(['admin','teamlead'])`. Wenn Teamlead `target_user_id` nicht im eigenen Team: `notFound()`. Verifikation via `can_see_owner($target_user_id)`-SQL-Helper-Function-Call. Admin sieht alle Teams (can_see_owner is_admin-Branch).

**AC2 (ReadOnlyContextProvider aktiv):** Layout wrappt Children mit `<ReadOnlyContextProvider value={{viewerUserId, targetUserId}}>`. Server Actions im Subtree, die `assertNotReadOnlyContext()` aufrufen, throws Error('Read-Only-Modus blockiert'). Vitest mit Mock-Server-Action verifiziert.

**AC3 (Drilldown-Banner):** Banner rendert oben mit Text "Du siehst [target_display_name] (read-only)" + Back-Link "Zurueck zu deinem Cockpit" auf `/mein-tag`. Sticky-Top-Position. Brand-Token-Farben.

**AC4 (view_as-Audit):** Jeder Drilldown-Page-Load schreibt `INSERT INTO audit_log (event, user_id, view_as_target_user_id, payload) VALUES ('view_as', viewer_id, target_id, '{"path": ...}')`. Cache-Window: 1 Minute (mehrere Page-Loads im selben Drilldown schreiben nur 1x). Falls Cache-Hit nicht trivial: 1 Eintrag pro Page-Load akzeptiert.

**AC5 (mein-tag Read-Only):** `/team/[user_id]/mein-tag` rendert Mein-Tag-Page mit `owner_user_id = target_user_id` als Query-Filter. Alle Quick-Action-Buttons (Activity-Anlegen, Deal-Updaten) sind disabled mit Tooltip "Read-Only — du siehst eine andere Person". KI-Workspace-Bericht-Buttons funktionieren (KI-Reads sind ok), Bedrock-Context nutzt `owner = target_user_id`.

**AC6 (pipeline Read-Only):** `/team/[user_id]/pipeline` rendert Pipeline mit Target-Owner-Filter. Drag-Drop disabled. Quick-Action-Buttons disabled. Stage-Wechsel nicht moeglich. Filter-/Such-/Voice-Funktionen funktionieren (Read).

**AC7 (aktivitaeten Read-Only):** `/team/[user_id]/aktivitaeten` rendert Aktivitaeten-Liste mit Target-Owner-Filter. Create-/Edit-/Done-Mark-Buttons disabled.

**AC8 (Mutate-Lockdown Server-Side):** Selbst wenn Teamlead UI-Block umgeht (z.B. Direct-Server-Action-Call), throws Server Action `assertNotReadOnlyContext()`-Error → Toast "Read-Only-Modus, Aktion blockiert". Playwright-Smoke probiert Direct-Call und verifiziert 403/Error.

**AC9 (Cross-Team-Block):** Teamlead in Team-A versucht Direkt-URL `/team/[user_in_team_B]/mein-tag` → `notFound()` (404). Verifikation via Playwright + Vitest.

**AC10 (TSC + Vitest + Build + Lint + Live-Smoke):** Alle Outputs clean. Live-Smoke nach Coolify-Redeploy: Teamlead loggt ein, geht zu /team, klickt Cockpit-Oeffnen bei Member-X, sieht Mein-Tag von Member-X, versucht Activity zu erstellen → Toast blockiert. audit_log enthaelt view_as-Eintrag mit korrektem viewer + target.

## Reuse

- ReadOnlyContextProvider aus SLC-702
- assertNotReadOnlyContext-Helper aus SLC-702 (konsumiert in SLC-704)
- Bestehende /mein-tag, /pipeline, /aktivitaeten Pages — als Vorlage, NICHT wiederverwenden (Read-Only-Variants werden eigene Files)
- can_see_owner SQL-Helper aus SLC-701
- audit_log-Tabelle + view_as_target_user_id-Spalte aus MIG-033
- shadcn `<Banner>`/Custom-Banner-Pattern

## Risks

- **R1 — Read-Only-Bypass via Direct-Server-Action-Call:** Wenn `assertNotReadOnlyContext()` nicht ueberall ausgerufen wird, kann Teamlead via Browser-DevTools Mutate-Action direkt callen. **Mitigation:** SLC-704 hat First-Line-Call in JEDER Mutate-Action verbaut. AC8 verifiziert via Playwright Direct-Call.
- **R2 — ReadOnlyContext-Propagation in nested Server-Components:** Falls Context nicht propagiert (Next.js App-Router-Bug), wuerden Mutate-Actions im Drilldown nicht blockiert. **Mitigation:** Vitest mit Mock-Konsumenten + Playwright-Smoke. Falls bug: Workaround via Request-Header `X-Read-Only-Mode` + Middleware-Check.
- **R3 — view_as-Audit-Spam:** Bei jedem Page-Load 1 Eintrag = bei Tab-Wechsel viele Eintraege. **Mitigation:** 1-Minute-Cache pro (viewer, target, path)-Tupel. Akzeptabel falls nicht implementiert (Audit-Volume vernachlaessigbar bei <20 Drilldowns/Tag).
- **R4 — Disabled-Button-Styling:** Wenn Buttons nicht klar als disabled erkennbar, kann User klick-frustriert sein. **Mitigation:** Tooltip "Read-Only" pro disabled Button. Visual Diff via Playwright.
- **R5 — Cross-Team-Direkt-URL:** Wenn `can_see_owner`-Check nicht greift (z.B. wegen RLS-Helper-Bug), kann Teamlead Cross-Team-Member sehen. **Mitigation:** AC9 explizit Vitest + Playwright. RLS-Helper-Funktion aus SLC-701 muss korrekt funktionieren (verifiziert in SLC-701 AC5).

## Verification Strategy

- **Pre:** Verifizieren dass SLC-705 Cockpit-Oeffnen-Link auf `/team/[user_id]/mein-tag` zeigt. Verifizieren dass SLC-704 Mutate-Actions `assertNotReadOnlyContext()` aufrufen.
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** TSC + Build + Lint + Vitest + Playwright + Live-Smoke 2 Drilldown-Cases (happy + cross-team-block)
- **QA-Pflicht:** /qa nach Slice — verifiziert AC1..AC10, Direct-Server-Action-Call-Attempt, audit_log-Trail-Smoke

---

## Micro-Tasks

### MT-1: Drilldown-Layout + Guard + Audit-Insert
- Goal: Layout fuer `/team/[user_id]/*`.
- Files: `cockpit/src/app/(authenticated)/team/[user_id]/layout.tsx` (NEU), `cockpit/src/lib/team/view-as-audit.ts` (NEU)
- Expected behavior: assertRole + can_see_owner-Check + Audit-Insert + ReadOnlyContextProvider-Wrap. Banner als Child-Render.
- Verification: Vitest fuer Guard-Path + can_see_owner-Mock.
- Dependencies: SLC-705 abgeschlossen

### MT-2: Drilldown-Banner-Component
- Goal: Banner-Component.
- Files: `cockpit/src/components/drilldown/drilldown-banner.tsx` (NEU)
- Expected behavior: Sticky-Top, Brand-Token-Farben (auffallig genug, ohne Style-Guide-V2-Bruch), Back-Link auf `/mein-tag`.
- Verification: Vitest Render-Snapshot. Visual-Eye-Test im Dev-Mode.
- Dependencies: MT-1

### MT-3: /team/[user_id]/mein-tag Page
- Goal: Read-Only-Variant.
- Files: `cockpit/src/app/(authenticated)/team/[user_id]/mein-tag/page.tsx` (NEU)
- Expected behavior: Lädt Mein-Tag-Daten mit `owner_user_id = $target_user_id`. Re-rendert bestehende Mein-Tag-Components in Read-Only-Mode (Props `readOnly={true}` falls Pattern verfuegbar, sonst Disabled-Buttons-Wrapper).
- Verification: Manueller Dev-Render mit Teamlead-Session + URL.
- Dependencies: MT-1

### MT-4: /team/[user_id]/pipeline Page
- Goal: Read-Only-Pipeline.
- Files: `cockpit/src/app/(authenticated)/team/[user_id]/pipeline/page.tsx` (NEU)
- Expected behavior: Pipeline-Rendering mit Target-Owner-Filter + Drag-Drop disabled.
- Verification: Manueller Dev-Render.
- Dependencies: MT-1

### MT-5: /team/[user_id]/aktivitaeten Page
- Goal: Read-Only-Aktivitaeten.
- Files: `cockpit/src/app/(authenticated)/team/[user_id]/aktivitaeten/page.tsx` (NEU)
- Expected behavior: Aktivitaeten-Liste mit Target-Owner-Filter + Create/Edit/Done-Buttons disabled.
- Verification: Manueller Dev-Render.
- Dependencies: MT-1

### MT-6: ReadOnlyContext Mutate-Lockdown-Tests
- Goal: Verifizieren dass Mutate-Actions im Drilldown 403/Error werfen.
- Files: `cockpit/__tests__/drilldown/read-only-context.test.ts` (NEU)
- Expected behavior: 3+ Tests mit Mock-Server-Actions (Create-Deal, Update-Activity, Delete-Lead), die mit aktivem ReadOnlyContext aufgerufen werden → `assertNotReadOnlyContext()` throws → Tests verifizieren Error-Message.
- Verification: 3/3 PASS.
- Dependencies: MT-1

### MT-7: view_as-Audit-Tests + Cross-Team-Block-Test
- Goal: Audit-Trail + Cross-Team-Block.
- Files: `cockpit/__tests__/drilldown/view-as-audit.test.ts` (NEU), `cockpit/__tests__/drilldown/cross-team-block.test.ts` (NEU)
- Expected behavior: 
  - view_as: 2 Tests fuer Audit-Insert (admin + teamlead) gegen Coolify-DB
  - cross-team-block: 1 Test Teamlead-A versucht Team-B-User → notFound()
- Verification: 3/3 PASS.
- Dependencies: MT-1

### MT-8: Playwright E2E Smoke (4 Cases)
- Goal: End-to-End-Smoke.
- Files: `cockpit/__tests__/playwright/drilldown-smoke.spec.ts` (NEU)
- Expected behavior: 4 Cases:
  - Happy: Teamlead → /team → Cockpit-Oeffnen → /team/[user_id]/mein-tag rendert mit Banner
  - Mutate-Block: im Drilldown Quick-Action-Button-Click → disabled (kein Mutate)
  - Direct-Server-Action-Call: via Playwright `request.post(...)` → 403
  - Cross-Team-Block: Direkt-URL auf andere Team-User → 404
- Verification: 4/4 PASS.
- Dependencies: MT-1..MT-7

### MT-9: TSC + Build + Lint + Live-Smoke
- Goal: Slice-Closing.
- Files: keine neuen
- Expected behavior: Alle Outputs clean. User-Coolify-Redeploy. Live-Smoke gegen Hetzner mit 2 Test-Drilldowns + Audit-Verify.
- Verification: Slice-RPT dokumentiert.
- Dependencies: MT-1..MT-8

---

## Open Technical Questions Answered

- **(Architecture Open Q2 Drilldown-Mode):** Server-side via `params.user_id` + ReadOnlyContextProvider in Layout (DEC-188 + AC2).
- **(Architecture Open Q3 Mutate-Lockdown):** Zentraler `assertNotReadOnlyContext()`-Helper aus SLC-702, First-Line-Call in jeder Mutate-Action aus SLC-704 (DEC-189).

## QA-Fokus

- Layout-Guard verhindert Cross-Team-Drilldown
- ReadOnlyContext propagiert + Mutate blockiert (Vitest + Playwright Direct-Call)
- 3 Read-Only-Pages rendern mit Target-Owner-Filter + disabled Mutate-Buttons
- view_as-Audit-Insert nachvollziehbar
- 4 Playwright-Cases PASS
- TSC + Build + Lint clean

## Recommended Next Step nach SLC-706

**/qa SLC-706** — verifiziert AC1..AC10. Bei PASS: User-Coolify-Redeploy. Bei Live-PASS: weiter mit **/frontend SLC-707** (Polish + Bulk-Reassign + Mobile-Hamburger).
