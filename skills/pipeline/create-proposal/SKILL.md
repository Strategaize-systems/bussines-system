# /create-proposal

## Purpose

Generate complete, professional client proposals for B2B consulting and service engagements, including executive summary, scope, methodology, pricing, ROI projection, timeline, and follow-up plan.

Use this skill when:
- Creating a proposal for a new client engagement after discovery calls
- Responding to a request for proposal (RFP/Anfrage)
- Formalizing a verbal agreement into a structured document
- Creating a scope extension or upsell proposal for an existing client
- Building a proposal template for a recurring service offering

This skill produces a comprehensive, client-ready proposal document in Markdown format. It does NOT produce pitch materials (use `/sales-enablement`), outreach emails (use `/cold-email`), or web copy (use `/copywriting`).

## Inputs

The user should provide:

### Required
- **Client name**: Company name of the prospective client
- **Project description**: What is the proposed engagement about? (2-5 sentences)
- **Scope**: What is included in this engagement? What are the key deliverables?
- **Pricing**: How much does this cost? (fixed price, daily rate, retainer, tiered options)
- **Timeline**: How long will the engagement take? Key milestones?

### Optional
- **Client industry**: Industry and company size for contextual relevance
- **Client pain points**: What problems surfaced during discovery? (from calls, emails, or CRM notes)
- **Decision makers**: Who will read this proposal? (CEO, CTO, Einkauf, Fachbereich)
- **Competitors in the deal**: Who else is the client considering?
- **Methodology**: Specific approach or framework you will use
- **Team members**: Who will work on this project? (names, roles, credentials)
- **ROI inputs**: Data to calculate or estimate ROI (current costs, expected savings, productivity gains)
- **Payment terms**: Payment schedule, invoicing cadence
- **Legal or compliance requirements**: Special terms, NDAs, DSGVO considerations
- **Previous engagement**: Has this client worked with you before? What was the context?
- **Proposal urgency**: When does the client need the proposal?
- **Company name**: Your company name (for brand guide lookup)
- **Language**: German or English (default: German for DACH market)

## Brand Context

Before writing the proposal, check if a brand guide exists:

1. Ask the user for the company name (the sender, not the client)
2. Check if `/brand/{firmenname}/brand-guide.md` exists in the repository
3. If present, read and apply:
   - **Brand voice and tone** — the proposal must reflect the brand's documented voice, adapted for formal proposal communication
   - **Key messaging frameworks** — use established positioning and value proposition language
   - **Visual identity notes** — reference brand colors, logo placement, and formatting preferences for any design implementation
   - **Terminology preferences** — use the brand's preferred terms throughout the proposal
4. If no brand guide exists:
   - Use a professional, confident, and clear default tone
   - Avoid overly casual language — proposals are formal business documents
   - Note in the output that a brand guide via `/create-brand-system` would improve proposal consistency

## Process

### Step 1: Client Context Analysis

Before writing the proposal:
- Review all available information about the client (pain points, industry, size, decision process)
- Identify the primary decision maker and their priorities (cost? speed? risk? quality? compliance?)
- Understand the competitive situation — is this a sole-source proposal or a competitive bid?
- Define the proposal's job — is it to close, to differentiate, or to formalize an agreement already reached verbally?
- Determine the appropriate level of detail — a CEO wants outcomes and numbers, a technical evaluator wants methodology and scope detail

### Step 2: Structure the Proposal

A B2B proposal follows a standard structure with room for customization:

**Standard proposal sections:**

