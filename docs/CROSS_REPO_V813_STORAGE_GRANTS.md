# Cross-Repo V8.13 Storage-Schema GRANTs Migration-Vorlage

- Created: 2026-06-03
- BS-Quelle: SLC-894 (RPT-574) — MIG-043 BS Production applied + live-verified.
- Audit-Quelle: RPT-573 (V8.13 Investigation, Cross-Repo-Versions-Matrix).
- Purpose: Vorlage fuer Cross-Repo-Mirror nach OP V8.0.2 (oder gleichwertigem Slice in OP-Repo).

## Hintergrund

V8.13 Investigation hat aufgedeckt, dass BS und OP von einem **systemischen Cross-Repo-Bug** betroffen sind: alte Storage-Container-Versionen `supabase/storage-api:v1.11.13` + GoTrue `v2.160.0` setzen die Standard-Supabase-Default-GRANTs (`SELECT, INSERT, UPDATE, DELETE` fuer `authenticated` + `anon` auf alle `storage.*`-Tabellen) im Init-Script NICHT. Storage v1.44.2+ tut das automatisch.

### Versions-Matrix

| Server | GoTrue | Storage | `authenticated` GRANTs auf `storage.objects` | Affected |
|---|---|---|---|---|
| **BS** | v2.160.0 | v1.11.13 | nur `SELECT` (vor MIG-043) | JA — gefixt 2026-06-03 |
| **OP** | v2.160.0 | v1.11.13 | KEINE GRANTs | **JA — Fix pending** |
| IS | v2.186.0 | v1.44.2 | volle CRUD | nein |
| ImSch | v2.186.0 | v1.44.2 | volle CRUD | nein |

### Symptom

Storage v1.11.13 castet ALLE PostgreSQL `42501 insufficient_privilege`-Errors zu Misleading-Message `"new row violates row-level security policy"`. Tatsaechliche Wurzel ist GRANT-Check aus `aclchk.c:3650`, nicht RLS-Policy-Eval. Diagnostische Verwirrung als RLS-Bug ist ein Storage v1.11.13 Upstream-Quirk.

## OP-Apply-Plan (Cross-Repo-Mirror)

OP ist **schlimmer betroffen** als BS: KEINE GRANTs (nicht mal SELECT) fuer `authenticated`+`anon` auf storage.*. Pre-Apply-Audit auf OP wird das bestaetigen.

### Schritt 1 — Pre-Apply-Audit auf OP Production

```bash
# OP Server-IP per OP-Repo .claude/rules oder Memory
ssh root@<OP-Server> "docker ps --format '{{.Names}}' | grep ^supabase-db"

ssh root@<OP-Server> "docker exec -i <op-supabase-db-container> psql -U postgres -d postgres -c \"SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants WHERE table_schema='storage' AND grantee IN ('authenticated','anon','service_role') ORDER BY table_name, grantee, privilege_type;\""
```

Erwartet: 0 Rows fuer `authenticated`+`anon` ODER nur `service_role`-Rows.

### Schritt 2 — Migration anlegen

Im OP-Repo unter `sql/migrations/<NNN>_v802_storage_schema_grants.sql` (NNN abhaengig vom OP-Migration-State):

```sql
-- =====================================================
-- MIG-OP-NNN — V8.0.2 Storage-Schema GRANTs Hotfix (gleicher Bug wie BS ISSUE-088)
-- =====================================================
-- Cross-Repo-Mirror von BS MIG-043 (V8.13 SLC-894).
-- Storage v1.11.13 + GoTrue v2.160 setzen keine Default-GRANTs im Init-Script.
-- Standard-Supabase-Default-State herstellen.

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA storage
  TO authenticated, anon;

GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA storage
  TO authenticated, anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA storage
  GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLES
  TO authenticated, anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA storage
  GRANT USAGE, SELECT
  ON SEQUENCES
  TO authenticated, anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage
  GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLES
  TO authenticated, anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage
  GRANT USAGE, SELECT
  ON SEQUENCES
  TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
```

### Schritt 3 — Vitest-Schema-Verification

