# SLC-503 — E-Mail Auto-Zuordnung

## Slice Info
- Feature: FEAT-505
- Priority: High
- Status: planned

## Goal
Eingehende E-Mails automatisch dem passenden Kontakt zuordnen. 3-Stufen-System: exakter Adress-Match (IMAP-Sync-Erweiterung), KI-Match via Bedrock (Classify-Cron-Erweiterung), manuelle Queue-UI.

## Scope
- IMAP-Sync-Erweiterung: assignment_source setzen bei Kontakt-Match (Stufe 1)
- Classify-Cron-Erweiterung: KI-Match fuer nicht-zugeordnete relevante E-Mails (Stufe 2)
- Bedrock-Prompt fuer Kontakt-Matching
- Unassigned-Queue UI: Tabelle nicht-zugeordneter E-Mails mit manueller Zuordnung (Stufe 3)
- Kontakt-Workspace: zugeordnete E-Mails anzeigen

## Out of Scope
- Automatische Kontakt-Erstellung aus unbekannten E-Mails
- Thread-basierte Zuordnung (nur Absender-basiert)

## Acceptance Criteria
- AC1: IMAP-Sync setzt assignment_source='exact_match' bei Adress-Match
- AC2: IMAP-Sync setzt assignment_source='domain_match' bei Domain-Match
- AC3: Classify-Cron versucht KI-Match fuer E-Mails ohne Kontakt (classification anfrage/antwort)
- AC4: KI-Match mit confidence >= 0.7 ordnet automatisch zu (assignment_source='ki_match')
- AC5: KI-Match mit confidence 0.3-0.69 erzeugt Vorschlag in ai_action_queue
- AC6: Unassigned-Queue zeigt nicht-zugeordnete E-Mails (exkl. spam/newsletter/auto_reply)
- AC7: Manuelle Zuordnung setzt assignment_source='manual' und aktualisiert contact_id

## Dependencies
- SLC-501 (Schema: email_messages.assignment_source, ai_match_confidence)

## QA Focus
- IMAP-Sync mit bekanntem Kontakt → assignment_source korrekt?
- E-Mail ohne Kontakt → KI-Match wird versucht?
- Unassigned-Queue → E-Mails sichtbar, Zuordnung funktioniert?
- Bestehender IMAP-Sync-Flow darf nicht brechen

### Micro-Tasks

#### MT-1: IMAP-Sync assignment_source Erweiterung
- Goal: Bei Kontakt-Match im IMAP-Sync assignment_source setzen
- Files: `cockpit/src/app/api/cron/imap-sync/route.ts`
- Expected behavior: exact_match bei E-Mail-Adress-Match, domain_match bei Domain-Match, NULL bei kein Match
- Verification: IMAP-Sync-Cron ausfuehren, DB pruefen
- Dependencies: none

#### MT-2: KI-Match im Classify-Cron
- Goal: Bedrock-basierter Kontakt-Match fuer unzugeordnete relevante E-Mails
- Files: `cockpit/src/app/api/cron/classify/route.ts`, `cockpit/src/lib/ai/prompts/contact-match.ts`
- Expected behavior: E-Mails ohne contact_id + classification anfrage/antwort → Bedrock-Match → auto-assign oder ai_action_queue
- Verification: Classify-Cron mit Test-E-Mail ohne Kontakt ausfuehren, Ergebnis pruefen
- Dependencies: MT-1

#### MT-3: Unassigned-Queue UI
- Goal: Seite mit nicht-zugeordneten E-Mails und manueller Zuordnung
- Files: `cockpit/src/app/(app)/emails/unassigned/page.tsx`, `cockpit/src/app/(app)/emails/unassigned/actions.ts`
- Expected behavior: Tabelle mit From/Subject/Preview, KI-Vorschlag wenn vorhanden, Kontakt-Zuordnung per Dropdown
- Verification: Seite aufrufen, E-Mails sichtbar, Zuordnung funktioniert
- Dependencies: MT-1

#### MT-4: Kontakt-Workspace E-Mail-Integration
- Goal: Zugeordnete E-Mails auf Kontakt-Workspace anzeigen
- Files: `cockpit/src/app/(app)/contacts/[id]/page.tsx` (oder zustaendige Workspace-Komponente)
- Expected behavior: E-Mail-Sektion zeigt alle email_messages WHERE contact_id = kontakt.id
- Verification: Kontakt-Workspace mit zugeordneten E-Mails pruefen
- Dependencies: MT-1
