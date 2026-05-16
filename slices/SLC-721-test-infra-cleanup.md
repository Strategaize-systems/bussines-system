# SLC-721 — Test-Infra-Cleanup (Seed-Multi-User qa-admin + vitest-RLS Path-Alias + Coolify-DB-Apply)

## Metadata
- **Slice ID:** SLC-721
- **Version:** V7.2
- **Feature:** FEAT-721
- **Status:** planned
- **Priority:** High (V7.5-Vorbereitung — Multi-User-Test-Confidence)
- **Created:** 2026-05-16
- **Estimated Effort:** ~3-4h (3 MTs)
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** optional (Test-Infra-Patch, kein Production-Code-Touch, geringes Regression-Risiko)
- **Architecture:** DEC-202 (Manual-Apply), DEC-203 (resolve.alias), DEC-204 (qa-admin-UUID)
- **Reihenfolge-Pflicht:** Erster (und einziger) V7.2-Slice. MT-1 + MT-2 koennen parallel laufen. MT-3 zwingend zuletzt (haengt von MT-1 + MT-2 ab).

## Goal

Schliesst die 3 Accepted Risks aus V7.1 REL-030:

1. **BL-471** — `cockpit/scripts/create-qa-test-users.mjs` + `cockpit/scripts/seed-multi-user.ts` um qa-admin (UUID `0...0ba001`, role=admin) erweitern. Beseitigt /qa-Session-Overhead bei zukuenftigen rollen-basierten Permission-Smokes.

2. **BL-473 / ISSUE-073** — `npm run seed:multi-user` einmalig auf Coolify-DB applicieren. Macht `__tests__/rls/v7-rls-matrix.test.ts` lauffaehig (96 Cases SKIP → PASS).

3. **BL-474 / ISSUE-074** — `cockpit/vitest.rls.config.ts` Path-Alias-Resolver via `resolve.alias` (DEC-203). Macht 7 Bulk-Reassign-Test-Suites lauffaehig (0 → 7).

**Erwartetes Endergebnis:** `npm run test:all` 897 PASS (779 jsdom + 118 RLS), 0 FAIL, 0 SKIP.

## Scope

### In Scope

**MT-1 — qa-admin im Seed-Script (BL-471, DEC-204)**

Files MOD:
- `cockpit/scripts/seed-multi-user.ts` (~5 Edits: Konstante + 3 Funktions-Erweiterungen)
- `cockpit/scripts/create-qa-test-users.mjs` (~1 Edit: 3. Eintrag in TEST_USERS-Array)

**MT-2 — vitest.rls.config.ts Path-Alias (ISSUE-074, DEC-203)**

Files MOD:
- `cockpit/vitest.rls.config.ts` (~4-Zeilen-Patch: import path + resolve.alias-Block)
- `docs/KNOWN_ISSUES.md` (Faktenkorrektur: ISSUE-074 behauptet `vite-tsconfig-paths` "bereits in dependencies" — falsch, NICHT installiert. DEC-203 waehlt deshalb resolve.alias-Pattern.)

**MT-3 — Coolify-DB Apply + Test-Suite-Verifikation + Records-Sync**

Actions:
- SSH zu 91.98.20.191 → `docker exec <app-container>` → seed-multi-user.ts + create-qa-test-users.mjs ausfuehren
- Lokal: `npm run test:all` gegen Coolify-DB → erwartet 897 PASS
- Records-Sync: ISSUE-073 + ISSUE-074 + BL-471 + BL-473 + BL-474 auf `resolved`, SLC-721 + FEAT-721 auf `done`

### Out of Scope

- **Container-Bootstrap-Hook in Dockerfile** (per DEC-202 auf V7.3+ BL-475 verschoben)
- **Seed-Daten-Volumen-Aenderung** (existing 50/200/100/500 bleibt — Architecture-Skizze)
- **vitest-RLS-Test-Erweiterung** (keine neuen Test-Cases, nur SKIP → PASS)
- **Production-Code-Touch** (keine Server-Action, keine Server-Component, keine RLS-Policy-Aenderung)
- **Schema-Migration** (keine SQL-Migration)
- **CI-Pipeline-Anbindung** (V8+)

## Acceptance Criteria

