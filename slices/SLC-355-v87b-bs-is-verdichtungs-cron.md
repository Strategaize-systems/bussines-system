# SLC-355 — V8.7-B BS→IS Verdichtungs-Cron

- Feature: FEAT-872 (V8.7-B BS→IS Verdichtungs-Cron)
- Backlog: BL-494
- Version: V8.7-B
- Status: planned
- Delivery Mode: Internal Tool (BS = Strategaize-eigenes Business-System)
- Branch-Strategie: Single-Branch `main` (kein Worktree — kein paralleler Slice in flight, additive Files, Internal-Test-Mode; konsistent mit SLC-906..912)
- Migration: **keine** (siehe "Warum keine Migration")
- Aufwand: ~1–2 Tage
- Erstellt: 2026-06-12 (/slice-planning, RPT-628)

## Ziel

Ein wöchentlicher Cron (`/api/cron/knowledge-push`, So 02:00) verdichtet die in BS bereits vorhandenen Win/Loss-Analysen (`auto_winloss_runs`) und die Einwand-Behandlungen aus Activity-Notizen zu **anonymisierten, aggregierten** Wissens-Bausteinen und pusht sie per HTTP-POST an die IS-Knowledge-API (`POST /api/knowledge/ingest`). Aggregation läuft über **Branche × Deal-Größe**, niemals über Einzel-Kundennamen.

BS ist hier **zweite Datenquelle** der Wissens-Architektur (IS = Wissens-Master, OP = erste Quelle via SLC-354). Der IS-Endpoint ist live, REL-025, /post-launch HEALTHY (verifizierter Contract, siehe unten).

## Scope

### In Scope
- Client-Erweiterung `ingestKnowledge(items)` im bestehenden Adapter `cockpit/src/lib/is-knowledge/client.ts`.
- Pure-Function-Aggregation der `auto_winloss_runs` (status='succeeded', letzte 7 Tage) in Branche×Deal-Größen-Buckets mit k-Anonymitäts-Schwelle.
- **NEUER** Bedrock-Verdichtungs-Pass (eu-central-1): (a) Win/Loss-Bucket-Markdowns → eine destillierte Lessons-Markdown pro Bucket; (b) Einwand-Klassifikation über Activity-Notizen-Freitext → Einwand-Typen + Behandlungs-Zusammenfassung pro Branche.
- Deterministischer Item-Builder (Bucket → IS-Ingest-Item mit week-stamped `source_reference`).
- PII-Redact-before-send (belt-and-suspenders über den IS-internen Redact hinaus).
- Cron-Route mit `verifyCronSecret`, `KNOWLEDGE_PUSH_ENABLED`-Gate, `audit_log`-Eintrag (`action='is_knowledge_pushed'`, `actor_id=null`).

### Out of Scope
- KI-Workspace-RAG-Read-Erweiterung ("wie haben andere diesen Einwand behandelt?") — bereits in **V8.7-A SLC-871** ausgeliefert (FEAT-871, deployed). Nicht Teil von SLC-355.
- Keine IS-seitige Änderung (Endpoint existiert, Dedup via `UNIQUE(source_system, source_reference)` → keine IS-Migration).
- Kein neues BS-Tabellen-Schema (Tracking via `audit_log`).
- Kein Customer-Live / kein Customer-Outreach (Internal-Test-Mode, [[module-lifecycle-discipline]] + IMP-950).

## Verifizierter IS-Ingest-Contract (live geprüft 2026-06-12)

- **URL:** `POST {STRATEGAIZE_KNOWLEDGE_API_BASE_URL}/api/knowledge/ingest` (Default `https://is.strategaizetransition.com`)
- **Header:** `x-strategaize-service-key: <STRATEGAIZE_KNOWLEDGE_SERVICE_KEY>` + `x-strategaize-consumer: business-system` + `Content-Type: application/json`
- **Body:** `{ items: [ {title(≥1), body_markdown(≥1), domain, source_system:"business_system", source_reference(≥1, Dedup-Key), tags:[], metadata:{}} ] }` — min 1, **max 100/Call**, Extra-Felder werden serverseitig verworfen.
- **domain** für Win/Loss + Einwände = **`sales`**.
- **Server erzwingt (NICHT senden):** `aggregation_level='aggregated'`, `source_tenant_id=null`, `source_consultant_id=null`, `pii_redacted=true`.
- **Response:** 200 (alle ok) / 207 (Teil-Fail), Body `{inserted, deduped, failed, summary}`. 401 (Key), 429 (Rate-Limit + Retry-After), 400 (Payload).

