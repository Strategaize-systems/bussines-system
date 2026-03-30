# /sales-enablement

## Purpose

Generate sales materials that help close B2B deals: pitch deck outlines, one-pagers, objection handling documents, battle cards, and conversation guides.

Use this skill when:
- Preparing for a sales meeting or pitch presentation
- Creating leave-behind materials for prospects after a call
- Building objection handling guides for recurring prospect concerns
- Creating competitive battle cards for specific deal situations
- Standardizing sales collateral across a team or offering
- Onboarding a new salesperson or consultant who needs product knowledge

This skill produces structured sales documents in Markdown format. It does NOT produce email outreach (use `/cold-email`), formal proposals (use `/create-proposal`), or marketing content (use `/blog-post` or `/copywriting`).

## Inputs

The user should provide:

### Required
- **Product/Service**: What are you selling? What does it do?
- **Target audience**: Who are you selling to? (job title, company size, industry)
- **Document type**: Which sales material is needed? One or more of:
  - **Pitch deck outline** — Slide-by-slide structure with key messages per slide
  - **One-pager** — Single-page overview for leave-behind or email attachment
  - **Objection handling** — Structured responses to common prospect objections
  - **Battle card** — Side-by-side competitive comparison for a specific competitor
  - **Conversation guide** — Talk track for discovery calls or demo meetings

### Optional
- **Key competitors**: Who are you competing against in deals?
- **Pricing model**: How is the product/service priced? (per user, project-based, retainer, tiered)
- **Key differentiators**: What makes your offering different from alternatives?
- **Case studies**: Client results or success stories to reference
- **Common objections**: Objections the sales team hears frequently
- **Sales stage**: Where in the pipeline is this material used? (prospecting, discovery, demo, proposal, negotiation, close)
- **Company name**: For brand guide lookup
- **Language**: German or English (default: German for DACH market)

## Brand Context

Before creating sales materials, check if a brand guide exists:

1. Ask the user for the company name (or use it from the input)
2. Check if `/brand/{firmenname}/brand-guide.md` exists in the repository
3. If present, read and apply:
   - **Brand voice and tone** — sales materials must match the brand voice, adapted for direct sales conversation context
   - **Key messaging frameworks** — use established value propositions and positioning as the foundation for all materials
   - **Target audience definition** — enrich the user's audience input with the brand's documented audience profile
   - **Terminology preferences** — maintain consistent terminology across all sales documents
   - **Positioning statements** — competitive positioning must align with the brand's documented market position
4. If no brand guide exists:
   - Ask the user for their core positioning in 1-2 sentences
   - Ask for the primary reason clients choose them over competitors
   - Note in the output that a brand guide via `/create-brand-system` would improve consistency across sales materials

### Voice Guide + Anti-Slop Rules

After loading the brand guide, also check:

1. Does a voice guide exist at `/brand/{firmenname}/voice/{zielgruppe}.md`? If the user specifies a target audience, load the matching voice guide for tone, vocabulary, and channel-specific rules.
2. Always apply the anti-slop rules from `/skills/brand/reference/anti-slop-rules.md` — no AI-tell phrases, active voice, concrete examples, varied sentence structure.
3. Priority: Anti-Slop Rules (baseline) → Brand Guide (tone) → Voice Guide (audience-specific). Voice Guide wins on conflicts.

## Process

### Step 1: Sales Context Analysis

Before creating any material:
- Understand the buyer's decision process — who else is involved? (technical evaluator, budget holder, champion, blocker)
- Map the sales stage — what has the prospect already seen, heard, or discussed?
- Identify the decision criteria — what does the buyer actually care about? (cost, risk, speed, compliance, team capacity)
- Understand the competitive landscape — who else is the prospect considering?
- Define the material's job — what should the prospect think, feel, or do after consuming this material?

### Step 2: Document-Specific Generation

Generate the requested document(s) following the templates below.

---

#### Pitch Deck Outline

A pitch deck outline provides slide-by-slide structure with key messages, talking points, and visual suggestions.

**Standard B2B pitch deck structure (10-12 slides):**

