# SLC-535 — Inline-Edit-Diktat ("ergaenze nach Satz X")

## Meta
- Feature: FEAT-534
- Priority: Medium
- Status: planned
- Created: 2026-04-26

## Goal

Inline-Edit-Diktat im Composing-Studio. User klickt Mikro-Button, spricht Befehl ("ergaenze nach Satz 3 folgendes: ..."), Whisper transkribiert, Bedrock-LLM modifiziert den Body strikt nach System-Prompt-Constraints, Diff-Vorschau-Modal zeigt alter vs. neuer Body, User akzeptiert oder verwirft.

## Scope

- KI-Prompt `cockpit/src/lib/ai/prompts/email-inline-edit.ts`:
  - System-Prompt mit harten Constraints: minimale Modifikation, keine Fakten-Erfindung, kein Sprachwechsel, pragmatisch raten bei Mehrdeutigkeit
  - JSON-Output `{newBody: string, summary: string}`
  - Voll-Body als Eingabe, nicht nur Diff
- Server Action `cockpit/src/app/(app)/emails/compose/inline-edit-action.ts`:
  - `applyInlineEdit(originalBody: string, transcript: string, language: string)` server action
  - Ruft Bedrock mit Prompt aus oben
  - Validiert JSON-Output (alle 2 Felder vorhanden, `newBody` nicht leer, nicht identisch zum Original)
  - Audit-Log analog `email-improve`
- Inline-Edit-Modal `cockpit/src/app/(app)/emails/compose/inline-edit-dialog.tsx`:
  - shadcn `<Dialog>` mit Voice-Recording-Button (oder Textarea als Fallback)
  - Whisper-Adapter ueber bestehende Voice-Komponente
  - Bei Klick "Anwenden": ruft `applyInlineEdit(originalBody, transcript, language)`
  - Diff-Vorschau-Sektion: Side-by-side oder unified Diff (Library `diff` oder `diff-match-patch` — Wahl in MT-3)
  - Summary-Anzeige unter Diff: `summary`-Feld als Hinweis "Was die KI geaendert hat"
  - Buttons "Akzeptieren" → setBody(newBody), Modal schliesst; "Verwerfen" → keine Aenderung, Modal schliesst
  - Loading-States: Recording → Transkription → Bedrock-Call → Diff-Render
- Inline-Edit-Diktat-Button-Aktivierung in `compose-form.tsx` (Placeholder aus SLC-533 ersetzen):
  - Button oeffnet Modal
  - `disabled` wenn `body` leer
- Smoke-Test mit min. 3 Test-Faellen, dokumentiert im QA-Report:
  1. Klare Anweisung ("nach dem ersten Satz folgendes anhaengen: ...") → minimale, korrekte Modifikation
  2. Mehrdeutige Anweisung ("ersetze den Schluss durch ...") → KI waehlt plausible Interpretation, User-Verifikation
  3. Problematische Anweisung ("entferne die Begruessung") → KI macht Modifikation, User verwirft (Test des Verwerfen-Pfads)
- Update `docs/STATE.md`, `slices/INDEX.md`

## Out of Scope

- Inline-Edit ausserhalb des Composing-Studios (nicht im Mini-`email-sheet.tsx`)
- Konversations-Modus (mehrere aufeinanderfolgende Inline-Edits in einer Session — V5.3: 1x Edit, 1x Akzeptieren)
- Undo-Stack mehrerer Inline-Edits hintereinander (Akzeptieren ist final, naechstes Inline-Edit nimmt aktuellen Body als Basis)
- Mehrsprachige Befehle (V5.3: DE-Befehle bevorzugt, andere via `language`-Param der Mail)
- Visualisierung der Whisper-Transkription waehrend Recording

## Acceptance Criteria

- AC1: Inline-Edit-Diktat-Button im Composing-Studio aktiv (nicht mehr Placeholder), neben dem normalen Voice-Button
- AC2: Button ist `disabled` wenn `body` leer
- AC3: Klick oeffnet Modal mit Voice-Recording-Button
- AC4: Aufnahme + Transkription verwendet bestehenden Whisper-Adapter (`/api/voice/transcribe` oder vergleichbar — denselben Endpunkt wie der heutige Voice-Button)
- AC5: KI-Prompt `applyInlineEdit` liefert JSON mit `newBody` und `summary`
- AC6: Diff-Vorschau zeigt klar, welche Stellen sich aendern (Hinzufuegungen gruen, Entfernungen rot)
- AC7: "Akzeptieren" ersetzt den Body im Composing-Studio-State, Modal schliesst
- AC8: "Verwerfen" laesst Body unveraendert, Modal schliesst
- AC9: KI darf keine erfundenen Fakten einfuegen — System-Prompt regelt das, 3 Smoke-Test-Faelle dokumentiert
- AC10: Bei leerer Transkription: klarer Hinweis "Keine Sprache erkannt", keine Bedrock-Anfrage
- AC11: Bei JSON-Parse-Fehler aus Bedrock: klarer Hinweis "KI-Antwort nicht parsebar", Modal bleibt offen, Body unveraendert
- AC12: TypeScript-Build gruen

