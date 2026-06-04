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

## Klasse B — Team-Templates (SLC-902, geplant)

_Pending. Wird in SLC-902 MT ergaenzt._

## Klasse C — Parent-FK-JOIN (SLC-903, geplant)

_Pending. Wird in SLC-903 MT ergaenzt._

## Klasse D — knowledge_chunks Schema-Erweiterung (SLC-905, geplant)

_Pending. Wird in SLC-905 MT ergaenzt._

## Klasse E — audit_log Special-Case (SLC-904, geplant)

_Pending. Wird in SLC-904 MT ergaenzt. service_role-Block ist explizit Pflicht-Item._
