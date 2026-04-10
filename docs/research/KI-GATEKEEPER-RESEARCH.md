# KI-Gatekeeper Research — State-of-the-Art AI Personal Assistants

> Erstellt: 2026-04-10 | Naechster Review: ~2026-04-24
> Referenz-Report: /reports/RPT-047.md
> Bezug: BL-329 (V4), BL-321-324+328 (V3.1)

---

## 1. Untersuchte Plattformen

| Plattform | Typ | Modell | Preis (ca.) |
|---|---|---|---|
| **OpenClaw** | Open-Source Personal AI Assistant | Self-hosted, MIT-Lizenz, 353K+ GitHub Stars | Kostenlos |
| **Anthropic MCP** | Offenes Protokoll (kein Produkt) | Standard fuer AI↔Tools | Kostenlos |
| **Microsoft Copilot for Sales** | Enterprise AI im CRM | SaaS, Dynamics 365 | ~$40-50/User/Monat |
| **Google Gemini Workspace** | Enterprise AI in Productivity | SaaS, Google Workspace | Im Workspace-Preis |
| **Clay** | Sales-Datenanreicherung + Outbound | SaaS | $149-800/Monat |
| **Lindy.ai** | No-Code AI Agent Builder | SaaS | $49-99/User/Monat |
| **Artisan AI (Ava)** | Autonomer AI-SDR | SaaS | $2.000+/Monat |
| **11x.ai (Alice)** | Autonomer AI-SDR | SaaS | $5.000-15.000/Monat |
| **Relevance AI** | No-Code Agent Builder | SaaS | $19-199/Monat |

Zusaetzlich gestreift: CrewAI (Multi-Agent Python), LangGraph (State-Machine Agents), n8n AI (Workflow-Automation), Bardeen (Browser-Automation).

---

## 2. Marktueberblick: Zwei Lager

### Autonom (AI handelt selbststaendig)
- **Artisan AI (Ava)**: Vollautonomer AI-SDR. Schreibt und sendet Cold Outbound, bucht Meetings, handled Einwaende. Built-in B2B-Datenbank (300M+ Kontakte). Ersetzt SDR-Headcount.
- **11x.ai (Alice)**: Autonomer Outbound-Agent. Hyper-personalisiert, eigene Prospect-Datenbank. Schreibt Sequences, sendet autonom, handled Replies.

### Assist (AI unterstuetzt, Mensch entscheidet)
- **Clay**: Datenanreicherung + Workflow-Builder. 75+ Datenquellen, Waterfall-Enrichment. Mensch designt Workflows und triggered. Outbound-fokussiert.
- **Lindy.ai**: Komposable AI-Assistenten ("Lindies"). Inbox-Triage, Kalender-Management, Daily Briefing. Konfigurierbare Autonomie pro Task.
- **Relevance AI**: No-Code Agent-Builder mit einfuegbaren Approval-Steps. API-first.
- **Microsoft Copilot for Sales**: Suggest-then-Confirm Modell. Email-Summaries, Meeting-Prep aus CRM-Daten, Follow-up-Vorschlaege. Nie autonomes Senden.
- **Google Gemini for Workspace**: Email-Summaries, Reply-Drafts. Weniger CRM-integriert als Copilot.

### Open-Source / Self-Hosted
- **OpenClaw**: Persoenlicher AI-Assistent. Self-hosted Gateway-Daemon. Multi-Channel (20+ Kanaele), Model-agnostisch, 5.400+ Skills via ClawHub, MCP-Bridge, Whisper-Integration. Single-User.

### Einordnung Strategaize

Unser Freigabe-Prinzip ("KI handelt NIE autonom am Kunden") positioniert uns klar im **Assist-Lager**. Keiner der Anbieter ist fuer **Inbound-Analyse + tiefe CRM-Kontext-Integration** optimiert — alle sind entweder Outbound-fokussiert (Clay, Artisan, 11x) oder generisch (OpenClaw, Lindy). Das ist unsere Differenzierung.

**Wir sind KEIN Wettbewerber zu OpenClaw.** OpenClaw ist ein generischer persoenlicher Assistent fuer jeden. Wir bauen ein fokussiertes Business-Development-Arbeitssystem fuer Vertriebler, Geschaeftsfuehrer und BD-Teams.

