# SLC-564 — Pre-Call Briefing Cron + Push/Email-Delivery + /settings/briefing

## Meta
- Feature: FEAT-562
- Priority: High
- Status: planned
- Created: 2026-05-01

## Goal

Vor jedem Meeting wird automatisch ein KI-Briefing erstellt und ueber Push-Notification + E-Mail an den User geliefert. Cron `meeting-briefing` laeuft alle 5 Min (Coolify-Cron-Pattern wie `expire-proposals`), prueft Meetings im naechsten konfigurierten Fenster (15/30/45/60 Min — DEC-117), generiert Briefing via existierendem `buildDealBriefingPrompt` + `validateDealBriefing` Stack (FEAT-301 Reuse — KEIN neuer LLM-Adapter), persistiert als Activity (`type='briefing'`, V3 `source_type/id`-Pattern — DEC-119), schickt Push (FEAT-409 Service Worker) + E-Mail (V5.3 send.ts kompakte HTML). Idempotenz via `meetings.briefing_generated_at` UPDATE-WHERE-NULL Winner-Takes-All Pattern (DEC-118). Bei dauerhaftem Fehler: Sentinel-Strategy mit max 3 Re-Tries (Open Point aus /architecture finalisiert in diesem Slice). Settings-Page `/settings/briefing` mit Trigger-Zeit-Setting + Push-Toggle + Email-Toggle (DEC-117). Wenn beide Channels off: Cron skippt komplett (kein Bedrock-Call, kein Activity-Insert — Open Point finalisiert: User-Mental-Model "Feature komplett aus"). Meetings ohne Deal-Zuordnung werden ignoriert (PRD-Constraint, Partial-Index filtert).

## Scope

- **Cron-Endpoint `/api/cron/meeting-briefing`:**
  - Datei: `cockpit/src/app/api/cron/meeting-briefing/route.ts` (NEU)
  - Pattern aus V5.5 `expire-proposals/route.ts`:
    - `POST` handler, `verifyCronSecret(request)` -> 401 wenn falsch
    - `createServiceRoleClient()` (Bedrock-Calls + Activity-Insert + DB-Updates)
  - Logic-Flow:
    1. SELECT user_settings (Single-Row): `briefing_trigger_minutes`, `briefing_push_enabled`, `briefing_email_enabled`
    2. Wenn beide Toggles `false`: return `{ok: true, skipped: 'all-channels-off'}` ohne weitere Aktion
    3. SELECT candidate-meetings: `WHERE briefing_generated_at IS NULL AND deal_id IS NOT NULL AND start_time BETWEEN now() AND now() + (briefing_trigger_minutes + 5) * INTERVAL '1 minute'`
    4. Fuer jedes Meeting (sequenziell, kein Promise.all):
       - `UPDATE meetings SET briefing_generated_at = now() WHERE id = $1 AND briefing_generated_at IS NULL RETURNING id`
       - Wenn 0 rows: skip (concurrent-run gewann oder Marker bereits gesetzt)
       - Wenn 1 row:
         - try:
           - SELECT deal-context (deal + contacts + recent-activities + proposals) parallel
           - Build `DealBriefingContext`-Object
           - Bedrock-Call: `queryLLM(buildDealBriefingPrompt(context), DEAL_BRIEFING_SYSTEM_PROMPT)`
           - `validateDealBriefing(json)` → parse + validate
           - INSERT activity (type='briefing', source_type='meeting', source_id=meeting.id, ai_generated=true, deal_id=meeting.deal_id, title=`Pre-Call Briefing fuer ${meeting.title}`, description=JSON.stringify(briefing), created_by=NULL)
           - Wenn briefing_push_enabled: send Push-Notification
           - Wenn briefing_email_enabled: send Email
           - Audit-Log mit context, processed++
         - catch (Bedrock-Error oder Validation-Fail):
           - **Sentinel-Strategy** (Open-Point finalisiert):
             - Lookup retry-count: zaehle Failure-Activities fuer dieses Meeting (`WHERE source_type='meeting' AND source_id=meetingId AND type='briefing_error'`)
             - Wenn count < 3: `UPDATE meetings SET briefing_generated_at = NULL WHERE id = $1` (re-arm fuer naechsten Tick), INSERT failure-activity (type='briefing_error') + audit-log
             - Wenn count >= 3: Marker bleibt gesetzt (kein Re-Arm), INSERT final-failure-activity, audit-log mit `context='Briefing failed permanently after 3 retries'`
    5. Return `{ok: true, processedCount, skippedCount, failedCount, retryCount}`
  - Konstanten: `MAX_BRIEFING_RETRIES = 3`
