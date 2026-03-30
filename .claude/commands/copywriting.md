# /copywriting

## Purpose

Create conversion-optimized web copy for B2B landing pages, hero sections, product pages, CTAs, and other website content.

Use this skill when:
- Building a new landing page for a product, service, or campaign
- Rewriting underperforming web copy
- Creating hero sections, value propositions, or feature descriptions
- Writing CTAs, pricing page copy, or testimonial framing
- Drafting "About Us" or company positioning pages

This skill produces ready-to-use web copy. It does NOT produce blog content (use `/blog-post`), social media posts (use `/linkedin-post`), or strategic planning (use `/content-strategy`).

## Inputs

The user should provide:

### Required
- **Product/Service**: What is being offered? What does it do?
- **Target audience**: Who is this page for? (job titles, company size, industry)
- **Page type**: What kind of page? (landing page, hero section, product page, pricing page, about page, feature page, CTA block)
- **Key benefits**: 3-5 main benefits or value propositions

### Optional
- **Pain points**: What problems does the audience face that this product/service solves?
- **Differentiators**: What makes this offering different from alternatives?
- **Social proof**: Available testimonials, case studies, client logos, numbers
- **Desired action**: What should the visitor do? (book a demo, sign up, download, contact)
- **Existing copy**: Current page copy to improve (if rewriting)
- **SEO keywords**: Target keywords for the page
- **Page structure**: Specific sections needed (hero, features, testimonials, FAQ, CTA)
- **Brand name**: Company name to check for brand guide

## Brand Context

Before writing copy, check if a brand guide exists:

1. Ask the user for the company name (or use it from the input)
2. Check if `/brand/{firmenname}/brand-guide.md` exists in the repository
3. If present, read and apply:
   - **Brand voice and tone** — all copy must match the documented voice (e.g., "confident but not arrogant", "technical but accessible")
   - **Key messaging frameworks** — use established value propositions, taglines, and positioning statements as foundation
   - **Target audience definition** — enrich the user's audience input with the brand guide's audience research
   - **Terminology preferences** — use the brand's preferred terms (e.g., "Kunden" vs. "Partner", "Loesung" vs. "Produkt")
   - **Brand personality** — reflect personality traits in word choice, sentence rhythm, and overall feel
4. If no brand guide exists:
   - Ask the user: "Formal or conversational? Technical or accessible? Bold or understated?"
   - Ask for any specific words or phrases they want included or avoided
   - Note in the output that a brand guide via `/create-brand-system` would improve consistency

### Voice Guide + Anti-Slop Rules

After loading the brand guide, also check:

1. Does a voice guide exist at `/brand/{firmenname}/voice/{zielgruppe}.md`? If the user specifies a target audience, load the matching voice guide for tone, vocabulary, and channel-specific rules.
2. Always apply the anti-slop rules from `/skills/brand/reference/anti-slop-rules.md` — no AI-tell phrases, active voice, concrete examples, varied sentence structure.
3. Priority: Anti-Slop Rules (baseline) → Brand Guide (tone) → Voice Guide (audience-specific). Voice Guide wins on conflicts.

## Process

### Step 1: Audience and Intent Analysis

Before writing a single word:
- Clarify who is reading this page and what stage of the buying journey they are in
- Identify the primary emotion or concern driving the visit (fear, curiosity, urgency, comparison)
- Define the one thing the reader should believe after reading the page
- Define the one action the reader should take

Map the page type to the buyer journey:
- **Awareness**: Hero sections, About pages, educational landing pages
- **Consideration**: Product pages, feature pages, comparison content
- **Decision**: Pricing pages, demo CTAs, testimonial sections

### Step 2: Message Architecture

Build the messaging hierarchy before writing full copy:

1. **Primary headline**: The single most compelling statement (addresses the core pain or promise)
2. **Supporting subheadline**: Expands on the headline with specifics
3. **Value propositions**: 3-5 benefit statements, ordered by impact
4. **Proof points**: Evidence that supports each claim (numbers, testimonials, logos)
5. **Objection handling**: Address the top 2-3 objections implicitly or explicitly
6. **Call to action**: Clear, specific, low-friction next step

### Step 3: Write the Copy

Apply these B2B copywriting principles:

**Headlines**:
- Lead with the outcome, not the product
- Be specific — vague headlines do not convert
- Use numbers when credible ("reduce onboarding time by 60%")
- Avoid jargon unless the audience speaks it fluently

**Body copy**:
- Short paragraphs (2-3 sentences max)
- One idea per paragraph
- Use "you" and "your" — address the reader directly
- Benefits before features — what changes for them, then how
- Concrete over abstract — "save 12 hours per week" beats "increase efficiency"

**CTAs**:
- Action-oriented verbs ("Start your free trial", "Book a 15-minute demo")
- Reduce friction — indicate what happens next ("No credit card required")
- One primary CTA per page section. Secondary CTAs are acceptable but visually subordinate

**Social proof**:
- Specific over generic ("helped 340 companies" beats "trusted by many")
- Include role and company in testimonials
- Use numbers that are meaningful to the audience

### Step 4: Structure the Output

Organize copy by page sections. Each section includes:
- Section label (e.g., "Hero", "Features Grid", "Social Proof", "Final CTA")
- Headline for the section
- Body copy
- CTA if applicable
- Notes for design/layout where relevant

### Step 5: SEO Integration

