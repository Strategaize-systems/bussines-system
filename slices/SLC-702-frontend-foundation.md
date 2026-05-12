# SLC-702 — Frontend-Foundation (Layout + Sidebar-Config + Server-Side-Guards)

## Metadata
- **Slice ID:** SLC-702
- **Version:** V7
- **Feature:** FEAT-701 (Multi-User-UX), Foundation auch fuer FEAT-502/503
- **Status:** planned
- **Priority:** Blocker (alle anderen V7-Frontend-Slices bauen auf assertRole + sidebar-config + ReadOnlyContext auf)
- **Created:** 2026-05-12
- **Estimated Effort:** ~4-6h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped
- **Architecture:** DEC-190, DEC-191, DEC-192, DEC-195
- **Reihenfolge-Pflicht:** **MUSS nach SLC-701** — nutzt `profiles.role` CHECK-Constraint und `team_id` FK. **MUSS vor SLC-703..707** — alle weiteren Slices nutzen `assertRole` + `getProfile` + `sidebar-config`

## Goal

Anwendungs-seitiges Multi-User-Fundament aufbauen: zentraler `/lib/auth/`-Layer (getProfile + assertRole + readOnlyContext), Sidebar-Config als Single-Source-of-Truth mit `visibleFor: Role[]`, Server-Side-Filter im `(authenticated)/layout.tsx`. Nach SLC-702 zeigt jede Rolle bereits die korrekte Sidebar (Member sieht nur OPERATIV + ARBEITSBEREICHE + eigene VERWALTUNG; Teamlead sieht zusaetzlich TEAM-Stubs; Admin sieht alles). Pages haben noch keinen owner-aware Code (kommt in SLC-704), aber Sidebar-Flash-Free-Rendering und rollen-konditionale Routes funktionieren.

## Scope

**In Scope:**
- `cockpit/src/lib/auth/get-profile.ts` (NEU) — server-side `getProfile()` returnt `{user_id, role, team_id, display_name}` aus Supabase-Session + profiles-Lookup, gecacht via React `cache()`
- `cockpit/src/lib/auth/assert-role.ts` (NEU) — `assertRole(allowed: Role[])` throws Redirect to `/mein-tag` bei Mismatch; Variant `requireRole(allowed)` returnt Profile oder wirft
- `cockpit/src/lib/auth/read-only-context.ts` (NEU) — `<ReadOnlyContextProvider>` + `getReadOnlyContext()` Server-Component-Helper + `assertNotReadOnlyContext()` (wird in SLC-704 von Mutate-Actions konsumiert)
- `cockpit/src/lib/auth/types.ts` (NEU) — Role-Type `'admin' | 'teamlead' | 'member'`
- `cockpit/src/lib/navigation/sidebar-config.ts` (NEU) — Single-Source-Array `SIDEBAR_CONFIG: SidebarItem[]` mit `{href, label, icon, section, visibleFor}` fuer alle ~30 bestehenden Sidebar-Eintraege
- `cockpit/src/components/layout/sidebar.tsx` (MOD) — liest aus `SIDEBAR_CONFIG`, filtert nach `profile.role`, rendert Sektionen + Eintraege
- `cockpit/src/app/(authenticated)/layout.tsx` (MOD) — `await getProfile()` als erste Action, passt `<Sidebar role={role} />` durch
- `cockpit/src/middleware.ts` (MOD) — Rollen-konditionale Route-Schutz fuer `/cockpit`, `/workflow`, `/campaigns`, `/team`, `/settings/team`, `/settings/workflow`
- `cockpit/__tests__/auth/assert-role.test.ts` (NEU) — Vitest fuer assertRole-Pfade
- `cockpit/__tests__/playwright/sidebar-visual-diff.spec.ts` (NEU) — Playwright Visual-Diff fuer 3 Rollen × Desktop (Reference-Screenshots in `__tests__/__snapshots__/`)

**Out of Scope:**
- `/settings/team` Verwaltungs-UI → SLC-703
- owner_user_id-Wiring in bestehenden Server Actions → SLC-704
- `/team` Aggregat-Cockpit → SLC-705
- `/team/[user_id]/...` Drilldown-Routes → SLC-706
- Mobile-Hamburger → SLC-707
- VERWALTUNG-Split → SLC-707

## Acceptance Criteria

**AC1 (getProfile-Helper):** `getProfile()` returnt `{user_id, role, team_id, display_name}` fuer eingeloggten User, cached per Request via React `cache()`. Bei fehlender Session: Redirect zu `/login`. Vitest deckt 3 Rollen + Logged-Out-Case ab.

**AC2 (assertRole-Helper):** `assertRole(['admin', 'teamlead'])` throws `redirect('/mein-tag')` wenn current-role nicht in `allowed`. `requireRole(['admin'])` returnt Profile oder wirft `notFound()`. Vitest deckt Match/Mismatch fuer 3 Rollen ab.

