# /cold-email

## Purpose

Generate multi-step B2B cold email sequences (3-5 emails) designed for outreach to decision-makers at small and medium businesses (KMU).

Use this skill when:
- Launching outbound outreach to a new target segment
- Creating follow-up sequences for leads from LinkedIn, events, or referrals
- Building personalized email campaigns for specific personas (CEO, CTO, IT-Leiter, Geschaeftsfuehrer)
- Re-engaging cold leads with a structured drip sequence
- Testing different value propositions in outbound sales

This skill produces a complete, ready-to-send email sequence with subject lines, body text, and timing guidance. It does NOT produce marketing newsletters (use `/blog-post` for content), LinkedIn outreach messages (use `/linkedin-post`), or formal proposals (use `/create-proposal`).

## Inputs

The user should provide:

### Required
- **Target persona**: Who is receiving this email? (job title, company size, industry)
- **Product/Service**: What are you selling or offering?
- **Value proposition**: What is the core benefit for the recipient?
- **Pain points**: What problems does the target persona face that your offering solves? (2-3 specific pain points)

### Optional
- **Company name**: Your company name (for brand guide lookup and sender context)
- **Sequence length**: Number of emails (default: 4 emails)
- **Tone**: Override for tone (e.g., more casual, more formal, more provocative)
- **Trigger event**: What prompted this outreach? (job change, funding round, industry event, content download)
- **Social proof**: Case studies, client results, or numbers to reference
- **CTA goal**: What should the recipient do? (book a call, reply, visit a page, attend a webinar)
- **Personalization hooks**: Specific details to weave in (company name placeholder, industry-specific references)
- **Language**: German or English (default: German for DACH market)
- **Sender role**: Who is sending? (Geschaeftsfuehrer, Berater, Account Executive)
- **Follow-up context**: Is this a completely cold list or warm leads from a specific source?

## Brand Context

Before writing the sequence, check if a brand guide exists:

1. Ask the user for the company name (or use it from the input)
2. Check if `/brand/{firmenname}/brand-guide.md` exists in the repository
3. If present, read and apply:
   - **Brand voice and tone** — cold emails must match the brand voice while being adapted to direct 1:1 communication style
   - **Target audience definition** — use the brand's audience profile to calibrate language, technical depth, and assumed context
   - **Key messaging frameworks** — align the value proposition framing with established brand messages
   - **Terminology preferences** — use the brand's preferred terms consistently across all emails in the sequence
4. If no brand guide exists:
   - Use a professional but direct default tone
   - Ask the user if the emails should be formal ("Sie") or semi-formal
   - Note in the output that a brand guide via `/create-brand-system` would improve consistency across outreach

## Process

### Step 1: Persona and Context Analysis

Before writing any email:
- Define the recipient's daily reality — what pressures, priorities, and frustrations define their workday?
- Identify the business trigger — why would this person care about your message right now?
- Map the objections — what will make them delete this email? (too salesy, irrelevant, too long, no credibility)
- Define the desired micro-commitment — cold email does not sell. It opens a conversation
- Determine the sender's credibility angle — peer-to-peer, expert-to-executive, or practitioner-to-practitioner?

### Step 2: Design the Sequence Arc

A cold email sequence is a narrative, not a repetition. Each email has a distinct job:

**Recommended 4-email sequence structure:**

| Email | Job | Timing | Focus |
|-------|-----|--------|-------|
| Email 1 | Open the door | Day 0 | Pain point + relevance signal |
| Email 2 | Add evidence | Day 3 | Social proof + specific value |
| Email 3 | Shift the angle | Day 7 | New perspective or insight |
| Email 4 | Clean break | Day 14 | Respectful close + easy reply |

**For 5-email sequences**, insert a "value-add" email between Email 2 and Email 3:
- Share a relevant insight, resource, or industry observation without asking for anything

**For 3-email sequences**, compress to:
- Email 1: Pain + relevance
- Email 2: Proof + value
- Email 3: Clean break

Each email must stand alone — if the recipient only reads one, it must still make sense.

### Step 3: Write Subject Lines

Subject lines determine whether the email is opened. Apply these rules:

**Subject line principles:**
- 4-8 words maximum — mobile preview cuts after 35-40 characters
- Lowercase or sentence case — never ALL CAPS
- No spam triggers: "Free", "Limited time", "Act now", "Guaranteed"
- No exclamation marks
- Personalization if natural: "{Vorname}, kurze Frage" or "Re: {Firmenname} + IT-Security"
- Curiosity or relevance over cleverness

**Subject line patterns that work for B2B cold email:**

1. **Direct question**: "Wie loest {Firmenname} aktuell {Problem}?"
2. **Peer reference**: "{Aehnliches Unternehmen} hat X reduziert — relevant fuer Sie?"
3. **Trigger-based**: "Gesehen, dass {Firmenname} gerade {Trigger} — kurze Idee"
4. **Short and curious**: "Kurze Frage, {Vorname}"
5. **Value-forward**: "3 Minuten, die Ihnen 5h/Woche sparen koennten"

