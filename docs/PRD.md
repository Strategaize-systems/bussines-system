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

**FEAT-561 — Zahlungsbedingungen: Vorauswahl + Split-Plan (BL-412)**

Sub-Theme A: Vorauswahl-Liste typischer Bedingungen.
- Neue Tabelle `payment_terms_templates` (id, label, body, is_default, created_at, updated_at) — anlegbar/editierbar/loeschbar unter `/settings/payment-terms` (eigene Settings-Sektion analog `/settings/branding`).
- Im Proposal-Workspace: Dropdown "Bedingung waehlen" greift auf Templates zu, fuellt Freitext-Feld vor. Manueller Override bleibt moeglich.
- Default-Template ist konfigurierbar (Branding-Default "30 Tage netto" bleibt erhalten als Initial-Seed).

Sub-Theme B: Split-Plan (Teilzahlungen).
- Neue Tabelle `proposal_payment_milestones` (id, proposal_id, sequence, percent, amount, due_trigger, due_offset_days, label, created_at).
- `due_trigger` Enum: `on_signature` | `on_completion` | `days_after_signature` | `on_milestone`.
- UI im Proposal-Editor als expandable Section ("Teilzahlungen aktivieren") mit Add/Remove/Reorder-Steuerung.
- Sum-Validation: Summe muss exakt 100 % entsprechen, sonst Speichern blockiert.
- PDF-Renderer (SLC-553-Erweiterung): wenn `proposal_payment_milestones` Eintraege hat, separater "Konditionen / Teilzahlungen"-Block; sonst Fallback auf bestehendes `payment_terms` Freitext.
- Status-Lifecycle bleibt orthogonal (V5.5 bleibt unveraendert).

**FEAT-562 — Pre-Call Briefing Auto-Push (BL-385)**

- Cron `meeting-briefing` laeuft alle 5 Min, sucht `meetings`/`calendar_events` mit `start_time` zwischen jetzt und +35 Min die noch kein Briefing haben.
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
  Mitigation: in `/architecture` entscheiden — Empfehlung: Toleranz von 0.5% akzeptieren, Speichern erlauben aber UI-Warning anzeigen.
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
4. Sum-Validation greift mit 0.5%-Toleranz; ausserhalb wird Speichern blockiert mit klarer Fehlermeldung.
5. PDF-Renderer zeigt Konditionen-Block mit Milestones strukturiert; ohne Milestones bleibt PDF identisch zu V5.5.
6. Cron `meeting-briefing` laeuft im 5-Min-Takt und generiert Briefings fuer Meetings im naechsten 35-Min-Fenster.
7. Briefing wird per Push-Notification + E-Mail an User geschickt, beide Kanaele toggle-bar in Settings.
8. Briefing wird als Activity am Deal gespeichert.
9. Meetings ohne Deal-Zuordnung werden ignoriert.
10. V5.5-PDF-Smoke bleibt regression-frei (Proposals ohne Milestones rendern bit-identisch).

### V5.6 Open Questions (fuer /architecture)

- **F1 — Settings-Sektion fuer Templates:** eigene `/settings/payment-terms` oder unter `/settings/branding` als Sub-Section? Empfehlung: eigene Sektion (klare Trennung, Templates sind nicht Branding).
- **F2 — Sum-Validation-Toleranz:** 0% (strict), 0.5% oder 1%? Empfehlung: 0.5% — deckt Rundungs-Probleme ohne Free-for-All.
- **F3 — Pflicht/Optional Split-Plan:** Default ist "kein Split-Plan" (Freitext-payment_terms-Pfad)? Empfehlung: ja, Split-Plan ist opt-in via Toggle "Teilzahlungen aktivieren".
- **F4 — Skonto-Behandlung:** als Teil der `payment_terms`-Bedingung (Freitext) oder als separates Feld am Proposal? Empfehlung: erstmal Teil der Bedingung (out-of-scope V5.6 fuer separate Skonto-Engine).
- **F5 — `due_trigger` Enum-Vollstaendigkeit:** reichen die 4 Trigger (`on_signature`, `on_completion`, `days_after_signature`, `on_milestone`) fuer V5.6? Oder noch `on_invoice`/`on_payment`? Empfehlung: 4 reichen, `on_milestone` deckt freie Faelle ab.
- **F6 — Briefing-Trigger-Zeitpunkt:** 30 Min vor Meeting fix oder 15/30/60 als User-Setting? Empfehlung: 30 Min fix in V5.6, User-Konfiguration V5.7+.
- **F7 — Briefing-Delivery-Default:** beide Kanaele aktiv oder nur einer (Welcher)? Empfehlung: beide aktiv — User kann gezielt deaktivieren.
- **F8 — Briefing-Persistierung:** als Activity (sichtbar im Timeline) oder eigene Tabelle `meeting_briefings`? Empfehlung: Activity (Pattern bleibt konsistent zu V3 Activities).
- **F9 — Briefing fuer wiederkehrende Meetings:** wenn dasselbe Meeting taeglich wiederholt wird, jeden Tag neues Briefing oder einmalig? Empfehlung: pro Termin-Instance, also pro Tag neu (Cron sieht jede Instance separat).
- **F10 — `proposal_payment_milestones` Audit-Log:** sollen Aenderungen an Milestones im `audit_log` getrackt werden? Empfehlung: ja, gleiches Pattern wie `proposal_items` (V5.5).
- **F11 — Cron-Concurrency-Lock:** wenn Cron 2x parallel laeuft (Coolify-Restart), wer gewinnt? Empfehlung: Idempotenz-Marker via UPDATE WHERE briefing_generated_at IS NULL — winner-takes-all-Pattern.
- **F12 — Slicing:** 2 Features = 2 Slices? Oder Sub-Themen splitten (Vorauswahl-Section + Split-Plan-Section + Briefing-Cron + Briefing-Delivery)? Empfehlung im PRD: 4 Slices SLC-561..564 fuer klarere Review-Boundaries. `/slice-planning` finalisiert.
