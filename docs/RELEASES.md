# Releases

### REL-024 — V6.2 Workflow-Automation + Kampagnen-Attribution
- Date: planned
- Scope: V6.2 Foundation + Engine. **SLC-621** Workflow-Foundation (done): MIG-029 Phase 1 (`automation_rules` + `automation_runs` mit Anti-Loop-UNIQUE + 3 Indizes + RLS + GRANTS), Trigger-Source-Audit-Liste, Condition-Engine (9 Operators, AND-only), Field-Whitelist mit PII-Schutz, Trigger-Dispatcher, 5 Server Actions Rule-CRUD. **SLC-622** Workflow-Engine (done): Action-Executor mit Run-Lock + TOCTOU-Re-Eval + Recursion-Guard, 4 Action-Types (`create_task`, `send_email_template`, `create_activity`, `update_field`), `assignee-resolver` (DEC-134), `template-renderer` (Pure-Function {{var}}-Substitution), `recursion-guard` (max 3 update_field/(deal_id,60s) per DEC-138), Cron-Endpoint `/api/cron/automation-runner` als Defense-in-Depth-Fallback, Sync-Execution-Path im Dispatcher (fire-and-forget), Trigger-Verdrahtung in 4 zentralen User-Pfaden (`pipeline/actions.ts:moveDealToStage`, `moveDealToPipeline`, `createDeal`, `lib/actions/activity-actions.ts:createActivity`), Stage-Delete-Soft-Disable (DEC-133, dependent Rules werden auto-pausiert mit Toast-Count). **SLC-623..625** noch ausstehend (UI Builder, Campaigns-Foundation, Tracking).
- Summary: V6.2 ist die erste Workflow-Automation in einem Strategaize-System. V1 ist explizit "Internal-Tool"-Scope: keine UI-Page (kommt SLC-623), Server-Actions sind nur via Code-Test reachable. Alle 4 Action-Types verifiziert via Schema-Smoke + Vitest. Anti-Loop-UNIQUE praxis-getestet gegen Coolify-DB. Recursion-Guard verhindert Endlos-Schleifen bei update_field. Stage-Delete pausiert dependent Rules sauber + Toast-Hinweis. PII-Schutz ist Defense-in-Depth aktiv (Whitelist im Server-Action-Validator + im Action-Executor).
- Risks: **Coolify-Cron muss manuell angelegt werden** — sonst Cron-Fallback inaktiv (Sync-Pfad funktioniert weiter). **MIG-029 Phase 2+3** sind als TODO-Marker im SQL-File — kommen mit SLC-624 + SLC-625, nicht mit REL-024-Deploy. **Action-Idempotenz** — `create_task`/`create_activity` sind nicht idempotent (Cron-Re-Run nach App-Crash kann Duplikate erzeugen). User-Workaround: Duplikate manuell loeschen. **Trigger-Source-Coverage**: Cron-Routes (meeting-briefing, call-processing, meeting-summary) sind in V1 NICHT verdrahtet — System-getriebene Activities loesen keine Workflows aus. Bei konkretem Use-Case in V2 ergaenzbar. **Performance-Latenz**: Sync-Dispatch-Pfad theoretisch <100ms (1 SELECT + N INSERTs + fire-and-forget Executor). In Live-Last nicht aktiv gemessen — beobachten in /post-launch.
- Rollback Notes: MIG-029 Phase 1 ist additiv (CREATE TABLE IF NOT EXISTS + Indizes + RLS + GRANTS). Rollback per Coolify-Image-History → vorheriger stable Tag REL-023 (`908eb81479e09df28cd96b85011462140880d208`). Schema bleibt drin (idempotente Re-Apply), Code-Layer faellt auf V5.7-Verhalten zurueck (kein Workflow-Dispatch in pipeline/actions.ts + activity-actions.ts). User-bestehende Daten bleiben unveraendert. Wenn Workflows aktiv sind: vor Rollback alle `automation_rules` per UPDATE auf `status='disabled'` setzen, damit nach Re-Deploy keine "verlorenen" Runs hochkommen.

#### Coolify-Cron-Setup nach Deploy (PFLICHT)

Nach erfolgreichem Coolify-Deploy von V6.2 muss in Coolify ein neuer Cron-Eintrag manuell angelegt werden, damit der Cron-Fallback aktiv wird:

| Feld | Wert |
|------|------|
| **Container** | `app` |
| **Schedule** | `* * * * *` (jede Minute) |
| **Command** | `node -e "fetch('http://localhost:3000/api/cron/automation-runner', {method:'POST', headers:{'x-cron-secret': process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log)"` |

ENV `CRON_SECRET` ist bereits gesetzt (existing aus REL-018). Kein neues Secret noetig.

**Smoke-Test nach Anlage** (von Hetzner-Server-Konsole):
```bash
docker exec -it $(docker ps --format "{{.Names}}" | grep "^app-") node -e \
  "fetch('http://localhost:3000/api/cron/automation-runner', {method:'POST', headers:{'x-cron-secret': process.env.CRON_SECRET}}).then(r=>r.json()).then(console.log)"
```
Erwartete Antwort: `{ success: true, picked: 0, processed: 0, failed: 0 }` (bei leerer Queue).

Wenn `Unauthorized` returnt: CRON_SECRET-Header stimmt nicht — Coolify-ENV pruefen.

**Defense-in-Depth-Hinweis**: Auch ohne Cron funktioniert die Workflow-Engine im Happy-Path. Der Cron picked nur stuck-Runs (>60s pending/running) auf — relevant nur bei App-Crash zwischen Dispatch-Insert und Sync-Execution.

### REL-023 — V5.7 NL+DE-VAT-Saetze + Reverse-Charge + Skonto-Toggle Bugfix
- Date: 2026-05-05
- Scope: V5.7 Final-Release. 2 Slices: **SLC-571** NL+DE-VAT-Saetze + Reverse-Charge fuer EU-B2B-Cross-Border (9 MTs, FEAT-571, BL-417): MIG-028 (5 additive Aenderungen idempotent), VAT-ID Format-Validation-Layer (vat-id.ts, 30 Vitest), Branding-Settings Country-Dropdown DE/NL + vat_id-Feld, Company-Stammdaten vat_id, useReverseChargeEligibility-Hook + countryNameToCode-Mapper (24 Vitest), Editor-Steuersatz-Dropdown country-aware {0,7,9,19,21}, Reverse-Charge-Section + saveProposal Server-Action-Validation + Audit-Insert (`reverse_charge_toggled`-Event, validateReverseCharge mit 4 Reject-Pfaden, 14 Vitest), PDF-Renderer reverse-charge-block.ts + bilingualer Block (8 Vitest inkl. 3 Snapshots), COMPLIANCE.md V5.7-Section, DEC-122..128. **SLC-572** Skonto-Toggle UI-State-Drift Bugfix (4 MTs + 3 Follow-up-Fixes, FEAT-572, BL-419): lastKnownGoodSkontoRef + revertPatchIfSkontoFailed Pure-Function (skonto-revert.ts, 16 Vitest inkl. RPT-277-Repro), 3 Follow-up-Hot-Fixes nach Live-Smoke 2026-05-05 — ISSUE-051 (isOn-Inferenz auf percent OR days, Inputs bleiben gemountet), ISSUE-052 (PaymentTerms-Dropdown UUID-Display via render-callback), ISSUE-053 (Validation-Gate vor Server-Save verhindert Edit-Flicker). **Image-Tag:** `908eb81479e09df28cd96b85011462140880d208`. **Dependencies:** keine neuen NPM-Pakete. **Schema-Migration:** MIG-028 idempotent, additive, bereits live auf Hetzner.
- Summary: V5.7 macht das Cockpit NL-rechtskonform (Strategaize Transition GmbH sitzt in NL). VAT-Saetze in der NL-Logik 21/9/0% (statt deutsche 19/7/0); Reverse-Charge-Toggle fuer EU-B2B-Cross-Border (B2B-Empfaenger in EU != NL bekommen 0% mit Pflicht-Hinweis "BTW verlegd / Reverse Charge — Article 196 VAT Directive 2006/112/EC"); BTW-IDs fuer Strategaize + Empfaenger-Companies; PDF-Renderer-Block bilingual (DE-Hauptsprache + NL-Klammertext) direkt unter Tax-Row + Strategaize-BTW-Footer kontextrichtig. Plus Skonto-Toggle-Bugfix (BL-419/ISSUE-049) mit 3 Follow-up-Fixes nach iterativen Live-Smoke-Runden 2026-05-05. Internal-Test-Mode bleibt aktiv bis Pre-Production-Compliance-Gate (laut User 2026-05-01 "kommt viel spaeter").
- Risks: **DE-Reverse-Charge § 13b UStG** nicht implementiert (NL-First, DE-Mode hat Toggle disabled mit Tooltip-Hinweis) — BL-421 deferred. **VIES-Online-Lookup** fehlt — VAT-IDs nur Format-validiert per DEC-124 (BL-420 deferred, Format-only reicht fuer Internal-Test-Mode). **BL-422 RC-Toggle-UI-Drift** analog ISSUE-049 fuer Skonto — Wiring-Trace-Observation, low/cosmetic, selbstheilend nach Reload, deferred. **ISSUE-050 Audit-Log-UI-Renderer** rendert generic-update-Eintraege als `[object Object]` — pre-existing seit V5.6, NICHT V5.7-eingefuehrt, DB-Daten korrekt + SQL-Workaround verfuegbar. **supabase-studio-Container unhealthy** — pre-existing, admin-only, nicht app-kritisch.
- Rollback Notes: Rein additiv. MIG-028 sind 5 idempotente ALTER-Statements (`ADD COLUMN IF NOT EXISTS` + neue CHECK-Constraints) — kein DROP, kein ALTER von bestehenden Spalten. V5.7-Code ist abwaerts-kompatibel mit V5.6-DB-Schema (alte Spalten bleiben, neue sind nullable mit defensiven Defaults). Rollback per Coolify-Image-History → vorheriger stable Tag REL-022 (`a7b787d`). Kein Schema-Rollback noetig (additive Spalten bleiben unproblematisch in alter Code-Welt). User-bestehende Proposals bleiben unveraendert (V5.7 ist opt-in via Editor-Toggle).

