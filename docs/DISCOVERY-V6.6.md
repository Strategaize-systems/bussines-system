# DISCOVERY — V6.6 Pre-V7-Audit-Sprint

- Datum: 2026-05-09
- Skill: /discovery
- Status: DONE — bereit fuer /requirements
- Vorgaenger: V6.5 RELEASED 2026-05-08 (REL-027, Image-Tag cb491ca)
- Nachfolger: V7 Multi-User + Teamlead

## 1. Raw idea summary

V6.6 ist ein zielgerichteter UI-Cleanup- und KI-Konzentrations-Sprint zwischen V6.5 (Theming/Hygiene) und V7 (Multi-User). Auslöser ist die Beobachtung, dass das System ueber V3..V6.5 organisch viele KI-Inseln (Sparkles-Cards, NL-Suche, Insight-Buttons, KPI-Cards, Dashboard-Widgets) angesammelt hat, die nebeneinander stehen und kein konsistentes Bedienmodell ergeben.

Der User hat in einer Konversations-Session am 2026-05-09 in ~15 Iterationen eine vollstaendige Re-Konzeption der drei Hauptarbeitsplaetze (Mein Tag, Deal-Detail, Dashboard) entschieden. Das Ergebnis ist ein einheitliches **KI-Workspace-Hybrid-Pattern**, das klassische Widget-Karten ersetzt und die Pipeline-Bewegung als Haupt-KPI in den Mittelpunkt rueckt.

V6.6 ist NICHT V7-Vorbereitung im Sinne von Multi-User-Architektur, sondern **Bereinigung des Bedienmodells**, damit V7 auf einer konsistenten Basis Multi-User-Differenzierung (Admin/Mitarbeiter/Chef) aufsetzen kann.

## 2. Likely main goal

Die drei Hauptarbeitsplaetze auf ein einziges, wiederverwendbares Bedienmodell konzentrieren — den **KI-Workspace** als Hybrid aus vordefinierten Berichts-Buttons, Frage-Eingabe (Text+Sprache) und Antwort-Fenster. Klassische Widget-Karten (KPI-Cards, Top-N-Tabellen, isolierte KI-Sparkles, Performance-Cockpits) werden eliminiert oder in den KI-Workspace migriert.

Der unterliegende Leitstern: Vertriebler-Aufgabe ist **Entscheidungen herbeifuehren** (Pipeline-Progress), nicht Aktivitaeten-Volumen abarbeiten. Layouts und Berichte folgen dieser Priorisierung.

## 3. Side ideas and attached thoughts

In der Discovery-Session wurden folgende Themen aufgegriffen, die NICHT V6.6-Scope sind:

- **Custom-Reports** (User legt eigene Berichts-Buttons an) → V7.6 (eigenes Release-Item, nutzt V7.5-Architektur)
- **Natural-Language-Automation-Regeln** (Sculptor-Pattern) → V7.5 (BL-435, hochpriorisiert von medium auf high)
- **Externe API-Integration** (Slack/Teams/WhatsApp) → V8+ (statt eigener Inhouse-Chat)
- **Externe Kunden-Kommunikation** (z.B. WhatsApp-Channel) → V8+ separates Business-Thema
- **Feiertag-Logik** im Kalender (`date-holidays`-Lib + DE/NL) → Backlog, eigener Slice nach V7
- **Multiplikatoren-KI-Erweiterung** → V8+/Strategie-Item (geschaeftsmodell-abhaengig, ggf. komplett wegfallend)
- **Verwaltungs-Bereich-Restruktur** → V7 (Multi-User+Rollen-Sichtbarkeit)
- **Settings-Hierarchie** → nach V7
- **Pipeline-Stages-Cleanup (BL-439)** → User macht selbst in Settings (user-self-served, V6.6-Defer zurueckgezogen)

## 4. Feasibility and realism assessment