---

## 3. Feature-Vergleich im Detail

### A. E-Mail-Management

| Feature | Copilot | OpenClaw | Lindy | Clay | Artisan | **Wir (V3)** | **Wir geplant** |
|---|---|---|---|---|---|---|---|
| E-Mail senden (SMTP) | ja | ja (himalaya) | ja | ja (via Integr.) | ja autonom | ja | — |
| E-Mail empfangen (IMAP) | ja (Exchange) | ja (himalaya) | ja | nein | ja | nein | V4 (FEAT-405) |
| Inbox-Triage / Klassifikation | ja | ja (taskflow-inbox-triage) | ja | nein | ja | nein | V4 (BL-329) |
| E-Mail-Zusammenfassung | ja | ja | ja | nein | nein | nein | V4 (BL-329) |
| Dringlichkeits-Priorisierung | ja | ja | ja | nein | nein | nein | V4 (BL-329) |
| Auto-Reply-Erkennung | nein | nein | nein | nein | nein | nein | V4 (BL-327) |
| KI-E-Mail-Composing | ja (Draft) | ja | ja | ja (Templates) | ja autonom | nein | **V3.1 (BL-322)** |
| Voice-Eingabe fuer E-Mail | nein | ja (Whisper) | nein | nein | nein | ja (Whisper) | Ausbau V3.1 |
| KI-Verbesserung (Ton, Rechtschreibung) | ja | ja | ja | nein | ja | nein | **V3.1 (BL-322)** |
| Kontakt/Deal-Kontext in E-Mail | ja (Sidebar) | nein | teilweise | ja (enrichment) | teilweise | nein | **V3.1 (BL-323)** |

**Einschaetzung:** V3 hat nur SMTP-Versand. E-Mail-Analyse (IMAP, Triage, Klassifikation) = V4-Scope. KI-Composing mit Kontext-Vorbefuellung + Voice in V3.1 — das hat so kombiniert keiner.

### B. Kalender & Meetings

| Feature | Copilot | OpenClaw | Lindy | Artisan | **Wir (V3)** | **Wir geplant** |
|---|---|---|---|---|---|---|
| Kalender-Ansicht | ja | nein (via MCP) | ja | nein | ja | — |
| Meeting-Erstellung | ja | nein | ja | ja (autonom) | ja | — |
| Meeting-Prep (Kontext-Briefing) | ja (CRM-Daten) | nein | teilweise | nein | ja (LLM-Briefing) | — |
| KI-Tageseinschaetzung (Morning Brief) | ja (pro Tool) | nein | ja | nein | ja (Mein Tag) | **V3.1 (BL-328)** |
| Meeting-Erinnerungen an Teilnehmer | ja (Outlook) | nein | ja | nein | nein | V4 (BL-326) |
| .ics Kalender-Integration | ja (Exchange) | nein | nein | nein | nein | V4 (BL-326) |
| Meeting-Typ (Online/Physisch) | ja | nein | nein | nein | nein | **V3.1 (BL-318)** |
| Zeit-Picker Schnellauswahl | ja | n/a | n/a | n/a | nein | **V3.1 (BL-317)** |
| Rueckblick Vortag + ungesehene Events | nein | nein | nein | nein | nein | **V3.1 (BL-328)** |

**Einschaetzung:** Meeting-Prep mit LLM-Deal-Kontext-Briefing ist schon staerker als die meisten. Was fehlt: Teilnehmer-Erinnerungen (.ics) + erweiterte Tageseinschaetzung mit Vortags-Rueckblick — letzteres hat **keiner** so geplant.

### C. CRM-Kontext-Intelligenz