### REL-022 — V5.6 Zahlungsbedingungen + Pre-Call Briefing
- Date: 2026-05-03
- Scope: V5.6 Final-Release. 4 Slices: **SLC-561** Payment-Terms-Foundation (`payment_terms_templates`-Tabelle + Settings-Sidebar-Nav, Default `30 Tage netto`); **SLC-562** Bedingungs-Dropdown + Skonto im Proposal-Editor (`proposals.skonto_percent` + `skonto_days`, beide-oder-keiner CHECK, Skonto-Mutex); **SLC-563** Split-Plan + PDF-Renderer (`proposal_payment_milestones`-Tabelle, Sum-Validation 100% strict, dnd-kit-Reihenfolge, days_after_signature); **SLC-564** Pre-Call-Briefing-Cron + `/settings/briefing` + Push/Email-Delivery + ActivityBriefingCard (`meetings.briefing_generated_at` + Partial-Index, `user_settings.briefing_trigger_minutes` + 2 Toggles, Activity-Persistierung, Sentinel-Strategy max 3 Retries). MIG-027 Schema. DEC-115..121. **NEUE INFRASTRUKTUR-AKTION (SLC-564):** Coolify-Cron `meeting-briefing` muss vor erstem Live-Test angelegt werden (sonst keine automatischen Briefings). Anleitung unten. **Keine neuen Dependencies.** Reuse von FEAT-301 (Deal-Briefing-Prompt+Validator), FEAT-409 (Browser-Push), V5.3 (`send.ts`-SMTP-Pipeline).
- Summary: SLC-561..563 sind bereits live im Cockpit (siehe STATE.md V5.6-Stand 2026-05-02). SLC-564 schliesst V5.6 ab: Vor jedem Meeting mit Deal-Zuordnung wird im konfigurierten Trigger-Fenster (Default 30 Min) ein KI-Briefing generiert und ueber Push (Service-Worker + VAPID) + E-Mail (kompakte HTML mit 5 Sections) zugestellt. Idempotenz via UPDATE-WHERE-NULL Winner-Takes-All. Sentinel-Strategy: max 3 Retries pro Meeting, danach permanent als `briefing_error` markiert. Briefings persistieren als `activities(type='briefing')` mit JSON-stringified Payload und werden in der Deal-Workspace-Timeline ueber neue `<ActivityBriefingCard>` (Expandable: Summary + Top-3 keyFacts/openRisks/suggestedNextSteps + Confidence-Badge) gerendert. Settings-Page `/settings/briefing` mit Trigger-Radio (15/30/45/60) + 2 Toggle-Switches + Push-Subscribe-Hint bei aktivem Push-Toggle ohne Subscription. Internal-Test-Mode bleibt aktiv bis Pre-Production-Compliance-Gate.
- Risks: Bedrock-Latenz bei 5+ parallelen Meetings im Tick: sequentieller Loop, naechster Tick holt Rest auf (Idempotenz). Push-Subscription Expired (HTTP 410): web-push setzt `push_subscription = NULL`, kein Throw, Cron-Lauf unbeeintraechtigt. SMTP-Failure: try/catch, log-only, Activity bleibt persistiert. LLM-JSON-Drift: `validateDealBriefing` prueft Schema, Sentinel greift nach 3 Failures. **MIG-027** ist additive Schema-Erweiterung (5 ALTER TABLE / CREATE TABLE), idempotent via `IF NOT EXISTS`. **Neue Dependency:** keine. **CRON_SECRET** ist seit V5.1 retention-Cron im app-Container gesetzt — kein zusaetzliches Setup. **Briefing ohne Deal:** Cron filtert via Partial-Index (`deal_id IS NOT NULL`), keine Bedrock-Calls fuer interne Termine. **Beide-Channels-off:** Cron skippt komplett (`{ok: true, skipped: 'all-channels-off'}`), kein Bedrock-Call, kein Activity-Insert. **F1 Hydration #418** auf `/proposals` Carryover aus V5.5.1 (UI funktional, kein V5.6-Blocker).
- Rollback Notes: Rein additiv. SLC-564 fuegt nur Cron-Endpoint `/api/cron/meeting-briefing`, Server-Helpers (`deal-context-loader`, `briefing-html`-Template), Settings-Page + Form, ActivityBriefingCard + Timeline-Switch-Case, Type-Definitionen + Konstante (MAX_BRIEFING_RETRIES=3) hinzu. Rollback per Coolify-Redeploy auf V5.6-pre-SLC-564-Commit (vor diesem Patch). Kein Schema-Rollback (MIG-027 ist Teil von SLC-561, bleibt). Coolify-Cron `meeting-briefing` separat deaktivieren ueber Coolify-UI falls noetig. Bestehende V5.6-Daten (Briefing-Activities, Settings-Eintraege, Marker-Werte in `meetings.briefing_generated_at`) bleiben unberuehrt.

#### Coolify-Cron `meeting-briefing` Setup (User-Aktion vor Final-Deploy)

**Wann:** Nach Coolify-Redeploy von V5.6 final (oder fruehestens nach Deploy von SLC-564).

**Voraussetzung:** ENV-Variable `CRON_SECRET` ist im Coolify-App-Container bereits gesetzt (existiert seit V5.1 retention-Cron, kein zusaetzliches Setup).

**Schritt 1 — Cron-Job in Coolify-UI anlegen:**

| Feld | Wert |
|------|------|
| Name | `meeting-briefing` |
| Schedule | `*/5 * * * *` (alle 5 Min) |
| Container | `app` |
| Command | `node -e 'fetch("https://business.strategaizetransition.com/api/cron/meeting-briefing", { method: "POST", headers: { "x-cron-secret": process.env.CRON_SECRET } }).then(r => r.text()).then(console.log)'` |

**Sicherheits-Hinweise:**
- `CRON_SECRET` IMMER ueber `process.env.CRON_SECRET` referenzieren — niemals als Klartext im Command (siehe REL-019 Coolify-Cron-Cleanup).
- Nur EIN Cron-Job mit diesem Namen anlegen — Duplikate erzeugen Doppel-Audit-Eintraege bei Doppellaeufen (Idempotenz schuetzt nur vor Activity-Doubling, nicht vor Audit-Doubling).
- Auth-Header ist `x-cron-secret`, NICHT `Authorization: Bearer` (Pattern aus `verify-cron-secret.ts`).

**Schritt 2 — Smoke-Test direkt nach Anlage (vor erstem 5-Min-Tick):**

```bash
ssh root@91.98.20.191
# Mit valid Secret + beide Toggles default on → entweder processedCount=0 (kein Meeting im Fenster) oder >=1 mit Audit-Eintraegen
curl -sX POST -H "x-cron-secret: $CRON_SECRET" \
  https://business.strategaizetransition.com/api/cron/meeting-briefing
# Erwartet: {"success":true,"processedCount":0,"skippedCount":0,"failedCount":0,"retryCount":0}

# Mit falschem Header → 401
curl -sX POST -H "x-cron-secret: wrong" \
  https://business.strategaizetransition.com/api/cron/meeting-briefing
# Erwartet: {"error":"Unauthorized"} mit HTTP 401

# Mit beiden Toggles off (UPDATE user_settings SET briefing_push_enabled=false, briefing_email_enabled=false) → skipped
curl -sX POST -H "x-cron-secret: $CRON_SECRET" \
  https://business.strategaizetransition.com/api/cron/meeting-briefing
# Erwartet: {"success":true,"skipped":"all-channels-off"}
```

**Schritt 3 — End-to-End-Smoke (im Coolify-UI nach Anlage des Cron):**

1. Test-Meeting in `triggerMinutes`+~3 Min anlegen (z.B. bei Default 30 Min: scheduled_at = now() + 32 Min) mit Deal-Zuordnung.
2. `briefing_push_enabled=true` UND `push_subscription` muss gesetzt sein (Settings-Page `/settings/briefing` → "Browser-Push aktivieren").
3. Innerhalb 5-10 Min sollten erscheinen:
   - Push-Notification im Browser (Service Worker)
   - E-Mail im Empfangs-Postfach (Sender-Domain mit SPF/DKIM, kein Spam-Folder)
   - `activities`-Row mit `type='briefing'` und JSON-Payload
   - `briefing_generated_at` auf dem Meeting gesetzt
   - Audit-Eintrag mit `action='ai_briefing_generated'`
4. Klick auf Push → `/deals/<dealId>` Workspace mit `<ActivityBriefingCard>` in Timeline.
5. Klick auf Email-Button "Deal-Workspace oeffnen" → gleicher Pfad.

