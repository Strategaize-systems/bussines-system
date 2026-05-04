# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: **V5.7 SLC-571 7/9 MTs done + MT-7 QA Live-PASS 2026-05-04.** MT-5+MT-6 QA Live-PASS (RPT-294). MT-7 Code-complete (RPT-295) + **/qa Live-PASS via RPT-296** gegen 581590f Live: Audit-Insert `reverse_charge_toggled` mit sauberem Diff-Render bei Toggle-ON+OFF gruen, Reject-Pfad 2 (branding.vat_id missing) liefert exakte deutsche Fehlermeldung im Save-Indicator-Tooltip, Reject-Pfad 4 (country=NL) liefert exakte deutsche Fehlermeldung, Defense-in-Depth bewiesen (rejected Saves landen NICHT in DB — Title-Restore verifiziert). Pfad 1 + Pfad 3 via 14/14 Pure-Function-Tests + Code-Pattern-Aequivalenz abgedeckt. Pre-existing audit-log-UI-Bug erfasst (generic-update-Eintraege rendern als `[object Object]`, NICHT durch MT-7 verursacht). TSC + 222/222 Vitest + Build + Lint clean. Naechste = /backend SLC-571 MT-8 (PDF-Renderer reverse-charge-block.ts) — letzter Code-Layer-MT vor MT-9 Compliance-Doku.
- Current Phase: V5.7 — SLC-571 in_progress (7/9 MTs done + MT-7 QA-PASS), naechste = /backend MT-8 PDF-Renderer

## Immediate Next Steps
1. **/backend SLC-571 MT-8** — PDF-Renderer reverse-charge-block.ts (NEU) + proposal-renderer.ts MODIFY (Block direkt unter Tax-Row + Footer-Strategaize-vat_id-Block) + 4 Snapshot-Test-Cases (regression-frei zu V5.6 + 3 RC-Varianten). Fuer NL-VAT rechtlich erforderlich vor /go-live.
2. **/backend SLC-571 MT-9** — COMPLIANCE.md NL-VAT + Reverse-Charge-Sektion + Cockpit-Records-Final (slices/INDEX, features/INDEX, backlog.json, STATE.md aktualisieren auf SLC-571 done).
3. **(Parallel)** Pre-existing Audit-Log-UI-Renderer-Bug als BL-Item erfassen (generic-update-Eintraege zeigen `[object Object]`).
4. **(Passiv)** Coolify-Cron `meeting-briefing` Erst-Lauf-Verifikation V5.6.
5. **Nach 24-48h Stable-Window V5.6**: /post-launch V5.6 (kann V5.5/V5.5.1/V5.4/V5.3 mitnehmen).
4. **(Passiv)** Coolify-Cron `meeting-briefing` Erst-Lauf-Verifikation V5.6.
5. **Nach 24-48h Stable-Window V5.6**: /post-launch V5.6 (kann V5.5/V5.5.1/V5.4/V5.3 mitnehmen).
5. **(Passiv)** Coolify-Cron `meeting-briefing` Erst-Lauf-Verifikation V5.6.
6. **Nach 24-48h Stable-Window V5.6**: /post-launch V5.6 (kann V5.5/V5.5.1/V5.4/V5.3 mitnehmen).

## Spaeter (nicht jetzt)
- Pre-Production-Compliance-Gate (Anwaltspruefung COMPLIANCE.md + Azure-EU-Whisper-Switch + ISSUE-042) — User-Hinweis 2026-05-01: "kommt viel spaeter"
- BL-397 GitHub-App Org-Anbindung (Infra-Hygiene)
- V6.2 — Workflow-Automation (BL-135) + Kampagnen-Attribution (BL-139), aus V7 ausgelagert
- V7 — reduziert auf Multi-User + Teamlead (FEAT-502/503)

