# FEAT-532 — 3-Panel-Composing-Studio (`/emails/compose`)

## Summary
Eine eigenstaendige Vollbild-Seite mit 3 Spalten als zentraler E-Mail-Erstellungs-Ort. Links Vorlagen, Mitte Erfassen, rechts Live-Preview. Wird der primaere Einstiegspunkt aus Deal-Workspace, Mein Tag und Focus.

## Problem
Die heutige `EmailCompose`-Form ist eine schmale Single-Column-Sheet ohne Vorschau, ohne Vorlagen-Panel und ohne KI-gestuetzte Empfaenger-/Betreff-Vorausfuellung. Vertriebs-Touches dauern unnoetig lang und sehen nicht professionell aus.

## Solution
Neue Route `cockpit/src/app/(app)/emails/compose/page.tsx`. 3-Spalten-Layout (links 280-320px, mitte flex-1, rechts 420-480px). Mobile-Fallback: Spalten als Tabs. Query-Parameter `?dealId=...&contactId=...&companyId=...&templateId=...` initialisieren das Formular aus Kontext. Live-Preview verwendet `renderBrandedHtml` aus FEAT-531 mit Debounce 200-300ms. Senden geht ueber bestehendes `sendEmailWithTracking`.

## Acceptance Criteria
- AC1: `/emails/compose` ist erreichbar als Vollbild-Seite mit 3-Panel-Layout.
- AC2: Mit `?dealId=X` werden Empfaenger und Betreff aus Deal-Kontext per KI-Vorschlag vorausgefuellt.
- AC3: Klick auf eine Vorlage in der linken Spalte fuellt Mitte und Preview konsistent.
- AC4: Variablen-Ersetzung verwendet vorhandene Deal-/Kontakt-/Firma-Daten.
- AC5: Live-Preview aktualisiert sich bei Aenderungen in der Mitte (max 300ms Lag).
- AC6: "Senden" verwendet `sendEmailWithTracking` und produziert dieselben DB-Eintraege wie heute.
- AC7: Mobile-Layout zeigt Tabs statt Spalten — alle 3 Bereiche bleiben erreichbar.
- AC8: Deal-Workspace-Button "E-Mail schreiben" oeffnet die neue Seite (nicht mehr das Sheet).

## Out of Scope
- Block-basierter Drag-and-Drop-Editor
- Anhaenge-Upload-UI
- Empfaenger-Multi-Select / BCC-Listen
- A/B-Testing von Vorlagen
- WYSIWYG-Editor (Markdown + Branding-Renderer reicht)
- Auto-Save-Drafts

## Dependencies
- FEAT-531 (Branding-Renderer fuer Live-Preview und Send)
- FEAT-533 (Vorlagen-Liste + Systemvorlagen)
- FEAT-534 (Inline-Edit-Diktat-Button)
- Bestehende `email_templates`-Tabelle und `sendEmailWithTracking`
- Bestehender Whisper-Adapter fuer Voice-Buttons
- DEC-052 (KI-Aufrufe on-click)

## Notes
Schnitt fuer /slice-planning: FEAT-532 wird in zwei Slices aufgeteilt:
- "Layout + KI-Vorausfuellung" — Route, 3-Panel-Skeleton, KI-Vorschlag An/Betreff, Templates-Liste-Read.
- "Live-Preview + Send-Integration" — Renderer-Anbindung, Debounce, Send-Action, Mobile-Tabs.
