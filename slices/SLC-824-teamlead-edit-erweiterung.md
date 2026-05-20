# SLC-824 — Teamlead-Edit-Erweiterung: Invite-Restriction + Member-Delete-Allow (FEAT-811 / BL-485)

## Metadata
- **Slice ID:** SLC-824
- **Version:** V8.1
- **Feature:** FEAT-811 Sub-Slice 4
- **Backlog:** BL-485
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-20
- **Estimated Effort:** ~2-2.5h Code + ~30 Min /qa + Live-Smoke = ~3-3.5h Gesamt-Session
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** EMPFOHLEN — Server-Action-Refactor + UI-Aenderungen + 6-8 neue Vitest-Cases, Rollback-Bedarf wenn Test-Permission-Matrix bricht
- **Pattern-Reuse:** Server-Action-Permission-Guard-Pattern aus V7 `lib/team/actions.ts` (`assertRole` + zusaetzliche Guards). `countOwnerRecords`-Hard-Lock aus V7-DEC-193 unveraendert.
- **Reihenfolge-Empfehlung:** SLC-824 VIERTER (letzter) in V8.1. Groesster Block, baut auf SLC-823-Tile-Sichtbarkeit auf.

## Why

Nach Diskrepanz-Klaerung Discovery vs V7-Code 2026-05-20: User-Direktive ist neue Permission-Matrix fuer Teamlead. V7-Design erlaubt Teamlead zu viel (Teamlead-Invite) und zu wenig (kein Loeschen). V8.1-Wunsch: Teamlead baut operatives Team auf — Mitglieder einladen (nur als 'member') und loeschen (mit Pflicht-Reassign-Vorbedingung).

DEC-230 (supersedes DEC-193 + DEC-194):
- `inviteMember`: Teamlead-Caller darf nur `role='member'` einladen (heute: member + teamlead)
- `deleteProfile`: Teamlead-Caller darf eigene Team-Member loeschen mit Guards (target=member, eigenes Team, nicht-self, open_records=0)
- V7-Hard-Lock-Mechanik (`countOwnerRecords`) bleibt unveraendert — Daten gehen niemals verloren
- Rolle-Wechsel bleibt admin-only

## Scope

**In Scope:**

### Server-Side: lib/team/actions.ts

#### `inviteMember` — Guard ergaenzen
- Nach existierender `assertRole(["admin", "teamlead"])`-Pruefung:
- Wenn `caller.role === "teamlead"` AND `payload.role !== "member"` → reject mit `INVALID_ROLE_FOR_TEAMLEAD_INVITER`
- Admin-Pfad unveraendert
- Team-Constraint (Teamlead nur eigenes Team) bleibt wie V7

#### `deleteProfile` — Permission erweitern + Guards
- `assertRole(["admin"])` → `assertRole(["admin", "teamlead"])`
- Bei `caller.role === "teamlead"` zusaetzliche Guards:
  - `target.team_id !== caller.team_id` → throw `FORBIDDEN_OTHER_TEAM`
  - `target.role !== "member"` → throw `FORBIDDEN_NON_MEMBER`
  - `target.user_id === caller.user_id` → throw `FORBIDDEN_SELF`
- `countOwnerRecords`-Hard-Lock UNVERAENDERT (V7-DEC-193-Pattern)
- audit_log-Insert erweitert: `context.caller_role` = caller.role (Defense-in-Depth)

### UI: settings/team/team-members-table.tsx

- Neue Prop `callerIsTeamlead: boolean` ergaenzen
- Delete-Button-Sichtbarkeit Z.204: `{callerIsAdmin && !isSelf && ...}` → `{(callerIsAdmin || (callerIsTeamlead && target.role === "member")) && !isSelf && ...}`
- Role-Select Z.159 BLEIBT admin-only (`callerIsAdmin && !isSelf`)
- `page.tsx` Z.173 erweitern um `callerIsTeamlead={callerProfile.role === "teamlead"}`

### UI: settings/team/invite-dialog.tsx