| Feature | Copilot | OpenClaw | Lindy | Clay | **Wir (V3)** | **Wir geplant** |
|---|---|---|---|---|---|---|
| Deal-Kontext in Formularen | ja (Sidebar) | nein | nein | nein | teilweise (Workspace) | **V3.1 (BL-323)** |
| Alle Felder auto-vorbefuellt | nein | nein | nein | nein | nein | **V3.1 (BL-323)** |
| KI-Suche natuerlichsprachlich | ja | ja | ja | ja | ja (KI-Suchleiste) | **V3.1 (BL-321)** Pipeline |
| Voice-Suche im CRM | nein | ja (Whisper) | nein | nein | ja (Whisper) | **V3.1 (BL-321)** |
| Deal-Zusammenfassung (LLM) | ja | nein | nein | nein | ja (Deal-Workspace) | — |
| Prozess-Checkliste pro Stage | nein | nein | nein | nein | ja (Required Fields) | — |
| Firmen/Kontakt KI-Summary | nein | nein | nein | ja (enrichment) | nein (Placeholder) | V3.1 (FEAT-315) |
| Datenanreicherung extern | nein | nein | nein | ja (75+ Provider) | nein | V5+ (evtl.) |

**Einschaetzung:** **Kontext-Intelligenz (BL-323)** — alle Formulare aus Kontext vorbefuellen — hat so **keiner der Wettbewerber**. Copilot zeigt CRM-Daten in Sidebar, befuellt aber keine Formulare. DAS Differenzierungsmerkmal.

### D. Wiedervorlagen & Follow-Up-Intelligenz

| Feature | Copilot | OpenClaw | Lindy | Artisan | **Wir (V3)** | **Wir geplant** |
|---|---|---|---|---|---|---|
| Manuelle Wiedervorlagen | ja | nein | ja | n/a | ja (Tasks) | — |
| Auto-Wiedervorlage nach Aktion | nein | nein | ja (konfigurierbar) | ja (autonom) | nein | **V3.1 (BL-324)** |
| Prioritaetsabhaengige Intervalle | nein | nein | teilweise | nein | nein | **V3.1 (BL-324)** |
| "Naechster Schritt?" nach Meeting | nein | nein | nein | nein | nein | **V3.1 (BL-324)** |
| KI-Wiedervorlagen (bidirektional) | nein | nein | nein | ja (aber autonom) | nein | V4 (BL-325) |
| Freigabe-Prinzip (nie autonom) | ja (Copilot) | ja (Approval Gates) | konfigurierbar | nein (autonom) | n/a | V4 (BL-325) |
| Auto-Reply → Wiedervorlage verschieben | nein | nein | nein | nein | nein | V4 (BL-327) |

**Einschaetzung:** **Bidirektionale KI-Wiedervorlagen mit Freigabe-Prinzip (BL-325)** gibt es am Markt nicht. **Auto-Reply-Erkennung mit intelligentem Rescheduling (BL-327)** hat **niemand**.

### E. AI-Gatekeeper / Persoenlicher Assistent

| Feature | Copilot | OpenClaw | Lindy | **Wir (V3)** | **Wir geplant** |
|---|---|---|---|---|---|
| E-Mail-Analyse + Zuordnung | ja (Exchange) | ja (himalaya) | ja | nein | V4 (BL-329) |
| Priorisierung + Alerting | ja | ja | ja | nein | V4 (BL-329) |
| Handlungsvorschlaege | ja (Draft) | ja | ja | nein | V4 (BL-329) |
| Morning Review Queue | nein (pro Tool) | nein | nein | ja (Mein Tag, aber manuell) | V4 (Batch-Approval) |
| Batch-Genehmigung (10 Items / 2 Min) | nein | nein | nein | nein | V4 (BL-329) |
| Confidence-Signale (warum dringend?) | ja | nein | teilweise | nein | V4 (BL-329) |
| Multi-Channel (WhatsApp, Slack...) | ja (Teams) | ja (20+ Kanaele) | ja (einige) | nein | Nicht geplant |
| Self-hosted / DSGVO | nein (MS Cloud) | ja | nein (US SaaS) | ja | ja |

### F. Infrastruktur & Architektur

| Feature | OpenClaw | MCP | Copilot | **Wir** |
|---|---|---|---|---|
| Self-hosted | ja | ja (Server) | nein | ja (Hetzner) |
| LLM-agnostisch | ja (Dutzende) | ja (Standard) | nein (GPT only) | Bedrock (Claude) |
| Plugin/Skill-System | ja (5.400+ Skills) | ja (Server-Oekosystem) | nein (geschlossen) | Eigene API-Routes |
| Voice (Whisper) | ja | nein | nein | ja |
| Memory/Kontext persistent | ja (LanceDB) | nein (stateless) | ja (Graph) | Supabase (CRM-Daten) |
| DSGVO / EU-Datenresidenz | ja (lokal) | ja (lokal) | nein | ja (Frankfurt) |
| Multi-Tenant | nein (single-user) | n/a | ja | ja |

