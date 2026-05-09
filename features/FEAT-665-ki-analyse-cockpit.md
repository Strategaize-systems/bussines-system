# FEAT-665 — Dashboard zu KI-Analyse-Cockpit (Mein-Tag-Pattern)

**Status:** planned
**Version:** V6.6
**Created:** 2026-05-09
**Sources:** DISCOVERY-V6.6.md Block 7

## Purpose

Dashboard ist heute ein klassisches BI-Cockpit mit KPI-Cards (z.B. "Pipeline-Wert", "Conversion-Rate", "Forecast"), Top-Chancen-Tabelle und einem isolierten DashboardSearch-Block. Das wirkt wie ein Reporting-Tool, nicht wie ein KI-Cockpit. User muss zwischen Cards lesen, Tabelle scannen und Search-Block tippen — drei verschiedene Bedien-Patterns.

Ziel: Dashboard wird zu **"KI-Analyse-Cockpit"** mit dem **gleichen Layout wie Mein Tag** — KI-Workspace links 2/3, Kalender rechts 1/3, Action-Bar oben (kontextlos, da kein Deal-Kontext). Berichts-Buttons sind cockpit-spezifisch (Pipeline-Snapshot, Top-Chancen, Conversion-Rate, Forecast, Win/Loss-Analyse, Stagnierende Deals).

KPI-Cards und Top-Chancen-Tabelle entfallen — alle Daten erreichbar ueber Berichts-Buttons im KI-Workspace. DashboardSearch geht im KI-Workspace auf (gleiche Frage-Eingabe-Pattern).

## Scope

### Teil 1: Title + Action-Bar

- Page-Title: "KI-Analyse-Cockpit" (war: "Dashboard")
- Sidebar-Eintrag: "Dashboard" bleibt (Restruktur in FEAT-666 Sidebar-Item)
- **Action-Bar oben** (kontextlos, da Cockpit nicht Deal-spezifisch):
  - Task / E-Mail / Meeting / Anruf / Notiz
  - Kein Angebot-Button (kontextfrei nicht sinnvoll)
  - Kein Mehr-Menue noetig (weniger Cockpit-Aktionen)
- Klick auf Task-Button oeffnet Task-Create-Modal (deal-frei, Owner = aktueller User)
- Klick auf E-Mail-Button oeffnet Composing-Studio (V5.3, leerer Empfaenger-Slot)
- Klick auf Meeting-Button oeffnet Meeting-Create-Modal
- Klick auf Anruf-Button → ?  (User-Direktive: existiert kein "kontextloser Anruf" — entweder ueber Kontakte-Picker auswaehlen oder Button hidden auf Cockpit). /architecture entscheidet.
- Klick auf Notiz-Button oeffnet Notiz-Create-Modal (deal-frei)

### Teil 2: Hauptbereich 2/3 + 1/3

#### LINKS 2/3 = KI-Workspace (Reuse FEAT-661 Component)

- Standard-Berichts-Buttons (cockpit-spezifisch):
  - `[Pipeline-Snapshot]` — heutiger Pipeline-Stand pro Stage, Wert-Summe, Anzahl Deals
  - `[Top-Chancen]` — top gewichtete Deals (analog Top-10 von FEAT-663), mit Pipeline-Switcher im Bericht
  - `[Conversion-Rate]` — Stage-zu-Stage-Conversion ueber definierten Zeitraum, KI-Bewertung
  - `[Forecast]` — gewichteter Forecast fuer Quartal/Monat
  - `[Win/Loss-Analyse]` — Bedrock-Analyse ueber alle Won/Lost-Deals des Zeitraums (Was hat gewonnen / verloren?)
  - `[Stagnierende Deals]` — Deals ohne Activity in X Tagen, Stage-Idle-Liste
- Frage-Eingabe (Text + Voice via Whisper-Adapter)
- Antwort-Fenster
- Kontext-Quelle: Account-weit (alle Deals + Activities + Pipeline-Snapshots des Users)

#### RECHTS 1/3 = Kalender

- Reuse Kalender-Component aus Mein Tag + FEAT-662 (Working-Hours-Setting + Range 06:00–21:00)
- Zeigt heutige Termine, Klick auf Termin oeffnet Termin-Detail
- "Termin planen"-Button im Kalender-Header (kontextfrei, da Cockpit-Page)

### Teil 3: KPI-Cards entfernen

- Alle KPI-Cards (Pipeline-Wert / Conversion / Forecast / Wins-Diese-Woche etc.) → WEG
- Daten erreichbar ueber Berichts-Buttons im KI-Workspace

### Teil 4: Top-Chancen-Tabelle entfernen

- Alte Top-Chancen-Tabelle (server-side gerenderte Liste) → WEG
- Inhalt jetzt ueber Berichts-Button `[Top-Chancen]` im KI-Workspace, mit Pipeline-Switcher im Bericht selbst

### Teil 5: DashboardSearch konsolidieren

- Heutige isolierte DashboardSearch-Komponente → WEG
- Frage-Eingabe im KI-Workspace ist die einzige Frage-Eingabe auf Cockpit
- Alte Search-Logic (NL-Suche) entweder:
  - Komplett ersetzt durch KI-Workspace-Frage-Eingabe (User-Direktive: ja, das ist die Loesung)
  - Tracking-Pattern fuer alte URL-Parameter `?q=...` (zur Sicherheit, falls Bookmarks existieren)

