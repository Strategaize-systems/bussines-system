# Audit — Mail-Render-Pfade + DSE-Footer-Coverage (V8.5 SLC-853)

**Stand:** 2026-05-24 (V8.5 SLC-853 MT-1)
**Quelle:** Grep gegen `cockpit/src/**/*.ts` nach `sendEmailWithTracking(` und `transporter.sendMail(`.
**Hintergrund:** V8.4 SLC-846 implementierte DSE-Footer-Auto-Insert in `renderBrandedHtml`. Die Auto-Insertion greift NUR fuer den `else`-Branch in `lib/email/send.ts` (Lookup via `getTenantSlugByOwnerUserId`) — Caller die ihren HTML selbst rendern und als `params.html` reichen, umgehen den Lookup. V8.5 SLC-853 schliesst zwei Customer-facing Luecken (Consent-Request + Meeting-Briefing).

## Zusammenfassung

| Klassifikation | Caller-Anzahl | DSE-Footer heute | V8.5 SLC-853 Action |
|---|---|---|---|
| via `sendEmailWithTracking` mit `ownerUserId` (→ Lookup greift) | 2 | Ja (V8.4 SLC-846) | keine |
| via `sendEmailWithTracking` ohne `ownerUserId` (Lookup-Bypass) | 2 | Nein | keine (V9+ Followup) |
| via `sendEmailWithTracking` mit pre-built `params.html` (Lookup-Bypass) | 1 | Ja, durch eigene tenantSlug-Resolution in send-action.ts (V8.5 SLC-852) | keine |
| Direct `transporter.sendMail` (Custom-Renderer, Customer-facing) | 2 | Nein | **JA** (MT-3, MT-4) |
| Direct `transporter.sendMail` (Custom-Renderer, internal/team-only) | 3 | Nein | keine (intern oder V9+ Followup) |

## A. `sendEmailWithTracking`-Caller (4 Caller)

### A1. `cockpit/src/app/(app)/emails/actions.ts:82` — Manual-Send (sendEmail)
- **Pfad:** `else`-Branch in `send.ts` (`params.html` nicht gesetzt) → `renderBrandedHtml` mit `tenantSlug`-Lookup
- **`ownerUserId`:** **JA** (`profile.user_id` aus `getProfile()`, V7 SLC-704)
- **DSE-Footer:** **JA** (Lookup greift seit V8.4 SLC-846)
- **V8.5-Status:** Keine Action noetig

### A2. `cockpit/src/app/(app)/emails/compose/send-action.ts:161` — Composing-Studio (sendComposedEmail)
- **Pfad:** Pre-Render `renderBrandedHtml(body, branding, vars, tenantSlug)` → reicht als `params.html` → `if`-Branch in `send.ts` (Lookup wird umgangen)
- **`ownerUserId`:** JA, wird durchgereicht — aber Lookup in `send.ts` wird wegen `params.html` nicht ausgefuehrt
- **DSE-Footer:** **JA** (seit V8.5 SLC-852: `send-action.ts` macht tenantSlug-Resolution selbst per `getTenantSlugByOwnerUserId(profile.user_id)` + reicht durch an pre-render `renderBrandedHtml`)
- **V8.5-Status:** Keine Action noetig (SLC-852 hat das schon gefixt)

### A3. `cockpit/src/lib/cadence/engine.ts:293` — Cadence-Engine (Cadence-Mails)
- **Pfad:** `else`-Branch in `send.ts` (`params.html` nicht gesetzt) → `renderBrandedHtml` mit `tenantSlug`-Lookup
- **`ownerUserId`:** **NEIN** (Cadence-Engine reicht `ownerUserId` nicht durch — Pre-V7-Pfad nicht migriert)
- **DSE-Footer:** **NEIN** (Lookup-Bypass mangels `ownerUserId`)
- **V8.5-Status:** Out-of-Scope. Future-Slice-Candidate fuer V9+ (Cadence-Engine Owner-Wiring + Lookup-Aktivierung). Customer-facing, sollte mittelfristig DSE-Footer bekommen.

