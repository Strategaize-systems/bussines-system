# FEAT-622 — Kampagnen-Attribution + UTM-Tracking

## Status
planned

## Version
V6.2

## Purpose
Kontakte und Firmen haben heute ein freies `source TEXT` + `source_detail TEXT`-Feld (V2 + V3.1). Das ist nicht aggregierbar: "Wieviele Leads kamen aus der LinkedIn-Kampagne im April?" laesst sich nicht ohne LIKE-Pattern beantworten, und Conversion-Auswertung ("welche Kampagne brachte gewonnene Deals") existiert gar nicht. V6.2 fuehrt **Kampagnen als eigenes Datenobjekt** ein, verknuepft Leads/Deals strukturiert dazu, und erlaubt UTM-getrackte Tracking-Links fuer digitale Kampagnen — ohne ein vollwertiges Marketing-Automation-System zu werden.

## Context
- **Existierende Source-Felder:** `contacts.source`, `contacts.source_detail`, `companies.source_type`, `companies.source_detail` — alle freitext, nicht aggregierbar.
- **System 4 (Marketing-Stack)** ist die Quelle, in der Kampagnen geplant und ausgespielt werden. Business System ist der Lead-Empfaenger und Deal-Track-Layer. V6.2 schliesst die Attribution-Luecke ohne System 4 zu duplizieren.
- BL-139 (V6.2, medium prio) ist die Anforderung mit explizitem Feedback-Loop-Wunsch zurueck zu System 4 (was war erfolgreich).

## V1 Scope

### Kampagnen-Datenmodell

Neue Tabelle `campaigns`:
- `id UUID`
- `name TEXT NOT NULL`
- `type TEXT` Whitelist `email|linkedin|event|ads|referral|other`
- `channel TEXT` (frei, z.B. "LinkedIn Ads", "Event Stand 2026-Q2")
- `start_date DATE`
- `end_date DATE NULL`
- `status TEXT` Whitelist `draft|active|finished|archived`
- `external_ref TEXT NULL` (optionale System-4-ID fuer Feedback-Loop)
- `notes TEXT NULL`
- `created_by UUID`
- `created_at TIMESTAMPTZ`

Anlegen, Editieren, Listing unter `/settings/campaigns` (V1) oder `/campaigns/[id]` (Detail-Page).

### Verknuepfung Leads zu Kampagnen
Neue Spalten:
- `contacts.campaign_id UUID NULL` (FK → `campaigns.id`)
- `companies.campaign_id UUID NULL` (FK → `campaigns.id`)
- `deals.campaign_id UUID NULL` (FK → `campaigns.id`) — gewinnt-die-Kampagne-Zuordnung, defaulted auf `contacts.campaign_id` des Primary-Contacts beim Deal-Create

Bestehende `source*`-Felder bleiben backward-compatible erhalten — V1 schreibt nur in das neue Feld, der Migrations-Pfad fuer Alt-Daten ist Open Question (siehe unten).

### UTM-Parameter / Tracking-Link-Pattern
Eine Kampagne kann 1..N Tracking-Links erzeugen. V1-Pattern:
- Server-Endpoint `/r/[token]?<utm-params>` redirected zur Ziel-URL
- Tracking-Link-Tabelle `campaign_links`:
  - `id UUID`
  - `campaign_id UUID FK`
  - `token TEXT UNIQUE` (kurz, ~8 Zeichen)
  - `target_url TEXT`
  - `utm_source TEXT`, `utm_medium TEXT`, `utm_campaign TEXT`, `utm_content TEXT NULL`, `utm_term TEXT NULL`
- Bei Klick wird in `campaign_link_clicks` ge-loggt: `link_id`, `clicked_at`, `ip_hash`, `user_agent`

Wenn ein Lead per Klick → Formular → Kontakt-Erstellung kommt: utm-Parameter werden in `contact.campaign_id` aufgeloest (System-4-seite Form-Embed liefert die utm-Werte zurueck an Business-System-API). UTM-Source-Mapping zu campaign_id passiert beim Lead-Insert.

Nicht in V1: Cookie-basiertes Multi-Touch-Tracking (Click X → 3 Tage spaeter Form), eigene Form-Builder-Page, automatischer UTM-Cookie-Set bei `/r/`-Klick.

### Reporting
Neue Page `/campaigns/[id]` mit:
- Kampagne-Header (Name, Typ, Zeitraum, Status)
- KPIs: Anzahl Leads (contacts), Anzahl verknuepfte Deals, Won-Deals + Won-Value, Lost-Deals, Conversion-Rate (Won-Deals / Leads), Average-Deal-Value
- Liste aller verknuepften Leads (Filter Stage/Status)
- Tracking-Links-Tab mit Klick-Counts pro Link
- Optional: CSV-Export

Erweiterung Funnel-Report (FEAT-335): Filter "Kampagne" hinzufuegen — zeigt Conversion-Funnel scoped auf eine Kampagne.

### Feedback-Loop zu System 4
V1: **Read-API**. System 4 zieht via `GET /api/campaigns/<id>/performance` die KPIs (Leads, Deals, Won-Value, Conversion-Rate) — Business System pusht NICHT. Auth via existierende Export-API-Patterns (FEAT-504).

Push (Webhook von Business System zu System 4) ist Out-of-Scope V1.

