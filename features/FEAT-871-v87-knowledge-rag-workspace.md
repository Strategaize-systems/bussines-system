# FEAT-871 — V8.7-A KI-Workspace IS-Knowledge-API-RAG-Erweiterung

**Version**: V8.7-A
**Backlog**: BL-505
**Slice**: SLC-871 (geplant in `/slice-planning V8.7-A`)
**Status**: Requirements done 2026-06-01
**Created**: 2026-06-01

## Problem

Der KI-Workspace in BS (V6.6 Foundation) ist auf 4 Pages aktiv: Mein Tag, Deal-Detail, KI-Cockpit, Team-Cockpit. Jeder Workspace hat:

- vordefinierte **Standard-Berichts-Buttons** (5-6 pro Page)
- eine **Frage-Eingabe** (Text + Whisper-Voice)
- ein **Antwort-Fenster** (`AnswerPane`)

Aktuelle RAG-Quelle = **ausschliesslich BS-eigene Daten** (`cockpit/src/lib/knowledge/` lokaler chunker/indexer/search ueber Deal-Activities, Emails, Meeting-Transkripte).

**Was fehlt:** Strategaize-eigene Lehren (Pitches, Einwand-Behandlungen, Best Practices, Win-Reason-Muster, Branchen-Anker) sind NICHT abrufbar im Workspace. Beispiel-Fragen, die im Beratungs-Gespraech aufkommen und heute NICHT beantwortbar sind:

- "Wie haben wir den Einwand 'zu teuer' bei vergleichbaren StB-Kanzleien geloest?"
- "Welcher Pitch fuer Datenschutz-Beauftragte hat in 2025 am besten konvertiert?"
- "Was haben wir aus den letzten Verlust-Deals in der Steuerkanzlei-Branche gelernt?"

Diese Lehren sind seit IS V3.5 (REL-016 + REL-017, 2026-06-01) im **IS-Knowledge-API** zentral verfuegbar — 39 Foundation-Items aus `CUSTOMER_FACING.md` durchsuchbar via pgvector + HNSW, mit Service-Key-Auth + Rate-Limit (100/min) + Defense-Filter (raw-Items exkludiert). Aber BS spricht die API nicht.

## Goal / Intended Outcome

BS-KI-Workspace bekommt eine **zweite, orthogonale RAG-Quelle**: die IS-Knowledge-API. Der User stellt eine Frage im Workspace, und die Antwort kombiniert wo sinnvoll:

- BS-eigene Deal-/Kontakt-/Activity-Daten (Mandanten-Wissen)
- Strategaize-Foundation-Wissen aus IS (allgemeines Verkaufs-/Beratungs-Wissen)

**Konkreter Outcome:** Der Berater fragt im Deal-Workspace "wie haben andere diesen Einwand behandelt?" und bekommt eine Antwort, die auf vergleichbare Strategaize-Patterns aus IS verweist, ohne dass er das IS-Backend kennen oder bedienen muss.

## Primary Users

- **Strategaize-Berater / Founder (V1)** — nutzt KI-Workspace taeglich im Deal-Kontext, will Strategaize-Wissen on-demand
- Spaeter: Teamlead + Member (V7-Multi-User) — selbe Workspaces, selbe Frage-Pfade

Out-of-scope V8.7-A: Kunden, externe Partner, Multi-Tenant-Konsumenten.

## V1 Scope (V8.7-A — JETZT)

Diese Punkte sind in V8.7-A drin:

### S1 — IS-API-Konsumenten-Client in BS

- Neuer Server-Side-Adapter `cockpit/src/lib/is-knowledge/client.ts` (Pfad-Empfehlung, final in `/architecture`)
- Wrappt die 3 IS-Endpoints: `GET /api/knowledge/search`, `GET /api/knowledge/item/[id]`, `GET /api/knowledge/health`
- Service-Key-Auth via `STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` (Server-Side-only, NIE `NEXT_PUBLIC_*`) + `x-strategaize-consumer: business-system` Header
- Server-Side-only (kein Browser-Direct-Call — sonst Service-Key-Leak)
- Timeout + Graceful-Degradation: wenn IS-API down/timeout/401, faellt der Workspace auf BS-only-RAG zurueck mit kleinem Hinweis "Strategaize-Wissen aktuell nicht erreichbar"

### S2 — Integration in mindestens den Deal-Detail-Workspace

Mindestpflicht: **Deal-Detail-Workspace** (`cockpit/src/components/deals/deal-ki-workspace-wrapper.tsx`) zieht die IS-Knowledge-Quelle ein. Konkret:

