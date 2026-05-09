# FEAT-663 — Deals-Listen-Seite (Top-10 + Karten-Grid + Type-Ahead)

**Status:** planned
**Version:** V6.6
**Created:** 2026-05-09
**Sources:** DISCOVERY-V6.6.md Block 3

## Purpose

Die Deals-Listen-Seite zeigt heute eine flache Tabelle mit allen Deals (Pipeline-Switcher fehlt oder filtert nur Tabelle), keine explizite Top-10-Sortierung nach gewichtetem Wert, keine visuelle Karten-Optik. Won/Lost-Deals erscheinen entweder verstreut in der Liste oder sind ueber Filter ausgeblendet — nicht als bewusste "Lessons Learned"-Quelle erkennbar.

Ziel: Deals-Listen-Seite wird zum **Karten-Grid mit Top-10-Block** und einer klar getrennten "Gewonnen/Verloren"-Sektion. Pipeline-Switcher filtert beides (Top-10 UND Karten-Grid). Type-Ahead-Suche ueber Stammdaten (Title + Firma + Kontakt) statt NL-Suche.

Karten sind kompakt — Foto/Avatar/Hauptkontakt erscheint erst beim Klick auf den Deal (Deal-Detail).

## Scope

### Teil 1: Top-10-Block oben

- Server-side gewichtete Sortierung: `ORDER BY (value × probability) DESC LIMIT 10`
- Top-10 zeigt die wertvollsten aktiven Deals (Stage `won`/`lost`/`parked` ausgeschlossen)
- Visuelle Differenzierung zum Karten-Grid darunter (z.B. groessere Karten, "Top 10"-Badge)
- Pipeline-Switcher filtert auch den Top-10-Block

### Teil 2: Pipeline-Switcher

- Tabs oder Dropdown oben zum Wechseln zwischen Pipelines (z.B. "Multiplikatoren-Pipeline" und "Kunden-Pipeline" aus FEAT-104)
- Filter wirkt auf beide Bloecke (Top-10 UND Karten-Grid)
- Default: erste Pipeline oder zuletzt gewaehlte (localStorage)

### Teil 3: Aktive Deals als Karten-Grid

- Karten-Grid darunter (Grid mit responsive Breakpoints: 1 Spalte mobile, 2 tablet, 3-4 desktop)
- Karten-Inhalt kompakt:
  - Title (Deal-Name)
  - Wert (Value mit Waehrung)
  - Firma (Account-Name)
  - Stage-Badge (mit Brand-Token-Color)
  - Naechste Aktion (von `tasks` Tabelle, naechste offene Task fuer diesen Deal)
  - Wahrscheinlichkeit-Pill (Probability als Prozent)
- Karten OHNE Foto/Avatar/Hauptkontakt (Details beim Click → Deal-Detail oeffnen)
- Klick auf Karte navigiert zu `/deals/[id]` (Deal-Detail)

### Teil 4: 2 einklappbare Sektionen "Gewonnen" / "Verloren"

- Unter dem Karten-Grid: zwei separate Sektionen mit Header + Toggle (collapsed by default)
  - "Gewonnen" — alle Deals mit Stage `won` (ggf. der letzten 90 Tage)
  - "Verloren" — alle Deals mit Stage `lost`
- Geparkt-Deals erscheinen nicht hier (eigene Logik, ggf. dritte Sektion oder Filter)
- Auch hier Karten-Grid-Pattern wie aktive Deals

### Teil 5: Type-Ahead-Suche oben

- Search-Input am Seiten-Header
- Server-side Type-Ahead ueber Stammdaten:
  - `deals.title`
  - `companies.name` (via FK)
  - `contacts.first_name + last_name` (via Deal-Kontakt-Junction)
- **KEIN Volltext** ueber Notizen / Aktivitaeten / Transcripts
- Results als Dropdown unter dem Input (max 10 Vorschlaege)
- Klick auf Result navigiert zum Deal-Detail
- Pipeline-NL-Suche (alte `/pipeline-suche` ggf. ueber NL-Adapter) ist NICHT diese Suche → siehe FEAT-666