## Active Scope
**V5.7 — NL+DE-Compliance + Polish (in_progress, Slice-Planning + 7/9 MTs done + MT-5/MT-6/MT-7 QA Live-PASS 2026-05-04):**
- SLC-571 NL+DE-VAT-Saetze + Reverse-Charge (in_progress, FEAT-571, 9 MTs):
  - DONE: MT-1 MIG-028 (5 additive Aenderungen, idempotent angewendet auf Hetzner), MT-2 vat-id.ts Validation-Layer (30/30 Vitest gruen), MT-3 Branding-Settings (Country-Dropdown + vat_id), MT-4 Company-Stammdaten vat_id-Feld, MT-5 useReverseChargeEligibility-Hook + countryNameToCode-Mapper (24/24 Vitest gruen + Live-PASS via RPT-294), MT-6 Editor-Steuersatz-Dropdown + Reverse-Charge-Section + createProposal-Default NL=21/DE=19 + zod-Whitelist {0,7,9,19,21} + reverse_charge-Patch + Audit-Field (TSC + 208/208 Vitest + Build + Lint clean Code-side, **Browser-Smoke 7/7 PASS via RPT-294**), MT-7 saveProposal Server-Action-Validation + Audit-Insert (Pure-Function `validateReverseCharge` mit 4 Reject-Pfaden, 14/14 Vitest gruen, AuditAction um `reverse_charge_toggled`, Resolved-State-Computation pre-UPDATE, **TSC + 222/222 Vitest + Build + Lint clean Code-side**, **Live-Smoke PASS via RPT-296**: Audit-Insert beide Toggle-Events sichtbar mit sauberem Diff, Reject-Pfad 2 (branding) + Pfad 4 (NL country) liefern exakte deutsche Fehlermeldungen, Defense-in-Depth bewiesen).
  - PENDING: MT-8 PDF-Renderer reverse-charge-block.ts + Footer-vat_id-Block, MT-9 COMPLIANCE.md + Cockpit-Records-Final.
  - Scope-Erweiterung 2026-05-04: User-Klaerung nach Pre-Apply-Audit (7%-Legacy-Rows) → globaler `business_country`-Switch DE/NL. DEC-122 supersedet, DEC-128 finale Strategie. Whitelist `{0,7,9,19,21}`.
- SLC-572 Skonto-Toggle UI-State-Drift Bugfix (planned, FEAT-572, ~30-60min, 4 MTs): MT-1 Investigation + Pattern-Erweiterung-Decision, MT-2 useRef-Revert-Logic, MT-3 Vitest fuer Save-Error-Pfad, MT-4 Cockpit-Records.
- Reihenfolge: 571 zuerst (Schema + UI + PDF), 572 als Polish.
- BL-420 VIES-Lookup-Integration + BL-421 DE-Reverse-Charge § 13b UStG (beide Backlog, medium prio, unassigned, fuer spaeter).

**V5.5 — Angebot-Erstellung (RELEASED 2026-05-01 als REL-020):**
- FEAT-551 Angebot-Schema-Erweiterung + Position-Items (in_progress, MIG-026 applied auf Hetzner, Server Actions + Pfad-Helper live)
- FEAT-552 Angebot-Workspace UI 3-Panel (done 2026-04-30, /proposals/[id]/edit live, native React-State + Custom-Debounce statt RHF/lodash, @dnd-kit/sortable)
- FEAT-553 PDF-Renderer + Branding (done 2026-04-30, **pdfmake** als Library DEC-105, Adapter-Pattern, /qa PASS via RPT-258, Mixed-Content-Hotfix Commit `91020b2` Server-Proxy /api/proposals/[id]/pdf live)
- FEAT-554 Status-Lifecycle + Versionierung (done 2026-04-30, /backend + /qa PASS RPT-260: Whitelist transitions.ts + 21 Vitest-Tests, transitionProposalStatus mit Idempotenz DEC-108, createProposalVersion mit V1-unangetastet DEC-109 Live-verifiziert, Auto-Expire-Cron-Endpoint /api/cron/expire-proposals DEC-110 Live + DB-Audit-Smoke PASS + Idempotenz-Check, Workspace Status-Buttons + Confirm-Dialog Live, Read-only-Mode mit Server-Side-Guard `assertProposalEditable` in 5 Mutate-Actions, /proposals-Listing Status-Badge + Anzeigen-Button mit ?readonly=1, REL-020-Notes Coolify-Cron-Anleitung, Coolify-Cron `expire-proposals` aktiv)
- FEAT-555 Angebot-Anhang im Composing-Studio (done 2026-05-01, /qa Live-Smoke PASS RPT-263: 4 Live-Mail-Sends, CHECK-Constraint Tests, 6 Browser-Smokes, Idempotenz live bewiesen in 2 Edge-Cases. ProposalAttachmentPicker + attachProposalToCompose + send.ts Bucket-Diskriminator + Junction `source_type`/`proposal_id` + idempotenter transitionProposalStatus post-send.)

