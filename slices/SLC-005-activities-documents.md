# SLC-005 — Aktivitäten + Dokumente

## Meta
- Feature: FEAT-001
- Priority: High
- Status: planned
- Dependencies: SLC-003

## Goal
Aktivitäten-Timeline auf Kontakt- und Firmen-Detailseiten. Dokument-Upload über Supabase Storage. Verknüpfung von Dokumenten mit Kontakten, Firmen, Deals.

## Scope
- Aktivitäten CRUD (Server Actions)
- Aktivitäten-Timeline-Komponente (chronologisch, auf Detail-Seiten)
- Aktivität-Erstellen (Typ: note, call, email, meeting, task)
- Dokument-Upload (Supabase Storage)
- Dokument-Liste pro Kontakt/Firma/Deal
- Dokument-Download

## Out of Scope
- Automatische Aktivitäten aus Pipeline-Änderungen (kommt über SLC-004/MT-1)
- E-Mail-Integration (V2)

### Micro-Tasks

#### MT-1: Server Actions für Aktivitäten
- Goal: CRUD für activities-Tabelle
- Files: `cockpit/app/(app)/contacts/[id]/activity-actions.ts`
- Expected behavior: createActivity, getActivities(contactId/companyId/dealId), Typen: note, call, email, meeting, task
- Verification: Aktivitäten erstellen und nach Kontakt/Firma filtern
- Dependencies: SLC-003

#### MT-2: Aktivitäten-Timeline-Komponente
- Goal: Wiederverwendbare Timeline die Aktivitäten chronologisch zeigt
- Files: `cockpit/components/activities/activity-timeline.tsx`, `cockpit/components/activities/activity-item.tsx`, `cockpit/components/activities/activity-form.tsx`
- Expected behavior: Timeline zeigt Aktivitäten mit Icon pro Typ, Datum, Beschreibung. Neue Aktivität inline hinzufügen.
- Verification: Timeline auf Kontakt-Detail sichtbar mit bestehenden Aktivitäten
- Dependencies: MT-1

#### MT-3: Timeline in Detail-Seiten einbauen
- Goal: Aktivitäten-Timeline auf Kontakt-, Firmen- und Deal-Detail-Seiten integrieren
- Files: `cockpit/app/(app)/contacts/[id]/page.tsx` (Update), `cockpit/app/(app)/companies/[id]/page.tsx` (Update)
- Expected behavior: Jede Detail-Seite zeigt zugehörige Aktivitäten
- Verification: Aktivität auf Kontakt → sichtbar auf Kontakt-Detail
- Dependencies: MT-2

#### MT-4: Dokument-Upload + Storage
- Goal: Datei-Upload über Supabase Storage, Metadaten in documents-Tabelle
- Files: `cockpit/app/(app)/contacts/[id]/document-actions.ts`, `cockpit/components/documents/document-upload.tsx`, `cockpit/components/documents/document-list.tsx`
- Expected behavior: Datei hochladen → in Supabase Storage gespeichert, Metadaten in DB. Download-Link funktioniert.
- Verification: Datei hochladen und wieder herunterladen
- Dependencies: SLC-002

#### MT-5: Dokumente in Detail-Seiten einbauen
- Goal: Dokument-Liste und Upload auf Kontakt-, Firmen- und Deal-Detail-Seiten
- Files: `cockpit/app/(app)/contacts/[id]/page.tsx` (Update), `cockpit/app/(app)/companies/[id]/page.tsx` (Update)
- Expected behavior: Tab/Section mit Dokument-Liste + Upload-Button auf jeder Detail-Seite
- Verification: Dokument zu Kontakt hochladen → in Dokument-Liste sichtbar
- Dependencies: MT-4
