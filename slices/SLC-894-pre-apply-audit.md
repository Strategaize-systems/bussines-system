# SLC-894 MT-1 — Pre-Apply GRANT-Matrix-Audit (BS storage-Schema)

- Date: 2026-06-03
- Server: 91.98.20.191 (BS Production)
- Postgres-Container: `supabase-db-k9f5pn5upfq7etoefb5ukbcg-065643061649`
- Storage-Container: `supabase-storage-k9f5pn5upfq7etoefb5ukbcg-065643089128` — Image `supabase/storage-api:v1.11.13`
- Auth-Container: `supabase-auth-k9f5pn5upfq7etoefb5ukbcg-065643070426` — Image `supabase/gotrue:v2.160.0`
- Audit-Quelle: RPT-573 (V8.13 Investigation 2026-06-03)
- Purpose: Festhalten des aktuellen GRANT-States als Diff-Basis fuer MIG-043 Quick-Fix.

## Befund

### 1. Table-GRANTs auf `storage.*` (relevant: `authenticated` + `anon`)

```
    grantee    |         table_name         | privilege_type
---------------+----------------------------+----------------
 anon          | buckets                    | SELECT
 anon          | migrations                 | SELECT
 anon          | objects                    | SELECT
 anon          | s3_multipart_uploads       | SELECT
 anon          | s3_multipart_uploads_parts | SELECT
 authenticated | buckets                    | SELECT
 authenticated | migrations                 | SELECT
 authenticated | objects                    | SELECT
 authenticated | s3_multipart_uploads       | SELECT
 authenticated | s3_multipart_uploads_parts | SELECT
 service_role  | <alle 5>                   | SELECT/INSERT/UPDATE/DELETE (+ REFERENCES/TRIGGER/TRUNCATE auf s3-Tables)
```

**Befund**: `authenticated` + `anon` haben NUR `SELECT` auf alle 5 storage-Tables. Kein INSERT / UPDATE / DELETE. **Bestaetigt RPT-573 Root-Cause-Diagnose**.

`service_role` hat volle CRUD plus REFERENCES/TRIGGER/TRUNCATE auf den s3-Tables — bleibt unveraendert (BYPASSRLS-Flow funktioniert).

### 2. Schema-USAGE auf `storage`

```
 schema  | auth_usage | anon_usage | sr_usage
---------+------------+------------+----------
 storage | t          | t          | t
```

Alle drei Rollen haben USAGE — kein Action noetig (bereits gesetzt durch MIG-021 V5.1).

### 3. Sequence-GRANTs im `storage`-Schema

```
 grantee | object_name | privilege_type
---------+-------------+----------------
(0 rows)
```

Keine Sequences existieren im storage-Schema:

```
 sequence_schema | sequence_name
-----------------+---------------
(0 rows)
```

Sequence-GRANT in MIG-043 wird defensive No-Op — idempotent OK, schadet nicht, sichert Future-Proofness bei Storage-Container-Upgrades die Sequences einfuehren koennten.

### 4. ALTER DEFAULT PRIVILEGES im `storage`-Schema

```
 role_for | schema | obj_type | defaclacl
----------+--------+----------+-----------
(0 rows)
```

Keine Default-Privileges definiert. MIG-043 setzt `ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ...` damit zukuenftige Tables (z.B. nach Container-Upgrade) automatisch die richtigen GRANTs bekommen.

## Diff zu IS/ImSch Reference-State

Per RPT-573 Cross-Repo Versions-Matrix:

| Server | GoTrue | Storage | `authenticated` GRANTs auf `storage.objects` |
|---|---|---|---|
| **BS (heute)** | v2.160.0 | v1.11.13 | nur `SELECT` (Audit oben bestaetigt) |
| OP | v2.160.0 | v1.11.13 | KEINE (gar nix) |
| IS | v2.186.0 | v1.44.2 | volle CRUD |
| ImSch | v2.186.0 | v1.44.2 | volle CRUD |

**Target-State nach MIG-043** = IS/ImSch Reference: `authenticated` + `anon` mit `SELECT, INSERT, UPDATE, DELETE` auf alle storage-Tables. RLS-Policies (4 documents_user_* aus MIG-041 V8.10 + bestaetigt live in `/post-launch` RPT-572) bleiben aktiv und greifen als Defense-Layer fuer den User-Pfad-Scope.

## Schluss / Migration-Direction

Die `authenticated|SELECT`-only-Konstellation auf storage.objects ist der Root-Cause von ISSUE-088. Storage v1.11.13 verkleidet den PostgreSQL Error-Code `42501 insufficient_privilege` (aus `aclchk.c:3650`) als "new row violates row-level security policy" — daher die diagnostische Verwirrung in V8.10 Live-Smoke.

MIG-043 setzt die fehlenden 3 GRANTs (INSERT/UPDATE/DELETE) idempotent fuer `authenticated` und `anon`. Additive Migration ohne REVOKE, kein Risiko von service_role-Drift. Pre-Apply-Audit hier ist Diff-Basis fuer Post-Apply-Verify (AC-894-2).