1. **Cover page** — Client name, project title, your company, date, proposal reference number
2. **Executive summary** — The entire proposal condensed into one page for the decision maker who will not read the rest
3. **Understanding of the situation** — Demonstrate that you understand their problem and context
4. **Proposed approach** — What you will do, how you will do it, and why this approach
5. **Scope and deliverables** — Explicit list of what is included (and what is not)
6. **Methodology** — Your framework or process for delivering the work
7. **Timeline and milestones** — Visual or tabular timeline with key dates
8. **Team** — Who will work on this, their qualifications, and their roles
9. **Investment** — Pricing, payment terms, and what is included at each level
10. **ROI projection** — Expected return, cost savings, or value created
11. **Risk mitigation** — How risks are managed, what happens if things change
12. **Case studies / references** — Proof that you have done this before
13. **Terms and conditions** — Standard engagement terms
14. **Next steps** — Exactly what happens after the client says yes
15. **Follow-up plan** — When and how you will follow up on this proposal

### Step 3: Write Each Section

#### Executive Summary

The most important section. Many decision makers read only this page.

**Executive summary rules:**
- Maximum one page (300-400 words)
- Start with the client's problem, not your company
- State the proposed solution in plain language
- Include the total investment and expected ROI
- End with a clear recommendation and next step
- Write this section LAST, after all other sections are complete, then present it first

#### Understanding of the Situation

Demonstrate that you listened during discovery.

**Rules:**
- Reference specific pain points the client mentioned
- Show understanding of their industry context
- Connect their situation to a broader pattern you have seen (builds credibility)
- Do NOT introduce new problems they did not mention — this is not a sales pitch
- 300-500 words maximum

#### Proposed Approach

**Rules:**
- Lead with the outcome, then explain the approach
- Use plain language — the client should understand the approach without Googling your methodology
- Explain WHY this approach, not just WHAT the approach is
- Connect each phase to a client outcome
- If there are alternative approaches, briefly explain why this one was chosen

#### Scope and Deliverables

The most critical section for preventing scope creep and misunderstandings.

**For each deliverable, state:**
- What it is
- What format it takes (document, workshop, implementation, report)
- When it is delivered (linked to timeline)

**Explicitly state what is NOT included:**
- Out-of-scope items prevent disputes later
- Be specific — "Ongoing maintenance is not included" is better than "Only the defined scope"

#### Investment Section

**Pricing presentation rules:**
- Present the total investment clearly and early in the section — do not hide the number
- If offering tiered options, present 2-3 options maximum (Good / Better / Best)
- Anchor the investment against the cost of the problem or the expected ROI
- Include payment terms and invoicing schedule
- State what is included (revisions, meetings, travel, tools, licenses)
- State the validity period of the proposal (e.g., "Dieses Angebot ist 30 Tage gueltig")

**Pricing context framework:**
- Cost of the problem per month/year (e.g., "Aktuell verlieren Sie ca. 12.000 EUR/Monat durch...")
- Investment for the solution (your price)
- Expected return or savings
- Payback period

#### ROI Projection

**ROI rules:**
- Be conservative — overestimating ROI damages trust when reality hits
- Show your math — state the assumptions clearly
- Use ranges where exact numbers are not available ("zwischen 15% und 25% Kostenreduktion")
- Reference industry benchmarks or past client results as supporting evidence
- Include both quantifiable ROI (money, time) and qualitative benefits (risk reduction, compliance, team satisfaction)

#### Timeline and Milestones

**Present as a table or visual timeline:**

| Phase | Duration | Milestone | Deliverable |
|-------|----------|-----------|-------------|
| Phase 1: Analyse | Woche 1-2 | Ist-Analyse abgeschlossen | Analysebericht |
| Phase 2: Konzept | Woche 3-4 | Loesungskonzept praesentiert | Konzeptdokument |
| Phase 3: Umsetzung | Woche 5-8 | Implementierung abgeschlossen | Fertige Loesung |
| Phase 4: Uebergabe | Woche 9-10 | Uebergabe und Schulung | Dokumentation + Schulung |

**Timeline rules:**
- Include buffer where realistic — clients respect honesty about realistic timelines
- Mark client-side dependencies explicitly ("Zugang zu System X bis Woche 2 erforderlich")
- Show the critical path — what delays the project if it slips?

#### Follow-Up Plan

Define what happens after sending the proposal:

