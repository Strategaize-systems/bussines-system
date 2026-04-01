# Product Requirements Document

## Purpose

Das StrategAIze Business Development System ist ein internes, KI-gestütztes Revenue- und Relationship-System für ein beratungsintensives B2B-Geschäft. Es steuert Multiplikatoren, Leads, Gespräche, Angebote und Übergaben datenfundiert und erzeugt aus Vertriebsinteraktionen strukturierte Erkenntnisse für bessere Entscheidungen und systemisches Lernen.

Es ist KEIN generisches CRM, KEINE Marketing-Suite, KEIN Content-Produktionssystem. Content-Erstellung, Social Media und Brand-Design gehören zu System 4 (Intelligence Studio).

## Vision

Ein datenfundiertes Vertriebssystem, das drei Dinge gleichzeitig leistet:

1. **Beziehungen und Chancen sauber steuern** — Multiplikatoren, Unternehmer-Leads, Opportunities, Gesprächsverläufe, Entscheidungsstatus, Deal-Reife, Übergabezeitpunkt
2. **Vertriebsgespräche in verwertbare Daten verwandeln** — nicht nur Notizen, sondern Zusammenfassungen, Einwände, Chancen, Risiken, Qualifikationssignale
3. **System 4 mit Rohstoff versorgen** — strukturierte Datenquelle für das Intelligence Studio

## Systemlandschaft

```
System 1: Blueprint / Onboarding-Plattform (operativ, für Kunden)
System 2: Operating System (Tagesgeschäft, Delivery)
System 3: Business Development System (DIESES SYSTEM — Revenue, Beziehungen, Akquise)
System 4: Intelligence Studio (Content, Wissen, Analyse)
```

System 3 liefert gewonnene Kunden an System 1 (Übergabe). System 3 erhält Content-Materialien von System 4. System 3 liefert Vertriebsdaten an System 4.

## Target Users

### Primär
- Eigentümer (Single User V1)
- Später: 1-2 interne Vertriebs-/Assistenzpersonen

### Nicht primär
- Kunden
- Externe Partner mit Vollzugriff
- Beraternetzwerk
- Delivery-Team

**Konsequenz:** System darf intern und effizient sein. Keine Multi-Org-Komplexität.

## Delivery Mode

- internal-tool

## V1 Features (11 Module)

### FEAT-001 — Kontakte & Organisationen (erweitert)

Nicht nur Kontakte verwalten, sondern Kontaktqualität im Kontext des Geschäftsmodells.

**Objekte:** Person, Organisation/Firma, Beziehungstyp, Rolle im Buying/Referral Process

**Beziehungstypen:**
- Steuerberater
- M&A-/Nachfolgeberater
- Bank / Firmenkundenbetreuer
- Verband / Netzwerk / Multiplikator
- Unternehmer / Zielkunde
- Dienstleister / potenzieller Umsetzungspartner
- Sonstige Einflussnehmer

**Felder (über Basis-CRM hinaus):**
- Rolle / Funktion
- Branche, Region, Sprache
- Quelle (wie kennengelernt)
- Empfehlungsfähigkeit
- Zugang zu Zielkunden
- Thematische Relevanz
- Vertrauen / Beziehungstiefe
- Letzte Interaktion
- Nächste Aktion

**Acceptance Criteria:**
- Kontakte haben Beziehungstyp-Zuordnung
- Kontaktqualität ist auf einen Blick sichtbar
- Filter nach Beziehungstyp, Region, Branche funktioniert

### FEAT-002 — Firmen/Account-Sicht (erweitert)

Nicht nur Firmendaten, sondern eine Eignungssicht für StrategAIze.

**Basis-Felder:** Name, Branche, Größe, Region, Website, Kontaktdaten

**Eignungsfelder (StrategAIze-spezifisch):**
- Exit-/Nachfolgebezug (ja/nein/unklar)
- KI-/Transformationsreife (grob)
- Eigentümerstruktur (grob)
- Entscheiderzugang vorhanden?
- Budgetpotenzial
- Komplexität passend?
- Wille zur Mitarbeit?
- Interner Champion denkbar?
- Strategische Relevanz
- Blueprint-Fit Bewertung (fit / später / raus)

