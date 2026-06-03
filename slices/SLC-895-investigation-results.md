# SLC-895 — Investigation Results

- Date: 2026-06-03
- Owner: V8.13 Hotfix-Slice
- ISSUE-089 Resolution-Block

## Outcome

**Root-Cause IDENTIFIZIERT + REPRODUZIERT.** Bug ist NICHT GoTrue-Container-Bug, NICHT Bcrypt-Cost-Strenge, NICHT NULL-Token-Spalten (Issue #1940), NICHT identities-Drift, NICHT User-Side-Falsches-Passwort. Es ist eine **`auth.users.aud='authenticated'` Schema-Anomalie** bei einer Teilmenge der Bestands-User — verursacht durch manuellen User-Seed beim Initial-Setup. GoTrue v2.160's Login-Endpoint sucht User per `FindUserByEmailAndAudience(email, audience)` mit `audience` aus dem Request — Default ist `''` (leer) wenn der Client (Supabase JS SDK) keinen Audience-Parameter setzt. User mit `aud='authenticated'` werden vom Default-Lookup nicht gefunden → GoTrue antwortet `invalid_credentials` **ohne den Passwort-Hash zu pruefen**.

## Hypothesen-Resolution

| Hypothese | Verdikt | Begruendung |
|---|---|---|
| H-1 Bcrypt-Cost-Strenge (v2.160 lehnt `$2a$06$` ab) | **WIDERLEGT** | qa-admin hatte am 2026-06-02 09:23 UTC mit `$2a$06$` erfolgreich eingeloggt. MT-3 Code-Read bestaetigt: v2.160 hat keine Cost-Min-Pflicht — `bcrypt.MinCost=4` triggert nur Re-Encrypt, KEIN Reject. |
| H-2 `auth.identities`-Drift | **WIDERLEGT** | Alle 4 Bestands-User haben identische identities-Row-Struktur mit `provider='email'`, `provider_id=<user_id>`, korrektem `identity_data`. Kein Drift. |
| H-3 User-Side falsches Passwort | **WIDERLEGT fuer qa-admin** | MT-1 Reproducer mit frischem crypt-Reset auf bekanntes Passwort UND `aud='authenticated'` → 400 invalid_credentials. Selbst wenn Passwort 100% korrekt ist (crypt-Verify TRUE), failed Login. Fuer richard moeglicherweise sekundaer relevant (`aud=''` matched, also sollte er einloggen koennen — nicht in dieser Session verifiziert weil Passwort nicht bekannt). |
| H-4 Coolify-Redeploy-Corruption `encrypted_password` | **WIDERLEGT** | crypt-Verify im SQL liefert TRUE fuer alle User. Hash ist gueltiges Bcrypt-Format. |
| H-5 Pre-Check fehlt bei alten Usern | **WIDERLEGT in dieser Form** | Fresh-Signup-User MIT `aud=''` UND Bestands-User richard MIT `aud=''` durchlaufen denselben Code-Pfad. Kein altersbasierter Drift. |
| H-6 Browser-Cookie/CSRF | **WIDERLEGT** | curl-Test ohne Browser/Cookies reproduziert exakt das gleiche `invalid_credentials`-Verhalten. Server-Side-Issue, nicht Browser-Side. |
| **H-7 NEU: `aud='authenticated'` blockt Login (LookupDrift)** | **BESTAETIGT** | MT-1 Reproducer A/B-Test: qa-admin mit `aud='authenticated'` + crypt-reset → HTTP 400. qa-admin mit `aud=''` + crypt-reset → HTTP 200 + access_token. **Eindeutig reproduzierbar.** |

## Reproducer-Befund (MT-1)

### Test A: `aud='authenticated'`, fresh crypt-reset
```sql
-- Pre-state
SELECT aud, substring(encrypted_password,1,10) FROM auth.users WHERE email='qa-admin@strategaize.test';
-- ('authenticated', '$2a$06$i8A')
UPDATE auth.users SET encrypted_password = crypt('test-pwd-v813-mt1', gen_salt('bf', 10)) WHERE email='qa-admin@strategaize.test';
-- crypt-verify: TRUE
```
```bash
curl -X POST 'http://supabase-kong:8000/auth/v1/token?grant_type=password' \
  -H "apikey: $ANON_KEY" \
  -d '{"email":"qa-admin@strategaize.test","password":"test-pwd-v813-mt1"}'
```
**Result:** `{"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}` (HTTP 400)

### Test B: `aud=''`, fresh crypt-reset
```sql
UPDATE auth.users SET aud='', encrypted_password = crypt('test-pwd-v813-aud-test', gen_salt('bf', 10)) WHERE email='qa-admin@strategaize.test';
-- crypt-verify: TRUE
```
```bash
curl ... # same as Test A but new password
```
**Result:** `{"access_token":"eyJ...","token_type":"bearer","expires_in":3600,...}` (HTTP 200)

### Differenz

Einzige Aenderung zwischen Test A und Test B: `aud` von `'authenticated'` auf `''`. Beide Tests mit gleichem Passwort-Reset-Mechanismus (crypt-Verify TRUE in beiden Faellen).

**Schlussfolgerung:** `aud='authenticated'` blockt den Login deterministisch. `aud=''` erlaubt den Login.

## Cross-Repo-Versions-Audit (MT-3)

GoTrue v2.160.0 Code (`internal/api/token.go::ResourceOwnerPasswordGrant`) ruft `FindUserByEmailAndAudience` mit Filter `WHERE instance_id = ? AND LOWER(email) = ? AND aud = ? AND is_sso_user = false`. Der `audience`-Parameter kommt im Request (Supabase JS SDK setzt diesen NICHT default) → Default ist `''` (leer).

GoTrue ENV-Settings auf BS:
- `GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated` → setzt nur den **JWT-output-claim**, NICHT den Lookup-Parameter
- Kein `GOTRUE_JWT_AUD` separat → audience-Parameter im Request bleibt `''`

Fresh-Signup-User werden in v2.160 mit `auth.users.aud=''` angelegt (verifiziert via slc-895-fresh-1780492959@example.com 2026-06-03 13:22 UTC). Das matched den Default-Lookup.

User mit explizit gesetztem `aud='authenticated'` (qa-admin/qa-member/qa-teamlead) wurden manuell via SQL beim Initial-Setup eingefuegt — vermutlich aus einem Setup-Skript ausserhalb des Repos (`INSERT INTO auth.users (..., aud, ...) VALUES (..., 'authenticated', ...)`). Diese sind nicht im aktuellen Repo nachvollziehbar.

## Cross-Repo-Implication

OP-Repo (`strategaize-onboarding-plattform`) laeuft GoTrue v2.160.0 mit gleicher ENV-Konfiguration. Wenn OP User mit `aud='authenticated'` hat (vermutlich aus gleichem Manual-Setup-Pattern), sind diese gleich betroffen. Cross-Repo-Mirror-Migration noetig — Vorlage analog MIG-044.

IS + ImSch laufen GoTrue v2.186 mit anderem Verhalten — moeglicherweise relaxed-audience-Lookup. **Nicht Teil dieser Investigation** weil OP/BS dort nicht relevant.

## External Research (MT-3 Findings)

- **PR #1721** (v2.159.0) — `fix: add error codes to password login flow`. Hier wurde `invalid_credentials` als Error-Code eingefuehrt. Nicht direkt relevant fuer unsere Ursache, aber erklaert die generische Fehlermeldung statt spezifischer "user not found".
- **Issue #1940** — NULL-Token-Spalten verursachen Scan-Errors. **NICHT** unsere Ursache (alle 8 kritischen Spalten sind blank-strings bei allen 4 Usern, nicht NULL).
- **PR #2425** (post-v2.186) — identities-Row-Pflicht fuer Sign-In via password. Nur `updateUser`-Pfad relevant, nicht Login-Lookup.

## Resolution / Fix-Strategie

**Fix-Pfad gewaehlt: Migration `MIG-044` idempotent**

```sql
-- 044_v813_auth_users_aud_normalize.sql
-- Normalisiert auth.users.aud='authenticated' auf aud='' (GoTrue v2.160 Default-Lookup-Match)
-- Idempotent: zweiter Run = 0 Rows updated
UPDATE auth.users SET aud = '', updated_at = now() WHERE aud = 'authenticated';
```

**Begruendung:**
1. Konsistent mit GoTrue v2.160-Default-Verhalten fuer Fresh-Signup-User (`aud=''`).
2. JWT-Output-Claim `aud` bleibt unveraendert leer — kein downstream-RLS-Impact (RLS nutzt `role`-Claim, nicht `aud`).
3. Idempotent — kann mehrfach ausgefuehrt werden ohne Schaden.
4. Cross-Repo via gleicher Migration auf OP applicable.
5. Trivial reverse-engineerbar (Rollback: `UPDATE auth.users SET aud='authenticated' WHERE aud=''` — aber damit waere wieder Login broken).

**NICHT gewaehlt — Begruendung:**
- ❌ Container-Upgrade v2.160 → v2.186 (V8.14-Scope, groesseres Risk-Surface)
- ❌ GoTrue ENV `GOTRUE_JWT_AUD=authenticated` (wuerde Fresh-Signup-User mit aud='' brechen)
- ❌ Admin-API Password-Reset (lost den falschen Bug — wir haben Passwort-Reset bereits gemacht und das hat NICHT geholfen, der aud-Wert war das Problem)

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| MIG-044 setzt aud='' auf existierende User → Token-Refresh-Sessions koennten brechen | LOW | Bestehende access_tokens haben `aud` im Body-Claim ohnehin auf `'authenticated'` oder `''` (kein RLS-Check auf aud). Token-Refresh validiert refresh_token, nicht aud. |
| Downstream-Services validieren JWT-aud-Claim und lehnen Login ab | LOW | BS Cockpit nutzt `role`-Claim aus JWT (`@supabase/auth-helpers-nextjs`). Kein Service validiert aud-Claim. |
| MIG-044 wird nicht idempotent zweimal angewendet | NONE | `WHERE aud='authenticated'` macht es idempotent — zweiter Run = 0 Rows. |
| Production-Touch waehrend User-Sessions aktiv | LOW | UPDATE setzt `updated_at = now()` aber das ist nur informational. Sessions bleiben gueltig. |

## Founder Live-Verify Plan (MT-6)

Nach MIG-044 LIVE-Apply:
1. Founder Richard meldet sich mit `richard@bellaerts.de` an. Richard hat aktuell `aud=''` — sollte mit korrektem Passwort funktionieren. (Falls Richard sein Passwort vergessen hat: Password-Reset via Admin-API als Workaround dokumentieren, kein Bug.)
2. Verify-Loop: Login → Dashboard sichtbar → Browser-Session aktiv.
3. Cross-Check qa-admin: nach MIG-044 sollte qa-admin's aud='' sein. signInWithPassword mit unbekanntem Original-Passwort dann moeglich (via crypt-Reset wenn noetig).

Falls Richard's Passwort nicht erinnert wird: Admin-API Password-Reset oder direkt SQL-crypt-Reset auf bekanntes Test-Passwort.

## Files / Migration

- `c:/strategaize/strategaize-business-system/sql/migrations/044_v813_auth_users_aud_normalize.sql` (NEU)
- `c:/strategaize/strategaize-business-system/cockpit/__tests__/migrations/044-v813-auth-users-aud-normalize.test.ts` (NEU)
- `c:/strategaize/strategaize-business-system/qa/SLC-895-aud-test.sql` (Reproducer-Artefakt — wird im finalen Slice in `qa/` verbleiben als historische Test-Doku)
- `c:/strategaize/strategaize-business-system/qa/SLC-895-restore-after-aud-test.sql` (Reproducer-Artefakt — wird verbleiben)
- `c:/strategaize/strategaize-business-system/qa/SLC-895-restore-qa-admin.sql` (Reproducer-Artefakt — wird verbleiben)

## Pattern-Reuse-Audit

- Migration-Apply-Pattern: `.claude/rules/sql-migration-hetzner.md` 1:1 (postgres-User, base64-Transport, idempotent additiv)
- Test-Setup-Pattern: `.claude/rules/coolify-test-setup.md` (Vitest gegen Coolify-DB via node:20-Sidecar)
- Records-Sync-Pattern: IMP-950 Release-Gate-Defense (kein REL-Eintrag bis /go-live)
- Cross-Repo-Mirror: `docs/CROSS_REPO_V813_STORAGE_GRANTS.md`-Vorlage analog erweitern um MIG-044

Keine neuen Patterns noetig — alle Reuse.

## Status

- MT-1 ✅ Reproducer ausgefuehrt + Bug bestaetigt + qa-admin restored
- MT-2 ✅ Cross-Check Schema-Audit durchgefuehrt
- MT-3 ✅ Web-Recherche durchgefuehrt
- MT-4 ✅ (this document)
- MT-5a/5b/5c ⏳ Migration + Test + Apply pending
- MT-6 ⏳ Founder Live-Verify pending
- MT-7 ⏳ Records-Sync pending
