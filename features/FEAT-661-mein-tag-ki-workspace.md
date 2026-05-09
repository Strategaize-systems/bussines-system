# FEAT-661 — Mein Tag (KI-Workspace-Hybrid + Performance-Migration)

**Status:** planned
**Version:** V6.6
**Created:** 2026-05-09
**Sources:** DISCOVERY-V6.6.md Block 1 + 5.1, Memory feedback_ki_workspace_pattern + feedback_main_kpi_pipeline_progress

## Purpose

Mein Tag ist heute eine Mischung aus Aufgaben-Liste, Top-Deals-Block, Kalender und KI-Workspace mit "Tagesanalyse starten"-Button. Daneben stehen klassische Widget-Elemente: "4 Hinweise"-Pill oben rechts und "4 offene Punkte"-Zeile unter dem Kalender. Performance-Daten leben getrennt auf einer eigenen `/performance`-Seite.

Ziel: Mein Tag wird zum konsolidierten **Tages-Cockpit** mit dem **KI-Workspace-Hybrid-Pattern** als zentralem Bedienelement. Der Workspace bietet Standard-Berichts-Buttons fuer schnelle Tages-Reports + Frage-Eingabe (Text/Sprache) + Antwort-Fenster fuer freie Fragen. Performance-Daten sind nicht mehr auf einer separaten Seite, sondern im "Wochen-Performance"-Bericht im KI-Workspace verfuegbar.

Der Hauptarbeitsplatz folgt dem User-Leitstern "Pipeline-Progress / Entscheidungen herbeifuehren" — Pipeline-Bewegung im Tagesanalyse-Bericht ist Haupt-KPI, Aktivitaeten-Counts sind Mittel zum Zweck.

## Scope

### Teil 1: 4-Block-Layout mit Hybrid-KI-Workspace

- 4-Block-Layout bleibt: Aufgaben (links oben) + Top-Deals (rechts oben) + Kalender (rechts unten) + KI-Workspace (links unten)
- KI-Workspace wird zum **Hybrid-Block**:
  - Oben: 5 Standard-Berichts-Buttons in einer horizontalen Reihe — `[Tagesanalyse]` `[Gestern]` `[Seit Login]` `[Wochen-Performance]` `[Pipeline-Risiko]`
  - Mitte: Frage-Eingabe (Text-Input + Mikrofon-Button fuer Voice-Stream)
  - Unten: Antwort-Fenster (rendert Bedrock-Output, Markdown-faehig, scrollbar)
- Klick auf Berichts-Button → Bedrock-Call mit Tages-Kontext → Antwort streamt in Antwort-Fenster
- Klick auf Mikrofon → Whisper-Adapter → Text in Eingabefeld → User-OK → Bedrock-Call

### Teil 2: Tagesanalyse-Bericht-Inhalt-Reihenfolge

Der Tagesanalyse-Bericht (Standard-Button) folgt der User-Leitstern-Reihenfolge:
1. **Pipeline-Bewegung heute** (Haupt) — welche Deals sind heute durch Stages gewandert, welche neu, welche won/lost
2. **Aktivitaeten-Soll-Ist** (untergeordnet) — Anzahl geplante vs. erledigte Calls/Meetings/E-Mails
3. **KI-Kommentar** — Bedrock-Bewertung "Was lief gut, was bremst, was empfehle ich?"

Wiedervorlagen erscheinen ALS TEIL des Tagesanalyse-Berichts (z.B. unter "Pipeline-Risiko"-Sektion), nicht als separate "4 Hinweise"-Pill.

### Teil 3: Performance-Migration

- /performance-Seite wird **komplett geloescht**
- Sidebar-Eintrag "Meine Performance" wird **komplett entfernt**
- Performance-Daten erscheinen ausschliesslich ueber den Berichts-Button "Wochen-Performance" im Mein-Tag-KI-Workspace
- /performance-Route entweder geloescht oder mit deprecation-toast-Redirect zu /mein-tag

### Teil 4: Klassische Widgets entfernen

- "4 Hinweise"-Pill oben rechts auf Mein Tag → WEG
- "4 offene Punkte"-Zeile unter Kalender → WEG
- "Tagesanalyse starten"-Button mitten drin → WEG (ersetzt durch Hybrid-Antwort-Fenster)
- KEINE neuen klassischen Widget-Karten ergaenzen (per `feedback_no_extra_cards.md`)

## Acceptance Criteria

**AC1:** Mein Tag rendert das 4-Block-Layout (Aufgaben + Top-Deals + Kalender + KI-Workspace) auf Desktop ≥1280px ohne Scroll-Zwang im Above-the-Fold.

**AC2:** KI-Workspace-Block enthaelt sichtbar: 5 Berichts-Buttons (`Tagesanalyse`, `Gestern`, `Seit Login`, `Wochen-Performance`, `Pipeline-Risiko`) in horizontaler Reihe, darunter Frage-Eingabe mit Text-Input + Mikrofon-Button, darunter Antwort-Fenster.