**Verknüpfungen:** Multiplikator-Zuordnung, aktuelle Opportunity, Gesprächsnotizen, Angebote

**Acceptance Criteria:**
- Firmen-Detail zeigt Eignungsbewertung
- Blueprint-Fit ist als Ampel sichtbar
- Zugeordnete Kontakte, Opportunities, Gespräche sind verlinkt

### FEAT-003 — Multiplikator-Management (neu)

Kern-Modul, nicht Nebensache. Multiplikatoren sind der primäre Akquise-Kanal.

**Felder:**
- Multiplikator-Typ (Steuerberater, Bank, Verband, etc.)
- Vertrauensstatus
- Empfehlungswahrscheinlichkeit
- Gemeinsame Gespräche
- Vermittelte Leads + Qualität der Leads
- Rückkopplung zur Zusammenarbeit
- Follow-up-Rhythmus
- Themeninteressen
- Passende Inhalte/Assets

**Auswertungen:**
- Wer bringt gute Leads?
- Wer bringt unpassende Leads?
- Wer ist offen aber noch passiv?
- Wo lohnt Beziehungsaufbau?

**Acceptance Criteria:**
- Multiplikator-Übersicht mit Empfehlungs-Statistiken
- Lead-Qualität pro Multiplikator sichtbar
- Eigene Pipeline (10 Stufen) für Multiplikator-Beziehungen

### FEAT-004 — Opportunity/Deal Engine (umgebaut)

Geschäftsspezifische Pipeline-Stufen statt generischem Kanban.

**Opportunity-Typen:**
- Multiplikator-Beziehungsaufbau
- Potenzielle Empfehlung
- Direkter Unternehmer-Lead
- Blueprint-Verkauf
- Folgeprodukt / Operating System
- Zusatzprojekt / Umsetzungsprojekt
- Partnerprojekt

**Pipeline: Multiplikatoren (10 Stufen):**
1. Identifiziert
2. Recherchiert
3. Erstansprache geplant
4. Erstkontakt erfolgt
5. Gespräch geführt
6. Potenzial vorhanden
7. Aktiv in Beziehungspflege
8. Erste Empfehlung erhalten
9. Strategischer Multiplikator
10. Inaktiv / disqualifiziert

**Pipeline: Unternehmer-Chancen (12 Stufen):**
1. Signal / Hinweis eingegangen
2. Erste Einordnung
3. Qualifikationsgespräch geplant
4. Erstgespräch geführt
5. Fit wahrscheinlich
6. Vertiefung / Bedarfsschärfung
7. Angebot vorbereitet
8. Angebot offen
9. Verhandlung / Einwände
10. Gewonnen
11. Verloren
12. Geparkt
    (→ Übergabe an Onboarding)

**Acceptance Criteria:**
- Zwei separate Kanban-Boards
- Drag & Drop zwischen Stufen
- Stufen-Wechsel wird als Aktivität protokolliert
- Deal-Karten zeigen Kontakt, Firma, Wert, nächste Aktion

### FEAT-005 — Gesprächsmanagement (erweitert)

Strukturierte Gesprächsdokumentation, nicht nur freie Notizen.

**V1 Felder:**
- Gesprächsart (Erstgespräch, Follow-up, Qualifikation, Verhandlung, etc.)
- Teilnehmer (verknüpft mit Kontakten)
- Termin-Verknüpfung
- Strukturierte Notizen:
  - Zusammenfassung
  - Einwände
  - Chancen
  - Risiken
  - Nächste Schritte
  - Qualifikationssignale
- Verknüpfung zu Opportunity / Firma / Kontakt

**V2 (geparkt):** Audio-Aufnahme, Transkription (Whisper), KI-Zusammenfassung, automatische Signal-Extraktion

**Acceptance Criteria:**
- Gespräche sind strukturiert erfassbar (nicht nur Freitext)
- Gespräche erscheinen in der Relationship Timeline
- Einwände und Chancen sind als Tags/Felder markierbar

### FEAT-006 — E-Mail-Management (neu)

Vertriebsnahe E-Mail-Kommunikation direkt aus dem System.

