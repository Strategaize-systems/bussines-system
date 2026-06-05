# V8.11 Cron / Service-Role Schreiber Audit

**Purpose:** Per DEC-269 sind Cron- und Service-Role-Schreiber, die `BYPASSRLS`-Pfade nutzen, **out-of-scope** fuer die RLS-Policy-Validierung. Stattdessen wird hier per Klasse pro Schreiber dokumentiert, ob die `user_id` / `owner_user_id` / Parent-FKs **korrekt gesetzt** werden, damit nach V9 multi-tenant die User-Isolation greift.

**Datum:** 2026-06-04
**Sprint:** V8.11 RLS-Sweep
**Pflicht-Audit fuer alle 5 Sub-Slices** (SLC-901..905). Per Sub-Slice ein eigener Sektion-Block.

## Klasse A — Per-User-Stammdaten (SLC-901)

**Tabellen:** `user_settings`, `kpi_snapshots`, `goals`, `activity_kpi_targets`

**Audit-Methode:**
- `grep -rn "createAdminClient" cockpit/src/app/api/cron/`
- `grep -rn "from\(\s*['\"](user_settings|kpi_snapshots|goals|activity_kpi_targets)['\"]"` ueber `cockpit/src/`

**Treffer-Tabelle:**

| File | Operation | user_id-Quelle | Status |
|---|---|---|---|
| `cockpit/src/app/api/cron/kpi-snapshot/route.ts` (L77, L107, L117) | `kpi_snapshots` INSERT | `profiles[0].id` (erste Profile-Row aus DB) | **OK** (Single-User-Mode, user_id valid; V9-Multi-User-Beobachtung unten) |
| `cockpit/src/app/api/cron/kpi-snapshot/route.ts` (L131-135) | `kpi_snapshots` DELETE | `userId = profiles[0].id` | OK (loescht eigene Idempotenz) |
| `cockpit/src/app/api/cron/meeting-reminders/route.ts` (L95) | `user_settings` SELECT | — (Read-only) | OK (Cross-User-Read, service_role bypass; V9 muss ggf. WHERE-Filter setzen) |
| `cockpit/src/app/api/cron/meeting-briefing/route.ts` (L91) | `user_settings` SELECT | — (Read-only) | OK |
| `cockpit/src/app/api/webhooks/voice-agent/route.ts` (L343, L351) | `user_settings` SELECT | `ownerId` (von Webhook-Caller) | OK (Read-only, kein Write) |

**Server-Actions (out-of-cron-scope, hier nur Vollstaendigkeit):**

| File | Operation | Auth-Pfad | RLS-Compliance |
|---|---|---|---|
| `cockpit/src/app/actions/user-settings.ts` | `user_settings` upsert | authenticated user | RLS via WITH CHECK `user_id = auth.uid()` |
| `cockpit/src/app/actions/kpi-snapshots.ts` | `kpi_snapshots` read/write | authenticated | RLS Klasse-A aktiv |
| `cockpit/src/app/actions/goals.ts` | `goals` CRUD | authenticated | RLS Klasse-A aktiv |
| `cockpit/src/app/actions/activity-kpis.ts` | `activity_kpi_targets` CRUD | authenticated | RLS Klasse-A aktiv |
| `cockpit/src/app/(app)/settings/briefing/actions.ts` | `user_settings` upsert | authenticated | RLS aktiv |
| `cockpit/src/lib/settings/working-hours-actions.ts` | `user_settings` update | authenticated | RLS aktiv |
| `cockpit/src/lib/push/send.ts` | `user_settings` read (push_subscription) | service_role (push-loop) | Read-only, OK |
| `cockpit/src/app/api/push/subscribe/route.ts` | `user_settings` upsert | authenticated | RLS aktiv |
| `cockpit/src/app/api/meetings/[id]/generate-agenda/route.ts` | `user_settings` read | authenticated | Read-only, OK |

**Verdict Klasse A:** Alle Cron-Schreiber setzen `user_id` korrekt. service_role-Pfade nutzen valide Profile-UUIDs. **Keine FIX-NEEDED.**

