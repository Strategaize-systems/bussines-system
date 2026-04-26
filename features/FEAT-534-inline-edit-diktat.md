# FEAT-534 — Inline-Edit-Diktat ("ergaenze nach Satz X")

## Summary
Voice-gesteuerte gezielte Modifikation am Body des Composing-Studios. Statt nur am Ende anzuhaengen, kann der User per Sprachbefehl gezielt Saetze ergaenzen, ersetzen oder umstellen — mit Diff-Vorschau vor Uebernahme.

## Problem
Der bestehende Voice-Button haengt das Transkript nur am Ende des Bodys an (`prev + " " + text`). Wenn der User mitten im Text etwas ergaenzen oder einen Absatz austauschen will, muss er den Cursor manuell positionieren oder den Text manuell editieren. Bei Vertriebs-Mails mit mehreren Saetzen ist das langsam.

## Solution
Neuer Modus "Inline-Edit-Diktat" im Composing-Studio. Workflow:
1. User klickt Inline-Edit-Mikro.
2. User spricht z.B. "nach dem dritten Satz folgendes einbauen: wir haben gerade ein neues Whitepaper veroeffentlicht."
3. Whisper transkribiert (bestehender Adapter).
4. Bedrock-LLM bekommt Original-Body + Transkript + System-Prompt mit klaren Regeln (minimale Modifikation, keine Fakten-Erfindung, kein Sprachwechsel).
5. KI liefert JSON `{newBody, summary}`.
6. Vorschau-Modal zeigt Diff (alter vs. neuer Body).
7. User akzeptiert → Body ersetzt, oder verwirft → keine Aenderung.

## Acceptance Criteria
- AC1: Inline-Edit-Diktat-Button ist sichtbar im Composing-Studio neben dem normalen Voice-Button.
- AC2: Aufnahme + Transkription verwendet bestehenden Whisper-Adapter (kein neuer Provider).
- AC3: KI-Prompt liefert valides JSON mit `newBody` und `summary`.
- AC4: Vorschau-Modal zeigt Diff vor Uebernahme.
- AC5: Akzeptieren ersetzt den Body, Verwerfen aendert nichts.
- AC6: KI darf keine erfundenen Fakten einfuegen — System-Prompt regelt das, Smoke-Test verifiziert es an min. 3 Beispielen.
- AC7: Bei Fehler/leerer Transkription erscheint klarer Hinweis statt stiller Anwendung.

## Out of Scope
- Inline-Edit ausserhalb des Composing-Studios (kein Edit im Mini-Sheet)
- Kontinuierliche Voice-Editierung ("Konversations-Modus")
- Undo-Stack mehrerer Inline-Edits hintereinander (1x Edit, 1x Akzeptieren — wie bisher)
- Mehrsprachige Befehle (V5.3: DE-Befehle)

## Dependencies
- FEAT-532 (Composing-Studio-UI)
- Bestehender Whisper-Adapter (V5.2 openai-default, Azure-Code-Ready)
- Bedrock-Client + neuer Prompt `cockpit/src/lib/ai/prompts/email-inline-edit.ts`
- DEC-052 (KI on-click)