- When you will follow up (specific date, e.g., "Ich melde mich am Donnerstag, den 3. April")
- How you will follow up (call, email)
- What the client should do if they have questions before the follow-up
- Decision timeline expectation ("Ideal waere eine Entscheidung bis zum 15. April, um den geplanten Projektstart zu halten")

### Step 4: Self-Review

Before presenting the output, verify:
- Does the executive summary work as a standalone document?
- Is the scope specific enough to prevent misunderstandings?
- Are pricing and payment terms clear and complete?
- Is the ROI projection conservative and well-reasoned?
- Does the timeline include client dependencies?
- Is the language client-focused, not self-congratulatory?
- Does the tone match the brand guide (if used)?
- Would the decision maker feel confident saying yes based on this document?
- Is the follow-up plan specific (date, action) not vague ("wir melden uns")?

## Output Format

Present the complete proposal directly in the response for review.

Additionally, save it as a Markdown file:

**File path**: `/content/proposals/{firmenname}-{clientname}-{YYYY-MM-DD}.md`

If the `/content/proposals/` directory does not exist, create it.

### Document Structure

```markdown
# Proposal — {Project Title}

## Meta
- Date: {YYYY-MM-DD}
- Author: Generated via /create-proposal
- From: {your company name}
- To: {client name}
- Proposal Reference: {PRO-YYYY-XXX}
- Valid Until: {date, typically 30 days}
- Brand Guide: {used / not available}
- Language: {de / en}

---

## Executive Summary
{One page maximum. Client problem, proposed solution, investment, expected ROI, next step.}

---

## Understanding of the Situation
{Demonstrate understanding of the client's pain points and context.}

---

## Proposed Approach
{What you will do and why this approach.}

---

## Scope and Deliverables

### Included
{Explicit list of deliverables with format and timing.}

### Not Included
{Explicit list of out-of-scope items.}

---

## Methodology
{Your framework or process, explained in plain language.}

---

## Timeline and Milestones

| Phase | Duration | Milestone | Deliverable |
|-------|----------|-----------|-------------|
| {Phase} | {Duration} | {Milestone} | {Deliverable} |

### Client Dependencies
{What the client must provide and when.}

---

## Team

| Name | Role | Qualifications |
|------|------|----------------|
| {Name} | {Role} | {Brief qualification} |

---

## Investment

### Option A: {Option Name}
{Description, price, what is included.}

### Option B: {Option Name} (if applicable)
{Description, price, what is included.}

### Payment Terms
{Invoicing schedule, payment conditions.}

### Validity
{This proposal is valid until {date}.}

---

## ROI Projection

### Current Cost of the Problem
{Quantified cost of the status quo.}

### Expected Return
{Conservative projection with assumptions stated.}

### Payback Period
{When the investment pays for itself.}

---

## Risk Mitigation
{How risks are managed. What happens if scope changes. Escalation process.}

---

## Case Studies / References
{1-2 relevant examples of similar work with results.}

---

## Terms and Conditions
{Standard engagement terms, confidentiality, IP, cancellation.}

---

## Next Steps
1. {Specific next action for the client}
2. {Specific next action for you}
3. {Decision timeline}

## Follow-Up Plan
- Follow-up date: {specific date}
- Follow-up method: {call / email}
- Contact: {name, email, phone}
```

## Quality Criteria

A good B2B proposal must:

1. **Lead with the client's world** — The proposal should feel like it was written for THIS client, not adapted from a template. Start with their problem, their context, their goals — not your company history
2. **Be specific about scope** — Vague scope creates disputes. Every deliverable must be named, formatted, and timed. Out-of-scope must be explicitly stated
3. **Present pricing with confidence** — Do not hide the number. Do not apologize for the investment. Present it in context of the value and ROI
4. **Include realistic ROI** — Conservative projections build trust. Inflated projections create accountability problems after signing
5. **Be complete but not padded** — Every section must earn its space. A 50-page proposal is not better than a 15-page proposal if the extra 35 pages are filler
6. **Have a clear follow-up plan** — A proposal without a follow-up plan is a document that will be forgotten. Define the next touch point with a specific date
7. **Be decision-ready** — The reader should be able to say yes, select an option, or ask a specific clarifying question. If the proposal creates more confusion than clarity, it has failed
8. **Respect the reader's time** — Executives read executive summaries. Technical evaluators read methodology and scope. Structure the proposal so each reader can find their section quickly

