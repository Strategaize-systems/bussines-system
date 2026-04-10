# SLC-317 — Tageseinschaetzung erweitert

## Slice Info
- Feature: FEAT-302
- Version: V3.1
- Priority: High
- Dependencies: SLC-313 (on-click Pattern)
- Type: Frontend + API

## Goal
Tageseinschaetzung in Mein Tag erweitern: Rueckblick auf den Vortag (was wurde erledigt, was nicht), ungesehene Ereignisse seit letztem Login, und proaktive Hinweise fuer den Tag.

## Scope

### Included
1. Rueckblick Vortag: Was wurde gestern erledigt (Tasks, Meetings, E-Mails)
2. Was wurde gestern NICHT erledigt (ueberfaellige Items von gestern)
3. Ungesehene Ereignisse: Neue Deals, Stage-Wechsel, neue Activities seit letztem Login
4. KI-Einschaetzung erweitert: Bezieht Vortags-Daten + Ereignisse ein
5. On-click laden (SLC-313 Pattern)

### Excluded
- Automatische Benachrichtigungen / Push
- Wochen-Rueckblick
- Team-Aktivitaeten (Single-User)

## Backlog Items
- BL-328: Tageseinschaetzung erweitern: Rueckblick + Ereignisse

## Acceptance Criteria
1. Mein Tag zeigt "Gestern" Sektion mit erledigten Items
2. Nicht-erledigte Items von gestern sind sichtbar markiert
3. "Seit letztem Login" zeigt neue/veraenderte Objekte
4. KI-Einschaetzung bezieht Vortags-Performance + Events ein
5. On-click laden (kein auto-load)
6. Wenn keine relevanten Daten: "Nichts Neues" statt leerer Bereich

## Micro-Tasks

### MT-1: Server Actions fuer Vortags-Daten
- Goal: Daten fuer Vortags-Rueckblick und ungesehene Events laden
- Files: `actions/mein-tag-actions.ts` (bestehend erweitern)
- Expected behavior: `getYesterdayReview()` → {completed: [], missed: []}. `getUnseenEvents(lastLoginAt)` → {newDeals: [], stageChanges: [], newActivities: []}
- Verification: Daten-Check mit Testdaten
- Dependencies: keine

### MT-2: Rueckblick-Panel UI
- Goal: "Gestern" Sektion in Mein Tag mit erledigten/verpassten Items
- Files: `components/mein-tag/yesterday-review.tsx` (neu)
- Expected behavior: Aufklappbar, zeigt erledigte Tasks/Meetings gruen, verpasste rot
- Verification: Browser-Check
- Dependencies: MT-1

### MT-3: Ungesehene-Events Panel
- Goal: "Seit letztem Login" Sektion mit neuen Objekten
- Files: `components/mein-tag/unseen-events.tsx` (neu)
- Expected behavior: Neue Deals, Stage-Wechsel als kompakte Liste mit Links
- Verification: Browser-Check
- Dependencies: MT-1

### MT-4: KI-Prompt erweitern
- Goal: Tages-Summary Prompt um Vortags-Daten und Events erweitern
- Files: `lib/ai/prompts/daily-summary.ts` (bestehend erweitern)
- Expected behavior: Prompt bekommt zusaetzlich: yesterdayCompleted, yesterdayMissed, unseenEvents
- Verification: KI-Summary enthaelt Vortags-Bezug
- Dependencies: MT-1

## Technical Notes
- "Letzter Login": Kann aus `profiles.last_login_at` kommen oder aus Session-Daten
- Falls `last_login_at` nicht existiert: Als Teil der Implementation ergaenzen
- Vortags-Queries: `WHERE DATE(completed_at) = CURRENT_DATE - 1`
- Ungesehene Events: Aus audit_log filtern (action, created_at > last_login_at)
- Performance: Queries sollten indexed sein (created_at, completed_at Indices pruefen)