**V1 Funktionen:**
- E-Mail verfassen pro Kontakt/Firma
- SMTP-Versand über konfigurierte E-Mail-Adresse (Gmail, eigener Server)
- Automatisches Logging gesendeter Mails
- Follow-up-Status: offen / beantwortet / überfällig
- Vorlagen für einzelne Schritte
- Draft-Unterstützung durch Skills (z.B. /cold-email)

**Nicht V1:**
- IMAP-Inbox-Synchronisation (empfangene Mails automatisch)
- Newsletter/Broadcast
- Kampagnen-Automation

**Acceptance Criteria:**
- E-Mail kann aus Kontakt-Detail versendet werden
- Gesendete Mails erscheinen in Timeline
- Follow-up-Status ist sichtbar (offen/überfällig)

### FEAT-007 — Angebots-/Proposal-Steuerung (neu)

Angebotslogik für beratungsintensive Verkaufsprozesse.

**Felder:**
- Angebotsname / Titel
- Status (Draft, Versendet, Offen, Verhandlung, Gewonnen, Verloren)
- Angebotsversionen (V1, V2, etc.)
- Scope-Hinweise
- Preisrahmen
- Einwände / Verhandlungsnotizen
- Verknüpfung zu Deal + Firma + Kontakt
- Won/Lost Gründe (strukturiert)

**Won/Lost Gründe (strukturiert):**
- Preis
- Timing
- Falscher Fit
- Keine Priorität
- Kein Vertrauen
- Partner ungeeignet
- Intern blockiert
- Kein Champion
- Kein Budget
- Sonstiges

**Nicht V1:** PDF-Generator, eSign, komplexe Kalkulation

**Acceptance Criteria:**
- Angebote sind pro Deal verwaltbar
- Versionen sind nachvollziehbar
- Won/Lost-Analyse ist auswertbar

### FEAT-008 — Qualifizierung/Fit-Gates (neu)

Explizite Fit-Logik — nicht jede Firma und nicht jeder Multiplikator wird weiterverfolgt.

**Fit-Kriterien Firmen:**
- Exit-/Nachfolgebezug
- KI-/Strukturbedarf
- Entscheiderzugang
- Budgetpotenzial
- Komplexität passend?
- Wille zur Mitarbeit?
- Interner Champion denkbar?
- Strategische Relevanz

**Fit-Kriterien Multiplikatoren:**
- Zugang zu Zielgruppe?
- Vertrauen?
- Professionalität?
- Empfehlungsqualität?
- Bereitschaft zur Zusammenarbeit?
- Konfliktpotenzial?
- Markenfit?

**Output:** Score oder Ampel + "weiterverfolgen / beobachten / raus" + Grund dokumentiert

**Acceptance Criteria:**
- Fit-Bewertung ist pro Firma + Multiplikator sichtbar
- Ampel-System (grün/gelb/rot)
- Disqualifikations-Grund ist dokumentiert

### FEAT-009 — Aufgaben/Follow-ups (erweitert)

Eigenständiges Aufgabenmodul, nicht nur ein Feld auf dem Deal.

**Felder:**
- Nächste Aktion (Freitext)
- Verknüpfung zu Kontakt / Firma / Deal
- Frist
- Priorität (hoch/mittel/niedrig)
- Status (offen / erledigt / wartet)
- Verantwortlicher (V1: immer Eigentümer)

**Acceptance Criteria:**
- Aufgaben-Übersicht mit Filter nach Frist/Priorität
- Überfällige Aufgaben sind rot markiert
- Dashboard zeigt Top-5 nächste Aktionen

### FEAT-010 — Übergabe an System 1 (neu)

Brücke zwischen Vertrieb und operativem Onboarding.

**Wenn Deal gewonnen:**
- Übergabe-Status markieren
- Einstiegsschiene dokumentieren (Blueprint / Operating System / Zusatzprojekt)
- Ansprechpartner die mitgehen
- Vorinformationen (Gespräche, Einwände, Erwartungen)
- Relevante Dokumente
- Gesprächserkenntnisse die das Delivery-Team wissen muss