| Block | Realismus | Notiz |
|---|---|---|
| Mein-Tag-Layout-Restruktur (Performance-Seite raus, KI-Workspace-Hybrid rein) | **Hoch realistisch** | Reine Frontend-Arbeit auf bestehender Bedrock+RAG-Infra, keine neuen Backend-Calls noetig |
| Deal-Detail-Layout-Swap (3 KI-Module → 1 Workspace) | **Hoch realistisch** | Briefing-Sidebar/Wissen-Tab/Signale-Action existieren bereits — Konsolidierung statt Neubau |
| Dashboard zu KI-Analyse-Cockpit | **Hoch realistisch** | KPI-Cards/Top-Chancen-Tabelle entfernen, Mein-Tag-Pattern uebernehmen |
| Win/Loss Auto-Trigger bei Stage-Wechsel | **Hoch realistisch** | Einziger Backend-Touch — Hook in moveDealToStage existiert (V6.2 Workflow-Engine), Pflicht-Datenfluss zu Intelligence-Studio analog FEAT-622 Read-API |
| Kalender-Polish (Working-Hours-Setting + Range 06:00–21:00) | **Hoch realistisch** | Kleiner Slice, Setting auf User-Profil + 1 hartkodierter Wert in `kalender-client.tsx:29` |
| KI-Inventur Aufraeumen (Sparkles-Cards weg, NL-Suche → Type-Ahead, AI-Bereitschaft umbenennen) | **Hoch realistisch** | Alles Code-Removal/Renaming, kein neuer Code |

**Kein Risikofall identifiziert.** V6.6 ist UI-Cleanup-dominiert mit einem einzigen Mini-Backend-Touch (Win/Loss-Auto-Trigger). Schaetzung 6-10 Slices.

**Was bewusst NICHT V6.6 ist:**
- Drill-Downs bauen — User-Direktive: Mitarbeiter sollen mit KI arbeiten lernen, nicht Drill-Downs nachgebaut bekommen
- Chef-Sicht-Drill-Downs — kommen mit V7 (Multi-User + Rollen)
- NL-Automation-Regeln — eigenes Release V7.5
- Custom-Reports — eigenes Release V7.6

## 5. Scope proposal

### IN SCOPE V6.6

#### 5.1 Mein-Tag-Restruktur
- Layout bleibt (Aufgaben + Top-Deals + Kalender + KI-Workspace)
- KI-Workspace = Tages-Cockpit, Hybrid-Layout: Standard-Berichts-Buttons oben + Frage-Eingabe (Text/Sprache) in Mitte + Antwort-Fenster unten
- Standard-Berichte: `[Tagesanalyse]` `[Gestern]` `[Seit Login]` `[Wochen-Performance]` `[Pipeline-Risiko]`
- "Tagesanalyse starten"-Button mitten drin → WEG (ersetzt durch Hybrid-Antwort-Fenster)
- "4 Hinweise"-Pill oben rechts + "4 offene Punkte"-Zeile unter Kalender → WEG
- **/performance-Seite + Sidebar-Eintrag VERSCHWINDEN KOMPLETT** — Performance-Daten gehoeren in den Tagesanalyse-Bericht (Pipeline-Bewegung → Aktivitaeten-Soll-Ist → KI-Kommentar)
- **KEIN Drill-Down-Bauen** — Mitarbeiter sollen mit KI arbeiten lernen

#### 5.2 Kalender-Polish (V6.6 Variante 1)
- Stunden-Range default auf 06:00–21:00 ausweiten (heute hartkodiert 07:00–20:00 in `kalender-client.tsx:29`)
- Working-Hours-Setting pro User (Arbeitstag definieren, z.B. 09:00–18:00)
- Toggle "Voller Tag" / "Nur Arbeitstag"
- **Feiertag-Logik = Backlog** (eigener Slice nach V7)

#### 5.3 Deals-Listen-Seite
- Top-10-Block oben (gewichteter Wert: value × probability)
- **Pipeline-Switcher** filtert beides (Top-10 UND Karten-Grid darunter)
- Aktive Deals als Karten-Grid (kompakt: Title + Wert + Firma + Stage-Badge + Naechste Aktion + Wahrscheinlichkeit-Pill)
- 2 einklappbare Sektionen darunter: "Gewonnen" / "Verloren"
- **Type-Ahead-Suche** oben (Stammdaten: Title + Firma + Kontakt-Name, KEIN Volltext)
- Karten kompakt OHNE Foto/Avatar/Hauptkontakt (Details beim Click)

#### 5.4 Deal-Detail-Layout-Swap (konsistent zu Mein Tag)
- **Header**: Title + Stage-Dropdown + Wert + Prozess-Check-Pill (Click → Popover) + Edit-Pencil-Icon + Mein-Tag-Quick-Switch-Button
- **Action-Bar oben** (Mein-Tag-Style, bunt+rund): Task / E-Mail / Meeting (planen+sofort starten als Dropdown) / Anruf / Notiz / Angebot / **... Mehr-Menue** (enthaelt Cadence)
- **Hauptbereich 2/3 + 1/3**:
  - LINKS 2/3 = KI-Workspace gross (Hybrid: Berichts-Buttons `[Briefing]` `[Signale extrahieren]` `[Risiken & Einwaende]` `[Naechster sinnvoller Schritt]` `[Win/Loss-Analyse]` + Frage-Eingabe + Antwort-Fenster)
  - RECHTS 1/3 = Tabs (Timeline / Tasks / Proposals / Documents)
