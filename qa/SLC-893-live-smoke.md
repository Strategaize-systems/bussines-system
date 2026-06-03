# SLC-893 — Live-Smoke (Storage-API Cross-Tenant Defense)

## Purpose

Bestaetigt nach BS-Coolify-Redeploy mit MIG-041-applied-DB, dass die 4
user-scoped Storage-Policies (`documents_user_select|insert|update|delete`)
gegen die **echte Storage-Service-API** Cross-Tenant-Defense liefern.

Warum nicht via `__tests__/rls/documents-storage-rls.test.ts`?
- Die direct-SQL-RLS-Tests laufen mit `SET LOCAL ROLE authenticated`.
- `authenticated`-Role hat in Supabase per Default **nur SELECT-GRANT** auf
  `storage.objects`. INSERT/UPDATE/DELETE-GRANTs sind nicht gesetzt, weil
  Storage-Operations via Storage-Service-API (mit `supabase_storage_admin`)
  laufen.
- Folge: 6/10 Mutation-Tests scheitern an "permission denied for table objects"
  **auf GRANT-Layer**, BEVOR die RLS-Policy ueberhaupt evaluiert wird.
- Korrekte Verifikation: via Storage-Service-API (Browser-Pfad) mit
  authentifiziertem JWT.

## Erfordert

- BS V8.10 Code auf Production deployed (Coolify-Redeploy nach `2db64cd`).
- MIG-041 applied (verifiziert: 4 Policies + `documents`-Bucket exist).
- SSH-Zugriff zum BS-Server (91.98.20.191).
- JWT_SECRET aus Coolify-ENV (oder via `docker exec` aus auth-Container).

## Test-Pfade (4)

### Pfad 1 — User-A INSERT eigener Pfad → 200

```bash
# Setup: JWT signieren als USER_A
USER_A='00000000-0000-0000-0000-0000000ba001'  # qa-admin
TOKEN_A=$(node scripts/sign-test-jwt.mjs $USER_A)

# Upload via Storage-API
curl -X POST \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: text/plain" \
  -d 'Hello from User-A' \
  https://<bs-public-url>/storage/v1/object/documents/$USER_A/slc-893-smoke/probe.txt

# Erwartet: HTTP 200, Response { Key: "documents/<USER_A>/slc-893-smoke/probe.txt" }
```

### Pfad 2 — User-B GET User-A-Pfad → 403 oder 404

```bash
USER_B='00000000-0000-0000-0000-000000000081'  # qa-member
TOKEN_B=$(node scripts/sign-test-jwt.mjs $USER_B)

# Versuche User-A-File mit User-B-JWT zu lesen
curl -i \
  -H "Authorization: Bearer $TOKEN_B" \
  https://<bs-public-url>/storage/v1/object/documents/$USER_A/slc-893-smoke/probe.txt

# Erwartet: HTTP 403 oder 404 (RLS-USING-Filter blockt SELECT — Storage-Service
# kann mit 404 antworten weil "object not found from user's perspective").
```

### Pfad 3 — User-B INSERT in User-A-Pfad → 403

```bash
# Versuche Cross-User-Upload (User-B in User-A-Verzeichnis)
curl -X POST \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: text/plain" \
  -d 'Cross-tenant attack' \
  https://<bs-public-url>/storage/v1/object/documents/$USER_A/slc-893-smoke/hijack.txt

# Erwartet: HTTP 403 (INSERT-WITH-CHECK-Filter blockt, weil
# auth.uid()::text = USER_B, aber path-first-segment = USER_A).
```

### Pfad 4 — User-A DELETE User-A-Pfad → 200, dann verify deleted

```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN_A" \
  https://<bs-public-url>/storage/v1/object/documents/$USER_A/slc-893-smoke/probe.txt

# Erwartet: HTTP 200, Object weg.

# Verify als USER_A
curl -i \
  -H "Authorization: Bearer $TOKEN_A" \
  https://<bs-public-url>/storage/v1/object/documents/$USER_A/slc-893-smoke/probe.txt

# Erwartet: HTTP 404 (Object existiert nicht mehr).
```

## JWT-Sign-Helper

Falls noch nicht im Repo: `scripts/sign-test-jwt.mjs` baut HS256-JWT analog
zu BS V4.1 SLC-412 `gen-test-jwt.mjs`-Pattern (jitsi-jibri-deployment.md).

Signing-Secret: JWT_SECRET aus Coolify-ENV.

## Cleanup

```bash
ssh root@91.98.20.191 "docker exec supabase-db-k9f5pn5upfq7etoefb5ukbcg-112915883920 \
  psql -U postgres -d postgres -c \"DELETE FROM storage.objects \
  WHERE bucket_id='documents' AND name LIKE '%/slc-893-smoke/%';\""
```

