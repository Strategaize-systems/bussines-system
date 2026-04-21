# SLC-611 — Label-Fix + Premium-Styling

## Slice Info
- Feature: FEAT-611
- Priority: High
- Estimated Effort: 2-3 Stunden
- Dependencies: keine

## Goal

"Win-Rate" ueberall durch "Abschlussquote" ersetzen und GoalCard + Tages-Check-Card + KI-Empfehlung-Card auf Premium Look (Style Guide V2) bringen: Gradient-Akzentlinien, Brand-Shadows, hover-Effekte, konsistente Typography.

## Scope

- Label-Fix "Win-Rate" → "Abschlussquote" in 5 Dateien
- GoalCard: Gradient-Akzentlinie, border-2, shadow-lg → hover:shadow-xl, -translate-y-0.5, kompakteres Padding
- DailyActivityCheck-Card: Gradient-Akzentlinie, Premium-Shadows
- KI-Empfehlung-Card: Gradient-Akzentlinie, Premium-Shadows
- Progress-Ring bleibt unveraendert (bereits gut)

## Out of Scope

- ForecastBlock-Umbau (SLC-612)
- Layout-Aenderung (SLC-612)
- Wochen-Check (SLC-613)

## Acceptance Criteria

1. "Win-Rate" ist nirgends mehr sichtbar, ueberall steht "Abschlussquote"
2. GoalCard hat Gradient-Akzentlinie oben (h-1, brand-primary gradient)
3. GoalCard hat border-2, shadow-lg, hover:shadow-xl, -translate-y-0.5
4. Tages-Check-Card und KI-Empfehlung-Card haben Gradient-Akzentlinie
5. npm run build gruen

## Micro-Tasks

### MT-1: Label-Fix "Win-Rate" → "Abschlussquote"
- Goal: Alle Vorkommen von "Win-Rate" durch "Abschlussquote" ersetzen
- Files: `cockpit/src/components/performance/goal-card.tsx`, `cockpit/src/components/performance/forecast-block.tsx`, `cockpit/src/components/goals/goal-form.tsx`, `cockpit/src/components/goals/goal-list.tsx`, `cockpit/src/components/goals/csv-import-dialog.tsx`
- Expected behavior: Ueberall wo "Win-Rate" stand, steht jetzt "Abschlussquote"
- Verification: `grep -r "Win-Rate\|win_rate.*Win\|Win.Rate" cockpit/src/` findet keine UI-Label mehr (nur type-keys wie `win_rate` bleiben)
- Dependencies: none

### MT-2: GoalCard Premium-Styling
- Goal: GoalCard an KPICard-Pattern anpassen (Gradient-Akzentlinie, Shadows, Hover-Effekte, kompakter)
- Files: `cockpit/src/components/performance/goal-card.tsx`
- Expected behavior: Karte hat h-1 Gradient-Akzentlinie oben, border-2, shadow-lg, hover:shadow-xl mit -translate-y-0.5, relative overflow-hidden. Padding kompakter (p-4 statt p-5).
- Verification: npm run build gruen, visuell im Browser pruefen
- Dependencies: MT-1

### MT-3: Tages-Check + KI-Empfehlung Premium-Styling
- Goal: DailyActivityCheck und AiRecommendation Cards mit Gradient-Akzentlinie und Premium-Shadows versehen
- Files: `cockpit/src/components/performance/daily-activity-check.tsx`, `cockpit/src/components/performance/ai-recommendation.tsx`
- Expected behavior: Beide Cards haben Gradient-Akzentlinie (h-1, brand-primary), border-2, shadow-lg, hover:shadow-xl Transition
- Verification: npm run build gruen, visuell im Browser pruefen
- Dependencies: none

## QA-Fokus

- Alle Label-Stellen verifizieren (auch /performance/goals Seite)
- Visueller Check: Gradient-Akzentlinien sichtbar
- Hover-Effekte funktionieren (shadow + translate)
- Progress-Ring unveraendert
- Keine Regression auf anderen Seiten
