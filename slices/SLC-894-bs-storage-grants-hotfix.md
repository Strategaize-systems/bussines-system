# SLC-894 — V8.13 BS storage-Schema GRANTs Hotfix (ISSUE-088 Root-Fix)

- Feature: FEAT-813 (V8.13 Storage+Auth Hotfix-Slice)
- Backlog: BL-506
- Status: planned
- Priority: High (PRE-LIVE PFLICHT — blockiert V8.11 RLS-Sweep)
- Created: 2026-06-03
- Estimated effort: ~30 Min Migration + ~30 Min Live-Verify = ~1h
- Audit-Quelle: V8.13 Investigation 2026-06-03 (RPT-573)

## Goal

Schliesst ISSUE-088 endgueltig durch idempotente GRANT-Migration auf `storage`-Schema. **Root-Cause ist nicht RLS sondern GRANT** — Rolle `authenticated` hat nur SELECT, kein INSERT/UPDATE/DELETE auf `storage.objects`. Storage v1.11.13 verkleidet PostgreSQL Error-Code `42501 insufficient_privilege` (aus `aclchk.c:3650`) als "new row violates row-level security policy" Message — fuehrt zu diagnostischer Verwirrung.

Cross-Repo-Vergleich:
- BS: nur `authenticated|SELECT` auf storage.objects
- OP: KEINE GRANTs auf storage.objects (gleicher Bug, noch nicht entdeckt)
- IS + ImSch: volle CRUD (Standard-Supabase-Default)

Fix: Standard-Supabase-Default-GRANTs idempotent setzen. Beobachtung: IS/ImSch laufen Storage v1.44.2 + GoTrue v2.186 → diese Versionen setzen die GRANTs automatisch im Init-Script. BS/OP auf alten Versionen (v1.11.13/v2.160) tun das nicht.

## Scope (In)

- MIG-043: GRANT SELECT, INSERT, UPDATE, DELETE auf alle `storage.*`-Tabellen fuer Rollen `authenticated` + `anon` (Standard-Supabase-Defaults)
- Sequences im storage-Schema auch (USAGE-GRANT)
- Re-NOTIFY pgrst schema reload
- Coolify-Apply via SSH+base64+psql (Pattern aus `.claude/rules/sql-migration-hetzner.md`)
- Live-Verify: Storage-INSERT via authenticated User funktioniert wieder

## Scope (Out)

- OP gleiche Migration → separater Slice in OP-Repo (Cross-Repo-Coordination unten)
- Container-Upgrade GoTrue/Storage → V8.14 (separater Sprint, weil Schema-Migrations + Breaking-Change-Risk)
- ISSUE-089 Investigation → SLC-895 (separater Slice)
- BS+OP Compose-File Default-Init-SQL ergaenzen → Pattern-Library-Entry im Dev-System nach Slice-Abschluss

## Acceptance Criteria

- **AC-894-1**: MIG-043 erstellt unter `sql/migrations/043_v813_storage_schema_grants.sql` mit:
  - `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage TO authenticated, anon;`
  - `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA storage TO authenticated, anon;`
  - `ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, anon;`
  - `NOTIFY pgrst, 'reload schema';`
  - Idempotent (kein DROP, kein REVOKE, additive GRANTs)
- **AC-894-2**: MIG-043 auf Coolify-Postgres applied via SSH+base64+psql, post-apply Verify-Query bestaetigt `authenticated` hat jetzt INSERT/UPDATE/DELETE auf `storage.objects`
- **AC-894-3**: Live-Verify: echter GoTrue-JWT-Cookie-Session-User kann via `supabase.storage.from('documents').upload(...)` ein File hochladen → HTTP 200 (statt vorher 400 "RLS violation")
- **AC-894-4**: RLS-Policy-Defense (SLC-893 documents_user_*) bleibt aktiv und greift weiterhin → User kann nur eigene Pfade INSERT-en, fremde Pfade weiter 403
- **AC-894-5**: ISSUE-088 in `docs/KNOWN_ISSUES.md` → `Status: resolved` mit Resolution-Block
- **AC-894-6**: Cross-Repo-Migration-Mirror-Plan dokumentiert in `docs/CROSS_REPO_V813_STORAGE_GRANTS.md` als Reference fuer OP-Sprint

## Risks

- **R-1 LOW** — GRANT-Migration koennte bei naechstem Coolify-Storage-Container-Recreate verworfen werden wenn Storage v1.11.13's Init-Script REVOKE macht. **Mitigation:** Pattern-Library-Entry + Doku ueber Compose-Init-SQL als Phase-2 (kein V8.13-Scope, sondern Dev-System-Skill-Improvement). Bis dahin: Re-Apply der Migration nach jedem Storage-Container-Recreate dokumentiert.
- **R-2 LOW** — Additive GRANTs koennten in seltenen Faellen mit existierenden REVOKEs konflikten. **Mitigation:** Pre-Apply-Audit der aktuellen GRANT-Matrix vergleich mit IS/ImSch Reference-State.
- **R-3 LOW** — Storage v1.11.13 koennte trotz GRANTs noch andere 42501-Bugs haben (Sequence-Permission etc.). **Mitigation:** Live-Verify ist AC-894-3 — wenn dort weiter Fail, dann Deep-Dive in Sequence-GRANTs ODER auf V8.14 Container-Upgrade eskalieren.

