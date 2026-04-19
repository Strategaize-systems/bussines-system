# SLC-431 — Schema-Migration + Type-Erweiterung

## Slice Info
- **Feature:** FEAT-402, FEAT-412
- **Version:** V4.3
- **Priority:** Blocker
- **Estimated Effort:** 0.5-1 Tag
- **Dependencies:** Keine (Basis-Slice)

## Goal

ai_action_queue um 4 Spalten erweitern (target_entity_type, target_entity_id, proposed_changes, confidence), meetings + email_messages um signal_status erweitern. TypeScript-Types aktualisieren. MIG-016 auf Hetzner anwenden.

## Scope

- SQL-Migration erstellen und auf Hetzner ausfuehren
- TypeScript-Types in `/types/ai-queue.ts` erweitern
- action-queue.ts Service fuer neue Spalten vorbereiten
- ENV-Variablen fuer Signal-Konfiguration dokumentieren

## Out of Scope

- Signal-Extraktion-Logik (SLC-432)
- UI-Aenderungen (SLC-435, SLC-436)
- Cron-Hooks (SLC-433)

## Acceptance Criteria

1. Migration laeuft fehlerfrei auf Hetzner
2. ai_action_queue hat 4 neue nullable Spalten
3. meetings hat signal_status Spalte
4. email_messages hat signal_status Spalte
5. TypeScript AIActionType Union enthaelt neue Werte
6. Build gruen, keine Type-Fehler
7. Bestehende Queue-Funktionalitaet unveraendert

## Micro-Tasks

### MT-1: SQL-Migration erstellen
- Goal: MIG-016 SQL-Datei mit allen Schema-Aenderungen
- Files: `sql/16_v43_insight_governance.sql`
- Expected behavior: ALTER TABLE fuer ai_action_queue (+4), meetings (+1), email_messages (+1), Indizes
- Verification: SQL-Syntax-Review, alle Spalten nullable
- Dependencies: none

### MT-2: Migration auf Hetzner ausfuehren
- Goal: Schema-Aenderungen live anwenden
- Files: —
- Expected behavior: Alle neuen Spalten und Indizes existieren in Prod-DB
- Verification: `\d ai_action_queue`, `\d meetings`, `\d email_messages` zeigen neue Spalten
- Dependencies: MT-1

### MT-3: TypeScript-Types erweitern
- Goal: AIActionType, AIActionSource und proposed_changes-Types aktualisieren
- Files: `cockpit/src/types/ai-queue.ts`
- Expected behavior: Neue Type-Werte (property_change, status_change, tag_change, value_change, signal_meeting, signal_email, signal_manual), ProposedChange-Interface
- Verification: `npx tsc --noEmit`
- Dependencies: none

### MT-4: action-queue.ts Service erweitern
- Goal: Bestehende Queue-Funktionen fuer neue Spalten vorbereiten
- Files: `cockpit/src/lib/ai/action-queue.ts`
- Expected behavior: createQueueItem akzeptiert optionale neue Felder, getQueueItems liefert neue Spalten mit
- Verification: `npx tsc --noEmit`, bestehende Funktionalitaet unveraendert
- Dependencies: MT-3

### MT-5: ENV-Variablen + MIGRATIONS.md
- Goal: Neue ENV-Vars dokumentieren, MIG-016 in MIGRATIONS.md eintragen
- Files: `docs/MIGRATIONS.md`, `.env.example` (falls vorhanden)
- Expected behavior: AI_SIGNAL_MIN_CONFIDENCE + AI_SIGNAL_EXPIRE_DAYS dokumentiert
- Verification: Datei-Review
- Dependencies: MT-2

## QA Focus

- Bestehende KI-Wiedervorlagen (Mein Tag) funktionieren weiterhin
- Bestehende Gatekeeper-Actions funktionieren weiterhin
- Keine Breaking Changes an der Queue-API
