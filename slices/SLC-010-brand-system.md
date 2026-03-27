# SLC-010 — Brand System Skill

## Meta
- Feature: FEAT-005
- Priority: High
- Status: planned
- Dependencies: keine (Skill ist Datei im Repo, unabhängig vom Cockpit)

## Goal
`/create-brand-system` Skill bauen, basierend auf ui-ux-pro-max-skill. Generiert pro Firma: Brand Guide → Style Guide (Strategaize-Format) → Design Tokens → Canva Brand Kit Anleitung. Adapter für Format-Konvertierung.

## Scope
- `/create-brand-system` SKILL.md erstellen
- ui-ux-pro-max-skill `brand` + `design-system` Skills als Basis adaptieren
- Datenbanken (Farbpaletten, Font-Pairings) als Referenz-Material integrieren
- Format-Adapter: Output → `strategaize_styleguide.md` Format
- Output-Struktur: `/brand/{firmenname}/brand-guide.md`, `style-guide.md`, `design-tokens.json`, `design-tokens.css`, `canva-brand-kit.md`
- Marketing-Skills sollen Brand-Kontext automatisch lesen können

## Out of Scope
- Logo-Generierung (manuell über Canva/Figma)
- Marketing-Template-Erstellung (eigener Skill, später)
- Canva-API-Integration (manuell)

### Micro-Tasks

#### MT-1: Brand-Referenzdaten aufbereiten
- Goal: Farbpaletten, Font-Pairings aus ui-ux-pro-max-skill extrahieren und als Referenz-Dateien ablegen
- Files: `skills/brand/reference/color-palettes.md`, `skills/brand/reference/font-pairings.md`
- Expected behavior: Kuratierte Referenz-Daten verfügbar für den Skill
- Verification: Dateien vorhanden mit strukturierten Daten
- Dependencies: keine

#### MT-2: /create-brand-system Skill
- Goal: Skill erstellen der Brand System pro Firma generiert
- Files: `skills/brand/create-brand-system/SKILL.md`
- Expected behavior: Input (Firmenname, Branche, Zielgruppe, Kernfarben, Tonalität) → Output (brand-guide.md, style-guide.md, design-tokens.json, design-tokens.css, canva-brand-kit.md)
- Verification: `/create-brand-system` in Claude Code für "Strategaize" ausführen → 5 Dateien unter `/brand/strategaize/`
- Dependencies: MT-1

#### MT-3: Format-Adapter (→ strategaize_styleguide.md)
- Goal: Konvertierungs-Logik im Skill die Brand-Output ins bestehende Strategaize-Style-Guide-Format bringt
- Files: `skills/brand/create-brand-system/SKILL.md` (Update — Adapter-Sektion)
- Expected behavior: `style-guide.md` Output folgt dem gleichen Format wie `/docs/STYLE_GUIDE_REFERENCE.md`
- Verification: Output-Format matcht Referenz
- Dependencies: MT-2

#### MT-4: Brand-Kontext für Marketing-Skills
- Goal: Anweisung in Marketing-Skills dass sie das Brand System automatisch als Kontext lesen
- Files: `skills/marketing/content-strategy/SKILL.md` (Update), `skills/marketing/copywriting/SKILL.md` (Update), `skills/marketing/blog-post/SKILL.md` (Update), `skills/marketing/linkedin-post/SKILL.md` (Update)
- Expected behavior: Marketing-Skills prüfen ob `/brand/{firmenname}/brand-guide.md` existiert und lesen es als Kontext
- Verification: `/blog-post` mit existierendem Brand System → Output nutzt Brand-Tonalität
- Dependencies: MT-2, SLC-008