**AC3 (ReadOnlyContext):** `<ReadOnlyContextProvider value={{viewerUserId, targetUserId}}>` propagiert via React-Context. `getReadOnlyContext()` (Server-Component) liest aus AsyncLocalStorage-aequivalentem Pattern fuer Server-Components. `assertNotReadOnlyContext()` throws bei aktivem ReadOnly-Mode. (Konsumiert in SLC-704/706, hier nur API-Surface + Vitest.)

**AC4 (Sidebar-Config):** `SIDEBAR_CONFIG` enthaelt alle ~30 bestehenden Eintraege (siehe V6.6 sidebar.tsx) plus 3 V7-Stubs (`/team` Team-Cockpit, `/settings/team` Team-Verwaltung, `/team` als TEAM-Sektion). Pro Eintrag `visibleFor: Role[]` korrekt gesetzt nach FEAT-701-Tabelle (Member sieht KEIN /cockpit, KEIN /workflow, KEIN /campaigns, KEIN /team). TypeScript-Type erzwingt `visibleFor: Role[]` als non-empty.

**AC5 (Sidebar-Component-Filter):** `<Sidebar />` server-side: `SIDEBAR_CONFIG.filter(item => item.visibleFor.includes(profile.role))`, Sektionen werden ausgeblendet wenn keine sichtbaren Items uebrig. Kein Client-Flash (Sidebar rendert direkt mit gefilterter Liste, kein useEffect-Filter).

**AC6 (Layout-Integration):** `(authenticated)/layout.tsx` ruft `getProfile()` als erste Action, passt `role` an Sidebar + an `assertRole`-fuehige Page-Layouts. Bestehende Page-Layouts bleiben unveraendert in SLC-702 (Rollen-Schutz pro Page wird in SLC-703/705 nach-implementiert).

**AC7 (middleware.ts Rollen-Schutz):** Folgende Routes werden in middleware.ts geprueft:
- `/cockpit/*` → admin + teamlead
- `/workflow/*` → admin + teamlead
- `/campaigns/*` → admin + teamlead
- `/team/*` → admin + teamlead (Stub-Route in SLC-702, vollstaendige UI in SLC-705/706)
- `/settings/team/*` → admin + teamlead (Stub in SLC-702, UI in SLC-703)
- `/settings/workflow/*` → admin

Bei Mismatch: Redirect zu `/mein-tag`. Member-Direkt-URL liefert Redirect (sichtbar in Network-Log) und 200-Render der Mein-Tag-Page.

**AC8 (Visual-Diff Playwright):** Playwright-Test mit 3 Test-Sessions (admin/teamlead/member-Login via Seed-Script-User aus SLC-701) navigiert zu `/mein-tag`, macht Screenshot vom Sidebar-Bereich (links, 280px Breite). Snapshot-Compare gegen Referenz-Bilder in `__tests__/__snapshots__/`. 3 Bilder + Match. Test-Output zeigt Diff-Prozentsatz <0.1%.

**AC9 (TSC + Vitest + Build):** TSC clean. Vitest +N Tests fuer assert-role, get-profile, sidebar-config-filter. Build clean. ESLint: keine neuen Errors (bestehende ~142 Errors als Baseline akzeptiert).

**AC10 (Live-Smoke nach Coolify-Redeploy):** Nach User-Coolify-Redeploy: drei Browser-Sessions (admin/teamlead/member, Test-User aus seed-multi-user) loggen ein, navigieren zu `/mein-tag`. Member sieht KEINE Dashboard-/Cockpit-Eintraege in Sidebar, Member-Direkt-URL `/cockpit` redirected zu `/mein-tag`. Admin sieht volle Sidebar. Teamlead sieht TEAM-Sektion mit 2 Stub-Eintraegen (Links funktionieren auf SLC-705/706-Placeholder-Pages oder 404 bis dann).

## Reuse

- React `cache()` fuer Per-Request-Memoization von `getProfile` (Next.js 14+ App-Router-Pattern)
- Supabase Server-Side-Client aus `cockpit/src/lib/supabase/server.ts` (V6.6-Bestand)
- shadcn `<Sidebar>`-Pattern aus V6.6 (bestehende Sidebar-Component refactoren, nicht neu bauen)
- Lucide-Icons (Sparkles, Users, UserCog, CalendarDays, ...) aus V6.6
- Playwright-MCP-Setup aus `reference_playwright_browser_smoke.md`

## Risks

