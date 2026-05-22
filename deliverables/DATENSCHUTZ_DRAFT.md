# Datenschutzerklaerung (ENTWURF)

> **Status:** Entwurf 2026-05-22 — fuer V8.2 Public-Page `/datenschutz`. **Noch nicht juristisch geprueft.** Vor Verwendung mit echten Kunden muss eine Anwalts-Pruefung erfolgen (siehe `feedback_compliance_gate_later`-Direktive: Pre-Customer-Live-Gate).
> **Verantwortlich-Daten:** Mehrere `[Platzhalter]` warten auf konkrete Adress-/Kontakt-/DSB-Angaben.

---

## 1. Verantwortlicher

Verantwortlich fuer die Verarbeitung personenbezogener Daten auf dieser Plattform im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:

**Strategaize Transition B.V.**
[Strasse + Hausnummer]
[PLZ] Swalmen
Niederlande

KvK-Nummer: [zu ergaenzen]
BTW-Nummer: [zu ergaenzen]

E-Mail: [zu ergaenzen, z.B. datenschutz@strategaize.io]
Telefon: [zu ergaenzen]

## 2. Datenschutzbeauftragter

Ein Datenschutzbeauftragter ist [Status klaeren — gesetzlich Pflicht ab 10+ Mitarbeitern, in NL ab umfangreicher Verarbeitung besonderer Datenkategorien]. Anfragen koennen direkt an die o.g. E-Mail gerichtet werden.

## 3. Verarbeitete Daten und Verarbeitungszwecke

### 3.1 Beim Besuch der Plattform

Wenn Sie die Plattform besuchen, werden technisch zwingend folgende Daten verarbeitet:

- IP-Adresse (gehasht in unseren Logs, SHA-256)
- Zeitpunkt des Zugriffs
- aufgerufene Seite
- User-Agent (Browser-Typ und Version, gehasht in unseren Logs)
- Referrer (falls vorhanden)

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse — technischer Betrieb der Plattform).
**Speicherdauer:** Logs werden 7 Tage gespeichert und danach automatisch geloescht. Bei Sicherheitsvorfaellen kann die Speicherung im Einzelfall verlaengert werden.

### 3.2 Bei Registrierung und Login

Wenn Sie einen Account erhalten, verarbeiten wir:

- E-Mail-Adresse
- Anzeigename (frei waehlbar)
- Hash Ihres Passworts (bcrypt, niemals im Klartext)
- Rolle im Team (Admin / Teamlead / Member)
- Team-Zuordnung
- Zeitstempel des letzten Logins

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung — Bereitstellung des Vertriebs-Systems).
**Speicherdauer:** Bis Account-Loeschung. Nach Loeschung verbleibt ein audit-Log-Eintrag mit Backup-Feldern (`display_name_backup`, `role_backup`, `team_id_backup`, `caller_role`) zur Erfuellung gesetzlicher Nachweispflichten (Art. 30 DSGVO). Login-Daten werden bei Loeschung sofort entfernt.

### 3.3 Bei Nutzung der Vertriebs-Funktionen

Im normalen Betrieb der Plattform verarbeiten wir Daten, die Sie selbst eingeben oder die durch Drittsysteme (E-Mail, Telefonie, Video-Meetings) ueber Schnittstellen synchronisiert werden:

- Stammdaten Ihrer Kontakte (Name, E-Mail, Telefon, Firma, Position, Branche)
- Stammdaten Ihrer Firmen-Kontakte (Firmenname, Branche, Adresse, Steuer-ID)
- Vertriebs-Daten (Deal-Pipeline, Notizen, Wiedervorlagen, Angebote)
- Kommunikations-Daten (E-Mails, Anruf-Metadaten, Meeting-Metadaten)
- Audio-Aufnahmen von Anrufen und Meetings (nur nach Einwilligung der Gespraechspartner)
- Transkripte und KI-Zusammenfassungen Ihrer Anrufe und Meetings (KI-Verarbeitung in AWS Bedrock eu-central-1 Frankfurt)

**Rechtsgrundlage:**
- Art. 6 Abs. 1 lit. b DSGVO fuer Vertrags-Daten Ihrer eigenen Geschaeftspartner
- Art. 6 Abs. 1 lit. a DSGVO fuer Audio-Aufnahmen (explizite Einwilligung der Gespraechspartner ueber die Public-Consent-Seite)
- Art. 6 Abs. 1 lit. f DSGVO fuer KI-gestuetzte Klassifikation und Wiedervorlagen-Vorschlaege (berechtigtes Interesse, kein Profiling im Sinne automatisierter Einzelfallentscheidungen)

