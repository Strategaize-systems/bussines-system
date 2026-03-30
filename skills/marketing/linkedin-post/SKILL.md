# /linkedin-post

## Purpose

Generate LinkedIn posts optimized for the platform's algorithm, audience behavior, and B2B engagement patterns.

Use this skill when:
- Creating regular LinkedIn content for a company or personal brand
- Promoting a blog post, case study, or event on LinkedIn
- Sharing thought leadership, industry insights, or professional lessons
- Building a LinkedIn content series around a theme
- Repurposing existing content (blog posts, presentations, emails) for LinkedIn

This skill produces ready-to-publish LinkedIn posts. It does NOT produce blog content (use `/blog-post`), web page copy (use `/copywriting`), or content strategy (use `/content-strategy`).

## Inputs

The user should provide:

### Required
- **Topic or key message**: What is the core point of this post?
- **Post type**: One of the following:
  - **Thought leadership** — Industry opinion, trend analysis, contrarian take
  - **Educational tip** — Actionable advice, how-to, framework
  - **Story** — Personal or professional narrative with a lesson
  - **Case study** — Client result or project outcome (anonymized if needed)
  - **Promotion** — Blog post, event, webinar, resource announcement
  - **Engagement** — Question, poll prompt, discussion starter

### Optional
- **Target audience**: Who should engage with this? (job titles, industries)
- **Key data or facts**: Specific numbers, statistics, or quotes to include
- **Link**: URL to include (blog post, landing page, event registration)
- **Hashtags**: Specific hashtags to use (otherwise skill will suggest)
- **Series context**: Is this part of a LinkedIn series? (e.g., "Post 3 of 7 on Cloud Security")
- **Tone preference**: Override for this specific post (e.g., more personal, more provocative)
- **Language**: German or English (default: German for DACH market)
- **Brand name**: Company name or personal name to check for brand guide
- **Post as**: Company page or personal profile (affects tone and perspective)

## Brand Context

Before writing the post, check if a brand guide exists:

1. Ask the user for the company or personal brand name (or use it from the input)
2. Check if `/brand/{firmenname}/brand-guide.md` exists in the repository
3. If present, read and apply:
   - **Brand voice and tone** — LinkedIn posts must match the brand voice while being adapted to the platform's more conversational style
   - **Target audience definition** — use the brand's audience profile to calibrate the post's language and assumed context
   - **Key messaging frameworks** — for promotional posts, align with established brand messages
   - **Terminology preferences** — maintain consistent terminology even in short-form content
4. If no brand guide exists:
   - Use a professional but approachable default tone
   - Ask the user if the post should be formal or conversational
   - Note in the output that a brand guide via `/create-brand-system` would improve consistency across posts

### Voice Guide + Anti-Slop Rules

After loading the brand guide, also check:

1. Does a voice guide exist at `/brand/{firmenname}/voice/{zielgruppe}.md`? If the user specifies a target audience, load the matching voice guide for tone, vocabulary, and channel-specific rules.
2. Always apply the anti-slop rules from `/skills/brand/reference/anti-slop-rules.md` — no AI-tell phrases, active voice, concrete examples, varied sentence structure.
3. Priority: Anti-Slop Rules (baseline) → Brand Guide (tone) → Voice Guide (audience-specific). Voice Guide wins on conflicts.

## Process

### Step 1: Define the Post's Job

Every LinkedIn post must have one clear job:
- **Educate**: Teach the reader something they can use immediately
- **Provoke**: Challenge a common assumption or start a debate
- **Inspire**: Share a story or insight that shifts perspective
- **Promote**: Drive traffic to a specific resource or event
- **Connect**: Start a conversation or build community

Define the job before writing. A post that tries to do all five does none of them well.

### Step 2: Craft the Hook

The hook is the first 1-3 lines visible before "...see more". This is the most critical part of the post.

**Hook patterns that work on LinkedIn:**

1. **Contrarian opener**: "Unpopular opinion: Cold calling isn't dead. Your cold calling script is."
2. **Specific number**: "Wir haben 127 Beratungsprojekte analysiert. Das Ergebnis hat uns ueberrascht."
3. **Direct question**: "Wann haben Sie zuletzt Ihre IT-Security-Strategie komplett hinterfragt?"
4. **Bold statement**: "90% aller LinkedIn-Posts über Leadership sind nutzlos. Hier ist, was tatsaechlich funktioniert."
5. **Story opener**: "Letztes Jahr habe ich den groessten Kunden meiner Karriere verloren. Es war die beste Entscheidung."
6. **Pattern interrupt**: "Stop scrolling. Wenn Sie IT-Leiter im Mittelstand sind, ist dieser Post fuer Sie."