### A4. `cockpit/src/lib/automation/actions/send_email_template.ts:153` — Workflow-Rule-Action (send_email_template)
- **Pfad:** `else`-Branch in `send.ts` (`params.html` nicht gesetzt) → `renderBrandedHtml` mit `tenantSlug`-Lookup
- **`ownerUserId`:** **NEIN** (Workflow-Rule-Action reicht `ownerUserId` nicht durch — Pre-V7-Pfad nicht migriert)
- **DSE-Footer:** **NEIN** (Lookup-Bypass mangels `ownerUserId`)
- **V8.5-Status:** Out-of-Scope. Future-Slice-Candidate fuer V9+ (Workflow-Rule-Action Owner-Wiring + Lookup-Aktivierung). Customer-facing, sollte mittelfristig DSE-Footer bekommen.

## B. Direct `transporter.sendMail`-Caller (5 Caller)

Diese Caller umgehen `sendEmailWithTracking` komplett und sind Custom-Renderer. Es gibt KEINE Auto-Insertion-Moeglichkeit ueber `send.ts` — die Renderer muessen den DSE-Footer selbst anhaengen.

### B1. `cockpit/src/lib/email/send-consent-mail.ts:55` — Consent-Request (Customer-facing)
- **Renderer:** `consentRequestHtml(templateInput)` (lokal in `templates/consent-request-de.ts`)
- **Recipient:** Customer-Kontakt
- **DSE-Footer:** **NEIN**
- **V8.5-Status:** **MT-3 TARGET** — `consentRequestHtml`-Renderer um `dseFooterHtml`-Param erweitern, `send-consent-mail.ts` resolved `tenantSlug` via `getTenantSlugByOwnerUserId(ownerUserId)`. (Hinweis: heutiger Caller `requestConsent` muss `ownerUserId` durchreichen, der Helper-Audit ist in MT-3 mit drin.)

### B2. `cockpit/src/app/api/cron/meeting-briefing/route.ts:267` — Pre-Call Briefing (Owner-facing)
- **Renderer:** `renderBriefingEmail({...})` (lokal in `templates/briefing-html.ts`)
- **Recipient:** Meeting-Host (= Owner). Heute internal-only, aber Briefing-Inhalt enthaelt Deal-/Customer-Kontext und der Footer ist DSGVO-konformitaetsrelevant fuer Re-Use als Customer-Mail oder bei Owner-Wechsel.
- **DSE-Footer:** **NEIN**
- **V8.5-Status:** **MT-4 TARGET** — `renderBriefingEmail`-Renderer um `tenantSlug?`-Param erweitern, Cron resolved `tenantSlug` via `getTenantSlugByOwnerUserId(meeting.owner_user_id)`.

### B3. `cockpit/src/lib/auth/invite.ts:154` — Team-Invite (Internal-User)
- **Renderer:** Inline-HTML im Helper
- **Recipient:** Neuer Internal-User (Mitarbeiter wird eingeladen)
- **DSE-Footer:** NEIN
- **V8.5-Status:** Out-of-Scope. Internal-User-Mail, DSE-Footer nicht erforderlich (kein Customer-Kontakt). Stays as is.

### B4. `cockpit/src/lib/meetings/send-invite.ts:88` — Meeting-Invite (Customer-facing, mit ICS)
- **Renderer:** `meetingInviteFullHtml(templateInput)` (lokal)
- **Recipient:** Customer-Meeting-Teilnehmer
- **DSE-Footer:** NEIN
- **V8.5-Status:** Out-of-Scope. Future-Slice-Candidate fuer V9+ (Meeting-Invite Customer-facing, gleiche Compliance-Logik wie Consent-Request). Nicht V8.5 weil Scope-Containment + Risiko ICS-Iteroperabilitaet.