## Micro-Tasks

### MT-1: Pre-Apply GRANT-Matrix-Audit
- Goal: Aktueller GRANT-State BS storage-Schema vollstaendig festhalten als Diff-Basis
- Files:
  - `slices/SLC-894-pre-apply-audit.md` (neu) — psql-Output festhalten + Diff zu IS/ImSch Reference-State
- Verification: Manuelles Review-Doc
- Dependencies: none

### MT-2: MIG-043 schreiben + lokal testen (lokal via vitest-Migration-Test)
- Goal: SQL-File anlegen + Migration-Test
- Files:
  - `sql/migrations/043_v813_storage_schema_grants.sql` (neu)
  - `__tests__/migrations/043-v813-storage-schema-grants.test.ts` (neu, 3-4 Cases: pre/post-state, idempotent re-run, NOTIFY-Trigger)
- Expected behavior: SQL idempotent, post-apply alle 4 CRUD-GRANTs auf storage.objects fuer authenticated+anon
- Verification: Vitest gegen Coolify-DB-Sidecar (node:22 in business-net per `coolify-test-setup.md`-Pattern)
- Dependencies: MT-1

### MT-3: Live-Apply auf Coolify-Postgres
- Goal: MIG-043 auf Production-DB applied
- Files: (Server-Side, kein File-Change im Repo)
  - Apply via SSH+base64+psql auf 91.98.20.191
  - Post-apply Verify via Inline-Query
- Verification: 
  - `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema='storage' AND table_name='objects' AND grantee='authenticated' ORDER BY privilege_type;` → 4 rows (DELETE, INSERT, SELECT, UPDATE)
  - Storage-Container-Status weiter healthy
- Dependencies: MT-2

### MT-4: Live-Smoke Storage-INSERT mit echtem User-Session
- Goal: Beweis dass ISSUE-088 endgueltig geschlossen ist
- Files: (kein File-Change, nur Live-Test)
  - Playwright-MCP Cookie-Session-Workaround analog RPT-569
  - ODER curl mit echtem GoTrue-JWT
- Expected behavior:
  - User-A INSERT eigener Pfad → HTTP 200 (jetzt OK, vorher 400)
  - User-A INSERT fremder Pfad → HTTP 403 (RLS greift weiter)
  - User-A SELECT eigener Pfad → HTTP 200 (unveraendert)
- Verification: Test-Pollution-Cleanup im selben Block
- Dependencies: MT-3

### MT-5: Records-Sync + Cross-Repo-Mirror-Plan
- Goal: ISSUE-088 → resolved + Cross-Repo-Plan-Doku
- Files:
  - `docs/KNOWN_ISSUES.md` — ISSUE-088 Status: resolved + Resolution-Block
  - `docs/CROSS_REPO_V813_STORAGE_GRANTS.md` (neu) — Migration-Content + OP-Apply-Plan
  - `docs/MIGRATIONS.md` — MIG-043 entry
  - `slices/INDEX.md` — SLC-894 → done
  - `features/INDEX.md` — FEAT-813 → in_progress (wenn SLC-895 noch offen) oder deployed
  - `planning/backlog.json` — BL-506 → done
  - `docs/STATE.md` — Current Focus update
  - `docs/RELEASES.md` — REL-045 (V8.13) angelegt nach SLC-895 done
- Verification: Cockpit zeigt SLC-894 done + ISSUE-088 resolved
- Dependencies: MT-1..MT-4

## Pattern-Reuse-Audit

- Migration-Apply Pattern: `.claude/rules/sql-migration-hetzner.md` (etabliert)
- Migration-Test Pattern: `__tests__/migrations/041-...test.ts` als 1:1-Vorlage (V8.10 SLC-893 MT-2)
- Coolify-DB-Sidecar fuer Vitest: `.claude/rules/coolify-test-setup.md` mit node:22 (forward-kompatibel)
- KEIN neuer npm-Package, KEIN Code-Change in cockpit/src

## Cross-Repo-Implications

OP V8.0.2 (oder gleichwertige Slice in OP-Repo) muss DENSELBEN Fix bekommen — OP ist sogar noch schlimmer (KEINE GRANTs statt nur SELECT). Slice-Spec wird in OP-Repo gefahren wenn dort der Sprint startet. Dieser Slice (SLC-894) liefert die Migration-Datei + Apply-Doku als Cross-Repo-Vorlage in `docs/CROSS_REPO_V813_STORAGE_GRANTS.md`.

ImSch + IS sind nicht betroffen (Container-Versionen v1.44.2 / v2.186 setzen die GRANTs Init-Script-seitig).
