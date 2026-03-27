# /create-brand-system

## Purpose

Generate a complete, production-ready brand system for a B2B company. The output provides the foundation that all Marketing-Skills (`/blog-post`, `/copywriting`, `/linkedin-post`, `/cold-email`, `/create-proposal`, `/sales-enablement`, `/content-strategy`, `/competitor-analysis`) read as context to ensure consistent brand voice, visual identity, and messaging across all outputs.

Use this skill when:
- Setting up a new company in the Business System
- A company has no brand system yet (no `/brand/{firmenname}/` directory)
- Rebranding or refining an existing brand
- Onboarding a new client who needs brand-consistent content

This skill produces **5 files** per company. It does NOT produce logos, final Canva designs, or marketing content (use the marketing skills for that).

## Inputs

### Required
- **Firmenname**: Exact company name (used for directory name and brand materials)
- **Branche**: Industry / sector
- **Zielgruppe**: Primary target audience (job titles, company size, pain points)

### Optional
- **Kernfarben**: If the company already has brand colors (hex codes)
- **Bestehendes Logo**: Description of existing logo (colors, style, elements)
- **Tonalität**: Desired brand voice (e.g., "professionell aber zugänglich", "technisch und präzise")
- **Wettbewerber**: Key competitors (for differentiation in positioning)
- **Kernbotschaft**: Core value proposition or tagline
- **Referenz-Pairing**: Preferred font pairing from `/skills/brand/reference/font-pairings.md`
- **Referenz-Palette**: Preferred color palette from `/skills/brand/reference/color-palettes.md`

## Reference Data

Before generating, check these reference files for inspiration:
- `/skills/brand/reference/color-palettes.md` — curated B2B color palettes by industry
- `/skills/brand/reference/font-pairings.md` — curated font pairings by brand character

If the user provides no color or font preferences, select appropriate options from these references based on industry and desired character.

## Process

### Step 1: Brand Discovery

Analyze the inputs and determine:
- Brand positioning (market position, differentiation)
- Brand personality (3-5 personality traits)
- Brand voice (how the brand speaks: formal/informal, technical/accessible, warm/authoritative)
- Core messaging framework (value proposition, key messages, elevator pitch)

Ask clarifying questions if critical inputs are missing. Do not guess at fundamental brand direction.

### Step 2: Visual Identity Foundation

Based on brand personality and industry:
1. Select or confirm color palette (primary, secondary, accent, neutrals)
2. Select or confirm font pairing (heading, body, mono)
3. Define spacing and sizing system
4. Define visual style direction (minimal, bold, classic, modern)

If the user provided existing colors, build the palette around them. If not, recommend from reference data.

### Step 3: Generate Brand Guide (`brand-guide.md`)

Create a comprehensive brand guide with:
- Brand Story (who, why, what makes them different)
- Mission & Vision
- Brand Values (3-5 with descriptions)
- Brand Personality
- Brand Voice Guidelines (do's and don'ts, example phrases)
- Target Audience Profiles
- Messaging Framework (value prop, key messages, proof points)
- Competitive Positioning

### Step 4: Generate Style Guide (`style-guide.md`)

**FORMAT ADAPTER**: The style guide MUST follow the Strategaize Style Guide format. Reference `/docs/STYLE_GUIDE_REFERENCE.md` for the expected structure.

Create a style guide with these sections (matching the reference format):
1. Brand & Farben (colors with CSS variables, gradients)
2. Typografie (font families, sizes, weights, line heights)
3. Layout & Shell (max-width, padding, grid)
4. Navigation & Sidebar (if applicable)
5. Cards & KPI (card styles, shadows, borders)
6. Tables (header, rows, hover states)
7. Forms (inputs, labels, validation)
8. Buttons (variants: primary, secondary, outline, destructive)
9. Status, Tags & Alerts (color coding, badge styles)
10. Progress & Charts (bar styles, colors)
11. Empty, Loading & Feedback States
12. Interaction States (hover, focus, active, disabled)
13. Do's & Don'ts

Each section must include CSS custom properties and concrete usage examples.

### Step 5: Generate Design Tokens

Create two token files:

