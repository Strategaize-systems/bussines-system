# SLC-714 — KI-Workspace im Drilldown-MeinTag komplett ausblenden

## Metadata
- **Slice ID:** SLC-714
- **Version:** V7.1 (Post-Master-Merge Hotfix vor REL-030-Deploy)
- **Feature:** FEAT-712 (Drilldown-Vollausbau)
- **Status:** done
- **Priority:** High (User-Smoke nach V7.1-Deploy hat broken-Mutate-Pfad entdeckt)
- **Created:** 2026-05-16
- **Resolved:** 2026-05-16
- **Estimated Effort:** <30 min (real: ~15 min)
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** nein (1-Datei-Code-Edit + 1-Test-Anpassung, kein Konflikt-Risk)
- **Backlog-Item:** BL-472

## Goal

User-Smoke nach Master-Merge SLC-713 hat aufgedeckt: Im Drilldown-`/team/[user_id]/mein-tag` rendert der `MeinTagKIWorkspace`-Wrapper weiter, scoped auf den Target-Member. SLC-712b-Spec sah das so vor — KI-Reports gegen Target-Daten ("Wie performt {Member-Name}?"). Aber alle Mutate-Pfade des KI-Workspace (Berichts-Buttons, Frage-Eingabe, Insight-Speichern) werfen Server-Errors, weil sie Server-Actions sind, die im Read-Only-Context schlagen wuerden (siehe ISSUE-066 AsyncLocalStorage-Gap — die Errors kommen aktuell aus anderen Pfaden wie fehlenden owner-Permissions, aber das Symptom ist gleich).

UX-Direktive User 2026-05-16: "Read-Only heisst kein KI-Bereich. Der User soll da auch nicht nachfragen koennen."

Loesung: KI-Workspace im Drilldown komplett ausblenden (analog zu Quick-Action-Buttons, die schon in SLC-712b hidden waren).

## Scope

**In Scope:**

- `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` (MOD) — Zeile 344 `<MeinTagKIWorkspace />` in `{!readOnly && (...)}` wrappen, analog zu allen anderen `!readOnly`-Gates (Z.153, Z.261, Z.351).
- `cockpit/src/app/(app)/mein-tag/mein-tag-client.test.tsx` (MOD) — Test-Case 4 "uebergibt viewAsUserId an KI-Workspace im Drilldown-Modus" invertiert zu "blendet KI-Workspace komplett aus im Drilldown". Test-Case 5 fuer Self-Mode bleibt unveraendert (Regression-frei).

**Out of Scope:**
- Pipeline-Drilldown KI-Workspace (Pipeline hat keinen eigenen KI-Workspace-Block — nicht relevant)
- Aufgaben-Drilldown (hat keinen KI-Workspace-Block — nicht relevant)
- Server-Side-Guard fuer KI-Workspace-Server-Actions (das ist ISSUE-066 V7.5-Mitigation, nicht Bestandteil dieses Polish-Hotfix)
- Anderes Targeting-Pattern (z.B. KI-Workspace mit Read-Only-Variante "Coaching-Bericht ueber Member" — kann V7.2+ wieder eingefuehrt werden mit eigenem readOnly-fester Backend-Pfad)

## Acceptance Criteria

- **AC1** `<MeinTagKIWorkspace />` wird NICHT gerendert, wenn `readOnly={true}` an MeinTagClient uebergeben wird.
- **AC2** `<MeinTagKIWorkspace />` wird unveraendert gerendert mit `userId={userId}`, wenn `readOnly={false}` (Default) ist — Self-Mein-Tag Regression-frei.
- **AC3** Vitest `mein-tag-client.test.tsx` Case 4: `queryByTestId("ki-workspace-stub")` returns `null` bei readOnly + viewAsUserId. 6/6 PASS.
- **AC4** Volle Vitest-Suite `npm run test` 779/779 PASS — keine Regression.
- **AC5** Live-Smoke nach Coolify-Redeploy: `/team/<member-uuid>/mein-tag` zeigt KEINEN KI-Workspace-Block. Self-`/mein-tag` zeigt ihn unveraendert.

## Micro-Tasks

### MT-1: Code-Fix + Test-Inversion

- **Goal:** 1-Block-Wrap mit `!readOnly &&` analog zu den 3 anderen Stellen in der Datei.
- **Files:**
  - `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` (Zeile 344, 1 JSX-Block wrap)
  - `cockpit/src/app/(app)/mein-tag/mein-tag-client.test.tsx` (Case 4 invertieren, Doku-Header anpassen)
- **Verification:**
  - `npx vitest run src/app/(app)/mein-tag/mein-tag-client.test.tsx` → 6/6 PASS
  - `npm run test` → 779/779 PASS
- **Dependencies:** none

## Verification Status

- **AC1:** PASS (Code-Inspect — Z.346-348 `{!readOnly && (<MeinTagKIWorkspace userId={kiWorkspaceUserId} />)}`)
- **AC2:** PASS (Default-readOnly = false → JSX rendert)
- **AC3:** PASS (6/6 Vitest auf mein-tag-client.test.tsx 2026-05-16 08:48)
- **AC4:** PASS (779/779 npm run test 2026-05-16 08:48)
- **AC5:** PENDING (User-Live-Smoke nach Coolify-Redeploy REL-030)

## Risks / Open

- Wenn V7.2+ doch eine Read-Only-Coaching-Variante des KI-Workspace im Drilldown gewuenscht wird (z.B. "Was lief gestern bei <Member>?"), muss diese eigenstaendig implementiert werden — der heutige Self-KI-Workspace ist nicht read-only-tauglich (Buttons triggern Server-Actions).
- Kein Auswirken auf SLC-712b AC5 (KI-Workspace-Block scoped) — das AC ist obsolet durch SLC-714.

## Cockpit-Records Updates

- `/slices/INDEX.md` — V7.1-Block: SLC-714 als neue Zeile `done`
- `/planning/backlog.json` — BL-472 `done`, version=V7.1
- `/docs/STATE.md` — Current Focus auf "V7.1.1 SLC-714 done — bereit fuer /deploy als REL-030"
- `/features/INDEX.md` — keine Aenderung, FEAT-712 bleibt `done`

## Recommended Next Step

Commit + Push auf `main` → `/deploy` V7.1 als REL-030 (User-Coolify-Redeploy von `main` mit SLC-714 enthalten).