- Bestehende 5 Reports (briefing, signale, risiken, naechster-schritt, winloss) bekommen IS-Knowledge-Treffer als optionalen Context (Top-K=3, gefiltert nach `domain=sales`)
- Freie-Frage-Pfad zieht standardmaessig BEIDE Quellen (BS-RAG + IS-Knowledge)
- Antwort-Rendering zeigt Strategaize-Wissens-Treffer als gekennzeichneten Block ("Aus Strategaize-Wissens-Basis:")

Optional (siehe Open Questions): Mein Tag + KI-Cockpit + Team-Cockpit. Entscheidung in `/architecture`.

### S3 — q-Param PII-Schutz (Konsumenten-Pflicht aus IS RPT-275 O-1)

IS audit_log speichert `query_excerpt` — wenn BS in der `q`-Param PII einbettet, landet die im IS-Audit-Log. Daher Pflicht:

- Vor jedem IS-Search-Call laeuft eine simple Email/Phone-Pattern-Regex-Redact-Funktion ueber `q`
- Konkret: Email-Pattern `\S+@\S+\.\S+` → `[email]`, Phone-Pattern `\+?\d{6,}` → `[phone]`
- Falls Free-Frage Mandanten-Namen enthaelt: in V8.7-A NICHT automatisch redacten (komplex), aber UI-Hinweis im Workspace bei aktivierter IS-Quelle

### S4 — Cost-Tracking spiegeln in BS audit_log

IS gibt `query_embedding_cost_usd` zurueck. BS schreibt das in `audit_log` als Event `is_knowledge_queried` mit Kosten + Treffer-Anzahl + Workspace-Page-Identifier. Reuse `audit_log`-Pattern aus V6.4 DSGVO-Trail.

### S5 — Rate-Limit-Awareness

- Bei IS-Response 429 → BS Workspace zeigt "Strategaize-Wissens-Basis kurz ueberlastet, bitte gleich nochmal" und faellt auf BS-only-RAG zurueck
- Kein Client-Side-Retry-Storm — Hint im Header `retry-after-seconds` wird respektiert

### S6 — Coolify-ENV-Setup-Doku

- `STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` muss vom User in BS-Coolify-ENV gesetzt werden, **identischer Wert wie IS-Coolify-UI**
- Doku: `qa/SLC-871-coolify-env-setup.md` analog IS `qa/SLC-352-coolify-env-setup.md`
- Optional: `STRATEGAIZE_KNOWLEDGE_API_BASE_URL` (default `https://is.strategaizetransition.com`)

## Out of Scope (V8.7-A)

Diese Punkte sind bewusst NICHT in V8.7-A:

- **SLC-355 BS→IS Verdichtungs-Cron (Push)** — Wird zu V8.7-B (siehe FEAT-872), deferred bis nach V8.10 + V8.11 + Anwalt-Sign-off. V8.7-A ist Read-only.
- **Win/Loss-Aggregat-Berechnung in BS** — Nicht noetig, da kein Push.
- **Multi-User-RLS-Hardening** — kommt in V8.11 RLS-Sweep (BL-500).
- **Workspace-UI-Redesign** — Workspace bleibt V6.6-Layout; IS-Treffer werden in bestehende `AnswerPane`-Struktur eingebettet.
- **OP V7.6 Workspace-RAG (parallel-Konsument)** — separater Track im OP-Repo; symmetrisch aber unabhaengig.
- **PII-Redaction von Mandanten-Namen** — Email/Phone reicht in V8.7-A; Name-Redaction ist komplex (Eigennamen-NER), V8.x+ Slot.
- **Workspace-Caching der IS-Treffer** — falls Performance es erfordert, V8.7.1-Polish.
- **Knowledge-Item-Detail-Page in BS** — IS-Item-Endpoint wird zur Quellenangabe genutzt, aber BS rendert keinen eigenen Knowledge-Item-Detail-View (Link auf IS-Admin reicht).
- **Mehrere Sprachen** — V8.7-A nur Deutsch, IS-Knowledge ist DE-only.

## Core Features

Eine Slice-Empfehlung (final in `/slice-planning`):

- **SLC-871** "KI-Workspace IS-Knowledge-API-Konsument" — 1 Slice mit ~6-8 Micro-Tasks:
  - MT-1 IS-API-Client-Adapter (S1)
  - MT-2 q-Param PII-Redact (S3)
  - MT-3 audit_log-Event (S4)
  - MT-4 Deal-Detail-Workspace-Integration (S2)
  - MT-5 Graceful-Degradation + 429-Awareness (S5)
  - MT-6 ENV-Setup-Doku + Live-Smoke-Spec (S6)
  - Optional MT-7 + MT-8 wenn /architecture mehr Workspace-Pages einschliesst