> Hinweis: Der Cross-Repo-Plan nennt als Base-URL `https://intelligence.strategaize.com` — das ist **veraltet**. Der live-verifizierte + im Client-Default verwendete Host ist `https://is.strategaizetransition.com`; maßgeblich ist die Prod-ENV `STRATEGAIZE_KNOWLEDGE_API_BASE_URL` (in V8.7-A gesetzt).

## Warum keine Migration

- `audit_log.actor_id` ist **bereits nullable** (`sql/13_v41_migration.sql:74` `ALTER TABLE audit_log ALTER COLUMN actor_id DROP NOT NULL`). Die bestehende Cron-Konvention ist `actor_id: null` (z.B. `cockpit/src/app/api/cron/meeting-summary/route.ts:154`, `click-log-cleanup/route.ts:102`).
- `audit_log.action` ist Freitext (kein Enum/CHECK) → `'is_knowledge_pushed'` ist ohne Schema-Änderung gültig.
- Idempotenz liefert die IS-Seite via `UNIQUE(source_system, source_reference)`. Es braucht keinen BS-seitigen Push-State.
- Es existiert **kein** `ai_cost_ledger`/`ai_jobs` in BS (bestätigt SLC-909/DEC-288). Der Synthetic-`ai_jobs`-INSERT-Pattern aus `backend.md` gilt hier **nicht**. Cost wird BS-lokal in `audit_log.context` festgehalten (Sculptor-Präzedenz `cockpit/src/lib/automation/sculptor.ts:280-293`).

## Datenmodell-Grundlage (verifiziert)

| Quelle | Pfad | Relevante Felder |
|---|---|---|
| `auto_winloss_runs` | `sql/migrations/032_v66_working_hours_and_winloss.sql:46-60` | `deal_id`, `target_status` ('won'/'lost'), `bedrock_output` (**Freitext-Markdown**), `bedrock_model`, `status`, `bedrock_completed_at` |
| `deals` | `sql/01_schema.sql:80-97` | `value` DECIMAL (Deal-Größe), `company_id`, `status` |
| `companies` | `sql/01_schema.sql:25-41` | `industry` TEXT (= Branche, nullable) |
| `activities` | `sql/01_schema.sql:102-114` | `description` (Freitext-Notiz), `deal_id`, `type`, `created_at` |
| `audit_log` | `sql/08_v3_schema.sql:85-94` + MIG-048 | `action` (Freitext), `actor_id` (nullable), `entity_type`, `entity_id`, `context` (JSONB/Text), `created_at` |
| Bedrock | `cockpit/src/lib/ai/bedrock-client.ts` | `queryLLM(prompt, systemPrompt?, opts?)` → `{success,data,usage,modelId}`, Region pinned `eu-central-1` |
| Cost | `cockpit/src/lib/automation/sculptor-cost.ts:90-109` | `calculateSculptCost(usage, modelId)` → USD |

Deal-Größen-Buckets (Vorschlag, final in /backend): `small (<10k)`, `medium (10k–50k)`, `large (>50k)` über `deals.value`. Branche = `companies.industry` (NULL → `unknown`).

## Architektur-Entscheidungen (in /slice-planning getroffen → DECISIONS.md)

- **DEC-289** Verdichtungs-Pipeline: deterministisches Bucketing (pure) + per-Bucket Bedrock-Destillation; Objektion-Klassifikation via Bedrock über Activity-Notizen; keine BS-Migration; Idempotenz via week-stamped `source_reference` + IS-Dedup.
- **DEC-290** Anonymisierung & k-Anonymität: `KNOWLEDGE_PUSH_MIN_BUCKET` (Default 3) — Buckets unter Schwelle werden übersprungen (Re-Identifikations-Schutz für Strategaize-eigene Prospects); LLM-Anonymisierung (keine Namen im Prompt) + Redact-before-send.
- **DEC-291** Cost-Tracking BS-lokal: jeder Bedrock-Destillations-Call → `calculateSculptCost` → `audit_log.context`; **kein** `ai_jobs`/`ai_cost_ledger` (existieren nicht in BS).

## Micro-Tasks

