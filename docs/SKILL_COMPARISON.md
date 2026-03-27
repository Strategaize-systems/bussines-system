# Marketing Skill Library Comparison

Recherche vom 2026-03-26. Vergleich der drei Top-Kandidaten für die Skill-Grundlage des Business Systems.

## Die drei Repositories

| Repo | Skills | Stars | Lizenz | Charakter |
|---|---|---|---|---|
| **coreyhaines31/marketingskills** | 33 | ~165 Commits | MIT | Tiefste B2B-Skills, 500-2000 Zeilen pro Skill |
| **kostja94/marketing-skills** | 150-170 | 248 | MIT | Breiteste Abdeckung, SEO-fokussiert |
| **zubair-trabzada/ai-marketing-claude** | 15 | 763 | MIT | Orchestrator-Pattern, produziert fertige Dateien |

---

## Komplette Skill-Listen

### coreyhaines31/marketingskills (33 Skills)

Architektur: Flach, `/skills/{skill-name}/SKILL.md` mit Referenz-Dateien. Shared Context (`product-marketing-context`). Skills referenzieren einander.

| # | Skill | Beschreibung | B2B-Relevanz |
|---|-------|-------------|---|
| 1 | `ab-test-setup` | A/B Test Planung und Setup | Mittel |
| 2 | `ad-creative` | Werbemittel-Design und Copy | Hoch |
| 3 | `ai-seo` | SEO für AI-Discovery (ChatGPT, Perplexity zitieren dich) | Hoch |
| 4 | `analytics-tracking` | Analytics Setup, Event Tracking | Hoch |
| 5 | `churn-prevention` | Retention, Churn-Analyse, Re-Engagement | Hoch |
| 6 | `cold-email` | B2B Cold Outreach mit 5 Referenz-Dateien | SEHR HOCH |
| 7 | `competitor-alternatives` | Wettbewerbs-Vergleichsseiten | Hoch |
| 8 | `content-strategy` | Content-Pillars, Topic Clusters, Redaktionskalender | SEHR HOCH |
| 9 | `copy-editing` | Bestehende Marketing-Texte überarbeiten | Mittel |
| 10 | `copywriting` | Conversion Copywriting (Homepage, Landing, Pricing) | SEHR HOCH |
| 11 | `email-sequence` | Lifecycle/Nurture E-Mail-Sequenzen | SEHR HOCH |
| 12 | `form-cro` | Formular-Conversion-Optimierung | Mittel |
| 13 | `free-tool-strategy` | Kostenlose Tools als Lead-Gen-Engine | Mittel |
| 14 | `launch-strategy` | Produkt-/Service-Launch Playbooks | Hoch |
| 15 | `lead-magnets` | Lead-Magnet-Strategie, Gating, Distribution | SEHR HOCH |
| 16 | `marketing-ideas` | Marketing-Brainstorming | Mittel |
| 17 | `marketing-psychology` | Psychologische Prinzipien im Marketing | Hoch |
| 18 | `onboarding-cro` | User-Onboarding-Optimierung | Niedrig |
| 19 | `page-cro` | Landing Page Conversion-Optimierung | Hoch |
| 20 | `paid-ads` | Paid-Ads-Strategie plattformübergreifend | Mittel |
| 21 | `paywall-upgrade-cro` | Freemium-zu-Paid Upgrade | Niedrig |
| 22 | `popup-cro` | Popup-Design und -Optimierung | Niedrig |
| 23 | `pricing-strategy` | Preismodelle, Packaging, Psychologie | SEHR HOCH |
| 24 | `product-marketing-context` | Shared Context für alle Skills | Basis |
| 25 | `programmatic-seo` | Skalierte SEO-Seitenerstellung | Mittel |
| 26 | `referral-program` | Empfehlungs-/Weiterempfehlungsprogramme | Hoch |
| 27 | `revops` | Revenue Operations, Lead Scoring, Pipeline | SEHR HOCH |
| 28 | `sales-enablement` | Pitch Decks, One-Pager, Objection Docs, Demo Scripts, Proposals | SEHR HOCH |
| 29 | `schema-markup` | Structured Data / Schema.org | Mittel |
| 30 | `seo-audit` | Umfassendes SEO-Audit | Hoch |
| 31 | `signup-flow-cro` | Signup-Flow-Optimierung | Niedrig |
| 32 | `site-architecture` | Website-Informationsarchitektur | Hoch |
| 33 | `social-content` | Social Media Content (LinkedIn, Twitter, etc.) | SEHR HOCH |

