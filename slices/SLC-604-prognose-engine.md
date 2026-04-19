# SLC-604 — Prognose-Engine

## Slice Info
- Feature: FEAT-602, FEAT-603
- Priority: High
- Estimated Effort: 1 Tag
- Dependencies: SLC-601 (Schema), SLC-603 (Ziele)

## Goal

Backend-Logik fuer Soll-Ist-Berechnung, Pipeline-gewichtete Prognose, historische Prognose und Delta-Berechnung. Rein Backend — kein UI in diesem Slice.

## Scope

- `/lib/goals/calculator.ts` — Prognose-Engine
- Server Action: getGoalProgress(goalId) → GoalProgress
- Berechnungslogik fuer revenue, deal_count, win_rate
- Pipeline-gewichtete Prognose (nutzt pipeline_stages.probability)
- Historische Prognose (Tempo-Hochrechnung)
- Delta-Berechnung (fehlende Deals/EUR)
- Mindest-Schwelle (nicht genug Daten)

## Out of Scope

- UI-Darstellung (SLC-606)
- KI-Empfehlung (SLC-607)

## Acceptance Criteria

1. getGoalProgress liefert: currentValue, targetValue, progressPercent, pipelineForecast, historicForecast, combinedForecast, delta, dealsNeeded
2. Revenue-Ziel: IST = SUM(deals.value WHERE status=won AND closed_at IN range)
3. Deal-Count-Ziel: IST = COUNT(deals WHERE status=won AND closed_at IN range)
4. Win-Rate-Ziel: IST = won / (won + lost) * 100
5. Pipeline-gewichtet: SUM(deals.value * pipeline_stages.probability / 100 WHERE status=active)
6. Historisch: ist_pro_tag * gesamt_tage_im_zeitraum
7. Produktspezifische Ziele: Berechnung filtert ueber deal_products.product_id
8. Mindest-Schwelle: Bei zu wenig Daten → hasEnoughData: false
9. `npm run build` gruen

## QA-Fokus

- Berechnungskorrektheit: Manuell nachrechnen mit Testdaten
- Edge Case: Keine Won-Deals → IST = 0, Prognose basiert nur auf Pipeline
- Edge Case: Keine aktiven Pipeline-Deals → Pipeline-Prognose = 0
- Edge Case: Erster Tag des Zeitraums → historische Prognose nicht sinnvoll

### Micro-Tasks

#### MT-1: GoalProgress Type + Calculator Grundstruktur
- Goal: Types und Grundstruktur der Prognose-Engine
- Files: `types/goals.ts` (erweitern), `lib/goals/calculator.ts`
- Expected behavior: GoalProgress Interface definiert. calculateGoalProgress(goal) → GoalProgress Grundstruktur. Placeholder-Implementierung.
- Verification: `npm run build` gruen
- Dependencies: none

#### MT-2: Revenue-Berechnung
- Goal: IST-Berechnung und Prognose fuer Revenue-Ziele
- Files: `lib/goals/calculator.ts`
- Expected behavior: currentValue = SUM wonDeals. pipelineForecast = SUM activeDeals * probability. historicForecast = Tempo-Hochrechnung. Produktfilter wenn product_id gesetzt.
- Verification: `npm run build` gruen
- Dependencies: MT-1

#### MT-3: Deal-Count + Win-Rate Berechnung
- Goal: IST + Prognose fuer deal_count und win_rate Ziele
- Files: `lib/goals/calculator.ts`
- Expected behavior: deal_count: COUNT statt SUM. win_rate: won/(won+lost)*100, Mindest-Schwelle 5 abgeschlossene Deals.
- Verification: `npm run build` gruen
- Dependencies: MT-2

#### MT-4: Server Action getGoalProgress
- Goal: Server Action die Calculator aufruft und Ergebnis zurueckgibt
- Files: `app/actions/goals.ts` (erweitern)
- Expected behavior: getGoalProgress(goalId) laedt Ziel aus DB, ruft Calculator auf, liefert GoalProgress. getGoalsWithProgress(userId, period) liefert alle aktiven Ziele mit Progress.
- Verification: `npm run build` gruen
- Dependencies: MT-3