**Subject line anti-patterns:**
- "Partnerschaftsmoeglichkeit" (vague, overused)
- "Einladung zum Gespraech" (presumptuous)
- "Wir sind die beste Loesung fuer..." (nobody opens this)
- Emojis in subject lines for B2B cold email
- Re: or Fwd: on first contact (dishonest)

### Step 4: Write Email Bodies

**Cold email writing rules:**

**Length:**
- Email 1: 80-120 words (earn the right to exist in their inbox)
- Email 2: 100-150 words (slightly more detail is acceptable)
- Email 3: 80-120 words (new angle, stay concise)
- Email 4: 40-60 words (short clean break)

**Structure per email:**
1. **Opening line** (1 sentence): Relevance signal — why you, why now, why them. No "Ich hoffe, es geht Ihnen gut" or "Mein Name ist X und ich arbeite bei Y"
2. **Value bridge** (2-3 sentences): Connect their pain to your solution. Be specific, not generic
3. **Proof point** (1 sentence, optional): A number, a client reference, a relevant insight
4. **CTA** (1 sentence): One clear, low-friction ask. Not "Wann passt es Ihnen?" but "Haetten Sie Dienstag oder Mittwoch 15 Minuten?"

**Tone rules for B2B cold email:**
- Write like a knowledgeable peer, not a sales robot
- First person singular, never "we at Company X are proud to..."
- Short sentences. Break up long thoughts
- No corporate buzzwords: "synergetisch", "ganzheitlich", "innovativ", "State-of-the-Art"
- No flattery: "Ich bin beeindruckt von Ihrem Unternehmen" (they know you say this to everyone)
- Respectful directness — value their time by being concise
- Address them with "Sie" in German B2B context

**Personalization framework:**
- Level 1 (minimum): Company name, industry, company size bracket
- Level 2 (recommended): Specific pain point for their industry/role
- Level 3 (best): Reference to a specific trigger (LinkedIn post, job posting, news, event)

Mark personalization placeholders with `{curly braces}` for easy mail merge.

### Step 5: Define Follow-Up Timing

Provide specific timing guidance:

- **Email 1 to Email 2**: 2-3 business days (enough to notice, not enough to forget)
- **Email 2 to Email 3**: 3-5 business days (give them breathing room)
- **Email 3 to Email 4**: 5-7 business days (the gap signals you respect their time)
- **Best send times for B2B DACH**: Tuesday-Thursday, 08:00-09:30 or 14:00-15:00
- **Avoid**: Monday morning (inbox chaos), Friday afternoon (mentally checked out)

### Step 6: Write Sequence Metadata

For each email, provide:
- Recommended send day (relative to sequence start)
- Subject line (primary + 1 alternative)
- Email body
- CTA type (reply, calendar link, resource link)
- Personalization requirements (what data is needed per recipient)

### Step 7: Self-Review

Before presenting the output, verify:
- Does each email earn the right to be in the recipient's inbox?
- Is every email under 150 words? (shorter is almost always better)
- Does the sequence tell a story across emails, not repeat the same pitch?
- Are the subject lines under 40 characters and spam-filter safe?
- Is the CTA low-friction and specific?
- Would YOU reply to this email if you received it?
- Does the tone match the brand guide (if used)?
- Are personalization placeholders clearly marked?

## Output Format

Present the complete sequence directly in the response for easy review.

Additionally, save it as a Markdown file:

**File path**: `/content/emails/{firmenname}-cold-sequence-{persona-slug}-{YYYY-MM-DD}.md`

If the `/content/emails/` directory does not exist, create it.

### Document Structure

```markdown
# Cold Email Sequence — {Persona} — {Product/Service}

## Meta
- Date: {YYYY-MM-DD}
- Author: Generated via /cold-email
- Target Persona: {job title, company size, industry}
- Product/Service: {what is being offered}
- Sequence Length: {number of emails}
- Language: {de / en}
- Brand Guide: {used / not available}
- CTA Goal: {desired action}

## Sequence Overview

| Email | Day | Job | Subject Line |
|-------|-----|-----|--------------|
| 1 | 0 | Open the door | {subject} |
| 2 | 3 | Add evidence | {subject} |
| 3 | 7 | Shift angle | {subject} |
| 4 | 14 | Clean break | {subject} |

## Personalization Requirements
- {Field}: {where it comes from — CRM, LinkedIn, manual research}

---

## Email 1 — Open the Door
**Day**: 0 (e.g., Tuesday morning)
**Subject**: {primary subject line}
**Alt Subject**: {alternative subject line}

---

{Email body with personalization placeholders}

---

**CTA Type**: {reply / calendar link / resource}
**Word Count**: {count}

---

## Email 2 — Add Evidence
{Same structure as Email 1}

---

## Email 3 — Shift the Angle
{Same structure as Email 1}

---

## Email 4 — Clean Break
{Same structure as Email 1}

---

## A/B Testing Suggestions
- {Which subject lines to test against each other}
- {Which opening lines to test}
- {Which CTAs to test}

## Sequence Notes
- {Tips for implementation in CRM or email tool}
- {When to pull a recipient out of the sequence (e.g., if they reply, if they open 3+ times)}
- {What to do after the sequence ends without reply}
```