**Qualität: 9/10** — Tiefste Skills (500-2000 Zeilen), Anti-Patterns, Checklisten, Referenz-Dateien.

### kostja94/marketing-skills (~160 Skills)

Architektur: Tiefe Hierarchie, `/skills/{category}/{subcategory}/{skill}/SKILL.md`. Neun Hauptkategorien.

**SEO (~30 Skills)**

| Subkategorie | Skills |
|---|---|
| Technical SEO | `canonical`, `core-web-vitals`, `crawlability`, `indexing`, `indexnow`, `mobile-friendly`, `rendering-strategies`, `robots`, `sitemap` |
| On-Page SEO | `description`, `featured-snippet`, `heading`, `image-optimization`, `internal-links`, `metadata`, `open-graph`, `schema`, `serp-features`, `title`, `twitter-cards`, `url-structure`, `video-optimization` |
| Content SEO | `competitor-research`, `content-optimization`, `content-strategy`, `eeat-signals`, `keyword-research` |
| Off-Page SEO | `backlink-analysis`, `link-building` |
| Spezialisiert | `local-seo`, `entity-seo`, `parasite-seo`, `programmatic-seo` |

**Content (6 Subkategorien)**
- `article`, `copywriting`, `podcast`, `translation`, `video`, `visual-content`

**Paid Ads**
- Plattformen: `google-ads`, `linkedin-ads`, `meta-ads`, `reddit-ads`, `tiktok-ads`, `youtube-ads`
- Formate: `app-ads`, `ctv-ads`, `directory-listing-ads`, `display-ads`, `native-ads`

**Pages (~40 Seiten-Generatoren)**
- Brand: `about`, `contact`, `home`
- Content: `api`, `article`, `blog`, `docs`, `faq`, `features`, `glossary`, `resources`, `template-page`, `tools`
- Legal: `cookie-policy`, `legal`, `privacy`, `refund`, `shipping`, `terms`
- Marketing: `affiliate-program`, `alternatives`, `category-pages`, `contest`, `customer-stories`, `download`, `integrations`, `landing-page`, `media-kit`, `migration`, `press-coverage`, `pricing`, `products`, `services`, `showcase`, `solutions`, `startups`, `use-cases`
- Utility: `404`, `careers`, `changelog`, `disclosure`, `feedback`, `signup-login`, `status`

**Channels**
- Community: `community-forum`, `directory-submission`, `product-hunt-launch`
- Distribution: `distribution-channels`
- Owned: `email-marketing`, `employee-generated-content`
- Partnerships: `affiliate-marketing`, `creator-program`, `education-program`, `influencer-marketing`, `public-relations`, `referral-program`

**Platforms**
- `github`, `grokipedia`, `linkedin`, `medium`, `pinterest`, `reddit`, `tiktok`, `x`, `youtube`

**Strategies**
- Brand: `brand-monitoring`, `brand-protection`, `branding`, `content-marketing`, `integrated-marketing`, `rebranding`
- Commercial: `domain`, `geo`, `localization`, `open-source`, `paid-ads`, `pricing`
- Launch: `cold-start`, `conversion`, `growth-funnel`, `gtm`, `indie-hacker`, `pmf`, `product-launch`, `research-sources`, `retention`
- Structure: `seo-audit`, `seo`, `website-structure`