### MT-1: `ingestKnowledge` Client-Erweiterung
- Goal: POST-Client zum IS-Ingest-Endpoint, spiegelt die bestehende `searchKnowledge`-Mechanik.
- Files: `cockpit/src/lib/is-knowledge/client.ts`, `cockpit/src/lib/is-knowledge/types.ts`, `cockpit/src/lib/is-knowledge/__tests__/ingest.test.ts`
- Expected behavior: `ingestKnowledge(items: IsKnowledgeIngestItem[]): Promise<{inserted:number;deduped:number;failed:number}>` — nutzt `buildAuthHeaders()` (+ `Content-Type: application/json`), `startRequestController`-Timeout, wirft `IsKnowledgeError` bei 401/429 (mit Retry-After)/4xx/5xx, parst 200 **und** 207 als Erfolgs-Body. Max-Batch-Validierung (≤100) Caller-seitig (MT-6).
- Verification: `npm run test -- ingest`; Mock-fetch für 200/207/401/429/400; `tsc`.
- Dependencies: none

### MT-2: Win/Loss-Bucketing + Objektion-Notiz-Sammlung (pure/read)
- Goal: Succeeded Win/Loss-Runs der letzten 7 Tage in Branche×Größen-Buckets gruppieren; Activity-Einwand-Notizen pro Branche sammeln.
- Files: `cockpit/src/lib/knowledge-push/aggregate-winloss.ts`, `cockpit/src/lib/knowledge-push/gather-objections.ts`, `cockpit/src/lib/knowledge-push/__tests__/aggregate.test.ts`
- Expected behavior: `aggregateWinLoss(admin, opts)` → `WinLossBucket[]` (`{branche, sizeBucket, targetStatus, dealCount, runMarkdowns:string[]}`), Buckets mit `dealCount < minBucket` werden gefiltert (DEC-290). `gatherObjectionNotes(admin, opts)` → `ObjectionGroup[]` (`{branche, noteCount, notes:string[]}`), ebenfalls k-min-gefiltert. **Keine** `company.name`/`contact`/`deal.title` im Output — nur `industry` + Bucket + Freitext-Body (Body geht durch Redact in MT-5).
- Verification: `npm run test -- aggregate`; Mock-supabase mit Fixture-Rows (won/lost, verschiedene Branchen/Größen, Bucket unter Schwelle → gefiltert).
- Dependencies: none

### MT-3: Bedrock-Verdichtungs-Pass (NEU — riskantester Teil, R-355-1)
- Goal: Win/Loss-Bucket-Markdowns destillieren + Einwände klassifizieren via Bedrock, BS-lokales Cost-Tracking.
- Files: `cockpit/src/lib/knowledge-push/distill.ts`, `cockpit/src/lib/knowledge-push/__tests__/distill.test.ts`
- Expected behavior: `distillWinLossBucket(bucket)` → destillierte Lessons-Markdown (gemeinsame Gewinn-/Verlust-Muster, anonymisiert). `classifyObjections(group)` → Einwand-Typen + Behandlungs-Zusammenfassung. Beide via `queryLLM` (eu-central-1, `temperature:0.2`, `maxTokens` gedeckelt). **Prompt enthält NIE Firmen-/Kontakt-Namen** (Input ist bereits nur Branche + Body). LLM nicht verfügbar / Fehler → Bucket wird übersprungen (fail-soft), Cron läuft weiter. Pro Call: `calculateSculptCost(usage, modelId)` → an Caller zur audit_log-Aggregation zurückgeben.
- Verification: `npm run test -- distill`; `queryLLM` gemockt (Erfolg → Markdown; Fehler → null + skip); Prompt-Snapshot ohne Namen.
- Dependencies: MT-2

### MT-4: Item-Builder (deterministisch)
- Goal: Bucket + destillierter Text → IS-Ingest-Item.
- Files: `cockpit/src/lib/knowledge-push/build-items.ts`, `cockpit/src/lib/knowledge-push/__tests__/build-items.test.ts`
- Expected behavior: `buildWinLossItem(bucket, distilled, isoWeek)` + `buildObjectionItem(group, classified, isoWeek)` → `IsKnowledgeIngestItem` mit `domain:"sales"`, `source_system:"business_system"`, deterministischem `source_reference`: `bs-winloss-<YYYY-Www>-branche:<slug>-size:<bucket>-<won|lost>` bzw. `bs-objection-<YYYY-Www>-branche:<slug>`, `tags:["winloss"|"objection","branche:<slug>"]`, `metadata:{deal_count, size_bucket, target_status, iso_week}`. ISO-Woche aus dem Lauf-Zeitpunkt (trailing-Window).
- Verification: `npm run test -- build-items`; gleiche Inputs → identische `source_reference` (Idempotenz-Eigenschaft); Slug-Normalisierung (Umlaute/Leerzeichen).
- Dependencies: MT-1 (Item-Typ), MT-2/MT-3 (Input-Shapes)

