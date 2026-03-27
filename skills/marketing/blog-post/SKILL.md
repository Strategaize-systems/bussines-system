# /blog-post

## Purpose

Generate SEO-optimized blog posts for B2B audiences that drive organic traffic, establish thought leadership, and support lead generation.

Use this skill when:
- Creating a new blog post from a topic or keyword brief
- Writing a thought leadership article for a company blog
- Producing educational content that targets specific search queries
- Creating pillar or cluster content as part of a content strategy
- Rewriting or expanding an existing draft

This skill produces a complete, publish-ready blog post. It does NOT produce social media content (use `/linkedin-post`), web page copy (use `/copywriting`), or content strategy (use `/content-strategy`).

## Inputs

The user should provide:

### Required
- **Topic**: What is the blog post about?
- **Target audience**: Who should read this? (job titles, seniority, industry)

### Optional
- **Target keywords**: Primary and secondary SEO keywords
- **Desired length**: Approximate word count (default: 1200-1800 words)
- **Post type**: Educational, thought leadership, how-to guide, listicle, case study analysis, comparison, industry trend
- **Key points to cover**: Specific arguments, data points, or angles the user wants included
- **Internal links**: Existing pages or posts to link to
- **Competitor posts**: Articles on the same topic to differentiate from
- **Content pillar**: Which content pillar this belongs to (from `/content-strategy`)
- **CTA goal**: What should the reader do after reading? (download, book demo, subscribe, read next post)
- **Language**: German or English (default: German for DACH market)
- **Brand name**: Company name to check for brand guide

## Brand Context

Before writing the post, check if a brand guide exists:

1. Ask the user for the company name (or use it from the input)
2. Check if `/brand/{firmenname}/brand-guide.md` exists in the repository
3. If present, read and apply:
   - **Brand voice and tone** — the writing style must match the brand's documented voice throughout the entire post, not just the introduction
   - **Target audience definition** — use the brand's audience profile to calibrate technical depth, jargon level, and assumed knowledge
   - **Key messaging frameworks** — where relevant, weave brand messages into the post naturally (not as forced insertions)
   - **Terminology preferences** — use the brand's preferred terms consistently
4. If no brand guide exists:
   - Ask the user: "Professional and formal, or conversational and direct?"
   - Ask about technical depth: "Assume expert knowledge, or explain concepts?"
   - Proceed with the provided guidance
   - Note in the output that a brand guide via `/create-brand-system` would improve consistency

## Process

### Step 1: Research and Angle Definition

Before writing:
- Define the search intent behind the topic (informational, navigational, commercial)
- Identify the unique angle — what perspective does this company bring that competitors do not?
- Determine the reader's knowledge level and starting point
- Identify 2-3 key takeaways the reader should have after finishing

If target keywords were provided:
- Analyze the keyword for search intent
- Identify related long-tail keywords to include naturally
- Note the primary keyword for headline and meta tag optimization

### Step 2: Outline the Post

Create a structured outline before writing:

1. **Working headline**: Draft headline optimized for both readers and search
2. **Hook paragraph**: Why should the reader care? What problem or question opens the post?
3. **Main sections** (3-6 sections depending on length):
   - Each section has a clear H2 heading
   - Each section covers one main idea
   - Sections follow a logical progression
4. **Key evidence**: Where will data, examples, or case references appear?
5. **Conclusion**: What action or insight does the reader leave with?
6. **CTA**: What is the next step?

Present the outline to the user for approval before writing the full post if the post is longer than 1500 words.

### Step 3: Write the Post

Apply these B2B blog writing principles:

**Headlines and subheadings**:
- H1: One primary headline that includes the target keyword and promises value
- H2s: Clear section headers that work as a standalone table of contents
- H3s: Use sparingly for subsections within complex topics
- Headlines should be specific — "7 Methoden zur Reduzierung der IT-Kosten im Mittelstand" beats "Wie Sie IT-Kosten sparen"

**Opening paragraph**:
- Lead with the problem, a surprising fact, or a direct question
- Do not lead with "In today's fast-paced business world..." or similar empty openers
- The first 2-3 sentences must earn the reader's attention
- Include the primary keyword within the first 100 words

**Body**:
- One idea per paragraph, 2-4 sentences per paragraph
- Use concrete examples, data points, and scenarios — not abstract advice
- Break up long sections with bullet points, numbered lists, or pull quotes
- Include internal links where naturally relevant (not forced)
- Use transition sentences between sections to maintain flow
- Address the reader directly with "Sie" (formal German) or "you" (English)

**Tone for B2B**:
- Authoritative but not arrogant
- Educational, not promotional (the brand sells by demonstrating expertise, not by pitching)
- Practical — every section should give the reader something they can use or think about
- No filler paragraphs. If a section does not add value, cut it

**Conclusion**:
- Summarize the key takeaway in 1-2 sentences
- Connect back to the opening problem or question
- Include a clear, relevant CTA

### Step 4: SEO Optimization

After writing the draft:

**Meta title**:
- Max 60 characters
- Include primary keyword
- Make it compelling enough to click in search results

**Meta description**:
- Max 155 characters
- Include primary keyword
- Summarize the post's value proposition

**On-page SEO**:
- Primary keyword in H1, first paragraph, and at least one H2
- Secondary keywords distributed naturally through the text
- Image alt text suggestions (even if images are not produced by this skill)
- Internal link suggestions with anchor text
- URL slug suggestion (kebab-case, keyword-focused, max 5 words)

