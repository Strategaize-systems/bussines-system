# FEAT-666 — KI-Inventur (Aufraeumen + Win/Loss-Auto-Trigger + Sidebar-Restruktur)

**Status:** planned
**Version:** V6.6
**Created:** 2026-05-09
**Sources:** DISCOVERY-V6.6.md Block 5 + Block 6

## Purpose

Das System hat ueber V3..V6.5 organisch viele KI-Inseln und Sparkles-Elemente angesammelt, die entweder:
- Placeholder seit V3.1 sind (Sparkles-Cards auf Firmen/Kontakten ohne reale KI-Funktion)
- Falsch benannt sind ("KI-Reife"-Feld ist ein Bewertungs-Dropdown, kein KI-Feature)
- Durch ein einfacheres Pattern ersetzt werden sollten (NL-Suche auf Pipeline ist Type-Ahead in der Praxis)
- Logisch in den KI-Workspace gehoeren (Sparkles in Toolbars, nachdem FEAT-661/664/665 die Workspaces etabliert haben)

Plus: Win/Loss-Insight ist heute manuell ausloesbar, sollte aber **automatisch** bei Stage-Wechsel auf won/lost feuern (Pflicht-Datenfluss zu Intelligence Studio, da gewonnen UND verloren beide wertvoll sind fuer Lernen). Die User-Direktive ist klar: kein User darf "vergessen" auf Win/Loss-Analyse zu klicken.

Plus: Sidebar wird konsistent restruktiert (Admin-Sicht V6.6, V7-erweiterbar). "Meine Performance" raus (Migration durch FEAT-661).

Ziel: Saubere KI-Landschaft ohne Placeholder, ohne Falsch-Benennung, mit Auto-Trigger fuer Win/Loss-Insight, Sidebar konsistent.

## Scope

### Teil 1: Sparkles-Cards entfernen (Firmen + Kontakte)

- `Firmen-Detail-Page` Sparkles-Card (Placeholder seit V3.1, leerer KI-Block) → ERSATZLOS WEG
- `Kontakte-Detail-Page` Sparkles-Card (Placeholder seit V3.1) → ERSATZLOS WEG
- KEIN Ersatz durch KI-Workspace auf diesen Pages — User-Direktive: "Mein Tag + Deal-Detail reichen"
- Code-Cleanup: zugehoerige `<SparklesCard>`-Calls entfernen + ggf. ungenutzte Server-Actions loeschen

### Teil 2: "KI-Reife"-Feld umbenennen → "AI-Bereitschaft"

- Field auf Firmen-Detail (Bewertungs-Dropdown) heisst heute "KI-Reife"
- Umbenennung auf "AI-Bereitschaft"
- **Schema-kompatibel** — Spaltenname (`ai_readiness` o.ae.) bleibt gleich, nur das UI-Label aendert sich
- Werte (Dropdown-Optionen) ggf. anpassen falls heutige Optionen "ki-spezifisch" formuliert sind
- Fields-Registry / Template-Variablen entsprechend nachziehen (falls "ki-reife" als Tag in E-Mail-Vorlagen vorkommt)

### Teil 3: Pipeline-NL-Suche → Type-Ahead

- /pipeline-suche oder Pipeline-Search-Block (NL-Suche via Bedrock) → ERSETZT durch Type-Ahead-Suche
- Type-Ahead-Pattern wie FEAT-663 (Search-Input + Dropdown-Vorschlaege)
- Such-Quellen: deals.title + companies.name + contacts.full_name (gleiche Logik wie FEAT-663)
- NL-Frage-Eingabe ist im KI-Workspace (Mein Tag / Deal-Detail / Cockpit) verfuegbar — alte NL-Suche auf Pipeline ist redundant
- Pipeline-Kanban-Visualisierung bleibt unangetastet (klassische Stage-Ansicht ist OK per User-Direktive)

### Teil 4: Auto-Reply-Extractor bleibt

- Auto-Reply-Extractor auf Kontakten (V4 KI-Kontextanalyse, FEAT-410): Alert-Box mit Out-of-Office-Datum
- **BLEIBT** — echte Hilfe, nicht Placeholder
- Keine Aktion in V6.6

### Teil 5: Win/Loss-Auto-Trigger

- **Auto-Trigger bei Stage-Wechsel** auf `won` oder `lost`:
  - Hook in `pipeline.moveDealToStage` (V6.2 existiert) ODER als separater workflow_action vom Typ `auto_winloss_extract` (siehe /architecture-Frage F9)
  - Trigger ruft den Bedrock-Win/Loss-Pfad (FEAT-403 / FEAT-114 Loss-Analysis-Logic)
  - Schreibt Ergebnis in `ai_signal_extract_run` Tabelle + audit_log
  - **Pflicht-Datenfluss zu Intelligence Studio** ueber Read-API-Pattern (FEAT-622-Vorbild)