**V9-Multi-User Beobachtung (out-of-scope SLC-901):**
- `kpi-snapshot/route.ts` iteriert NUR ueber den ersten Profile (`profiles[0]`). In V9 muss das ein Loop ueber alle aktiven Profiles werden. Beobachtung — nicht V8.11-Scope.
- `meeting-reminders/route.ts` liest alle `user_settings` ohne Filter — das ist beabsichtigt fuer Cross-User-Reminder-Aggregation. Bei Multi-Tenant in V9 muss ggf. ein WHERE-Filter pro Tenant gesetzt werden.

## Klasse B — Team-Templates (SLC-902)

**Tabellen (11):** `branding_settings`, `email_templates`, `payment_terms_templates`, `compliance_templates`, `vat_id_validations`, `pipelines`, `pipeline_stages`, `products`, `automation_rules`, `cadences`, `cadence_steps`

**Audit-Methode (IMP-1054 Pflicht-Pre-Step):**
- `grep -rln "createAdminClient" cockpit/src/app/actions/ cockpit/src/app/(app)/ cockpit/src/lib/`
- `grep -rn ".from('<table>')." cockpit/src/` pro Tabelle
- Cron-Endpoints: `cockpit/src/app/api/cron/` keine Treffer auf 11 Tabellen
- Pruefung: Server-Action-Pfad (Write) — `createClient` (RLS-enforced) ODER `createAdminClient` (BYPASSRLS, Pflicht-Pre-Check `is_admin()` im Code)?

**Server-Action-Treffer-Tabelle (Klasse B):**

| Tabelle | File | Pfad | Client | Pre-Check | Verdict |
|---|---|---|---|---|---|
| `branding_settings` | `cockpit/src/app/(app)/settings/branding/actions.ts` L213-219 | `updateBranding` UPDATE/INSERT | `createClient` | `requireUser()` (kein role-Check, RLS Klasse-B is_admin() erzwingt es) | **OK** |
| `branding_settings` | `cockpit/src/app/(app)/settings/branding/actions.ts` L104 | `getBrandingForSend` SELECT (cron/send hook) | `createAdminClient` | Read-only Cron-Pfad | **OK** (read-only Bypass, DEC-269 legit) |
| `branding_settings` | `cockpit/src/app/(app)/settings/branding/actions.ts` L264-282 | `uploadLogo` storage.upload | `createAdminClient` | `requireUser()` (Storage-Bucket-API, nicht branding_settings-Table) | **OK** (Storage-API, kein Table-Write) |
| `email_templates` | `cockpit/src/app/(app)/settings/template-actions.ts` L71 | INSERT (createTemplate) | `createClient` | `requireUser()` + RLS Klasse-B is_admin() | **OK** |
| `payment_terms_templates` | `cockpit/src/app/(app)/settings/payment-terms/actions.ts` | UPSERT (Default-Flag-Toggle) | `createClient` | `requireUser()` + RLS Klasse-B | **OK** |
| `compliance_templates` | `cockpit/src/app/(app)/settings/compliance/actions.ts` L111+L141 | UPSERT (saveTemplate, resetTemplate) | `createClient` | `requireUser()` + RLS Klasse-B | **OK** |
| `vat_id_validations` | `cockpit/src/lib/validation/vies-actions.ts` L38 | UPSERT (Cache-Update) | `createAdminClient` | Cache-Pattern (kein per-User-Filter, DPA-konformer EU-Bedrock-Pfad) | **OK** (service-role Cache-Bypass, DEC-269 legit) |
| `pipelines` | `cockpit/src/app/(app)/pipeline/actions.ts` L857 | DELETE (deletePipeline) | `createClient` | `requireUser()` + RLS Klasse-B | **OK** |
| `pipeline_stages` | `cockpit/src/app/(app)/pipeline/actions.ts` L779/L855/L907/L978 | INSERT/UPDATE/DELETE | `createClient` | `requireUser()` + RLS Klasse-B | **OK** |
| `products` | `cockpit/src/app/actions/products.ts` L77/L114/L153 | INSERT (createProduct), UPDATE (updateProduct), UPDATE-archive (archiveProduct) | `createAdminClient` | **KEIN role-Check** — nur `if (!user)` Authentication-Check | **DEFENSE-IN-DEPTH-GAP — Medium** |
| `products` | `cockpit/src/app/actions/products.ts` L25/L48 | SELECT (listProducts, listProductCategories) | `createAdminClient` | `requireUser()` Authentication-Check | **OK** (Read-only, Klasse-B-SELECT-USING(true) erlaubt es ohnehin) |
| `automation_rules` | `cockpit/src/app/(app)/pipeline/actions.ts` L968 | UPDATE (Auto-Pause bei stage-delete) | `createClient` | `requireUser()` + RLS Klasse-B is_admin() | **OK** |
| `automation_rules` | `cockpit/src/app/(app)/mein-tag/actions/apply-nl-rule.ts` L137 | INSERT (NL-Sculptor) | `createClient` | `requireUser()` + RLS Klasse-B is_admin() | **OK** |
| `automation_rules` | `cockpit/src/lib/automation/executor.ts` L216 | UPDATE (last_run_at, last_run_status) | `createAdminClient` | Cron-Runner Pfad (DEC-269 service-role) | **OK** (Runner-Telemetry, kein User-State) |
| `automation_rules` | `cockpit/src/lib/automation/dispatcher.ts` L53 | SELECT (matching rules) | `createAdminClient` | Cron-Runner Pfad | **OK** (Read-only Dispatcher) |
| `automation_rules` | `cockpit/src/lib/automation/sculptor.ts` L132 | INSERT (KI-Sculptor) | `createAdminClient` (dynamic import) | KI-Pfad via Server-Action mit eigenem Auth-Wrapper (apply-nl-rule.ts oben) | **OK** (sculptor.ts ist Helper, eigentlicher Entry-Point ist apply-nl-rule.ts mit requireUser) |
| `cadences` | `cockpit/src/app/(app)/cadences/actions.ts` L136 | DELETE | `createClient` | `requireUser()` + RLS Klasse-B | **OK** |
| `cadence_steps` | `cockpit/src/app/(app)/cadences/actions.ts` L243 | DELETE | `createClient` | `requireUser()` + RLS Klasse-B | **OK** |