## Constraints

- **IS V3.5 muss live bleiben** (REL-016 + REL-017). Bei IS-Downtime ist V8.7-A funktional degraded auf BS-only.
- **Service-Key-Sync**: BS-Coolify-ENV-Wert muss IS-Coolify-ENV-Wert exakt entsprechen — bei Key-Rotation muessen beide gleichzeitig geaendert werden.
- **Rate-Limit 100/min Consumer-wide**: alle 4 Workspace-Pages in BS teilen sich dieses Budget. Bei intensiver Nutzung kann das knapp werden — Cost-Cap (siehe V8.12 Defense-in-Depth) wird als Master-Switch parallel laufen.
- **PII darf nicht in `q`-Param**: gilt fuer BS und OP-Konsumenten gleichermassen — Konsumenten-Pflicht aus IS RPT-275 O-1.
- **DSGVO-Position**: V8.7-A pusht nichts. Es ist ein Read-only-Client. Keine Mandanten-Daten verlassen BS. Anwalt-Gate gilt nur fuer V8.7-B.
- **Internal-Test-Mode bleibt aktiv** — V8.7-A ist Pre-Customer-Live-Build.

## Risks / Assumptions

- **R-1 (Low)**: IS-API-Latenz koennte Workspace-Antwort-Zeit erhoehen. Mitigation: Timeout 3-5s, Graceful-Degradation. /architecture klaert konkrete Werte.
- **R-2 (Medium)**: Service-Key-Leak bei versehentlicher Client-Side-Verwendung. Mitigation: Adapter ist Server-Side-only, Verifikation in /qa.
- **R-3 (Low)**: PII-Pattern-Regex koennte False-Positives erzeugen (z.B. Domain-Namen vs Email). Mitigation: einfacher Regex reicht in V8.7-A, V8.x kann verfeinert werden.
- **R-4 (Low)**: IS-Knowledge-Inhalt veraltet ohne dass BS es merkt. Mitigation: Health-Endpoint mit `items_total` kann optional Sanity-Check liefern.
- **Annahme**: 39 Foundation-Items reichen V8.7-A — Bulk-Import aus `CUSTOMER_FACING.md` ist die Basis. Erweiterung via IS-Admin-UI (V3.5 SLC-351) ist out-of-scope-V8.7-A aber moeglich.

## Success Criteria

V8.7-A ist erfolgreich, wenn:

- ✅ Berater stellt im Deal-Detail-Workspace eine Freie-Frage und bekommt mindestens 1 Treffer aus IS-Knowledge als gekennzeichneten Block
- ✅ Mindestens 1 Standard-Report im Deal-Workspace (z.B. `risiken-einwaende`) nutzt IS-Knowledge-Context und zeigt Strategaize-Pattern-Bezug
- ✅ Service-Key wird sauber via ENV geladen, kein Hardcode, kein Browser-Bundle-Leak
- ✅ Bei IS-Down ist BS-Workspace funktional (nur BS-RAG, klarer UI-Hinweis)
- ✅ Bei IS-Rate-Limit-429 zeigt BS klare User-Meldung
- ✅ audit_log enthaelt `is_knowledge_queried`-Events mit Cost + Workspace-Page
- ✅ Email/Phone-PII wird vor IS-Call redacted
- ✅ IS audit_log zeigt `consumer_id=business-system` bei BS-getriggerten Search-Calls
- ✅ Vitest >= aktueller Baseline + min. 6 neue Tests (Adapter + PII-Redact + Graceful-Degradation + audit_log)
- ✅ Live-Smoke gegen `is.strategaizetransition.com` mit echtem Service-Key 5/5 PASS

## Open Questions (fuer /architecture V8.7-A)

- **OQ-A1 — Integrations-Modell:** Wie wird die zweite RAG-Quelle in den Workspace integriert? 4 Optionen:
  - (a) Pro Standard-Report: Report-Runner ruft optional IS-Knowledge auf und merged Treffer in Context
  - (b) Dedizierter neuer Standard-Button "Strategaize-Wissen" pro Workspace (separater Report)
  - (c) Free-Question-Path zieht standardmaessig BEIDE Quellen, Standard-Reports bleiben BS-only
  - (d) User-Toggle "BS-Daten + Strategaize-Wissen ein/aus" im Workspace-Header
  - **Empfehlung**: (a)+(c) Kombi — Free-Question pulled beide, Reports koennen IS-Context optional einbinden. Aber `/architecture` final.