**Readability**:
- Flesch readability appropriate for the audience (B2B: moderate complexity is fine, but avoid unnecessary jargon)
- Sentences vary in length — mix short punchy sentences with longer explanatory ones
- No paragraph longer than 5 lines on screen

### Step 5: Internal Link Integration

If the user provided internal links or if other content exists:
- Insert 2-5 internal links naturally within the body
- Use descriptive anchor text (not "click here")
- Link to related blog posts, product pages, or resource pages
- Suggest additional internal links that should be created but do not exist yet

If working from a `/content-strategy` output:
- Reference the content pillar and cluster this post belongs to
- Suggest which cluster topics should link to and from this post

### Step 6: Self-Review

Before presenting the output, verify:
- Does the headline deliver on its promise within the post?
- Is every section earning its space? (Cut anything that does not inform, persuade, or engage)
- Are claims supported by evidence, examples, or reasoning?
- Is the CTA relevant to the content, not just bolted on?
- Does the tone match the brand guide (if used)?
- Are keywords included naturally, not stuffed?
- Would the target audience find this genuinely useful?

## Output Format

Save the blog post as a Markdown file:

**File path**: `/content/blog/{firmenname}-{url-slug}-{YYYY-MM-DD}.md`

If the `/content/blog/` directory does not exist, create it.

### Document Structure

```markdown
# {Blog Post Headline}

## Meta
- Date: {YYYY-MM-DD}
- Author: Generated via /blog-post
- Target Audience: {audience summary}
- Content Pillar: {pillar name, if applicable}
- Brand Guide: {used / not available}
- Language: {de / en}
- Word Count: {approximate}

## SEO
- Meta Title: {max 60 chars}
- Meta Description: {max 155 chars}
- URL Slug: /{slug}
- Primary Keyword: {keyword}
- Secondary Keywords: {keyword1, keyword2, keyword3}

## Internal Links
- {Anchor text} -> {URL or page reference}
- {Anchor text} -> {URL or page reference}

## Suggested Image Alt Texts
- Hero image: {alt text suggestion}
- Section image: {alt text suggestion}

---

{Full blog post content in Markdown}

---

## CTA
{Call to action text and link destination}
```

## Quality Criteria

A good B2B blog post must:

1. **Be genuinely useful** — The reader should learn something, gain a new perspective, or receive actionable advice. If someone could get the same value from the first page of Google results, the post is not good enough
2. **Demonstrate expertise** — The post should reflect knowledge that comes from real experience in the field, not surface-level research summaries
3. **Be properly structured** — Scannable with clear headings, logical flow, and appropriate length for the topic depth
4. **Be SEO-aware without being SEO-driven** — Keywords should appear naturally. The post should read well for humans first, search engines second
5. **Match the audience's level** — A post for CTOs should not explain what a server is. A post for non-technical buyers should not assume DevOps knowledge
6. **Have a clear point of view** — The best B2B blog posts take a position. "It depends" is not a conclusion
7. **Be complete** — Do not leave obvious questions unanswered. If the topic requires depth, go deep. If it is a quick tip, keep it focused
8. **Drive action** — The CTA should feel like a natural next step, not a sales ambush
9. **Respect brand voice** — If a brand guide was used, the post should sound like it was written by someone who works at that company

## Examples

### Example Input
```
Topic: Warum Mittelstaendler ihre IT-Security-Strategie 2026 ueberdenken muessen
Target audience: Geschaeftsfuehrer und IT-Leiter, Mittelstand (100-500 Mitarbeiter), DACH
Keywords: "IT-Security Mittelstand", "Cybersecurity Strategie 2026", "IT-Sicherheit KMU"
Length: 1500 words
Post type: Thought leadership
CTA: Whitepaper-Download "IT-Security Checklist fuer den Mittelstand"
Brand: CloudSecure
```

### Example Output (Excerpt)

```markdown
# Warum Ihre IT-Security-Strategie von 2023 Sie 2026 nicht mehr schuetzt

## Die Bedrohungslage hat sich veraendert — Ihre Abwehr auch?

Die meisten mittelstaendischen Unternehmen haben ihre IT-Security-Strategie
zuletzt 2022 oder 2023 grundlegend ueberprueft. Seitdem hat sich die
Bedrohungslandschaft fundamental veraendert: KI-gestuetzte Angriffe sind
keine Zukunftsmusik mehr, sondern Realitaet. Ransomware-Gruppen zielen
gezielt auf den Mittelstand, weil dort die Security-Budgets kleiner und
die Angriffsfaechen groesser sind als bei Konzernen.

Wenn Ihr letztes Security-Audit aelter als 18 Monate ist, schuetzen Sie
sich gegen Bedrohungen von gestern.

## Was sich seit 2023 konkret veraendert hat

### KI macht Angriffe skalierbarer

Phishing-Mails, die frueher durch schlechte Grammatik auffielen, sind
heute sprachlich perfekt und personalisiert. Deepfake-Anrufe, die sich
als Geschaeftsfuehrer ausgeben, sind dokumentierte Faelle — nicht
Science Fiction. ...
```

### What NOT to Produce

- Thin 500-word posts that skim the surface of a complex topic
- Keyword-stuffed content that reads like it was written for Google, not humans
- Posts that are thinly disguised product pitches ("5 Reasons You Need Our Product")
- Generic advice without industry or audience specificity
- Posts without a clear point of view or conclusion

## Integration Notes

- Use `/content-strategy` topic clusters as the source for blog post topics
- Blog post key points can be repurposed into `/linkedin-post` series
- Blog posts that perform well can inform `/copywriting` for related landing pages
- Link blog posts to each other as the content library grows — maintain the cluster structure
