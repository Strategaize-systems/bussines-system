# SLC-841 — V8.4 Schema-Migration MIG-038 (legal_documents + teams.slug)

- **Feature:** FEAT-824 / BL-488
- **Version:** V8.4
- **Status:** planned
- **Priority:** Blocker
- **Created:** 2026-05-22
- **Estimated:** ~1.5h Code-Side
- **Depends-On:** —
- **Architecture:** DEC-231 (Versionierung V1 Single-Row), DEC-233 (eigene legal_documents-Tabelle)

## Goal

Foundation-Schema fuer V8.4 anwenden: neue Tabelle `legal_documents` mit RLS auf `team_id`-Scope + neue Spalte `teams.slug` mit UNIQUE-Index + Backfill aus `teams.name`. Default-Seed-Phase (Phase 5) wird in SLC-842 nach Erstellung des Default-Markdown-Files nachgezogen — SLC-841 ENDET mit Phase 4.

Vollstaendiger SQL-Plan + Reasoning siehe MIG-038-Eintrag in `/docs/MIGRATIONS.md` (Phase 1-4 in SLC-841, Phase 5 in SLC-842).

## Scope

### IN
- Migration-File `sql/migrations/038_v84_customer_dse.sql` mit Phase 1-4
- Apply via SSH+base64 auf Hetzner `postgres`-User (idempotent per `IF NOT EXISTS`)
- RLS-Live-Tests gegen Coolify-DB via `coolify-test-setup.md` Pattern (node:20 im Docker-Net)
- Post-Apply Verifikation: `\d legal_documents`, `\d teams`, `SELECT slug FROM teams;`, PostgREST-Schema-Reload-Check

### OUT
- Default-Seed-Markdown (SLC-842)
- Phase 5 INSERT in legal_documents (SLC-842)
- TS-Slug-Generator `lib/team/slug.ts` (SLC-842)
- Reserved-Slugs-Liste (SLC-842)
- Editor-UI, Public-Route, Mail-Footer (spaetere Slices)

## Acceptance Criteria

- **AC1** `legal_documents`-Tabelle existiert mit 7 Spalten, RLS=ENABLED, 2 Policies (`legal_documents_select_team`, `legal_documents_admin_mutate`), FK auf `teams(id) ON DELETE CASCADE`, UNIQUE(tenant_team_id, kind)
- **AC2** `teams`-Tabelle hat neue Spalte `slug` als TEXT NOT NULL mit UNIQUE-Index `teams_slug_lower_unique` auf `lower(slug)` + DEFAULT (`t-` + uuid-Hex)
- **AC3** Bestehende `teams`-Row `Strategaize Transition BV` hat erwarteten Slug `strategaize-transition-bv` post-Backfill
- **AC4** GRANTs `SELECT, INSERT, UPDATE, DELETE` auf `legal_documents` fuer Rollen `authenticated` + `service_role` aktiv (`feedback_migration_rls_needs_grants`-Pflicht)
- **AC5** PostgREST-Schema-Cache reloaded — `GET /rest/v1/legal_documents?limit=1` ueber Coolify-internal Kong gibt HTTP 401 (RLS aktiv ohne JWT), NICHT 404
- **AC6** RLS-Live-DB-Tests: Cross-Tenant-Isolation (Tenant-A-Admin sieht NICHT Tenant-B-DSE), admin-only Mutate, UNIQUE-Constraint-Verletzung wirft 23505

## Micro-Tasks

### MT-1: Migration-File schreiben
- Goal: SQL-File `sql/migrations/038_v84_customer_dse.sql` anlegen mit Phase 1-4 aus MIG-038 (vollstaendiger Plan in `/docs/MIGRATIONS.md`). Translit-Tabelle in Phase 2 erweitern um echte Umlaute `ä→ae, ö→oe, ü→ue, Ä→Ae, Ö→Oe, Ü→Ue, ß→ss` (Best-Effort-Defense gegen kuenftige Umlaut-Teams).
- Files: `sql/migrations/038_v84_customer_dse.sql` (NEU, ~80 Zeilen Phase 1-4 + NOTIFY)
- Expected behavior: Idempotent applicable. Phase 1 CREATE legal_documents + RLS + 2 Policies + GRANTs. Phase 2 ALTER teams ADD slug + Backfill mit Slugify-Loop + Empty-Fallback. Phase 3 NOT NULL + UNIQUE lower-Index. Phase 4 DEFAULT-Patch. KEINE Phase 5 (Default-Seed kommt in SLC-842).
- Verification: lokale `psql --dry-run` oder Trockenlesen + Lint (kein Tooling-Run noetig). SQL-Syntax-Pruefung per `cat`.
- Dependencies: —

