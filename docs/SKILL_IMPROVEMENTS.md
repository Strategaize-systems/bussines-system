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

### IMP-003 — SQL-Migration Workflow: Container-Discovery vor SQL-Ausgabe

- Date: 2026-04-09
- Source: SLC-301 V3 Schema-Migration — User musste Container-Namen manuell nachsuchen
- Observation: Bei SQL-Migrationen auf Hetzner wurde das komplette SQL zusammen mit einem hardcodierten Container-Namen (supabase-db) ausgegeben. Der Container heißt aber dynamisch (Coolify generiert z.B. supabase-db-k9f5pn5upfq7etoefb5ukbcg-124113196331). User musste mehrfach nachfragen und die Schritte manuell durchgehen.
- Suggested Improvement: Fester 4-Schritt-Workflow bei jeder SQL-Migration: (1) SSH-Befehl geben + warten, (2) Container-Discovery-Befehl geben + warten auf Antwort, (3) docker exec mit gemeldetem Container-Namen + warten auf psql-Prompt, (4) erst dann SQL-Block liefern. Nie das SQL zusammen mit den Verbindungsbefehlen in einem Rutsch rausgeben. Nie Container-Namen hardcoden.
- Affected Area: /backend Skill (SQL-Migrationen), Memory feedback_sql_on_hetzner.md, Memory reference_hetzner_ssh.md
- Status: resolved

### IMP-002 — Mein Tag KI-Assistent: Voice-Driven Workflow Assistant

- Date: 2026-04-08
- Source: User-Vision bei V2.2 "Mein Tag" KI-Assistent Einbau
- Observation: Das KI-Analyse-Cockpit-Konzept (IMP-001, Dashboard, read-only) hat eine deutlich mächtigere Variante: ein operativer KI-Assistent in "Mein Tag", der nicht nur Daten abfragt sondern **Arbeit erledigt** — E-Mails schreiben und senden, Aufgaben umplanen, Meeting-Zusammenfassungen verarbeiten, CRM-Einträge aktualisieren. Komplett sprachgesteuert. Konkretes Szenario: Meeting beenden → Summary fließt ein → "Erstell E-Mail auf Basis Rückruf-Vorlage" → KI generiert Text → "Überarbeite, sende raus, Aufgabe erledigt" → alles in einem Flow ohne Keyboard. Voraussetzung: Intent-Erkennung (read vs. write), Action-Engine, E-Mail-Template-System, Meeting-Integration, Cross-System-Daten.
- Suggested Improvement: Architektur muss zwei KI-Modi unterscheiden:
  1. **Query-Modus** (Dashboard): Natürliche Sprache → SQL/API → Darstellung (read-only)
  2. **Action-Modus** (Mein Tag): Natürliche Sprache → Intent → Bestätigung → Ausführung (read+write+execute)
  Action-Modus braucht: Tool-Calling/Function-Calling Pattern, Bestätigungs-Loop, Undo-Fähigkeit, Audit-Trail
- Affected Area: Gesamtarchitektur (LLM-Layer), E-Mail-System, Aufgaben-System, Meeting-System, Voice-Pipeline
- Status: open
