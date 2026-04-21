# FEAT-506 — E-Mail Open/Click-Tracking

## Summary
Sichtbarkeit ob gesendete E-Mails geoeffnet und Links geklickt wurden.

## Problem
Kein Feedback ob E-Mails gelesen werden. Blinde Follow-ups ohne Engagement-Daten.

## Solution
Tracking-Pixel (1x1 transparent) fuer Open-Detection, Link-Wrapping fuer Click-Detection. Events werden erfasst und auf E-Mail-/Kontakt-Ebene angezeigt.

## Acceptance Criteria
- AC1: Ausgehende E-Mails enthalten Tracking-Pixel
- AC2: Links werden automatisch gewrappt
- AC3: Open-Events korrekt erfasst und angezeigt
- AC4: Click-Events erfasst (welcher Link, wann)
- AC5: Tracking-Status sichtbar auf E-Mail-Detail und in Timeline

## Out of Scope
- Garantierte Zuverlaessigkeit (Pixel-Blocking ist akzeptiert)
- Detailliertes Engagement-Scoring
- A/B-Testing
