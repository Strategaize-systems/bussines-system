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
- Persoenliches Analyse-Cockpit
- Ziel-Objekt + Zielabgleich
- KPI-Snapshots
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
