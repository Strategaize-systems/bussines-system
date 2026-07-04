# DSGVO-Compliance-Dokumentation

> ⚠️ **HISTORIE / VERALTET (ab 2026-06-15):** Diese Datei ist die versions-chronologische Compliance-Dokumentation (V5.2–V5.7). Die **kanonische, konsolidierte und aktuelle** Fassung (Stand V8.15, Customer-Live-tauglich) liegt unter **`deliverables/COMPLIANCE.md`**. Diese Datei bleibt nur als Historie erhalten.

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

## V5.4 — E-Mail-Anhaenge-Upload (PC-Direkt)

V5.4 (REL-019, deployed 2026-04-29) ergaenzt das Composing-Studio um Direkt-Upload von Anhaengen vom User-PC. Es fuehrt **keine neue personenbezogene Datenkategorie** ein — E-Mail-Anhaenge sind bereits in Sektion 1.4 (Kommunikationsdaten) abgedeckt. Diese Sektion beschreibt die zusaetzliche Pipeline.

### Anhang-Upload (FEAT-542)

**Daten:** Vom User per Drag&Drop oder File-Picker hochgeladene Dateien. Whitelist (DEC-099): PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, PNG, JPG, GIF, TXT, CSV, ZIP. Max 10 MB pro Datei, 25 MB Total pro Mail. Inhalt der Anhaenge unterliegt User-Verantwortung — keine Server-side Inhalt-Inspection (DEC-100, B2B-Kontext, User legt eigene Files aus).

**Speicherung:**
- Datei: Supabase Storage Bucket `email-attachments` (privat, `public=false`, kein Public-Read), Hetzner DE
- Storage-Path-Pattern (DEC-098): `{user_id}/{compose_session_id}/{sanitized_filename}` — Filename wird ASCII-strict sanitized (`[^a-zA-Z0-9._-]/g → "_"`)
- Junction-Eintrag: PostgreSQL-Tabelle `email_attachments` mit FK zu `emails.id` `ON DELETE CASCADE` und Spalten `storage_path, filename, mime_type, size_bytes, created_at`

**Datenfluss:**
1. User dropt/picked Datei im Composing-Studio
2. Browser-side Whitelist-Validation (MIME + Extension + Pro-File + Total-Size)
3. POST `/api/emails/attachments` (Multipart) — Auth-Check + UUID-Path-Traversal-Schutz + Server-Re-Validation + Filename-Sanitization
4. Service-Role-Storage-Upload in Bucket `email-attachments`
5. Beim Mail-Versand: Service-Role-Storage-Download → Buffer → Nodemailer Multipart-Anhang
6. Nach erfolgreichem SMTP-Send: Junction-Insert in `email_attachments` (Best-Effort, kein Send-Fail bei Junction-Fehler)

**Auslieferung:** Anhaenge werden ausschliesslich beim Mail-Versand vom Server gelesen — KEINE oeffentliche URL-Auslieferung, KEIN Browser-Direkt-Read. Bucket ist privat. Service-Role-Zugriff nur server-side.

**Path-Owner-Check:** DELETE `/api/emails/attachments?path=...` prueft, dass `path` mit `{user.id}/` beginnt — User kann nur eigene Files loeschen.

**Was an Drittanbieter geht:** Anhaenge werden direkt per SMTP an den Mail-Empfaenger geschickt. **KEINE** KI-Verarbeitung, **KEINE** Bedrock-Calls, **KEINE** Whisper-Calls auf Anhang-Inhalten in V5.4. Mail-Body und Anhang-Metadaten gehen den uebliche V5.3-Pfad (KI-Improve, Inline-Edit) ohne Anhang-Inhalt.

**Audit-Log:** `audit_log` erweitert um `attachmentsCount` (Zahl, kein Inhalt). Filename und Storage-Path werden in `email_attachments`-Junction persistiert. Mail-Body wird NICHT in den Logs gespeichert (Sektion 8.8).

**Retention:**
- Junction-Rows in `email_attachments` haben `ON DELETE CASCADE` zu `emails`-Rows — Loeschung der Mail entfernt auch die Junction-Eintraege
- Storage-Files bleiben aktuell ohne Auto-Cleanup-Cron (DEC-104 deferred Tech-Debt) — verwaiste Files bei Compose-Session-Abandon (User schliesst Tab ohne Send) werden in V5.5+ Operations-Topic adressiert
- Bei Mail-Loeschung wird die Junction-Row geloescht, das Storage-File bleibt aber im Bucket (separater Cleanup-Cron erforderlich, V5.5+)

**Drittanbieter:** Keine — Bucket auf Hetzner DE, Storage und Anhang-Pipeline laufen vollstaendig auf eigener Self-Hosted-Supabase-Infrastruktur. SMTP-Provider erhaelt Anhaenge wie bei jeder normalen Mail mit Multipart-Body.

**Bekannte offene Punkte (ISSUE-045, V5.5+ Operations):**
- Server-side Total-Size-Limit ist Client-Convenience — Pro-File-Limit hart enforced (3-fach), Total-Limit nur Browser. Storage-Volumen-Quota oder Cross-Call-Tracking spaeter.
- Verwaiste-Files-Cleanup-Cron deferred (DEC-104).

---

## V5.5 — Angebot-Erstellung + Anhang-Pipeline

V5.5 (REL-020 in Vorbereitung) fuehrt die System-eigene Angebot-Erstellung mit PDF-Generierung, Status-Lifecycle und Composing-Studio-Integration ein. Die Daten sind bereits in den Sektionen 1.4 (Kommunikationsdaten) und 1.7 (Geschaeftsdaten) abgedeckt. Diese Sektion beschreibt die zusaetzlichen V5.5-Datenflows.

### Neue Datenobjekte

**`proposal_items`-Tabelle (FEAT-551, MIG-026):** Position-Liste pro Angebot mit `product_id` (FK auf `products`), `quantity`, `unit_price_cents`, `name_snapshot`, `description_snapshot`. Enthaelt **Geschaeftsdaten** (Preise, Mengen) — keine Person-Daten direkt.

**`proposals`-Tabelle Erweiterung (FEAT-551, MIG-026):** Zusaetzliche Spalten `parent_proposal_id` (Versionierungs-Link), `valid_until`, `payment_terms`, `pdf_storage_path`, Lifecycle-Timestamps (`sent_at`, `accepted_at`, `rejected_at`, `expired_at`). Geschaeftsdaten ohne neue personenbezogene Kategorie.

**`proposal-pdfs` Storage-Bucket (FEAT-551, FEAT-553):** Privater Bucket auf eigener Self-Hosted-Supabase-Infrastruktur (Hetzner DE). Enthaelt User-generierte PDFs mit Position-Items, Preisen, Konditionen, Branding (Logo, Adresse) und Kunde-Adresse aus dem verknuepften Deal. RLS-Policy beschraenkt SELECT/INSERT/UPDATE/DELETE auf `auth.uid()` im Pfad-Prefix.

**`email_attachments`-Junction Erweiterung (FEAT-555, MIG-026):** `source_type` (`'upload'` | `'proposal'`) und `proposal_id` (NULL fuer Upload). CHECK-Constraint enforced Daten-Konsistenz. Keine neuen personenbezogenen Daten ueber den V5.4-Stand hinaus.

### Datenflows

**Angebot erstellen (FEAT-552 Workspace):** User oeffnet `/proposals/[id]/edit`, native React-State mit Custom-Debounce, explizites Save via Server Action. Position-Items werden mit `name_snapshot` + `unit_price_cents_snapshot` persistiert (DEC-107) — Snapshots sind absichtlich unveraenderlich, damit historische Angebote bei Produkt-Updates nicht ploetzlich andere Preise zeigen.

**PDF-Generierung (FEAT-553):** `pdfmake` (~700 KB Dependency, lokal, kein API-Call) rendert das PDF server-side mit Branding (Logo, Farben, Adresse aus `branding_settings`). Persistiert in `proposal-pdfs/{user_id}/{proposal_id}/v{version}.pdf` (oder `.testmode.pdf` im Internal-Test-Mode, DEC-113). Audit-Eintrag mit `context='PDF generated v{N}'`.

