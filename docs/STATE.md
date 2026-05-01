# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Operatives Business-Development-Betriebssystem mit CRM-Unterbau fuer beratungsintensives B2B-Geschaeft. Kontextzentriert, prozesszentriert, KI-unterstuetzt. Steuert Multiplikatoren, Leads, Gespraeche, Angebote und Uebergaben datenfundiert. KEIN klassisches Feature-CRM, sondern Workspace-basiertes Arbeitssystem.

## Current State
- High-Level State: stable
- Current Focus: **V5.5 RELEASED 2026-05-01 als REL-020 (Final-Release).** Live-Image-Tag `417dc8a` (V5.5-Code-Stand seit 2026-04-30 17:04, alle Live-Smokes RPT-263 darauf gefahren). Records-Sync via Commit `cf0c98d` heute. Cron `expire-proposals` live + Smoke-Test PASS (`{"success":true,"expiredCount":0,"expiredIds":[]}`). 4 critical Container healthy (app, supabase-db, kong, meta), HTTPS-Endpoint reachable, MIG-026 live seit SLC-551. DB-Stand: 4 proposal-junctions + 5 upload-junctions (V5.4-Pfad regression-frei), 3 draft + 1 sent + 1 expired Proposals, 60 V5.5-Audit-Eintraege. Internal-Test-Mode aktiv bis Pre-Production-Compliance-Gate vor V5.6.
- Current Phase: V5.5 **STABLE / DEPLOYED**. Naechste: /post-launch V5.5 nach Stable-Window 24-48h + Pre-V5.6-Gate-Vorbereitung (Anwalts-Pruefung COMPLIANCE.md + Azure-EU-Whisper-Switch + ISSUE-042-Schliessung).

## Immediate Next Steps
1. **Coolify-Cron `expire-proposals` Erst-Lauf am 2026-05-02 02:00 Berlin Time verifizieren** — Audit-SQL `SELECT created_at, action, entity_id, context FROM audit_log WHERE entity_type='proposal' AND context='Auto-expire by cron — valid_until passed' ORDER BY created_at DESC LIMIT 10;` (laut REL-020-Notes Schritt 3).
2. **Coolify-Redeploy auf Commit `cf0c98d`** (kosmetisch) — Image-Tag-Hygiene, damit live-Tag = letzter Commit-SHA. Nicht release-blockierend, V5.5-App-Code ist seit `417dc8a` unveraendert (4 docs-only-Commits seitdem).
3. **/post-launch V5.5** — nach 24-48h Stable-Window. Auch /post-launch V5.4 + V5.3 ueberfaellig (passiv).
4. **F1 Hydration #418 (ISSUE-047)** als V5.5.1-Patch — Datums-Format-Drift in Listing-Card vermutet, fix per server-stable Date-Format oder `suppressHydrationWarning`.
5. **(optional)** DB-Cleanup der QA-Smoke-Artefakte — kosmetisch, Audit-Trail bleibt sonst erhalten.
6. **Pre-Production-Compliance-Gate vor V5.6 vorbereiten:**
   - Anwalts-Pruefung COMPLIANCE.md (V5.3 + V5.4 + V5.5-Sections)
   - Switch auf Azure-OpenAI-EU-Whisper (Code-Ready seit V5.2, ENV-Switch)
   - ISSUE-042-Schliessung (OpenAI-Key Rotation + Lokal-Datei-Beseitigung)
   - BL-397 GitHub-App Org-Anbindung
7. **V5.4.x Patch-Carryover (optional, nicht release-blockierend):**
    - SLC-541 M1: ConditionalColorPicker Refactor zu derived-state
    - SLC-542 M1/ISSUE-045: Server-side Total-Size Limit
    - SLC-542 L1: Filename-Kollision-Suffix-Pattern bei upsert