Test-Pattern aus BS uebernehmen: `__tests__/migrations/<NNN>-v802-storage-schema-grants.test.ts`. Quelle: `c:/strategaize/strategaize-business-system/cockpit/__tests__/migrations/043-v813-storage-schema-grants.test.ts`. 5 Tests:

1. authenticated hat 4 CRUD-Privileges auf alle 5 storage-Tables (20 Rows).
2. anon hat 4 CRUD-Privileges auf alle 5 storage-Tables (20 Rows).
3. service_role bleibt unangetastet (20 Rows).
4. ALTER DEFAULT PRIVILEGES gesetzt fuer `postgres`+`supabase_storage_admin` (4 Eintraege in pg_default_acl).
5. Bestehende OP-Storage-RLS-Policies bleiben aktiv (anpassen falls OP RLS-Schema von BS abweicht).

### Schritt 4 — Live-Apply via SSH+base64+psql

Per `.claude/rules/sql-migration-hetzner.md` als `postgres`-Superuser im Container.

### Schritt 5 — Live-Smoke

JWT direkt aus `GOTRUE_JWT_SECRET` signen (umgeht ISSUE-089-Pendant falls in OP gleicher Bug). Curl-Sequenz via `<op-supabase-kong>` mit `apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>`-Header + `Authorization: Bearer <self-signed-JWT>`:

1. POST `/storage/v1/object/<bucket>/<user-uuid>/test-smoke.txt` → expect HTTP 200.
2. POST `/storage/v1/object/<bucket>/<other-user-uuid>/cross-tenant.txt` → expect HTTP 400 + "row-level security policy" Body (RLS-Defense).
3. GET `/storage/v1/object/<bucket>/<user-uuid>/test-smoke.txt` → expect HTTP 200.
4. DELETE `/storage/v1/object/<bucket>/<user-uuid>/test-smoke.txt` → cleanup.

### Schritt 6 — Records-Sync (analog BS SLC-894)

- ISSUE-XXX (OP equivalent of ISSUE-088) → `Status: resolved`.
- `docs/MIGRATIONS.md` MIG-OP-NNN entry.
- `slices/INDEX.md` SLC → done.
- `planning/backlog.json` BL → done.
- `docs/STATE.md` Current Focus.

## OP V8.0.3 (oder gleichwertig) — ISSUE-089-Pendant?

ISSUE-089 Cross-Repo-Status: noch nicht bestaetigt fuer OP. SLC-895 MT-7 in BS-Repo testet OP-Login mit echtem Bestands-User und dokumentiert Befund. Falls OP betroffen ist: gleicher Slice-Plan analog SLC-895 im OP-Repo.

## V8.14 Container-Upgrade (separater Sprint, BS+OP gemeinsam)

Beide Repos brauchen Upgrade auf `supabase/gotrue:v2.186.0` + `supabase/storage-api:v1.44.2`. Damit:
- Misleading-Error-Message-Bug in Storage v1.11.13 verschwindet (RLS-Errors werden wieder als RLS-Errors gemeldet, GRANT-Errors als GRANT-Errors).
- Default-GRANTs werden Init-Script-seitig gesetzt — MIG-043 + OP-Pendant bleiben nuetzlich als Defense bei Drift, sind aber Schmerz-mindernder Code.
- Andere v2.186/v1.44.2-Fixes/Features verfuegbar.

V8.14 ist separater Sprint mit Schema-Migration-Audit, weil Container-Upgrade bei Self-Hosted typischerweise eigene Migration-Pflichten mitbringt (Storage v1.44 hat z.B. `storage.s3_multipart_uploads`-Schema-Erweiterungen).

## Pattern-Library-Entry (Dev-System) — Pflicht nach V8.13-Done

Defense-in-Depth gegen Re-Inzidenz bei Storage-Container-Recreates: `12-storage-grants-init-sql.md` als Dev-System Pattern-Library-Entry. Coolify Compose-File-Init-SQL-Block-Mechanik fuer beide Repos dokumentieren, damit ein Recreate des Storage-Containers die GRANTs nicht versehentlich verwirft (R-1 aus SLC-894).