**Analytics**
- `seo` analytics, `sources`, `tracking`

**Qualität: 7/10** — Stark bei SEO (30+ Skills), Seiten-Generatoren nützlich. Aber: viele Skills dünner als coreyhaines31. Keine Sales/Pipeline-Abdeckung.

### zubair-trabzada/ai-marketing-claude (15 Skills)

Architektur: Orchestrator + 5 parallele Subagents. Jeder Skill produziert eine Markdown-Datei. Python-Scripts für Web-Analyse.

| # | Command | Beschreibung | Output-Datei | B2B-Relevanz |
|---|---------|-------------|---|---|
| 1 | `/market audit <url>` | Vollständiges Marketing-Audit mit 5 Subagents | MARKETING-AUDIT.md | SEHR HOCH |
| 2 | `/market quick <url>` | 60-Sekunden Marketing-Snapshot | Terminal | Hoch |
| 3 | `/market copy <url>` | Copywriting-Analyse und Optimierung | COPY-SUGGESTIONS.md | Hoch |
| 4 | `/market emails <topic>` | Komplette E-Mail-Sequenzen | EMAIL-SEQUENCES.md | SEHR HOCH |
| 5 | `/market social <topic>` | 30-Tage Social Media Kalender | SOCIAL-CALENDAR.md | Hoch |
| 6 | `/market ads <url>` | Ad-Creative und Copy für alle Plattformen | AD-CAMPAIGNS.md | Mittel |
| 7 | `/market funnel <url>` | Sales-Funnel-Analyse und Optimierung | FUNNEL-ANALYSIS.md | SEHR HOCH |
| 8 | `/market competitors <url>` | Wettbewerbsanalyse | COMPETITOR-REPORT.md | SEHR HOCH |
| 9 | `/market landing <url>` | Landing Page CRO-Analyse | LANDING-ANALYSIS.md | Hoch |
| 10 | `/market launch <product>` | Produkt-Launch Playbook | LAUNCH-PLAYBOOK.md | Hoch |
| 11 | `/market proposal <client>` | Client-Proposal-Generator | CLIENT-PROPOSAL.md | SEHR HOCH |
| 12 | `/market report <url>` | Vollständiger Marketing-Report (MD) | MARKETING-REPORT.md | SEHR HOCH |
| 13 | `/market report-pdf <url>` | Professioneller Marketing-Report (PDF) | marketing-report.pdf | SEHR HOCH |
| 14 | `/market seo <url>` | SEO Content Audit | SEO-AUDIT.md | Hoch |
| 15 | `/market brand <url>` | Brand-Voice-Analyse und Guidelines | BRAND-VOICE.md | Hoch |

**5 parallele Subagents (für `/market audit`):**
- `market-content` — Headlines, Value Props, Copy-Qualität, Social Proof, Brand Voice
- `market-conversion` — CTAs, Forms, Visual Hierarchy, Trust Signals, Mobile UX
- `market-competitive` — Positionierung, Differenzierung, Kategorie, Pricing
- `market-technical` — Title Tags, Meta, Schema, Speed, Core Web Vitals
- `market-strategy` — Business Model, Pricing, Growth Loops, Retention

**6 Templates:** Welcome-Sequenz, Nurture-Sequenz, Launch-Sequenz, Proposal, Content-Kalender, Launch-Checklist
**4 Python-Scripts:** Page Analyzer, Competitor Scanner, Social Calendar Generator, PDF Report Generator

**Qualität: 8/10** — Jeder Skill produziert eine fertige Datei. Proposal-Generator ist der beste aller drei Repos. Orchestrator-Pattern ist architektonisch am nächsten am Strategaize-Pattern.

---

## Überschneidungen zwischen den drei Repos

