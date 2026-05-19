# V7 SLC-704 — Audit Server Actions + Owner-Wiring

**Datum:** 2026-05-12
**Slice:** SLC-704 (Owner-Wiring)
**Ziel:** Inventar aller Server Actions + Cron-Endpoints + Workflow-Engine-Aktionen mit Owner-Wiring-Status pre/post.

8 Kerntabellen pro DEC-182: `companies`, `contacts`, `deals`, `activities`, `meetings`, `proposals`, `email_messages`, `calls`.

Helpers (SLC-702):
- `getProfile()` aus `@/lib/auth/get-profile` returnt `{ user_id, role, team_id, display_name }`
- `assertNotReadOnlyContext()` aus `@/lib/auth/read-only-context` (DEC-189)
- `assertRole([...])` aus `@/lib/auth/assert-role` (DEC-191)

## 1) Top-Level User-Facing Server Actions (Mutate)

Pfad: `cockpit/src/app/(app)/<domain>/actions.ts` und `cockpit/src/app/actions/*.ts`. Pro Mutate-Action: `assertNotReadOnlyContext()` als first line. Pro Insert in Kerntabelle: `owner_user_id = (await getProfile()).user_id`.

### pipeline/actions.ts — Tranche 1 (deals)
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| createDeal | INSERT | deals | nein | JA | owner_user_id = getProfile().user_id |
| updateDeal | UPDATE | deals | nein | JA | assertNotReadOnlyContext first line |
| updateDealValue | UPDATE | deals | nein | JA | assertNotReadOnlyContext first line |
| moveDealToStage | UPDATE | deals | nein | JA | INSERT activity erbt owner vom deal |
| moveDealToPipeline | UPDATE | deals | nein | JA | INSERT activity erbt owner vom deal |
| deleteDeal | DELETE | deals | nein | JA | assertNotReadOnlyContext first line |
| createPipeline | INSERT | pipelines | n/a | n/a | Nicht-Kerntabelle, nur assertNotReadOnly |
| updatePipeline | UPDATE | pipelines | n/a | n/a | dito |
| deletePipeline | DELETE | pipelines | n/a | n/a | dito |
| createStage / updateStage / deleteStage | * | pipeline_stages | n/a | n/a | dito |

### companies/actions.ts — Tranche 1
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| createCompany | INSERT | companies | nein | JA | owner_user_id = getProfile().user_id |
| updateCompany | UPDATE | companies | nein | JA | assertNotReadOnlyContext first line |
| deleteCompany | DELETE | companies | nein | JA | assertNotReadOnlyContext first line |

### contacts/actions.ts — Tranche 1
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| createContact | INSERT | contacts | nein | JA | owner_user_id = getProfile().user_id |
| updateContact | UPDATE | contacts | nein | JA | assertNotReadOnlyContext first line |
| deleteContact | DELETE | contacts | nein | JA | assertNotReadOnlyContext first line |

### aufgaben/actions.ts — Tranche 2 (Tasks = Activities)
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| createTask | INSERT | activities | nein | JA | owner_user_id = getProfile().user_id |
| createFollowUpTask | INSERT | activities | nein | JA | owner_user_id = getProfile().user_id |
| updateTask | UPDATE | activities | nein | JA | assertNotReadOnlyContext first line |
| completeTask | UPDATE | activities | nein | JA | assertNotReadOnlyContext first line |
| reopenTask | UPDATE | activities | nein | JA | assertNotReadOnlyContext first line |
| deleteTask | DELETE | activities | nein | JA | assertNotReadOnlyContext first line |

### meetings/actions.ts — Tranche 2 (DEC-186: Owner = Host)
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| createMeeting | INSERT | meetings | nein | JA | owner_user_id = getProfile().user_id (Host) |
| updateMeeting | UPDATE | meetings | nein | JA | assertNotReadOnlyContext first line |
| updateTranscript | UPDATE | meetings | nein | JA | assertNotReadOnlyContext first line |
| deleteMeeting | DELETE | meetings | nein | JA | assertNotReadOnlyContext first line |

