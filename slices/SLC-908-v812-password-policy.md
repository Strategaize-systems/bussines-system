# SLC-908 — V8.12 Passwort-Policy 12+ + zxcvbn (BL-502, Phase 2.2)

## Status

- Version: V8.12
- Feature: FEAT-922
- Backlog: BL-502
- Status: planned
- Priority: Medium
- Created: 2026-06-09

## Purpose

Strategaize-Cross-Repo-Origin-Pattern: Mindestlaenge 12 + zxcvbn-Score >=3 fuer NEU gesetzte Passwoerter (DEC-278: Bestands-User unangetastet bis Pre-Customer-Live-Slot). Schliesst Sicherheitsluecke aus Cross-Repo-Audit (BS hat bisher keine zentrale Passwort-Policy).

Pattern wird Cross-Repo-Reuse-Quelle fuer OP/IS/ImSch.

## In Scope

- `cockpit/src/lib/auth/password-policy.ts` — `validatePasswordStrength(pw): { ok, score, reasons }`
- zxcvbn ^4.x npm-Dep mit **Dynamic-Import** (R-V812-3 Bundle-Size-Mitigation)
- Caller-Edits in:
  - `cockpit/src/app/auth/set-password/actions.ts`
  - `cockpit/src/app/auth/accept-invitation/actions.ts`
- `cockpit/src/components/auth/PasswordStrengthIndicator.tsx` — Tailwind Progress-Bar (Score 0-4 Visual)
- Vitest 4+ zxcvbn-Score-Faelle (0/1/2/3/4) + Mindestlaenge-Edge-Cases

## Scope-Klarstellung (DEC-278)

- **NUR neue Passwoerter**: Caller in set-password + accept-invitation
- **NICHT migriert**: bestehende User-Sessions, Login-Flow (signInWithPassword)
- **Force-Reset fuer Bestands-User**: Pre-Customer-Live-Slot

## Out of Scope

- Force-Reset fuer Bestands-User (Pre-Customer-Live-Slot)
- Score-4-Threshold (DEC-282: Score 3 fuer Internal-Test-Mode)
- Pwned-Password-Check via HaveIBeenPwned-API (V8.x-Polish-Slot)
- Cross-Repo-Mirror OP+IS (separate Slots)

## Acceptance Criteria

- AC-908-1: `validatePasswordStrength('short')` returnt `{ok: false, score: 0, reasons: ['min_length']}`
- AC-908-2: `validatePasswordStrength('correcthorsebatterystaple')` returnt `{ok: true, score: 4, reasons: []}` (zxcvbn-Score 4)
- AC-908-3: `validatePasswordStrength('Test1234567X')` (12+ Chars, mittlere Score) returnt `{ok: true, score: 3, reasons: []}` (Hard-Floor erfuellt)
- AC-908-4: `validatePasswordStrength('aaaaaaaaaaaa')` (12+ Chars, score 0) returnt `{ok: false, score: 0, reasons: ['weak_strength']}`
- AC-908-5: zxcvbn ist via dynamic import geladen → Bundle-Analyzer zeigt Lazy-Chunk fuer set-password/accept-invitation-Routes (NICHT im Main-Bundle)
- AC-908-6: set-password/actions.ts + accept-invitation/actions.ts rejecten Passwoerter mit `ok: false` (Returns Error-Message), accepten Passwoerter mit `ok: true`
- AC-908-7: PasswordStrengthIndicator Component zeigt Score 0-4 als 5-color Progress-Bar (red/orange/yellow/lightgreen/green)
- AC-908-8: TSC=0, ESLint=0, Vitest GREEN

## Risks

- **R-908-1 (R-V812-3)**: zxcvbn-Bundle-Size ~700KB minified bricht Initial-Load — **Mitigation**: Dynamic-Import + Lazy-Chunk-Verifikation via `next build` Output
- **R-908-2**: Score-3-Threshold faengt typische Founder-Passwoerter NICHT ab (zxcvbn-Score von realistischen Passwoertern oft <=2) — **Mitigation**: Hard-Floor Length 12 als zusaetzlicher Filter (DEC-282)