## Examples

### Example Input
```
Client: Mueller Maschinenbau GmbH
Project: IT-Infrastruktur Modernisierung — Migration von On-Premise zu Hybrid-Cloud
Scope:
  - Ist-Analyse der bestehenden IT-Infrastruktur
  - Cloud-Readiness Assessment
  - Migrationskonzept und Roadmap
  - Begleitung der Migration (erste Phase: Mail und Collaboration)
  - Schulung des internen IT-Teams
Pricing:
  - Option A: Analyse + Konzept = 18.500 EUR
  - Option B: Analyse + Konzept + Begleitung Phase 1 = 42.000 EUR
Timeline: 10 Wochen (Option B)
Client pain points: Alternde Server-Hardware, steigende Wartungskosten, Remote-Arbeit
  funktioniert schlecht, IT-Team ueberlastet mit Tagesgeschaeft
Decision makers: Geschaeftsfuehrer (Budget), IT-Leiter (technisch)
Language: Deutsch
```

### Example Output (Executive Summary Excerpt)

```markdown
## Executive Summary

Herr Mueller, Ihre IT-Infrastruktur traegt das Tagesgeschaeft eines
wachsenden Maschinenbauunternehmens — aber sie stoesst an ihre Grenzen.

Alternde Server-Hardware verursacht steigende Wartungskosten von geschaetzt
4.200 EUR/Monat. Remote-Arbeit fuer Vertrieb und Konstruktion funktioniert
unzuverlaessig. Und Ihr IT-Team investiert den Grossteil seiner Kapazitaet
in den Erhalt des Status quo statt in Verbesserungen.

Wir schlagen vor, Ihre Infrastruktur schrittweise in eine Hybrid-Cloud-
Architektur zu migrieren — beginnend mit Mail und Collaboration-Tools,
die den groessten sofortigen Nutzen fuer Ihr Team schaffen.

**Investment**: 42.000 EUR (Option B: Analyse, Konzept und begleitete
Migration Phase 1)

**Erwarteter Nutzen**: Reduktion der Infrastrukturkosten um ca. 30%
(ca. 15.000 EUR/Jahr), zuverlaessige Remote-Arbeit ab Woche 8,
und ein IT-Team, das wieder Kapazitaet fuer Verbesserungen hat.

**Timeline**: 10 Wochen von Projektstart bis abgeschlossener Phase 1.

**Naechster Schritt**: Ein 30-minuetiges Gespraech am {Datum}, in dem
wir offene Fragen klaeren und den Projektstart terminieren.
```

### What NOT to Produce

- Proposals that start with two pages of company history before mentioning the client
- Vague scope ("wir beraten Sie umfassend" without concrete deliverables)
- Hidden pricing (buried on page 28 or missing entirely)
- ROI claims without stated assumptions
- Proposals without a follow-up date
- Copy-paste proposals where only the client name was changed
- Proposals with "placeholder" sections ("[Referenz hier einfuegen]")
- Proposals longer than 20 pages for engagements under 100k EUR

## Integration Notes

- Use insights from `/cold-email` sequences and `/sales-enablement` discovery to inform the "Understanding of the Situation" section
- Competitive intelligence from `/competitor-analysis` can strengthen the "Proposed Approach" differentiation
- Value propositions from `/sales-enablement` one-pagers should be consistent with proposal messaging
- Blog posts created with `/blog-post` can be referenced as thought leadership evidence in the proposal
- After proposal acceptance, the scope section becomes the project baseline for delivery planning
