# SLC-861 — V8.6 Test-Hygiene-Bundle (ISSUE-084 + ISSUE-085)

- **Feature:** BL-493 (NEU)
- **Version:** V8.6
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-26
- **Estimated:** ~45-60 Min (5 Test-Files + 1 Script + Records)
- **Depends-On:** V8.5 STABLE (REL-039)
- **Architecture:** Keine — reine Test-Layer-Hygiene, kein Production-Code beruehrt, keine DECs

## Goal

V8.4+V8.5-Burn-In-Followup: 2 Test-Hygiene-Issues die seit V8.4 als false-negative-FAIL bzw. pre-existing-TSC-Drift offen sind, in einem Bundle abraeumen. Plus Pre-Commit-Drift-Detection ergaenzen damit gleichartige Drifts zukuenftig sofort sichtbar werden statt erst beim naechsten /qa-Lauf.

- **ISSUE-084**: legal-documents-rls.test.ts 4 von 7 Tests FAIL durch UNIQUE-Konflikt mit MIG-038-Phase-5-Default-Seed (Tenant-A hat schon eine customer-dse-Row aus Default-Seed, Test-INSERT fuer gleichen Tenant kollidiert mit `UNIQUE(tenant_team_id, kind)` 23505)
- **ISSUE-085**: 8 TSC-Errors in 4 unrelated Test-Files nach Next.js 16 + TypeScript-Major-Upgrade (useVoiceCapture/reverse-charge-revert/skonto-revert/vies-client). Vitest gruen, aber `npx tsc --noEmit` zeigt sie. Production-Build skipt Tests via tsconfig.exclude → kein Production-Bug, aber Test-Confidence-Erosion.

## Scope

### IN
- `__tests__/rls/legal-documents-rls.test.ts` Default-Seed-Backup+Restore-Pattern in beforeAll/afterAll (oder beforeEach-Cleanup mit Tenant-A-DELETE-all)
- `cockpit/src/components/ki-workspace/hooks/__tests__/useVoiceCapture.test.tsx` Mock-Calls-Cast (Z.69)
- `cockpit/src/lib/proposal/reverse-charge-revert.test.ts` Patch-Type-Cast (Z.15)
- `cockpit/src/lib/proposal/skonto-revert.test.ts` Patch-Type-Cast (Z.18)
- `cockpit/src/lib/validation/vies-client.test.ts` Process.env-Type-Lockerung (Z.13/17/21/105/224)
- `package.json` scripts.`test:tsc` neu (`tsc --noEmit` auf cockpit/src + cockpit/__tests__)
- KNOWN_ISSUES.md ISSUE-084 + ISSUE-085 auf `resolved` setzen mit Resolution-Trail
- planning/backlog.json BL-493 done

### OUT
- Aenderung der Production-Source-Types in `vies-client.ts`, `reverse-charge-revert.ts`, `skonto-revert.ts`, `useVoiceCapture.ts` (Fix-Strategie: Test-side cast oder minimaler Type-Loosening — keine semantischen Signatur-Aenderungen)
- CI-Pipeline-Integration des `test:tsc`-Scripts (User-Action via Hooks oder npm-Pre-Commit, optional)
- Andere pre-existing Tech-Debt-Items (Sonner-Hydration-ISSUE-078, BL-442-Duplicate-ISSUE-079, postcss-CVE-ISSUE-058) — V9+ Defer
- Komplett-RLS-Test-Refactor mit Tenant-B-only-Pattern (out-of-scope, Variante (b) `beforeEach`-Default-Seed-Backup ist pragmatischer)

## Acceptance Criteria