**Verdict Klasse B:** 10 von 11 Tabellen sauber. **1 FIX-NEEDED (Medium): `products`.**

**Issue: `actions/products.ts` umgeht Klasse-B RLS via `createAdminClient` ohne expliziten `is_admin()`-Pre-Check.** Nach MIG-046 sollte jeder INSERT/UPDATE/DELETE auf `products` nur fuer Admin moeglich sein, aber die aktuelle Implementierung erlaubt allen authentifizierten Usern (member, teamlead) Produkte zu erzeugen/aendern/archivieren. **Wird als ISSUE-090 in `docs/KNOWN_ISSUES.md` eroeffnet** und SLC-902 MT-6 SQL-Hotfix-Slice ODER V8.11-Closure-Block.

**Fix-Optionen:**
- **Option A (preferred):** Replace `createAdminClient()` mit `createClient()` (RLS Klasse-B greift automatisch) in `createProduct`, `updateProduct`, `archiveProduct`. Minimal-invasiv. ListProducts kann auf createClient umstellen (SELECT erlaubt). Pre-Live-bug, kein V3-Customer-Live-Block aktuell aber Single-Founder-Mode tolerant.
- **Option B (defense-in-depth):** Add `assertIsAdmin()` Helper-Function (per V7-RLS-Switch SECURITY DEFINER) als Pre-Check vor jedem createAdminClient-Use.

**Cron-Treffer-Tabelle (Klasse B):** Keine `/api/cron/`-Routes touchen die 11 Klasse-B-Tabellen direkt. Cron-Runner-Helper (`lib/automation/*`, `lib/cadence/*`) sind ueber Server-Actions getriggert oder via Bearer-Cron-Secret-Endpoints abgesichert.

