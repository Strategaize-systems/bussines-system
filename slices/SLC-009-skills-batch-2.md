# SLC-009 — Marketing-Skills Batch 2

## Meta
- Feature: FEAT-004
- Priority: Medium
- Status: planned
- Dependencies: keine (kann parallel zu Cockpit-Slices laufen)

## Goal
Restliche 4 Marketing-Skills adaptieren: Sales/Outreach-fokussiert. Skills funktionieren in Claude Code direkt.

## Scope
- `/cold-email` — B2B Cold Outreach E-Mail-Sequenzen
- `/sales-enablement` — Pitch Decks, One-Pager, Objection Handling
- `/create-proposal` — Client Proposal mit Pricing, ROI, Follow-up
- `/competitor-analysis` — Wettbewerbs-Analyse mit SWOT
- Jeder Skill: SKILL.md im Strategaize-Format, getestet

## Out of Scope
- E-Mail-Versand (V2/V3)
- Automatische Follow-ups (V3)

### Micro-Tasks

#### MT-1: /cold-email Skill
- Goal: Skill adaptieren aus coreyhaines31/marketingskills
- Files: `skills/leads/cold-email/SKILL.md`
- Expected behavior: Skill generiert mehrstufige E-Mail-Sequenz (3-5 E-Mails)
- Verification: `/cold-email` ausführen → E-Mail-Sequenz
- Dependencies: keine

#### MT-2: /sales-enablement Skill
- Goal: Skill adaptieren aus coreyhaines31/marketingskills
- Files: `skills/pipeline/sales-enablement/SKILL.md`
- Expected behavior: Skill generiert Sales-Materialien (Pitch Deck Outline, One-Pager, Objection Doc)
- Verification: `/sales-enablement` ausführen → strukturierte Sales-Materialien
- Dependencies: keine

#### MT-3: /create-proposal Skill
- Goal: Skill adaptieren aus zubair-trabzada/ai-marketing-claude
- Files: `skills/pipeline/create-proposal/SKILL.md`
- Expected behavior: Skill generiert Client Proposal mit Executive Summary, Scope, Pricing, ROI, Timeline
- Verification: `/create-proposal` ausführen → vollständiges Proposal-Dokument
- Dependencies: keine

#### MT-4: /competitor-analysis Skill
- Goal: Skill adaptieren aus zubair-trabzada/ai-marketing-claude
- Files: `skills/marketing/competitor-analysis/SKILL.md`
- Expected behavior: Skill generiert Wettbewerbs-Analyse mit SWOT, Marktpositionierung, Differenzierung
- Verification: `/competitor-analysis` ausführen → Analyse-Dokument
- Dependencies: keine
