# SLC-403 — E-Mail-Inbox UI + Zuordnung

## Slice Info
- Feature: FEAT-405
- Priority: High
- Delivery Mode: internal-tool

## Goal
E-Mail-Inbox-Ansicht im System: IMAP-E-Mails anzeigen, lesen, Threads, Zuordnung zu Kontakten/Firmen/Deals. "Unzugeordnet"-Queue fuer nicht-gematchte E-Mails. E-Mails in Unified Timeline integrieren.

## Scope
- E-Mail-Inbox-Seite (/emails erweitern oder neue Route)
- E-Mail-Detail-Ansicht (Subject, Body, From, Attachments-Metadaten)
- Thread-Ansicht (gruppierte E-Mails)
- "Unzugeordnet"-Queue (E-Mails ohne contact_id)
- Manuelle Zuordnung (E-Mail → Kontakt/Firma/Deal zuweisen)
- E-Mails in Unified Timeline auf Kontakt-/Firmen-/Deal-Workspace
- Tab-basierte Navigation: Gesendet (bestehend) | Empfangen (V4 neu)

## Out of Scope
- E-Mail-Klassifikation (SLC-404)
- KI-Gatekeeper UI (SLC-404)

### Micro-Tasks

#### MT-1: Inbox Server Actions
- Goal: Server Actions fuer E-Mail-Liste, Detail, Thread, Zuordnung
- Files: `cockpit/src/app/(app)/emails/imap-actions.ts`
- Expected behavior: getInboxEmails (paginiert), getEmailDetail, getEmailThread, assignEmailToContact
- Verification: TypeScript Compilation, manuelle Tests
- Dependencies: none

#### MT-2: Inbox-Ansicht mit Tab-Navigation
- Goal: /emails Seite um "Empfangen"-Tab erweitern, IMAP-E-Mails als Liste
- Files: `cockpit/src/app/(app)/emails/page.tsx`, `cockpit/src/app/(app)/emails/inbox-list.tsx`
- Expected behavior: Tab "Empfangen" zeigt IMAP-E-Mails (neueste zuerst), Tab "Gesendet" bleibt bestehend
- Verification: Browser-Check
- Dependencies: MT-1

#### MT-3: E-Mail-Detail + Thread-Ansicht
- Goal: E-Mail-Detail mit Body, Header, Thread-Kontext
- Files: `cockpit/src/app/(app)/emails/email-detail.tsx`
- Expected behavior: Klick auf E-Mail zeigt Detail, Thread-Konversation untereinander
- Verification: Browser-Check mit realen IMAP-E-Mails
- Dependencies: MT-2

#### MT-4: Unzugeordnet-Queue + manuelle Zuordnung
- Goal: Filter fuer nicht-zugeordnete E-Mails, Button zum Zuordnen
- Files: `cockpit/src/app/(app)/emails/unassigned-queue.tsx`
- Expected behavior: Filterbar nach "Unzugeordnet", Kontakt/Firma/Deal per Dropdown zuweisen
- Verification: Browser-Check
- Dependencies: MT-2

#### MT-5: Unified Timeline Integration
- Goal: IMAP-E-Mails in bestehende Unified Timeline auf Kontakt/Firmen/Deal-Workspace einbinden
- Files: `cockpit/src/components/unified-timeline.tsx` (erweitert), `cockpit/src/app/(app)/contacts/[id]/actions.ts` (erweitert)
- Expected behavior: Timeline zeigt IMAP-E-Mails neben bestehenden Activities/Meetings/Proposals
- Verification: Browser-Check auf Kontakt-/Firmen-Detail
- Dependencies: MT-1

## Acceptance Criteria
1. Empfangene E-Mails sind in /emails als eigener Tab sichtbar
2. E-Mail-Detail zeigt Subject, Body, From, Attachment-Metadaten
3. Thread-Ansicht gruppiert zusammengehoerige E-Mails
4. "Unzugeordnet"-Queue zeigt E-Mails ohne Kontakt-Zuordnung
5. Manuelle Zuordnung (E-Mail → Kontakt/Firma/Deal) funktioniert
6. E-Mails erscheinen in Unified Timeline