### termine/actions.ts — Tranche 2 (Kalender-Events sind eigene Tabelle; nicht core)
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| createCalendarEvent | INSERT | calendar_events | n/a | n/a | Nicht-Kerntabelle |
| updateCalendarEvent | UPDATE | calendar_events | n/a | n/a | assertNotReadOnly |
| deleteCalendarEvent | DELETE | calendar_events | n/a | n/a | assertNotReadOnly |

### calls/actions.ts — Tranche 2 (DEC-186: Owner = Click-to-Call-User)
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| createCall | INSERT | calls | nein | JA | owner_user_id = getProfile().user_id |
| updateCallStatus | UPDATE | calls | nein | JA | assertNotReadOnlyContext first line |
| createCallActivity | INSERT | activities | nein | JA | owner_user_id = getProfile().user_id |

### proposals/actions.ts — Tranche 3
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| createProposalLegacy | INSERT | proposals | nein | JA | owner_user_id = getProfile().user_id |
| createProposal | INSERT | proposals | nein | JA | owner_user_id = getProfile().user_id |
| updateProposal | UPDATE | proposals | nein | JA | assertNotReadOnlyContext first line |
| updateProposalLegacy | UPDATE | proposals | nein | JA | assertNotReadOnlyContext first line |
| deleteProposal | DELETE | proposals | nein | JA | assertNotReadOnlyContext first line |
| addProposalItem | INSERT | proposal_items | n/a | n/a | nicht-core, nur assertNotReadOnly |
| updateProposalItem | UPDATE | proposal_items | n/a | n/a | dito |
| removeProposalItem | DELETE | proposal_items | n/a | n/a | dito |
| reorderProposalItems | UPDATE | proposal_items | n/a | n/a | dito |
| saveProposalPaymentMilestones | UPSERT | proposal_payment_milestones | n/a | n/a | dito |
| generateProposalPdf | UPDATE | proposals | nein | JA | assertNotReadOnlyContext first line |
| transitionProposalStatus | UPDATE | proposals | nein | JA | assertNotReadOnlyContext first line |
| createProposalVersion | INSERT | proposals | nein | JA | owner_user_id = getProfile().user_id |
| expireOverdueProposals | UPDATE | proposals | n/a | n/a | Cron-Pfad, kein User-Context |

### emails/* — Tranche 3 (email_messages)
| Funktion | Datei | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|---|
| sendEmail | emails/actions.ts | INSERT | email_messages | nein | JA | owner_user_id = getProfile().user_id |
| updateFollowUpStatus | emails/actions.ts | UPDATE | email_messages | nein | JA | assertNotReadOnlyContext first line |
| deleteEmail | emails/actions.ts | DELETE | email_messages | nein | JA | assertNotReadOnlyContext first line |
| assignEmailToContact | emails/unassigned/actions.ts | UPDATE | email_messages | nein | JA | dito |
| dismissUnassignedEmail | emails/unassigned/actions.ts | UPDATE | email_messages | nein | JA | dito |
| Composing-Studio (send-action.ts, attachment-actions.ts) | siehe Tranche 4 | * | email_messages | nein | JA | INSERT bekommt owner |

### handoffs/actions.ts — non-core
| Funktion | Op | Tabelle | Notes |
|---|---|---|---|
| createHandoff | INSERT | handoffs | nicht-core, nur assertNotReadOnly |
| updateHandoffStatus | UPDATE | handoffs | dito |
| deleteHandoff | DELETE | handoffs | dito |

### referrals/actions.ts — non-core
| Funktion | Op | Tabelle | Notes |
|---|---|---|---|
| createReferral | INSERT | referrals | nicht-core |
| deleteReferral | DELETE | referrals | dito |

### cadences/actions.ts — non-core
| Funktion | Op | Tabelle | Notes |
|---|---|---|---|
| createCadence / updateCadence / deleteCadence | * | cadences | nicht-core |
| addStep / updateStep / removeStep / reorderSteps | * | cadence_steps | nicht-core |

