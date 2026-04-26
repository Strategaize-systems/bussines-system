# FEAT-533 — Systemvorlagen + KI-Vorlagen-Generator

## Summary
Mitgelieferter Pool an mindestens 6 B2B-Vertriebs-Systemvorlagen plus die Moeglichkeit, eigene Vorlagen via KI-Diktat (Voice oder Text) in unter 60 Sekunden zu generieren.

## Problem
Bestehende `email_templates` enthaelt nur eigene Vorlagen, der User muss alles manuell anlegen. Es fehlt sowohl ein Pool an Standard-B2B-Vertriebsvorlagen als auch eine schnelle Generierungs-Option.

## Solution
Schema-Erweiterung von `email_templates`: neue Felder `is_system BOOLEAN DEFAULT false`, `category TEXT`, `language TEXT DEFAULT 'de'`, `layout JSONB` (V5.3 ungenutzt, vorbereitet). SQL-Migration mit Seed-INSERT fuer 6+ Systemvorlagen (Erstansprache Multiplikator/Lead, Follow-up nach Erstgespraech, Follow-up Angebot, Danke nach Termin, Re-Aktivierung kalter Lead) plus 1-2 EN/NL. Systemvorlagen sind read-only, koennen aber ueber "Als Vorlage duplizieren" als eigene Kopie uebernommen werden.

KI-Vorlagen-Generator: neuer Prompt `cockpit/src/lib/ai/prompts/email-template-generate.ts` analog `email-improve.ts`. System-Prompt produziert JSON `{title, subject, body, suggestedCategory}`. Voice-Input geht ueber bestehenden Whisper-Adapter, Text-Input direkt.

## Acceptance Criteria
- AC1: Mindestens 6 Systemvorlagen sind nach Migration in der DB vorhanden.
- AC2: Systemvorlagen sind in der linken Spalte mit "System"-Badge sichtbar und nicht editier-/loeschbar.
- AC3: "Neue Vorlage" mit manueller Eingabe erstellt eine Vorlage mit `is_system=false`.
- AC4: "Neue Vorlage" mit KI-Diktat erzeugt Subject + Body via Bedrock und zeigt Editier-Vorschau.
- AC5: KI-generierte Vorlage kann vor Speichern editiert werden.
- AC6: "Als Vorlage duplizieren" auf einer Systemvorlage erstellt eine eigene editierbare Kopie.
- AC7: Filter "System" / "Eigene" / "Alle" funktioniert in der Vorlagen-Liste.

## Out of Scope
- Multi-Language-KI-Generierung in einem Schritt (V5.3: 1 Sprache pro Generierung)
- Block-basiertes Layout (`layout`-Feld bleibt in V5.3 ungenutzt, nur Schema vorbereitet)
- Vorlagen-Versionierung / History
- Vorlagen-Sharing zwischen Users (Multi-User-Topic V7)

## Dependencies
- FEAT-532 (Vorlagen-Liste-UI im Composing-Studio)
- Bestehender Bedrock-Client + Whisper-Adapter
- DEC-052 (KI on-click)
- /architecture muss SQL-Migration vs. TS-Seed-Funktion entscheiden — Empfehlung SQL-Migration via MIG-XXX