If SEO keywords were provided:
- Include the primary keyword in the main headline or subheadline
- Use secondary keywords naturally in subheadings and body copy
- Write a meta title (max 60 characters) and meta description (max 155 characters)
- Do not keyword-stuff — readability and conversion always win over keyword density

### Step 6: Self-Review

Before presenting the output, check:
- Does every section serve the page goal?
- Is the copy scannable? (headers, short paragraphs, bullet points where appropriate)
- Are benefits specific and credible?
- Is there a clear CTA visible without scrolling?
- Does the tone match the brand guide (if used)?
- Would a B2B decision-maker find this persuasive, not salesy?

## Output Format

Save the copy as a Markdown file:

**File path**: `/content/copy/{firmenname}-{page-type}-{YYYY-MM-DD}.md`

If the `/content/copy/` directory does not exist, create it.

### Document Structure

```markdown
# Web Copy — {Page Type} — {Company/Product Name}

## Meta
- Date: {YYYY-MM-DD}
- Author: Generated via /copywriting
- Page Type: {landing page / hero / product page / etc.}
- Target Audience: {audience summary}
- Primary CTA: {desired action}
- Brand Guide: {used / not available}
- SEO Keywords: {if provided}

## Meta Tags
- Title: {max 60 chars}
- Description: {max 155 chars}

---

## Hero Section

### Headline
{Primary headline}

### Subheadline
{Supporting statement}

### CTA
{Button text} | {Supporting micro-copy}

---

## {Section Name}

### Headline
{Section headline}

{Body copy}

### {Subsection if needed}
{Copy}

---

## Final CTA Section

### Headline
{Closing headline}

### Body
{Final persuasive copy}

### CTA
{Button text} | {Supporting micro-copy}

---

## Copy Notes
{Any notes for the designer or developer: tone intent, layout suggestions, image direction}
```

## Quality Criteria

Good B2B web copy must:

1. **Convert** — The copy must drive the reader toward the desired action. Beautiful prose that does not convert is creative writing, not copywriting
2. **Be specific** — Every claim should be grounded in concrete outcomes, numbers, or evidence. Avoid vague superlatives ("best-in-class", "world-leading", "innovative")
3. **Respect the reader's intelligence** — B2B buyers are professionals. Do not be condescending, do not over-explain, do not use manipulative urgency tactics
4. **Be scannable** — Most web visitors scan before they read. Headlines, subheadlines, and bullet points must carry the core message even if body copy is skipped
5. **Sound human** — Even in B2B, a real person is reading. Avoid corporate emptiness ("leveraging synergies", "paradigm-shifting solutions")
6. **Match the brand** — If a brand guide was used, the copy must feel like it belongs to this company, not like it was generated from a template
7. **Be complete** — All requested sections must be filled. No placeholder text, no "[insert testimonial here]" unless specifically flagged as needing real data
8. **Be appropriately long** — Hero sections should be punchy (5-15 words headline). Feature descriptions can be longer. Do not pad thin content or truncate complex value propositions

## Examples

### Example Input
```
Product: TimeTrack Pro — Zeiterfassungssoftware fuer Beratungsunternehmen
Target audience: Geschaeftsfuehrer and Projektleiter at consulting firms (20-200 Mitarbeiter)
Page type: Landing page
Key benefits:
  1. Automatische Projektzuordnung spart 5h/Woche pro Berater
  2. Echtzeit-Auslastungsuebersicht fuer bessere Staffing-Entscheidungen
  3. Nahtlose Integration mit DATEV und gaengigen Buchhaltungstools
  4. DSGVO-konform, Hosting in Deutschland
Desired action: Demo buchen
Pain points: Manuelle Zeiterfassung ist ungenau, Berater vergessen Eintraege, keine Echtzeit-Sicht auf Projektprofitabilitaet
```

### Example Output (Excerpt)

```markdown
## Hero Section

### Headline
Jede Beraterstunde erfasst. Jedes Projekt profitabel.

### Subheadline
TimeTrack Pro automatisiert die Zeiterfassung fuer Beratungsunternehmen —
damit Ihre Berater beraten statt dokumentieren.

### CTA
Demo vereinbaren — 15 Minuten, unverbindlich | Kein Kreditkarte erforderlich

---

## Problem Section

### Headline
Zeiterfassung kostet Sie mehr als nur Zeit

Ihre Berater verbringen durchschnittlich 5 Stunden pro Woche mit manueller
Zeiterfassung. Eintraege werden nachtraeglich geschaetzt, Projekte falsch
zugeordnet, und die tatsaechliche Profitabilitaet sehen Sie erst bei der
Abrechnung.

Das Ergebnis: ungenaue Rechnungen, verpasste Nachkalkulationen und
Staffing-Entscheidungen auf Basis von Bauchgefuehl statt Daten.
```

### What NOT to Produce

- Marketing fluff without substance ("revolutionize your workflow with our cutting-edge solution")
- B2C-style emotional manipulation (countdown timers, fake scarcity, guilt-based CTAs)
- Feature lists without benefit framing ("includes API access, SSO, and role management" without explaining why that matters)
- Copy that requires the reader to already understand the product to understand the page

## Integration Notes

- Use `/content-strategy` output as context for which messages and positioning to emphasize
- Web copy can feed into `/linkedin-post` for promotional posts about the page
- Hero copy and value propositions can be repurposed for email subject lines and ad headlines
- If writing copy for multiple pages of the same company, maintain consistency by always loading the brand guide