### cadences/enrollment-actions.ts — non-core (post-RPT-402)
| Funktion | Op | Tabelle | Notes |
|---|---|---|---|
| enrollInCadence | INSERT | cadence_enrollments | nicht-core, assertNotReadOnlyContext first line (RPT-402-Patch) |
| pauseEnrollment / resumeEnrollment / stopEnrollment | UPDATE | cadence_enrollments | dito |

### fit-assessment/actions.ts — non-core
| saveFitAssessment | UPSERT | fit_assessments | nicht-core |
| (delete-pfad in saveFitAssessment) | DELETE | fit_assessments | nicht-core |

### fit-assessment/signal-actions.ts — non-core (post-RPT-402)
| Funktion | Op | Tabelle | Notes |
|---|---|---|---|
| createSignal / createSignalForActivity | INSERT | signals | nicht-core, assertNotReadOnlyContext first line (RPT-402-Patch) |
| deleteSignal | DELETE | signals | dito |

### focus/actions.ts — Tranche 2 (Tasks/Deals = activities)
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| completeTaskFromFocus | UPDATE | activities | nein | JA | assertNotReadOnlyContext first line |
| completeDealActionFromFocus | UPDATE+INSERT | deals+activities | nein | JA | dito + activity erbt owner |

### mein-tag/actions.ts — Tranche 2
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| completeTaskFromMeinTag | UPDATE | activities | nein | JA | assertNotReadOnlyContext first line |
| completeDealActionFromMeinTag | UPDATE+INSERT | deals+activities | nein | JA | dito |
| updateLastLogin | UPDATE | profiles | n/a | n/a | nicht-core |

### settings/* — non-core (Admin-only meist, kein owner_user_id-Bezug)
| Datei | Funktionen | Notes |
|---|---|---|
| settings/automation/actions.ts | listAutomationRules / saveAutomationRule / pause/activate/deleteAutomationRule / runDryRun | automation_rules nicht-core, assertNotReadOnly auf Mutate |
| settings/branding/actions.ts | getBranding / updateBranding / uploadLogo | branding nicht-core, assertNotReadOnly auf Mutate |
| settings/campaigns/actions.ts | listCampaigns / saveCampaign / archiveCampaign / deleteCampaign | campaigns nicht-core |
| settings/briefing/actions.ts | getBriefingSettings / updateBriefingSettings | briefing_settings nicht-core |
| settings/compliance/actions.ts | get/updateComplianceTemplate | compliance_templates nicht-core |
| settings/payment-terms/actions.ts | create/update/delete/setDefault | payment_terms_templates nicht-core |
| settings/template-actions.ts (post-RPT-402) | createEmailTemplate / updateEmailTemplate / deleteEmailTemplate / duplicateSystemTemplate | email_templates nicht-core, assertNotReadOnlyContext first line (RPT-402-Patch) |

### campaigns/[id]/actions.ts — non-core
| Funktion | Op | Tabelle | Notes |
|---|---|---|---|
| createCampaignLink | INSERT | campaign_links | nicht-core |
| deleteCampaignLink | DELETE | campaign_links | nicht-core |

### audit-log/actions.ts — read-only
| Funktion | Op | Notes |
|---|---|---|
| getAuditLogs / getAuditLogCount | SELECT | read-only, kein Mutate |

### kalender/actions.ts — read-only
| Funktion | Op | Notes |
|---|---|---|
| getCalendarEventsForRange | SELECT | read-only |

### app/actions/*.ts — Tranche 2 (Service-Level)
| Datei | Funktion | Op | Tabelle | Notes |
|---|---|---|---|---|
| actions/meetings.ts | startMeeting (post-RPT-402: korrigiert vs. createMeetingFromSlot) | INSERT | meetings | owner = Host-User (DEC-186), assertNotReadOnlyContext first line (RPT-402-Patch) |
| actions/meetings.ts | startMeeting (interner activity-Insert-Pfad) | INSERT | activities | owner = meeting.owner_user_id (DEC-186-Cascading) |
| actions/consent.ts | upsert/revokeConsent | * | consents | nicht-core |
| actions/deal-products.ts | linkDealProduct / unlinkDealProduct | * | deal_products | nicht-core |
| actions/goals.ts | save/deleteGoal | * | goals | nicht-core (User-bezogen, owner-bezogen ueber FK) |
| actions/kpi-snapshots.ts | (Cron-Pfad) | INSERT | kpi_snapshots | nicht-core, kein assertNotReadOnly |
| actions/products.ts | createProduct / updateProduct / deleteProduct | * | products | nicht-core |
| actions/user-settings.ts | updateUserSettings | UPDATE | user_settings | nicht-core |
| actions/activity-kpis.ts | (read-only) | SELECT | n/a | read-only |