### MT-5: PII-Redact-before-send (belt-and-suspenders)
- Goal: Letzter Redact-Pass über `title`+`body_markdown` jedes Items vor dem Send.
- Files: `cockpit/src/lib/knowledge-push/redact.ts`, `cockpit/src/lib/knowledge-push/__tests__/redact.test.ts`
- Expected behavior: `redactItemsBeforeSend(items)` → strippt Email + Telefon (Pattern-Reuse aus `is-knowledge/redact-pii.ts`) aus `title`+`body_markdown`. Defense-in-Depth zusätzlich zur LLM-Anonymisierung — keine rohen Emails/Telefonnummern verlassen BS.
- Verification: `npm run test -- redact`; Items mit eingebetteten Emails/Phones → `[email]`/`[phone]`.
- Dependencies: MT-4

### MT-6: Cron-Route + Orchestrierung
- Goal: `/api/cron/knowledge-push` orchestriert MT-2→3→4→5→ingest, gated + auditiert.
- Files: `cockpit/src/app/api/cron/knowledge-push/route.ts`, `cockpit/src/app/api/cron/knowledge-push/route.test.ts`
- Expected behavior: `POST`, `verifyCronSecret` (401 bei Fehlschlag); `KNOWLEDGE_PUSH_ENABLED !== "true"` → `{success:true, skipped:true}` ohne IS-Call; sonst `createAdminClient()` → aggregate → distill → build → redact → `ingestKnowledge` in Chunks ≤100; ein `audit_log`-INSERT (`action:'is_knowledge_pushed'`, `actor_id:null`, `entity_type:'knowledge_push_run'`, `context`: `{iso_week, items_built, inserted, deduped, failed, bedrock_cost_usd, buckets_skipped}`). `export const maxDuration` gesetzt. Teil-207 → Cron gibt trotzdem `success:true` + `failed`-Count zurück.
- Verification: `npm run test -- knowledge-push`; Mock aller Helper; ENABLED-Gate-Pfad (kein IS-Call); bad-secret 401; happy-path audit_log-Row geschrieben.
- Dependencies: MT-1, MT-2, MT-3, MT-4, MT-5

## Acceptance Criteria

- **AC-355-1** `ingestKnowledge` POSTet korrekt geheadert, behandelt 200/207/401/429(Retry-After)/400/5xx, liefert `{inserted,deduped,failed}`.
- **AC-355-2** Win/Loss-Aggregation bucketet succeeded Runs (letzte 7 Tage) nach (Branche, Größen-Bucket); Buckets unter `KNOWLEDGE_PUSH_MIN_BUCKET` werden übersprungen; kein Kundenname/Kontakt/Deal-Titel im Bucket-Output.
- **AC-355-3** Einwand-Klassifikation läuft als Bedrock-Pass über Activity-Notizen-Freitext pro Branche; Prompt enthält keine Namen; LLM-Fehler → Bucket-Skip (fail-soft), Cron läuft weiter.
- **AC-355-4** `source_reference` ist deterministisch + week-stamped; Re-Run derselben Woche → IS dedupt (idempotent); `domain="sales"`, `source_system="business_system"`.
- **AC-355-5** Redact-before-send entfernt Email/Telefon aus `title`+`body_markdown`; keine rohen PII verlassen BS.
- **AC-355-6** Cron: 401 bei falschem Secret; `KNOWLEDGE_PUSH_ENABLED!="true"` → skip ohne IS-Call; bei enabled genau eine `audit_log`-Row `action='is_knowledge_pushed'`, `actor_id=null`, Counts im `context`.
- **AC-355-7** Items in Chunks ≤100/Call; 207-Teilfehler werden gezählt + geloggt, Cron-Gesamtergebnis bleibt `success`.
- **AC-355-8** Jeder Bedrock-Call: Cost via `calculateSculptCost` berechnet + in `audit_log.context` aggregiert (BS-lokal, kein `ai_jobs`/`ai_cost_ledger`).