- **AC1** `__tests__/rls/legal-documents-rls.test.ts` 7/7 PASS gegen Coolify-DB nach Re-Setup-Pattern (Default-Seed-Backup in beforeAll → DELETE in beforeEach → Re-INSERT in afterAll)
- **AC2** `useVoiceCapture.test.tsx` TSC clean (mock.calls-Cast per `feedback_vitest_mock_calls_typescript_cast`)
- **AC3** `reverse-charge-revert.test.ts` TSC clean (Patch-Object-Cast)
- **AC4** `skonto-revert.test.ts` TSC clean (Patch-Object-Cast, gleicher Mechanismus)
- **AC5** `vies-client.test.ts` TSC clean (5 Errors weg, Strategy entweder Test-side `as NodeJS.ProcessEnv`-Cast ODER Source-Side `env: { VIES_ENABLED?: string }`-Loosening)
- **AC6** `package.json` `scripts.test:tsc` neu, ruft `tsc --noEmit -p tsconfig.json` mit Test-Files included (vermutlich separater tsconfig.test.json noetig falls Production-tsconfig Test-Excludes hat)
- **AC7** `npx tsc --noEmit` ueber gesamten Test-Scope **0 Errors** (ISSUE-085-Baseline 8 Errors → 0 Drift)
- **AC8** `npm run test` 1135/1135 PASS bleibt (kein Regression durch Test-Refactor)
- **AC9** `npm run test:rls` (oder direkter Vitest-Run im node:20 Coolify-Setup) 163/163 PASS (vs Baseline 159 PASS + 4 FAIL aus ISSUE-084)
- **AC10** `npm run test:tsc` exit 0 (kein Output-Spam)
- **AC11** Build clean (`npm run build` exit 0)
- **AC12** Lint clean (kein neuer ESLint-Error vs V8.5-Baseline 142e/57w)
- **AC13** KNOWN_ISSUES.md ISSUE-084 + ISSUE-085 `Status: resolved` mit Resolution-Trail-Sentence
- **AC14** slices/INDEX.md SLC-861 done + planning/backlog.json BL-493 done + roadmap.json V8.6 `released` (oder bleibt `active` bis /deploy — siehe Records-Update-Logik)

## Micro-Tasks

### MT-1: legal-documents-rls.test.ts Default-Seed-Backup-Pattern (ISSUE-084-Fix)

- **Goal:** 4 false-negative-FAILs gruen drehen ohne RLS-Suite-Logik zu aendern
- **Files:** `cockpit/__tests__/rls/legal-documents-rls.test.ts` (modify, ca. +25 -2 Zeilen in beforeAll/beforeEach/afterAll)
- **Expected behavior:**
  - `beforeAll`: nach Tenant-B-INSERT zusaetzlich Backup-Variable `defaultSeedRows` setzen via `SELECT id, tenant_team_id, kind, content_md, updated_by, updated_at FROM legal_documents WHERE tenant_team_id IN (TENANT_A_TEAM_ID, TENANT_B_TEAM_ID)` (vermutlich nur 1 Row Tenant-A-Default).
  - `beforeEach`: zusaetzlich zum bestehenden DELETE auch `DELETE FROM legal_documents WHERE tenant_team_id IN (TENANT_A_TEAM_ID, TENANT_B_TEAM_ID) AND kind = 'customer-dse'` — alle Default-Seed-Rows weg vor jedem Test.
  - `afterAll`: vor dem `DELETE teams WHERE id=Tenant-B` zuerst Re-INSERT der `defaultSeedRows` (idempotent via ON CONFLICT DO NOTHING) — Production-State restauriert.
  - Tests selbst unveraendert (alle 7).
- **Verification:**
  - Coolify-Test-Setup-Lauf via `docker run --rm --network k9f5pn5upfq7etoefb5ukbcg --network <coolify-net> -v /opt/business-system-test/cockpit:/app -w /app -e TEST_DATABASE_URL='...' node:20 npx vitest run __tests__/rls/legal-documents-rls.test.ts`
  - Erwartung: 7/7 PASS (statt 3/7 PASS + 4/7 FAIL)
  - Post-Run: `SELECT count(*) FROM legal_documents WHERE tenant_team_id = TENANT_A_TEAM_ID AND kind='customer-dse'` returnt 1 (Default-Seed restauriert)
- **Dependencies:** keine

### MT-2: useVoiceCapture.test.tsx Mock-Calls-Cast (ISSUE-085 #1)