### MT-2: Migration auf Hetzner anwenden
- Goal: MIG-038 Phase 1-4 auf Coolify-Supabase-DB anwenden via `sql-migration-hetzner.md` Procedure (base64 + postgres-User + idempotent).
- Files: keine (Hetzner-side Apply, kein Code-Edit)
- Expected behavior: Apply ohne Fehler. Container-Name dynamisch via `docker ps | grep supabase-db` aufloesen (nicht hardcoden — `feedback_imsch_coolify_uuid_hardcode`-Lehre). NOTIFY pgrst nach Apply.
- Verification:
  - `docker exec <container> psql -U postgres -d postgres -c "\d legal_documents"` zeigt 7 Spalten, RLS=ENABLED, 2 Policies, UNIQUE(tenant_team_id, kind)
  - `\d teams` zeigt neue `slug`-Spalte, NOT NULL, DEFAULT-Expression
  - `SELECT id, name, slug FROM teams;` zeigt 1 Row mit `slug='strategaize-transition-bv'`
  - `SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'legal_documents'::regclass;` zeigt 2 Policies
  - `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='legal_documents';` zeigt SELECT/INSERT/UPDATE/DELETE fuer authenticated + service_role
  - PostgREST-Smoke: `curl -sI http://supabase-kong-...:8000/rest/v1/legal_documents?limit=1` HTTP 401 (NICHT 404)
- Dependencies: MT-1

### MT-3: RLS-Live-DB-Tests via node:20 im Coolify-Net
- Goal: Vitest-Suite fuer RLS-Policy-Verifikation gegen Coolify-DB. Reuse `coolify-test-setup.md` Pattern (SAVEPOINT um expected Permission-Denials).
- Files: `cockpit/__tests__/sql/legal-documents-rls.test.ts` (NEU, ~6-8 Tests)
- Expected behavior: Tests pruefen:
  - `SELECT` durch tenant-member sieht eigene Tenant-Row, NICHT andere
  - `INSERT` durch non-admin-tenant-member wird abgelehnt
  - `INSERT` durch admin-tenant-member wird angenommen
  - `UPDATE` durch admin-cross-tenant wird abgelehnt
  - `UNIQUE(tenant_team_id, kind)` Constraint-Verletzung wirft 23505
  - `service_role` darf alles (bypass RLS)
- Verification: `docker run --rm --network <coolify-net> -v /opt/<repo>:/app -w /app -e TEST_DATABASE_URL='postgresql://...' node:20 npx vitest run __tests__/sql/legal-documents-rls.test.ts` 6+ Tests PASS, alle SAVEPOINT-gesichert.
- Dependencies: MT-2

## Risks / Notes

- **R1** SQL-Translit-Tabelle Best-Effort. Edge-Case: Teams mit Sonderzeichen-only-Name wuerden auf `t-<uuid8>`-Fallback laufen. Akzeptabel, da Production-Code via TS-Generator (SLC-842) immer expliziten Slug setzen wird.
- **R2** Phase 5 (Default-Seed INSERT) ist BEWUSST nicht in SLC-841. Bedeutet: post-MT-2 ist `legal_documents` LEER fuer alle existierenden Teams. Public-Route SLC-843 wuerde dann 404 zurueck geben. SLC-842 muss zwingend vor SLC-843 ausgefuehrt werden (Reihenfolge dokumentiert in DEC-238).
- **R3** Default-Markdown-File existiert noch nicht. SLC-842 erstellt es. Falls SLC-842 verschoben wird, Public-Route bleibt 404 fuer alle Tenants → kein Risiko fuer bestehende User (Internal-Test-Mode).
- **R4** `feedback_compliance_gate_later`: Default-Seed-Text ist Pseudo-DSE-Entwurf; Anwalts-Pruefung deferred Pre-Customer-Live.

## Worktree-Isolation

V8.4 Delivery Mode = Internal-Tool. Worktree-Isolation laut `slice-planning.md`-Skill empfohlen-aber-optional. **Entscheidung:** ja, Worktree-Branch `slc-841-customer-dse-schema-migration` weil Schema-Migration auf Hetzner direkten Production-DB-Impact hat — Rollback-Pfad muss isolierbar bleiben.

## Done-Definition

- Migration-File 038_v84_customer_dse.sql commited
- Apply auf Hetzner durch + Verifikation 6/6 Punkte AC1-AC6 PASS
- Vitest 6+ Tests PASS
- `/qa` PASS
- Slice-Branch ready fuer Master-Merge (Merge erst am Slice-Ende SLC-847)
