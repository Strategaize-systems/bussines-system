# SLC-847 — V8.4 Gesamt-QA + Master-Merge + Deploy

- **Feature:** FEAT-824 / BL-488
- **Version:** V8.4
- **Status:** planned
- **Priority:** Blocker
- **Created:** 2026-05-22
- **Estimated:** ~1.5h Code-Side
- **Depends-On:** SLC-841, SLC-842, SLC-843, SLC-844, SLC-845, SLC-846
- **Architecture:** keine eigene DEC (Pflicht-Abschluss-Slice fuer V8.4)
- **Pattern-Reuse:** `feedback_slice_merge_at_end` (Master-Merge erst am Slice-Ende)

## Goal

Gesamt-/qa ueber alle 6 V8.4-Implementation-Slices. Vitest gesamt + Lint + Type-Check + alle 8 Success-Criteria S1-S8 aus FEAT-824 als Live-Smoke. Master-Merge ALLER vorherigen Slice-Branches (kumulativ) auf `main`. Coolify-Redeploy. Cockpit-Records-Update: FEAT-824 → deployed, alle 7 V8.4-Slices done → deployed, BL-488 → done, V8.4-roadmap status released.

## Scope

### IN
- Vitest gesamt (`npm run test:all` oder `npm run test`)
- Lint + Type-Check (`npm run lint`, `npm run build`)
- Live-Smoke aller 8 Success-Criteria aus FEAT-824 S1-S8
- Master-Merge der Worktree-Branches `slc-841..slc-846` (sequentiell oder via Cumulative-Merge-Branch)
- Coolify-Redeploy auf `main` mit Image-Tag-Bump
- Update aller V8.4 Cockpit-Records (planning + slices/INDEX + features/INDEX + STATE + RELEASES.md)
- RPT-V8.4-Deploy-Report

### OUT
- Code-Aenderungen (sind in SLC-841..846)
- Post-Launch-Burn-In (separater /post-launch Step)

## Acceptance Criteria

Aus FEAT-824 Success Criteria S1-S8 (alle zwingend PASS):

- **S1** Tenant-Admin kann DSE im Editor speichern (Browser-Smoke: Login Admin → `/settings/compliance/customer-dse` → Edit + Save → Reload → Inhalt persistiert)
- **S2** Public-URL `/p/strategaize-transition-bv/datenschutz` rendert die DSE ohne Login (HTTP 200, Markdown rendered, `.customer-dse-content` CSS aktiv)
- **S3** Consent-Form zeigt DSE-Link vor Grant/Decline (Live-Smoke: Token-URL → Form hat Link "Datenschutzerklaerung lesen")
- **S4** Mail-Footer enthaelt DSE-URL des sendenden Tenants (Test-Mail an immo@bellaerts.de → HTML-Quelle enthaelt Link)
- **S5** Slug-Generator vermeidet Kollisionen (Vitest 9+ Cases PASS, inklusive Reserved-Slug-Suffix-Append)
- **S6** Default-Seed wird bei Migration eingefuegt fuer alle existierenden Teams (DB-Check: COUNT legal_documents WHERE kind='customer-dse' = COUNT teams = 1)
- **S7** RLS verhindert Cross-Tenant-Zugriff im Editor (Vitest RLS-Tests + Live-Tests)
- **S8** Public-Route ist NICHT auth-gated — Middleware-Whitelist (HTTP-Smoke: `/p/[slug]/datenschutz` HTTP 200 ohne Cookie, NICHT 307)

Zusaetzliche Gesamt-AC:
- **AC9** Vitest gesamt: PASS-Quote nicht schlechter als V8.3-Baseline (1079/1079 + V8.4-neue Tests)
- **AC10** Lint: kein neuer Findings ueber V8.3-Baseline 142e/57w
- **AC11** Build: clean, kein neuer Type-Error
- **AC12** Coolify-Container `app-...` healthy nach Redeploy, RestartCount=0 nach 5 Min
- **AC13** Cockpit-Records-Sync: features/INDEX zeigt FEAT-824 deployed, slices/INDEX zeigt SLC-841..847 deployed, backlog.json BL-488 done, roadmap.json V8.4 released, STATE.md High-Level State `stable` + Last Stable Version V8.4

## Micro-Tasks

### MT-1: Vitest + Lint + Type-Check Gesamt
- Goal: Code-Qualitaet-Gate vor Merge.
- Files: keine (Test-Run + Lint-Run + Build-Run)
- Expected behavior:
  - `npm run test:all` ALLE PASS (V8.3-Baseline 1079 + neue V8.4-Tests: SLC-841 RLS ~6, SLC-842 Slug ~9, SLC-844 Editor-Actions ~4-6, SLC-845 Lookup-Helper ~3-4, SLC-846 Render-Snapshots ~3-4 = ~25-30 neue Tests; Erwartung ~1104-1109/1109)
  - `npm run lint` Findings = V8.3-Baseline 142e/57w (kein neuer Error/Warning)
  - `npm run build` clean, kein neuer Type-Error