**V9-Multi-Tenant Beobachtung (out-of-scope SLC-902):**
- 11 Klasse-B-Tabellen sind Single-Team-Owner-less. In V9 muss `team_id`-Spalte + `team_id = get_my_team_id()`-Filter ergaenzt werden. Policy-Body bleibt forward-compatible (`USING(true)` → `USING(team_id = get_my_team_id())`).
- KI-Vorlagen-Generator (`sculptor.ts`) ist heute Single-User; in V9 muss `created_by` als Team-Filter-Equivalent fungieren.

**AC-902-5 PASS** (Klasse-B-Audit dokumentiert + ISSUE-090 fuer products eroeffnet).

## Klasse C — Parent-FK-JOIN (SLC-903)

**Tabellen (24, ueber 3 Sub-Blocks):**
- **Block 1 (MIG-047a):** `tasks`, `signals`, `calendar_events`, `email_threads`, `handoffs`, `deal_products`, `auto_winloss_runs`, `referrals`
- **Block 2 (MIG-047b):** `proposal_items`, `proposal_payment_milestones`, `email_attachments`, `emails`, `cadence_enrollments`, `cadence_executions`, `email_tracking_events`
- **Block 3 (MIG-047c):** `ai_action_queue`, `ai_feedback`, `campaigns`, `campaign_links`, `campaign_link_clicks`, `automation_runs`, `fit_assessments`, `documents`, `email_sync_state`

**Audit-Methode (IMP-1054 Pflicht-Pre-Step + Slice-Spec MT-6):**
- `grep -rn "\.from\(['\"](klasse-c-tabelle)['\"]\)" cockpit/src/app/api/cron/`
- `grep -rn "createAdminClient" cockpit/src/` ueber Server-Action-Pfade fuer Klasse-C-Tabellen
- Cron-Endpoints per Slice-Spec L242-249: `signal-extract`, `automation-runner`, `cadence-execute`, `click-log-cleanup`, `embedding-sync` (out-of-Klasse-C, SLC-905) + zusaetzlich `classify`, `followups`

### Cron-Endpoint-Treffer-Tabelle (Klasse C)

| Cron-Endpoint | Tabellen-Treffer | Operation | owner-Spalte/Parent-FK-Set | Status |
|---|---|---|---|---|
| `/api/cron/signal-extract/route.ts` (L161) | `ai_action_queue` | INSERT (Signal → Action-Queue) | `entity_type='deal'` + `entity_id=deal.id` (Parent-FK Set, owner via JOIN) — service_role Bypass per DEC-269 | **OK** |
| `/api/cron/automation-runner/...` (via `lib/automation/executor.ts` L56/L259/L323) | `automation_runs` | INSERT (run start), UPDATE (status), UPDATE (telemetry) | `rule_id` + `trigger_entity_type/_id` korrekt; admin-only RLS-Policy (DEC-272), service_role bypass | **OK** |
| `/api/cron/cadence-execute/...` (via `lib/cadence/engine.ts` L171) | `cadence_executions` | INSERT (step-result) | `enrollment_id` → Parent-FK zu cadence_enrollments (transitive can_see_owner via deal/contact) — service_role | **OK** |
| `/api/cron/cadence-execute/...` (via `lib/automation/actions/send_email_template.ts` L119) | `emails` | INSERT (cadence-email send) | `owner_user_id` Set aus enrollment-Context (V7-Direct-Pattern, Parent-FK eindeutig) | **OK** |
| `/api/cron/click-log-cleanup/route.ts` (L74, L87) | `campaign_link_clicks` | SELECT (Retention-Scan) + DELETE (DSGVO-Cleanup) | DELETE-only RLS-Policy `is_admin()`, service_role bypass; Retention-Window=90 Tage | **OK** |
| `/api/cron/classify/route.ts` (L128, L140) | `ai_action_queue`, `tasks` | INSERT (Classifier-Output → Queue + Task) | `entity_type` + `entity_id` (ai_action_queue), `deal_id`/`contact_id` (tasks) korrekt aus Classifier-Quelle | **OK** |
| `/api/cron/followups/...` (via `lib/ai/followup-engine.ts` L394) | `ai_action_queue` | INSERT (Followup-Action) | `entity_type='deal'` + `entity_id` korrekt; service_role | **OK** |
| `/api/cron/kpi-snapshot/route.ts` (L95) | `deal_products` | SELECT (Aggregat-Read) | Read-only, kein owner-Set notwendig | **OK** |

