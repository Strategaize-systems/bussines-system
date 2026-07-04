# DSGVO-/GDPR-Compliance-Dokumentation

> **System:** Strategaize Business Development System ("Business Cockpit")
> **Stand:** 2026-06-15 — beschreibt den Implementierungsstand **V8.15** (deployed 2026-06-14)
> **Delivery Mode:** Internes Betriebssystem (Single-Organisation, interner Nutzerkreis)
> **Geltungsbereich dieser Fassung:** **Customer-Live-tauglich** — beschreibt sowohl den technisch umgesetzten Ist-Zustand als auch die noch offenen Schritte, die VOR der produktiven Verarbeitung echter Personendaten ("Customer-Live") abgeschlossen sein müssen (siehe Abschnitt 13).
>
> **Verbindlicher Hinweis:** Diese Dokumentation ist eine **technische Compliance-Beschreibung** und stellt **keine Rechtsberatung** dar. Sie beschreibt, wie das System personenbezogene Daten technisch verarbeitet und absichert. Vor produktivem Einsatz mit echten Kunden-, Interessenten- oder Multiplikator-Daten ist eine **anwaltliche Prüfung durch eine qualifizierte Datenschutzbeauftragte/einen qualifizierten Datenschutzbeauftragten** erforderlich (siehe Abschnitt 14).
>
> **Historie:** Die frühere, versions-chronologische Compliance-Dokumentation (V5.2–V5.7) liegt weiterhin unter `docs/COMPLIANCE.md`. Diese Datei (`deliverables/COMPLIANCE.md`) ist ab V8.15 die **kanonische, konsolidierte Gesamtdarstellung des aktuellen Zustands**.

---

## Inhaltsverzeichnis