**Idempotenz-Garantie:** Mehrfachlaufe innerhalb desselben 5-Min-Ticks erzeugen keine Doppel-Briefings. UPDATE-WHERE-NULL Pattern: erste Query setzt Marker, alle Folgequeries bekommen 0 rows (`processedCount=0, skippedCount=N`). Bei Bedrock-Failure: Marker wird auf NULL zurueckgesetzt, naechster Tick versucht erneut (max 3 Retries, danach permanent `briefing_error`).

**Failure-Verifikation (optional, im Hetzner-Test):**

```sql
-- Nach manueller Bedrock-Disable (z.B. AWS-Credentials kurzzeitig falsch setzen) → mehrfache Cron-Runs:
SELECT id, type, title, created_at FROM activities
WHERE type = 'briefing_error' AND deal_id = '<test-deal-id>'
ORDER BY created_at DESC;
-- Erwartet: 3 Rows mit "(1/3)", "(2/3)", "(3/3)"
SELECT briefing_generated_at FROM meetings WHERE id = '<test-meeting-id>';
-- Erwartet: gesetzt (nicht NULL) — Sentinel hat ihn nach 3. Failure NICHT zurueckgesetzt
```

### REL-021 — V5.5.1 Polish-Patch (Hydration + 3 V5.4-Carryover)
- Date: 2026-05-01
- Scope: 4 kleine Items in 2 Commits. (1) ISSUE-047 Hydration #418 Mitigation via `suppressHydrationWarning` auf `<html>`+`<body>` im Root-Layout (Code-Audit ergab: keine Date-Format-Drift im Render-Pfad, wahrscheinliche Quelle Browser-Extension). (2) SLC-541 M1 ConditionalColorPicker Refactor zu pure derived state (useState/useEffect entfernt). (3) ISSUE-045 Server-side Total-Size-Limit fuer E-Mail-Anhaenge (`/api/emails/attachments` POST listet Storage-State + summiert sizes). (4) SLC-542 L1 Filename-Kollision-Suffix " (n)" bei Duplikat-Upload (`upsert: true` → `upsert: false` mit `generateUniqueName`).
- Summary: 2 Commits — `42495cc` (V5.5.1 Hydration) + `d996307` (V5.4-Carryover-Sammelpatch) + Records-Sync `4415928`. TSC + Vitest 97/97 PASS pre-Deploy. Rein additiv, keine Schema-Aenderungen, keine ENV-Aenderungen, keine neuen Dependencies. Single list()-Call im Upload-Endpoint deckt Total-Size + Kollisions-Check gemeinsam ab. Deployed 2026-05-01 07:50:22 als Coolify-Deployment-ID 173, Image-Tag `4415928`, app-Container healthy, HTTPS-Endpoint HTTP 200. Live-Browser-Verifikation der 3 sichtbaren Items steht aus: (a) `/proposals` Console-Check fuer #418, (b) Composing-Studio Filename-Kollision durch zweimaligen Upload mit gleichem Namen, (c) Total-Size-Limit durch zwei verschiedene 12-MB-Files in derselben Session.
- Risks: Item 1 (Hydration) ist mitigation, kein root-cause-fix — falls #418 weiterhin auftritt, braucht es Live-Console-Inspection. Items 2-4 sind kleine isolierte Aenderungen ohne strukturelles Risiko. Re-Drag-Idempotenz (gleiche Datei zweimal in derselben Session ziehen) erzeugt jetzt Suffix-File statt zu ueberschreiben — minimaler Verhaltens-Drift, vom User wahrscheinlich unbemerkt.
- Rollback Notes: Beide Commits unabhaengig revert-bar. `git revert 42495cc` setzt `<body>` ohne suppressHydrationWarning zurueck. `git revert d996307` setzt ConditionalColorPicker auf useState/useEffect-Pattern und Upload-Route auf `upsert:true` mit `totalSizeSoFar=0` zurueck. Kein Schema-Rollback, kein Daten-Verlust. Bestehende Storage-Files mit Suffix " (n)" bleiben gueltig auch nach Rollback.

### REL-020 — V5.5 Angebot-Erstellung
- Date: 2026-05-01
- Scope: V5.5 Final-Release. Alle 5 Slices implementiert: **SLC-551** Schema-Erweiterung (`proposals.parent_proposal_id/valid_until/payment_terms/...`, neue Tabelle `proposal_items`, `email_attachments.source_type`+`proposal_id`+CHECK-Constraint, neue Buckets `proposal-pdfs`); **SLC-552** Workspace `/proposals/[id]/edit` mit nativem React-State + Custom-Debounce + dnd-kit; **SLC-553** pdfmake-Renderer (DEC-105) mit Server-Proxy `/api/proposals/[id]/pdf` (Mixed-Content-Hotfix `91020b2`) + Branding-Adapter; **SLC-554** Status-Lifecycle (`draft → sent → accepted | rejected | expired`) per Whitelist-gekapselter Server Action, lineare Versionierung mit Item-Snapshot-Kopie (V1 unangetastet, DEC-109), Read-only-Mode fuer Non-Draft-Workspace, Auto-Expire-Cron `0 2 * * *` Berlin (DEC-110); **SLC-555** Composing-Studio-Anbindung — `<ProposalAttachmentPicker>` mit shadcn-Dialog im Compose-Anhang-Bereich, neue Server Action `attachProposalToCompose` (PDF-aus-Bucket-Validierung), `email_attachments`-Junction-Insert mit `source_type='proposal'`+`proposal_id`, idempotenter Auto-Sent-Trigger via `transitionProposalStatus` nach erfolgreichem Send (DEC-108). MIG-026 Schema-Erweiterung. DEC-105..114. **NEUE INFRASTRUKTUR-AKTION (SLC-554):** Coolify-Cron `expire-proposals` muss vor erstem produktivem Sent-Status angelegt werden (Auto-Expire faellt sonst aus). Anleitung unten. **NEUE DEPENDENCY:** `pdfmake` (~700 KB) wurde in SLC-553 dem Build hinzugefuegt — Bundle-Auswirkung bereits in V5.5-Sub-Deploys verifiziert.
- Summary: SLC-551..554 sind bereits live im Cockpit (siehe STATE.md V5.5 Implementation, Hotfix `91020b2` PDF-Server-Proxy, RPT-260 SLC-554 QA-PASS, Cron-Endpoint `/api/cron/expire-proposals` Live + DB-Audit-Smoke). SLC-555 schliesst V5.5 ab: User kann im Composing-Studio neben PC-Direkt-Upload (V5.4-Pfad bleibt regression-frei) jetzt auch ein bestehendes Angebot-PDF aus dem Deal-Kontext anhaengen. Picker zeigt alle Status (DEC-112) mit Status-Badge + Confirm-Modal bei `expired`/`rejected`. Filename folgt SLC-553-Pattern `Angebot-{slug(deal.title)}-V{n}.pdf` (oder `.testmode.pdf` im Internal-Test-Mode, DEC-113). Send-Pipeline (`send.ts`) unterscheidet pro Anhang den Source-Bucket (`email-attachments` vs. `proposal-pdfs`). Internal-Test-Mode aktiv bis Pre-Production-Compliance-Gate vor V5.6.
- Risks: V5.4 PC-Direkt-Upload-Pfad muss bit-identisch bleiben (Junction-Default `source_type='upload'`, `proposal_id=NULL` greift; CHECK-Constraint deckt invalid States ab) — verifiziert ueber Cross-Cut-Smoke (3 Faelle: Proposal-only, Upload-only, Mix). V5.4-Cadence-Engine sendet ohne Anhaenge → Junction-Insert mit Default-Werten bleibt valide. SLC-554 deployt ohne den Coolify-Cron `expire-proposals` ist sicherheitsneutral (manuelle Status-Transitions funktionieren), aber Auto-Expire faellt aus. Auto-Sent-Trigger nach Mail-Send ist idempotent (DEC-108) — bei `transitionProposalStatus`-Error bleibt Mail-Erfolg erhalten, User kann Status manuell setzen. Read-only-Mode ist Server-Side enforced (Item-CRUD-Actions checken `status === 'draft'`), URL-Param `?readonly=1` ist nur UX-Hint. **Storage-Volumen-Wachstum:** Proposal-PDFs liegen dauerhaft im `proposal-pdfs`-Bucket, Loesch-Button im Compose entfernt nur State-Eintrag (Audit-Wahrheit). Cleanup-Cron fuer alte Proposal-PDFs ist V5.6+. **F1 Hydration #418** auf `/proposals` ist Carryover (UI funktional, kein Blocker, Investigation als V5.5.x-Patch oder Pre-V5.6). **ISSUE-042** OpenAI-Key Pre-Pflicht bleibt offen (gilt nicht direkt fuer V5.5, aber fuer V4.1+V5.1-Whisper-Flows). **Pre-Production-Compliance-Gate** vor V5.6: Anwalts-Pruefung `COMPLIANCE.md`, Azure-OpenAI-EU-Whisper-Switch, ISSUE-042-Schliessung — keiner dieser Punkte blockiert V5.5-Deploy in Internal-Test-Mode.
- Rollback Notes: Rein additiv. SLC-555 fuegt nur Server-Action `attachProposalToCompose`, neue Komponente `<ProposalAttachmentPicker>`, AttachmentMeta-Type-Erweiterung (Default `source_type='upload'` = V5.4-Verhalten), und Send-Pipeline-Discriminator hinzu — Rollback per Coolify-Redeploy auf V5.5-pre-SLC-555-Commit. Kein Schema-Rollback (MIG-026 inkl. `email_attachments.source_type`+`proposal_id` ist Teil von SLC-551, bleibt). Coolify-Cron `expire-proposals` separat deaktivieren ueber Coolify-UI falls noetig. Bestehende V5.5-Daten (Proposals, Items, generierte PDFs, Cron-expirte Rows) bleiben unberuehrt.

