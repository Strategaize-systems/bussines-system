# SLC-703 — Verwaltungs-UI (/settings/team + Invite + Rolle-aendern + Profile-Delete)

## Metadata
- **Slice ID:** SLC-703
- **Version:** V7
- **Feature:** FEAT-502 (Multi-User-Foundation)
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-12
- **Estimated Effort:** ~4-5h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped
- **Architecture:** DEC-193, DEC-194, plus FEAT-502 Verwaltungs-UI-Spec
- **Reihenfolge-Pflicht:** **nach SLC-702** — nutzt `assertRole`, `getProfile`, `SIDEBAR_CONFIG`-Eintrag fuer /settings/team. Vor SLC-704 NICHT zwingend, aber sinnvoll fuer Bulk-Reassign-Preview-Tests.

## Goal

Admin/Teamlead bekommt `/settings/team` als Verwaltungs-UI, um Mitglieder einzuladen, Rollen zu aendern und gefeuerte Profile zu loeschen (mit Hard-Lock bei offenen Owner-Records). Nach SLC-703 ist die Multi-User-Verwaltung operational: Admin kann via Invite einen neuen Teamlead/Member anlegen, der Invited-User klickt E-Mail-Link, setzt Password, ist eingeloggt und sieht seine rollen-korrekte Sidebar (dank SLC-702).

## Scope

**In Scope:**
- `cockpit/src/app/(authenticated)/settings/team/page.tsx` (NEU) — Server-Component, `assertRole(['admin','teamlead'])`, lädt Team-Mitglieder + Open-Deal/Activity-Counts via SQL-Query
- `cockpit/src/app/(authenticated)/settings/team/team-members-table.tsx` (NEU) — Client-Component, Tabelle mit display_name + role-Dropdown + Mail + Counts + Drilldown-Link (SLC-706-Vorbereitung) + Delete-Button
- `cockpit/src/app/(authenticated)/settings/team/invite-dialog.tsx` (NEU) — shadcn `<Dialog>` mit Form (E-Mail + Initial-Rolle Default `member` + Team Default = eigenes Team, Admin darf andere Teams)
- `cockpit/src/lib/team/actions.ts` (NEU) — 3 Server Actions: `inviteMember`, `changeRole`, `deleteProfile`
- `cockpit/src/lib/auth/invite.ts` (NEU) — Wrapper um `supabase.auth.admin.inviteUserByEmail()` + Profile-Insert + audit_log
- `cockpit/__tests__/team/actions.test.ts` (NEU) — Vitest fuer 3 Server Actions
- `cockpit/__tests__/playwright/team-management.spec.ts` (NEU) — E2E Smoke: Invite + Role-Change + Delete-Hard-Lock
- `docs/COMPLIANCE.md` — Section "Multi-User Profile-Lifecycle" mit Invite/Role-Change/Delete-Audit-Trail

**Out of Scope:**
- Bulk-Reassign-Werkzeug → SLC-707
- /team Aggregat-Cockpit → SLC-705
- Drilldown von `/settings/team` zum Member-Cockpit → SLC-706 (Link existiert als Stub)
- /settings/profile Page (eigenes Profil bearbeiten) → bleibt V6.6-Bestand, kein Refactor in SLC-703

## Acceptance Criteria

**AC1 (/settings/team Server-Component):** Page rendert nur fuer admin/teamlead (Member sieht Redirect zu /mein-tag dank SLC-702 middleware). Header `Team-Verwaltung`, KPI-Cards `<Anzahl Mitglieder> Mitglieder | <Open-Deals-Sum> Offene Deals | <Open-Activities-Sum> Offene Aufgaben`. Tabelle mit Spalten: Avatar, Display-Name, Role (Dropdown fuer Admin), Mail, Open-Deals, Open-Activities, Last-Login, Actions (Cockpit-anzeigen-Link = Stub, Delete-Button).