- **3 KI-Module → 1 KI-Workspace** (Briefing-Sidebar weg, Wissen-Tab weg, Signale-Action weg)
- **Wissen-Tab faellt** (Q&A jetzt im KI-Workspace)
- **Edit-Tab faellt** (Pencil-Icon im Header)
- **Activities-Hybrid**: Timeline kompakt + Klick auf Activity oeffnet Detail-Sheet rechts mit Risiken/Einwaende/Naechste Schritte/Teilnehmer/Zusammenfassung — analog Task-Sheet auf Mein Tag

#### 5.5 KI-Inventur (Aufraeumen)
- **Firmen + Kontakte Sparkles-Cards** (Placeholder seit V3.1) → ERSATZLOS WEG
- **"KI-Reife"-Feld umbenennen → "AI-Bereitschaft"** (war kein KI-Feature, nur Bewertungs-Dropdown)
- **Pipeline-NL-Suche → klassische Type-Ahead-Suche** (analog `/deals` neu)
- **Pipeline-Kanban-Visualisierung bleibt unangetastet** (klassische Stage-Ansicht ist OK)
- **Auto-Reply-Extractor auf Kontakten bleibt** (echte Hilfe — Alert-Box mit Out-of-Office-Datum)
- **Win/Loss-Insight: AUTO-TRIGGER + Berichts-Button**
  - Bei Stage-Wechsel auf won/lost → automatischer KI-Call → Pflicht-Datenfluss zu Intelligence Studio (unabhaengig vom User-Klick)
  - PLUS Berichts-Button "Win/Loss-Analyse" im Deal-KI-Workspace fuer manuellen Zugriff/Erweitern
- **Multiplikatoren KI-frei** (heute schon, bleibt so) — V8+/Strategie-Item ob der Bereich komplett wegfaellt
- **Kein KI-Workspace** auf Firmen/Kontakte/Multiplikatoren — Mein Tag + Deal-Detail reichen

#### 5.6 Sidebar V6.6 (Admin-Sicht)
1. **ANALYSE** (rauf nach oben): Dashboard
2. **OPERATIV**: Mein Tag, Focus, Kalender
3. **ARBEITSBEREICHE**: Deals, Pipeline, Firmen, Kontakte, Multiplikatoren
4. **VERWALTUNG** bleibt unveraendert (V7-Item — Multi-User + Sichtbarkeits-Logik)

- "Meine Performance" raus (in Mein-Tag-KI-Workspace migriert)
- **V7-Mitarbeiter-Sicht spaeter**: KEIN Dashboard-Eintrag, weil Mein Tag reicht

#### 5.7 Dashboard wird "KI-Analyse-Cockpit" (Mein-Tag-Pattern)
- Title: "KI-Analyse-Cockpit"
- Action-Bar oben (Task / E-Mail / Meeting / Anruf / Notiz — kontextlos)
- LINKS 2/3 = KI-Workspace (Hybrid wie Mein Tag) — Berichts-Buttons: `[Pipeline-Snapshot]` `[Top-Chancen]` `[Conversion-Rate]` `[Forecast]` `[Win/Loss-Analyse]` `[Stagnierende Deals]`
- RECHTS 1/3 = Kalender (wie Mein Tag — auch Termine/Mails fuer GF/VL setzen)
- KPI-Cards raus (Daten kommen ueber Berichts-Buttons im KI-Workspace)
- Top-Chancen-Tabelle raus (jetzt Berichts-Button "Top-Chancen" im KI-Workspace, mit Pipeline-Switcher)
- Heutige isolierte DashboardSearch geht im KI-Workspace auf (gleiche Frage-Eingabe-Pattern)

### OUT OF SCOPE V6.6

- Pipeline-Stages-Cleanup (BL-439) — user-self-served in Settings
- Firmen/Kontakte/Proposals/Multiplikatoren-Detail-Seiten — bleiben klassisch in V6.6
- Settings-Hierarchie — erst nach V7
- Verwaltungs-Bereich — kommt mit V7
- Inhouse-Chat-Loesung — NICHT bauen (externe Tools per API in V8+)
- NL-Automation-Regeln — V7.5
- Custom-Reports — V7.6
- Externe Kommunikations-API — V8+
- Mitarbeiter/Chef-Drill-Downs — V7+
- Feiertag-Logik im Kalender — Backlog nach V7