- **AC1** `cockpit/scripts/seed-multi-user.ts` exportiert (oder verwendet intern) Konstante `TEST_ADMIN_ID = "00000000-0000-0000-0000-0000000ba001"`. `seedTeamAndProfiles` legt qa-admin als 7. Profile mit role=admin + team_id=TEST_TEAM_ID an. `seedAuxiliaryFixtures` legt 1 Record pro (meetings/proposals/email_messages/calls) fuer qa-admin an. `reset()`-Owners-Array enthaelt qa-admin.
- **AC2** `cockpit/scripts/create-qa-test-users.mjs` TEST_USERS-Array enthaelt 3 Eintraege: qa-admin (`0...0ba001`, role=admin), qa-teamlead (`0...000078`, role=teamlead), qa-member (`0...000081`, role=member).
- **AC3** `cockpit/vitest.rls.config.ts` hat `import path from "node:path"` + `resolve: { alias: { "@": path.resolve(__dirname, "./src") } }`-Block (Pattern aus `cockpit/vitest.config.ts:21-23` portiert).
- **AC4** Coolify-DB enthaelt nach MT-3-Apply 7 qa-* Profile (qa-admin + qa-teamlead + 5 qa-members) + Volumen-Daten + Aux-Fixtures. Verifikation:
  ```
  psql -c "SELECT email, role FROM profiles p JOIN auth.users u ON u.id=p.id WHERE email LIKE 'qa-%@strategaize.test' ORDER BY role"
  ```
  → 3 Rows (qa-admin/qa-teamlead/qa-member). Plus:
  ```
  psql -c "SELECT role, count(*) FROM profiles WHERE team_id='00000000-0000-0000-0000-000000000077' GROUP BY role"
  ```
  → admin=1, teamlead=1, member=5.
- **AC5** `npm run test:rls -- v7-rls-matrix` laeuft mit 96 Cases (vorher 96 SKIP, jetzt mind. 90+ PASS — exact 96 PASS bei sauberer Seed-Daten-Konsistenz).
- **AC6** `npm run test:rls -- bulk-reassign` laedt 7 Test-Suites (vorher 0 weil Path-Alias-Resolver fehlte) und laeuft sie.
- **AC7** `npm run test:all` total 897 PASS (779 jsdom-Default + 118 RLS), 0 FAIL, 0 SKIP. Bei Test-Failures durch Schema-Drift: ISSUE notieren, V7.2-Scope NICHT erweitern.
- **AC8** Idempotenz: 2x Seed-Run liefert identischen Endzustand (selbe Row-Counts, keine Duplikate, keine Constraint-Errors).
- **AC9** ISSUE-074 Wording in KNOWN_ISSUES.md korrigiert (`vite-tsconfig-paths` NICHT in dependencies, DEC-203 waehlt resolve.alias-Pattern stattdessen).
- **AC10** Records-Sync: SLC-721 + FEAT-721 status=`done`, ISSUE-073 + ISSUE-074 + BL-471 + BL-473 + BL-474 status=`resolved`/`done`. STATE.md Phase auf `qa` (vor /qa-Schritt) bzw. `stable` (nach /deploy).

## Micro-Tasks

### MT-1: qa-admin im Seed-Script + create-qa-test-users.mjs (~30 Min)
- **Goal:** qa-admin als 3. Test-Rolle in Seed-Script + Auth-User-Script integrieren, idempotent.
- **Files:**
  - `cockpit/scripts/seed-multi-user.ts` (MOD)
  - `cockpit/scripts/create-qa-test-users.mjs` (MOD)
- **Expected behavior:**
  - `seed-multi-user.ts` legt 7 Profile statt 6 an (qa-admin als 7. mit role=admin, team_id=TEST_TEAM_ID, display_name="[TEST] Test-Admin"). qa-admin bekommt 4 Aux-Fixtures (meetings/proposals/email_messages/calls = 4 Records).
  - `create-qa-test-users.mjs` TEST_USERS-Array hat 3 Eintraege inkl. qa-admin (email `qa-admin@strategaize.test`, password `QaV72-Admin!`, id `0...0ba001`).
  - Beide Scripts sind idempotent (existing Pattern: probe-then-update bzw. DELETE-then-INSERT mit ON CONFLICT DO UPDATE fuer profiles).
- **Verification:**
  - Code-Inspection: `grep TEST_ADMIN_ID cockpit/scripts/seed-multi-user.ts` zeigt Konstante und 3 Verwendungen (Profile-INSERT, Aux-Fixtures-Loop, reset-Owners-Array).
  - `grep qa-admin cockpit/scripts/create-qa-test-users.mjs` zeigt 1 TEST_USERS-Eintrag.
  - Optional: Lokaler Dry-Run `TEST_DATABASE_URL=... npx tsx cockpit/scripts/seed-multi-user.ts --reset` (gegen lokale DB falls vorhanden, sonst skippen → MT-3 deckt das ab).