- **Bedrock-Adapter-Reuse:**
  - Importiert `buildDealBriefingPrompt`, `DEAL_BRIEFING_SYSTEM_PROMPT` aus `cockpit/src/lib/ai/prompts/deal-briefing.ts` (existing FEAT-301)
  - Importiert `validateDealBriefing` aus `cockpit/src/lib/ai/validators/deal-briefing.ts` (existing FEAT-301, falls Pfad anders: zur Suchzeit zu finalisieren)
  - Importiert `queryLLM` aus `cockpit/src/lib/ai/bedrock-client.ts` (existing FEAT-305)
  - **KEIN neuer LLM-Code** — pure Komposition
- **Deal-Context-Loader-Helper:**
  - Datei: `cockpit/src/lib/ai/deal-context-loader.ts` (NEU oder MODIFY existing — Pruefung ob FEAT-301 bereits einen exportiert)
  - Falls existing: importieren + benutzen
  - Falls nicht: `loadDealBriefingContext(dealId, supabaseClient): Promise<DealBriefingContext>` mit:
    - SELECT deal (name, value, stage, probability, expected_close_date, notes)
    - SELECT contacts (Top 5 active)
    - SELECT recent activities (Top 10 newest, last 30 days)
    - SELECT proposals (alle, sortiert by version DESC)
- **Push-Notification-Helper:**
  - Datei: `cockpit/src/lib/notifications/send-push.ts` (NEU oder MODIFY existing FEAT-409-Helper)
  - Falls existing: importieren
  - Falls nicht: `sendPushNotification({userId, title, body, data}): Promise<void>` mit:
    - SELECT `user_settings.push_subscription` WHERE user_id=userId
    - Wenn NULL: skip silently (User hat noch keine Subscription gesetzt)
    - Wenn vorhanden: web-push library `sendNotification(subscription, JSON.stringify({title, body, data}))`
    - Bei web-push-Error (z.B. Subscription expired): clear `push_subscription = NULL` (Defense gegen Loop)
- **Briefing-Email-Template:**
  - Datei: `cockpit/src/lib/email/templates/briefing-html.ts` (NEU)
  - Funktion: `renderBriefingEmail(meeting, deal, briefing): { subject: string, html: string, text: string }`
  - Subject: `Briefing: ${meeting.title} (${formatDateTime(meeting.start_time)})`
  - HTML-Sections (Open Point finalisiert: 5 Sections):
    1. Title (Meeting-Name + Zeit + Deal-Name)
    2. Summary (briefing.summary, 2-3 Saetze)
    3. Top-3 Key Facts (`<ul>` mit briefing.keyFacts.slice(0,3))
    4. Top-3 Open Risks (`<ul>` mit briefing.openRisks.slice(0,3))
    5. Top-3 Suggested Next Steps (`<ul>` mit briefing.suggestedNextSteps.slice(0,3))
    6. Click-Through-Link zum Deal-Workspace (`https://{HOST}/deals/${deal.id}`)
  - Plain-HTML, KEIN Branding-Renderer (aus PRD V5.6 Out-of-Scope)
  - Plain-Text-Fallback fuer Mail-Clients ohne HTML
- **Email-Send-Integration:**
  - Importiert `sendEmailWithTracking` (oder neutrales `sendEmail` ohne Tracking — Pruefung) aus `cockpit/src/lib/email/send.ts` (V5.3)
  - Briefing-Mail braucht KEIN Tracking-Pixel (Empfaenger ist User selbst)
  - Wenn `sendEmailWithTracking` zwingend Tracking ist: separater simpler `sendInternalEmail`-Helper anlegen ODER Tracking deaktivieren via Param
  - Recipient: User-eigene E-Mail aus `auth.users.email` (Single-User-Modus)
- **Push-Payload-Inhalt (Open Point finalisiert):**
  - Title: `Briefing: ${meeting.title}`
  - Body: `${briefing.summary.slice(0, 150)}...` (max 150 Char Snippet)
  - Data:
    - `dealId`: meeting.deal_id
    - `meetingId`: meeting.id
    - `briefingActivityId`: activity.id (frisch insertet)
    - `clickThroughUrl`: `/deals/${dealId}`
  - Service Worker (FEAT-409): handler navigates zur clickThroughUrl