---

## 4. OpenClaw — Deep Dive

OpenClaw ist die architektonisch relevanteste Referenz fuer unseren KI-Gatekeeper:

### Was OpenClaw ist
- Open-Source Personal AI Assistant (353K+ GitHub Stars, MIT-Lizenz)
- TypeScript, self-hosted Gateway-Daemon (macOS, Linux, Windows/WSL2)
- Sponsored von OpenAI, NVIDIA, Vercel, GitHub
- Multi-Channel: WhatsApp, Telegram, Slack, Discord, Signal, Teams, iMessage, 10+ weitere
- Model-agnostisch: OpenAI, Anthropic, Bedrock, Ollama, DeepSeek, Mistral, Groq
- Skills-System: 5.400+ Skills via ClawHub Registry
- MCP-Support: via `mcporter` Bridge
- Voice: Whisper (lokal + API), Text-to-Speech (Sherpa ONNX, ElevenLabs)
- Privacy-first: lokal, kein Cloud-Zwang

### Relevante OpenClaw Skills
- `taskflow-inbox-triage` — Proof-of-Concept fuer Email-Gatekeeper
- `himalaya` — Rust-basierter IMAP/SMTP Email-Client
- `voice-call` — Whisper-Integration
- `1password` — Secrets-Management

### Was wir von OpenClaw lernen
| Pattern | OpenClaw | Unser Aequivalent |
|---|---|---|
| Skills als Plugins | npm-distributed, hot-loadable | Dedizierte API-Routes pro Feature |
| `taskflow-inbox-triage` | Email-Klassifikation + Priorisierung | Unser BL-329 KI-Gatekeeper |
| MCP Bridge | Tool-Integration ohne Kern-Aenderungen | Optionaler Layer V4+ |
| Approval Gates | Riskante Aktionen brauchen Freigabe | Unser Freigabe-Prinzip |
| Whisper | Voice-first Interaktion | Schon eingebaut (V2.1) |

### Wo wir besser positioniert sind
- **CRM-Tiefe**: OpenClaw ist generisch. Wir haben Deal-Kontext, Firma, Kontakt, Timeline, Pipeline-Stages nativ
- **Multi-Tenant**: OpenClaw = Single-User. Wir = mehrere Nutzer mit Rollen (Governance V3)
- **Unified "Mein Tag"**: OpenClaw hat kein zentrales Tages-Cockpit. Unser Mein Tag = einzigartig
- **B2B-Beziehungslogik**: Prioritaetsabhaengige Follow-ups, Stage-aware Checks, Deal-Kontext-Briefings
- **Fokus**: OpenClaw = persoenlicher Assistent fuer jeden. Wir = Business-Development-System fuer BD-Teams, Vertriebler, Geschaeftsfuehrer

---

## 5. Best Practices — Was wir uebernehmen

### 5.1 Suggest-Approve-Execute (Copilot Pattern) — GOLD STANDARD

```
Email kommt rein
  → AI klassifiziert (Deal, Kontakt, Dringlichkeit, Thema)
  → AI reichert Kontext an (Deal-Status, letzte Interaktion, offene Tasks)
  → AI schlaegt Aktion vor (Antwort-Entwurf, Meeting, Task, Wiedervorlage)
  → Mensch prueft in Tagesbriefing oder Echtzeit-Alert
  → Mensch genehmigt / aendert / lehnt ab
  → System fuehrt genehmigte Aktion aus
```

### 5.2 Inbox-Triage (Lindy + OpenClaw Pattern)
- Eingehende Emails kategorisieren, priorisieren, dem richtigen Deal/Kontakt zuordnen
- Dringliches sofort in Aufgabenliste, Rest in Tageseinschaetzung am naechsten Morgen

### 5.3 Context-First (Clay Pattern)
- Kontext aus allen Quellen BEVOR Aktion vorgeschlagen wird
- Bei uns: eigene CRM-Daten (Deal, Kontakt, Firma, Timeline) statt externer Provider

