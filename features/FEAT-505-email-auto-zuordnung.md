# FEAT-505 — E-Mail Auto-Zuordnung

## Summary
Eingehende E-Mails aus dem IMAP-Sync werden automatisch dem passenden Kontakt zugeordnet.

## Problem
Eingehende E-Mails im Postfach sind nicht mit Kontakten verknuepft. Der User muss manuell zuordnen, was bei Volumen unpraktisch ist.

## Solution
3-Stufen-Zuordnung: Exakter Adress-Match (automatisch), KI-Match via Bedrock (Vorschlag mit Confidence), Nicht-zugeordnet-Queue (manuell).

## Acceptance Criteria
- AC1: E-Mail mit bekannter Absender-Adresse wird automatisch zugeordnet
- AC2: E-Mail ohne Adress-Match → KI-Vorschlag mit Confidence
- AC3: Nicht zuordenbare E-Mails in Queue sichtbar
- AC4: Manuelle Zuordnung/Korrektur moeglich
- AC5: Zuordnung sichtbar auf Kontakt-Workspace

## Out of Scope
- Automatische Kontakt-Erstellung aus unbekannten E-Mails
- Thread-basierte Zuordnung (nur Absender-basiert)
