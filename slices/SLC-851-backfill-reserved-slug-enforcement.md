# SLC-851 — V8.5 Backfill-Reserved-Slug-Enforcement (MIG-039 PL/pgSQL-Trigger)

- **Feature:** BL-490 / ISSUE-080
- **Version:** V8.5
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-24
- **Estimated:** ~1.5-2h Code-Side
- **Depends-On:** V8.4 MIG-038 (teams.slug existiert)
- **Architecture:** Reserved-Slug Defense-in-Depth (TS-Application-Layer + DB-Trigger-Layer)

## Goal

V8.4 ISSUE-080 schliessen: Reserved-Slugs aus `cockpit/src/lib/team/reserved-slugs.ts` werden bisher nur im TS-Application-Layer (generateUniqueSlug + isReservedSlug + Public-Route notFound) enforced. Der SQL-Backfill-Pfad (MIG-038 Phase 2) sowie kuenftige direkte SQL-Updates auf `teams.slug` umgehen die Reserved-Liste.

V8.5 schliesst diese Defense-Luecke via DB-Trigger: `BEFORE INSERT OR UPDATE OF slug ON teams` ruft eine PL/pgSQL-Function `is_reserved_slug(text)` und wirft RAISE EXCEPTION (Code 22023) bei Reserved-Treffer. Die Reserved-Liste in der PL/pgSQL-Function ist eine Spiegelung der TS-Liste — Maintenance-Pflicht beim Hinzufuegen neuer Reserved-Strings ist beidseitig.

Sync-Strategie: Das Memory-File `feedback_reserved_slug_sst_pattern.md` (NEU im Dev-System) dokumentiert, dass Reserved-Slugs an 2 Stellen leben (TS + SQL) und beide bei Aenderungen synchron gehalten werden muessen. Single-Source-of-Truth ueber DB-Function-Generation aus TS-Liste ist Out-of-Scope V8.5 (Build-Time-Codegen waere ~1 Tag, V9+ Discovery).

## Scope

### IN
- Migration-File `sql/migrations/039_v85_reserved_slug_trigger.sql`
- PL/pgSQL-Function `public.is_reserved_slug(text) RETURNS boolean` (immutable, security definer not needed)
- Trigger `teams_reserved_slug_guard BEFORE INSERT OR UPDATE OF slug ON teams`
- Apply via SSH+base64 auf Hetzner `postgres`-User (idempotent per `CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS`)
- Vitest-RLS-Suite `cockpit/__tests__/team/reserved-slug-trigger.test.ts` (positive + negative Cases gegen Coolify-DB)
- `docs/MIGRATIONS.md` MIG-039-Eintrag
- `feedback_reserved_slug_sst_pattern.md` Memory-File im Dev-System

### OUT
- Build-Time-Codegen TS→SQL (V9+ Discovery)
- Migration der TS-Reserved-Liste auf reine DB-Function (V9+, breaking Change)
- Auto-Suffix-Mechanismus auf DB-Layer (TS-Generator macht das schon, V8.5-DB-Layer ist nur ENFORCEMENT, kein Auto-Heal)
- Backfill bestehender `teams.slug`-Rows die NICHT Reserved sind (keine vorhanden, V8.4-Live-Fix hat den einzigen Konflikt bereits resolved)

## Acceptance Criteria

- **AC1** `public.is_reserved_slug(text)` Function existiert + return BOOLEAN, case-insensitive Compare, 38 Reserved-Strings synchron zur TS-Liste (Stand 2026-05-24)
- **AC2** Trigger `teams_reserved_slug_guard` aktiv auf `teams` Table BEFORE INSERT OR UPDATE OF slug, ruft `is_reserved_slug(NEW.slug)`, wirft `RAISE EXCEPTION 'slug "%" is reserved', NEW.slug USING ERRCODE='23514'` (CHECK_VIOLATION) bei Treffer
- **AC3** Vitest positive case: `INSERT INTO teams (name, slug) VALUES ('Test', 'test-team-851')` succeeds
- **AC4** Vitest negative case: `INSERT INTO teams (name, slug) VALUES ('Strategaize', 'strategaize')` wirft `23514` mit Message-Substring `reserved`
- **AC5** Vitest negative case: `UPDATE teams SET slug='admin' WHERE id='<existing>'` wirft `23514`
- **AC6** Idempotenz: SQL-Apply zweimal hintereinander auf Hetzner gibt 0 Errors (CREATE OR REPLACE + DROP IF EXISTS)
- **AC7** Bestehender `strategaize-transition-bv` Slug bleibt unveraendert (Re-Apply darf nicht existing Rows brechen)
- **AC8** `docs/MIGRATIONS.md` MIG-039-Eintrag mit Date + Scope + Risk + Rollback Notes nach project-records-format