**Hook anti-patterns to avoid:**
- "Ich freue mich, mitteilen zu duerfen, dass..." (nobody cares about your excitement)
- "In der heutigen schnelllebigen Welt..." (empty opener)
- "Spannende Neuigkeiten!" (says nothing)
- Starting with a hashtag
- Starting with a link

### Step 3: Write the Body

**LinkedIn-specific writing rules:**

**Formatting:**
- Short lines, generous white space
- One thought per line or short paragraph
- Use line breaks between every 1-2 sentences
- Bullet points or numbered lists for frameworks and tips
- No walls of text — LinkedIn is a scrolling platform

**Length guidance by post type:**
- **Short-form** (engagement, quick tip): 500-800 characters
- **Standard** (thought leadership, education): 1000-2000 characters
- **Long-form** (story, deep analysis): 2000-3000 characters
- **Hard limit**: 3000 characters (LinkedIn truncates beyond this)

**Writing style for LinkedIn:**
- First person ("Ich" / "I") for personal profiles
- Third person or "wir" for company pages
- Conversational but professional — LinkedIn is not a press release
- Short sentences. Like this. They create rhythm
- Avoid corporate buzzwords: "synergy", "paradigm", "leverage", "innovative"
- Use specific examples instead of abstract claims
- Write at a pace that respects the reader's time

**Structure patterns by post type:**

**Thought leadership:**
1. Hook (contrarian take or surprising observation)
2. Context (why this matters now)
3. Your perspective (2-3 key points)
4. Conclusion (what should change)
5. Question or CTA

**Educational tip:**
1. Hook (problem statement)
2. Framework or method (numbered steps)
3. Quick example
4. Takeaway
5. CTA

**Story:**
1. Hook (moment of tension or surprise)
2. Setup (brief context)
3. Conflict or turning point
4. Resolution and lesson
5. Question that invites the reader to share their experience

**Case study:**
1. Hook (result or number)
2. Situation (what was the challenge)
3. Approach (what was done — keep it brief)
4. Result (specific, measurable outcome)
5. Lesson for the reader
6. CTA

**Promotion:**
1. Hook (why should the reader care about this resource)
2. What it is (1-2 sentences)
3. What the reader gets from it (3-4 bullet points)
4. CTA with link
5. Keep it under 1500 characters — promotional posts should be lean

### Step 4: Add the CTA

Every post needs a closing element:

**For engagement:**
- Ask a specific question ("Was ist Ihre groesste Herausforderung bei der Mitarbeitergewinnung?")
- Avoid generic asks ("Was denken Sie?" is weak)

**For traffic:**
- "Link im ersten Kommentar" (higher reach than link in post on LinkedIn)
- Or include the link directly if reach is less important than convenience

**For connection:**
- "Folgen Sie mir fuer woechentliche Tipps zu {topic}"
- "Ich poste jeden Dienstag zu {topic} — bleiben Sie dran"

### Step 5: Select Hashtags

Apply these hashtag rules:

- **3-5 hashtags maximum** (more looks spammy, fewer misses discoverability)
- **Mix reach levels**:
  - 1-2 broad hashtags (500k+ followers): #Leadership, #Marketing, #Mittelstand
  - 1-2 niche hashtags (10k-100k followers): #ITSecurity, #B2BSaaS, #CloudMigration
  - 1 branded or very specific hashtag if relevant