- **Idempotenz**: UNIQUE auf (deal_id, target_status) ON CONFLICT DO NOTHING + Time-Window-Throttle 5 Min (kein Duplicate-Run bei Stage-Toggling won → lost → won)
- **PLUS Berichts-Button** "Win/Loss-Analyse" im Deal-KI-Workspace (FEAT-664) — fuer aktive Deals als "Was kann noch schief gehen?", fuer won/lost als manueller Re-Run / Erweitern

### Teil 6: Multiplikatoren bleiben KI-frei

- Multiplikatoren-Detail-Page bleibt heute KI-frei
- **BLEIBT** so in V6.6 — User-Direktive: "Multiplikatoren KI-frei"
- V8+ Strategie-Item ob der Bereich komplett wegfaellt (geschaeftsmodell-abhaengig, separates Discovery-Item)

### Teil 7: Sidebar V6.6 (Admin-Sicht)

Aktueller Sidebar-Aufbau (vereinfacht):
```
- Mein Tag
- Focus
- Kalender
- Dashboard
- Deals
- Pipeline
- Firmen
- Kontakte
- Multiplikatoren
- Meine Performance
- VERWALTUNG
  - ...
```

Neuer Sidebar-Aufbau V6.6:
```
ANALYSE (rauf nach oben)
- Dashboard

OPERATIV
- Mein Tag
- Focus
- Kalender

ARBEITSBEREICHE
- Deals
- Pipeline
- Firmen
- Kontakte
- Multiplikatoren

VERWALTUNG (V7-Item, bleibt unveraendert in V6.6)
- ... (alle bestehenden Eintraege bleiben)
```

- "Meine Performance" raus (in Mein-Tag-KI-Workspace migriert via FEAT-661)
- KEINE neuen Eintraege in V6.6
- KEIN Mitarbeiter-Sicht-Eintrag-Removal (z.B. Dashboard fuer Mitarbeiter raus) — V7-Item
- Sektion-Header (ANALYSE / OPERATIV / ARBEITSBEREICHE / VERWALTUNG) als Visual-Trenner sichtbar (Subtle-Header-Style, nicht clickable)

## Acceptance Criteria

**AC1:** Firmen-Detail-Page enthaelt keine `<SparklesCard>` mehr im DOM.

**AC2:** Kontakte-Detail-Page enthaelt keine `<SparklesCard>` mehr im DOM.

**AC3:** Firmen-Detail-Page Field-Label "KI-Reife" heisst jetzt "AI-Bereitschaft". Spaltenname in DB bleibt unveraendert (kein Schema-Bruch).

**AC4:** Wenn "KI-Reife" / "AI-Bereitschaft" in E-Mail-Vorlagen-Variablen vorkommt: nur Label aktualisieren, Variable-Name bleibt schema-kompatibel.

**AC5:** /pipeline-Suche-Block (oder Pipeline-NL-Suche) zeigt Type-Ahead-Pattern (Search-Input + Dropdown mit max 10 Vorschlaegen aus Stammdaten). Keine NL-Frage-Logik mehr auf Pipeline-Page.

**AC6:** Stage-Wechsel auf `won` triggert automatisch einen Bedrock-Win/Loss-Run. `ai_signal_extract_run` enthaelt einen neuen Eintrag mit `run_type='winloss_auto'` (oder aequivalent), `audit_log` enthaelt einen Eintrag mit `event_type='auto_winloss_triggered'`.

**AC7:** Stage-Wechsel auf `lost` triggert ebenfalls einen Bedrock-Win/Loss-Run mit gleichem Schema.

**AC8:** Idempotenz: zweifaches Stage-Toggling won → lost → won innerhalb 5 Min triggert nur **einen** Auto-Run pro (deal_id, target_status) (UNIQUE Constraint oder Time-Window-Throttle).

**AC9:** Pflicht-Datenfluss zu Intelligence Studio: nach Auto-Trigger-Run ist der Output ueber Read-API `/api/winloss/[deal_id]` (oder aequivalent) abrufbar (Pattern wie FEAT-622-Campaign-Read-API).

**AC10:** Sidebar zeigt 4 Sektion-Header (ANALYSE / OPERATIV / ARBEITSBEREICHE / VERWALTUNG) als Visual-Trenner.

**AC11:** Sidebar-Reihenfolge unter den Sektionen: ANALYSE [Dashboard], OPERATIV [Mein Tag, Focus, Kalender], ARBEITSBEREICHE [Deals, Pipeline, Firmen, Kontakte, Multiplikatoren], VERWALTUNG [bestehend unveraendert].