## Active Scope
**V5.5 — Angebot-Erstellung (RELEASED 2026-05-01 als REL-020):**
- FEAT-551 Angebot-Schema-Erweiterung + Position-Items (in_progress, MIG-026 applied auf Hetzner, Server Actions + Pfad-Helper live)
- FEAT-552 Angebot-Workspace UI 3-Panel (done 2026-04-30, /proposals/[id]/edit live, native React-State + Custom-Debounce statt RHF/lodash, @dnd-kit/sortable)
- FEAT-553 PDF-Renderer + Branding (done 2026-04-30, **pdfmake** als Library DEC-105, Adapter-Pattern, /qa PASS via RPT-258, Mixed-Content-Hotfix Commit `91020b2` Server-Proxy /api/proposals/[id]/pdf live)
- FEAT-554 Status-Lifecycle + Versionierung (done 2026-04-30, /backend + /qa PASS RPT-260: Whitelist transitions.ts + 21 Vitest-Tests, transitionProposalStatus mit Idempotenz DEC-108, createProposalVersion mit V1-unangetastet DEC-109 Live-verifiziert, Auto-Expire-Cron-Endpoint /api/cron/expire-proposals DEC-110 Live + DB-Audit-Smoke PASS + Idempotenz-Check, Workspace Status-Buttons + Confirm-Dialog Live, Read-only-Mode mit Server-Side-Guard `assertProposalEditable` in 5 Mutate-Actions, /proposals-Listing Status-Badge + Anzeigen-Button mit ?readonly=1, REL-020-Notes Coolify-Cron-Anleitung, Coolify-Cron `expire-proposals` aktiv)
- FEAT-555 Angebot-Anhang im Composing-Studio (done 2026-05-01, /qa Live-Smoke PASS RPT-263: 4 Live-Mail-Sends, CHECK-Constraint Tests, 6 Browser-Smokes, Idempotenz live bewiesen in 2 Edge-Cases. ProposalAttachmentPicker + attachProposalToCompose + send.ts Bucket-Diskriminator + Junction `source_type`/`proposal_id` + idempotenter transitionProposalStatus post-send.)

**Architektur-Entscheidungen V5.5:** DEC-105 pdfmake, DEC-106 HTML-Live-Preview, DEC-107 Snapshot inkl. price_at_creation, DEC-108 Status-Sent automatisch+manuell, DEC-109 V1-Status unangetastet, DEC-110 Cron 02:00 Berlin, DEC-111 Pfad-Schema, DEC-112 alle Status zeigen+Warning, DEC-113 Footer+Suffix-Watermark, DEC-114 5 Slices 1:1 zu Features.

**Released (deployed):**
- V2..V4.3, V5, V5.1, V5.2, V5.3, V5.4, V5.5, V6, V6.1

**Planned (Reihenfolge):**
- Pre-Production-Compliance-Gate (zwischen V5.5 und V7) — Anwalts-Pruefung COMPLIANCE.md + Azure-OpenAI-EU-Whisper-Switch + ISSUE-042-Schliessung
- V7 — Multi-User + Erweiterung

## Blockers
- aktuell keine

## Last Stable Version
- V5.5 — 2026-05-01 — released auf Hetzner als REL-020 (Angebot-Erstellung: Schema+Workspace+PDF+Lifecycle+Composing-Hookup, Internal-Test-Mode, Live-Smoke PASS RPT-263 4 Mail-Sends + 6 Browser-Smokes + CHECK-Constraint-Tests, Cron expire-proposals live, MIG-026 live, V5.5-Code-Stand seit 2026-04-30 17:04 Image-Tag `417dc8a`)
- V5.4 — 2026-04-29 — released auf Hetzner als REL-019 (Composing-Studio Polish + E-Mail-Anhaenge-Upload PC-Direkt, Internal-Test-Mode, Live-Smoke PASS Multipart-Mail PDF+PNG+ZIP an Gmail + Tracking-Pixel-Open + Junction-Insert verifiziert)
- V5.3 — 2026-04-28 — released auf Hetzner als REL-018 (E-Mail Composing Studio, Internal-Test-Mode, Quick-Smoke OK)
- V5.2 — 2026-04-26 — released auf Hetzner als REL-017 (Compliance-Sprint, Smoke-Test PASS, Internal-Test-Mode)
- V5.1 — 2026-04-24 — released auf Hetzner als REL-016 (Asterisk + Call-Pipeline + SMAO vorbereitet, Internal-Test-Mode)
- V6.1 — 2026-04-21 — released auf Hetzner als REL-014 (Performance Premium UI)

## Notes
20 Releases deployed (REL-001..REL-020). Technologie-Stack: Next.js + Supabase (self-hosted) + Bedrock Claude Sonnet (Frankfurt) + Jitsi/Jibri (shared Infra) + pgvector RAG + Asterisk PBX + Whisper-Adapter (openai-Default, Azure-EU Code-Ready ab V5.2) + E-Mail Composing Studio (V5.3) + E-Mail-Anhaenge (V5.4) + Angebot-Erstellung mit pdfmake (V5.5). Hosting: Hetzner CPX32 via Coolify. V5.5 (REL-020) bringt /proposals/[id]/edit mit native React-State + dnd-kit, pdfmake-Renderer mit Branding-Adapter + Server-Proxy-Pattern, Status-Lifecycle (draft/sent/accepted/rejected/expired) + lineare Versionierung + Auto-Expire-Cron, Composing-Studio-Hookup mit ProposalAttachmentPicker + idempotentem Auto-Sent-Trigger. Internal-Test-Mode bleibt aktiv bis Anwalts-Pruefung COMPLIANCE.md + Switch auf Azure-EU-Whisper. ISSUE-042 (OpenAI-Key in untrackter Datei, NIE committed) ist Pre-Pflicht vor erstem produktivem Whisper-Call.
