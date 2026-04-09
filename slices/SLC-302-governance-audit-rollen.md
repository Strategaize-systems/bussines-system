# SLC-302 — Governance (Audit + Rollen)

## Slice Info
- Feature: FEAT-307
- Version: V3
- Priority: High
- Dependencies: SLC-301 (Schema)
- Type: Backend + Frontend

## Goal
Audit-Logging-Utility und Rollen-Anzeige implementieren. Audit-Trail bei kritischen Mutations (Deal Stage/Status). Einfacher Audit-Log-Viewer fuer Admin.

## Scope

### Included
1. /lib/audit.ts — logAudit() Utility-Funktion
2. Audit-Logging in bestehende Server Actions einbauen:
   - Deal Stage-Wechsel (moveDealToStage)
   - Deal Status-Wechsel (won/lost)
   - Deal Create / Delete
3. Audit-Log Viewer Seite (/settings/audit oder /audit)
   - Tabelle: Zeitpunkt, Aktor, Aktion, Entitaet, Details
   - Filter nach entity_type, action
   - Admin-only (role check)
4. Rolle in Settings/Profil anzeigen

### Excluded
- MIG-006 (RLS-Umbau bestehende Tabellen)
- Audit fuer Meetings, Tasks, Proposals (kommt spaeter wenn diese Flows stabiler sind)
- Team-Management UI
- Fine-grained Permissions

## Backlog Items
- BL-312: Rollen-System operator/admin
- BL-313: Audit-Log Tabelle + Logging

## Acceptance Criteria
1. logAudit() Funktion existiert und ist in Server Actions eingebunden
2. Deal Stage-Wechsel erzeugt Audit-Eintrag mit before/after
3. Deal Status-Wechsel erzeugt Audit-Eintrag
4. Audit-Log Viewer zeigt Eintraege chronologisch
5. Audit-Log Viewer ist nur fuer Admin sichtbar
6. Profil zeigt aktuelle Rolle an

## Micro-Tasks

### MT-1: Audit-Utility erstellen
- Goal: /lib/audit.ts mit logAudit() Funktion
- Files: `lib/audit.ts`
- Expected behavior: Funktion nimmt supabase, action, entityType, entityId, changes, context und schreibt in audit_log
- Verification: Unit-Test oder manueller Insert-Test
- Dependencies: SLC-301

### MT-2: Audit in Deal-Server-Actions einbauen
- Goal: moveDealToStage, updateDealStatus, createDeal, deleteDeal mit Audit-Logging
- Files: Bestehende Deal Server Actions
- Expected behavior: Jede kritische Deal-Mutation erzeugt audit_log Eintrag
- Verification: Deal in Pipeline verschieben → Audit-Eintrag pruefen
- Dependencies: MT-1

### MT-3: Audit-Log Viewer
- Goal: Einfache Admin-Seite mit Audit-Log-Tabelle
- Files: Neue Page unter /settings/audit oder /audit
- Expected behavior: Chronologische Liste, Filter, Admin-only
- Verification: Browser-Check, Daten sichtbar
- Dependencies: MT-2

## Technical Notes
- Audit Insert ist asynchron — darf Deal-Mutation nicht blockieren (fire-and-forget oder await mit Error-Swallow)
- Admin-Check via profiles.role (Query aus Supabase Session)
- Audit-Viewer: Server-Side-Rendered, paginiert
