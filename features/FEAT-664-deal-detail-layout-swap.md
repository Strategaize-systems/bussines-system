# FEAT-664 — Deal-Detail (Layout-Swap auf Mein-Tag-Pattern + Activity-Sheet-Hybrid)

**Status:** planned
**Version:** V6.6
**Created:** 2026-05-09
**Sources:** DISCOVERY-V6.6.md Block 4

## Purpose

Deal-Detail (`/deals/[id]`) hat heute drei verschiedene KI-Module nebeneinander, die alle dieselbe Frage beantworten ("Was ist hier los?"):
- Briefing-Sidebar (links)
- Wissen-Tab (rechts neben Timeline)
- Signale-Action (Toolbar-Button)

Plus: ein Edit-Tab mit voller Edit-Maske, was eine eigene Dateneingabe-Logik darstellt. Plus: eine Activity-Timeline ohne Detail-Sheet — Klick auf eine Activity oeffnet eine modale Edit-Page statt einer kontextuellen Vorschau.

Ziel: Konsolidierung auf einen **KI-Workspace links 2/3** (gleiches Hybrid-Pattern wie Mein Tag) und **Tabs rechts 1/3** (Timeline / Tasks / Proposals / Documents). Edit-Funktion wandert auf einen **Pencil-Icon im Header** (kein eigener Tab). Activity-Klick oeffnet ein **Detail-Sheet** rechts (analog Task-Sheet auf Mein Tag) mit Risiken/Einwaende/Naechste Schritte/Teilnehmer/Zusammenfassung.

Action-Bar oben ersetzt verstreute Action-Buttons mit einer einheitlichen Bar im Mein-Tag-Style (bunt+rund, Task / E-Mail / Meeting / Anruf / Notiz / Angebot / Mehr-Menue mit Cadence).

## Scope

### Teil 1: Header-Restruktur

Aktueller Deal-Header hat verstreute Felder (Title + Stage-Dropdown + Wert in einer Reihe). Neuer Header:
- **Title** (Deal-Name)
- **Stage-Dropdown** (Quick-Wechsel ohne Edit-Tab)
- **Wert** (Value mit Waehrung, klick = inline edit)
- **Prozess-Check-Pill** (visualisiert Fit-Gate-Status, Klick → Popover mit den 8 Kriterien)
- **Edit-Pencil-Icon** (oeffnet Edit-Modal/-Drawer fuer alle Stammdaten)
- **Mein-Tag-Quick-Switch-Button** (zurueck zu /mein-tag mit einem Klick)

### Teil 2: Action-Bar oben (Mein-Tag-Style)

Action-Bar direkt unter dem Header, **bunt + rund** (analog Mein-Tag-Action-Bar):
- **Task** (Plus-Icon mit Brand-Color)
- **E-Mail** (Mail-Icon)
- **Meeting** — als **Dropdown-Button** mit zwei Optionen: "Termin planen" + "Sofort starten" (Jitsi-Instant-Meeting)
- **Anruf** (Phone-Icon, Click-to-Call via Asterisk-V5.1)
- **Notiz** (Note-Icon)
- **Angebot** (Document-Plus-Icon, oeffnet Angebot-Workspace V5.5)
- **... Mehr-Menue** (Three-Dots-Icon) — Dropdown mit:
  - Cadence-Aktionen (V5 Sequences)
  - Workflow-Trigger (V6.2)
  - Activity-Manuell (Anruf-Manuell, Meeting-Manuell)
  - Andere weniger gebrauchte Aktionen

### Teil 3: Hauptbereich 2/3 + 1/3

#### LINKS 2/3 = KI-Workspace (Reuse FEAT-661 Component)

- Standard-Berichts-Buttons:
  - `[Briefing]` — Pre-Call/Pre-Meeting-Briefing aus FEAT-301 + V5.6
  - `[Signale extrahieren]` — Signal-Extract aus V4.3 FEAT-412
  - `[Risiken & Einwaende]` — Bedrock-Analyse ueber Activities
  - `[Naechster sinnvoller Schritt]` — Empfehlung basierend auf Deal-Stage + Activities
  - `[Win/Loss-Analyse]` — Bedrock-Analyse (auch fuer aktive Deals als "Was kann noch schief gehen?", bei won/lost aktiviert sich der Auto-Trigger zusaetzlich, siehe FEAT-666)
