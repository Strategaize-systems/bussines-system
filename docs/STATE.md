# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: **V6.5 SLC-655 fully done 2026-05-08** (RPT-355 backend + RPT-356 /qa PASS). VIES-Online-Lookup-Adapter mit DB-Cache + UI-Status-Badge live. Container `app-...100749527805` healthy auf Image `90ba2f7`. MIG-030 verifiziert (8 Spalten + 3 Indexes + RLS aktiv, 0 rows clean state). **VIES-API-Connectivity vom App-Container Live-bestaetigt** (wget gegen ec.europa.eu/taxation_customs/vies/rest-api liefert valides JSON mit erwarteten Feldern). Wiring beide Forms verifiziert. Build/Vitest 430/430/Lint 168/55 (+2 documented). 9/10 ACs voll erfuellt; AC-9 partial (Browser-CRUD-Flow nicht direkt, aber Connectivity + Wiring bestaetigt).
- Current Phase: V6.5 in Umsetzung. 5/7 Slices fully done (SLC-651 + SLC-652 + SLC-653 + SLC-654 + SLC-655). Theming + UI-Refactor + 1. Compliance-Slice abgeschlossen.

## Immediate Next Steps
1. **/backend SLC-656 DE-§13b Reverse-Charge** (BL-421) — naechster V6.5-Slice. EU-Empfaenger im DE-Branding-Mode mit § 13b UStG Reverse-Charge-Block in PDF.
2. **(Optional, 5 Min)** Visuelle User-Form-Smoke `/settings/branding` mit echter NL-BTW gegen Production-VIES (Badge-States visuell bestaetigen).
3. **(Naechster Major-Schritt nach V6.5)** /requirements V7 — Multi-User + Teamlead (FEAT-502+503).
4. **(Parallel optional)** /post-launch V6.4 — 24h-Live-Beobachtung gegen Monitoring-Schwellen (RPT-342): Container-Restart-Count, 5xx-Errors, ai_signal_extract_run ~12/h, ai_followup_run ~4/Tag, 0 `proposals.value`-Errors.
5. **(Optional, nicht zeitkritisch)** Coolify-Cron `click-log-cleanup` anlegen — Snippet siehe RPT-335. Frueheste Wirkung 2026-08-04 (90d nach V6.2-Deploy).
6. **(Naechster Major-Schritt nach V6.5)** /requirements V7 — Multi-User + Teamlead (FEAT-502+503) plus 3 V7-Audit-Defer-Items (BL-425 + BL-437 + BL-439).
7. **(Pre-Production-spaeter)** ISSUE-042 OpenAI-Key + Compliance-Gate vor erstem Kunden-Live-Call (per User-Direktive 2026-05-01 "kommt viel spaeter").

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
- V2..V4.3, V5, V5.1, V5.2, V5.3, V5.4, V5.5, V5.5.1, V5.6, V5.7, V6, V6.1, V6.2, V6.3, V6.4

**Active:**
- (none — V6.4 released 2026-05-07, /post-launch ausstehend)

**Planned (Reihenfolge):**
- V6.5 — Hintergrund-Sprint parallel zu V7-Vorbereitung (8 BLs): BL-441 Theming-Sprint (Brand-Tokens + UA-011/012/013), BL-436 UA-002 Settings-Pages, BL-438 UA-007 ViewToggle generisch, BL-440 UA-009 Pipeline-PageHeader, BL-420 VIES-VAT-Lookup, BL-421 DE-§13b-Reverse-Charge, BL-424 Source-zu-Kampagne Bulk-Migration, BL-430 npm audit --force.
- V7 — Multi-User + Teamlead (Routing/Territories + Teamlead-Rolle, reduzierter Scope) (3 BLs aus V6.4-Audit-Defer): BL-437 Sidebar-VERWALTUNG-Split (Multi-User-Sidebar baut um), BL-439 Pipeline-Stages Soft-Disable (Pipeline-Owner-Filter touched Stages), BL-425 Multi-Touch-Journey-Tab.
- Ungeplant (parkiert): BL-397 GitHub-App Org-Anbindung (Infra-Hygiene), BL-435 Natural-Language-Regel-Builder (zu gross fuer naechsten Sprint).
- Pre-Production-Compliance-Gate (irgendwann vor erstem Kunden-Live-Call) — Anwaltspruefung COMPLIANCE.md + Azure-EU-Whisper-Switch + ISSUE-042 — laut User 2026-05-01 NICHT prioritaer

## Blockers
- aktuell keine

## Last Stable Version
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
26 Releases deployed (REL-001..REL-026). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG + Asterisk PBX + Whisper-Adapter (openai-Default, Azure-EU Code-Ready ab V5.2) + E-Mail Composing Studio (V5.3) + E-Mail-Anhaenge (V5.4) + Angebot-Erstellung mit pdfmake (V5.5) + Workflow-Automation + Kampagnen-Attribution (V6.2) + Hygiene-Sprint (V6.4). Hosting: Hetzner CPX32 via Coolify. V6.4 (REL-026) bringt System-Stabilitaet (ISSUE-057-Fix), DSGVO Click-Log-Retention-Cron, ~728 Zeilen Code-Cleanup, 5 UI-Cleanup-Items, audit_log-Symmetrie ueber alle AI-Engines. Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung COMPLIANCE.md + Switch auf Azure-EU-Whisper. ISSUE-042 (OpenAI-Key in untrackter Datei, NIE committed) ist Pre-Pflicht vor erstem produktivem Whisper-Call.