- **Goal:** TS2493 in Z.69 weg
- **Files:** `cockpit/src/components/ki-workspace/hooks/__tests__/useVoiceCapture.test.tsx` (modify, 1 Zeile)
- **Expected behavior:** `expect(fetchMock.mock.calls[0][0]).toBe("/api/transcribe");` → `expect((fetchMock.mock.calls as unknown as Array<Array<string>>)[0][0]).toBe("/api/transcribe");`
  - Pattern per Memory `feedback_vitest_mock_calls_typescript_cast` (OP V7.2 SLC-141 MT-4 etabliert)
- **Verification:** `npx tsc --noEmit cockpit/src/components/ki-workspace/hooks/__tests__/useVoiceCapture.test.tsx` exit 0
- **Dependencies:** keine

### MT-3: reverse-charge-revert.test.ts + skonto-revert.test.ts Patch-Object-Cast (ISSUE-085 #2+#3)

- **Goal:** TS2559 in beiden Files weg
- **Files:**
  - `cockpit/src/lib/proposal/reverse-charge-revert.test.ts` (modify, 1 Zeile in Z.15-16)
  - `cockpit/src/lib/proposal/skonto-revert.test.ts` (modify, 1 Zeile in Z.18-19)
- **Expected behavior:**
  - Beide Files: `const titlePatch: { title?: string } = { title: "neu" };` + `patchTouches...(titlePatch)` → `patchTouches...({ title: "neu" } as unknown as ...TouchingPatch)`. Lokale `titlePatch`-Variable kann weg oder als cast-Variable bleiben.
  - Test-Intent bleibt: dokumentieren dass ein Patch ohne RC-/Skonto-Keys `false` zurueckgibt — der Type-Cast erlaubt das structurell-andere Patch-Objekt fuer den Test-Aufruf.
- **Verification:** `npx tsc --noEmit cockpit/src/lib/proposal/{reverse-charge,skonto}-revert.test.ts` exit 0. Vitest run beider Files PASS (8 + 10 Tests gemeinsam).
- **Dependencies:** keine

### MT-4: vies-client.test.ts Process.env-Type-Loosening (ISSUE-085 #4)

- **Goal:** 5 TSC-Errors weg, ohne `lookupVatId` Production-Signatur invasiv zu aendern
- **Files:**
  - `cockpit/src/lib/validation/vies-client.ts` (modify ggf., Signature `env` Parameter-Type lockern auf `{ VIES_ENABLED?: string }` ODER `Record<string, string | undefined>` — TBD nach Inspect der 5 Error-Stellen)
  - `cockpit/src/lib/validation/vies-client.test.ts` (modify, ggf. zusaetzliche Casts)
- **Expected behavior:**
  - Variante A (Test-side cast, minimal-invasiv): Test passt `{} as NodeJS.ProcessEnv` oder `{} as unknown as NodeJS.ProcessEnv` ueberall wo `env`-Mock uebergeben wird.
  - Variante B (Source-Side, cleaner-API): `isViesEnabled(env: { VIES_ENABLED?: string } = process.env)` + analog fuer andere Functions in vies-client.ts die env-Param haben. Process.env structural-compatible → Production-Call bleibt clean.
  - Implementation entscheidet vor Ort welche Variante (Inspection-Pflicht der 5 Error-Stellen — wenn alle 5 isoliert in env-Mock-Stellen, Variante B; wenn quer durch, Variante A).
- **Verification:** `npx tsc --noEmit cockpit/src/lib/validation/vies-client.test.ts` exit 0. Vitest vies-client.test.ts alle PASS (Anzahl je nach test count).
- **Dependencies:** keine

### MT-5: package.json scripts.test:tsc (Prevention)

- **Goal:** Pre-Commit/Pre-Push-Drift-Detection. Naechstes mal wenn ein Test-File TSC-Drift bekommt, sieht das der Agent sofort.
- **Files:**
  - `cockpit/package.json` (modify, scripts-Block: `"test:tsc": "tsc --noEmit -p tsconfig.test.json"`)
  - `cockpit/tsconfig.test.json` (create ggf., extends tsconfig.json + include `["src/**/*.test.ts", "src/**/*.test.tsx", "__tests__/**/*.ts"]` + exclude {})