## Out of Scope V1
- Multi-Touch-Attribution (First-Touch, Last-Touch, Linear, Time-Decay) — V1 ist First-Touch-only (campaign_id = erste Zuordnung)
- A/B-Testing von Kampagnen-Varianten
- Auto-UTM-Link-Generator-UI in System 4 (das macht System 4 selbst)
- Cookie-basiertes Cross-Session-Tracking
- Push-Webhooks zu System 4 (read-API reicht V1)
- Auto-Migration der existierenden `source*`-Freitext-Werte zu `campaign_id` (manuell oder Skript out-of-band)
- Eigener Form-Builder (Lead-Capture-Form) — wird weiter in System 4 gebaut
- E-Mail-Marketing-Inhaltsstreuung (das machen Cadences FEAT-501 und Composing-Studio FEAT-532)
- Real-time Dashboard-Updates (Polling reicht)

## Acceptance Criteria
- AC1: User kann unter `/settings/campaigns` eine neue Kampagne mit Name, Typ, Zeitraum anlegen.
- AC2: Kontakt-Stammdaten zeigen Dropdown "Kampagne" mit Suche; Auswahl persistiert `contacts.campaign_id`.
- AC3: Firmen-Stammdaten zeigen analoges Dropdown.
- AC4: Bei Deal-Create wird `deals.campaign_id` automatisch von `contacts.campaign_id` des Primary-Contacts vorbelegt; manuell override-bar.
- AC5: User kann unter `/campaigns/[id]` Tracking-Link erzeugen mit Ziel-URL + utm-Parametern; Token wird auto-generiert.
- AC6: Klick auf `/r/[token]` redirected zur Ziel-URL und logged Click in `campaign_link_clicks`.
- AC7: Page `/campaigns/[id]` zeigt Lead-Count, Deal-Count, Won-Count, Won-Value, Conversion-Rate.
- AC8: Funnel-Report (FEAT-335) zeigt zusaetzlichen Filter "Kampagne".
- AC9: Endpoint `GET /api/campaigns/[id]/performance` gibt JSON-KPIs zurueck (auth via Export-API-Pattern).
- AC10: Bestehende `source*`-Freitext-Felder bleiben unveraendert lesbar; `campaign_id` ist additiv.
- AC11: Tracking-Link-Klick zaehlt Click; bei Click + nachgelagerter Lead-Erstellung mit utm-Parametern wird `contacts.campaign_id` automatisch gesetzt (utm_campaign-Param mappt auf campaigns.name oder campaigns.external_ref — Architektur-Entscheid).

## Risks & Assumptions
- **Risiko PII / Datenschutz** beim Click-Logging: IP-Adressen werden gehashed gespeichert, kein Klartext, retention 90 Tage. Konsistent mit COMPLIANCE.md V5.2.
- **Risiko Doppelte Sources:** ein Kontakt hat altes `source = "LinkedIn April"` (freitext) UND neues `campaign_id`. **Mitigation:** UI zeigt beide Felder transparent, Migration-Skript kommt out-of-band.
- **Risiko Conversion-Definition:** "Won-Deal" ist heute Stage-Konfiguration-abhaengig. **Mitigation:** Reporting nutzt existierende Pipeline-Stage-Whitelist (Stage-Typ `won`), die im V3 Pipeline-Modell schon existiert.
- **Annahme:** System 4 sendet utm-Werte beim Lead-Insert mit (Form-Embed-API), das Business System selbst muss keinen JS-Cookie-Tracker bauen.
- **Annahme:** Single-Tenant-Strategaize V6.2 — Kampagnen sind global im Tenant. Multi-Tenant-Scope kommt mit V7.

## Success Criteria
- 3+ Kampagnen produktiv angelegt nach 2 Wochen
- Conversion-Rate pro Kampagne sichtbar fuer >50% der gewonnenen Deals der vergangenen 90 Tage
- 0 unauflo­sbare PII-Konflikte im Click-Log

## Open Questions (fuer /architecture)
- F1: Verknuepfung mit existierenden `source`/`source_detail`-Feldern: parallel halten, deprecaten, oder Auto-Migration?
- F2: utm-Parameter-Mapping zu `campaigns.id` — ueber `utm_campaign = campaigns.name` (case-insensitive) oder ueber `external_ref`?
- F3: Tracking-Link-Token-Schema: kurz (~8 char) wie bit.ly oder UUID-prefix? Trade-off Lesbarkeit vs. Kollision.
- F4: Speicherort der `campaign_links`-Klick-Logs — eigene Tabelle (skaliert) oder Audit-Log-Reuse?
- F5: First-Touch-Persistenz: Wenn ein bestehender Kontakt einen 2. Kampagnen-Klick macht — wird `campaign_id` ueberschrieben oder gelocked? (V1: gelocked = first touch, aber zur Architektur-Entscheidung freigeben).
- F6: Funnel-Report (FEAT-335) muss Filter "Kampagne" akzeptieren — wie groesser ist der UI-Eingriff?
- F7: Read-API `/api/campaigns/[id]/performance` — Auth via Export-API-Pattern (FEAT-504) bestaetigen oder neuer Auth-Pfad?
- F8: Migration der bestehenden `source*`-Freitext-Werte: manuell (Settings-Tool fuer Mapping), Skript-basiert, oder gar nicht (nur new lookups)?
