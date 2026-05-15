# SLC-712b — Aufgaben + Mein-Tag Drilldown-Vollausbau

## Metadata
- **Slice ID:** SLC-712b
- **Version:** V7.1
- **Feature:** FEAT-712
- **Status:** planned
- **Priority:** Medium (User-Wunsch aus V7-Walkthrough — Drilldown-Konsistenz cross-Sub-Page)
- **Created:** 2026-05-15
- **Estimated Effort:** ~2-4h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** empfohlen
- **Architecture:** DEC-199, DEC-200 (etabliert in SLC-712a)
- **Reihenfolge-Pflicht:** **nach SLC-712a** (PipelineView-Pattern muss als Blueprint existieren). **vor SLC-713** (optional — SLC-713 kann parallel zu 712b laufen, kein Konflikt).

## Goal

SLC-712a hat `readOnly` + `viewAsUserId`-Pattern an PipelineView etabliert. SLC-712b zieht das gleiche Pattern auf:

1. **Aufgaben-Drilldown** (`/team/[user_id]/aufgaben`) — heute eine reduzierte Tabelle (siehe Code-Comment "Spec referenziert 'aktivitaeten' — Page ist /aufgaben"). Soll: gleiche Filter/Toggle-Funktionalitaet wie `/aufgaben` mit owner-Scope.
2. **Mein-Tag-Drilldown** (`/team/[user_id]/mein-tag`) — heute reduzierte Variante des KI-Workspace. Soll: voller `mein-tag-client.tsx`-Inhalt mit `readOnly + viewAsUserId` (KI-Workspace-Block scoped, Mutate-Buttons hidden).

Aufgaben + Mein-Tag in einem Slice gebuendelt, weil beide kleinere Patches sind als der PipelineView-Refactor in SLC-712a.

## Scope

**In Scope:**

Aufgaben-Drilldown:
- `cockpit/src/app/(app)/aufgaben/page.tsx` (lesen) — Self-Aufgaben-Page als Reuse-Referenz
- `cockpit/src/app/(app)/aufgaben/aufgaben-client.tsx` (oder analoge Datei — entdecken in MT-1) (MOD wenn existiert) — neue Props `readOnly?` + `viewAsUserId?` analog zu PipelineView-Pattern aus SLC-712a
- `cockpit/src/app/(app)/team/[user_id]/aufgaben/page.tsx` (REWRITE) — lädt Tasks mit owner-Scope, uebergibt sie an reused Aufgaben-Component

Mein-Tag-Drilldown:
- `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` (MOD) — neue Props `readOnly?` + `viewAsUserId?` — KI-Workspace-Block, Quick-Action-Buttons, Insight-Suggestion-Cards gegated bei readOnly
- `cockpit/src/app/(app)/mein-tag/page.tsx` (lesen) — Server-Loading-Pattern als Reuse-Referenz
- `cockpit/src/app/(app)/team/[user_id]/mein-tag/page.tsx` (REWRITE) — lädt mein-tag-Daten mit owner-Scope, uebergibt an reused MeinTagClient

Tests:
- `cockpit/src/app/(app)/aufgaben/aufgaben-client.test.tsx` (NEU/MOD) — readOnly-Verhalten
- `cockpit/src/app/(app)/mein-tag/mein-tag-client.test.tsx` (NEU/MOD) — readOnly + KI-Workspace-Scope-Verhalten

**Out of Scope:**
- Pipeline-Drilldown (SLC-712a)
- Termine-Drilldown (heute keine /termine-Drilldown-Page existent, nicht in V7.1-Scope)
- Performance-Optimierung der Drilldown-Queries

## Acceptance Criteria