- **`/settings/briefing`-Page:**
  - Datei: `cockpit/src/app/(app)/settings/briefing/page.tsx` (NEU)
  - Datei: `cockpit/src/app/(app)/settings/briefing/actions.ts` (NEU)
  - Layout: Settings-Sidebar-Nav (aus SLC-561) + Main-Content
  - Main-Content:
    - Headline "Pre-Call Briefing"
    - Beschreibung (1-2 Saetze: "Vor jedem Meeting mit Deal-Zuordnung wird automatisch ein KI-Briefing erstellt und an dich versendet.")
    - Trigger-Zeit Section:
      - Label "Wie lange vor dem Meeting?"
      - Radio-Group mit 4 Optionen: 15 Min / 30 Min / 45 Min / 60 Min
      - Default-Auswahl aus `user_settings.briefing_trigger_minutes`
    - Channels Section:
      - Label "Lieferung"
      - Switch "Push-Notification" (`briefing_push_enabled`)
      - Switch "E-Mail" (`briefing_email_enabled`)
      - Bei beide off: Hinweis "Briefing wird komplett deaktiviert."
    - Save-Button (oder Auto-Save bei Aenderung)
  - Server Actions:
    - `getBriefingSettings(): Promise<{trigger_minutes, push_enabled, email_enabled}>`
    - `updateBriefingSettings(input): Promise<{ok: true} | {ok: false, error}>`
    - Audit-Log fuer Updates
- **Browser-Push-Subscription-Setup-Hint:**
  - Wenn User auf `/settings/briefing` geht und `user_settings.push_subscription` NULL ist + `briefing_push_enabled=true`:
    - Hinweis-Box "Push-Notifications sind aktiviert, aber dein Browser hat noch keine Subscription. Klicke hier, um Push zu aktivieren." → Button triggert Service-Worker-Subscribe (existing FEAT-409-Pattern, ggf. wiederverwendbarer Helper aus V4.1)
- **Coolify-Cron-Anlage-Anleitung:**
  - REL-022-Notes (Datei `docs/RELEASES.md`) erweitern um Cron-Setup-Anleitung:
    - Container `app`
    - Command: `node -e "fetch('http://localhost:3000/api/cron/meeting-briefing', {method: 'POST', headers: {'x-cron-secret': process.env.CRON_SECRET}})"`
    - Cron-Expression: `*/5 * * * *` (alle 5 Min)
    - User-Pflicht-Schritt nach Deploy (analog `expire-proposals` V5.5)
- **`activities.type` Erweiterung:**
  - `type='briefing'` ist String-Konvention (kein CHECK-Constraint)
  - Neuer `type='briefing_error'` fuer Failure-Tracking
  - UI im Deal-Workspace (Activity-Timeline) muss diese Types anzeigen — Pruefung in MT-X ob Activity-Renderer beide Types kennt, sonst kleine Erweiterung
- **`<ActivityBriefingCard>`-Komponente fuer Workspace:**
  - Datei: `cockpit/src/components/deals/activity-briefing-card.tsx` (NEU)
  - Props: `{ activity: Activity }` (mit `type='briefing'` und `description=JSON-stringified-briefing`)
  - Parsed JSON aus description, zeigt:
    - Briefing-Icon + Title
    - Summary
    - Expandable: keyFacts, openRisks, suggestedNextSteps als 3 Listen
    - Confidence-Badge
    - Meeting-Reference (verlinkt auf source_id)
  - Fallback wenn JSON-parse fehlschlaegt: Show description as plain text
- **Activity-Timeline-Renderer-Erweiterung:**
  - Datei: `cockpit/src/app/(app)/deals/[id]/_components/activity-timeline.tsx` (oder existing-Pfad, MODIFY)
  - Switch-Case auf `activity.type`:
    - `'briefing'` -> render `<ActivityBriefingCard>`
    - `'briefing_error'` -> render kleiner Error-Indicator (rot, "Briefing-Generierung fehlgeschlagen")
    - andere: existing rendering
- **Cockpit-Records-Update:**
  - `slices/INDEX.md`: SLC-564 done
  - `planning/backlog.json`: BL-416 done, BL-385 done (Umbrella), BL-412 done (Umbrella)
  - `features/INDEX.md`: FEAT-561 + FEAT-562 done
  - `docs/STATE.md`: V5.6 in Gesamt-QA-Phase
  - `docs/RELEASES.md`: REL-022-Notes finalisiert
  - `docs/MIGRATIONS.md`: MIG-027 finalized (Date verifiziert)

## Out of Scope

- Multi-User-Briefing-Routing (Single-User-Annahme)
- Briefing fuer interne Termine ohne Deal-Bezug (PRD-Constraint)
- Briefing-Konfigurations-UI fuer einzelne Sections-Tiefe (PRD-Constraint, fixe 5 Sections)
- Nachgelagerte Briefing-Updates wenn neue Daten zwischen Erstellung und Meeting reinkommen (PRD-Constraint, Snapshot)
- E-Mail-Briefing als HTML-Render-Engine (V5.3 Branding-Renderer wird nicht angefasst — kompakte Plain-HTML)
- Vergleichs-UI Soll/Ist (Briefing-Vorhersage vs. Meeting-Outcome) — V7+
- Briefing-Bulk-Generation fuer ganze Tage/Wochen — V7+
- Push-Notification-Bulk-Optimization (Web-Push-Provider-Batching)
- Email-Bounce-Handling fuer Briefing-Mail (User-eigene E-Mail, eigene Domain — Bounces sind ungewoehnlich)