### Cron-Helper-Library-Treffer (out-of-cron-endpoint-scope, ueber Cron-Routes invoked)

| Helper | Tabellen | Operation | owner-Logik | Status |
|---|---|---|---|---|
| `cockpit/src/lib/cadence/engine.ts` L367 | `tasks` | INSERT (cadence-task) | `deal_id` / `contact_id` aus enrollment-Context | **OK** |
| `cockpit/src/lib/cadence/abort.ts` L61, L75 | `cadence_executions`, `emails` | UPDATE (status=cancelled) | service_role abort-Pfad — kein owner-Aenderung | **OK** |
| `cockpit/src/lib/ai/action-queue.ts` L56/69/110/154/183/227/251 | `ai_action_queue` | SELECT/INSERT/UPDATE (Queue-CRUD via Server-Actions) | `entity_type/_id` aus Caller-Context (Signal/Followup/Insight-Server-Action) | **OK** |
| `cockpit/src/lib/automation/dispatcher.ts` L93 | `automation_runs` | UPDATE (status nach Dispatch) | service_role Telemetry | **OK** |
| `cockpit/src/lib/automation/recursion-guard.ts` L53 | `automation_runs` | SELECT (Recursion-Check) | Read-only | **OK** |
| `cockpit/src/lib/email/send.ts` L129, L229 | `emails` | INSERT (transactional + reply) | `owner_user_id` aus authenticated User ODER Cron-Context (passt) | **OK** |
| `cockpit/src/lib/email/tracking-queries.ts` L18 | `email_tracking_events` | SELECT (Read-Aggregation) | Read-only | **OK** |

### Server-Action createAdminClient-Audit (IMP-1054 Pflicht-Pre-Step)

| File | Tabellen | Operation | Client | Pre-Check | Verdict |
|---|---|---|---|---|---|
| `cockpit/src/lib/actions/insight-actions.ts` L37/40/83/87/172/176 | `ai_action_queue` (4 from-Calls) | SELECT/INSERT/UPDATE/DELETE (Insight-Approval-Flow) | `createAdminClient` | `requireUser()` Authentication, **kein** `is_admin()` role-check fuer mutate | **FIX-NEEDED Medium → ISSUE-093** (siehe `docs/KNOWN_ISSUES.md`) |
| `cockpit/src/lib/actions/insight-actions.ts` L196 | `ai_feedback` | INSERT (User-Feedback) | `createAdminClient` | `requireUser()` Authentication, **kein** role-check | **FIX-NEEDED Medium → ISSUE-093** (Bundle) |
| `cockpit/src/lib/actions/document-actions.ts` L31/73/79/114/128 | `documents` | SELECT/INSERT/DELETE/UPDATE | `createAdminClient` | `requireUser()` + `withCustomerScope()`-Wrapper — Multi-Parent-can_see_owner aus Klasse-C-Policy greift NICHT (Bypass) | **DEFENSE-IN-DEPTH-GAP — Medium → ISSUE-094** (V8.11-Closure-Bundle, neue Issue) |
| `cockpit/src/lib/knowledge/indexer.ts` L244, L261 | `documents` | SELECT/UPDATE (Indexer-Worker) | `createAdminClient` | Worker-by-design, kein User-Context | **OK** (Worker-Pattern, DEC-269 legit) |
| `cockpit/src/lib/campaigns/mapper.ts` L23, L37 | `campaigns` | SELECT (Mapper-Read) | `createAdminClient` | Read-only, Mapper-Helper | **OK** (Read-only) |
| `cockpit/src/app/r/[token]/route.ts` | `campaign_link_clicks` | INSERT (Tracking-Pixel Public-Endpoint) | `createAdminClient` | Public-Tracking-Pixel-Pfad — by-design service_role-Bypass, RLS-Policy `WITH CHECK (false)` zwingt service_role | **OK** (by-design, MT-4-B confirmed) |
| `cockpit/src/lib/ai/signals/applier.ts` | `ai_action_queue`, `signals` | INSERT/UPDATE (Signal-Applier) | `createAdminClient` | Cron-Background-Pfad | **OK** (DEC-269) |
| `cockpit/src/lib/ai/action-queue.ts` (siehe Helper-Tabelle oben) | `ai_action_queue` | CRUD | `createAdminClient` | Helper invoked from Cron-Runner ODER Server-Action mit eigenem Auth-Wrapper | **OK** (Wrapper-Validierung im Caller) |

