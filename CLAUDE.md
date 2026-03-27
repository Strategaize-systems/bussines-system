# CLAUDE

## Purpose

This file defines the operating behavior for Claude Code when working inside the Strategaize Business System.

The Strategaize Business System is an internal business operations platform that combines Marketing, Lead Generation, and CRM functionality through Claude Code Skills and a Next.js Cockpit.

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