### 5.4 Composable Approval Steps (Relevance AI Pattern)
- Human-Checkpoints an beliebiger Stelle im Workflow
- Queue-basiert: AI schlaegt vor → Queue → Mensch entscheidet → System fuehrt aus

### 5.5 Morning Briefing (Lindy + Copilot Pattern)
- Taeglich aggregieren: Ueber-Nacht-Emails, Meetings mit Deal-Kontext, ueberfaellige Tasks
- Einheitliche Sicht = Differenzierungsmerkmal (Microsoft macht pro Tool, nicht unified)

### 5.6 Action Cards (Copilot UX Pattern)
- Diskrete, dismiss-bare Karten mit klaren Aktionen (Genehmigen, Bearbeiten, Ablehnen)
- Confidence-Signale: "Deal schliesst in 5 Tagen, keine Antwort seit 3 Tagen"
- Keyboard-Shortcuts fuer Batch-Genehmigung (j/k navigieren, a/r genehmigen/ablehnen)

### 5.7 Skills-basierte Architektur (OpenClaw Pattern)
- Jede Integration als isoliertes Plugin/Modul
- MCP-Bridge fuer externe Tool-Integrationen (Datev, Lexware, Buchhaltung etc.)
- Vorbereitet fuer spaetere Kunden-Integrationen (deren Systeme anbinden via APIs)

---

## 6. Was wir NICHT uebernehmen

| Anti-Pattern | Warum nicht |
|---|---|
| Autonomes E-Mail-Senden (Artisan/11x) | Zerstoert Vertrauen in beziehungsgetriebenem B2B |
| Monolithische AI-Persona (Ava/Alice) | Intransparente Black Box — wir brauchen Transparenz |
| Externe Datenanreicherung (Clay 75+ Provider) | Eigene CRM-Daten reichen fuer V1-V4. Evtl. V5+ |
| SaaS-Pricing pro Seat | Self-hosted, fixe Infrastrukturkosten |
| Multi-Channel (WhatsApp, Slack, Telegram) | Web-App + PWA reicht fuer unser Use Case |
| Plugin-Oekosystem (5.400+ Skills) | Tiefe statt Breite — 5 tiefe Integrationen > 5.000 flache |
| Generischer Assistent (OpenClaw) | Wir sind kein persoenlicher Assistent fuer alle, sondern ein BD-System |

---

## 7. Technische Architektur-Patterns

### 7.1 MCP (Model Context Protocol — Anthropic)

- Offener Standard fuer AI ↔ Tools/Datenquellen
- Client-Server Modell (JSON-RPC 2.0 ueber stdio oder HTTP+SSE)
- KEIN eingebautes Approval-Layer — Human-in-the-Loop muss in Application-Ebene
- Verfuegbare Server: IMAP, Gmail, Google Calendar, PostgreSQL, Filesystem
- **Relevanz fuer uns:** MCP als Integrations-Layer fuer V4+
  - Custom MCP-Server fuer Supabase CRM-Daten
  - Custom MCP-Server fuer IMAP
  - Spaeter: Kunden-Integrationen (Datev, Lexware, andere Buchhaltung)
  - Existierende MCP-Server aus Oekosystem nutzen wo sinnvoll
  - Vorbereitung fuer moeglichen Verkauf an Kunden (deren APIs anbinden)

### 7.2 Email-Ingestion (V4)

| Aspekt | Empfehlung |
|---|---|
| Methode | IMAP-Polling alle 2-5 Minuten |
| Library | `imapflow` (Node.js) |
| Parsing | `mailparser` + `email-reply-parser` |
| Deduplizierung | `message_id` + `in_reply_to` in Supabase |
| Auto-Reply-Erkennung | Headers (`Auto-Submitted`), Subject-Pattern, Body-Laenge |

### 7.3 LLM-Klassifikation (Zwei-Pass)

**Pass 1 — Regelbasiert (0 LLM-Kosten, ~40% Volume):**
- Auto-Replies (Header-Check)
- Newsletter (`List-Unsubscribe` Header)
- Bounces (`mailer-daemon`)