- Frage-Eingabe (Text + Voice via Whisper-Adapter)
- Antwort-Fenster (Markdown + scrollbar)
- Kontext-Quelle: Deal-spezifisch (alle Activities, Notizen, Tasks, Proposals, Kontakte des Deals)

#### RECHTS 1/3 = Tabs

- **Timeline** — Activity-Stream chronologisch (E-Mails, Meetings, Anrufe, Notizen)
- **Tasks** — offene Tasks mit Faelligkeit
- **Proposals** — V5.5-Angebote mit Status
- **Documents** — Anhaenge (V5.4 + V5.5)

### Teil 4: KI-Module konsolidieren

- **Briefing-Sidebar** (links) → WEG (Inhalt jetzt im Berichts-Button `[Briefing]`)
- **Wissen-Tab** (rechts) → WEG (Q&A jetzt im KI-Workspace ueber freie Frage)
- **Signale-Action** (Toolbar) → WEG (Inhalt jetzt im Berichts-Button `[Signale extrahieren]`)
- **Edit-Tab** → WEG (Pencil-Icon im Header oeffnet Edit-Modal/-Drawer)

### Teil 5: Activities-Hybrid (Detail-Sheet)

- Timeline-Item bleibt kompakt (Icon + Datum + Title + Auto-Reply-Hint falls vorhanden)
- **Klick auf Activity-Item** oeffnet **Detail-Sheet** rechts (over Tabs gelegt, analog Task-Sheet auf Mein Tag)
- Sheet-Inhalt:
  - **Risiken** — aus Bedrock-Summary extrahiert (V4.3 Signal-Extract)
  - **Einwaende** — gleiche Quelle
  - **Naechste Schritte** — gleiche Quelle
  - **Teilnehmer** — Meeting-Teilnehmer / E-Mail-Empfaenger / Call-Beteiligte
  - **Zusammenfassung** — Bedrock-Summary (Volltext)
- Wenn Activity keine Bedrock-Summary hat (z.B. Notiz, kurze E-Mail): Sheet zeigt nur Basis-Daten kompakt
- Sheet-Schliessen via X-Button oder Klick neben Sheet

## Acceptance Criteria

**AC1:** Deal-Detail Header zeigt: Title + Stage-Dropdown + Wert + Prozess-Check-Pill + Edit-Pencil-Icon + Mein-Tag-Quick-Switch-Button.

**AC2:** Action-Bar unter Header zeigt 7 sichtbare Buttons (Task / E-Mail / Meeting / Anruf / Notiz / Angebot / Mehr-Menue) im Mein-Tag-Style (bunt+rund, Brand-Token-Colors).

**AC3:** Meeting-Button ist Dropdown mit zwei Optionen: "Termin planen" + "Sofort starten".

**AC4:** Mehr-Menue (Three-Dots) Dropdown enthaelt mind. Cadence + Workflow-Trigger.

**AC5:** Hauptbereich rendert 2/3 + 1/3 Layout: KI-Workspace links 2/3, Tabs (Timeline / Tasks / Proposals / Documents) rechts 1/3.

**AC6:** KI-Workspace nutzt FEAT-661-Component (`<KIWorkspace context="deal-detail" deal_id={...} reports={...} />`) — keine duplizierte Implementierung.

**AC7:** KI-Workspace zeigt 5 Berichts-Buttons (`Briefing`, `Signale extrahieren`, `Risiken & Einwaende`, `Naechster sinnvoller Schritt`, `Win/Loss-Analyse`).

**AC8:** Klick auf `[Briefing]` triggert Bedrock-Call mit Deal-Kontext, rendert Briefing-Inhalt aus FEAT-301 + V5.6.

**AC9:** Briefing-Sidebar (alte Component) ist nicht mehr im DOM auf Deal-Detail.

**AC10:** Wissen-Tab ist nicht mehr im DOM auf Deal-Detail.

**AC11:** Signale-Action-Button (alte Toolbar) ist nicht mehr im DOM auf Deal-Detail.

**AC12:** Edit-Tab ist nicht mehr im DOM auf Deal-Detail. Klick auf Pencil-Icon im Header oeffnet Edit-Modal/-Drawer.