1. [Projektübersicht](#1-projektübersicht)
2. [Verantwortlichkeiten](#2-verantwortlichkeiten)
3. [Datenerhebung und -verarbeitung](#3-datenerhebung-und--verarbeitung)
4. [Speicherorte und Hosting](#4-speicherorte-und-hosting)
5. [Zugriffskontrollen](#5-zugriffskontrollen)
6. [Datenweitergabe an Dritte](#6-datenweitergabe-an-dritte)
7. [Lösch- und Aufbewahrungskonzept](#7-lösch--und-aufbewahrungskonzept)
8. [Technische Schutzmaßnahmen](#8-technische-schutzmaßnahmen)
9. [Consent und Cookie-Handling](#9-consent-und-cookie-handling)
10. [Betroffenenrechte](#10-betroffenenrechte)
11. [Logging und Monitoring](#11-logging-und-monitoring)
12. [OWASP-Basics](#12-owasp-basics)
13. [Offene Punkte — Pre-Customer-Live-Gates](#13-offene-punkte--pre-customer-live-gates)
14. [Disclaimer](#14-disclaimer)

---

## 1. Projektübersicht

Das **Strategaize Business Development System** (intern: "Business Cockpit") ist ein KI-gestütztes, prozess- und kontextzentriertes Vertriebs- und Beziehungs-Betriebssystem für ein beratungsintensives B2B-Geschäft. Es steuert Multiplikatoren, Unternehmer-Leads, Gespräche, Anrufe, Meetings, Angebote und Übergaben datenfundiert. Es ist **kein generisches Feature-CRM** und **kein Multi-Mandanten-SaaS-Produkt für Endkunden**, sondern ein **internes Arbeitssystem einer einzelnen Organisation**.

**Nutzerkreis:** Ein interner Nutzerkreis (Gründer plus ggf. 1–2 interne Personen). Seit Version V7 unterstützt das System echten **Mehrbenutzer-Betrieb** mit Rollen und team-basierter Datentrennung (siehe Abschnitt 5). Es gibt **keine externen Endkunden, die eigene Daten in einem mandantengetrennten Bereich ablegen** — die im System verarbeiteten Personendaten sind die Geschäftskontakte der betreibenden Organisation.

**Betriebsmodus zum Stand dieses Dokuments:** **Internal-Test-Mode.** Das System wird derzeit ausschließlich intern getestet und ist noch **nicht für die produktive Verarbeitung echter Personendaten freigegeben.** Der Übergang in den produktiven Betrieb ("Customer-Live") setzt den Abschluss der in Abschnitt 13 genannten Punkte voraus.

---

## 2. Verantwortlichkeiten

### 2.1 Verantwortlicher (Controller) im Sinne Art. 4 Nr. 7 DSGVO

Verantwortlich für die Verarbeitung der personenbezogenen Daten ist die betreibende Gesellschaft als alleinige Betreiberin des Systems:

> **Strategaize Transition B.V.**
> [Straße + Hausnummer]
> [PLZ] Swalmen
> Niederlande
>
> KvK-Nummer (Kamer van Koophandel): [zu ergänzen]
> BTW-/USt-IdNr. (NL): [zu ergänzen, Format `NL` + 9-stellig + `B01`]
> Statutaire bestuurder / Geschäftsführung: [Name zu ergänzen]
> Kontakt Datenschutz: [zu ergänzen, z. B. `datenschutz@strategaize.io`]

> ⚠️ **Offen:** Die konkreten Angaben (Adresse, KvK-Nummer, BTW-ID, Geschäftsführung, Datenschutz-Kontakt) sind in den Entwürfen `deliverables/IMPRESSUM_DRAFT.md` und `deliverables/DATENSCHUTZ_DRAFT.md` noch als Platzhalter hinterlegt und müssen vor Veröffentlichung/Customer-Live aus den operativen Unterlagen eingetragen werden.

Die betreibende Organisation ist **alleinige Verantwortliche** für die im System verarbeiteten Geschäftskontaktdaten. Es existiert kein externer Verantwortlicher und keine Konstellation, in der das System als Auftragsverarbeiter für fremde Verantwortliche fungiert.

### 2.2 Auftragsverarbeiter (Processor)

Eine Reihe von Infrastruktur- und KI-Diensten verarbeiten Daten **im Auftrag** der Verantwortlichen (Hosting, LLM, E-Mail, Speech-to-Text). Diese sind in Abschnitt 6 mit Region und Status des Auftragsverarbeitungsvertrags (AV-Vertrag / DPA) gelistet. Für jeden aktiven Auftragsverarbeiter muss ein wirksamer AV-Vertrag nach Art. 28 DSGVO vorliegen.

### 2.3 Datenschutzbeauftragter

Die Benennung eines Datenschutzbeauftragten ist gemäß Art. 37 DSGVO zu prüfen (in den Niederlanden insbesondere bei umfangreicher Verarbeitung oder Verarbeitung besonderer Datenkategorien). Da das System **keine** besonderen Kategorien personenbezogener Daten (Art. 9 DSGVO) verarbeitet (siehe 3.4) und der Nutzerkreis klein ist, dürfte eine Pflicht zur Benennung nach aktueller Einschätzung nicht bestehen — die abschließende Bewertung obliegt der anwaltlichen/DSB-Prüfung.

---

## 3. Datenerhebung und -verarbeitung

Das System verarbeitet personenbezogene Daten ausschließlich zur Steuerung von Vertriebs- und Beziehungsprozessen (B2B). Sämtliche Daten liegen in einer selbst-gehosteten PostgreSQL-Datenbank (siehe Abschnitt 4).

### 3.1 Datenkategorien

| Kategorie | Daten | Tabelle(n) | Zweck | Rechtsgrundlage (vorgeschlagen, anwaltlich zu prüfen) |
|---|---|---|---|---|
| **Kontakt-/Multiplikator-Stammdaten** | Vor-/Nachname, E-Mail, Telefon, Position, Firma, Branche, Region, Sprache, LinkedIn-URL, Beziehungstyp, Vertrauens-/Beziehungstiefe, Notizen | `contacts` | Beziehungs- und Vertriebssteuerung | Art. 6 (1) f (berechtigtes Interesse an B2B-Geschäftsanbahnung) |
| **Firmen-Stammdaten** | Firmenname, Branche, Website, Adresse, Eignungsbewertung | `companies` | Account-/Eignungsbewertung | Art. 6 (1) f |
| **Consent-Daten** | `consent_status`, `consent_date`, `consent_source`, `consent_token` (+Ablauf), `opt_out_communication` | `contacts` | Einwilligungs-/Widerspruchsverwaltung | Art. 7 / Art. 6 (1) a |
| **Vertriebsdaten** | Deals (Stufe, Wert, Status, nächster Schritt), Aktivitäten, Tasks, Angebote/Positionen, Gesprächsnotizen | `deals`, `activities`, `tasks`, `proposals`, `proposal_items` | Pipeline-/Angebotssteuerung | Art. 6 (1) f / (1) b (Vertragsanbahnung) |
| **Kommunikationsdaten** | E-Mails (eingehend via IMAP, ausgehend via SMTP) inkl. Header/Body/Anhänge, E-Mail-Tracking-Events (Open/Click), Anruf- und Meeting-Metadaten | `email_messages`, `emails`, `email_attachments`, `email_tracking_events`, `calls`, `meetings`, `calendar_events` | Kommunikations- und Terminmanagement | Art. 6 (1) f / (1) b |
| **Audio-/Transkriptionsdaten** | Anruf-Aufnahmen (Asterisk WAV), Meeting-Aufnahmen (Jitsi/Jibri), Transkripte, KI-Zusammenfassungen | `calls`, `meetings` + Storage-Buckets | Gesprächsnachbereitung, Vertriebsintelligenz | **Art. 6 (1) a (Einwilligung)** — Aufnahmen nur mit ausdrücklicher Einwilligung |
| **KI-abgeleitete Daten** | E-Mail-Klassifikationen, Wiedervorlage-/Verlustgrund-Vorschläge, Signale, Vektor-Wissens-Chunks (RAG) | `signals`, `ai_action_queue`, `knowledge_chunks` u. a. | Entscheidungs-Unterstützung (keine automatisierte Einzelfallentscheidung i. S. Art. 22) | Art. 6 (1) f |
| **Audit-Daten** | Wer/was/wann (`actor_id`, `action`, `entity_type`, `changes` JSONB), Consent-Events mit IP-/UA-Hash | `audit_log` | Nachweis-/Rechenschaftspflicht (Art. 5 (2), Art. 30) | Art. 6 (1) c / (1) f |
| **Nutzer-/Profildaten (interne Nutzer)** | Anzeigename, Avatar, Rolle, Team, Login-Daten | `profiles`, `user_settings`, Supabase Auth | Zugriffsverwaltung interner Nutzer | Art. 6 (1) b / (1) f |

### 3.2 Datenflüsse (Überblick)

- **E-Mail eingehend:** IMAP (IONOS, DE) → 5-Minuten-Sync → `email_messages` → KI-Klassifikation (Bedrock, EU) → Auto-Zuordnung zu Deal/Kontakt → RAG-Indexierung.
- **E-Mail ausgehend:** Cockpit/Cadence → gemeinsame Mail-Send-Schicht (Tracking-Pixel + signierte Link-Umschreibung) → SMTP → `emails` + `email_tracking_events`.
- **Anrufe:** Browser (SIP.js/WebRTC) ↔ self-hosted Asterisk → WAV-Aufnahme → Speech-to-Text → Bedrock-Zusammenfassung (EU) → Activity in der Deal-Timeline.
- **Meetings:** Self-hosted Jitsi + Jibri-Recording → Transkript → Bedrock-Zusammenfassung (EU) → Timeline.
- **Wissens-Suche (RAG):** Quelle → Chunking → Embedding → `knowledge_chunks` (pgvector) → Similarity-Search → Bedrock-Antwort (EU).

### 3.3 Datenminimierung

Das System folgt dem Grundsatz der Datensparsamkeit (Art. 5 (1) c):
- **Audio-Rohdaten** (WAV) werden nach kurzer Frist gelöscht; erhalten bleiben nur die abgeleiteten, datenschutzärmeren **Transkripte/Zusammenfassungen** (kein Stimm-/Biometrie-Material). Begründung: Die Rohaufnahme ist das eigentliche Risiko-Vehikel und wird früh entfernt, die Vertriebs-Information bleibt erhalten (siehe Abschnitt 7).
- **IP-/User-Agent-Daten** aus Einwilligungs-Vorgängen werden **nicht im Klartext**, sondern als täglich rotierter SHA-256-Hash gespeichert (siehe 9.2).
- **KI-Aufrufe sind „on-click"**: Es läuft keine KI-Pipeline automatisch auf Datenlade-Pfaden; Analysen werden explizit ausgelöst (Button/definierte Cron-Trigger).

### 3.4 Was nicht verarbeitet wird

- **Keine besonderen Kategorien personenbezogener Daten (Art. 9 DSGVO)** — keine Gesundheits-, Religions-, biometrischen oder politischen Daten.
- **Keine automatisierte Einzelfallentscheidung mit Rechtswirkung (Art. 22)** — KI liefert ausschließlich Vorschläge zur menschlichen Entscheidung.
- **Kein Web-Tracking Dritter / keine Werbe-Cookies** (siehe Abschnitt 9).

---

## 4. Speicherorte und Hosting

Alle produktiv-relevanten Daten und Kernkomponenten werden in der **EU (Deutschland)** betrieben. Die Datenresidenz ist intern als verbindliche Regel verankert (`.claude/rules/data-residency.md`).

| Komponente | Anbieter | Region | Hosting | DPA |
|---|---|---|---|---|
| Anwendung (Cockpit, Next.js) | Hetzner Cloud (via Coolify) | DE | self-managed Container | ja |
| Datenbank (PostgreSQL / Supabase) | self-hosted | DE | Hetzner-Container | ja (über Hetzner) |
| Object-Storage (Recordings, Branding, Anhänge, Dokumente, Angebots-PDFs) | Supabase Storage (file-backend) | DE | Hetzner-Volume | ja (über Hetzner) |
| LLM (Claude Sonnet) | AWS Bedrock | **eu-central-1 (Frankfurt)** | Cloud, **code-erzwungen** | ja |
| Embeddings (Titan) | AWS Bedrock | eu-central-1 | Cloud | ja |
| E-Mail-Empfang (IMAP) | IONOS | DE | Cloud | ja |
| E-Mail-Versand (SMTP) | konfigurierbar | **siehe Abschnitt 13** | Cloud | offen |
| Speech-to-Text (Whisper) | aktuell OpenAI (Default) / Azure-EU (vorbereitet) | **siehe Abschnitt 13** | Cloud | offen |
| Terminbuchung (Cal.com) | self-hosted | DE | Hetzner-Container | n/a |
| Telefonie (Asterisk PBX) | self-hosted | DE | Hetzner-Container | n/a |
| Video-Meetings (Jitsi + Jibri) | self-hosted | DE | Hetzner-Container | n/a |
| Fehler-Monitoring (Sentry, optional) | Sentry.io | EU-Region (Frankfurt) vorgesehen | Cloud, nur wenn `SENTRY_DSN` gesetzt | ja (vorgesehen) |

**Code-erzwungene EU-Region für KI:** Der Bedrock-Adapter (`cockpit/src/lib/ai/bedrock-client.ts`) prüft die Region zur Laufzeit und **wirft eine Ausnahme, wenn die Region ≠ `eu-central-1` ist** (`assertBedrockRegion()`). Eine Verarbeitung außerhalb der EU ist damit technisch ausgeschlossen.

---

## 5. Zugriffskontrollen

### 5.1 Authentifizierung

- **Verfahren:** Supabase Auth (GoTrue) mit E-Mail + Passwort; Session-Verwaltung über sichere, server-seitig gesetzte Cookies (`@supabase/ssr`). JWT-Laufzeit 1 Stunde.
- **Einladungs-/Passwort-Setzen-Flow:** Server-seitige Nutzeranlage via Admin-Client + `generateLink` mit korrektem Public-Host; Passwort-Setzen/-Reset über einen einzigen, abgesicherten Einstiegspunkt (`/auth/set-password`, `/auth/callback`).
- **Passwort-Policy (seit V8.12):** Neue Passwörter erfordern **mindestens 12 Zeichen** und einen **zxcvbn-Stärkewert ≥ 3** (`cockpit/src/lib/auth/password-policy.ts`). Gilt für Neu-Vergabe (Set-Password/Invite-Accept).
- **Brute-Force-Schutz (V8.14/V8.15):** Login-Drosselung pro (E-Mail + IP) — 5 Fehlversuche / 15 Min — **plus** kontogebundene Sperre pro E-Mail (20 / 15 Min, unabhängig von der IP, gegen IP-Rotation). Generische Fehlermeldung ohne Nutzer-Enumeration. Client-IP wird hinter dem Reverse-Proxy korrekt aus dem vertrauenswürdigen Forwarded-Header bestimmt (`TRUSTED_PROXY_COUNT`).

### 5.2 Autorisierung & Row-Level-Security (RLS)

- **Rollenmodell (3-stufig):** `admin`, `teamlead`, `member`; jeder Nutzer gehört genau einem Team. Rollen-Helfer (`assertRole(...)`) sichern Server-Aktionen ab; der Rollen-Resolver `getCurrentUserRole()` ist **fail-closed** (liefert bei fehlendem Nutzer/Profil/Fehler `null`, nie eine privilegierte Default-Rolle).
- **RLS vollständig (seit V8.11):** Row-Level-Security ist auf **allen** geschäftsrelevanten Tabellen aktiviert (4-Policy-Abdeckung). Ein persistentes Audit-Werkzeug (`list_tables_with_authenticated_full_access()`) bestätigte **0 ungeschützte Tabellen** als Done-Gate. Helfer-Funktionen: `can_see_owner`, `is_admin`, `is_teamlead`, `get_my_team_id`. Die Sichtbarkeit folgt Eigentümer-/Team-Logik; Cron-Hintergrundprozesse nutzen die `service_role` (BYPASSRLS) by-design und setzen den Eigentümer aus der Quell-Zeile.
- **Schutz der Berechtigungs-Spalten (V8.14/V8.15):** Ein Datenbank-Trigger (`profiles_role_change_guard`, MIG-051/052, `BEFORE INSERT OR UPDATE`) verhindert, dass authentifizierte Nutzer ihre eigene **Rolle** oder ihr **Team** ändern (Privilege-Escalation / Team-Isolation-Bypass). Legitime Rollenänderungen laufen ausschließlich über die `service_role` (Admin-Funktionen). Live verifiziert.
- **Read-Only-Drilldown-Schutz:** In „Sehen-als"-Ansichten verhindert ein Kontext-Guard (`assertNotReadOnlyContext()`) versehentliche Mutationen.

### 5.3 Export-/Lese-API-Scoping (V8.15)

Externe Lese-/Export-Endpunkte verwenden **pro-Tenant-Schlüssel** statt eines geteilten Schlüssels: Tabelle `export_api_keys` (nur SHA-256-Hash gespeichert, RLS forced, GRANT nur `service_role`). `resolveExportIdentity()` + `guardExportTenant()` begrenzen jede Export-Antwort auf die Daten der Schlüssel-Identität (Eigentümer-/Team-Spalte), fail-closed bei fehlendem/falschem Schlüssel; Rate-Limit gebunden an die Schlüssel-Identität statt an die (fälschbare) IP. Schreibende Lead-Intake-Schnittstelle nutzt einen separaten, schreibgebundenen Schlüssel.

---

## 6. Datenweitergabe an Dritte

### 6.1 Aktive Dienste (Stand V8.15)

| Anbieter | Zweck | Übermittelte Daten | Region | DPA-Status |
|---|---|---|---|---|
| **Hetzner Online GmbH** | Hosting (Server, Storage) — deckt alle self-hosted Komponenten | alle Daten | DE | abgeschlossen |
| **AWS (Bedrock)** | LLM (Claude Sonnet), Embeddings (Titan) | Text-Chunks, Prompts, KI-Outputs (keine Klartext-Empfänger-Adressen, keine Mail-Bodies aus dem Composer) | eu-central-1 (Frankfurt) | abgeschlossen, No-Training-Klausel |
| **IONOS SE** | IMAP-Empfang | E-Mail-Inhalte, Header | DE | abgeschlossen |
| **SMTP-Provider** | E-Mail-Versand | ausgehende E-Mails inkl. Empfänger | **abhängig von Konfiguration — siehe 13** | offen |
| **Speech-to-Text-Provider** | Transkription von Anruf-/Meeting-Audio | Audio (Personendaten) | **aktuell US-Default — siehe 13** | offen |

### 6.2 Self-hosted (keine Drittweitergabe außerhalb des Hetzner-DPA)

- **Supabase** (PostgreSQL + Storage + Auth/GoTrue + PostgREST) — Hetzner DE
- **Cal.com** (Terminbuchung, eigene DB) — Hetzner DE
- **Asterisk PBX** (Telefonie) — Hetzner DE
- **Jitsi + Jibri** (Video + Recording) — Hetzner DE

Diese Komponenten laufen technisch auf Hetzner-Servern, stehen aber unter alleiniger Kontrolle der Verantwortlichen — keine Datenweitergabe an Dritte außerhalb des Hetzner-Auftragsverarbeitungsvertrags.

### 6.3 Vorbereitete, NICHT aktive Dienste

| Anbieter | Zweck | Status |
|---|---|---|
| **Azure OpenAI** | Whisper Speech-to-Text in EU | Code-fertig; ENV/Provider-Switch vor Customer-Live (siehe 13) |
| **Sentry.io** | Fehler-Monitoring | nur aktiv, wenn `SENTRY_DSN` gesetzt; EU-Region (Frankfurt) + `sendDefaultPii=false` vorgesehen |
| **SMAO / Synthflow** | KI-Voice-Agent für eingehende Anrufe | deaktiviert (`SMAO_ENABLED=false`); DPA erst bei Aktivierung |
| **SIP-Trunk-Provider** | externe Telefonie | deaktiviert (`SIP_TRUNK_ENABLED=false`); EU-Provider + DPA vor produktiver Telefonie |

---

## 7. Lösch- und Aufbewahrungskonzept

### 7.1 Automatische Löschung / Retention (implementiert)

| Datenart | Frist (Default) | Mechanismus |
|---|---|---|
| **Audio-Rohaufnahmen** (Meeting- & Anruf-WAV) | **7 Tage** (`RECORDING_RETENTION_DAYS=7`) | Cron `recording-retention` (täglich) löscht die Storage-Datei, setzt `recording_status='deleted'`, schreibt Audit-Eintrag. Transkript/Zusammenfassung bleiben erhalten. |
| **Eingehende E-Mails** | **90 Tage** (`IMAP_RETENTION_DAYS=90`) | `retention_expires_at` beim Import gesetzt; Cron `retention` (`cockpit/src/lib/imap/retention.ts`) löscht abgelaufene `email_messages`. |
| **E-Mail-Tracking-Events** | konfigurierbar | Cron `click-log-cleanup` entfernt alte Open-/Click-Events. |
| **Offene Consent-Tokens** | 30 Tage | Token mit Ablauffrist; Cron `pending-consent-renewal`. |

### 7.2 Permanent gespeicherte Daten (kein Auto-Delete)

Transkripte, KI-Zusammenfassungen, Kontakte, Firmen, Deals, Aktivitäten, Angebote sowie das **unveränderliche Audit-Log** (siehe 11). Löschung erfolgt manuell über das Cockpit bzw. auf Betroffenen-Antrag (siehe Abschnitt 10).

### 7.3 Löschkaskaden

Die Löschung eines Kontakts/Deals greift über Foreign-Keys auf abhängige Datensätze (Aktivitäten, Calls, Meetings, Consent, Cadence-Einträge). **Hinweis (offen):** Für einzelne Tabellen (insb. die ausgehende `emails`-Tabelle) ist die Lösch-Kaskade noch nicht durchgängig automatisiert; ein vollständiger, betroffenen-bezogener Erasure-Flow ist noch zu implementieren (siehe Abschnitt 13).

---

## 8. Technische Schutzmaßnahmen

| Maßnahme | Umsetzung |
|---|---|
| **Transportverschlüsselung** | HTTPS erzwungen (Traefik/Coolify TLS-Terminierung); HSTS-Header (`max-age=63072000; includeSubDomains; preload`). |
| **Verschlüsselung at rest** | Datenbank- und Storage-Volumes auf Hetzner DE; Object-Storage privat (kein Public-Read). |
| **Security-Header** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/microphone/geolocation/payment/usb gesperrt). |
| **Content-Security-Policy** | Aktiv im **Report-Only-Modus** (Phase A) mit `report-uri` an Sentry; striktere Durchsetzung (Phase B) nach Auswertungsphase. `frame-ancestors 'none'` (Clickjacking-Schutz). |
| **XSS-Schutz** | DOMPurify-Sanitisierung für E-Mail-HTML (`sanitize-email-html.ts`); Markdown der öffentlichen Rechtstexte wird sanitisiert (`legal/markdown.ts`) und beim Speichern validiert (`validate-markdown.ts`); sichere externe Links via `safe-external-href.ts` (Scheme-Whitelist); kein SVG-Upload (Inline-Skript-Risiko). |
| **SSRF-Schutz** | Push-Endpoint-Allowlist (nur bekannte Push-Dienste, https-only). |
| **Mass-Assignment-Schutz** | Whitelist-Projektion bei kritischen Updates (z. B. `moveDealToStage`). |
| **Secret-Handling** | Keine Secrets im Quellcode; Konfiguration über ENV (Coolify); HMAC-signierte Tracking-Links (`TRACKING_HMAC_SECRET`, timing-safe Prüfung, fail-closed gegen Open-Redirect). |
| **Eingabevalidierung** | Server-seitige Validierung + Längen-Caps an öffentlichen Schreib-Endpunkten (Lead-Intake); Auth-Gate vor externen Lookups (z. B. VAT-Prüfung). |

---

## 9. Consent und Cookie-Handling

### 9.1 Cookies

Das System setzt **ausschließlich technisch notwendige Session-Cookies** (Supabase-Auth, `HttpOnly`, `Secure`, `SameSite`, 1 Stunde Laufzeit). **Keine Analyse-, Tracking- oder Werbe-Cookies; keine Drittanbieter-Cookies.** Eine Cookie-Consent-Banner-Pflicht für nicht-notwendige Cookies entsteht dadurch nach aktueller Einschätzung nicht (anwaltlich zu bestätigen).

### 9.2 Einwilligungs-Mechanismus (Kontakte)

- **Öffentliche Consent-Seite** mit Token-Zugang ohne Login (`/consent/[token]`): Status `granted` / `declined` / `revoked`, Token mit 30-Tage-Ablauf, Rate-Limiting.
- **IP-/User-Agent-Minimierung:** Bei Consent-Vorgängen werden IP und User-Agent **nur als täglich rotierter SHA-256-Hash** im Audit-Log gespeichert (kein Klartext) — minimaler Nachweis ohne Speicherung der Rohdaten.
- **Kommunikations-Opt-Out:** `opt_out_communication` stoppt Cadences und KI-Wiedervorlagen für den Kontakt; jede Änderung wird auditiert.
- **Editierbare Einwilligungs-/Datenschutztexte** (Settings `/settings/compliance`): Meeting-Einladung, E-Mail-Footer, Cal.com-Buchung — als pragmatische Vorlagen (juristisch zu prüfen).

### 9.3 Aufnahme-Einwilligung (offen)

Aufnahmen von Anrufen/Meetings dürfen nur auf einer tragfähigen Rechtsgrundlage erfolgen (i. d. R. **ausdrückliche Einwilligung**). Die Einwilligungstexte/-hinweise sind als Templates vorhanden; ein **technisch erzwungener Aufnahme-Gate bzw. die dokumentierte Rechtsgrundlage pro Aufnahme** ist vor Customer-Live festzulegen (siehe Abschnitt 13).

---

## 10. Betroffenenrechte

| Recht | Artikel | Technische Umsetzung |
|---|---|---|
| **Auskunft** | Art. 15 | Manueller Export aus dem Cockpit; Export-API (JSON, tenant-gescoped) für Kontakte/Deals/Aktivitäten; authentifizierte Nutzer sehen ihre eigenen Audit-Einträge (`actor_id = auth.uid()`). |
| **Berichtigung** | Art. 16 | Alle Felder über die UI editierbar; `audit_log` protokolliert jede Änderung (Actor, Zeit, vorher/nachher). |
| **Löschung** | Art. 17 | Kontakt-/Deal-Löschung mit Kaskade über Foreign-Keys; automatische Rohaufnahme-Löschung nach 7 Tagen. **Offen:** durchgängiger, betroffenen-bezogener Erasure-Flow (siehe 13). |
| **Datenübertragbarkeit** | Art. 20 | Export-API (JSON); DB-Dump über Admin-Tools möglich. |
| **Widerruf der Einwilligung** | Art. 7 (3) | Öffentliche Consent-Seite (Revoke); `opt_out_communication`-Schalter; Audit-Trail. |
| **Widerspruch** | Art. 21 | `opt_out_communication` stoppt automatisierte Kommunikation. |

---

## 11. Logging und Monitoring

- **Audit-Log (`audit_log`):** zentrale, **unveränderliche** Nachweis-Schicht (INSERT nur über `service_role`; UPDATE/DELETE für Nutzer gesperrt — Manipulationsschutz). Cron-Schreibvorgänge mit `actor_id=NULL` gekennzeichnet. Erfüllt Rechenschaftspflicht und Art.-15-Selbstauskunft (RLS: eigener Actor oder Admin).
- **Anwendungs-Logs mit Redaction (seit V8.12):** `logSafe()`-Wrapper redigiert sensible Schlüssel automatisch. Standard-Redaction-Liste (17 Schlüssel): Security-Kern (password, token, secret, api_key, authorization, cookie, session, jwt, refresh_token, access_token) + PII (email, phone) + Domänen-PII (from_address, recipient, body_text, transcript, x-cron-secret).
- **Was NICHT geloggt wird:** Passwörter (werden von GoTrue gehandhabt, erreichen die App nicht), Klartext-Secrets/API-Keys, Klartext-IP/UA aus Consent-Vorgängen, sensible Felder gemäß Redaction-Liste.
- **Fehler-Monitoring (Sentry, optional):** nur aktiv bei gesetztem `SENTRY_DSN`; EU-Region vorgesehen; **`sendDefaultPii=false`**; ein `beforeSend`-Hook redigiert das Event über dieselbe Redaction-Funktion, bevor es übertragen wird.
- **Log-Zugang:** Logs sind nicht öffentlich, nur über Coolify-Container-Logs (Hetzner DE) zugänglich.
- **Bekannte Einschränkung (offen):** Einzelne Cron-Routen interpolieren noch PII in rohe Log-Ausgaben (`ISSUE-124`); Umstellung auf `logSafe` ausstehend (siehe 13).

---

## 12. OWASP-Basics

Eine unabhängige, mehrstufige Sicherheitsprüfung wurde durchgeführt (zuletzt **V8.15 Fable-5-Multi-Agent-Re-Audit über den deployten Stand**, 6 Angriffsflächen-Dimensionen + adversarische Doppelverifikation; bestätigte Findings als High/Medium gefixt). Abdeckung gegenüber den OWASP-Grundlagen:

| OWASP-Thema | Maßnahme |
|---|---|
| **Injection** | Parametrisierte Queries (PostgREST/Supabase); Eingabevalidierung; bekannte Rest-Härtung (`.or()`-Filter) als Low dokumentiert. |
| **Broken Access Control** | Vollständige RLS (V8.11); Spalten-Schutz Rolle/Team (V8.14/15); fail-closed Rollen-Resolver; Export-Tenant-Scoping. |
| **Cryptographic Failures** | HTTPS/HSTS; gehashte IP/UA; nur Hash der Export-Keys gespeichert; HMAC-signierte Links. |
| **XSS** | DOMPurify + Markdown-Sanitisierung + Link-Scheme-Guards + SVG-Block. |
| **SSRF** | Push-Endpoint-Allowlist. |
| **Authentication Failures** | Passwort-Policy (12+/zxcvbn≥3), Login-Rate-Limit + kontogebundene Sperre, generische Fehlermeldung. |
| **Security Misconfiguration** | Security-Header, CSP (Report-Only → strict), Public-Endpoint-Härtung (z. B. `test-sentry` in Prod gesperrt). |
| **Logging/Monitoring** | Redaction-Logger, unveränderliches Audit-Log, optionales Sentry mit PII-Redaction. |

---

## 13. Offene Punkte — Pre-Customer-Live-Gates

Die folgenden Punkte sind im **Internal-Test-Mode bewusst akzeptiert**, müssen aber **VOR der produktiven Verarbeitung echter Personendaten ("Customer-Live")** abgeschlossen werden. Sie sind teils in `docs/KNOWN_ISSUES.md` nachverfolgt.

### Datenresidenz / Drittland
1. **Speech-to-Text auf EU umstellen:** `TRANSCRIPTION_PROVIDER` steht per Default auf `openai` (US). Der Azure-OpenAI-EU-Adapter ist code-fertig — vor dem ersten echten Aufnahme-Verarbeitungslauf auf `azure` umstellen, `AZURE_OPENAI_*`-ENV in Coolify setzen, Microsoft-DPA abschließen. (Verbunden mit `ISSUE-042` — OpenAI-Key.)
2. **SMTP-Versand auf EU-Provider:** Der ENV-/Compose-Default ist `smtp.gmail.com` (US). Für Customer-Live muss der Produktions-SMTP auf einen EU-Provider (z. B. IONOS) gesetzt sein — **Produktionswert in Coolify verifizieren** (`ISSUE-127`).

### Betroffenenrechte / Datenmodell
3. **Vollständiger Erasure-Flow (Art. 17):** Durchgängige, betroffenen-bezogene Löschung inkl. ausgehender `emails`-Tabelle, Storage-Anhänge und Account-Löschung implementieren (`ISSUE-128`).
4. **Datensparsamkeit E-Mail-Tracking:** `email_tracking_events` speichert IP/User-Agent im Klartext; Hashing oder verkürzte Aufbewahrung prüfen (`ISSUE-129`).

### Einwilligung / Recht
5. **Aufnahme-Rechtsgrundlage dokumentieren/erzwingen:** Rechtsgrundlage je Anruf-/Meeting-Aufnahme festlegen (Einwilligung) und ggf. technisch erzwingen (`ISSUE-130`).
6. **Rechtstexte & Stammdaten finalisieren:** Impressum + Datenschutzerklärung (`deliverables/IMPRESSUM_DRAFT.md`, `deliverables/DATENSCHUTZ_DRAFT.md`) — Platzhalter (Adresse, KvK, BTW-ID, Geschäftsführung, Kontakt, ggf. DSB) eintragen und anwaltlich prüfen lassen.

### Auftragsverarbeitung
7. **AV-Verträge (DPA) abschließen** für alle vor Customer-Live aktivierten Verarbeiter: Azure OpenAI (EU), SMTP-EU-Provider, Sentry (falls aktiviert), SMAO + SIP-Trunk (nur bei Aktivierung).

### Betrieb / Verfügbarkeit
8. **Server-Kapazität (`ISSUE-108`):** Der Produktions-Host ist speicher-eng (OOM-Risiko bei Builds). Vor Customer-Live Hetzner-Resize bzw. Off-Host-Build vorsehen (Verfügbarkeit / Art. 32 (1) b).
9. **Restliche Log-PII-Härtung (`ISSUE-124`)** und Low-Findings (`ISSUE-123/125/126`) abarbeiten.

### Formaler Abschluss
10. **Anwaltliche/DSB-Gesamtprüfung** dieses Dokuments sowie der Rechtstexte; Verfahrensverzeichnis (Art. 30) erstellen; ggf. DSFA-Schwellenwertprüfung (Art. 35) für die Aufnahme-/KI-Verarbeitung.

---

## 14. Disclaimer

Diese Dokumentation ist eine **technische Compliance-Beschreibung** des Strategaize Business Development Systems zum Stand V8.15 (2026-06-15). Sie dient als strukturierte Grundlage für die datenschutzrechtliche Bewertung und als Übergabe-Artefakt an eine Datenschutzbeauftragte/einen Datenschutzbeauftragten oder eine Anwaltskanzlei.

**Sie stellt keine Rechtsberatung dar und begründet keine Rechtssicherheit.** Aussagen zu Rechtsgrundlagen (Art. 6 DSGVO) sind Vorschläge der technischen Dokumentation und stehen unter dem ausdrücklichen Vorbehalt der juristischen Prüfung. Vor der produktiven Verarbeitung echter personenbezogener Daten ist eine Prüfung durch eine qualifizierte Stelle erforderlich; die in Abschnitt 13 genannten Punkte sind dabei abzuschließen.