## 6. Version or phase proposal

| Version | Inhalt | Status |
|---|---|---|
| **V6.6** | Pre-V7-Audit-Sprint (alle 7 Bloecke aus Discovery oben) | DISCOVERY DONE 2026-05-09 |
| V7 | Multi-User + Teamlead (FEAT-502+503) auf bereinigter V6.6-Basis | wie geplant |
| **V7.5 NEU** | NL-Automation (BL-435 hochgesetzt von medium auf high). Read-Only-Migration des V6.2-Click-Builders. ~6 Slices (~3 Phasen) | NEU am 2026-05-09 |
| **V7.6 NEU** | Custom-Reports (User kann KI-Antworten als wiederverwendbare Berichts-Vorlagen speichern). Nutzt V7.5-Architektur (NL-Schema-Extraktion). KEINE Button-Inflation — "Meine Berichte"-Auswahlfeld neben Standard-Buttons. ~1-2 Slices | NEU am 2026-05-09 |
| **V8+ NEU** | API-Integration mit externen Kommunikations-Tools (Slack/Teams/WhatsApp) statt eigener Inhouse-Chat. Externe Kunden-Kommunikation (z.B. WhatsApp) = Business-Entscheidung, separates Thema | NEU am 2026-05-09 |

## 7. Recommended current focus

`/requirements V6.6` — alle 7 Discovery-Bloecke in Features + Acceptance Criteria umsetzen. Erwartete Feature-Schnitt:

- **FEAT-661** Mein Tag — KI-Workspace-Hybrid + Performance-Migration
- **FEAT-662** Kalender-Polish — Working-Hours-Setting + Range 06:00–21:00
- **FEAT-663** Deals-Listen-Seite — Top-10 + Karten-Grid + Type-Ahead
- **FEAT-664** Deal-Detail — Layout-Swap auf Mein-Tag-Pattern + Activity-Sheet
- **FEAT-665** Dashboard — KI-Analyse-Cockpit-Restyling
- **FEAT-666** KI-Inventur — Sparkles-Cards weg + NL-Suche zu Type-Ahead + AI-Bereitschaft-Rename + Win/Loss-Auto-Trigger + Sidebar-Restruktur

Tatsaechlicher Schnitt wird in /requirements festgelegt.

## 8. Parked later ideas

| Idee | Ziel-Version |
|---|---|
| Feiertag-Logik (DE/NL) | Nach V7, eigener Slice |
| Drill-Downs fuer Chef-Sicht | V7+ (Rollen-Sichtbarkeit) |
| Settings-Hierarchie | Nach V7 |
| Verwaltungs-Bereich-Restruktur | V7 |
| Multiplikatoren-Strategie (KI oder weg) | V8+ |
| NL-Automation-Regeln (Sculptor-Pattern, BL-435) | V7.5 |
| Custom-Reports (eigene Berichts-Vorlagen) | V7.6 |
| Externe Kommunikations-API (Slack/Teams/WhatsApp) | V8+ |
| Externe Kunden-Kommunikation (Channel-Strategie) | V8+ |

## 9. Critical open questions

Keine. Alle 7 Discovery-Bloecke sind durch User-Direktive 2026-05-09 entschieden. Alle Versionierungs-Cuts (V7.5 / V7.6 / V8+) sind benannt. Alle Out-of-Scope-Items haben Ziel-Version.

In `/requirements` werden lediglich AC-Detailfragen pro Feature gestellt (Berichts-Button-Texte, leere-Antwort-States, Mobile-Behavior) — keine Konzeptfragen mehr.

## 10. Readiness for `/requirements`

**READY.**

Die Memory `project_business_system_v66_discovery_2026_05_09.md` ist die Wahrheit, dieses Dokument formalisiert sie als Repo-Artefakt. Die Folge-Skills (`/requirements`, `/architecture`, `/slice-planning`) bauen direkt auf diesem Cut auf.

## 11. Recommended next step

1. roadmap.json updaten (V7.5 + V7.6 + V8+ als neue Versions, V6.6 status `active`)
2. backlog.json updaten (BL-435 priority high + version V7.5, BL-439 status closed/user-self-served)
3. STATE.md current-focus auf V6.6 Discovery DONE setzen
4. RPT-365 (dieses Discovery-Report) anlegen
5. Veraltete Memory-Files überschreiben (`feedback_goals_not_on_meintag.md`, `feedback_no_extra_cards.md`)
6. **`/requirements V6.6`** auf Basis dieses Dokuments
