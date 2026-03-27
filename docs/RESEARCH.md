# Recherche-Ergebnisse

Recherche vom 2026-03-26, ergänzt 2026-03-27. Rohdaten und Detail-Bewertungen aller evaluierten Tools und Repositories.

Für die aufbereitete Zusammenfassung siehe [CONCEPT.md](CONCEPT.md).
Für den detaillierten Skill-Vergleich siehe [SKILL_COMPARISON.md](SKILL_COMPARISON.md).

---

## CRM-Grundlagen — Vollständige Evaluierung

### NextCRM (Favorit)
- URL: https://github.com/pdovhomilja/nextcrm-app
- Tech: Next.js 16, React 19, Prisma, PostgreSQL, shadcn/ui, Tailwind v4
- Lizenz: MIT
- Stars: ~559
- Features: Accounts, Contacts, Leads, Opportunities, Invoicing, E-Mail-Client (IMAP/SMTP), AI-Enrichment, MCP-Server (25 Tools)
- Nutzt Prisma statt Supabase — für Self-Hosted kein Problem
- Status: Wird vom Eigentümer evaluiert

### Atomic CRM (Alternative)
- URL: https://github.com/marmelab/atomic-crm
- Tech: React, shadcn/ui, Supabase, TypeScript, Vite
- Lizenz: MIT
- Stars: ~879
- ~15k LOC, sehr schlank
- Näher an Supabase, aber weniger Features

### Weitere CRM-Optionen (anderer Stack — nicht empfohlen)

| Projekt | Stars | Stack | Lizenz | Eignung |
|---|---|---|---|---|
| Twenty CRM | ~40.900 | NestJS + React + TypeORM | AGPL | Mächtig, aber AGPL + anderer Backend-Stack |
| erxes | ~3.900 | Node.js + React + MongoDB | AGPL | Zu komplex, MongoDB statt PostgreSQL |
| Huly | ~25.000 | Svelte + PostgreSQL | EPL-2.0 | CRM nur Nebenfunktion, Svelte statt React |
| Krayin | mittel | Laravel + Vue.js | MIT | Komplett anderer Stack (PHP) |
| EspoCRM | mittel | PHP + Bootstrap + MySQL | AGPL | Mature, aber PHP + kein AI |
| SuiteCRM | mittel | PHP + Smarty + jQuery | AGPL | Legacy, nicht geeignet |

---

## Marketing Skill Libraries — Vollständige Liste

### Tier 1 — Direkt nutzbar

#### coreyhaines31/marketingskills (Flagship)
- URL: https://github.com/coreyhaines31/marketingskills
- Stars: ~16.500 | Lizenz: MIT
- 32 Skills, 52 CLI-Tools, 31 Integration Guides
- Kategorien: CRO, Copywriting, SEO, Analytics, Growth Engineering
- MCP-Tools-Registry inklusive (GA4, Stripe, Mailchimp, Google Ads, Resend, Zapier)
- Kompatibel mit: Claude Code, Codex, Cursor, Windsurf

#### kostja94/marketing-skills (Größte Skill-Anzahl)
- URL: https://github.com/kostja94/marketing-skills
- Stars: ~247 | Lizenz: MIT
- 160+ Markdown-Skills
- Kategorien: SEO, Content, 40+ Seitentypen, Paid Ads, Channels, Strategien
- Reine Markdown-Dateien, kein Lock-in

#### zubair-trabzada/ai-marketing-claude (Architektonisch am nächsten)
- URL: https://github.com/zubair-trabzada/ai-marketing-claude
- Stars: ~762 | Lizenz: MIT
- 15 Skills mit paralleler Subagent-Orchestrierung
- Orchestrator verteilt an 14 Sub-Skills + 5 parallele Subagents

### Tier 2 — Gute Ergänzungen

| Repo | Stars | Lizenz | Fokus |
|---|---|---|---|
| aitytech/agentkits-marketing | ~402 | MIT | 18 Agents, 93 Commands, 28 Skills + MCP |
| OpenClaudia/openclaudia-skills | ~322 | MIT | 34 Marketing Skills |
| alirezarezvani/claude-skills | ~7.027 | MIT | 192 Skills (Marketing als Subset) |

### Tier 3 — Spezialisiert

| Repo | Stars | Lizenz | Fokus |
|---|---|---|---|
| indranilbanerjee/digital-marketing-pro | ~27 | MIT | 115 Commands, Eval/QA Layer |
| BrianRWagner/ai-marketing-claude-code-skills | ~170 | MIT | Marketing-Frameworks |
| AgriciDaniel/claude-ads | — | — | 190+ Ad-Audit-Checks |
| aaron-he-zhu/seo-geo-claude-skills | ~502 | MIT | 20 SEO + GEO Skills |

---

## MCP-Server — Vollständige Liste

### Social Media
| Server | URL/Info | Funktion |
|---|---|---|
| LinkedIn MCP | stickerdaniel, felipfr, shipeasecommerce | Posts, Profile, Messaging |
| Meta/Facebook Ads MCP | proxy-intell/facebook-ads-library-mcp (~198 Stars) | Ad Library |
| Meta Marketing API MCP | brijr/meta-mcp (~129 Stars) | Volle Meta Marketing API |
| TikTok Ads MCP | AdsMCP/tiktok-ads-mcp-server | TikTok Marketing API |

### Marketing Automation
| Server | URL/Info | Funktion |
|---|---|---|
| Mautic MCP | Cbrown35/mantic-MCP (~15 Stars) | 68 Tools, volle Mautic-Integration |
| HubSpot MCP | Offiziell | CRM-Integration |
| Zapier MCP | Offiziell | Workflow-Trigger |
| ActiveCampaign MCP | Offiziell | E-Mail-Marketing |