- **AC1** Aufgaben-Component ohne readOnly-Prop unveraendert (Self-Aufgaben Regression-frei).
- **AC2** Aufgaben-Component mit `readOnly={true}`: alle Mutate-Actions (Task-Erstellen, Done-Toggle, Edit, Delete, Drag-Reorder) sind hidden oder no-op. Filter (Status, Datum, Typ) bleibt aktiv. Type-Ahead-Suche bleibt aktiv.
- **AC3** `/team/[user_id]/aufgaben` zeigt fuer Teamlead alle Aufgaben des Target-Members in voller Toggle-Funktionalitaet read-only.
- **AC4** MeinTagClient ohne readOnly-Prop unveraendert (Self-Mein-Tag Regression-frei).
- **AC5** MeinTagClient mit `readOnly={true} viewAsUserId="abc"`: KI-Workspace-Block scoped auf target_user_id ("Wie performt {Member-Name} diese Woche?" statt "Wie performe ich?"). Quick-Action-Buttons (Notiz, Termin, Aufgabe) sind hidden. Insight-Suggestion-Cards lesbar aber kein Accept/Discard-Button.
- **AC6** `/team/[user_id]/mein-tag` zeigt fuer Teamlead vollen MeinTagClient mit KI-Workspace-Block scoped + Quick-Actions hidden.
- **AC7** Vitest: mind. 2 Tests pro Component (readOnly + viewAsUserId-Behavior).
- **AC8** `npm run test:all` clean.
- **AC9** Live-Smoke (Teamlead-Sicht): /team/[user]/aufgaben + /team/[user]/mein-tag zeigen volle Sicht, alle Mutate-Buttons hidden.

## Micro-Tasks

### MT-1: Aufgaben-Component identifizieren + readOnly+viewAsUserId-Props einfuegen
- **Goal:** Discovery zuerst: Self-`/aufgaben/page.tsx` ist Server-Component. Hat sie eine Client-Component-Begleiter (analog mein-tag-client.tsx)? Wenn ja → Props an die Client-Component. Wenn nein → Refactor (Server-Component-Split in Server-Wrapper + Client-View), Pattern aus mein-tag.
- **Files:**
  - `cockpit/src/app/(app)/aufgaben/page.tsx` (lesen)
  - `cockpit/src/app/(app)/aufgaben/<found-client>.tsx` (MOD oder NEW falls Refactor noetig)
- **Expected behavior:**
  - Identische Filter/Suche-Funktionalitaet wie Self-Aufgaben, mit `readOnly`-Prop alle Mutate-Buttons hidden.
  - Wenn kein separater Client-Component-Begleiter existiert: Server-Component splitten in `<AufgabenView>` Client-Component mit `readOnly` + `viewAsUserId`-Props + `<AufgabenPage>` Server-Component die Daten lädt.
- **Verification:**
  - TSC clean
  - Self-Aufgaben rendert identisch zu vorher
- **Dependencies:** none

### MT-2: Aufgaben-Drilldown-Page auf Component-Reuse umschreiben
- **Goal:** `team/[user_id]/aufgaben/page.tsx` lädt Tasks mit owner-Scope + uebergibt an `<AufgabenView readOnly viewAsUserId={user_id} />`. Heutige reduzierte Tabelle entfernt.
- **Files:**
  - `cockpit/src/app/(app)/team/[user_id]/aufgaben/page.tsx` (REWRITE)
- **Expected behavior:**
  - Server-Component lädt: tasks-Liste fuer `WHERE owner_user_id = $1`, ggf. zusaetzliche Lookup-Daten (Deal-Refs, etc.)
  - Page rendert `<AufgabenView readOnly viewAsUserId={user_id} tasks={tasks} ... />`
- **Verification:**
  - TSC clean
  - Browser-Smoke: `/team/[real-user]/aufgaben` zeigt volle Aufgaben-Sicht
- **Dependencies:** MT-1

### MT-3: MeinTagClient readOnly + viewAsUserId + Drilldown-Page-Rewrite + Tests
- **Goal:** `mein-tag-client.tsx` bekommt Props analog zu PipelineView. KI-Workspace-Block scoped auf target_user_id, Mutate-Buttons hidden. Drilldown-Page umgeschrieben auf Reuse. Plus Vitest fuer beide Components.
- **Files:**
  - `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` (MOD) — neue Props
  - `cockpit/src/app/(app)/mein-tag/page.tsx` (lesen) — pruefen ob neue Props uebergeben werden muessen fuer Self-Self-Compat
  - `cockpit/src/app/(app)/team/[user_id]/mein-tag/page.tsx` (REWRITE) — Server-Component lädt mein-tag-Daten mit owner-Scope, uebergibt an MeinTagClient
  - `cockpit/src/lib/ki-workspace/...` (lesen, ggf. minimaler Patch) — KI-Workspace-Question-Generation muss `target_user_id`-Context kennen fuer "Wie performt {Member-Name}?" statt "Wie performe ich?". Pattern aus team-ki-workspace.tsx falls existent.
  - `cockpit/src/app/(app)/aufgaben/aufgaben-client.test.tsx` (NEU) — readOnly-Test
  - `cockpit/src/app/(app)/mein-tag/mein-tag-client.test.tsx` (NEU) — readOnly + viewAsUserId-Test
