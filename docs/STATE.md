# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: implementing
- Current Focus: **V5.6 SLC-563 /frontend code-complete 2026-05-02.** Frontend-Portion (MT-2..MT-6) durch: useSkontoMutex Real-Body (DEC-116) + SumIndicator (gruen/rot Live-Sum) + MilestoneRow (6-Spalten Desktop / 2-zeilig Mobile, dnd-kit) + SplitPlanSection (Toggle, Add, Confirm-Dialog Toggle-Off, DnDContext) + Editor-Integration (Auto-Clear-useEffect bei Mutex-Wechsel, SplitPlanSection unter Konditionen-Block) + Workspace-State (milestones + debouncedAuto-Save 500ms, validation-gated). ProposalEditPayload+getProposalForEdit erweitert um milestones (sechster Promise.all-Slot). TS+Lint+Build clean, Vitest 148/148 PASS, Build ✓ 11.4s/62 pages. **MT-9 Browser-Smoke + Records-Update offen** — kommt nach User-Coolify-Redeploy via /qa SLC-563.
- Current Phase: V5.6 **SLC-563 /frontend code-complete — naechste User-Coolify-Redeploy + /qa SLC-563** (Browser-Smoke + Live-Audit).

## Immediate Next Steps
1. **User-Coolify-Redeploy** der Commit-Tip (frontend-portion) auf Hetzner.
2. **/qa SLC-563** — Browser-Smoke nach QA Focus aus Slice-Spec: Toggle on/off + Confirm-Dialog, Add/Delete/Reorder mit Sequenz-Re-Nummerierung, Trigger-Wechsel mit conditional Tage-Input, Skonto-Mutex (auto-clear bei on_signature 100%), Mobile-2-zeilig, Live-PDF-Generation 5 Snapshots (ohne, nur-Milestones, nur-Skonto, beide, V5.5-Regression bit-identisch), DB-Audit-Log (n=N) + Records-Update (slices/INDEX SLC-563 done, BL-415 done, STATE.md naechste SLC-564). Dann SLC-564 als letzter V5.6-Slice.
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