## Dependencies

- DEC-278 (Scope nur neue Passwoerter) ✓
- DEC-282 (Score-Threshold 3) ✓

## Micro-Tasks

### MT-1: password-policy.ts Helper-Function
- Goal: `validatePasswordStrength(pw)` mit dynamic-import zxcvbn
- Files: `cockpit/src/lib/auth/password-policy.ts`, `cockpit/src/lib/auth/__tests__/password-policy.test.ts`, `cockpit/package.json` (+zxcvbn ^4.x)
- Expected: Async function, returnt `{ok, score: 0-4, reasons: string[]}`. Reasons: `'min_length'` wenn <12, `'weak_strength'` wenn score<3
- Verification: Vitest mind. 6 Test-Cases (4 zxcvbn-Scores + 2 Length-Edge-Cases) GREEN
- Dependencies: none

### MT-2: Caller-Edit set-password/actions.ts
- Goal: `validatePasswordStrength(newPassword)` vor Supabase-updateUser call
- Files: `cockpit/src/app/auth/set-password/actions.ts`, `cockpit/src/app/auth/set-password/__tests__/actions.test.ts`
- Expected: `ok: false` → `return { error: reasons.join(', ') }`, `ok: true` → proceed
- Verification: Vitest mind. 2 Test-Cases (rejected weak, accepted strong)
- Dependencies: MT-1

### MT-3: Caller-Edit accept-invitation/actions.ts
- Goal: Analog MT-2 fuer Invite-Flow
- Files: `cockpit/src/app/auth/accept-invitation/actions.ts`, `cockpit/src/app/auth/accept-invitation/__tests__/actions.test.ts`
- Expected: Analog
- Verification: Vitest GREEN
- Dependencies: MT-1

### MT-4: PasswordStrengthIndicator Component
- Goal: Tailwind 5-Segment Progress-Bar (Score 0-4), live-updated via onChange
- Files: `cockpit/src/components/auth/PasswordStrengthIndicator.tsx`, `cockpit/src/components/auth/__tests__/PasswordStrengthIndicator.test.tsx`
- Expected: Props `{password: string}`, debounced (300ms) zxcvbn-Call, Color-Stages: 0=red, 1=orange, 2=yellow, 3=lightgreen, 4=green + Score-Label
- Verification: Vitest mind. 3 Test-Cases (empty, weak, strong)
- Dependencies: MT-1

### MT-5: UI-Wiring in set-password + accept-invitation Pages
- Goal: PasswordStrengthIndicator unter Password-Input in beiden Pages
- Files: `cockpit/src/app/auth/set-password/page.tsx`, `cockpit/src/app/auth/accept-invitation/page.tsx`
- Expected: Visual-Indicator live-updated waehrend User tippt
- Verification: TSC=0, ESLint=0
- Dependencies: MT-4

### MT-6: Bundle-Size-Verifikation
- Goal: `npm run build` Output bestaetigt zxcvbn als Lazy-Chunk
- Files: keine Code-Aenderung (Verifikation)
- Expected: Build-Output zeigt zxcvbn-Chunk size + NICHT in Main-Bundle Section
- Verification: AC-908-5 PASS, Output dokumentiert in `qa/SLC-908-bundle-analysis.md` (NEW)
- Dependencies: MT-1..MT-5

## Pattern-Reuse

- Keine — BS V8.12 ist Origin (per RPT-608 Pattern-Reuse-Audit)
- Pattern wird Cross-Repo-Reuse-Quelle fuer OP V9.x+ + IS V4.x+ + ImSch V3.x+

## Done-Gate

- `validatePasswordStrength` exportiert + 6+ Vitest-Tests GREEN
- set-password + accept-invitation enforcen Policy via Server-Action
- PasswordStrengthIndicator visuell verifiziert in set-password-Page (Manual-Smoke)
- Bundle-Size: zxcvbn als Lazy-Chunk dokumentiert

## Aufwand

~1.5-2h Code-Side + ~0.5h /qa = ~2-2.5h. **Single-Session-machbar.**