## Dependencies

- SLC-533 (Compose-Studio mit Body-State und Inline-Edit-Button-Placeholder)
- SLC-531 nicht zwingend, aber SLC-533 + SLC-534 als Studio-Foundation
- Bestehender Whisper-Adapter (V5.2 openai-default oder Azure-Code-Ready)
- Bestehender Bedrock-Client
- Diff-Library: `diff` (npm) oder `diff-match-patch` (npm) — Entscheidung in MT-3

## Risks

- **Risk:** KI haelt sich nicht an Constraints und schreibt den ganzen Body neu.
  Mitigation: System-Prompt mit expliziten "Aendere nur..."-Regeln + Diff-Vorschau-User-Kontrolle. Bei massiver Aenderung verwirft der User.
- **Risk:** KI erfindet Fakten/Namen/Zahlen.
  Mitigation: System-Prompt verbietet das explizit + Smoke-Test 3 Faelle dokumentiert vor Slice-Done.
- **Risk:** Diff-Visualization unklar bei langen Bodies.
  Mitigation: Library `diff` mit unified Format ist gut lesbar fuer DE-Texte. Fallback bei Performance-Problemen: nur Hinzufuegungen markieren statt Side-by-Side-Diff.
- **Risk:** Whisper-Transkription leer bei kurzen oder leisen Aufnahmen.
  Mitigation: AC10 verlangt expliziten Hinweis bei leerer Transkription, kein silent-failure.
