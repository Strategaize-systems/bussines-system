# CLAUDE

## Purpose

This file defines the operating behavior for Claude Code when working inside the Strategaize Business System.

The Strategaize Business System is an internal business operations platform that combines Marketing, Lead Generation, and CRM functionality through Claude Code Skills and a Next.js Cockpit.

## Core behavior defaults

These four defaults apply to every interaction, before any workflow step or rule below kicks in. They bias toward caution over speed — for trivial tasks, use judgment.

### 1. Think before coding
Do not assume. Do not hide confusion. Surface tradeoffs.
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — do not pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what is confusing. Ask.

### 2. Simplicity first
Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that was not requested.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

### 3. Surgical changes
Touch only what you must. Match existing style, even if you would do it differently.
- Do not "improve" adjacent code, comments, or formatting.
- Do not refactor things that are not broken.
- Remove imports, variables, or functions that *your* changes made unused. Do not delete pre-existing dead code unless asked.
- Every changed line should trace directly to the user's request or to an explicit rule.

### 4. Goal-driven execution
Define success criteria. Loop until verified.
- Transform vague tasks into verifiable goals — "Add validation" becomes "Write tests for invalid inputs, then make them pass"; "Fix the bug" becomes "Write a test that reproduces it, then make it pass".
- For multi-step work, state a brief plan with a verify step per item.
- Strong success criteria let work proceed independently. Weak criteria ("make it work") force constant clarification later.

These four defaults sit above the rest of this document. The structured workflow, completion reports, and project records below operationalize them — they do not replace them. Credit: adapted from Andrej Karpathy's observations on LLM coding pitfalls (forrestchang/andrej-karpathy-skills).

## Relationship to Dev System

This project follows the same structural patterns as the Strategaize Dev System:
- Skills handle the actual work
- Cockpit provides visibility
- Project records are the source of truth
- Per-company customization via separate repositories

## General operating rules

All rules from the Strategaize Dev System apply here as well. In addition:

- Respect the business context: this is not a developer tool but a business operations platform
- Marketing content must respect brand guidelines and style guides when defined
- Lead handling must be DSGVO-compliant from day one
- External tool integrations should be preferred over self-built alternatives where the external tool is mature and API-accessible
- Skills should be designed to be usable by non-technical operators eventually

## Skill categories

### Marketing Skills
Skills for content creation, planning, and publishing. These generate actual business content (ads, blog posts, presentations, etc.).

### Lead Skills
Skills for lead research, scoring, and outreach tracking. Must respect DSGVO constraints.

### Pipeline Skills
Skills for managing the sales pipeline, creating proposals, and tracking customer status.

### Admin Skills
Skills for invoicing, accounting handoff, and system maintenance.

## Data handling

- Contact and pipeline data may contain sensitive business information
- Data files should not be committed to public repositories
- DSGVO applies to all lead and contact data

## External integrations

Preferred external tools:
- Postiz — Social media publishing
- Listmonk / Dittofeed — E-Mail marketing
- n8n — Workflow orchestration
- LinkedIn API — Professional network publishing
- Buchhaltungs-API — Accounting handoff

MCP servers should be used for direct Claude-to-platform connections where available.

## Project records

Standard Strategaize project records apply:
- `/docs/STATE.md` — current project state
- `/docs/CONCEPT.md` — project concept and research
- `/docs/DECISIONS.md` — key decisions
- `/docs/KNOWN_ISSUES.md` — known problems
- `/docs/RELEASES.md` — release history
- `/docs/MIGRATIONS.md` — schema/structural changes
- `/features/INDEX.md` — feature tracking
- `/slices/INDEX.md` — slice tracking
- `/planning/roadmap.json` — version roadmap
- `/planning/backlog.json` — work items