- **R1 — Sidebar-Refactor-Regression-Risiko (OTQ 4):** Bestehende ~30 Eintraege koennten falsch gemappt werden. **Mitigation:** Visual-Diff via Playwright in AC8 + Cockpit-Records-Sync (slices/INDEX, ...) muss bestehende Eintraege absichern. Admin-Sicht ist Referenz (sollte 1:1 zu V6.6 sein).
- **R2 — Client-Flash bei Sidebar-Filter:** Wenn `getProfile()` clientseitig nachgeholt wird, sieht Member kurz die Admin-Sidebar. **Mitigation:** AC5 fordert server-side Filter im Layout, NICHT useEffect. Profile wird bereits in Layout-Server-Component resolved.
- **R3 — Profile-Cache-Drift bei Rolle-aendern:** Nach `change-role`-Action (SLC-703) muss `getProfile()`-Cache invalidiert werden. **Mitigation:** React `cache()` ist per-Request, kein Cross-Request-Cache. `revalidatePath('/')` nach Role-Change in SLC-703.
- **R4 — middleware.ts Route-Pattern-Drift:** Wenn Route-Pattern in middleware nicht matcht aktuelle Route-Struktur, kann Schutz umgehbar sein. **Mitigation:** AC7-Liste pflegt 6 Patterns, Live-Smoke AC10 deckt Direkt-URL-Tests ab. Zusaetzlich Page-Level `assertRole()` als Defense-in-Depth in spaeteren Slices.
- **R5 — Test-User-Login fuer Playwright:** Visual-Diff braucht echte Auth-Sessions. **Mitigation:** Supabase Admin-API fuer Test-User-Login (Seed-Script aus SLC-701 erzeugt Test-User mit bekannten Mail-Adressen `seed-admin@test`, `seed-teamlead@test`, `seed-member1@test`).

## Verification Strategy

- **Pre:** `cockpit/src/components/layout/sidebar.tsx` lesen — alle bestehenden Eintraege auflisten als Vorlage fuer SIDEBAR_CONFIG.
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** TSC + Vitest + Build + Lint + Playwright Visual-Diff + Live-Smoke nach Coolify-Redeploy
- **QA-Pflicht:** /qa nach Slice — verifiziert AC1..AC10, fuehrt Visual-Diff aus, manueller Browser-Smoke fuer 3 Test-Rollen

---

## Micro-Tasks

### MT-1: Role-Type + getProfile + assertRole + ReadOnlyContext
- Goal: Auth-Helper-Layer in `cockpit/src/lib/auth/` anlegen.
- Files: `cockpit/src/lib/auth/types.ts` (NEU), `cockpit/src/lib/auth/get-profile.ts` (NEU), `cockpit/src/lib/auth/assert-role.ts` (NEU), `cockpit/src/lib/auth/read-only-context.ts` (NEU), `cockpit/__tests__/auth/assert-role.test.ts` (NEU), `cockpit/__tests__/auth/get-profile.test.ts` (NEU)
- Expected behavior: 
  - `getProfile()` — async Server-Function, returnt `{user_id, role, team_id, display_name}` aus Supabase + profiles-Tabelle, cached via React `cache()`. Redirect zu `/login` bei fehlender Session.
  - `assertRole(allowed: Role[])` — throws Next.js `redirect('/mein-tag')` bei Mismatch.
  - `requireRole(allowed: Role[])` — Variant die Profile returnt oder `notFound()` wirft.
  - `<ReadOnlyContextProvider value={...}>` — React-Context-Provider mit `viewerUserId` + `targetUserId`. `getReadOnlyContext()`-Helper (Server-Component-side, async).
- Verification: `npm run test auth` PASS (mindestens 6 Tests). TSC clean.
- Dependencies: SLC-701 abgeschlossen (profiles.role + team_id existieren)

### MT-2: SIDEBAR_CONFIG mit allen Eintraegen
- Goal: Single-Source-of-Truth fuer Sidebar.
- Files: `cockpit/src/lib/navigation/sidebar-config.ts` (NEU)
- Expected behavior: Konstante `SIDEBAR_CONFIG: SidebarItem[]` mit ~30+ Eintraegen aus bestehender sidebar.tsx, jeder mit korrektem `section` (ANALYSE / TEAM / OPERATIV / ARBEITSBEREICHE / VERWALTUNG_MEIN / VERWALTUNG_SETUP) und `visibleFor: Role[]`. Mitarbeiter (member) sieht NICHTS in ANALYSE, NICHTS in TEAM, vollen OPERATIV-Block (Mein Tag, Pipeline, Aktivitaeten, Meetings, Anrufe, Mails, Angebote), vollen ARBEITSBEREICHE-Block (Multiplikatoren, Unternehmer, Leads), eingeschraenkten VERWALTUNG_MEIN (Profile, Mail-Branding, Einstellungen) und KEIN VERWALTUNG_SETUP. Teamlead = wie Admin minus VERWALTUNG_SETUP-Workflow. Admin sieht alles.
- Verification: TSC clean. Vitest snapshot-Test fuer Filter-Logic: `filterByRole('member')` returnt exakt definierte Liste.
- Dependencies: MT-1