#### Coolify-Cron `expire-proposals` Setup (User-Aktion vor Final-Deploy)

**Wann:** Nach Coolify-Redeploy von V5.5 final (oder fruehestens nach Deploy von SLC-554).

**Voraussetzung:** ENV-Variable `CRON_SECRET` ist im Coolify-App-Container bereits gesetzt (existiert seit V5.1 retention-Cron, kein zusaetzliches Setup).

**Schritt 1 — Cron-Job in Coolify-UI anlegen:**

| Feld | Wert |
|------|------|
| Name | `expire-proposals` |
| Schedule | `0 2 * * *` (taeglich 02:00 Berlin Time) |
| Container | `app` |
| Command | `node -e 'fetch("https://business.strategaizetransition.com/api/cron/expire-proposals", { method: "POST", headers: { "x-cron-secret": process.env.CRON_SECRET } }).then(r => r.text()).then(console.log)'` |

**Sicherheits-Hinweise:**
- `CRON_SECRET` IMMER ueber `process.env.CRON_SECRET` referenzieren — niemals als Klartext in Command (siehe REL-019 Coolify-Cron-Cleanup).
- Nur EIN Cron-Job mit diesem Namen anlegen — Duplikate erzeugen Doppel-Audit-Eintraege bei Doppellaufen.
- Auth-Header ist `x-cron-secret`, NICHT `Authorization: Bearer` (Pattern aus `verify-cron-secret.ts`).

**Schritt 2 — Smoke-Test direkt nach Anlage (vor erstem 02:00-Lauf):**

```bash
# Manueller cURL-Test gegen die Public-Domain — gleiche Auth wie Cron-Trigger
ssh root@91.98.20.191
curl -sX POST -H "x-cron-secret: $CRON_SECRET" \
  https://business.strategaizetransition.com/api/cron/expire-proposals
# Erwartet: {"success":true,"expiredCount":0,"expiredIds":[]}
# Bei expirten Rows: korrekte Counts in der Response

# Mit falschem Header → 401
curl -sX POST -H "x-cron-secret: wrong" \
  https://business.strategaizetransition.com/api/cron/expire-proposals
# Erwartet: {"error":"Unauthorized"} mit HTTP 401
```

**Schritt 3 — Verifikation des ersten 02:00-Laufs:**

Am Tag nach Anlage zwischen 02:00 und 02:05 Berlin Time im Coolify-Cron-Log nach Eintrag `[Cron/ExpireProposals] expired=N ids=...` schauen. Bei `expired=0` ist das normal (kein expirter Datensatz vorhanden). Audit-Eintraege koennen mit folgender SQL gepueft werden:

```sql
SELECT created_at, action, entity_id, context
FROM audit_log
WHERE entity_type = 'proposal'
  AND context = 'Auto-expire by cron — valid_until passed'
ORDER BY created_at DESC
LIMIT 10;
```

**Idempotenz-Garantie:** Mehrfachlaufe des Crons (z.B. wegen Coolify-Restart) erzeugen keine Doppel-Audit-Eintraege — `expireOverdueProposals()` filtert auf `status='sent' AND valid_until < CURRENT_DATE`, expirte Rows werden beim zweiten Lauf nicht mehr getroffen.

### REL-019 — V5.4 Composing-Studio Polish + E-Mail-Anhaenge
- Date: 2026-04-29
- Scope: 2 Slices (SLC-541 V5.4-Polish + SLC-542 E-Mail-Anhaenge-Upload), 2 Features (FEAT-541 + FEAT-542), 8 DECs (DEC-097..104), MIG-025 (`email_attachments`-Junction-Table + privater Storage-Bucket). SLC-541 schliesst V5.3-Hygiene-Themen ab: Color-Picker AC9-Drift Fix per ConditionalColorPicker (DEC-102), ESLint Hook-Order Cleanup in NewTemplateDialog + InlineEditDialog (resetState-via-onOpenChange-Wrapper-Pattern, eliminiert react-hooks/set-state-in-effect-Errors), COMPLIANCE.md V5.3-Section + V5.4-Section (Anhang-Pipeline beschrieben), Coolify-Cron-Cleanup-User-Anleitung. SLC-542 fuegt Drag&Drop + File-Picker + MIME/Size-Whitelist + Multipart-SMTP via API-Route hinzu (Refactor von Server-Action analog Onboarding-Plattform-Pattern wegen 1 MB Body-Size-Limit + Filename-Encoding-Probleme).
- Summary: Deployment als Coolify-Redeploy auf Commit `c8637c6` (Refactor Anhang-Upload Server-Action → API-Route) durch User durchgefuehrt 2026-04-29. Pre-Deploy User-Live-Smoke gegen Hetzner durchgespielt: AC4+5 Drag&Drop (5.5 + 6.4 MB Word-Files), AC6+7 Pro-File-Limit (21.6 MB PDF korrekt rejected), AC10+11+12 Multipart-Mail PDF+PNG+ZIP an Gmail erfolgreich + 3 Junction-Rows in `email_attachments` + Tracking-Pixel-`open`-Event 38s nach Send. MIG-025 bereits seit 2026-04-28 live auf Hetzner-DB (per ssh-Migration-Pattern). **Keine neuen ENV-Variablen.** **Keine neuen Dependencies.** Coolify-Cron-Cleanup als User-Aktion mit Deploy via SQL durchgefuehrt: 5 Operationen, 17 → 15 Crons, alle 15 verbleibenden auf process.env.CRON_SECRET-Pattern, kein Klartext-Secret mehr, kein kaputter Literal-Placeholder mehr. Final-Check READY (RPT-246, 0 Blocker, 0 High, 0 Medium, 1 Low ISSUE-045 akzeptiert). Go-Live GO (RPT-247). tsc 0, Vitest 35/35, Next-Build green. 6 critical Container healthy.
- Risks: ISSUE-045 (Low) Server-side Total-Size-Limit ist Client-Convenience — Pro-File-Limit (10 MB) ist 3-fach hart enforced (Browser+Upload+Send), Total-Limit (25 MB) nur Browser-side. internal-tool single-user, V5.5+ Operations-Topic. ISSUE-042 (High) OpenAI-API-Key in untrackter Datei bleibt offen — **NICHT V5.4-blockierend** (V5.4-Whisper ist User-Self-Diktat, kein Kunden-Audio). Pre-Pflicht-Marker fuer V4.1 Meeting + V5.1 Call-Recording-Flows. DEC-104 Verwaiste-Storage-Files-Cleanup-Cron deferred — Compose-Tab-Schliessen ohne Send laesst Files im Bucket (V5.5+ Operations). 2 reviewed-and-accepted `console.error` in send-action.ts (Best-Effort Junction-Insert-Logging, kein User-Inhalt). Outlook-Compatibility-Smoke fuer Multipart organisch beim ersten echten Outbound-Send. SLC-541 M1 (ConditionalColorPicker derived-state Refactor) + SLC-542 L1 (Filename-Kollision-Suffix bei upsert) als V5.4.x-Patch-Carryover.
- Rollback Notes: Rein additiv. SLC-541 modifiziert nur UI-Komponenten + Doku — Rollback per Coolify-Redeploy auf V5.3-Stand (Commit `8d8e098` oder neuerer V5.3-Tag), kein Schema-Rollback. SLC-542 fuegt MIG-025 hinzu (additive Junction-Table + privater Bucket), bleibt bei Rollback live (neue Tabelle wird von V5.3-Code ignoriert). API-Route `/api/emails/attachments` verschwindet aus dem Build, AttachmentsSection-Komponente und `attachments-whitelist.ts` werden tot — kein Daten-Verlust. Coolify-Cron-Cleanup ist auch reversibel: Snapshot in `/tmp/coolify-cron-snapshot-20260429-100851.sql` auf Hetzner-Server, restore via `TRUNCATE scheduled_tasks; psql < snapshot.sql`. next.config.ts `bodySizeLimit: "4mb"` Aenderung ist add-only, kein Rollback noetig.

#### Coolify-Cron-Cleanup (DURCHGEFUEHRT 2026-04-29 via SQL)

**Status:** Erfolgreich durchgefuehrt 2026-04-29 vor V5.4-Deploy via direkter SQL auf der Coolify-Postgres-DB (`docker exec coolify-db psql ...`). 5 Operationen in einer Transaktion: 17 → 15 Crons, alle 15 verbleibenden auf `process.env.CRON_SECRET`-Pattern. Snapshot vorab gesichert in `/tmp/coolify-cron-snapshot-20260429-100851.sql`. Verifikations-Output siehe RPT-247.

**Aktionen-Tabelle:**

| # | Operation | Cron-ID | Aktion |
|---|-----------|---------|--------|
| 1 | DELETE | 18 | `Classify` (Container leer, Duplikat von ID 3) entfernt |
| 2 | DELETE | 13 | `embedding-sync` 15min mit `CRON_SECRET_VALUE`-Literal entfernt (war 401-Loop seit Anlage) |
| 3 | UPDATE | 14 | `embedding-sync` von 5min Schedule auf `*/15 * * * *` umgestellt (5x weniger Bedrock-Calls) |
| 4 | UPDATE | 1 | `imap-sync` Klartext-Secret durch `process.env.CRON_SECRET` ersetzt |
| 5 | UPDATE | 2 | `retention` Klartext-Secret durch `process.env.CRON_SECRET` ersetzt |

