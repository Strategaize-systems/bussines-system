# /content-strategy

## Purpose

Plan a structured B2B content strategy with content pillars, topic clusters, and editorial calendar entries.

Use this skill when:
- Starting content marketing for a new company or product line
- Repositioning an existing content strategy around new themes
- Building a quarterly or annual editorial calendar
- Aligning content creation with business goals (lead generation, thought leadership, SEO authority)

This skill produces a strategic foundation document. It does NOT produce individual content pieces — use `/blog-post`, `/linkedin-post`, or `/copywriting` for execution.

## Inputs

The user should provide:

### Required
- **Company/Product**: What company or product is this strategy for?
- **Industry**: What industry or market does the company operate in?
- **Target audience**: Who are we trying to reach? (job titles, company size, pain points)
- **Business goals**: What should content achieve? (lead generation, brand awareness, thought leadership, SEO traffic, sales enablement)

### Optional
- **Existing content**: Links or descriptions of content already published
- **Competitor examples**: Companies whose content approach is relevant (to differentiate from, not copy)
- **Content capacity**: How many pieces per week/month can the team realistically produce?
- **Preferred channels**: Where will content be distributed? (LinkedIn, blog, email newsletter, website)
- **Timeframe**: Planning horizon (e.g., Q3 2026, next 6 months)
- **Brand name**: Company name to check for brand guide (used for `/brand/{name}/brand-guide.md` lookup)

## Brand Context

Before generating the strategy, check if a brand guide exists:

1. Ask the user for the company name (or use it from the input)
2. Check if `/brand/{firmenname}/brand-guide.md` exists in the repository
3. If present, read and apply:
   - **Brand voice and tone** — align all content pillar descriptions and topic suggestions to the documented tone
   - **Target audience definition** — use the brand guide's audience description as the primary audience reference, supplement with user input
   - **Key messaging frameworks** — ensure content pillars map to the brand's core messages
   - **Positioning statements** — content strategy must reinforce, not contradict, the brand positioning
4. If no brand guide exists:
   - Ask the user for basic tone guidance (e.g., "professional but approachable", "technical and authoritative")
   - Ask for 2-3 words that describe the desired brand voice
   - Note in the output that a brand guide should be created via `/create-brand-system` for consistency

## Process

### Step 1: Situation Analysis

Analyze the inputs to understand:
- What the company does and for whom
- What problems the target audience faces
- Where the company has credibility and expertise
- What content gaps exist in the market
- What the competitive content landscape looks like

If existing content was provided, assess:
- What themes are already covered
- What is performing well (if known)
- What gaps exist

### Step 2: Define Content Pillars

Create 3-5 content pillars. Each pillar represents a major theme area that:
- Aligns with a business goal
- Maps to audience pain points or interests
- The company has genuine expertise in
- Can sustain multiple content pieces over months

For each pillar, define:
- **Pillar name**: Clear, descriptive label
- **Strategic purpose**: Why this pillar exists (which business goal it serves)
- **Audience connection**: Which audience pain point or interest it addresses
- **Example topics**: 5-8 specific topic ideas within this pillar
- **Content types**: Which formats work best for this pillar (blog, LinkedIn, whitepaper, case study, email)
- **SEO opportunity**: Primary keyword themes and search intent

### Step 3: Build Topic Clusters

For each content pillar, create a topic cluster:
- **Pillar page concept**: One comprehensive resource that covers the pillar broadly (2000-3000 words)
- **Cluster topics**: 8-12 specific subtopics that link back to the pillar page
- **Content format per topic**: Blog post, LinkedIn post, email sequence, video script, etc.
- **Keyword mapping**: Primary and secondary keywords per cluster topic
- **Internal linking plan**: How cluster pieces connect to each other and the pillar page

### Step 4: Editorial Calendar Framework

Create a calendar framework (not individual dates, but a repeatable structure):
- **Publishing cadence**: Recommended frequency per channel
- **Content mix**: Ratio of pillar types per month (e.g., 40% educational, 30% thought leadership, 20% case studies, 10% promotional)
- **Seasonal hooks**: Relevant industry events, conferences, budget cycles, or seasonal themes
- **Repurposing plan**: How one piece of content becomes multiple assets (blog -> LinkedIn series -> email -> presentation)

### Step 5: Measurement Framework

Define how success will be measured:
- **Per pillar**: Key metrics (traffic, engagement, leads generated)
- **Overall**: Content marketing KPIs aligned to business goals
- **Review cadence**: When to evaluate and adjust the strategy (monthly, quarterly)