- Rollen-Dropdown Z.141-152:
  - SelectItem `'member'` immer sichtbar (alle Rollen)
  - SelectItem `'teamlead'` Z.150 → hinter `isAdmin`-Gate stellen (heute kein Gate)
  - SelectItem `'admin'` Z.151 bleibt hinter `isAdmin`-Gate (unveraendert)
- Effekt: Teamlead-Caller sieht nur 'Member'-Option, Admin sieht alle 3

### Vitest: lib/team/actions.test.ts

- 6-8 neue Cases:
  1. inviteMember Teamlead-Caller mit role='member' → PASS
  2. inviteMember Teamlead-Caller mit role='teamlead' → REJECT `INVALID_ROLE_FOR_TEAMLEAD_INVITER`
  3. inviteMember Teamlead-Caller mit role='admin' → REJECT (bestehender V7-Guard)
  4. deleteProfile Teamlead-Caller, target=member eigenes Team, open_records=0 → PASS
  5. deleteProfile Teamlead-Caller, target=teamlead eigenes Team → REJECT `FORBIDDEN_NON_MEMBER`
  6. deleteProfile Teamlead-Caller, target=member fremdes Team → REJECT `FORBIDDEN_OTHER_TEAM`
  7. deleteProfile Teamlead-Caller, target=self → REJECT `FORBIDDEN_SELF`
  8. deleteProfile Teamlead-Caller, target=member open_records>0 → REJECT `OPEN_RECORDS_BLOCK_DELETE` (Hard-Lock-Pre-Check unveraendert)
  9. audit_log-Insert nach Delete → context.caller_role='teamlead' persisted

**Out of Scope:**
- Combined-Modal `DeleteMemberWithReassign` — verworfen 2026-05-20 (V7-Hard-Lock-Reuse genuegt)
- Soft-Delete (is_active-Spalte) — verworfen, Schema-Migration noetig
- Rolle-Toggle Member ↔ Teamlead durch Teamlead — verworfen 2026-05-20, V8.x+ optional
- Visual-Refactor `/settings/team`-Page — nur Permission-Layer und Buttons
- Bulk-Reassign-Dialog-Permission-Aenderung — V7-Verhalten bleibt (Teamlead darf weiter Bulk-Reassign)

## Acceptance Criteria

- **AC1** — `inviteMember` Teamlead-Caller mit `role='member'` → PASS, Profile wird angelegt
- **AC2** — `inviteMember` Teamlead-Caller mit `role='teamlead'` → REJECT mit Error-Code `INVALID_ROLE_FOR_TEAMLEAD_INVITER`
- **AC3** — `deleteProfile` Teamlead-Caller, target ist Member im eigenen Team, open_records=0 → PASS
- **AC4** — `deleteProfile` Teamlead-Caller, target.role='teamlead' → REJECT `FORBIDDEN_NON_MEMBER`
- **AC5** — `deleteProfile` Teamlead-Caller, target.team_id != caller.team_id → REJECT `FORBIDDEN_OTHER_TEAM`
- **AC6** — `deleteProfile` Teamlead-Caller, target.user_id === caller.user_id → REJECT `FORBIDDEN_SELF`
- **AC7** — `deleteProfile` Teamlead-Caller, target hat open_records > 0 → REJECT mit Re-Assign-Pflicht-Error (V7-Hard-Lock unveraendert)
- **AC8** — audit_log nach Delete enthaelt `context.caller_role` ('teamlead' oder 'admin')
- **AC9** — UI: Teamlead sieht Delete-Button auf Member-Zeilen (nicht auf Teamlead-Zeilen, nicht auf Self)
- **AC10** — UI: Teamlead-Invite-Dialog zeigt nur "Member"-Option im Rollen-Dropdown
- **AC11** — Admin-Pfade unveraendert: Admin kann weiterhin Member+Teamlead+Admin einladen (mit team_id-Wahl), kann jeden loeschen (mit Hard-Lock)
- **AC12** — `npm run build`, `npm run lint`, `npm run test` clean
- **AC13** — Live-Smoke: 4 Browser-Pfade getestet (Teamlead-Invite-Member, Teamlead-Delete-Member-mit-Reassign, Teamlead-Invite-Teamlead-blocked, Admin-Path-Regression)