## Acceptance Criteria

- AC1: Cron-Endpoint `/api/cron/meeting-briefing` existiert. POST mit `CRON_SECRET`-Header rendert ohne 401.
- AC2: SELECT user_settings: wenn beide Toggles off → Cron skippt komplett mit Response `{ok: true, skipped: 'all-channels-off'}`.
- AC3: SELECT candidate-meetings: filtert mit Partial-Index korrekt (briefing_generated_at IS NULL, deal_id NOT NULL, start_time im Fenster).
- AC4: UPDATE-WHERE-NULL Idempotenz-Pattern: erst-Query setzt Marker, zweite Parallelquery bekommt 0-rows (kein doppeltes Briefing).
- AC5: Bedrock-Call mit `buildDealBriefingPrompt` + `DEAL_BRIEFING_SYSTEM_PROMPT` rendert validen Briefing-JSON. `validateDealBriefing` PASS.
- AC6: Activity-Insert mit `type='briefing'`, `source_type='meeting'`, `source_id=meeting.id`, `ai_generated=true`, `deal_id=meeting.deal_id`, `description=JSON.stringify(briefing)`.
- AC7: Push-Notification wird gesendet wenn `briefing_push_enabled=true` UND `user_settings.push_subscription IS NOT NULL`. Title + Body + Data korrekt.
- AC8: Push wird **nicht** gesendet wenn `briefing_push_enabled=false`.
- AC9: E-Mail wird gesendet wenn `briefing_email_enabled=true` mit allen 5 Sections (Title, Summary, keyFacts, openRisks, suggestedNextSteps).
- AC10: E-Mail wird **nicht** gesendet wenn `briefing_email_enabled=false`.
- AC11: Bedrock-Error: Marker wird auf NULL zurueckgesetzt (Re-Arm), failure-activity insertet, retry-count erhoeht.
- AC12: Nach 3 Failures: Marker bleibt gesetzt (kein Re-Arm), final-failure-activity insertet, kein weiterer Bedrock-Call.
- AC13: Audit-Log enthaelt fuer jeden Briefing-Lauf einen Eintrag (success oder failure).
- AC14: `/settings/briefing` Page lautet auf, zeigt Trigger-Zeit + 2 Toggle-Switches + Save.
- AC15: Trigger-Zeit-Aenderung (z.B. von 30 auf 45) persistiert in `user_settings.briefing_trigger_minutes`.
- AC16: Push-Toggle-Aenderung persistiert in `user_settings.briefing_push_enabled`.
- AC17: Email-Toggle-Aenderung persistiert in `user_settings.briefing_email_enabled`.
- AC18: Hinweis-Box bei `briefing_push_enabled=true` + `push_subscription IS NULL` wird sichtbar.
- AC19: `<ActivityBriefingCard>` rendert Briefing-Activities im Deal-Workspace mit allen Sections.
- AC20: `<ActivityBriefingCard>` Fallback bei JSON-Parse-Error: zeigt description als plain text.
- AC21: REL-022-Notes enthalten Cron-Setup-Anleitung mit konkreter Cron-Expression + Container-Name + curl-Test-Command.
- AC22: Browser-Smoke (Desktop + Mobile): `/settings/briefing` funktional.
- AC23: End-to-End-Smoke: Test-Meeting in 30 Min anlegen mit Deal-Zuordnung -> Cron triggern -> Push erscheint im Browser + E-Mail im User-Postfach -> Activity sichtbar im Deal-Workspace.
- AC24: Test-Meeting ohne Deal-Zuordnung -> Cron ignoriert (kein Briefing).
- AC25: Re-Trigger-Cron auf bereits-briefes Meeting: Idempotenz greift (kein zweites Briefing).
- AC26: TypeScript-Build (`npm run build`) gruen.
- AC27: Vitest (`npm run test`) gruen — neue Tests fuer `renderBriefingEmail` (Snapshot) + Idempotenz-Smoke fuer Cron-Logic.
- AC28: ESLint (`npm run lint`) gruen.

## Dependencies

