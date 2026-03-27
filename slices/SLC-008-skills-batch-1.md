# SLC-008 — Marketing-Skills Batch 1

## Meta
- Feature: FEAT-004
- Priority: High
- Status: planned
- Dependencies: keine (Skills sind Dateien im Repo, unabhängig vom Cockpit)

## Goal
Erste 4 Marketing-Skills aus Open-Source-Libraries ins Strategaize-Skill-Format adaptieren. Skills funktionieren in Claude Code direkt.

## Scope
- `/content-strategy` — Content-Pillars, Topic Clusters, Redaktionskalender planen
- `/copywriting` — Conversion Copywriting für Web-Texte
- `/blog-post` — Blog-Beitrag generieren mit SEO
- `/linkedin-post` — LinkedIn-Post mit Plattform-Specs
- Jeder Skill: SKILL.md im Strategaize-Format, getestet

## Out of Scope
- Cockpit-Integration (V2)
- Automatische Skill-Ketten (V3)

### Micro-Tasks

#### MT-1: /content-strategy Skill
- Goal: Skill adaptieren aus coreyhaines31/marketingskills
- Files: `skills/marketing/content-strategy/SKILL.md`
- Expected behavior: Skill über Claude Code aufrufbar, produziert Content-Strategie-Dokument
- Verification: `/content-strategy` in Claude Code ausführen → strukturiertes Output
- Dependencies: keine

#### MT-2: /copywriting Skill
- Goal: Skill adaptieren aus coreyhaines31/marketingskills
- Files: `skills/marketing/copywriting/SKILL.md`
- Expected behavior: Skill produziert Conversion Copy für gegebene Seite/Produkt
- Verification: `/copywriting` ausführen → Web-Text-Vorschlag
- Dependencies: keine

#### MT-3: /blog-post Skill
- Goal: Skill adaptieren aus coreyhaines31 + kostja94
- Files: `skills/marketing/blog-post/SKILL.md`
- Expected behavior: Skill generiert Blog-Beitrag mit SEO-Optimierung, Meta-Tags, Outline
- Verification: `/blog-post` ausführen → vollständiger Blog-Entwurf
- Dependencies: keine

#### MT-4: /linkedin-post Skill
- Goal: Skill adaptieren aus kostja94/marketing-skills
- Files: `skills/marketing/linkedin-post/SKILL.md`
- Expected behavior: Skill generiert LinkedIn-Post mit Plattform-Specs (Zeichenlimit, Hashtags, Hook)
- Verification: `/linkedin-post` ausführen → LinkedIn-Post
- Dependencies: keine
