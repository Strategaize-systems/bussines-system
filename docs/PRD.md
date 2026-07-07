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

---

# V3 — Operative Kontextlogik

## V3 Purpose

V3 transformiert das System von einem feature-zentrierten CRM mit gleichberechtigten Listen-Seiten zu einem kontextzentrierten Business-Development-Betriebssystem. Die primaere Arbeitslogik wird kontextzentriert, prozesszentriert, aktionsorientiert und KI-unterstuetzt.

Klassische CRM-Bereiche (Kontakte, Firmen, Pipeline, Aufgaben, Termine) bleiben als Fallback-/Verwaltungs-/Korrekturebene erhalten. Die primaere Arbeit findet in Workspaces, ueber Mein Tag und mit KI-Unterstuetzung statt.

## V3 Vision — 5-Schichten-Architektur

```
Schicht 1: Operative Arbeit
  → Mein Tag, Deal-/Firmen-/Kontakt-Workspaces, Schnellaktionen, KI-Unterstuetzung

Schicht 2: Analyse (vorbereitet in V3, aktiv ab V3.1)
  → Persoenliches Analyse-Cockpit, Management-Cockpit, KI-Datenabfragen

Schicht 3: Prozesslogik (Basis in V3, Ausbau V3.1)
  → Phasenlogik, Soll-Schritte, naechste empfohlene Aktion, Stagnation

Schicht 4: Wissens-/Insight-Schicht (V4)
  → Wissensbasis, Insight-Review-Queue, Einwaende, Best Practices

Schicht 5: Fallback / Verwaltung / Korrektur
  → Listenansichten, Stammdatenpflege, Exception Queue, Settings
```

## V3 Architekturleitplanken

1. KI ist Analyse-, Kontext-, Vorschlags-, Entwurfs- und Priorisierungsschicht
2. KI darf ohne menschliche Bestaetigung NICHT:
   - offizielles Wissen festschreiben
   - kritische Kommunikation final versenden
   - Regeln veraendern
   - sensible Datensatzaenderungen endgueltig machen
3. Prinzip: **Confirm before write**
4. Human-in-the-loop bei: Wissenseintraegen, Insight-Freigaben, kritischen Statusaenderungen, unsicheren Zuordnungen, extern wirksamer Kommunikation

## V3 Rollenmodell

| Rolle | Zugriff |
|---|---|
| Operativer Nutzer | Mein Tag, Workspaces, persoenliche Analyse, Aufgaben/Termine/Kommunikation im eigenen Kontext |
| Geschaeftsfuehrer / Admin | Alles aus operativer Rolle + Management-Cockpit, volle Datenuebersicht, Freigabe Wissen/Insights, Settings |

Spaeter (V5): Teamlead mit Teamsicht und begrenzten Freigaben.

## V3 Target Screens

### FEAT-301: Deal-Workspace (`/deals/[id]`)
Eigene Seite statt Side-Panel. Zentraler Arbeitsort fuer jeden Deal.
- Deal-Kopf: Status, Phase, Wert, Wahrscheinlichkeit, verknuepfte Firma/Kontakte
- KI-Kurzbriefing via Bedrock: automatische Deal-Zusammenfassung
- Timeline aller Aktivitaeten, E-Mails, Proposals, Signals, Meetings
- Tasks im Deal-Kontext (aktuell nur ueber /aufgaben erreichbar)
- Einfacher Prozess-Check: regelbasiert — welche Pflichtschritte fehlen fuer aktuelle Stage
- Direktaktionen: Task erstellen, E-Mail, Notiz, Activity, Stage-Wechsel

**Akzeptanzkriterien:**
1. /deals/[id] ist eine eigene Route (kein Sheet/Modal)
2. Deal-Header zeigt Status, Stage, Wert, Wahrscheinlichkeit, Firma, Kontakt
3. KI-Briefing-Panel zeigt LLM-generierte Deal-Zusammenfassung (Bedrock)
4. Timeline zeigt Activities + E-Mails + Proposals + Signals chronologisch
5. Tasks-Sektion zeigt alle Tasks die mit diesem Deal verknuepft sind
6. Prozess-Check zeigt fehlende Pflichtschritte fuer aktuelle Stage
7. Direktaktions-Buttons: Neue Task, E-Mail, Notiz, Stage-Wechsel
8. Klick auf Kanban-Card in Pipeline oeffnet Deal-Workspace-Route

### FEAT-302: Mein Tag V2
Geschaerftes operatives Tages-Cockpit mit echten Daten und KI.
- Echte Kalender-Daten statt Dummy (calendar_events Tabelle)
- Meeting-Prep-Slot: naechstes Meeting mit Deal-/Kontakt-Kontext
- Exception-Hinweise: stagnierte Deals, fehlende Follow-ups, offene Zuordnungen
- KI-Tages-Summary via Bedrock: "Was steht heute an, was ist wichtig"
- Verfuegbare Zeit basierend auf echten Events
- Kontextgesteuerter Einstieg in relevante Deals/Kontakte

**Akzeptanzkriterien:**
1. Kalender-Panel zeigt echte Events aus calendar_events Tabelle
2. Meeting-Prep zeigt naechstes Meeting mit verknuepftem Deal-/Kontakt-Kontext
3. Exception-Bereich zeigt stagnierte Deals (>14d ohne Aktion) und ueberfaellige Tasks
4. KI-Summary-Panel liefert Bedrock-generierte Tageseinschaetzung
5. Verfuegbare-Zeit-Berechnung basiert auf echten Calendar-Events
6. Quick-Actions und Task-Liste bleiben funktional (bestehend)

### FEAT-303: Firmen-Workspace Upgrade
Erweitert bestehende Firmen-Detail-Seite zum Workspace.
- Deal-Liste im Firmenkontext (aktive + vergangene Deals mit Wert und Status)
- KI-Summary-Slot (UI-Platzhalter in V3, aktiv ab V3.1)

**Akzeptanzkriterien:**
1. /companies/[id] zeigt Deal-Liste (aktiv + vergangen) mit Status, Wert, Phase
2. KI-Summary-Platzhalter ist sichtbar (leer, mit "KI-Summary ab V3.1" Hinweis)
3. Bestehende Funktionen (Profil, Kontakte, Timeline, Dokumente, Fit-Assessment) bleiben erhalten

### FEAT-304: Kontakt-Workspace Upgrade
Erweitert bestehende Kontakt-Detail-Seite zum Workspace.
- Deals im Kontakt-Kontext (aktive + vergangene)
- KI-Summary-Slot (UI-Platzhalter in V3, aktiv ab V3.1)

**Akzeptanzkriterien:**
1. /contacts/[id] zeigt Deal-Liste (aktiv + vergangen) mit Status, Wert, Phase
2. KI-Summary-Platzhalter ist sichtbar
3. Bestehende Funktionen (Profil, Kommunikationshistorie, Firmenbezug) bleiben erhalten

### FEAT-305: Bedrock LLM-Integration Layer
Zentrale KI-Infrastruktur fuer alle KI-Features.
- Zentraler Service /lib/ai/ mit AWS Bedrock Client (eu-central-1)
- Prompt-Templates fuer: Deal-Briefing, Tages-Summary
- Response-Parser mit strukturiertem Output
- Confirm-before-write Middleware (UI-Dialog + API-Check)
- Rate-Limiting, Error-Handling, Fallback
- API-Route /api/ai/query

**Akzeptanzkriterien:**
1. /lib/ai/ Service existiert mit Bedrock-Client (Claude Sonnet 4.6, eu-central-1)
2. Deal-Briefing-Prompt produziert strukturierte Zusammenfassung
3. Tages-Summary-Prompt produziert priorisierte Tagesansicht
4. Confirm-before-write Dialog erscheint bei schreibenden KI-Aktionen
5. API-Route /api/ai/query ist authentifiziert und rate-limited
6. Fehler (Timeout, Rate-Limit, Auth) werden sauber abgefangen und angezeigt

### FEAT-306: Navigation-Umbau
Von flacher Feature-Liste zu hierarchischer Schicht-Struktur.

**Neue Sidebar-Struktur:**
```
OPERATIV (Schicht 1)
  Mein Tag
  Pipeline
  
WORKSPACES (Schicht 1)
  (Dynamisch: letzte besuchte Deals/Firmen/Kontakte)
  Alle Deals
  Alle Firmen
  Alle Kontakte

ANALYSE (Schicht 2, vorbereitet)
  Dashboard

VERWALTUNG (Schicht 5)
  Aufgaben
  Termine
  E-Mails
  Multiplikatoren
  Settings
```

**Akzeptanzkriterien:**
1. Sidebar zeigt neue Schicht-Gruppierung
2. Operativ-Bereich ist visuell prominent (oben, evtl. groessere Icons)
3. Verwaltung-Bereich ist visuell zurueckgenommen (kleiner, collapsible)
4. Pipeline-Seiten bleiben funktional (Kanban-Boards)
5. Bestehende Listen-Seiten bleiben als Fallback erreichbar

### FEAT-307: Governance-Basis
Minimale Rollen-, Sichtbarkeits- und Audit-Infrastruktur.
- Profiles erweitern: role (operator/admin)
- Basis-RLS: Operator sieht eigene Daten (created_by = auth.uid()), Admin sieht alles
- Dedizierte audit_log Tabelle
- Audit-Logging bei: Statuswechsel, Deal-Aenderungen, Stage-Transitions

**Akzeptanzkriterien:**
1. profiles.role Feld existiert (operator/admin, Default: admin fuer Eigentuemer)
2. RLS-Policies unterscheiden Operator vs Admin bei Lese-/Schreibzugriff
3. audit_log Tabelle existiert (actor_id, action, entity_type, entity_id, changes JSONB, created_at)
4. Stage-Wechsel, Deal-Status-Aenderungen und kritische Mutations schreiben Audit-Log
5. Admin kann Audit-Log einsehen (einfache Listen-Ansicht)

### FEAT-308: Meeting-Management
Eigenes Meeting-Objekt statt nur Activity-Typ.
- Eigene meetings Tabelle (DEC-021)
- Felder: Titel, Datum/Zeit, Teilnehmer, Agenda, Ergebnis, Notizen
- Verknuepfung zu Deal, Kontakt, Firma
- Vorbereitet fuer Transkription (transcript-Feld, leer in V3)
- Meetings erzeugen automatisch Activity-Eintrag (source_type + source_id)

**Akzeptanzkriterien:**
1. meetings Tabelle existiert mit allen definierten Feldern
2. Meeting-Erstellung aus Deal-Workspace und Mein Tag moeglich
3. Meetings erscheinen in Timeline (ueber Activities mit source_type='meeting')
4. Meeting-Detail zeigt Teilnehmer, Agenda, Ergebnis
5. transcript-Feld existiert (leer, fuer V4 vorbereitet)

### FEAT-309: Kalender-Events
Eigene Kalender-Datenquelle fuer Mein Tag.
- Eigene calendar_events Tabelle (DEC-026)
- Felder: Titel, Start, Ende, Typ, Beschreibung, verknuepfte Entitaeten
- CRUD-UI fuer Events
- Integration in Mein Tag Kalender-Panel
- Verfuegbare-Zeit-Berechnung

**Akzeptanzkriterien:**
1. calendar_events Tabelle existiert mit definierten Feldern
2. Events koennen erstellt, bearbeitet, geloescht werden
3. Mein Tag Kalender-Panel zeigt echte Events statt Dummy-Daten
4. Verfuegbare-Zeit-Berechnung basiert auf echten Events
5. Events koennen mit Deals, Kontakten, Firmen verknuepft werden

## V3 Scope — Zusammenfassung

### In Scope
- 9 Features (FEAT-301 bis FEAT-309)
- 3 neue DB-Tabellen (meetings, calendar_events, audit_log)
- 1 DB-Tabellen-Erweiterung (activities: source_type + source_id; profiles: role)
- 1 neuer Service-Layer (/lib/ai/)
- 1 neue API-Route (/api/ai/query)
- Navigation-Umbau
- Basis-RLS-Umbau

### Out of Scope (V3.1+)
- ~~Persoenliches Analyse-Cockpit~~ → V6 (FEAT-603)
- ~~Ziel-Objekt + Zielabgleich~~ → V6 (FEAT-602)
- ~~KPI-Snapshots~~ → V6 (FEAT-604)
- Exception Queue als eigene Seite
- Automatische Folgeaktivitaeten
- KI-Summaries fuer Firmen/Kontakte aktiv
- Stagnations-Alerts aktiv (bleiben visuell)

### Out of Scope (V4+)
- Wissensbasis + Insight-Review-Queue
- Management-Cockpit LLM-Ausbau
- Meeting-Transkription → Insights
- Einwandmuster-Erkennung
- IMAP-Integration
- Cal.com-Sync
- Call Intelligence

### Out of Scope (V5+)
- Cadences / Sequences
- Routing / Territories
- Teamlead-Rolle
- Intelligence-Platform-Export
- Workflow-Automation

## V3 Constraints

- Single User (Eigentuemer) + Basis fuer zweite Rolle (Operator)
- Self-hosted auf Hetzner (bestehender CPX32)
- AWS Bedrock Frankfurt (eu-central-1) fuer LLM — DSGVO-konform
- OpenAI Whisper API bleibt (DEC-019)
- Bestehende Next.js + Supabase Infrastruktur
- Kein SaaS, keine externen Nutzer
- KI-Kosten geschaetzt: 5-15 EUR/Monat (Bedrock)

## V3 Risks & Assumptions

| Risiko | Mitigation |
|---|---|
| Bedrock-Integration Komplexitaet | Blueprint Plattform nutzt Bedrock bereits — bewaehrter Stack |
| RLS-Umbau bei laufendem System | Single-User — RLS ist aktuell ohnehin full-access, Umbau risikoarm |
| KI-Latenz bei Deal-Briefings | Async-Loading mit Skeleton-UI, Caching fuer wiederholte Abfragen |
| Navigation-Umbau bricht bestehende Bookmarks | Alle alten Routen bleiben funktional, nur Sidebar-Struktur aendert sich |
| Activities source_type Migration | Bestehende Activities bekommen source_type=null, neue bekommen korrekte Werte |

## V3 Success Criteria

V3 ist erfolgreich wenn:
1. Eigentuemer oeffnet morgens Mein Tag und sieht echte Termine, Aufgaben, Meeting-Prep + KI-Summary
2. Klick auf Deal in Pipeline oeffnet Deal-Workspace mit Briefing, Timeline, Tasks, Prozess-Check
3. Deal-Workspace ist der primaere Arbeitsort (nicht mehr DealDetailSheet)
4. KI-Briefings werden via Bedrock generiert und sind in <3s sichtbar
5. Confirm-before-write funktioniert bei KI-generierten Aktionen
6. Navigation zeigt klare Hierarchie: Operativ > Analyse > Verwaltung
7. Audit-Log protokolliert kritische Aenderungen
8. Basis-RLS unterscheidet Operator/Admin

## V3 BD-Flow-Unterstuetzung

Der Business-Development-Flow wird in V3 an folgenden Stellen unterstuetzt:

| BD-Phase | V3-Unterstuetzung |
|---|---|
| Lead Intake | Bestehende Pipeline (Lead-Management). Spaeter (V3.1): Exception Queue fuer unklare Zuordnungen |
| Qualifizierung | Bestehende Fit-Gates. V3: Deal-Workspace zeigt Fit-Status + Prozess-Check |
| Nurturing/Bearbeitung | V3: Deal-Workspace mit Timeline, Tasks, E-Mails, Meetings, KI-Briefing |
| Angebot/Entscheidung | Bestehende Proposals. V3: Proposals im Deal-Workspace sichtbar, Prozess-Check warnt bei fehlenden Schritten |
| Abschluss/Verlust | Bestehende Won/Lost-Logik + Insight-Export. V3: Audit-Log dokumentiert Abschluss |

## V3 Open Questions

Keine blockierenden offenen Fragen. Alle 6 Architekturentscheidungen (DEC-021 bis DEC-026) sind bestaetigt.

---

# V4 — KI-Gatekeeper + Externe Integrationen

## V4 Purpose

V4 transformiert das Business System von einem System mit KI-Unterstuetzung zu einem System mit KI-Gatekeeper. Die KI wird zum persoenlichen Assistenten, der eingehende Kommunikation analysiert, priorisiert, Handlungen vorschlaegt und Wiedervorlagen intelligent verwaltet — immer mit menschlicher Freigabe (Confirm-before-act).

Gleichzeitig wird die Kalender-Infrastruktur professionalisiert: Cal.com als Self-Hosted Buchungs- und Sync-Engine, Gesamtkalender-Ansicht als zentrales Planungsinstrument.

V4 ist KEIN inkrementelles UI-Update. V4 veraendert fundamental, wie der Eigentuemer morgens seinen Tag beginnt und wie eingehende Kommunikation verarbeitet wird.

## V4 Vision — Vom CRM zum KI-gesteuerten Arbeitssystem

```
VORHER (V3.3):
  Morgens einloggen → Mein Tag ansehen → E-Mail-Postfach separat durcharbeiten
  → manuell priorisieren → manuell Wiedervorlagen erstellen → manuell zuordnen

NACHHER (V4):
  Morgens einloggen → Mein Tag zeigt:
    - KI-Gatekeeper: "3 dringende E-Mails, 2 Wiedervorlagen faellig, 1 Auto-Reply erkannt"
    - Wiedervorlagen-Liste: Freigeben / Verschieben / Abbrechen (5 Min)
    - Gesamtkalender: Alle Termine auf einen Blick (Cal.com-Sync)
    - KI hat bereits E-Mails klassifiziert, Kontakten zugeordnet, Prioritaeten gesetzt
```

## V4 Architekturleitplanken

1. **Confirm-before-act bleibt Grundprinzip** — KI schlaegt vor, Mensch entscheidet
2. **IMAP ist Fundament** — ohne eingehende E-Mails kein Gatekeeper
3. **Self-Hosted Everything** — IONOS IMAP direkt, Cal.com Self-Hosted, Jitsi Self-Hosted (V4.1)
4. **EU-only Datenhaltung** — IONOS (DE) → Hetzner (DE) → Bedrock Frankfurt (EU)
5. **Suggest-Approve-Execute Pattern** — KI-Aktionen durchlaufen immer die Queue
6. **Kosten-bewusst** — KI-Analyse on-demand oder batch, nicht bei jedem E-Mail-Eingang

## V4 Features (6 Features)

### FEAT-405 — IMAP Mail-Integration

Eingehende E-Mails automatisch synchronisieren, speichern und im System verfuegbar machen.

**Infrastruktur:**
- `imapflow` Library fuer IMAP-Verbindung
- IONOS IMAP-Server direkt (imap.ionos.de, Port 993, SSL)
- Background-Sync-Service (Polling-Intervall konfigurierbar, Default: 5 Min)
- Neue DB-Tabellen: `email_messages`, `email_threads`

**Funktionen:**
- Eingehende E-Mails synchronisieren (INBOX + konfigurierbare Ordner)
- E-Mails automatisch Kontakten/Firmen zuordnen (via E-Mail-Adresse)
- E-Mail-Detail-Ansicht im System
- E-Mails in Unified Timeline anzeigen
- Thread-Erkennung (In-Reply-To / References Header)
- Attachment-Handling (Metadaten speichern, Download-Link)
- DSGVO: 90-Tage Retention Policy (konfigurierbar)

**Nicht V4:**
- Ausgehende E-Mails via IMAP senden (SMTP bleibt wie bisher)
- Multi-Account (nur ein Postfach in V4)
- Ordner-Management im System

**Akzeptanzkriterien:**
1. Eingehende E-Mails werden automatisch synchronisiert (max. 5 Min Delay)
2. E-Mails werden korrekt Kontakten/Firmen zugeordnet (via gespeicherte E-Mail-Adressen)
3. Nicht zuordenbare E-Mails landen in einer "Unzugeordnet"-Queue
4. E-Mails erscheinen in der Unified Timeline des zugeordneten Kontakts/Firma/Deals
5. Thread-Erkennung gruppiert zusammengehoerige E-Mails
6. Sync-Status ist in Settings sichtbar (letzte Sync, Anzahl, Fehler)
7. Retention Policy loescht E-Mails aelter als 90 Tage automatisch

### FEAT-408 — KI-Gatekeeper (E-Mail-Analyse)

KI analysiert eingehende E-Mails, klassifiziert sie, priorisiert und schlaegt Aktionen vor.

**Abhaengigkeit:** Erfordert FEAT-405 (IMAP).

**Architektur (aus Recherche RPT-047):**
- Zwei-Pass-Klassifikation:
  1. Regelbasiert (Absender bekannt? Auto-Reply? Newsletter?)
  2. Bedrock Claude fuer komplexe Klassifikation
- `ai_action_queue` Tabelle fuer vorgeschlagene Aktionen
- Prioritaets-Stufen: Dringend / Normal / Niedrig / Spam/Irrelevant

**Funktionen:**
- Eingehende E-Mails automatisch klassifizieren (Prioritaet + Kategorie)
- Kontextualisierung: Deal-Bezug, offene Angebote, letzte Interaktion einbeziehen
- Aktions-Vorschlaege: "Antwort noetig", "Wiedervorlage erstellen", "Termin vereinbaren"
- Alert-UI in Mein Tag: Dringende E-Mails sofort sichtbar
- Batch-Verarbeitung: Neue E-Mails seit letztem Login als Zusammenfassung

**Nicht V4:**
- Automatische Antwort-Generierung (nur Vorschlaege)
- Automatisches Weiterleiten an Dritte
- Cross-System E-Mail-Analyse (nur Business System Kontext)

**Akzeptanzkriterien:**
1. Jede synchronisierte E-Mail bekommt Prioritaet und Kategorie
2. Regelbasierte Klassifikation erkennt Auto-Replies, Newsletter, bekannte Absender
3. Bedrock-Analyse laeuft on-click oder batch (nicht automatisch bei jedem E-Mail-Eingang)
4. Mein Tag zeigt Gatekeeper-Summary: "X dringende, Y normale, Z irrelevante E-Mails"
5. Klick auf Gatekeeper-Summary oeffnet priorisierte E-Mail-Liste
6. Aktions-Vorschlaege erscheinen in `ai_action_queue` mit Freigabe-Workflow
7. Falsch-klassifizierte E-Mails koennen manuell umklassifiziert werden (Feedback-Loop)

### FEAT-410 — KI-Kontextanalyse (Auto-Replies)

Intelligente Erkennung von Auto-Replies, Abwesenheitsnotizen und automatischen Antworten — mit automatischer Anpassung von Wiedervorlagen.

**Abhaengigkeit:** Erfordert FEAT-405 (IMAP) + FEAT-407 (KI-Wiedervorlagen).

**Funktionen:**
- Auto-Reply-Erkennung via Header-Analyse (Auto-Submitted, X-Auto-Response-Suppress)
- Abwesenheits-Erkennung: "Ich bin vom X bis Y nicht erreichbar"
- Automatische Wiedervorlagen-Anpassung: Wenn Kontakt abwesend bis Datum X, Wiedervorlage auf nach Datum X verschieben
- Benachrichtigung: "Auto-Reply von Kontakt Y erkannt, Wiedervorlage verschoben auf Z"

**Akzeptanzkriterien:**
1. Auto-Replies werden zuverlaessig erkannt (Header + Content-Analyse)
2. Abwesenheits-Zeitraum wird extrahiert wenn moeglich
3. Bestehende Wiedervorlagen werden automatisch angepasst (mit Notification)
4. Anpassungen sind sichtbar und rueckgaengig machbar
5. Manuelle Override moeglich ("trotzdem am urspruenglichen Datum")

### FEAT-407 — KI-Wiedervorlagen mit Freigabe

KI schlaegt proaktiv Wiedervorlagen vor basierend auf CRM-Kontext. Mensch entscheidet: Freigeben / Verschieben / Abbrechen.

**Architektur:**
- `ai_action_queue` Tabelle (geteilt mit FEAT-408)
- Wiedervorlagen-Vorschlaege basierend auf: letzte Interaktion, Deal-Phase, offene Aufgaben, E-Mail-Alter
- Morgen-Ritual: 5 Minuten Wiedervorlagen-Liste durchgehen

**Funktionen:**
- KI analysiert CRM-Daten und schlaegt Wiedervorlagen vor
- Vorschlaege erscheinen in Mein Tag als eigene Sektion
- Pro Vorschlag: Freigeben (wird Task) / Verschieben (neues Datum) / Abbrechen (verwerfen)
- Begruendung pro Vorschlag: "Deal X seit 14 Tagen ohne Aktion, Angebot offen"
- Bidirektional: User kann auch eigene Wiedervorlagen an KI delegieren
- Lern-Effekt: Abgelehnte Vorschlaege beeinflussen zukuenftige Vorschlaege (einfaches Feedback)

**Abgrenzung zu bestehenden Auto-Wiedervorlagen (V3.1 FEAT-316):**
- V3.1 = regelbasiert, fest definierte Trigger (Stagnation, ueberfaellige Tasks)
- V4 = KI-basiert, kontextuell, mit Begruendung, mit Freigabe-Workflow

**Akzeptanzkriterien:**
1. KI generiert Wiedervorlagen-Vorschlaege basierend auf CRM-Kontext
2. Vorschlaege erscheinen in Mein Tag mit Begruendung
3. Drei Aktionen pro Vorschlag: Freigeben / Verschieben / Abbrechen
4. Freigegebene Vorschlaege werden zu echten Tasks
5. Abgelehnte Vorschlaege werden nicht wiederholt (gleicher Kontext)
6. Vorschlaege werden batch-generiert (nicht Echtzeit) — Kostenkontrolle

### FEAT-406 — Cal.com-Sync + Gesamtkalender

Professionelle Kalender-Infrastruktur: Cal.com Self-Hosted als Buchungs- und Sync-Engine, Gesamtkalender-Ansicht im Business System.

**Infrastruktur:**
- Cal.com Self-Hosted auf Hetzner (Docker)
- API-Integration fuer Termin-Sync
- Bestehende `calendar_events` Tabelle als lokaler Store

**Funktionen:**
- Bidirektionaler Sync: Cal.com ↔ Business System
- Gesamtkalender-Ansicht (Tages-/Wochen-/Monatsansicht, Google-Calendar-aehnlich)
- Meeting-Buchungs-Links pro Kontakt (Cal.com Booking Pages)
- Externe Kalender anbinden (Google Calendar, Outlook via Cal.com)
- Verfuegbarkeits-Logik: Cal.com managed Verfuegbarkeit
- Navigation: Direkter Zugang ueber Sidebar

**Nicht V4:**
- Eigene Buchungslogik (Cal.com uebernimmt)
- Multi-Kalender-Management (ein Hauptkalender + Sync)

**Akzeptanzkriterien:**
1. Cal.com laeuft Self-Hosted auf Hetzner als Docker-Container
2. Termine aus Cal.com erscheinen automatisch im Business System
3. Gesamtkalender-Ansicht zeigt alle Termine (Tages-/Wochen-/Monatsansicht)
4. Meeting-Buchungs-Link ist pro Kontakt verfuegbar
5. Bestehende `calendar_events` werden in Gesamtkalender integriert
6. Mein Tag Kalender-Panel nutzt die gleiche Datenquelle
7. Verfuegbare-Zeit-Berechnung basiert auf Cal.com-Daten

### FEAT-403 — Management-Cockpit LLM-Ausbau

Erweiterung des Dashboard KI-Cockpits um tiefere LLM-gestuetzte Analysen.

**Funktionen:**
- Erweiterte KI-Abfragen: Pipeline-Analyse, Multiplikator-Effektivitaet, Forecast-Verfeinerung
- Trend-Erkennung: "Deal-Velocity sinkt seit 2 Wochen", "Multiplikator X bringt bessere Leads als Y"
- Vergleichs-Analysen: Zeitraum vs. Zeitraum, Pipeline vs. Pipeline
- Natuerlichsprachliche Abfragen: "Wie viele Deals habe ich diesen Monat gewonnen?"

**Akzeptanzkriterien:**
1. Mindestens 5 neue vordefinierte KI-Analyse-Abfragen
2. Natuerlichsprachliche Freitext-Abfrage funktioniert
3. Ergebnisse sind nachvollziehbar (Datenquelle sichtbar)
4. Abfragen laufen on-click (Kostenkontrolle)

## V4 Scope — Zusammenfassung

### In Scope
- 6 Features (FEAT-403, FEAT-405, FEAT-406, FEAT-407, FEAT-408, FEAT-410)
- Neue Infrastruktur: IMAP-Sync-Service, Cal.com Self-Hosted
- Neue DB-Tabellen: `email_messages`, `email_threads`, `ai_action_queue`
- Erweiterung: `calendar_events` (Cal.com-Sync), Mein Tag (Gatekeeper-Summary, Wiedervorlagen)
- IONOS IMAP direkt angebunden (imap.ionos.de)

### Out of Scope (V4.1)
- FEAT-404: Call Intelligence (Jitsi + Whisper Transkription)
- FEAT-409: Meeting-Erinnerungen
- FEAT-401: Wissensbasis
- FEAT-402: Insight-Review-Queue

### Out of Scope (V5+)
- Cadences / Sequences
- Routing / Territories
- Teamlead-Rolle
- Intelligence-Platform-Export
- Multi-IMAP-Account
- Automatische E-Mail-Antworten ohne Freigabe

## V4 Constraints

- Single User (Eigentuemer)
- Self-Hosted: Hetzner (Business System), IONOS (IMAP), Cal.com (Hetzner Docker)
- AWS Bedrock Frankfurt (eu-central-1) fuer LLM
- OpenAI Whisper API bleibt (DEC-019)
- EU-only Datenhaltung durchgaengig
- KI-Kosten: Bedrock geschaetzt 10-25 EUR/Monat (hoeher wegen E-Mail-Analyse)
- IMAP-Polling statt Push (imapflow IDLE als Option fuer spaeter)
- Server-Upgrade moeglich wenn Last steigt (User informieren)

## V4 Risks & Assumptions

| Risiko | Mitigation |
|---|---|
| IONOS IMAP-Zuverlaessigkeit | Polling mit Retry-Logik, Sync-Status-Monitoring in Settings |
| E-Mail-Volumen ueberfordert Bedrock-Budget | Zwei-Pass: Regelbasiert zuerst, Bedrock nur fuer komplexe E-Mails |
| Cal.com Self-Hosted Komplexitaet | Cal.com Docker-Setup ist gut dokumentiert, Community aktiv |
| IMAP-Threading-Qualitaet | In-Reply-To + References Header sind Standard, Fallback auf Subject-Matching |
| KI-Klassifikation Fehlraten | Feedback-Loop: manuelle Korrektur verbessert zukuenftige Klassifikation |
| Server-Last (IMAP-Sync + Cal.com + bestehende Container) | Monitoring, Server-Upgrade bei Bedarf (CPX32 → CPX42/CPX52) |

## V4 Success Criteria

V4 ist erfolgreich wenn:
1. Eigentuemer oeffnet morgens Mein Tag und sieht KI-Gatekeeper-Summary (dringende E-Mails, Wiedervorlagen)
2. 5-Minuten-Morgenritual: Wiedervorlagen-Liste durchgehen, freigeben/verschieben/abbrechen
3. Eingehende E-Mails sind automatisch klassifiziert und Kontakten zugeordnet
4. Auto-Replies werden erkannt und Wiedervorlagen intelligent angepasst
5. Gesamtkalender zeigt alle Termine (Cal.com + manuell) auf einen Blick
6. Meeting-Buchung funktioniert ueber Cal.com-Links direkt aus dem System
7. KI-Analyse im Dashboard liefert tiefere Einblicke als statische Metriken
8. EU-only Datenhaltung ist durchgaengig sichergestellt
9. Kein manuelles E-Mail-Postfach-Durcharbeiten mehr noetig

## V4 Open Questions

- Cal.com Version/Edition fuer Self-Hosted: Community Edition reicht fuer V4
- IONOS IMAP-Credentials: App-Passwort oder regulaeres Passwort (zu klaeren bei Setup)
- Server-Sizing: Aktueller CPX32 reicht fuer Start, Upgrade-Schwelle definieren bei /architecture

---

# V4.1 — Meeting Intelligence Basis

## V4.1 Purpose

V4.1 baut die Meeting-Aufzeichnungs-, Transkriptions- und Summary-Pipeline auf. Browser-basierte Video-Meetings werden ueber self-hosted Jitsi gestartet, ueber Jibri aufgezeichnet, ueber Whisper transkribiert und ueber Bedrock zu strukturierten Summaries verdichtet. Die Summary landet als Deal-Activity im Workspace. Parallel dazu werden Meeting-Erinnerungen an externe Teilnehmer (.ics + E-Mail) und interne Vorbereitungshinweise fuer den User eingefuehrt.

V4.1 aktiviert das `transcript`-Feld der `meetings`-Tabelle, das bereits in V3 fuer diesen Zweck vorbereitet wurde (siehe FEAT-308).

## V4.1 Vision — Meetings werden zu strukturierten Daten

VORHER (V4):
- Meetings sind manuell gepflegte Eintraege mit Freitext-Agenda und Freitext-Outcome
- Nach einem Call muss der Eigentuemer die wichtigsten Punkte von Hand nachtragen
- Meeting-Vorbereitung laeuft ueber Scrollen in Deal-Workspace und E-Mail-Historie

NACHHER (V4.1):
- Meetings werden im Browser gestartet (Jitsi-Link aus Deal oder Kalender)
- Aufzeichnung laeuft automatisch (nach einmaliger Kunden-Einwilligung)
- Nach dem Call liegt innerhalb weniger Minuten ein strukturierter Summary vor: Outcome, Entscheidungen, Action-Items, Naechster-Schritt
- Vor dem Meeting sieht der User eine KI-generierte Agenda aus Deal-Kontext (optional, per-User-Setting)
- Externe Teilnehmer bekommen automatisch Erinnerungen mit .ics-Attachment, Meeting-Link und Agenda

## V4.1 Architekturleitplanken

1. **Adapter-Pattern fuer Speech-to-Text** — Whisper ueber OpenAI API in V4.1, Azure EU / Self-hosted Whisper spaeter ohne Code-Rewrite austauschbar. Nur API-Route wird umgeschaltet.
2. **Shared Meeting-Infrastructure** — Jitsi + Jibri als gemeinsame Basis fuer Business System und Blueprint (und spaeter Kunden-Instanzen). Getrennte Tenant-Konfigurationen, geteilte Infrastruktur.
3. **Einwilligung einmalig, nicht pro Meeting** — DSGVO-konform, aber ohne Klick-Ermuedung: Kontakt stimmt einmal beim Onboarding zu, kann jederzeit widerrufen. Ohne Einwilligung kann die Kerndienstleistung nicht in vollem Umfang erbracht werden (wird dem Kontakt transparent gemacht).
4. **Per-User-Settings fuer Erinnerungen** — Jeder User entscheidet selbst, ob interne Push-Erinnerungen und KI-Agenda-Vorbereitung laufen sollen. Kein system-weites Nerven.
5. **EU-only Datenhaltung** — Hetzner (DE) fuer Jitsi/Jibri/Recordings, OpenAI US-Region fuer Whisper akzeptabel (DEC-019), Bedrock Frankfurt fuer Summary-LLM.

## V4.1 Features (3 Features)

### FEAT-404 — Call Intelligence (Jitsi + Jibri + Whisper + Summary)

**Zweck:** Browser-basierte Video-Meetings mit automatischer Aufzeichnung, Transkription und KI-Summary.

**Architektur:**
- Self-hosted Jitsi Meet auf Hetzner (shared mit Blueprint spaeter)
- Jibri fuer Recording (Browser-Session-Aufzeichnung, Audio + Video)
- Whisper-Adapter-Service (OpenAI API in V4.1, Azure/Self-hosted spaeter)
- Bedrock Claude Sonnet 4 fuer Summary-Generierung (gleicher Service-Layer wie V3/V4)
- Aufzeichnungs-Artefakte werden in Supabase Storage (EU) abgelegt

**Acceptance Criteria:**
1. Meeting kann aus Deal-Workspace und Mein Tag als Jitsi-Raum gestartet werden
2. Jibri zeichnet Meeting auf (nach bestaetigter Einwilligung aller Teilnehmer, siehe FEAT-411)
3. Aufzeichnung wird nach Meeting-Ende an Whisper-Adapter-Service geschickt
4. Transkript wird im `meetings.transcript` Feld gespeichert
5. Bedrock erzeugt strukturierten Summary: Outcome, Decisions, Action-Items, Next-Step
6. Summary wird als Meeting-Activity in Timeline geschrieben (nicht direkt in Deal-Felder — das ist V4.3)
7. Transkript + Summary sind im Deal-Workspace sichtbar und editierbar
8. Fehler-Handling: Wenn Transkription oder Summary scheitert, bleibt die Aufzeichnung erhalten und wird mit Fehler-Status markiert

**Nicht V4.1:**
- Telefon-Integration via SIP/PSTN (BL-206, spaeter)
- Automatische Deal-Status-Updates aus Summary (V4.3 Insight Review Queue)
- Wissensbasis-Integration, Cross-Source-Suche (V4.2)

### FEAT-409 — Meeting-Erinnerungen (extern + intern + KI-Agenda)

**Zweck:** Externe Teilnehmer bekommen Kalendereintrag und Erinnerung, User bekommt Vorbereitungshilfe.

**Drei Komponenten:**

**A) Externe Erinnerung an Teilnehmer**
- Bei Meeting-Erstellung: Einladungs-E-Mail mit .ics-Attachment (CalDAV-kompatibel)
- X Stunden vor Meeting (konfigurierbar, Default 24h + 2h): Erinnerungs-E-Mail mit Meeting-Link
- Laeuft automatisch, keine Freigabe noetig (eigene Termine, kein Kunden-Nachfass)

**B) Interne Erinnerung an User**
- Push/E-Mail X Minuten vor Meeting (User-Setting, Default 30 Min)
- Inhalt: Deal-Link, letzter Kontakt, offene Action-Items
- Per User umschaltbar: an/aus

**C) KI-Agenda-Vorbereitung (optional)**
- Vor Meeting generiert Bedrock aus Deal-Historie eine strukturierte Vorbereitung: letzte Kommunikation, offene Punkte, Entscheider am Tisch, Vorschlag fuer Meeting-Ziel
- Per User umschaltbar: Automatisch vor jedem Meeting / Nur on-click / Aus
- Kosten-bewusst (Bedrock-Call nur wenn aktiviert)
- Output ist User-intern, NICHT an Kunden

**Acceptance Criteria:**
1. Externe Meeting-Einladung enthaelt .ics-Attachment, laedt in Google/Outlook/Apple-Kalender
2. Erinnerungs-Mail geht X Stunden vor Meeting automatisch raus
3. Interne Push-Benachrichtigung kommt rechtzeitig an, wenn User sie aktiviert hat
4. KI-Agenda wird bei Aktivierung mit Deal-Kontext korrekt befuellt
5. Pro-User-Settings sind in Settings-Bereich konfigurierbar
6. Kein Meeting-Reminder verlaesst das System ohne Meeting-Link und Zeitangabe

**Nicht V4.1:**
- SMS-Erinnerungen
- Vorlagen-Editor fuer Erinnerungs-E-Mails (fester Template-Satz in V4.1)
- KI-Nachbereitung (das ist FEAT-404 Summary)

### FEAT-411 — DSGVO-Einwilligungsflow fuer Meeting-Aufzeichnung

**Zweck:** Einmalige, widerrufbare Einwilligung beim Onboarding eines neuen Kontakts — nicht vor jedem Meeting.

**Ablauf:**
1. Neuer Kontakt wird angelegt (manuell oder per IMAP erkannt)
2. Vor erstem bedeutsamen Kontakt: System schickt Einwilligungs-E-Mail mit Erklaerung
3. E-Mail erklaert transparent: KI-gestuetzte Verarbeitung, Transkription von Meetings und Calls, EU-Datenhaltung, DSGVO-Rechte
4. Kontakt kann per Link zustimmen oder ablehnen
5. Status wird am Kontakt gespeichert: `consent_status` (pending / granted / revoked / declined), `consent_date`, `consent_source`
6. Bei granted: Aufzeichnung ist ab naechstem Meeting automatisch aktiv
7. Widerruf jederzeit: Kontakt hat Link in Einwilligungs-Mail, User kann am Kontakt manuell revoken
8. Transparenz: Wenn consent_status != granted, werden Meetings nicht aufgezeichnet und User sieht Hinweis in Meeting-Vorbereitung

**Acceptance Criteria:**
1. Kontakte haben `consent_status`, `consent_date`, `consent_source` Felder
2. Einwilligungs-Mail-Template existiert und ist DSGVO-konform formuliert (Mustertext)
3. Tokenisierter Zustimmungs-Link fuehrt zu einfacher Public-Page (granted/declined)
4. Widerruf ist jederzeit moeglich (User in UI, Kontakt per Link)
5. FEAT-404 Recording startet nur, wenn alle Teilnehmer `consent_status = granted` haben
6. Wenn Einwilligung fehlt: klare UI-Meldung "Aufzeichnung nicht moeglich — Einwilligung fehlt fuer X"
7. Audit-Trail: jede Consent-Aenderung wird geloggt (wer, wann, wie)

**Nicht V4.1:**
- Vollstaendige Compliance-Dokumentation (separat via `/compliance` Skill)
- DPA (Data Processing Agreements) Management
- Mehrere Consent-Kategorien (V4.1 kennt nur "Meeting-Aufzeichnung" als Kategorie)

## V4.1 Scope — Zusammenfassung

### In Scope
- 3 Features (FEAT-404, FEAT-409, FEAT-411)
- Neue Infrastruktur: Jitsi + Jibri Self-Hosted auf Hetzner (shared-ready)
- Neuer Service-Layer: Whisper-Adapter (OpenAI jetzt, tauschbar)
- Schema-Erweiterung: `contacts` um consent-Felder, evtl. neue `consents`-Tabelle (Detail in /architecture)
- Per-User-Settings fuer Erinnerungen und KI-Agenda
- DSGVO-Einwilligungs-Templates (E-Mail + Public-Page)

### Out of Scope (V4.2)
- FEAT-401: Wissensbasis Cross-Source (Meetings + E-Mails + Dokumente + Deal-Daten in einem Voice-Deal-Chat durchsuchbar)

### Out of Scope (V4.3)
- FEAT-402: Insight-Review-Queue (nur schreibende KI-Aenderungen an Deal/Kontakt-Properties durch Queue)

### Out of Scope (V4.x+)
- Telefon-Integration via SIP/PSTN (Jigasi, BL-206)
- SMS-Meeting-Erinnerungen
- Multi-Tenant Jitsi-Setup fuer Kunden-Instanzen (Shared-Instance jetzt, Multi-Tenant wenn mehrere Kunden)
- Azure OpenAI Migration (Adapter-Pattern vorhanden, Migration separater Slice wenn Account da ist)

## V4.1 Constraints

- **Adapter-Pattern-Pflicht** — Whisper-Zugriff MUSS durch Adapter-Layer laufen. Kein direkter OpenAI-SDK-Aufruf aus Business-Code.
- **Einwilligung vor Aufzeichnung** — FEAT-404 darf Recording nicht starten ohne geprueftes consent_status.
- **EU-only fuer Recording-Artefakte** — Meeting-Aufzeichnungen landen in Hetzner/Supabase Storage EU, nie in US.
- **Per-User-Settings Default: Opt-Out fuer Push, Opt-In fuer KI-Agenda** — nicht alle nerven, aber Erinnerung ist ueblich.
- **Bedrock-Kosten-Bewusstsein** — KI-Agenda-Vorbereitung nur wenn User das aktiviert hat.

## V4.1 Risks & Assumptions

- **Risk:** Jitsi Self-hosting ist infrastrukturell anspruchsvoller als Cal.com (TURN/STUN-Server, UDP-Ports). Architektur-Slice muss Infra-Komplexitaet explizit planen.
- **Risk:** Jibri Recording-Latenz und Stabilitaet bei langen Meetings. Testen mit 60+ Minuten Meetings erforderlich.
- **Risk:** Einwilligungs-Ablehnung durch Kontakte kann Kerndienstleistung einschraenken. Mitigation: transparente Kommunikation im Einwilligungs-Mail-Template.
- **Assumption:** OpenAI Whisper-Qualitaet reicht fuer deutschsprachige Business-Meetings (bisher in Blueprint und E-Mail-Transkription bestaetigt).
- **Assumption:** Current CPX32 Hetzner kann Jitsi fuer den Eigentuemer + 1-2 parallele Meetings hosten. Sizing-Review in /architecture.

## V4.1 Success Criteria

V4.1 ist erfolgreich wenn:
1. Eigentuemer kann ein Meeting aus dem Deal-Workspace als Jitsi-Raum starten
2. Meeting wird automatisch aufgezeichnet (nach geprueftem Consent aller Teilnehmer)
3. Nach Meeting-Ende liegt innerhalb von <10 Minuten ein Transkript + Summary als Meeting-Activity vor
4. Externe Teilnehmer bekommen automatisch Einladung mit .ics und Reminder-Mail vor dem Meeting
5. User-Setting "interne Push-Erinnerung" und "KI-Agenda" funktioniert per User individuell
6. Keine Meeting-Aufzeichnung erfolgt ohne dokumentierte Einwilligung
7. DSGVO-Einwilligungsflow ist einmalig, Widerruf ist jederzeit moeglich
8. Whisper-Adapter ist so gebaut, dass Umstieg auf Azure/Self-hosted ohne Feature-Rewrite moeglich ist

## V4.1 Open Questions (fuer /architecture)

- Jitsi Sizing: Aktueller CPX32 oder dedizierter Jitsi-Server?
- Jibri Recording-Format: WebM vs. MP4 (Jibri-Default ist MP4, aber groesser)
- Storage-Retention: Wie lange bleiben Aufzeichnungen in Supabase Storage? 30 Tage / 90 Tage / unbefristet?
- Einwilligungs-Mail: via SMTP vorhandener Mail-Infrastruktur oder separater Versand-Weg?
- Whisper-Adapter-Interface: REST-Proxy oder Library-Abstraktion im Next.js-Code?
- FEAT-411 Spezialfall: Was passiert bei Meetings mit Teilnehmern, die noch nie Kontakte waren (ad-hoc Anrufe aus E-Mail-Faden)?

---

# V4.2 — Wissensbasis Cross-Source (Requirements)

## V4.2 Purpose

V4.2 baut die Cross-Source-Wissensbasis: Alle geschaeftsrelevanten Informationen aus vier Quellen — Meeting-Transkripte und Summaries (V4.1), E-Mail-Inhalte (V4 IMAP), Deal-/Kontakt-/Firmen-Daten (V2+) und hochgeladene Dokumente — werden ueber eine semantische Embedding-Pipeline (RAG) durchsuchbar gemacht. Abfrage per natuerlicher Sprache (Text + Voice) aus dem Deal-Workspace-Kontext.

V4.2 setzt FEAT-401 um.

## V4.2 Problem Statement

Geschaeftskritisches Wissen ist ueber vier getrennte Datenquellen verteilt. Um die Frage "Hat Kunde X die Vollmacht unterschrieben?" zu beantworten, muss der User heute manuell Meeting-Notizen, E-Mails, Deal-Timeline und Dokumente durchsuchen. Das kostet Zeit und fuehrt dazu, dass Informationen uebersehen werden — besonders wenn die relevante Information in einem 60-Minuten-Transkript versteckt ist oder in einer E-Mail von vor 3 Wochen steht.

Bisherige KI-Abfragen (Mein Tag Query, Pipeline-Suche) arbeiten mit SQL-Pre-Filtering + Context-Window-Stuffing. Das funktioniert fuer strukturierte Daten (Deals, Tasks), skaliert aber nicht fuer unstrukturierte Inhalte (Transkripte, E-Mail-Texte, Dokumente). Eine breite Frage wie "Hat irgendjemand ueber Thema X gesprochen?" kann nicht beantwortet werden, weil SQL nicht semantisch filtern kann.

## V4.2 Goal / Intended Outcome

Der User kann aus dem Deal-Workspace heraus eine natuerlichsprachliche Frage stellen (Text oder Voice) und erhaelt eine praezise Antwort mit Quellenangabe — egal ob die Information in einem Meeting-Transkript, einer E-Mail, einem Dokument oder in strukturierten Deal-Daten steckt.

Technisch: RAG-Pipeline (Retrieval-Augmented Generation) mit pgvector fuer semantische Suche und Bedrock Titan Embeddings V2 fuer die Vektorisierung. Das Pattern wird so gebaut, dass es in anderen Strategaize-Systemen (Intelligence Studio, Onboarding-Plattform) wiederverwendbar ist.

## V4.2 Primary Users

Eigentuemer/Operator im Deal-Workspace-Kontext.

## V4.2 Scope-Prinzip

Wenn V4.2 es nicht schafft, alle vier relevanten Quellen (Meetings, E-Mails, Deals, Dokumente) durchsuchbar zu machen, dann ist V4.2 nicht fertig. Kein Halbzeug — entweder Cross-Source vollstaendig oder verschieben.

## V4.2 Scope — In Scope

### Datenquellen (alle vier muessen abgedeckt sein)

1. **Meeting-Transkripte + Summaries** — `meetings.transcript` (Volltext, 10.000-15.000 Woerter pro Stunde) + `meetings.ai_summary` (strukturiertes JSON: outcome, decisions, action_items, next_step). Quelle: V4.1 Whisper + Bedrock Pipeline.
2. **E-Mail-Inhalte** — `email_messages.body_text` + `email_messages.subject`. Quelle: V4 IMAP-Sync.
3. **Deal-Kontext** — `deals` (Stage, Wert, Status, next_action), `activities` (Gespraechsnotizen, Summary), `tasks` (offene/erledigte Aufgaben), `proposals` (Angebotsversionen, Status), `signals` (Kauf-/Warnsignale). Quelle: V2+.
4. **Dokumente** — `documents` Tabelle (Dateiname, Beschreibung, Inhalt wo verfuegbar). Textextraktion fuer PDFs und Office-Dokumente ist V4.2-Scope, soweit technisch machbar (PDF → Text, DOCX → Text). Bilder und Scans (OCR) sind Out-of-Scope.

### Embedding-Pipeline

- Chunking-Service: Zerlegung aller Textinhalte in ueberlappende Chunks (optimale Groesse pro Quelltyp)
- Embedding-Generierung: Amazon Titan Text Embeddings V2 via Bedrock Frankfurt (eu-central-1) — gleicher Provider, gleiche Region, gleiches DPA wie bestehender LLM-Service
- Vektor-Speicher: pgvector Extension in bestehender Supabase PostgreSQL — kein zusaetzlicher Container oder Service
- Auto-Embedding: Neue Meetings, E-Mails und Dokumente werden bei Erstellung/Update automatisch embedded
- Backfill: Alle bestehenden Daten (historische Meetings, E-Mails, Deal-Activities) werden einmalig embedded

### RAG Query Pipeline

- Query-Embedding: User-Frage wird als Vektor embedded
- Semantische Suche: pgvector findet die relevantesten Chunks ueber alle Quellen
- Context Assembly: Top-N relevante Chunks + Deal-Metadaten werden als Kontext an Bedrock Claude Sonnet geschickt
- LLM-Antwort: Strukturierte Antwort mit Quellenangaben (Quelltyp, Zeitpunkt, Link zur Originalquelle)

### Query-UI

- Deal-Workspace-Integration: Neues "Wissensbasis"-Tab oder Widget im Deal-Workspace (/deals/[id])
- Text-Input: Natuerlichsprachliches Eingabefeld
- Voice-Input: Mikrofon-Button mit Whisper-Transkription (bestehendes Pattern aus V2.1+)
- Ergebnis-Darstellung: Antworttext + Quellen-Cards (Typ-Icon, Titel, Datum, Snippet, Link zum Original)
- Deal-Kontext-Awareness: Queries werden automatisch auf den aktiven Deal + zugehoerige Kontakte/Firma fokussiert, koennen aber explizit erweitert werden ("Suche in allen Deals")

## V4.2 Scope — Out of Scope

- **Schreibende KI-Aktionen** — Wissensbasis ist read-only. KI schlaegt keine Property-Aenderungen vor. Das ist V4.3 (Insight Governance).
- **OCR / Bild-Analyse** — Gescannte Dokumente oder Bilder werden nicht verarbeitet.
- **Globale Suche ausserhalb Deal-Kontext** — V4.2 fokussiert auf Deal-Workspace. Eine globale Suchseite (alle Deals uebergreifend) ist V4.2+-Scope, nicht V4.2 Kern.
- **Chat-Verlauf / Multi-Turn-Konversation** — Einzelne Fragen, kein persistenter Chat.
- **Automatische Re-Indexierung bei Schema-Aenderungen** — Wenn sich das Schema aendert, wird manueller Backfill ausgeloest.
- **Embedding-Modell-Wechsel zur Laufzeit** — V4.2 nutzt Titan V2. Modell-Wechsel erfordert Re-Embedding aller Daten (bewusste Entscheidung, kein Hot-Swap).
- **Echtzeit-Streaming-Antworten** — Antwort kommt als Ganzes, kein Token-Streaming in V4.2.

## V4.2 Core Features

### FEAT-401a — Embedding-Pipeline + Vektor-Speicher

- pgvector Extension aktivieren in bestehender Supabase PostgreSQL
- `knowledge_chunks` Tabelle: id, source_type (meeting/email/deal_activity/document), source_id, chunk_index, chunk_text, embedding (vector), metadata JSONB, created_at
- Chunking-Service mit quelltypspezifischer Strategie:
  - Meetings: Paragraph-basiert mit Zeitstempel-Kontext (~500-800 Tokens pro Chunk, 100 Token Overlap)
  - E-Mails: Pro E-Mail als einzelner Chunk (die meisten sind kurz genug), bei langen Mails Split
  - Deal-Activities: Pro Activity als einzelner Chunk mit Deal-/Kontakt-Metadaten
  - Dokumente: Seiten-/Absatz-basiert, abhaengig von Dokumenttyp
- Embedding via Amazon Titan Text Embeddings V2 (`amazon.titan-embed-text-v2:0`, Bedrock eu-central-1)
- Adapter-Pattern analog zum bestehenden Whisper-Adapter (DEC-035): `EmbeddingProvider` Interface mit `TitanEmbeddingProvider` als V4.2-Implementierung
- Auto-Trigger: Embedding wird asynchron ausgeloest bei:
  - Meeting-Transkript fertig (nach Whisper-Pipeline)
  - E-Mail synchronisiert (nach IMAP-Sync)
  - Activity erstellt/aktualisiert
  - Dokument hochgeladen
- Backfill-Script: Einmaliges Embedding aller bestehenden Daten, idempotent (skip wenn Chunks fuer source_id bereits existieren)

### FEAT-401b — RAG Query API

- API-Route `/api/knowledge/query` (authentifiziert, rate-limited)
- Input: `{ query: string, dealId?: string, scope: 'deal' | 'contact' | 'company' | 'all' }`
- Pipeline: Query embedden → pgvector Similarity Search (cosine distance) → Top-20 Chunks holen → Kontext + Deal-Metadaten assemblieren → Bedrock Claude Sonnet Prompt → strukturierte Antwort
- Scope-Logik:
  - `deal`: Nur Chunks die zum Deal gehoeren (via source_id → deal_id FK-Chain)
  - `contact`: Alle Chunks zum Kontakt (egal welcher Deal)
  - `company`: Alle Chunks zur Firma
  - `all`: Ueber alle Daten (mit Relevanz-Ranking)
- Response: `{ answer: string, sources: [{ type, title, date, snippet, url, relevance }], confidence: 'high' | 'medium' | 'low' }`
- Confidence basiert auf Vektor-Distanz der Top-Treffer

### FEAT-401c — Deal Knowledge Query UI

- Neues "Wissen"-Tab im Deal-Workspace (`/deals/[id]`)
- Eingabefeld mit Placeholder: "Frage zur Wissensbasis stellen..."
- Mikrofon-Button fuer Voice-Input (bestehendes Whisper-Pattern)
- Ergebnis-Bereich:
  - Antwort-Text (Markdown-formatiert)
  - Quellen-Cards darunter: Icon (Meeting/E-Mail/Activity/Dokument), Titel, Datum, relevanter Snippet, Klick oeffnet Original
- Scope-Toggle: "Nur dieser Deal" (Default) / "Alle Daten"
- Loading-State waehrend LLM-Verarbeitung (erwartete Latenz: 3-8 Sekunden)
- Kostenschutz: on-click, kein auto-load (konsistent mit DEC-030 / BL-330)

### FEAT-401d — Backfill + Monitoring

- Einmaliger Backfill aller bestehenden Daten beim V4.2-Deploy
- Monitoring: Logging jedes Embedding-Calls (Anbieter, Region, Modell-ID, Chunk-Count, Zeitstempel) — konsistent mit Data-Residency Audit-Pfad-Regel
- Cron-Job `/api/cron/embedding-sync`: Faengt verpasste Auto-Embeddings ab (z.B. wenn Embedding bei Meeting-Transcript fehlschlug). Laeuft alle 15 Minuten, verarbeitet Chunks mit Status `pending`.

## V4.2 Constraints

- **EU-only**: Embedding-Modell muss via Bedrock eu-central-1 laufen (Data-Residency-Regel). Amazon Titan Text Embeddings V2 ist dort verfuegbar.
- **Kein neuer Container**: pgvector laeuft in der bestehenden Supabase PostgreSQL. Kein Pinecone, kein Weaviate, kein separater Vektor-DB-Container.
- **Adapter-Pattern**: Embedding-Provider muss ueber Adapter gekapselt sein (analog Whisper-Adapter DEC-035), damit spaeterer Wechsel zu anderem Embedding-Modell ohne Feature-Rewrite moeglich ist.
- **Kosten-Bewusstsein**: Embedding-Kosten sind niedrig (~$0.0002/1k Tokens), aber bei Backfill grosser Datenmengen muessen Batch-Limits beachtet werden. Rate-Limiting auf Bedrock-Ebene.
- **Chunk-Groesse**: Muss zum Embedding-Modell passen. Titan V2 unterstuetzt max 8.192 Tokens pro Embedding-Call. Chunks muessen kleiner sein.

## V4.2 Risks & Assumptions

- **Risk:** Titan Embeddings V2 Qualitaet fuer deutschsprachige Texte moeglicherweise suboptimal. Mitigation: Evaluierung mit echten Meeting-Transkripten + E-Mails in der ersten Slice-QA. Fallback: Cohere Embed Multilingual V3 via Bedrock (ebenfalls eu-central-1 verfuegbar).
- **Risk:** pgvector Performance bei >100.000 Chunks. Mitigation: HNSW-Index (statt IVFFlat) ab Beginn, regelmaessiges VACUUM. Fuer V4.2-Volume (realstisch <50.000 Chunks) kein Problem.
- **Risk:** Chunking-Strategie beeinflusst Retrieval-Qualitaet stark. Zu grosse Chunks = unpraezise Suche. Zu kleine = Kontext geht verloren. Mitigation: Quelltypspezifische Chunking-Strategie, iteratives Tuning in QA.
- **Assumption:** Supabase Self-Hosted PostgreSQL unterstuetzt pgvector Extension (Standard seit Supabase 0.22+). Muss beim ersten Slice verifiziert werden.
- **Assumption:** Document-Textextraktion (PDF → Text) ist mit serverseitigen Libraries (pdf-parse) machbar ohne externen Service.

## V4.2 Success Criteria

V4.2 ist erfolgreich wenn:
1. User kann im Deal-Workspace eine natuerlichsprachliche Frage stellen und erhaelt eine praezise Antwort
2. Antworten enthalten Quellenangaben (Typ, Datum, Link) — User kann die Quelle direkt aufrufen
3. Alle vier Datenquellen (Meetings, E-Mails, Deal-Daten, Dokumente) sind durchsuchbar
4. Semantische Suche findet auch Ergebnisse wenn die exakten Suchbegriffe nicht vorkommen ("Vollmacht" findet "Vertretungsbefugnis")
5. Voice-Input funktioniert (Whisper → Text → Query)
6. Bestehende Daten (vor V4.2) sind ebenfalls durchsuchbar (Backfill)
7. Embedding-Provider ist ueber Adapter gekapselt (analog Whisper-Adapter)
8. Alle Embedding-Calls laufen ueber Bedrock Frankfurt (eu-central-1) — kein US-Traffic
9. Query-Latenz <10 Sekunden (Embedding + Search + LLM zusammen)

## V4.2 Open Questions (fuer /architecture)

- pgvector Extension: Ist sie in der aktuellen Supabase-Version auf Hetzner bereits installiert oder muss sie nachinstalliert werden?
- Embedding-Dimensionen: Titan V2 bietet 256/512/1024 Dimensionen. Welche Dimension ist der beste Tradeoff zwischen Qualitaet und Speicher/Performance?
- Chunk-Overlap-Strategie: Festes Overlap (z.B. 100 Tokens) oder sentence-boundary-aware?
- Document-Upload: Gibt es bereits hochgeladene Dokumente in der `documents`-Tabelle oder ist die leer?
- Scope-Default: Bei Query ohne expliziten Scope — auf aktiven Deal beschraenken oder alles durchsuchen?
- Re-Embedding-Trigger: Wenn ein Meeting-Transkript nachtraeglich korrigiert wird, muessen die alten Chunks geloescht und neu embedded werden. Automatisch oder manuell?

---

# V4.3 — Insight Governance

## V4.3 Purpose

V4.3 fuehrt die Insight-Review-Queue ein und liefert die erste automatische Signal-Extraktion. Alle schreibenden KI-Aenderungen an Deal/Kontakt-Properties (Status, Stage, Werte, Tags) landen in einer Queue. Mensch reviewt, genehmigt, lehnt ab. Informative KI-Ausgaben (Timeline-Summaries, Insights, KI-Analysen) bleiben direkt sichtbar, klar als KI-generiert markiert und editierbar.

V4.3 setzt FEAT-402 (Insight-Review-Queue) und FEAT-412 (Automatische Signal-Extraktion) um.

## V4.3 Vision

Bisher erzeugt die KI informative Outputs (Meeting-Summaries, E-Mail-Klassifikation, Deal-Briefings, RAG-Antworten), die der User liest. V4.3 ist der naechste Evolutionsschritt: Die KI erkennt jetzt aktiv Handlungsbedarf in Meetings und E-Mails und schlaegt konkrete Property-Aenderungen vor. Der User behaelt volle Kontrolle durch die Review-Queue — die KI handelt NIE autonom an Geschaeftsdaten.

Das Grundprinzip bleibt DEC-037: Queue NUR fuer schreibende KI-Aktionen. Informative Outputs ueberspringen die Queue.

## V4.3 Scope

### In Scope

**FEAT-402 — Insight-Review-Queue:**
- Erweiterung der bestehenden `ai_action_queue` um neue Aktionstypen: `property_change`, `status_change`, `tag_change`, `value_change` (DEC-049)
- Unified Freigabe-UI in Mein Tag — zeigt alle KI-Vorschlaege (Followups, Gatekeeper-Aktionen, Property-Aenderungen) in einer einheitlichen Ansicht
- Einzelne Freigabe: Approve / Reject mit optionalem Grund
- Batch-Approval: Mehrere Vorschlaege gleichzeitig genehmigen
- Confidence-Anzeige pro Vorschlag (hoch/mittel/niedrig)
- Reasoning-Anzeige: Warum schlaegt die KI diese Aenderung vor?
- Source-Verlinkung: Welches Meeting / welche E-Mail hat den Vorschlag ausgeloest?
- KI-Badge auf allen angewandten Aenderungen (sichtbar in Deal-/Kontakt-Workspace)
- Auto-Expire: Stale Vorschlaege nach 7 Tagen automatisch dismisst
- Audit-Trail: Wer hat wann was genehmigt/abgelehnt (erweitert bestehenden ai_feedback-Mechanismus)

**FEAT-412 — Automatische Signal-Extraktion:**
- Meeting-Signal-Extraktion: Nach Meeting-Summary (V4.1 Pipeline) analysiert ein zweiter LLM-Call den Summary und extrahiert vorgeschlagene Property-Aenderungen
- E-Mail-Signal-Extraktion: Nach Gatekeeper-Klassifikation (V4 Pipeline) analysiert ein optionaler LLM-Call relevante E-Mails auf Deal-Signale
- Signal-Typen:
  - `stage_suggestion` — Deal sollte in naechste Stage ruecken (z.B. "Angebot besprochen → Verhandlung")
  - `value_update` — Budget/Wert wurde im Gespraech erwaehnt (z.B. "Kunde spricht von 75k Projektvolumen")
  - `tag_addition` — Relevantes Keyword erkannt (z.B. "Wettbewerber ABC erwaehnt → Tag 'Wettbewerb: ABC'")
  - `priority_change` — Dringlichkeits-Signal erkannt (z.B. "Deadline Q3 erwaehnt → Prioritaet hochsetzen")
- Alle extrahierten Signale landen in der ai_action_queue (FEAT-402) — nie direkt auf dem Entity
- RAG-Kontext fuer bessere Signalqualitaet: Embedding-Lookup liefert Deal-Historie als Kontext fuer die Signal-Extraktion
- On-demand per Deal (manueller Trigger) + automatisch nach Meeting-Summary-Cron und Classify-Cron
- Confidence-Score pro Signal basierend auf LLM-Output

### Out of Scope (spaeter)

- Automatische Signal-Extraktion aus Dokumenten (V5 Scope)
- Cross-Deal-Signale (z.B. "Firma X taucht in 3 verschiedenen Deals auf") — spaeter
- Signal-Learning aus historischen Approve/Reject-Entscheidungen — spaeter
- Automatische Approval-Rules (z.B. "Stage-Vorschlaege mit Confidence >0.9 auto-approve") — bewusst nicht in V4.3, User soll erst Vertrauen aufbauen
- Kontakt-Property-Aenderungen (z.B. neue Rolle, neue E-Mail) — spaeter, nach Deal-Property-Baseline
- Notification-Push bei neuen Queue-Items — spaeter (V4.1 Push-Infra existiert bereits, aber Queue-Notifications koennen ueberwaeiltgend werden)

## V4.3 User Stories

### Insight-Review-Queue (FEAT-402)

**US-001:** Als User sehe ich in Mein Tag alle offenen KI-Vorschlaege (Followups + Gatekeeper + Property-Aenderungen) in einer einheitlichen Liste, damit ich morgens in 5 Minuten alles durcharbeiten kann.

**US-002:** Als User sehe ich pro Vorschlag: was soll geaendert werden, warum, woher kommt der Vorschlag, und wie sicher ist die KI — damit ich informiert entscheiden kann.

**US-003:** Als User kann ich einen Vorschlag mit einem Klick genehmigen — die Aenderung wird sofort auf das Entity angewandt.

**US-004:** Als User kann ich einen Vorschlag ablehnen und optional einen Grund eingeben — die KI lernt daraus (ai_feedback).

**US-005:** Als User kann ich mehrere niedrig-risiko Vorschlaege gleichzeitig genehmigen (Batch-Approve), damit ich nicht jeden einzeln anklicken muss.

**US-006:** Als User sehe ich im Deal-Workspace, welche Properties durch KI-Vorschlaege geaendert wurden (KI-Badge mit Datum und Quelle).

**US-007:** Als User werden Vorschlaege die aelter als 7 Tage sind automatisch als "expired" markiert und verschwinden aus der aktiven Liste.

### Automatische Signal-Extraktion (FEAT-412)

**US-008:** Als User bekomme ich nach einem Meeting automatisch KI-Vorschlaege: "Deal sollte in Stage X ruecken" / "Wert auf Y aktualisieren" / "Tag Z hinzufuegen" — basierend auf dem Meeting-Inhalt.

**US-009:** Als User bekomme ich bei relevanten E-Mails KI-Vorschlaege fuer Deal-Aenderungen — z.B. wenn ein Kunde ein Budget erwaehnt oder eine Deadline nennt.

**US-010:** Als User kann ich im Deal-Workspace manuell "Signale extrahieren" ausloesen, damit die KI den aktuellen Deal-Kontext nochmal analysiert.

**US-011:** Als User sehe ich bei jedem Signal-Vorschlag die Quelle (Meeting-Titel + Datum, E-Mail-Betreff + Datum) und kann mit einem Klick zur Quelle navigieren.

## V4.3 Constraints

- **Bedrock-Kosten:** Signal-Extraktion erzeugt zusaetzliche LLM-Calls (1 pro Meeting-Summary, 1 pro relevante E-Mail). Geschaetzte Kosten bei aktuellem Volumen (~5 Meetings/Woche, ~20 relevante Mails/Woche): ~$2-3/Monat. Akzeptabel.
- **Latenz:** Signal-Extraktion laeuft asynchron im Cron — kein User wartet auf das Ergebnis. Queue-UI kann beim naechsten Mein-Tag-Besuch neue Items zeigen.
- **DSGVO:** Keine neuen Datenkategorien. Signals basieren auf bereits verarbeiteten Meetings/E-Mails. Audit-Trail dokumentiert KI-Entscheidungen.
- **Single-Tenant:** Wie bei V4.2 kein Multi-Tenant-Overhead. Queue ist pro User (created_by).
- **Bestehende ai_action_queue:** Wird erweitert, nicht ersetzt (DEC-049). Followup- und Gatekeeper-Aktionen funktionieren weiterhin unveraendert.

## V4.3 Risks / Assumptions

- **Risk:** LLM-Halluzinationen bei Signal-Extraktion (z.B. falscher Deal-Wert). Mitigation: Confidence-Score + Queue-Pflicht. Kein Auto-Approve in V4.3.
- **Risk:** Queue-Ueberlastung bei vielen Signalen. Mitigation: Nur tatsaechlich relevante Signale erzeugen (Confidence-Schwelle im Prompt), Auto-Expire nach 7 Tagen.
- **Assumption:** Bestehende ai_action_queue kann ohne Breaking Changes erweitert werden (neue action_types + optionale JSONB-Felder).
- **Assumption:** Meeting-Summary und E-Mail-Klassifikation liefern ausreichend Kontext fuer Signal-Extraktion (kein separater Roh-Transkript-Zugriff noetig).
- **Assumption:** User oeffnet Mein Tag regelmaessig (taeglich) und bearbeitet Queue-Items zeitnah.

## V4.3 Success Criteria

V4.3 ist erfolgreich wenn:
1. User sieht alle KI-Property-Vorschlaege in einer einheitlichen Queue in Mein Tag
2. Approve/Reject funktioniert mit einem Klick (einzeln und batch)
3. Genehmigte Aenderungen werden sofort auf das Entity angewandt + KI-Badge gesetzt
4. Nach jedem Meeting erscheinen relevante Signal-Vorschlaege in der Queue (sofern vorhanden)
5. Nach relevanten E-Mails erscheinen Signal-Vorschlaege in der Queue (sofern vorhanden)
6. Confidence-Score und Reasoning sind bei jedem Vorschlag sichtbar
7. Source-Link fuehrt direkt zum Meeting/E-Mail das den Vorschlag ausgeloest hat
8. Stale Vorschlaege (>7 Tage) werden automatisch als expired markiert
9. Bestehende Followup- und Gatekeeper-Queue funktioniert weiterhin unveraendert
10. Audit-Trail dokumentiert alle Approve/Reject-Entscheidungen

## V4.3 Open Questions (fuer /architecture)

- Schema-Erweiterung ai_action_queue: Welche neuen Spalten genau? `target_entity_type`, `target_entity_id`, `proposed_changes JSONB`, `confidence FLOAT`? Oder reicht das bestehende `metadata JSONB`?
- Signal-Extraktion-Prompt: Ein generischer Prompt fuer alle Signal-Typen oder je ein spezialisierter Prompt pro Typ (Stage, Value, Tag, Priority)?
- Batch-UI: Checkboxen + "Alle genehmigen" Button? Oder Swipe-Geste (approve links, reject rechts)?
- KI-Badge: Neues Feld `ai_applied_at` + `ai_source_id` auf Entity-Ebene? Oder separates Tracking?
- E-Mail-Signal-Schwelle: Nur E-Mails mit classification `anfrage` / `antwort` analysieren? Oder alle nicht-spam?

## V5 — Automatisierung + Vertriebsintelligenz

### V5 Problem Statement

Das Business System hat seit V4.x eine vollstaendige KI-Pipeline (Gatekeeper, Wissensbasis, Signal-Extraktion, Insight-Governance). Aber die **Ausfuehrung** bleibt manuell: Follow-ups muessen einzeln geplant werden, eingehende E-Mails werden nicht automatisch Kontakten zugeordnet, und es gibt keine Sichtbarkeit ob gesendete E-Mails gelesen wurden.

Gleichzeitig existiert kein strukturierter Datenkanal zu System 4 (Intelligence Studio). Erkenntnisse aus dem BD-Prozess bleiben im Business System gefangen und koennen nicht systematisch fuer Content-Strategie oder Marktanalyse genutzt werden.

V5 bringt den Uebergang von **manuellem Follow-up** zu **strukturierter Vertriebsautomatisierung** und oeffnet die Datenpipeline nach System 4.

### V5 Goal / Intended Outcome

Der Eigentuemer (Single User) kann:
1. Follow-up-Ketten (Cadences) definieren und automatisch ausfuehren lassen
2. Eingehende E-Mails automatisch dem richtigen Kontakt zugeordnet bekommen
3. Sehen, ob gesendete E-Mails geoeffnet/geklickt wurden
4. Vertriebsdaten strukturiert an System 4 exportieren

### V5 Scope

**In Scope:**
- Cadence-Objekt mit Schritten (E-Mail, Aufgabe, Wartezeit)
- Cadence-Zuordnung an Deals oder Kontakte
- Automatische Cadence-Ausfuehrung via Cron
- E-Mail Auto-Zuordnung (IMAP → Kontakt-Match via Adresse + KI-Wahrscheinlichkeit)
- E-Mail Open/Click-Tracking (Pixel + Link-Wrapping)
- Export-API fuer Intelligence Studio (strukturierte JSON-Endpoints)

**Out of Scope:**
- Routing / Territories (V7 — Multi-User)
- Teamlead-Rolle mit Teamsicht (V7 — Multi-User)
- Generische Workflow-Automation "Wenn X dann Y" (V7 — Cadences decken den Hauptfall ab)
- Jigasi Telefon-Integration (V7 — SIP-Infra noetig)
- Kampagnen-Attribution / Kampagnen-Objekt (spaeter)
- Multi-Channel-Cadences (LinkedIn, SMS) — nur E-Mail + Aufgabe in V5

### V5 Features

#### FEAT-501 — Cadences / Sequences

Strukturierte Follow-up-Ketten fuer Deals und Kontakte. Eine Cadence besteht aus Schritten mit Typ (E-Mail, Aufgabe, Wartezeit), Reihenfolge und Zeitabstand. Der Eigentuemer kann Cadence-Templates erstellen, sie auf Deals/Kontakte anwenden, und die Ausfuehrung laeuft automatisch.

**Kern-Objekte:**
- `cadences` — Template: Name, Beschreibung, Schritte, Status (active/paused/archived)
- `cadence_steps` — Schritt: Typ (email/task/wait), Reihenfolge, Verzögerung (Tage), Template-Referenz
- `cadence_enrollments` — Zuordnung: Cadence → Deal/Kontakt, aktueller Schritt, Status, naechster Ausfuehrungszeitpunkt
- `cadence_executions` — Log: Was wurde wann ausgefuehrt, Ergebnis

**Ausfuehrungslogik:**
- Cron (z.B. alle 15 Min) prueft faellige Enrollments
- E-Mail-Schritte: Senden via bestehendem SMTP + Template-Rendering mit Kontakt-/Deal-Variablen
- Aufgaben-Schritte: Erstellen einer Aufgabe im bestehenden Task-System
- Wartezeit-Schritte: Naechsten Schritt um N Tage verschieben
- Abbruch-Bedingungen: Antwort-E-Mail empfangen (IMAP-Match), Deal gewonnen/verloren, manueller Stop

**UI:**
- Cadence-Verwaltung unter Settings oder eigene Seite
- Cadence-Builder: Schritte hinzufuegen/sortieren/konfigurieren
- Enrollment-Uebersicht: Wer ist in welcher Cadence, welcher Schritt
- Deal-/Kontakt-Workspace: "In Cadence einbuchen" Aktion

**Acceptance Criteria:**
- AC1: Cadence mit mindestens 3 Schritten (E-Mail, Wartezeit, Aufgabe) erstellen
- AC2: Deal in Cadence einbuchen → erster Schritt wird automatisch ausgefuehrt
- AC3: Nach Wartezeit wird naechster Schritt automatisch ausgefuehrt
- AC4: Antwort-E-Mail stoppt Cadence automatisch (IMAP-Match)
- AC5: E-Mail-Schritte nutzen Templates mit Variablen ({{kontakt.vorname}}, {{deal.name}})
- AC6: Enrollment-Status sichtbar auf Deal-/Kontakt-Workspace
- AC7: Cadence pausieren/stoppen moeglich

#### FEAT-505 — E-Mail Auto-Zuordnung

Eingehende E-Mails aus dem IMAP-Sync werden automatisch dem passenden Kontakt zugeordnet.

**3 Stufen:**
1. **Exakter Match** — Absender-E-Mail-Adresse matcht Kontakt-E-Mail → 100% Zuordnung, automatisch
2. **KI-Match** — Name in Header/Signatur → Bedrock-Abgleich mit Kontaktdatenbank → Confidence-Score (z.B. 85%)
3. **Unbekannt** — Kein Match → "Nicht zugeordnet"-Queue fuer taegliche manuelle Pruefung

**Integration:**
- Laeuft als Erweiterung des bestehenden IMAP-Sync-Crons (SLC-402)
- Nutzt bestehenden Bedrock-Client fuer KI-Match
- Zeigt Zuordnung + Confidence in der E-Mail-Inbox-UI

**Acceptance Criteria:**
- AC1: E-Mail mit bekannter Absender-Adresse wird automatisch zugeordnet (exakter Match)
- AC2: E-Mail ohne Adress-Match aber mit erkennbarem Namen → KI-Vorschlag mit Confidence
- AC3: Nicht zuordenbare E-Mails in "Nicht zugeordnet"-Queue sichtbar
- AC4: Manuelle Zuordnung/Korrektur moeglich
- AC5: Zuordnung sichtbar auf Kontakt-Workspace (zugeordnete E-Mails)

#### FEAT-506 — E-Mail Open/Click-Tracking

Sichtbarkeit ob gesendete E-Mails geoeffnet und Links geklickt wurden.

**Mechanismen:**
- **Open-Tracking:** 1x1 transparentes Tracking-Pixel in ausgehende E-Mails einbetten
- **Click-Tracking:** Links in ausgehenden E-Mails durch Redirect-URLs ersetzen (Link-Wrapping)
- **Webhook/API-Route:** Empfaengt Pixel-Loads und Link-Klicks, speichert Events

**Daten:**
- `email_tracking_events` — Event-Typ (open/click), Zeitstempel, E-Mail-Referenz, Link-URL (bei Klick)
- Aggregation: "3x geoeffnet, 1 Link geklickt" auf E-Mail-Ebene

**UI:**
- E-Mail-Detail: Tracking-Status (geoeffnet/nicht geoeffnet, Klick-Zaehler)
- Kontakt-/Deal-Workspace: Engagement-Indikator auf E-Mail-Eintraegen

**Acceptance Criteria:**
- AC1: Ausgehende E-Mails enthalten Tracking-Pixel (opt-in pro E-Mail oder global)
- AC2: Links werden automatisch gewrappt
- AC3: Open-Events werden korrekt erfasst und angezeigt
- AC4: Click-Events werden korrekt erfasst (welcher Link, wann)
- AC5: Tracking-Status sichtbar auf E-Mail-Detail und in Timeline

#### FEAT-504 — Intelligence-Platform-Export-API

Strukturierte JSON-Endpoints die System 4 (Intelligence Studio) abrufen kann, um Vertriebsdaten fuer Content-Strategie und Marktanalyse zu nutzen.

**Endpoints:**
- `GET /api/export/deals` — aktive/gewonnene/verlorene Deals mit Metadaten
- `GET /api/export/contacts` — Kontakte mit Beziehungstyp, Qualitaetsfeldern
- `GET /api/export/activities` — Aktivitaeten mit Typen und Zeitstempel
- `GET /api/export/signals` — Extrahierte Signale aus KI-Analyse
- `GET /api/export/insights` — Genehmigte KI-Insights

**Sicherheit:**
- API-Key-Authentifizierung (Bearer Token)
- Rate-Limiting
- Nur lesender Zugriff

**Acceptance Criteria:**
- AC1: 5 Export-Endpoints liefern valides JSON
- AC2: API-Key-Authentifizierung funktioniert
- AC3: Ohne API-Key → 401
- AC4: Pagination fuer grosse Datenmengen
- AC5: Filter nach Zeitraum (since/until)

### V5 Constraints

- Delivery Mode: internal-tool
- Single-User (Eigentuemer)
- Cadence-Ausfuehrung via Coolify Cron (wie bestehende Crons)
- E-Mail-Tracking: Tracking-Pixel koennen von E-Mail-Clients blockiert werden — das ist akzeptabel, kein 100%-Anspruch
- KI-Match fuer E-Mail-Zuordnung ueber bestehenden Bedrock-Client (Frankfurt, kein neuer Provider)
- Export-API: Kein Echtzeit-Sync, Pull-basiert (System 4 ruft ab)
- Alle neuen Tabellen additiv (keine Breaking Changes an bestehender DB)

### V5 Risks & Assumptions

- **Cadence-Volumen:** Bei 1 User und ~20-50 aktiven Deals ist das Volumen gering. Kein Batching/Queue noetig.
- **E-Mail-Tracking-Zuverlaessigkeit:** Open-Tracking ist ~50-70% zuverlaessig (Pixel-Blocking durch Apple Mail, Outlook). Ausreichend als Indikator, nicht als absolute Metrik.
- **IMAP-Delay:** E-Mail-Zuordnung haengt vom IMAP-Sync-Intervall ab (aktuell alle 5 Min). Akzeptabel.
- **Export-API-Sicherheit:** API-Key reicht fuer Internal-Tool. Bei externem Zugriff spaeter OAuth2 nachruestbar.

### V5 Success Criteria

1. Cadence mit 3+ Schritten laeuft automatisch durch (E-Mail → Wartezeit → Aufgabe)
2. >80% der eingehenden E-Mails werden automatisch korrekt zugeordnet
3. Open/Click-Tracking zeigt plausible Daten auf E-Mail-Ebene
4. System 4 kann ueber Export-API Deal- und Kontaktdaten abrufen
5. Keine Regression auf bestehende V6.1-Features

### V5 Open Questions (fuer /architecture)

- Cadence-Cron: Eigener Cron oder Erweiterung des bestehenden Cron-Patterns? Empfehlung: Eigener Cron (`cadence-execute`).
- E-Mail-Zuordnung: Im IMAP-Sync-Cron inline oder als separater Post-Processing-Cron? Empfehlung: Inline im IMAP-Sync.
- Tracking-Pixel-Hosting: Eigene API-Route (`/api/track/open`) oder externer Service? Empfehlung: Eigene Route.
- Export-API-Key-Verwaltung: In user_settings oder ENV? Empfehlung: ENV (EXPORT_API_KEY), Single-User.
- Cadence-Abbruch bei Antwort: Exakter E-Mail-Thread-Match oder Reply-To-Header? Empfehlung: Beides — Thread-ID Match (primaer) + From-Address Match (Fallback).

## V6 — Zielsetzung, Performance-Tracking & Produkttypen

### V6 Problem Statement

Das Business System hat seit V2 umfangreiche Reporting-Faehigkeiten: Pipeline-Forecast, Funnel-Report, Win/Loss-Analyse, Management-Cockpit mit LLM-Analysen. Aber es fehlt die Gegenseite: **Soll-Vorgaben**.

Ohne Ziele ist Reporting nur Rueckblick. Man sieht, was passiert ist, aber nicht, ob es genug war. Es fehlt:
- "Bin ich auf Kurs fuer mein Jahresziel?"
- "Reicht meine aktuelle Pipeline, um mein Quartalsziel zu erreichen?"
- "Wie viele Deals muss ich noch abschliessen?"
- "Welches Produkt laeuft unter Plan?"

V6 bringt den Uebergang von **Reporting** ("Was ist passiert?") zu **Performance Management** ("Bist du auf Kurs?").

### V6 Goal / Intended Outcome

Vertriebsmitarbeiter (aktuell: Eigentuemer als Single User) koennen:
1. Ziele definieren oder importieren (Umsatz, Deal-Anzahl, Abschlussquote)
2. Produkte als Stammdaten anlegen und auf Deals zuordnen
3. Soll-Ist-Abgleich in Echtzeit sehen (persoenliches Performance-Cockpit)
4. Prognosen erhalten (Pipeline-gewichtet + historisch)
5. KI-gestuetzte Handlungsempfehlungen bekommen ("Du brauchst noch X Deals")

### V6 Budgetplanung — bewusste Grenze

Die eigentliche Budgetplanung (Kosten, Investitionen, Marktanalyse, Preisfindung, Produktentwicklung) passiert **bewusst ausserhalb** dieses Systems — in Excel oder spaeter im Intelligence Studio (System 4).

Das Business System nimmt nur **Endresultate** entgegen:
- Fertiges Produkt mit Name, Standardpreis, Status
- Jahresziel pro Produkt (Umsatz, Deal-Count)
- Gesamt-Umsatzziel

Der Planungsprozess selbst ist nicht Teil dieses Systems.

### V6 Features

#### FEAT-601 — Produkt-Stammdaten

Einfaches Verwaltungsmodul fuer fertige Produkte. Kein Produktentwicklungs-Feature — Produktentwicklung, Marktrecherche und Pricing-Analyse gehoeren ins Intelligence Studio (System 4).

**Objekte:** Produkt

**Felder:**
- Name (Pflicht)
- Beschreibung (optional)
- Kategorie (optional, frei definierbar)
- Standardpreis (EUR, optional — Deal-Preis kann abweichen)
- Status: aktiv / inaktiv / archiviert
- Erstellt am / Aktualisiert am

**Funktionen:**
- Produkte anlegen, bearbeiten, archivieren
- Produktliste mit Filter (Status, Kategorie)
- Produkt auf Deal zuordnen (1:n — ein Deal kann mehrere Produkte haben)
- Deal-Wert kann pro Produkt aufgeteilt werden
- Einfacher Settings-Bereich ("Verwaltung > Produkte")

**Acceptance Criteria:**
1. Produkte koennen angelegt und bearbeitet werden
2. Produkte koennen auf Deals zugeordnet werden (einzeln oder mehrere)
3. Deal-Wert kann optional auf Produkte aufgeteilt werden
4. Produkt-Filter nach Status und Kategorie funktioniert
5. Inaktive Produkte sind nicht mehr fuer neue Deal-Zuordnungen waehlbar
6. Bestehende Deals mit inaktiven Produkten behalten ihre Zuordnung

**Schnittstellendefinition (fuer spaetere Intelligence-Studio-Integration):**
Folgende Felder muessen in System 4 erzeugt und an System 3 exportiert werden koennen:
- name (string, Pflicht)
- description (text, optional)
- category (string, optional)
- standard_price (decimal, optional)
- status (enum: active/inactive)

Das Export-Format (API oder CSV) wird in V6 noch nicht implementiert, nur die Empfangsstruktur definiert.

#### FEAT-602 — Ziel-Objekt-Modell

Datenmodell und Verwaltungsoberflaeche fuer persoenliche Vertriebsziele.

**Zieltypen (V6):**
- Umsatz (EUR) — gesamt oder pro Produkt
- Deal-Anzahl — gesamt oder pro Produkt
- Abschlussquote (%) — Won-Deals / Gesamt-Deals im Zeitraum

**Zeitraeume:**
- Monat
- Quartal
- Jahr

**Objekte:** Goal (Ziel)

**Felder:**
- Typ: revenue | deal_count | win_rate
- Zeitraum: month | quarter | year
- Zeitraum-Start (Datum, z.B. 2026-01-01 fuer Januar oder Q1)
- Sollwert (Zahl — EUR bei revenue, Stueck bei deal_count, Prozent bei win_rate)
- Produkt-Referenz (optional — NULL = Gesamtziel, sonst produktspezifisch)
- User-Referenz (Pflicht — wem gehoert das Ziel)
- Status: active | completed | cancelled
- Quelle: manual | imported
- Erstellt am / Aktualisiert am

**Funktionen:**
- Ziele manuell anlegen, bearbeiten, stornieren
- Ziele per Excel/CSV importieren (definiertes Template)
- Ziel-Uebersicht (alle Ziele eines Zeitraums auf einen Blick)
- Ziel-Fortschritt automatisch berechnet aus Pipeline-Daten

**Acceptance Criteria:**
1. Ziele koennen pro Typ, Zeitraum und optional pro Produkt angelegt werden
2. Ziel-Fortschritt wird automatisch aus bestehenden Pipeline-Daten berechnet
3. Import aus Excel/CSV mit definiertem Template funktioniert
4. Fehlerhafte Import-Zeilen werden gemeldet, nicht still verschluckt
5. Ziele koennen storniert werden, ohne historische Daten zu verlieren
6. Ziel-Quelle (manuell vs. importiert) ist sichtbar

#### FEAT-603 — Persoenliches Performance-Cockpit

Eigene Seite "Meine Performance" mit Soll-Ist-Abgleich, Fortschrittsanzeige und Prognose.

**Bereiche:**

1. **Ziel-Uebersicht (Hero-Bereich)**
   - Aktueller Monat / Quartal / Jahr als Toggle
   - Pro Ziel: Sollwert, Istwert, Fortschritt (%), Prognose
   - Visuell: Fortschrittsbalken oder Ring-Diagramm
   - Farbcodierung: Gruen (>= 90% auf Kurs), Gelb (70-89%), Rot (<70%)

2. **Prognose-Block**
   - Pipeline-gewichtete Prognose: "Deine offenen Deals haben gewichtet X EUR Potenzial"
   - Historische Prognose: "Bei aktuellem Tempo erreichst du Y EUR bis Periodenende"
   - Kombinierte Prognose: "Realistisch erreichbar: Z EUR (A% des Ziels)"
   - Delta: "Dir fehlen noch N EUR / M Deals"

3. **Handlungsempfehlung (KI-gestuetzt)**
   - Bedrock analysiert Ziel-Status und gibt konkrete Empfehlung
   - Beispiel: "Du brauchst noch 3 Abschlüsse. Bei deiner aktuellen Abschlussquote von 25% brauchst du mindestens 12 aktive Deals. Du hast aktuell 8 — generiere 4 weitere Opportunities."
   - On-click (nicht auto-load — Kostenregel DEC-028)

4. **Produkt-Aufschluesselung**
   - Pro Produkt: Soll vs. Ist (wenn produktspezifische Ziele existieren)
   - Mini-Balken pro Produkt

5. **Trend-Vergleich**
   - Dieser Monat vs. letzter Monat
   - Dieses Quartal vs. letztes Quartal
   - Basiert auf KPI-Snapshots (FEAT-604)

**Acceptance Criteria:**
1. Performance-Cockpit zeigt alle aktiven Ziele mit Soll-Ist-Abgleich
2. Zeitraum-Toggle (Monat/Quartal/Jahr) funktioniert
3. Farbcodierung reflektiert korrekten Zielerreichungsgrad
4. Pipeline-gewichtete Prognose nutzt bestehende Stage-Wahrscheinlichkeiten
5. Historische Prognose basiert auf bisherigem Tempo im aktuellen Zeitraum
6. KI-Handlungsempfehlung ist on-click abrufbar
7. Produkt-Aufschluesselung zeigt korrekte Werte pro Produkt
8. Trend-Vergleich zeigt Vorperiode wenn KPI-Snapshots vorhanden

**Navigation:**
- Eigener Menue-Eintrag unter "Analyse" (neben Dashboard)
- Oder: Dashboard-Integration als Top-Widget auf "Mein Tag" (Entscheidung in /architecture)

#### FEAT-604 — KPI-Snapshots & Trend-Engine

Automatische periodische Speicherung der Kern-KPIs fuer historische Vergleiche und Trendanalyse.

**KPIs die gesnapshot werden:**
- Gesamtumsatz (Won Deals) im Zeitraum
- Deal-Anzahl (Won) im Zeitraum
- Abschlussquote (Won / Total Closed) im Zeitraum
- Pipeline-Wert (offene Deals, gewichtet)
- Pipeline-Wert (offene Deals, ungewichtet)
- Durchschnittlicher Deal-Wert
- Aktivitaetszahl (Meetings, Anrufe, E-Mails)
- Pro Produkt: Umsatz + Deal-Count (wenn Produkt-Zuordnung vorhanden)

**Snapshot-Frequenz:**
- Taeglich (Cron, analog zu bestehenden Cron-Jobs)
- Aggregation: woechentlich, monatlich (berechnet aus Tages-Snapshots)

**Objekte:** KpiSnapshot

**Felder:**
- Datum (Tag des Snapshots)
- KPI-Typ (enum der obigen Liste)
- Wert (numerisch)
- Produkt-Referenz (optional)
- User-Referenz
- Berechnungsbasis (JSON — z.B. welche Deals eingeflossen sind)

**Funktionen:**
- Automatischer taeglicher Snapshot (Cron)
- Vergleichsansicht: aktuelle Periode vs. Vorperiode
- Trend-Linie (letzte N Tage/Wochen/Monate)
- API fuer Performance-Cockpit (FEAT-603)

**Acceptance Criteria:**
1. Taeglicher Cron erstellt KPI-Snapshots automatisch
2. Snapshots sind idempotent (doppelter Run am selben Tag ueberschreibt, erstellt keinen Duplikat)
3. Woechentliche und monatliche Aggregation funktioniert
4. Trend-Daten sind im Performance-Cockpit abrufbar
5. Snapshot-History ist unbegrenzt (kein Auto-Cleanup in V6)
6. Pro-Produkt-KPIs werden gesnapshot wenn Produkt-Zuordnung existiert

### V6 Scope — Zusammenfassung

#### In Scope
- 4 Features (FEAT-601 bis FEAT-604)
- Produkt-Stammdaten mit Deal-Zuordnung
- Ziel-Objekte (Umsatz, Deal-Count, Abschlussquote) pro Zeitraum und optional pro Produkt
- Excel/CSV-Import fuer Ziele
- Persoenliches Performance-Cockpit mit Soll-Ist, Prognose, KI-Empfehlung
- KPI-Snapshots (taeglich, automatisch) fuer Trend-Analyse
- Schnittstellendefinition fuer Intelligence Studio (Produkt-Export)
- Single User (Self-Service-Ziele)

#### Out of Scope (V6)
- Budgetplanung, Kostenrechnung, Marktanalyse (bleibt in Excel / Intelligence Studio)
- Produktentwicklung, Pricing-Analyse (Intelligence Studio)
- Team-Aggregation, Abteilungsziele (V7, braucht V5 Teamlead-Rolle)
- Automatische Zielvorschlaege durch KI
- Coaching-Modus / Einwandmuster
- Gamification
- Cross-System-Ziele
- Provisions- / Verguetungsberechnung
- OKR-Framework oder komplexe Ziel-Hierarchien
- Produktkatalog-Export an System 1 (Onboarding-Plattform)

### V6 Constraints
- Single User (Eigentuemer) — wie V1-V5
- Self-hosted auf Hetzner (bestehender Server)
- Bestehende Next.js + Supabase Infrastruktur
- Bedrock Claude Sonnet fuer KI-Empfehlungen (gleicher Provider)
- Produkttypen sind Stammdaten, keine komplexen Produktstrukturen
- Import-Format: CSV mit definiertem Template (kein Excel-Parser noetig)
- Alle bestehenden Features (V2-V4.3) bleiben unveraendert

### V6 Risks & Assumptions

| Risiko | Mitigation |
|---|---|
| Produkt-Zuordnung auf bestehende Deals ist aufwaendig (Altdaten) | Produkt-Zuordnung optional auf Deals, Backfill als bewusster manueller Schritt |
| KPI-Snapshot-Tabelle waechst unbegrenzt | Bei taeglichem Snapshot + 10 KPIs + 5 Produkte = ~18.000 Zeilen/Jahr — vernachlaessigbar |
| Prognose-Logik ist anfaellig fuer kleine Datenmengen | Klare Mindest-Schwelle: Prognose erst ab N Datenpunkten anzeigen, sonst "Nicht genug Daten" |
| Excel-Import ist fehleranfaellig | Striktes Template, Validierung, Fehler-Report pro Zeile |
| Abschlussquote-Berechnung ist unklar bei wenigen Deals | Definition: Won / (Won + Lost) im Zeitraum, Minimum 5 abgeschlossene Deals fuer aussagekraeftige Quote |

### V6 Success Criteria

1. User kann Produkte anlegen und auf Deals zuordnen
2. User kann Ziele pro Typ, Zeitraum und optional pro Produkt setzen
3. User kann Ziele per CSV importieren
4. Performance-Cockpit zeigt Soll-Ist-Abgleich mit Prognose
5. KI-Empfehlung gibt konkrete Handlungsanweisung basierend auf Ziel-Delta
6. KPI-Snapshots laufen taeglich automatisch
7. Trend-Vergleich (aktuelle vs. Vorperiode) funktioniert
8. Bestehende Features (Pipeline, Dashboard, Workspace) bleiben unveraendert
9. Schnittstellenfelder fuer Intelligence Studio sind dokumentiert

### V6 Open Questions (fuer /architecture)

- Produkt-Deal-Zuordnung: Separate Tabelle `deal_products` (n:m) oder Array-Feld auf Deals? n:m ist sauberer fuer Auswertungen.
- KPI-Snapshot-Tabelle: Eine Tabelle mit KPI-Typ-Spalte oder separate Tabellen pro KPI? Eine Tabelle ist flexibler.
- Performance-Cockpit: Eigene Seite unter "Analyse" oder Widget auf "Mein Tag"? Wahrscheinlich beides (Kurzversion auf Mein Tag, Vollversion unter Analyse).
- CSV-Import: Server Action oder dedizierte API-Route? Server Action reicht fuer Internal Tool.
- Prognose-Berechnung: Soll die Pipeline-gewichtete Prognose die Stage-Wahrscheinlichkeiten aus `pipeline_stages.probability` nutzen (bestehendes Feld)?
- Produkt-Kategorien: Freie Tags oder vordefinierte Enum? Empfehlung: Freitext mit Autocomplete (wie Branchen).

---

## V5.1 — Asterisk Telefonie + SMAO Voice-Agent-Vorbereitung

### V5.1 Problem Statement

Aktuell kann der Eigentuemer nur ueber Video-Meetings (Jitsi) oder klassisches Telefon kommunizieren. Telefonate werden nicht erfasst, nicht transkribiert, nicht zusammengefasst. Kein Anruf erzeugt automatisch eine Deal-Activity. Eingehende Anrufe koennen nicht intelligent geroutet werden — entweder nimmt der Eigentuemer ab oder der Anruf geht verloren.

Gleichzeitig wird eine professionelle Telefonie-Loesung benoetigt, die:
- Ausgehende Anrufe direkt aus dem Deal-Workspace ermoeglicht (Click-to-Call)
- Jedes Telefonat automatisch aufnimmt, transkribiert und zusammenfasst
- Eingehende Anrufe spaeter durch einen KI-Voice-Agenten (SMAO) vorqualifizieren kann
- Unabhaengig vom SIP-Anbieter funktioniert (Provider-Wechsel ohne Umbau)
- Auf dem Handy nutzbar ist (spaeter, ueber SIP-Softphone)

### V5.1 Goal

Eine eigene Asterisk-basierte Telefonanlage auf dem Hetzner-Server, die:
1. Ausgehende Anrufe aus dem Browser per WebRTC ermoeglicht
2. Gespraeche automatisch aufnimmt und durch die bestehende Whisper-Summary-Pipeline schickt
3. Die SMAO-Integration so vorbereitet, dass sie spaeter per Config-Aenderung aktiviert werden kann
4. Intern testbar ist ohne externe Kosten (SIP-Trunk wird spaeter angeschlossen)

### V5.1 Primary User

Eigentuemer — fuehrt Vertriebs- und Beratungstelefonate, will diese strukturiert erfassen und auswerten.

### V5.1 Features (4 Features)

#### FEAT-511 — Asterisk PBX Deployment + SIP-Trunk-Adapter

**Zweck:** Eigene Telefonanlage als Docker-Container auf Hetzner. SIP-Trunk-Konfiguration ueber ENV (nicht hardcoded). Intern testbar ohne externen Trunk.

**Scope:**
- Asterisk Docker-Container im bestehenden Compose-Stack
- PJSIP-Konfiguration fuer WebRTC (Browser-Telefonie)
- SIP-Trunk-Konfiguration ueber ENV-Variablen (SIP_TRUNK_HOST, SIP_TRUNK_USER, SIP_TRUNK_PASS)
- Interner Test-Modus: Asterisk-zu-Asterisk Calls ohne externen Trunk
- Dialplan-Grundstruktur: Ausgehend, Eingehend, Intern
- MixMonitor-Konfiguration fuer automatische Gespraechsaufnahme

**Acceptance Criteria:**
- AC1: Asterisk-Container startet und ist healthy im Docker-Stack
- AC2: WebRTC-Endpunkt ist konfiguriert (PJSIP + WSS)
- AC3: SIP-Trunk-Credentials kommen aus ENV (kein Hardcoding)
- AC4: Ohne SIP-Trunk: interne Testanrufe zwischen zwei WebRTC-Clients funktionieren
- AC5: Jedes Gespraech wird automatisch als Audio-Datei aufgezeichnet (MixMonitor)
- AC6: Audio-Dateien landen in einem definierten Verzeichnis (Volume-Mount)

#### FEAT-512 — Click-to-Call aus Deal-Workspace

**Zweck:** Anruf-Button im Deal-Workspace, der ein Telefonat ueber den Browser startet. WebRTC-Client integriert in die bestehende UI.

**Scope:**
- "Anrufen"-Button im Deal-Workspace (neben bestehenden Quick-Actions)
- WebRTC-Client-Komponente (SIP.js oder JsSIP) — verbindet sich mit Asterisk
- Anruf-UI: Waehlen, Klingeln, Verbunden, Auflegen — minimales In-Call-Widget
- Anrufer-ID: Hauptnummer wird angezeigt (aus ENV)
- Kontakt-Nummer wird aus Deal-Kontext vorausgefuellt
- Nach Gespraechsende: Automatischer Summary-Trigger

**Acceptance Criteria:**
- AC1: Deal-Workspace zeigt "Anrufen"-Button wenn Kontakt eine Telefonnummer hat
- AC2: Klick oeffnet In-Call-Widget im Browser (Mikrofon-Zugriff)
- AC3: Ausgehender Anruf ueber Asterisk → SIP-Trunk (oder interner Test)
- AC4: In-Call-Widget zeigt Status: Waehlen → Klingeln → Verbunden → Beendet
- AC5: Kontakt-Name + Nummer im Widget sichtbar
- AC6: Auflegen beendet den Anruf sauber (keine haengenden Sessions)

#### FEAT-513 — Anruf-Aufnahme → Whisper → Summary → Deal-Activity

**Zweck:** Jedes Telefonat durchlaeuft die gleiche Pipeline wie Video-Meetings: Aufnahme → Transkription → KI-Summary → automatische Deal-Activity.

**Scope:**
- Nach Gespraechsende: Audio-Datei wird erkannt (Cron oder Event-Trigger)
- Audio → bestehender Whisper-Adapter (gleicher Code wie Meeting-Transkription)
- Transkript → bestehender Bedrock Summary-Service
- Summary → neue `call_activities`-Eintrag oder bestehende `activities`-Tabelle mit type="call"
- Verknuepfung zu Deal/Kontakt (aus dem Call-Kontext)
- Transkript + Summary sichtbar im Deal-Workspace Timeline
- Audio-Retention: Konfigurierbar (30/60/90 Tage), danach automatisch loeschen

**Acceptance Criteria:**
- AC1: Nach Gespraechsende wird Audio automatisch transkribiert (Whisper)
- AC2: Transkript wird durch Bedrock zu strukturiertem Summary verdichtet
- AC3: Summary erscheint als Activity (type="call") in der Deal-Timeline
- AC4: Transkript ist im Activity-Detail einsehbar
- AC5: Call-Activity zeigt: Kontakt, Dauer, Datum/Uhrzeit, Summary
- AC6: Audio-Dateien werden nach konfigurierbarer Retention geloescht

#### FEAT-514 — SMAO Voice-Agent Adapter (vorbereitet, nicht verbunden)

**Zweck:** Integration mit SMAO (oder alternativem Voice-Agent-Anbieter) fuer eingehende Anrufe vorbereiten. Adapter-Pattern: Code ist fertig, Verbindung wird spaeter per ENV aktiviert.

**Scope:**
- SMAO-Adapter nach Provider-Pattern (wie Bedrock-Client, Whisper-Adapter)
- Webhook-Endpoint: POST /api/webhooks/voice-agent — empfaengt Call-Daten von SMAO
- Webhook verarbeitet: Transkript, Klassifikation (dringend/rueckruf/info), Kontakt-Zuordnung
- Automatische Aktionen basierend auf Klassifikation:
  - Dringend: Push-Notification an User
  - Rueckruf: Task erstellen mit Transkript
  - Meeting-Anfrage: Cal.com-Buchungslink zuruecksenden (Konzept)
- Asterisk-Dialplan vorbereitet: Eingehende Anrufe koennen an SMAO-SIP-Endpunkt geroutet werden (per ENV aktivierbar)
- ENV-Variablen: SMAO_ENABLED=false (default), SMAO_SIP_URI, SMAO_WEBHOOK_SECRET, SMAO_API_KEY

**Acceptance Criteria:**
- AC1: Webhook-Endpoint /api/webhooks/voice-agent existiert und validiert SMAO_WEBHOOK_SECRET
- AC2: Webhook verarbeitet Transkript + Klassifikation und erstellt passende Aktionen (Task/Notification)
- AC3: Adapter-Interface definiert (VoiceAgentProvider) — SMAO ist erste Implementierung
- AC4: Ohne SMAO_ENABLED=true: Eingehende Anrufe werden normal geroutet (Asterisk-Default)
- AC5: Mit SMAO_ENABLED=true: Eingehende Anrufe gehen zuerst an SMAO-SIP-URI
- AC6: Provider-Wechsel (SMAO → Synthflow) ist ohne Feature-Rewrite moeglich

### V5.1 Architekturleitplanken

1. **Asterisk als Docker-Container** — im bestehenden Compose-Stack auf Hetzner, kein separater Server
2. **Adapter-Pattern ueberall** — SIP-Trunk via ENV, Voice-Agent via ENV, Audio-Pipeline via bestehendem Whisper-Adapter
3. **Kein externer Kostenblock in V5.1** — alles ist intern testbar. SIP-Trunk + SMAO-Account werden erst bei Go-Live aktiviert
4. **WebRTC ueber WSS** — Browser-Telefonie ueber bestehenden Traefik-Proxy (eigene Subdomain z.B. sip.strategaizetransition.com)
5. **Bestehende Pipeline wiederverwenden** — Whisper-Adapter, Bedrock Summary-Service, Activity-System, Timeline-Rendering
6. **EU-only Datenhaltung** — Audio-Dateien auf Hetzner, Transkription via bestehenden Whisper-Pfad, Summary via Bedrock Frankfurt

### V5.1 In Scope

- Asterisk PBX als Docker-Container
- WebRTC-basierte Browser-Telefonie (ausgehend)
- Click-to-Call aus Deal-Workspace
- Automatische Aufnahme + Transkription + Summary
- Call-Activities in Deal-Timeline
- SMAO-Adapter + Webhook (vorbereitet, nicht verbunden)
- Eingehende-Anrufe-Routing (Dialplan vorbereitet)

### V5.1 Out of Scope

- SIP-Trunk-Beschaffung (wird bei Go-Live gemacht)
- SMAO-Account-Aktivierung (wird bei Go-Live gemacht)
- Mobile-App / SIP-Softphone (spaeter, V5.3)
- KI-Assistent-Gespraechsfuehrung (SMAO-seitig, nicht unser Code)
- Multi-User-Telefonie (V7)
- Voicemail (spaeter)
- Call-Warteschlange (V7, Team-Feature)
- DSGVO-Einwilligungsflow fuer Telefonat-Aufnahme (separater Slice, analog FEAT-411)

### V5.1 Constraints

- **Adapter-Pattern-Pflicht** — SIP-Trunk und Voice-Agent muessen ueber ENV konfigurierbar sein. Kein Hardcoding.
- **Bestehende Pipeline nutzen** — Whisper-Adapter und Bedrock-Summary muessen wiederverwendet werden. Kein neuer Transkriptions-Service.
- **Kein externer Traffic in V5.1** — alles muss intern testbar sein ohne SIP-Trunk-Kosten.
- **Audio-Retention** — Aufnahmen muessen nach konfigurierbarer Frist automatisch geloescht werden.
- **WebRTC ueber TLS** — Browser-Audio muss ueber WSS (verschluesselt) laufen, nicht unverschluesselt.

### V5.1 Risks & Assumptions

- **Risk:** Asterisk + WebRTC + Traefik-WSS-Proxy ist infrastrukturell anspruchsvoll. UDP-Ports + WSS muessen korrekt konfiguriert werden.
- **Risk:** Hetzner CPX32 RAM-Budget. Asterisk braucht ~200MB, aber zusammen mit Jitsi+Jibri+Supabase wird es eng bei parallelen Calls + Recordings. Moeglicherweise Server-Upgrade noetig.
- **Risk:** SMAO-API koennte sich aendern oder SMAO als Firma koennte verschwinden (kleines Startup). Adapter-Pattern mitigiert das — Synthflow als Backup.
- **Assumption:** WebRTC-Audio-Qualitaet ueber Browser ist ausreichend fuer Business-Telefonate.
- **Assumption:** MixMonitor-Aufnahmen sind qualitativ gut genug fuer Whisper-Transkription.
- **Assumption:** easybell oder sipgate akzeptieren NL-Firmensitz mit DE-Nummer (EU B2B Standard).

### V5.1 Success Criteria

V5.1 ist erfolgreich wenn:
1. Eigentuemer kann aus dem Deal-Workspace einen Kontakt per Klick anrufen (Browser + Mikrofon)
2. Das Gespraech wird automatisch aufgenommen
3. Nach dem Gespraech erscheint innerhalb <10 Minuten ein Transkript + Summary als Call-Activity im Deal
4. Interne Testanrufe (ohne SIP-Trunk) funktionieren
5. SMAO-Webhook-Endpoint ist bereit und verarbeitet Test-Payloads korrekt
6. Eingehende-Anrufe-Routing im Dialplan ist vorbereitet (aktivierbar per ENV)
7. Kein externes System muss fuer V5.1-Tests bezahlt werden

### V5.1 Open Questions (fuer /architecture)

- Asterisk-Version: Asterisk 20 LTS oder 21? Empfehlung: 20 LTS (Support bis 2028)
- WebRTC-Library: SIP.js vs. JsSIP vs. Offen-Alternative? SIP.js ist am weitesten verbreitet.
- Audio-Format: WAV (gross, beste Qualitaet) vs. Opus (klein, Whisper-kompatibel)?
- WSS-Subdomain: Eigene Subdomain (sip.strategaizetransition.com) oder Pfad-basiert (/ws/sip)?
- Call-Activity-Schema: Bestehende `activities`-Tabelle mit type="call" oder separate `calls`-Tabelle?
- SMAO-Webhook-Format: Muessen wir deren exaktes Payload-Format recherchieren, oder reicht ein generisches Interface?
- Asterisk-Konfiguration: Statische Config-Files (traditionell) oder ARI (Asterisk REST Interface) fuer dynamische Steuerung?
- Hetzner Firewall: Welche UDP-Ports muessen fuer RTP-Media geoeffnet werden?

---

## V5.2 — Compliance-Sprint (DSGVO-Hardening vor Go-Live)

### V5.2 Problem Statement

V5.1 ist technisch produktionsreif als REL-016, laeuft aber im **Internal-Test-Mode** — nur Echo-Tests des Eigentuemers. Vor dem ersten echten Kunden-/Interessenten-Anruf muessen mehrere DSGVO-Themen geschlossen werden:

1. **Rohdaten-Retention 30 Tage** ist im Sinne der Datensparsamkeit (DSGVO Art. 5) zu lang. WAV-Dateien und Roh-Transkripte werden technisch nur als Buffer fuer die Pipeline-Wiederholbarkeit gebraucht, nicht 30 Tage.
2. **Whisper-Transkription laeuft via OpenAI-API in den USA** — seit Schrems II ein Drittlandtransfer-Risiko (DSGVO Art. 44ff). Der Stack bietet keine produktionsreife EU-Alternative, obwohl der Provider-Adapter bereits existiert.
3. **Einwilligungstexte fuer Recording fehlen.** Der Eigentuemer hat keine zentrale Stelle, an der DSGVO-konforme Texte fuer Meeting-Einladungen, E-Mail-Footer und Cal.com-Buchungsstrecken abrufbar sind. Folge: Cold-Calling-/Cold-Recording-Risiko.
4. **Meeting-Timeline-Items zeigen weniger Details als Call-Timeline-Items** — Inkonsistenz, die fuer den Nutzer wie ein Bug wirkt. CallTimelineItem rendert Decisions, Action Items und Transkript in einem Expand-Bereich; MeetingTimelineItem nicht.
5. **DSGVO-Compliance-Doku fehlt.** Es gibt keine zentrale, exportierbare Beschreibung wie das System personenbezogene Daten verarbeitet — wird bei externen Kunden-Anfragen gebraucht.

### V5.2 Goal

Das System ist **DSGVO-belastbar** fuer den ersten Go-Live mit echten externen Calls/Meetings. Konkret:
- Rohdaten-Retention auf das technisch notwendige Minimum (7 Tage) reduziert.
- Azure-Whisper-Adapter **vollstaendig implementiert** und per ENV-Switch aktivierbar — die tatsaechliche Umstellung erfolgt erst, wenn der Azure-Account vor Go-Live bereitsteht.
- Eigentuemer hat eine zentrale Settings-Page, von der er fertige Einwilligungstexte fuer Meeting-Einladungen und E-Mail-Footer abrufen und mit eigenen Variablen anpassen kann.
- MeetingTimelineItem zeigt dieselben Details wie CallTimelineItem (UI-Parity).
- Eine generierte Compliance-Doku beschreibt Datenfluesse, Speicherorte, Anbieter-Regionen und Retention.

### V5.2 Primary User

Eigentuemer — beim Onboarding eines neuen Kunden / vor dem ersten echten Recording-Call. Sekundaer: zukuenftige externe Kunden, die DSGVO-Doku einfordern.

### V5.2 Features (5 Features)

#### FEAT-521 — Recording-Retention auf 7 Tage hardening

**Zweck:** Rohdaten (WAV-Aufnahmen + Roh-Transkripte) werden nur noch 7 Tage statt 30 Tagen aufbewahrt. AI-Summary bleibt unveraendert lang erhalten (Activity-Retention).

**Scope:**
- `RECORDING_RETENTION_DAYS`-Default in `cockpit/src/app/api/cron/recording-retention/route.ts` von `"30"` auf `"7"` reduziert.
- `RECORDING_RETENTION_DAYS`-Default in `docker-compose.yml` von `:-30` auf `:-7` reduziert.
- ENV bleibt technisch ueberschreibbar — Coolify-Override pro Umgebung moeglich (z.B. fuer einen Pilotkunden mit 14d-Wunsch).
- Doku in `.env.example` und `docs/ARCHITECTURE.md` dass 7 Tage der DSGVO-Default ist.
- Retention-Cron unveraendert (Logik bleibt, nur Default-Wert aendert sich).
- Verifikation: Cron-Run im Staging zeigt korrekt, dass Calls aelter als 7 Tage in cleanup-Liste aufgenommen werden.

**Acceptance Criteria:**
- AC1: Default-Wert in Code und Compose-File ist 7 Tage.
- AC2: ENV-Override funktioniert weiterhin (Test mit RECORDING_RETENTION_DAYS=14).
- AC3: Retention-Cron loescht Recordings die aelter sind als der Schwellwert.
- AC4: Activity-Eintraege (Summary) werden NICHT von der Retention beruehrt — nur WAV + Transkript.
- AC5: `.env.example` enthaelt Kommentar mit DSGVO-Begruendung fuer 7d-Default.

#### FEAT-522 — Azure-Whisper-Adapter Implementierung (Code-Ready, nicht aktiviert)

**Zweck:** Der bestehende `azure.ts`-Adapter ist aktuell nur ein Stub mit "noch nicht implementiert"-Fehlermeldung. Er wird voll ausimplementiert nach demselben Vertrag wie `openai.ts`, sodass der Wechsel zu Azure OpenAI Whisper EU-Region in Produktion eine reine ENV-Aenderung ist (`TRANSCRIPTION_PROVIDER=azure` + Azure-Endpoint-/Key-ENVs).

**Scope:**
- `cockpit/src/lib/ai/transcription/azure.ts` voll implementieren — HTTP-Client gegen Azure OpenAI Whisper Deployment.
- ENV-Variablen: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_WHISPER_DEPLOYMENT_ID`, `AZURE_OPENAI_API_VERSION` (Default `2024-06-01`).
- Default `TRANSCRIPTION_PROVIDER=openai` bleibt unveraendert — keine Live-Umstellung in V5.2.
- ENVs in `docker-compose.yml` und `.env.example` als kommentierte Eintraege ergaenzt (mit Hinweis "vor Go-Live setzen").
- Unit-Tests fuer `AzureWhisperProvider`-Klasse: Erfolg, Fehler, leeres Audio, Format-Handling. Tests laufen ohne echten Azure-Call (gemockt).
- Audit-Log-Eintrag (analog OpenAI-Provider) mit Anbieter, Region, Modell-ID, Request-ID gemaess `data-residency.md`.
- README-/Doku-Eintrag wie der ENV-Switch im Go-Live-Moment vorzunehmen ist (3-Schritte-Anleitung).

**Acceptance Criteria:**
- AC1: `AzureWhisperProvider.transcribe()` ruft Azure OpenAI Whisper API korrekt auf und gibt das Transkript zurueck.
- AC2: Mit `TRANSCRIPTION_PROVIDER=openai` (Default) verhaelt sich das System unveraendert.
- AC3: Mit `TRANSCRIPTION_PROVIDER=azure` und gesetzten Azure-ENVs werden Test-Audios transkribiert (manueller Smoke-Test optional, weil kein Account).
- AC4: Mit `TRANSCRIPTION_PROVIDER=azure` und fehlenden Azure-ENVs liefert der Adapter einen klaren Konfig-Fehler statt Stillschweigen.
- AC5: Unit-Tests decken Erfolgs- und Fehlerpfade ab (gemockt).
- AC6: Kein OpenAI-Code ist betroffen — Verhalten von OpenAI-Provider bleibt bit-identisch.
- AC7: Doku in `docs/ARCHITECTURE.md` beschreibt den 3-Schritte-Switch (Azure-Account anlegen, ENVs setzen, Provider auf "azure").

**Nicht-Aktivierung explizit bestaetigt:** Der User hat noch keinen Azure-Account und will V5.2 nicht durch Account-Setup verzoegern. Code-Bereitschaft jetzt, Aktivierung im Pre-Go-Live-Schritt.

#### FEAT-523 — Einwilligungstexte als Templates + Settings-Page

**Zweck:** Eigentuemer hat eine zentrale Settings-Page mit fertigen Einwilligungstexten fuer Recording. Texte enthalten Variablen (`{user_name}`, `{firma}`, `{kontakt_email}`), die er pro Anwendungsfall ausfuellen oder anpassen kann.

**Scope:**
- Settings-Page `/settings/compliance` mit drei Template-Bloecken:
  1. **Meeting-Einladungstext** (fuer Cal.com-/.ics-Beschreibung)
  2. **E-Mail-Footer** (fuer Standard-Mail-Signatur)
  3. **Cal.com-Buchungsbestaetigungstext** (Hinweis im Buchungs-Dialog)
- Default-Texte als Markdown in `cockpit/src/lib/compliance/consent-templates.ts` (rechtlich abgesegnet, Standard fuer DE/EU).
- User kann Texte editieren — Persistenz in `system_settings`-Tabelle (oder analog bestehender Settings-Struktur, bei /architecture entscheiden).
- Variablen-Engine: einfache `{token}`-Ersetzung mit `user_name`, `user_email`, `firma`, `kontakt_name`, `kontakt_email`, `kontakt_firma`.
- "Copy to Clipboard"-Button pro Block.
- "Reset auf Default"-Button pro Block.
- Kein Auto-Anhaengen an Workflows (User-Entscheidung Q3) — User kopiert die Texte manuell beim ersten Setup von Cal.com/SMTP.

**Acceptance Criteria:**
- AC1: `/settings/compliance` ist erreichbar und zeigt 3 Text-Bloecke.
- AC2: Default-Texte sind sichtbar mit eingesetzten User-Variablen.
- AC3: Edit-Funktion speichert geaenderte Texte persistent.
- AC4: Variablen-Liste ist im UI sichtbar (Hinweis welche Tokens verfuegbar sind).
- AC5: Copy-to-Clipboard kopiert den fertigen Text mit Variablen-Ersetzung.
- AC6: Reset stellt den Default-Text wieder her.
- AC7: Keine Workflow-Integration in V5.2 (Auto-Anhaengen ist explizit ausgeschlossen).

#### FEAT-524 — MeetingTimelineItem analog CallTimelineItem (UI-Parity)

**Zweck:** Meeting-Activities zeigen in der Deal-Timeline dieselben Details wie Call-Activities — Decisions, Action Items, Transkript, Key Topics — mit identischem Expand-Verhalten.

**Scope:**
- Neue Komponente `cockpit/src/components/meetings/meeting-timeline-item.tsx` analog `cockpit/src/components/calls/call-timeline-item.tsx`.
- Expand-Bereich rendert: Summary (bereits da), Decisions, Action Items, Key Topics (Badges), Transkript-Toggle.
- Datenquelle: bestehende Meeting-Summary-Felder (Schema bereits in DEC-082 erweitert um `key_topics`).
- `unified-timeline.tsx` integriert die neue Komponente fuer `activity_type="meeting"`.
- Bestehende Meetings ohne neue Felder rendern weiterhin korrekt (Backwards Compatibility).
- Identisches Visual-Design wie CallTimelineItem (Style Guide V2).

**Acceptance Criteria:**
- AC1: Meeting-Activity in der Deal-Timeline zeigt dieselben sektionalen Bloecke wie Call-Activity.
- AC2: Expand-/Collapse-Verhalten ist identisch zu CallTimelineItem.
- AC3: Decisions, Action Items, Key Topics werden gerendert wenn vorhanden.
- AC4: Transkript ist hinter einem Toggle einsehbar.
- AC5: Alte Meeting-Summaries (ohne `key_topics`) zeigen den Topics-Block nicht — kein Layout-Bruch.
- AC6: Optisch nicht von CallTimelineItem unterscheidbar (gleiche Spacing-/Typo-Regeln).

#### FEAT-525 — DSGVO-Compliance-Doku (via /compliance Skill)

**Zweck:** Eine zentrale, exportierbare DSGVO-Doku fuer das Business System, die Datenflusse, Speicherorte, Anbieter-Regionen und Retention beschreibt.

**Scope:**
- `/compliance`-Skill (Dev System) gegen Business System anwenden.
- Output: `docs/COMPLIANCE.md` mit folgenden Sektionen:
  1. Erhobene personenbezogene Daten (Kontakte, E-Mails, Calls, Meetings, Recordings, Transkripte, AI-Summaries)
  2. Datenfluesse pro Quelle (z.B. Call: Browser → Asterisk → MixMonitor → Storage → Whisper → Bedrock → Activity)
  3. Speicherorte und Regionen (Hetzner Frankfurt, Bedrock Frankfurt, Whisper-Provider laut ENV)
  4. Retention-Policies (Rohdaten 7d, Activities langfristig)
  5. Drittanbieter-Liste (AWS Bedrock, OpenAI/Azure Whisper, Cal.com, IMAP-Server)
  6. Auftragsverarbeitungsvertraege (DPA-Status pro Anbieter)
  7. Loeschkonzept (Wie kann ein Kontakt seine Daten loeschen lassen?)
  8. Datenschutzkonforme Defaults (z.B. Recording-Hinweis-Pflicht, Einwilligungs-Texte aus FEAT-523).
- Doku verweist auf den aktuellen Whisper-Provider (zum V5.2-Release-Zeitpunkt: OpenAI-US — explizit dokumentiert mit Hinweis "wird vor Go-Live auf Azure EU umgestellt").
- Kein Code-Output, reine Dokumentation.

**Acceptance Criteria:**
- AC1: `docs/COMPLIANCE.md` existiert und folgt der Skill-Struktur.
- AC2: Alle 8 Sektionen sind ausgefuellt mit projektspezifischen Inhalten.
- AC3: Dokument referenziert die V5.2-Default-Werte (7d Retention, Provider laut ENV).
- AC4: Dokument ist exportierbar (Markdown, kann zu PDF konvertiert werden).
- AC5: Stale-Data-Hinweis: Datum + V5.2-Release-Bezug ist im Doc-Header sichtbar, sodass spaetere Aenderungen auffallen.

### V5.2 Architekturleitplanken

1. **Keine Schema-Aenderungen mit Breaking-Risiko.** V5.2 ist Compliance-Hardening, nicht Feature-Erweiterung. Falls `system_settings`-Tabelle fuer Compliance-Templates fehlt: kleinste moegliche Migration.
2. **Adapter-Pattern weiter durchziehen.** Azure-Whisper-Adapter folgt dem gleichen Vertrag wie der bestehende OpenAI-Adapter — kein neues Pattern.
3. **Keine Live-Provider-Umstellung in V5.2.** Code-Ready: ja. Account-Setup + ENV-Switch: separat vor Go-Live.
4. **Keine UI-Workflow-Integration der Einwilligungstexte.** Templates + Copy-Funktion reichen — der User entscheidet selbst, wann er sie an externen Stellen einbettet.
5. **Backwards Compatibility fuer Meeting-Activities.** Alte Meetings ohne `key_topics` muessen weiterhin sauber rendern.
6. **EU-only-Daten weiterhin verbindlich.** Auch wenn der Whisper-Provider in V5.2 noch OpenAI-US bleibt: Doku weist explizit darauf hin und verbindet die Pre-Go-Live-Umstellung.

### V5.2 In Scope

- Retention-Default 7d (Code + Compose + Doku)
- Azure-Whisper-Adapter voll implementiert (ohne Aktivierung)
- Settings-Page fuer Einwilligungstexte mit Variablen-Engine
- 3 Default-Templates (Meeting-Einladung, E-Mail-Footer, Cal.com-Buchung)
- MeetingTimelineItem mit Decisions/Action-Items/Key-Topics/Transkript-Expand
- DSGVO-Compliance-Doku als Markdown
- Doku-Update fuer ARCHITECTURE.md zum Pre-Go-Live-Switch

### V5.2 Out of Scope

- Aktivierung von Azure-Whisper in Produktion (separate Aktion vor Go-Live, ausserhalb V5.2)
- Azure-Account-Beschaffung
- Auto-Anhaengen der Einwilligungstexte an Cal.com-Buchungsworkflow
- Auto-Einfuegen des E-Mail-Footers in alle ausgehenden Mails
- Per-Call-Consent-Gating-UI (organisatorische Loesung gewaehlt — Sales-Prozess)
- Cold-Call-Verhinderung im Code (Sales-Prozess-Disziplin, kein Software-Feature)
- Ende-zu-Ende-Verschluesselung der Recordings
- Automatischer Recording-Block bei nicht-zustimmenden Teilnehmern
- Volltext-Recht-Texte (rechtliche Pruefung der Templates ist User-Sache, nicht Skill-Output)
- Audit-Log-UI fuer Anbieter-Calls (existiert bereits in DECISIONS-Pattern, kein UI-Bedarf)

### V5.2 Constraints

- **Kein Bruch der laufenden V5.1-Pipeline.** Calls und Meetings muessen waehrend und nach V5.2 weiter funktionieren.
- **Keine Account-Abhaengigkeit fuer V5.2-Abnahme.** Azure-Adapter wird mit Mocks getestet — keine Cloud-Account-Pflicht fuer QA.
- **DSGVO-Default = 7d** auch wenn ENV-Override technisch erlaubt bleibt.
- **Kein UI-Workflow-Disrupt.** Einwilligungstexte sind nur abrufbar, nicht aufgezwungen.
- **Internal-Test-Mode bleibt** bis V5.2 deployed UND Pre-Go-Live-Azure-Switch durchgefuehrt sind.

### V5.2 Risks & Assumptions

- **Risk:** Azure OpenAI Whisper API-Vertrag koennte sich von OpenAI-direkt unterscheiden (Endpoint-Struktur, Response-Format). Adapter-Implementierung muss Azure-Doku exakt folgen, nicht nur OpenAI-Code copy-pasten.
  Mitigation: Microsoft-Doku als Quelle, Unit-Tests mit Mock-Response.
- **Risk:** Retention-Reduzierung von 30 auf 7 Tage koennte einen laufenden Pipeline-Fehler verstecken (Recording wird geloescht, bevor Re-Processing moeglich ist).
  Mitigation: 7d ist immer noch genug Zeit, der Cron laeuft taeglich, und Pipeline-Fehler werden in den ersten Stunden sichtbar.
- **Risk:** Settings-Page fuer Compliance-Texte koennte mit bestehenden Settings-Strukturen kollidieren.
  Mitigation: bei /architecture entscheiden, ob `system_settings`-Tabelle erweitert wird oder neue `compliance_templates`-Tabelle.
- **Assumption:** Azure-Endpoint-/API-Vertrag ist OpenAI-kompatibel genug, dass der Adapter mit kleinem Delta funktioniert.
- **Assumption:** User pflegt seine eigenen Variablen (Firma, E-Mail) bereits irgendwo im System (Profil oder Settings) — Variablen-Engine kann darauf zugreifen.
- **Assumption:** Default-Compliance-Texte werden vom User vor Go-Live noch rechtlich geprueft (Skill liefert Vorlage, nicht Rechtsberatung).

### V5.2 Success Criteria

V5.2 ist erfolgreich wenn:
1. RECORDING_RETENTION_DAYS-Default ist 7 in Code und Compose-File.
2. Azure-Whisper-Adapter ist voll implementiert und mit Mock-Tests gruen.
3. ENV-Switch zu Azure ist mit klarer Pre-Go-Live-Anleitung in der Doku.
4. `/settings/compliance` ist erreichbar und liefert 3 Templates mit funktionierender Variablen-Engine.
5. MeetingTimelineItem sieht und verhaelt sich identisch zu CallTimelineItem fuer alle relevanten Attribute.
6. `docs/COMPLIANCE.md` existiert und ist inhaltlich vollstaendig.
7. Bestehende V5.1-Pipeline (Calls + Meetings) funktioniert unveraendert weiter.

### V5.2 Open Questions (fuer /architecture)

- Speicherort der Compliance-Templates: Erweiterung der bestehenden `system_settings`-Tabelle (falls vorhanden) oder neue `compliance_templates`-Tabelle? Default: erweitern, weniger Migration.
- Variablen-Engine: Eigene Mini-Implementierung (`text.replace(/{token}/g, ...)`) oder bestehende Library wie `lodash.template`? Empfehlung: eigene Mini-Implementierung wegen Bundle-Size + voller Kontrolle.
- Rechtliche Tiefe der Default-Texte: Standard-DE-Floskeln reichen, oder soll der Skill auf eine externe Vorlage (anwalt.de, IHK) verweisen? Empfehlung: pragmatische DE-Default mit Hinweis "vor produktiver Nutzung anwaltlich pruefen".
- Azure-API-Version pinning: Hardcode (z.B. `2024-06-01`) oder ENV? Empfehlung: ENV mit Default — flexibler bei Microsoft-Updates.
- MeetingTimelineItem-Datenquelle: Schreibt Bedrock-Summary `decisions` und `action_items` bereits in das Schema, das der UI-Renderer erwartet? Wenn nicht: Mapping-Layer noetig.

## V5.3 — E-Mail Composing Studio

### V5.3 Problem Statement

Die heutige E-Mail-Erstellung ist eine schmale Single-Column-Form (`EmailCompose`) mit Template-Dropdown, Textarea, Voice-Diktat und drei KI-Improve-Buttons (Korrektur / Formaler / Kuerzen). Sie funktioniert, aber sie ist nicht das, womit der Eigentuemer einen Vertriebs- oder Multiplikator-Touch in 30 Sekunden seriös rausschicken will. Konkrete Probleme:

1. **Kein visuelles Branding.** Die Mail geht als Plain-Text-zu-HTML-Konversion (`textToHtml` in `send.ts`) raus. Logo, Schriftfamilie, Markenfarben und konsistente Signatur fehlen. Empfaengerseitig wirkt das amateurhaft.
2. **Vorlagen sind text-only.** `email_templates`-Tabelle haelt nur `subject_*` und `body_*` (3 Sprachen). Es gibt kein Layout, keine Bloecke, keine Wiederverwendung von Header/Footer. Anpassungen an Branding muessen pro Vorlage manuell mitgepflegt werden.
3. **Keine Systemvorlagen.** Der User muss jede Vorlage selber anlegen. Es gibt keinen Pool an Standard-B2B-Vertriebsvorlagen (Erstansprache, Follow-up, Nach-Termin, Angebot, Danke, Re-Aktivierung), den der Skill mitliefern koennte.
4. **Vorlagen-Erstellung ist schwerfaellig.** Der User tippt Subject + Body manuell pro Sprache. Es gibt keine Diktat- oder KI-gestuetzte Vorlagen-Generierung ("erstelle mir eine Erstansprache fuer Steuerberater im Mittelstand").
5. **Keine Live-Preview.** Der User sieht erst nach dem Versand, wie die Mail beim Empfaenger ankommt. Bei Branding-Ergaenzungen waere ein Echtzeit-Render unverzichtbar.
6. **Inline-Edit-Diktat fehlt.** Voice-Diktat haengt heute nur am Body an (`prev + " " + text`). Ein gezieltes "ergaenze nach Satz 2 folgendes" oder "ersetze den Schluss durch X" ist nicht vorgesehen.
7. **Empfaenger und Betreff sind nicht KI-gestuetzt.** Aus dem Deal-Kontext (Kontakt, Firma, letzter Touch, Stage) liesse sich beides praezise vorausfuellen — passiert aber nicht.

V5.3 ist die einzige V5-Version, die dem User seine Mails *im Tagesgeschaeft schoener* macht. Alle anderen V5-Versionen sind Backend-/Compliance-/Telefonie-/Performance-Themen.

### V5.3 Goal

Eine eigenstaendige Vollbild-Seite `/emails/compose` (oder `/emails/compose/[id]`), die in einem 3-Panel-Layout E-Mail-Erstellung als seriose, gebrandete, KI-unterstuetzte Aktion ermoeglicht. Konkret:

- **LINKS:** Vorlagen-Panel — Systemvorlagen + eigene Vorlagen, kategorisiert, suchbar. Vorlage erstellen per Text **oder KI-Diktat** ("erstelle mir eine Re-Aktivierungs-Mail fuer einen Lead, der seit 3 Monaten kalt ist").
- **MITTE:** Erfassen-Panel — Empfaenger + Betreff aus Deal-Kontext vorausgefuellt, Body editierbar mit angewandter Vorlage, Inline-Diktat-Befehle ("nach dem Satz X folgendes einbauen"), bestehende KI-Improve-Buttons bleiben.
- **RECHTS:** Live-Preview-Panel — gerenderte Mail exakt wie sie rausgeht (Branding + Inhalt + Empfaenger), aktualisiert sich in Echtzeit.

Branding wird **einmal zentral** gepflegt (Logo, Primaerfarbe, Schrift) und auf alle Vorlagen automatisch angewendet — keine Vorlage-pro-Vorlage-Pflege mehr.

### V5.3 Primary User

Eigentuemer im Tagesgeschaeft — schreibt eine Mail aus dem Deal-Workspace heraus, will in unter 60 Sekunden eine seriose, gebrandete Mail mit korrektem Empfaenger und Betreff rausschicken. Sekundaer: Setup-Phase (einmal Branding + eigene Vorlagen anlegen).

### V5.3 Vision — Die ideale Sequenz

1. User klickt im Deal-Workspace auf "E-Mail schreiben".
2. `/emails/compose?dealId=...` oeffnet sich — Empfaenger + Betreff sind aus dem Deal-Kontext per KI vorbefuellt.
3. Mittel-Panel zeigt eine sinnvolle Default-Vorlage (z.B. "Follow-up nach Erstgespraech") schon angewendet.
4. User korrigiert per Text oder Diktat 1-2 persoenliche Saetze.
5. Live-Preview rechts zeigt die finale gebrandete Mail.
6. Klick auf "Senden" — Mail geht raus mit Tracking-Pixel + Logging wie bisher.

Setup-Sequenz (einmalig, separat):
1. User oeffnet `/settings/branding` und legt Logo, Primaerfarbe, Schrift fest.
2. User oeffnet `/emails/compose`, klickt "Neue Vorlage" + "KI-Diktat", spricht "ich brauche eine Erstansprache fuer Steuerberater im Mittelstand mit Verweis auf unsere Co-Innovation".
3. KI generiert Subject + Body. User editiert, speichert. Vorlage erscheint in seinem Pool.

### V5.3 Scope-Prinzip

V5.3 ist eine **UI-zentrische Slice** — der Versand-Layer (`send.ts`, Tracking, IMAP-Sync, Auto-Zuordnung, Cadences) bleibt unveraendert. Es geht ausschliesslich um die Komposition vor dem Versand und um Vorlagen-Verwaltung.

Datenmodell-Erweiterungen sind minimal:
- `email_templates` bekommt Felder `is_system`, `category`, `language` (heute nur 3 Body-Sprachen-Kolumnen) — und ein `layout`-Feld fuer optionale Block-Struktur (default: einfacher Body).
- Neues `branding`-Settings (Logo-URL/Base64, Primaerfarbe, Schriftfamilie, Default-Footer) entweder in `system_settings` oder eigene Tabelle.
- Keine Schema-Aenderung an `emails`-Tabelle.

### V5.3 Features (4 Features)

#### FEAT-531 — Branding-Settings + zentrale Mail-Layout-Engine

**Zweck:** Eine zentrale Stelle (`/settings/branding`), an der Logo, Primaerfarbe, Sekundaerfarbe, Schriftfamilie und Default-Footer-Text gepflegt werden. Diese Werte werden beim HTML-Rendering auf jede Vorlage und Mail angewendet.

**Scope:**
- Settings-Page `/settings/branding` mit Feldern: Logo (Upload/URL), Primaerfarbe (Hex), Sekundaerfarbe (Hex), Schriftfamilie (Dropdown: System / Inter / Sans / Serif), Default-Footer-Text (Markdown), Kontakt-Block (Name, Firma, Telefon, Web).
- Persistenz in `system_settings` (Erweiterung) oder neue `branding_settings`-Tabelle — bei /architecture entscheiden.
- HTML-Renderer-Funktion `renderBrandedHtml(body, branding, vars)` in `cockpit/src/lib/email/render.ts`. Output: vollstaendiges, inline-CSS-versehenes HTML, kompatibel mit gaengigen E-Mail-Clients.
- `send.ts` ruft den Renderer (statt `textToHtml`) wenn Branding gepflegt ist; faellt zurueck auf `textToHtml`-Verhalten wenn nicht.
- Live-Preview verwendet **denselben** Renderer — kein Drift zwischen Vorschau und Versand.

**Acceptance Criteria:**
- AC1: `/settings/branding` ist erreichbar und persistiert eingegebene Werte.
- AC2: Logo wird im gerenderten HTML als `<img>` mit absoluter URL/Data-URI eingebettet.
- AC3: Primaerfarbe ist sichtbar in Footer-Linie und/oder Buttons.
- AC4: Schriftfamilie wird per Inline-Style auf `<body>` und Hauptbereiche gesetzt.
- AC5: Eine Mail ohne Branding-Settings geht weiterhin als Plain-zu-HTML raus (Backwards Compatibility).
- AC6: Live-Preview-Render ist bit-identisch zum tatsaechlich versendeten HTML (gleicher Renderer-Aufruf).
- AC7: Renderer ist Unit-getestet mit Snapshot fuer minimale, vollstaendige und edge-case Branding-Konfigs.

#### FEAT-532 — 3-Panel-Composing-Studio (`/emails/compose`)

**Zweck:** Eine eigene Vollbild-Seite mit 3 Spalten als zentraler E-Mail-Erstellungs-Ort. Ersetzt nicht das `EmailCompose` in der `email-sheet.tsx`-Sheet (kann V5.3 als Mini-Variante bleiben), sondern wird der primaere Einstiegspunkt aus Deal-Workspace, Mein Tag, Focus und Sidebar.

**Scope:**
- Neue Route `cockpit/src/app/(app)/emails/compose/page.tsx`.
- 3-Spalten-Layout: links 280-320px Vorlagen-Liste, mitte flex-1 Formular, rechts 420-480px Preview. Mobile-Fallback: Spalten als Tabs.
- Query-Parameter: `?dealId=...`, `?contactId=...`, `?companyId=...`, `?templateId=...` — initialisieren Empfaenger/Betreff/Body aus Kontext.
- Vorlagen-Panel:
  - Systemvorlagen (mit Badge "System") + eigene Vorlagen, getrennt gruppiert.
  - Such-/Filter-Feld (Kategorie: Erstansprache / Follow-up / Nach-Termin / Angebot / Danke / Re-Aktivierung / Sonstige).
  - Klick auf Vorlage wendet sie auf das Formular an (mit Variablen-Ersetzung aus Deal-Kontext).
  - "+ Neue Vorlage"-Button (siehe FEAT-533).
- Erfassen-Panel:
  - Felder An, Betreff, Body, Follow-up wie heute.
  - "KI-Vorschlag An/Betreff"-Button: laedt aus Deal-Kontext (zuletzt schreibender Kontakt + sinnvoller Subject).
  - Voice-Recording-Button bleibt (Body-anhaengen wie heute).
  - Inline-Edit-Diktat-Button (siehe FEAT-534): "ergaenze nach Satz X" / "ersetze Absatz Y".
  - Bestehende KI-Improve-Buttons (Korrektur / Formaler / Kuerzen) bleiben.
- Live-Preview-Panel:
  - Rendert kontinuierlich mit `renderBrandedHtml` aus FEAT-531.
  - Variablen werden mit Deal-Kontext aufgeloest (vorname, nachname, firma, position, deal).
  - Empfaenger-Header (An: ..., Von: ...) ist sichtbar — wie der Empfaenger es sehen wird.
  - Aktualisiert sich on-change mit kleinem Debounce (200-300ms).
  - "Senden"-Button unten — fuehrt zum bestehenden `sendEmail`-Server-Action mit Branding-HTML.
- Einstiegspunkte umstellen:
  - Deal-Workspace "E-Mail schreiben" → `/emails/compose?dealId=...&contactId=...`.
  - Mein Tag E-Mail-Schnellaktion → `/emails/compose?contactId=...`.
  - Focus E-Mail-Aktion → `/emails/compose?contactId=...`.
  - Sidebar "E-Mail" bleibt → fuehrt auf `/emails`.

**Acceptance Criteria:**
- AC1: `/emails/compose` ist erreichbar als Vollbild-Seite mit 3-Panel-Layout.
- AC2: Mit `?dealId=X` werden Empfaenger und Betreff aus Deal-Kontext (zuletzt schreibender Kontakt, sinnvoller Default-Subject) per KI-Vorschlag vorausfuellbar.
- AC3: Klick auf eine Vorlage in der linken Spalte fuellt Mitte und Preview konsistent.
- AC4: Variablen-Ersetzung verwendet vorhandene Deal-/Kontakt-/Firma-Daten.
- AC5: Live-Preview aktualisiert sich bei Aenderungen in der Mitte (max 300ms Lag).
- AC6: "Senden" verwendet `sendEmailWithTracking` und produziert dieselben DB-Eintraege wie heute (Tracking + Logging unveraendert).
- AC7: Mobile-Layout zeigt Tabs statt Spalten — alle 3 Bereiche bleiben erreichbar.
- AC8: Deal-Workspace-Button "E-Mail schreiben" oeffnet die neue Seite (nicht mehr das Sheet).

#### FEAT-533 — Systemvorlagen + KI-Vorlagen-Generator

**Zweck:** Mitgelieferter Pool an B2B-Vertriebs-Systemvorlagen plus die Moeglichkeit, eigene Vorlagen via KI-Diktat in unter 60 Sekunden zu generieren.

**Scope:**
- Seed-Migration mit Systemvorlagen (z.B. SQL-Insert oder TypeScript-Seed-Funktion):
  - Erstansprache Multiplikator (DE)
  - Erstansprache Unternehmer-Lead (DE)
  - Follow-up nach Erstgespraech (DE)
  - Follow-up Angebot ausstehend (DE)
  - Danke nach Termin (DE)
  - Re-Aktivierung kalter Lead (DE)
  - Mindestens 1-2 Vorlagen auch in EN/NL
- Neue Felder auf `email_templates`: `is_system BOOLEAN DEFAULT false`, `category TEXT`, `language TEXT` (default 'de'), evtl. `layout JSONB` fuer spaetere Block-Struktur (V5.3: ungenutzt, vorbereitet).
- Systemvorlagen sind read-only fuer den User (kein Edit-/Delete-Button), koennen aber als Basis fuer eine eigene Kopie dienen ("Als Vorlage duplizieren").
- "+ Neue Vorlage" Modal/Dialog im Composing-Studio:
  - Modus 1 — manuell: Title, Subject, Body, Sprache.
  - Modus 2 — KI-Diktat: Voice-/Text-Prompt ("erstelle mir eine Re-Aktivierungs-Mail fuer einen Lead, der seit 3 Monaten kalt ist"). KI generiert Subject + Body in der gewaehlten Sprache. User editiert vor Speichern.
- KI-Vorlagen-Generator: neuer Prompt `email-template-generate.ts` analog `email-improve.ts`. System-Prompt erzeugt JSON `{title, subject, body, suggestedCategory}`.
- "Als Vorlage duplizieren" auf Systemvorlagen erstellt eine eigene Kopie (`is_system=false`, mit gleichem Inhalt + Suffix " (Kopie)").

**Acceptance Criteria:**
- AC1: Mindestens 6 Systemvorlagen sind nach Migration in der DB vorhanden.
- AC2: Systemvorlagen sind in der linken Spalte mit "System"-Badge sichtbar und nicht editier-/loeschbar.
- AC3: "Neue Vorlage" mit manueller Eingabe erstellt eine Vorlage mit `is_system=false`.
- AC4: "Neue Vorlage" mit KI-Diktat erzeugt Subject + Body via Bedrock und zeigt Editier-Vorschau.
- AC5: KI-generierte Vorlage kann vor Speichern editiert werden.
- AC6: "Als Vorlage duplizieren" auf einer Systemvorlage erstellt eine eigene editierbare Kopie.
- AC7: Filter "System" / "Eigene" / "Alle" funktioniert in der Vorlagen-Liste.

#### FEAT-534 — Inline-Edit-Diktat ("ergaenze nach Satz X")

**Zweck:** Zusaetzlich zum bestehenden Voice-Anhaengen erlaubt der User per Voice-Befehl gezielte Modifikationen am Body — ohne den Cursor manuell zu positionieren.

**Scope:**
- Neuer Voice-Modus im Composing-Studio: "Inline-Edit-Diktat".
- Workflow: User klickt Mikro, spricht z.B. "nach dem dritten Satz folgendes einbauen: wir haben gerade ein neues Whitepaper veroeffentlicht, das fuer Sie relevant sein koennte". Whisper transkribiert. Bedrock-LLM bekommt Original-Body + Transkript + System-Prompt mit klaren Regeln.
- KI-Prompt `email-inline-edit.ts`: System-Prompt akzeptiert nur strukturierte Modifikation, gibt JSON `{newBody, summary}` zurueck. Verbotene Aktionen: Inhaltliche Erfindung, Sprachwechsel, Faktenmanipulation.
- Vorschau-Modal vor dem Uebernehmen: zeigt Diff (alter vs. neuer Body), User akzeptiert oder verwirft.
- Gilt nur im Composing-Studio (nicht im Mini-`EmailCompose`-Sheet).

**Acceptance Criteria:**
- AC1: Inline-Edit-Diktat-Button ist sichtbar im Composing-Studio neben dem normalen Voice-Button.
- AC2: Aufnahme + Transkription verwendet bestehenden Whisper-Adapter (kein neuer Provider).
- AC3: KI-Prompt liefert valides JSON mit `newBody` und `summary`.
- AC4: Vorschau-Modal zeigt Diff vor Uebernahme.
- AC5: Akzeptieren ersetzt den Body, Verwerfen aendert nichts.
- AC6: KI darf keine erfundenen Fakten einfuegen — System-Prompt regelt das, Smoke-Test verifiziert es an min. 3 Beispielen.
- AC7: Bei Fehler/leerer Transkription erscheint klarer Hinweis statt stiller Anwendung.

### V5.3 Architekturleitplanken

1. **Versand-Layer bleibt unveraendert.** `send.ts`, Tracking-Injection, IMAP-Auto-Zuordnung, Cadence-Engine — alles unangetastet. V5.3 ist UI-/Compose-Layer.
2. **Renderer ist die einzige Quelle der Wahrheit fuer HTML-Output.** Live-Preview und tatsaechliches Versenden rufen denselben `renderBrandedHtml`. Kein Drift moeglich.
3. **Adapter-Pattern fuer KI bleibt.** Neue Prompts (`email-template-generate.ts`, `email-inline-edit.ts`) folgen dem bestehenden Schema in `cockpit/src/lib/ai/prompts/`. Kein neuer LLM-Provider.
4. **Schema-Aenderungen minimal-invasiv.** `email_templates` bekommt `is_system`, `category`, `language`, `layout` (alle nullable/defaultwertig). `branding_settings` per Architecture-Entscheidung.
5. **Backwards Compatibility.** Bestehende Vorlagen (alle `is_system=false`, `category=null`) funktionieren weiter. Mails ohne Branding gehen weiter raus wie heute.
6. **Mobile-First-Tabs als Fallback.** Das 3-Panel-Layout bleibt funktional auf Tablet/Mobile via Tabs.
7. **KI-Diktat fuer Vorlagen folgt Cost-Discipline (DEC-052 Bedrock Cost Control).** On-click, nicht auto-load. Klare Loading-States.

### V5.3 In Scope

- Branding-Settings-Page + zentrale Render-Engine
- 3-Panel-Composing-Studio als Vollbild-Seite
- Mindestens 6 Systemvorlagen (DE) + 1-2 EN/NL
- KI-Vorlagen-Generator per Voice/Text
- Inline-Edit-Diktat mit Diff-Preview
- KI-Vorschlag An/Betreff aus Deal-Kontext
- Schema-Erweiterung `email_templates` (is_system, category, language, layout)
- Schema fuer `branding_settings` (Tabelle oder system_settings-Erweiterung)
- Umleitung der bestehenden "E-Mail schreiben"-Buttons aus Deal-Workspace, Mein Tag, Focus auf neue Seite

### V5.3 Out of Scope

- Block-basierte Mail-Builder (Drag-and-Drop-Bloecke wie Mailchimp) — `layout`-Feld vorbereitet, V5.3 nutzt einfachen Body
- A/B-Testing von Vorlagen-Varianten
- Empfaenger-Multi-Select / BCC-Listen / Massenversand-UI (Cadences uebernimmt Massenversand)
- Anhaenge-Upload-UI (heute auch nicht vorhanden, kein V5.3-Topic)
- HTML-WYSIWYG-Editor (Markdown + Variablen reicht — Branding kommt vom Renderer)
- Separater Branding-Account-Wechsler (Multi-Branding, multi-User-Branding) — V7-Topic
- Auto-Anhaengen des Compliance-Footers aus FEAT-523 (User-Sache, User entscheidet)
- Tracking-Settings-Toggle pro Mail in der UI (heute Default, kein V5.3-Topic)
- Outbox-/Draft-Auto-Save in der neuen Seite (Drafts werden bei "Senden ohne SMTP" erstellt — ausreichend)
- Rechtschreibkorrektur in Echtzeit (KI-Improve-Button bleibt der Weg)

### V5.3 Constraints

- **Bestehende Mail-Sheet (`email-sheet.tsx`) darf weiterhin funktionieren.** V5.3 ergaenzt die Vollbild-Seite, ersetzt nicht abrupt — falls eine Embed-Form irgendwo sinnvoll ist, bleibt sie nutzbar.
- **Tracking-Pipeline darf nicht brechen.** `send.ts` muss weiterhin die `emails`-Tabelle wie heute fuellen (status=sent, tracking_id, etc.).
- **Variablen-Ersetzung kompatibel zur bestehenden Logik.** Gleicher Token-Satz `{{vorname}}`, `{{nachname}}`, `{{firma}}`, `{{position}}`, `{{deal}}` — keine Breaking-Tokens.
- **Bedrock Cost Control (DEC-052).** KI-Composing/Diktat ist on-click, nicht auto-load.
- **Datenresidenz (data-residency.md).** Bedrock Frankfurt fuer alle KI-Calls. Kein OpenAI direct.
- **Voice nutzt bestehenden Whisper-Adapter** — kein neuer Provider, kein neuer Auth-Pfad.

### V5.3 Risks & Assumptions

- **Risk:** HTML-E-Mail-Clients haben sehr unterschiedliche CSS-Render-Faehigkeiten. `renderBrandedHtml` muss Inline-Styles und Table-Layouts bevorzugen, nicht Flex/Grid.
  Mitigation: konservative HTML-Email-Best-Practices, Snapshot-Tests, Smoke-Test mit Gmail/Outlook.com/Apple Mail.
- **Risk:** KI-generierte Vorlagen produzieren generische, austauschbare Texte ohne Personalisierung.
  Mitigation: System-Prompt verlangt Branchen-/Beziehungstyp-Hinweis im User-Input. Beispiele in der Doku.
- **Risk:** Inline-Edit-Diktat aendert mehr als gewollt, weil das LLM "korrigiert" was nicht zu korrigieren war.
  Mitigation: System-Prompt explizit "minimale Modifikation, sonst Body unveraendert lassen", Diff-Vorschau zwingend.
- **Risk:** Logo-Upload/Storage ist ohne klare Storage-Strategie heikel.
  Mitigation: bei /architecture entscheiden (Supabase Storage Bucket oder Data-URI fuer kleine Logos <50KB).
- **Risk:** Live-Preview-Debounce ist zu langsam → User wartet, oder zu schnell → Tipp-Lag.
  Mitigation: 200-300ms Debounce, in QA validieren.
- **Assumption:** Der User pflegt Branding einmal, danach bleibt es stabil. Multi-Branding ist nicht V5.3.
- **Assumption:** Systemvorlagen im DE-Markt reichen aus. Internationale Anpassung in V5.3 nur fuer 1-2 Vorlagen, Rest folgt bei Bedarf.
- **Assumption:** Bestehende `email_templates`-Eintraege werden bei Migration auf `is_system=false`, `category=null`, `language='de'` (default) korrekt initialisiert.

### V5.3 Success Criteria

V5.3 ist erfolgreich wenn:
1. Eine Mail aus dem Deal-Workspace heraus geht in unter 60 Sekunden raus (Empfaenger + Betreff vorausgefuellt, Vorlage angewandt, ggf. Diktat-Korrektur, Senden).
2. Die versendete Mail enthaelt Logo, Markenfarbe und konsistente Schrift — sichtbar in Gmail, Outlook und Apple Mail.
3. Live-Preview ist bit-identisch zur tatsaechlich verschickten HTML-Mail.
4. Mindestens 6 Systemvorlagen sind out-of-the-box verfuegbar.
5. Eine neue Vorlage per KI-Diktat (Voice oder Text-Prompt) ist in unter 60 Sekunden erstellt.
6. Inline-Edit-Diktat aendert nur den geforderten Teil und zeigt Diff vor Uebernahme.
7. Bestehende `EmailCompose`-Pfade funktionieren unveraendert weiter (kein Regression-Bruch beim Versand).
8. Tracking, IMAP-Auto-Zuordnung und Cadence-Versand bleiben unbeeintraechtigt.

### V5.3 Open Questions (fuer /architecture)

- **Branding-Storage:** Eigene Tabelle `branding_settings` (single row) oder Erweiterung von `system_settings` (key-value-Pattern)? Empfehlung: eigene Tabelle, weil mehrere typisierte Felder (URL, Hex, JSON-Footer) — sauberer als JSON-blob in `system_settings`.
- **Logo-Storage:** Supabase Storage Bucket `branding/` oder Data-URI in DB (Limit <50KB)? Empfehlung: Storage Bucket, kleinere Bytes in DB, Public-URL stabil.
- **`layout`-Feld auf `email_templates`:** Schon V5.3 mit JSON-Schema versehen (auch wenn V5.3 es noch nicht nutzt) oder leer lassen? Empfehlung: nullable JSONB ohne Schema — "future-proof" ohne Festlegung.
- **Systemvorlagen-Seed:** SQL-Migration mit INSERT-Statements oder TS-Seed-Funktion bei App-Start? Empfehlung: SQL-Migration, eine Quelle der Wahrheit, Cockpit-Tracking via MIGRATIONS.md.
- **Empfaenger-KI-Vorschlag:** "Letzter schreibender Kontakt aus Deal" reicht, oder soll die KI mehrere Kontakte ranken? Empfehlung: einfach starten — letzter schreibender Kontakt, Fallback auf Primary-Contact.
- **Mobile-Routing:** Soll `/emails/compose` auf Mobile zur Tabs-Variante werden, oder wird der bestehende `email-sheet.tsx` als Mobile-Default beibehalten? Empfehlung: Tabs in der neuen Seite — kein Sheet-Routing-Split.
- **Inline-Edit-Diktat-Konfidenz:** Soll die KI bei Mehrdeutigkeit ("nach Satz 3" — welcher Satz ist Satz 3?) explizit nachfragen oder pragmatisch raten? Empfehlung: pragmatisch raten, Diff-Vorschau ist der Sicherheits-Net.
- **Slice-Schnitt:** Strikt 4 Slices (1 pro Feature) oder 5-6 Slices (zerlegen FEAT-532)? Empfehlung: 5 Slices, FEAT-532 (Composing-Studio) wird in "Layout + KI-Vorausfuellung" und "Live-Preview + Send-Integration" geteilt — beides nicht-trivial.

## V5.4 — Composing-Studio Polish + E-Mail-Anhaenge

### V5.4 Problem Statement

V5.3 hat das E-Mail Composing Studio live gebracht und produktiv etabliert. Zwei Themen sind dabei sichtbar geworden, die V5.4 sauber abschliesst:

1. **Composing-Studio-Polish:** Im V5.3-Final-Check ist ISSUE-043 (Color-Picker AC9-Drift) aufgefallen — das HTML-Color-Input submitted immer einen gueltigen Hex-Wert, auch wenn der User nie bewusst eine Markenfarbe gewaehlt hat. Sobald der User auf `/settings/branding` einmal "Speichern" klickt, kickt der Branding-Renderer ein, und die explizit dokumentierte AC9-Garantie ("Mail ohne Branding ist bit-fuer-bit identisch zu V5.2") gilt nur noch im Initial-State. Dazu kommen ESLint-Strict-Mode-Hinweise zur React-19-Hook-Order in zwei Dialogen, ein ueberfaelliges COMPLIANCE.md-Update fuer V5.3-Features und ein Coolify-Cron-Cleanup-Job, der seit V5.2-Post-Launch im Backlog liegt (BL-396).
2. **E-Mail-Anhaenge fehlen.** Der Composing-Studio-Workflow ist ohne Anhang-Funktion nicht vollstaendig fuer den realen Vertriebs-Alltag. Der User muss heute — wenn er ein PDF, ein Bilder-Paket oder eine Praesentation an einen Lead schicken will — den Mail-Versand komplett ausserhalb des Systems durchfuehren (Outlook/Gmail-Web). Damit faellt fuer diese Mails das gesamte Tracking, IMAP-Auto-Zuordnung und Deal-Activity-Logging weg. Das ist ein konkreter Daten-Verlust gegenueber der Vision "alle Mails laufen ueber das System".

V5.4 erledigt damit zwei eng verwandte Themen: V5.3-Hygiene + die Anhang-Faehigkeit als naechster konsequenter Schritt im Composing-Studio. Das System-zentrale "Angebote als System-Anhang" (BL-404 Teil 2) bleibt ausserhalb V5.4 und wartet auf BL-405 Angebot-Erstellung.

### V5.4 Goal

V5.3 ist sauber poliert (kein latenter Drift, keine Lint-Warnings, COMPLIANCE.md auf V5.3-Stand, Coolify aufgeraeumt) **und** der User kann aus dem Composing-Studio heraus Dateien von seinem PC per Drag&Drop oder File-Picker an seine ausgehenden Mails dranhaengen — mit MIME/Size-Whitelist, persistenter Storage-Spur und unbeeintraechtigtem Tracking.

### V5.4 Primary User

Eigentuemer im Tagesgeschaeft — schickt eine Mail mit PDF (Praesentation, Whitepaper, Vertrag, Bilder) aus dem Deal-Workspace heraus, will dass der Anhang im Live-Preview sichtbar ist und beim Empfaenger sauber ankommt, und dass Tracking + Deal-Activity-Logging unveraendert weiterlaufen.

### V5.4 Vision — Die ideale Sequenz

1. User klickt im Deal-Workspace auf "E-Mail schreiben".
2. `/emails/compose?dealId=...` oeffnet sich — Empfaenger + Betreff vorausgefuellt (V5.3-Funktion).
3. User zieht ein PDF aus seinem File-Explorer in den Compose-Form-Anhang-Bereich (oder klickt File-Picker).
4. Anhang erscheint mit Icon + Filename + Groesse unter dem Body.
5. Live-Preview rechts zeigt nicht nur Branding + Body, sondern auch eine Anhang-Indikator-Zeile.
6. Klick auf "Senden" — Mail geht raus mit Multipart-Body inkl. Anhang, Tracking-Pixel weiterhin aktiv.
7. Anhang bleibt im Storage-Bucket (Auditspur) und ist mit der `emails`-Row verknuepft.

Setup-Sequenz fuer V5.4-Polish (transparenz fuer den User):
- ISSUE-043 — Toggle "Markenfarbe verwenden" erscheint vor jedem Color-Picker auf `/settings/branding`. User-erkennbar, dass Branding-Aktivierung explizit ist.
- Coolify-Cron-Cleanup wird beim V5.4-Deploy als 5-Minuten-User-Aktion mit klarer Klick-Anleitung erledigt.

### V5.4 Scope-Prinzip

V5.4 ist eine **Polish + Inkrement-Slice** — keine neuen Datenmodelle ausser einem Storage-Bucket + einer Junction-Table fuer Mail-Anhang-Verknuepfung. Versand-Layer bleibt rueckwaertskompatibel, KI-Layer unveraendert. Tracking + IMAP + Cadences bleiben bit-identisch funktionierend (Regression-Pflicht-Check in /qa).

### V5.4 Features (2 Features)

#### FEAT-541 — V5.4-Polish (Composing-Studio + Hygiene)

**Zweck:** Den V5.3-Composing-Studio-Stack auf "polished + hygienisch" heben — kein latenter UI-Drift, kein Lint-Noise, COMPLIANCE.md auf V5.3-Stand, Coolify-Crons sauber.

**Scope:**
- **Color-Picker AC9-Drift Fix (ISSUE-043):** Auf `/settings/branding` vor jedem Color-Picker (Primaerfarbe + Sekundaerfarbe) eine Toggle-Checkbox "Markenfarbe verwenden". Toggle aus → Color-Picker disabled, persistierter Wert NULL. Toggle an → Color-Picker aktiv, persistierter Wert = Hex. Initialer Toggle-State leitet sich aus DB-Wert ab (NULL = aus, Hex = an).
- **ESLint Hook-Order Hinweise:** React-19-Strict-Mode-Hinweise in `cockpit/src/components/email/new-template-dialog.tsx` und `cockpit/src/components/email/inline-edit-dialog.tsx` aufloesen. Hook-Reihenfolge so umstellen, dass alle Hooks am Komponent-Top-Level vor jedem `if`/`return` stehen.
- **COMPLIANCE.md V5.3-Update:** Sektion in `/docs/COMPLIANCE.md` ergaenzen, die Composing-Studio + Inline-Edit + Branding kurz beschreibt (welche personenbezogenen Daten an Bedrock gehen, welche Daten in Storage gespeichert werden, Retention-Verhalten von Branding-Settings).
- **Coolify Cron-Cleanup (BL-396):** User-Aktion via Klick-Anleitung in `/docs/RELEASES.md`-Notes von REL-019. Anleitung beschreibt: (a) Duplikat-Crons konsolidieren (`Classify` vs `classify-emails`, `embedding-sync` x2, `retention` vs `recording-retention`), (b) Cron mit literalem Placeholder `CRON_SECRET_VALUE` reparieren oder loeschen, (c) Klartext-CRON_SECRETs auf `process.env.CRON_SECRET`-Pattern umstellen.

**Acceptance Criteria:**
- AC1: Auf `/settings/branding` ist vor jedem Color-Picker ein Toggle "Markenfarbe verwenden" sichtbar.
- AC2: Toggle aus → Color-Picker visuell disabled, beim Speichern wird `primary_color`/`secondary_color` als NULL persistiert.
- AC3: Toggle an → Color-Picker aktiv, beim Speichern wird der gewaehlte Hex-Wert persistiert.
- AC4: Initial-Render leitet Toggle-State korrekt aus DB-Wert ab (NULL = aus, Hex = an).
- AC5: Bestehende Branding-Eintraege ohne explizites Speichern bleiben unveraendert (kein automatisches NULL-Setzen bei Migration).
- AC6: AC9 aus FEAT-531 ist wieder zuverlaessig erfuellt: Mail ohne aktivierte Branding-Farben geht bit-fuer-bit wie V5.2 raus, unabhaengig davon ob der User die Settings-Page besucht hat.
- AC7: ESLint-Build-Output zeigt keine React-Hook-Order-Warnings mehr in den 2 Ziel-Dateien (`npm run lint` clean, oder die zwei Hinweise sind nachweislich verschwunden).
- AC8: `docs/COMPLIANCE.md` enthaelt einen V5.3-Abschnitt mit den 3 Features (Branding, Composing-Studio, Inline-Edit) und nennt die jeweiligen Datenfluesse.
- AC9: REL-019-Eintrag in `/docs/RELEASES.md` enthaelt die Coolify-Cron-Cleanup-User-Anleitung als Sektion.

#### FEAT-542 — E-Mail-Anhaenge-Upload (PC-Direkt)

**Zweck:** User kann im Composing-Studio Dateien von seinem PC per Drag&Drop oder File-Picker an seine ausgehende Mail anhaengen. Anhang wird in einem dedizierten Storage-Bucket persistiert, mit der `emails`-Row verknuepft, und beim SMTP-Versand als Multipart-Anhang mitgesendet.

**Scope:**
- **Storage-Bucket `email-attachments`:** Neuer privater Bucket auf Self-Hosted Supabase (analog Branding-Bucket-Pattern aus DEC-085). Public-Read = nein. service_role-Access only fuer Insert/Read; SELECT-Policy fuer authenticated mit Path-Owner-Check.
- **Junction-Table `email_attachments`:** Neue Tabelle mit Spalten `id` (UUID), `email_id` (FK zu `emails`), `storage_path` (TEXT), `filename` (TEXT), `mime_type` (TEXT), `size_bytes` (BIGINT), `created_at` (TIMESTAMPTZ). N:1-Beziehung zu `emails`.
- **MIG-025:** Bucket-Anlage + Policies + Junction-Table + Index auf `email_id`.
- **Compose-Form-UI:** Anhang-Bereich unterhalb der Body-Textarea. Drag&Drop-Zone + File-Picker-Button "Datei anhaengen". Liste der ausgewaehlten Anhaenge mit Icon (basierend auf MIME), Filename, Groesse und Loeschen-Button. Mehrere Anhaenge moeglich.
- **MIME-Whitelist (App-Level-Validierung):** Erlaubt: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, GIF, TXT, CSV, ZIP. Verboten: EXE, BAT, SH, JS, andere Scripting-Formate. Validierung im Browser (UX) und im Server-Action (Sicherheit).
- **Size-Limits:** 10 MB pro File, 25 MB Total pro Mail. Validierung wieder Client + Server.
- **Upload-Flow:** Bei File-Auswahl → Upload via Server Action zu `email-attachments`-Bucket unter Path `{user_id}/{compose_session_id}/{filename}`. Bei Loeschen → Storage-File entfernen. Compose-Session-ID wird beim Oeffnen des Composing-Studios vergeben.
- **`send.ts`-Erweiterung:** `sendEmailWithTracking` bekommt optionalen `attachments`-Parameter (Default: leeres Array). Bei Send: Storage-Files herunterladen, an Nodemailer als `attachments`-Array uebergeben, Multipart-Mail erzeugen. Nach erfolgreichem Versand: `email_attachments`-Junction-Rows persistieren mit FK zu `emails.id`.
- **Lifecycle:** File bleibt nach Versand im Storage-Bucket (Auditspur, Re-Send moeglich). Cron-Cleanup ist nicht V5.4 — nur dann vorgesehen wenn Storage-Volumen problematisch wird.
- **Live-Preview-Indikator:** Im rechten Panel unterhalb der Body-Preview eine Sektion "Anhaenge" mit Icon + Filename + Size-Liste. Kein Inhalts-Render der Anhaenge — nur Indikator wie der Empfaenger es sieht.
- **Tracking + Cadence-Regression-Pflicht:** Smoke-Test mit Anhang-Mail an Gmail muss Tracking-Pixel-Event ausloesen. Cadence-Engine ist nicht im V5.4-Scope (Cadences haben keine Anhang-UI), aber bestehender Cadence-Code-Pfad darf nicht brechen.

**Acceptance Criteria:**
- AC1: Im Composing-Studio ist unterhalb der Body-Textarea ein Anhang-Bereich mit Drag&Drop-Zone und File-Picker-Button sichtbar.
- AC2: Drag&Drop einer Datei oder Klick auf File-Picker fuegt die Datei zur Anhang-Liste hinzu.
- AC3: Anhang-Liste zeigt pro File: Icon (MIME-basiert), Filename, Size, Loeschen-Button.
- AC4: MIME-Whitelist greift auf Browser-Ebene (verbotene Files koennen gar nicht erst hinzugefuegt werden) UND auf Server-Ebene (Server-Action lehnt ab mit klarer Fehlermeldung).
- AC5: Size-Limit 10 MB pro File und 25 MB Total wird Browser- und Server-seitig validiert.
- AC6: Loeschen eines Anhangs entfernt die Storage-Datei und nimmt sie aus der Anhang-Liste raus.
- AC7: Live-Preview rechts zeigt eine Anhang-Indikator-Sektion mit Icon + Filename + Size pro Anhang.
- AC8: "Senden" produziert eine Mail mit Multipart-Body, die in Gmail/Outlook mit den Anhaengen ankommt.
- AC9: Nach Versand existieren `email_attachments`-Junction-Rows mit FK zu `emails.id`. Storage-Files bleiben im Bucket.
- AC10: Tracking-Pixel-Event feuert bei Anhang-Mail mit Tracking-Pixel (Smoke-Test mit Gmail).
- AC11: `sendEmailWithTracking` ohne `attachments`-Parameter (Default leer) verhaelt sich bit-identisch zu V5.3 (Backwards Compatibility — Cadence-Engine + bestehende Send-Pfade unbeeintraechtigt).
- AC12: ZIP-Dateien werden akzeptiert ohne Inhalt-Inspection.

### V5.4 Architekturleitplanken

1. **Versand-Layer-Erweiterung minimal-invasiv.** `sendEmailWithTracking` bekommt einen optionalen `attachments`-Parameter, alles bestehende bleibt funktional gleich. Cadence-Engine ruft `sendEmailWithTracking` ohne `attachments` auf — bit-identisches V5.3-Verhalten.
2. **Storage-Bucket-Pattern wiederverwendet.** Eigener Bucket `email-attachments` analog Branding-Bucket aus DEC-085 — saubere Trennung von der Document-Library, eigene Policies, eigener Lifecycle.
3. **Junction-Table statt JSON-Spalte.** `email_attachments` als eigene Tabelle mit FK zu `emails` — saubere Aggregat-Queries, einfaches Cleanup, klares Schema.
4. **MIME-Whitelist auf zwei Ebenen.** Browser-Validierung fuer UX (verbotene Files gar nicht ladbar), Server-Validierung als Sicherheits-Net. Whitelist ist Source-of-Truth in einer einzigen Konstante in `cockpit/src/lib/email/attachments-whitelist.ts`.
5. **ZIP-Inhalte nicht inspecten.** Pragmatisches B2B-Defaultverhalten — User kennt die Pakete, die er versendet. Empfaenger-Spam-Filter ist die zweite Verteidigungslinie.
6. **Lifecycle: keep-on-storage.** Anhaenge bleiben nach Versand im Bucket (Auditspur). Cleanup-Cron erst wenn Volumen-Druck entsteht.
7. **Color-Picker-Toggle-Pattern wiederverwendbar.** Toggle-Komponente "ConditionalColorPicker" wird so gebaut, dass sie auch in zukuenftigen Branding-Erweiterungen (z.B. Hover-Color, Background) eingesetzt werden kann.

### V5.4 In Scope

- Color-Picker-Toggle "Markenfarbe verwenden" auf `/settings/branding`
- ESLint Hook-Order-Cleanup in 2 Compose-Dialogen
- COMPLIANCE.md V5.3-Section
- Coolify Cron-Cleanup als User-Aktion mit Doku-Anleitung
- Storage-Bucket `email-attachments` (privat, MIG-025)
- Junction-Table `email_attachments` (MIG-025)
- Compose-Form Drag&Drop + File-Picker + Anhang-Liste-UI
- MIME-Whitelist + Size-Limits Browser- und Server-Validierung
- `send.ts` Multipart-Anhang-Support via Nodemailer
- Live-Preview Anhang-Indikator
- Tracking-Regression-Smoke-Test mit Anhang
- ZIP akzeptiert ohne Inhalt-Inspection

### V5.4 Out of Scope

- Anhang-Auswahl aus dem System (Angebot anhaengen) — wartet auf BL-405 Angebot-Erstellung
- Anhang-Auswahl aus der bestehenden Document-Library (`documents`-Bucket) — keine V5.4-Anforderung
- Inhalt-Inspection von ZIP-Dateien (Server-side Unzip + MIME-Check pro File)
- Cron-Cleanup fuer Storage-Volume in `email-attachments`-Bucket (zukuenftiger Slice wenn Volumen problematisch)
- Anhang-Re-Send aus Audit-Spur (technisch moeglich, aber keine UI in V5.4)
- Drag&Drop-Reorder der Anhaenge (keine Vertriebs-Anforderung)
- Inline-Bilder im Body (Cid-References) — V5.4 nur Anhaenge
- Anhang-Versand in Cadences/Sequences (keine Cadence-UI fuer Anhaenge in V5.4)
- Outlook-Smoke aus SLC-531 (User hat aktuell kein Outlook-Postfach zum Testen)
- Inbound-Anhaenge (Download von Anhaengen aus eingehenden IMAP-Mails) — anderes Thema, FEAT-405 IMAP-Integration
- Polish-Outsourcing der bestehenden V5.3-UI an einen UI-Polish-Agenten (BL-403 ist bereits done)

### V5.4 Constraints

- **Bestehender V5.3-Send-Pfad darf nicht brechen.** `sendEmailWithTracking` ohne `attachments`-Parameter muss bit-identisch zu V5.3 funktionieren — Cadence-Engine, Auto-Reply-Send, alle existierenden Send-Pfade.
- **Tracking-Pipeline darf nicht brechen.** Tracking-Pixel-Injection passiert wie heute in `sendEmailWithTracking` — Anhaenge sind Multipart-Beilage, nicht Body-Modifikation.
- **MIME-Whitelist Source-of-Truth zentral.** Eine einzige Konstante, die Browser und Server beide nutzen — kein Drift moeglich.
- **Color-Picker-Toggle: kein Datenverlust.** Bestehende Branding-Eintraege werden NICHT automatisch auf NULL gesetzt — nur explizites User-"Speichern" mit Toggle-Aus persistiert NULL.
- **Storage-Limits:** Self-Hosted Supabase ist auf Hetzner — Bucket-Volume-Druck ist real (Cleanup-Cron-Slice steht an, sobald >5 GB email-attachments-Bucket).
- **Bedrock Cost Control (DEC-052).** Keine KI-Calls in V5.4 — der Polish und Anhang-Upload involvieren keine LLM.
- **Datenresidenz (data-residency.md).** Kein Theme — keine externen API-Calls in V5.4.

### V5.4 Risks & Assumptions

- **Risk:** Multipart-Mails mit Anhaengen werden von Empfaenger-Spam-Filtern strenger bewertet, Tracking-Pixel-Events fallen aus.
  Mitigation: Smoke-Test mit Gmail/Outlook, ggf. Tracking-Header-Anpassung dokumentieren.
- **Risk:** ZIP-Anhaenge mit Schadcode-Inhalt werden vom System unbemerkt rausgesendet.
  Mitigation: User selbst legt Files aus, kein Forwarding-Use-Case. Empfaenger-Mailserver-Filter ist zweite Linie. Akzeptiertes B2B-Restrisiko (siehe Architekturleitplanke 5).
- **Risk:** Storage-Volumen waechst unkontrolliert, weil keine V5.4-Cleanup-Cron existiert.
  Mitigation: Monitoring-Punkt — bei >5 GB Bucket-Volumen Cleanup-Cron als naechster Mini-Slice.
- **Risk:** Color-Picker-Toggle-Migration: User mit existierender Branding-Color, der V5.4 deployt, sieht Toggle als "an" mit Wert. Erwartung-Drift moeglich.
  Mitigation: Keine Datenmigration — Toggle leitet sich vom DB-Wert ab. User-Mental-Model: "wenn Wert da ist, ist es aktiv". Ist konsistent.
- **Risk:** Coolify-Cron-Cleanup-User-Anleitung ist unvollstaendig oder verwirrend, User produziert Cron-Lucke.
  Mitigation: Klick-fuer-Klick-Anleitung mit konkreten Cron-Namen und was zu loeschen/aendern ist. Pre-Deploy-Snapshot empfohlen.
- **Risk:** ESLint-Cleanup deckt latente Hook-Order-Bugs auf, die unter Strict-Mode anders rendern.
  Mitigation: Visuelle Smoke-Tests der zwei Dialoge nach Cleanup. Keine Funktional-Aenderung erwartet.
- **Assumption:** Self-Hosted Supabase-Storage haelt 10 MB-Files problemlos (existing Branding-Bucket macht 1-2 MB Logos, getestet).
- **Assumption:** Nodemailer's `attachments`-Array funktioniert mit Storage-Bucket-Streams oder Buffer-Buffer-Konversion.
- **Assumption:** SMTP-Server (aktueller Outbound-Provider) erlaubt 25 MB-Mails (Standard ist 25 MB Default; falls strenger, Size-Limit anpassen).

### V5.4 Success Criteria

V5.4 ist erfolgreich wenn:
1. ISSUE-043 ist resolved — auf `/settings/branding` ist Toggle "Markenfarbe verwenden" sichtbar und funktioniert. AC9 aus FEAT-531 ist wieder zuverlaessig erfuellt.
2. ESLint-Build ist clean fuer die zwei Compose-Dialoge — keine React-Hook-Order-Warnings mehr.
3. `docs/COMPLIANCE.md` hat einen V5.3-Section mit Composing-Studio + Inline-Edit + Branding.
4. Coolify-Cron-Cleanup ist abgeschlossen (User-Aktion via Doku) — keine Cron-Duplikate, kein kaputter `embedding-sync`.
5. User kann im Composing-Studio per Drag&Drop oder File-Picker Anhaenge hinzufuegen.
6. Anhang-Mail kommt in Gmail an mit korrekt geoffnetem PDF/PNG/etc.
7. Live-Preview zeigt Anhang-Indikator mit Icon + Filename + Size.
8. Tracking-Pixel-Event feuert auch bei Anhang-Mail.
9. Bestehender V5.3-Send-Pfad (Cadences, Auto-Reply, Mein-Tag-Compose) ist regression-frei.
10. ZIP-Anhang ist akzeptiert ohne Inhalt-Inspection.

### V5.4 Open Questions (fuer /architecture)

- **Junction-Table-Schema:** `email_attachments`-Spalten ausreichend, oder noch `is_inline BOOLEAN` (fuer spaetere Cid-Referenzen) vorbereiten? Empfehlung: nur die V5.4-noetigen Spalten — keine Future-Proof-Spekulation.
- **Storage-Path-Struktur:** `{user_id}/{compose_session_id}/{filename}` oder `{user_id}/{email_id}/{filename}`? Problem: `email_id` existiert erst NACH Send, beim Upload aber noch nicht. Empfehlung: `compose_session_id` fuer Pre-Send, beim Send-Action Move zu `email_id`-Folder, oder einfach behalten und in Junction-Table mappen. Bei /architecture entscheiden.
- **Compose-Session-ID-Lebensdauer:** UUID beim Oeffnen des Composing-Studios, gilt bis Send oder Page-Reload. Wenn User `/emails/compose` schliesst ohne zu senden, bleiben "verwaiste" Anhaenge im Storage. Cleanup-Strategie: Cron-Cleanup spaeter, oder Session-Timeout-basierter Cleanup beim naechsten Compose-Open? Empfehlung: bei /architecture entscheiden — vorerst kein Cleanup, bewusster Tech-Debt mit dokumentiertem Folge-Slice.
- **Validation-Whitelist-Konstante-Sharing:** Browser und Server teilen sich die MIME-Liste — wo wohnt die Konstante? Empfehlung: `cockpit/src/lib/email/attachments-whitelist.ts` (kann in beiden Pfaden importiert werden, kein Server-only-Import).
- **Tracking-Pixel-Behavior bei Anhang:** Manche Mailclients ignorieren Tracking-Pixel im Multipart, oder zeigen sie als zusaetzlichen Anhang. Empfehlung: kein V5.4-Polish-Versuch — Smoke-Test verifizieren, dokumentieren wenn auffaellig.
- **Compose-Form-Integration:** Anhang-Bereich als eigene Komponente unter Body-Textarea oder als Tab im Compose-Form? Empfehlung: eigene Sektion direkt unter Body — flachere UX, weniger Klicks.
- **Polish-Slicing:** Color-Picker + ESLint + COMPLIANCE.md + Coolify alles in EINEN Polish-Slice (SLC-541), oder zwei Slices (Code-Polish vs. Doku-Polish)? Empfehlung: ein Slice — Bundle ist klein genug (~3-4h), klarer Release.

---

## V5.5 — Angebot-Erstellung

### V5.5 Purpose

V5.5 macht das Business System tatsaechlich angebotsfaehig. Bisher (V2..V5.4) ist die `proposals`-Tabelle ein reines Skeleton zur **Doku** eines Angebot-Status (Titel, Status, Win/Loss-Reason). Es gibt **kein** echtes "Angebot erstellen" — keine Position-Items, keine Brutto/Netto-Berechnung, keine PDF, keine Versionierung, keine Anbindung an die Produkt-Stammdaten aus V6.

V5.5 schliesst diese Luecke. Der User soll innerhalb des Business Systems aus seinen V6-Produkten ein Angebot zusammenstellen, mit Mengen/Preisen/Konditionen, ein PDF im V5.3-Branding rendern, und es als Anhang aus dem V5.4-Composing-Studio direkt versenden koennen (BL-404 Teil 2 wird hier eingeloest).

### V5.5 Problem Statement

- **Kein operativer Angebot-Workflow.** Heute existiert nur die "Angebots-Doku-Tabelle". User muss extern (Word, manuell-PDF) Angebote bauen und nur den Status im System pflegen.
- **Produkt-Stammdaten aus V6 sind isoliert.** Produkte stehen in `/settings/products`, sind ueber `deal_products` an Deals geheftet — aber nirgendwo als Position-Items in einem Angebot zusammengefuehrt.
- **Composing-Studio kann nichts aus dem System anhaengen.** V5.4 loest nur PC-Direkt-Upload. Der zweite Teil von BL-404 (Angebot aus dem System anhaengen) wartet auf V5.5.
- **Kein Versionierungs-Workflow fuer Verhandlungen.** Wenn ein Angebot zurueckkommt mit Aenderungswuenschen, existiert kein "Angebot V2" als Datenobjekt — nur Free-Text in `negotiation_notes`.

### V5.5 Goal / Intended Outcome

Nach V5.5:
1. Aus dem Deal-Workspace und dem Pipeline-View kann ein Angebot erstellt werden — neue Workspace-Route `/proposals/[id]/edit` (analog Composing-Studio).
2. Position-Items werden aus V6 `products` ausgewaehlt, mit Menge/Preis/Anpassung. Brutto/Netto/Steuer wird automatisch berechnet.
3. Standard-Konditionen (Zahlungsfrist, Gueltigkeitszeitraum) sind pro Angebot setzbar mit Defaults aus den Branding-/Settings-Werten.
4. PDF wird im V5.3-Branding (Logo, Markenfarbe, Footer) gerendert und in einem privaten Storage-Bucket abgelegt.
5. Status-Lifecycle `draft -> sent -> accepted/rejected/expired` ist im System abgebildet, einschliesslich `expires_at`-Cron fuer Auto-Expire.
6. Versionierung (V1, V2, V3 desselben Angebots fuers gleiche Deal) als eigene Datenobjekte mit Parent-Referenz.
7. BL-404 Teil 2 erfuellt: Im Composing-Studio oeffnet ein Picker die Angebote des aktuellen Deals und haengt das gewaehlte PDF als Multipart-Anhang an.

### V5.5 Primary Users

- Solo-Berater (User selbst) — Hauptnutzer, erstellt operativ Angebote in beratungsintensiven B2B-Verkaufszyklen.
- Internal-Test-Mode aktiv — kein externer Empfaenger-Use-Case in V5.5 (Compliance-Gate kommt nach V5.5).

### V5.5 Architekturleitplanken

1. **Wiederverwendung statt Neubau.** Mail-Render-Pattern aus FEAT-531 (Branding-Renderer) wird fuer PDF-Renderer-Pattern adaptiert. Storage-Bucket-Pattern aus FEAT-542 (privater Bucket + Junction-Table) wird analog fuer `proposal-pdfs` aufgesetzt. 3-Panel-UI aus FEAT-532 (Composing-Studio) ist Vorbild fuer Angebot-Workspace.
2. **Bestehende `proposals`-Tabelle erweitern, nicht ersetzen.** Schema-Erweiterung (neue Spalten) + neue Tabelle `proposal_items` (Position-Items). Bestehende Stub-Daten und die Liste-Ansicht bleiben funktionsfaehig.
3. **`deal_products` bleibt das Deal-Level-Stammdatenmodell.** `proposal_items` ist Snapshot-Modell (Preis/Menge zum Zeitpunkt der Angebotserstellung). Beide Tabellen koexistieren, kein Datenkonflikt.
4. **Internal-Test-Mode bleibt aktiv.** Keine externen Versand-Use-Cases in V5.5. PDF-Generierung ist lokal (Bedrock/KI nicht zwingend). Kein Bedrock-Call ohne expliziten User-Trigger (DEC-052).
5. **Datenresidenz (data-residency.md).** PDF-Generierung laeuft serverseitig in Next.js — keine externen API-Calls zu OCR/PDF-Services. Falls eine Library noetig: PDFKit oder pdfmake (Node-only, keine externen Calls).
6. **KI-Unterstuetzung optional, on-click (DEC-082).** Wenn LLM-Hilfe (z.B. "Generiere Begleittext zum Angebot"), dann nur per User-Klick analog FEAT-533 KI-Generator.

### V5.5 Features (5 Features)

#### FEAT-551 — Angebot-Schema-Erweiterung + Position-Items

**Was:** SQL-Migration MIG-026 erweitert `proposals` um angebotsoperative Spalten (Brutto/Netto/Steuersatz, Gueltigkeitszeitraum, Zahlungsfrist, parent_proposal_id fuer Versionierung, accepted_at/rejected_at/expired_at, pdf_storage_path) und legt neue Tabelle `proposal_items` an (Position-Items mit `proposal_id`, `product_id`, `quantity`, `unit_price_net`, `discount_pct`, `position_order`, snapshot_name, snapshot_description).

**Warum:** Ohne strukturierte Items kein Angebot. Heutige Felder `scope_notes`/`price_range` sind Free-Text-Doku, kein Berechnungsmodell.

**Architektur-Hooks:** Snapshot-Felder (snapshot_name/description) sind essenziell — Produkte koennen nach Angebotserstellung umbenannt werden, das gesendete Angebot muss aber unveraendert bleiben.

**Out-of-Scope:** Mehrwaehrungs-Support (nur EUR in V5.5), Multi-Tax-Rate per Position (eine Steuer pro Angebot), Discount-Stacking (nur Position-Discount in %).

#### FEAT-552 — Angebot-Workspace UI (3-Panel)

**Was:** Neue Route `/proposals/[id]/edit` mit 3-Panel-Layout analog Composing-Studio:
- Links: Position-Liste (Drag-and-Drop-Sortierung, Add-Product-Button oeffnet Picker aus V6 `products`)
- Mitte: Angebot-Editor (Titel, Kontakt/Firma, Konditionen, Steuersatz)
- Rechts: Live-PDF-Preview (rendert bei jeder Aenderung neu, debounced)

Zusaetzlich: Einstiegspunkte aus Deal-Workspace ("Angebot erstellen") und Pipeline-Card-Quickaction.

**Warum:** Operative Schreibumgebung — der User braucht eine Vollbild-Studio-Erfahrung, nicht ein Modal-Dialog.

**Out-of-Scope:** Mobile-Responsive (Desktop-only in V5.5), Collaborative-Editing (nur Single-User).

#### FEAT-553 — PDF-Renderer + Branding

**Was:** Server-side PDF-Renderer im V5.3-Branding (Logo aus `branding_settings`, Markenfarbe, Standard-Footer). Layout: Briefkopf, Empfaenger-Block, Angebot-Header, Position-Tabelle, Brutto/Netto/Steuer-Summary, Konditionen, Footer.

**Warum:** PDF ist das Lieferformat — der Empfaenger erhaelt keine HTML-E-Mail mit Angebot, sondern eine PDF-Anhang.

**Architektur-Hooks:** Library-Wahl (PDFKit vs. pdfmake vs. puppeteer mit HTML->PDF) ist `/architecture`-Entscheid. Empfehlung im PRD: pdfmake (deklarativ, Node-only, kein Headless-Browser).

**Out-of-Scope:** WYSIWYG-PDF-Editor (Layout ist fix templated), Custom-Templates pro Deal (eine Template-Variante in V5.5).

#### FEAT-554 — Status-Lifecycle + Versionierung

**Was:**
- Status-Uebergaenge `draft -> sent -> accepted | rejected | expired` mit Server-Action-Guards (kein direkter DB-Update vom Client).
- "Sent" wird durch Anhaengen im Composing-Studio (FEAT-555) **oder** manuelles "Als gesendet markieren" gesetzt.
- Versionierung: "Neue Version erstellen" dupliziert das Angebot mit `parent_proposal_id`, version=parent.version+1, status=draft.
- Cron `expire-proposals` setzt Status auf `expired` fuer `sent`-Angebote, deren `expires_at` durch ist.
- Audit-Trail in `audit_log`-Tabelle (V3 FEAT-307 Governance-Basis nutzt bereits diese Tabelle).

**Warum:** Status- und Versionsmanagement ist der operative Verhandlungs-Workflow — ohne ihn ist die Tabelle wieder nur Doku-Spielzeug.

**Out-of-Scope:** Auto-Stage-Wechsel im Deal bei Angebot-Acceptance (vorerst manueller Hop, V6.x-Kandidat), Notifications/E-Mail-Reminders bei Expire-Naehe.

#### FEAT-555 — Angebot-Anhang im Composing-Studio (BL-404 Teil 2)

**Was:** Im V5.4 Composing-Studio neuer "Angebot anhaengen"-Button neben dem PC-Direkt-Upload. Picker zeigt Angebote des aktuellen Deals (deal_id wird aus Compose-Kontext gezogen) mit Status `sent` oder `draft`. Auswahl haengt das PDF als Multipart-Anhang ueber die bestehende V5.4-Pipeline an.

**Warum:** BL-404 wurde in V5.4 nur halb geloest (Teil 1 PC-Upload). Teil 2 (System-Angebot) ist seit der Backlog-Anlage offen und der eigentliche Mehrwert: Angebot generieren + im selben Schritt versenden.

**Architektur-Hooks:** Wiederverwendung der V5.4 `email_attachments`-Junction-Table — Anhang-Eintrag verweist auf `proposal-pdfs`-Bucket-Pfad statt User-Upload-Pfad. Filename-Pattern: `Angebot-{deal-title}-V{version}.pdf`.

**Out-of-Scope:** Auto-Send-mit-Default-Begleittext (User schreibt Begleittext immer manuell), Mehrere Angebote in einer Mail (vorerst max ein Angebot-Anhang).

### V5.5 Scope — Zusammenfassung

**In Scope (V5.5):**
- 5 Features (FEAT-551..555)
- Schema-Erweiterung `proposals` + neue `proposal_items`-Tabelle (MIG-026)
- Storage-Bucket `proposal-pdfs` (privat)
- Angebot-Workspace `/proposals/[id]/edit` (3-Panel)
- PDF-Renderer (Library-Entscheid in `/architecture`)
- Status-Lifecycle inkl. Cron fuer Auto-Expire
- Versionierung (parent_proposal_id)
- BL-404 Teil 2 Hookup im Composing-Studio
- Internal-Test-Mode bleibt aktiv

**Out of Scope (V5.5):**
- Multi-Currency (nur EUR)
- Multi-Tax-Rate per Position (eine Steuer pro Angebot)
- Mobile-Layout (Desktop-only)
- Collaborative-Editing
- Auto-Stage-Wechsel im Deal bei Acceptance
- E-Mail-Notifications bei Expire-Naehe
- Custom-PDF-Templates pro Deal/Branche
- Empfaenger-seitige Online-Zustimmung (Click-to-Accept-Link)
- KI-generierter Angebotstext (kein Bedrock-Call in V5.5; KI-Hilfe ist V5.5+ Folge-Slice)
- Discount-Stacking (Position + Total)

**Not part of this project (V6+ / V7+):**
- Empfaenger-Portal mit Online-Akzeptanz
- E-Signatur-Integration
- Automatische Rechnungsgenerierung nach Acceptance
- Multi-User-Approvals (Angebot muss von Manager freigegeben werden)

### V5.5 Constraints

- **Bestehende `proposals`-Stub-Daten duerfen nicht brechen.** Alle V2-Felder bleiben, neue Spalten sind nullable mit Defaults.
- **V6 `products` ist Source-of-Truth.** Kein Inline-Erstellen neuer Produkte aus dem Angebot-Workspace (User legt Produkte vorab in `/settings/products` an).
- **Internal-Test-Mode.** PDF wird zwar generiert, aber V5.5 ist nicht produktionsfertig fuer externe Empfaenger — Compliance-Gate ist explizit nach V5.5 (V5.6 oder V6) terminiert.
- **Bedrock Cost Control (DEC-052).** Keine impliziten LLM-Calls in V5.5. KI-Hilfe ist on-click und in V5.5 explizit out-of-scope.
- **Datenresidenz (data-residency.md).** PDF-Generierung Server-seitig (Node), keine externen Cloud-PDF-Services.
- **Storage-Volumen-Druck.** PDF-Bucket bekommt mit V5.5 sein eigenes Cleanup-Beduerfnis. Cron-Cleanup-Slice wird in `/architecture` als Followup erwogen.

### V5.5 Risks & Assumptions

- **Risk:** PDF-Library generiert nicht-konsistente Layouts zwischen Browser-Preview und Server-PDF.
  Mitigation: Server-PDF ist die Wahrheit — Browser-Preview ist HTML-Approximation, klar als "Preview" markiert. `/architecture` entscheidet ob Server-Render auch fuer Preview (lang) oder HTML-Approximation (schnell) vorrang hat.
- **Risk:** Storage-Volumen-Wachstum durch verworfene Draft-PDFs.
  Mitigation: PDF wird erst bei "PDF generieren"-Klick (oder bei Send) geschrieben, nicht bei jedem Tasten-Druecken in der Preview. Cleanup-Cron-Strategie wird in `/architecture` mit-spezifiziert.
- **Risk:** Versionierung erzeugt Schema-Komplexitaet (parent_proposal_id, Tree-Strukturen).
  Mitigation: Strikt linear — Version N+1 referenziert Version N. Keine Branches. Tree-Visualisierung ist out-of-scope.
- **Risk:** Composing-Studio-Hookup (FEAT-555) bricht V5.4-PC-Upload-Pfad.
  Mitigation: Beide Pfade nutzen dieselbe `email_attachments`-Junction-Table mit unterschiedlichen Bucket-Pfaden. Regression-Smoke explizit in `/qa` SLC-555.
- **Risk:** PDF-Empfaenger sieht das PDF in Outlook/Gmail anders als in der Preview (Schriftart-Substitution).
  Mitigation: Standard-PDF-Schriften (Helvetica/Arial-Subset) — keine custom fonts in V5.5. Smoke-Test mit Gmail/Outlook explizit in `/qa`.
- **Risk:** Steuersatz-Aenderung mid-Verhandlung (Steuerreform o.ae.) — alte sent Angebote zeigen alten Satz.
  Mitigation: Steuersatz wird beim Sent-Snapshot fixiert. Akzeptiertes Risiko (User passt Versionsnummer an).
- **Assumption:** pdfmake (oder vergleichbar) ist in der Next.js-Coolify-Runtime ohne extra Image-Build betriebbar.
- **Assumption:** V5.4 `email_attachments`-Junction-Table ist erweiterbar um `source_type`-Diskriminator (`upload` vs. `proposal`) ohne Datenmigration.

### V5.5 Success Criteria

V5.5 ist erfolgreich wenn:
1. User kann aus dem Deal-Workspace heraus ein neues Angebot anlegen — Klick fuehrt direkt in den 3-Panel-Workspace.
2. Position-Items werden aus V6 `products` ausgewaehlt, Mengen/Preise/Discounts sind editierbar, Brutto/Netto/Steuer wird automatisch berechnet.
3. PDF wird mit V5.3-Branding gerendert und in `proposal-pdfs`-Bucket gespeichert.
4. Status-Uebergaenge sind im UI klickbar (`Sent markieren`, `Accepted`, `Rejected`) und in `audit_log` getrackt.
5. Versionierung: "Neue Version erstellen" dupliziert sauber inkl. Position-Items, parent_proposal_id ist gesetzt.
6. Cron `expire-proposals` laeuft taeglich und setzt ueberfaellige Angebote auf `expired`.
7. Im Composing-Studio kann ein Angebot des aktuellen Deals als Anhang gewaehlt werden, kommt als Multipart-PDF an.
8. Bestehende V5.4 PC-Direkt-Upload-Pipeline ist regression-frei.
9. V2 Stub-Proposals sind weiterhin sichtbar (keine Datenmigration noetig).
10. Internal-Test-Mode wird im PDF-Footer als Wasserzeichen sichtbar gemacht (Mitigation: kein versehentlicher Versand an externe Kunden).

### V5.5 Open Questions (fuer /architecture)

- **PDF-Library:** pdfmake vs. PDFKit vs. puppeteer (HTML->PDF) — welche passt am besten zum bestehenden Branding-Renderer-Pattern und zur Coolify-Container-Runtime? Empfehlung im PRD: pdfmake (deklarativ, Node-only). Endentscheid in `/architecture`.
- **Live-Preview-Strategie:** HTML-Approximation im Browser (schnell, evtl. visuell abweichend) oder Server-Render auf Knopfdruck (langsam, bit-genau)? Empfehlung: HTML-Approximation fuer Live, Server-PDF on-demand und beim Send.
- **`proposal_items`-Snapshot-Tiefe:** Reichen `snapshot_name` + `snapshot_description`, oder auch `snapshot_unit_price_at_creation` (fuer Audit "Was war Standardpreis als Angebot erstellt wurde")? Empfehlung: ja, snapshot_unit_price_at_creation mitnehmen.
- **Status-Sent-Trigger:** Wird `status=sent` automatisch durch FEAT-555-Send gesetzt, oder bleibt es manueller "Sent markieren"-Klick? Empfehlung: beides — automatisch beim Send, optional manueller Klick wenn ausserhalb des Composing-Studios versendet.
- **Versionierung-Lifecycle:** Wenn V2 erstellt wird, was passiert mit V1? Bleibt `sent`, geht auf `superseded`, wird automatisch `rejected`? Empfehlung: V1 bleibt im urspruenglichen Status — Audit-Wahrheit wichtiger als Aufraeumen.
- **Expire-Cron-Lauf-Zeit:** Taeglich um welche Uhrzeit? Empfehlung: 02:00 Berlin Time, analog anderer Daily-Crons.
- **Storage-Bucket-Pfad-Schema:** `{user_id}/{proposal_id}/v{version}.pdf`? Oder `{user_id}/{deal_id}/{proposal_id}.pdf`? Empfehlung: ersteres — Versionierung per Path.
- **Anhang-Picker-Filter:** Im Composing-Studio nur Angebote mit Status `sent`/`draft` zeigen? Was mit `accepted`/`rejected`/`expired`? Empfehlung: alle Status zeigen, aber `expired`/`rejected` warnen ("Achtung: dieses Angebot ist nicht mehr gueltig"). User-Entscheid.
- **Watermark "Internal-Test-Mode" im PDF:** Wie genau? Header-Text, Diagonal-Wasserzeichen, Footer-Hinweis? Empfehlung: Footer-Zeile "Internal-Test-Mode — nicht fuer externe Empfaenger" + Hauptdatei-Suffix `.testmode.pdf`. `/architecture` finalisiert.
- **Slicing-Schnitt:** 5 Features = 5 Slices direkt? Oder Schema (FEAT-551) als eigener Backend-Slice und Workspace-UI (FEAT-552) splitten? Empfehlung im PRD: 5 Slices SLC-551..555 1:1 zu Features. `/slice-planning` finalisiert.

## V5.6 — Zahlungsbedingungen + Pre-Call Briefing

### V5.6 Problem Statement

Zwei orthogonale User-Wuensche, die nach V5.5 explizit hochgekommen sind und gemeinsam in eine Patch-Range Sinn machen:

1. **Zahlungsbedingungen sind unterspezifiziert.** Aktuell ist `proposals.payment_terms` ein Freitext-Feld mit Branding-Default "30 Tage netto". User-Feedback nach SLC-552 Smoke (BL-412): es gibt typische Bedingungen (30 netto, 60 netto, Vorkasse, Skonto-Varianten) die wiederverwendbar sein sollten + komplexe Angebote brauchen Teilzahlungen ("50/50 nach Meilenstein", "30/30/40").

2. **Meeting-Vorbereitung ist manueller Aufwand.** Vor jedem Termin muss der User selbst Deal-Workspace aufmachen, letzte Aktivitaeten lesen, offene Signale durchgehen, Gespraechspunkte vorbereiten. Bei mehreren Terminen pro Tag wird das zur Reibung. Backlog BL-385: automatisches Briefing-Paket 30 Min vor jedem Meeting per Push/E-Mail.

### V5.6 Goal / Intended Outcome

Angebots-Qualitaet steigt durch strukturierte Zahlungsbedingungen ohne Freitext-Drift. Pre-Call-Briefing reduziert manuelle Vorbereitungszeit pro Meeting auf < 1 Min Lesezeit.

### V5.6 Primary User

Eigentuemer (Single-User Internal-Tool). Beide Features adressieren Tagesgeschaeft des aktuellen einzelnen Nutzers — keine Multi-User-Annahmen.

### V5.6 Delivery Mode

- internal-tool
- Internal-Test-Mode bleibt aktiv (carryover aus V5.5)

### V5.6 V1 Scope

**FEAT-561 — Zahlungsbedingungen: Vorauswahl + Split-Plan + Skonto (BL-412)**

Sub-Theme A: Vorauswahl-Liste typischer Bedingungen.
- Neue Tabelle `payment_terms_templates` (id, label, body, is_default, created_at, updated_at) — anlegbar/editierbar/loeschbar unter `/settings/payment-terms` (eigene Settings-Sektion).
- Im Proposal-Workspace: Dropdown "Bedingung waehlen" greift auf Templates zu, fuellt Freitext-Feld vor. Manueller Override bleibt moeglich.
- Default-Template ist konfigurierbar (Branding-Default "30 Tage netto" bleibt erhalten als Initial-Seed).

Sub-Theme B: Split-Plan (Teilzahlungen).
- Neue Tabelle `proposal_payment_milestones` (id, proposal_id, sequence, percent, amount, due_trigger, due_offset_days, label, created_at).
- `due_trigger` Enum: `on_signature` | `on_completion` | `days_after_signature` | `on_milestone`.
- UI im Proposal-Editor als expandable Section ("Teilzahlungen aktivieren") mit Add/Remove/Reorder-Steuerung.
- **Sum-Validation: Summe muss EXAKT 100 % entsprechen. Keine Toleranz. Speichern blockiert wenn != 100%.** Frontend zeigt Live-Summen-Anzeige in Echtzeit waehrend User editiert + klares Error-State bei Abweichung.
- PDF-Renderer (SLC-553-Erweiterung): wenn `proposal_payment_milestones` Eintraege hat, separater "Konditionen / Teilzahlungen"-Block; sonst Fallback auf bestehendes `payment_terms` Freitext.
- Status-Lifecycle bleibt orthogonal (V5.5 bleibt unveraendert).

Sub-Theme C: Skonto als separates optionales Feld.
- Neue Spalten am `proposals`: `skonto_percent NUMERIC(4,2) NULL` (z.B. 2.00) + `skonto_days INTEGER NULL` (z.B. 7).
- UI im Proposal-Editor als Toggle "Skonto anbieten?" (default off). Bei aktiv: zwei Felder fuer Prozent + Tage.
- **Mutex-Logik:** wenn ein Milestone mit `due_trigger='on_signature'` 100% deckt (= Vorkasse), wird Skonto-Toggle automatisch disabled mit Hinweis "Bei Vorkasse nicht anwendbar". Datenmodell-seitig sind beide Felder unabhaengig — die Mutex ist nur UI-Convenience.
- Internationaler Kontext: Skonto ist DE-spezifisch und in NL/anderen Markten unueblich. Daher opt-in pro Angebot, niemals impliziter Default. NL-Kunden bekommen ein Angebot ohne Skonto-Feld im PDF.
- PDF-Renderer (SLC-553-Erweiterung): wenn `skonto_percent` gesetzt, Block "Skonto: X % bei Zahlung innerhalb Y Tagen" unter Konditionen. Wenn NULL: nicht gerendert.

**FEAT-562 — Pre-Call Briefing Auto-Push (BL-385)**

- Cron `meeting-briefing` laeuft alle 5 Min, sucht `meetings`/`calendar_events` mit `start_time` zwischen jetzt und +(N+5) Min die noch kein Briefing haben. **N ist user-konfigurierbar** (Default 30 Min, einstellbar als 15/30/45/60 in `/settings/briefing`).
- Wiederverwendung des bestehenden `buildDealBriefingPrompt` + `validateDealBriefing` Stacks (aus FEAT-301 Deal-Workspace KI). Kein neuer LLM-Adapter.
- Briefing-Inhalt: Account-Status, letzte 5 Interaktionen (E-Mails + Activities), offene Signale, Naechste Schritte aus letztem Gespraech, KI-generierte Gespraechspunkte mit Einwandbehandlung.
- Delivery: Push-Notification (FEAT-409 Service Worker bestehend) **und** E-Mail (SMTP bestehend, kompakte HTML-Version). Beide aktiv per Default, jeweils per User-Setting toggle-bar.
- Persistierung: Briefing wird als Activity (`type='briefing'`) am Deal gespeichert mit Verweis auf das Meeting — ist abrufbar nach dem Meeting (z.B. fuer Vergleich Soll/Ist).
- Meetings ohne Deal-Zuordnung: Briefing wird **nicht** generiert (Briefing braucht Deal-Kontext fuer Sinn).

### V5.6 Out of Scope

- Skonto-Berechnung als automatischer Discount in `proposal_items` (FEAT-561 fokussiert reine Bedingungs-Kommunikation, keine Brutto/Netto-Aenderung)
- Rechnungs-Generierung (separates Feature, V7+)
- Briefing fuer interne Termine ohne Deal-Bezug
- Briefing-Konfigurations-UI (welche Sections/welche Tiefe) — feste Sections in V5.6
- Multi-User-Briefing-Routing (Single-User-Annahme)
- Nachgelagerte Briefing-Updates wenn neue Daten zwischen Erstellung und Meeting reinkommen — Briefing ist Snapshot zum Trigger-Zeitpunkt
- E-Mail-Briefing als HTML-Render-Engine (V5.3 Branding-Renderer wird nicht angefasst — kompakte Plain-HTML-Variante)

### V5.6 Constraints

- Bedrock Claude Sonnet als LLM (Frankfurt, EU). Keine neuen Provider.
- Kein neues Schema fuer Push-Notifications (FEAT-409 Stack bleibt).
- pdfmake-Renderer (DEC-105) wird erweitert, kein PDF-Library-Wechsel.
- Kein Auto-Migration von bestehenden `proposals.payment_terms` Freitext-Werten in das neue Template-System — alte Werte bleiben gueltig, neue Templates sind opt-in.
- Coolify-Cron-Setup-Pattern wie REL-019 (process.env.CRON_SECRET, Container `app`).

### V5.6 Risks & Assumptions

- **Risk:** Sum-Validation-Strict (=100%) blockt User wenn er Rundungsabweichungen hat (33+33+34=100, ok; 33.33+33.33+33.33=99.99, blockt).
  Mitigation: User-Direktive 2026-05-01 — strikt 0% Toleranz. Frontend zeigt Live-Summen-Anzeige + erzwingt sauberen Input. User uebernimmt Verantwortung fuer 100%-Summen, Pattern wie z.B. Lohnabrechnungs-Tools.
- **Risk:** Skonto wird in NL/internationalen Angeboten versehentlich aktiviert.
  Mitigation: Skonto ist opt-in mit default-off. UI-Mutex zu Vorkasse-Trigger. PDF rendert Skonto-Block nur bei aktivem Feld.
- **Risk:** Briefing-Cron triggert mehrfach fuer dasselbe Meeting wenn Briefing-Status nicht idempotent gesetzt wird.
  Mitigation: Idempotenz-Marker `meetings.briefing_generated_at` IS NOT NULL → Skip. Pattern aus expire-proposals (V5.5).
- **Risk:** Bedrock-Kosten skalieren mit Meeting-Anzahl (Single-User: vernachlaessigbar, aber dokumentieren).
  Mitigation: Max 1 LLM-Call pro Meeting pro Tag. Bei 5 Meetings/Tag = ~$0.25 Bedrock-Kosten/Tag. Akzeptabel.
- **Risk:** Briefing zeigt veraltete Daten wenn IMAP-Sync zwischen Trigger und Meeting noch laueft.
  Mitigation: akzeptiert. Briefing ist Best-Effort-Snapshot, nicht Real-Time.
- **Risk:** Push-Notification-Delivery scheitert (Service Worker offline). E-Mail-Fallback waere wuenschenswert.
  Mitigation: beide Kanaele aktiv default — wenn beide ausgeschaltet, kein Briefing.
- **Risk:** Split-Plan-PDF-Render bricht V5.5 PDF-Smokes (bestehende sent Proposals haben kein `proposal_payment_milestones`).
  Mitigation: Fallback-Pfad bleibt bit-identisch zu V5.5. `/qa` smoket beide Pfade.
- **Assumption:** Bestehende `meetings`-Tabelle hat `deal_id`-FK fuer Deal-Zuordnung (verifiziert in `/architecture`).
- **Assumption:** `buildDealBriefingPrompt` ist parameter-kompatibel fuer Cron-Aufruf (nicht nur Workspace-UI). `/architecture` verifiziert.

### V5.6 Success Criteria

V5.6 ist erfolgreich wenn:
1. User kann Zahlungsbedingungen unter `/settings/payment-terms` anlegen, editieren, loeschen, default setzen.
2. Im Proposal-Editor erscheint Dropdown mit den Templates; Auswahl fuellt Freitext-Feld vor; manueller Override bleibt moeglich.
3. Split-Plan-Section laesst sich im Proposal-Editor aktivieren mit beliebig vielen Milestones (Add/Remove/Reorder).
4. **Sum-Validation strikt 0% Toleranz** — Speichern bei != 100% blockiert, Frontend zeigt Live-Summen-Anzeige.
5. **Skonto-Toggle** im Proposal-Editor (default off) mit Prozent + Tage Feldern; bei aktivem Vorkasse-Milestone (`on_signature` 100%) wird Toggle automatisch disabled.
6. PDF-Renderer zeigt Konditionen-Block mit Milestones strukturiert + optional Skonto-Block; ohne Milestones/Skonto bleibt PDF identisch zu V5.5.
7. **`/settings/briefing` Page** mit Trigger-Zeit-Setting (15/30/45/60 Min, Default 30) + Push-Toggle + E-Mail-Toggle.
8. Cron `meeting-briefing` laeuft im 5-Min-Takt und generiert Briefings fuer Meetings im konfigurierten Fenster.
9. Briefing wird per Push-Notification + E-Mail an User geschickt, beide Kanaele in `/settings/briefing` toggle-bar.
10. Briefing wird als Activity am Deal gespeichert.
11. Meetings ohne Deal-Zuordnung werden ignoriert.
12. V5.5-PDF-Smoke bleibt regression-frei (Proposals ohne Milestones/Skonto rendern bit-identisch).

### V5.6 Open Questions — RESOLVED 2026-05-01

User-Sign-Off vom 2026-05-01. Empfehlungen wurden uebernommen, ausser F2 + F4 + F6 (User-Korrektur).

- **F1 — Settings-Sektion fuer Templates:** ✅ Eigene `/settings/payment-terms` (Empfehlung uebernommen).
- **F2 — Sum-Validation-Toleranz:** ❗ **0% strict — User-Korrektur.** Keine Toleranz, Summe muss exakt 100% sein. Frontend mit Live-Summen-Anzeige + klarem Error-State.
- **F3 — Pflicht/Optional Split-Plan:** ✅ Opt-in via Toggle "Teilzahlungen aktivieren" (Empfehlung uebernommen).
- **F4 — Skonto-Behandlung:** ❗ **Separates Feld — User-Korrektur.** Skonto ist DE-spezifisch und in NL nicht ueblich. User braucht Pro-Angebot-Kontrolle. Implementation: neue `proposals.skonto_percent` + `proposals.skonto_days` Spalten, UI-Toggle (default off), UI-Mutex zu Vorkasse-Trigger (`on_signature` 100% deckt).
- **F5 — `due_trigger` Enum-Vollstaendigkeit:** ✅ 4 Trigger reichen (`on_signature`, `on_completion`, `days_after_signature`, `on_milestone`) — Empfehlung uebernommen.
- **F6 — Briefing-Trigger-Zeitpunkt:** ❗ **User-konfigurierbar — User-Korrektur.** Setting in `/settings/briefing` mit Optionen 15 / 30 / 45 / 60 Min, Default 30 Min. Persistierung in `user_settings` (existiert seit V4.1).
- **F7 — Briefing-Delivery-Default:** ✅ Beide Kanaele Push + E-Mail aktiv default — Empfehlung uebernommen.
- **F8 — Briefing-Persistierung:** ✅ Als Activity (`type='briefing'`) — Empfehlung uebernommen.
- **F9 — Briefing fuer wiederkehrende Meetings:** ✅ Pro Termin-Instance, pro Tag neu — Empfehlung uebernommen.
- **F10 — `proposal_payment_milestones` Audit-Log:** ✅ Ja, gleiches Pattern wie `proposal_items` (V5.5) — Empfehlung uebernommen.
- **F11 — Cron-Concurrency-Lock:** ✅ Idempotenz-Marker `briefing_generated_at` per UPDATE WHERE NULL (winner-takes-all) — Empfehlung uebernommen.
- **F12 — Slicing:** ✅ 4 Slices SLC-561..564 — Empfehlung uebernommen. Splitting:
  - SLC-561: Schema (MIG-027) + Vorauswahl-Backend (`payment_terms_templates` + `/settings/payment-terms` Page)
  - SLC-562: Editor-Dropdown + Skonto-Felder (Sub-Themes A + C UI)
  - SLC-563: Split-Plan-UI + PDF-Renderer-Erweiterung (Sub-Theme B + PDF)
  - SLC-564: Pre-Call Briefing Cron + Push/E-Mail-Delivery + `/settings/briefing` Page

**V5.6 Requirements ready for `/architecture`.**

---

## V6.2 — Workflow-Automation + Kampagnen-Attribution

### V6.2 Problem Statement

Zwei produktive Schmerzen sammeln sich seit V3..V5.7:

1. **Repetitive operative Reaktionen ohne Automatisierung.** Deal rutscht in eine bestimmte Stage → Aufgabe muss angelegt werden. Activity-Typ "Disqualifizierung" landet → Stage soll auf "Lost". Meeting wird durchgefuehrt → Follow-up-Mail-Template soll auf den Deal. Bisher alles per Hand. Cadences (FEAT-501) decken nur Outreach-Sequenzen ab, KI-Wiedervorlagen (FEAT-407) sind freigabepflichtig — die deterministische Wenn-Dann-Schicht fehlt komplett.
2. **Lead-Quelle nicht aggregierbar.** Kontakte und Firmen haben Freitext-`source`/`source_detail`-Felder seit V2 + V3.1. "Wieviele Leads kamen aus der LinkedIn-Kampagne im April?" laesst sich nur per LIKE-Pattern beantworten, "welche Kampagnen brachen die meisten gewonnenen Deals?" gar nicht. System 4 plant Kampagnen, aber die Attribution-Schleife zurueck endet im Business System mit unbrauchbarem Freitext.

V6.2 schliesst beide Luecken parallel, weil sie thematisch eigenstaendig und beide low-cost (kein neuer LLM-Pfad, kein neuer Container) sind.

### V6.2 Goal / Intended Outcome

- User legt unter `/settings/automation` Wenn-Dann-Regeln an, die ohne KI und ohne Freigabe deterministisch laufen.
- Kampagnen werden als eigenes Datenobjekt gefuehrt; Leads/Deals werden strukturiert verknuepft; UTM-getrackte Tracking-Links liefern automatisch Lead-Attribution; eine Reporting-Page pro Kampagne zeigt Conversion-Rate.
- System 4 zieht Kampagnen-Performance per Read-API (kein Push, kein Webhook V1).

### V6.2 Primary User
Founder als Single-User. Multi-User kommt mit V7.

### V6.2 Delivery Mode
Internal-tool — die existierenden Patterns (Coolify-Cron, Audit-Log, Read-API) reichen, kein zusaetzlicher Operations-Overhead.

### V6.2 Architekturleitplanken
- **Kein neuer LLM-Pfad.** Workflow-Engine ist 100% deterministisch — konsistent mit `feedback_no_api_costs.md`.
- **Reuse statt neu bauen.** Audit-Log-Pattern aus V5.7 fuer Rule-Runs und Click-Logs. Coolify-Cron-Pattern fuer asynchrone Action-Ausfuehrung. Export-API-Pattern (FEAT-504) fuer Read-API. V5.3-E-Mail-Templates fuer Send-Email-Action.
- **Keine neuen Container, keine neuen npm-Packages** wenn vermeidbar.
- **First-Touch-Attribution V1, keine Multi-Touch.**
- **Existierende Source-Felder bleiben unangetastet** — campaign_id ist additiv.

### V6.2 Features (2 Features)

#### FEAT-621 — Workflow-Automation Rule Builder (BL-135)

Form-basierter Wenn-Dann-Regel-Builder unter `/settings/automation` mit:
- **3 V1-Trigger:** `deal.stage_changed`, `deal.created`, `activity.created` (mit Typ-Filter)
- **Conditions:** AND-only, kein OR, keine Cross-Entity-Joins
- **4 V1-Actions:** `create_task`, `send_email_template`, `create_activity`, `update_field` (Whitelist)
- **Audit-Log + Trockenlauf** ueber letzte 30 Tage ohne Side-Effects
- **Aktiv-Toggle** — Regeln pausierbar
- **Anti-Loop-Marker** pro (rule_id, entity_id, trigger_event_id)

Out of Scope V1: Time-based-Trigger, Multi-Step-Sequences (kommt aus Cadences), KI-Branchen, Cross-Entity-Conditions, OR-Conditions, Webhook-Actions, Drag&Drop-Node-Editor, User-Scope (V7).

Spec: `/features/FEAT-621-workflow-automation.md`

#### FEAT-622 — Kampagnen-Attribution + UTM-Tracking (BL-139)

Neue Tabelle `campaigns` + Verknuepfung Leads/Deals + UTM-Tracking-Links:
- **`campaigns`-Tabelle** mit `id, name, type (whitelist email|linkedin|event|ads|referral|other), channel, start_date, end_date, status, external_ref, notes`
- **FK-Felder** `contacts.campaign_id`, `companies.campaign_id`, `deals.campaign_id`
- **`campaign_links`-Tabelle** mit `token, target_url, utm_source/medium/campaign/content/term`
- **`/r/[token]`-Redirector** mit Click-Logging (IP gehashed, retention 90 Tage)
- **`/campaigns/[id]`-Reporting-Page** mit Lead/Deal/Won-KPIs + Tracking-Links-Tab
- **Funnel-Report-Erweiterung** (FEAT-335) um Kampagne-Filter
- **Read-API** `GET /api/campaigns/[id]/performance` (Reuse FEAT-504 Auth-Pattern)
- Bestehende `source*`-Freitext-Felder bleiben backward-compatible erhalten

Out of Scope V1: Multi-Touch-Attribution, A/B-Test, Cookie-basiertes Cross-Session-Tracking, Push-Webhooks, Auto-Migration der Alt-Source-Werte, eigener Form-Builder.

Spec: `/features/FEAT-622-kampagnen-attribution.md`

### V6.2 In Scope
- Form-basierter Workflow-Rule-Builder mit 3 Trigger + 4 Action-Whitelist
- Asynchrone Rule-Ausfuehrung mit Audit-Log + Anti-Loop-Marker
- Trockenlauf-Modus (letzte 30 Tage Replay)
- Kampagnen-Tabelle + FK-Verknuepfung zu Contacts/Companies/Deals
- UTM-Tracking-Link-Generator + Redirector + Click-Log
- Reporting-Page pro Kampagne + Funnel-Report-Filter
- Read-API fuer Kampagnen-Performance
- Backward-Compat zu existierenden `source*`-Feldern (additiv)

### V6.2 Out of Scope
- Time-based-Trigger ("wenn 7 Tage nichts passiert")
- Multi-Step-Workflows mit Wartezeit (das machen Cadences FEAT-501)
- KI-getriebene Action-Decision (das macht FEAT-407 KI-Wiedervorlagen)
- Drag&Drop-Node-Graph-Editor
- E-Mail-Empfangs-Trigger (das macht FEAT-408 KI-Gatekeeper)
- Webhook-Actions
- OR-Conditions / verschachtelte Boolesche Logik
- Multi-Touch-Attribution (First-Touch only V1)
- A/B-Testing von Kampagnen oder Regel-Varianten
- Cookie-basiertes Cross-Session-Tracking
- Push-Webhooks zu System 4
- Auto-Migration der `source*`-Freitext-Felder zu `campaign_id`
- Eigener Form-Builder (Lead-Capture)
- User-Scope von Regeln (V7 Multi-User)

### V6.2 Constraints
- **Internal-Test-Mode** bleibt aktiv bis Pre-Production-Compliance-Gate (laut User 2026-05-01 NICHT prioritaer).
- **Keine neuen npm-Packages oder Container** wenn vermeidbar (Reuse-Disziplin).
- **Keine LLM-Calls in Hot-Path** der Rule-Engine — `feedback_no_api_costs.md`.
- **Kein Browser-Supabase** — alle Mutationen ueber Server-API-Routes — `feedback_no_browser_supabase.md`.
- **Style Guide V2 verbindlich** fuer alle UI-Arbeiten — `feedback_style_guide_v2_mandatory.md`.

### V6.2 Risks & Assumptions
- **Risiko Endless-Loop** zwischen Regel-Ausfuehrung und Stage-Change-Trigger. **Mitigation:** Idempotency-Marker pro (rule, entity, trigger_event) + harter Recursion-Counter (max 3 Stage-Changes pro Deal pro 60s).
- **Risiko Race** mit Cadences und KI-Wiedervorlagen die das gleiche Feld setzen. **Mitigation:** Audit-Log dokumentiert Quelle.
- **Risiko PII** beim Click-Log. **Mitigation:** IP gehashed, retention 90 Tage, konsistent mit COMPLIANCE.md V5.2.
- **Risiko Source-Doppelpflege** alter `source` Freitext + neues `campaign_id`. **Mitigation:** UI zeigt beide transparent, manuelle Migration out-of-band.
- **Annahme:** Form-basierter Rule-Builder reicht V1; Drag&Drop-Editor erst wenn Regelkomplexitaet das fordert.
- **Annahme:** System 4 sendet utm-Werte beim Lead-Insert via Form-Embed-API — Business System baut keinen JS-Tracker selbst.
- **Annahme:** First-Touch-Attribution ist akzeptabel, Multi-Touch erst wenn ein Lead nachweislich von 2+ Kampagnen beruehrt wurde und das Reporting-Verzerrung produziert.

### V6.2 Success Criteria
- 5+ produktive Workflow-Regeln aktiv nach 2 Wochen
- 0 ausgeloeste Endless-Loops im Audit-Log
- Trigger-Latenz < 30s vom Trigger-Event bis zur ersten Action
- 3+ Kampagnen produktiv angelegt nach 2 Wochen
- Conversion-Rate pro Kampagne fuer >50% der Won-Deals der letzten 90 Tage sichtbar
- Read-API `/api/campaigns/[id]/performance` returns gueltiges JSON

### V6.2 Open Questions (fuer /architecture)

**Workflow-Automation (FEAT-621):**
- F1: Trigger-Mechanismus — Postgres-NOTIFY/LISTEN, In-Process-Event-Emitter oder Polling? Trade-off Reliability vs. Code-Komplexitaet.
- F2: Field-Whitelist fuer `update_field`-Action — Code-Konfig oder DB-Tabelle?
- F3: Action-Ausfuehrung — synchron im Trigger-Request, im existierenden Coolify-Cron-Pattern, oder neuer Worker-Loop?
- F4: Audit-Log-Tabelle — existierende `audit_log` (V5.7) erweitern oder neue `automation_runs`?
- F5: Trockenlauf "letzte 30 Tage" — wie wird historischer Trigger-Stream rekonstruiert (Activities-Tabelle reicht oder Replay-Layer)?
- F6: Was passiert mit aktiven Regeln, die auf eine geloeschte Pipeline-Stage referenzieren — Soft-Disable + Warning oder Hard-Block beim Loeschen?
- F7: `create_task`-Action Owner-Default — Trigger-User oder Deal-Owner?

**Kampagnen-Attribution (FEAT-622):**
- F8: utm-Parameter zu `campaigns.id` Mapping — ueber `utm_campaign = campaigns.name` (case-insensitive) oder ueber `external_ref`?
- F9: Existierende `source`/`source_detail`-Felder — parallel halten, deprecaten, oder Auto-Migration in einem extra-Sprint?
- F10: Tracking-Link-Token-Schema — kurz (~8 char) oder UUID-prefix? Trade-off Lesbarkeit vs. Kollision.
- F11: First-Touch-Persistenz — wenn ein bestehender Kontakt einen 2. Kampagnen-Klick macht: `campaign_id` ueberschreiben oder gelocked? (V1-Empfehlung: gelocked).
- F12: Funnel-Report-Erweiterung (FEAT-335) — wie tief der UI-Eingriff fuer den Kampagne-Filter?
- F13: Read-API `/api/campaigns/[id]/performance` Auth — FEAT-504-Pattern bestaetigen oder neue Auth?

### V6.2 Slicing-Vorschlag (zur /architecture-Entscheidung)
- **SLC-621** Workflow-Foundation: `automation_rules` + `automation_runs` Schema, Trigger-Listener-Layer, Audit-Log-Erweiterung
- **SLC-622** Workflow-Builder-UI + Trockenlauf: `/settings/automation` Page + 4-Step-Form
- **SLC-623** Action-Executors: `create_task`, `send_email_template`, `create_activity`, `update_field` mit Whitelist + Anti-Loop-Marker
- **SLC-624** Kampagnen-Foundation: `campaigns` Tabelle + FK auf Contacts/Companies/Deals + `/settings/campaigns` Listing + `/campaigns/[id]` Detail
- **SLC-625** Tracking-Links + Click-Log: `campaign_links` + `campaign_link_clicks` + `/r/[token]` Redirector + Reporting-KPIs
- **SLC-626** Read-API + Funnel-Report-Filter: `/api/campaigns/[id]/performance` + Funnel-Report-Erweiterung

(6 Slices als erste Schaetzung, /architecture konsolidiert auf finale Slice-Anzahl.)

**V6.2 Requirements ready for `/architecture`.**

---

## V6.4 — Hygiene-Sprint (System-Aufraeumung vor V7)

### V6.4 Problem Statement

Nach 23 Releases (V2 bis V6.3) ist das System funktional weit gewachsen, aber strukturell ungeprueft. Drei konkrete Beobachtungen aus dem 2026-05-07 Post-Launch-Review (RPT-331):

1. **Latenter Bug in Production:** `FollowupEngine.openProposals` selektiert auf der nicht-existenten Spalte `proposals.value`. Schema-Drift seit V5.5/MIG-026 (2026-04-29). Aktuell harmlos (0 reale Kandidaten in DB), wird aber sichtbar sobald reale Proposals versendet werden.

2. **DSGVO-Luecke in Production:** `campaign_link_clicks` waechst seit V6.2-Release (2026-05-06) unbegrenzt. Die geplante 90-Tage-Retention (DSGVO konsistent zu V5.2 COMPLIANCE.md) wurde im Slice-Plan dokumentiert (BL-423), aber nie implementiert.

3. **User-Wahrnehmung "doppelt und dreifach gebaut":** Konkrete Beispiele:
   - 2 parallele Lead-Quellen-Konzepte (alte `source`/`source_detail` Freitext + neue `campaign_id`)
   - Multiple AI-Engines parallel (FollowupEngine, Briefing-Engine, Signal-Extract, Bedrock-Pfade) mit potenzieller Logik-Ueberlappung
   - 19 Cron-Jobs aktiv, davon viele mit `picked=0` / `processed=0` Logs ueber Stunden — Verdacht auf obsolete oder redundante Cron-Pfade
   - Settings-Landing-Page mit 6+ Sub-Sections + Inline-Bloecken — moeglicherweise unuebersichtlich
   - Pipeline-Stage-Anzahl historisch gewachsen, ggf. nicht mehr optimal

V6.4 schliesst diese 3 Luecken bevor V7 (Multi-User) startet, damit V7 nicht auf einem System mit latenten Bugs und Wildwuchs aufbaut.

### V6.4 Goal / Intended Outcome

Ein arbeitsfaehiges System, mit dem der User produktiv arbeiten kann, ohne dass:
- latente Bugs sichtbar werden sobald echte Daten fliessen
- DSGVO-Luecken zum Compliance-Risiko werden
- die UI durch Wildwuchs unuebersichtlich wird
- doppelte Logik zukuenftige Aenderungen verlangsamt

Ergebnis: Stabile Basis fuer V7-Multi-User-Sprint und erste produktive Sales-Flows.

### V6.4 Primary User

- **Richard (initialer Berater)** — einziger aktiver User in Internal-Test-Mode. Will produktiv mit dem System arbeiten, ohne ueber Wildwuchs nachdenken zu muessen.

### V6.4 V1 Scope

**FEAT-641 — System-Stabilitaet & DSGVO-Hygiene** *(klein, bekannt, schreibend)*
- ISSUE-057 FollowupEngine-Fix: `proposals.value` -> `total_gross` an 2 Stellen in `cockpit/src/lib/ai/followup-engine.ts:194-208`. Vitest-Patch falls Tests existieren, sonst Pure-Function-Test fuer den Query-Builder.
- BL-423 Click-Log-Cleanup-Cron: Neuer Cron-Endpoint `/api/cron/click-log-cleanup` der `campaign_link_clicks` aelter 90 Tage loescht. Coolify-Cron alle 24h. Pattern analog `expire-proposals` (V5.5).
- Audit-Log-Eintrag bei jedem Cleanup-Lauf (geloeschte Anzahl, Zeitraum).

**FEAT-642 — Code-Hygiene-Audit** *(Inventur + selektives Cleanup)*
- Strukturierter `/doctor`-Lauf ueber Code-Base mit Fokus auf:
  - Doppelte Logik (z.B. mehrere Cron-Jobs die aehnliches tun, mehrere AI-Engines mit Ueberlappung)
  - Obsolete Code-Pfade (Code der seit V2..V6.3 nicht mehr aufgerufen wird)
  - Ungenutzte Cron-Jobs (alle 19 Cron-Endpoints durchgehen, je mit Trigger-Source und letztem realem Output bewerten)
  - Tote API-Routes (Routes ohne Caller)
  - Schema-Inkonsistenzen (Tabellen mit alter+neuer Variante parallel, z.B. source vs. campaign_id)
- Output: strukturierte Audit-Liste mit Severity (Klar-obsolet / Verdacht / Behalten) + User-Sign-Off pro Item
- Selektives Cleanup IN V6.4: nur Items die der User explizit mit "loeschen" markiert hat
- Rest als BL fuer V6.5 oder spaeter

**FEAT-643 — UI-Hygiene-Audit** *(Inventur + selektives Cleanup)*
- Strukturierter `/ui-update` Audit mit Fokus auf:
  - Settings-Landing-Page: Sub-Sections + Inline-Bloecke pruefen, redundante Karten konsolidieren, Hierarchie pruefen
  - Sidebar: Eintraege gegen tatsaechliche Nutzung pruefen (welche Pages werden noch geoeffnet?)
  - Button-Konsistenz: Primary-/Secondary-/Destructive-Verteilung, Position, Label-Stil
  - Pipeline-Stages: Anzahl + Beschriftung pro Pipeline pruefen, ueberfluessige Stages konsolidieren
  - Page-Header-Pattern: einheitlich vs. abweichend
- Output: strukturierte UI-Audit-Liste mit Vorher/Nachher-Mockup-Beschreibung + User-Sign-Off pro Item
- Selektives Cleanup IN V6.4: nur Items die der User explizit mit "umsetzen" markiert hat
- Rest als BL fuer V6.5 oder spaeter

### V6.4 Out of Scope

**NICHT in V6.4:**
- BL-420 VIES-Online-Lookup (V5.7-DEC-124 Format-only ist bewusst gewaehlt)
- BL-421 DE-Reverse-Charge § 13b (V5.7-DEC-128 NL-only ist V1-Fokus)
- BL-424 Source-Migration-Tool (on-demand, kein Druck)
- BL-425 Multi-Touch-Journey-Tab (Komfort-Feature)
- BL-430 npm audit --force Cleanup (V6.4-defer wegen Breaking-Change-Path)
- BL-397 GitHub-App Org-Anbindung (Infra-Hygiene, nicht Code-Hygiene)
- ISSUE-042 OpenAI-Key + Compliance-Gate (User-Direktive 2026-05-01 "kommt viel spaeter")
- Multi-User / Teamlead-Funktionalitaet -> V7
- Neue Features oder UI-Komponenten — V6.4 ist striktes Aufraeumen, nicht Funktions-Erweiterung
- Refactor-Sprints ohne konkrete User-Sichtbarkeit — keine "Code-Verbesserungen aus Prinzip"

**Zwischenstellung:**
- Tiefe Datenbankreorganisation (z.B. source/source_detail-Felder droppen) -> erst nach BL-424 Migration-Tool
- Cron-Job-Loeschungen die produktive Aufgaben tangieren -> nur mit User-Sign-Off pro Job

### V6.4 Constraints

- **Internal-Test-Mode bleibt aktiv** — kein Wechsel zu Production-Compliance bis Pre-Production-Compliance-Gate (User-Direktive 2026-05-01).
- **KEINE neuen npm-Packages** — V6.4 nutzt nur Bestehendes.
- **KEINE neuen Container** — kein Asterisk/Whisper/Bedrock-Anbieter-Wechsel im Hygiene-Sprint.
- **KEIN Schema-Bruch** — nur additive oder loeschende Migrationen, kein Type-Change auf bestehenden Spalten.
- **Cleanup-Items nur mit User-Sign-Off pro Item** — V6.4 darf keinen Cron-Job/keine Page/keine Funktion still loeschen.
- **Coolify-Cron** ist die Standard-Scheduler-Loesung — kein neuer Cron-Mechanismus.
- **Style Guide V2 verbindlich** fuer alle UI-Aenderungen.
- **Atomic Commits per Slice** — pro Cleanup-Item (oder eng zusammenhaengender Cleanup-Gruppe) ein Commit, damit Rollback einzelner Items moeglich.

### V6.4 Risks & Assumptions

**Risiken:**
- **Risiko Audit-Scope-Explosion:** Code-Audit findet 50+ Cleanup-Kandidaten, V6.4 wird zu gross. **Mitigation:** Strenge User-Sign-Off-Pflicht pro Item, Rest geht als BL in V6.5.
- **Risiko Falsch-Positiv:** "Obsoleter" Code wird geloescht, ist aber doch noch gebraucht (z.B. fuer einen seltenen Edge-Case-Pfad). **Mitigation:** Vor Loeschung mind. einmal grep + Coolify-Cron-Liste durchgehen, plus Live-Smoke-Test nach Cleanup.
- **Risiko UI-Drift:** UI-Audit fuehrt zu Stil-Bruechen mit V5.3-V6.3-Pattern. **Mitigation:** Style Guide V2 als Referenz, /ui-update folgt bestehender Visual-Sprache.
- **Risiko Compliance-Drift:** Cleanup tangiert Audit-Log-Schreiber oder andere Compliance-relevante Pfade. **Mitigation:** Audit-Log-Pfade explizit als "Behalten" markieren, separate Risk-Liste fuer Compliance-relevante Loeschungen.

**Annahmen:**
- **Annahme:** Internal-Test-Mode mit 1 User reicht zur V6.4-Verifikation — kein Multi-User-Test-Scenario noetig.
- **Annahme:** Audit-Liste mit User-Sign-Off pro Item ist effektiver als pauschale "alles aufraeumen"-Direktive.
- **Annahme:** /doctor-Skill und /ui-update-Skill sind ausreichend strukturiert um die Audits zu fahren — bei Luecken wird per IMP nachgepflegt.
- **Annahme:** Click-Log-Cleanup mit 90 Tagen ist DSGVO-konform und konsistent mit V5.2 COMPLIANCE.md — kein Anwalts-Sign-Off in V6.4-Scope (gehoert zum Pre-Production-Compliance-Gate).

### V6.4 Success Criteria

- ISSUE-057 ist resolved + Live-Smoke gegen Followup-Cron PASS
- BL-423 Cleanup-Cron ist live, Coolify-Cron-Eintrag aktiv, mind. 1 erfolgreicher Lauf in Logs sichtbar
- Code-Audit-Output existiert als strukturiertes Dokument (RPT) mit Severity-Klassifikation
- UI-Audit-Output existiert als strukturiertes Dokument (RPT) mit Vorher/Nachher pro Item
- Beide Audits sind vom User signed-off (Item-by-Item: "loeschen / umsetzen / spaeter / nicht")
- Mind. 5 Cleanup-Items sind tatsaechlich umgesetzt (sonst war der Audit nicht produktiv)
- Vitest 393/393 (oder mehr) PASS nach allen V6.4-Aenderungen
- Live-Smoke nach V6.4-Deploy: alle Settings-Pages laden, Pipeline funktioniert, Composing-Studio funktioniert, Proposals funktionieren
- 0 neue Regressions auf V6.0..V6.3-Funktionalitaet

### V6.4 Open Questions (fuer /architecture)

**Scoping:**
- F1: **Audit-Tiefe** — Soll der Code-Audit nur eine Inventur produzieren (User entscheidet danach), oder soll er auch Auto-Cleanup-Empfehlungen mit Confidence-Score machen? Empfehlung: nur Inventur + Severity-Klassifikation, kein Auto-Cleanup.
- F2: **Audit-Breite** — Soll der Code-Audit ueber den gesamten Code-Base laufen (~ einige hundert Dateien) oder nur ueber Hot-Spots (Cron-Jobs, AI-Engines, Server-Actions)? Empfehlung: Hot-Spots zuerst, restlicher Code als BL fuer spaeter.
- F3: **UI-Audit-Breite** — Settings + Sidebar + Buttons (eng) oder ALLE Pages (breit)? Empfehlung: eng. Page-Audits einzeln spaeter.
- F4: **Cleanup-Quote** — Wieviele Audit-Items soll V6.4 mindestens umsetzen? Empfehlung: mindestens 5 echte Cleanups, sonst war der Sprint nicht produktiv.

**Tooling:**
- F5: **Cron-Audit-Methode** — Container-Logs der letzten 24h pro Cron auswerten ist ausreichend, oder lieber 7-Tage-Sample? Empfehlung: 24h reicht, da wenig User-Aktivitaet.
- F6: **Schema-Audit** — Soll V6.4 auch ueber DB-Schema laufen (ungenutzte Spalten, redundante Indizes) oder nur Code? Empfehlung: nur Code in V6.4. Schema-Audit als separater V6.5-Slice falls relevant.
- F7: **/doctor-Reuse** — Bestehender /doctor-Skill ist eher fuer "Diagnose unstabiler Releases", nicht fuer "systematischer Code-Audit". Erweitern oder neuen Audit-Mechanismus bauen? Empfehlung: /doctor erweitern, Audit-Pattern als IMP fuer Dev-System dokumentieren.

**Cleanup-Strategie:**
- F8: **Cron-Job-Loeschung** — Wenn ein Cron-Job seit 7+ Tagen nur `picked=0` hat: direkt loeschen oder als "verdaechtig" markieren und 30 Tage beobachten? Empfehlung: markieren + Soft-Disable (Cron deaktivieren in Coolify, Code bleibt). Hart-Loeschung erst nach 30 Tagen Soft-Disable ohne User-Beanstandung.
- F9: **AI-Engine-Konsolidierung** — Wenn FollowupEngine + Briefing-Engine + Signal-Extract Logik teilen: separates Refactoring-Slice (riskanter, hoher Wert) oder als BL deferren? Empfehlung: deferren in V6.5, V6.4 bleibt im Hygiene-Scope.
- F10: **UI-Polish-Tiefe** — UI-Audit-Cleanup macht nur Settings/Sidebar/Buttons (klein), oder gleich komplette Settings-Page-Restructure (gross)? Empfehlung: klein in V6.4, grosse Restructures als V6.5 wenn der Audit das rechtfertigt.

**Definition-of-Done:**
- F11: **V6.4-Release-Gate** — Wann gilt V6.4 als releaseable? Empfehlung: ISSUE-057 + BL-423 fixed + mindestens 5 Cleanups umgesetzt + Vitest gruen + Live-Smoke ueber 5 Haupt-Pages.

### V6.4 Slicing-Vorschlag (zur /architecture-Entscheidung)

- **SLC-641** — System-Stabilitaet & DSGVO (FEAT-641): ISSUE-057 fix + BL-423 Cleanup-Cron + Audit-Log + Vitest-Erweiterung. ~3-4h.
- **SLC-642** — Code-Audit Inventur (FEAT-642): /doctor-Lauf, RPT mit Severity-Liste, User-Sign-Off-Pause. Kein Code geaendert in diesem Slice. ~2-3h Inventur + User-Pause.
- **SLC-643** — Code-Cleanup Implementation (FEAT-642): Umsetzung der mindestens 3 Code-Items aus SLC-642 die der User signed-off hat. ~2-4h je nach Items.
- **SLC-644** — UI-Audit Inventur (FEAT-643): /ui-update-Lauf, RPT mit Vorher/Nachher pro Item, User-Sign-Off-Pause. Kein UI-Code geaendert. ~2h + User-Pause.
- **SLC-645** — UI-Cleanup Implementation (FEAT-643): Umsetzung der mindestens 2 UI-Items die der User signed-off hat. ~2-4h je nach Items.

(5 Slices als erste Schaetzung, /architecture konsolidiert auf finale Anzahl. Audits + Cleanup-Implementation getrennt halten ist wichtig wegen User-Sign-Off-Punkt zwischen Inventur und Aktion.)

### V6.4 Delivery Mode

**Internal-Tool, Hygiene-Sprint.** Klein, additiv (1 Cron + 1 Bug-Fix + 2 Audits + selektive Cleanups), risikoarm. Internal-Test-Mode bleibt aktiv. Kein Compliance-Sprint, kein neuer Provider, kein neues Backend-Module. Pre-Production-Compliance-Gate kommt separat spaeter.

**V6.4 Requirements ready for `/architecture`.**

## V6.6 — Pre-V7-Audit-Sprint (UI-Konsolidierung + KI-Workspace-Hybrid)

### V6.6 Problem Statement

Nach V6.5 (Theming-Foundation + Compliance-DE-Symmetrie) ist das System visuell konsistent und compliance-stabil, aber das **Bedienmodell** ist ueber V3..V6.5 organisch gewachsen und zeigt 5 strukturelle Probleme:

1. **KI-Inseln statt KI-Workspace:** Briefing-Sidebar, Wissen-Tab, Signale-Action, Tagesanalyse-Button, NL-Suche, DashboardSearch — sechs verschiedene KI-Eingangspunkte mit eigenem Look, eigener Frage-Logik, ohne gemeinsames mentales Modell.
2. **Klassische Widget-Sammlung statt Hauptarbeitsplatz:** Mein Tag haeuft KPI-Cards + 4-Hinweise-Pill + 4-offene-Punkte-Zeile + Performance-Migration-Trigger + Tagesanalyse-Button nebeneinander, ohne dass der User eine klare Prioritaet erkennt.
3. **/performance-Seite als isolierte Sicht:** Performance-Daten leben getrennt vom Tagesgeschaeft auf einer eigenen Seite, obwohl sie im Tagesgeschaeft kontextualisiert gehoeren — User muss zwischen Mein Tag und Performance hin-und-her-springen.
4. **Dashboard wirkt wie altes BI-Cockpit:** KPI-Cards + Top-Chancen-Tabelle + DashboardSearch wirken wie ein Reporting-Tool, nicht wie ein KI-Cockpit. Wieso ist das nicht das Mein-Tag-Pattern?
5. **Deal-Detail mit 3 KI-Modulen + 2 statischen Tabs:** Briefing-Sidebar (links) + Wissen-Tab (rechts) + Signale-Action (Toolbar) sind drei Antworten auf dieselbe Frage "Was ist hier los?". User muss in 3 verschiedenen Bereichen suchen, statt einen KI-Workspace anzusprechen.

V6.6 konsolidiert diese 5 Probleme **vor V7 (Multi-User)**, damit V7 nicht Multi-User-Differenzierung auf einem inkonsistenten Bedienmodell aufsetzen muss.

### V6.6 Goal / Intended Outcome

Ein einheitliches **KI-Workspace-Hybrid-Pattern** auf den drei Hauptarbeitsplaetzen (Mein Tag, Deal-Detail, Dashboard) — Berichts-Buttons (Standard-Reports) + Frage-Eingabe (Text/Sprache) + Antwort-Fenster — sodass der User auf jedem Hauptarbeitsplatz dasselbe mentale Modell hat: "Entweder Standard-Bericht abrufen ODER freie Frage stellen."

Pipeline-Progress (Deals-durch-Stages-zur-Entscheidung) wird zum impliziten Leitstern fuer Berichts-Inhalte und Layout-Priorisierung. Aktivitaeten (Anrufe/Meetings/E-Mails) sind Mittel zum Zweck, nicht Selbstzweck.

Ergebnis: Saubere Bedienmodell-Basis fuer V7 (Multi-User + Rollen-Sichtbarkeit), V7.5 (NL-Automation), V7.6 (Custom-Reports). Keine Drill-Downs in V6.6 — Mitarbeiter sollen mit KI arbeiten lernen, Drill-Downs kommen erst mit Chef-Sicht in V7.

### V6.6 Primary User

- **Richard (initialer Berater)** — einziger aktiver User in Internal-Test-Mode, baut die Admin-Sicht. Will alle Daten in einem konsistenten Bedien-Pattern erreichen, ohne zwischen Tabs/Pages/Sidebars zu wechseln.
- **(V7+) Mitarbeiter** — wird Mein Tag als Hauptseite haben, kein Dashboard-Eintrag in Sidebar, keine Drill-Downs.
- **(V7+) Chef** — wird Drill-Downs nutzen koennen (weil nicht im Tagesgeschaeft drin).
- V6.6 baut **ausschliesslich fuer Admin-Sicht** — keine Sichtbarkeits-Toggles, keine Multi-User-Logik, aber **alle Layout-Entscheidungen muessen V7-Multi-User-Differenzierung ermoeglichen** (z.B. keine User-Daten hardcoden, keine globalen Sicht-Flags ohne User-Scope).

### V6.6 V1 Scope

**FEAT-661 — Mein Tag (KI-Workspace-Hybrid + Performance-Migration)** *(gross, Frontend-Hauptarbeit)*
- 4-Block-Layout bleibt: Aufgaben + Top-Deals + Kalender + KI-Workspace
- KI-Workspace wird zu Hybrid: Standard-Berichts-Buttons oben + Frage-Eingabe (Text/Sprache) in Mitte + Antwort-Fenster unten
- Standard-Berichte: `[Tagesanalyse]` `[Gestern]` `[Seit Login]` `[Wochen-Performance]` `[Pipeline-Risiko]`
- Tagesanalyse-Inhalt-Reihenfolge: 1. Pipeline-Bewegung heute (Haupt), 2. Aktivitaeten-Soll-Ist (untergeordnet), 3. KI-Kommentar
- "Tagesanalyse starten"-Button mitten drin → WEG (ersetzt durch Hybrid-Antwort-Fenster)
- "4 Hinweise"-Pill oben rechts → WEG (Wiedervorlagen sind Teil des Tagesanalyse-Berichts)
- "4 offene Punkte"-Zeile unter Kalender → WEG
- /performance-Seite + Sidebar-Eintrag "Meine Performance" verschwinden komplett (Performance-Daten kommen ueber Wochen-Performance-Bericht im KI-Workspace)
- KI-Workspace-Component muss **wiederverwendbar** sein (gleiche Component fuer Mein Tag + Deal-Detail + Dashboard)

**FEAT-662 — Kalender-Polish (Working-Hours-Setting)** *(klein, Frontend + 1 Profil-Setting)*
- Stunden-Range default auf 06:00–21:00 ausweiten (aktuell hartkodiert 07:00–20:00 in `kalender-client.tsx`)
- Working-Hours-Setting pro User-Profil (Arbeitstag definieren, z.B. 09:00–18:00) — gespeichert in `user_profiles` oder `users.preferences`
- Toggle "Voller Tag" / "Nur Arbeitstag" in Kalender-UI
- Feiertag-Logik = NICHT V6.6 (Backlog BL-444)

**FEAT-663 — Deals-Listen-Seite** *(mittel, Frontend-Restruktur)*
- Top-10-Block oben (gewichteter Wert: `value × probability` server-seitig sortiert)
- **Pipeline-Switcher** filtert beides (Top-10 UND Karten-Grid darunter)
- Aktive Deals als Karten-Grid (kompakt: Title + Wert + Firma + Stage-Badge + Naechste Aktion + Wahrscheinlichkeit-Pill)
- 2 einklappbare Sektionen darunter: "Gewonnen" / "Verloren"
- **Type-Ahead-Suche** oben (Stammdaten: Title + Firma + Kontakt-Name, KEIN Volltext / KEIN NL)
- Karten kompakt OHNE Foto/Avatar/Hauptkontakt (Details beim Click)

**FEAT-664 — Deal-Detail (Layout-Swap auf Mein-Tag-Pattern)** *(gross, Frontend-Hauptarbeit + Activity-Sheet)*
- Header: Title + Stage-Dropdown + Wert + Prozess-Check-Pill (Click → Popover) + Edit-Pencil-Icon + Mein-Tag-Quick-Switch-Button
- Action-Bar oben (Mein-Tag-Style, bunt+rund): Task / E-Mail / Meeting (planen+sofort starten als Dropdown) / Anruf / Notiz / Angebot / **... Mehr-Menue** (enthaelt Cadence)
- Hauptbereich 2/3 + 1/3:
  - LINKS 2/3 = KI-Workspace gross (Hybrid mit Berichts-Buttons `[Briefing]` `[Signale extrahieren]` `[Risiken & Einwaende]` `[Naechster sinnvoller Schritt]` `[Win/Loss-Analyse]` + Frage-Eingabe + Antwort-Fenster)
  - RECHTS 1/3 = Tabs (Timeline / Tasks / Proposals / Documents)
- 3 KI-Module → 1 KI-Workspace: Briefing-Sidebar weg, Wissen-Tab weg, Signale-Action weg
- Wissen-Tab faellt (Q&A jetzt im KI-Workspace)
- Edit-Tab faellt (Pencil-Icon im Header)
- **Activities-Hybrid**: Timeline kompakt + Klick auf Activity oeffnet Detail-Sheet rechts mit Risiken/Einwaende/Naechste Schritte/Teilnehmer/Zusammenfassung — analog Task-Sheet auf Mein Tag

**FEAT-665 — Dashboard zu KI-Analyse-Cockpit** *(mittel, Frontend-Restyling auf Mein-Tag-Pattern)*
- Title: "KI-Analyse-Cockpit" (war: Dashboard)
- Action-Bar oben (Task / E-Mail / Meeting / Anruf / Notiz — kontextlos, da kein Deal-Kontext)
- LINKS 2/3 = KI-Workspace (Hybrid wie Mein Tag) — Berichts-Buttons: `[Pipeline-Snapshot]` `[Top-Chancen]` `[Conversion-Rate]` `[Forecast]` `[Win/Loss-Analyse]` `[Stagnierende Deals]`
- RECHTS 1/3 = Kalender (wie Mein Tag — auch Termine/Mails fuer GF/VL setzen)
- KPI-Cards raus
- Top-Chancen-Tabelle raus (jetzt Berichts-Button "Top-Chancen" im KI-Workspace, mit Pipeline-Switcher)
- DashboardSearch geht im KI-Workspace auf

**FEAT-666 — KI-Inventur (Aufraeumen + Win/Loss-Auto-Trigger + Sidebar-Restruktur)** *(mittel, gemischt Frontend + 1 Backend-Trigger)*
- **Firmen + Kontakte Sparkles-Cards** (Placeholder seit V3.1) → ERSATZLOS WEG
- **"KI-Reife"-Feld umbenennen → "AI-Bereitschaft"** (war kein KI-Feature, nur Bewertungs-Dropdown — schema-kompatibel, nur Label)
- **Pipeline-NL-Suche → klassische Type-Ahead-Suche** (analog `/deals` neu)
- Pipeline-Kanban-Visualisierung bleibt unangetastet (klassische Stage-Ansicht ist OK)
- Auto-Reply-Extractor auf Kontakten bleibt (echte Hilfe — Alert-Box mit Out-of-Office-Datum)
- **Win/Loss-Insight: Auto-Trigger + Berichts-Button** (einziger Backend-Touch in V6.6):
  - Bei Stage-Wechsel auf won/lost → automatischer KI-Call → Pflicht-Datenfluss zu Intelligence Studio (unabhaengig vom User-Klick)
  - PLUS Berichts-Button "Win/Loss-Analyse" im Deal-KI-Workspace fuer manuellen Zugriff/Erweitern
- Multiplikatoren KI-frei (heute schon, bleibt so) — V8+/Strategie-Item
- Kein KI-Workspace auf Firmen/Kontakte/Multiplikatoren — Mein Tag + Deal-Detail reichen
- **Sidebar V6.6 (Admin-Sicht):**
  1. ANALYSE (rauf nach oben): Dashboard
  2. OPERATIV: Mein Tag, Focus, Kalender
  3. ARBEITSBEREICHE: Deals, Pipeline, Firmen, Kontakte, Multiplikatoren
  4. VERWALTUNG bleibt unveraendert (V7-Item)
  - "Meine Performance" raus (in Mein-Tag-KI-Workspace migriert)

### V6.6 Out of Scope

**NICHT in V6.6:**
- **Drill-Down-Bauen** — Mitarbeiter sollen mit KI arbeiten lernen, nicht Drill-Downs nachgebaut bekommen (User-Direktive 2026-05-09)
- **Chef-Sicht-Drill-Downs** — kommen mit V7 (Multi-User + Rollen-Sichtbarkeit)
- **Mitarbeiter-Sicht-Differenzierung** — kommt mit V7
- **Pipeline-Stages-Cleanup (BL-439)** — User macht selbst in Settings (user-self-served, V6.6-Defer zurueckgezogen)
- **Firmen/Kontakte/Proposals/Multiplikatoren-Detail-Seiten** — bleiben klassisch in V6.6 (kein KI-Workspace, "spaeter mal wenn Bedarf entsteht")
- **Settings-Hierarchie** — erst nach V7 (wenn Rollenverteilung steht)
- **Verwaltungs-Bereich-Restruktur** — kommt mit V7
- **Inhouse-Chat-Loesung** — NICHT bauen (externe Tools per API in V8+, BL-443)
- **NL-Automation-Regeln (Sculptor-Pattern)** — V7.5 (BL-435)
- **Custom-Reports** — V7.6 (BL-442, folgt zwingend nach V7.5 wegen Architektur-Abhaengigkeit)
- **Externe Kommunikations-API (Slack/Teams/WhatsApp)** — V8+ (BL-443)
- **Externe Kunden-Kommunikation (z.B. WhatsApp-Channel)** — V8+, separates Business-Thema
- **Feiertag-Logik (DE/NL)** — Backlog (BL-444), eigener Slice nach V7
- **Multiplikatoren-KI-Erweiterung oder ersatzloser Wegfall** — V8+/Strategie-Item

### V6.6 Constraints

- **Internal-Test-Mode bleibt aktiv** — kein Wechsel zu Production-Compliance (User-Direktive 2026-05-01).
- **KEINE neuen npm-Packages** — V6.6 nutzt nur Bestehendes (Bedrock + RAG + Whisper-Adapter + pdfmake + @dnd-kit + bestehende UI-Components).
- **KEINE neuen Container** — kein Asterisk/Whisper/Bedrock-Anbieter-Wechsel im UI-Sprint.
- **KEINE Schema-Migration ausser additiv** — Win/Loss-Auto-Trigger schreibt in bestehendes audit_log + bestehende ai_signal_extract_run-Tabellen, optional eine Spalte fuer working_hours-Setting in user_profiles.
- **V7-Multi-User-Kompatibilitaet** — alle Layout-Entscheidungen muessen V7-Differenzierung (Admin/Mitarbeiter/Chef) erlauben. Keine User-Daten hardcoden, keine globalen Sicht-Flags ohne User-Scope.
- **KI-Workspace-Component muss reusable sein** — gleiche Component fuer 3 Hauptarbeitsplaetze (Mein Tag, Deal-Detail, Dashboard).
- **Style Guide V2 verbindlich** fuer alle UI-Aenderungen (Brand-Tokens aus V6.5).
- **V2-Sidebar-Layout (Onboarding-Pattern) + deutsche UI-Begriffe Pflicht** (per User-Memory `feedback_v2_sidebar_pflicht`).
- **Atomic Commits per Slice** — pro Slice ein Commit, damit Rollback einzelner Slices moeglich.
- **Pipeline-Progress als impliziter Leitstern** — KEIN Text in der UI ("wir werden nicht die Aufgabe des Vertrieblichen irgendwo hinschreiben"), aber Layout-Priorisierung folgt: Pipeline-Bewegung > Aktivitaeten-Counts.

### V6.6 Risks & Assumptions

**Risiken:**
- **R1 — KI-Workspace-Reuse-Komplexitaet:** Drei Hauptarbeitsplaetze haben unterschiedliche Berichts-Listen + Kontext-Daten. Wenn die Component zu generisch wird, leidet Performance / Code-Klarheit. **Mitigation:** /architecture entscheidet zwischen "ein Component mit Konfig" vs "ein Pattern mit drei spezifischen Implementierungen". Erste Schaetzung: ein Component mit kontextualisierten Berichts-Listen pro Arbeitsplatz-Typ.
- **R2 — /performance-Migration-Datenverlust:** /performance hat heute Goal-Cards + Wochen-Check + Tagesaufloesung. Wenn nur Tagesanalyse-Bericht den Inhalt traegt, gehen ggf. Funktionen unter (z.B. Tages-Drill-Auf-Wochen). **Mitigation:** /architecture erstellt Mapping-Tabelle "Was war auf /performance, wo ist es jetzt?". Keine Funktion darf wortlos verschwinden.
- **R3 — Deal-Detail-Layout-Swap-Regression:** 3 KI-Module + 2 Tabs zu konsolidieren beruehrt mind. 6 Components (DealBriefing, DealKnowledgeTab, SignalExtractAction, DealEditTab, DealTimeline, DealActivitySheet). Hoher Regress-Risiko. **Mitigation:** Slice-Schnitt feiner (3-4 Slices fuer FEAT-664), Live-Smoke pro Slice, nicht alles in einem Schritt.
- **R4 — Win/Loss-Auto-Trigger duplicate runs:** Stage-Wechsel kann mehrfach hintereinander passieren (won → lost → won). Wenn Auto-Trigger jeden Wechsel feuert, entstehen Duplicate-Runs in Intelligence-Studio. **Mitigation:** Idempotenz via `(deal_id, target_status)` UNIQUE-Konstraint oder Time-Window-Throttle (kein neuer Run innerhalb 5 Min). /architecture entscheidet.
- **R5 — Sidebar-Reorder bricht User-Mental-Model:** Sidebar-Reorder kann User irritieren (alle alten Eintragspunkte verschoben). **Mitigation:** Style Guide V2 bleibt, nur Reorder + 1 Eintrag-Removal (Performance), keine Eintrag-Umbenennungen, keine Icon-Wechsel.
- **R6 — Voice-Eingabe im KI-Workspace ohne Bedrock-Stress-Test:** Frage-Eingabe via Sprache ist neu (heute nur isolierte Voice-Pages wie /pipeline-suche). KI-Workspace bekommt Voice-Stream → Bedrock-Call mehrfach taeglich pro User. **Mitigation:** Nutzt bestehende Whisper-Adapter-Infra, aber /architecture muss Stress-Test-Plan definieren (Concurrency, Rate-Limit, Fallback bei Bedrock-Error).

**Annahmen:**
- A1: KI-Workspace-Component ist neu, aber Bedrock-Pfade fuer Tagesanalyse, Briefing, Signale, Win/Loss existieren bereits — V6.6 ist UI-Konsolidierung, keine neue KI-Logik.
- A2: 5 Berichts-Buttons pro Arbeitsplatz sind ausreichend in V6.6 — Custom-Reports kommen erst in V7.6.
- A3: /performance-Migration ist additiv ueber den Tagesanalyse-Bericht moeglich — kein User braucht heute eine Funktion, die in der Tagesanalyse nicht erscheint.
- A4: Win/Loss-Auto-Trigger nutzt bestehende ai_signal_extract_run-Infra, kein neuer Background-Job-Typ noetig.
- A5: Working-Hours-Setting kann in user_profiles (oder users.preferences JSONB) ohne neue Tabelle gespeichert werden.
- A6: V7-Multi-User-Kompatibilitaet ist mit user_id-Scope auf allen neuen Settings gewaehrleistet — keine globalen Konfig-Flags.

### V6.6 Success Criteria

- KI-Workspace-Component ist auf 3 Hauptarbeitsplaetzen (Mein Tag, Deal-Detail, Dashboard) im Einsatz — gleiches Pattern (Berichts-Buttons + Frage-Eingabe + Antwort-Fenster), unterschiedliche kontextualisierte Berichts-Listen
- /performance-Seite und Sidebar-Eintrag "Meine Performance" verschwunden
- "4 Hinweise"-Pill und "4 offene Punkte"-Zeile auf Mein Tag verschwunden
- Deal-Detail hat 1 KI-Workspace statt 3 KI-Modulen (Briefing-Sidebar weg, Wissen-Tab weg, Signale-Action weg, Edit-Tab weg)
- Activity-Sheet auf Deal-Detail zeigt Risiken/Einwaende/Naechste Schritte/Teilnehmer/Zusammenfassung beim Klick auf Timeline-Item
- Dashboard heisst "KI-Analyse-Cockpit", hat KI-Workspace links + Kalender rechts, keine KPI-Cards / keine Top-Chancen-Tabelle
- Sparkles-Cards auf Firmen/Kontakte sind weg
- "KI-Reife"-Feld heisst jetzt "AI-Bereitschaft" (nur Label, kein Schema-Bruch)
- Pipeline-NL-Suche durch Type-Ahead ersetzt
- Win/Loss-Auto-Trigger feuert bei Stage-Wechsel auf won/lost und schreibt in ai_signal_extract_run + audit_log
- Sidebar-Reorder live (ANALYSE → OPERATIV → ARBEITSBEREICHE → VERWALTUNG)
- Kalender-Range default 06:00–21:00, Working-Hours-Setting pro User funktioniert, "Voller Tag/Nur Arbeitstag"-Toggle live
- Deals-Listen-Seite hat Top-10 + Karten-Grid + 2 Sektionen + Type-Ahead, Pipeline-Switcher filtert alles
- Vitest gruen (kein Regress auf bestehende Suite), Lint clean
- Live-Smoke 7 Pages PASS: Mein Tag, /deals (Liste), /pipeline, ein Deal-Detail (mit Activity-Sheet-Klick), Dashboard, Kalender, ein Won/Lost-Stage-Wechsel mit Auto-Trigger-Verifikation in audit_log
- 0 neue Regressions auf V6.0..V6.5-Funktionalitaet
- V7-Multi-User-Kompatibilitaet sichtbar in Code: alle neuen Settings haben user_id-Scope

### V6.6 Open Questions (fuer /architecture)

**KI-Workspace-Component-Architektur:**
- F1: **Component-Wiederverwendung** — Eine generische `<KIWorkspace>` Component mit Konfig-Prop (Berichts-Liste + Context-Source) ODER ein Pattern (Hook/Layout) und drei spezifische Implementierungen? Empfehlung: Component mit Konfig, da Berichts-Buttons-Layout + Frage-Eingabe + Antwort-Fenster identisch sind.
- F2: **Berichts-Button-Streaming vs Polling** — Bedrock-Antworten fuer Tagesanalyse koennen mehrere Sekunden brauchen. UI-Pattern: Streaming-Tokens (wie Claude-UI), Polling auf done-Flag, oder synchroner Spinner+Result? Empfehlung: Streaming wenn Bedrock-Pfad es unterstuetzt, sonst Polling.
- F3: **Voice-Input-Architektur** — Voice-Stream geht durch Whisper-Adapter (bestehend) → Text → Bedrock-Call. Oder direkt durch Bedrock-Voice-Endpoint? Empfehlung: Whisper-Pfad nutzen (bestehend, EU-konform via Azure-Whisper-Code-Ready aus V5.2).
- F4: **Kontext-Scope pro Arbeitsplatz** — KI-Workspace auf Mein Tag braucht Tages-Kontext (alle Deals + Activities heute), auf Deal-Detail braucht Deal-Kontext (Timeline + Tasks + Proposals). Wie wird der Kontext pro Berichts-Button definiert/dokumentiert? Empfehlung: Konfig-Prop mit Server-Action-Pfad pro Berichts-Button.

**Performance-Migration:**
- F5: **Funktions-Mapping** — Welche /performance-Funktionen gehen wo hin? (Goal-Cards, Wochen-Check, Tagesaufloesung, Forecast). Empfehlung: /architecture erstellt explizites Mapping-Dokument bevor /performance geloescht wird.
- F6: **/performance-Route deletion oder redirect** — Komplett loeschen ODER redirect zu /mein-tag? Empfehlung: redirect mit deprecation-toast fuer 1 Sprint, dann loeschen.

**Deal-Detail Activity-Sheet:**
- F7: **Activity-Sheet-Variante** — Neuer Sheet-Component oder Reuse des Mein-Tag Task-Sheet (`task-sheet.tsx` aus V3.1)? Empfehlung: Reuse mit Type-Erweiterung, da Task-Sheet bereits Risiken/Einwaende rendert.
- F8: **Activity-Sheet-Inhalt-Quellen** — Risiken/Einwaende/Naechste Schritte sind heute nur fuer Meetings via Bedrock-Summary verfuegbar. Soll der Sheet auch fuer E-Mails / Anrufe / Notizen entsprechende Sektionen zeigen, oder nur fuer Meeting-Activity? Empfehlung: nur fuer Activities mit Bedrock-Output (Meetings, lange E-Mails), bei anderen Sheet kompakt mit Basis-Daten.

**Win/Loss-Auto-Trigger:**
- F9: **Trigger-Hook-Position** — In `pipeline.moveDealToStage` (existiert seit V6.2 Workflow-Engine) als zusaetzlicher Hook, oder als separater workflow_action vom Typ `auto_winloss_extract`? Empfehlung: separater workflow_action, sodass das System konsistent ueber V6.2-Workflow-Engine laeuft und im Audit-Log mit anderen Actions erscheint.
- F10: **Idempotenz-Strategie** — UNIQUE auf (deal_id, target_status, run_type) ODER Time-Window-Throttle? Empfehlung: UNIQUE auf (deal_id, target_status) + ON CONFLICT DO NOTHING fuer Idempotenz, plus 5-Min-Time-Window fuer Stage-Toggling-Edge-Cases.
- F11: **Intelligence-Studio-Datenfluss** — Direct-Insert in `intelligence_studio.win_loss_runs` (oder aequivalente Tabelle), oder wieder ueber Read-API wie V6.2 Campaign-Read-API? Empfehlung: Read-API-Pattern beibehalten (FEAT-622 etabliert) — Auto-Trigger schreibt nur lokal, Studio pollt.

**Kalender-Polish:**
- F12: **Working-Hours-Setting-Speicherung** — `users.preferences` JSONB, `user_profiles.working_hours_start/end`, oder neue `user_calendar_preferences` Tabelle? Empfehlung: `user_profiles.working_hours_start/end` als TIME-Spalten (additive Migration).
- F13: **"Voller Tag/Nur Arbeitstag"-Toggle-Persistenz** — Session (verliert sich) oder Setting? Empfehlung: localStorage pro User (kein DB-Roundtrip), default "Voller Tag" wenn keine Working-Hours gesetzt.

**Sidebar:**
- F14: **Sidebar-Reorder ohne Component-Bruch** — Sidebar-Component ist zentral (`cockpit/src/components/sidebar.tsx`). Reorder kann VERWALTUNG-Bereich nicht beruehren (V7-Item). Empfehlung: Reorder nur in NAVIGATION-Section (ANALYSE/OPERATIV/ARBEITSBEREICHE), VERWALTUNG bleibt unangetastet.

**Slice-Schnitt:**
- F15: **Slice-Anzahl** — Empfehlung: 7 Slices
  - SLC-661: KI-Workspace-Component (reusable, ohne kontextualisierte Berichts-Implementierungen)
  - SLC-662: Mein Tag — Hybrid-Workspace + 4-Hinweise+Punkte raus + /performance-Migration + Sidebar-Eintrag raus + Tagesanalyse-Bericht im neuen Pattern
  - SLC-663: Deals-Listen-Seite — Top-10 + Karten-Grid + Type-Ahead + 2 Sektionen + Pipeline-Switcher
  - SLC-664: Deal-Detail-Layout-Swap — Header + Action-Bar + KI-Workspace 2/3 + Tabs 1/3 + 3 KI-Module konsolidieren
  - SLC-665: Activity-Sheet-Hybrid + Win/Loss-Auto-Trigger (Backend-Touch)
  - SLC-666: Dashboard zu KI-Analyse-Cockpit
  - SLC-667: KI-Inventur (Sparkles weg, NL-Suche zu Type-Ahead, AI-Bereitschaft-Rename, Sidebar-Reorder, Kalender-Polish)
- F16: **Reihenfolge-Disziplin** — KI-Workspace-Component (SLC-661) MUSS zuerst, da SLC-662/664/666 darauf aufbauen. Activity-Sheet (SLC-665) MUSS nach SLC-664. Empfehlung: F15-Reihenfolge zwingend.

**V7-Kompatibilitaet:**
- F17: **Berichts-Listen pro User-Rolle** — V6.6 baut Admin-Sicht. Wie wird die Berichts-Listen-Konfig V7-erweiterbar? (z.B. Mitarbeiter-Sicht hat weniger Berichte, Chef-Sicht hat Drill-Downs). Empfehlung: Berichts-Liste pro Workspace-Typ + role_filter im V7-Schritt. V6.6 nimmt nur user_id-Scope vor, role_filter ist Y6.6-out-of-scope.

### V6.6 Slicing-Vorschlag (zur /architecture-Entscheidung)

7 Slices, ~15-25h Schaetzung:

- **SLC-661** (~3-4h) — KI-Workspace-Component (reusable Frontend-Component mit Berichts-Buttons-Layout + Frage-Eingabe + Antwort-Fenster, ohne kontextualisierte Implementierungen). Frontend-only.
- **SLC-662** (~3-4h) — Mein Tag Hybrid-Workspace + Performance-Migration. Frontend-Hauptarbeit. Tagesanalyse-Bericht im neuen Pattern, /performance-Loeschung+Redirect.
- **SLC-663** (~2-3h) — Deals-Listen-Seite Restruktur. Frontend.
- **SLC-664** (~3-4h) — Deal-Detail-Layout-Swap. Frontend-Hauptarbeit, 3 KI-Module konsolidieren.
- **SLC-665** (~2-3h) — Activity-Sheet-Hybrid + Win/Loss-Auto-Trigger. Frontend (Sheet) + Backend (Trigger via V6.2-Workflow-Engine + audit_log).
- **SLC-666** (~2h) — Dashboard zu KI-Analyse-Cockpit-Restyling. Frontend.
- **SLC-667** (~2-3h) — KI-Inventur (Sparkles weg + NL-Suche zu Type-Ahead + AI-Bereitschaft-Rename + Sidebar-Reorder + Kalender-Polish + Working-Hours-Setting). Gemischt.

(7 Slices als erste Schaetzung, /architecture konsolidiert auf finale Anzahl. Reuse-Disziplin: SLC-661 zwingend zuerst, da SLC-662/664/666 die Component voraussetzen.)

### V6.6 Delivery Mode

**Internal-Tool, UI-Konsolidierung-Sprint.** UI-dominiert mit 1 Mini-Backend-Touch (Win/Loss-Auto-Trigger via V6.2-Workflow-Engine). Risikoarm aber breit (3 Hauptarbeitsplaetze + Sidebar + Kalender + Deals-Liste). Internal-Test-Mode bleibt aktiv. Kein Compliance-Sprint, kein neuer Provider, kein neues Backend-Module.

V7-Vorbereitung: alle Layout-Entscheidungen muessen V7-Multi-User-Differenzierung (Admin/Mitarbeiter/Chef) erlauben. Pre-Production-Compliance-Gate kommt separat spaeter.

**V6.6 Requirements ready for `/architecture`.**

## V7.1 — Polish-Sprint (Permissions + Drilldown-Vollausbau + Defense-in-Depth)

### V7.1 Problem statement

V7 ist released und stabil (RPT-413 Post-Launch STABIL), aber drei konkrete Luecken bleiben offen, die in der V7-Auslieferung bewusst verschoben wurden:

1. **Settings sind rollen-agnostisch:** `/settings/*` ist aktuell vollstaendig fuer alle Rollen zugaenglich. Member und Teamlead koennen Branding (Logo, Firma, Footer), Steuer-/Payment-Terms, Pipeline-Definitionen, E-Mail-Templates, Workflow-Automation, Kampagnen, Produkte und Compliance-Settings veraendern. Diese Settings sind organisationsweit — versehentliche oder boeswillige Aenderungen durch Nicht-Admins haben Cross-Team-Impact. User-Walkthrough 2026-05-14: "das muss nur Admin koennen".
2. **Drilldown ist unvollstaendig:** `/team/[user_id]/pipeline` zeigt aktuell nur eine reduzierte Deal-Liste — keine Funnel-Toggle, kein Filter, kein Pipeline-Switcher, kein Forecast. Gleiches gilt fuer `/team/[user_id]/aktivitaeten` und `/team/[user_id]/mein-tag`. Teamlead-Coaching-Sicht ist deshalb weniger maechtig als die eigene Pipeline-Sicht des Members. User-Feedback: "im Drilldown will ich genau die gleichen Toggles wie im normalen /pipeline".
3. **V7-Defense-in-Depth ist asymmetrisch:** 4 Mutate-Server-Actions haben kein `assertNotReadOnlyContext()`-Guard (ISSUE-070), und 5 Eintraege in `AUDIT_SERVER_ACTIONS_V7.md` sind stale (ISSUE-069). Heute kein Live-Exploit (Drilldown-AsyncLocalStorage-Gap ISSUE-066 ist V7.5-Mitigation), aber Doc-Symmetrie und Defense-in-Depth-Vollstaendigkeit fehlen.

### V7.1 Goal

Sichtbare User-Wuensche zuerst schliessen (Permissions + Drilldown-Vollausbau), dann V7-Defense-in-Depth nachholen. V7 wird damit production-ready fuer den ersten Drittnutzer-Test (Internal-Test-Mode bleibt formell aktiv bis Pre-Production-Compliance-Gate).

### V7.1 Primary users

- **Admin (Strategaize-Founder):** Verwaltet organisationsweite Settings ohne Risiko, dass Teamleads/Members versehentlich darauf zugreifen.
- **Teamlead:** Operative Settings (Workflow-Automation, Templates, Kampagnen) verwalten + voller Drilldown-Coaching-View mit Funnel/Filter/Forecast wie eigene Pipeline.
- **Member:** Nur eigenes Profil + Working-Hours + Meeting-Einstellungen. Settings-Sidebar zeigt keine fremden Sub-Pages.

### V7.1 V1 Scope

**FEAT-711 — Settings-Permission-Layer (rollen-basiert)**

Granulare Rollen-Permission-Matrix auf allen `/settings/*`-Sub-Pages. Permission-Check als Server-Guard (`assertRole(['admin', 'teamlead'])` oder `assertRole(['admin'])`) als first line in jeder Settings-Server-Action UND als Route-Layout-Guard. Sidebar-Visibility filtert nicht-zugaenglich Sub-Pages weg (kein 403-Flash beim Click). Settings-Landing-Page (`/settings`) zeigt nur Kacheln, die fuer die aktuelle Rolle erlaubt sind.

**Permission-Matrix V7.1:**

| Settings-Sub-Page | Admin | Teamlead | Member |
|---|---|---|---|
| Branding (Logo, Firma, Footer, Webseite, Farben) | RW | (nicht sichtbar) | (nicht sichtbar) |
| Payment-Terms / Steuern (NL/DE-VAT, Skonto-Templates, Split-Plans) | RW | (nicht sichtbar) | (nicht sichtbar) |
| Pipelines + Stages (Definitionen, Cleanup, Stage-Order) | RW | (nicht sichtbar) | (nicht sichtbar) |
| Produkte (Position-Item-Katalog) | RW | (nicht sichtbar) | (nicht sichtbar) |
| Compliance (DSGVO-Settings, Retention, Cron-Cleanup) | RW | (nicht sichtbar) | (nicht sichtbar) |
| IMAP / E-Mail-Sync | RW | (nicht sichtbar) | (nicht sichtbar) |
| Workflow-Automation (Rules, Trigger, Actions) | RW | RW | (nicht sichtbar) |
| E-Mail-Templates | RW | RW | (nicht sichtbar) |
| Kampagnen (Campaign-Settings, UTM-Mappings) | RW | RW | (nicht sichtbar) |
| Team-Verwaltung (Invite, Bulk-Reassign, Rollen) | RW | RW (eigenes Team) | (nicht sichtbar) |
| Mein Profil (Name, Telefon, Avatar, Passwort) | RW | RW | RW |
| Working-Hours (eigene Arbeitszeit) | RW | RW | RW |
| Meeting-Einstellungen + Briefing (eigene) | RW | RW | RW |

User-Entscheidung 2026-05-15: Workflow + Templates + Kampagnen sind Admin+Teamlead, weil operativ Team-relevant. Branding/Payment-Terms/Pipelines/Produkte/Compliance/IMAP bleiben strikt Admin, weil organisationsweite Tiefe-Settings.

**FEAT-712 — Drilldown-View Vollausbau (Pipeline + Aktivitaeten + Mein-Tag)**

Alle drei Drilldown-Sub-Pages (`/team/[user_id]/pipeline`, `/team/[user_id]/aktivitaeten`, `/team/[user_id]/mein-tag`) bekommen die identische Toggle-/Filter-/Forecast-Funktionalitaet wie die originalen Self-Pages, aber strikt **Read-Only**.

Konkret pro Sub-Page:

- **Pipeline-Drilldown:** Funnel-View-Toggle (Sankey/Bar), Filter (Stage, Pipeline-Switcher, Wert-Range, Datum, Kampagne), Forecast-Modi (Weighted/Best/Worst), Suche. KEINE Stage-Change-Buttons, KEINE Edit-Form, KEINE Bulk-Aktionen.
- **Aktivitaeten-Drilldown:** Filter (Typ: Call/Mail/Meeting/Task, Datum, Status, Stage), Tabs (Diese Woche / Naechste Woche / Ueberfaellig / Erledigt), Type-Ahead-Suche. KEINE Create-Activity, KEINE Edit-Activity, KEINE Complete-Toggle.
- **Mein-Tag-Drilldown:** KI-Workspace-Block (Berichts-Buttons + Frage + Antwort wie eigenes Mein Tag, scoped auf target_user_id), Quick-Action-Karten (read-only Statistik), Pipeline-Snapshot. KEINE Notiz-Erstellung, KEINE Done-Toggle, KEINE Mutate-Actions im KI-Workspace.

Implementation-Hint (nicht-bindend, /architecture entscheidet): die `/pipeline`-/`/aktivitaeten`-/`/mein-tag`-Page-Components mit zusaetzlichem `viewAsUserId`-Prop wiederverwenden statt eigener Drilldown-Variante. Filter scopen auf `owner_user_id = target_user_id`. Read-Only-Context via SLC-706-Layout-Wrap aktiv (ISSUE-066-Gap weiter via V7.5-Mitigation geschlossen — V7.1 nutzt nur den existierenden Layer).

**FEAT-713 — V7-Defense-in-Depth Polish**

Zwei zusammenhaengende Hygiene-Items als ein Slice gebuendelt:

- **ISSUE-070 — 4× `assertNotReadOnlyContext()`-Guard** als first line in: `cockpit/src/lib/team/bulk-reassign-actions.ts:bulkReassignApply`, `cockpit/src/components/insights/insight-actions.ts:saveInsight`, `cockpit/src/lib/settings/working-hours-actions.ts:updateWorkingHoursSettings`, `cockpit/src/lib/ki-workspace/reports/winloss.ts:persistManualRun`. Plus 4 Vitest-Mock-Tests (RED-GREEN-Pattern: Mock setzt Read-Only-Context, Action wird mit Error abgewiesen).
- **ISSUE-069 — Audit-Doc-Sync:** `docs/AUDIT_SERVER_ACTIONS_V7.md` um 5 fehlende Eintraege erweitern (bulkReassignPreview, bulkReassignApply, working-hours-actions, winloss.persistManualRun, lib/audit.ts-Helpers) und 1 Fehlklassifizierung in `components/insights/insight-actions.ts:201` korrigieren ("wrapper" → "macht selbst INSERT").

Heute kein Exploit-Pfad (V7.1 setzt ihn auch nicht voraus), aber bei zukuenftiger Drilldown-Erweiterung (FEAT-712) wuerden die fehlenden Guards Defense-in-Depth-Luecken hinterlassen. Deshalb hier mit-fixen, NICHT erst nach V7.5.

### V7.1 Out of Scope

- **ISSUE-066 AsyncLocalStorage-Drilldown-Gap-Fix** bleibt fuer V7.5 (Middleware-basierter Pfad-Check setzt `X-Read-Only-Mode: 1` Header, `assertNotReadOnlyContext()` liest beides). V7.1 verlaesst sich auf den bestehenden Layout-Wrap aus SLC-706.
- **Audit-Trail-Erweiterung auf Settings-Aenderungen** (`settings_branding_update` etc.) ist Nice-to-Have aber NICHT V7.1-V1. Wenn FEAT-711-Implementation entdeckt, dass das Audit-Pattern fehlt, wird es als V7.2-Item ge-backloggt.
- **Granulare Settings-Audit-Reports** (Wer hat wann was geaendert) — V7.6 Custom-Reports.
- **Bulk-Settings-Import/Export** — kein Bedarf, kein Item.
- **Custom-Permission-Layer** (User-defined Roles ueber Admin/Teamlead/Member hinaus) — bleibt out-of-scope bis ein konkreter Drittnutzer-Bedarf existiert.
- **Settings-Workspace-Multi-Tenant-Switch** — V7 ist Single-Tenant-Inhouse, kein Tenant-Switch im Settings-Bereich.

### V7.1 Core Features

| ID | Feature | Type | Prio | BL-Origin |
|---|---|---|---|---|
| FEAT-711 | Settings-Permission-Layer (rollen-basiert) | new | high | BL-469 |
| FEAT-712 | Drilldown-View Vollausbau (Pipeline + Aktivitaeten + Mein-Tag) | improvement | medium | BL-468 |
| FEAT-713 | V7-Defense-in-Depth Polish (Guards + Doc-Sync) | improvement | medium | BL-466 |

### V7.1 Constraints

- **Internal-Test-Mode bleibt aktiv** — V7.1 macht V7 production-readier, aber Compliance-Gate bleibt vor erstem Live-Drittnutzer-Call (ISSUE-042 + Anwaltspruefung COMPLIANCE.md).
- **Keine neuen Provider, keine neue Infrastruktur, keine neue Datenbank** — V7.1 ist Pure-App-Polish auf bestehendem V7-Stack (Multi-User-RLS aus SLC-702 + Read-Only-Context aus SLC-706 + Bulk-Reassign-Pfad aus SLC-707).
- **Keine Schema-Migration zwingend** — FEAT-711 nutzt existierende `profiles.role`-Spalte, FEAT-712 ist UI-Refactor, FEAT-713 ist Code-Patches. Falls FEAT-711-Audit-Trail-Erweiterung doch eine neue audit_log-Action braucht, ist das additiv (`audit_log.action`-String).
- **TDD-Mandate fuer FEAT-711-Permission-Guards** — RLS- + Server-Action-Tests vor Implementation (Live-DB-Tests gegen Coolify-DB-Pattern, vgl. `__tests__/team/*` aus SLC-702..707).
- **Pattern-Reuse-First** (CLAUDE.md Core-Default #5): FEAT-712 muss die existierenden `/pipeline`-/`/aktivitaeten`-/`/mein-tag`-Components wiederverwenden, NICHT als Drilldown-Variante neu schreiben. FEAT-711 muss bestehende `assertRole`-Pattern aus `cockpit/src/lib/auth/*` reusen.
- **V7-Pattern weiterverwenden:** Read-Only-Context aus SLC-706, V7-Helper-Functions aus MIG-034, Bulk-Reassign-Pfad-Style aus SLC-707.

### V7.1 Risks / Assumptions

- **Risk:** FEAT-712 Drilldown-Vollausbau triggert subtile Filter-State-Cross-Pollution wenn Page-Component naiv wiederverwendet wird (z.B. localStorage-Key fuer Pipeline-Filter ueberschreibt Self-Filter). Mitigation: jeder Filter-Persist-Key muss `viewAsUserId` als Prefix bekommen ODER waehrend Drilldown-Render keinen Persist machen.
- **Risk:** FEAT-711 versteckt Settings-Sub-Pages in Sidebar, aber Direct-URL-Navigation muss als 403/Redirect blocken — sonst URL-Sharing-Bug.
- **Risk:** FEAT-713 ISSUE-070-Guard auf `bulk-reassign-actions.ts` greift heute nicht (Drilldown-Context propagiert nicht via AsyncLocalStorage in Server-Actions, ISSUE-066). Vitest-Tests muessen darum den Context explizit setzen (Mock-Layer), nicht via Page-Render.
- **Assumption:** Bestehende `assertRole`-Helper existiert in `cockpit/src/lib/auth/*` (sollte aus V7-Layer kommen — sonst FEAT-711-Slice-1 wird Helper-Creation). /architecture verifiziert.
- **Assumption:** Pipeline-/Aktivitaeten-/Mein-Tag-Components haben bereits owner_user_id-Filter (sonst RLS macht es transparent, aber Filter-UI muss target_user_id setzen).
- **Risk:** Sprint-Reihenfolge (FEAT-711 → 712 → 713) bedeutet: FEAT-713 wartet bis Slice-3. Bei Zeit-Druck kann FEAT-713 als Mini-Hotfix vor V7.1-Release vorgezogen werden (~30 min Aufwand, kein Konflikt mit 711/712).

### V7.1 Success Criteria

- **FEAT-711:** Member-Login auf `/settings/branding` (oder jede Admin-only-Sub-Page) returnt 403 oder Redirect auf `/settings` mit Hinweis. Sidebar zeigt fuer Member nur "Mein Profil / Working-Hours / Meeting-Einstellungen". Teamlead sieht Workflow + Templates + Kampagnen, aber nicht Branding/Pipelines. Admin sieht alles wie heute. Live-Smoke mit allen 3 Rollen.
- **FEAT-712:** `/team/[user_id]/pipeline` zeigt Funnel-Toggle + alle Filter aus `/pipeline` (Identitaets-Test mit gleicher View-Logik), Stage-Change/Edit-Buttons sind nicht sichtbar (oder disabled+grey). Analog fuer `/aktivitaeten` und `/mein-tag`. Filter-State persistiert nicht cross-User. Live-Smoke aus Teamlead-Sicht mit echtem Member.
- **FEAT-713:** 4 Vitest-Mock-Tests bestaetigen Guard-Wirkung (assertNotReadOnlyContext throws). `docs/AUDIT_SERVER_ACTIONS_V7.md` enthaelt 5 neue Eintraege + 1 korrigierte Klassifizierung. Vitest-Suite (`npm run test:all`) bleibt 100% gruen.
- **Gesamt:** V7.1 PASS heisst: Browser-Smoke aus Admin/Teamlead/Member-Sicht zeigt jeweils nur erlaubte Pages, Drilldown mit echtem Member aus Teamlead-Sicht zeigt volle Toggles ohne Mutate-Buttons, `npm run test:all` gruen, audit_log-Trail seit Deploy aktiv.

### V7.1 Open Questions

1. **Settings-Audit-Trail-Granularitaet:** Soll FEAT-711 zusaetzlich `audit_log.action='settings_*_update'`-Eintraege schreiben? Aktuell teils vorhanden (branding-update? campaign-update?), teils nicht. **Klaerung in /architecture.** Default: nur wenn ein Pattern bereits existiert, wird konsistent erweitert. Sonst V7.2-Item.
2. **Sidebar-Settings-Section bei leerem Member-Scope:** Member hat nur 3 Sub-Pages (Profil/Working-Hours/Meeting). Eigene Settings-Section in Sidebar oder einfach Top-Level "Mein Profil"? **Klaerung in /architecture mit UI-Skizze.**
3. **403 vs Redirect:** Wenn Member auf Admin-only-URL klickt — explizite 403-Seite oder Soft-Redirect auf `/settings` mit Toast "Keine Berechtigung"? **/architecture entscheidet basierend auf Style-Guide-V2.**
4. **Drilldown-`viewAsUserId`-Prop vs Wrapper-Component:** Original-Pages mit Prop erweitern oder neue `DrilldownPipelinePage` als Wrapper, die `<PipelinePage scope={...} readonly />` rendert? **Architektur-Entscheidung in /architecture** — beide haben Reuse-Tradeoffs.
5. **Filter-State-Storage-Key:** localStorage-Key-Schema fuer Drilldown? `pipeline-filters-${viewAsUserId ?? "self"}`? Oder Drilldown persistiert gar nicht? **/architecture klaert.**
6. **FEAT-713-Test-Mock-Pattern:** Soll Vitest-Mock fuer Read-Only-Context per `vi.mock("cockpit/src/lib/auth/read-only-context", ...)` oder per direkter `runWithReadOnlyContext`-Wrapping im Test laufen? **/architecture klaert mit Test-Strategie.**

### V7.1 Slice-Plan (vorlaeufige Schaetzung — /slice-planning konsolidiert)

Reihenfolge nach User-Entscheidung 2026-05-15: **sichtbar zuerst**.

- **SLC-711** (~4-6h) — FEAT-711 Settings-Permission-Layer. Pflicht: Server-Guard + Route-Layout + Sidebar-Visibility + Live-Smoke alle 3 Rollen. Live-DB-Tests fuer Permission-Matrix.
- **SLC-712** (~5-8h) — FEAT-712 Drilldown-Vollausbau. Pflicht: Page-Component-Reuse, Filter-State-Isolation, 3 Sub-Pages, Live-Smoke Teamlead-Sicht. Ggf. in 2 Sub-Slices wenn `viewAsUserId`-Refactor zu gross.
- **SLC-713** (~30 min - 1h) — FEAT-713 Defense-in-Depth-Polish. 4 Guards + Vitest-Mocks + Doc-Sync.

Total V7.1-Aufwand: ~10-15h reine Implementation + QA + Live-Smoke.

### V7.1 Delivery Mode

**Internal-Tool, Polish-Sprint.** Kein neuer Provider, keine neue Datenbank, keine Schema-Migration (vermutlich), kein Compliance-Touch. Internal-Test-Mode bleibt aktiv. V7.1-PASS heisst: V7 bleibt deployed wie aktuell, plus 3 Slices als kumulative Aenderungen auf demselben Image-Stand.

**V7.1 Requirements ready for `/architecture`.**

## V7.5 — Natural-Language Workflow-Sculptor (BL-435)

### V7.5 Problem statement

Das Business-System hat seit V6.2 einen funktionalen Workflow-Automation-Rule-Builder (FEAT-621): drei Trigger-Events (`deal.stage_changed`, `deal.created`, `activity.created`), vier Actions (`create_task`, `send_email_template`, `create_activity`, `update_field`), Anti-Loop-Marker, Trockenlauf-Modul (DEC-132), Audit-Log-Side-Effect. **Aber:** der einzige Eingabe-Pfad ist heute ein 4-Step-Click-Wizard auf `/settings/workflow-automation`. Drei Probleme aus realer Nutzung:

1. **Click-Wizard ist Setup-Heavy:** User muss sich mental erst ein Datenmodell aufbauen (Trigger-Auswahl → Condition-Builder → Action-Builder → Trockenlauf-Pruefung), bevor er die eigentliche geschaeftliche Absicht ausdruecken kann. Mein-Tag-Workflow-Beispiel "Wenn ein Deal in Phase Angebot mehr als 5 Tage unbeantwortet ist, schreib mir das morgens in Mein Tag und schlag eine Follow-up-Mail vor" landet heute als unbeantworteter Wunsch — der User fasst es als Gedanken im KI-Workspace, nicht als Regel. **Klarsprache → Regel-Persistierung ist heute der fehlende Bruecken-Layer.**
2. **NL-Workflow-UI-Welle:** Clay 'Sculptor' (Mai 2026), Microsoft Copilot, Zapier-NL-Assistant, Make.com-AI-Builder bringen alle aehnliche NL-Builder. Strategaize ist heute funktional komplett (Trigger+Actions+Anti-Loop+Audit), nur der Eingabe-Layer fehlt. AI-FIRST.ai (Wettbewerber, fast identisches Bausteine-Modell, Felix) wird voraussichtlich genau dort einsteigen — die NL-Builder-Welle ist also auch Wettbewerbs-Hebel, nicht nur Komfort.
3. **ISSUE-066 muss spaetestens vor erstem produktivem Multi-User-Nutzer geschlossen werden:** SLC-706 Drilldown-Mutate-Lockdown hat eine bekannte Defense-in-Depth-Luecke — `AsyncLocalStorage`-basierter Read-Only-Context propagiert NICHT in Server-Action-Requests. Heute UX-mitigiert (Mutate-Buttons im Drilldown ausgeblendet), aber Direct-Server-Action-Call via DevTools wuerde mutate-en. Cross-Team-RLS greift weiter, aber Same-Team-Bypass des Read-Only-UX-Versprechens ist offen. Internal-Test-Mode-Risiko vernachlaessigbar, aber **vor Drittnutzer-Customer-Ship muss das geschlossen sein** — und V7.5 ist die nahe Release-Stelle, bevor V8+ externe Kommunikation oeffnet.

V7.5 schliesst diese drei Luecken in einem buendelfreundlichen Release: NL-Sculptor-Layer ueber V6.2 + ISSUE-066-Middleware-Mitigation. Differenzierungs-Position gegenueber Microsoft-Copilot-Pfad: **nicht autonomes Handeln, sondern gemeinsames Programmieren von Regeln zwischen Berater und Klient.** Die Regel ist als editierbare Karte sichtbar, der Klient kann sie nachvollziehen, Trockenlauf zeigt Wirkung — kein Black-Box-Agent.

### V7.5 Goal

Auf der Mein-Tag-Seite eine Klarsprache-Eingabe (Text + Voice) bereitstellen, die Bedrock Claude Sonnet in eine strikt V6.2-schema-konforme Automation-Regel uebersetzt. Trockenlauf-Karte als Pflicht-Schritt vor Apply. Regel wird in der bestehenden `automation_rules`-Tabelle persistiert und vom bestehenden V6.2-Dispatcher + Executor + Cron-Fallback ausgefuehrt. Plus: ISSUE-066-Middleware-Mitigation schliesst Defense-in-Depth-Gap fuer V7-Drilldown.

### V7.5 Primary users

- **Admin (Strategaize-Founder):** Hauptnutzer. Formuliert Mein-Tag-Workflows ad-hoc per Sprache/Text waehrend des Tagesgeschaefts. Nicht waehrend Settings-Wartung.
- **Teamlead:** Darf Regeln formulieren, soweit V7.1-Permission-Matrix Workflow-Automation auf RW fuer Teamlead setzt. Same NL-Surface wie Admin auf Mein Tag.
- **Member:** **KEIN** NL-Surface auf Mein Tag (Permission-Matrix V7.1: Workflow-Automation = `(nicht sichtbar)` fuer Member). Member sehen die NL-Box NICHT.

### V7.5 V1 Scope

**FEAT-751 — Natural-Language Workflow-Sculptor (NL-Adapter + Mein-Tag-Surface + Trockenlauf + Voice + Inspection)**

NL-Eingabe-Karte auf Mein Tag (im KI-Workspace-Bereich, konsistent zum V6.6-Hybrid-Pattern). User tippt oder spricht eine Regel-Absicht ("Wenn ein Deal in Phase Angebot mehr als 5 Tage unbeantwortet ist..."). Bedrock-Adapter (`cockpit/src/lib/automation/sculptor.ts` — neu) mappt strict 1:1 in V6.2-Schema:
- Eines der 3 Trigger-Events (`deal.stage_changed`, `deal.created`, `activity.created`)
- 0..n AND-only Conditions als `{field, op, value}`-Array (Whitelist-Felder aus V6.2)
- 1..n Actions als geordnetes `{type, params, assignee?}`-Array, beschraenkt auf die 4 V6.2-Action-Types

Bei Out-of-Domain-Input (z.B. "Wenn der Kunde mir eine Sprachnachricht schickt..." → kein V6.2-Trigger) returnt der Adapter **strukturierter Reject** mit Hinweis "Diese Regel braucht einen Trigger-Typ, der heute nicht unterstuetzt wird. Vorschlag: stattdessen `activity.created` mit Type=Call/E-Mail nutzen — oder Backlog-Eintrag fuer V8+".

Bei erfolgreichem Mapping zeigt das UI:
1. **Klarsprache-Karte** (oben) — User sieht seinen Original-Text + von Bedrock erkanntes Intent in Worten ("Du moechtest folgende Regel: ...")
2. **Schema-Karte** (Mitte) — editierbare Form-Felder Trigger / Conditions / Actions / Assignee (gleicher Form-Style wie V6.2-Wizard)
3. **Trockenlauf-Karte** (Pflicht, DEC-132-Reuse) — "Was waere mit den letzten 7 Tagen passiert?" Liste der getroffenen Deals/Activities + Action-Outcomes (read-only, KEIN Insert). Pflicht-Klick **"Trockenlauf anzeigen"** vor **"Regel aktivieren"**-Button.
4. **Apply** — Server Action `applyNlRule()` persistiert in `automation_rules` mit `status='active'`, `created_by=auth.uid()`, `trigger_event/trigger_config/conditions/actions` aus Form-State. Audit-Log-Eintrag `automation_rule.create_via_nl` mit `nl_input` + `sculptor_model_id` + `sculptor_cost_usd`.

**Voice-Input** (User-Direktive `feedback_voice_input_no_compromise`): Mikro-Button in der NL-Box reuse Whisper-Adapter aus V4.1 (heute openai-Default, Azure-EU Code-Ready ab V5.2). Same Adapter wie KI-Workspace-Frage-Eingabe in V6.6 — kein neuer Provider, kein neuer Endpoint.

**Inspection-Log** (`/settings/workflow-automation/nl-history` — nur fuer Admin sichtbar): letzte 50 NL-Sculpt-Aufrufe mit Original-Text, gemapptes Schema, Bedrock-Cost-USD, Reject-Reason (falls reject). Reuse `audit_log`-Query, kein eigener Table.

**FEAT-752 — Read-Only-Context Defense-in-Depth (ISSUE-066-Closure)**

Middleware-basierter Pfad-Check (`cockpit/src/middleware.ts` erweitern). Bei Request-Pfad-Match auf Regex `^\/team\/[^/]+\/` (V7-Drilldown-Route) wird Request-Header `X-Read-Only-Mode: 1` gesetzt (durch `headers.set` im NextResponse). `cockpit/src/lib/auth/read-only-context.ts:assertNotReadOnlyContext()` wird erweitert: liest AsyncLocalStorage **UND** den Header (aus `next/headers`-API). Falls eines von beiden gesetzt ist → throw. Plus Vitest-Mock-Test der den Header-Pfad explizit testet.

Dieses Pattern war im SLC-706-Quellcode-Kommentar (`cockpit/src/lib/auth/read-only-context.ts:14-19`) als Workaround-Plan dokumentiert. V7.5 setzt es um.

### V7.5 Out of Scope

- **Neue Trigger-Events** wie `deal.stage_idle` (5-Tage-Inaktivitaet) oder `activity.no_response` — der Backlog-Text BL-435 nennt Beispiele wie "Wenn Deal in Phase Angebot mehr als 5 Tage unbeantwortet ist". Diese Absicht ist im V7.5-Scope NUR aus dem Konjunktiv heraus implementierbar — Sculptor mappt sie auf existierende V6.2-Triggers + zusaetzliche Conditions (z.B. `deal.stage_changed` mit Condition `last_activity_at < now() - 5 days` nach Stage-Wechsel auf Angebot). Echte neue Trigger-Typen (Time-Based-Triggers wie "5 Tage nach X") sind V8-Item.
- **Settings-Workflow-Automation-Page-Integration:** NL-Surface kommt NUR auf Mein Tag (User-Entscheidung 2026-05-16). Der V6.2-Click-Wizard auf `/settings/workflow-automation` bleibt unveraendert. Spaetere Migration des Click-Wizards in NL-Pfad ist V7.6+.
- **Frei-Form-Schema (LLM darf neue Action-/Trigger-Typen vorschlagen):** Strict 1:1 zu V6.2-Schema (User-Entscheidung 2026-05-16). Bei Out-of-Domain-Input → strukturierter Reject, kein dynamisches Schema-Wachstum.
- **Bulk-NL-Input** (mehrere Regeln in einem Prompt erfassen) — V8-Item, V7.5 ist 1-Prompt-=-1-Rule.
- **Autonomes Handeln** (LLM apply-t Regel direkt ohne Trockenlauf-Bestaetigung) — Trockenlauf-Pflicht aus V6.2 DEC-132 bleibt aktiv, kein Skip-Modus.
- **Edit-Existing-Rule-via-NL:** V7.5 unterstuetzt nur NL→neue-Regel. Bestehende Regeln editieren bleibt im V6.2-Click-Wizard. Spaetere Erweiterung Phase 2 oder V7.6+.
- **Mehrere NL-Sprachen:** V7.5 prompt-engineert Deutsch primaer + Englisch fallback (Bedrock Claude Sonnet kann beides). Niederlaendisch + andere Sprachen sind V8+.
- **Voice-Output (LLM spricht Antwort)** — V7.5 ist Voice-Input only, Antwort bleibt textuell.
- **Custom Sculptor-Prompts** (User kann Sculptor-System-Prompt anpassen) — Internes Tuning bleibt Code-side, kein User-facing Config.

### V7.5 Core Features

| ID | Feature | Type | Prio | BL-Origin |
|---|---|---|---|---|
| FEAT-751 | Natural-Language Workflow-Sculptor (Mein-Tag-Surface + Voice + Trockenlauf) | new | high | BL-435 |
| FEAT-752 | Read-Only-Context Defense-in-Depth (ISSUE-066 Middleware-Mitigation) | improvement | medium | BL-476 (neu) |

### V7.5 Constraints

- **Internal-Test-Mode bleibt aktiv.** V7.5 macht den Pfad zu Drittnutzer-Tests bereiter (ISSUE-066-Closure), aber Compliance-Gate (Anwaltspruefung COMPLIANCE.md + Azure-EU-Whisper-Switch + ISSUE-042) bleibt vor erstem Live-Drittnutzer-Call (User-Direktive 2026-05-01 "kommt viel spaeter").
- **LLM-Provider:** Bedrock Claude Sonnet 3.5 in `eu-central-1` (Frankfurt). Reuse `cockpit/src/lib/llm/bedrock-client.ts` aus V3 (`feedback_async_always_coolify_cron` data-residency-Regel — keine US-Endpoints, kein OpenAI-API-Direct).
- **Voice-Provider:** Whisper-Adapter aus V4.1 (`cockpit/src/lib/speech/whisper-adapter.ts`). Heute openai-Default, Azure-EU Code-Ready. **Vor erstem Drittnutzer-Customer-Ship**: Switch auf Azure-EU-Whisper (ISSUE-042 + COMPLIANCE.md V5.2-Decision). V7.5-internal bleibt openai-Default.
- **Schema-Compatibility:** Strict 1:1 zu V6.2 `automation_rules`-Schema. **Keine Schema-Migration in V7.5.** Wenn /architecture-Audit doch eine kleine Erweiterung braucht (z.B. `automation_rules.created_via TEXT CHECK IN ('click_wizard','nl_sculptor')` fuer Inspection-Log-Filter), dann additiv ohne Bestands-Daten zu touchen.
- **Trockenlauf-Pflicht:** V6.2 DEC-132 (read-only Preview) bleibt aktiv. NL-Sculptor-UI **darf keinen Skip-Modus haben**, der den Trockenlauf-Step ueberspringt — Sicherheit + LLM-Hallucination-Schutz.
- **Pattern-Reuse-First** (CLAUDE.md Core-Default #5): Sculptor-Adapter folgt Bedrock-LLM-Adapter-Pattern aus V3+V6.6 (`bedrock-client.ts`-Reuse, `feedback_bedrock_cost_control`-Regel), Voice folgt Whisper-Adapter-Pattern aus V4.1, KI-Workspace-Layout folgt V6.6-Hybrid-Pattern aus Mein-Tag-Re-Architecture.
- **TDD-Mandate fuer FEAT-752-Middleware:** Vitest-Mock-Test (RED-GREEN) der den Header-Pfad explizit testet, BEVOR Production-Middleware-Edit committed wird. Plus Live-Smoke via Playwright-MCP-DevTools-Pattern (vgl. `reference_playwright_live_smoke_pattern`).
- **Bedrock-Cost-Control:** Sculptor-Aufruf ist On-Click, kein Auto-Load (User-Direktive `feedback_bedrock_cost_control`). Plus Display der ungefaehren Cost pro Sculpt-Versuch (typisch ~$0.003 fuer 1-Shot 1k-Token).

### V7.5 Risks / Assumptions

- **Risk LLM-Hallucination:** Bedrock mappt Klarsprache auf nicht-existierendes Trigger-Event oder erfindet Action-Param-Keys. **Mitigation:** strikte JSON-Schema-Validation post-Sculpt mit `zod` (Whitelist aller 3 Trigger + 4 Actions + Param-Keys), Reject + Re-Prompt-Loop max. 2x. Plus `healJsonEscapes`-Pattern aus IS SLC-109 (`feedback_bedrock_json_drift_pattern`).
- **Risk Voice-Accuracy:** Whisper-openai-Default ist solide fuer DE, aber Geschaeftsbegriffe wie "Pipeline" oder "Stage" werden manchmal als Englisch erkannt. **Mitigation:** Voice-Transkript ist editierbar bevor Sculpt-Klick, User kann manuell nachschaerfen.
- **Risk Trockenlauf-Cost:** Wenn Trockenlauf auf grossem Backlog (z.B. 200 Deals + 500 Activities) laeuft, kann der read-only Query teuer sein. **Mitigation:** Time-Window-Constraint im Trockenlauf-Pfad — V6.2 DEC-132 macht das schon (letzte 7 Tage). Sculptor-Trockenlauf folgt exakt diesem Pattern.
- **Risk ISSUE-066-Middleware konfligiert mit V6.2-Cron:** `/api/cron/automation-runner` ist Cron-Pfad, nicht User-Drilldown-Pfad. **Mitigation:** Middleware-Pfad-Regex `^\/team\/[^/]+\/` greift NUR fuer Drilldown-Routes, nicht fuer `/api/*`. Vitest-Mock-Test verifiziert.
- **Risk Multi-User-NL-Konflikte:** Wenn 2 User gleichzeitig identische NL-Regel formulieren → 2x identische `automation_rules`-INSERTs. **Mitigation:** Soft-Dedup im Apply-Pfad (`assertNotDuplicateRule()`-Helper, vergleicht `name + trigger_event + JSON.stringify(conditions+actions)` mit existierenden active Rules des `created_by`-Owners). Bei Match → 409-Conflict mit Hinweis. Kein DB-UNIQUE-Constraint (zu strikt fuer absichtliche Quasi-Duplikate).
- **Assumption:** Bedrock Claude Sonnet 3.5 EU-Frankfurt erreicht ~95% Sculpt-Accuracy auf typischen Mein-Tag-Workflow-Prompts. **Verifikation:** /qa-Slice mit 10 Real-World-Prompts + Edit-Rate-Messung (User editiert das Schema in <30% der Faelle = PASS).
- **Assumption:** V6.2 `automation_rules`-Schema deckt alle realistischen Mein-Tag-Use-Cases. **Verifikation:** Sculptor-Cost-Audit nach 1 Woche Live-Use: wenn >20% der Sculpt-Aufrufe in `out_of_domain_reject` enden, ist V8+-Trigger-Erweiterung gerechtfertigt.
- **Assumption:** Whisper-Adapter aus V4.1 funktioniert ohne Anpassung. **Verifikation:** /qa Smoke mit Voice-Input.

### V7.5 Success Criteria

- **FEAT-751:**
  - Mein-Tag-NL-Box akzeptiert Text-Input "Wenn ein Deal in Phase Angebot bewegt wird, leg mir eine Follow-up-Task in 2 Tagen an." → Sculpt → Schema-Karte zeigt `trigger_event=deal.stage_changed`, `conditions=[{field:stage_id, op:eq, value:<angebot-stage-uuid>}]`, `actions=[{type:create_task, params:{due_in_days:2, title:"Follow-up zu {{deal.name}}"}}]`.
  - Trockenlauf-Karte zeigt typisch 3-8 historische Stage-Wechsel der letzten 7 Tage mit "Diese Regel haette folgende Tasks erzeugt: ..."
  - Apply → `automation_rules`-INSERT mit `status='active'`, `created_by=auth.uid()`, Audit-Log-Eintrag `automation_rule.create_via_nl` mit `nl_input` + Cost-USD.
  - Voice-Input: Mikro-Button transkribiert "Wenn ein Deal in Phase Angebot bewegt wird, leg mir eine Follow-up-Task in 2 Tagen an" mit >95% Accuracy. Edit moeglich vor Sculpt-Klick.
  - Out-of-Domain-Input "Wenn der Kunde eine Sprachnachricht schickt..." → strukturierter Reject mit Hinweis "Trigger-Typ 'Sprachnachricht' nicht unterstuetzt. Vorschlag: stattdessen `activity.created` Type=Anruf nutzen."
  - Inspection-Log auf `/settings/workflow-automation/nl-history` zeigt letzte 50 Sculpt-Aufrufe mit Cost + Outcome.
- **FEAT-752:**
  - Playwright-MCP-Live-Smoke: Teamlead loggt sich ein, navigiert auf `/team/<member-id>/pipeline`, oeffnet DevTools, fired Direct-Server-Action-Call (z.B. `updateDeal({id, stage_id})`) → Action wirft `ReadOnlyContextError`. Heute (Pre-V7.5) wuerde die Action gelingen.
  - Vitest-Mock-Test: `assertNotReadOnlyContext()` mit gemocktem `headers().get('X-Read-Only-Mode') === '1'` → throws. Mit `headers().get('X-Read-Only-Mode') === null` und ohne AsyncLocalStorage → passes.
  - Cron-Pfade (`/api/cron/*`) bleiben unbeeinflusst — Middleware-Pfad-Regex matcht nicht. Vitest-Test verifiziert.
- **Gesamt:** V7.5 PASS heisst: 1 Mein-Tag-NL-Workflow-Smoke end-to-end (Voice + Trockenlauf + Apply + Bestaetigung dass V6.2-Engine die Regel wirklich triggert), ISSUE-066 closed (Playwright-DevTools-Smoke), `npm run test:all` gruen, audit_log-Trail mit ≥1 `automation_rule.create_via_nl`-Eintrag, ISSUE-066 Status `resolved` in KNOWN_ISSUES.md.

### V7.5 Open Questions

1. **Sculptor-Prompt-Architektur:** Single-Shot (1 Bedrock-Call mit gesamtem Prompt + Reject-Loop max. 2x) ODER Multi-Turn (erst Trigger-Identifizierung, dann Conditions, dann Actions getrennt)? **Klaerung in `/architecture`.** Default-Hypothese: Single-Shot mit zod-Re-Prompt-Loop, weil Multi-Turn dreifache Cost + Latenz erzeugt fuer das Edge-Case-Verhalten.
2. **NL-History-Storage:** Reuse `audit_log` (Pattern aus V3+) ODER neue `nl_sculpt_history`-Tabelle mit `nl_input/sculptor_model_id/cost_usd/result_status/result_payload`? **Klaerung in `/architecture`.** Default-Hypothese: `audit_log` mit JSONB-`metadata`-Spalte reuse, kein neues Schema.
3. **Apply-Confirmation-UI:** Trockenlauf-Karte zeigt Ergebnis. Klick auf "Regel aktivieren" → sofort INSERT + active ODER zusaetzliche Confirm-Modal-Bestaetigung ("Diese Regel wird ab jetzt auf alle neuen Stage-Wechsel angewandt. Sicher?")? **Klaerung in `/architecture` mit UX-Skizze.**
4. **Sculptor-Cost-Display:** Pro Sculpt-Versuch wird ungefaehre USD-Cost angezeigt. Soll das **vorab** (Cost-Estimate basierend auf Token-Count) ODER **nachher** (Real-Cost aus Bedrock-Response) gezeigt werden? Beide moeglich, Vorab ist UI-aufwendiger. **Klaerung in `/architecture`.**
5. **ISSUE-066-Slice-Position:** FEAT-752 Middleware-Mitigation als erster oder letzter Slice der V7.5-Reihenfolge? **Klaerung in `/slice-planning`.** Default-Hypothese: erster Slice (Defense-in-Depth-Foundation steht bevor neue Features hinzukommen), aber wenn /qa der ersten 5 NL-Slices kein konkretes Risiko zeigt, kann FEAT-752 auch als letzter Slice direkt vor /final-check kommen.
6. **Bedrock-Region-Drift-Check:** V6.2 verwendet `eu-central-1`. Architecture-Audit verifiziert dass die Sculptor-Region 1:1 gleich bleibt — kein US-Endpoint-Drift. **Klaerung in `/architecture`.**

### V7.5 Slice-Plan (vorlaeufige Schaetzung — `/slice-planning` konsolidiert)

Reihenfolge nach `/slice-planning` zu bestimmen. Default-Hypothese (User darf in /slice-planning re-ordnen):

- **SLC-751** (~3-5h) — FEAT-751 Phase 1: Bedrock Sculptor-Adapter (`sculptor.ts`) + zod-Schema-Validation + `healJsonEscapes`-Reuse + Vitest mit 10 Real-World-Prompts.
- **SLC-752** (~3-5h) — FEAT-751 Phase 1b: Mein-Tag-NL-Surface (Text-Input + Klarsprache-Karte + Schema-Karte + Apply-Button). Voice noch nicht.
- **SLC-753** (~2-3h) — FEAT-751 Phase 2: Trockenlauf-Karte (V6.2 DEC-132-Reuse) + Apply-Confirmation-Flow.
- **SLC-754** (~1-2h) — FEAT-751 Phase 2b: Voice-Input-Integration (Whisper-Adapter-Reuse + Mikro-Button + Transkript-Edit).
- **SLC-755** (~2-3h) — FEAT-751 Phase 3: Inspection-Log auf `/settings/workflow-automation/nl-history` (Admin-only via FEAT-711-Permission-Matrix).
- **SLC-756** (~1-2h) — FEAT-752: ISSUE-066-Middleware-Mitigation (Pfad-Regex + Header-Set + assertNotReadOnlyContext-Erweiterung + Vitest-Mock + Playwright-Smoke).

Total V7.5-Aufwand: ~12-20h reine Implementation + QA + Live-Smoke. Schlanker als V7 (~5 Tage), groesser als V7.2 (~3.5h).

### V7.5 Delivery Mode

**Internal-Tool, Feature-Sprint.** Neuer LLM-Pfad (Sculptor-Adapter), keine neue Datenbank-Tabelle (nur additive Spalten-Erweiterung moeglicherweise), kein neuer Container, kein neuer Cron-Job, keine neue npm-Package-Dependency (Bedrock-Client + Whisper-Adapter beide bestehende Pattern). Internal-Test-Mode bleibt aktiv. V7.5-PASS heisst: V7.2-Stack bleibt deployed wie aktuell (Production-Image `770dd55` V7.1), plus 6 Slices als kumulative Aenderungen auf demselben Image-Stand mit Coolify-Redeploy am Slice-Ende.

**V7.5 Requirements ready for `/architecture`.**

---

## V8 — Hygiene-Sprint (Requirements done 2026-05-19)

### V8 Problem Statement

Nach V7.6 Release (REL-033, 2026-05-19) ist V7.6 in Production und der User hat im /discovery V8 explizit gesagt: "ich hab das ganze so aufgebaut, wie ich es mir vorstelle, und dementsprechend nervt mich auch gerade nichts an V7.6". Es gibt kein dringliches neues Feature-Thema. **Aber** der Code hat strukturelle Schulden:

- **Settings**: `/settings`-Landing ist eine einspaltige Tile-Liste ohne Gruppierung, Rollen-Verwaltung ist visuell versteckt in einer Tabellen-Spalte, Ghost-Subpages (`/settings/products/`, `/settings/workflow-automation/`) haben keine Tile-Eintraege, Automation-Duplikat (`automation/` vs `workflow-automation/` Folder), Doppel-Pfad `/team` Top-Level vs `/settings/team`.
- **KI-Provider-Anzeige**: User-sichtbar "Bedrock arbeitet ..." in AnswerPane + `BedrockSection`-Component in ItemSheet. Vendor-Lock-in-Wahrnehmung soll vermieden werden.
- **Performance-Page-Bruecke**: `/performance` ist seit V6.6 nur noch 1.5s-Redirect-Toast. Bruecke war fuer 1 Sprint geplant — wir sind jetzt 5 Sprints weiter.
- **Label-Inkonsistenz**: Quick-Action-Buttons heissen "Task" in /mein-tag + Deal-Detail, "Aufgabe" in Cockpit. Funktional identisch, inkonsistent.
- **Stage-Move-UX**: Drag-Drop auf "Verloren" wirft Toast-Error wenn Pflichtfelder fehlen, User muss Edit-Pencil-Umweg gehen. Plus: Verlustgrund-Eingabe haengt oft, weil der Ausloeser in der Activity-History liegt.

### V8 Goal / Intended Outcome

V8 ist ein **Hygiene-Sprint**. Strukturelle Schulden abbauen + ein UX-relevanter HIGH-Prio-Backlog-Item (BL-455 Pflichtfelder-Modal beim Stage-Move) mit KI-Pre-Fill. Kein neuer Top-Level-Feature, keine neue Stack-Komponente.

### V8 Primary Users

Wie BS gesamt: Strategaize-Gruender (Admin), Strategaize-Verkaufsleiter (Teamlead), Strategaize-Verkaeufer (Member). Single-Org-internal-tool.

### V8 Scope

**In scope (4 Features):**

#### FEAT-801 — Settings-Layout-Refactor + Rollen-Auffindbarkeit
- Tile-Gruppierung mit 3 Sections: Persoenlich / Vertrieb / System
- Rollen-Verwaltung als eigenes Tile in System-Section sichtbar machen
- Ghost-Subpages cleanup (products, workflow-automation)
- Automation-Duplikat aufloesen
- Drilldown-Button in team-members-table aktivieren oder entfernen
- `/team` Top-Level bleibt (Cockpit/Analyse), `/settings/team` bleibt (Verwaltung)
- 3 Rollen bleiben (kein 4. Auditor/Read-Only)

#### FEAT-802 — KI-Provider-Anzeige im UI abstrahieren (BL-480)
- "Bedrock arbeitet" → "KI arbeitet" / aequivalent
- `BedrockSection`-Component-Display-Label neutralisieren
- ARIA-Labels + Tooltips pruefen
- Audit-Log-User-View pruefen
- Internal Naming bleibt (Variablennamen, Modul-Pfade), nur User-sichtbar abstrahieren

#### FEAT-803 — /performance-Page-Cleanup + Task/Aufgabe-Label-Konsistenz (BL-453 + BL-459)
- `/performance/page.tsx` komplett loeschen (Redirect-Bruecke nach 5 Sprints obsolet)
- `/performance/goals/` pruefen + ggf. mitloeschen
- Quick-Action-Button-Label "Task" → "Aufgabe" auf /mein-tag, Deal-Detail, Cockpit

#### FEAT-804 — Pflichtfelder-Modal beim Stage-Move + KI-Verlustgrund-Vorschlag (BL-455 HIGH + BL-456)
- Modal `StageMovePflichtfelderModal` direkt im Drop-Event
- Stage-Move atomar mit Pflichtfeld-Set + Stage-Change
- KI-Verlustgrund-Vorschlag via Bedrock-Call mit Activity-History-Snapshot
- Audit-Log `ki_loss_reason_suggested` mit Cost-Tracking
- Modal-Pattern initial nur fuer "Verloren"-Stage (andere Pflichtfeld-Stages in Slice-Planning pruefen)

**Out of scope:**
- 4. Rolle (Read-Only / Auditor / Steuerberater) — gehoert ins OS, nicht ins BS
- API-Integration Slack/Teams/WhatsApp (BL-443) — nach Parking verschoben, V10+
- WhatsApp-Channel — Markt-Recherche 2026-05-19 negativ fuer B2B-DACH-Mittelstand
- Autonome AI-Agents (Agentforce-Style) — V10+ Wettbewerbsreaktion oder Kundenwunsch
- Neuer LLM-Provider / Provider-Switch — kein V8-Treiber
- Schema-Migrations gross — V8 ist UI- und Hygiene-orientiert, max additive Spalten falls Audit-Log-Erweiterung in FEAT-804 noetig
- Theming-Sprint BL-441 / Hex-Hardcodes BL-460 — separater Theming-Tracker, kein V8

### V8 Core Features

| ID | Feature | Backlog-Bezug | Aufwand-Indikator |
|---|---|---|---|
| FEAT-801 | Settings-Layout-Refactor + Rollen-Auffindbarkeit | BL-481 (neu) | 1 Slice |
| FEAT-802 | KI-Provider-Anzeige abstrahieren | BL-480 | 1 Mini-Slice (~1-2h) |
| FEAT-803 | /performance + Label-Konsistenz | BL-453 + BL-459 | 1 Mini-Slice (~30 Min - 1h) |
| FEAT-804 | Pflichtfelder-Modal + KI-Verlustgrund | BL-455 + BL-456 | 1 Slice (groesster Block) |

Voraussichtlich 2-3 Slices in der Slice-Planning. Aufwand-Schaetzung gesamt ~6-10h reine Implementation.

### V8 Constraints

- **Keine neue Stack-Komponente** — kein neuer Container, kein neuer Cron, kein neues npm-Package
- **Keine grosse Schema-Migration** — max additive Spalten (z.B. audit_log Metadata-Erweiterung in FEAT-804)
- **Bedrock-Region-Pin DEC-211 bleibt** — eu-central-1 Claude Sonnet 4.6
- **Internal-Test-Mode bleibt aktiv** — kein Pre-Customer-Live-Switch in V8
- **Mobile-Layout** — Tile-Sections muessen unter 768px funktionieren

### V8 Risks / Assumptions

- **Risk:** FEAT-804 ist groesster Block (Modal + Bedrock-Suggest + Audit-Log). Wenn /architecture zeigt, dass Bedrock-Prompt-Template-Design mehr Aufwand braucht, koennte BL-456 (KI-Vorschlag) aus V8 ausgegliedert werden — Modal-only Option bleibt.
- **Assumption:** `/team/[user_id]`-Drilldown-Page ist aus V7 vollstaendig — sonst muss FEAT-801 entweder Drilldown ergaenzen oder den disabled Button entfernen.
- **Assumption:** Ghost-Subpages `products/` und `workflow-automation/` enthalten keine kritische Funktion — Slice-Planning verifiziert das vor Loeschung.
- **Assumption:** Activity-History fuer KI-Verlustgrund-Vorschlag liefert in den meisten Faellen genug Context (min. 1 Item) — bei leerer History faellt Modal auf User-only-Eingabe zurueck.

### V8 Success Criteria

- `/settings` rendert 3 visuell getrennte Sections, Rollen-Verwaltung sichtbar
- Visueller Walkthrough zeigt 0 "Bedrock"/"Claude"/"Anthropic"-Strings im UI
- `/performance`-URL produziert keinen Redirect-Loop / Crash
- Quick-Action-Button-Label cross-page konsistent "Aufgabe"
- Drag-Drop auf "Verloren" oeffnet Modal vor Server-Call, mit KI-Vorschlag wenn Activity-History vorhanden
- `npm run build` + `npm run lint` + `npm run test` clean
- Live-Smoke auf business.strategaizetransition.com PASS fuer alle 4 Features

### V8 Open Questions

- Tile-Reihenfolge innerhalb der 3 Sections — Slice-Planning
- Drilldown-Button aktivieren ODER entfernen — Slice-Planning nach Pruefung
- `performance/goals/` Inhalt: mitloeschen oder wo hin — Slice-Planning
- Endgueltige neutrale Bezeichnung "KI" / "Strategaize KI" / "Assistent" — /architecture oder Slice-Planning
- Bedrock-Prompt-Template fuer Loss-Reason-Suggest — `/architecture`
- Andere Stage-Pflichtfelder ausser `loss_reason` — Slice-Planning Inventur gegen `STAGE_REQUIRED_FIELDS`
- Modal-Pattern auch fuer "Won"-Stage (Deal-Wert) in V8 oder V9 — Design-Frage Slice-Planning

### V8 Slice-Planning Hint

Voraussichtlich 3 Slices:
- **SLC-811** (~3-4h) — FEAT-801 + FEAT-803: Settings-Refactor + /performance + Label-Konsistenz (UI-orientiert, kein KI, kein Schema)
- **SLC-812** (~1-2h) — FEAT-802: KI-Provider-Anzeige abstrahieren (rein UI-Strings + Component-Display-Labels)
- **SLC-813** (~3-5h) — FEAT-804: Pflichtfelder-Modal + KI-Verlustgrund-Vorschlag (Modal-Component + Bedrock-Call + Audit-Log)

Total V8-Aufwand: ~7-11h reine Implementation + QA + Live-Smoke. Schmaler als V7.6 (3 Slices ~12h), kein groesseres Refactor.

### V8 Delivery Mode

**Internal-Tool, Hygiene-Sprint.** Keine neue Stack-Komponente, keine grosse Schema-Migration (max additive Audit-Log-Spalten), kein neuer Provider, kein neuer Cron. Internal-Test-Mode bleibt aktiv. V8-PASS heisst: V7.6-Stack bleibt deployed wie aktuell (Production-Image `1ffae6e` V7.6), plus 3 Slices als kumulative Aenderungen mit Coolify-Redeploy am Slice-Ende.

**V8 Requirements ready for `/architecture`.**

## V8.7 — Knowledge Foundation BS Konsument (Split V8.7-A / V8.7-B, Requirements done 2026-06-01)

### V8.7 Problem Statement

IS V3.5 ist released (REL-016 + REL-017 am 2026-06-01) und stellt die Cross-Repo-Knowledge-API zur Verfuegung: 39 Foundation-Items aus `CUSTOMER_FACING.md` durchsuchbar via pgvector + HNSW, Service-Key-Auth (timingSafeEqual), Rate-Limit (100/min), Defense-Filter raw-Items, Audit-Log. BS hat einen aktiven KI-Workspace seit V6.6 auf 4 Pages (Mein Tag, Deal-Detail, KI-Cockpit, Team-Cockpit) mit BS-eigener RAG-Quelle, aber Strategaize-Foundation-Wissen ist nicht angeschlossen.

Beispiel-Fragen, die heute im BS-Workspace nicht beantwortbar sind:
- "Wie haben wir den Einwand 'zu teuer' bei vergleichbaren StB-Kanzleien geloest?"
- "Welcher Pitch fuer Datenschutz-Beauftragte hat in 2025 am besten konvertiert?"

V8.7 schliesst genau diese Luecke.

### V8.7 Goal

BS-KI-Workspace bekommt eine **zweite, orthogonale RAG-Quelle**: die IS-Knowledge-API. Antworten kombinieren BS-eigene Deal-/Kontakt-/Activity-Daten mit Strategaize-Foundation-Wissen, ohne dass der Berater das IS-Backend kennen muss.

### V8.7 Scope-Split per User-Direktive 2026-06-01 (Option C)

V8.7 ist bewusst in zwei Versionen aufgeteilt, damit Pre-Live-Sicherheits-Sprints nicht blockiert werden und die Push-Seite den DSGVO-Sign-off abwartet:

**V8.7-A (JETZT, FEAT-871, BL-505)** = Read-only KI-Workspace-RAG-Erweiterung
- Konsument der IS-Knowledge-API: 3 Endpoints `search` / `item/[id]` / `health`
- Service-Key-Auth via `STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` (Server-Side-only)
- Integration in mind. Deal-Detail-Workspace, optional weitere
- q-Param PII-Pre-Redact (Email/Phone) per IS RPT-275 O-1
- Graceful-Degradation bei IS-Down / 429
- audit_log-Event `is_knowledge_queried` mit Cost-Tracking
- Coolify-ENV-Setup-Doku
- Aufwand: ~0,5-1 Tag Code + Live-Smoke
- Kein Anwalt-Gate, kein Cross-Tenant-Risiko, kein Push

**V8.7-B (deferred, FEAT-872, BL-494)** = SLC-355 BS->IS Verdichtungs-Cron
- Weekly Sonntag-Nacht Cron
- Win/Loss-Reasons + Einwand-Behandlungen aus BS aggregiert nach Branche + Deal-Groesse-Bucket
- HTTP-POST an IS-Knowledge-API mit `aggregation_level='aggregated'`, kein `source_tenant_id`
- `KNOWLEDGE_PUSH_ENABLED=false` als Master-Switch bis Anwalt
- Aufwand: ~1-2 Tage Code
- **Pre-Conditions:** V8.10 + V8.11 + Anwalt-Sign-off — startet erst danach

### V8.7-A Out-of-Scope

- SLC-355 BS→IS Cron (komplett V8.7-B)
- Multi-User-RLS-Hardening (V8.11)
- Workspace-UI-Redesign (Layout bleibt V6.6)
- OP V7.6 Workspace-RAG (paralleler Track im OP-Repo)
- PII-Redaction von Mandanten-Eigennamen (komplex, V8.x+)
- Mehrere Sprachen (IS-Knowledge ist DE-only)

### V8.7-A Open Questions (fuer `/architecture`)

8 OQs adressiert in FEAT-871 Spec:
- OQ-A1 Integrations-Modell (4 Optionen, Empfehlung Mix aus a+c)
- OQ-A2 Workspace-Scope (3 Optionen, Empfehlung Deal-Detail + Mein Tag)
- OQ-A3 PII-Redact-Position (Adapter-intern empfohlen)
- OQ-A4 Health-Endpoint (YAGNI, weglassen)
- OQ-A5 Cost-Cap pro Workspace-Session
- OQ-A6 Browser-Bundle-Sicherheit (Server-Actions, ENV-Naming)
- OQ-A7 Caching (V8.7-A nicht, V8.7.1-Polish wenn noetig)
- OQ-A8 Antwort-Rendering im AnswerPane

Volle Details: [FEAT-871-v87-knowledge-rag-workspace.md](../features/FEAT-871-v87-knowledge-rag-workspace.md).

### V8.7 Delivery Mode

**Internal-tool**, Internal-Test-Mode bleibt aktiv, Read-only-Bridge fuer V8.7-A, Push-Pfad in V8.7-B abgesichert via Master-Switch + Anwalt-Gate.

**V8.7-A Requirements ready for `/architecture V8.7-A`.**

## V8.1 — Solopreneur-Mode + Sidebar-Konsolidierung + Teamlead-Permission-Erweiterung (Requirements done 2026-05-20, erweitert 2026-05-20)

### V8.1 Problem Statement

V8 ist deployed (REL-034) und post-launch laeuft. Im Discovery 2026-05-20 hat der User drei zusammenhaengende Hygiene-Themen priorisiert. In der anschliessenden Architecture-Phase 2026-05-20 wurde ein vierter Punkt aufgedeckt: V7-Teamlead-Permission-Matrix passt nicht zum Multi-Team-Use-Case. Nach User-Klaerung wird BL-485 als 4. Sub-Slice ergaenzt:

- **Solopreneur-Mode (BL-482):** "Team-Cockpit" und "Team-Verwaltung"-Sidebar-Eintraege sind fuer einen Solo-Admin (team_size=1) visuell wertlos — Aggregate ueber einen einzelnen User. Erstes Onboarding-Erlebnis fuer einen neuen Solo-User: zwei Sidebar-Items, die nichts Sinnvolles zeigen.
- **Sidebar-Settings-Doppelung (BL-483):** V8 (FEAT-801) hat `/settings` zu einer gegliederten 3-Section-Tile-Page gemacht. Die Sidebar zeigt aber weiter 14 Einzel-Eintraege unter `VERWALTUNG_SETUP` (Pipelines, Kampagnen, Templates, Workflow-Automation, NL-Sculptor-Audit, Branding, Zahlungsbedingungen, Produkte, Einwilligungstexte, Ziele, Cadences/Automatisierung, Audit-Log). Beide Surfaces zeigen dasselbe — keine Single-Source-of-Truth.
- **Teamlead-Tile-Inkonsistenz (BL-484):** `/settings/team` ist als Sidebar-Eintrag fuer Admin+Teamlead sichtbar (sidebar-config.ts:121-125). Das `/settings`-Tile "Rollen-Verwaltung" ist aber `ADMIN_ONLY` (settings/page.tsx ~Z.187). Same URL, verschiedene Sichtbarkeit. Teamlead findet die Seite nur ueber die Sidebar, nicht ueber die Tile-Page.
- **Teamlead-Permission-Matrix passt nicht zum Multi-Team-Use-Case (BL-485, NEU 2026-05-20):** V7-Design erlaubt Teamlead, sowohl `member` als auch `teamlead` einzuladen — aber nicht, eigene Team-Member zu loeschen. Beide passen nicht zum Multi-Team-Use-Case ("Teamlead baut operatives Team auf, aber macht keine Org-Struktur-Aenderungen"). User-Direktive 2026-05-20: Teamlead darf nur `member` einladen (Restrict), darf eigene Team-Member loeschen mit Pflicht-Reassign (Expand, V7-Hard-Lock-Reuse). Rolle-Wechsel bleibt admin-only.

### V8.1 Goal / Intended Outcome

Vier Sidebar-/Settings-/Permission-Schulden ausraeumen. Nach V8.1: Sidebar ist um 11 Eintraege schlanker, Solopreneur sieht keine wertlosen Team-Items mehr, Teamlead findet `/settings/team` konsistent ueber Sidebar UND Tile-Page, und Teamlead kann sein operatives Team aufbauen (Mitglieder einladen + loeschen mit Reassign) ohne Admin-Eingriff.

### V8.1 Primary Users

Wie BS gesamt: Strategaize-Gruender (Admin, Solo bis aktuell), Strategaize-Verkaufsleiter (Teamlead, ab erstem Mitarbeiter), Strategaize-Verkaeufer (Member).

### V8.1 Scope

**In scope — ein FEAT-811 mit 4 Sub-Slices:**

#### FEAT-811 — Solopreneur-Mode + Sidebar-Konsolidierung + Teamlead-Permission-Erweiterung

- **SLC-821 — Solopreneur-Mode (BL-482)** — Reine Auto-Detection bei `team_size = 1`. Sidebar-Eintraege `/team` (Team-Cockpit) und `/settings/team` (Team-Verwaltung) werden ausgeblendet. Bei erstem Invite werden sie automatisch wieder sichtbar. **Kein Override-Toggle** (User-Direktive 2026-05-20).
- **SLC-822 — Sidebar-Konsolidierung Option A (BL-483)** — Alle 14 `VERWALTUNG_SETUP`-Sidebar-Eintraege werden umstrukturiert. Bestehender `/settings`-Eintrag in `VERWALTUNG_MEIN` bleibt. 11 Config-Items entfallen aus der Sidebar (nur via `/settings`-Tile-Page). 3 Tools (`/handoffs`, `/referrals`, `/audit-log`) wandern in eine neue `WERKZEUGE`-Section.
- **SLC-823 — Teamlead-Tile-Sichtbarkeit (BL-484)** — Tile "Rollen-Verwaltung" im `/settings`-Layout `visibleFor` `ADMIN_ONLY` → `ADMIN_TEAMLEAD`. Description neutralisieren. Reine UI-Sichtbarkeit, kein Edit-Verhalten.
- **SLC-824 — Teamlead-Edit-Erweiterung (BL-485, NEU 2026-05-20)** — Server-Action `inviteMember`: Teamlead-Caller darf nur `role='member'` einladen (heute auch `'teamlead'`). Server-Action `deleteProfile`: Permission von `assertRole(["admin"])` zu `assertRole(["admin", "teamlead"])`, bei Teamlead zusaetzliche Guards (target=member, eigenes Team, nicht-self). Bestehende `countOwnerRecords`-Hard-Lock (V7-DEC-193) bleibt — bei open_records>0 reject mit Re-Assign-Pflicht. UI: Delete-Button in `team-members-table.tsx` auch fuer Teamlead sichtbar bei target.role==='member'. Rollen-Dropdown in `invite-dialog.tsx` fuer Teamlead nur 'member'. audit_log.context erhaelt caller_role.

**Out of scope:**
- Override-Toggle "Team-Vorbereitungs-Modus" fuer Solopreneur — explizit verworfen 2026-05-20
- 4. Rolle / Auditor / Read-Only-Steuerberater
- Sidebar-Brand-Refresh, Icon-Refactor, Theming (BL-441)
- Mobile-Hamburger-Restructure
- Migration der Tools-Section (Handoffs/Referrals/Audit-Log) zu echtem Dashboard
- Visual-Refactor der `/settings/team`-Page selbst — nur Permission-Layer aendert sich
- Neue Settings-Tiles, neue Sections
- Rolle-Toggle Member ↔ Teamlead durch Teamlead — verworfen 2026-05-20 ("habe ich jetzt gerade keine Lust drauf"), V8.x+ optional
- Combined-Modal `DeleteMemberWithReassign` — verworfen zugunsten von Pflicht-Reassign-Vorbedingung (V7-Hard-Lock-Reuse, billigeres UX-Pattern)
- Soft-Delete (is_active-Spalte) — verworfen weil Schema-Migration noetig waere, V8.1 ist no-migration-Sprint
- Teamlead darf Member zu Teamlead promoten — verworfen 2026-05-20, Org-Struktur-Aenderung bleibt admin-only

### V8.1 Core Features

| ID | Feature | Backlog-Bezug | Aufwand-Indikator |
|---|---|---|---|
| FEAT-811 | Solopreneur-Mode + Sidebar-Konsolidierung + Teamlead-Permission-Erweiterung | BL-482 + BL-483 + BL-484 + BL-485 | 1 FEAT mit 4 Sub-Slices (~4-5h total) |

Voraussichtlich 4 Slices (SLC-821 / SLC-822 / SLC-823 / SLC-824), Aufwand-Schaetzung gesamt ~4-5h reine Implementation.

### V8.1 Constraints

- **Keine Schema-Migration** — V8.1 ist pure UI / Permission / Sidebar-Filter (audit_log.context ist JSONB, kein DDL noetig)
- **Keine neue Stack-Komponente** — kein neuer Container, kein Cron, kein npm-Package
- **Bedrock-Region-Pin DEC-211 bleibt** — V8.1 enthaelt keinen KI-Call
- **Internal-Test-Mode bleibt aktiv**
- **Mobile-Layout** — neue Sidebar-Struktur muss unter 768px funktionieren
- **URL-Stabilitaet** — Direkt-Links auf `/settings/templates`, `/settings/pipelines` etc. bleiben funktional (keine URL-Aenderung, nur Sidebar-Sichtbarkeit)
- **V8.1 startet nur, wenn /post-launch V8 stable** — Burn-In-Beobachtungsphase muss positiv abgeschlossen sein
- **Permission-Aenderungen sind atomar pro Server-Action** — `inviteMember` + `deleteProfile` Aenderungen einzeln testbar, kein Cross-Cutting-Refactor
- **V7-Hard-Lock-Pattern bleibt** — `countOwnerRecords`-Pre-Check unveraendert, Daten gehen niemals verloren

### V8.1 Risks / Assumptions

- **Risk:** Wenn `VERWALTUNG_SETUP` als Sidebar-Section komplett verschwindet und `/handoffs`/`/referrals`/`/audit-log` ohne Heimat sind, koennen User sie nicht mehr finden. Mitigation: `WERKZEUGE`-Section als Default-Loesung, /architecture finalisiert
- **Risk:** Wenn Solopreneur-Mode (SLC-821) den `team_size`-Query in jedem Sidebar-Render macht, wird das ein N+1-artiger Aufruf — Mitigation: Helper soll in der Layout-Server-Side-Render-Phase einmal pro Request gecached werden
- **Risk:** Falls `/settings/team` read-only-Mode fuer Teamlead noch nicht aus V7.1-Permission-Layer (DEC-196) abgedeckt ist, muss SLC-823 das ergaenzen — sonst sieht Teamlead Edit-Buttons, die er nicht klicken darf (UX-Drift)
- **Assumption:** `profiles.team_id` ist der korrekte Bezugspunkt fuer team_size. /architecture verifiziert oder ersetzt durch korrektes V7-Field
- **Assumption:** V8-Image (`c5e0f0c`) ist im Burn-In stabil. Falls /post-launch V8 ein Blocker-Issue aufdeckt, V8.1-Start wartet

### V8.1 Success Criteria

- Frischer Admin-Login mit team_size=1: keine `/team` + `/settings/team`-Eintraege in Sidebar
- Nach erstem Invite: beide Eintraege werden im Layout-Reload wieder sichtbar
- Sidebar zeigt KEINEN der 14 `VERWALTUNG_SETUP`-Eintraege mehr, bestehender `/settings`-Eintrag in `VERWALTUNG_MEIN` bleibt
- `/handoffs`, `/referrals`, `/audit-log` bleiben per Sidebar erreichbar (in `WERKZEUGE`-Section)
- `/settings`-Tile-Page zeigt fuer Admin+Teamlead das Tile "Rollen-Verwaltung"
- Teamlead kann Member einladen (nur als 'member'), Versuch mit 'teamlead' wird vom Server abgelehnt
- Teamlead kann eigene Member loeschen wenn Hard-Lock erfuellt (open_records=0), bei open_records>0 wird der Versuch mit Re-Assign-Pflicht-Error abgelehnt
- Teamlead kann KEINE Member fremder Teams loeschen, kein self-delete, keine non-member-Targets
- Admin-Pfade fuer Invite/Delete bleiben identisch — keine Regression
- `npm run build`, `npm run lint`, `npm run test` clean
- Live-Smoke auf business.strategaizetransition.com PASS fuer alle 3 Rollen + Teamlead-Permission-Edge-Cases

### V8.1 Open Questions

**Alle 5 Requirements-Open-Questions sind in /architecture (RPT-491) beantwortet** — siehe ARCHITECTURE.md V8.1 Open Technical Questions.

**Architectural Klaerung 2026-05-20 ergaenzte ein 6. Open Question:** Teamlead-Permission-Matrix passt nicht zum Multi-Team-Use-Case — geklaert via User-Direktive 2026-05-20 (A2 + B1 + C1), resultiert in SLC-824 + DEC-230 (supersedes DEC-193 + DEC-194).

**Slice-Planning-Restfragen:**
- Exakte Schreibweise "WERKZEUGE" vs "TOOLS" vs "HILFSMITTEL"
- Tile-Description Anpassung (semantisch leicht aendern oder belassen)
- Reihenfolge Sub-Slices: SLC-821 → SLC-822 → SLC-823 → SLC-824 (vom kleinsten Risiko aufsteigend, sequentiell)

### V8.1 Slice-Planning Hint

Voraussichtlich 4 Slices:
- **SLC-821** (~30-60 Min) — FEAT-811 / Solopreneur-Mode: `lib/team/team-size.ts` NEU + Layout-Filter-Logik + 3-4 Vitest-Cases
- **SLC-822** (~1-1.5h) — FEAT-811 / Sidebar-Konsolidierung Option A: Type-Refactor `VERWALTUNG_SETUP` → `WERKZEUGE`, 11 Items entfernen, 3 Tools-Items Section-Wechsel, Vitest
- **SLC-823** (~10-15 Min) — FEAT-811 / Teamlead-Tile-Sichtbarkeit: 1 Zeile Permission-Aenderung + 1 Zeile Description in `/settings/page.tsx`, Vitest
- **SLC-824** (~2-2.5h) — FEAT-811 / Teamlead-Edit-Erweiterung: Server-Action-Guards + UI-Refactor + audit_log.context + 6-8 neue Vitest-Cases

Total V8.1-Aufwand: ~4-5h reine Implementation + QA + Live-Smoke. SLC-824 ist groesster Block (Server-Side + UI + Tests).

### V8.1 Delivery Mode

**Internal-Tool, Permission-Sprint.** Keine neue Stack-Komponente, keine Schema-Migration, kein neuer Provider, kein neuer Cron, kein Bedrock-Call. Internal-Test-Mode bleibt aktiv. V8.1-PASS heisst: V8-Stack bleibt deployed wie aktuell (Production-Image `c5e0f0c`), plus 4 Slices als kumulative UI-/Permission-Aenderungen mit Coolify-Redeploy am Slice-Ende (Pattern wie V8).

**V8.1 Requirements ready for `/architecture`.** (Architecture done in RPT-491 + Permission-Klaerung 2026-05-20.)

## V8.11 — Security Sprint 3 BS RLS-Sweep der 25 Zweittabellen (Requirements done 2026-06-04)

### V8.11 Problem

Nach V7-RLS-Switch (MIG-035, SLC-704) wurden 8 Kerntabellen + `profiles` + `teams` auf Owner-/Team-aware RLS umgestellt. Die restlichen ~25 Zweittabellen stehen weiter auf der V1-Policy `authenticated_full_access` (`FOR ALL TO authenticated USING (true)`). Jeder authenticated User kann Read+Update+Delete auf allen Rows dieser Tabellen — egal welchem owner_user_id oder team_id sie gehoeren.

Im Internal-Test-Mode (Admin = User Immo) keine Auswirkung. **Sobald 2. User dazu kommt** (Customer-Onboarding) sind das sofortige Cross-Tenant-Reads + Modifikationen. Konkrete Angriffsbeispiele:
- `UPDATE user_settings SET push_subscription = '<eigener Endpoint>' WHERE user_id = '<admin-uid>'` — Member uebernimmt Admin-Push-Notifications
- `SELECT * FROM audit_log` — vollstaendiger Audit-Trail aller User sichtbar
- `SELECT * FROM emails` — alle Outbound-Mails inkl. Body lesbar
- `SELECT * FROM knowledge_chunks` — alle RAG-Embeddings cross-tenant lesbar

Quelle: SEC-006 in `docs/SECURITY_AUDIT_2026-05-30.md`.

### V8.11 Goal

BS ist nach V8.11 multi-tenant-tauglich. Customer-Onboarding kann starten ohne Cross-Tenant-Read-Risiko auf den 25 Zweittabellen. **V8.11 ist die letzte Pre-Customer-Live-Pflicht-Hardening fuer BS.**

### V8.11 Primary User

Admin (User Immo) und kuenftiger Customer-User (Founder, Sales-Member, Teamlead, Admin). Indirekt auch alle Background-Cron-Jobs, die ueber service_role weiter RLS-bypass haben.

### V8.11 V1 Scope

Migration aller 25 Zweittabellen auf Owner-/Team-aware RLS nach 4 Klassen-Patterns:

1. **SLC-901 per-User-Stammdaten** (~3 Tabellen): `user_id = auth.uid()`-Policy + Admin-Bypass
2. **SLC-902 team-bezogene Konfiguration** (~7 Tabellen): Admin-mutate, alle-Team-User-read
3. **SLC-903 abgeleitete Records** (~15 Tabellen): JOIN auf Parent mit `can_see_owner()`. knowledge_chunks Spezial-Pfad: Schema-Erweiterung + Backfill.
4. **SLC-904 Audit/Logging** (2 Tabellen): Admin-all + Actor-own-Rows (DSGVO-Art-15-Self-Service)

Pro Sub-Slice: Migration + Backfill + RLS-Test-Matrix-Erweiterung (mind. 2 Tests/Tabelle) + /qa gegen Coolify-DB + Cron-Code-Audit der betroffenen Tabellen.

### V8.11 Out of Scope

- MFA-Pflicht (V8.12+)
- search_knowledge_chunks-Function-Hardening (SEC-007, eigener Hotfix)
- Hard-Performance-Test mit Production-Datenvolumen (V8.11 nur Smoke-EXPLAIN-ANALYZE)
- Cron-Code-Refactoring weg von service_role (nur Audit, kein Refactor)
- OP V8.0.x + IS V1.5.x RLS-Sweep-Mirror (Cross-Repo separate Sprints)
- V8.7-B (BS→IS Verdichtungs-Cron) — bleibt deferred bis nach V8.11 Customer-Live-Gate

### V8.11 Success Criteria

Q-V8.11-B entschieden: **100% Coverage 25/25 Tabellen**. Done-Gate per Sec-Audit-Helper-Function `list_tables_with_authenticated_full_access()` mit leerem Result-Set + 50+ neue RLS-Vitest + V8.11 RELEASED + STABLE-Bestaetigung.

### V8.11 Founder-Entscheidungen

- **Q-V8.11-A audit_log-Policy:** Admin-all + Actor-own-Rows (DSGVO-Art-15-kompatibel)
- **Q-V8.11-B Done-Kriterium:** 100% Coverage 25/25 Tabellen
- **Q-V8.11-C knowledge_chunks-Strategie:** owner_user_id + team_id Spalten + Backfill
- **Q-V8.11-D Cron-Service-Role:** Doku-DEC + Pflicht-Cron-Audit pro Sub-Slice

### V8.11 Delivery Mode

**SaaS-Mode, Pre-Live-Pflicht-Hardening.** Cumulative-Single-Branch-Worktree (`v8-11-rls-sweep`) analog V7-RLS-Switch. Sub-Slices SLC-901..904 nacheinander auf den Branch, Master-Merge erst nach kompletter V8.11 + /qa Gesamt + /final-check + /go-live + /post-launch. **Pre-Condition erfuellt**: V8.13 RELEASED (ISSUE-088 + ISSUE-089 resolved).

Gesamt-Aufwand: ~17-22h Code-Side ueber ~1-2 Wochen verteilt, Single-Dev.

**V8.11 Requirements ready for `/architecture`.** (FEAT-911 + BL-500 in_progress + V8.11 status=active.)

## V8.17 — Regressions-Fix-Bundle aus Code-Review V8.16-Range (Requirements done 2026-07-07)

### V8.17 Problem

Der lokale High-Effort Code-Review (ultrareview-Nachbau, Workflow `wf_defeb900-8a3`) über den kompletten V8.16-Range `c9efb41..HEAD` fand 5 distinkte Regressionen (RPT-672), alle durch V8.16 eingeführt und von allen bisherigen QA-Stufen (Slice-/qa, Gesamt-/qa RPT-665, /final-check RPT-666, /post-launch RPT-671) übersehen. Kern-Ursache-Klasse: der CSP-Enforce-Flip (SLC-910) und die MIG-054-WITH-CHECK-Verschärfung waren unter Report-Only / im Single-Founder-Admin-Modus unauffällig, brechen aber reale Feature-Flows bzw. den künftigen Multi-User-Betrieb.

- **ISSUE-138 (High):** Enforced CSP `connect-src` enthält den SIP-WebSocket (`wss://sip…/ws`) nicht → In-App-Telefonie-Transport bricht; zusätzlich `Permissions-Policy: microphone=()` → kein Call-/Meeting-Audio. Click-to-Call ist deployed + scharf, live verifiziert gebrochen.
- **ISSUE-139 (Medium):** CSP `img-src` (ohne `https:`) blockt via srcdoc-Vererbung Remote-Bilder im Inbound-E-Mail-Viewer → Broken-Images/Layout-Kollaps, silent (csp-check.mjs probt den Viewer nicht).
- **ISSUE-140 (Medium, Multi-User-Blocker):** MIG-054 stellte INSERT+UPDATE-`WITH CHECK` der 9 Multi-Parent-Klasse-C-Tabellen von OR auf AND-Conjunction. Postgres prüft WITH CHECK gegen die volle NEUE Row inkl. unveränderter FKs → reine Status-Updates auf mixed-owner-Rows scheitern für Non-Admins mit 42501. Heute durch is_admin()-Single-User maskiert.
- **ISSUE-141 (Medium):** `getNextMeetingWithContext` reicht eine RLS-unsichtbare rohe `contact_id` an das neue V8.16-startMeeting-Ownership-Gate; `MeetingPrepCard` wertet `res.error` nie aus → Silent-Dead-Button in Mein Tag.
- **ISSUE-142 (Medium):** `checkConsentStatus` vergleicht die zurückgelieferte Row-Zahl nie mit `contactIds.length` → RLS-weggefilterte Kontakte ⇒ fail-OPEN; auf einem concurrent-Reassignment-Race Recording ohne Consent-Beweis (§201 StGB / DSGVO) möglich.

Quelle: RPT-672, KNOWN_ISSUES ISSUE-138..142.

### V8.17 Goal / Intended Outcome

Alle 5 Regressionen geschlossen: Telefonie/Meeting-Audio unter enforced CSP wieder funktional (mit funktionalem Feature-Flow-Smoke statt nur Hydration), E-Mail-Viewer bewusst tracking-sicher mit opt-in Bild-Nachladen, RLS-Alltags-Updates im Multi-User-Betrieb entsperrt bei vollem Cross-Tenant-Injection-Schutz, keine Silent-Dead-Buttons, Consent-Gate fail-closed. CSP-Enforce-Härtung (SLC-910) bleibt erhalten — kein Report-Only-Rollback.

### V8.17 Primary User

Founder (Single-User heute — akut nur ISSUE-138 spürbar) und künftige Multi-User-Team (Admin/Teamlead/Member — ISSUE-140/141/142 werden multi-user-relevant). Consent-Gate betrifft alle künftigen aufgezeichneten Gesprächspartner (Datenschutz-Betroffene).

### V8.17 V1 Scope

1 Slice (BL-520 / FEAT-927), 1 additive Migration MIG-055:
1. **ISSUE-138:** `csp.ts` `connect-src` um `wss://`-Variante der SIP-Domain (`NEXT_PUBLIC_SIP_DOMAIN`-abgeleitet, Fallback `sip.strategaizetransition.com`) + `Permissions-Policy` von `microphone=()` auf `microphone=(self)` (+`camera=(self)` für Meetings). Funktionaler Telefonie- UND Meeting-Audio-Browser-Smoke.
2. **ISSUE-139:** E-Mail-Viewer blockt Remote-Bilder standardmäßig + zeigt Banner „Externe Bilder blockiert (Tracking-Schutz)" mit Per-Mail-„Bilder laden"-Button (viewer-scoped, kein globales CSP-Aufweichen, kein Server-Proxy).
3. **ISSUE-140:** MIG-055 — UPDATE-`WITH CHECK` prüft nur die tatsächlich geänderten FK-Spalten (Trigger, OLD vs NEW) gegen `can_see_owner`; unveränderte FKs unberührt; INSERT + FK-Change bleiben streng. Plus 4 Call-Sites (`followup-actions.ts:126`, `signal-actions.ts:73`, `imap-actions.ts:135`, `meetings/actions.ts:228`) auf Fehlerprüfung/Kompensation.
4. **ISSUE-141:** `MeetingPrepCard` wertet `res.error` aus (Toast statt No-Op) + `getNextMeetingWithContext` mappt unsichtbare rohe `contact_id` auf null.
5. **ISSUE-142:** `checkConsentStatus` Count-Guard: returned-Row-Count < `contactIds.length` ⇒ fail-closed (allGranted=false, fehlende IDs als missing).

Plus: Playbook `security-headers-live-smoke.md` um Feature-Flow-Coverage (connect-src/img-src/Permissions-Policy je genutztem Endpoint) ergänzt (IMP-1401).

### V8.17 Out of Scope

- BL-519 Passwort-vergessen-Flow (eigener Pre-Multi-User-Slot, separat)
- ISSUE-136-Hygiene (Stale-Session/Orphan-Test-User)
- Cross-Repo-Mirror der ISSUE-140-Klasse in OP/IS/immoscheckheft (separater Follow-up)
- Report-Only-Rollback der CSP (Founder verwarf zugunsten Hotfix)
- Server-seitiger Bild-Proxy für E-Mail-Viewer (Founder verwarf zugunsten Block+Toggle)
- Bulk-Reassign-Parent-FK-Mit-Verschiebung (ISSUE-140 Option c — nicht gewählt)

### V8.17 Constraints

- Single-Branch `main`, Internal-Test-Mode (kein Worktree, Precedent V8.12/14/15/16).
- Additive Migration nur (MIG-055) — kein destruktives DDL; idempotent + Rollback-Notes.
- Bestehende CSP-Enforce-Härtung SLC-910 darf nicht verwässert werden (keine `img-src https:` global, kein `microphone=*`).
- Keine neuen npm-Packages ohne Not; keine neuen Container.

### V8.17 Risks / Assumptions

- **R-1:** Trigger-basierter changed-FK-Check über 9 Tabellen ist die aufwändigste Einzelmaßnahme; Regressionsrisiko auf legitime INSERTs. Mitigation: DB-Verify-Test (positiv+negativ, mixed-owner-Row) im /deploy gegen Coolify-DB, node:20-Sidecar (Precedent MIG-054).
- **R-2:** CSP-Smoke muss die echten Telefonie/Meeting-Audio-Flows treffen, nicht nur Hydration — sonst wiederholt sich exakt der RPT-672-Trugschluss.
- **Annahme:** `NEXT_PUBLIC_SIP_DOMAIN` bleibt live leer → Client-Fallback `sip.strategaizetransition.com` ist die zu erlaubende Origin (aus RPT-672-Live-Verifikation).

### V8.17 Success Criteria

- Telefonie + Meeting-Audio unter enforced CSP funktional (funktionaler Browser-Smoke PASS, nicht nur Hydration).
- E-Mail-Viewer: Bilder default geblockt, „Bilder laden" lädt sie für die eine Mail; kein globales CSP-Aufweichen.
- Non-Admin-Status-Update auf mixed-owner-Row PASS; Cross-Tenant-FK-Injection auf UPDATE weiterhin 42501 (DB-Verify beide Shapes).
- 4 Call-Sites melden/kompensieren Insert/Update-Fehler statt sie zu verschlucken.
- Kein Silent-Dead-Button (res.error sichtbar); Consent-Gate fail-closed bei fehlenden Rows.
- Vitest grün inkl. neuer Regressionstests; CSP-Enforce bleibt aktiv (Header 1 / Report-Only 0).

### V8.17 Founder-Entscheidungen (2026-07-07)

- **ISSUE-139:** Blocken + Per-Mail-„Bilder laden"-Button (kein Proxy, kein Global-Aufweichen).
- **ISSUE-140:** Ansatz (a) — nur geänderte FK-Spalten prüfen (Trigger, OLD vs NEW).
- **ISSUE-138:** Hotfix (connect-src + Permissions-Policy), NICHT Report-Only-Rollback → In-App-Telefonie bleibt bis V8.17-Deploy im Enforce-Mode gebrochen (Single-Founder akzeptiert).

### V8.17 Reuse-vs-Neu (DEC-Kandidaten für `/architecture`)

- **CSP-Fix (ISSUE-138/139):** eigenes Repo (`cockpit/src/lib/security/csp.ts` + `next.config.ts`), kanonische Prozedur P-089 / Playbook `security-headers-live-smoke.md`. Kein Sibling-Port nötig — BS ist Origin des CSP-Patterns.
- **MIG-055 changed-FK-only-Trigger (ISSUE-140):** Trigger-Scaffolding + `service_role`-aware Guard analog **P-080** (`profiles`-Column-Level-Trigger, service_role-aware) 1:1 als Bauweise übernehmen; die changed-FK-only-Logik ist neu → wird Cross-Repo-Reuse-Quelle (Pattern-Library-Kandidat). → **DEC-307**.
- **E-Mail-Bilder-Toggle (ISSUE-139):** neues UI-Pattern (Block+opt-in-Load) im `email-html-iframe.tsx`; BS ist Origin (immoscheckheft portiert später von BS) → Pattern-Library-Kandidat. → **DEC-306**.
- **ISSUE-141/142:** reine App-Layer-Fixes an BS-eigenem V8.16-Code, kein Reuse-Entscheid.

### V8.17 Open Questions (für `/architecture`)

- **OQ-1 (→ DEC-306):** Bild-Toggle-State pro Mail (session-only vs. persistiert pro Absender)? Empfehlung: session-only, einfachster sicherer Default.
- **OQ-2 (→ DEC-307):** Trigger vs. WITH-CHECK-Ausdruck mit `IS DISTINCT FROM`-Selbstbezug — welche Mechanik erlaubt „nur geänderte FKs"? (Postgres RLS-WITH-CHECK kann OLD nicht referenzieren → Trigger `BEFORE UPDATE` ist der wahrscheinliche Weg; in /architecture verifizieren.)
- **OQ-3:** Sind Jitsi-Meetings als iframe auf der App-Origin eingebettet (dann Permissions-Policy-`camera=(self)` nötig) oder eigene Origin? In /architecture gegen Code prüfen.

### V8.17 Delivery Mode

**internal-tool** (BS-Konvention, Internal-Test-Mode). Per module-lifecycle-discipline + IMP-950: kein Customer-Live, NICHT released bis /go-live, NICHT stable bis /post-launch T+24h. Last Stable bleibt V8.16.

**V8.17 Requirements ready for `/architecture`.** (FEAT-927 planned + BL-520 in_progress + roadmap v8-17 status=active.)