## Micro-Tasks

### MT-1: PL/pgSQL Function + Trigger Migration

- **Goal:** SQL-Migration mit Function + Trigger schreiben (idempotent)
- **Files:** `sql/migrations/039_v85_reserved_slug_trigger.sql`
- **Expected behavior:** Function `is_reserved_slug(text)` mit 38 Strings + Trigger auf teams.slug aktiviert
- **Verification:** SQL-Syntax local mit `psql --dry-run` (oder Online-Linter) gegen-pruefen
- **Dependencies:** none

### MT-2: Vitest RLS-Suite

- **Goal:** Positive + Negative Cases gegen Coolify-DB
- **Files:** `cockpit/__tests__/team/reserved-slug-trigger.test.ts`
- **Expected behavior:** 1 positive Case + 2 negative Cases (INSERT + UPDATE) erfolgreich
- **Verification:** `npm run test:rls -- reserved-slug-trigger.test.ts` gegen Coolify-DB (post-MT-3)
- **Dependencies:** MT-3 (Migration muss live sein)

### MT-3: Migration auf Hetzner appliciern + Verify

- **Goal:** MIG-039 idempotent auf Production-DB anwenden via `sql-migration-hetzner.md`-Pattern
- **Files:** keine (Operational-Step)
- **Expected behavior:** `\df is_reserved_slug` zeigt Function, `\d teams` zeigt Trigger
- **Verification:** Manuelle SELECT-Tests gegen DB: `SELECT is_reserved_slug('admin')` → true, `SELECT is_reserved_slug('strategaize-transition-bv')` → false
- **Dependencies:** MT-1

### MT-4: Records-Update + Memory-File

- **Goal:** docs/MIGRATIONS.md MIG-039-Eintrag, Memory-File im Dev-System fuer SST-Pattern
- **Files:** `docs/MIGRATIONS.md` (modify), `C:\Users\Admin\.claude\projects\c--strategaize-strategaize-dev-system\memory\feedback_reserved_slug_sst_pattern.md` (create), `MEMORY.md` (modify)
- **Expected behavior:** MIG-039 dokumentiert nach project-records-format, Memory-File sagt "Reserved-Slugs leben in TS + SQL, beidseitig synchron halten"
- **Verification:** Manuelle Inspektion + Cockpit-Refresh zeigt MIG-039
- **Dependencies:** MT-3

## Risiken

- **R1 (Low)** Reserved-Liste TS↔SQL Drift: kuenftige Aenderungen muessen an beiden Stellen erfolgen. Mitigation: Memory-File + Code-Kommentar in beiden Files mit Cross-Reference.
- **R2 (Low)** Performance: Trigger laeuft bei jedem INSERT/UPDATE OF slug. Function ist IMMUTABLE, Set-Lookup O(1), Overhead vernachlaessigbar (<1ms).
- **R3 (Medium)** Migration-Apply-Reihenfolge: muss NACH MIG-038 laufen (teams.slug muss existieren). Pruefung in MT-1 SQL via `IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='slug')`.

## Verification

- Vitest 1116 + 3 neu = 1119/1119 PASS
- `\df is_reserved_slug` zeigt Function auf Production-DB
- `\d teams` zeigt Trigger `teams_reserved_slug_guard`
- Re-Apply idempotent (zweite Ausfuehrung ohne Error)
- Cockpit zeigt MIG-039 + SLC-851 done

## Worktree-Isolation

Branch: `slc-851-backfill-reserved-slug-enforcement` (per CLAUDE.md fuer Internal-Tool optional, V8.5-Hygiene-Bundle kann auch direkt auf main gemerged werden bei trivialem Diff).