### Analytics & Ads
| Server | URL/Info | Funktion |
|---|---|---|
| Google Ads MCP | kLOsk/adloop (~43 Stars) | Read + Write |
| GA4 MCP | Mehrere Implementierungen | Google Analytics 4 |
| Google Search Console MCP | Verfügbar | Search-Daten |

### Content & Writing
| Server | URL/Info | Funktion |
|---|---|---|
| OSP Marketing Tools MCP | open-strategy-partners/osp_marketing_tools (~264 Stars) | Writing Guidelines, Value Maps |

---

## Self-Hosted Plattformen — Vollständige Evaluierung

### Postiz — Social Media Publishing
- URL: https://github.com/gitroomhq/postiz-app
- Stars: ~27.600 | Lizenz: AGPL-3.0
- Tech: Next.js + NestJS + PostgreSQL + Redis
- 30+ Plattformen, Built-in AI, API + Webhooks

### Listmonk — E-Mail/Newsletter
- URL: https://github.com/knadh/listmonk
- Stars: ~19.300 | Lizenz: AGPL-3.0
- Tech: Go + PostgreSQL, Single Binary

### Dittofeed — Multi-Channel Messaging
- URL: https://github.com/dittofeed/dittofeed
- Stars: ~2.700 | Lizenz: MIT
- Tech: TypeScript, Multi-Channel (E-Mail, SMS, Push, WhatsApp, Slack)

### Mautic — Marketing Automation
- URL: https://github.com/mautic/mautic
- Stars: ~9.400 | Lizenz: GPL-3.0
- Tech: PHP/Symfony, Lead Scoring, Drip Sequences, Campaign Builder

### n8n — Workflow-Orchestrierung
- URL: https://github.com/n8n-io/n8n
- Stars: ~181.000 | Lizenz: Fair-Code
- Tech: TypeScript, 400+ Integrationen, Self-Hosted free

### NocoBase — Low-Code
- URL: https://github.com/nocobase/nocobase
- Stars: ~15.000 | Lizenz: AGPL-3.0
- Plugin-Architektur, "AI Employees"

### NocoDB
- URL: https://github.com/nocodb/nocodb
- Stars: ~62.000
- SQL-Datenbank als Spreadsheet

## Multi-Agent Marketing Systeme (Experimental, nicht empfohlen)

- CrewAI-basiert: Demo-Grade, nicht produktionsreif
- LangChain/LangGraph-basiert: Erfordern API-Kosten (nicht Max-kompatibel)

---

## Brand & Design System — ui-ux-pro-max-skill (2026-03-27)

### Repository
- URL: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Version: v2.5.0 (März 2025)
- Lizenz: MIT
- Stars: ~52.000
- Plattform: Claude Code Skill (auch Cursor, Windsurf kompatibel)

### Skills (7 Stück)

| Skill | Funktion | Relevanz |
|---|---|---|
| `brand` | Brand Voice, Visual Identity, Messaging → `brand-guidelines.md` + `design-tokens.json` + `design-tokens.css` | SEHR HOCH |
| `design-system` | 3-Layer Token-Architektur (Primitive → Semantic → Component), CSS-Variablen, Tailwind-Integration, Token-Validation | SEHR HOCH |
| `design` | Logo-Generierung (55 Styles via Gemini AI), CIP-Mockups (50+ Deliverables, 20 Styles, 20 Branchen) | MITTEL (Gemini-abhängig) |
| `banner-design` | Marketing-Banner: Social Media (FB, Twitter, LinkedIn, YouTube, Instagram), Google Display Ads, Website Heroes, Print | HOCH |
| `slides` | HTML-Präsentationen mit Chart.js, Design Tokens, Copywriting-Formeln (Investor Pitches, Sales Decks, Product Demos) | HOCH |
| `ui-styling` | UI-Styling mit shadcn/ui, Tailwind CSS, Canvas-basiertes Design | HOCH |
| `ui-ux-pro-max` | Kern-Skill: Design Intelligence, Farb-/Font-Suche über Python-BM25-Engine | MITTEL (Datenbank nützlich) |

### Datenbanken im Repo
- 161 Produkt-Typen mit zugehörigen Farbpaletten
- 1.923 Google Fonts katalogisiert
- 57 Font-Pairings
- 99 UX-Richtlinien

### Was genutzt wird (Entscheidung: Option A)
- `brand` + `design-system` als Grundlage für Brand System Generator
- `banner-design` für Marketing-Banner
- `slides` für Präsentationen
- `ui-styling` für Cockpit-UI
- Datenbanken als Referenz-Material
- Adapter für Konvertierung ins Strategaize-Format (`strategaize_styleguide.md`)
- Eigene Marketing-Templates obendrauf (E-Mail, Dokumente, One-Pager — nicht im Repo)

### Was NICHT genutzt wird
- Logo-/CIP-Generierung (`design` Skill) — erfordert Gemini AI, außerhalb der Claude-Max-Strategie
- Logos werden weiterhin manuell über Canva/Figma/AI-Tools erstellt

### Abhängigkeiten / Hinweise
- Python wird benötigt für Such-Engine und Token-Generierung
- Node-Scripts für Sync und Inject (`sync-brand-to-tokens.cjs`, `inject-brand-context.cjs`, `generate-tokens.cjs`)
- Letztes Release: März 2025 — kein Update seit 1 Jahr, möglicherweise stabil oder aufgegeben
- Generischer Ansatz (Industrie-Templates), muss für per-Firma-Nutzung angepasst werden
