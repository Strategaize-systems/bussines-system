# SLC-895 — V8.13 BS ISSUE-089 GoTrue signInWithPassword Investigation + Fix

- Feature: FEAT-813 (V8.13 Storage+Auth Hotfix-Slice)
- Backlog: BL-507
- Status: planned
- Priority: High (PRE-LIVE PFLICHT — Founder-Login muss vor Customer-Live funktionieren)
- Created: 2026-06-03
- Estimated effort: 1-2h Investigation + 30-60min Fix-Implementation
- Audit-Quelle: V8.13 Investigation 2026-06-03 (RPT-573)

## Goal

Klaert die wahre Wurzel von ISSUE-089 + setzt einen reproduzierbaren Fix.

**Investigation-Erkenntnisse Pre-Slice (2026-06-03):**
- signInWithPassword funktioniert grundsaetzlich — Fresh-Signup + Sign-In Test PASS gegen Production-GoTrue v2.160 im V8.13-Investigation-Sweep
- Bestehende User (richard@bellaerts.de + qa-admin@strategaize.test) angeblich broken, aber unklar warum
- GoTrue antwortet konsistent + korrekt `invalid_credentials` fuer wrong-pwd-Tests
- Es ist also **nicht** "alle bestehenden User broken" — die Hypothese aus ISSUE-089 ist zu breit
- Die `crypt()`-Reset-Verifikation aus RPT-569 (`SELECT crypt('pwd', encrypted_password) = encrypted_password` returnt TRUE) wurde nicht reproduziert

**Hypothesen-Liste fuer Investigation:**
1. **H-1**: GoTrue v2.160 bcrypt-Implementation hat strikteres Cost-Factor-Min (lehnt `$2a$06$` ab) → BUT: qa-admin hat $2a$06$ + letzter Login gestern 2026-06-02 09:23 = $2a$06$ war noch gestern OK → spricht GEGEN H-1
2. **H-2**: `auth.identities`-Tabelle hat Drift fuer alte User (vielleicht fehlt provider-Row oder identity_data) → KANN gut sein
3. **H-3**: User glauben sie wissen ihr Passwort aber haben falsches Passwort im Kopf — Trivialer "Passwort vergessen"-Fall → moeglich
4. **H-4**: Coolify-Redeploy hat `encrypted_password` durch Side-Effect korrupt gemacht (z.B. Migration die strict-pw-Hash erzwingt) → unwahrscheinlich aber pruefen
5. **H-5**: GoTrue v2.160 prueft jetzt `email_change_token_current` o.ae. Pre-Check der bei alten Usern fehlt
6. **H-6**: Cookie/CSRF-Issue im Browser des Founders — Server-Side ist OK aber Browser-Side schickt nicht das richtige

## Scope (In)

- Reproduzierbarer `crypt()`-Reset-Test gegen qa-admin als Test-Probe
- `auth.identities`-Audit fuer richard + qa-admin (Drift gegen Fresh-Signup-User)
- GoTrue v2.160 vs v2.186 Changelog-Recherche (Web-Search) auf signInWithPassword-Aenderungen
- Hypothese-Resolution: wenn ein gemeinsamer Faktor identifiziert, Fix-Migration ODER Admin-API-User-Reset
- Live-Verify: Founder kann signInWithPassword nach Fix

## Scope (Out)

- Container-Upgrade GoTrue v2.160 → v2.186 → V8.14 (groesserer Sprint)
- OP gleiche Investigation → erst nach BS-Resolution, dann Cross-Repo wenn auch dort betroffen
- Multi-User-Onboarding-Flow → V8.11 RLS-Sweep + V8.13 Pre-Conditions

## Acceptance Criteria

- **AC-895-1**: Reproducer-Script `qa/SLC-895-issue-089-reproduce.sh` (oder Doku) das deterministisch ISSUE-089 nachstellt ODER widerlegt
- **AC-895-2**: Root-Cause dokumentiert in `slices/SLC-895-investigation-results.md` mit gewinnender Hypothese (H-1..H-6 oder neue)
- **AC-895-3**: Fix-Implementation passend zur Root-Cause:
  - **Bei H-1 / H-4 / H-5 (Schema-/Bcrypt-/Container-Bug)**: Migration ODER GoTrue-ENV-Anpassung ODER Admin-API-Reset
  - **Bei H-2 (identities-Drift)**: Migration die fehlende `auth.identities`-Rows fuer alte User idempotent ergaenzt
  - **Bei H-3 (User-Side)**: Admin-API Password-Reset fuer Founder + qa-admin mit Doku
  - **Bei H-6 (Browser-Side)**: Doku fuer Founder mit Browser-Cookie-Cleanup-Steps
- **AC-895-4**: Live-Verify: Founder Richard erfolgreich signInWithPassword auf Production-BS (selbst-bestaetigt)
- **AC-895-5**: ISSUE-089 in `docs/KNOWN_ISSUES.md` → `Status: resolved` mit Resolution-Block
- **AC-895-6**: Cross-Repo-Impact dokumentiert: ist OP auch betroffen? Wenn ja, separater OP-Slice

## Risks

- **R-1 MEDIUM** — Investigation koennte > 1h dauern wenn keine Hypothese eindeutig matcht. **Mitigation:** Timebox auf 2h. Falls dann noch unklar: Fallback-Fix via Admin-API Password-Reset fuer alle 4 betroffenen User (H-3-Workaround), Container-Upgrade auf V8.14 als finale Loesung.
- **R-2 LOW** — Production-Touch beim Test (qa-admin Passwort wird neu gesetzt). **Mitigation:** qa-admin ist Test-User, neuer Wert dokumentiert im Slice-Notes. Reset-Token dokumentiert.
- **R-3 LOW** — Founder muss aktiv im Live-Verify mitmachen. **Mitigation:** AC-895-4 ist explizit User-Pflicht-Schritt, dokumentiert im Live-Smoke-Block.

