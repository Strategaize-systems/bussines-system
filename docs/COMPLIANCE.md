# DSGVO-Compliance-Dokumentation

> **Erstellt:** 2026-04-25 (V5.2-Release-Stand)
> **System:** Strategaize Business Development System
> **Delivery Mode:** internal-tool
> **Status:** Beschreibender Stand nach Abschluss V5.2 (Compliance-Sprint)
>
> **Hinweis:** Diese Dokumentation ist eine pragmatische technische Standardvorlage und stellt **keine Rechtsberatung** dar. Sie beschreibt, wie das System personenbezogene Daten technisch verarbeitet. Vor produktivem Einsatz mit echten Kunden- oder Interessentendaten ist eine **anwaltliche Pruefung** durch eine qualifizierte Datenschutzbeauftragte/einen qualifizierten Datenschutzbeauftragten erforderlich.

---

## Inhaltsverzeichnis

1. [Erhobene personenbezogene Daten](#1-erhobene-personenbezogene-daten)
2. [Datenfluesse pro Quelle](#2-datenfluesse-pro-quelle)
3. [Speicherorte und Regionen](#3-speicherorte-und-regionen)
4. [Retention-Policies](#4-retention-policies)
5. [Drittanbieter-Liste](#5-drittanbieter-liste)
6. [Auftragsverarbeitungsvertraege (DPA-Status)](#6-auftragsverarbeitungsvertraege-dpa-status)
7. [Loeschkonzept](#7-loeschkonzept)
8. [Datenschutzkonforme Defaults](#8-datenschutzkonforme-defaults)

---

## Projektkontext

Das **Strategaize Business Development System** ist ein internes, KI-gestuetztes Vertriebs- und Beziehungssystem fuer ein beratungsintensives B2B-Geschaeft. Es verarbeitet Daten zu Multiplikatoren, Unternehmer-Leads, Gespraechen, Anrufen, Meetings, Angeboten und Empfehlungen. Es ist **kein generisches CRM** und **kein SaaS-Produkt**, sondern ein internes Werkzeug mit kleinem Nutzerkreis (V1: Single-User Eigentuemer, V7+: ggf. 1-2 interne Personen).

**Verantwortlich** fuer die Datenverarbeitung ist die Strategaize-Inhaberin/der Strategaize-Inhaber als alleiniger Betreiber des Systems. Es gibt **keine externen Endnutzer** und **keine Multi-Mandanten-Architektur**.

---

## 1. Erhobene personenbezogene Daten

Das System verarbeitet personenbezogene Daten ausschliesslich zur Steuerung von Vertriebs- und Beziehungsprozessen. Die folgenden Datenkategorien werden erhoben:

### 1.1 Stammdaten von Kontakten und Multiplikatoren
- Vor- und Nachname
- E-Mail-Adresse, Telefonnummer
- Firma, Position, Branche, Region, Sprache
- Quelle der Beziehung (z.B. Empfehlung, Veranstaltung)
- Beziehungstyp (Steuerberater, Unternehmer, Bank, etc.)
- Vertrauens-/Beziehungstiefe-Bewertung
- Empfehlungsfaehigkeit, thematische Relevanz
- DSGVO-Felder: `consent_status`, `consent_date`, `consent_source`, `consent_token`, `opt_out_communication`

### 1.2 Stammdaten von Firmen
- Firmenname, Branche, Region, Website
- Eignungsbewertung (Exit-Bezug, Eigentuemerstruktur, Budgetpotenzial)
- Strategische Relevanz, Blueprint-Fit
- Verknuepfungen zu Kontakten und Deals

### 1.3 Vertriebsbezogene Daten
- Deals (Pipeline-Stufe, Wert, Status, naechster Schritt)
- Aktivitaeten (Notizen, Anrufe, Meetings, E-Mails, Stage-Wechsel)
- Angebote und Vorschlaege
- Gespraechsnotizen (strukturiert: Einwaende, Chancen, Risiken)

### 1.4 Kommunikationsdaten
- E-Mails (eingehend via IMAP, ausgehend via SMTP) inkl. Headers, Body, Anhaenge
- E-Mail-Tracking-Events (Pixel-Open, Link-Click) — nur fuer interne Erfolgsmessung
- Anruf-Metadaten (Zeitpunkt, Dauer, Richtung, Status)
- Meeting-Metadaten (Titel, Termin, Teilnehmer, Agenda)

### 1.5 Audio- und Transkriptionsdaten (FEAT-404, FEAT-513)
- Anruf-Aufnahmen (WAV/Opus) — **ausschliesslich nach expliziter Einwilligung** der Gespraechspartner (V5.2: Internal-Test-Mode, kein produktiver Einsatz mit Kunden bis Compliance-Sprint deployed ist)
- Meeting-Aufnahmen (Jitsi/Jibri) — **ausschliesslich nach expliziter Einwilligung** auf der Public-Consent-Page
- Transkripte (Whisper)
- KI-Zusammenfassungen (Bedrock Claude Sonnet)

### 1.6 KI-abgeleitete Daten
- Klassifikationen von E-Mails (relevant/irrelevant/auto-reply)
- Wiedervorlage-Vorschlaege
- Signal-Extraktionen (Kaufsignale, Risikosignale)
- Einbettungen (Vektor-Embeddings) fuer semantische Suche (RAG, FEAT-401)

### 1.7 Audit-Daten
- `audit_log` — Wer hat was wann geaendert (actor_id, action, entity_type, entity_id, changes JSONB, context)
- Public-Consent-Events: `actor_id = NULL`, dafuer `ip_hash` und `user_agent_hash` (gehasht via SHA-256, **nicht** im Klartext)
- Recording-Lifecycle-Events (started/completed/failed/deleted)

### 1.8 Was **nicht** erhoben wird
- Keine besonderen Kategorien personenbezogener Daten (Art. 9 DSGVO) — keine Gesundheits-, Religions-, politische Daten
- Keine Tracking-Daten von externen Nutzern (Cookies, Web-Analytics fuer Drittseiten)
- Kein Profiling im Sinne automatisierter Einzelfallentscheidungen

---

## 2. Datenfluesse pro Quelle

Datenfluesse werden ueber **Adapter-Patterns** gekapselt (siehe `data-residency.md`). Jede externe Schnittstelle laeuft ueber einen typisierten Provider, der ueber ENV-Variablen umkonfiguriert werden kann — kein direktes SDK-Coupling in der Business-Logik.

### 2.1 E-Mail eingehend (IMAP-Sync, FEAT-405)
```
IMAP-Server (IONOS DE) → IMAP-Sync-Cron (5 Min) → email_messages-Tabelle
                                                ↓
                                  Klassifikations-Cron (Bedrock Claude eu-central-1)
                                                ↓
                                  Auto-Zuordnung zu Deal/Kontakt (DEC-065)
                                                ↓
                                  RAG-Embedding (Bedrock Titan V2 eu-central-1)
```

### 2.2 E-Mail ausgehend (SMTP, FEAT-106 + FEAT-506)
```
Cockpit-UI / Cadence-Cron → Shared Email-Send-Layer (DEC-069)
                                                ↓
                                  Tracking-Pixel + Link-Wrapping
                                                ↓
                                  SMTP-Versand (eigener Provider)
                                                ↓
                                  email-Tabelle + emails_tracking_events
```

### 2.3 Anrufe (Asterisk, FEAT-511..513, V5.1)
```
Browser (SIP.js) ← WSS → Asterisk PBX (self-hosted Container)
                              ↓
                        MixMonitor schreibt WAV
                              ↓
                Call-Processing-Cron → Supabase Storage (call-recordings)
                              ↓
                        Whisper-Provider (V5.2: openai-US, geplant: azure-EU)
                              ↓
                        Bedrock Claude Sonnet (eu-central-1) → ai_summary
                              ↓
                  Activity (type='call') in der Deal-Timeline
```

### 2.4 Meetings (Jitsi+Jibri, FEAT-404)
```
Public Consent-Page (Token, IP/UA gehasht)
        ↓
  Meeting startet (Jitsi Container, JWT-Auth)
        ↓
  Jibri zeichnet auf (WAV) → Recording-Upload-Cron
        ↓
  Supabase Storage (meeting-recordings)
        ↓
  Whisper-Provider → Transcript
        ↓
  Bedrock Claude Sonnet (eu-central-1) → ai_summary
        ↓
  Activity in der Timeline (MeetingTimelineItem, FEAT-524)
```

### 2.5 Cal.com Buchungen (FEAT-406)
```
Cal.com (self-hosted in derselben Docker-Compose) → Webhook → calendar_events
```
Self-hosted, **keine Drittanbieter-Datenweitergabe**.

### 2.6 Wissens-Suche (RAG, FEAT-401)
```
Quelle (Meeting/Call/E-Mail/Activity) → Chunking-Service → Bedrock Titan V2 (eu-central-1)
                                                                        ↓
                                              knowledge_chunks (pgvector vector(1024))
                                                                        ↓
        Query → Bedrock Titan Embedding → pgvector Similarity Search → Bedrock Claude Sonnet → Antwort
```

### 2.7 KI-Voice-Agent (FEAT-514, V5.1, vorbereitet)
```
Eingehender Anruf → Asterisk Routing → SMAO Voice-Agent (Webhook) → calls.voice_agent_*
```
**Status V5.2:** vorbereitet, nicht aktiv (`SMAO_ENABLED=false`). Bei Aktivierung: SMAO erhaelt Anruf-Audio + Caller-ID. Aktivierung erst nach DPA + Pre-Go-Live-Pruefung.

---

## 3. Speicherorte und Regionen

Alle produktiv-relevanten Datenfluesse laufen ueber **EU-Endpunkte** (idealerweise Frankfurt/Deutschland). Verbindlich geregelt in `.claude/rules/data-residency.md`.

| Komponente | Anbieter | Region | DPA |
|---|---|---|---|
| Anwendungsserver (Cockpit) | Hetzner Cloud | Falkenstein/Nuernberg (DE) | ja |
| Datenbank (Supabase, self-hosted) | Hetzner Cloud | Falkenstein/Nuernberg (DE) | ja |
| Object-Storage (meeting-recordings, call-recordings) | Supabase Storage (im Hetzner-Container) | DE | ja (via Hetzner) |
| LLM (Claude Sonnet/Haiku) | AWS Bedrock | `eu-central-1` (Frankfurt) | ja |
| Embedding (Titan V2) | AWS Bedrock | `eu-central-1` (Frankfurt) | ja |
| SMTP-Versand | externer SMTP-Provider | EU | ja |
| IMAP-Empfang | IONOS | DE | ja |
| Cal.com | self-hosted im selben Hetzner-Container | DE | n/a (kein Drittanbieter) |
| Asterisk PBX | self-hosted im selben Hetzner-Container | DE | n/a (kein Drittanbieter) |
| Jitsi + Jibri | self-hosted shared mit Blueprint (DEC-036) | Hetzner DE | n/a (kein Drittanbieter) |
| Whisper (Speech-to-Text) | **V5.2-aktuell:** OpenAI API (`api.openai.com`, **US**) | US | nein — siehe Sektion 8 + AC9 |
| Whisper (geplant) | Azure OpenAI Whisper | EU (`westeurope` oder `germanywestcentral`) | ja (geplant) |
| Voice-Agent (vorbereitet) | SMAO GmbH (Berlin) | DE | bei Aktivierung erforderlich |

> **Wichtig (AC9):** Der aktuell konfigurierte Whisper-Provider ist OpenAI direkt (US-Hosting). Das ist bewusst eine **Internal-Test-Mode-Konstellation** (siehe DEC-081, V5.1 Released-Notes). Vor dem ersten produktiven Einsatz mit echten Kunden- oder Interessenten-Aufnahmen muss `TRANSCRIPTION_PROVIDER` auf `azure` umgeschaltet und die `AZURE_OPENAI_*`-ENV-Variablen in Coolify gesetzt werden. Der Adapter ist Code-fertig (SLC-522 done).

---

## 4. Retention-Policies

V5.2 definiert klare, ENV-konfigurierbare Aufbewahrungsfristen mit dem **Datensparsamkeits-Prinzip** als Leitlinie.

### 4.1 Audio-Rohdaten (WAV-Aufnahmen)
- **Default:** **7 Tage** (`RECORDING_RETENTION_DAYS=7`, V5.2-Hardening, vorher 30, DEC-043)
- Implementiert ueber `recording-retention`-Cron (taeglich 04:00 UTC)
- Cron loescht sowohl `meetings.recording_url` (Jitsi/Jibri) als auch `calls.recording_url` (Asterisk MixMonitor) aus Supabase Storage
- Setzt `recording_status='deleted'` und schreibt Audit-Log-Eintrag (actor_id=NULL, action='update', context='Recording retention: deleted after N days')
- **Quelle:** `cockpit/src/app/api/cron/recording-retention/route.ts`

### 4.2 Transkripte und KI-Zusammenfassungen
- **Permanent** in der Datenbank (DEC-043)
- Begruendung: Transkripte und Summaries sind die **abgeleiteten, datenschutzaermeren** Repraesentationen. Sie enthalten keine Stimme/Biometrie und sind die eigentliche Vertriebs-Information. Rohdaten werden als Risiko-Vehikel frueher entfernt, die Information bleibt erhalten.

### 4.3 IMAP-E-Mails
- **Default:** 90 Tage (`IMAP_RETENTION_DAYS=90`)
- Implementiert in `cockpit/src/lib/imap/retention.ts`
- Loescht alte `email_messages`-Rows nach Ablauf der Frist

### 4.4 Activities, Deals, Kontakte
- **Permanent** (kein Auto-Delete)
- Loeschung erfolgt manuell ueber das Cockpit (siehe Loeschkonzept)

### 4.5 Audit-Log
- **Permanent** (analog Activities)
- Wird benoetigt fuer Nachvollziehbarkeit von Consent-Aenderungen, Recording-Lifecycle und Datenzugriffen

### 4.6 Vektor-Embeddings (RAG)
- Lebensdauer **gekoppelt an die Quell-Entity** — wird die Quelle geloescht (z.B. ein Meeting), wird auch der Eintrag in `knowledge_chunks` mitgeloescht (manueller Schritt)
- Modellwechsel erfordert Re-Embedding (siehe `rag-embedding-pattern.md`)

### 4.7 Cadence-Tracking-Events
- Bleiben fuer Kampagnen-Auswertung permanent gespeichert
- Enthalten keine direkten personenbezogenen Daten ausser Kontakt-Referenz

---

## 5. Drittanbieter-Liste

### 5.1 Aktive Drittanbieter (V5.2)

| Anbieter | Zweck | Daten | Region | DPA |
|---|---|---|---|---|
| **Hetzner Online GmbH** | Hosting (Server, Storage, Cloud) | Alle Daten | DE (Falkenstein/Nuernberg) | ja |
| **AWS Bedrock** | LLM (Claude Sonnet/Haiku), Embeddings (Titan V2) | Text-Chunks, Prompts, KI-Outputs | `eu-central-1` (Frankfurt) | ja |
| **OpenAI** *(V5.2-aktuell, **US**)* | Whisper Speech-to-Text | Anruf-/Meeting-Audio (WAV) | US | **nein, in Aktivierung** — Switch auf Azure-EU vor Go-Live geplant |
| **IONOS SE** | IMAP/SMTP fuer Geschaefts-E-Mail | E-Mail-Inhalte, Headers | DE | ja |
| **Cal.com** *(self-hosted)* | Terminbuchung | Buchungs-Metadaten | self-hosted (DE) | n/a |
| **Asterisk** *(self-hosted)* | PBX/Telefonie | Anruf-Metadaten, Audio-Capture | self-hosted (DE) | n/a |
| **Jitsi + Jibri** *(self-hosted, shared mit Blueprint)* | Video-Meetings + Recording | Meeting-Metadaten, Audio/Video-Capture | self-hosted (DE) | n/a |
| **SIP-Trunk-Provider** *(zu definieren)* | Eingehende/ausgehende Telefonie | Telefonnummern, Anruf-Metadaten | tbd (EU-Provider erforderlich) | erforderlich vor Go-Live |

### 5.2 Vorbereitete Drittanbieter (nicht aktiv)

| Anbieter | Zweck | Aktivierungs-Status |
|---|---|---|
| **SMAO GmbH** (Berlin) | KI-Voice-Agent fuer eingehende Anrufe (FEAT-514) | **vorbereitet, NICHT aktiv** (`SMAO_ENABLED=false`). Adapter-Pattern via DEC-075 (austauschbar via ENV `VOICE_AGENT_PROVIDER`). DPA-Abschluss erst bei Aktivierung. |
| **Synthflow** (Berlin) | Backup-Voice-Agent | Platzhalter, nicht implementiert (DEC-075) |
| **Azure OpenAI** | Whisper-EU-Hosting | Code-fertig (SLC-522), ENVs erst Pre-Go-Live setzen, dann `TRANSCRIPTION_PROVIDER=azure` |

### 5.3 Selbst betriebene Komponenten (kein Drittanbieter)

- **Asterisk PBX** — self-hosted Container in derselben Coolify-Stack
- **Cal.com** — self-hosted Container in derselben Coolify-Stack
- **Supabase** (Postgres + Storage + Auth + GoTrue) — self-hosted in derselben Coolify-Stack
- **Jitsi + Jibri** — self-hosted shared mit Blueprint-Plattform (DEC-036), Hetzner-DE

Die self-hosted Komponenten werden zwar **technisch** auf Hetzner-Servern betrieben, sind aber **organisatorisch** unter alleiniger Kontrolle des Betreibers — keine Datenweitergabe an Dritte ausserhalb des Hetzner-DPA.

---

## 6. Auftragsverarbeitungsvertraege (DPA-Status)

| Anbieter | DPA-Status | Anmerkung |
|---|---|---|
| Hetzner Online GmbH | **abgeschlossen** | Standard-DPA fuer Cloud-Server, deckt alle self-hosted Komponenten |
| AWS Bedrock (eu-central-1) | **abgeschlossen** | AWS-DPA mit Standardvertragsklauseln + EU-Region |
| IONOS SE (IMAP/SMTP) | **abgeschlossen** | IONOS-DPA fuer E-Mail-Hosting |
| OpenAI Whisper (US) | **NICHT abgeschlossen** | V5.2-Internal-Test-Mode. **Vor Go-Live:** Wechsel auf Azure OpenAI EU mit Microsoft-DPA |
| Azure OpenAI (geplant) | **abzuschliessen vor Go-Live** | Microsoft Online Services DPA + EU-Region |
| SMAO GmbH | **abzuschliessen vor Aktivierung** | Erst bei `SMAO_ENABLED=true` notwendig |
| SIP-Trunk-Provider | **abzuschliessen vor Go-Live** | Erst bei produktivem Anruf-Volumen |

> **Status V5.2:** Internal-Test-Mode. Das System wird ausschliesslich vom Betreiber selbst getestet (Echo-Extension, Self-Calls, eigene Test-Meetings). Keine echten Kunden- oder Interessentendaten werden derzeit ueber den nicht-EU-Whisper-Pfad verarbeitet. Pre-Go-Live-Wechsel auf Azure-EU ist Teil der Final-Check-Schritte.

---

## 7. Loeschkonzept

Das System unterstuetzt die DSGVO-Betroffenenrechte ueber folgende Mechanismen:

### 7.1 Recht auf Loeschung (Art. 17 DSGVO)
- **Kontakt-Loeschung** im Cockpit kaskadiert ueber Foreign-Keys auf:
  - `activities` (alle Aktivitaeten dieses Kontakts)
  - `meetings` (Meetings mit Kontakt-Verknuepfung)
  - `calls` (Anrufe mit Kontakt-Verknuepfung)
  - `emails` / `email_messages` (E-Mails mit Kontakt-Verknuepfung)
  - `signals` (KI-Signale)
  - `cadence_enrollments` (Cadence-Mitgliedschaften)
  - `consent` (Consent-Records des Kontakts)
- **Deal-Loeschung** kaskadiert auf alle deal-bezogenen Activities und Calls
- **Recordings** werden bei Loeschung der zugehoerigen Meeting/Call-Row aus Supabase Storage entfernt (vor V5.2 manuell, V5.2+ ueber Retention-Cron automatisch)

### 7.2 Recht auf Auskunft (Art. 15 DSGVO)
- Daten werden auf Anfrage manuell aus dem Cockpit exportiert (Kontakt-Detail, verknuepfte Activities/Meetings/Calls/E-Mails)
- Export-API (FEAT-504) liefert Deal- und Activity-Daten als strukturiertes JSON

### 7.3 Recht auf Berichtigung (Art. 16 DSGVO)
- Alle Felder im Cockpit sind ueber die UI editierbar
- `audit_log` zeichnet jede Aenderung nach (Actor, Timestamp, before/after)

### 7.4 Recht auf Datenuebertragbarkeit (Art. 20 DSGVO)
- Export ueber Export-API (JSON)
- DB-Dump-Export ist via Supabase-Admin-Tools moeglich (manueller Schritt)

### 7.5 Recht auf Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO)
- Public-Consent-Page (FEAT-411) bietet Token-basiertes **Granted/Declined/Revoked** fuer Aufnahme-Einwilligung
- `opt_out_communication`-Toggle stoppt Cadences und automatische Kommunikation (ISSUE-032)
- Audit-Trail fuer alle Consent-Aenderungen (`audit_log` mit `consent_revoked` etc.)

### 7.6 Automatische Loeschung
- **Recording-Retention-Cron** (taeglich 04:00 UTC) loescht WAV-Dateien aus Supabase Storage und setzt `recording_status='deleted'` nach 7 Tagen (Default V5.2)
- **IMAP-Retention** (`IMAP_RETENTION_DAYS=90`) loescht alte `email_messages`
- Alle Auto-Loeschungen werden im `audit_log` mit `actor_id=NULL` und Begruendungstext protokolliert

### 7.7 Loeschung von Drittanbieter-Daten
- AWS Bedrock: Anfragen werden gemaess AWS-DPA nicht persistiert (kein Training auf Kundendaten)
- OpenAI Whisper: gemaess OpenAI Enterprise-Policy keine Trainings-Nutzung, aber **US-Hosting bis Azure-Switch** (V5.2-Risiko, bewusst akzeptiert in Internal-Test-Mode)
- IONOS SMTP/IMAP: Standard-Mail-Provider-Retention

---

## 8. Datenschutzkonforme Defaults

V5.2 (Compliance-Sprint) hat eine Reihe von Defaults verankert, die ohne weiteres Zutun **datensparsam und einwilligungsorientiert** sind.

### 8.1 Recording-Retention 7 Tage (FEAT-521)
- `RECORDING_RETENTION_DAYS=7` als Default in `.env.example` und `docker-compose.yml`
- Vorher 30 Tage — durch SLC-521-Hardening auf 7 reduziert (DEC-043)
- ENV-konfigurierbar (kann hochgesetzt werden, z.B. fuer Audit-Anforderungen)

### 8.2 Einwilligungstexte als editierbare Templates (FEAT-523)
Settings-Seite **`/settings/compliance`** (SLC-523) verwaltet drei Compliance-Template-Bloecke:

| Template | Verwendung |
|---|---|
| `meeting_invitation` | Einwilligungs- und Datenschutzhinweis im Meeting-Einladungstext (Recording, KI-Auswertung) |
| `email_footer` | Standardisierter Datenschutz-Footer fuer ausgehende E-Mails (Cadences, manuelle Mails) |
| `calcom_booking` | Einwilligungs-/Datenschutztext im Cal.com-Buchungsflow |

Jeder Block kann **individuell editiert** werden, hat einen **Reset-auf-Default-Knopf** (Default-Text aus Skill mitgeliefert) und **Variablen-Tokens** (`{user_name}`, `{company_name}`, etc.) fuer dynamische Personalisierung. Daten gespeichert in `compliance_templates`-Tabelle (MIG-022).

> Diese Templates sind eine **pragmatische Standardvorlage** — nicht juristisch geprueft. Vor produktivem Einsatz pruefen lassen (siehe Disclaimer im Header).

### 8.3 Whisper-Provider als ENV-Konfiguration
`TRANSCRIPTION_PROVIDER` kann zwischen `openai` (V5.2-Default, US) und `azure` (EU, vorbereitet) umgeschaltet werden. Vor Go-Live mit echten Kundendaten **muss** auf Azure umgestellt werden.

### 8.4 Public-Consent-Page (FEAT-411)
- Token-basierter Zugang ohne Login
- IP- und User-Agent-Hashing (SHA-256, kein Klartext-Logging)
- Rate-Limiting gegen Brute-Force
- Token mit Ablauffrist (30 Tage)
- Audit-Trail jeder Aktion

### 8.5 Authentifizierung und Autorisierung
- Supabase Auth (E-Mail + Passwort) als Single-Source
- Row-Level-Security (RLS) auf allen geschaeftsrelevanten Tabellen aktiviert
- Storage-Zugriffe via `service_role` mit BYPASSRLS (DEC-080) — User-seitige Zugriffe gehen nur ueber server-side App-Routes mit expliziten Berechtigungs-Checks
- Audit-Log auf allen kritischen Aktionen (Consent-Changes, Recording-Lifecycle, Deal-Stage-Wechsel etc.)

### 8.6 Kommunikations-Opt-Out (`opt_out_communication`)
- Pro Kontakt setzbar (UI-Toggle)
- Stoppt automatisch laufende Cadences (Cadence-Engine pruefte vor Step-Execution)
- Verhindert KI-Wiedervorlagen-Vorschlaege fuer diesen Kontakt
- Toggle-Aenderungen werden im `audit_log` festgehalten

### 8.7 KI on-click statt Auto-Load
Keine KI-Pipeline laeuft auf Daten-Lade-Wegen automatisch durch — KI-Analysen werden **explizit angestossen** (Button-Klick, Cron mit klar definierten Triggern). Damit gibt es keine versehentliche Verarbeitung sensibler Daten ohne Trigger (DEC-058 + Memory `feedback_bedrock_cost_control.md`).

### 8.8 Logging
- **Geloggt:** Geschaefts-Events, Fehler-Stacks, Cron-Outputs, Audit-Aenderungen
- **NICHT geloggt:** E-Mail-Bodies im Klartext (nur Metadaten), Audio-Inhalte, Klartext-IP/UA von Public-Consent-Submissions
- Logs sind nicht oeffentlich, sondern nur ueber Coolify-Container-Logs zugaenglich (Hetzner DE)

---

## V5.3 — E-Mail Composing Studio

V5.3 (REL-018, deployed 2026-04-28) ergaenzt das System um ein Composing-Studio fuer ausgehende E-Mails. Es fuehrt **keine neue personenbezogene Datenkategorie** ein — alle verarbeiteten Daten sind bereits in den Sektionen 1.4 (Kommunikationsdaten), 1.5 (Audio/Transkripte) und 1.6 (KI-Daten) abgedeckt. Diese Sektion beschreibt drei zusaetzliche Datenfluesse, die mit V5.3 entstehen.

### Branding-Settings (FEAT-531)

**Daten:** Logo (Bild-Datei), Primaer-/Sekundaerfarbe (Hex), Schriftfamilie (System/Inter/Sans/Serif), Footer-Text (Markdown), Kontakt-Block (Name, Firma, Telefon, Web).

**Speicherung:**
- Logo-Datei: Supabase Storage Bucket `branding` (Postgres-Volume Hetzner DE), max 2 MB, MIME-Whitelist (PNG/JPEG/SVG/WebP)
- Farben, Schrift, Footer, Kontakt-Block: PostgreSQL-Tabelle `branding_settings` (Single-Row-Pattern, eine Zeile pro Installation)

**Auslieferung des Logos:** Server-Side-Proxy via `/api/branding/logo` Route — Storage-Public-URL ist nicht direkt extern erreichbar, der Browser laedt das Logo immer ueber den Next.js-Server (DEC-091). Cache-Buster `v=<timestamp>` wird bei jedem Upload neu gesetzt.

**Datenfluss:** User-Upload → App-Server (Validierung MIME + Size) → Storage. Mail-Renderer (`renderBrandedHtml`) liest die `branding_settings`-Row beim Versand und bettet Logo + Farben in den HTML-Body ein.

**Conditional Branding (DEC-102, V5.4-Polish):** Pro Farb-Feld kann der User per Toggle-Checkbox entscheiden, ob die Farbe gesetzt ist (NULL = nicht aktiv, Hex = aktiv). NULL-Werte fuehren zum `textToHtml`-Fallback ohne Branding — bit-identisch zu V5.2.

**Retention:** Branding-Settings persistiert bis User loescht oder Installation gewipt wird. Logo-Files werden beim Upload eines neuen Logos best-effort entfernt (alte Versionen bleiben sonst im Bucket).

**Drittanbieter:** keine — die gesamte Branding-Pipeline laeuft auf Hetzner DE (Coolify + Supabase self-hosted).

### Composing-Studio (FEAT-532, FEAT-533)

**Daten:** E-Mail-Betreff, E-Mail-Body (Plain-Text mit Variablen-Substitution), Empfaenger-/Sprache-/Kategorie-Felder als Vorausfuell-Vars an Bedrock; Deal-/Kontakt-Kontext-Snippet (Name, Firma, Position, Sprache, letzter Kontakt).

**Datenfluss KI-Vorlagen-Generator:**
1. User tippt oder diktiert (Whisper) eine kurze Anweisung ("Erstansprache fuer Steuerberater im Mittelstand")
2. App-Server schickt User-Prompt + System-Prompt an **AWS Bedrock Claude Sonnet (Region eu-central-1, Frankfurt)**
3. Bedrock liefert strukturiertes JSON (Title + Subject + Body + Sprache + Kategorie) zurueck
4. User editiert in der UI, speichert in `email_templates`-Tabelle (PostgreSQL, Hetzner DE)

**Datenfluss Live-Preview:**
- Body wird im Browser gerendert (250ms-Debounce, iframe-Sandbox).
- Beim Senden ruft Server-Action `sendComposedEmail` den Mail-Renderer auf, der die `branding_settings`-Row liest und SMTP-Versand startet.

**Was an Bedrock gesendet wird:** Body-Text + Empfaenger-Vorausfuell-Vars (Vorname, Firma, Position) + System-Prompt. Es wird **kein Audit-Log-Inhalt, kein historischer Mail-Body und keine Empfaenger-E-Mail-Adresse** an Bedrock gesendet.

**Audit-Log auf Server:** Geloggt werden Provider, Model, User-ID, Sprache, Body-Length (in Zeichen). Der **Mail-Body selbst wird NICHT in den Logs gespeichert** (siehe Sektion 8.8).

**Drittanbieter:**
- AWS Bedrock — eu-central-1 (Frankfurt), DPA via Strategaize-AWS-Account, BYO-Region
- Whisper (via openai-Default-Adapter, V5.2): wird im Composing-Studio fuer User-Self-Diktat verwendet (kein Kunden-Audio) — vor erstem produktiven Recording-Flow Pflicht-Switch auf Azure-OpenAI-EU (DEC-079, ISSUE-042)

**Retention:** Vorlagen persistiert bis User loescht. Ausgehende E-Mails werden in `email_message`-Tabelle persistiert (Sektion 1.4). KI-Audit-Eintraege folgen `audit_log`-Retention (Sektion 4).

### Inline-Edit-Diktat (FEAT-534)

**Daten:** Aktueller Mail-Body (User hat ihn bereits geschrieben oder aus Vorlage geladen) + Voice-Anweisung des Users ("Nach Satz 3 folgendes einbauen: …" oder "Schluss durch X ersetzen").

**Datenfluss:**
1. User klickt "Inline-Edit-Diktat" im Composing-Studio
2. Browser nimmt Audio auf (MediaRecorder), streamt Audio an App-Server
3. App-Server schickt Audio an **Whisper-Adapter (V5.2: openai-default; Azure-EU Code-Ready ab V5.2 — Pre-Pflicht-Switch vor erstem produktivem Recording)** → Transkript zurueck
4. Transkript + aktueller Body wird an **AWS Bedrock Claude Sonnet (eu-central-1)** gesendet mit harten System-Prompt-Constraints gegen Halluzination
5. Bedrock liefert neuen Body + Summary zurueck
6. UI zeigt Diff (`diffWords` aus `diff@9`), User akzeptiert oder verwirft
7. Bei Akzeptieren wird der Body im Composing-Studio aktualisiert

**Was wird persistiert:**
- Audio-Stream wird **NICHT** persistiert (live-stream ohne Disk-Schreibvorgang) — bleibt nur fuer die Dauer des Whisper-Calls im Server-RAM
- Transkript wird **NICHT** persistiert (nur weitergereicht an Bedrock)
- Neuer Body wird Teil der ausgehenden Mail (`email_message`, falls gesendet)

**Audit-Log:** Provider, Model, User-ID, Length-vorher, Length-nachher. Body-Inhalt wird NICHT geloggt.

**Drittanbieter:** Whisper-Provider (V5.2: openai-default, US-Endpoint — daher V5.3 Internal-Test-Mode); Bedrock (eu-central-1 Frankfurt). Pflicht-Switch auf Azure-OpenAI-EU vor erstem produktivem Recording-Flow.

---

## Disclaimer

Diese Dokumentation beschreibt den **technischen** Datenschutz-Stand des Systems zum Zeitpunkt **2026-04-25 (V5.2-Release)**. Sie ist eine **pragmatische Standardvorlage** und stellt **keine Rechtsberatung** dar. Insbesondere ersetzt sie nicht:

- die **anwaltliche Pruefung** der Einwilligungstexte und der Privacy Policy
- die formale **Einsetzung einer/eines Datenschutzbeauftragten** (sofern erforderlich)
- die **DSFA (Datenschutz-Folgenabschaetzung)** fuer die Audio-Aufnahme- und KI-Auswertungs-Pipelines (Art. 35 DSGVO)
- die **Auftragsverarbeitungsvertraege** mit allen aktiven Drittanbietern, insbesondere mit dem geplanten Azure-OpenAI-EU-Provider und dem SIP-Trunk-Provider vor Go-Live

Vor produktivem Einsatz mit echten Kunden- oder Interessentendaten sind diese Punkte zu klaeren. Die Dokumentation ist **manuell zu aktualisieren** bei wesentlichen Schema-, Provider- oder Region-Aenderungen — kein Auto-Refresh-Mechanismus implementiert.

---

**Letzte Aktualisierung:** 2026-04-28 (V5.3 + V5.4-Polish-Sektion ergaenzt — Composing-Studio + Conditional-Branding)
**Naechste empfohlene Pruefung:** Vor erstem Go-Live mit echten Kundendaten (Pre-Go-Live-Schritt nach SLC-525) — und vor dem Switch auf Azure-OpenAI-EU bei Aufnahme produktiver Recording-Flows