**AC2 (Invite-Flow):** `inviteMember({email, role, team_id})` Server Action: assertRole(['admin','teamlead']), validiert Mail-Format, callt `supabase.auth.admin.inviteUserByEmail(email)`, INSERT INTO profiles (id, role, team_id) per Returned-User-ID, audit_log-Eintrag `invite_sent`. Teamlead darf nur eigenes Team setzen (assertRole prueft `team_id == get_my_team_id()`).

**AC3 (Invite-E-Mail-Flow):** Invited-User bekommt Supabase-GoTrue-Invite-Mail (bestehender Mailer aus V4.1 Auth-Setup), klickt Link, Set-Password-Page, dann Redirect zu `/mein-tag`. Sidebar passt sich an Rolle an. Browser-Smoke verifiziert end-to-end (oder dokumentiert in Live-Smoke-Phase).

**AC4 (Rolle-aendern):** `changeRole({user_id, new_role})` Server Action: assertRole(['admin']), UPDATE profiles SET role = $new_role WHERE id = $user_id, audit_log `role_changed` mit old+new. Teamlead darf NICHT changeRole aufrufen (assertRole wirft Redirect). Vitest deckt admin+teamlead-Path ab.

**AC5 (Profile-Delete Hard-Lock):** `deleteProfile({user_id})` Server Action: assertRole(['admin']), COUNT(*) ueber 8 Kerntabellen WHERE owner_user_id = $user_id. Wenn IRGENDEINE Tabelle > 0: throws `Error('Profile hat noch X aktive Records. Vorher Bulk-Reassign noetig.')` mit konkretem X. Bei 0: `supabase.auth.admin.deleteUser($user_id)` + `DELETE FROM profiles WHERE id = $user_id` + audit_log `profile_deleted` mit display_name-Backup im payload (DSGVO-Trail).

**AC6 (Teamlead-Team-Scope):** Teamlead sieht nur Mitglieder seines eigenen Teams (RLS auf profiles via team_id-Match, oder explizit-Filter in Page-Query). Admin sieht alle Mitglieder aller Teams. Vitest deckt 2 Test-Teams ab.

**AC7 (Audit-Trail):** Jede der 3 Actions schreibt audit_log-Eintrag mit:
- `event`: `invite_sent` / `role_changed` / `profile_deleted`
- `user_id`: Triggered-by-User (eigene auth.uid())
- `entity_type`: `profile`
- `entity_id`: betroffener User-ID
- `payload`: `{email, role, ...}` (DSGVO-compatible — kein PW, kein Token)

**AC8 (Playwright E2E Smoke):** Test-Sequenz: Admin loggt ein → Open `/settings/team` → Invite-Dialog `seed-new@test` als `member` → Action-Submit → audit_log-Eintrag-Smoke via Server-Action-Direct-Call → Verifikation Mail-Send-Log (Mocked-Mailer im Test-Mode) → Cleanup. 1 happy-path-Test + 1 Hard-Lock-Test (Delete fuer Member mit Owner-Records muss throws).

**AC9 (TSC + Vitest + Build + Lint):** Alle Outputs clean. Bestehende V6.6+V7-foundation-Tests bleiben gruen.

**AC10 (Live-Smoke nach Coolify-Redeploy):** Echter Invite gegen Hetzner: Admin invited `test-teamlead@strategaize.dev` als `teamlead`, neuer User bekommt Mail (GoTrue-Mailer aktiv per V4.1-Bestand), klickt Link, setzt Password, sieht teamlead-Sidebar. audit_log enthaelt `invite_sent`-Event. Plus Delete-Hard-Lock-Smoke: Admin versucht User Immo zu loeschen → Error mit "X aktive Records" (User Immo hat alle Bestandsdaten).

## Reuse

- `getProfile`, `assertRole` aus SLC-702
- shadcn `<Dialog>`, `<Form>`, `<Select>`, `<Button>`, `<Table>` (Style-Guide-V2-konform, Brand-Tokens)
- Supabase Admin-API aus `cockpit/src/lib/supabase/server.ts` (bereits konfiguriert mit SERVICE_ROLE_KEY)
- audit_log-Tabelle (V3-Bestand, view_as_target_user_id-Spalte aus MIG-033 nicht relevant fuer SLC-703)
- GoTrue-Mailer-Konfiguration aus V4.1 (Coolify-Supabase-Mailer aktiv)
- Whisper-Adapter, Pipeline-Tabellen — NICHT relevant in SLC-703