- SLC-561 abgeschlossen + deployed (`meetings.briefing_generated_at` + `user_settings.briefing_*` Spalten existieren, Settings-Sidebar-Nav existiert)
- FEAT-301 (Deal-Workspace KI) — `buildDealBriefingPrompt`, `validateDealBriefing` existieren in `cockpit/src/lib/ai/`
- FEAT-409 (Browser-Push) — `user_settings.push_subscription` Spalte existiert, web-push library installiert, Service Worker registered
- V5.3 SLC-502 (`cockpit/src/lib/email/send.ts`) — SMTP-Send-Pipeline existiert
- V5.5 SLC-554 (Cron-Endpoint-Pattern aus `expire-proposals/route.ts`)
- V5.5 SLC-554 (`verify-cron-secret` Helper)
- V3 (`activities`-Tabelle mit `source_type/source_id`-Pattern + `ai_generated`-Flag)
- V4.1 (`user_settings`-Tabelle)
- Coolify-Cron-Setup-Permissions auf Hetzner Server (User-Pflicht nach Deploy)

## Risks

- **Risk:** Bedrock-Latency macht Cron-Tick-Window knapp wenn 5+ Meetings gleichzeitig im Fenster.
  Mitigation: Sequentieller Loop (kein Promise.all). 5 * 15s = 75s — innerhalb 5-Min-Tick-Budget. Bei mehr als 5 Meetings: Audit-Warning, naechster Tick holt Rest auf (Idempotenz).
- **Risk:** `briefing_generated_at`-Marker wird gesetzt, aber Briefing-Insert schlaegt fehl (z.B. RLS-Drift, Activity-Insert-Constraint-Violation) — Marker stale, kein Re-Arm.
  Mitigation: try/catch um den GANZEN Block (LLM + Activity-Insert + Push + Email). Bei Catch: Marker reset (siehe Sentinel-Strategy). Worst-Case: User sieht 3 failure-activities und manuelles Eingreifen.
- **Risk:** Push-Notification bei abgelaufener Subscription bricht Cron-Lauf.
  Mitigation: try/catch um sendPush-Call. Bei web-push 410 (Gone): clear `push_subscription` und log-only, kein Throw. Cron-Lauf unbeeintraechtigt.
- **Risk:** Email-Send schlaegt fehl (SMTP-Server down, Rate-Limit).
  Mitigation: try/catch separat, log-only. Cron-Lauf unbeeintraechtigt. Activity ist persistiert -> User sieht Briefing trotzdem im Workspace.
- **Risk:** Briefing-JSON von LLM ist invalid (Format-Drift, neue Sonnet-Version aendert Output).
  Mitigation: `validateDealBriefing` prueft Schema. Bei Fail: failure-activity, retry. Nach 3 Fails: Sentinel.
- **Risk:** Sentinel-Lookup (Count-Failure-Activities) wird langsam bei vielen Meetings.
  Mitigation: Index `idx_activities_source` aus V3 deckt source_type+source_id ab. Query ist Single-Index-Scan.
- **Risk:** User klickt schnell hintereinander Push-Toggle on/off — Race im Update.
  Mitigation: Single-User-Modus, kein realer Concurrency. revalidatePath nach Mutation.
- **Risk:** Cron-Endpoint wird ohne CRON_SECRET aufgerufen (z.B. Public-Internet-Discovery).
  Mitigation: `verifyCronSecret` returnt 401. Constant-Time-Compare in Helper.
- **Risk:** Briefing-Activity wird ans falsche Deal angehaengt (wenn meeting.deal_id stale).
  Mitigation: Cron liest meeting.deal_id zur Tick-Zeit (nicht beim Meeting-Anlegen). RLS implicit.
- **Risk:** Push-Payload ueberschreitet 4 KB Limit.
  Mitigation: Body explizit auf 150 Char limited. Data ist nur 4 IDs + 1 URL — < 200 Bytes. Total < 500 Bytes typisch.
- **Risk:** `activity.description` als JSON-Stringified ueberschreitet TEXT-Spalten-Limits oder bricht UI-Renderer fuer alte Activity-Types.
  Mitigation: TEXT ist unbegrenzt (Postgres-TOAST). UI-Renderer prueft `activity.type` und switched zu `<ActivityBriefingCard>`. Andere Renderer ignorieren JSON-Format.
- **Risk:** Cron laeuft im Sommerzeitwechsel-Moment doppelt oder nicht.
  Mitigation: Coolify-Cron nutzt UTC oder Server-Time (Hetzner-Server: Berlin). Bei DST-Wechsel: maximal 1h Drift. Idempotenz greift.