- **OQ-A2 — Workspace-Scope:** Welche Workspaces bekommen V8.7-A? Optionen:
  - (a) Nur Deal-Detail (kleinster Scope)
  - (b) Deal-Detail + Mein Tag (mittel)
  - (c) Alle 4 (Deal-Detail + Mein Tag + KI-Cockpit + Team-Cockpit)
  - **Empfehlung**: (b) — Deal-Detail (Einwand-Behandlungen) + Mein Tag (Strategaize-Daily-Tips). KI-Cockpit + Team sind weniger Wissens-Kontext.

- **OQ-A3 — q-Param PII-Schutz:** Wo lebt die Redact-Funktion? Adapter-intern (transparent) oder Caller-explicit?
  - **Empfehlung**: Adapter-intern — der Konsumenten-Adapter macht den Redact automatisch, Caller muss nichts wissen.

- **OQ-A4 — Health-Endpoint-Nutzung:** Brauchen wir den `/api/knowledge/health` Call?
  - (a) Nein, Search-Latenz-/Error-Pattern reicht als Health-Signal
  - (b) Ja, Boot-Time-Check + alle 60 Min Sanity
  - **Empfehlung**: (a) — keep it lean, Health ist YAGNI in V8.7-A.

- **OQ-A5 — Cost-Cap pro Workspace-Session:** Pro Workspace-Session sollte ein Soft-Cap existieren (analog V8.12 LLM-Cost-Cap), damit Frage-Storm nicht 100/min Rate-Limit verbrennt.
  - **Empfehlung**: Soft-Cap = 20 IS-Calls/Workspace-Session, danach UI-Hinweis "Strategaize-Wissens-Quote fuer diese Session aufgebraucht".

- **OQ-A6 — Browser-Bundle-Sicherheit:** Wie verhindern wir, dass jemand versehentlich `STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` in einer Client-Component referenziert?
  - **Empfehlung**: Adapter explizit als `"use server"`-Action oder Server-Action, ENV-Naming ohne `NEXT_PUBLIC_*`, dazu ESLint-Regel falls vorhanden.

- **OQ-A7 — Caching:** Soll BS Search-Treffer cachen? IS hat selbst kein Result-Cache, jeder Search-Call kostet ~$0.0001 (Titan-Embedding-Cost).
  - **Empfehlung**: V8.7-A NICHT cachen — Cost vernachlaessigbar, Cache-Invalidation komplex. V8.7.1-Polish wenn noetig.

- **OQ-A8 — Antwort-Rendering:** Wie sehen IS-Treffer im `AnswerPane` aus?
  - (a) Inline-Bullet-Liste am Ende der Antwort
  - (b) Separater Block "Aus Strategaize-Wissens-Basis" mit Item-Titeln + Score
  - (c) Link-Footer "Diese Antwort nutzt Strategaize-Wissen + Mandanten-Daten"
  - **Empfehlung**: (b)+(c) — Block mit Treffern + Footer-Hinweis fuer Transparenz.

## Delivery Mode

- **internal-tool** (unveraendert zu BS-Gesamtsystem)
- Internal-Test-Mode bleibt aktiv
- Single-User V1 (Founder), Multi-User-Skalierung kommt mit V8.11 RLS-Sweep

## V8.7-B Outlook (deferred, nicht V8.7-A-Scope)

V8.7-B = FEAT-872 = SLC-355 BS→IS Verdichtungs-Cron. Wird gestartet:

- **NACH V8.10** (Email-DOMPurify + documents-Storage user-scoped, BL-498 + BL-499)
- **NACH V8.11** (RLS-Sweep 25 Zweittabellen, BL-500) — kritischster Pre-Live-Brocken
- **NACH Anwalt-Sign-off** fuer Mandanten-Daten-Verdichtung (auch wenn aggregiert)
- **KNOWLEDGE_PUSH_ENABLED=false** als Master-Switch bis Anwalt durch

V8.7-B-Scope (Outline, final in eigener /requirements-Iteration spaeter):
- Win/Loss-Reasons aus `auto_winloss_runs` aggregieren nach Branche + Deal-Groesse-Bucket
- Einwand-Behandlungen aus Activity-Logs aggregieren
- Weekly Sonntag-Nacht Cron
- HTTP-POST zu IS-Knowledge-API mit `aggregation_level='aggregated'`, kein `source_tenant_id`
- Anwalt-Pruefung der Aggregations-Pipeline

## Recommended Next Step

`/architecture V8.7-A` — entscheidet die 8 Open Questions und legt:

- Adapter-Pfad + Interface
- Workspace-Page-Scope
- Report-Runner-Integration-Pattern
- audit_log-Event-Schema
- Cost-Cap-Mechanismus
- ENV-Variablen-Pflichtliste

… verbindlich fest. Danach `/slice-planning V8.7-A → SLC-871`.