| Bereich | coreyhaines31 | kostja94 | zubair-trabzada |
|---|---|---|---|
| SEO Audit | `seo-audit` | `seo-audit` + granulare Skills | `/market seo` |
| Copywriting | `copywriting` | `copywriting` | `/market copy` |
| E-Mail-Sequenzen | `email-sequence` | `email-marketing` | `/market emails` |
| Wettbewerbsanalyse | `competitor-alternatives` | `competitor-research` | `/market competitors` |
| Content-Strategie | `content-strategy` | `content-strategy` | (partiell in `/market social`) |
| Paid Ads | `paid-ads` + `ad-creative` | 6 Plattformen + 5 Formate | `/market ads` |
| Landing Page CRO | `page-cro` | `landing-page` | `/market landing` |
| Pricing | `pricing-strategy` | `pricing` | (in `/market proposal`) |
| Launch-Strategie | `launch-strategy` | `product-launch` + `gtm` | `/market launch` |
| Social Content | `social-content` | `linkedin` + `x` + etc. | `/market social` |
| Schema/Structured Data | `schema-markup` | `schema` | (in `/market seo`) |

## Einzigartige Skills pro Repo

### Nur in coreyhaines31
- `cold-email` — B2B Cold Outreach (5 Referenz-Dateien)
- `sales-enablement` — Pitch Decks, One-Pager, Objection Docs, Demo Scripts
- `revops` — Revenue Operations, Lead Scoring, Pipeline
- `lead-magnets` — Lead-Magnet-Strategie mit Effort-Matrix
- `marketing-psychology` — Psychologische Marketing-Prinzipien
- `churn-prevention` — Retention/Churn-Analyse
- `free-tool-strategy` — Tools als Lead-Gen
- `ai-seo` — SEO für AI-Suchmaschinen
- `ab-test-setup`, `form-cro`, `popup-cro`, `signup-flow-cro`, `onboarding-cro`, `paywall-upgrade-cro`

### Nur in kostja94
- 40+ Seiten-Generatoren (Homepage, Pricing, FAQ, Features, Solutions, Use-Cases, Alternatives, etc.)
- UI-Component-Skills (Breadcrumb, Footer, Navigation, Hero, CTA, Testimonials)
- Plattform-Skills: `github`, `grokipedia`, `pinterest`, `medium`, `reddit`
- `entity-seo`, `parasite-seo`, `podcast`, `video`, `translation`
- `brand-monitoring`, `brand-protection`, `rebranding`
- `geo`, `localization`, `domain`
- `indie-hacker`, `pmf`, `cold-start`, `gtm`

### Nur in zubair-trabzada
- `/market proposal` — Vollständiger Client-Proposal-Generator
- `/market report-pdf` — PDF-Report-Generierung
- `/market quick` — 60-Sekunden-Snapshot
- `/market funnel` — Sales-Funnel-Analyse
- `/market brand` — Brand-Voice-Analyse
- Parallele Subagent-Orchestrierung
- Python-Utility-Scripts
- Fertige E-Mail-Templates (Welcome, Nurture, Launch)

---

## B2B-Irrelevante Skills (können übersprungen werden)

| Skill | Repo | Warum überspringen |
|---|---|---|
| `tiktok` / `tiktok-ads` | kostja94 | B2C-Plattform |
| `pinterest` | kostja94 | B2C visuell |
| `grokipedia` | kostja94 | Nische |
| `app-ads`, `ctv-ads` | kostja94 | Nicht B2B-relevant |
| `influencer-marketing` | kostja94 | B2C-Strategie |
| `creator-program` | kostja94 | B2C-Strategie |
| `shipping`, `refund` | kostja94 | E-Commerce |
| `parasite-seo` | kostja94 | Grey-Hat |
| `indie-hacker` | kostja94 | Startup-spezifisch |
| `product-hunt-launch` | kostja94 | SaaS-spezifisch |
| `podcast`, `video` | kostja94 | Nur relevant wenn geplant |
| `paywall-upgrade-cro` | coreyhaines31 | SaaS-spezifisch |
| `onboarding-cro` | coreyhaines31 | SaaS-spezifisch |
| `signup-flow-cro` | coreyhaines31 | SaaS-spezifisch |