**Mixed-Content-Hotfix (Commit `91020b2`):** Server-Proxy `/api/proposals/[id]/pdf` ersetzt direkten Storage-Signed-URL — Authentifizierung via Server-Side Supabase-Session (RLS implicit), kein Token im URL.

**Status-Lifecycle (FEAT-554):** `transitionProposalStatus(id, newStatus)` mit Whitelist-gekapseltem Server-Action (`transitions.ts`: `draft → sent → accepted | rejected | expired`). Idempotent (gleicher Status = No-op). Terminale States (`accepted`/`rejected`/`expired`) erlauben keine Folge-Transitionen. Audit-Log-Eintrag mit `action='status_change'`, `changes={before, after}`, `actor_id=user.id`. Auto-Expire-Cron `0 2 * * *` Berlin (DEC-110) markiert Proposals mit `valid_until < NOW()` AND `status='sent'` als `expired`.

**Composing-Studio-Anhang (FEAT-555):** `<ProposalAttachmentPicker>` zeigt alle Proposals des aktuellen Deals (DEC-112). `attachProposalToCompose` validiert `pdf_storage_path != NULL`. Beim Send laedt `send.ts` den Buffer aus `proposal-pdfs` (statt `email-attachments`), Junction-Insert mit `source_type='proposal'`+`proposal_id` (CHECK-Constraint enforced), idempotenter `transitionProposalStatus(proposalId, 'sent')` nach erfolgreichem Send.

### Audit-Log

`audit_log` erweitert um:
- `entity_type='proposal'`, `action='status_change'` — alle Lifecycle-Wechsel persistiert
- `entity_type='proposal'`, `action='update'`, `context='PDF generated v{N}'`
- Auto-Expire-Cron mit `context='Auto-expire by cron — valid_until passed'`

### Retention

- `proposals` + `proposal_items`: keine Auto-Cleanup. `ON DELETE CASCADE` von Items zu Proposal.
- `proposal-pdfs` Storage-Files: bleiben bei Composing-Anhang-Loeschung erhalten (Audit-Wahrheit, AC9 SLC-555). Cleanup-Cron deferred bis V5.6+ (Storage-Volumen-Wachstum als Operations-Topic).
- `email_attachments`-Junction: `ON DELETE CASCADE` zu `emails`. Storage-File bleibt unabhaengig.
- `audit_log`: keine Auto-Loeschung.

### Drittanbieter

Keine neuen Drittanbieter in V5.5: pdfmake ist lokale Dependency, Storage auf Hetzner DE, Branding aus eigener Tabelle, SMTP-Provider erhaelt PDF-Anhaenge wie bei jeder Multipart-Mail.

### Bekannte offene Punkte