### lib/actions/*.ts — Tranche 2 (Service-internal)
| Datei | Funktion | Op | Tabelle | Notes |
|---|---|---|---|---|
| lib/actions/activity-actions.ts | createActivity (post-RPT-402) | INSERT | activities | owner = caller's profile or passed-in, assertNotReadOnlyContext first line |
| lib/actions/activity-actions.ts | completeActivity / deleteActivity (post-RPT-402) | UPDATE / DELETE | activities | assertNotReadOnlyContext first line |
| lib/actions/insight-actions.ts | approveInsightAction / rejectInsightAction (post-RPT-402) | INSERT | activities | owner = approver user, assertNotReadOnlyContext first line; batch wrapper inherits via single-item call |
| lib/actions/document-actions.ts | uploadDocument / deleteDocument | * | documents | nicht-core |
| components/insights/insight-actions.ts | saveInsight | INSERT | activities | macht selbst `supabase.from("activities").insert(...)` (Zeile 59) — KEIN reiner UI-Wrapper. SLC-713 MT-1: `await assertNotReadOnlyContext()` first line. |

## 2) Cron-Endpoints (AC4)

Pfad: `cockpit/src/app/api/cron/<name>/route.ts`. Cron-Inserts in Kerntabellen erben Owner vom Source-Record.

| Cron | Datei | Insert-Tabelle | Source | Post |
|---|---|---|---|---|
| followups | api/cron/followups/route.ts | activities | source: deal | owner = deal.owner_user_id |
| meeting-briefing | api/cron/meeting-briefing/route.ts | activities (2 Stellen) | source: meeting | owner = meeting.owner_user_id |
| signal-extract | api/cron/signal-extract/route.ts | ai_signals (nicht-core) | source: meeting/mail | dokumentiert, nicht-core |
| automation-runner | api/cron/automation-runner/route.ts | n/a direkt | dispatcher.ts | siehe MT-6 |
| meeting-summary | api/cron/meeting-summary/route.ts | activities | source: meeting | owner = meeting.owner_user_id |
| call-processing | api/cron/call-processing/route.ts | activities | source: call | owner = call.owner_user_id |
| recording-retention | api/cron/recording-retention/route.ts | calls (UPDATE) | n/a | UPDATE only, owner bleibt |
| imap-sync | api/cron/imap-sync/route.ts | email_messages | source: user_imap_config | owner = imap_config.user_id |
| pending-consent-renewal | api/cron/pending-consent-renewal/route.ts | n/a | n/a | nicht-core |
| click-log-cleanup | api/cron/click-log-cleanup/route.ts | n/a (DELETE) | n/a | DSGVO-Cleanup |
| classify | api/cron/classify/route.ts | (mehrere Updates) | n/a | UPDATE-only |
| meeting-recording-poll | api/cron/meeting-recording-poll/route.ts | n/a | n/a | nur poll |
| meeting-reminders | api/cron/meeting-reminders/route.ts | n/a | n/a | nur push |
| meeting-transcript | api/cron/meeting-transcript/route.ts | n/a | n/a | nur poll |
| embedding-sync | api/cron/embedding-sync/route.ts | knowledge_chunks | nicht-core | dokumentiert |
| expire-proposals | api/cron/expire-proposals/route.ts | proposals (UPDATE) | n/a | UPDATE only, owner bleibt |
| retention | api/cron/retention/route.ts | n/a | n/a | DSGVO-Cleanup |
| kpi-snapshot | api/cron/kpi-snapshot/route.ts | kpi_snapshots | nicht-core | dokumentiert |
| cadence-execute | api/cron/cadence-execute/route.ts | activities (cadence-steps) | source: cadence-step | owner = cadence.owner_user_id |