### MT-3: Sidebar-Component-Refactor
- Goal: `<Sidebar>` liest aus `SIDEBAR_CONFIG`, filtert per Role.
- Files: `cockpit/src/components/layout/sidebar.tsx` (MOD), `cockpit/__tests__/components/sidebar.test.ts` (NEU oder MOD)
- Expected behavior: Component bekommt `role: Role` als Prop, filtert `SIDEBAR_CONFIG`, gruppiert nach `section`, rendert Sektion-Header + Items. Sektion-Header faellt weg wenn keine Items uebrig. Keine Hardcoded-Eintraege mehr in der Component selbst.
- Verification: TSC clean. Vitest mit jeweils 3 Role-Snapshots (admin/teamlead/member). Bestehende Sidebar-Tests bleiben gruen.
- Dependencies: MT-2

### MT-4: (authenticated)/layout.tsx Integration
- Goal: Layout zieht Profile + passt an Sidebar.
- Files: `cockpit/src/app/(authenticated)/layout.tsx` (MOD)
- Expected behavior: Erste Action `const profile = await getProfile()`, dann `<Sidebar role={profile.role} />` rendern. Bestehende Layout-Struktur (PageHeader, Main-Content) bleibt unveraendert.
- Verification: TSC clean. Lokaler Dev-Server-Build clean.
- Dependencies: MT-1, MT-3

### MT-5: middleware.ts Rollen-Schutz
- Goal: Route-Pattern-basierter Rollen-Schutz vor Server-Component-Render.
- Files: `cockpit/src/middleware.ts` (MOD)
- Expected behavior: 6 Route-Patterns (siehe AC7) werden gegen `profile.role` geprueft. Bei Mismatch: `NextResponse.redirect('/mein-tag')`. Bestehende Auth-Middleware-Logik bleibt (Login-Check, Session-Refresh).
- Verification: TSC clean. Vitest fuer middleware-Logik mit Mock-Request-Objects (3 Rollen × 6 Patterns).
- Dependencies: MT-1

### MT-6: Playwright Visual-Diff Sidebar
- Goal: Visual-Snapshot fuer 3 Rollen.
- Files: `cockpit/__tests__/playwright/sidebar-visual-diff.spec.ts` (NEU), `__tests__/__snapshots__/sidebar-admin.png`, `-teamlead.png`, `-member.png` (Reference)
- Expected behavior: 3 Test-Cases, jeder loggt mit Test-User ein (Admin-API), navigiert zu `/mein-tag`, macht Screenshot vom Sidebar-Bereich (Selector `nav.sidebar`), vergleicht gegen Snapshot. Erstmaliger Lauf erzeugt Snapshots (manuell sign-off).
- Verification: Snapshot-Match <0.1% Diff.
- Dependencies: MT-1, MT-2, MT-3, MT-4, MT-5; Seed-Script-User aus SLC-701

### MT-7: TSC + Build + Vitest + Live-Smoke
- Goal: Slice-Closing.
- Files: keine neuen, nur Verifikation
- Expected behavior: `npx tsc --noEmit` clean. `npm run build` clean. `npm run test` PASS (650 V6.6 + 96 V7-RLS + neue V7-Auth-Tests). `npm run lint` keine neuen Errors. User-Coolify-Redeploy, dann 3-Rollen-Live-Smoke (AC10).
- Verification: Alle Outputs clean, Live-Smoke 3/3 PASS.
- Dependencies: MT-1..MT-6

---

## Open Technical Questions Answered

- **OTQ 4 (Sidebar-Refactor-Risiko):** Playwright Visual-Diff in AC8 + MT-6. Plus Admin-Sicht ist 1:1 zu V6.6 (Regression-Indikator). Plus Cockpit-Records-Sync verifiziert dass alle Eintraege erhalten sind.
- **OTQ 10 (Mobile-Sidebar State):** Memory-only (kein localStorage) — wird in SLC-707 implementiert. State-Init = closed bei jedem Page-Load, Drawer schliesst bei Route-Wechsel.

## QA-Fokus

- Server-Side-Filter (kein Client-Flash) via Visual-Verify im Dev-Mode (no flicker)
- 3 Rollen × 6 Routes Browser-Smoke
- middleware.ts greift vor Server-Component-Render
- TSC + Build + Lint clean
- ReadOnlyContext-API-Surface ist konsumierbar (Vitest-Mock-Konsumenten)
- Playwright Visual-Diff PASS

## Recommended Next Step nach SLC-702

**/qa SLC-702** — verifiziert AC1..AC10. Bei PASS: User-Coolify-Redeploy + Live-Smoke. Bei Live-PASS: weiter mit **/frontend SLC-703** (Verwaltungs-UI).