| Slide | Purpose | Key Content |
|-------|---------|-------------|
| 1 | Title | Company name, tagline, meeting context |
| 2 | Problem | The pain point in the prospect's world — make it specific |
| 3 | Impact | What this problem costs (time, money, risk, opportunity) |
| 4 | Solution overview | What you do, in one clear sentence |
| 5 | How it works | 3-step or visual explanation of the approach |
| 6 | Key benefits | 3-4 outcomes with supporting data |
| 7 | Social proof | Case study, testimonial, or client results |
| 8 | Differentiators | Why you vs. alternatives (without naming competitors directly) |
| 9 | Pricing/engagement model | How you work together (keep it simple) |
| 10 | Implementation | Timeline, onboarding, what happens next |
| 11 | Team | Relevant team members or credentials |
| 12 | Next steps | Clear CTA, specific next action |

For each slide, provide:
- **Headline**: The main message (what the audience should take away)
- **Key points**: 2-4 bullet points for content
- **Talking notes**: What the presenter should say (not read from the slide)
- **Visual suggestion**: What should be on the slide visually

**Pitch deck rules:**
- One message per slide — if a slide has two messages, split it
- Headlines should be statements, not labels ("Wir reduzieren Ihre IT-Kosten um 30%" not "Unsere Vorteile")
- Data beats claims — use numbers wherever possible
- The deck should work without a presenter (leave-behind test)
- Keep text minimal on slides — the talking notes carry the detail

---

#### One-Pager

A one-pager is a single-page overview document for email attachments, leave-behinds, or quick reference.

**One-pager structure:**

1. **Headline**: Primary value proposition in one sentence
2. **Problem statement**: 2-3 sentences about the pain point
3. **Solution overview**: What you do, in plain language (3-4 sentences)
4. **Key benefits**: 3-4 bullet points with specific outcomes
5. **Social proof**: One case study result or key metric
6. **How it works**: 3-step overview
7. **CTA**: Clear next step with contact information

**One-pager rules:**
- Must fit on one printed page (approximately 400-500 words)
- Scannable in 30 seconds — use headers, bold text, and bullets
- No jargon the prospect would not understand
- Include contact information and a specific CTA
- Visual hierarchy: headline > benefits > proof > CTA

---

#### Objection Handling Document

An objection handling guide provides structured responses to common prospect pushback.

**Per objection, provide:**

1. **The objection**: Exact words the prospect uses
2. **What they really mean**: The underlying concern behind the objection
3. **Acknowledge**: How to validate their concern (never dismiss it)
4. **Reframe**: How to shift the perspective
5. **Respond**: The core response with evidence
6. **Proof point**: A specific example, case study, or data point
7. **Bridge**: How to move the conversation forward after handling the objection

**Common B2B objection categories to cover:**
- Price / budget ("Das ist zu teuer", "Wir haben kein Budget dafuer")
- Timing ("Jetzt ist nicht der richtige Zeitpunkt")
- Competition ("Wir nutzen bereits Anbieter X")
- Internal ("Das muessen wir intern erst abstimmen")
- Risk ("Was wenn es nicht funktioniert?")
- Need ("Brauchen wir aktuell nicht")
- Authority ("Ich bin nicht der Entscheider")

Generate 6-10 objection responses based on the product/service and target audience.

---

#### Battle Card

A battle card provides a quick-reference competitive comparison for a specific competitor.

**Battle card structure:**

1. **Competitor overview**: Who they are, what they offer, who they target
2. **Where they win**: Honest assessment of competitor strengths
3. **Where we win**: Our advantages and differentiators
4. **Head-to-head comparison**: Feature/capability comparison table
5. **Landmines**: Questions to ask the prospect that expose competitor weaknesses (without naming the competitor directly)
6. **Counter-arguments**: How to respond when the prospect brings up competitor claims
7. **Proof points**: Case studies or data that demonstrate our advantage
8. **When to walk away**: Scenarios where the competitor is genuinely the better fit (intellectual honesty builds credibility)

**Battle card rules:**
- Be honest — exaggerating weaknesses of competitors destroys credibility when the prospect has done their own research
- Focus on buyer-relevant differences, not technical feature wars
- Never badmouth the competitor directly — position through strengths, not attacks
- Keep it to one page maximum for quick reference during calls