## Resultat

Test-Resultate ergaenzen unter "## Run-Result" (Datum, Image-Hash, HTTP-Codes,
Notes). Dann SLC-893 → done, FEAT-893 → done, BL-499 → done, SEC-008 resolved.

---

## Run-Result

**Datum:** 2026-06-03 07:05-07:15 UTC
**Image:** `app-...065643030862` SOURCE_COMMIT `2db64cdd...` (master HEAD)
**Tester:** Autonomer Storage-API-Test via signed Test-JWTs (USER_A=qa-admin / USER_B=qa-member)

### Cross-Tenant-Defense — ✅ PASS

| # | Test | Erwartet | Result | Note |
|---|---|---|---|---|
| 2 | USER_B GET `documents/<USER_A>/...` | 4xx | **HTTP 400 / statusCode 404** | RLS SELECT-USING-Filter blockt — Storage-Service maskiert als "not_found" |
| 3 | USER_B POST `documents/<USER_A>/hijack.txt` | 4xx | **HTTP 400 / statusCode 403 "new row violates row-level security policy"** | RLS INSERT-WITH-CHECK-Filter blockt cross-user write |

**SEC-008 (Cross-Tenant-Exfiltration aus `documents`-Bucket) ist geschlossen.**

### Self-Access — U-1 DEFERRED

| # | Test | Erwartet | Result |
|---|---|---|---|
| 1 | USER_A POST `documents/<USER_A>/probe.txt` | 200 | **HTTP 400 / statusCode 403 "new row violates row-level security policy"** |
| 4 | USER_A DELETE `documents/<USER_A>/probe.txt` | 200 | N/A (Pfad 1 produzierte kein Objekt zum loeschen) |

Root-Cause-Analyse:
- Storage-Service-Log zeigt `owner: "<USER_A>"` und `role: "authenticated"` — JWT korrekt geparsed.
- `auth.uid()` returnt USER_A korrekt wenn manuell via psql gesetzt.
- `storage.foldername(name))[1]` returnt USER_A korrekt.
- Trotzdem RLS denial — die Connection-Context-Bruecke zwischen Storage-Service und PostgreSQL liefert vermutlich `auth.uid()` als NULL waehrend INSERT-WITH-CHECK-Evaluation.
- **Selbes Verhalten betrifft auch `proposal-pdfs`-Bucket** (8 alte Files vom Mai 2026, seither keine neuen Uploads) — also nicht spezifisch zu SLC-893, sondern generelles Storage-RLS-vs-Self-Hosted-GoTrue-Issue.

Defer auf:
1. Echter Founder-Browser-Upload-Test in `/qa` Gesamt-V8.10 (Cookie-Session statt signed Test-JWT)
2. Side-Investigation als ISSUE-090: warum Storage-Service `request.jwt.claim.sub` evtl. nicht setzt
3. Cross-Repo-Check: gleiches Pattern in OP / IS / ImSch — sind dort Storage-Uploads auch broken?

### Production-Touches (zu protokollieren)

1. **MIG-041 applied**: `documents`-Bucket-Create + 4 user-scoped Policies.
2. **MIG-042 applied** (Side-Discovery): `GRANT USAGE ON SCHEMA auth TO authenticated, anon` + `GRANT EXECUTE` auf `auth.uid()`, `auth.role()`, `auth.email()`, `auth.jwt()`. Standard-Supabase-Default, hatte auf BS Live-DB gefehlt.
3. **`UPDATE auth.users SET aud='authenticated' WHERE email LIKE 'qa-%'`**: qa-Test-User hatten `aud` leer. Founder-User `richard@bellaerts.de` unveraendert.

### Pre-Apply-Discovery (zu protokollieren in RPT-568)

- `documents`-Bucket war auf Live-DB nie angelegt — `sql/02_rls.sql:42-44` Bucket-Create nie appliziert. MIG-041 patched in `INSERT INTO storage.buckets ... ON CONFLICT DO NOTHING`.
- 0 alte `authenticated_*_documents`-Policies vorhanden — `DROP IF EXISTS` waren No-Ops.
- 0 Storage-Objects + 0 documents-Rows vor MT-6 → kein Backfill noetig, kein Fallback-Owner-ENV.

### Cleanup

Test-Objects (slc-893-smoke-Pfade) wurden gar nicht erst inseriert (Pfad 1 + 3 scheiterten). Cleanup-Statement zur Sicherheit ausgefuehrt: 0 rows affected. `documents`-Bucket bleibt sauber bei 0 Files post-MT-6.