**Speicherdauer:** Geschaeftsdaten dauerhaft bis zur manuellen Loeschung. Audio-Aufnahmen werden nach 7 Tagen automatisch geloescht (Datensparsamkeits-Prinzip). Transkripte und KI-Zusammenfassungen bleiben als datensparmere Repraesentation erhalten.

### 3.4 Bei Nutzung der KI-Werkzeuge

Die Plattform setzt KI-Modelle ein fuer:

- E-Mail-Klassifikation (Bedrock Claude Sonnet, eu-central-1 Frankfurt)
- Vertriebs-Wiedervorlagen-Vorschlaege
- Anruf- und Meeting-Zusammenfassungen
- KI-Workspace-Berichte (auf Ihren eigenen Vertriebs-Daten)
- KI-Verlustgrund-Vorschlaege (auf Activity-/E-Mail-Verlauf Ihres Deals)
- Natural-Language-Automation-Sculptor (auf Ihrer Klartext-Eingabe)
- Custom-Reports (auf Ihrer Klartext-Frage + Ihren eigenen Vertriebs-Daten)

**KI-Anbieter:** AWS Bedrock (Claude Sonnet, Titan Embeddings) in der EU-Region `eu-central-1` (Frankfurt). Der Region-Pin ist im Code enforced — Aufrufe ausserhalb der EU werden vom System abgelehnt.

**Audio-Transkription:** Aktuell im Internal-Test-Mode ueber OpenAI Whisper (US-Hosting). Vor produktivem Einsatz mit echten Kunden wird der Anbieter auf Azure OpenAI Whisper EU umgestellt (Code-Pfad bereits vorbereitet).

**Was nicht passiert:**
- Keine Profilbildung im Sinne automatisierter Einzelfallentscheidungen
- Keine Weitergabe von Trainingsdaten an die KI-Anbieter (Bedrock-DPA enthaelt No-Training-Klausel)
- Keine KI-Verarbeitung von Daten ohne Auftrag (KI-Werkzeuge sind on-click, keine Hintergrund-Verarbeitung)

## 4. Empfaenger der Daten / Auftragsverarbeiter

Wir setzen folgende Auftragsverarbeiter ein:

| Anbieter | Zweck | Region | DPA |
|---|---|---|---|
| Hetzner Online GmbH | Hosting der Plattform (Server, Datenbank, Storage) | Falkenstein/Nuernberg (DE) | abgeschlossen |
| AWS Bedrock | KI-Modelle (Claude Sonnet, Titan Embeddings) | `eu-central-1` Frankfurt (DE) | abgeschlossen |
| IONOS SE | E-Mail-Server (IMAP/SMTP) | DE | abgeschlossen |
| OpenAI *(Internal-Test-Mode, US)* | Audio-Transkription Whisper | US | **in Aktivierung** — Switch auf Azure-EU vor Customer-Live |
| Azure OpenAI *(geplant)* | Audio-Transkription Whisper EU-Hosting | EU | wird vor Customer-Live abgeschlossen |
| SMTP-Versand-Provider | E-Mail-Versand-Layer | EU | abgeschlossen |
| SIP-Trunk-Provider *(tbd)* | Telefonie | EU-Anforderung | wird vor Customer-Live abgeschlossen |

Self-gehostete Komponenten (Asterisk, Cal.com, Jitsi+Jibri, Supabase) laufen ausschliesslich auf unserer Hetzner-Infrastruktur (DE). Es findet **keine Datenweitergabe** an Dritte ausserhalb des Hetzner-DPA statt.

## 5. Cookies und Tracking

Diese Plattform verwendet:

- **Technisch notwendige Cookies** fuer Login und Session-Verwaltung (Supabase Auth, HTTP-Only, Secure, SameSite=Lax). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
- **Keine Marketing-Cookies, kein Werbe-Tracking, keine Drittanbieter-Analytics.**
- **Keine Cookie-Consent-Banner** noetig, da nur technisch notwendige Cookies eingesetzt werden.

E-Mail-Tracking-Pixel werden ausschliesslich auf von Ihnen versandten E-Mails an Ihre eigenen Geschaeftspartner verwendet — und nur, wenn Sie das im Composing-Studio aktivieren. Es handelt sich nicht um Web-Tracking durch Drittparteien.

## 6. Ihre Rechte (Art. 15-22 DSGVO)

Sie haben folgende Rechte:

- **Auskunft** (Art. 15 DSGVO): Sie koennen jederzeit eine Kopie Ihrer gespeicherten Daten anfordern.
- **Berichtigung** (Art. 16 DSGVO): Falsche Daten koennen Sie direkt im System editieren oder durch uns korrigieren lassen.
- **Loeschung** (Art. 17 DSGVO): Sie koennen jederzeit die Loeschung Ihres Accounts anfordern. Eine kaskadierende Loeschung Ihrer eigenen Stammdaten ueber alle verknuepften Tabellen ist im System implementiert. Ein audit-Log-Backup-Eintrag verbleibt fuer Nachweispflichten (Art. 30 DSGVO).
- **Einschraenkung der Verarbeitung** (Art. 18 DSGVO): auf Anfrage.
- **Datenuebertragbarkeit** (Art. 20 DSGVO): Export Ihrer Daten als strukturiertes JSON ueber die Export-API moeglich.
- **Widerspruch** (Art. 21 DSGVO): auf Anfrage.
- **Widerruf einer Einwilligung** (Art. 7 Abs. 3 DSGVO): Insbesondere Audio-Aufnahme-Einwilligungen koennen Sie ueber die Public-Consent-Seite jederzeit widerrufen.

Anfragen richten Sie bitte an: [datenschutz@strategaize.io oder ueber das Kontaktformular]

## 7. Beschwerderecht bei einer Aufsichtsbehoerde

Sie haben das Recht, sich bei der zustaendigen Datenschutz-Aufsichtsbehoerde zu beschweren. Aufgrund des NL-Sitzes ist primaer zustaendig:

**Autoriteit Persoonsgegevens** (Datenschutzbehoerde NL)
Postbus 93374
2509 AJ Den Haag
Niederlande
Web: https://www.autoriteitpersoonsgegevens.nl

Bei Verarbeitung mit DE-Bezug (z.B. deutsche Kunden) kann zusaetzlich die zustaendige Datenschutzbehoerde des jeweiligen Bundeslands kontaktiert werden.

## 8. Audit-Trail und Nachweispflicht

Aenderungen an personenbezogenen Daten werden in einem internen Audit-Log (`audit_log`-Tabelle) protokolliert mit:

- wer (`actor_id`, plus seit V8.1 `caller_role`)
- was (`action`, `entity_type`, `entity_id`)
- wann (`created_at`)
- welche Aenderung (`changes` JSONB mit Before/After-Diff)

Bei Profil-Loeschungen werden Backup-Felder (`display_name_backup`, `role_backup`, `team_id_backup`) im Audit-Log persistiert, damit die Loeschungs-Nachweispflicht (Art. 30 DSGVO) auch nach Entfernung der primaeren Profile-Row erfuellbar bleibt.

## 9. Datensicherheit

- Datenuebertragung ueber HTTPS (TLS 1.2+)
- Passwoerter werden mit bcrypt gehasht (PostgreSQL `pgcrypto`)
- Row-Level-Security (RLS) auf allen Geschaefts-Tabellen — User sehen nur eigene Daten
- 8-Layer Defense-in-Depth bei kritischen Mutationen (z.B. Profil-Loeschung)
- Audio-Aufnahmen werden nach 7 Tagen automatisch geloescht (Datensparsamkeit)
- IMAP-E-Mails nach 90 Tagen Auto-Delete
- Keine Logs mit personenbezogenen Daten im Klartext (E-Mail-Bodies, Audio-Inhalt, IP/UA werden nur gehasht geloggt)
- Region-Pin auf EU fuer alle KI-Aufrufe (Code-enforced, nicht nur ENV)

## 10. Aenderungen dieser Datenschutzerklaerung

Wir behalten uns vor, diese Datenschutzerklaerung anzupassen, wenn sich technische Aenderungen am System oder rechtliche Anforderungen ergeben. Die jeweils aktuelle Version ist unter `/datenschutz` veroeffentlicht.

**Stand:** 2026-05-22 (V8.1)

---

## TODOs fuer V8.2-Slice (Public-Page-Implementierung)

- [ ] Konkrete Adress-Daten aus Holding-Memory (Swalmen-Adresse) + KvK-Nr. + BTW-Nr. (Strategaize Transition BV)
- [ ] DSB-Status klaeren (intern oder extern, oder noch nicht benoetigt)
- [ ] E-Mail-Kontakt-Adresse fuer Datenschutz-Anfragen aufsetzen (`datenschutz@strategaize.io`)
- [ ] Public-Consent-URL-Pattern eintragen (V4 FEAT-411)
- [ ] Vor Veroeffentlichung: Anwalts-Pruefung (Pre-Customer-Live-Gate per `feedback_compliance_gate_later`)
- [ ] Footer-Component mit `/datenschutz`-Link in App-Layout
