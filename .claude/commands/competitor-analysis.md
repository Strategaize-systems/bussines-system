# /competitor-analysis

## Purpose

Generate comprehensive competitive analyses with SWOT assessment, market positioning, feature comparison, and differentiation strategy for B2B markets.

Use this skill when:
- Entering a new market segment and needing to understand the competitive landscape
- Preparing for competitive deals where specific competitors are in play
- Updating an existing competitive analysis with new market intelligence
- Building a differentiation strategy for positioning, messaging, or pricing
- Evaluating whether to pursue or avoid a specific market niche based on competitive density
- Feeding competitive intelligence into sales materials, proposals, or content strategy

This skill produces a structured competitive analysis document. It does NOT produce sales-ready battle cards (use `/sales-enablement` for battle cards), outreach campaigns (use `/cold-email`), or marketing content (use `/blog-post` or `/copywriting`).

## Inputs

The user should provide:

### Required
- **Your company/product**: What do you offer? Who are you in this market?
- **Competitor names**: Which competitors should be analyzed? (2-5 competitors recommended)
- **Market/Industry**: What market or industry is this analysis for?

### Optional
- **Your positioning**: How do you currently position yourself? (or "unclear — help me define it")
- **Target customers**: Who are you and your competitors selling to? (company size, industry, role)
- **Competitive dimensions**: What matters most in this market? (price, features, service, brand, speed, compliance, local presence)
- **Known competitor strengths**: What do you already know about competitor advantages?
- **Known competitor weaknesses**: What do you already know about competitor vulnerabilities?
- **Competitor URLs**: Websites, LinkedIn pages, or other public sources for research
- **Pricing intelligence**: Any known pricing information about competitors
- **Win/loss data**: Why have you won or lost deals against specific competitors?
- **Company name**: Your company name (for brand guide lookup)
- **Language**: German or English (default: German for DACH market)
- **Analysis depth**: Quick overview (3-5 pages) or deep analysis (10-15 pages)

## Brand Context

Before creating the analysis, check if a brand guide exists:

1. Ask the user for the company name (or use it from the input)
2. Check if `/brand/{firmenname}/brand-guide.md` exists in the repository
3. If present, read and apply:
   - **Brand positioning** — use documented positioning as the baseline for competitive comparison
   - **Target audience definition** — ensure the competitive analysis focuses on the same audience segments the brand targets
   - **Key messaging frameworks** — identify where competitor messaging overlaps or conflicts with your brand messages
   - **Differentiators** — validate documented differentiators against competitive reality
4. If no brand guide exists:
   - Ask the user for their core positioning in 1-2 sentences
   - Ask what they believe makes them different from the named competitors
   - Note in the output that a brand guide via `/create-brand-system` would provide a stronger foundation for competitive positioning

### Voice Guide + Anti-Slop Rules

After loading the brand guide, also check:

1. Does a voice guide exist at `/brand/{firmenname}/voice/{zielgruppe}.md`? If the user specifies a target audience, load the matching voice guide for tone, vocabulary, and channel-specific rules.
2. Always apply the anti-slop rules from `/skills/brand/reference/anti-slop-rules.md` — no AI-tell phrases, active voice, concrete examples, varied sentence structure.
3. Priority: Anti-Slop Rules (baseline) → Brand Guide (tone) → Voice Guide (audience-specific). Voice Guide wins on conflicts.

## Process

### Step 1: Define the Competitive Frame

Before analyzing individual competitors:
- Define the market boundaries — what counts as a competitor and what does not?
- Identify competitor tiers:
  - **Direct competitors**: Same product/service, same target customer, same market
  - **Indirect competitors**: Different approach to the same problem (e.g., in-house team vs. outsourced service)
  - **Substitute competitors**: Entirely different solution category that solves the same underlying need
- Determine the key buying criteria — what does the target customer actually evaluate when choosing a provider?
- Establish the analysis dimensions — which factors will be compared across competitors?

**Standard competitive dimensions for B2B:**
- Product/service capabilities
- Pricing and pricing model
- Target customer fit (company size, industry, geography)
- Market position and brand recognition
- Service quality and customer support
- Technical depth or specialization
- Local presence and language (critical for DACH KMU market)
- References and case studies
- Compliance and certifications
- Onboarding speed and ease of engagement

### Step 2: Individual Competitor Profiles

For each competitor, build a structured profile:

**Company overview:**
- Name, headquarters, approximate size (employees, revenue if public)
- Founded, ownership structure (relevant for stability assessment)
- Core offering and market positioning
- Target customer segment

**Product/service analysis:**
- What do they offer?
- How is it delivered? (SaaS, project-based, retainer, hybrid)
- What is their primary value proposition?
- What are their known strengths?
- What are their known weaknesses or limitations?
- What is their pricing approach (if known)?

**Market presence:**
- Estimated market share or visibility in the target segment
- Marketing approach (content, events, advertising, referrals)
- LinkedIn presence, content activity, thought leadership visibility
- Customer references or public case studies
- Awards, certifications, partnerships

**Intelligence sources:**
- Company website
- LinkedIn company page and key employee profiles
- Public case studies and testimonials
- Review platforms (G2, Capterra, Trustpilot — where applicable)
- Industry reports and press mentions
- Win/loss data from the user
- Job postings (reveal strategic direction)

### Step 3: SWOT Analysis

For EACH competitor AND for your own company, produce a SWOT analysis:

**SWOT structure per entity:**

| | Helpful | Harmful |
|---|---|---|
| **Internal** | **Strengths** — What they do well, where they have advantage | **Weaknesses** — Where they are limited, vulnerable, or behind |
| **External** | **Opportunities** — Market trends or gaps they could exploit | **Threats** — External factors that could damage their position |

**SWOT quality rules:**
- Be specific — "Good product" is not a strength. "Fastest onboarding in the market (under 48h for SMB customers)" is a strength
- Be honest about your own SWOT — self-serving analysis is useless for strategic decision-making
- Distinguish between facts and assumptions — mark unverified intelligence as "assumed" or "estimated"
- Focus on buyer-relevant factors, not internal operational details the buyer never sees
- Limit each quadrant to 3-5 points to maintain clarity

### Step 4: Competitive Comparison Matrix

Build a side-by-side comparison across the defined competitive dimensions:

**Comparison matrix format:**

| Dimension | Your Company | Competitor A | Competitor B | Competitor C |
|-----------|-------------|-------------|-------------|-------------|
| Core offering | {description} | {description} | {description} | {description} |
| Target segment | {who} | {who} | {who} | {who} |
| Pricing model | {model} | {model} | {model} | {model} |
| Key strength | {strength} | {strength} | {strength} | {strength} |
| Key weakness | {weakness} | {weakness} | {weakness} | {weakness} |
| DACH presence | {rating} | {rating} | {rating} | {rating} |
| KMU fit | {rating} | {rating} | {rating} | {rating} |

Use a simple rating scale where appropriate: Strong / Adequate / Weak / Unknown

**Matrix rules:**
- The same dimensions must be evaluated for every entity — no cherry-picking dimensions where you win
- Rate honestly — if a competitor is stronger on a dimension, say so
- Include dimensions where you lose, not only where you win
- Mark unknowns as "Unknown" rather than guessing

### Step 5: Market Positioning Map

Define where each competitor sits on two key dimensions:

**Common positioning axes for B2B KMU markets:**
- Price (low-cost vs. premium) x Specialization (generalist vs. specialist)
- Service depth (self-service vs. full-service) x Technical complexity (simple vs. complex)
- Market focus (enterprise vs. KMU) x Geographic focus (local vs. international)

Select the two most relevant axes for this market and position each competitor.

Describe the positioning map in text format:
- Where each competitor sits
- Where white space exists (underserved positions)
- Where your company currently sits vs. where it should sit

### Step 6: Differentiation Strategy

Based on the analysis, develop a differentiation strategy:

**Differentiation framework:**

1. **Where you already win**: Dimensions where you are genuinely stronger — double down
2. **Where you can win**: Dimensions where competitors are weak and you can credibly improve
3. **Where you should not compete**: Dimensions where a competitor has an unassailable advantage — reframe or avoid
4. **White space opportunities**: Market positions or customer segments no competitor serves well

**For each recommended differentiator:**
- State the differentiator clearly
- Explain why it matters to the target buyer
- Provide evidence or proof points
- Describe how to communicate it (messaging angle)
- Assess sustainability — can competitors easily copy this?

### Step 7: Strategic Recommendations

Provide actionable recommendations:

**Competitive strategy recommendations:**
- Which competitors to position against directly and which to avoid
- Which market segments offer the best competitive advantage
- Which messaging angles to emphasize in sales and marketing
- Which product/service improvements would create the biggest competitive gap
- Where to invest in content or thought leadership to build differentiation

**Risk assessment:**
- Which competitor moves could threaten your position?
- Which market shifts could change the competitive landscape?
- What should you monitor? (competitor job postings, pricing changes, product launches)

### Step 8: Self-Review

Before presenting the output, verify:
- Is the analysis honest about your own weaknesses, not just competitor weaknesses?
- Are facts distinguished from assumptions throughout?
- Are recommendations actionable, not generic?
- Is the analysis focused on buyer-relevant factors, not internal operational details?
- Does the differentiation strategy produce specific messaging you can use?
- Does the analysis account for the DACH KMU market context?
- Does the tone match the brand guide (if used)?

## Output Format

Present the complete analysis directly in the response for review.

Additionally, save it as a Markdown file:

**File path**: `/content/analysis/{firmenname}-competitor-analysis-{YYYY-MM-DD}.md`

If the `/content/analysis/` directory does not exist, create it.

### Document Structure

```markdown
# Competitive Analysis — {Your Company} in {Market/Industry}

## Meta
- Date: {YYYY-MM-DD}
- Author: Generated via /competitor-analysis
- Company: {your company name}
- Market: {market/industry}
- Competitors Analyzed: {competitor names}
- Analysis Depth: {quick / deep}
- Brand Guide: {used / not available}
- Language: {de / en}

---

## Executive Summary
{1 page maximum. Key competitive position, main threats, main opportunities,
top 3 strategic recommendations.}

---

## Competitive Frame
{Market definition, competitor tiers, key buying criteria.}

---

## Competitor Profiles

### {Competitor A Name}
{Structured profile per Step 2.}

### {Competitor B Name}
{Structured profile per Step 2.}

---

## SWOT Analysis

### {Your Company} — SWOT
| | Helpful | Harmful |
|---|---|---|
| Internal | Strengths: ... | Weaknesses: ... |
| External | Opportunities: ... | Threats: ... |

### {Competitor A} — SWOT
{Same structure.}

---

## Competitive Comparison Matrix

| Dimension | {You} | {Comp A} | {Comp B} | {Comp C} |
|-----------|-------|----------|----------|----------|
| ... | ... | ... | ... | ... |

---

## Market Positioning
{Positioning map description, white space analysis.}

---

## Differentiation Strategy
{Where you win, where you can win, where you should not compete, white space.}

---

## Strategic Recommendations
{Actionable recommendations for positioning, messaging, product, and market focus.}

---

## Risk Assessment
{Competitive threats to monitor, market shifts, early warning indicators.}

---

## Intelligence Sources and Confidence
{List sources used and confidence level for key claims.}
- {Claim}: {source} — confidence: {high / medium / low / assumed}

---

## Next Steps
{What to do with this analysis — update battle cards, adjust messaging,
monitor specific indicators.}
```

## Quality Criteria

A good competitive analysis must:

1. **Be honest** — Self-serving analysis is worse than no analysis. If a competitor is better at something, say so. The value is in accurate understanding, not in confirmation bias
2. **Be buyer-focused** — Evaluate competitors through the lens of what the target buyer actually cares about, not what you think should matter
3. **Distinguish facts from assumptions** — Every claim should have a source or be explicitly marked as an assumption. Do not present guesses as intelligence
4. **Be actionable** — The analysis should produce specific things to do: messaging angles, market segments to target, features to build, content to create. A competitive analysis that only describes the landscape without recommending action is an academic exercise
5. **Be specific to the market** — Generic competitive frameworks without market context are useless. The analysis must account for DACH market dynamics, KMU decision-making, local presence requirements, and the specific industry context
6. **Be concise where depth is not needed** — A quick competitive overview for a pitch does not need 15 pages. Match the depth to the purpose
7. **Include your own weaknesses** — An analysis that only shows competitor weaknesses and your strengths is propaganda, not intelligence. Include an honest self-SWOT
8. **Be time-stamped and updateable** — Competitive landscapes change. The analysis should be structured so that individual competitor profiles can be updated without rewriting the entire document

## Examples

