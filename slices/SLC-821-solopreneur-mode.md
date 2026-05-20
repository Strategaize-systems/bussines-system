# SLC-821 — Solopreneur-Mode: Team-Sidebar-Items bei team_size=1 ausblenden (FEAT-811 / BL-482)

## Metadata
- **Slice ID:** SLC-821
- **Version:** V8.1
- **Feature:** FEAT-811 Sub-Slice 1
- **Backlog:** BL-482
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-20
- **Estimated Effort:** ~30-60 Min Code + ~15 Min /qa + Live-Smoke = ~45-75 Min Gesamt-Session
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** optional (kleine isolierte Aenderung, 2 Datei-Touches + 1 neue Datei)
- **Pattern-Reuse:** React `cache()`-Pattern aus [cockpit/src/lib/auth/get-profile.ts](cockpit/src/lib/auth/get-profile.ts) 1:1. Server-side Sidebar-Filter-Pattern aus [cockpit/src/app/(app)/layout.tsx](cockpit/src/app/(app)/layout.tsx) (V7 DEC-190 etabliert).
- **Reihenfolge-Empfehlung:** SLC-821 ERSTER in V8.1 (kleinste isolierte Aenderung, kein Cross-Cut).

## Why

Solopreneur-Admin (`team_size = 1`) sieht heute "Team-Cockpit" + "Team-Verwaltung" Sidebar-Eintraege, die Aggregate ueber genau einen User zeigen — visuell wertlos. Erstes Onboarding-Erlebnis fuer Solo-User ist verwirrend.

DEC-227: Detection via `profiles.team_id`-Count im Layout-Server-Side, kein neues Schema-Feld. Edge-Case `team_id IS NULL` → semantisch Solo (return 1).

## Scope

**In Scope:**

- Neue Datei [cockpit/src/lib/team/team-size.ts](cockpit/src/lib/team/team-size.ts) mit `getTeamSize(profile)`-Helper
- Aenderung [cockpit/src/app/(app)/layout.tsx](cockpit/src/app/(app)/layout.tsx): Sidebar-Filter um Solopreneur-Bedingung erweitern
- Vitest fuer team-size-Helper

**Out of Scope:**
- Override-Toggle "Team-Vorbereitungs-Modus" (verworfen 2026-05-20)
- team_size-Anzeige im Header/UI (out V9+)
- Schema-Migration (kein neues team_size-Feld)
- Andere Sidebar-Sections (SLC-822)

## Acceptance Criteria

- **AC1** — `getTeamSize`-Helper liefert `1` wenn `profile.team_id === null`
- **AC2** — `getTeamSize`-Helper liefert `count(*) FROM profiles WHERE team_id = X` fuer non-null team_id
- **AC3** — React `cache()` memoization: zweiter Aufruf in selbem Request macht keinen neuen DB-Call (Pattern aus get-profile.ts)
- **AC4** — Solopreneur-Admin (team_size=1): `/team` + `/settings/team` Sidebar-Eintraege NICHT sichtbar
- **AC5** — Nach Invite: bei naechstem Layout-Render werden beide Eintraege wieder sichtbar
- **AC6** — Member ohne Team (team_id=null, team_size=1): keine Regression — die `TEAM`-Items waren ohnehin `ADMIN_TEAMLEAD`-only
- **AC7** — `npm run build`, `npm run lint`, `npm run test` clean
- **AC8** — Vitest 3-4 neue Cases (team_id null, team_size 1, team_size >1, cache-memoization)

## Micro-Tasks

### MT-1: team-size.ts Helper anlegen
- **Goal:** Server-side Helper `getTeamSize(profile)` mit React `cache()`-Memoization
- **Files:** `cockpit/src/lib/team/team-size.ts` (neu)
- **Expected behavior:** Exportiert `getTeamSize` als `cache(async (profile: Profile): Promise<number>)`. Wenn `profile.team_id === null` → return 1. Sonst: Supabase-Server-Client `count`-Query auf `profiles` mit `team_id = profile.team_id`. Bei Error wird der Error geworfen (kein Silent-Fallback — Default kein Solo-Behaviour bei DB-Fehler).
- **Verification:** TypeScript-Compile-Check + Vitest in MT-3
- **Dependencies:** keine