---

## Empfohlene "Best Of" Skill-Liste für B2B

### Kategorie 1: Content Creation

| Skill | Quelle | Warum diese Version |
|---|---|---|
| `content-strategy` | **coreyhaines31** | Tiefste Content-Strategie: Pillars, Topic Clusters, Buyer-Stage-Keywords |
| `copywriting` | **coreyhaines31** | Conversion-Prinzipien, seiten-spezifische Guidance |
| `copy-editing` | **coreyhaines31** | Einziges Repo das Editing abdeckt |
| `linkedin` (Posts) | **kostja94** | Plattform-spezifisch: Zeichenlimits, Bildmaße, Hook-Formeln |
| `social-content` | **coreyhaines31** | Multi-Plattform Social Content |
| `lead-magnets` | **coreyhaines31** | Effort-Matrix, Gating, Distribution, KPIs |
| Case Studies | **coreyhaines31** (`sales-enablement`) | Case-Study-Format mit Metrik-Templates |

### Kategorie 2: SEO & Website

| Skill | Quelle | Warum diese Version |
|---|---|---|
| `seo-audit` | **coreyhaines31** | Site-Typ-spezifisch, Priority-Framework |
| `keyword-research` | **kostja94** | Tiefster Keyword-Skill: Alphabet-Methode, SEO-PPC-Synergy, Clustering |
| `ai-seo` | **coreyhaines31** | Einzigartig: AI-Search-Optimierung |
| `site-architecture` | **coreyhaines31** | Informationsarchitektur und URL-Struktur |
| `core-web-vitals` | **kostja94** | Granulare technische Performance |
| Seiten-Generatoren | **kostja94** | Landing, Pricing, FAQ, Features, Solutions, Use-Cases, Alternatives |

### Kategorie 3: E-Mail Marketing & Outreach

| Skill | Quelle | Warum diese Version |
|---|---|---|
| `cold-email` | **coreyhaines31** | B2B-spezifisch, Executive/Mid-Level-Kalibrierung, 5 Referenz-Dateien |
| `email-sequence` (Lifecycle) | **coreyhaines31** | Dedizierte Lifecycle-Sequenzen |
| `/market emails` (Templates) | **zubair-trabzada** | 7 Sequenz-Typen mit komplettem E-Mail-Copy |
| `email-marketing` (Deliverability) | **kostja94** | SPF/DKIM/DMARC, Subdomain-Strategie |

### Kategorie 4: Lead Research & Analyse

| Skill | Quelle | Warum diese Version |
|---|---|---|
| `/market competitors` | **zubair-trabzada** | 5-Phasen-Methodik, SWOT, Positioning Maps |
| `/market audit` | **zubair-trabzada** | Gewichtetes Scoring mit parallelen Subagents |
| `competitor-alternatives` | **coreyhaines31** | "Alternatives to X" Vergleichsseiten |
| `marketing-psychology` | **coreyhaines31** | Psychologische Prinzipien |

### Kategorie 5: Pipeline & Sales Support

| Skill | Quelle | Warum diese Version |
|---|---|---|
| `sales-enablement` | **coreyhaines31** | Pitch Decks, One-Pager, Objection Docs — einzigartig |
| `/market proposal` | **zubair-trabzada** | 11-Sektionen Proposal mit ROI-Rechner — einzigartig |
| `revops` | **coreyhaines31** | Lead Scoring, Pipeline Management — einzigartig |
| `pricing-strategy` | **coreyhaines31** | Preismodelle, Packaging-Psychologie |
| `/market funnel` | **zubair-trabzada** | Sales-Funnel-Analyse |