---

#### Conversation Guide

A conversation guide provides a structured talk track for discovery calls, demos, or follow-up meetings.

**Conversation guide structure:**

1. **Opening** (2 minutes): How to open the conversation, set the agenda, build rapport
2. **Discovery questions** (10-15 minutes): Open-ended questions to understand the prospect's situation, grouped by theme
3. **Transition**: How to move from discovery to presenting your solution
4. **Key talking points** (5-10 minutes): Core messages to deliver, tied to discovered pain points
5. **Demo moments** (if applicable): Key features to show and the story to tell with each
6. **Objection responses**: Quick-reference responses for likely objections in this conversation
7. **Close and next steps** (2 minutes): How to end the conversation with a clear next action

**Discovery question principles:**
- Open-ended questions, not yes/no
- Pain-focused, not feature-focused
- Listen more than talk (the guide should emphasize listening pauses)
- Build on their answers — provide branching follow-up questions

### Step 3: Cross-Reference Materials

If multiple document types are requested:
- Ensure consistent messaging across all materials
- Value propositions in the pitch deck must match the one-pager
- Objection handling must align with battle card positioning
- Conversation guide talking points must reference the same proof points

### Step 4: Self-Review

Before presenting the output, verify:
- Does every material serve a specific sales stage and audience?
- Is the language buyer-focused, not seller-focused? (their problem, not your features)
- Are proof points specific and credible? (no "viele Kunden" — use numbers)
- Does the tone match the brand guide (if used)?
- Would a salesperson actually use this material in a real conversation?
- Is every document concise enough for its intended format?

## Output Format

Present all materials directly in the response for review.

Additionally, save each document as a separate Markdown file:

**File paths:**
- Pitch deck: `/content/sales/{firmenname}-pitch-deck-{YYYY-MM-DD}.md`
- One-pager: `/content/sales/{firmenname}-one-pager-{YYYY-MM-DD}.md`
- Objection handling: `/content/sales/{firmenname}-objection-handling-{YYYY-MM-DD}.md`
- Battle card: `/content/sales/{firmenname}-battle-card-{competitor}-{YYYY-MM-DD}.md`
- Conversation guide: `/content/sales/{firmenname}-conversation-guide-{YYYY-MM-DD}.md`

If the `/content/sales/` directory does not exist, create it.

### Document Structure (applies to all document types)

```markdown
# {Document Type} — {Product/Service Name}

## Meta
- Date: {YYYY-MM-DD}
- Author: Generated via /sales-enablement
- Document Type: {pitch deck / one-pager / objection handling / battle card / conversation guide}
- Target Audience: {buyer persona}
- Sales Stage: {prospecting / discovery / demo / proposal / negotiation}
- Brand Guide: {used / not available}
- Language: {de / en}

---

{Document content, structured per document type template above}

---

## Usage Notes
- {When to use this material}
- {How to customize for specific prospects}
- {What to update when pricing or product changes}
```

## Quality Criteria

Good sales enablement materials must:

1. **Be buyer-centric** — Every sentence should be about the prospect's world, not yours. "Wir sind fuehrend in..." is seller-centric. "Sie verlieren 20% Ihrer IT-Kapazitaet an manuelle Prozesse" is buyer-centric
2. **Be specific** — Vague claims kill credibility. "Wir sparen Ihnen Zeit" is weak. "Unsere Kunden reduzieren den Onboarding-Aufwand um durchschnittlich 12 Stunden pro Monat" is specific
3. **Be honest** — Do not overclaim. Sales materials that overpromise create implementation problems later. If a competitor is better at something, say so — it builds trust
4. **Be practical** — A salesperson should be able to use this material within 5 minutes of reading it. No theory, no marketing fluff, no academic frameworks
5. **Be concise** — One-pagers must be one page. Battle cards must be one page. Pitch decks must be 10-12 slides. Objection responses must be 3-4 sentences, not paragraphs
6. **Support the conversation** — Sales materials are conversation tools, not monologues. They should help the salesperson listen, respond, and guide — not lecture
7. **Be internally consistent** — All materials for the same product must tell the same story with the same numbers and the same proof points
8. **Be updateable** — Structure materials so that pricing, case studies, or competitive information can be updated without rewriting the entire document