### Step 6: Compile Strategy Document

Assemble all elements into a structured document and save it.

## Output Format

Save the content strategy as a Markdown file:

**File path**: `/content/strategy/{firmenname}-content-strategy-{YYYY-MM}.md`

If the `/content/strategy/` directory does not exist, create it.

### Document Structure

```markdown
# Content Strategy — {Company Name}

## Meta
- Date: {YYYY-MM-DD}
- Author: Generated via /content-strategy
- Planning Horizon: {timeframe}
- Brand Guide: {used / not available}

## Situation Summary
{2-3 paragraphs summarizing the strategic starting point}

## Target Audience
{Audience definition — from brand guide if available, enriched with user input}

## Content Pillars

### Pillar 1: {Name}
- Strategic Purpose: {goal alignment}
- Audience Connection: {pain point / interest}
- Content Types: {formats}
- SEO Theme: {keyword cluster}

#### Topics
1. {Topic with brief description}
2. {Topic with brief description}
...

{Repeat for each pillar}

## Topic Clusters
{Detailed cluster structure per pillar}

## Editorial Calendar Framework
{Publishing cadence, content mix, seasonal hooks}

## Repurposing Plan
{How content multiplies across channels}

## Measurement Framework
{KPIs, metrics, review cadence}

## Next Steps
{Concrete recommendations for starting execution}
```

## Quality Criteria

A good content strategy must:

1. **Be actionable** — Someone should be able to start creating content immediately after reading it
2. **Be specific to the business** — Generic advice like "post regularly" is not a strategy. Pillars and topics must reflect the company's actual expertise and audience
3. **Align with business goals** — Every pillar must trace back to a stated business objective
4. **Be realistic** — The publishing cadence must match the stated content capacity. Do not recommend 5 blog posts per week for a team that can produce 2 per month
5. **Be differentiated** — Content pillars should reflect what makes this company's perspective unique, not generic industry topics everyone covers
6. **Include SEO thinking** — Topic clusters should consider search intent and keyword opportunities, not just what sounds interesting
7. **Be B2B appropriate** — No consumer marketing tactics. Focus on professional audiences, decision-maker concerns, and business outcomes
8. **Respect brand voice** — If a brand guide was used, the tone of pillar descriptions, topic framing, and calendar suggestions must match the documented voice

## Examples

### Example Input
```
Company: CloudSecure GmbH
Industry: IT Security / Cloud Infrastructure
Target audience: CTOs and IT-Leiter at mid-market companies (200-2000 employees) in DACH region
Goals: Thought leadership, inbound lead generation, SEO authority for cloud security topics
Capacity: 2 blog posts/month, 3 LinkedIn posts/week, 1 email newsletter/month
Channels: Blog, LinkedIn, Email
Timeframe: Q3-Q4 2026
```

### Example Output (Excerpt)

```markdown
## Content Pillars

### Pillar 1: Cloud Migration Security
- Strategic Purpose: Lead generation — attracts CTOs planning cloud migrations
- Audience Connection: Fear of security gaps during migration, compliance uncertainty
- Content Types: Blog (deep dives), LinkedIn (quick tips), Email (checklist series)
- SEO Theme: "cloud migration security", "sichere cloud migration", "cloud security checklist"

#### Topics
1. Die 7 haeufigsten Sicherheitsluecken bei Cloud-Migrationen
2. Cloud Security Audit: Was CTOs vor der Migration pruefen muessen
3. Multi-Cloud vs. Single-Cloud: Sicherheitsimplikationen im Vergleich
4. Compliance-Checkliste: DSGVO-konforme Cloud-Migration in 12 Schritten
5. Zero Trust Architecture: Warum VPN allein nicht mehr reicht
6. Case Study: Wie {Kunde} die Migration ohne Security Incidents geschafft hat
```

### What NOT to Produce

- Generic content calendars with dates but no strategic foundation
- Lists of trending topics without connection to business goals
- Consumer-focused content ideas (viral posts, memes, engagement bait)
- Strategy documents that require a marketing agency to interpret

## Integration Notes

This skill works as the strategic foundation for other marketing skills:
- Use the topic list from this strategy as input for `/blog-post`
- Use pillar themes for `/linkedin-post` series planning
- Use the messaging framework for `/copywriting` landing page work
- The editorial calendar framework guides ongoing content production scheduling