## Risks

- **R1 — Supabase-Auth-Invite-Mail-Versand auf Coolify:** Self-hosted GoTrue-Mailer kann Spam-Filter oder Sender-Reputation-Issues haben. **Mitigation:** Test-Mail an `test-teamlead@strategaize.dev` (eigene Domain) zuerst, falls Spam-Filter Issue: Resend-API-Wrapper-Pattern aus V5.3 dokumentieren (NICHT in SLC-703 implementieren, nur dokumentieren als bekannte Out-of-Scope-Issue).
- **R2 — Profile-Delete bei lebendem Auth-User (OTQ 9):** `supabase.auth.admin.deleteUser()` loescht GoTrue-Account. Profile-Row sollte SET NULL (ON DELETE SET NULL FK aus MIG-033). Audit_log behaelt display_name-Backup im payload. **Mitigation:** AC5-Implementierung legt display_name in audit_log-payload bevor Delete-Call.
- **R3 — Race bei gleichzeitigem Invite + Role-Change:** Wenn 2 Admins parallel arbeiten, koennen Race-Conditions entstehen. **Mitigation:** Optimistic-Concurrency nicht V7-Scope (akzeptiert), Audit-Log macht Trail nachvollziehbar.
- **R4 — Teamlead darf nur eigenes Team einladen:** Falls Code-Path falsch, koennte Teamlead andere Teams kontaminieren. **Mitigation:** AC2 explizit `team_id == get_my_team_id()` Check. Vitest deckt Cross-Team-Attempt-Case ab.
- **R5 — Sidebar `/settings/team`-Stub aus SLC-702:** Wenn Eintrag noch nicht in SIDEBAR_CONFIG, Page ist nicht erreichbar. **Mitigation:** SLC-702 MT-2 hat den Eintrag bereits gesetzt (Stub mit visibleFor: ['admin','teamlead']). SLC-703 liefert die Page.

## Verification Strategy

- **Pre:** Verifizieren dass SLC-702 SIDEBAR_CONFIG-Eintrag `/settings/team` existiert. Verifizieren dass Supabase Admin-API Service-Role-Key konfiguriert ist (`SUPABASE_SERVICE_ROLE_KEY` ENV in Coolify).
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** Vitest + Build + Lint + Playwright E2E + Live-Smoke nach Redeploy
- **QA-Pflicht:** /qa nach Slice — verifiziert AC1..AC10, manueller Browser-Test mit Test-Member-Invite end-to-end

---

## Micro-Tasks

### MT-1: Server Actions Skeleton
- Goal: 3 Server Actions (inviteMember, changeRole, deleteProfile) als reine Logik.
- Files: `cockpit/src/lib/team/actions.ts` (NEU), `cockpit/src/lib/auth/invite.ts` (NEU), `cockpit/__tests__/team/actions.test.ts` (NEU)
- Expected behavior: Drei Server Actions mit assertRole-Guards, audit_log-Inserts, validierten Inputs (Zod-Schema). Invite-Wrapper kapselt Supabase-Admin-API-Call.
- Verification: Vitest mit 3 Server-Action × 3-Rollen × Happy + Edge-Case = ~15 Tests PASS.
- Dependencies: SLC-702 abgeschlossen (assertRole vorhanden)

### MT-2: /settings/team Page Server-Component
- Goal: Page rendert Team-Mitglieder + KPI-Cards.
- Files: `cockpit/src/app/(authenticated)/settings/team/page.tsx` (NEU)
- Expected behavior: `await assertRole(['admin','teamlead'])` an Top. SQL-Query lädt alle Profiles WHERE team_id = get_my_team_id() (Teamlead) bzw. alle Profiles (Admin). Pro Mitglied COUNT(*) FROM deals WHERE owner_user_id = ? AND status='open' + analog activities. Render KPI-Header + `<TeamMembersTable />`.
- Verification: TSC clean. Dev-Server-Render mit Admin-Session zeigt erwartete Tabelle.
- Dependencies: MT-1

