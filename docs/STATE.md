# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: **V7.1 RELEASED 2026-05-16 als REL-030** (Image-Tag `770dd55`). 5 Slices SLC-711..714 deployed (Polish-Sprint nach V7-Walkthrough + Post-Smoke-Hotfix SLC-714 KI-Workspace-Hide im Drilldown). Coolify-Redeploy von main durchgefuehrt durch User. Live-Smoke RPT-427 via Playwright-MCP gegen Production-HEAD `770dd55` PASS (19/19 DOM-Assertions). 779/779 Vitest PASS. Internal-Test-Mode bleibt aktiv. ISSUE-069 + ISSUE-070 + ISSUE-075 resolved durch SLC-713 + User-Cleanup. Accepted Risks aus V7 unveraendert: ISSUE-066 V7.5-Mitigation, ISSUE-071 weekly Cron User-Pflicht, ISSUE-073 + ISSUE-074 V7.2-Cleanup, ISSUE-058 + fast-uri pre-existing.
- Current Phase: V7.1 **deployed**. Naechster Schritt: /post-launch V7.1 in ~24h (Disk-Usage-Trend + Container-Health + Audit-Log-Volume). Parallel: User-Action weekly Coolify-Cron fuer ISSUE-071.

## Immediate Next Steps
1. **(Mainline) /post-launch V7.1** in ~24h — Production-Stability-Check auf Image-Tag `770dd55`. Beobachten: Disk-Usage-Trend (ISSUE-071), Container-Healthchecks, Audit-Log-Volume, KI-Workspace-Errors weg.
2. **(Parallel User-Action) ISSUE-071 Coolify-Cron** — User richtet weekly Disk-Cleanup ein (`docker builder prune -af && docker image prune -af`). Snippet in KNOWN_ISSUES.md. Pure User-Aktion, kein Code-Change.
3. **(Optional) 2. Post-Launch-Check @24h** — In ~9h erneuter Live-Check fuer volle 24h-Schwelle. Aktuell ~15h erreicht. Nicht release-blocking.
4. **(nach V7.1, vor V7.5)** /requirements V7.2 — Test-Infra-Cleanup-Sprint (~3-4h, 1 Slice). 3 Items aus Accepted Risks REL-030: ISSUE-073 Coolify-DB `npm run seed:multi-user` + Container-Bootstrap, ISSUE-074 `vitest.rls.config.ts` Path-Alias-Resolver, BL-471 qa-admin im Seed-Script. Saubere Multi-User-Test-Basis bevor V7.5 NL-Automation darauf aufsetzt.
5. **(nach V7.2)** /requirements V7.5 — Natural-Language-Automation (BL-435, ~6 Slices). Sculptor-Pattern. Inkl. ISSUE-066-Mitigation als eigener kleiner Slice (Middleware-Pfad-Check setzt X-Read-Only-Mode-Header, assertNotReadOnlyContext liest beides).
6. **(nach V7.5)** /requirements V7.6 — Custom-Reports (BL-442, ~1-2 Slices). Folgt zwingend nach V7.5.
7. **(optional)** V6.7-Polish — BL-460 (Style-Guide-V2 Hex-Drift) + BL-459 (Quick-Action-Label) + BL-418 (React #418 Hydration). 2-4h. Oder als Sub-Sprint vor V7.5: BL-455 Pflichtfelder-Modal beim Stage-Move (High-Prio UX-Fix, unabhaengig).
8. **(Optional, 5 Min)** Visuelle User-Form-Smoke `/settings/branding` mit NL-BTW gegen Production-VIES.
9. **(Optional, nicht zeitkritisch)** Coolify-Cron `click-log-cleanup` anlegen — Snippet siehe RPT-335. Frueheste Wirkung 2026-08-04.
10. **(Pre-Production-spaeter)** ISSUE-042 OpenAI-Key + Compliance-Gate vor erstem Kunden-Live-Call (User-Direktive 2026-05-01 "kommt viel spaeter").

## Spaeter (nicht jetzt)
- Pre-Production-Compliance-Gate (Anwaltspruefung COMPLIANCE.md + Azure-EU-Whisper-Switch + ISSUE-042) — User-Hinweis 2026-05-01: "kommt viel spaeter"
- BL-397 GitHub-App Org-Anbindung (Infra-Hygiene)
- V7 — reduziert auf Multi-User + Teamlead (FEAT-502/503)

## Active Scope
**V6.4 — Hygiene-Sprint (RELEASED 2026-05-07 als REL-026, Image-Tag `f99726b`):**
- FEAT-641 System-Stabilitaet & DSGVO-Hygiene (deployed 2026-05-07): ISSUE-057 FollowupEngine `proposals.value -> total_gross` Fix (3 Stellen, Spec sagte 2). BL-423 DSGVO 90-Tage-Retention `/api/cron/click-log-cleanup` neu (Pure-Function `runClickLogCleanup` + verifyCronSecret + audit_log-Trail mit run_id-as-entity_id). Vitest +12 Tests. SLC-641.
- FEAT-642 Code-Hygiene-Audit (deployed 2026-05-07): RPT-336 Audit mit 18 Items klassifiziert ueber 5 Hot-Spots. SLC-643 Cleanup: 6 Items abgeraeumt (~728 Zeilen toter Code) — CA-001/002 obsolete Crons (backfill, calcom-sync), CA-008 audit_log-Insert in FollowupEngine + Signal-Extract (DSGVO-Trail-Symmetrie), CA-015/016/017 tote Server-Actions. 12 Items als V6.5/V7-Defer dokumentiert.
- FEAT-643 UI-Hygiene-Audit (deployed 2026-05-07): RPT-338 Audit mit 13 Items klassifiziert ueber 5 UI-Bereiche + 178 Style-Guide-V2-Drift-Stellen. SLC-645 Cleanup: 5 Klar-Items umgesetzt — UA-010 Pipeline h1 text-3xl, UA-003 Einwilligungstexte rosa, UA-005 Sidebar "Termine-Liste", UA-006 Primary-CTA Green→Blue Gradient (Pipeline + Proposals), UA-001 Settings auf PageHeader. 8 Items deferred V6.5 (UA-011/012/013 Theming-Sprint via BL-441).
- 5 Slices SLC-641..645 done. 7 V6.4-DECs (DEC-145..151). Reports-Trail RPT-335..343. Vitest 405/405 PASS, Container healthy, audit_log-Trail aktiv. Internal-Test-Mode bleibt aktiv.

**V6.2 — Workflow-Automation + Kampagnen-Attribution (RELEASED 2026-05-06 als REL-024, Image-Tag `766e4ac`):**
- FEAT-621 Workflow-Automation Rule Builder (deployed 2026-05-06, FEAT-621, BL-135): 3 Trigger (deal.stage_changed, deal.created, activity.created), 4 Actions (create_task, send_email_template, create_activity, update_field), Recursion-Guard (DEC-129), Stage-Soft-Disable (DEC-133), Cron-Fallback /api/cron/automation-runner (Coolify-Cron jede Minute, picked=0 in Smoke). Builder-UI Listing + 4-Step-Wizard + Trockenlauf-Modul (DEC-132 read-only). Audit-Log-Side-Effect mit triggered_by_user_id (DEC-131). 4 dispatcher-Pfade verdrahtet (pipeline.moveDealToStage/moveDealToPipeline/createDeal + activity-actions.createActivity).
- FEAT-622 Kampagnen-Attribution + UTM-Tracking (deployed 2026-05-06, FEAT-622, BL-139): campaigns-Tabelle + 3 ALTER campaign_id auf contacts/companies/deals (ON DELETE SET NULL). 5 KPI-Cards + 3 Tabs auf Detail-Seite. Tracking-Links via /r/[token]-Redirector mit DSGVO IP-Hash (SHA-256+Salt). UTM→Campaign-Mapper hybrid (DEC-135 external_ref primary + LOWER(name)-ilike fallback). Lead-Intake POST /api/leads/intake mit Bearer EXPORT_API_KEY + First-Touch-Lock COALESCE (DEC-138). Read-API GET /api/campaigns/[id]/performance mit 12-Felder-JSON (DEC-140). Funnel-Filter Campaign-Dropdown im /pipeline-Filter-Bar (DEC-139). CSV-Export Leads + Deals.
- V6.2-Hotfix Same-Day (Commit `766e4ac`): ISSUE-055 step-trigger.tsx renderPipeline/renderStage Function-Childs (3 SelectValue-Stellen, Pattern aus ISSUE-052), ISSUE-056 settings/page.tsx Kampagnen-Link-Karte zwischen Workflow + Compliance.
- 5 Slices SLC-621..625 done. MIG-029 (3 Phasen) live. DEC-129..140 dokumentiert. RPT-310..324 Reports-Sequenz.

**V5.7 — NL+DE-Compliance + Polish (RELEASED 2026-05-05 als REL-023):**
- SLC-571 NL+DE-VAT-Saetze + Reverse-Charge (**done 2026-05-04**, FEAT-571, 9/9 MTs):
  - MT-1 MIG-028 (5 additive Aenderungen, idempotent angewendet auf Hetzner)
  - MT-2 vat-id.ts Validation-Layer (30/30 Vitest gruen)
  - MT-3 Branding-Settings (Country-Dropdown + vat_id)
  - MT-4 Company-Stammdaten vat_id-Feld
  - MT-5 useReverseChargeEligibility-Hook + countryNameToCode-Mapper (24/24 Vitest gruen + Live-PASS via RPT-294)
  - MT-6 Editor-Steuersatz-Dropdown + Reverse-Charge-Section + createProposal-Default NL=21/DE=19 + zod-Whitelist {0,7,9,19,21} (TSC + 208/208 Vitest + Build + Lint clean, Browser-Smoke 7/7 PASS via RPT-294)
  - MT-7 saveProposal Server-Action-Validation + Audit-Insert (Pure-Function validateReverseCharge mit 4 Reject-Pfaden, 14/14 Vitest gruen, Live-Smoke PASS via RPT-296)
  - MT-8 PDF-Renderer reverse-charge-block.ts + proposal-renderer.ts MODIFY (bilingualer Block + Strategaize-vat_id-Footer, 8 neue Vitest-Cases inkl. 3 Snapshots, AC21 regression-frei, **TSC + 231/231 Vitest + Build + Lint clean, Live-Smoke 4/4 PDFs PASS via RPT-298** gegen cecfe9e: AC18+AC19+AC20+AC21 alle verifiziert, Type-Lie-Fix in actions.ts PDF-Path-Selects)
  - MT-9 COMPLIANCE.md V5.7-Section + Cockpit-Records-Sync 2026-05-04
  - Scope-Erweiterung: User-Klaerung nach Pre-Apply-Audit (7%-Legacy-Rows) → globaler business_country-Switch DE/NL. DEC-122 supersedet, DEC-128 finale Strategie. Whitelist {0,7,9,19,21}.
- SLC-572 Skonto-Toggle UI-State-Drift Bugfix (**done 2026-05-04**, FEAT-572, 4/4 MTs):
  - MT-1 Investigation: Race-Pfad identifiziert (User clear-input → SkontoSection.onChange(null, days) → patchAndSave → optimistic state {null, X} → server validateSkonto rejects both-or-neither → State bleibt invalid → Toggle visuell OFF). Pattern-Erweiterung-Decision: PaymentTermsDropdown + SplitPlanSection out-of-scope (andere Persist-Pfade, kein Race). DEC-126 Option A bestaetigt.
  - MT-2 useRef + Revert-Logic: `lastKnownGoodSkontoRef` in proposal-editor.tsx initialisiert mit `proposal.skonto_*`, bei Save-Success aktualisiert via `nextSkontoRefAfterSave`, bei Save-Error revert via `onProposalChange(revertPatchIfSkontoFailed(...))`. AC2..AC6 erfuellt.
  - MT-3 Vitest: Pure-Function-Extraction `cockpit/src/lib/proposal/skonto-revert.ts` (Vitest config ist node-only ohne RTL), 16 Tests inkl. RPT-277-5x-Repro + Toggle-OFF + non-skonto-isolation. AC7+AC12 erfuellt. Volle Suite 247/247 PASS (231 vorher + 16 neu).
  - MT-4 Build/Lint/Test + Cockpit-Records: `npm run build` clean (kein neuer Type-Error in geaenderten Dateien), `npm run lint` keine neuen Findings (166 pre-existing unrelated), `npm run test` 247/247 PASS. Cockpit-Records: SLC-572 done, FEAT-572 done, BL-419 done, ISSUE-049 resolved.
- BL-420 VIES-Lookup-Integration + BL-421 DE-Reverse-Charge § 13b UStG (beide Backlog, medium prio, unassigned, fuer spaeter).

**V5.5 — Angebot-Erstellung (RELEASED 2026-05-01 als REL-020):**
- FEAT-551 Angebot-Schema-Erweiterung + Position-Items (in_progress, MIG-026 applied auf Hetzner, Server Actions + Pfad-Helper live)
- FEAT-552 Angebot-Workspace UI 3-Panel (done 2026-04-30, /proposals/[id]/edit live, native React-State + Custom-Debounce statt RHF/lodash, @dnd-kit/sortable)
- FEAT-553 PDF-Renderer + Branding (done 2026-04-30, **pdfmake** als Library DEC-105, Adapter-Pattern, /qa PASS via RPT-258, Mixed-Content-Hotfix Commit `91020b2` Server-Proxy /api/proposals/[id]/pdf live)
- FEAT-554 Status-Lifecycle + Versionierung (done 2026-04-30, /backend + /qa PASS RPT-260: Whitelist transitions.ts + 21 Vitest-Tests, transitionProposalStatus mit Idempotenz DEC-108, createProposalVersion mit V1-unangetastet DEC-109 Live-verifiziert, Auto-Expire-Cron-Endpoint /api/cron/expire-proposals DEC-110 Live + DB-Audit-Smoke PASS + Idempotenz-Check, Workspace Status-Buttons + Confirm-Dialog Live, Read-only-Mode mit Server-Side-Guard `assertProposalEditable` in 5 Mutate-Actions, /proposals-Listing Status-Badge + Anzeigen-Button mit ?readonly=1, REL-020-Notes Coolify-Cron-Anleitung, Coolify-Cron `expire-proposals` aktiv)
- FEAT-555 Angebot-Anhang im Composing-Studio (done 2026-05-01, /qa Live-Smoke PASS RPT-263: 4 Live-Mail-Sends, CHECK-Constraint Tests, 6 Browser-Smokes, Idempotenz live bewiesen in 2 Edge-Cases. ProposalAttachmentPicker + attachProposalToCompose + send.ts Bucket-Diskriminator + Junction `source_type`/`proposal_id` + idempotenter transitionProposalStatus post-send.)

**Architektur-Entscheidungen V5.5:** DEC-105 pdfmake, DEC-106 HTML-Live-Preview, DEC-107 Snapshot inkl. price_at_creation, DEC-108 Status-Sent automatisch+manuell, DEC-109 V1-Status unangetastet, DEC-110 Cron 02:00 Berlin, DEC-111 Pfad-Schema, DEC-112 alle Status zeigen+Warning, DEC-113 Footer+Suffix-Watermark, DEC-114 5 Slices 1:1 zu Features.

**Released (deployed):**
- V2..V4.3, V5, V5.1, V5.2, V5.3, V5.4, V5.5, V5.5.1, V5.6, V5.7, V6, V6.1, V6.2, V6.3, V6.4, V6.5, **V6.6**

**Active:**
- **V7 (Requirements done 2026-05-12)** — Multi-User + Teamlead-Sprint, 3 Features (FEAT-502 + 503 + 701), 19 Open Questions warten auf /architecture V7.

**Planned (Reihenfolge):**
- ~~V6.5 — Hintergrund-Sprint parallel zu V7-Vorbereitung~~ (RELEASED REL-027 2026-05-08): BL-441 Theming-Sprint (Brand-Tokens + UA-011/012/013), BL-436 UA-002 Settings-Pages, BL-438 UA-007 ViewToggle generisch, BL-440 UA-009 Pipeline-PageHeader, BL-420 VIES-VAT-Lookup, BL-421 DE-§13b-Reverse-Charge, BL-424 Source-zu-Kampagne Bulk-Migration, BL-430 npm audit --force.
- **V7.2** Test-Infra-Cleanup-Sprint (~3-4h, 1 Slice): ISSUE-073 seed:multi-user + Container-Bootstrap, ISSUE-074 vitest.rls.config.ts Path-Alias, BL-471 qa-admin im Seed-Script. Vorbereitung der Multi-User-Test-Basis fuer V7.5.
- **V7.5** Natural-Language-Automation (BL-435, hochgesetzt von medium auf high in V6.6-Discovery): Sculptor-Pattern, ~6 Slices in 3 Phasen. Inkl. ISSUE-066-Middleware-Mitigation.
- **V7.6** Custom-Reports (BL-442 neu): User legt eigene Berichts-Vorlagen an, "Meine Berichte"-Auswahlfeld neben Standard-Buttons. ~1-2 Slices, folgt zwingend nach V7.5 (Architektur-Abhaengigkeit).
- **V8+** Externe Kommunikations-API-Integration (BL-443 neu, Slack/Teams/WhatsApp). Plus Multiplikatoren-Strategie-Item.
- Backlog (kein V-Slot): BL-444 Feiertag-Logik DE/NL, BL-397 GitHub-App Org-Anbindung (Infra-Hygiene). BL-439 Pipeline-Stages-Cleanup zurueckgezogen — user-self-served in Settings.
- Pre-Production-Compliance-Gate (irgendwann vor erstem Kunden-Live-Call) — Anwaltspruefung COMPLIANCE.md + Azure-EU-Whisper-Switch + ISSUE-042 — laut User 2026-05-01 NICHT prioritaer

## Blockers
- aktuell keine

## Last Stable Version
- V7.1 — 2026-05-16 — released auf Hetzner als REL-030 (Image-Tag `770dd55`, Polish-Sprint nach V7-Walkthrough: 5 Slices SLC-711..714 deployed. SLC-711 Settings-Permission-Layer fuer 11 Sub-Pages (Admin/Teamlead/Member-Matrix DEC-196). SLC-712a Pipeline-Drilldown via PipelineView-Reuse (readOnly + viewAsUserId Pattern DEC-199/200). SLC-712b Aufgaben + Mein-Tag Drilldown analog. SLC-713 V7-Defense-in-Depth Polish (4 first-line Guards + Audit-Doc-Sync, ISSUE-069 + ISSUE-070 resolved). SLC-714 Post-Smoke-Hotfix (BL-472 KI-Workspace im Drilldown-MeinTag komplett ausgeblendet). Keine Schema-Migration. Vitest 779/779 PASS. RPT-413..427. Live-Smoke RPT-427 (19/19 DOM-Assertions via Playwright-MCP). Accepted Risks: ISSUE-066 V7.5-Mitigation, ISSUE-071 weekly Cron User-Pflicht, ISSUE-073 + ISSUE-074 V7.2-Cleanup, ISSUE-058 + fast-uri pre-existing.)
- V7 — 2026-05-14 — released auf Hetzner als REL-029 (Image-Tag `2131ec7`, Multi-User + Teamlead-Sprint: 7 Slices SLC-701..707, 3 Features FEAT-502/503/701 + Patches BL-465/467/470 alle deployed. MIG-033 + MIG-034 + MIG-035 (3-Phasen V7-RLS-Switch + 4 Helper-Functions + view_as-Audit-Spalte) applied. Multi-User-Mode operational — Admin kann Teamleads + Members einladen, Teamlead sieht Team-Aggregat-Cockpit + Read-Only-Drilldown. Bulk-Reassign live verifiziert (174 Records + 9 audit_log-Eintraege RPT-409), Mobile-Hamburger live, Invite-Mail-Flow End-to-End live verifiziert (RPT-411 mit immo@bellaerts.de). Vitest 756/756 PASS. Internal-Test-Mode aufgeloest. RPT-393..411. Accepted Risks: ISSUE-066 AsyncLocalStorage-Drilldown-Gap (V7.5-Mitigation), ISSUE-069 Audit-Doc stale (V7.1-Polish BL-466), ISSUE-070 4 Defense-in-Depth-Guards (V7.1-Polish BL-466), ISSUE-058 postcss-CVE pre-existing, ISSUE-071 Disk-Voll-Risiko Workaround applied (User-Pflicht-Action Coolify-Cron einrichten).)
- V6.6 — 2026-05-11 — released auf Hetzner als REL-028 (Image-Tag `360c6ec`, Pre-V7-Audit-Sprint: 7 Slices SLC-661..667, 6 Features FEAT-661..666 alle deployed. KI-Workspace-Hybrid-Pattern auf 3 Pages (Mein Tag + Deal-Detail + Cockpit) via Foundation + 3 Wrapper. Deals-Listen-Restruktur (Top-10 + Type-Ahead + Pipeline-Switcher + Won/Lost-Sektionen). Dashboard zu KI-Analyse-Cockpit (6 Berichts-Buttons + 5 Quick-Actions). Win/Loss-Auto-Trigger via System-Workflow-Rule (auto_winloss_runs + 5-Min-Throttle + ISSUE-061-Fix Read-API). Kalender-Polish (06:00-21:00 Default + Working-Hours-Setting). Hygiene: SparklesCard cross-page entfernt, Sidebar-Reorder, /performance-Seite faellt. MIG-032 applied (auto_winloss_runs + user_settings.working_hours + automation_rules.is_system). 16 V6.6-DECs (DEC-165..180). Vitest 650/650 (+168 V6.6-Tests). ESLint 142e/54w (-24/-3 vs V5.7-Baseline). Audit-Trail aktiv: ai_signal_extract 286x/24h matched RPT-342, V6.6-neu ki_workspace_report 3x + auto_winloss 3x. RPT-366..389. Internal-Test-Mode bleibt aktiv. ISSUE-061 resolved, ISSUE-058+042 als bekannt-akzeptiert. 4 Low-Findings (BL-457..460 + BL-418 pre-existing) als V6.7/V7-Polish.)
- V6.5 — 2026-05-08 — released auf Hetzner als REL-027 (Hintergrund-Sprint: 7 Slices SLC-651..657, 3 Features FEAT-651..653 alle deployed. Theming-Foundation (Brand-Tokens + Pipeline+Proposals-Migration) + UI-Polish (Settings-Pages-Auslagern + ViewToggle-Generic + PageHeader-Slot) + Compliance-Erweiterung NL→DE-Symmetrie (VIES-Adapter + DE-§13b PRELIMINARY) + Hygiene (Source-Migration ready-when-needed + npm audit + ISSUE-058). MIG-030 vat_id_validations live (1 echter VIES-Cache-Eintrag). MIG-031 by-design No-Op. 12 V6.5-DECs (DEC-152..163). Image-Tag `cb491ca` Pre-Live-Burn-In 17h ohne Container-Restart. Vitest 444/444 (+39 V6.5). Lint 168/55 = V5.7-Baseline +2 (SLC-655 by-design). npm audit 0 high/0 critical/2 moderate=ISSUE-058. RPT-345..364. Internal-Test-Mode bleibt aktiv bis Compliance-Sprint.)
- V6.4 — 2026-05-07 — released auf Hetzner als REL-026 (Hygiene-Sprint: 5 Slices SLC-641..645, 3 Features FEAT-641..643 alle deployed. ISSUE-057 FollowupEngine-Bug resolved + BL-423 DSGVO Click-Log-Cleanup-Cron live + 6 Code-Cleanup-Items (~728 Zeilen) abgeraeumt + 5 UI-Cleanup-Items umgesetzt + 13 Audit-Items deferred V6.5/V7. Image-Tag `f99726b` Coolify-Redeploy 10:41 UTC. Keine Schema-Migration. Vitest 405/405 PASS, Container healthy >2h, audit_log-Trail aktiv. Internal-Test-Mode bleibt aktiv. RPT-335..343.)
- V6.3 — 2026-05-06 — released auf Hetzner als REL-025 (Polish-Bündel: SLC-631 mit 7 MTs — BL-426 Sub-Items 1-3 + BL-422 RC-Drift-Fix + ISSUE-050 Audit-Log-Render-Fix + L4 trigger-sources-Doku + L5/MT-7 npm audit + Backlog-Hygiene. Image-Tag `f7fd231` Commit `f7fd2310...`. Internal-Test-Mode bleibt aktiv. Vitest 393/393 PASS, 5 Browser-Smokes Live-bestaetigt. RPT-326+327+328.)
- V6.2 — 2026-05-06 — released auf Hetzner als REL-024 (Workflow-Automation + Kampagnen-Attribution: 5 Slices SLC-621..625, FEAT-621+622, MIG-029 alle 3 Phasen. Image-Tag `766e4ac` inkl. V6.2-Hotfix ISSUE-055 + ISSUE-056. Coolify-Cron `automation-runner` aktiv jede Minute. Internal-Test-Mode aktiv. RPT-321..324.)
- V5.7 — 2026-05-05 — released auf Hetzner als REL-023 (NL+DE-VAT-Saetze + Reverse-Charge fuer EU-B2B-Cross-Border + Skonto-Toggle UI-State-Drift Bugfix mit 3 Follow-up-Fixes nach iterativen Live-Smoke-Runden. Image-Tag 908eb81, MIG-028 live, BTW-IDs in Branding+Companies, country-aware Steuersatz-Dropdown, bilingualer Reverse-Charge-PDF-Block, Validation-Gate vor Server-Save fuer Skonto-Edit. Internal-Test-Mode bleibt aktiv. RPT-298+301..306.)
- V5.6 — 2026-05-03 — released auf Hetzner als REL-022 (Zahlungsbedingungen + Pre-Call Briefing: payment_terms_templates + Skonto + Split-Plan-Milestones + Briefing-Cron + ActivityBriefingCard, Internal-Test-Mode, Image-Tag a7b787d, MIG-027 live, Coolify-Cron meeting-briefing aktiv. Final-Smoke alle Endpoints PASS, RPT-272..286.)
- V5.5.1 — 2026-05-01 — released auf Hetzner als REL-021 (Polish-Patch: Hydration-Mitigation + 3 V5.4-Carryover. Live-Image-Tag `4415928` Coolify-Deployment-ID 173 finished 07:50:22. app-Container healthy, HTTPS-Endpoint HTTP 200. TSC + Vitest 97/97 PASS pre-Deploy.)
- V5.5 — 2026-05-01 — released auf Hetzner als REL-020 (Angebot-Erstellung: Schema+Workspace+PDF+Lifecycle+Composing-Hookup, Internal-Test-Mode, Live-Smoke PASS RPT-263 4 Mail-Sends + 6 Browser-Smokes + CHECK-Constraint-Tests, Cron expire-proposals live, MIG-026 live, V5.5-Code-Stand seit 2026-04-30 17:04 Image-Tag `417dc8a`)
- V5.4 — 2026-04-29 — released auf Hetzner als REL-019 (Composing-Studio Polish + E-Mail-Anhaenge-Upload PC-Direkt, Internal-Test-Mode, Live-Smoke PASS Multipart-Mail PDF+PNG+ZIP an Gmail + Tracking-Pixel-Open + Junction-Insert verifiziert)
- V5.3 — 2026-04-28 — released auf Hetzner als REL-018 (E-Mail Composing Studio, Internal-Test-Mode, Quick-Smoke OK)
- V5.2 — 2026-04-26 — released auf Hetzner als REL-017 (Compliance-Sprint, Smoke-Test PASS, Internal-Test-Mode)
- V5.1 — 2026-04-24 — released auf Hetzner als REL-016 (Asterisk + Call-Pipeline + SMAO vorbereitet, Internal-Test-Mode)
- V6.1 — 2026-04-21 — released auf Hetzner als REL-014 (Performance Premium UI)

## Notes
28 Releases deployed (REL-001..REL-028). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG + Asterisk PBX + Whisper-Adapter (openai-Default, Azure-EU Code-Ready ab V5.2) + E-Mail Composing Studio (V5.3) + E-Mail-Anhaenge (V5.4) + Angebot-Erstellung mit pdfmake (V5.5) + Workflow-Automation + Kampagnen-Attribution (V6.2) + Hygiene-Sprint (V6.4) + Theming-Foundation (V6.5) + KI-Workspace-Hybrid + Win/Loss-Auto-Trigger (V6.6). Hosting: Hetzner CPX32 via Coolify. V6.6 (REL-028) bringt KI-Workspace-Hybrid auf 3 Pages (Mein Tag + Deal-Detail + KI-Analyse-Cockpit), Deals-Listen-Restruktur, Win/Loss-Auto-Trigger mit 5-Min-Throttle und Kalender-Working-Hours-Setting. Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung COMPLIANCE.md + Switch auf Azure-EU-Whisper. ISSUE-042 (OpenAI-Key in untrackter Datei, NIE committed) ist Pre-Pflicht vor erstem produktivem Whisper-Call.
