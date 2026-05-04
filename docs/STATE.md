# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: architecture
- Current Focus: **V5.7 Architecture done 2026-05-04.** Alle 8 Open Questions FEAT-571 + 3 Fix-Optionen FEAT-572 entschieden. 6 neue DECs (DEC-122..127): NL-VAT-Whitelist {0,9,19,21} mit Default 21 (Snapshot-Prinzip eingehalten, keine Daten-Migration), Reverse-Charge als BOOLEAN-Flag mit DB-CHECK, Format-only-VAT-Validation (kein VIES, BL-420 fuer spaeter), Reverse-Charge-Phrase hardcoded bilingual NL/EN, Skonto-Bugfix Option A (Optimistic-Revert via useRef), V5.7-Slicing-Schnitt 2 Slices SLC-571+572. MIG-028 ausgeplant (5 additive Aenderungen: tax_rate-Default+CHECK + reverse_charge BOOLEAN + branding_settings.vat_id + companies.vat_id). KEIN Architektur-Sprung — alles additiv. ICP-Meldung bleibt User-Reporting-Pflicht (NICHT in Rechnung). 5 verbleibende Open Technical Questions fuer /slice-planning (PDF-Footer-Position, Audit-Eintrag-Pflicht, Editor-UI-Position, Voraussetzungs-UX, ggf. Pattern-Erweiterung Skonto-Bugfix auf PaymentTerms/SplitPlan).
- Current Phase: V5.7 — Architecture done, naechste = /slice-planning V5.7 (2 Slices SLC-571 NL-VAT-Schema+Editor+PDF + SLC-572 Skonto-Bugfix mit Acceptance Criteria, Micro-Tasks, QA-Fokus)

## Immediate Next Steps
1. **/slice-planning V5.7** — die 2 Slices SLC-571 + SLC-572 ausdefinieren mit Acceptance Criteria, Micro-Tasks, QA-Fokus. SLC-571 ~5-7h (MIG-028 + 4 UI-Touchpoints + PDF-Block), SLC-572 ~30-60min (Optimistic-Revert + Vitest + Browser-Smoke).
2. **(Passiv)** Coolify-Cron `meeting-briefing` Erst-Lauf-Verifikation V5.6 — app-Container-Log innerhalb naechster Min sollte `[Cron/MeetingBriefing] No candidates` (oder `processed=N`) zeigen.
3. **Nach 24-48h Stable-Window V5.6**: /post-launch V5.6 (kann V5.5/V5.5.1/V5.4/V5.3 mitnehmen — alle ueberfaellig). Kann auch nach V5.7-Release als Sammelreview erfolgen.
4. **Coolify-Cron `expire-proposals` Erst-Lauf 2026-05-02 02:00 Berlin verifizieren** — Audit-SQL aus REL-020-Notes Schritt 3. Passiv erledigen.

## Spaeter (nicht jetzt)
- Pre-Production-Compliance-Gate (Anwaltspruefung COMPLIANCE.md + Azure-EU-Whisper-Switch + ISSUE-042) — User-Hinweis 2026-05-01: "kommt viel spaeter"
- BL-397 GitHub-App Org-Anbindung (Infra-Hygiene)
- V6.2 — Workflow-Automation (BL-135) + Kampagnen-Attribution (BL-139), aus V7 ausgelagert
- V7 — reduziert auf Multi-User + Teamlead (FEAT-502/503)

## Active Scope
**V5.7 — NL-Compliance + Polish (Architecture done 2026-05-04):**
- FEAT-571 NL-VAT + Reverse-Charge (planned, BL-417 high-prio): MIG-028 mit tax_rate-Whitelist {0,9,19,21} + Default 21 + reverse_charge BOOLEAN + branding_settings.vat_id + companies.vat_id (DEC-122/123/124). PDF-Block bilingual NL/EN hardcoded (DEC-125). Reverse-Charge-Toggle gated auf 3 Voraussetzungen (Strategaize-BTW + Empfaenger-BTW + Country in EU != NL). Format-only-Validation, kein VIES (BL-420 fuer spaeter). Drittland out-of-scope. ICP-Meldung manuell.
- FEAT-572 Skonto-Toggle UI-State-Drift Bugfix (planned, BL-419 low/cosmetic): Optimistic-Revert via useRef last-known-good (DEC-126 Option A), Vitest fuer Save-Error-Pfad, Browser-Smoke gegen RPT-277-Repro.
- Slicing-Schnitt: 2 Slices (DEC-127), SLC-571 ~5-7h, SLC-572 ~30-60min, gesamt ~5.5-8h.

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
