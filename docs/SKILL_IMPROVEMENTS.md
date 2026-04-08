# Skill Improvements

### IMP-001 — KI-Analyse Cockpit ersetzt statisches Dashboard-Konzept

- Date: 2026-04-08
- Source: User-Feedback bei V2.2 Dashboard Redesign
- Observation: Klassisches Dashboard mit 4 festen KPI-Kacheln + 2 Tabellen wurde als zu statisch empfunden. User arbeitet nicht mit vorgefertigten Ansichten, sondern will ad-hoc fragen was ihn interessiert. Paradigmenwechsel: Das Dashboard wird zum KI-gesteuerten Analyse-Cockpit. Natürlichsprachliche Fragen (Text + Voice) → dynamisch generierte Darstellungen (Charts, Tabellen, KPIs). Voraussetzung: alle Business-Daten müssen cross-module verknüpft und per LLM abfragbar sein.
- Suggested Improvement: Nächste Implementationsschritte:
  1. LLM-Query-Layer: Natürliche Sprache → SQL/API-Abfragen (Claude Sonnet via Bedrock)
  2. Dynamic Rendering Engine: Abfrage-Ergebnisse als Chart, Tabelle oder KPI-Card darstellen
  3. Gespeicherte Abfragen + Preset-Filter als Quick-Access
  4. Cross-System-Integration (Blueprint, OS, Intelligence Studio Daten einbeziehen)
- Affected Area: Dashboard, Datenmodell (Verknüpfung aller Module), API-Layer, LLM-Integration
- Status: open