### MT-2: Layout-Filter aktivieren
- **Goal:** Sidebar-Filter im `(app)/layout.tsx` um Solopreneur-Filter erweitern
- **Files:** `cockpit/src/app/(app)/layout.tsx` (modify)
- **Expected behavior:** Nach `await getProfile()` zusaetzlich `await getTeamSize(profile)` aufrufen. Vor Sidebar-Render: wenn `teamSize === 1` → Sidebar-Items mit `section === "TEAM"` aus dem rolle-gefilterten Array entfernen. Reihenfolge: Permission-Filter zuerst (role-basiert), dann Solopreneur-Filter.
- **Verification:** Build clean + visueller Browser-Check in Live-Smoke
- **Dependencies:** MT-1

### MT-3: Vitest fuer team-size
- **Goal:** Unit-Tests fuer `getTeamSize` mit 3-4 Cases
- **Files:** `cockpit/src/lib/team/team-size.test.ts` (neu)
- **Expected behavior:**
  - Test 1: `team_id === null` → returns 1
  - Test 2: `team_id === 'team-a'` mit 1 profile → returns 1
  - Test 3: `team_id === 'team-a'` mit 3 profiles → returns 3
  - Test 4: cache-memoization (zweiter Call mit gleichem profile macht KEINEN zweiten Supabase-Call) — Mock-Verification
  - Tests gegen Coolify-DB (per `coolify-test-setup.md`) ODER per Mock — entscheiden bei MT-Start basierend auf bestehendem Test-Pattern in `lib/team/`-Folder
- **Verification:** `npm run test -- team-size.test.ts` → 4/4 PASS
- **Dependencies:** MT-1

### MT-4: Records-Sync nach Slice-Ende
- **Goal:** Cockpit-Records aktualisieren
- **Files:** `slices/INDEX.md` (status `done`), `features/INDEX.md` (FEAT-811 in_progress), `planning/backlog.json` (BL-482 ggf. `done`), `docs/STATE.md` (Current Focus update)
- **Expected behavior:** Standard-Records-Sync nach Slice-Completion (per `mandatory-completion-report.md`)
- **Verification:** Git diff zeigt alle erwarteten Aenderungen
- **Dependencies:** MT-2 + MT-3 PASS

## Open Points

- **Test-Pattern entscheiden in MT-3:** Coolify-DB-Test (`reference_coolify_test_setup.md`) oder Vitest-Mock? Bei reinem `count`-Query ist Mock vermutlich ausreichend.
- **Cache-Memoization-Test:** Realistic test, wie Pattern in `get-profile.test.ts` aufgebaut ist — pruefen bei MT-Start.

## Risks

- **Risk:** N+1-Query wenn Layout pro Request `getTeamSize` aufruft. Mitigation: React `cache()`-Pattern wie `getProfile`, gleicher Mechanismus.
- **Risk:** `profile.team_id === null` koennte fuer einen Bootstrap-Admin nach Migration anders interpretiert werden als gedacht. Mitigation: explizite `null === 1`-Mapping in Helper-Doku, AC1 testet das.
- **Risk:** Sidebar-Filter-Reihenfolge falsch → Member sieht ploetzlich TEAM-Items. Mitigation: Permission-Filter VOR Solopreneur-Filter, MT-2 ist defensiv geschrieben.

## Dependencies

- Keine Vorbedingungen aus anderen V8.1-Slices
- Nutzt V7 `profiles.team_id` (existiert seit MIG-033)
- Nutzt `getProfile()` aus V7 (existiert)
- Nutzt V7-Sidebar-Filter-Pattern (DEC-190)

## Reihenfolge-Empfehlung in V8.1

SLC-821 als ERSTER Slice. Begruendung: kleinster, isolierter, kein Cross-Cut mit anderen Slices. Schnelle V8.1-Sichtbarkeit ("Solo-Sidebar ist sauberer").

## Reports

- Quelle: V8.1 Architecture RPT-491
- Reports erwartet: 1x /frontend RPT-49X + 1x /qa RPT-49X
