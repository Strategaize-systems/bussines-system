# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: qa
- Current Focus: **V5.6 SLC-564 /qa Live-Smoke PASS 2026-05-03 (RPT-283).** Nach User-Coolify-Redeploy auf `824734e` 4 Smoke-Bloecke gegen `business.strategaizetransition.com` durchgespielt: (1) cURL-Endpoint 3/3 PASS (401/401/200), (2) Both-off-skip + Reset PASS, (3) Browser `/settings/briefing` PASS — Trigger-Wechsel 30→60 + Both-Toggles-off + Banner sichtbar + DB-persistiert, (4) **End-to-End-CRITICAL PASS** — Test-Meeting `d1c0a843` + Cron-Trigger → `processedCount:1`, real Bedrock-Briefing-JSON (German, summary + 7 keyFacts + 6 openRisks + 5 suggestedNextSteps + confidence=18), Activity insertet mit allen V3-Spalten (type/source_type/source_id/ai_generated/deal_id/JSON-description), audit_log mit `ai_briefing_generated` + email_sent=true, Idempotenz-Re-Trigger `processedCount:0`, ActivityBriefingCard rendert komplett im Workspace mit allen 3 expandable Sections + Confidence-Badge + Timestamp. 26/28 ACs Live-PASS, AC7 partial (Push gated auf Browser-Subscription), AC18 pending nach 2. Redeploy. **1 Medium-Finding gefixt:** VAPID-ENV-Mismatch (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` → `VAPID_PUBLIC_KEY`, Server-Component-Pattern wie `/settings/meetings/page.tsx`). Erfordert zweiten User-Coolify-Redeploy. SLC-564 done.
- Current Phase: V5.6 **alle 4 Slices done — Gesamt-/qa V5.6 → /final-check → /go-live → /deploy als REL-022.**

## Immediate Next Steps
1. **Gesamt-/qa V5.6** — alle 4 Slices SLC-561..564 inklusive Cross-Cut-Smoke (Skonto-Mutex + Split-Plan + Briefing-Cron + Settings-Sidebar). Beim Cron-Endpoint: User-Coolify-Redeploy + Live-Smoke (curl mit valid + falsch + both-channels-off + End-to-End mit Test-Meeting).
2. **/final-check V5.6** — Hygiene + Dependencies + Security.
3. **/go-live V5.6** — Coolify-Cron `meeting-briefing` Anlage (Anleitung in REL-022).
4. **/deploy V5.6** — als REL-022.
5. **BL-419** UI-State-Drift nach Auto-Save-Error im Skonto-Toggle — V5.7+ (komplexer).
6. **BL-417 NL-VAT + Reverse-Charge** — Recherche + V6.0+ Slice (Strategaize Transition GmbH NL-Sitz).
7. **/post-launch V5.5 + V5.5.1** — nach 24-48h Stable-Window passiv. Auch V5.4 + V5.3 ueberfaellig.
2. **BL-418 done 2026-05-02** (PaymentTermsDropdown __custom__-Display gefixt). Verbleibend: **BL-419** (UI-State-Drift nach Auto-Save-Error im Skonto-Toggle) — komplexer, eher V5.7+.
3. **BL-417 NL-VAT + Reverse-Charge** — Recherche + V6.0+ Slice. Strategaize Transition GmbH sitzt in NL — Steuerlogik muss NL-konform werden (21/9/0% statt 19/7/0, Reverse-Charge fuer EU-B2B, BTW-Nummer-Felder, "BTW verlegd" PDF-Block). Sprache deutsch fuer dt. Kunden bleibt OK.
4. **Coolify-Cron `expire-proposals` Erst-Lauf 2026-05-02 02:00 Berlin verifizieren** — Audit-SQL aus REL-020-Notes Schritt 3. Passiv erledigen.
5. **/post-launch V5.5 + V5.5.1** — nach 24-48h Stable-Window. Auch V5.4 + V5.3 passiv ueberfaellig.

## Spaeter (nicht jetzt)
- Pre-Production-Compliance-Gate (Anwaltspruefung COMPLIANCE.md + Azure-EU-Whisper-Switch + ISSUE-042) — User-Hinweis 2026-05-01: "kommt viel spaeter"
- BL-397 GitHub-App Org-Anbindung (Infra-Hygiene)
- BL-135 + BL-139 (V7 Multi-User + Workflow-Automation + Kampagnen-Attribution)

## Active Scope
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
- V5.6 — Zahlungsbedingungen + Pre-Call Briefing (Requirements done 2026-05-01)

**Planned (Reihenfolge):**
- V7 — Multi-User + Erweiterung
- Pre-Production-Compliance-Gate (irgendwann vor V7) — Anwaltspruefung + Azure-EU-Whisper + ISSUE-042 — laut User 2026-05-01 NICHT prioritaer

## Blockers
- aktuell keine

## Last Stable Version
- V5.5.1 — 2026-05-01 — released auf Hetzner als REL-021 (Polish-Patch: Hydration-Mitigation + 3 V5.4-Carryover. Live-Image-Tag `4415928` Coolify-Deployment-ID 173 finished 07:50:22. app-Container healthy, HTTPS-Endpoint HTTP 200. TSC + Vitest 97/97 PASS pre-Deploy.)
- V5.5 — 2026-05-01 — released auf Hetzner als REL-020 (Angebot-Erstellung: Schema+Workspace+PDF+Lifecycle+Composing-Hookup, Internal-Test-Mode, Live-Smoke PASS RPT-263 4 Mail-Sends + 6 Browser-Smokes + CHECK-Constraint-Tests, Cron expire-proposals live, MIG-026 live, V5.5-Code-Stand seit 2026-04-30 17:04 Image-Tag `417dc8a`)
- V5.4 — 2026-04-29 — released auf Hetzner als REL-019 (Composing-Studio Polish + E-Mail-Anhaenge-Upload PC-Direkt, Internal-Test-Mode, Live-Smoke PASS Multipart-Mail PDF+PNG+ZIP an Gmail + Tracking-Pixel-Open + Junction-Insert verifiziert)
- V5.3 — 2026-04-28 — released auf Hetzner als REL-018 (E-Mail Composing Studio, Internal-Test-Mode, Quick-Smoke OK)
- V5.2 — 2026-04-26 — released auf Hetzner als REL-017 (Compliance-Sprint, Smoke-Test PASS, Internal-Test-Mode)
- V5.1 — 2026-04-24 — released auf Hetzner als REL-016 (Asterisk + Call-Pipeline + SMAO vorbereitet, Internal-Test-Mode)
- V6.1 — 2026-04-21 — released auf Hetzner als REL-014 (Performance Premium UI)

## Notes
20 Releases deployed (REL-001..REL-020). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG + Asterisk PBX + Whisper-Adapter (openai-Default, Azure-EU Code-Ready ab V5.2) + E-Mail Composing Studio (V5.3) + E-Mail-Anhaenge (V5.4) + Angebot-Erstellung mit pdfmake (V5.5). Hosting: Hetzner CPX32 via Coolify. V5.5 (REL-020) bringt /proposals/[id]/edit mit native React-State + dnd-kit, pdfmake-Renderer mit Branding-Adapter + Server-Proxy-Pattern, Status-Lifecycle (draft/sent/accepted/rejected/expired) + lineare Versionierung + Auto-Expire-Cron, Composing-Studio-Hookup mit ProposalAttachmentPicker + idempotentem Auto-Sent-Trigger. Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung COMPLIANCE.md + Switch auf Azure-EU-Whisper. ISSUE-042 (OpenAI-Key in untrackter Datei, NIE committed) ist Pre-Pflicht vor erstem produktivem Whisper-Call.