- **Risk:** Briefing-Email landet im Spam-Folder.
  Mitigation: Sender-Domain ist eigene Domain mit SPF/DKIM (V5.3-Setup). User-eigene E-Mail-Adresse als Empfaenger -> low spam-risk.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/app/api/cron/meeting-briefing/route.ts` | NEU: Cron-Endpoint mit Idempotenz + Sentinel |
| `cockpit/src/lib/ai/deal-context-loader.ts` | NEU oder MODIFY: DealBriefingContext-Loader |
| `cockpit/src/lib/notifications/send-push.ts` | NEU oder MODIFY: Push-Helper mit Subscription-Cleanup |
| `cockpit/src/lib/email/templates/briefing-html.ts` | NEU: Briefing-Email-Template |
| `cockpit/src/app/(app)/settings/briefing/page.tsx` | NEU: Settings-Page |
| `cockpit/src/app/(app)/settings/briefing/actions.ts` | NEU: Server Actions |
| `cockpit/src/app/(app)/settings/layout.tsx` | MODIFY: "Briefing"-Link aktivieren (aus SLC-561 als TODO) |
| `cockpit/src/components/deals/activity-briefing-card.tsx` | NEU: Activity-Card im Workspace |
| `cockpit/src/app/(app)/deals/[id]/_components/activity-timeline.tsx` | MODIFY: Switch-Case fuer briefing-Types |
| `cockpit/src/lib/types/briefing.ts` | NEU: BriefingPayload-Type, MAX_BRIEFING_RETRIES Konstante |
| `docs/RELEASES.md` | MODIFY: REL-022-Notes mit Cron-Setup-Anleitung |
| `docs/STATE.md` | V5.6 SLC-564 done, Phase Gesamt-QA |
| `slices/INDEX.md` | SLC-564 done |
| `planning/backlog.json` | BL-416 done, BL-385 + BL-412 Umbrella done |
| `features/INDEX.md` | FEAT-561 + FEAT-562 done |
| `docs/MIGRATIONS.md` | MIG-027 finalized (Date) |

## QA Focus

- **Build + Test:**
  - `npm run build` gruen
  - `npm run test` gruen (neue Tests: `renderBriefingEmail` Snapshot, Cron-Idempotenz-Mock-Test)
  - `npm run lint` gruen
- **Cron-Endpoint-Smoke:**
  - POST ohne CRON_SECRET → 401
  - POST mit CRON_SECRET, beide Toggles off → `{ok: true, skipped: 'all-channels-off'}`
  - POST mit CRON_SECRET, ein Toggle on → kein Skip
- **Idempotenz-Smoke:**
  - Test-Meeting in 30 Min anlegen mit deal_id
  - Cron POST → Briefing generiert, Activity insertet, briefing_generated_at SET
  - Cron POST erneut → SELECT findet kein candidate (Marker gesetzt) → return `processedCount=0`
- **End-to-End-Smoke (CRITICAL):**
  - Test-Setup: Test-Meeting in 30 Min mit Deal-Zuordnung, push_subscription gesetzt, beide Toggles on
  - Cron triggern (curl manuell oder Coolify-Cron-Run)
  - Verifikation:
    - Activity in DB: `SELECT * FROM activities WHERE type='briefing' AND source_type='meeting' AND source_id=$meetingId` zeigt Row
    - description ist gueltiger Briefing-JSON
    - Push erscheint im Browser (Service Worker)
    - E-Mail im User-Postfach mit allen 5 Sections
    - Audit-Log-Eintrag
  - Klick auf Push → navigiert zu Deal-Workspace
  - Klick auf Email-Link → navigiert zu Deal-Workspace
- **Failure-Smoke:**
  - Bedrock auf failure mocken (z.B. invalid AWS-Credentials kurzzeitig)
  - Cron triggern → Activity (type='briefing_error') insertet, marker reset
  - Cron erneut triggern bis Sentinel (3 Failures) → marker bleibt, final-failure-activity, kein weiterer Bedrock-Call
- **Settings-Page-Smoke:**
  - `/settings/briefing` lautet auf, zeigt aktuelle Werte (Default 30/on/on)
  - Trigger-Zeit auf 45 wechseln + Save → DB-Smoke `SELECT briefing_trigger_minutes FROM user_settings`
  - Push-Toggle off + Save → DB-Smoke
  - Email-Toggle off + Save → DB-Smoke
  - Beide off → Hinweis-Banner "Briefing wird komplett deaktiviert"
- **Sidebar-Nav-Smoke:**
  - "Briefing"-Link in Sidebar (aus SLC-561) klickbar (war evtl. disabled)
- **Activity-Workspace-Smoke:**
  - Deal-Workspace mit Briefing-Activity → `<ActivityBriefingCard>` rendert mit Title + Summary + Expandable-Sections
  - Briefing-Error-Activity → kleiner roter Hinweis "Briefing fehlgeschlagen"
  - Mobile-View: rendert korrekt
- **Push-Subscription-Hint-Smoke:**
  - User ohne push_subscription, push_enabled=true → Hinweis-Box mit Subscribe-Button erscheint
  - Klick auf Subscribe → web-push-Subscription wird angelegt
- **Coolify-Cron-Setup-Smoke:**
  - REL-022-Notes enthalten Cron-Expression + Command + Test-curl
  - User-Aktion in /go-live: Coolify-Cron `meeting-briefing` anlegen, erster Auto-Run wartet auf naechsten 5-Min-Slot
- **V5.5-Regression-Smoke:**
  - `expire-proposals`-Cron unbeeintraechtigt (eigene Pipeline)
  - Composing-Studio + Proposal-Editor unbetroffen
  - Deal-Workspace zeigt Briefing-Activities + alle anderen Activity-Types weiterhin korrekt

## Micro-Tasks

### MT-1: BriefingPayload-Type + Konstanten
- Goal: Type-Definitionen + MAX_BRIEFING_RETRIES Konstante
- Files: `cockpit/src/lib/types/briefing.ts` (NEU)
- Expected behavior:
  - `type BriefingPayload = { summary, keyFacts, openRisks, suggestedNextSteps, confidence }`
  - `MAX_BRIEFING_RETRIES = 3` exportiert
  - Type fuer Push-Payload + Email-Render-Input
- Verification: TypeScript-Build gruen
- Dependencies: SLC-561

### MT-2: Deal-Context-Loader-Helper
- Goal: Single-Source-of-Truth fuer Briefing-Context-Loading
- Files: `cockpit/src/lib/ai/deal-context-loader.ts` (NEU oder MODIFY)
- Expected behavior:
  - Pruefung: existiert bereits eine analoge Funktion fuer FEAT-301 Deal-Workspace? Wenn ja: importieren und nutzen.
  - Wenn nicht: `loadDealBriefingContext(dealId, supabaseClient): Promise<DealBriefingContext>` mit allen 4 Queries (deal, contacts, activities, proposals) parallel
  - Returnt struktur kompatibel zu `buildDealBriefingPrompt`
- Verification: Smoke: rufe Funktion mit Test-Deal-ID, returnt valid Context
- Dependencies: MT-1

### MT-3: Briefing-Email-Template
- Goal: Email-Render-Funktion mit 5 Sections
- Files: `cockpit/src/lib/email/templates/briefing-html.ts` (NEU), `cockpit/src/lib/email/templates/__tests__/briefing-html.test.ts` (NEU)
- Expected behavior:
  - `renderBriefingEmail(meeting, deal, briefing): { subject, html, text }`
  - Subject: `Briefing: ${meeting.title} (${formatDateTime(start_time)})`
  - HTML: 5 Sections + Click-Through-Link
  - Plain-Text-Fallback
  - Vitest-Snapshot-Test mit Mock-Daten
- Verification: `npm run test briefing-html.test.ts` gruen, Snapshot-Inhalt ueberprueft
- Dependencies: MT-1

### MT-4: Push-Notification-Helper
- Goal: Push-Send mit Subscription-Cleanup
- Files: `cockpit/src/lib/notifications/send-push.ts` (NEU oder MODIFY)
- Expected behavior:
  - Pruefung: existing FEAT-409-Helper? Wenn ja: importieren oder erweitern.
  - Wenn nicht: `sendPushNotification({userId, title, body, data}): Promise<void>` mit:
    - SELECT push_subscription
    - Wenn NULL: silent-skip
    - web-push.sendNotification(subscription, JSON.stringify(...))
    - Bei 410 (Gone): UPDATE user_settings SET push_subscription = NULL
    - Bei anderen Errors: log-only, kein Throw
- Verification: Smoke mit Test-Subscription. Dev-Smoke mit invalid sub → kein Throw.
- Dependencies: MT-1

### MT-5: Cron-Endpoint mit Idempotenz + Sentinel
- Goal: Hauptlogik
- Files: `cockpit/src/app/api/cron/meeting-briefing/route.ts` (NEU)
- Expected behavior:
  - Pattern aus `expire-proposals/route.ts`
  - SELECT user_settings, Skip-Check
  - SELECT candidate-meetings im Fenster
  - Sequentieller Loop mit UPDATE-WHERE-NULL Idempotenz
  - try-catch: Erfolg → Activity + Push + Email + Audit; Fail → Sentinel-Logic (count failures, re-arm wenn < 3, sonst keep marker)
  - Return `{ok, processedCount, skippedCount, failedCount, retryCount}`
- Verification: curl-Test mit valid CRON_SECRET, DB-Verifikation
- Dependencies: MT-1, MT-2, MT-3, MT-4, V5.5 verify-cron-secret Helper

### MT-6: `<ActivityBriefingCard>`-Komponente + Timeline-Erweiterung
- Goal: UI-Render fuer Briefing-Activities
- Files: `cockpit/src/components/deals/activity-briefing-card.tsx` (NEU), `cockpit/src/app/(app)/deals/[id]/_components/activity-timeline.tsx` (MODIFY)
- Expected behavior:
  - `<ActivityBriefingCard>`:
    - Parsed JSON aus `activity.description`
    - Title (Briefing-Icon + Meeting-Reference)
    - Summary
    - Expandable: keyFacts, openRisks, suggestedNextSteps
    - Confidence-Badge
    - Fallback bei JSON-Parse-Error: plain text
  - Activity-Timeline switch-case: `'briefing'` → ActivityBriefingCard, `'briefing_error'` → kleiner Error-Indicator
- Verification: Browser-Smoke mit Test-Briefing-Activity in Deal-Workspace
- Dependencies: MT-1

### MT-7: `/settings/briefing`-Page + Server Actions
- Goal: User-facing Settings-UI
- Files: `cockpit/src/app/(app)/settings/briefing/page.tsx` (NEU), `cockpit/src/app/(app)/settings/briefing/actions.ts` (NEU), `cockpit/src/app/(app)/settings/layout.tsx` (MODIFY: Link enable)
- Expected behavior:
  - Server Actions: `getBriefingSettings`, `updateBriefingSettings`
  - Page mit Trigger-Radio-Group + 2 Toggle-Switches + Save-Button
  - Hinweis-Box bei push_enabled + push_subscription IS NULL → Subscribe-Button
  - Sidebar-Link aktivieren
- Verification: Browser-Smoke alle Settings-Pfade
- Dependencies: MT-1, SLC-561 (Sidebar)

### MT-8: REL-022-Notes + Coolify-Cron-Setup-Anleitung
- Goal: Doku fuer Go-Live
- Files: `docs/RELEASES.md` (MODIFY)
- Expected behavior:
  - REL-022-Section mit Status `planned`:
    - Datum: planned
    - Scope: V5.6 Zahlungsbedingungen + Pre-Call Briefing — alle 4 Slices SLC-561..564 + Gesamt-QA + Final-Check
    - Coolify-Cron-Setup-Anleitung: Container `app`, Cron-Expression `*/5 * * * *`, Command (`node -e fetch(...)`), CRON_SECRET-Header
    - Test-curl-Command zum Verifizieren
    - Rollback-Notes aus MIG-027
- Verification: REL-022-Section sichtbar in `docs/RELEASES.md`, Format-konform
- Dependencies: MT-7

### MT-9: End-to-End-Smoke + Cockpit-Records-Update
- Goal: V5.6-Komplettverifikation + Tracking-Files
- Files: `slices/INDEX.md` (MODIFY), `planning/backlog.json` (MODIFY), `features/INDEX.md` (MODIFY), `docs/STATE.md` (MODIFY), `docs/MIGRATIONS.md` (MODIFY)
- Expected behavior:
  - Smoke-Suite (laut QA Focus) auf Hetzner nach Coolify-Redeploy:
    - End-to-End: Test-Meeting + Cron-Trigger → Push + Email + Activity sichtbar (CRITICAL)
    - Idempotenz: Re-Trigger → kein zweites Briefing
    - Failure: Bedrock-Mock auf Failure → Sentinel nach 3 → final-failure-activity
    - Settings-Page: alle 3 Toggle-Pfade durch
    - Activity-Workspace: Briefing-Card + Error-Card rendern
  - Records-Update:
    - `slices/INDEX.md`: SLC-564 done
    - `planning/backlog.json`: BL-416 done + BL-385 done + BL-412 done (Umbrella-BLs done weil alle Slices fertig)
    - `features/INDEX.md`: FEAT-561 + FEAT-562 → done
    - `docs/STATE.md`: Phase auf `qa` (V5.6 Gesamt-QA pending), Current Focus auf "V5.6 Slices alle done, Gesamt-QA + /final-check + /go-live + /deploy als REL-022"
    - `docs/MIGRATIONS.md`: MIG-027 Date final
- Verification: Smoke-Cases dokumentiert in QA-Report. Cockpit-Refresh zeigt SLC-564 done + V5.6-Features done.
- Dependencies: MT-1..MT-8

## Schaetzung

~4-6h:
- MT-1 (Types + Konstanten): ~15min
- MT-2 (Deal-Context-Loader, ggf. Reuse): ~20-30min
- MT-3 (Email-Template + Snapshot): ~30min
- MT-4 (Push-Helper, ggf. Reuse): ~20-30min
- MT-5 (Cron-Endpoint Hauptlogik): ~75-90min (Idempotenz + Sentinel + Audit)
- MT-6 (ActivityBriefingCard + Timeline): ~45min
- MT-7 (Settings-Page + Actions + Sidebar-Link): ~45-60min
- MT-8 (REL-022-Notes): ~20min
- MT-9 (End-to-End-Smoke + Records): ~45-60min
- Buffer + Bug-Fix: ~45-60min