- Verification: alle drei Commands exit-code 0, Logs sauber.
- Dependencies: SLC-841..846 alle done

### MT-2: Master-Merge + Coolify-Redeploy
- Goal: Worktree-Branches in `main` mergen + Image-Bump + Redeploy.
- Files: keine (Git-Operationen + Coolify-UI-User-Action)
- Expected behavior:
  - Sequentielle Merge-Reihenfolge: `slc-841` → `slc-842` → `slc-843` → `slc-844` → `slc-845` → `slc-846` in `main`. Bei Konflikten: resolve in Worktree, dann re-merge.
  - Push `main` → Coolify Auto-Deploy ODER User manual Redeploy in Coolify-UI (per `feedback_manual_deploy`-Direktive — User deployt IMMER manuell ueber Coolify)
  - Wartet bis Container healthy + RestartCount=0
- Verification:
  - `git log main --oneline -10` zeigt 6 V8.4-Slice-Merge-Commits
  - Coolify-UI zeigt Image-Tag-Bump + Container "healthy" Status
  - `docker ps --filter name=app-` zeigt RestartCount=0 nach 5 Min
- Dependencies: MT-1

### MT-3: Live-Smoke 8 ACs + Cockpit-Records-Update + RPT
- Goal: End-to-End-Verifikation + Records-Sync.
- Files:
  - `slices/INDEX.md` PATCH (V8.4 Section: SLC-841..847 status `done` → bei MT-3 Setzung auf `done`, nach Burn-In ggf. `deployed`)
  - `features/INDEX.md` PATCH (FEAT-824 status `planned` → `deployed`)
  - `planning/backlog.json` PATCH (BL-488 status `open` → `done`)
  - `planning/roadmap.json` PATCH (V8.4 status `planned` → `released`)
  - `docs/STATE.md` PATCH (High-Level State `architecture` → `stable`, Current Focus + Last Stable Version V8.4)
  - `docs/RELEASES.md` PATCH (neuer REL-XXX V8.4-Eintrag)
  - `reports/RPT-V8.4-Deploy.md` (NEU)
- Expected behavior:
  - Alle 8 Live-Smokes durchgespielt (Browser + curl-HTTP-Smokes)
  - Records-Sync nach Live-Smoke-Bestaetigung
  - RPT mit Outcome + Image-Tag + AC-Trail
- Verification: Cockpit zeigt V8.4 als released, alle Slices done, FEAT-824 deployed, BL-488 done.
- Dependencies: MT-2

## Risks / Notes

- **R1** Merge-Konflikte zwischen Worktree-Branches bei orthogonalen Slices: SLC-845 (consent-page) und SLC-846 (email-lib) sind orthogonal, SLC-841/842 (DB + slug.ts) Foundation, SLC-843 (public-route) und SLC-844 (editor) sind orthogonal Pages. Konflikt-Risiko vor allem in `middleware.ts` (SLC-843), `slices/INDEX.md`, `features/INDEX.md`, `backlog.json`, `roadmap.json` (Records-Updates). Records-Konflikte sind trivial (eigener Cockpit-Records-Block pro Slice).
- **R2** Falls Vitest unerwartete Regression zeigt: SLC-847 ist Blocker — Hotfix-Slice ggf. ergaenzen (SLC-848). User entscheidet ob Hotfix oder Rollback.
- **R3** Coolify-Redeploy + Auto-Deploy-Toggle: User-Direktive `feedback_manual_deploy` — User deployt IMMER manuell ueber Coolify. NICHT automatisch via push triggern.
- **R4** Internal-Test-Mode bleibt aktiv (`feedback_compliance_gate_later`). V8.4-Live = Compliance-Foundation, NICHT Customer-Live. Anwalts-Pruefung deferred.
- **R5** Post-Launch-Burn-In als separater `/post-launch`-Schritt nach 12-24h Coolify-Container-Stability. Nicht in SLC-847.

## Worktree-Isolation

KEIN eigener Worktree-Branch — dieser Slice operiert auf `main` (Merge-Target).

## Done-Definition

- MT-1 Code-Qualitaet-Gate PASS
- MT-2 Master-Merge + Redeploy + Container-Health
- MT-3 8/8 Success-Criteria PASS + Records-Sync + RPT
- `/qa` PASS als Gesamt-QA
- V8.4 released, Cockpit zeigt korrekten Status