## Acceptance Criteria

**AC1:** Dashboard-Page (Route bleibt /dashboard) hat Title "KI-Analyse-Cockpit".

**AC2:** Action-Bar unter Title zeigt mind. 5 Buttons (Task / E-Mail / Meeting / Anruf / Notiz), gleicher visueller Style wie Mein-Tag-Action-Bar (bunt+rund, Brand-Tokens).

**AC3:** Hauptbereich rendert 2/3 + 1/3 Layout: KI-Workspace links 2/3, Kalender rechts 1/3.

**AC4:** KI-Workspace nutzt FEAT-661-Component (`<KIWorkspace context="cockpit" reports={...} />`) — keine duplizierte Implementierung.

**AC5:** KI-Workspace zeigt 6 Berichts-Buttons (`Pipeline-Snapshot`, `Top-Chancen`, `Conversion-Rate`, `Forecast`, `Win/Loss-Analyse`, `Stagnierende Deals`).

**AC6:** Klick auf `[Pipeline-Snapshot]` triggert Bedrock-Call mit Account-weitem Pipeline-Kontext, rendert Snapshot im Antwort-Fenster.

**AC7:** Klick auf `[Top-Chancen]` rendert Top-Chancen-Liste mit Pipeline-Switcher IM Bericht (User kann zwischen Pipelines wechseln ohne Bericht neu zu laden).

**AC8:** KPI-Cards (Pipeline-Wert / Conversion / Forecast etc.) sind nicht mehr im DOM auf /dashboard.

**AC9:** Top-Chancen-Tabelle (server-side gerendert) ist nicht mehr im DOM auf /dashboard.

**AC10:** DashboardSearch-Component ist nicht mehr im DOM auf /dashboard. Alte URL-Parameter `?q=...` werden ggf. an KI-Workspace weitergereicht oder ignoriert (silenter Discard ist OK).

**AC11:** Kalender rechts zeigt heutige Termine, "Termin planen"-Button funktioniert (oeffnet Meeting-Create-Modal). Default-Range 06:00–21:00 (FEAT-662).

**AC12:** Mobile (≤768px): 2/3+1/3-Layout staffelt vertikal (KI-Workspace voll oben, Kalender darunter), Action-Bar funktional (ggf. einige Buttons in Mehr-Menue).

**AC13:** Build clean, Vitest gruen, Lint clean.

**AC14:** Live-Smoke: User oeffnet /dashboard, sieht "KI-Analyse-Cockpit"-Title, klickt 3 Berichts-Buttons (Pipeline-Snapshot, Top-Chancen, Forecast) — alle rendern Bedrock-Antwort innerhalb 10s, kein 5xx. Klick auf Termin im Kalender oeffnet Termin-Detail.

## Out of Scope

- Custom Berichts-Buttons → V7.6
- KPI-Cards optional einblendbar via Setting → kein V6.6 (User-Direktive: ersatzlos weg)
- Multi-User-Forecasts (Team-Forecast) → V7
- PDF-Export von Cockpit-Berichten → V7+ wenn Bedarf
- Pipeline-Switcher als globaler Filter (gilt fuer alle Berichte gleichzeitig) → /architecture entscheidet, ggf. spaeter
- Drill-Downs aus Berichten heraus (z.B. Klick auf Stage in Snapshot zu Pipeline-Filter) → V7 (Chef-Sicht-Drill-Downs)

## Open Questions for /architecture

- **F26 (neu)**: Anruf-Button im kontextlosen Cockpit — Kontakt-Picker-Dialog oder Button hidden? Empfehlung: Kontakt-Picker-Dialog (User waehlt Kontakt → Click-to-Call).
- **F27 (neu)**: Pipeline-Switcher im Top-Chancen-Bericht — Tab im Antwort-Fenster oder separater Filter-Button? Empfehlung: Tab im Antwort-Fenster (in-place, kein neuer Bedrock-Call wenn Daten gecached).
- **F28 (neu)**: Forecast-Zeitraum — fest auf Quartal oder Monat oder konfigurierbar via Frage-Eingabe ("Forecast Q3 2026")? Empfehlung: Quartal als Default, freie Frage-Eingabe fuer Custom-Zeitraum.
- **F29 (neu)**: Berichts-Antwort-Caching — Bedrock-Call ist teuer, soll der Cockpit-User pro Tag mehrfach auf Buttons klicken koennen ohne neuen Call? Empfehlung: 5-Min-Cache pro Bericht-Button + User, Cache-Invalidierung manuell ueber "Refresh"-Button.

## References

- `c:/strategaize/strategaize-business-system/docs/DISCOVERY-V6.6.md` Block 7
- FEAT-661 KI-Workspace-Component (V6.6, Reuse)
- FEAT-662 Kalender-Polish (V6.6, Reuse)
- FEAT-115 BD Dashboard (V2, Vorgaenger)
- FEAT-403 Management-Cockpit-LLM (V4, Reuse fuer Pipeline-Snapshot/Forecast-Logik)
- BL-441 Theming
