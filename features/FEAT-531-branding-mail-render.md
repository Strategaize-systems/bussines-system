# FEAT-531 — Branding-Settings + zentrale Mail-Layout-Engine

## Summary
Eine zentrale Settings-Page (`/settings/branding`) fuer Logo, Markenfarben, Schrift und Footer. Alle versendeten Mails und die V5.3-Live-Preview rendern ueber denselben `renderBrandedHtml`.

## Problem
Versendete Mails gehen heute als Plain-zu-HTML (`textToHtml` in `send.ts`) raus — ohne Logo, ohne Farbe, ohne konsistente Schrift. Empfaengerseitig wirkt das amateurhaft. Pro-Vorlage-Branding-Pflege waere Doppelarbeit.

## Solution
Branding wird einmal zentral gepflegt. Ein dedizierter HTML-Renderer (`renderBrandedHtml`) liest Branding + Body + Variablen und produziert vollstaendiges, inline-CSS-versehenes HTML, das fuer Gmail/Outlook/Apple Mail kompatibel ist. Live-Preview im Composing-Studio (FEAT-532) und tatsaechlicher Versand (`send.ts`) rufen denselben Renderer — kein Drift.

## Acceptance Criteria
- AC1: `/settings/branding` ist erreichbar und persistiert Logo, Primaerfarbe, Sekundaerfarbe, Schriftfamilie, Default-Footer-Text, Kontakt-Block.
- AC2: Logo wird als `<img>` mit absoluter URL/Data-URI eingebettet und in Gmail/Outlook sichtbar gerendert.
- AC3: Primaerfarbe ist sichtbar in Footer-Linie und/oder Buttons.
- AC4: Schriftfamilie wird per Inline-Style auf `<body>` und Hauptbereiche gesetzt.
- AC5: Eine Mail ohne Branding-Settings geht weiterhin als Plain-zu-HTML raus (Backwards Compatibility).
- AC6: Live-Preview-Render ist bit-identisch zum tatsaechlich versendeten HTML (gleicher Renderer).
- AC7: Renderer ist Unit-getestet mit Snapshot fuer minimale, vollstaendige und edge-case Branding-Konfigs.

## Out of Scope
- Block-basierter Mail-Builder (Drag-and-Drop) — `layout`-Feld ist fuer spaeter vorbereitet
- Multi-Branding pro User/Team
- Auto-Anhaengen des Compliance-Footers aus FEAT-523
- WYSIWYG-Editor

## Dependencies
- DEC-052 (Bedrock Cost Control) — wirkt auf KI-Aufrufe in Geschwister-Features
- `cockpit/src/lib/email/send.ts` — Renderer-Hook ohne Bruch der Tracking-Logik
- /architecture muss entscheiden: eigene `branding_settings`-Tabelle oder Erweiterung von `system_settings`; Logo via Supabase Storage Bucket oder Data-URI
