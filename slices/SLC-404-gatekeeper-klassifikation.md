# SLC-404 — Gatekeeper-Klassifikation

## Slice Info
- Feature: FEAT-408
- Priority: High
- Delivery Mode: internal-tool

## Goal
Zwei-Pass E-Mail-Klassifikation (Regelbasiert + Bedrock), ai_action_queue Service, Gatekeeper-Summary in Mein Tag, priorisierte E-Mail-Liste.

## Scope
- /lib/ai/classifiers/ (rule-based.ts, llm-based.ts)
- /lib/ai/action-queue.ts (CRUD fuer ai_action_queue)
- /api/cron/classify Route
- Gatekeeper-Prompt fuer Bedrock
- Mein Tag: Gatekeeper-Summary-Karte
- E-Mail-Liste: Prioritaets- und Klassifikations-Badges
- Manuelle Umklassifizierung (Feedback-Loop)

## Out of Scope
- KI-Wiedervorlagen (SLC-405)
- Auto-Reply spezifische Logik (SLC-406)

### Micro-Tasks

#### MT-1: Regelbasierte Klassifikation
- Goal: Header-basierte + Absender-basierte Klassifikation ohne LLM
- Files: `cockpit/src/lib/ai/classifiers/rule-based.ts`
- Expected behavior: Auto-Reply (Header), Newsletter (List-Unsubscribe), bekannter Kontakt (contacts.email), Subject-Patterns
- Verification: Unit-Test mit verschiedenen Header-Konstellationen
- Dependencies: none

#### MT-2: Bedrock-Klassifikation
- Goal: LLM-basierte Klassifikation fuer nicht-offensichtliche E-Mails mit CRM-Kontext
- Files: `cockpit/src/lib/ai/classifiers/llm-based.ts`, `cockpit/src/lib/ai/prompts/email-classify.ts`
- Expected behavior: Prompt mit E-Mail-Content + Kontakt/Deal-Kontext → strukturierte Klassifikation + Aktions-Vorschlaege
- Verification: Test mit Bedrock API, Output-Schema validieren
- Dependencies: MT-1

#### MT-3: ai_action_queue Service
- Goal: CRUD-Layer fuer ai_action_queue (erstellen, listen, freigeben, ablehnen)
- Files: `cockpit/src/lib/ai/action-queue.ts`
- Expected behavior: createAction, getpendingActions, approveAction, rejectAction, executeAction
- Verification: TypeScript Compilation, manuelle DB-Tests
- Dependencies: none

#### MT-4: Classify Cron-Route
- Goal: /api/cron/classify Endpoint (Batch-Klassifikation unklassifizierter E-Mails)
- Files: `cockpit/src/app/api/cron/classify/route.ts`
- Expected behavior: Laedt max 20 unklassifizierte E-Mails, Pass 1 (Regel), Pass 2 (Bedrock wenn noetig), aktualisiert email_messages
- Verification: curl POST, E-Mails werden klassifiziert
- Dependencies: MT-1, MT-2, MT-3

#### MT-5: Gatekeeper-Summary in Mein Tag
- Goal: Karte in Mein Tag die E-Mail-Klassifikations-Summary zeigt
- Files: `cockpit/src/app/(app)/mein-tag/gatekeeper-summary.tsx`, `cockpit/src/app/(app)/mein-tag/actions.ts` (erweitert)
- Expected behavior: "X dringende, Y normale, Z irrelevante E-Mails" mit Link zur gefilterten Liste
- Verification: Browser-Check auf Mein Tag
- Dependencies: MT-4

#### MT-6: E-Mail-UI Klassifikations-Badges + manuelle Korrektur
- Goal: Prioritaets- und Klassifikations-Badges auf E-Mail-Liste, manuelles Umklassifizieren
- Files: `cockpit/src/app/(app)/emails/inbox-list.tsx` (erweitert), `cockpit/src/app/(app)/emails/imap-actions.ts` (erweitert)
- Expected behavior: Badges zeigen Prioritaet/Kategorie, Dropdown zum Korrigieren
- Verification: Browser-Check
- Dependencies: MT-4

## Acceptance Criteria
1. Regelbasierte Klassifikation erkennt Auto-Replies, Newsletter, bekannte Absender
2. Bedrock-Analyse laeuft on-click oder batch
3. Mein Tag zeigt Gatekeeper-Summary
4. Aktions-Vorschlaege erscheinen in ai_action_queue
5. E-Mails koennen manuell umklassifiziert werden
6. Cron-Endpoint ist geschuetzt