**AC12:** Sidebar-Eintrag "Meine Performance" ist nicht mehr im DOM.

**AC13:** VERWALTUNG-Bereich enthaelt alle bestehenden Eintraege unveraendert (kein V7-Vorgriff).

**AC14:** Multiplikatoren-Detail-Page bleibt unveraendert (kein KI-Workspace, kein Sparkles-Removal weil dort nichts war).

**AC15:** Mobile (≤768px): Sidebar wird zu Hamburger-Menue, Sektion-Header bleiben sichtbar.

**AC16:** Build clean, Vitest gruen (kein Regress auf bestehende Tests, neue Tests fuer Auto-Trigger-Idempotenz), Lint clean.

**AC17:** Live-Smoke: User wechselt einen Test-Deal von Stage `qualified` auf `won`, sieht in audit_log innerhalb 30s einen `auto_winloss_triggered`-Eintrag. Wechselt sofort zurueck auf `lost`, dann erneut auf `won` — nur 2 Auto-Runs in audit_log (won + lost), nicht 3.

**AC18:** Live-Smoke: User klickt im Deal-KI-Workspace auf `[Win/Loss-Analyse]` (FEAT-664-Berichts-Button) — Bedrock-Antwort rendert (manueller Trigger funktioniert weiterhin).

## Out of Scope

- Multiplikatoren-Bereich-Strategie (KI-Erweiterung oder Wegfall) → V8+
- KI-Workspace auf Firmen/Kontakte/Proposals → kein V6.6 ("spaeter mal wenn Bedarf entsteht")
- Pipeline-Stages-Cleanup (BL-439) → user-self-served in Settings (ausserhalb V6.6-Slice-Scope)
- Sparkles-Audit auf weiteren Pages (z.B. Settings) → wenn dort Sparkles existieren, sind sie nicht V6.6-Scope (Backlog falls auffaellig)
- VERWALTUNG-Bereich-Restruktur → V7
- Mitarbeiter-Sidebar-Variante (kein Dashboard) → V7
- Sidebar-Color-Coding pro Sektion → V7+ if needed
- Win/Loss-Auto-Trigger-Backfill fuer historische Won/Lost-Deals → kein V6.6

## Open Questions for /architecture

- **F9**: Trigger-Hook-Position — direkt in `pipeline.moveDealToStage` oder als workflow_action in V6.2-Workflow-Engine? Empfehlung: workflow_action (konsistente Audit-Sicht). (PRD F9)
- **F10**: Idempotenz — UNIQUE auf (deal_id, target_status) + Time-Window-Throttle 5 Min? (PRD F10)
- **F11**: Intelligence-Studio-Datenfluss — Read-API-Pattern (FEAT-622) oder Direct-Insert? (PRD F11)
- **F30 (neu)**: "AI-Bereitschaft"-Rename in E-Mail-Vorlagen — alle Vorlagen scannen + Label-Tag aendern oder nur UI-Label-Map? Empfehlung: UI-Label-Map (zentrale Renamings-Tabelle, keine Migration noetig).
- **F31 (neu)**: Sidebar-Sektion-Header-Style — sichtbarer Trenner-Text + 1px Linie oder nur Visual-Spacing? Empfehlung: Subtle-Header (font-medium text-muted-foreground, kleiner Caps-Style).
- **F32 (neu)**: Win/Loss-Auto-Trigger und manueller Berichts-Button im Deal-KI-Workspace — gleicher Bedrock-Pfad oder unterschiedliche Prompts (z.B. Auto vs Re-Analyze)? Empfehlung: gleicher Pfad, manueller Klick triggert Re-Run nur wenn aelter als 24h.

## References

- `c:/strategaize/strategaize-business-system/docs/DISCOVERY-V6.6.md` Block 5 + Block 6
- FEAT-114 Deal Loss Analysis (V2, Reuse fuer Win/Loss-Logik)
- FEAT-403 Management-Cockpit-LLM (V4, Reuse fuer Bedrock-Pfad)
- FEAT-410 KI-Kontextanalyse (V4, Auto-Reply-Extractor bleibt)
- FEAT-621 Workflow-Automation (V6.2, fuer Auto-Trigger als workflow_action)
- FEAT-622 Kampagnen-Attribution (V6.2, fuer Read-API-Pattern)
- FEAT-661 KI-Workspace-Component (V6.6, kein Reuse hier — VERMEIDEN von KI-Workspace auf Firmen/Kontakte)
- FEAT-664 Deal-Detail-Layout-Swap (V6.6, Win/Loss-Berichts-Button)
- BL-439 Pipeline-Stages-Cleanup (deferred, user-self-served)