- **Dependencies:** keine

### MT-2: vitest.rls.config.ts Path-Alias-Resolver (~15 Min)
- **Goal:** `@/`-Imports in `__tests__/team/*` lauffaehig machen via `resolve.alias` (DEC-203, kein Plugin).
- **Files:**
  - `cockpit/vitest.rls.config.ts` (MOD)
  - `docs/KNOWN_ISSUES.md` (MOD — ISSUE-074-Wording-Fix)
- **Expected behavior:**
  - `vitest.rls.config.ts` importiert `path` aus `node:path` und definiert `resolve: { alias: { "@": path.resolve(__dirname, "./src") } }`-Block analog `vitest.config.ts:21-23`.
  - `npm run test:rls -- bulk-reassign` laedt jetzt 7 Test-Suites statt 0.
  - KNOWN_ISSUES.md ISSUE-074-Beschreibung korrigiert: `vite-tsconfig-paths` ist NICHT in dependencies, deshalb wurde resolve.alias-Pattern gewaehlt (Architecture-Verweis DEC-203).
- **Verification:**
  - `grep "resolve.alias" cockpit/vitest.rls.config.ts` zeigt den neuen Block.
  - Lokal (oder am Schluss in MT-3): `npm run test:rls -- bulk-reassign` schlaegt nicht mehr mit `Cannot find package '@/lib/db/pg'` fehl.
- **Dependencies:** keine (kann parallel zu MT-1 laufen)

### MT-3: Coolify-DB Apply + npm run test:all + Records-Sync (~1.5-2h)
- **Goal:** MT-1+MT-2-Aenderungen auf Coolify-DB scharf schalten, alle 897 Tests gruen sehen, alle Cockpit-Records synchronisieren.
- **Files:**
  - SSH-Run gegen 91.98.20.191 (kein Repo-File-Touch)
  - `docs/STATE.md` (MOD)
  - `docs/KNOWN_ISSUES.md` (MOD — ISSUE-073 + ISSUE-074 auf resolved)
  - `slices/INDEX.md` (MOD — SLC-721 auf done)
  - `features/INDEX.md` (MOD — FEAT-721 auf done)
  - `planning/backlog.json` (MOD — BL-471 + BL-473 + BL-474 auf done)
- **Expected behavior:**
  - Coolify-DB enthaelt nach Apply 7 qa-* Profile + 50/200/100/500 Volumen-Daten + Aux-Fixtures fuer alle 6 Owner-Rollen.
  - auth.users hat 3 qa-* Eintraege mit korrekten Passwoertern.
  - `npm run test:all` gegen TEST_DATABASE_URL Coolify-DB liefert 897 PASS / 0 FAIL / 0 SKIP.
  - 2x Idempotenz-Re-Run liefert identischen Endzustand.
- **Verification:**
  - SSH-Sequenz (siehe SSH-Snippet weiter unten).
  - `docker exec <app-container> npx tsx cockpit/scripts/seed-multi-user.ts` Output zeigt "Seeded N rows" + Exit-Code 0.
  - `docker exec <app-container> node /tmp/create-qa-test-users.mjs` Output zeigt "OK created/updated: qa-admin / qa-teamlead / qa-member" + "Test-User-Setup done."
  - psql-Check (siehe AC4) zeigt 7 Profile.
  - Lokal `npm run test:all` gruen.
  - Records-Sync via Edit-Tool fuer alle 5 Files.
- **Dependencies:** MT-1 (Seed-Script-Erweiterung) + MT-2 (vitest-Config-Fix). Wenn MT-1 oder MT-2 nicht fertig, kann MT-3 nicht starten.

## SSH-Snippet fuer MT-3 (Coolify-Apply)