**AC13:** Klick auf Activity-Item in Timeline oeffnet Activity-Detail-Sheet rechts. Sheet zeigt Risiken / Einwaende / Naechste Schritte / Teilnehmer / Zusammenfassung wenn Bedrock-Summary verfuegbar; sonst kompakte Basis-Daten.

**AC14:** Activity-Sheet ist Reuse von Task-Sheet aus Mein Tag (gleiche Component, Type-Erweiterung).

**AC15:** Activity-Sheet schliesst via X-Button + via Klick ausserhalb.

**AC16:** Mobile (≤768px): 2/3+1/3-Layout staffelt vertikal (KI-Workspace voll oben, Tabs darunter), Activity-Sheet wird zu Full-Screen-Sheet.

**AC17:** Build clean, Vitest gruen (kein Regress auf Briefing-/Signal-Tests, ggf. neue Tests fuer Activity-Sheet), Lint clean.

**AC18:** Live-Smoke (1 Deal-Detail): User klickt alle 5 Berichts-Buttons (alle rendern Bedrock-Antwort innerhalb 10s), klickt auf Meeting-Activity in Timeline (Activity-Sheet zeigt Risiken/Einwaende/Zusammenfassung), klickt auf Pencil-Icon (Edit-Modal oeffnet), klickt auf Mein-Tag-Quick-Switch (navigiert zu /mein-tag).

## Out of Scope

- Drag-und-Drop von Activities zwischen Timeline und Tasks → kein V6.6
- Inline-Edit auf Timeline-Items → Klick oeffnet Sheet, das ist Read-+ Edit-Ziel
- Timeline-Filter (z.B. nur E-Mails, nur Meetings) → ggf. separater Sprint
- Custom Berichts-Buttons fuer Deal-Detail → V7.6 (Custom-Reports)
- Win/Loss-Auto-Trigger bei Stage-Wechsel won/lost → FEAT-666 (Backend-Side)
- Activity-Sheet fuer aufruf-spezifische Funktionen (z.B. Recording-Player im Sheet) → V6.7+ wenn Bedarf
- Streaming-Tokens-UI → /architecture entscheidet, ggf. spaeterer Slice

## Open Questions for /architecture

- **F7**: Activity-Sheet-Variante — Reuse Task-Sheet oder neue Component? Empfehlung: Reuse mit Type-Erweiterung. (PRD F7)
- **F8**: Activity-Sheet-Inhalt fuer Activities ohne Bedrock-Output (Notizen, kurze E-Mails) — kompakte Basis-Daten oder Sheet gar nicht oeffnen? Empfehlung: Sheet immer oeffnen, kompakte Daten wenn keine Summary. (PRD F8)
- **F23 (neu)**: Pencil-Icon-Behavior — Modal oder Drawer? Empfehlung: Drawer (links/rechts ausfahrend) ist konsistenter mit Sheet-Pattern.
- **F24 (neu)**: Stage-Dropdown im Header — direkter Wechsel oder Confirm-Dialog (besonders bei won/lost mit Auto-Trigger)? Empfehlung: direkter Wechsel ohne Confirm, Auto-Trigger laeuft im Hintergrund (FEAT-666).
- **F25 (neu)**: Action-Bar bei mobile (≤768px) — alle 7 Buttons sichtbar oder horizontaler Scroll oder Dropdown-Mehr-Menue mit den weniger genutzten? Empfehlung: 5 Hauptbuttons (Task, E-Mail, Meeting, Anruf, Notiz) sichtbar, Angebot+Mehr ins Dropdown.

## References

- `c:/strategaize/strategaize-business-system/docs/DISCOVERY-V6.6.md` Block 4
- FEAT-301 Deal-Workspace (V3, Vorgaenger)
- FEAT-661 KI-Workspace-Component (V6.6, Reuse)
- FEAT-302 Mein Tag V2 (V3, fuer Action-Bar-Style + Task-Sheet-Pattern)
- FEAT-412 Automatic Signal Extraction (V4.3, Reuse fuer Sheet-Inhalt)
- FEAT-562 Pre-Call Briefing (V5.6, Reuse fuer Briefing-Bericht)
- FEAT-621 Workflow-Automation (V6.2, fuer Mehr-Menue)
- V5.5 Angebot-Erstellung (FEAT-551..555, fuer Angebot-Action-Button)
- V5.1 Click-to-Call (fuer Anruf-Action)
- BL-441 Theming (Brand-Tokens fuer Action-Bar-Buttons)