**Real Insert-in-core-Tabelle Cron-Endpoints (5+ scope, OTQ 7 deckt):**
1. **followups** — INSERT activities ← deal.owner_user_id
2. **meeting-briefing** — INSERT activities ← meeting.owner_user_id (2 Stellen)
3. **meeting-summary** — INSERT activities ← meeting.owner_user_id
4. **call-processing** — INSERT activities ← call.owner_user_id
5. **imap-sync** — INSERT email_messages ← imap_config.user_id
6. **automation-runner** — INSERT via dispatcher (siehe MT-6)
7. **cadence-execute** — INSERT activities ← cadence.owner_user_id

## 3) Workflow-Engine + Webhook-Inserts (AC5, AC6)

| Datei | Funktion | Insert-Tabelle | Owner-Quelle |
|---|---|---|---|
| lib/automation/dispatcher.ts | dispatch | n/a (orchestrator) | passt triggerSource.owner_user_id durch |
| lib/automation/actions/create_task.ts | createTaskAction | activities | triggerSource.owner_user_id |
| lib/automation/actions/create_activity.ts | createActivityAction | activities | triggerSource.owner_user_id |
| lib/automation/actions/send_email_template.ts | sendEmailTemplateAction | email_messages | triggerSource.owner_user_id |
| api/webhooks/voice-agent/route.ts | (handler) | calls + activities | user_id aus Call-Payload (SIP-User) |
| lib/imap/sync-service.ts | sync | email_messages | imap_config.user_id |
| lib/imap/contact-matcher.ts | match | contacts (UPDATE) | nicht-relevant (Update kein Insert) |
| lib/meetings/ad-hoc-contacts.ts | createAdHocContacts | contacts | meeting.owner_user_id (Caller) |
| lib/cadence/engine.ts | executeStep | activities | cadence.owner_user_id |
| lib/cadence/abort.ts | abort | n/a (UPDATE) | n/a |
| lib/ai/followup-engine.ts | generate | activities + audit_log | source.owner_user_id |
| lib/ai/signals/applier.ts | apply | activities | source.owner_user_id |
| lib/duplicate-check.ts | (read-only) | n/a | n/a |

## 4) Read-Only-Endpoints (kein Mutate, kein Wiring)

Nur SELECT-Pfade — kein owner_user_id-Wiring noetig (RLS uebernimmt via `can_see_owner`):
- audit-log/actions.ts
- kalender/actions.ts
- alle `get*`-Funktionen der oben gelisteten Action-Files
- alle `list*`-Funktionen
- api/deals/typeahead, api/campaigns/[id]/performance, api/campaigns/[id]/export

## 5) Helper-Funktionen die NICHT direkt assertNotReadOnlyContext brauchen

Funktionen die nur AUS Server Actions oder Crons aufgerufen werden, brauchen den Guard nicht selbst — der Top-Level-Caller hat ihn bereits. Ausgenommen sind Funktionen, die direkt einen Request-Pfad bedienen (z.B. API-Routes).

