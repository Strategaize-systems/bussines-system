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

## Klasse C — Parent-FK-JOIN (SLC-903, geplant)

_Pending. Wird in SLC-903 MT ergaenzt._

## Klasse D — knowledge_chunks Schema-Erweiterung (SLC-905, geplant)

_Pending. Wird in SLC-905 MT ergaenzt._

## Klasse E — audit_log Special-Case (SLC-904, geplant)

_Pending. Wird in SLC-904 MT ergaenzt. service_role-Block ist explizit Pflicht-Item._
