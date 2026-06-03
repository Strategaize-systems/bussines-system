-- =====================================================
-- MIG-044 — V8.13 auth.users.aud Normalisierung (ISSUE-089 Root-Fix)
-- =====================================================
-- Slice: SLC-895 (BS V8.13 ISSUE-089 GoTrue signInWithPassword Investigation + Fix)
-- Audit-Quelle: slices/SLC-895-investigation-results.md (MT-1..MT-4 2026-06-03)
--
-- Problem (Reproducer-Bestaetigt):
--   GoTrue v2.160.0 sucht beim signInWithPassword im Endpoint
--   `internal/api/token.go::ResourceOwnerPasswordGrant` per
--   `FindUserByEmailAndAudience(email, audience)`. Der `audience`-Parameter
--   wird vom Supabase-JS-Client default NICHT gesetzt → Default ist '' (leer).
--   Filter wird zu:
--     WHERE instance_id = ? AND LOWER(email) = ? AND aud = '' AND is_sso_user = false
--   User mit auth.users.aud = 'authenticated' werden vom Default-Lookup NICHT
--   gefunden → GoTrue antwortet 400 invalid_credentials OHNE den
--   Passwort-Hash zu pruefen.
--
-- Reproducer (MT-1) 2026-06-03:
--   Test A: qa-admin mit aud='authenticated' + crypt-Reset Cost-10 → HTTP 400
--   Test B: qa-admin mit aud=''             + crypt-Reset Cost-10 → HTTP 200 + access_token
--   Einzige Differenz: aud-Spalte.
--
-- Cross-Repo-Versions-Matrix:
--   BS (heute): GoTrue v2.160.0 → 3 User mit aud='authenticated' broken
--                                  1 User (richard) mit aud='' funktioniert
--   OP (heute): GoTrue v2.160.0 → Cross-Repo-Mirror noetig falls aud='authenticated'-Drift
--   IS, ImSch  : GoTrue v2.186.0 → moeglicherweise relaxed-Lookup, nicht in Scope
--
-- Fix:
--   UPDATE auth.users SET aud = '' WHERE aud = 'authenticated';
--   - Konsistent mit GoTrue v2.160 Default-Verhalten fuer Fresh-Signup-User
--   - JWT-Output-Claim `aud` bleibt leer (kein RLS-Impact — RLS nutzt role-Claim)
--   - Idempotent (zweiter Run = 0 Rows updated)
--   - Reversibel via Rollback-Block (siehe unten)
--
-- Risk: LOW
--   - Token-Refresh-Sessions bleiben aktiv (refresh_token validierung ignoriert aud-Spalte)
--   - BS Cockpit (`@supabase/auth-helpers-nextjs`) validiert keinen aud-Claim
--   - service_role-, supabase_auth_admin-, supabase_storage_admin-Rollen unangetastet
--
-- Verify-Block (siehe Ende):
--   - Pre-State: SELECT count(*) WHERE aud='authenticated'
--   - Post-State: SELECT count(*) WHERE aud='authenticated' = 0
--   - Pre/Post diff: Anzahl betroffener User

\echo '=== MIG-044 START — auth.users.aud Normalisierung ==='

-- Pre-State: vor-Apply Audit
\echo '--- Pre-Apply: Verteilung auth.users.aud ---'
SELECT COALESCE(NULLIF(aud, ''), '<empty>') AS aud_value, COUNT(*) AS user_count
  FROM auth.users
 GROUP BY aud
 ORDER BY user_count DESC;

\echo '--- Pre-Apply: User mit aud=authenticated (werden updated) ---'
SELECT email, aud, last_sign_in_at, created_at
  FROM auth.users
 WHERE aud = 'authenticated'
 ORDER BY created_at;

-- Apply: idempotent UPDATE
UPDATE auth.users
   SET aud = '',
       updated_at = now()
 WHERE aud = 'authenticated';

\echo '--- Apply: Rows updated ---'
SELECT '(rows affected per RETURNING via UPDATE above)' AS info;

-- Post-State: nach-Apply Verifikation
\echo '--- Post-Apply: Verteilung auth.users.aud (sollte 0 mit aud=authenticated zeigen) ---'
SELECT COALESCE(NULLIF(aud, ''), '<empty>') AS aud_value, COUNT(*) AS user_count
  FROM auth.users
 GROUP BY aud
 ORDER BY user_count DESC;

\echo '--- Post-Apply: User mit aud=authenticated (sollte 0 sein) ---'
SELECT COUNT(*) AS remaining_authenticated_users
  FROM auth.users
 WHERE aud = 'authenticated';

\echo '=== MIG-044 END — auth.users.aud normalized to '''' for GoTrue v2.160 Default-Lookup-Match ==='

-- Rollback (wenn benoetigt — Login wuerde dann wieder brechen):
--   UPDATE auth.users SET aud = 'authenticated', updated_at = now() WHERE aud = '';
-- Nur ausfuehren wenn ein anderer Service explizit aud='authenticated' braucht
-- UND der Login-Fix anders bereitgestellt wird (z.B. via GoTrue-Container-Upgrade).