## Examples

### Example Input
```
Product: Managed IT-Operations fuer Mittelstand
Target audience: Geschaeftsfuehrer, 50-200 Mitarbeiter, produzierende Unternehmen
Document types: One-pager, Objection handling
Key competitors: Bechtle, local IT-Systemhaeuser
Pricing: Monatliche Pauschale pro Arbeitsplatz
Differentiators:
  1. Persoenlicher IT-Ansprechpartner statt Ticketsystem
  2. Proaktives Monitoring statt reaktiver Feuerwehr
  3. Festpreis ohne versteckte Kosten
Case study: Fertigungsunternehmen mit 120 MA, IT-Ausfallzeit um 80% reduziert
Language: Deutsch
```

### Example Output (One-Pager Excerpt)

```markdown
# Ihre IT laeuft. Immer.

## Das Problem
Mittelstaendische Fertigungsunternehmen verlassen sich auf IT-Infrastruktur,
die niemand systematisch ueberwacht. IT-Ausfaelle kosten im Schnitt
5.600 EUR pro Stunde an Produktivitaetsverlust — und die meisten
koennten verhindert werden.

## Die Loesung
Managed IT-Operations: Ihr persoenlicher IT-Ansprechpartner ueberwacht
Ihre Systeme proaktiv, behebt Probleme bevor sie eskalieren, und steht
Ihrem Team als direkter Kontakt zur Verfuegung — kein Ticketsystem,
kein Callcenter.

## Was Sie davon haben
- 80% weniger IT-Ausfallzeit (gemessen bei vergleichbaren Kunden)
- Ein fester Ansprechpartner, der Ihre Infrastruktur kennt
- Monatliche Festpauschale ohne versteckte Kosten
- Proaktives Monitoring statt reaktiver Feuerwehr
```

### Example Output (Objection Handling Excerpt)

```markdown
### "Wir haben bereits einen IT-Dienstleister"

**Was sie wirklich meinen**: "Warum sollte ich wechseln? Wechseln ist aufwaendig."

**Anerkennen**: "Verstehe ich vollkommen. Die meisten unserer Kunden hatten
vorher auch einen IT-Dienstleister — und der war nicht schlecht."

**Umrahmen**: "Die Frage ist nicht, ob Ihr aktueller Anbieter schlecht ist.
Die Frage ist, ob Sie systematisch ueberwacht werden oder ob Sie erst
anrufen, wenn etwas kaputt ist."

**Antwort**: "Wir sehen bei 7 von 10 Neukunden, dass der bisherige Dienstleister
reaktiv arbeitet — also erst handelt, wenn ein Ticket kommt. Unser Modell
erkennt Probleme durch proaktives Monitoring, bevor sie zu Ausfaellen werden.
Das ist der Unterschied."

**Beweispunkt**: "Unser Kunde {Firma}, Fertigung mit 120 MA, hatte vorher
denselben Ansatz. Nach dem Wechsel: 80% weniger ungeplante Ausfallzeit
im ersten Jahr."

**Ueberleitung**: "Darf ich Ihnen zeigen, wie unser Monitoring konkret
aussieht? Das dauert 10 Minuten."
```

### What NOT to Produce

- Feature lists without buyer context
- Generic templates that could apply to any product
- Battle cards that only list your own strengths
- Objection handling that dismisses or argues with the prospect
- Pitch decks with 25+ slides
- Materials full of industry jargon the buyer does not use
- One-pagers that are actually three-pagers

## Integration Notes

- Use `/content-strategy` brand messaging as the foundation for sales messaging consistency
- Use `/cold-email` sequence analysis to identify which objections arise most frequently
- Sales materials can reference blog posts or resources created with `/blog-post`
- When a deal progresses, use `/create-proposal` to build a formal proposal from sales enablement materials
- Battle cards should be updated whenever `/competitor-analysis` produces new competitive intelligence
- Successful objection handling patterns can inform `/cold-email` value propositions