**Korrekturen zur urspruenglichen Spec (in SLC-541 dokumentiert):**
- (b) Embedding-Konsolidierung umgekehrt — der KAPUTTE 15min-Cron geloescht, der 5min funktionale auf 15min umgestellt (statt umgekehrt).
- (c) Retention NICHT geloescht — beide Endpoints sind aktiv mit unterschiedlicher Funktion (`/api/cron/retention` IMAP-Mail-Retention, `/api/cron/recording-retention` Audio-Files). retention bleibt, wurde nur in (e) auf process.env umgestellt.
- (e) Nur 2 Klartext-Crons (nicht 3 wie geplant): `imap-sync` + `retention`.

**Rollback (falls noetig):** `ssh root@91.98.20.191 "docker exec -i coolify-db psql -U coolify -d coolify -c 'TRUNCATE scheduled_tasks RESTART IDENTITY CASCADE;' && cat /tmp/coolify-cron-snapshot-20260429-100851.sql | docker exec -i coolify-db psql -U coolify -d coolify"`.

**Verifikations-Schritt nach jeder Aenderung:** Cron-Logs im Coolify-UI 5–15min nach Aenderung pruefen — der erwartet aktive Cron sollte einen Erfolgs-Output haben, der geloeschte Cron erscheint nicht mehr in der Trigger-Liste.

### REL-018 — V5.3 E-Mail Composing Studio
- Date: 2026-04-28
- Scope: 5 Slices (SLC-531..535), 4 Features (FEAT-531..534), 8 DECs (DEC-088..096), MIG-023 + MIG-024. Branding-Settings + zentrale Mail-Layout-Engine (organization_branding-Tabelle + render.ts + /api/branding/logo Next.js-Proxy), Email-Templates Schema-Erweiterung (is_system + category + language + 8 Systemvorlagen-Seed) + KI-Vorlagen-Generator (Bedrock Server Action), 3-Panel-Composing-Studio (/emails/compose mit Templates-Panel + Erfassen + Live-Preview, KI-Vorausfuellung von An/Betreff aus Deal-Kontext), Live-Preview mit 250ms-Debounce + iframe-Render + Senden-Integration via sendComposedEmail Server Action + Auto-Follow-up-Task + 4 Einstiegspunkte (Deal-Workspace + Mein Tag + Focus + KI-Workspace) auf /emails/compose umgestellt, Inline-Edit-Diktat (Voice + Diff-Modal mit diff@9 diffWords + harte System-Prompt-Constraints gegen Halluzination, Identitaets-Check, maxTokens 6000). Style-Guide-V2-Restyling als BL-403 (Composing-Studio rounded-2xl/border-2/shadow-lg/gradient-Buttons, premium Spacing/Grid).
- Summary: Deployment als Coolify Redeploy auf Commit 8d8e098 (V5.3-Final-Check). Gesamt-QA PASS (RPT-236, 5/5 Slices, alle 12 ACs SLC-535 + Cross-Slice-Wiring End-to-End verifiziert). Final-Check Conditionally Ready (RPT-237, 0 Blocker, 0 High in V5.3). 6 Slice-/qa-Reports vollstaendig (RPT-220 SLC-531 + Logo-Hotfix RPT-225, RPT-227 SLC-532, RPT-228+229 SLC-533, RPT-231 SLC-534, RPT-234+235 SLC-535). MIG-023 + MIG-024 bereits seit 2026-04-27 live auf Hetzner-DB (per ssh-Migration-Pattern). Keine neuen ENV-Variablen — alle benoetigten Vars (AWS_REGION, LLM_MODEL, AWS_ACCESS_*, SMTP_*, OPENAI_API_KEY, NEXT_PUBLIC_APP_URL, TRACKING_BASE_URL) seit V5.0/V5.1/V5.2 in Coolify gesetzt. Keine neuen Cron-Jobs. Neue Dependencies: diff@9.0.0 (BSD-3) + @types/diff@7.0.2 (MIT). 3 Smoke-Test-Faelle SLC-535 (klar/mehrdeutig/problematisch) auf Live-Hetzner PASS — KI hielt System-Prompt-Constraint gegen Halluzination ein, blieb generisch + erfand keine Fakten. tsc 0, Vitest 35/35, Next-Build 60/60.
- Risks: ISSUE-042 (OpenAI-API-Key untracked file) bleibt open — **NICHT V5.3-blockierend** (V5.3-Whisper ist User-Self-Diktat im Composing-Studio, kein Kunden-Audio-Flow). Pre-Pflicht-Marker bleibt fuer V4.1 (Meeting-Recording) + V5.1 (Call-Recording). ISSUE-043 (Color-Picker AC9-Drift in Branding-Form) open — V5.4-Polish-Carryover, kein Datenkorruptions-Risiko. ESLint 10 Strict-Mode-Hinweise (React-19-Hook-Order in new-template-dialog + inline-edit-dialog) Non-Runtime, Build gruen, V5.4-Polish. COMPLIANCE.md V5.3-Update offen (V5.3 fuehrt KEINE neue Datenkategorie ein, Update kann in V5.4-Polish nachgezogen werden). User-E2E-Workflow-Smoke per User-Approval auf Build-Phase-Ende mit Testkunden verschoben (feedback_e2e_smoke_at_buildup_end.md). Outlook-Compatibility-Smoke offen (organisch beim ersten echten Outbound-Mail-Versand). Branding-Daten "Strategaize Tnasition GmbH" Tippfehler (User-Aktion ohne Code).
- Rollback Notes: Rein additiv. Coolify-Redeploy auf Commit 700b17d (V5.2-Stand) oder neueren V5.2-Tag — ~2 Minuten, kein Schema-Rollback noetig. MIG-023 (organization_branding + email_templates is_system/category/language/layout-Spalten) bleibt live (additive Spalten werden von V5.2-Code ignoriert). MIG-024 (Storage-Public-Read fuer Logo) bleibt live. Neue Dependencies (diff, @types/diff) deinstallieren bei lang-laufendem Rollback per `npm uninstall diff @types/diff`. /emails/compose-Route verschwindet aus dem Build automatisch, Einstiegspunkte fallen auf vorherigen EmailSheet zurueck (mein-tag-client + ki-workspace + focus-client + deal-actions in V5.2-Code). 4 V5.3-Server-Actions (template-generate-action + send-action + inline-edit-action + branding/actions) verschwinden. Kein Datenverlust, keine bestehende Funktionalitaet bedroht.

### REL-001 — V1 Legacy (Marketing+CRM)
- Date: 2026-03-31
- Scope: CRM-Basis (Kontakte, Firmen, Pipeline), Marketing-Skills. Ersetzt durch V2.
- Summary: Erste Deployment auf Hetzner. Login + Dashboard funktional. Pipeline mit Seed-Daten.
- Risks: Pipeline hatte noch Fehler mit Seed-Daten. Temporäre Signup-Route.
- Rollback Notes: Docker Image Rollback via Coolify.

### REL-002 — V2 Revenue & Relationship System
- Date: 2026-04-03
- Scope: 13 Slices, 15 V2-Features, 11 Module. Komplette Neuausrichtung als Revenue & Relationship System.
- Summary: Vollständiges BD-System mit Kontakten (erw.), Firmen (erw.), Multiplikatoren, 2 Pipelines (Kanban), strukturierte Gespräche, Aufgaben, E-Mail (SMTP), Angebote, Fit-Gates, Signale, Referrals, Handoffs, Dashboard (8 KPIs). UI-Polish nach Blueprint-Standard. Dark Sidebar mit Logo, Premium-Tabellen, Pipedrive-style Kanban.
- Risks: MIG-002 pending (overall_score INT→NUMERIC, kosmetisch). SMTP nicht konfiguriert (Drafts-Fallback). SSH-Zugang zum Server eingeschränkt.
- Rollback Notes: Docker Image Rollback via Coolify. V1 Image als Fallback verfügbar.

### REL-003 — V2.1 Pipeline-Hardening + Daily Ops
- Date: 2026-04-07
- Scope: 8 Slices (SLC-201–208), 14 Backlog-Items. Pipeline-Hardening, "Mein Tag" Tagesplanung, Voice-Input, Insight-Export, Lead-Pipeline.
- Summary: Deal-Status-Workflow mit Auto-Status bei Stage-Drag. Deal-Detail-Popup (4 Tabs). Deal-Rotting (>7d gelb, >14d rot). Required Fields bei Stage-Wechsel. Pipeline-Filter (Status/Typ) + gewichteter Forecast. "Mein Tag" mit Erledigt-Buttons, Deal-Popup, Kalender-Platzhalter. Voice-Input via OpenAI Whisper API. Insight-Export an System 4. Lead-Management-Pipeline (7 Stages) mit Pipeline-Verschiebung. E-Mails in Aktivitäten-Timeline. Referral-Source auf Deals. Dashboard Overdue-Banner + Forecast-KPI.
- Risks: Insight JSON-Export ephemeral (Container-Restart = Datenverlust). UI-Polish noch ausstehend. Keine automatisierten Tests.
- Rollback Notes: Docker Image Rollback via Coolify. DB-Rollback: MIG-003 (DROP closed_at, ADD lost_reason), MIG-004 (DELETE Lead-Pipeline + Stages). V2 Image als Fallback.