**`design-tokens.json`** — Structured JSON for programmatic use:
```json
{
  "color": {
    "primary": { "dark": "#...", "main": "#...", "light": "#..." },
    "secondary": { "dark": "#...", "main": "#...", "light": "#..." },
    "accent": { "main": "#..." },
    "success": { "main": "#...", "light": "#..." },
    "warning": { "main": "#...", "light": "#..." },
    "error": { "main": "#...", "light": "#..." },
    "neutral": { "50": "#...", "100": "#...", "200": "#...", "...", "900": "#..." }
  },
  "typography": {
    "fontFamily": { "heading": "...", "body": "...", "mono": "..." },
    "fontSize": { "xs": "0.75rem", "sm": "0.875rem", "base": "1rem", "..." },
    "fontWeight": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
    "lineHeight": { "tight": 1.25, "normal": 1.5, "relaxed": 1.75 }
  },
  "spacing": { "1": "0.25rem", "2": "0.5rem", "...": "..." },
  "borderRadius": { "sm": "0.25rem", "md": "0.5rem", "lg": "0.75rem", "full": "9999px" },
  "shadow": { "sm": "...", "md": "...", "lg": "..." }
}
```

**`design-tokens.css`** — CSS custom properties for direct use:
```css
:root {
  --color-primary-dark: #...;
  --color-primary-main: #...;
  /* ... all tokens as CSS variables */
}
```

### Step 6: Generate Canva Brand Kit Guide (`canva-brand-kit.md`)

Create a step-by-step guide for setting up the brand in Canva:
- Which colors to add (with hex codes)
- Which fonts to select (with Canva-equivalent names if Google Fonts aren't available)
- Logo upload instructions
- Template recommendations for common use cases (social media, presentations, documents)
- Brand kit settings checklist

## Output Structure

All files are written to `/brand/{firmenname}/`:

```
/brand/{firmenname}/
  brand-guide.md        — Brand strategy and messaging
  style-guide.md        — Visual design system (Strategaize format)
  design-tokens.json    — Tokens for programmatic use
  design-tokens.css     — Tokens as CSS variables
  canva-brand-kit.md    — Manual Canva setup guide
```

The directory name uses the company name in lowercase, with spaces replaced by hyphens.

## Quality Criteria

### Brand Guide
- [ ] Brand story is specific and differentiated (not generic "we deliver excellence")
- [ ] Voice guidelines include concrete do's and don'ts with example phrases
- [ ] Messaging framework has a clear value proposition, not just buzzwords
- [ ] Target audience profiles are specific (job titles, pain points, goals)

### Style Guide
- [ ] Follows Strategaize Style Guide format (matches `/docs/STYLE_GUIDE_REFERENCE.md` structure)
- [ ] All CSS variables are defined with actual values (no placeholders)
- [ ] Color contrast ratios meet WCAG AA for text on backgrounds
- [ ] Font sizes form a clear hierarchy
- [ ] Includes concrete usage examples for each section

### Design Tokens
- [ ] JSON is valid and parseable
- [ ] CSS is valid and loadable
- [ ] Token names are consistent between JSON and CSS
- [ ] All colors from the palette are represented
- [ ] Neutral scale has at least 50-900 range

### Canva Brand Kit
- [ ] All hex codes match the design tokens exactly
- [ ] Font recommendations account for Canva font availability
- [ ] Instructions are step-by-step and screenshot-free (text-only, actionable)

## Integration with Marketing Skills

After this skill runs, all marketing skills will automatically use the brand context:

1. Marketing skills check for `/brand/{firmenname}/brand-guide.md`
2. If found, they read brand voice, messaging, and audience from it
3. Output is adapted to match brand tone and terminology

The brand system is the **single source of truth** for brand-consistent content generation.

## Examples

**Input:**
```
Firmenname: StrategAIze Transition
Branche: Unternehmensberatung / digitale Transformation
Zielgruppe: Geschäftsführer und Inhaber von KMU (10-250 MA), die vor Unternehmensnachfolge oder strategischem Wandel stehen
Kernfarben: #120774 (Royal Indigo), #00a84f (Growth Green)
Tonalität: Professionell, klar, zukunftsorientiert, aber nicht kalt
Kernbotschaft: "Von der Strategie zur Umsetzung — mit KI-gestützter Klarheit"
```

**Expected Output:**
5 files in `/brand/strategaize-transition/` with:
- Brand guide covering B2B consulting positioning, KMU decision-maker audience profiles, transformation-focused messaging
- Style guide in Strategaize format with Royal Indigo + Growth Green palette
- Design tokens in JSON + CSS
- Canva brand kit setup guide

## Integration Notes

- This skill is the foundation for all brand-dependent skills
- Run this BEFORE using marketing skills for a new company
- If brand system already exists, marketing skills use it automatically
- Re-running this skill for an existing company overwrites the brand system (use with intent)
- The format adapter (Step 4) ensures compatibility with existing Strategaize tooling