**Acceptance Criteria:**
- "Übergabe starten" Button auf gewonnenen Deals
- Übergabe-Checkliste ist ausfüllbar
- Übergabe-Status ist im Dashboard sichtbar

### FEAT-011 — Kalender/Meeting-Buchung (neu)

Meeting-Organisation für Vertriebsgespräche.

**V1:** Cal.com oder Calendly Link-Integration
- "Meeting buchen" Button pro Kontakt
- Link öffnet Buchungsseite
- Gebuchte Meetings erscheinen in Timeline (manuell oder via Webhook)

**V2:** Kalender-Sync (Google Calendar / Outlook), automatische Timeline-Einträge

**Acceptance Criteria:**
- Meeting-Buchungs-Link ist pro Kontakt verfügbar
- Gebuchte Meetings sind dokumentierbar

### Sonderfunktionen (quer über Module)

**Relationship Timeline:**
- Chronologische Sicht pro Kontakt/Firma: Gespräche, E-Mails, Notizen, Angebote, Empfehlungen, Aufgaben
- Auf einen Blick sehen was wirklich lief

**Signal-Logik (V1 manuell, V2 automatisch):**
- Signale markieren: hohes Interesse, Budgetsignal, Einwand, interne Blockade, Champion vorhanden, Timing ungeeignet, falscher Fit, akuter Druck, hoher Multiplikatorwert

**Referral Tracking:**
- Wer hat wen empfohlen, wann, was wurde daraus
- Welcher Kanal funktioniert, welche Partner sind wertvoll

**Deal Loss Analysis:**
- Strukturierte Verlustgründe bei jedem verlorenen Deal
- Auswertbar über Zeit

## Out of Scope (explizit)

NICHT Teil dieses Systems:
- Blog-Produktion
- LinkedIn-Post-Produktion
- Content-Planung / Redaktionskalender
- Social-Media-Management
- Carousel-/Video-Erstellung
- Brand System / Style Guide
- Prompt-Labor / Skill-Bibliothek
- Delivery-Artefakte / SOP-Katalog
- Knowledge Base
- Partner-Lizenzverwaltung
- Projektmanagement
- Newsletter/Broadcast/Marketing-Automation

Diese gehören zu **System 4 (Intelligence Studio)** oder **System 2 (Operating System)**.

## Constraints

- Single User V1 (Eigentümer)
- Kein SaaS, keine externe Nutzer
- Claude Max Subscription (keine API-Kosten)
- Self-hosted auf Hetzner (CPX32, Coolify, Docker Compose)
- Bestehende Next.js + Supabase Infrastruktur wiederverwendbar
- DSGVO-konform (eigener Server, keine US-Cloud)

## Risks & Assumptions

| Risiko | Mitigation |
|---|---|
| Schema-Redesign bei laufendem System | V1 ist erst wenige Tage deployed, keine echten Daten |
| E-Mail SMTP-Integration Komplexität | Gmail App-Passwort ist dokumentiert, kein OAuth nötig für V1 |
| 11 Module sind viel für V1 | Mehrere Module sind Erweiterungen bestehender Basis, nicht Neubauten |
| Cal.com Integration | V1 nur als Link-Embedding, keine tiefe Integration |

## Success Criteria

V1 ist erfolgreich wenn:
1. Eigentümer kann Multiplikatoren mit spezifischen Beziehungstypen managen
2. Zwei separate Pipelines (Multiplikatoren + Kunden) mit geschäftsspezifischen Stufen funktionieren
3. Gespräche können strukturiert (nicht nur Freitext) dokumentiert werden
4. E-Mails können direkt aus dem System versendet werden
5. Angebote sind pro Deal mit Versionen und Won/Lost-Gründen verwaltbar
6. Fit-Gates zeigen Ampel-Bewertung pro Firma und Multiplikator
7. Gewonnene Deals haben einen klaren Übergabe-Prozess
8. Relationship Timeline zeigt alle Interaktionen chronologisch
9. Dashboard zeigt BD-relevante Metriken (nicht generische CRM-Zahlen)

## Open Questions

Keine blockierenden offenen Fragen. Fit-Gates UI wird während Implementation entschieden.