- **Expected behavior:**
  - `npm run test:tsc` exit 0 nach MT-1..MT-4
  - Bei zukuenftiger Test-File-Aenderung mit TSC-Drift: exit non-zero mit klarem Error
- **Verification:**
  - `npm run test:tsc` exit 0
  - Manuelles Negativ-Test: dummy Type-Error in einem Test-File einbauen, `npm run test:tsc` exit non-zero, dummy zurueckgenommen
- **Dependencies:** MT-2 + MT-3 + MT-4

### MT-6: Records-Update + Verification-Aggregat

- **Goal:** Slice abschliessen, Cockpit synchron, /qa-ready
- **Files:**
  - `slices/INDEX.md` (modify, SLC-861-Section + SLC-861-Eintrag mit Status done)
  - `planning/backlog.json` (modify, BL-493-Eintrag mit version V8.6, status done, title "V8.6 SLC-861 Test-Hygiene-Bundle (ISSUE-084 + ISSUE-085)")
  - `planning/roadmap.json` (modify, V8.6-Eintrag von "planned" auf "active" oder "released" je nach Deploy-Status — hier `active` weil kein Deploy noetig, Test-only)
  - `docs/KNOWN_ISSUES.md` (modify, ISSUE-084 + ISSUE-085 auf Status `resolved` mit Resolution-Trail-Sentence + Datum 2026-05-26)
  - `docs/STATE.md` (modify, Current Focus + Phase update)
- **Expected behavior:** Cockpit-View bei naechstem Refresh zeigt SLC-861 done + V8.6 active/released + ISSUE-084+085 resolved.
- **Verification:** Manual-Cockpit-Inspect ODER `git status` + Git-Diff-Review der 5 Files.
- **Dependencies:** MT-1..MT-5

## Verification (Slice-Aggregat)

- `npm run test` 1135/1135 PASS (Baseline gehalten, Refactors haben keine Vitest-Regression eingebaut)
- `npm run test:tsc` exit 0 (8 TSC-Errors → 0)
- `npm run test:rls` (oder Coolify-Test-Setup-Lauf) 163/163 PASS (4 ISSUE-084-FAILs → 0)
- `npm run build` exit 0
- `npm run lint` 142e/57w (kein Drift vs V8.5-Baseline)

## Risiken

- **R1 (Low)** MT-1 Backup-Restore-Pattern in afterAll koennte bei abnormem Test-Abbruch (Container-Kill, Exception) den Default-Seed nicht restaurieren → Production-DSE-Seed weg. Mitigation: idempotenter ON-CONFLICT-DO-NOTHING + Manual-Restore-Snippet in Slice-Spec dokumentiert. Test-Lauf wird gegen Coolify-Live-DB ausgefuehrt → defensive Operation-Pflicht.
- **R2 (Low)** MT-4 Variante B (Source-Side-Loosening): Production-Caller von `lookupVatId` koennten von `NodeJS.ProcessEnv`-Type-Hint abhaengen (z.B. fuer Auto-Completion). Mitigation: Inspect aller Caller vor Variant-Choice, Variante A als Fallback.
- **R3 (Low)** MT-5 `tsconfig.test.json` koennte Pfad-Auflosung anders machen als Production-tsconfig → False-Positives. Mitigation: extends Production-tsconfig + nur include/exclude override.
- **R4 (Very Low)** TEST_DATABASE_URL nicht persistent auf /opt/business-system-test — Setup-Step kann ggf. erneut noetig sein. Per `reference_coolify_test_setup` Standard-Pattern.

## Worktree-Isolation

**Skip** per `feedback_no_coolify_branch_switch_ever` + Delivery-Mode internal-tool + Scope ist Test-Files-only (kein Production-Code). Direkt auf `main` arbeiten. Risiko: 0 — Tests koennen kein Production-Code-Verhalten brechen.

## Follow-Up nach SLC-861

- `/qa` SLC-861 — Pflicht-Verifikation aller 14 ACs
- Kein /deploy noetig (Test-Only-Slice → Coolify-Image unveraendert, kein Redeploy)
- V8.6 als Active-Version-Marker im Cockpit
- V9-Discovery offen bei realer User-Need-Discovery