## Quality Criteria

A good cold email sequence must:

1. **Respect the recipient's time** — Every email must justify its existence in a busy inbox. If the email does not provide value or relevance in the first two sentences, it will be deleted
2. **Be genuinely personalized** — Not "Hi {Vorname}" personalization. Real personalization means the email could only have been written for this type of person at this type of company
3. **Build across the sequence** — Each email adds a new dimension (pain, proof, perspective, close). Repeating the same pitch 4 times is not a sequence, it is spam
4. **Have one clear CTA per email** — Do not ask them to visit a page AND book a call AND reply AND download a resource. One ask. Make it easy
5. **Sound like a human wrote it** — No templates that feel like templates. No corporate speak. No obvious AI-generated filler. The email should read like a knowledgeable peer reaching out
6. **Be legally and ethically appropriate** — No deceptive subject lines. No fake "Re:" or "Fwd:". No misleading urgency. Comply with DSGVO requirements for B2B cold outreach
7. **Be short** — The best cold emails are 60-120 words. Every word must earn its place. If a sentence does not serve the open, the value bridge, the proof, or the CTA, cut it
8. **End gracefully** — The final email should make it easy for the recipient to say no. A respectful close earns more replies than a guilt trip

## Examples

### Example Input
```
Target persona: IT-Leiter / CTO, Mittelstand (100-500 Mitarbeiter), Fertigungsindustrie
Product: Managed Cloud Security Service
Value proposition: Kontinuierliche Ueberwachung und Absicherung der Cloud-Infrastruktur ohne eigenes Security-Team aufbauen zu muessen
Pain points:
  1. Kein dediziertes IT-Security-Team, Security ist "nebenbei"
  2. Steigende Compliance-Anforderungen (NIS2) ohne klare Umsetzungsstrategie
  3. Angst vor Ransomware-Angriff ohne 24/7-Monitoring
CTA: 15-Minuten-Gespraech buchen
Language: Deutsch
Sender: Senior Berater fuer Cloud Security
```

### Example Output (Email 1 Excerpt)

```
Subject: NIS2-Deadline und kein Security-Team — wie loest {Firmenname} das?

{Vorname},

ab Oktober 2026 gilt NIS2 auch fuer mittelstaendische Fertigungsunternehmen.
Die meisten IT-Leiter, mit denen ich spreche, haben das auf dem Schirm —
aber kein dediziertes Team, das die Umsetzung treibt.

Wir betreuen aktuell 35 Fertigungsunternehmen in genau dieser Situation:
kontinuierliches Cloud-Monitoring und NIS2-Compliance, ohne dass Sie
intern ein Security-Team aufbauen muessen.

Haetten Sie Dienstag oder Mittwoch 15 Minuten fuer ein kurzes Gespraech,
ob das fuer {Firmenname} relevant sein koennte?

Beste Gruesse
{Absender}
```

### Example Output (Email 4 — Clean Break)

```
Subject: Soll ich das Thema abhaken?

{Vorname},

ich habe Ihnen in den letzten Wochen dreimal geschrieben und moechte
Ihre Zeit respektieren.

Falls Cloud Security aktuell kein Thema ist — kein Problem. Ein kurzes
"Kein Bedarf" reicht und ich melde mich nicht mehr.

Falls es nur ein Timing-Thema ist — antworten Sie gerne, wann es
besser passt.

Beste Gruesse
{Absender}
```

### What NOT to Produce

- Emails longer than 200 words
- "Sehr geehrter Herr/Frau" openings without relevance signal in the first sentence
- Self-centered openings ("Wir sind ein fuehrendes Unternehmen fuer...")
- Multiple CTAs per email
- Aggressive follow-ups ("Haben Sie meine letzte E-Mail gesehen?")
- Misleading subject lines (fake Re:, fake urgency)
- Generic value propositions that could apply to any company
- Sequences where every email repeats the same pitch

## Integration Notes

- Use `/content-strategy` to identify which pain points and value propositions resonate with the target market
- Cold email sequences can reference resources created with `/blog-post` or `/copywriting` as value-add links
- Successful reply patterns can inform `/sales-enablement` objection handling documents
- The persona analysis from cold email work feeds into `/create-proposal` when deals progress
- When using a CRM for sending, the saved file serves as the campaign content source