**Pass 2 — Claude Sonnet via Bedrock (~$0.003/Email):**
- Input: Subject + erste 500 Zeichen + Sender-Metadata
- Output: `{category, urgency, intent, referenced_entity_hints, summary}`
- Entity-Linking: Domain → Firma, Fuzzy-Match → Kontakte, Top-3 Deals als Kontext

### 7.4 Follow-Up-Intelligenz (Hybrid)

```
follow_up_rules Tabelle:
  deal_stage → default_interval
  - Hot Lead:       2 Tage
  - Proposal Sent:  3 Tage
  - Warm:           5 Tage
  - Cold:           7 Tage
  (konfigurierbar pro Deal)

State Machine pro Thread:
  awaiting_response → response_received | overdue

Smart Rescheduling:
  Auto-Reply "back on Monday" → parse return_date → follow_up = return_date + 1
```

### 7.5 Human-in-the-Loop Queue

**Supabase-Tabelle `ai_action_queue`:**

| Spalte | Typ | Beschreibung |
|---|---|---|
| id | uuid | Primary Key |
| type | enum | reply, follow_up, task, meeting, alert |
| email_id | uuid | Referenz auf analysierte Email |
| deal_id | uuid | Zugeordneter Deal |
| suggested_action | jsonb | AI-Vorschlag (Draft, Datum, etc.) |
| ai_reasoning | text | Begruendung der AI |
| status | enum | pending, approved, rejected, expired |
| created_at | timestamptz | Erstellt |
| decided_at | timestamptz | Entschieden |

**Morning Review UX:** Einzelne Seite, sortiert nach Dringlichkeit. Pro Karte: Email-Summary, AI-Vorschlag, Approve/Reject/Edit. Keyboard-Shortcuts. Ziel: 10 Entscheidungen in 2 Minuten.

### 7.6 DSGVO / Compliance

| Aspekt | Loesung |
|---|---|
| Datenresidenz | Bedrock Frankfurt (eu-central-1) + Hetzner Deutschland = alles in EU |
| Email-Speicherung | Volle Email 90 Tage, danach nur Metadata + AI-Summary |
| Rechtsgrundlage | Berechtigtes Interesse Art. 6 Abs. 1 lit. f DSGVO |
| Audit Trail | `ai_audit_log` — Insert-only, jede Klassifikation + Entscheidung |
| Art. 22 DSGVO | Recht auf Erklaerung → `ai_reasoning` Feld |

---

## 8. Was wir NICHT haben — Relevanz-Bewertung

| Feature | Wer hat's | Haben wir | Relevanz |
|---|---|---|---|
| **IMAP-Empfang** | OpenClaw, Copilot, Lindy | nein | HOCH — Kern fuer KI-Gatekeeper (V4) |
| **KI-Composing mit Kontext** | Copilot | nein | HOCH — V3.1 (BL-322+323), Differenzierung |
| **Auto-Wiedervorlagen** | Lindy, Artisan | nein | HOCH — V3.1 (BL-324) |
| **Batch-Approval Queue** | Niemand so | nein | HOCH — V4 (BL-329), Innovation |
| **Auto-Reply-Erkennung** | Niemand | nein | HOCH — V4 (BL-327), Vertriebsintelligenz |
| **Bidirektionale KI-Wiedervorlagen** | Niemand | nein | HOCH — V4 (BL-325), Marktinnovation |
| **Meeting-Transkription** | Copilot (Teams) | nein | MITTEL — V4 (FEAT-404) |
| **Kalender-Sync (.ics)** | Copilot, Lindy | nein | MITTEL — V4 (BL-326) |
| **MCP Bridge fuer Integrationen** | OpenClaw | nein | MITTEL — V4+ (Datev, Lexware etc.) |
| **Externe Datenanreicherung** | Clay (75+ Provider) | nein | NIEDRIG — eigene Daten reichen |
| **Autonomes E-Mail-Senden** | Artisan, 11x | nein | NEIN — widerspricht Freigabe-Prinzip |
| **Multi-Channel** | OpenClaw (20+) | nein | NIEDRIG — Web-App + PWA reicht |
| **No-Code Agent Builder** | Lindy, Relevance AI | nein | NIEDRIG — massgeschneidert > generisch |
| **Plugin-Oekosystem** | OpenClaw (5.400+) | nein | NIEDRIG — Tiefe > Breite |