### Kategorie 6: Analytics & Reporting

| Skill | Quelle | Warum diese Version |
|---|---|---|
| `analytics-tracking` | **coreyhaines31** | Event Tracking, Measurement Frameworks |
| `/market report` + `/market report-pdf` | **zubair-trabzada** | Produziert fertige Reports |
| `ab-test-setup` | **coreyhaines31** | A/B Test Planung — einzigartig |

### Kategorie 7: Strategie & Planung

| Skill | Quelle | Warum diese Version |
|---|---|---|
| `launch-strategy` | **coreyhaines31** | Launch Playbooks |
| `churn-prevention` | **coreyhaines31** | Client Retention — einzigartig |
| `referral-program` | **coreyhaines31** | Empfehlungsprogramme |
| `gtm` (Go-to-Market) | **kostja94** | GTM-Strategie — einzigartig |
| `/market brand` | **zubair-trabzada** | Brand-Voice-Analyse |
| `branding` | **kostja94** | Brand-Strategie-Framework |

---

## Lücken — Was keines der drei Repos abdeckt

Diese Skills müssten selbst gebaut werden:

1. **CRM-Integration Workflows** — Kontakt-Updates, Pipeline-Verschiebungen über Skills
2. **Lead-Qualifizierung für Beratung** — Scoring spezifisch für B2B-Consulting
3. **Proposal Follow-up Automation** — Nachfass-Workflows nach Angeboten
4. **Client Onboarding (Post-Sale)** — Onboarding-Sequenzen nach Vertragsabschluss
5. **Thought-Leadership-Kalender** — Strategische Content-Planung für Expertenstatus
6. **LinkedIn Networking-Strategie** — Über Content hinaus: Connection-Building, Gruppen
7. **Webinar/Event-Marketing** — Falls relevant
8. **Multiplikatoren-Ansprache** — Spezifische Outreach-Strategie für Steuerberater etc.
9. **Rechnungserstellung** — Einfache PDF-Rechnungen über Templates
10. **Buchhaltungs-Übergabe** — Workflow zur API-Übergabe

---

## Gesamtbewertung

| Dimension | coreyhaines31 | kostja94 | zubair-trabzada |
|---|---|---|---|
| Skill-Tiefe | Tiefste (500-2000 Zeilen) | Gemischt (tiefes SEO, dünne Pages) | Gut (300-1500 Zeilen) |
| Umsetzbarkeit | Hoch — Frameworks, Checklisten | Mittel — Wissenslastig | Höchste — produziert Dateien |
| B2B-Fokus | Stark (Cold Email, Sales, RevOps) | Schwach (SaaS/Produkt/SEO) | Mittel (Agentur-orientiert) |
| SEO-Abdeckung | Gut (5 Skills) | Beste (30+ Skills) | Basic (1 Skill) |
| Sales/Pipeline | Beste (Sales-Enablement, RevOps) | Keine | Gut (Proposal, Funnel) |
| Architektur | Sauber flach | Tiefe Hierarchie (komplex) | Orchestrator + Subagents |
| Konkreter Output | Guidance (du schreibst) | Wissen (du lernst) | Dateien (er schreibt für dich) |
| Gesamtabdeckung | 33 Skills (fokussiert) | 150+ Skills (breit) | 15 Skills (eng) |

## Empfehlung

1. **Primäre Basis: coreyhaines31** — B2B-Kern (Cold Email, Sales, RevOps, Lead Magnets, Content Strategy, Pricing)
2. **Ergänzung: zubair-trabzada** — Proposal, Audit, Competitors, Reports, Funnel + Orchestrator-Pattern
3. **Cherry-Pick: kostja94** — Keyword Research, LinkedIn, Email Deliverability, Seiten-Generatoren
4. **Selbst bauen:** CRM-Workflows, Multiplikatoren-Ansprache, Rechnungen, Buchhaltungs-Übergabe, Thought Leadership
