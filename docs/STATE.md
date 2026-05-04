# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: **V5.7 SLC-571 4/9 MTs done + Browser-Smoke Live-PASS 2026-05-04.** Pre-Apply-Audit zeigte 7%-Legacy-Rows in Live-DB → User-Klaerung erweitert Scope um globalen `business_country`-Switch (DE/NL). DEC-122 supersedet, DEC-128 dokumentiert finale Strategie. MT-1 MIG-028 angewendet auf Hetzner (5 additive Aenderungen, idempotent verifiziert). MT-2 vat-id.ts Validation-Layer mit 30/30 Vitest-Cases gruen. MT-3 Branding-Settings hat Country-Dropdown + vat_id-Feld kontextabhaengig validiert (Browser-Smoke 5/5 PASS). MT-4 Company-Stammdaten vat_id-Feld mit EU-General-Validation (Browser-Smoke 5/5 PASS via RPT-292). TS-Build clean, 184/184 Tests gruen. Naechste = MT-5 useReverseChargeEligibility-Hook (NL-Mode-only in V5.7).
- Current Phase: V5.7 — SLC-571 in_progress (4/9 MTs done), naechste = /backend SLC-571 MT-5+MT-6 (Eligibility-Hook + Editor-Country-Filter-Dropdown)

## Immediate Next Steps
1. **User: Coolify-Redeploy Business System** mit aktuellem Code-Stand (commit folgt) — Browser-Smoke MT-3 + MT-4 ist nach Deploy ausstehend (Settings-Page + Company-Edit).
2. **/backend SLC-571 MT-5** — useReverseChargeEligibility-Hook implementieren mit Vitest. Logic: nur `business_country='NL'` ist V5.7-Scope; `business_country='DE'` -> Toggle disabled mit Tooltip "Reverse-Charge in DE-Mode (§ 13b UStG) nicht in V5.7-Scope, BL-421". 3 NL-Voraussetzungen: branding.vatId NOT NULL + companies.vat_id NOT NULL + companies.address_country in EU_COUNTRY_CODES != 'NL'.
3. **/backend SLC-571 MT-6** — Editor-Steuersatz-Dropdown filtert nach business_country (DE: 0/7/19, NL: 0/9/21, plus Legacy-Wert wenn persistiert) + Reverse-Charge-Section.
4. **Sequentiell danach** MT-7 (saveProposal-Validation), MT-8 (PDF-Block), MT-9 (COMPLIANCE.md + Cockpit-Records-Final).
5. **(Passiv)** Coolify-Cron `meeting-briefing` Erst-Lauf-Verifikation V5.6.
6. **Nach 24-48h Stable-Window V5.6**: /post-launch V5.6 (kann V5.5/V5.5.1/V5.4/V5.3 mitnehmen).

## Spaeter (nicht jetzt)
- Pre-Production-Compliance-Gate (Anwaltspruefung COMPLIANCE.md + Azure-EU-Whisper-Switch + ISSUE-042) — User-Hinweis 2026-05-01: "kommt viel spaeter"
- BL-397 GitHub-App Org-Anbindung (Infra-Hygiene)
- V6.2 — Workflow-Automation (BL-135) + Kampagnen-Attribution (BL-139), aus V7 ausgelagert
- V7 — reduziert auf Multi-User + Teamlead (FEAT-502/503)

## Active Scope
**V5.7 — NL+DE-Compliance + Polish (in_progress, Slice-Planning + 4/9 MTs done 2026-05-04):**
- SLC-571 NL+DE-VAT-Saetze + Reverse-Charge (in_progress, FEAT-571, 9 MTs):
  - DONE: MT-1 MIG-028 (5 additive Aenderungen, idempotent angewendet auf Hetzner), MT-2 vat-id.ts Validation-Layer (30/30 Vitest gruen), MT-3 Branding-Settings (Country-Dropdown + vat_id), MT-4 Company-Stammdaten vat_id-Feld.
  - PENDING: MT-5 useReverseChargeEligibility-Hook, MT-6 Editor-Steuersatz-Dropdown gefiltert pro business_country + Reverse-Charge-Section, MT-7 saveProposal Server-Action-Validation + Audit-Log, MT-8 PDF-Renderer reverse-charge-block.ts + Footer-vat_id-Block, MT-9 COMPLIANCE.md + Cockpit-Records-Final.
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