```bash
# 1. Container-Name ermitteln
ssh root@91.98.20.191 'docker ps --format "{{.Names}}" | grep ^app-'
# → app-k9f5pn5upfq7etoefb5ukbcg-...

# 2. Seed-Script ausfuehren
ssh root@91.98.20.191 'POSTGRES_PW=$(docker exec supabase-db-k9f5pn5upfq7etoefb5ukbcg-... printenv POSTGRES_PASSWORD); \
  docker exec -e TEST_DATABASE_URL="postgresql://postgres:${POSTGRES_PW}@supabase-db:5432/postgres" \
  app-k9f5pn5upfq7etoefb5ukbcg-... \
  npx tsx /app/scripts/seed-multi-user.ts'

# 3. Auth-User-Script ausfuehren (Script auf Container kopieren, dann ausfuehren)
ssh root@91.98.20.191 'docker cp app-k9f5pn5upfq7etoefb5ukbcg-.../app/scripts/create-qa-test-users.mjs /tmp/ && \
  docker exec app-k9f5pn5upfq7etoefb5ukbcg-... node /app/scripts/create-qa-test-users.mjs'

# 4. Verifikation: 7 Profile + 3 auth.users
ssh root@91.98.20.191 'docker exec supabase-db-k9f5pn5upfq7etoefb5ukbcg-... \
  psql -U postgres -d postgres \
  -c "SELECT role, count(*) FROM profiles WHERE team_id='\''00000000-0000-0000-0000-000000000077'\'' GROUP BY role"'
```

(Container-Suffix `-065629...` aktuell laut /post-launch RPT-429. Per Regel `coolify-test-setup.md` ist `supabase-db` jetzt stabiler DNS-Alias, kein Suffix-Drift mehr noetig.)

## Test-Strategie

### Unit-Tests
- Keine neuen Unit-Tests in V7.2-Scope. Existing 779 jsdom-Tests muessen weiterhin gruen bleiben (Regression-Check).

### Integration-Tests (Coolify-DB-Live-Tests)
- MT-3 verifiziert via `npm run test:rls`:
  - v7-rls-matrix.test.ts: 96 PASS (vorher 96 SKIP)
  - bulk-reassign.test.ts: 7 Suites lauffaehig (vorher 0 wegen Path-Alias)
  - aggregate-queries.test.ts: 6 PASS (ISSUE-075 bereits resolved)
  - drilldown-*.test.ts: bestehende Tests, kein Drift erwartet
- Plus `npm run test:all` als Gesamt-Check.

### Idempotenz-Check
- `npm run seed:multi-user` zweimal hintereinander ausfuehren, Row-Counts vor + nach 2. Run vergleichen → identisch.

### Negativ-Tests
- Keine — V7.2 hat keine neuen Server-Actions oder UI-Pfade, die zu sichern waeren.

## Architecture Decisions

Per /architecture V7.2 (RPT-431):
- **DEC-202** Container-Bootstrap = Manual-Apply via docker exec (kein Dockerfile-Hook)
- **DEC-203** Path-Alias via `resolve.alias` (Pattern-Reuse aus vitest.config.ts, kein vite-tsconfig-paths-Plugin)
- **DEC-204** qa-admin UUID `0...0ba001` + role=admin + TEST_TEAM_ID 077

## Risks

| Risk | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| Seed-Script verletzt CHECK-Constraint in V7-Schema bei qa-admin-INSERT | niedrig | Mittel | Schema-Inspektion vor MT-1: `\d profiles` zeigt CHECK auf role-enum + NOT NULL display_name; qa-admin erfuellt beides. |
| Coolify-DB Container-Suffix-Drift sabotiert SSH-Snippet | niedrig (dank `supabase-db`-Alias seit 2026-05-14) | Niedrig | Container-Name zur Laufzeit per `docker ps` aufloesen, nicht hardcoden. Plus `supabase-db`-Alias-Pattern (siehe `reference_coolify_supabase_db_alias.md`). |
| RLS-Matrix-Tests entdecken neuen Drift (z.B. fehlende Policy fuer qa-admin admin-Rolle) | niedrig | Hoch | Wenn ein V7-RLS-Test rot wird wegen tatsaechlichem Bug: ISSUE notieren, NICHT in V7.2 fixen — V7.2-Scope sauber halten. Findings landen in V7.3+ Sprint. |
| Time-Box von 3-4h gerissen durch SSH/Apply-Reibung | mittel | Mittel | Wenn MT-3 ueber 2h zieht: pausieren, ISSUE-Liste schreiben, Handoff schreiben, naechste Session weiter. |
| Vitest-rls-Tests scheitern wegen Auth-Token-Drift (qa-admin-Login funktioniert nicht) | niedrig | Mittel | RLS-Tests nutzen Direct-pg-Connections mit `SET LOCAL ROLE` und JWT-Claims (siehe coolify-test-setup.md SAVEPOINT-Pattern), kein echter Auth-Token-Login. qa-admin-Auth-User ist nur fuer Browser-Smoke. |

## Worktree-Isolation