- Storage-Volumen-Wachstum (Cleanup-Cron in V5.6+).
- Pre-Production-Compliance-Gate vor V5.6: Anwalts-Pruefung der V5.4 + V5.5-Sections, Switch auf Azure-OpenAI-EU-Whisper, ISSUE-042-Schliessung. Internal-Test-Mode bleibt aktiv bis dorthin.
- ISSUE-047 (F1 Hydration #418): UI-funktional unauffaellig, kein Datenschutz-Risiko.

---

## V5.7-Erweiterung: NL-VAT + Reverse-Charge fuer EU-B2B-Cross-Border (2026-05-04)

> **Hinweis:** Diese Sektion beschreibt die **steuerrechtliche** Aenderung an den Angebot-PDFs in V5.7. Sie ist **keine Rechts- oder Steuerberatung** und ersetzt nicht die Pruefung durch eine Steuerberatung/einen Steuerberater oder Wirtschaftspruefer/in. Vor produktivem Versand muss insbesondere die ICP-Meldungspflicht (Opgaaf ICP) mit der NL-Steuerberatung geklaert sein.

### Kontext

Strategaize Transition GmbH sitzt in den Niederlanden (Swalmen, NL). Rechnungen und Angebote muessen NL-Steuerlogik abbilden, nicht deutsche. V5.7 macht das Angebot-PDF NL+DE-konform und ergaenzt die Reverse-Charge-Logik fuer B2B-Empfaenger im EU-Ausland.

### Steuersaetze

Die DB-Whitelist (`proposals.tax_rate` CHECK-Constraint, MIG-028) erlaubt nur die folgenden Werte:

| Wert | Bedeutung | Land |
|---|---|---|
| 21.00 | Standard-Satz NL | NL (Default fuer neue Angebote bei `business_country='NL'`) |
| 19.00 | Standard-Satz DE (Legacy) | DE (Default fuer neue Angebote bei `business_country='DE'`) |
| 9.00 | Reduzierter Satz NL | NL |
| 7.00 | Reduzierter Satz DE | DE |
| 0.00 | Steuerfrei / Reverse-Charge / Innergemeinschaftliche B2B-Lieferung | NL + DE |

Alte 19%-Angebote aus V5.5/V5.6 (vor Umstellung auf NL-Modus) bleiben unveraendert (Snapshot-Prinzip aus DEC-107). Der Editor zeigt den Legacy-Wert read-only mit Hinweis auf den NL-Mode-Wechsel.

### Reverse-Charge / Intracommunautaire Prestatie ("BTW verlegd")

Bei B2B-Empfaengern in einem anderen EU-Mitgliedsstaat als NL kann nach Artikel 196 EU-VAT-Directive 2006/112/EC die Steuerschuld auf den Empfaenger uebertragen werden ("Reverse-Charge", niederlaendisch "BTW verlegd"). Voraussetzungen — alle muessen erfuellt sein:

1. **Sender-VAT-ID:** `branding_settings.vat_id` ist gesetzt und entspricht dem NL-Format `^NL\d{9}B\d{2}$` (z.B. `NL859123456B01`)
2. **Empfaenger-VAT-ID:** `companies.vat_id` ist gesetzt und entspricht dem EU-Format `^[A-Z]{2}[A-Z0-9]{2,12}$` mit gueltigem Country-Code (z.B. `DE123456789`, `AT12345678`, `FR12345678901`)
3. **Empfaenger-Country:** `companies.address_country` ist in der EU 27-Whitelist (Stand 2026) und ungleich `'NL'`. Drittlaender wie `UK` (Brexit), `CH`, `US` sind ausgeschlossen.

Wenn alle drei Voraussetzungen erfuellt sind, kann der User im Angebot-Editor den Reverse-Charge-Toggle aktivieren. Beim Aktivieren werden zwei Felder simultan gesetzt: `reverse_charge=true` und `tax_rate=0.00`. Der Server-Action `saveProposal` validiert die Konsistenz mit einer Pure Function `validateReverseCharge` und liefert bei Verstoss eine deutsche Fehlermeldung (vier Reject-Pfade: tax_rate != 0, branding.vat_id missing, company.vat_id missing, country = NL or non-EU).

Eine DB-CHECK-Constraint enforced die Konsistenz auch auf Schema-Ebene (Defense-in-Depth): `reverse_charge=true → tax_rate=0`.

### Audit-Eintraege

Bei tatsaechlicher Reverse-Charge-Status-Aenderung (Toggle ON oder OFF) wird ein `audit_log`-Eintrag erzeugt:

- `actor_id` = aktueller User
- `action` = `'reverse_charge_toggled'`
- `entity_type` = `'proposal'`
- `entity_id` = Proposal-UUID
- `changes` = `{ before: { reverse_charge, tax_rate }, after: { reverse_charge, tax_rate } }`
- `context` = `'Reverse-Charge aktiviert'` oder `'Reverse-Charge deaktiviert'`

Save-Operationen ohne Toggle-Aenderung erzeugen KEINEN reverse_charge-Audit-Eintrag (Spam-Schutz).

### PDF-Renderer (FEAT-553-Erweiterung)

Der pdfmake-basierte PDF-Renderer wurde in V5.7 erweitert:

- **Reverse-Charge-Block:** Wenn `proposal.reverse_charge=true`, rendert direkt unter der Tax-Row im Summary-Block der bilinguale Hinweis "BTW verlegd / Reverse Charge — Article 196 VAT Directive 2006/112/EC" gefolgt von einer Zeile mit beiden VAT-IDs (Format: `BTW-Nr. {strategaize.vat_id} — BTW-Nr. {company.vat_id}`).
- **Strategaize-VAT-ID-Footer:** Wenn `branding_settings.vat_id` gesetzt ist, rendert die VAT-ID im Adress-Footer ueber dem Footer-Markdown. Bezeichner ist kontextabhaengig: bei `business_country='NL'` `BTW-Nr.`, sonst `USt-IdNr.`. Diese Zeile rendert auch ohne Reverse-Charge — die VAT-ID gehoert zur formellen Rechnungsadresse.

Die Renderer-Aenderungen sind strikt conditional: ein V5.5/V5.6-Proposal ohne `branding.vat_id` und ohne `reverse_charge` rendert bit-identisch zum V5.6-Output. Der Storage-Bucket `proposal-pdfs` enthaelt weiterhin die unveraenderten V5.5/V5.6-PDFs (kein Re-Render), nur frische Renderings nutzen die V5.7-Logik.

### Datenfluss

| Schritt | Komponente | Daten |
|---|---|---|
| Eingabe Strategaize-VAT-ID | `/settings/branding` (Settings-Page) | NL-Format `NL\d{9}B\d{2}` validiert inline |
| Eingabe Empfaenger-VAT-ID | `/companies/[id]/edit` (Company-Form) | EU-General-Format validiert inline mit Country-Code-Whitelist |
| Reverse-Charge-Toggle | Editor `/proposals/[id]/edit` | Hook `useReverseChargeEligibility` prueft 3 Voraussetzungen vor Aktivierung |
| Server-Action `saveProposal` | `app/(app)/proposals/actions.ts` | Pure Function `validateReverseCharge` blockt inkonsistente Saves |
| DB-Persistenz | `proposals` (CHECK-Constraint) | Schema-Defense-in-Depth |
| Audit-Eintrag | `audit_log` | Nur bei Status-Aenderung, mit Diff im `changes`-Feld |
| PDF-Render | `lib/pdf/proposal-renderer.ts` + `lib/pdf/reverse-charge-block.ts` | Conditional Block + Footer-VAT-ID |

### Datenschutzliche Einordnung

- **VAT-IDs sind keine personenbezogenen Daten im engeren Sinne** (Art. 4 Nr. 1 DSGVO), wenn sie sich auf juristische Personen beziehen. Die `companies.vat_id` ist daher rechtlich unkritisch.
- **Strategaize-VAT-ID** ist Eigen-Stammdatum, kein personenbezogenes Datum.
- Die VAT-IDs werden ausschliesslich auf den Angebot-PDFs des Senders/Empfaengers angezeigt — kein externes Sharing, keine API-Weitergabe.

### Offene Pflichten (NICHT in V5.7-Scope)

- **VIES-Online-Lookup** der VAT-IDs (BL-420) — momentan nur Format-Validation, kein Online-Check gegen das EU-VIES-System.
- **DE-Reverse-Charge § 13b UStG** (BL-421) — DE-Empfaenger mit Reverse-Charge ist andere Rechtsgrundlage und nicht in V5.7-Scope (nur EU-Cross-Border ausserhalb NL).
- **ICP-Meldungspflicht** (Opgaaf ICP) — bei tatsaechlichem Versand von Reverse-Charge-Rechnungen ist eine quartalsweise Zusammenfassende Meldung in NL Pflicht. **User-Reporting-Pflicht** — kein automatischer Export im System.
- **Drittland-Empfaenger** (UK, CH, US) — werden in V5.7 nicht unterstuetzt, Toggle bleibt disabled.
- **Multi-Currency-Reverse-Charge** — V7+ Scope.

### Architektur-Entscheidungen V5.7

DEC-122 superseded durch DEC-128 (NL+DE-Country-Switch global), DEC-123 (Reverse-Charge BOOLEAN + DB-CHECK), DEC-124 (vat_id Format-only validation), DEC-125 (PDF-Block bilingual hardcoded), DEC-126 (Audit-Eintrag bei Status-Aenderung), DEC-127 (Editor-Hook fuer Eligibility), DEC-128 (Country-Switch finale Strategie). Siehe `docs/DECISIONS.md` fuer Details.

### Migration

MIG-028 — 5 additive Aenderungen, idempotent: `proposals.tax_rate` CHECK-Whitelist `{0,7,9,19,21}`, `proposals.reverse_charge BOOLEAN NOT NULL DEFAULT false` mit Konsistenz-CHECK, `branding_settings.vat_id TEXT NULL`, `branding_settings.business_country TEXT DEFAULT 'NL'`, `companies.vat_id TEXT NULL`. Kein Daten-Migrations-Schritt, alte Rows bleiben unveraendert.

---

## V7 — Multi-User Profile-Lifecycle (2026-05-12, SLC-703)

V7 fuehrt 3 Server Actions ein, die personenbezogene Daten (auth.users-Konto, profiles-Row mit Anzeigename) eines Mitarbeiters anlegen, aendern und loeschen koennen. Jede der drei Aktionen schreibt einen vollstaendigen Audit-Trail in `audit_log` mit `entity_type = 'profile'` und `entity_id = <betroffener User-ID>`.

### Verarbeitungs-Vorgaenge

| Vorgang | Wer darf | Wann | Was wird verarbeitet |
|---|---|---|---|
| `invite_sent` | admin, teamlead (nur eigenes Team) | bei Einladung neuer Mitarbeiter | E-Mail-Adresse + Rolle + team_id + optional Anzeigename. GoTrue verschickt Set-Password-Magic-Link. |
| `role_changed` | admin | bei Rollen-Aenderung | old_role + new_role |
| `profile_deleted` | admin | beim Loeschen eines ausgeschiedenen Mitarbeiters | display_name + Rolle + team_id als Backup im Audit-Payload (DSGVO-Loeschpflicht-konformer Trail) |

### DSGVO-Profile-Delete (Loeschpflicht Art. 17 DSGVO)

Profile-Delete folgt einem Hard-Lock-Pattern (DEC-193): Ein Profil darf nur dann geloescht werden, wenn der Mitarbeiter keine Owner-Records mehr in den 8 Kerntabellen (`companies`, `contacts`, `deals`, `activities`, `meetings`, `proposals`, `email_messages`, `calls`) hat. Vor dem Loeschen muss das Bulk-Reassign-Werkzeug (SLC-707) verwendet werden, um Owner-Eintraege auf einen anderen aktiven Mitarbeiter zu uebertragen.

**Auswirkungen des Delete:**
- `supabase.auth.admin.deleteUser()` loescht den Auth-Account (Login unmoeglich).
- `DELETE FROM profiles WHERE id = ...` entfernt die Profile-Row.
- FK `ON DELETE SET NULL` aus MIG-033 setzt `owner_user_id` in den 8 Kerntabellen automatisch auf NULL — fuer Records die durch Bulk-Reassign nicht verschoben wurden, gilt der System-Default (Owner = NULL).
- Der Audit-Trail behaelt `display_name` + `role` + `team_id` als Backup-Payload, damit Nachvollziehbarkeit der Loeschung gewahrt bleibt (Pflicht-Information fuer Datenschutz-Auskunftsrecht Art. 15 + 30 DSGVO).

### Audit-Trail-Felder

```
audit_log (
  actor_id,          -- der einladende/aendernde/loeschende User (auth.uid())
  action,            -- 'invite_sent' | 'role_changed' | 'profile_deleted'
  entity_type,       -- 'profile'
  entity_id,         -- der betroffene User (target)
  changes JSONB,     -- Payload, anbieter-konkret pro Action
  context TEXT       -- z.B. "V7 SLC-703 team invite"
)
```

Kein Passwort, kein GoTrue-Token, kein Klartext-PII jenseits dessen, was zur Nachvollziehbarkeit zwingend notwendig ist.

### Architektur-Entscheidungen V7-Profile-Lifecycle

- DEC-181 — 3-flaches Rollen-Modell (admin/teamlead/member), 1 User in 1 Team.
- DEC-193 — Profile-Delete Hard-Lock bei offenen Owner-Eintraegen.
- DEC-194 — Invite-Flow ueber GoTrue Auth-Invite, team_id Pflicht, Default-Rolle `member`.
- DEC-195 — `audit_log.actor_id` bleibt das einzige Akteurs-Feld; `view_as_target_user_id` kommt in SLC-706 als Drilldown-Verstaerker.

### Migration

MIG-033/034/035 — Owner-Spalten + Backfill + RLS-Switch. Bereits in SLC-701 dokumentiert. SLC-703 nutzt die existierenden Tabellen ohne weitere Schema-Aenderungen.

### Bekannte Out-of-Scope-Themen

- **GoTrue-Mailer Spam-Reputation** — bei Mail-Versand-Issues kann der Invite-Link manuell aus `auth.users.recovery_token` gezogen werden (siehe Slice-Risk R1 + Playwright-Recipe-Fallback). Falls Spam-Filter-Problem persistent: Resend-API-Wrapper-Pattern aus V5.3 ist verfuegbar, wird aber erst bei realem Bedarf implementiert.
- **Bulk-Reassign-UI** — SLC-707. Bis dahin muss Bulk-Reassign manuell per SQL durchgefuehrt werden, falls Mitarbeiter mit Bestandsdaten ausscheiden.
- **Drilldown-Read-Only-View** auf Mitarbeiter-Cockpit — SLC-706. Bis dahin gibt es nur den Verwaltungs-Tab.

## V7 — Owner-Wiring + System-Records (2026-05-12, SLC-704)

V7 SLC-704 verbindet das in SLC-701 angelegte Datenmodell mit dem Anwendungs-Code: Jede INSERT-Operation in eine der 8 Kerntabellen (`companies`, `contacts`, `deals`, `activities`, `meetings`, `proposals`, `email_messages`, `calls`) setzt jetzt `owner_user_id` explizit. RLS-Policies aus MIG-035 erzwingen Daten-Trennung pro Owner/Team-Scope/Admin-Sicht.

### Owner-Lifecycle pro Quelle

| Insert-Pfad | Owner-Source | Begründung |
|---|---|---|
| User-Facing Server Action (`createDeal`, `createCompany`, `createContact`, `createCall`, `createMeeting`, `sendEmail`, `createProposal`, `createTask`-Variants) | `(await getProfile()).user_id` | Der einloggende User ist der Eigentuemer (DEC-182). DEC-186 fuer Meeting+Call: Host-User = `auth.uid()`. |
| Cron-Job-Insert in Kerntabelle (`meeting-briefing-runner`, `meeting-summary-runner`, `call-processing-runner`) | Source-Record.owner_user_id (z.B. `meeting.owner_user_id`) | Cron erbt Owner vom ausloesenden Source-Record. Bei NULL: System-Record. |
| Workflow-Engine-Action (`create_task`, `create_activity`) | `entity.ownerUserId` (= triggerSource.owner_user_id) | DEC-185: Workflow-Rules sind team-shared, aber erzeugte Records behalten den Owner der Trigger-Quelle. Fallback NULL erlaubt. |
| IMAP-Inbound (`sync-service.ts`) | NULL (System-Record) | V7 hat keine per-User-IMAP-Config. Multi-User-IMAP kommt in spaeterer Migration. |
| Voice-Agent-Webhook (`/api/webhooks/voice-agent`) | Deal-Owner (Fallback Deal.created_by, dann NULL) | SIP-User-Mapping fehlt — naehrungsweise Owner = Deal-Owner. |
| Ad-hoc-Contacts (Meeting-Teilnehmer-Auto-Create) | Meeting-Owner | Host des Meetings ist der defacto-Owner der ad hoc angelegten Kontakte. |
| Drittanbieter-Webhook (`calcom-webhook-handler`) | n/a (schreibt in `calendar_events`, non-core) | Kein Owner-Wiring erforderlich. |

### System-Records (`owner_user_id IS NULL`)

System-Records sind Eintraege in den 8 Kerntabellen, die durch einen automatisierten Pfad ohne User-Context erzeugt werden. Sichtbar nur fuer `admin`-Rollen (RLS-Policy in MIG-035). Beispiele:

- **IMAP-Sync** synchronisiert eingehende E-Mails ohne User-Context (System-User-Config). `email_messages.owner_user_id = NULL`.
- **Voice-Agent-Webhook** falls weder Deal-Owner noch SIP-User-Mapping aufloesbar. `calls.owner_user_id = NULL`.
- **Workflow-Engine-Trigger** auf System-Records: erzeugte Activities erben NULL, da die Source-Quelle keinen Owner hat.
- **Bedrock-Cost-Audit** (V3 audit_log, non-core, kein owner_user_id).

System-Records sind ausdruecklich erlaubt und Teil des Designs (DEC-182). Admin kann sie sehen, Bulk-Reassign-Werkzeug (SLC-707) kann sie spaeter umverteilen.

### Owner-Lifecycle bei Lifecycle-Ereignissen

- **Profile-Delete (DEC-193, SLC-703)**: `ON DELETE SET NULL` setzt `owner_user_id` auf NULL fuer alle Eintraege. Records werden zu System-Records — Bulk-Reassign-Pflicht VOR Delete (Hard-Lock).
- **Bulk-Reassign (SLC-707, DEC-184)**: `UPDATE <table> SET owner_user_id = $new_owner WHERE owner_user_id = $old_owner` mit `SET LOCAL ROLE postgres` (RLS-Bypass). Audit-Eintrag pro Tabelle.
- **Read-Only-Drilldown (SLC-706, DEC-189)**: AsyncLocalStorage-basierter `runWithReadOnlyContext({ viewerUserId, targetUserId }, ...)`-Wrapper. Innerhalb des Drilldowns ruft jede Mutate-Server-Action `assertNotReadOnlyContext()` als First-Line; bei aktivem Context wird die Mutation mit Error blockiert.

### Mutate-Lockdown-Garantie (DEC-189)

Alle ~75 Mutate-Server-Actions (Insert/Update/Delete) im Repo rufen `await assertNotReadOnlyContext()` als FIRST LINE. Damit gilt:

- Top-Level-User-Server-Actions in `cockpit/src/app/(app)/<domain>/actions.ts` (27 Dateien, ~55 Funktionen) — alle gegated.
- Service-Level-Actions in `cockpit/src/app/actions/*.ts` (8 Dateien, ~14 Mutate-Funktionen) — alle gegated.
- Lib-Actions in `cockpit/src/lib/actions/*.ts` (3 Dateien, ~6 Mutate-Funktionen) — alle gegated.
- Settings-Actions in `cockpit/src/app/(app)/settings/*/actions.ts` (6 Dateien, 17 Mutate-Funktionen) — alle gegated.
- Team-Actions in `cockpit/src/lib/team/actions.ts` (3 Funktionen, SLC-703-Pattern) — alle gegated.

Auth-Pfade (`/login/actions.ts`) sind ausgenommen — Profile ist dort noch nicht geladen.

Crons + Workflow-Engine + Service-Internal-Inserts sind ausgenommen — kein User-Request-Context vorhanden, keine Drilldown-Bedrohung.

### Audit-Trail (Defense-in-Depth)

Wenn eine Mutate-Action im Read-Only-Context blockiert wird, wirft der Helper:
```
Error: Mutation blocked: read-only context active (viewer=<id>, target=<id>).
       Drilldown-View darf keine Server-Action-Mutation ausloesen.
```

Diese Errors werden serverseitig geloggt (Next.js error-handler). Persistente Drilldown-Audit-Eintraege schreibt der Page-Render-Pfad (SLC-706 Server Component) ueber `audit_log` mit `action = 'view_as'` und `view_as_target_user_id = $target` (DEC-195).

### Architektur-Entscheidungen V7-Owner-Wiring

- DEC-182 — `owner_user_id` auf 8 Kerntabellen, NULL = System-Record.
- DEC-184 — Bulk-Reassign mit audit_log-Trail, kein `previous_owner_user_id`-Feld (DSGVO via Audit-Retention).
- DEC-185 — Workflow-Rules + RAG + Auto-Winloss bleiben team-shared in V7. Owner-Filter optional in V7.5.
- DEC-186 — Meeting/Call-Owner = Host-User (Click-to-Call-User bei Calls).
- DEC-189 — Mutate-Lockdown via `assertNotReadOnlyContext()` First-Line in jeder Mutate-Action.

### Bekannte Schema-Diskrepanzen (Code-Realitaet)

- **`emails` vs. `email_messages` Tabellen-Split**: Outbound-Mails landen in der V2-Legacy-Tabelle `emails` (kein `owner_user_id`-Feld, kein DEC-182-Core-Table). Inbound-Mails landen in `email_messages` (DEC-182-Core-Table, Owner per IMAP-Config-User oder NULL). Konsequenz: V7-Multi-User-Sichtbarkeit greift nur fuer inbound. Outbound-Migration auf `email_messages` ist nach V7-Hauptpfad eingeplant.
- **`tasks`-Tabelle (V2-Legacy)** existiert separat von `activities`. Cadence-Engine + Voice-Agent insertTask schreiben in `tasks` — kein owner_user_id-Wiring. Migration nach V7-Hauptpfad eingeplant.
- **`calendar_events`** ist non-core; Cal.com-Webhook + Termine-Server-Action setzen `owner_user_id` nicht. RLS-Filter laeuft via FK-Beziehung zur Meeting-Tabelle.

Diese Diskrepanzen sind im AUDIT-Spreadsheet `docs/AUDIT_SERVER_ACTIONS_V7.md` Section 6 dokumentiert und nicht V7-blockierend, da die 8 V7-Kerntabellen vollstaendig wired sind.

---

---

## V7.1 — Settings-Permission-Layer + Drilldown-Polish (2026-05-16, REL-030)

V7.1 fuegt **keine neue personenbezogene Datenkategorie und keinen neuen Drittanbieter-Pfad hinzu**. Es haertet die in V7 eingefuehrte Multi-User-Berechtigungslogik und schliesst zwei Defense-in-Depth-Gaps (ISSUE-069 + ISSUE-070).

### Erweiterte Berechtigungslogik
- **Settings-Permission-Matrix:** 11 Subpages unter `/settings/*` erhalten eine 3-Rollen-Matrix (Admin/Teamlead/Member). Jede Server-Action prueft `assertRole(...)` als First-Line. Audit-Doc `/docs/AUDIT_SERVER_ACTIONS_V7.md` synchronisiert (DEC-196).
- **Filter-Scope im Drilldown:** Filter-State-Storage-Key haengt `viewAsUserId` an, sodass ein Admin im Read-Only-Drilldown nicht versehentlich seinen eigenen Filter auf die Drilldown-View sieht (DEC-200).
- **First-Line-Guards (4 Stellen):** `assertNotReadOnlyContext()` wurde an 4 weiteren Mutate-Stellen ergaenzt, die in V7 vergessen wurden (ISSUE-070, resolved).

### Datenschutzliche Einordnung
Keine neuen Daten. Bestehende DSGVO-Datenfluesse bleiben unveraendert. Die Aenderungen reduzieren das Risiko unbeabsichtigter Datenzugriffe oder versehentlicher Mutationen im Read-Only-Drilldown auf NULL. ISSUE-069 + ISSUE-070 resolved.

### Architektur-Entscheidungen V7.1
- DEC-196 — Settings-Permission-Matrix.
- DEC-200 — Filter-State-Storage-Key mit viewAsUserId-Postfix.
- DEC-201 — Vitest-Pattern fuer runWithReadOnlyContext-Wrapper.

---

## V7.2 — Test-Infrastruktur-Cleanup (2026-05-16, REL-031, data-only)

V7.2 ist ein **Test-Infrastruktur-Sprint ohne Production-Code-Aenderung** (data-only). Es fuehrt **keine neue personenbezogene Datenkategorie** ein. Der Production-Image bleibt der V7.1-Stand (`770dd55`).

### Was V7.2 macht
- Test-Seed (`seed:multi-user`) legt 7 `qa-*`-Test-Profile in der Coolify-Datenbank an plus 3 `qa-*`-Eintraege in `auth.users` plus 882 Seed-Rows (Demo-Activities/Deals/Companies/Contacts). Dies sind **synthetische Test-Daten**, keine realen Personendaten.
- Container-Bootstrap-Pattern dokumentiert (DEC-202): Test-Seed wird per `docker exec` manuell angewendet, kein Dockerfile-Hook.
- Vitest-RLS-Config-Cleanup (DEC-203).
- ISSUE-073 + ISSUE-074 resolved.

### Datenschutzliche Einordnung
Synthetische Test-Daten ohne realen Personenbezug. Test-Profile (`qa-admin`, `qa-teamlead-*`, `qa-member-*`) verwenden Fake-Mail-Adressen `qa-*@example.com` und Demo-Strings. **Keine echten Kundendaten in Test-Datenbank**. Internal-Test-Mode bleibt aktiv.

### Architektur-Entscheidungen V7.2
- DEC-202 — Test-Bootstrap via Manual-Apply.
- DEC-203 — Vitest-RLS-Config-Resolver.
- DEC-204 — qa-admin-UUID-Konvention.

---

## V7.5 — Natural-Language-Automation-Sculptor (2026-05-17, REL-032)

V7.5 fuehrt den **NL-Sculptor** ein — ein KI-Werkzeug, das Klartext-Eingaben des Admins in strukturierte Workflow-Automation-Regeln umsetzt (V6.2 FEAT-621-Erweiterung). Dies **erweitert die KI-Verarbeitung um eine neue Input-Quelle (Admin-Eigen-Eingaben)** ohne neue Drittanbieter.

### Neue Datenverarbeitung

**Was an Bedrock geht:**
- Klartext-Eingabe des Admins (z.B. "Bei Stage-Wechsel zu Verloren: Erstelle Activity mit Notiz")
- System-Prompt + 8 Few-Shot-Examples (statisch, repository-kontrolliert)
- Keine Activity-/Deal-/Kontakt-/Email-Daten als Context

**Wer:** Ausschliesslich Admin-Rolle (Permission-Layer in `applyNlRule()`-Server-Action).

**Was zurueck kommt:** Strukturiertes JSON (Trigger-Event + Conditions + Actions) gemaess `FIELD_WHITELIST` aus bestehender V6.2-Workflow-Logik. Re-Prompt-Loop max 2 Versuche bei Validation-Fail.

### Persistierung

- **`audit_log` mit `action='automation_rule.sculpt_attempt'`** (DEC-206): jeder Sculpt-Versuch wird persistiert mit JSONB-Metadata `{nl_input, sculptor_model_id, sculptor_cost_usd, attempt_count, result_status, result_payload}`. Reuse statt eigener Tabelle.
- **`audit_log` mit `action='automation_rule.create_via_nl'`** beim Apply: Verlinkung zur ursprunglichen Sculpt-Attempt-Audit-ID fuer DSGVO-Traceability.

### Cost-Audit (Datenfluss)

`audit_log` haelt explizit `cost_usd` pro Bedrock-Call. Cost-Calc-Formel basiert auf Bedrock-Response-Usage (`input_tokens` + `output_tokens`), keine Schaetzung (DEC-208). Real-Cost-Logging als Cross-Audit fuer Provider-Abrechnung.

### Region-Pin (DEC-211)

Bedrock-Client `cockpit/src/lib/llm/bedrock-client.ts:createBedrockClient()` wirft Exception wenn `BEDROCK_REGION !== "eu-central-1"`. **Strikte EU-Pin** — Region-Drift durch Mis-Config oder Provider-Wechsel wird Code-seitig verhindert. Dies haertet `data-residency.md`-Pflicht auf Code-Ebene.

### Apply-Confirmation (DEC-207)

Apply-Klick erfordert Modal-Confirm mit Pflicht-Checkbox ("Ich bestaetige: Diese Regel wird ab jetzt auf alle neuen <trigger_event>-Events angewandt") vor INSERT in `automation_rules`-Tabelle. Klick-Drift-Schutz gegen unbeabsichtigte Live-Schaltung von Regeln.

### Architektur-Entscheidungen V7.5
- DEC-205 — Single-Shot-Sculptor mit zod-Validate + 1x Re-Prompt.
- DEC-206 — NL-History via audit_log-Reuse.
- DEC-207 — Apply-Confirm-Modal mit Pflicht-Checkbox.
- DEC-208 — Real-Cost-Display nach Bedrock-Call.
- DEC-209 — Sculptor-File-Layout (6 Files unter `cockpit/src/lib/automation/`).
- DEC-210 — Middleware-Pfad-Regex `/^\/team\/[^/]+\//` fuer Drilldown-Header-Set.
- **DEC-211 — Bedrock-Region-Pin (compliance-relevant).**

---

## V7.6 — Custom-Reports + NL-Builder-Integration (2026-05-20, REL-033)

V7.6 fuehrt **user-gespeicherte Berichts-Vorlagen** ein. Ein Admin kann eine Free-Form-Frage im KI-Workspace stellen, das Ergebnis pruefen und die Frage als wiederverwendbare Vorlage abspeichern.

### Neue Datenobjekte

**`custom_reports`-Tabelle (MIG-037):**

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | UUID | Primary Key |
| `name` | TEXT (UNIQUE pro user_id) | Anzeigename ("Meine Berichte" Dropdown) |
| `description` | TEXT (NULL) | Optionale Erklaerung |
| `prompt_template` | TEXT | User-formulierte Frage (z.B. "Welche Deals stagnieren seit 14 Tagen ueber 50k Wert?") |
| `context_type` | TEXT | `'mein-tag'` oder `'cockpit'` (entscheidet Default-Daten-Loader) |
| `owner_user_id` | UUID | RLS-Owner |
| `created_at` / `updated_at` | TIMESTAMPTZ | Lifecycle |

**RLS-Policy:** Custom-Reports sind **pro Owner sichtbar/editierbar** (`auth.uid() = owner_user_id`). Admin sieht zusaetzlich alle (RLS-Switch-Spec aus MIG-035).

### Datenfluss

```
User-Frage (Free-Form) → KIWorkspace.handleSendFreeForm() →
  custom-report-runner.runCustomReportCore({ promptTemplate, contextType }) →
    Loader nach contextType:
      'mein-tag' → loadMeinTagContext (Activities heute + offene Tasks + aktive Deals last 30d)
      'cockpit' → loadCockpitContext (Pipeline-Aggregate + Top-10-stagnierend + Win/Loss last 30d)
    Bedrock-Call (claude-sonnet-4-6, eu-central-1) mit Pure-Function-System-Prompt →
  AnswerPane rendert MarkdownView mit "Als Bericht speichern"-Button →
  Save-Modal → saveCustomReport-Server-Action → custom_reports INSERT
```

### Was an Bedrock geht

Bei Custom-Report-Run werden **Geschaeftsdaten** des Owners als Context an Bedrock geschickt:
- Activities, Tasks, Deals des Owners (RLS-gefiltert)
- Pipeline-Aggregate fuer `context_type='cockpit'`
- Win/Loss-Stats last 30 Days

Persoenliche Stammdaten (Vor-/Nachname von Kontakten, Email-Adressen) sind **Teil des Activity-Context** und gehen mit. Bedrock-Region weiterhin `eu-central-1` (Region-Pin per DEC-211).

### Audit-Log

- `audit_log` mit `action='custom_report.created'` beim Save (Owner-ID, Name, prompt_template-Hash zur DSGVO-Auskunft).
- `audit_log` mit `action='custom_report.executed'` bei jedem Run inkl. `cost_usd`.
- `audit_log` mit `action='custom_report.renamed'` / `'.deleted'` bei Edits.

### Retention

- `custom_reports`-Rows: permanent bis User loescht.
- ON DELETE CASCADE bei Profile-Loeschung: User-eigene Custom-Reports werden mitgeloescht (DSGVO-Art-17-konform).

### Architektur-Entscheidungen V7.6
- DEC-212..214 — NL-Builder UX-Polish (kein neuer Daten-Pfad).
- DEC-215 — Context-Type-Default-Loader (Reuse bestehender V6.6-Loader).
- DEC-216 — Save-Trigger nur nach Bedrock-Result + nur bei Free-Form-Frage.
- DEC-217 — AnswerPane Discriminator (kein RenderRegistry-Refactor).
- DEC-218 — Slice-Cut.

---

## V8 — Hygiene-Sprint + KI-Verlustgrund-Vorschlag (2026-05-20, REL-034)

V8 ist ein **Hygiene-Sprint** mit 3 Slices ohne Schema-Migration (DEC-225). Es fuehrt **eine neue KI-Verarbeitung** ein (Verlustgrund-Vorschlag) und einen UI-konsistenten Provider-Naming-Refactor (Vendor-Lock-in-Vermeidung).

### Neue KI-Verarbeitung: Verlustgrund-Vorschlag (FEAT-804, SLC-813)

**Wann:** User zieht Deal in Stage "Verloren". Pflichtfeld `won_lost_reason` ist leer → StageRequirementsModal oeffnet mit Pre-Fill-Vorschlag.

**Was an Bedrock geht:**
- Deal-Stammdaten (ID, Titel, Wert, Stage-History)
- **Letzte 10 Activities** des Deals (Notizen, Anruf-Outcomes, Meeting-Summaries, Stage-Wechsel)
- **Letzte 3 Email-Threads** mit Snippet (200 Zeichen) je Mail
- System-Prompt mit JSON-Schema-Constraint (DEC-220)

**Was zurueck kommt:** Bis zu 3 strukturierte Verlustgrund-Vorschlaege mit Source-Angabe ("aus Mail vom DD.MM."), User waehlt einen oder schreibt eigenen.

**Cost:** ~$0.005-0.01 pro Call. audit_log `action='ki_loss_reason_suggested'` mit Status (`succeeded`/`skipped_empty_context`/`bedrock_error`/`parse_error`/`schema_error`/`deal_not_found`).

**Empty-Context-Heuristik:** Wenn 0 Activities UND 0 Emails → skip Bedrock-Call, return null sofort. Cost-Sparen + saubere "Kein KI-Vorschlag moeglich"-UI.

### KI-Provider-Naming-Abstrahierung (FEAT-802, SLC-812, DEC-221)

User-sichtbare Strings wie "Bedrock arbeitet", "Bedrock-Aufruf fehlgeschlagen", "Bedrock modifiziert" wurden auf neutrales "KI" substituiert. **0 Bedrock-/Claude-/Anthropic-/AWS-Strings im User-UI** (Grep-verifiziert).

**Datenschutzliche Einordnung:** Reine UI-Aenderung. Provider, Region, Model-ID bleiben unveraendert (Bedrock Claude Sonnet eu-central-1). Im audit_log wird weiter der vollstaendige `model_id`-String persistiert fuer technische Traceability. `formatModelDisplayName()`-Helper exportiert fuer kuenftige Multi-Provider-Anzeige.

### Stage-Requirements-Modal-Erweiterung (FEAT-804, SLC-813)

Drag-Drop auf eine der 5 Stages mit Pflichtfeldern (Angebot vorbereitet / Angebot offen / Verhandlung / Gewonnen / Verloren) oeffnet jetzt ein Modal statt Toast-Error (vorher: Stage-Wechsel blockiert ohne Self-Service-Pfad). User kann Pflichtfeld inline ausfuellen und bestaetigen → Stage-Wechsel + Activity-Log + ggf. audit_log `ki_loss_reason_suggested` in einer Transaktion.

`moveDealToStage`-Server-Action erweitert um 4. Parameter `requirementValues` (backward-compatible). Bei "Verloren": KI-Vorschlag-Loader laeuft inline im Modal.

### Architektur-Entscheidungen V8
- DEC-219 — Settings-3-Section-Refactor (UI-Hygiene).
- DEC-220 — Bedrock-Prompt-Template fuer Verlustgrund.
- DEC-221 — KI-Provider-Naming "KI" (Vendor-Lock-in-Vermeidung).
- DEC-222 — Modal-Scope (alle 5 Stages, KI-Suggest nur Verloren).
- DEC-223..224 — PRD-Konflikt-Resolution + Goals-Move.
- DEC-225 — Keine Schema-Migration, keine neue Cron.
- DEC-226 — Slice-Cut.

---

## V8.1 — Solopreneur-Mode + Sidebar-Konsolidierung + Teamlead-Permission-Erweiterung (2026-05-22, REL-035 stable)

V8.1 ist ein **Pre-Customer-Live-Hygiene-Sprint** ohne Schema-Migration und ohne neuen Bedrock-Pfad. Es **erweitert die V7-Audit-Trail-Erfassung** um ein forensisches Feld (`caller_role` im audit_log JSONB) und schliesst eine V7-Inkonsistenz in der Teamlead-Permission-Matrix.

### Solopreneur-Mode (FEAT-811, SLC-821)
Layout-Server-Side filtert TEAM-Sidebar-Section wenn `team_size === 1`. Helper `cockpit/src/lib/team/team-size.ts` berechnet `team_size` per Server-Side-Aggregat (`COUNT(*) FROM profiles WHERE team_id = X`) statt neuer denormalisierter Spalte (DEC-227). React `cache()`-Memoization pro Request.

**Keine neue Datenkategorie.** Reine Sidebar-Filterung fuer Solo-Admins ohne Team-Aggregat-Mitglieder.

### Sidebar-Konsolidierung (FEAT-811, SLC-822, DEC-228)
`VERWALTUNG_SETUP`-Section (14 Items) → `WERKZEUGE`-Section (3 Items: Handoffs / Referrals / Audit-Log). Die 11 entfernten Items bleiben als Tiles auf `/settings` erreichbar (Tile-Page-Konzept aus V8 wirkt). **Keine Daten- oder Permission-Aenderung.**

### Teamlead-Tile-Sichtbarkeit (FEAT-811, SLC-823, DEC-229)
`/settings/team`-Tile-Permission `ADMIN_ONLY` → `ADMIN_TEAMLEAD`. Inkonsistenz zur Sidebar-Eintrag-Permission geschlossen (Teamlead findet die Seite jetzt sowohl via Sidebar als auch via Tile).

### Teamlead-Edit-Erweiterung (FEAT-811, SLC-824, DEC-230 — supersedes DEC-193 + DEC-194)

**Permission-Matrix-Erweiterung:**

| Vorgang | V7 (DEC-193+194) | V8.1 (DEC-230) |
|---|---|---|
| Admin invitiert beliebige Rolle | erlaubt | erlaubt (unveraendert) |
| Admin loescht beliebigen Member | erlaubt mit Hard-Lock | erlaubt mit Hard-Lock (unveraendert) |
| Teamlead invitiert | erlaubt (member + teamlead + admin) | **erlaubt nur fuer `role='member'`** (`INVALID_ROLE_FOR_TEAMLEAD_INVITER`) |
| Teamlead loescht Member | **verboten** (admin-only) | **erlaubt** wenn `target.role='member'` AND `target.team_id=caller.team_id` AND nicht-self, Hard-Lock weiter aktiv |

**Defense-in-Depth-Layer (8 Layer):**
1. `assertRole(["admin","teamlead"])` Server-Action-Gate
2. `assertNotReadOnlyContext()` Drilldown-Mutation-Lockdown (V7.1)
3. Zod-Schema-Validierung Input
4. `INVALID_ROLE_FOR_TEAMLEAD_INVITER` Guard
5. `FORBIDDEN_NON_MEMBER` Guard
6. `FORBIDDEN_OTHER_TEAM` Guard
7. `FORBIDDEN_SELF` Guard
8. Hard-Lock-Pre-Check (DEC-193-Mechanik unveraendert, `countOwnerRecords > 0` → reject)

### caller_role-Audit (DEC-230, forensische DSGVO-Verstaerkung)

`audit_log.changes`-JSONB enthaelt jetzt bei `action='profile_deleted'` zusaetzlich `caller_role` (`'admin'` oder `'teamlead'`). Damit ist nachvollziehbar, **wer mit welcher Rolle** das Profil geloescht hat — forensische Auskunfts- und Loeschungsnachweis-Pflicht aus Art. 15 + 30 DSGVO. Keine Schema-Aenderung (TEXT context bleibt, caller_role im bestehenden JSONB-Feld).

### DSGVO-Backup-Felder im Audit-Trail

Bei `profile_deleted` werden weiterhin (wie V7) folgende Backup-Felder im audit_log persistiert:
- `display_name_backup`
- `role_backup`
- `team_id_backup`

Plus neu in V8.1:
- `caller_role` (Wer hat geloescht — Admin oder Teamlead?)

Damit ist die DSGVO-Auskunfts- und Nachweis-Pflicht des Verantwortlichen (Art. 15 + Art. 30 DSGVO) auch nach Profil-Loeschung erfuellbar — ein DSB kann auf Basis des Audit-Trails rekonstruieren, wer wann mit welcher Rolle welche Personenangabe entfernt hat.

### Architektur-Entscheidungen V8.1
- DEC-227 — Solopreneur-Detection ohne Schema-Touch.
- DEC-228 — Sidebar-Konsolidierung.
- DEC-229 — Teamlead-Tile-Sichtbarkeit.
- **DEC-230 — Teamlead-Permission-Matrix-Erweiterung + caller_role-Audit (supersedes DEC-193 + DEC-194).**

---

## Konsolidierte Drittanbieter-Liste (V8.1-Stand 2026-05-22)

| # | Anbieter | Zweck | Region / Hosting | DPA | Aktiv? |
|---|---|---|---|---|---|
| 1 | **Hetzner Online GmbH** | Hosting Cockpit + Supabase + Cal.com + Asterisk + Jitsi (alles self-hosted) | Falkenstein/Nuernberg (DE) | ja | aktiv |
| 2 | **AWS Bedrock** | Claude Sonnet 4.6 (LLM), Titan V2 (Embeddings), KI-Verlustgrund, KI-Workspace, NL-Sculptor, Custom-Reports | **eu-central-1 (Frankfurt) — Region-Pin enforced (DEC-211)** | ja | aktiv |
| 3 | **IONOS SE** | IMAP/SMTP fuer Geschaefts-E-Mail | DE | ja | aktiv |
| 4 | **OpenAI** *(US, Internal-Test-Mode)* | Whisper Speech-to-Text (Default-Adapter) | US | **nein** | **aktiv im Internal-Test-Mode**, Switch auf Azure-EU Code-Ready (ISSUE-042 Pre-Customer-Live-Pflicht) |
| 5 | Azure OpenAI *(geplant)* | Whisper EU-Hosting | `westeurope` oder `germanywestcentral` | abzuschliessen vor Customer-Live | code-ready, ENV-Switch erforderlich |
| 6 | SMAO GmbH *(Berlin)* | KI-Voice-Agent eingehende Anrufe | DE | abzuschliessen vor Aktivierung | vorbereitet, `SMAO_ENABLED=false` |
| 7 | SIP-Trunk-Provider *(tbd)* | Telefonie eingehend/ausgehend | EU-Anforderung | abzuschliessen vor Customer-Live | nicht aktiv |
| 8 | **Cal.com** *(self-hosted)* | Terminbuchung | self-hosted (DE) | n/a | aktiv |
| 9 | **Asterisk PBX** *(self-hosted)* | Telefonie-Layer | self-hosted (DE) | n/a | aktiv |
| 10 | **Jitsi + Jibri** *(self-hosted, shared mit Blueprint, DEC-036)* | Video-Meetings + Recording | self-hosted (DE) | n/a | aktiv |

**Wichtige V7.5+ Compliance-Verstaerkung (DEC-211):** Bedrock-Region-Pin auf `eu-central-1` enforced im Code — Region-Drift wirft Startup-Exception. Anwendungs-seitige Garantie zusaetzlich zur ENV-Konfiguration.

---

## Konsolidierter DSGVO-Datenfluss-Ueberblick (V8.1-Stand)

Diese Tabelle ist eine kompakte Strukturuebersicht. Detaillierte Beschreibungen pro Sub-System siehe Sektionen 2.x und die V5.3..V8.1-Abschnitte oben.

### Datenkategorien

| Kategorie | Quelle | Verarbeitung | Speicherort | Drittanbieter | Retention |
|---|---|---|---|---|---|
| Kontakt-Stammdaten | User-UI / Lead-Intake | RLS-Owner-isoliert | Postgres `contacts` (Hetzner DE) | keine | permanent bis Manual-Delete (Art. 17 DSGVO) |
| Firmen-Stammdaten | User-UI | RLS-Owner-isoliert | Postgres `companies` (Hetzner DE) | keine | permanent |
| Deal-Daten | User-UI | RLS-Owner-isoliert | Postgres `deals` (Hetzner DE) | keine | permanent |
| E-Mail eingehend | IMAP-Sync (IONOS DE) | KI-Klassifikation (Bedrock EU) | Postgres `email_messages` | IONOS (DPA), Bedrock eu-central-1 (DPA) | 90 Tage Auto-Delete |
| E-Mail ausgehend | Composing-Studio | SMTP-Send + Pixel/Link-Tracking | Postgres `emails` | SMTP-Provider (EU) | permanent + Tracking-Events |
| E-Mail-Anhaenge | User-Upload PC | Whitelist + Bucket | Supabase Storage `email-attachments` (Hetzner DE) | keine | gekoppelt an Email-Row (`ON DELETE CASCADE`) |
| Anruf-Audio | Asterisk MixMonitor | Whisper-Provider (US/EU) → Bedrock EU → Summary | Supabase Storage `call-recordings` (Hetzner DE) | OpenAI US (Internal-Test) oder Azure EU (geplant), Bedrock EU | **7 Tage Auto-Delete via Cron** (DEC-043) |
| Meeting-Audio/Video | Jitsi+Jibri (self-hosted) | Whisper → Bedrock → Summary | Supabase Storage `meeting-recordings` (Hetzner DE) | Whisper (s.o.), Bedrock EU | 7 Tage Auto-Delete |
| Anruf-Transkripte / Meeting-Transkripte | Whisper-Output | KI-Auswertung Bedrock | Postgres `calls.transcript` / `meetings.transcript` | Bedrock EU | permanent (datenarmere Repraesentation) |
| KI-Zusammenfassungen | Bedrock EU | nicht weiter verarbeitet | Postgres `*.ai_summary` | Bedrock EU | permanent |
| Vektor-Embeddings (RAG) | Bedrock Titan V2 EU | pgvector Similarity | Postgres `knowledge_chunks` (Hetzner DE) | Bedrock EU | gekoppelt an Quell-Entity |
| Workflow-Automation-Regeln (Klick) | User-UI | nicht-KI | Postgres `automation_rules` | keine | permanent bis Manual-Delete |
| **NL-Sculpt-Versuche (V7.5)** | **User-Klartext-Eingabe (Admin)** | **Bedrock EU** | **`audit_log` JSONB (`action='automation_rule.sculpt_attempt'`)** | **Bedrock EU** | **permanent (audit-Retention)** |
| **Custom-Reports-Vorlagen (V7.6)** | **User-Save** | **RLS-Owner-isoliert** | **Postgres `custom_reports` (Hetzner DE)** | **Bedrock EU bei Run** | **permanent bis Manual-Delete + CASCADE bei Profil-Loeschung** |
| **Custom-Report-Runs (V7.6)** | **User-Klick** | **Bedrock EU + Geschaeftsdaten-Context** | **`audit_log` (`action='custom_report.executed'`)** | **Bedrock EU** | **permanent (audit-Retention)** |
| **KI-Verlustgrund-Vorschlag (V8)** | **Drag-Drop "Verloren"-Stage** | **Bedrock EU + Activity-/Email-Context** | **`audit_log` (`action='ki_loss_reason_suggested'`)** | **Bedrock EU** | **permanent (audit-Retention)** |
| Audit-Log (alle KI- und Lifecycle-Aktionen) | System | nur Lese-Zugriff Admin | Postgres `audit_log` (Hetzner DE) | keine | permanent + `actor_id` + V8.1-`caller_role`-Feld |
| Consent-Records | Public-Consent-Page | IP/UA-Hash (SHA-256) | Postgres `consent` | keine | permanent + Widerrufs-Trail |
| Branding-Logo + Settings | User-UI | Server-Proxy | Postgres + Supabase Storage `branding` (Hetzner DE) | keine | bis Manual-Delete |
| Angebot-PDFs (V5.5+) | pdfmake Server-Side | RLS-Owner-isoliert | Supabase Storage `proposal-pdfs` (Hetzner DE) | keine | bis Manual-Delete |
| Profile-Lifecycle (V7) | Admin/Teamlead-Action | GoTrue + audit_log | Postgres `profiles` + `auth.users` + `audit_log` | keine | DSGVO-Loeschpflicht-konform + audit-Backup-Felder + V8.1-`caller_role` |

### V7.5+ neue Datenfluss-Typen im Ueberblick

1. **NL-Sculpt-Versuch** (V7.5): Admin-Klartext → Bedrock EU → strukturiertes JSON → audit_log JSONB. Cost-Tracking per Bedrock-Response-Usage.
2. **Custom-Report-Run** (V7.6): User-Frage + Geschaeftsdaten-Context → Bedrock EU → Markdown-Antwort → optional Save als `custom_reports`-Row.
3. **KI-Verlustgrund-Vorschlag** (V8): Drag-Drop-Trigger → Bedrock EU mit Activity+Email-Context → JSON-Vorschlaege → User waehlt manuell.
4. **caller_role-Audit-Verstaerkung** (V8.1): Profile-Delete loggt zusaetzlich, ob Admin oder Teamlead geloescht hat — forensische DSGVO-Auskunft.

---

## Disclaimer

Diese Dokumentation beschreibt den **technischen** Datenschutz-Stand des Systems zum Zeitpunkt **2026-05-22 (V8.1-Stand REL-035 stable)**. Sie ist eine **pragmatische Standardvorlage** und stellt **keine Rechtsberatung** dar. Insbesondere ersetzt sie nicht:

- die **anwaltliche Pruefung** der Einwilligungstexte und der Privacy Policy
- die formale **Einsetzung einer/eines Datenschutzbeauftragten** (sofern erforderlich)
- die **DSFA (Datenschutz-Folgenabschaetzung)** fuer die Audio-Aufnahme- und KI-Auswertungs-Pipelines (Art. 35 DSGVO)
- die **Auftragsverarbeitungsvertraege** mit allen aktiven Drittanbietern, insbesondere mit dem geplanten Azure-OpenAI-EU-Provider und dem SIP-Trunk-Provider vor Customer-Live
- die **steuerrechtliche Pruefung** der Reverse-Charge-Konformitaet (V5.7) durch eine NL-Steuerberatung (Pflicht zur quartalsweisen ICP-Meldung "Opgaaf ICP")

Vor produktivem Einsatz mit echten Kunden- oder Interessentendaten sind diese Punkte zu klaeren. Die Dokumentation ist **manuell zu aktualisieren** bei wesentlichen Schema-, Provider- oder Region-Aenderungen — kein Auto-Refresh-Mechanismus implementiert.

---

**Letzte Aktualisierung:** 2026-05-22 (V7.1+V7.2+V7.5+V7.6+V8+V8.1-Sections ergaenzt — Settings-Permission-Haertung, Test-Infra-Cleanup, NL-Sculptor mit Bedrock-EU-Region-Pin, Custom-Reports User-Vorlagen, KI-Verlustgrund-Vorschlag, Vendor-Lock-in-Vermeidung KI-Provider-Naming, Solopreneur-Mode, Teamlead-Permission-Matrix mit caller_role-Audit-Verstaerkung. Konsolidierte Drittanbieter-Liste + Datenfluss-Ueberblick als kompakte Strukturuebersicht. V8.1 als released-stable nach Burn-In 15h PASS RPT-504.)
**Naechste empfohlene Pruefung:** Pre-Customer-Live-Compliance-Gate — Anwalts-Pruefung gesamte COMPLIANCE.md (insbesondere V7.5 NL-Sculptor + V7.6 Custom-Reports + V8 KI-Verlustgrund), NL-Steuerberatung-Pruefung V5.7, Switch auf Azure-OpenAI-EU-Whisper, ISSUE-042 (OpenAI-Key-Datei) schliessen, DPA-Abschluss mit Azure + SMAO + SIP-Trunk-Provider.