### Example Input
```
Your company: DigitalBerater GmbH — IT-Beratung fuer den Mittelstand
Competitors: Bechtle, Computacenter, lokales Systemhaus "IT-Schmidt"
Market: Managed IT Services fuer produzierende KMU in Sueddeutschland (50-300 MA)
Target customers: Geschaeftsfuehrer und IT-Leiter, produzierende Unternehmen
Competitive dimensions: Preis, persoenliche Betreuung, Reaktionszeit, Cloud-Kompetenz,
  lokale Naehe, KMU-Verstaendnis
Win/loss data:
  - Won against IT-Schmidt: client valued our cloud expertise, they only do on-premise
  - Lost against Bechtle: client wanted a "big name" for compliance reasons
  - Won against Computacenter: they were too enterprise-focused, client felt too small for them
Language: Deutsch
```

### Example Output (Positioning Map Excerpt)

```markdown
## Market Positioning

### Positioning Map: Spezialisierung x Unternehmensgroesse

**Achse X**: Generalist <-------> Spezialist (Cloud + Managed IT)
**Achse Y**: Enterprise-Fokus <-------> KMU-Fokus

- **Bechtle**: Mitte-rechts auf Spezialisierung, stark Enterprise-orientiert.
  KMU-Geschaeft existiert, ist aber nicht der Fokus. Markenbekanntheit
  kompensiert fehlende KMU-Naehe.

- **Computacenter**: Rechts auf Spezialisierung, stark Enterprise.
  KMU unter 200 MA sind wirtschaftlich uninteressant fuer ihr Modell.
  Staerke bei Grossunternehmen, Schwaeche bei KMU-Betreuung.

- **IT-Schmidt**: Links auf Spezialisierung (Generalist/On-Premise),
  stark KMU-orientiert. Maximale lokale Naehe, minimale Cloud-Kompetenz.
  Beziehungsgetrieben, nicht kompetenzgetrieben.

- **DigitalBerater** (Sie): Mitte-rechts auf Spezialisierung (Cloud + Managed),
  stark KMU-orientiert. Kombination aus Cloud-Kompetenz und KMU-Verstaendnis
  ist die differenzierende Position.

### White Space
Die Kombination "Cloud-Spezialist + echte KMU-Naehe + persoenliche Betreuung"
ist eine Position, die keiner der analysierten Wettbewerber besetzt.
Bechtle hat die Kompetenz, aber nicht die KMU-Naehe. IT-Schmidt hat die
Naehe, aber nicht die Kompetenz. Computacenter hat beides nicht fuer
dieses Segment.
```

### Example Output (Differentiation Strategy Excerpt)

```markdown
## Differentiation Strategy

### Where You Already Win
1. **Persoenliche Betreuung + Cloud-Kompetenz**: Kein analysierter Wettbewerber
   bietet beides in dieser Kombination fuer KMU unter 300 MA.
   - Buyer-Relevanz: KMU-Geschaeftsfuehrer wollen einen Ansprechpartner, der
     ihr Unternehmen kennt und gleichzeitig technisch auf Cloud-Niveau beraten kann.
   - Messaging: "Ihr persoenlicher IT-Berater — mit der Kompetenz eines
     Grossberatungshauses."

### Where You Should Not Compete
1. **Markenbekanntheit gegen Bechtle**: In Deals, wo "grosser Name" ein
   Entscheidungskriterium ist (z.B. Compliance-getriebene Branchen),
   ist Bechtle nicht schlagbar. Reframing: Positionieren Sie sich als
   "der Berater, der Sie persoenlich kennt" statt zu versuchen, als
   gleichwertiger Konzern aufzutreten.
```

### What NOT to Produce

- Analysis that only highlights competitor weaknesses and ignores your own
- Generic SWOT quadrants copied from strategy textbooks without market specificity
- Analysis based entirely on assumptions without marking them as such
- Overly academic frameworks without actionable recommendations
- Analysis that ignores the DACH KMU context (e.g., treating the market like a US enterprise market)
- Competitor profiles that read like Wikipedia summaries instead of buyer-relevant intelligence

## Integration Notes

- Competitive intelligence feeds directly into `/sales-enablement` battle cards
- Differentiation strategy informs `/cold-email` value propositions and angle selection
- Market positioning insights guide `/content-strategy` pillar selection and thought leadership angles
- Competitor messaging analysis helps `/copywriting` differentiate landing page positioning
- Win/loss patterns can inform `/create-proposal` competitive sections
- Update this analysis quarterly or when a major competitive shift occurs (new competitor entry, pricing change, acquisition)