**Optional.** Begruendung: Test-Infra-Patch (3 Files modifiziert), kein Production-Code-Touch, geringes Regression-Risiko gegen V7.1-deployed-Code. Wenn der User die Standard-Branch-Workflow-Hygiene moechte, neuen Branch `slc-721-test-infra-cleanup` anlegen. Andernfalls direkt auf `main` mit atomarem Commit pro MT.

**Empfehlung:** Branch `slc-721-test-infra-cleanup`, MT-1 + MT-2 als separate Commits, MT-3 als 1 Commit (Apply + Records-Sync), dann Merge zu main + User-Coolify-Deploy.

## Commit-Sequenz

Per Rule `git-release.md` (Atomic commits per micro-task):

```
1. feat(SLC-721/MT-1): qa-admin in seed-multi-user.ts + create-qa-test-users.mjs (BL-471)
2. fix(SLC-721/MT-2): vitest.rls.config.ts resolve.alias for @/ imports (ISSUE-074)
3. chore(SLC-721/MT-3): apply seed:multi-user to coolify-db + sync records (ISSUE-073)
```

## Deployment

Per Rule `feedback_manual_deploy.md`: User deployt manuell ueber Coolify nach SLC-721 + Gesamt-/qa V7.2 + /final-check + /go-live.

**ABER:** V7.2 ist Test-Infra-only. Es gibt keinen Production-Code-Change, der ein Coolify-Redeploy nuetzlich machen wuerde. Stattdessen:
- MT-3 macht die Live-Aenderung (Seed-Daten in Coolify-DB).
- Production-App-Container braucht KEIN Redeploy (kein Code-Change im laufenden Image).
- /deploy V7.2 = Records-Sync-only + Tag-Release-Notes "REL-031 Test-Infra-Cleanup, no app-image change".

Per Rule `git-release.md` und `deploy.md`: V7.2 ist ein "data-only release", nicht ein "code release". Wird in /deploy entsprechend dokumentiert.

## Verifikations-Plan Gesamt

| Schritt | Pass-Kriterium |
|---|---|
| MT-1 Code-Review | `grep TEST_ADMIN_ID seed-multi-user.ts` 3+ Treffer, `grep qa-admin create-qa-test-users.mjs` 1+ Treffer |
| MT-2 Code-Review | `grep "resolve.alias" vitest.rls.config.ts` 1 Treffer, KNOWN_ISSUES.md ISSUE-074 korrigiert |
| MT-3 Apply | Seed-Script Output "Seeded N rows" Exit 0, Auth-Script "Test-User-Setup done" |
| MT-3 DB-Verifikation | psql 3 qa-* auth.users + 7 qa-* profiles |
| MT-3 Test-Suite | `npm run test:all` 897 PASS 0 FAIL 0 SKIP |
| MT-3 Idempotenz | Seed-Re-Run identisch |
| Gesamt-/qa V7.2 | alle ACs gruen, keine Regression in V7.1-Code-Pfaden |

**Pass-Condition fuer Slice-Done:** alle 10 ACs erfuellt, Records-Sync vollstaendig, 897 PASS.

## Dependencies & Reihenfolge

- MT-1 + MT-2 parallel moeglich (verschiedene Files, keine Konflikte)
- MT-3 zwingend nach MT-1 + MT-2 (haengt von beider Output ab)
- Slice insgesamt baut auf V7-RLS-Matrix-Test-Suite (existing seit SLC-701)

## Reuse / Pattern-Reuse

Per Rule `strategaize-pattern-reuse.md`:
- **vitest.rls.config.ts resolve.alias:** Pattern-Quelle `cockpit/vitest.config.ts:21-23` (Default-jsdom-Config). 1:1 portieren.
- **Seed-Script ON CONFLICT DO UPDATE:** Pattern-Quelle `cockpit/scripts/seed-multi-user.ts:75-101` (seedTeamAndProfiles fuer Teamlead/Member). qa-admin Profile-INSERT 1:1 nach selbem Pattern.
- **create-qa-test-users.mjs probe-then-update-or-create:** Pattern-Quelle existing in derselben File. Neuer Eintrag erweitert TEST_USERS-Array, keine Logik-Aenderung.
- **SSH-Apply-Sequenz:** Pattern-Quelle Rule `sql-migration-hetzner.md` (Container-Name ermitteln + `docker exec`-Run + Verifikation).
- **Test-Strategie:** Pattern-Quelle Rule `coolify-test-setup.md` (Vitest via node:20 im Docker-Netzwerk gegen Coolify-DB).

Keine Pattern-Neuerfindung. Keine neue Dependency. Keine neue Konvention.