### MT-3: TeamMembersTable Client-Component
- Goal: Tabelle mit interaktiven Role-Dropdowns + Delete-Buttons.
- Files: `cockpit/src/app/(authenticated)/settings/team/team-members-table.tsx` (NEU)
- Expected behavior: Client-Component mit `<Table>` (shadcn). Role-Cell: `<Select>` mit 3 Optionen (admin/teamlead/member), onChange callt changeRole-Action via `useTransition`. Delete-Button: `<AlertDialog>` confirm dann deleteProfile-Action, bei Error (Hard-Lock) zeigt Toast mit Error-Message. Display-Name + Mail + Counts pro Row.
- Verification: TSC + Lint clean. Manueller Dev-Test mit Admin-Session.
- Dependencies: MT-1, MT-2

### MT-4: Invite-Dialog
- Goal: Modal-Form fuer Invite.
- Files: `cockpit/src/app/(authenticated)/settings/team/invite-dialog.tsx` (NEU)
- Expected behavior: `<Dialog>` Trigger-Button `Mitglied einladen`. Form mit E-Mail-Input (Zod-Mail-Validation), Role-Select (Default `member`), Team-Select (Admin sieht alle, Teamlead nur eigenes als read-only). Submit callt inviteMember-Action via useTransition, bei Success Toast + Refresh, bei Error Toast mit Message.
- Verification: TSC + Lint clean. Native-HTML-Form-Pattern (memory `feedback_native_html_form_pattern` — NICHT react-hook-form).
- Dependencies: MT-1, MT-3

### MT-5: Playwright E2E Smoke
- Goal: End-to-End-Smoke fuer Invite + Delete-Hard-Lock.
- Files: `cockpit/__tests__/playwright/team-management.spec.ts` (NEU)
- Expected behavior: 2 Test-Cases:
  - Happy: Admin loggt ein → Open /settings/team → Invite-Dialog → Submit → audit_log direkt geprueft → Cleanup
  - Hard-Lock: Admin loggt ein → Open /settings/team → Versucht User-mit-Owner-Records zu loeschen → Error-Toast erscheint
- Verification: 2/2 PASS gegen Coolify-DB.
- Dependencies: MT-1..MT-4, Seed-Script aus SLC-701

### MT-6: COMPLIANCE.md Section + Build/Test/Lint
- Goal: Slice-Closing + Doku.
- Files: `docs/COMPLIANCE.md` (MOD, neue Section "V7 — Multi-User Profile-Lifecycle")
- Expected behavior: Doku-Section dokumentiert: Invite-Audit-Trail, Role-Change-Audit-Trail, Profile-Delete-Hard-Lock (DSGVO-Loeschpflicht-Kompatibilitaet), display_name-Backup im audit_log. TSC + Build + Lint + Test alle clean.
- Verification: COMPLIANCE.md-Section vorhanden. Alle Tool-Outputs clean.
- Dependencies: MT-1..MT-5

---

## Open Technical Questions Answered

- **OTQ 9 (Profile-Delete bei lebendem Auth-User):** Hard-Lock bei offenen Owner-Records (AC5 + MT-1). `supabase.auth.admin.deleteUser()` loescht GoTrue-Account, FK ON DELETE SET NULL aus MIG-033 nullt Profile-Bezug, audit_log-payload behaelt display_name als Backup.

## QA-Fokus

- 3 Server Actions × 3 Rollen × Edge-Cases (Vitest)
- Invite end-to-end (Mail-Send + Set-Password + Login + Sidebar-Match)
- Hard-Lock-Verifikation mit konkretem Error-Message-Text
- audit_log-Trail-Completeness
- Teamlead-Cross-Team-Attempt-Block
- Browser-Smoke 2-3 happy + edge

## Recommended Next Step nach SLC-703

**/qa SLC-703** — verifiziert AC1..AC10 + Live-Invite-Test. Bei PASS: User-Coolify-Redeploy. Bei Live-PASS: weiter mit **/backend SLC-704** (Owner-Wiring).