**Architektur-Entscheidungen V5.5:** DEC-105 pdfmake, DEC-106 HTML-Live-Preview, DEC-107 Snapshot inkl. price_at_creation, DEC-108 Status-Sent automatisch+manuell, DEC-109 V1-Status unangetastet, DEC-110 Cron 02:00 Berlin, DEC-111 Pfad-Schema, DEC-112 alle Status zeigen+Warning, DEC-113 Footer+Suffix-Watermark, DEC-114 5 Slices 1:1 zu Features.

**Released (deployed):**
- V2..V4.3, V5, V5.1, V5.2, V5.3, V5.4, V5.5, V5.5.1, V6, V6.1

**Active:**
- V5.7 — NL-Compliance + Polish (Requirements done 2026-05-03, naechste = /architecture)

**Planned (Reihenfolge):**
- V6.2 — Automation + Attribution (Workflow-Rule-Builder + Kampagnen + UTM, aus V7 ausgelagert)
- V7 — Multi-User + Teamlead (Routing/Territories + Teamlead-Rolle, reduzierter Scope)
- Pre-Production-Compliance-Gate (irgendwann vor V7) — Anwaltspruefung + Azure-EU-Whisper + ISSUE-042 — laut User 2026-05-01 NICHT prioritaer

## Blockers
- aktuell keine

## Last Stable Version
- V5.6 — 2026-05-03 — released auf Hetzner als REL-022 (Zahlungsbedingungen + Pre-Call Briefing: payment_terms_templates + Skonto + Split-Plan-Milestones + Briefing-Cron + ActivityBriefingCard, Internal-Test-Mode, Image-Tag a7b787d, MIG-027 live, Coolify-Cron meeting-briefing aktiv. Final-Smoke alle Endpoints PASS, RPT-272..286.)
- V5.5.1 — 2026-05-01 — released auf Hetzner als REL-021 (Polish-Patch: Hydration-Mitigation + 3 V5.4-Carryover. Live-Image-Tag `4415928` Coolify-Deployment-ID 173 finished 07:50:22. app-Container healthy, HTTPS-Endpoint HTTP 200. TSC + Vitest 97/97 PASS pre-Deploy.)
- V5.5 — 2026-05-01 — released auf Hetzner als REL-020 (Angebot-Erstellung: Schema+Workspace+PDF+Lifecycle+Composing-Hookup, Internal-Test-Mode, Live-Smoke PASS RPT-263 4 Mail-Sends + 6 Browser-Smokes + CHECK-Constraint-Tests, Cron expire-proposals live, MIG-026 live, V5.5-Code-Stand seit 2026-04-30 17:04 Image-Tag `417dc8a`)
- V5.4 — 2026-04-29 — released auf Hetzner als REL-019 (Composing-Studio Polish + E-Mail-Anhaenge-Upload PC-Direkt, Internal-Test-Mode, Live-Smoke PASS Multipart-Mail PDF+PNG+ZIP an Gmail + Tracking-Pixel-Open + Junction-Insert verifiziert)
- V5.3 — 2026-04-28 — released auf Hetzner als REL-018 (E-Mail Composing Studio, Internal-Test-Mode, Quick-Smoke OK)
- V5.2 — 2026-04-26 — released auf Hetzner als REL-017 (Compliance-Sprint, Smoke-Test PASS, Internal-Test-Mode)
- V5.1 — 2026-04-24 — released auf Hetzner als REL-016 (Asterisk + Call-Pipeline + SMAO vorbereitet, Internal-Test-Mode)
- V6.1 — 2026-04-21 — released auf Hetzner als REL-014 (Performance Premium UI)

## Notes
20 Releases deployed (REL-001..REL-020). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG + Asterisk PBX + Whisper-Adapter (openai-Default, Azure-EU Code-Ready ab V5.2) + E-Mail Composing Studio (V5.3) + E-Mail-Anhaenge (V5.4) + Angebot-Erstellung mit pdfmake (V5.5). Hosting: Hetzner CPX32 via Coolify. V5.5 (REL-020) bringt /proposals/[id]/edit mit native React-State + dnd-kit, pdfmake-Renderer mit Branding-Adapter + Server-Proxy-Pattern, Status-Lifecycle (draft/sent/accepted/rejected/expired) + lineare Versionierung + Auto-Expire-Cron, Composing-Studio-Hookup mit ProposalAttachmentPicker + idempotentem Auto-Sent-Trigger. Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung COMPLIANCE.md + Switch auf Azure-EU-Whisper. ISSUE-042 (OpenAI-Key in untrackter Datei, NIE committed) ist Pre-Pflicht vor erstem produktivem Whisper-Call.