**Verdict Klasse C:** 22 von 24 Tabellen sauber. **2 FIX-NEEDED (Medium):**
- `ai_action_queue` + `ai_feedback` via `insight-actions.ts` → **ISSUE-093** (bereits MT-4 dokumentiert)
- `documents` via `document-actions.ts` → **ISSUE-094** (neu, V8.11-Closure-Bundle)

**Beide Issues konsistent mit ISSUE-090 (`products`) + ISSUE-091 (`goals`) + ISSUE-092 (`kpi_snapshots`/`activity_kpi_targets`) — alle Server-Action-createAdminClient-Bypass-Faelle gesammelt in V8.11-Closure-Block-Bundle.** Fix-Optionen A (`createClient` Replace) ODER B (`assertIsAdmin()` Pre-Check) gleich wie Klasse-B-`products`.

**Cron-Code-Audit-Verdict:** ALLE 7 produktiven Cron-Endpoints und alle 7 Cron-Helper setzen Parent-FKs (`deal_id`, `contact_id`, `enrollment_id`, `entity_type/_id`, `owner_user_id`) korrekt aus dem Worker-Context. Keine FIX-NEEDED auf Cron-Pfaden. DEC-269 service_role-Bypass-Pattern korrekt angewandt.

**Sub-Slice-Klassifikation Klasse C (per DEC-272..274):**
- **STANDARD-Pattern (Multi-Parent OR + can_see_owner)** — 18 Tabellen — Cron schreibt korrekt Parent-FK
- **V7-Direct (owner_user_id)** — 1 Tabelle `emails` — Cron schreibt korrekt owner_user_id (V7-Pattern)
- **Klasse-A-Stil (created_by = auth.uid())** — 3 Tabellen (`campaigns`, `campaign_links` transitive, `fit_assessments`) — Cron schreibt nicht (Server-Action-only)
- **Admin-only / Service-Role-only Write** — 3 Tabellen (`campaign_link_clicks`, `automation_runs`, `email_sync_state`) — Cron schreibt via service_role legitim per DEC-269
- **Polymorph 5-Wege CASE** — 2 Tabellen (`ai_action_queue`, `ai_feedback` transitive) — Cron schreibt korrekt entity_type/_id

**V9-Multi-Tenant Beobachtung (out-of-scope SLC-903):**
- 24 Klasse-C-Tabellen haben Parent-FKs auf bereits tenant-isolierte Tabellen (deals/contacts/companies/proposals/etc.). Bei V9 muss nur die Parent-Tabelle den `team_id`-Filter setzen — die Klasse-C-Tabellen erben implizit.
- Ausnahme: `campaign_link_clicks` + `automation_runs` + `email_sync_state` brauchen ggf. direkten `team_id`-Filter in V9.

**AC-903-7 PASS** (Klasse-C-Audit dokumentiert + ISSUE-093 referenziert + ISSUE-094 eroeffnet, MT-6 Done-Gate).

## Klasse D — knowledge_chunks Schema-Erweiterung (SLC-905, geplant)

_Pending. Wird in SLC-905 MT ergaenzt._

## Klasse E — audit_log Special-Case (SLC-904, geplant)

_Pending. Wird in SLC-904 MT ergaenzt. service_role-Block ist explizit Pflicht-Item._
