# SLC-315 — KI-Composing + Kontext-Intelligenz

## Slice Info
- Feature: FEAT-305, FEAT-106
- Version: V3.1
- Priority: High
- Dependencies: SLC-313 (on-click Pattern), SLC-314 (Prompt-Pattern)
- Type: Frontend + API + Server Actions

## Goal
Zwei zusammengehoerende KI-Features: (1) E-Mail-Composing mit KI-Unterstuetzung und Kontext, (2) Kontext-Intelligenz — alle Formulare werden aus dem aktuellen Kontext vorbefuellt. Zusammen machen sie das System "mitdenkend".

## Scope

### Included
**KI-E-Mail-Composing (BL-322):**
1. Kontakt automatisch aus Deal-Kontext vorbelegen
2. Betreff aus naechster Aktion / Kontext vorschlagen
3. Template-Auswahl (bestehende Templates)
4. Voice-Input fuer Nachrichtentext (Whisper)
5. KI-Verbesserung: Rechtschreibung, Ton, Zusammenfassung (Bedrock)
6. Follow-up-Datum vorschlagen

**Kontext-Intelligenz (BL-323):**
7. Task-Erstellung: Titel + Kontext aus aktuellem Deal/Kontakt vorbelegen
8. Meeting-Erstellung: Teilnehmer + Agenda aus Deal-Kontext
9. Notiz-Erstellung: Kontext-Header automatisch
10. Alle Formulare: Relevante Felder vorbefuellt wenn Kontext vorhanden

### Excluded
- Autonomes E-Mail-Senden (immer Confirm-before-send)
- E-Mail-Templates erstellen/verwalten (BL-129, eigener Slice)
- Automatische Antwort-Erkennung (V4, IMAP)

## Backlog Items
- BL-322: KI-E-Mail-Composing mit Kontext
- BL-323: Kontext-Intelligenz Formulare vorbefuellt

## Acceptance Criteria
1. E-Mail-Sheet im Deal-Workspace: Kontakt + Betreff automatisch vorbefuellt
2. Voice-Button im E-Mail-Body: Whisper-Transkription funktioniert
3. "KI verbessern" Button: Bedrock korrigiert Text (Ton, Rechtschreibung)
4. Follow-up-Datum wird basierend auf Kontakt-Prioritaet vorgeschlagen
5. Task-Sheet im Deal-Workspace: Titel enthaelt Deal-Referenz
6. Meeting-Sheet: Kontakt als Teilnehmer, Deal-Titel in Agenda
7. Vorbefuellung funktioniert nur wenn Kontext vorhanden (kein Crash ohne Kontext)
8. Confirm-before-send bei E-Mail bleibt bestehen

## Micro-Tasks

### MT-1: Kontext-Provider Utility
- Goal: Utility das den aktuellen Kontext (Deal, Kontakt, Firma) sammelt und als Prefill-Daten bereitstellt
- Files: `lib/context-prefill.ts` (neu)
- Expected behavior: `getContextPrefill(dealId?, contactId?, companyId?)` → {contactEmail, contactName, dealTitle, companyName, suggestedSubject, suggestedFollowUp}
- Verification: Unit-Test — mit/ohne Kontext
- Dependencies: keine

### MT-2: E-Mail-Compose KI-Upgrade
- Goal: E-Mail-Sheet um Voice-Input, KI-Verbesserung und Kontext-Vorbefuellung erweitern
- Files: E-Mail-Sheet/Compose-Komponente (bestehend), `lib/ai/prompts/email-improve.ts` (neu)
- Expected behavior: Kontakt vorbefuellt, Voice-Button im Body, "KI verbessern" Button, Follow-up-Vorschlag
- Verification: Browser-Check — E-Mail aus Deal-Workspace erstellen mit KI-Features
- Dependencies: MT-1

### MT-3: Formular-Kontext-Prefill (Task, Meeting, Notiz)
- Goal: Task-, Meeting- und Notiz-Sheets nutzen Kontext-Prefill wenn verfuegbar
- Files: Task-Sheet, Meeting-Sheet, Notiz-Komponente (bestehend)
- Expected behavior: Wenn aus Deal-Workspace geoeffnet: relevante Felder vorbefuellt
- Verification: Browser-Check — Sheets aus verschiedenen Kontexten oeffnen
- Dependencies: MT-1

### MT-4: KI-Textverbesserung API
- Goal: API-Route die Text via Bedrock verbessert (Rechtschreibung, Ton, Zusammenfassung)
- Files: `app/api/ai/improve-text/route.ts` (neu), `lib/ai/prompts/email-improve.ts`
- Expected behavior: POST {text, mode: 'correct'|'formal'|'summarize'} → verbesserter Text
- Verification: API-Test — verschiedene Texte + Modi
- Dependencies: keine

## Technical Notes
- Kontext kommt ueber URL-Params oder React-Context (Deal-Workspace hat dealId)
- E-Mail-Compose: Bestehender EmailSheet erweitern, nicht neu bauen
- KI-Verbesserung: 3 Modi — Korrektur, Formalisierung, Zusammenfassung (User waehlt)
- Follow-up-Logik: Kontakt-Prioritaet (Hoch=2d, Mittel=5d, Niedrig=7d) — berechnet aus Kontakt-Daten
- Voice-Input: Bestehender Whisper-Flow wiederverwendbar
