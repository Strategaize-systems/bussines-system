# SLC-651 — Theming-Tokens-Setup (BL-441 Phase A)

## Metadata
- **Slice ID:** SLC-651
- **Version:** V6.5
- **Feature:** FEAT-651
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-08
- **Estimated Effort:** ~30-60min
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped (klein, low-risk, atomic-commit-revertable)
- **Architecture:** DEC-152 (BL-441 in 2 Phasen) + DEC-153 (per Page-Bereich)

## Goal

Brand-Tokens in `tailwind.config.ts` einfuehren als Pre-Req fuer alle weiteren V6.5-UI-Slices. Phase A des BL-441 Theming-Sprints.

## Scope

**In Scope:**
- `tailwind.config.ts` erweitern um `colors.primary`/`colors.success`/`colors.warning`/`colors.danger`-Block basierend auf Brand-Hex-Werten
- Optional: `globals.css` mit `@layer components { .bg-gradient-primary }` fuer Gradient-Utility
- 1 Test-File (z.B. mein-tag-client.tsx) mit 2-3 Drift-Stellen migrieren als Beweis das Tokens funktionieren
- Build clean + Vitest gruen

**Out of Scope:**
- Phase B Migration (kommt in SLC-652)
- shadcn/ui-Theme-Override
- Color-Palette-Wechsel

## Acceptance Criteria

- AC-1: `cockpit/tailwind.config.ts` enthaelt unter `theme.extend.colors`: `primary: { DEFAULT: '#4454b8', dark: '#120774' }`, `success: { DEFAULT: '#00a84f', light: '#4dcb8b' }`, `warning: { DEFAULT: '#f2b705' }`, plus `danger` falls vorhanden
- AC-2: `globals.css` enthaelt mindestens `.bg-gradient-primary` Utility-Class (oder Brand-Gradient direkt nutzbar)
- AC-3: 1 Test-File migriert: mindestens 2 Drift-Stellen ersetzt (z.B. `text-[#4454b8]` → `text-primary`); visuell unveraendert
- AC-4: `npm run build` clean, kein TS-Error in geaenderten Files
- AC-5: `npm run test` 405/405+ PASS
- AC-6: `npm run lint` keine neuen Errors (V5.7-Baseline 166/55 unveraendert)
- AC-7: Live-Smoke nach Coolify-Redeploy: betroffene Page laedt ohne Visual-Regression

## Reuse

- `docs/STYLE_GUIDE_REFERENCE.md` als Token-Werte-Quelle
- `cockpit/tailwind.config.ts` bestehender Aufbau (Tailwind 3+ Pattern)
- `cockpit/src/app/globals.css` bestehender `@layer base/components`-Block

## Risks

- **Tailwind-Cache/Build-Drift:** nach config-Aenderung kann `.next/cache` stale sein → vor Live-Smoke Cache-Reset
- **Token-Naming-Konflikt:** Tailwind hat `colors.blue`/`colors.green` als built-in, eigene `primary` ist Custom-Slot — kein Konflikt erwartet
- **shadcn/ui-Konflikt:** shadcn nutzt eigene CSS-Variablen (--primary etc.). Falls Konflikt: Tailwind-Token in `colors.brand.primary` statt `colors.primary` umbenennen

## Verification Strategy

- Pre: `cockpit/tailwind.config.ts` lesen, sicherstellen `theme.extend.colors` existiert oder ergaenzen
- Per-MT: siehe Micro-Tasks
- Slice-Level: Build + Vitest + Lint + 1 Live-Page-Smoke

---

## Micro-Tasks

### MT-1: Tailwind-Tokens definieren
- Goal: Brand-Colors als Tailwind-Tokens in tailwind.config.ts ergaenzen.
- Files: `cockpit/tailwind.config.ts`
- Expected behavior: Unter `theme.extend.colors` neuer Block mit `primary` (DEFAULT + dark), `success` (DEFAULT + light), `warning` (DEFAULT). Tokens werden via Tailwind-JIT verfuegbar als `text-primary`, `bg-primary/10`, etc.
- Verification: `npx tsc --noEmit` clean; Test in MT-3 nutzt Token erfolgreich.
- Dependencies: none

### MT-2: Gradient-Utility-Layer (optional)
- Goal: `.bg-gradient-primary` als wiederverwendbare Utility-Class fuer Brand-Gradient.
- Files: `cockpit/src/app/globals.css`
- Expected behavior: Neuer `@layer components` Block mit `.bg-gradient-primary { @apply bg-gradient-to-r from-[#120774] to-[#4454b8]; }` plus `.bg-gradient-success` analog.
- Verification: `npm run build` clean; Test in MT-3 nutzt Utility-Class.
- Dependencies: MT-1 optional (Utility nutzt aktuell Hex direkt, koennte auf Token-Variable umgestellt werden)

### MT-3: Test-File-Migration als Beweis
- Goal: 1 File mit 2-3 Drift-Stellen auf Token migrieren als Funktions-Beweis.
- Files: `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` (Top-3-Drift-Stellen aus Audit-Liste)
- Expected behavior: Z.B. `text-[#4454b8]` → `text-primary`, `bg-emerald-50 text-[#00a84f]` → `bg-success/10 text-success`. Visuell unveraendert.
- Verification: `npm run build` + `npm run test` clean; visuelle Dev-Inspection (oder Live nach Redeploy) zeigt keine Regression.
- Dependencies: MT-1

### MT-4: Slice-Closing Build + Test + Lint + Records-Sync
- Goal: Slice-Quality-Gate bestaetigen + Records aktualisieren.
- Files: keine Code-Files; `slices/INDEX.md`, `planning/backlog.json` (BL-441 Phase A done)
- Expected behavior: SLC-651 in slices/INDEX auf done; BL-441 description-Update mit Phase-A-Sub-Mark done.
- Verification: `npm run build` + `npm run test` + `npm run lint` alle clean.
- Dependencies: MT-1, MT-2, MT-3

### MT-5: Live-Smoke nach Coolify-Redeploy
- Goal: Verifikation gegen Production-Container.
- Files: keine
- Expected behavior: Coolify-Redeploy auf neuen Commit; Container healthy; betroffene Page (mein-tag) laedt ohne Visual-Regression.
- Verification: `docker ps` (healthy) + Browser-Smoke `https://business.strategaizetransition.com/mein-tag`.
- Dependencies: MT-4

---

## Definition of Done

- 5 MTs verifiziert (AC-1..AC-7 erfuellt)
- Build + Lint + Vitest clean
- Live-Smoke gruen
- Code committed + gepusht (atomic commit `feat(SLC-651/MT-N)`)
- /qa als naechster Schritt