### REL-004 — V2.2 UI-Redesign + KI-Cockpit UI-Shells
- Date: 2026-04-09
- Scope: Kompletter UI-Umbau nach Style Guide V2. Dashboard KI-Analyse-Cockpit (UI-Shell). Mein Tag KI-Assistent (UI-Shell). Search-Bar volle Breite. KI/Voice-Placeholder-Buttons.
- Summary: Letztes rein UI-zentriertes Release. Offene Items (BL-212 Pipeline Style Guide, BL-213 Standort-Filter, BL-214 fehlende Seiten, BL-215 Konsolidierung) in V3-Backlog uebernommen — werden durch V3 Workspace-Konzept und Navigation-Umbau abgedeckt. Strategische Neuausrichtung beginnt mit V3.
- Risks: Keine neuen technischen Risiken. KI-Shells sind Platzhalter ohne Backend.
- Rollback Notes: Docker Image Rollback via Coolify. V2.1 Image als Fallback.

### REL-005 — V3 Operative Kontextlogik
- Date: 2026-04-10
- Scope: 10 Slices (SLC-301..310), 9 Features (FEAT-301..309). Deal-Workspace, Mein Tag V2, Firmen-/Kontakt-Workspace, Bedrock LLM-Integration, Navigation-Umbau (5-Schichten), Governance-Basis (Rollen, RLS, Audit), Meeting/Kalender-Management.
- Summary: Strategische Neuausrichtung abgeschlossen. Workspace-zentriertes Arbeiten mit KI-Unterstuetzung (Bedrock Claude Sonnet). MIG-005 Schema-Migration (Meetings, Calendar Events, Audit-Log, Navigation). Gesamt-QA PASS (RPT-046). Mehrere Hotfixes nach Live-Test.
- Risks: Bedrock-Kosten bei Auto-Load (behoben in V3.1 durch on-click Pattern). SMTP nicht konfiguriert. Keine automatisierten Tests.
- Rollback Notes: Docker Image Rollback via Coolify. V2.2 Image als Fallback. MIG-005 Rollback: DROP meetings, calendar_events, audit_log Tabellen.

### REL-006 — V3.1 UX-Schliff + KI-Kontext
- Date: 2026-04-11
- Scope: 9 Slices (SLC-311..319). Meeting/Kalender UX, Schnellaktionen-Rebuild, KI on-click Pattern, Pipeline KI-Suche + Voice, KI-E-Mail-Composing, Kontext-Intelligenz, Auto-Wiedervorlagen, Tageseinschaetzung erweitert, Templates + Duplikate + Attribution, Activity-Queue.
- Summary: UX-Schliff und KI-Kontext-Integration. Alle Formulare KI-vorbefuellt aus Kontext. Voice-Input in allen Textfeldern. KI-Kostenkontrolle durch on-click statt auto-load. Automatische Wiedervorlagen nach Aktionen.
- Risks: Keine neuen Schema-Migrationen. Bedrock-Kosten kontrolliert durch on-click Pattern.
- Rollback Notes: Docker Image Rollback via Coolify. V3 Image als Fallback.

### REL-007 — V3.2 UI-Polish + Pipeline-Management + PLZ-Karte
- Date: 2026-04-11
- Scope: 6 von 6 Slices (SLC-321..326). Quick Actions Modal-Umbau, Pipeline UI-Overhaul + Selector, Logout-Button, Pipeline-Verwaltung in Settings, Autocomplete/Typeahead Suche, PLZ-Kartensuche mit Heatmap (DE+NL).
- Summary: UI-Quality-Release + Geo-Feature. Pipeline komplett ueberarbeitet. Settings erweitert um Pipeline-CRUD. Wiederverwendbare SearchAutocomplete. Interaktive Leaflet-Karte auf Firmen/Kontakte/Multiplikatoren mit PLZ+Stadtsuche, Umkreis-Filter, Heatmap. 12.384 PLZ (8.298 DE + 4.086 NL). Next.js 16.2.3 Security Patch. Gesamt-QA PASS, Final-Check PASS.
- Risks: Keine Schema-Migrationen. Neue Dependencies: leaflet, react-leaflet, leaflet.heat.
- Rollback Notes: Docker Image Rollback via Coolify. V3.1 Image als Fallback.

### REL-008 — V3.3 UI-Abrundung + Visualisierung
- Date: 2026-04-11
- Scope: 6 von 6 Slices (SLC-331..336). KI-Suchfeld + Voice im KI-Workspace, PLZ/Stadt-Autocomplete, Pipeline Liste-Ansicht Toggle, Unified Timeline, Funnel-Report, Win/Loss-Analyse Dashboard.
- Summary: Reine Frontend-Erweiterungen ohne Schema-Aenderungen. KI-Suchfeld mit Voice-Input direkt im KI-Workspace Header (Bedrock mein-tag-query). PLZ-Autocomplete bei Firma anlegen/bearbeiten. Pipeline hat jetzt 4 View-Modes (Kanban, Liste, Funnel, Win/Loss). Unified Timeline ersetzt Activity-Timeline auf Kontakt- und Firmen-Workspace (5 Datenquellen). Funnel-Report zeigt Conversion-Rates pro Stage. Win/Loss-Analyse mit Verlustgruende-Ranking und 6-Monats-Trend. Gesamt-QA PASS (RPT-071), Final-Check PASS (RPT-072). User Live-Test bestanden.
- Risks: Keine Schema-Migrationen. Keine neuen Dependencies. Responsive nicht explizit getestet (Desktop-only internal-tool).
- Rollback Notes: Docker Image Rollback via Coolify. V3.2 Image als Fallback.

### REL-017 — V5.2 Compliance-Sprint
- Date: 2026-04-26
- Scope: 5 Slices (SLC-521..525), 5 Features (FEAT-521..525), 7 DECs (DEC-081..087), MIG-022. Recording-Retention 7d Hardening (Default 30→7, ENV-konfigurierbar), Azure-Whisper-Adapter Code-Ready (TRANSCRIPTION_PROVIDER=openai bleibt Default), Compliance-Templates Vertical Slice (compliance_templates-Tabelle, /settings/compliance-Page, Variable-Engine, 3 editierbare Templates: meeting_invitation/email_footer/calcom_booking), MeetingTimelineItem UI-Parity zu CallTimelineItem (Calendar-Icon, Purple-Theme, Decisions/Action Items/Next Step/Key Topics/Transkript), DSGVO-Compliance-Doku docs/COMPLIANCE.md mit 8 Pflicht-Sektionen + Anwalts-Disclaimer.
- Summary: Deployment als Coolify Redeploy auf Commit 1ca619e (V5.2-Final-Check). Gesamt-QA PASS (RPT-216, 5/5 Slices, 49/49 AC). Final-Check Conditionally Ready (RPT-217, 0 Blocker, 1 High für ISSUE-042). MIG-022 idempotent angewendet (Tabelle existierte bereits seit SLC-523-Backend, 3 Default-Rows verifiziert). Smoke-Test in Production am 2026-04-26 PASS: A (Settings-Compliance + MeetingTimelineItem + Side-by-Side Parity) ✓, B (V5.1-Regression Pipeline/Deals/Mein Tag/Performance/Login) ✓, C (Recording-Retention-Cron mit retention_days=7 verifiziert via curl). Vitest 16/16 (Azure-Whisper 8 + Compliance-Templates-Engine 8). Vitest neu eingefuehrt als Test-Framework in V5.2 (Deviation Rule 4 Option A in SLC-522). ENV-Befund waehrend Smoke-Test: RECORDING_RETENTION_DAYS war in Coolify auf 30 gesetzt — User hat auf 7 korrigiert + Redeploy.
- Risks: ISSUE-042 (OpenAI-API-Key in untrackter Datei am Repo-Root, NIE committed) bleibt open — Pre-Pflicht vor erstem produktivem Whisper-Call: Key bei OpenAI rotieren + neuen Key in Coolify ENV setzen + lokale Datei beseitigen. Internal-Test-Mode bleibt aktiv (kein produktiver Recording-Einsatz mit echten Kundendaten bis Anwalts-Pruefung der COMPLIANCE.md + Compliance-Templates + Pre-Go-Live-Switch auf Azure-EU-Whisper). 5 NPM-Audit-Vulnerabilities (1 high xmldom, 4 moderate fast-xml-parser/postcss) in transitiven Production-Deps — nicht durch User-Input ausnutzbar in Internal-Tool, akzeptierter Tech-Debt.
- Rollback Notes: Coolify-Redeploy auf Commit 700b17d (V5.1-Stand) — ~2 Minuten. MIG-022 (compliance_templates) bleibt live, kein Schema-Rollback noetig (Tabelle wuerde bei Rollback nur ungenutzt sein, kein Konflikt). RECORDING_RETENTION_DAYS in Coolify zurueck auf 30 setzen + Redeploy fuer V5.1-Verhalten. /settings/compliance-Route verschwindet aus dem Build automatisch.