- **Expected behavior:**
  - Self-MeinTag rendert identisch (Default readOnly=false)
  - Drilldown-MeinTag: KI-Workspace-Block fragt "Wie performt {Name}..." (string-replace based on profile-Lookup), Quick-Action-Buttons hidden, Insight-Cards ohne Accept/Discard
  - Aufgaben-Vitest + MeinTag-Vitest gruen
- **Verification:**
  - TSC clean
  - `npm run test:all` 760+/760+ gruen
  - Browser-Smoke: `/team/[real-user]/mein-tag` zeigt vollen MeinTag mit scoped KI-Workspace
- **Dependencies:** MT-1 + MT-2 (Pattern etabliert) — kann pragmatisch auch parallel laufen wenn /backend disziplinert

## Risks & Mitigations

- **Risk R1:** Aufgaben-Page ist heute pure Server-Component ohne Client-Wrapper — wenn Aufgaben-Filter heute Server-Side via URL-Params funktioniert, ist Reuse einfacher. Wenn Filter Client-State-basiert ist, braucht es Client-Component-Split. **Mitigation:** MT-1 macht Discovery zuerst, MT-2 entscheidet basierend darauf.
- **Risk R2:** Mein-Tag-Client hat viele Mutate-Touches (Notiz-erstellen, Insight-Accept, KI-Workspace-Question-submit). Jeden zu gaten ist Aufwand. **Mitigation:** Top-Down: zuerst Quick-Action-Karten (Notiz/Termin/Aufgabe), dann Insight-Card-Buttons, dann KI-Workspace-Submit. Wenn KI-Workspace-Submit nicht gegated wird, ist das ok — die Frage-Antwort-UX produziert keine Mutation, nur LLM-Call. /backend entscheidet konkret.
- **Risk R3:** KI-Workspace-Question-Scope ("Wie performt {Name}" vs "Wie performe ich") braucht Member-Profil-Lookup. **Mitigation:** Drilldown-Page-Loading laedt profile.display_name fuer target_user_id mit, uebergibt als Prop an MeinTagClient. Falls KI-Workspace-Component die Question-Generation intern macht: `targetUserDisplayName`-Prop dazu, default = "ich".
- **Risk R4:** Test-Aufwand fuer 2 separate Components mit jeweils mehreren Mutate-Touches kann den Slice-Aufwand sprengen. **Mitigation:** Pro Component mindestens 2 Tests reichen (AC7). Tiefere Coverage in V7.2 falls Bedarf.

## Dependencies

- **SLC-711** done (User-Reihenfolge)
- **SLC-712a** done — Pattern aus PipelineView ist Blueprint
- Sonst keine technischen Dependencies

## Verification & Tests

- TSC clean
- `npm run test -- aufgaben-client` + `npm run test -- mein-tag-client` gruen
- `npm run test:all` clean
- Live-Smoke /team/[user]/aufgaben + /team/[user]/mein-tag (AC9)

## Open Points

- MT-1 Aufgaben-Client-Component-Existenz: muss in /backend MT-1 discovered werden
- MT-3 KI-Workspace-Scope-Pattern: muss in /backend MT-3 entschieden werden (Wrapper-Prop oder String-Replace im Question-Generator)

## Files Reviewed (Slice-Planning)

- `cockpit/src/app/(app)/team/[user_id]/aufgaben/page.tsx` (heutige Variante)
- `cockpit/src/app/(app)/team/[user_id]/mein-tag/page.tsx` (heutige Variante — implizit aus SLC-706)
- `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` (Self-Reference, exists)
- `cockpit/src/app/(app)/aufgaben/page.tsx` (Self-Reference, exists)

## Recommended Implementation Skill

`/backend` fuer MT-1 + MT-2 + MT-3 (Component-Patches + Page-Rewrites + Tests).
`/qa` fuer Live-Smoke (AC9). Nach SLC-712b PASS: SLC-713 starten (oder parallel laufen lassen).