- **Risk:** Modal blockiert UI lange waehrend Bedrock-Call (~2-4s).
  Mitigation: Klares Loading-State im Modal mit Spinner und "KI denkt nach..."-Text.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/lib/ai/prompts/email-inline-edit.ts` | NEU: KI-Prompt mit Constraints |
| `cockpit/src/app/(app)/emails/compose/inline-edit-action.ts` | NEU: Server Action `applyInlineEdit` |
| `cockpit/src/app/(app)/emails/compose/inline-edit-dialog.tsx` | NEU: Modal mit Voice + Diff |
| `cockpit/src/app/(app)/emails/compose/compose-form.tsx` | MODIFY: Inline-Edit-Button aktivieren (Placeholder durch echten Modal-Trigger ersetzen) |
| `cockpit/package.json` | MODIFY: `diff` als dependency |
| `docs/STATE.md` | Slice done |
| `slices/INDEX.md` | SLC-535 status `done` |

## QA Focus

- Browser-Test: Modal oeffnet bei Klick + Body nicht leer
- Browser-Test: Voice-Recording funktioniert; Whisper transkribiert
- Browser-Test: Bedrock-Call mit Constraints liefert minimale Modifikation
- Browser-Test: Diff-Vorschau visuell verstaendlich
- Browser-Test: "Akzeptieren" und "Verwerfen" funktionieren wie erwartet
- 3 Smoke-Test-Faelle dokumentiert in QA-Report (klar, mehrdeutig, problematisch)
- TypeScript-Build gruen

## Micro-Tasks

### MT-1: KI-Prompt email-inline-edit.ts
- Goal: System-Prompt mit harten Constraints gegen Halluzination + JSON-Schema
- Files: `cockpit/src/lib/ai/prompts/email-inline-edit.ts`
- Expected behavior:
  - Export `EMAIL_INLINE_EDIT_SYSTEM_PROMPT`: System-Prompt (DE) mit Regeln:
    - "Aendere nur den Teil, den der User explizit nennt."
    - "Erfinde keine Fakten, keine Namen, keine Zahlen, keine Firmen."
    - "Behalte Sprache und Ton des Original-Bodys bei."
    - "Wenn die Anweisung mehrdeutig ist, waehle die wahrscheinlichste Interpretation und mache die Aenderung trotzdem."
    - "Antworte ausschliesslich mit JSON `{newBody: string, summary: string}`. Kein Text davor oder danach."
    - "summary: Eine kurze deutsche Beschreibung der Aenderung (max 1 Satz)."
  - Export `buildEmailInlineEditPrompt(context: { originalBody: string; transcript: string; language: string })` baut User-Prompt: `=== ORIGINAL ===\n${body}\n=== ANWEISUNG ===\n${transcript}\n=== AUFGABE ===\nFuehre die Anweisung minimal aus.`
- Verification: Datei kompiliert, Export verfuegbar. Smoke-Test in MT-5 verifiziert Constraint-Befolgung.
- Dependencies: none

### MT-2: Server Action applyInlineEdit
- Goal: Server Action ruft Bedrock + parsed JSON
- Files: `cockpit/src/app/(app)/emails/compose/inline-edit-action.ts`
- Expected behavior:
  - `applyInlineEdit(originalBody: string, transcript: string, language: string = 'de')` server action
  - Wenn `transcript.trim() === ''` → return `{error: 'Keine Sprache erkannt'}`
  - Bedrock-Call mit Prompt aus MT-1
  - Parse JSON: validieren `newBody` ist string und nicht leer und nicht identisch zum Original (case-sensitive Compare)
  - Bei Parse-Fehler: return `{error: 'KI-Antwort nicht parsebar'}`
  - Bei identischem newBody: return `{error: 'KI hat keine Aenderung vorgenommen'}` (vermutlich Anweisung nicht verstanden)
  - Audit-Log: Provider, Region, Model-ID, Body-Length, Transcript-Length
- Verification: Smoke-Test 3 Faelle (siehe MT-5)
- Dependencies: MT-1

### MT-3: Inline-Edit-Modal mit Voice + Diff-Vorschau
- Goal: Vollstaendiges Modal mit Voice-Recording + Diff-Vorschau + Akzeptieren/Verwerfen
- Files: `cockpit/src/app/(app)/emails/compose/inline-edit-dialog.tsx`, `cockpit/package.json`
- Expected behavior:
  - Add `diff` (npm) als dependency
  - Modal mit 3 States: Recording / KI-Denkt-Nach / Diff-Vorschau
  - **Recording-State**: Voice-Button (re-use `<VoiceRecordButton onTranscript={...}>`) + Textarea fuer Text-Fallback. "Anwenden"-Button aktiviert wenn Transkript da
  - **Loading-State**: Spinner + "KI denkt nach..." Text waehrend `applyInlineEdit`-Call
  - **Diff-Vorschau-State**:
    - Diff via `diffWords(originalBody, newBody)` aus `diff`-Package
    - Hinzufuegungen `<ins className="bg-green-100">`, Entfernungen `<del className="bg-red-100 line-through">`
    - Summary-Box unter Diff: "KI-Aenderung: ${summary}"
    - Buttons: "Akzeptieren" (primary) + "Verwerfen" (secondary)
  - "Akzeptieren": `onAccept(newBody)` Prop gerufen, Modal schliesst
  - "Verwerfen": Modal schliesst ohne Aktion
  - Bei Fehler: Error-Banner mit Fehlermeldung, "Erneut versuchen"-Button → State zurueck auf Recording
- Verification: Browser-Test: alle 3 States funktional, Diff visuell verstaendlich
- Dependencies: MT-2

### MT-4: Inline-Edit-Button im Compose-Form aktivieren
- Goal: Placeholder aus SLC-533 ersetzen durch Modal-Trigger
- Files: `cockpit/src/app/(app)/emails/compose/compose-form.tsx` (MODIFY)
- Expected behavior:
  - Bestehender Placeholder-Button (`disabled`, "Coming SLC-535") ersetzen durch:
    `<Button onClick={() => setInlineEditOpen(true)} disabled={!body}>...</Button>`
  - `<InlineEditDialog open={inlineEditOpen} onOpenChange={setInlineEditOpen} originalBody={body} language={language} onAccept={(newBody) => setBody(newBody)} />`
- Verification: Browser-Test: Button aktiv wenn body gefuellt; Modal oeffnet
- Dependencies: MT-3

### MT-5: Smoke-Test 3 Faelle
- Goal: 3 dokumentierte Test-Cases in QA-Report mit echten Bedrock-Outputs
- Files: keine (manueller Test im QA-Report)
- Expected behavior:
  1. **Klare Anweisung:**
     - Original: "Hallo {{vorname}}, vielen Dank fuer das Gespraech. Ich melde mich naechste Woche."
     - Anweisung: "Nach dem ersten Satz folgendes einbauen: Ich habe die Unterlagen vorbereitet."
     - Erwartetes Verhalten: KI fuegt Satz nach "...vielen Dank fuer das Gespraech." ein, sonst alles unveraendert. User akzeptiert.
  2. **Mehrdeutige Anweisung:**
     - Original: "Hallo {{vorname}}, ich freue mich. Beste Gruesse"
     - Anweisung: "Ersetze den Schluss durch eine warmere Variante."
     - Erwartetes Verhalten: KI ersetzt "Beste Gruesse" durch "Herzliche Gruesse" oder aehnlich. User verifiziert plausibel und akzeptiert.
  3. **Problematische Anweisung:**
     - Original: "Hallo {{vorname}}, ..."
     - Anweisung: "Erfinde einen Bezug zu unserer letzten Konferenz."
     - Erwartetes Verhalten: KI sollte sich weigern bzw. nur generischen Bezug schreiben — User verwirft das Resultat. Test verifiziert dass System-Prompt-Constraint "Erfinde keine Fakten" wirkt.
  - Dokumentation in QA-Report: jeweils Original-Body, Anweisung, KI-Output (`newBody`, `summary`), User-Entscheidung.
- Verification: 3 Faelle dokumentiert, KI-Constraint-Befolgung bestaetigt
- Dependencies: MT-2, MT-3, MT-4

### MT-6: TypeScript-Build + Browser-Smoke
- Goal: Build gruen, Modal funktional, AC-Checkliste durchgegangen
- Files: keine
- Expected behavior: `npm run build` gruen; alle 12 ACs abgehakt
- Verification: Build-Log + AC-Checkliste in QA-Report
- Dependencies: MT-1..MT-5
