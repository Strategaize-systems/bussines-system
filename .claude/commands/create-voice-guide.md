# /create-voice-guide

## Purpose

Generate a target-audience-specific voice and writing style guide for a company. Each guide defines how the company speaks to a specific audience — tone, vocabulary, sentence patterns, do's and don'ts, and anti-AI-slop rules that ensure content sounds human, distinctive, and audience-appropriate.

Multiple voice guides can exist per company (one per target audience). All marketing skills (`/blog-post`, `/linkedin-post`, `/copywriting`, `/cold-email`, `/create-proposal`, etc.) read the relevant voice guide as context and adapt their output accordingly.

Use this skill when:
- Setting up content production for a new target audience
- The company serves multiple audiences that need different communication styles
- Content sounds too generic, too "AI", or doesn't resonate with the target audience
- Refining or sharpening an existing communication approach

This skill produces **1 file per target audience**. Run it once per audience. It builds on the Brand Guide (`/create-brand-system`) but goes deeper into language specifics.

## Inputs

### Required
- **Firmenname**: Company name (must have a Brand Guide under `/brand/{firmenname}/`)
- **Zielgruppe**: Specific target audience definition — the more specific, the better
  - Job titles, roles, seniority
  - Age range, generation
  - Industry, company size
  - Pain points, goals, fears
  - Decision-making context (e.g., "vor Unternehmensnachfolge", "evaluiert Software")

### Optional
- **Bestehende Texte**: Example texts the company already uses (website, emails, brochures)
- **Wettbewerber-Texte**: How competitors speak to the same audience (for differentiation)
- **Tonalität-Wünsche**: Specific tone preferences (e.g., "Du statt Sie", "technisch aber nicht kalt")
- **Verbotene Begriffe**: Words or phrases the company explicitly avoids
- **Vorbilder**: Brands or publications whose voice is admired (for orientation, not copying)
- **Kanal-Fokus**: Primary channels (Blog, LinkedIn, E-Mail, Website) — affects formality and style

## Prerequisites

Before running this skill, the company must have:
- A Brand Guide at `/brand/{firmenname}/brand-guide.md` (run `/create-brand-system` first)

The voice guide extends the brand voice section from the Brand Guide with audience-specific depth.

## Process

### Step 1: Audience Research & Profiling

Analyze the target audience in depth:
- **Demographics**: Age, role, industry, company size
- **Psychographics**: Values, motivations, fears, decision triggers
- **Information behavior**: Where do they read? How long? What format? Mobile or desktop?
- **Language level**: Expert vocabulary? Accessible language? Mixed?
- **Cultural context**: Formal "Sie" or informal "Du"? English terms OK? Industry jargon expected?
- **Decision stage**: Awareness, consideration, decision? Each needs different tone.

Output a structured Audience Profile.

### Step 2: Voice Definition

Based on the audience profile, define:

**Voice Attributes** (3-5 attributes with scales):
```
Formal ←——————→ Informal       [Position: 7/10]
Technical ←——————→ Accessible   [Position: 4/10]
Reserved ←——————→ Energetic     [Position: 6/10]
Analytical ←——————→ Emotional    [Position: 3/10]
Corporate ←——————→ Personal     [Position: 8/10]
```

**Voice Character** in one sentence:
"Wie ein erfahrener Berater, der komplexe Themen klar und direkt erklärt — ohne Buzzwords, ohne Belehrung, mit echtem Verständnis für die Situation des Gegenübers."

### Step 3: Writing Rules

Define concrete, actionable rules:

**Sentence Structure**:
- Preferred sentence length (short/medium/long, mix)
- Active vs. passive voice ratio
- Paragraph length and rhythm
- Use of questions, imperatives, statements

**Vocabulary**:
- Preferred terms (with alternatives to avoid)
- Industry jargon: which terms to use, which to explain, which to avoid
- Foreign words policy (English terms in German text?)
- Formality markers (Sie/Du, Anrede-Konventionen)

**Anti-Slop Rules** (adapted from stop-slop methodology):
- Banned AI-tell phrases specific to this audience
- Structural patterns to avoid (listicle-heavy, bullet-point-only, rhetorical question overuse)
- Opening patterns to avoid ("In der heutigen Zeit...", "Es ist kein Geheimnis, dass...")
- Closing patterns to avoid ("Zusammenfassend lässt sich sagen...", "Die Zukunft wird zeigen...")
- Emphasis patterns to avoid (excessive superlatives, "wirklich", "tatsächlich", "unglaublich")
- Differentiation markers: What makes THIS company's voice different from generic AI output?

### Step 4: Channel Adaptation

For each primary channel, note adjustments:

| Channel | Anpassungen |
|---|---|
| Blog | Längere Form, SEO-Titel, Zwischenüberschriften, 800-1500 Wörter |
| LinkedIn | Hook in Zeile 1, kurze Absätze, CTA am Ende, max 1300 Zeichen |
| E-Mail (Cold) | Persönlich, direkt, Betreffzeile < 50 Zeichen, max 150 Wörter |
| E-Mail (Newsletter) | Informativer Ton, Mehrwert-first, Verlinkungen |
| Website (Landing) | Nutzen-orientiert, Scan-freundlich, Social Proof |
| Proposal | Professionell, strukturiert, ROI-fokussiert |

### Step 5: Examples

Provide 3-5 concrete before/after examples:

**Vorher (generisch/AI):**
> "In der heutigen schnelllebigen Geschäftswelt ist es wichtiger denn je, die richtigen strategischen Entscheidungen zu treffen. Unser innovativer Ansatz hilft Ihnen dabei, Ihre Ziele zu erreichen."

**Nachher (mit Voice Guide):**
> "Sie stehen vor einer Entscheidung, die Ihr Unternehmen für die nächsten 10 Jahre prägt. Wir zeigen Ihnen, welche drei Optionen Sie wirklich haben — und welche Konsequenzen jede mit sich bringt."

Each example must show the specific rules being applied.

### Step 6: Quality Checklist

Generate a voice-specific quality checklist that marketing skills use as final verification:

```
- [ ] Text klingt nach [Firma], nicht nach generischem AI-Output
- [ ] Zielgruppen-spezifische Ansprache (nicht "one size fits all")
- [ ] Keine verbotenen Phrasen oder AI-Tell-Muster
- [ ] Richtige Formalitätsstufe (Sie/Du korrekt)
- [ ] Fachbegriffe erklärt wo nötig, nicht belehrend
- [ ] Aktive Sprache dominiert (min. 80% aktive Konstruktionen)
- [ ] Eröffnung ist spezifisch, nicht generisch
- [ ] CTA ist klar und der Zielgruppe angemessen
```

## Output Structure

Files werden geschrieben nach `/brand/{firmenname}/voice/`:

```
/brand/{firmenname}/
  brand-guide.md                    ← existiert bereits (Brand System)
  style-guide.md                    ← existiert bereits
  voice/
    {zielgruppe-slug}.md            ← NEU: pro Zielgruppe ein Guide
    _anti-slop-rules.md             ← NEU: firmen-übergreifende Anti-Slop-Regeln
```

**Dateiname** = Zielgruppe als Slug, z.B.:
- `voice/kmu-geschaeftsfuehrer.md`
- `voice/steuerberater-partner.md`
- `voice/tech-entscheider.md`

## Integration mit Marketing-Skills

Nach diesem Skill lesen alle Marketing-Skills den Voice Guide als zusätzlichen Kontext:

1. Marketing-Skill prüft: existiert `/brand/{firmenname}/brand-guide.md`?
2. Marketing-Skill prüft: existiert `/brand/{firmenname}/voice/{zielgruppe}.md`?
3. Wenn ja: Ton, Vokabular, Anti-Slop-Regeln und Qualitäts-Checkliste werden angewandt
4. Wenn nein: nur Brand Guide wird als Kontext genutzt (weniger spezifisch)

Die Zielgruppe kann beim Aufruf des Marketing-Skills angegeben werden:
```
/blog-post
Zielgruppe: kmu-geschaeftsfuehrer
Thema: Unternehmensnachfolge richtig planen
```

## Quality Criteria

### Voice Guide
- [ ] Audience Profile ist spezifisch (nicht "Unternehmer allgemein")
- [ ] Voice Attributes haben klare Positionen auf den Skalen
- [ ] Writing Rules sind konkret und actionable (nicht "schreiben Sie gut")
- [ ] Anti-Slop-Regeln sind firmen- und zielgruppen-spezifisch
- [ ] Mindestens 3 Before/After-Beispiele
- [ ] Quality Checklist ist prüfbar (Ja/Nein-Fragen)

### Anti-Slop Rules
- [ ] Verbotene Phrasen sind spezifisch (nicht nur "vermeiden Sie Klischees")
- [ ] Strukturelle Muster sind mit Beispielen belegt
- [ ] Eröffnungs- und Schluss-Patterns haben konkrete Alternativen
- [ ] Regeln sind kulturell angepasst (deutsch, nicht englisch-zentriert)

## Examples

**Input:**
```
Firmenname: StrategAIze Transition
Zielgruppe: Geschäftsführer und Inhaber von KMU (10-250 MA), 50-65 Jahre,
            stehen vor Unternehmensnachfolge oder strategischem Wandel,
            technisch interessiert aber nicht IT-affin,
            schätzen Klarheit und Substanz über Marketing-Sprech
Tonalität: Professionell, direkt, respektvoll, keine Buzzwords
Kanäle: Blog, LinkedIn, Cold E-Mail
```

**Expected Output:**
Voice Guide unter `/brand/strategaize-transition/voice/kmu-geschaeftsfuehrer.md` mit:
- Audience Profile (demografisch + psychografisch)
- Voice: "Wie ein erfahrener Sparringspartner auf Augenhöhe"
- Regeln: Sie-Form, keine Anglizismen, Sätze max 20 Wörter, aktiv > 80%
- Anti-Slop: Keine "In der heutigen Zeit", keine "innovative Lösungen", keine Bullet-Listen als Hauptinhalt
- Before/After für Blog-Eröffnung, LinkedIn-Hook, Cold-E-Mail-Betreff
- Qualitäts-Checkliste

## Integration Notes

- Dieser Skill ergänzt `/create-brand-system` (Brand = visuelle Identität + Kernbotschaften, Voice = sprachliche Umsetzung pro Zielgruppe)
- Mehrere Voice Guides pro Firma sind der Normalfall, nicht die Ausnahme
- Die `_anti-slop-rules.md` gilt firmen-übergreifend; zielgruppen-spezifische Regeln stehen im jeweiligen Guide
- Bei Weiterentwicklung: Voice Guides können um A/B-Test-Ergebnisse, Performance-Daten und Feedback-Loops erweitert werden