---

## 9. Architektur-Empfehlung: 3 Phasen

### Phase 1: V3.1 — Kontext-Intelligenz (kein IMAP noetig)

Nutzt nur vorhandene CRM-Daten + bestehenden Bedrock LLM-Service:

- BL-317: Zeit-Picker Schnellauswahl
- BL-318: Meeting-Typ Online/Physisch
- BL-319: Schnellaktionen (Sheet statt Navigation)
- BL-320: E-Mail Compose-Sheet
- BL-321: Pipeline KI-Suche + Voice
- BL-322: KI-E-Mail-Composing mit Kontext
- BL-323: Kontext-Intelligenz (alle Formulare vorbefuellt)
- BL-324: Auto-Wiedervorlagen nach Aktionen
- BL-328: Tageseinschaetzung erweitert
- **BL-330: KI-Features on-click statt auto-load (Kostenkontrolle)**

### Phase 2: V4 — KI-Gatekeeper (IMAP erforderlich)

- FEAT-405: IMAP Mail-Integration (imapflow)
- BL-329: KI-Gatekeeper (Klassifikation + Priorisierung + Alerting)
- BL-325: KI-Wiedervorlagen bidirektional
- BL-326: Meeting-Erinnerungen + .ics
- BL-327: Auto-Reply-Erkennung + Rescheduling
- FEAT-404: Call Intelligence (Meeting-Transkription)
- ai_action_queue + Morning Review UI
- Zwei-Pass-Klassifikation (regelbasiert + Bedrock)

### Phase 3: V4+ — MCP Bridge (optional, Zukunft)

- Custom MCP-Server fuer Supabase CRM-Daten
- Custom MCP-Server fuer IMAP
- Integrationen: Datev, Lexware, andere Buchhaltung
- Vorbereitung fuer Kunden-Integrationen (deren APIs anbinden)
- Existierende MCP-Server nutzen wo sinnvoll

---

## 10. Differenzierung gegenueber Wettbewerb

| Aspekt | Markt | Strategaize |
|---|---|---|
| Fokus | Outbound-Sales | Inbound-Analyse + Beziehungspflege |
| Zielgruppe | Generisch / SDR-Teams | BD-Teams, Vertriebler, Geschaeftsfuehrer |
| Autonomie | Autonom oder konfigurierbar | Freigabe-Prinzip: nie autonom am Kunden |
| Daten | Externe Provider (Clay: 75+) | Eigene CRM-Daten als Single Source of Truth |
| Hosting | SaaS (US-Cloud) | Self-Hosted Hetzner Deutschland (DSGVO) |
| Voice | Kaum vorhanden | Whisper-first fuer Mobile + Desktop |
| Preis | $49-$15.000/Monat recurring | Fixe Infrastrukturkosten |
| Integration | Generisch, flach | Tief in eigenes CRM (Deal, Kontakt, Firma, Timeline) |
| Tages-Cockpit | Pro Tool verteilt | Unified "Mein Tag" mit allem in einer View |
| Wiedervorlagen | Einfach oder autonom | Bidirektional Mensch ↔ KI mit Freigabe |

---

## 11. Fazit

1. **Freigabe-Prinzip ist korrekt** — autonomes Handeln zerstoert B2B-Vertrauen
2. **Suggest-Approve-Execute** ist der validierte Gold-Standard (Copilot)
3. **Morning Briefing als zentrale UX** — alle erfolgreichen Assistenten bieten Daily Summary
4. **Kontext-Intelligenz (BL-323)** hat am Markt **keiner** so — echtes Differenzierungsmerkmal
5. **Bidirektionale KI-Wiedervorlagen (BL-325)** = Marktinnovation
6. **Auto-Reply-Erkennung (BL-327)** = hat niemand
7. **Voice-Input (Whisper)** = echtes Differenzierungsmerkmal, kein Wettbewerber als Kern
8. **V3.1 braucht kein IMAP** — CRM-Kontext reicht
9. **MCP als Zukunfts-Layer** fuer externe Integrationen (Datev, Lexware, Kunden-APIs)
10. **Wir sind cutting edge** und kombinieren das Beste vom Markt