## Acceptance Criteria

**AC1:** /deals (Listen-Seite) rendert: Type-Ahead-Suche oben, Pipeline-Switcher darunter, Top-10-Block, Karten-Grid mit aktiven Deals, 2 einklappbare Sektionen "Gewonnen"/"Verloren".

**AC2:** Top-10-Block zeigt server-seitig sortiert nach `value × probability DESC LIMIT 10`. Stages `won`/`lost`/`parked` sind ausgeschlossen.

**AC3:** Pipeline-Switcher filtert Top-10 UND Karten-Grid UND beide Won/Lost-Sektionen.

**AC4:** Karten-Grid-Inhalt: Title + Wert + Firma + Stage-Badge + Naechste Aktion + Wahrscheinlichkeit-Pill — KEIN Foto/Avatar/Hauptkontakt sichtbar.

**AC5:** Klick auf eine Karte navigiert zu `/deals/[id]`.

**AC6:** "Gewonnen"-Sektion ist defaultmaessig collapsed, Klick auf Header expandiert. Gleiche Logik fuer "Verloren".

**AC7:** Type-Ahead-Suche zeigt max 10 Vorschlaege als Dropdown, Such-Quellen: deals.title + companies.name + contacts.full_name. Keine Volltext-Suche ueber Notizen/Transcripts.

**AC8:** Klick auf Type-Ahead-Result navigiert zum Deal-Detail.

**AC9:** Mobile (≤768px): 1 Spalte Karten-Grid, Pipeline-Switcher als Dropdown statt Tabs, Sektionen funktionieren weiterhin.

**AC10:** Build clean, Vitest gruen, Lint clean.

**AC11:** Live-Smoke: User oeffnet /deals, sieht Top-10 (echte Daten), wechselt Pipeline, Top-10 aendert sich. Klick auf Karte oeffnet Deal-Detail. Type-Ahead findet Deal nach Firmenname.

## Out of Scope

- NL-Suche (Pipeline-NL-Suche) — FEAT-666 ersetzt sie durch Type-Ahead
- Volltext-Suche ueber Transcripts/Notizen — kein V6.6
- Filter-Bar (z.B. nach Stage, Owner, Date-Range) — bleibt wie heute, kein neuer Filter in V6.6
- Kanban/Liste/Funnel-Toggle (existiert auf /pipeline, nicht auf /deals)
- Bulk-Actions (Mass-Update, Mass-Delete) — kein V6.6
- Drag-und-Drop Card-Sorting → ist Pipeline-View, nicht Deals-Liste
- Karten-Inhalt-Anpassung pro User → V7

## Open Questions for /architecture

- **F19 (neu)**: Top-10-Schwelle — fest auf 10 oder konfigurierbar (z.B. 5/10/20)? Empfehlung: fest auf 10 in V6.6.
- **F20 (neu)**: "Gewonnen"-Sektion — alle Won-Deals oder nur letzte 90 Tage? Empfehlung: letzte 90 Tage als Default, "Mehr anzeigen"-Button fuer aeltere.
- **F21 (neu)**: "Naechste Aktion" auf Karte — Task-Title (kompakt) oder Task-Title + Faelligkeitsdatum? Empfehlung: Title + relatives Datum ("morgen", "in 3 Tagen", "ueberfaellig").
- **F22 (neu)**: Type-Ahead-Indexing — bei vielen Deals (1000+) nutzt man Postgres-trigram-Index oder einfaches ILIKE? Empfehlung: ILIKE in V6.6 (User hat aktuell <500 Deals), trigram-Migration als BL falls Performance-Probleme.

## References

- `c:/strategaize/strategaize-business-system/docs/DISCOVERY-V6.6.md` Block 3
- FEAT-104 Opportunity/Deal Engine (V2, Reuse)
- FEAT-301 Deal-Workspace (V3, fuer Klick-Ziel Deal-Detail)
- BL-441 Theming (Brand-Tokens fuer Stage-Badges + Wahrscheinlichkeit-Pills)