## Micro-Tasks

### MT-1: Server-Action inviteMember erweitern
- **Goal:** Teamlead-Caller-Role-Restriction
- **Files:** `cockpit/src/lib/team/actions.ts` (modify)
- **Expected behavior:** Nach bestehender `assertRole(["admin", "teamlead"])`: wenn `caller.role === "teamlead"` AND `payload.role !== "member"` → throw new Error("INVALID_ROLE_FOR_TEAMLEAD_INVITER"). Bestehende Team-Constraint und audit_log-Logik unveraendert.
- **Verification:** TypeScript-Compile clean, MT-5 Vitest deckt das ab
- **Dependencies:** keine

### MT-2: Server-Action deleteProfile erweitern
- **Goal:** Teamlead-Permission-Layer + 3 Guards + audit_log.context
- **Files:** `cockpit/src/lib/team/actions.ts` (modify)
- **Expected behavior:**
  - `assertRole(["admin"])` → `assertRole(["admin", "teamlead"])`
  - Nach getProfile auf target: 3 Guards fuer Teamlead-Caller (target_team, target_role, self)
  - Hard-Lock `countOwnerRecords`-Aufruf UNVERAENDERT
  - audit_log-Insert: zusaetzliches `context.caller_role` Feld
- **Verification:** TypeScript-Compile clean, MT-5 Vitest deckt das ab
- **Dependencies:** keine

### MT-3: UI team-members-table.tsx Delete-Button
- **Goal:** Delete-Button-Sichtbarkeit fuer Teamlead bei Member-Zeilen
- **Files:** `cockpit/src/app/(app)/settings/team/team-members-table.tsx` (modify), `cockpit/src/app/(app)/settings/team/page.tsx` (modify, prop ergaenzen)
- **Expected behavior:**
  - page.tsx Z.173: `callerIsTeamlead={callerProfile.role === "teamlead"}` ergaenzen
  - team-members-table.tsx Props-Interface erweitern um `callerIsTeamlead: boolean`
  - Z.204: `{(callerIsAdmin || (callerIsTeamlead && target.role === "member")) && !isSelf && <DeleteButton>}`
  - Role-Select Z.159 unveraendert (`callerIsAdmin && !isSelf`)
- **Verification:** Build clean, visueller Browser-Check in Live-Smoke
- **Dependencies:** MT-2 (Server-Action muss bereits Teamlead akzeptieren)

### MT-4: UI invite-dialog.tsx Rollen-Dropdown
- **Goal:** Teamlead sieht nur "Member"-Option
- **Files:** `cockpit/src/app/(app)/settings/team/invite-dialog.tsx` (modify)
- **Expected behavior:** SelectItem `value='teamlead'` Z.150 hinter `isAdmin`-Gate stellen (heute kein Gate). Effekt: nur Admin sieht "Teamlead"-Option, Teamlead sieht nur "Member".
- **Verification:** Build clean, visueller Browser-Check in Live-Smoke
- **Dependencies:** MT-1 (Server-Action muss Teamlead-Invite mit 'teamlead'-Role ablehnen)

### MT-5: Vitest fuer lib/team/actions.ts
- **Goal:** 9 neue Permission-Matrix-Cases
- **Files:** `cockpit/src/lib/team/actions.test.ts` (modify oder neu)
- **Expected behavior:** 9 Tests fuer Permission-Matrix (siehe Vitest-Liste oben). Tests laufen gegen Coolify-DB (per `coolify-test-setup.md`) — RLS+Server-Action-Pfad realistisch.
- **Verification:** `npm run test -- actions.test.ts` → 9/9 neue PASS, bestehende Tests bleiben PASS
- **Dependencies:** MT-1 + MT-2

### MT-6: Build/Lint/Test + Live-Smoke
- **Goal:** Gesamt-Validierung + Live-Smoke ueber Playwright-MCP
- **Expected behavior:**
  - `npm run build` clean
  - `npm run lint` keine neuen Findings
  - `npm run test` alle PASS
  - Live-Smoke (qa-teamlead Login): Invite Member → PASS, Invite Teamlead → blockiert in Dropdown UND Server-Reject im Direct-Test, Delete Member (nach Bulk-Reassign) → PASS, Delete Member (mit open_records) → Hard-Lock-Error
  - Live-Smoke (qa-admin Login): Regression-Test — Invite alle 3 Rollen + Delete eigene Records bleibt unveraendert
