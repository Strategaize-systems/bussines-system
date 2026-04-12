# FEAT-410 — KI-Kontextanalyse (Auto-Replies)

## Purpose
Intelligente Erkennung von Auto-Replies, Abwesenheitsnotizen und automatischen Antworten. Automatische Anpassung von Wiedervorlagen basierend auf erkanntem Abwesenheits-Zeitraum.

## Feature Type
Backend + Frontend

## Version
V4

## Dependencies
- FEAT-405 (IMAP Mail-Integration) — zwingend
- FEAT-407 (KI-Wiedervorlagen) — fuer automatische Anpassung

## Funktionen

### Auto-Reply-Erkennung
- Header-Analyse: `Auto-Submitted`, `X-Auto-Response-Suppress`, `Precedence: bulk/auto_reply`
- Content-Analyse: typische Muster ("Ich bin vom X bis Y nicht erreichbar", "Out of office", "Automatische Antwort")
- Klassifikation in `email_messages.is_auto_reply = true`
- Kategorien: Abwesenheit, Empfangsbestaetigung, Auto-Weiterleitung, Bounce

### Abwesenheits-Extraktion
- Datum-Extraktion aus Auto-Reply-Text: "vom 15.04. bis 22.04."
- Bedrock-Analyse fuer komplexe/unstrukturierte Abwesenheitsnotizen
- Fallback wenn kein Datum extrahierbar: Standard-Verzoegerung (7 Tage)

### Wiedervorlagen-Anpassung
- Wenn aktive Wiedervorlage fuer Kontakt existiert UND Auto-Reply erkannt:
  - Wiedervorlage automatisch auf nach Rueckkehr-Datum verschieben
  - Notification in Mein Tag: "Auto-Reply von Kontakt Y erkannt, Wiedervorlage verschoben auf Z"
- Anpassung ist rueckgaengig machbar ("trotzdem am urspruenglichen Datum")
- Anpassung wird in ai_action_queue als executed/auto logged

### UI
- Auto-Reply-Badge auf E-Mails in Timeline
- Abwesenheits-Info auf Kontakt-Detail (wenn aktiv)
- Notification bei Wiedervorlagen-Anpassung

## Nicht V4
- Auto-Reply-Vorhersage (wann kommt Kontakt zurueck basierend auf Historie)
- Automatische alternative Kontaktperson vorschlagen
- Cross-System Abwesenheits-Sync

## Akzeptanzkriterien
1. Auto-Replies werden zuverlaessig erkannt (Header + Content-Analyse)
2. Abwesenheits-Zeitraum wird extrahiert wenn moeglich
3. Bestehende Wiedervorlagen werden automatisch angepasst (mit Notification)
4. Anpassungen sind sichtbar und rueckgaengig machbar
5. Manuelle Override moeglich ("trotzdem am urspruenglichen Datum")
6. Auto-Reply-Badge ist auf E-Mails in Timeline sichtbar

## Risiken
- Datum-Extraktion aus Freitext → Bedrock-Analyse + Fallback-Default
- Falsche Auto-Reply-Erkennung → Header-basiert als primaere Methode (sehr zuverlaessig)
- Unerwartete Wiedervorlagen-Verschiebung → immer mit Notification + Undo