- lib/actions/*.ts — werden von Server Actions gerufen, Top-Level haelt Guard
- lib/automation/actions/*.ts — werden von dispatcher.ts gerufen (Cron-Kontext, kein Drilldown)
- lib/cadence/*.ts — Cron-Kontext
- lib/imap/*.ts — Cron-Kontext
- lib/ai/*.ts — Cron-Kontext oder API-Route

## 6) Total-Inventar

- **27** Action-Files in `(app)/<domain>/actions.ts`
- **8** Service-Action-Files in `app/actions/*.ts`
- **3** Lib-Action-Files in `lib/actions/*.ts`
- **1** Team-Action-File in `lib/team/actions.ts` (SLC-703, kein V7-Wiring noetig)
- **19** Cron-Endpoints in `api/cron/*/route.ts`
- **1** Dispatcher in `lib/automation/dispatcher.ts`
- **3** Workflow-Action-Files in `lib/automation/actions/*.ts`
- **6** Service-internal-Insert-Files (sync-service, ad-hoc-contacts, followup-engine, signals-applier, voice-agent-webhook, calcom-webhook-handler)

### Mutate-Funktionen-Count nach Kategorie

| Kategorie | Mutate-Count |
|---|---|
| `(app)/*/actions.ts` (User-Facing Server Actions) | ~55 |
| `app/actions/*.ts` (Service-Level Server Actions) | ~12 |
| `lib/actions/*.ts` (Service-Internal Server Actions) | ~6 |
| Cron-Endpoints (insert/update in core tables) | ~10 |
| Workflow-Action-Files | 3 |
| Lib-Service-Internal Inserts | ~10 |
| **Total Mutate-Funktionen** | **~96** |

INSERT-Punkte in 8 Kerntabellen (alle Layer zusammen):

| Kerntabelle | INSERT-Stellen |
|---|---|
| companies | 3 (createCompany, leads-intake, ad-hoc TBD) |
| contacts | 4 (createContact, leads-intake, ad-hoc-contacts, IMAP) |
| deals | 1 (createDeal) |
| activities | ~22 (pipeline, aufgaben, calls, meetings, mein-tag, focus, automation, dispatcher, crons) |
| meetings | 2 (createMeeting, calcom-webhook) |
| proposals | 3 (createProposalLegacy, createProposal, createProposalVersion) |
| email_messages | 3 (sendEmail, send-action.ts Composing, IMAP-sync) |
| calls | 2 (createCall, voice-agent-webhook) |

## 7) Implementation Strategy

### Tranche 1 — Direct INSERT in Core-Tables (createX-Actions)
- pipeline/actions.ts → createDeal (deals)
- companies/actions.ts → createCompany
- contacts/actions.ts → createContact
- meetings/actions.ts → createMeeting (Host-Owner)
- calls/actions.ts → createCall (Click-to-Call-User)
- proposals/actions.ts → createProposal + createProposalLegacy + createProposalVersion
- emails/compose/send-action.ts → INSERT email_messages
- aufgaben/actions.ts → createTask + createFollowUpTask (activities)

### Tranche 2 — assertNotReadOnlyContext auf alle Top-Level-Mutates
- Alle Mutate-Funktionen in `(app)/*/actions.ts` + `app/actions/*.ts` + `lib/actions/*.ts` + `lib/team/actions.ts`

### Tranche 3 — Cron-Owner-Inheritance
- followups, meeting-briefing, meeting-summary, call-processing, imap-sync, automation-runner (via dispatcher), cadence-execute

### Tranche 4 — Workflow-Engine + Webhooks
- dispatcher.ts: `triggerSource.owner_user_id` durchreichen
- automation/actions/{create_task, create_activity, send_email_template}: owner-Param annehmen
- voice-agent webhook: Owner aus SIP-User-Mapping
- ad-hoc-contacts: Owner = meeting-Caller
- followup-engine + signals-applier: Owner aus source

## 8) Out-of-Scope (Deferred fuer spaetere V7-Slices)

- ~~Bulk-Reassign-UI (SLC-707)~~ — **delivered in SLC-707**, siehe Section 10 (Post-V7-Mutate-Pfade).
- ~~Drilldown `/team/[user_id]/...` Routes (SLC-706)~~ — **delivered in SLC-706 + SLC-712a/b**.
- ~~/team Aggregat-Queries (SLC-705)~~ — **delivered in SLC-705**.
- Listing-Filter (RLS uebernimmt transparent)
- Eslint-Custom-Rule "every mutate Server Action must call assertNotReadOnlyContext" (Defense-in-Depth, dokumentiert)

## 9) Abnahme-Kriterien

- AC1 (dieses Audit-File) — DONE mit dieser Datei.
- AC2..AC10 — siehe Slice-Verifikations-Plan.

## 10) Post-V7 Mutate-Pfade — SLC-707 + V6.6 nachgetragen (SLC-713 MT-3)

Eintraege, die in der ursprünglichen V7-SLC-704-Audit-Erfassung fehlten und in SLC-713
(V7.1 Defense-in-Depth-Polish) nachgetragen wurden. Synchron mit ISSUE-069-Resolution.

### lib/team/bulk-reassign-actions.ts — SLC-707 Bulk-Reassign Server Actions
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| bulkReassignPreview | SELECT | (read-only Preview) | n/a | n/a | RBAC-Gate via assertCanReassign, kein Mutate |
| bulkReassignApply | UPDATE | deals + activities + meetings + proposals + calls + email_messages + companies + contacts | nein | JA | SLC-713 MT-1: `await assertNotReadOnlyContext()` first line. 4 Defense-Gates (Validation + Role-Check + Team-Scope + Initiated-Audit) + Tx mit SET LOCAL ROLE postgres + Applied-Audit. Audit-Helpers in lib/team/bulk-reassign.ts. |

### lib/team/bulk-reassign.ts — Audit-Helpers (Pure-Core, kein "use server")
| Funktion | Op | Tabelle | Notes |
|---|---|---|---|
| writeInitiatedAudit | INSERT | audit_log | Pre-Tx-Eintrag mit `bulk_reassign_initiated` action. Bleibt bei Rollback erhalten (Forensik-Trail vor Privileg-Eskalation). |
| writeAppliedAudit | INSERT | audit_log | Innerhalb Tx, ein Eintrag pro betroffene Tabelle mit affected_rows + audit_initiated_id-Link. Wird bei Rollback mit-zurueckgerollt. |

### lib/settings/working-hours-actions.ts — V6.6 Working-Hours-Settings
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| getWorkingHoursSettings | SELECT | user_settings | n/a | n/a | read-only |
| updateWorkingHoursSettings | UPSERT | user_settings | nein | JA | SLC-713 MT-1: `await assertNotReadOnlyContext()` first line. Schreibt working_hours_start/end pro user (CHECK-Constraint MIG-032). |

### lib/ki-workspace/reports/winloss-persist.ts — V6.6 Manueller Win/Loss-Run-Pfad
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| classifyDealStatus | SELECT | deals | n/a | n/a | read-only Lookup (won/lost/active). |
| persistManualRun | INSERT | auto_winloss_runs | nein | JA | SLC-713 MT-1: `await assertNotReadOnlyContext()` first line. Extrahiert aus winloss.ts in V7.1 SLC-713 als Pure-Helper (kein "use server"), damit der Audit-Insert nicht versehentlich als Server-Action exposed wird. Aufruf erfolgt nur aus `winloss.ts:runReport` nach `authorizeReport`. |

### lib/audit.ts — Zentrale Audit-Insertion (V6.4-Code, in V7-Audit nie inventarisiert)
| Funktion | Op | Tabelle | Notes |
|---|---|---|---|
| logAudit | INSERT | audit_log | Best-effort, swallow errors — Audit darf NIE eine erfolgreiche Operation blocken. Aufgerufen aus diversen Mutate-Pfaden (Workflow-Dispatcher, FollowupEngine, Signal-Extractor). |
| logAuditWithId | INSERT | audit_log | Variante mit explizit übergebener entity_id (statt actor_id-as-entity_id-Fallback). Verwendet von Cleanup-Cron (`/api/cron/click-log-cleanup`) für DSGVO-Trail. |

## 11) V7.5 Server-Actions — NL-Rule-Builder (SLC-761 MT-1, F-2 Doc-Hygiene nachgetragen)

V7.5-Server-Actions die in V7.5 SLC-753..SLC-756 entstanden sind, hier nach V7.6 SLC-761 MT-1 (F-2 Doc-Hygiene aus RPT-462) nachgetragen.

Pfad: `cockpit/src/app/(app)/mein-tag/actions/*.ts`. Alle drei Mutate-Pfade haben `assertNotReadOnlyContext()` als first line + Role-Gate `["admin","teamlead"]`. `automation_rules` ist non-core (kein owner_user_id-Wiring noetig), `audit_log` ist non-core Forensik-Trail.

### app/(app)/mein-tag/actions/sculpt-nl-rule.ts — SLC-753 MT-1
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| sculptNlRule(formData) | INSERT (via sculptor) | audit_log | JA | n/a | assertNotReadOnlyContext + role-in ["admin","teamlead"] sonst "forbidden". FormData.nlInput (5..2000 Zeichen). Ruft `sculptRule(nlInput, profile.user_id)` aus `lib/automation/sculptor.ts` (SLC-752 MT-6), das wiederum `insertAttempt()` aufruft → INSERT audit_log action='automation_rule.sculpt_attempt' mit `entity_id=sculpt_session_id`. Bedrock Claude Sonnet 4.5 eu-central-1 (DEC-211). |

### app/(app)/mein-tag/actions/preview-nl-rule.ts — SLC-754 MT-1
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| previewNlRule(schema) | SELECT (read-only) | n/a (Trockenlauf, 7-Tage-Lookback gegen deals/activities/meetings) | nein | n/a | role-in ["admin","teamlead"] sonst "forbidden". Baut synthetic AutomationRule aus SculptSuccess-Schema (kein DB-Insert) + ruft `dryRunRule(rule, daysBack=7)` aus `lib/automation/dry-run.ts` (V6.2 SLC-622 DEC-132-Reuse). Liefert DryRunResult mit hits + would_run_actions. Kein assertNotReadOnlyContext noetig (read-only). |

### app/(app)/mein-tag/actions/apply-nl-rule.ts — SLC-754 MT-2
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| applyNlRule(input) | INSERT | automation_rules + audit_log | JA | n/a (non-core) | assertNotReadOnlyContext + role-in ["admin","teamlead"] sonst "forbidden". Re-Validate gegen SculptSuccessSchema (Defense-in-Depth gegen Edit-zwischen-Sculpt-und-Apply). `assertNotDuplicateRuleDb()`-Gate (SLC-752 MT-7). INSERT automation_rules mit `created_via='nl_sculptor'` + `status='active'` + `created_by=profile.user_id`. INSERT audit_log action='automation_rule.create_via_nl' mit Sculpt-Metadata (`sculpt_audit_id`-Link, `sculptor_cost_usd`, `edited_in_form`). revalidatePath /settings/automation + /mein-tag. |

### lib/automation/nl-history.ts — SLC-752 MT-8 (Service-Helper, kein "use server")
| Funktion | Op | Tabelle | Pre | Post | Notes |
|---|---|---|---|---|---|
| listNlSculptHistory(supabase, options) | SELECT | audit_log | n/a | n/a | Read-only Listing der letzten Sculpt-Attempts (success/reject/validation_fail/infra_fail) fuer SLC-756 Inspection-Log-UI auf `/settings/workflow-automation/nl-history`. ownerScope-Param fuer Member-Scope vs Admin/Teamlead-Scope. RLS-Filter via Supabase-Client. Limit 1..200 (default 50). Konsumiert von `app/(app)/settings/workflow-automation/nl-history/page.tsx`. Kein eigener "use server"-Wrapper — wird aus Server-Component aufgerufen. |

### Sicherheitsmodell V7.5 NL-Rule-Builder

- Doppelter Role-Gate: Server-side `role-in ["admin","teamlead"]` in jeder der drei Mutate-Actions + Client-side Server-Side-Guard in `nl-rule-builder-card.tsx`/`nl-builder-inline.tsx` (Defense-in-Depth).
- Sculptor-Cost-Tracking: jeder Bedrock-Call schreibt `totalCostUsd` + `attemptCount` ins `audit_log.context` (Forensik fuer Cost-Anomalien).
- Sculpt-Session-ID: UUID die ueber Re-Prompt-Loop hinweg stabil bleibt — verlinkt `sculpt_attempt` mit `create_via_nl`-Eintrag fuer End-to-End-Forensik.
- Schema-Re-Validation: zwischen Sculpt und Apply kann der User die Schema-Karte editieren — `applyNlRule` revalidiert gegen Zod-Schema, niemals trust-the-client.
- Soft-Dedup: identische bestehende Rule blockiert Apply mit `existing_rule_id`-Hint (User-UX) statt silent-skip.