## Micro-Tasks

### MT-1: Reproducer-Script gegen qa-admin
- Goal: Deterministischer Test ob signInWithPassword nach crypt()-Reset wirklich failt
- Files:
  - `qa/SLC-895-issue-089-reproduce.sh` (neu) — SSH+psql+curl-Sequenz
- Steps:
  1. `UPDATE auth.users SET encrypted_password=crypt('test-pwd-v813', gen_salt('bf', 10)) WHERE email='qa-admin@strategaize.test';`
  2. Verify: `SELECT crypt('test-pwd-v813', encrypted_password) = encrypted_password;` → TRUE
  3. signInWithPassword via curl auf Kong → erwartet access_token (success) oder invalid_credentials (Bug bestaetigt)
  4. Cleanup: optional Password zurueck-setzen oder dokumentieren-und-merken
- Verification: Script-Output zeigt klares PASS/FAIL
- Dependencies: none

### MT-2: auth.identities + auth.users Cross-Check Fresh-Signup vs. Bestand
- Goal: Drift identifizieren zwischen funktionierenden Fresh-Signup-Usern und broken Bestands-Usern
- Files:
  - `slices/SLC-895-identities-diff.md` (neu) — Audit-Output
- Queries:
  - Schema-Diff `auth.users` columns
  - Row-Diff fuer ein Fresh-Signup-User vs richard vs qa-admin (welche Felder, welche Null-States, welche identities-Joins)
  - Provider-Identity-Pruefung: gibt es `auth.identities`-Row mit `provider='email'` fuer alle 4 User?
- Verification: Audit-Doc mit klarer Drift-Liste
- Dependencies: MT-1

### MT-3: GoTrue v2.160 Changelog + Issue-Tracker-Recherche
- Goal: Bekannte signInWithPassword-Bugs in v2.160.0 finden
- Web-Search: github.com/supabase/auth (formerly gotrue) Releases v2.160.0 + v2.160.1 + v2.161 + Issues
- Files:
  - `slices/SLC-895-investigation-results.md` (Section "External Research")
- Verification: Klare Aussage ob bekannter Bug + Fix-Strategie aus Community
- Dependencies: parallel zu MT-1+MT-2

### MT-4: Hypothese-Resolution + Fix-Decision
- Goal: Auf Basis MT-1..MT-3 die Root-Cause-Hypothese festlegen + Fix-Strategie
- Files:
  - `slices/SLC-895-investigation-results.md` (Section "Resolution")
- Output: Eine der 4 Fix-Pfade aus AC-895-3
- Verification: Manuelles Review
- Dependencies: MT-1, MT-2, MT-3

### MT-5: Fix-Implementation
- Goal: Konkrete Fix-Aktion ausfuehren
- Files: (abhaengig von Root-Cause)
  - Migration-Pfad: `sql/migrations/044_v813_issue_089_fix.sql` + Migration-Test
  - Admin-Reset-Pfad: `scripts/v813-user-reset.mjs` mit Admin-API
  - ENV-Pfad: Coolify-ENV-Update dokumentiert
  - Browser-Pfad: User-Anleitung in `docs/KNOWN_ISSUES.md`
- Verification: Reproducer-Script aus MT-1 returnt jetzt PASS
- Dependencies: MT-4

### MT-6: Founder Live-Verify
- Goal: Richard meldet sich live an
- Files: (Live-Smoke-Block in Slice-Notes)
  - Coordination mit Founder
- Verification: Founder selbst-bestaetigt "Login funktioniert wieder"
- Dependencies: MT-5

### MT-7: Records-Sync + Cross-Repo-Check
- Goal: ISSUE-089 → resolved + OP-Cross-Repo-Test
- Files:
  - `docs/KNOWN_ISSUES.md` — ISSUE-089 Status: resolved + Resolution-Block
  - `docs/MIGRATIONS.md` — falls MIG-044 vorhanden
  - `slices/INDEX.md` — SLC-895 → done
  - `features/INDEX.md` — FEAT-813 → deployed (wenn SLC-894 + SLC-895 beide done)
  - `planning/backlog.json` — BL-507 → done
  - `planning/roadmap.json` — V8.13 → released
  - `docs/STATE.md` — Current Focus update
  - `docs/RELEASES.md` — REL-045 (V8.13) angelegt
  - OP-Test ob auch betroffen — Notiz in `docs/CROSS_REPO_V813_STORAGE_GRANTS.md` ergaenzen
- Verification: Cockpit zeigt SLC-895 done + ISSUE-089 resolved + V8.13 released
- Dependencies: MT-1..MT-6

## Pattern-Reuse-Audit

- crypt()-Reset-Pattern: Standard PostgreSQL + pgcrypto
- Admin-API User-Reset: Supabase GoTrue Admin-API (`/admin/users/{id}` PUT mit `password`-Feld)
- Migration-Apply: `.claude/rules/sql-migration-hetzner.md`
- Live-Smoke-Coordination mit Founder: bekanntes Pattern aus V8.10 SLC-893 MT-7

## Cross-Repo-Implications

Nach MT-4 Hypothese-Resolution: wenn Root-Cause Container-Versions-spezifisch ODER Init-SQL-spezifisch, dann ist OP auch betroffen (gleicher GoTrue v2.160). OP-Cross-Repo-Test mit echtem User-Login auf OP-Server (159.69.207.29) post-Fix.