### REL-016 — V5.1 Asterisk Telefonie + SMAO Voice-Agent-Vorbereitung
- Date: 2026-04-24
- Scope: 5 Slices (SLC-511..515), 4 Features (FEAT-511..514), 12 DECs (DEC-070..081), MIG-020 + MIG-021. Eigene Asterisk-PBX (Docker, Traefik-WSS auf sip.strategaizetransition.com, Echo-Test 600 + Internal 1001 + Outbound-Patterns), WebRTC Click-to-Call aus Deal-Workspace (SIP.js-Hook + CallWidget), Call-Recording-Pipeline (MixMonitor → Supabase Storage → Whisper → Bedrock-Summary → Deal-Activity, E2E verifiziert RPT-197), SMAO Voice-Agent-Adapter vorbereitet (Interface + Webhook + Klassifikations-Dispatcher, SMAO_ENABLED=false default).
- Summary: Deployment als Coolify Redeploy auf Commit 700b17d (Delta: SLC-515 + Enum-Dedupe QA-Fix). Gesamt-QA PASS (RPT-200, 5/5 Slices). Final-Check Conditionally Ready (RPT-201, 0 Blocker, 0 High). Go-Live Conditional Go (RPT-202). Release-Bedingung: **Internal-Test-Mode bis V5.2 Compliance-Sprint (DEC-081)** — produktive Call-Aufnahme mit externen Teilnehmern erst nach Call-Consent-Flow. MIG-020 (calls-Tabelle + Storage-Bucket) + MIG-021 (Storage-Grants + Role-Delegation) bereits seit SLC-514-Deploy 2026-04-24 live. Keine neuen Crons (Webhook ist request-driven). Neue Dependency: sip.js@0.21.2 (MIT). ISSUE-039 (Volume-Permissions) und ISSUE-040 (Storage-Grants) waehrend Pipeline-Test entdeckt und gefixt. ISSUE-041 latent dokumentiert (Cron-Interferenz bei SMAO_ENABLED=true, Pre-SMAO-Go-Live-Fix).
- Risks: Compliance-Gap fuer Call-Recording (Mitigation: Internal-Test-Mode). codec_opus.so Interim (DEC-078, ulaw-only ausreichend fuer Telefonie). Kein echter SIP-Trunk-Provider konfiguriert (V5.1-Scope). Kein Health-Check fuer Asterisk-Container (Coolify zeigt nur "running"). ASTERISK_WEBRTC_PASSWORD muss in Coolify auf starken Wert gesetzt sein (nicht Default "changeme"). SMAO_ENABLED=false und SMAO_WEBHOOK_SECRET ungesetzt belassen.
- Rollback Notes: Coolify-Redeploy auf Commit cc3222b (SLC-514-Stand) — ~2 Minuten, kein Schema-Rollback noetig (MIG-020+021 bleiben live, sind auch fuer Meeting-Pipeline kritisch via MIG-021). SLC-515-Artefakte verschwinden: Webhook-Route, voice-agent-Adapter, Enum-Dedupe. Kein Datenverlust, keine Konsequenz fuer Bestand.

### REL-015 — V5 Automatisierung + Vertriebsintelligenz
- Date: 2026-04-22
- Scope: 7 Slices (SLC-501..507), 4 Features (FEAT-501,504,505,506), MIG-019. Cadences/Sequences (Template-Builder, Enrollment, Cron-Execution, Abort-Check), E-Mail Auto-Zuordnung (3-Stufen: Exact/Domain/KI-Match), E-Mail Open/Click-Tracking (Pixel + Link-Wrapping + TrackingBadge + TrackingDetail + Timeline-Indikatoren), Intelligence-Platform-Export-API (5 Endpoints, API-Key-Auth, Rate-Limiting, Pagination), AssignmentBadge auf Inbox, Sidebar-Refactor (Arbeitsbereiche collapsible, Cadence→Automatisierung).
- Summary: Deployment als Coolify Redeploy. Gesamt-QA PASS (RPT-190, 7/7 Slices, 53 ACs). Final-Check READY (RPT-191, 0 Blocker, 1 Medium). User-Browser-Smoke-Test PASS. 5 neue DB-Tabellen (cadences, cadence_steps, cadence_enrollments, cadence_executions, email_tracking_events). 2 Tabellen erweitert (emails +tracking_id, email_messages +assignment_source). 2 neue Cron-Jobs (cadence-execute 5min, classify 10min). 2 Bugs in QA gefunden und gefixt (signals Tabelle, insights Spalte). Rein additiv, kein Einfluss auf bestehende Features.
- Risks: EXPORT_API_KEY nicht in Coolify ENV gesetzt (API nicht nutzbar bis Key gesetzt). Rate-Limiting in-memory (Container-Restart setzt zurueck). Pre-V5-Mails haben kein assignment_source (Badge korrekt ausgeblendet).
- Rollback Notes: Rein additiv. Docker Image Rollback via Coolify auf V6.1 Image. Schema-Rollback: DROP TABLE cadence_executions, cadence_enrollments, cadence_steps, cadences, email_tracking_events CASCADE; ALTER TABLE emails DROP COLUMN tracking_id, DROP COLUMN tracking_enabled; ALTER TABLE email_messages DROP COLUMN assignment_source, DROP COLUMN ai_match_confidence; Crons cadence-execute + classify in Coolify deaktivieren.

### PRE-V4.1-INFRA — V4.1 Pre-Flight Infrastruktur (Jitsi-Vorbereitung)
- Date: 2026-04-16
- Scope: Infrastruktur-Vorarbeit fuer SLC-412 Jitsi+Jibri Deployment. Hetzner-Cloud-Firewall-Regel fuer Port 10000/udp eingehend geoeffnet (via Hetzner Cloud Console). Coolify-Subdomain `meet.strategaizetransition.com` provisioniert (DNS-A-Record auf 91.98.20.191, Traefik-Ready). VAPID-Keys fuer Browser-Push erzeugt (SLC-418-Vorbereitung). Supabase-Storage-Bucket `meeting-recordings` angelegt (SLC-415-Vorbereitung). Kein Code-Deploy, keine Schema-Migration — reine Preparation.
- Summary: Pre-Flight-Gate fuer V4.1 Meeting-Slices. Server-RAM idle 4.4 GB frei (Zielarchitektur: 1 paralleles Meeting+Recording ~6.5 GB, passt in 8 GB CPX32 mit Upgrade-Pfad CPX42 dokumentiert DEC-040). Alle Infrastruktur-Blocker fuer SLC-412 beseitigt.
- Risks: Hetzner-Cloud-Firewall-UI-Regel erfordert manuelle Re-Verifizierung vor SLC-412-Smoke-Test (nicht via SSH pruefbar, nur Hetzner Cloud Console). Bei NAT-strikten Kunden-Netzwerken kann UDP/10000 blockiert sein — dokumentiert als Risk in ARCHITECTURE V4.1 (TURN-Server deferred auf BL-206-Nachbar).
- Rollback Notes: Keine Artefakte produziert. Rollback = Firewall-Regel entfernen, Coolify-Subdomain abkoppeln, Supabase-Bucket loeschen. Kein Effekt auf V4 Produktion.

### REL-014 — V6.1 Performance Premium UI
- Date: 2026-04-21
- Scope: 3 Slices (SLC-611..613), 1 Feature (FEAT-611), 3 DECs (DEC-061..063). Premium-Styling auf allen Performance-Karten (Gradient-Akzentlinien, Brand-Icons, Shadow-Upgrade), ForecastCard als 4. Kachel im Grid, Label-Korrektur "Abschlussquote" statt "Win-Rate", Wochen-Check mit Mo-Fr Tagesaufloesung und Heute/Woche Toggle.
- Summary: Reine Frontend-UI-Erweiterung. Gesamt-QA PASS (RPT-176, 3/3 Slices, 1/1 Feature). Final-Check READY (RPT-177, 0 Blocker, 0 High, 7/7 Dimensionen). User-Browser-Smoke-Test PASS (4 Kacheln, Gradient-Linien, Toggle, Wochen-Raster). Keine Schema-Migrationen, keine neuen APIs, keine neuen Dependencies, keine neuen Cron-Jobs.
- Risks: Keine V6.1-spezifischen Risiken. Responsive nicht explizit getestet (Desktop-only internal-tool).
- Rollback Notes: Rein additiv. Docker Image Rollback via Coolify auf V6 Image. Keine Schema-Aenderungen.

### REL-013 — V6 Zielsetzung + Performance-Tracking
- Date: 2026-04-20
- Scope: 10 Slices (SLC-601..610), 4 Features (FEAT-601..604), 2 DECs (DEC-055..056), MIG-017 + MIG-018. Produkt-Stammdaten (CRUD + Deal-Zuordnung), Ziel-Objekt-Modell (Umsatz/Deal-Count/Abschlussquote, Jahres-→Monats-/Quartals-Ableitung, CSV-Import), Performance-Cockpit (/performance mit Goal-Cards, Prognose-Engine, KI-Empfehlung via Bedrock, Tages-Check mit Activity-KPIs, Wochen-Vergleich, Trend-Vergleich, Produkt-Breakdown), KPI-Snapshots (taeglicher Cron, 8+ KPI-Typen, Trend-Engine).
- Summary: Deployment als Coolify Redeploy. Gesamt-QA PASS (RPT-171, 10/10 Slices, 4/4 Features, 11 Backlog-Items). Final-Check READY (RPT-172, 0 Blocker, 0 High). User-Browser-Smoke-Test PASS. 2 neue DB-Tabellen-Gruppen (MIG-017: products, deal_products, goals, kpi_snapshots; MIG-018: activity_kpi_targets). 1 neuer Cron-Job (kpi-snapshot, taeglich 02:00). Rein additiv, kein Einfluss auf bestehende Features. todayRange()-Bug in QA gefunden und gefixt (IMP-096).
- Risks: KPI-Snapshot-Cron muss in Coolify konfiguriert werden. userId nicht in KPI-Queries (Single-User OK). Win-Rate-Ableitung semantisch vereinfacht (V1-akzeptabel). Keine automatisierten Tests.
- Rollback Notes: Rein additiv. Docker Image Rollback via Coolify auf V4.3 Image. Schema-Rollback: DROP TABLE activity_kpi_targets, kpi_snapshots, goals, deal_products, products CASCADE; Cron kpi-snapshot in Coolify deaktivieren.