- **Verification:** 3 Commands + 4 Live-Smoke-Pfade alle PASS
- **Dependencies:** MT-3 + MT-4 + MT-5

### MT-7: Records-Sync nach Slice-Ende
- **Goal:** Cockpit-Records aktualisieren
- **Files:** `slices/INDEX.md`, `features/INDEX.md` (FEAT-811 ggf. done falls alle 4 SLC done), `planning/backlog.json` (BL-485 done), `docs/STATE.md`
- **Expected behavior:** Standard-Records-Sync nach Slice-Completion
- **Verification:** Git diff zeigt alle erwarteten Aenderungen
- **Dependencies:** MT-6 PASS

## Open Points

- **Test-Setup-Choice:** Coolify-DB-Test fuer 9 Permission-Cases vs Mock-basiert. Realistischer: Coolify-DB (RLS-Pfad echt). Aufwand: ~30 Min Setup. **Entscheidung in MT-5 Start**, Default Coolify-DB.
- **Error-Code-Naming-Convention:** `INVALID_ROLE_FOR_TEAMLEAD_INVITER` ist lang. Alternativen: `TEAMLEAD_INVITE_ROLE_LIMIT`, `INVITE_ROLE_FORBIDDEN`. **Entscheidung in MT-1**, Default lang-aber-klar.
- **Audit-Log-Backward-Compat:** Bestehende audit_log-Entries ohne `caller_role` werden nicht ruckwirkend gefuellt. UI/Reporting muss `caller_role` als optional behandeln. Nicht-blocker.

## Risks

- **Risk:** UI-Aenderung in team-members-table.tsx oder invite-dialog.tsx koennte V7-Tests brechen. Mitigation: bestehende Tests vor MT-Start identifizieren + ggf. updaten in MT-3/MT-4.
- **Risk:** Permission-Guard-Order falsch → Teamlead kann doch Admin loeschen oder Cross-Team loeschen. Mitigation: 3 negative Test-Cases (AC4-AC6) explizit + Code-Review-Empfehlung.
- **Risk:** Hard-Lock-Pre-Check funktioniert anders als V7-DEC-193 spezifiziert (z.B. zaehlt nicht 8 Kerntabellen). Mitigation: MT-2 macht keine Aenderung an `countOwnerRecords`, nur Caller-Permission. Wenn Hard-Lock-Bug existiert, ist es V7-Bug, nicht V8.1-Regression.
- **Risk:** Server-Action-Refactor bricht V7-Tests fuer Admin-Pfad. Mitigation: AC11 + MT-5 enthaelt Admin-Path-Regression-Tests.
- **Risk:** Audit-Log `context.caller_role`-Insert koennte JSONB-Konflikt mit bestehenden context-Feldern verursachen. Mitigation: nur Merge, kein Overwrite. JSONB-Field ist Set-Operation.

## Dependencies

- Empfohlen NACH SLC-823 (Tile-Sichtbarkeit) — sonst sieht Teamlead die Tile nicht und kann V8.1-UX nicht realisieren
- Nutzt V7 `assertRole`, `getProfile`, `countOwnerRecords`-Pattern (alle existieren)
- Nutzt audit_log.context (JSONB, V3-Schema, keine Migration)

## Reihenfolge-Empfehlung in V8.1

SLC-824 als VIERTER (letzter) Slice. Groesster Block (~2-2.5h), aber alle V8.1-Slices davor sind Vorbereitung. Nach SLC-824 ist V8.1 vollstaendig und kann mit Gesamt-/qa abgeschlossen werden.

## Reports

- Quelle: V8.1 Architecture RPT-491 + Permission-Klaerung 2026-05-20
- Reports erwartet: 1x /backend (Server-Actions) + 1x /frontend (UI) ODER 1x kombiniert /backend (wegen Mix Server+UI im selben Slice) + 1x /qa
