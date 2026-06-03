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

_Pending Coolify-Redeploy + Live-Smoke-Run._
