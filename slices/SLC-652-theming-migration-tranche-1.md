# SLC-652 — Theming-Migration Tranche 1 (BL-441 Phase B: Pipeline + Proposals)

## Metadata
- **Slice ID:** SLC-652
- **Version:** V6.5
- **Feature:** FEAT-651
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-08
- **Estimated Effort:** ~1.5-3h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped (atomic-commit-revertable, Migration nur Style-Aenderung)
- **Architecture:** DEC-153 (per Page-Bereich, iterativ) + DEC-154 (Manual Page-Smokes)

## Goal

Theming-Migration Tranche 1: Pipeline-Page + Proposals-Page-Bereich auf Brand-Tokens migrieren. ~50 Drift-Stellen (von 178 total).

## Scope

**In Scope:**
- `pipeline-view.tsx` + `kanban-card.tsx` + `pipeline-stage-header.tsx` (Pipeline-Bereich)
- `proposals-client.tsx` + `proposal-editor.tsx` + Sub-Components (Proposals-Bereich)
- Pattern: `bg-[#hex]` → `bg-primary`, `from-[#] to-[#]` → `bg-gradient-primary`, `p-[Npx]` → `p-N`
- Browser-Smoke pro betroffener Page

**Out of Scope:**
- Andere Page-Bereiche (Settings, Mein Tag, Kontakte, Dashboard u.a.) — kommen in spaeteren Tranchen oder V6.6+
- Token-Erweiterung (DEC-152 Phase A bereits durch SLC-651 abgehandelt)
- Visual-Redesign

## Acceptance Criteria

- AC-1: Pipeline-Bereich (mind. 3 Files) migriert: keine `bg-[#xxx]`-arbitrary mehr in den geaenderten Files (ausser begruendete Ausnahmen mit Inline-Kommentar)
- AC-2: Proposals-Bereich (mind. 3 Files) migriert
- AC-3: Migration-Statistik in Slice-Bericht: vorher-Drift-Stellen-Count vs. nachher pro File
- AC-4: `npm run build` clean
- AC-5: `npm run test` 405/405+ PASS
- AC-6: `npm run lint` keine neuen Errors
- AC-7: Browser-Smoke `/pipeline/multiplikatoren` + `/proposals` + 1 Proposal-Detail-Page: visuell unveraendert
- AC-8: Atomic Commits pro File-Bereich: `style(SLC-652/pipeline): migrate to brand tokens` + `style(SLC-652/proposals): migrate to brand tokens`

## Reuse

- SLC-651 Tokens als Pre-Req
- RPT-338 Drift-Statistik (welche Files welche Anzahl Stellen haben)
- V6.4 atomic-commit-pattern

## Risks

- **Visual-Regression:** Token vs. inline-Hex koennte minimale Pixel-Differenz erzeugen wenn Hex-Werte abweichen. Mitigation: Token-Werte exakt aus Style Guide V2, Pre-Migration Inline-Hex-Werte verifizieren.
- **shadcn/ui-Override:** Falls Tokens mit shadcn-CSS-Variablen kollidieren: in dem Fall benannte Tokens (`brand-primary` statt `primary`).
- **Regex-Replace-Falsch-Positives:** Manuelle Per-File-Review noetig, kein Bulk-sed.

## Verification Strategy

- Pre-Migration: pro File Drift-Stellen zaehlen (`rg "bg-\[#" file.tsx | wc -l`)
- Per-File-Migration: Edit + Build + visuelle Dev-Inspection
- Slice-Level: Build + Vitest + Lint + Browser-Smoke pro Page

---

## Micro-Tasks

### MT-1: Pipeline-View Migration
- Goal: pipeline-view.tsx Drift-Stellen auf Tokens migrieren.
- Files: `cockpit/src/app/(app)/pipeline/pipeline-view.tsx`
- Expected behavior: Alle `bg-[#xxx]`/`text-[#xxx]`/`from-[#xxx] to-[#xxx]` ersetzt durch Token-Aequivalente. UA-006 Blue-Gradient bleibt als `bg-gradient-primary`.
- Verification: grep `bg-\[#|text-\[#|from-\[#` in File = 0 Treffer (oder begruendete mit Inline-Kommentar).
- Dependencies: SLC-651 done

### MT-2: Kanban-Card Migration
- Goal: kanban-card.tsx Drift-Stellen migrieren (Schwerpunkt 4 Brand-Primary-Stellen).
- Files: `cockpit/src/app/(app)/pipeline/kanban-card.tsx`
- Expected behavior: `text-[#4454b8] bg-[#4454b8]/5 border border-[#4454b8]/10` → `text-primary bg-primary/5 border-primary/10`.
- Verification: grep clean; Visual-Dev-Inspection Pipeline-Cards.
- Dependencies: SLC-651 done

### MT-3: Pipeline-Stage-Header Migration
- Goal: pipeline-stage-header.tsx Drift-Stellen migrieren.
- Files: `cockpit/src/app/(app)/pipeline/pipeline-stage-header.tsx` (oder benannt)
- Expected behavior: arbitrary Color-Klassen auf Tokens.
- Verification: grep clean; Visual-Inspection Stage-Headers.
- Dependencies: SLC-651 done

### MT-4: Proposals-Client Migration
- Goal: proposals-client.tsx Drift-Stellen migrieren.
- Files: `cockpit/src/app/(app)/proposals/proposals-client.tsx`
- Expected behavior: KPI-Card-Gradients (`gradient="green"` Variant bleibt — Style Guide V2 erlaubt Green-fuer-Won), Primary-CTA bereits in V6.4 SLC-645 UA-006 auf Blue gestellt; weitere Drift-Stellen migrieren.
- Verification: grep clean; Visual-Inspection Proposals-Listing.
- Dependencies: SLC-651 done

### MT-5: Proposal-Editor + Sub-Components Migration
- Goal: proposal-editor.tsx + payment-terms-dropdown.tsx + skonto-section.tsx Drift-Stellen migrieren.
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/proposal-editor.tsx`, sub-components
- Expected behavior: Editor-Layout-Klassen + Sub-Component-Brand-Colors auf Tokens.
- Verification: grep clean; Visual-Inspection Editor.
- Dependencies: SLC-651 done

### MT-6: Migration-Statistik im Slice-Bericht + Atomic Commits
- Goal: Statistik dokumentieren wieviele Drift-Stellen pro File migriert wurden + Atomic Commits.
- Files: keine Code-Files; Commit-Messages
- Expected behavior: Slice-Closing-Report enthaelt Tabelle "vorher-N → nachher-N pro File". 2 Atomic Commits: pipeline + proposals.
- Verification: `git log` zeigt 2 Commits mit Format `style(SLC-652/pipeline)` + `style(SLC-652/proposals)`.
- Dependencies: MT-1..MT-5

### MT-7: Live-Smoke + Browser-Verifikation
- Goal: Visual-Verifikation aller migrierten Pages.
- Files: keine
- Expected behavior: Coolify-Redeploy + Browser-Smoke `/pipeline/multiplikatoren` + `/proposals` + 1 Proposal-Detail.
- Verification: Container healthy; visuell keine Regression.
- Dependencies: MT-6

---

## Definition of Done

- 7 MTs verifiziert (AC-1..AC-8 erfuellt)
- Build + Lint + Vitest clean
- Browser-Smoke 3 Pages gruen
- Atomic Commits gepusht
- /qa als naechster Schritt