- **Place hashtags at the end** of the post, separated by a line break
- **German hashtags** for DACH audience, English for international reach
- Do not hashtag common words (#Die, #Und, #Business)

### Step 6: Platform Compliance Check

Before finalizing, verify:
- Total character count is under 3000 characters
- The hook works when only 2-3 lines are visible (before "...see more")
- No more than 5 hashtags
- If a link is included, it is either in the post or noted as "Link im ersten Kommentar"
- Line breaks create visual breathing room
- No emojis used as bullet points (LinkedIn is a professional platform — emojis are acceptable sparingly but should not replace structure)
- The post stands alone without requiring the reader to click a link

### Step 7: Self-Review

Final quality check:
- Would you stop scrolling for this hook?
- Does the post deliver value even if the reader never clicks the link?
- Is the tone right for the audience and the post-as context (personal vs. company)?
- Does it match the brand guide (if used)?
- Is there exactly one clear CTA?
- Would the target audience share this or save it?

## Output Format

Present the LinkedIn post directly in the response for easy copy-paste.

Additionally, save it as a Markdown file:

**File path**: `/content/linkedin/{firmenname}-{topic-slug}-{YYYY-MM-DD}.md`

If the `/content/linkedin/` directory does not exist, create it.

### Document Structure

```markdown
# LinkedIn Post — {Topic}

## Meta
- Date: {YYYY-MM-DD}
- Author: Generated via /linkedin-post
- Post Type: {thought leadership / educational / story / case study / promotion / engagement}
- Post As: {personal profile / company page}
- Target Audience: {audience summary}
- Brand Guide: {used / not available}
- Language: {de / en}
- Character Count: {count}

## Post Content

---

{The actual LinkedIn post, formatted exactly as it should appear on LinkedIn.
Including line breaks, spacing, hashtags.}

---

## Link Strategy
- Link destination: {URL}
- Placement: {in post / first comment}
- First comment text: {if link goes in first comment, provide the comment text}

## Hashtag Rationale
- #{hashtag1} — {why: broad reach / niche relevance / branded}
- #{hashtag2} — {why}
- #{hashtag3} — {why}

## Repurposing Notes
{Suggestions for how this post content can be reused: carousel version, blog expansion, email snippet, follow-up post}
```

## Quality Criteria

A good LinkedIn post must:

1. **Stop the scroll** — The hook must earn the click to "...see more". If the first 2 lines are not compelling, nothing else matters
2. **Deliver value in the post itself** — A LinkedIn post is not a teaser trailer. The reader should get something valuable even if they never click a link
3. **Be authentic to the voice** — LinkedIn audiences are highly sensitive to generic AI-generated content. The post must sound like a real person with real experience wrote it
4. **Respect the platform** — Proper formatting (line breaks, short paragraphs), appropriate length, correct hashtag usage. Not a blog post pasted into LinkedIn
5. **Have one clear purpose** — Educate, provoke, inspire, promote, or connect. Not all at once
6. **Be engaging without being manipulative** — No "Agree?" as the entire CTA. No engagement bait ("Like if you agree, comment if you don't"). No artificially controversial takes for attention
7. **Be B2B appropriate** — Professional audience, business context. No motivational poster quotes, no "hustle culture" content, no personal oversharing disguised as professional insight
8. **Respect character limits** — Under 3000 characters. Most good posts are 1000-2000 characters

## Examples

### Example Input
```
Topic: Warum die meisten B2B-Unternehmen zu spaet mit Content Marketing anfangen
Post type: Thought leadership
Audience: Geschaeftsfuehrer und Marketingleiter, B2B, DACH
Post as: Personal profile (Berater fuer B2B-Wachstum)
Language: Deutsch
```

### Example Output

```
"Wir machen Content Marketing, wenn wir groesser sind."

Diesen Satz hoere ich von 8 von 10 B2B-Geschaeftsfuehrern.

Und er ist grundfalsch.

Content Marketing ist kein Luxus fuer Unternehmen mit 50-koepfigen
Marketing-Teams. Es ist der guenstigste Weg, Vertrauen bei
Entscheidern aufzubauen, bevor das erste Verkaufsgespraech stattfindet.

Die Realitaet:

- 70% der B2B-Kaufentscheidung ist getroffen, bevor ein Vertriebler
  kontaktiert wird
- Ihre Wettbewerber, die heute bloggen und auf LinkedIn posten,
  bauen gerade die Sichtbarkeit auf, die Sie in 2 Jahren brauchen
- Ein Blogpost, der heute rankt, bringt Ihnen in 12 Monaten noch Leads.
  Eine Kaltakquise bringt Ihnen heute vielleicht einen Termin

Der beste Zeitpunkt, mit Content Marketing anzufangen,
war vor zwei Jahren.

Der zweitbeste ist jetzt.

Was haelt Sie aktuell davon ab, regelmaessig Inhalte zu veroeffentlichen?

#B2BMarketing #ContentMarketing #Mittelstand #Wachstum
```

### What NOT to Produce

- Wall-of-text posts without line breaks
- Posts that are just a link and "Check this out!"
- Engagement bait ("Comment YES if you agree!")
- Corporate press release language pasted into LinkedIn
- Posts with 10+ hashtags
- Posts over 3000 characters
- Motivational quotes attributed to Steve Jobs or Einstein
- Posts that humble-brag ("So humbled to announce my 15th award this year...")

## Integration Notes

- Use `/content-strategy` pillar themes for consistent LinkedIn topic planning
- Repurpose key sections from `/blog-post` output into LinkedIn post series
- Promotional posts can drive traffic to pages created with `/copywriting`
- When creating a LinkedIn series, maintain consistent formatting and a series label (e.g., "Cloud Security Serie | Post 3/7")
- If using Postiz for scheduling, the saved file can serve as the content source