**AC3:** Klick auf `[Tagesanalyse]` triggert Bedrock-Call mit Tages-Kontext (alle Deals + Activities heute des aktuellen Users), Antwort erscheint im Antwort-Fenster mit Inhalt-Reihenfolge: 1. Pipeline-Bewegung, 2. Aktivitaeten-Soll-Ist, 3. KI-Kommentar.

**AC4:** Klick auf `[Wochen-Performance]` rendert Performance-Daten (Goal-Progress + Forecast + KI-Empfehlung) im Antwort-Fenster — kein Wechsel auf eine separate Seite.

**AC5:** Klick auf Mikrofon-Button startet Voice-Stream via Whisper-Adapter, transkribierter Text erscheint im Eingabefeld, User-OK triggert Bedrock-Call.

**AC6:** /performance-Route ist entweder geloescht (404) ODER redirect mit Toast "Performance ist jetzt im Mein-Tag-KI-Workspace verfuegbar — Wochen-Performance-Berichts-Button" auf /mein-tag.

**AC7:** Sidebar enthaelt KEINEN Eintrag "Meine Performance" mehr (weder in OPERATIV noch in ANALYSE noch in ARBEITSBEREICHE).

**AC8:** "4 Hinweise"-Pill oben rechts auf Mein Tag ist nicht mehr im DOM.

**AC9:** "4 offene Punkte"-Zeile unter Kalender auf Mein Tag ist nicht mehr im DOM.

**AC10:** "Tagesanalyse starten"-Button (alter Trigger-Knopf in der Mitte des KI-Workspace-Blocks) ist nicht mehr im DOM.

**AC11:** KI-Workspace-Component ist als reusable Component implementiert (z.B. `<KIWorkspace context="mein-tag" reports={...} />`) — gleiche Component wird in FEAT-664 (Deal-Detail) und FEAT-665 (Dashboard) wiederverwendet.

**AC12:** Mobile-Verhalten ≤768px: 4-Block-Layout staffelt vertikal (Aufgaben → KI-Workspace → Top-Deals → Kalender), KI-Workspace bleibt voll funktional.

**AC13:** Build clean, Vitest gruen (kein Regress auf bestehende Suite), Lint clean.

**AC14:** Live-Smoke: User klickt alle 5 Berichts-Buttons, jeder Bericht rendert eine Bedrock-Antwort innerhalb 10s, kein 5xx.

## Out of Scope

- Custom-Reports / "Meine Berichte"-Auswahlfeld → V7.6 (BL-442)
- Berichts-Buttons fuer Mitarbeiter-Sicht (weniger Berichte pro Rolle) → V7
- Drill-Down auf Tagesanalyse-Inhalt → NICHT bauen (Mitarbeiter-Direktive)
- KI-Workspace mit Streaming-Tokens-UI ueber Server-Sent-Events → /architecture entscheidet (kann V7 nachgereicht werden)
- Performance-Forecast-Algorithmus-Aenderung (heute schon existierende Engine bleibt unveraendert)

## Open Questions for /architecture

- **F1**: KI-Workspace-Component als generische Component mit Konfig-Prop ODER drei spezifische Implementierungen mit gemeinsamem Hook? (PRD F1)
- **F2**: Antwort-Streaming via SSE (Bedrock unterstuetzt) oder synchroner Spinner+Result? (PRD F2)
- **F3**: Voice-Eingabe-Pfad — Whisper-Adapter (bestehend, EU-konform) ist gesetzt, aber wo lebt die WebRTC-Audio-Capture-Logik? Reuse von `pipeline-suche` Voice-UI oder neue Audio-Capture-Component? (PRD F3)
- **F4**: Tages-Kontext fuer Bedrock-Call — welche Tabellen + Joins werden geladen? (PRD F4)
- **F5**: /performance-Funktions-Mapping — welche Funktionen wandern wohin? (PRD F5)
- **F6**: /performance-Route deletion oder redirect? (PRD F6)
- **F17**: Wie sind die Berichts-Listen V7-erweiterbar fuer Rollen-Filter? (PRD F17)

## References

- `c:/strategaize/strategaize-business-system/docs/DISCOVERY-V6.6.md` Block 1 + 5.1 + 5.6 (Sidebar)
- Memory `feedback_ki_workspace_pattern.md`
- Memory `feedback_main_kpi_pipeline_progress.md`
- Memory `feedback_no_extra_cards.md` (V6.6-Praezisierung)
- Memory `feedback_goals_not_on_meintag.md` (Direktive 2026-05-09 umgekehrt: Performance kommt JETZT auf Mein Tag)
- FEAT-302 Mein Tag V2 (Vorgaenger)
- FEAT-305 Bedrock LLM-Layer (Reuse)
- V5.2 Whisper-Adapter (Reuse fuer Voice)
- BL-441 Theming-Master (V6.5+, Tokens fuer KI-Workspace-Visuals)