### REL-012 — V4.3 Insight Governance
- Date: 2026-04-19
- Scope: 6 Slices (SLC-431..436), 2 Features (FEAT-402, FEAT-412), 6 DECs (DEC-049..054), MIG-016. Insight-Review-Queue fuer schreibende KI-Aenderungen (Queue-Erweiterung, Signal-Extraktion-Modul, Cron-Hooks, Applier + Approve-Flow, Unified Queue UI, KI-Badge + Manual Trigger). Automatische Signal-Extraktion aus Meeting-Summaries und E-Mails. Manueller Trigger im Deal-Workspace. PropertyChangeCards mit Confidence-Badge, Batch-Approve. KI-Badge auf geaenderten Deal-Properties (30-Tage-Fenster).
- Summary: Deployment als Coolify Redeploy. Gesamt-QA PASS (RPT-154, 41/42 ACs, 5 Medium, 0 Blocker). Final-Check READY (RPT-155, 7/7 Dimensionen PASS). Browser-Smoke-Test bestanden (Mein Tag, Deal-Workspace, Signale-Button). 1 neuer Cron-Job (signal-extract */5). Schema rein additiv (nullable Spalten).
- Risks: Tag/Priority-Apply nicht moeglich (Spalten fehlen, V5). Activity-Limit 20 fuer Badge (1-User-Nutzung unrealistisch). Pipeline-Stages nicht im LLM-Prompt (Human-Review). Bedrock-Kosten: max 6 Calls/5min (weit unter Limits).
- Rollback Notes: Rein additiv. Docker Image Rollback via Coolify auf V4.2 Image. Schema-Rollback: ALTER ai_action_queue DROP COLUMN target_entity_type, target_entity_id, proposed_changes, confidence; ALTER meetings DROP COLUMN signal_status; ALTER email_messages DROP COLUMN signal_status; Cron signal-extract in Coolify deaktivieren.

### REL-011 — V4.2 Wissensbasis Cross-Source
- Date: 2026-04-18
- Scope: 6 Slices (SLC-421..426), 1 Feature (FEAT-401), 8 V4.2-Backlog-Items (BL-350..357). MIG-014 pgvector Extension + knowledge_chunks Tabelle (vector(1024), HNSW-Index). MIG-015 search_knowledge_chunks RPC-Funktion. RAG-Pipeline (pgvector + Bedrock Titan Embeddings V2 eu-central-1). 4 Datenquellen: Meeting-Transkripte, E-Mails, Deal-Activities, Dokumente. Chunking-Service (quelltypspezifisch, Sentence-Boundary), Embedding-Adapter-Pattern (DEC-047), Backfill + Embedding-Sync-Cron, RAG Query API mit Scope-Filter + Confidence-Level, Deal Knowledge Query UI (Wissen-Tab mit Text + Voice), Auto-Embedding Trigger (fire-and-forget bei neuen Daten).
- Summary: Deployment als Coolify Redeploy. Gesamt-QA PASS (RPT-141, 0 Blocker, 0 High). Final-Check PASS (RPT-142, 1 Fix applied: serverExternalPackages fuer pdf-parse). Go-Live GO (RPT-143). 1 neuer Cron-Job (embedding-sync */5). Backfill: 7 Chunks (5 Activities + 2 Emails) aus Bestandsdaten. Browser-Smoke-Test PASS inkl. Voice-Input (Whisper Transkription → RAG Query → Antwort mit Quellen).
- Risks: Deutsche Embedding-Qualitaet Titan V2 erst mit mehr Live-Daten validierbar (Fallback: Cohere per DEC-048). Single-Tenant RLS Pattern (USING true). In-Memory Rate Limiter. Kernel-Upgrade snd-aloop (ISSUE-037, nicht V4.2-spezifisch).
- Rollback Notes: Rein additiv. Docker Image Rollback via Coolify auf V4.1 Image (Wissen-Tab verschwindet, alle anderen Features bleiben). Schema-Rollback: DROP FUNCTION search_knowledge_chunks; DROP TABLE knowledge_chunks; DROP EXTENSION vector;

### REL-010 — V4.1 Meeting Intelligence Basis
- Date: 2026-04-18
- Scope: 9 Slices (SLC-411..419), 3 Features (FEAT-404/409/411), 10 V4.1-Backlog-Items. MIG-011 Schema-Migration (contacts +7 Felder Consent/Opt-out, meetings +11 Felder Recording/Transcript/Summary/Agenda, activities +1 ai_generated, user_settings Tabelle neu, audit_log.actor_id nullable). Jitsi + Jibri Self-Hosted auf CPX32 (shared Infrastruktur), Whisper-Adapter-Pattern (OpenAI mit Azure/Self-hosted tauschbar), Call Intelligence Pipeline (Recording-Upload → Transkription → Summary), DSGVO-Einwilligungsflow (Public-Consent-Pages, IP-Hash, Audit), Meeting-Erinnerungen (extern .ics + intern SMTP/Push), Browser-Push + Service Worker, KI-Agenda (on-click + auto via Bedrock).
- Summary: Deployment als einzelner Coolify Redeploy. Gesamt-QA PASS (RPT-128, 5 Medium, 0 Blocker). Final-Check READY (RPT-129, 0 High). npm audit fix inline (0 vulnerabilities). 4 neue Cron-Jobs (meeting-recording-poll, meeting-transcript, meeting-summary, meeting-reminders) + 2 bestehende erweitert (pending-consent-renewal, recording-retention). 7 Blocker waehrend SLC-412 Jitsi-Deployment geloest (dokumentiert in jitsi-jibri-deployment Rule). Live-Tests: Jitsi Meeting, Jibri Recording, Whisper Transkription, Bedrock Summary + Agenda — alle PASS.
- Risks: OpenAI Whisper geht ueber US-API (akzeptiert fuer Internal-Tool, Azure-Migration in V4.2 geplant, DEC-035). Transcript/Summary permanent gespeichert (DEC-043, V4.2 Retention-Policy bei Kundendaten). VAPID_SUBJECT zeigt auf falsches Mailto (ISSUE-038, Coolify-ENV-Fix). Kernel-Upgrade-Risiko fuer snd-aloop (ISSUE-037). Public-Revoke-Link nach Grant funktionslos (ISSUE-033, V4.2).
- Rollback Notes: Forward-only empfohlen. Jitsi-Stack kann unabhaengig deaktiviert werden (Services in docker-compose auskommentieren). Schema-Rollback: ALTER audit_log ALTER actor_id SET NOT NULL; DROP TABLE user_settings; ALTER contacts/meetings/activities DROP V4.1-Spalten. V4 Image als Fallback via Coolify.

### REL-009 — V4 KI-Gatekeeper + Externe Integrationen
- Date: 2026-04-14
- Scope: 9 Slices (SLC-401..409), 6 Features (FEAT-403/405/406/407/408/410), 7 V4-Backlog-Items. MIG-010 Schema-Migration (5 neue Tabellen: email_messages, email_threads, email_sync_state, ai_action_queue, ai_feedback; calendar_events erweitert um source/external_id/sync_status/booking_link). IMAP-Sync (IONOS direkt), E-Mail-Inbox UI, Gatekeeper-Klassifikation (Bedrock), KI-Wiedervorlagen mit Freigabe, Auto-Reply-Detection, Cal.com Self-Hosted + Webhook-Sync, Gesamtkalender UI, Management-Cockpit LLM-Ausbau (5 Preset-Analysen + Freitext). Zusaetzlich: Mein Tag/Focus UI-Reorganisation (KI-Wiedervorlagen als Tab, Action-Karten unter Focus), KI-Analyse Branding entfernt, 3 Revalidation-Fixes in Cron/Webhook-Routen.
- Summary: Deployment in zwei Phasen. Phase 1 (2026-04-12): SLC-401..403 live mit IMAP + Inbox + Cron-Jobs (classify, followups, imap-sync, retention). Phase 2 (2026-04-14 abends): SLC-404..409 via Coolify Redeploy. Gesamt-QA PASS (52/53 AC, RPT-108). Final-Check Conditionally ready (RPT-109). Go-Live GO mit Smoke-Tests PASS (Login, IMAP-Inbox, Mein Tag, Kalender, KI-Analyse, Focus). MEETING-WORKFLOW.md als Praxis-Anleitung erstellt.
- Risks: CALCOM_API_KEY bewusst leer (Cal.com AGPLv3 bietet keine API-Keys). calcom-sync Cron ist deshalb No-Op (501). Webhook-Signatur-Header bei erster realer Buchung noch zu verifizieren. In-Memory LLM-Cache (1h TTL) verliert bei Container-Restart. 179 Lint-Findings (any/unused) als Tech-Debt fuer V5. Next.js 16 Middleware-Deprecation (funktional OK).
- Rollback Notes: Docker Image Rollback via Coolify. V3.3 Image als Fallback. MIG-010 Rollback: DROP ai_feedback, ai_action_queue, email_sync_state, email_messages, email_threads; ALTER calendar_events DROP source, external_id, sync_status, booking_link.