### B5. `cockpit/src/app/api/cron/meeting-reminders/route.ts:217 + :325` — Meeting-Reminder (Customer-facing, mit ICS)
- **Renderer:** `meetingReminderHtml(templateInput)` (lokal)
- **Recipient:** Customer-Meeting-Teilnehmer (Z.217) + Host (Z.325)
- **DSE-Footer:** NEIN
- **V8.5-Status:** Out-of-Scope. Future-Slice-Candidate fuer V9+ (gleiche Klasse wie B4).

## C. Render-Pfad-Layering (Architektur-Sicht)

```
Customer-Mail
    |
    +-- via sendEmailWithTracking
    |       |
    |       +-- with ownerUserId, no params.html  →  send.ts macht Lookup  →  Footer JA
    |       |   (A1 Manual-Send)
    |       |
    |       +-- with ownerUserId + params.html    →  send.ts Lookup wird umgangen
    |       |   (A2 Composing-Studio)             →  Footer kommt aus pre-render
    |       |                                          (SLC-852: send-action.ts macht eigene Resolution)
    |       |
    |       +-- without ownerUserId, no params.html  →  Lookup-Bypass mangels ownerUserId
    |           (A3 Cadence, A4 Workflow-Rule)        →  Footer NEIN (V9+ Followup)
    |
    +-- via transporter.sendMail direkt
            |
            +-- Custom-Renderer Customer-facing   →  Footer NEIN (heute)
            |   (B1 Consent, B2 Briefing, B4 Meeting-Invite, B5 Reminder)  →  MT-3+MT-4 in V8.5
            |
            +-- Custom-Renderer Internal-User     →  Footer NEIN (kein Bedarf)
                (B3 Team-Invite)
```

## D. V8.5 SLC-853 Scope-Cut Begruendung

- **MT-3 Consent + MT-4 Briefing** sind die hoechste Prio:
  - Beide sind aktive Customer-facing Mail-Pfade
  - Beide sind aktuell deployed und werden in Live-Smokes/Cron regelmaessig genutzt
  - Compliance-Risk konkret: DSE-Link fehlt in Customer-Postfach
- **A3 Cadence + A4 Workflow-Rule + B4 Meeting-Invite + B5 Reminder** werden bewusst nicht in V8.5 gefixt:
  - 3 weitere Renderer + 2 weitere ownerUserId-Wirings = ~3-4h zusaetzlich → Slice-Sprengung
  - Risiko-Profil aehnlich, aber alle 4 entweder noch nicht aktiv in Customer-Communication oder durch SMTP-Quota selten
  - Konsolidierter V9+ Slice "Mail-DSE-Footer-Sweep Phase 2" hat hoeheren Hebel

## E. Verifikations-Plan nach SLC-853

| Caller | Vitest | Live-Smoke (optional) |
|---|---|---|
| A2 Composing-Studio | SLC-852 +2 Bit-Identity (gruen) | Existing V8.4 S4 |
| B1 Consent-Request | MT-5 +2 Tests (with/without tenantSlug) | AC11 Mail an immo@bellaerts.de |
| B2 Meeting-Briefing | MT-5 +2 Tests (with/without tenantSlug) | AC11 Briefing-Cron-Test |

## F. Out-of-Scope (zur kuenftigen Verwertung)

Bei naechstem Customer-Mail-Refactor (V9+) folgende Items zusammen anpacken:
- A3 Cadence-Engine: `ownerUserId` aus `cadence_step.owner_user_id` durchreichen + Lookup aktivieren
- A4 Workflow-Rule `send_email_template`: `ownerUserId` aus Trigger-Source-Owner durchreichen + Lookup aktivieren
- B4 Meeting-Invite + B5 Reminder: gleiches Pattern wie MT-3/MT-4 (Renderer-Param + Cron-Resolution)
- Plus: Centralized Helper `buildDseFooterMarkdown(tenantSlug)` fuer Custom-Renderer die andere Layout-Strukturen als Table-HTML nutzen