## Risiken

| ID | Sev | Risiko | Mitigation |
|---|---|---|---|
| R-355-1 | High | NEUER Bedrock-Einwand-Klassifikations-Pass über Freitext-Notizen — Halluzination von Einwand-Typen, mögliche Leakage von Spezifika | Constrained Prompt (Taxonomie-Hint) + `temperature:0.2` + Identifier-Strip vor Prompt + nur Branchen-Aggregat (nicht per-Deal) + fail-soft Skip |
| R-355-2 | Medium | Re-Identifikation Strategaize-eigener Prospects über kleine Buckets | `KNOWLEDGE_PUSH_MIN_BUCKET` (Default 3) k-Anonymität + LLM-Anonymisierung + Redact-before-send (DEC-290) |
| R-355-3 | Medium | `bedrock_output` ist Freitext-Markdown (nicht strukturiert) → Destillation muss variablen Input tolerieren | Roh-Markdowns in Destillations-Prompt geben (kein Parsing), Bucket-Input-Größe deckeln |
| R-355-4 | Low | IS-Dedup → Same-Week-Re-Run aktualisiert gewachsenen Bucket nicht | Akzeptiert (wöchentlicher So-02:00-Lauf, trailing-7d-Window, week-stamped `source_reference`) |
| R-355-5 | Low | Kein `ai_cost_ledger` in BS → Cost nur in `audit_log.context` | Akzeptiert, Sculptor-Präzedenz |

## Pattern-Reuse (strategaize-pattern-reuse.md)
- `ingestKnowledge` spiegelt `searchKnowledge`/`getKnowledgeItem` im **selben** File (`buildAuthHeaders`, `IsKnowledgeError`, Timeout-Controller) — Same-Repo-Reuse.
- Bedrock via `queryLLM` + Cost via `calculateSculptCost` + `audit_log.context` — BS-lokale Präzedenz (Sculptor).
- Cron: `verifyCronSecret` + `createAdminClient` + `actor_id:null` — bestehende BS-Cron-Konvention.
- Redact: `is-knowledge/redact-pii.ts`-Pattern.
- Cross-Repo: IS-Ingest-Contract ist kanonische Quelle (live verifiziert), `source_system="business_system"`.

## Parallel-Execution
- Parallel-Gruppe: **A (solo)** — einziger Slice in flight; V8.14 ist bewusst nachgelagert.
- MIG reserviert: **keine** (keine Migration).
- File-Touchpoints: `cockpit/src/lib/is-knowledge/{client,types}.ts` (additiv), `cockpit/src/lib/knowledge-push/*` (neu), `cockpit/src/app/api/cron/knowledge-push/*` (neu).
- Shared-Resource: `client.ts`/`types.ts` werden **additiv** erweitert (V8.7-A-Exporte unberührt) → kein Konflikt.

## TDD
Internal Tool, aber logik-schwer: TDD-mandatory für die Pure-Functions (aggregate, build-items, redact) und den Client (mock-fetch); TDD für den Bedrock-Pass mit gemocktem `queryLLM`; Integration-Test für die Cron-Route mit gemockten Helfern.

## Founder-Pre-Steps (vor /deploy)
- Coolify-ENV: `KNOWLEDGE_PUSH_ENABLED=true` (Internal-Test-Mode OK ohne Anwalt — BS-Daten = Strategaize-eigener Vertrieb, keine Mandanten-Daten; [[feedback-v87b-switch-true-internal-test-mode-without-anwalt]]) + `KNOWLEDGE_PUSH_CRON_SECRET` (oder bestehenden `CRON_SECRET` reuse). `STRATEGAIZE_KNOWLEDGE_API_BASE_URL` + `STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` sind seit V8.7-A in Prod.
- Coolify-Scheduled-Task `knowledge-push` weekly (So 02:00) registrieren.

## Workflow
`/slice-planning` (dieser Schritt, DONE) → `/backend SLC-355` → `/qa SLC-355` → Gesamt-/qa V8.7-B → `/final-check` → `/go-live` (REL-XXX) → `/deploy` (Live-Push-Smoke gegen IS) → `/post-launch`.
