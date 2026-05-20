# FEAT-811 — Solopreneur-Mode + Sidebar-Konsolidierung + Teamlead-Permission-Erweiterung (V8.1)

## Status

planned (V8.1)

## Created

2026-05-20 (erweitert um SLC-824 nach Diskrepanz-Klaerung Discovery vs V7-Code 2026-05-20)

## Why

Vier zusammenhaengende UI-/Sidebar-/Settings-/Permission-Themen, die nach V8-Release als V8.1-Sprint priorisiert wurden:

1. **Solopreneur-Mode (BL-482)** — In V7 wurde "Team-Cockpit" und "Team-Verwaltung" als Admin/Teamlead-Funktion eingefuehrt. Solange der eingeloggte Admin der einzige User im Tenant ist (`team_size = 1`), zeigen diese Sidebar-Eintraege Aggregate ueber genau einen User — visuell wertlos und User-Story-fremd fuer Solopreneure. Erstes Onboarding-Erlebnis fuer einen neuen Solo-User: zwei Sidebar-Items, die nichts Sinnvolles zeigen.

2. **Sidebar/Settings-Doppelung (BL-483)** — V8 (FEAT-801) hat `/settings` zu einer gegliederten 3-Section-Tile-Page (Persoenlich / Vertrieb / System) gemacht. **Aber die Sidebar zeigt parallel weiterhin 12 Einzel-Eintraege** unter `VERWALTUNG_SETUP` — Pipelines, Kampagnen, Templates, Workflow-Automation, NL-Sculptor-Audit, Branding, Zahlungsbedingungen, Produkte, Einwilligungstexte, Ziele, Cadences/Automatisierung, Audit-Log. Beide Surfaces (Sidebar + Tile-Page) zeigen dasselbe — keine Single-Source-of-Truth, kognitive Last hoch, Sidebar lang.

3. **Teamlead-Tile-Inkonsistenz (BL-484)** — `/settings/team` ist als Sidebar-Eintrag fuer **Admin + Teamlead** sichtbar (sidebar-config.ts:121-125). Aber das `/settings`-Tile "Rollen-Verwaltung" ist `ADMIN_ONLY` (settings/page.tsx ~Z.187). Same URL, verschiedene Sichtbarkeit.

4. **Teamlead-Permission-Matrix passt nicht zu Multi-Team-Use-Case (BL-485, NEU 2026-05-20 nach Diskrepanz-Klaerung)** — V7-Design erlaubt Teamlead aktuell, sowohl `member` als auch `teamlead` einzuladen — aber **nicht**, eigene Team-Member zu loeschen. Beide Punkte passen nicht zum Multi-Team-Use-Case: Teamlead soll **operatives Team aufbauen** (Mitglieder einladen, fluktuierende Mitglieder loeschen mit Reassign), aber **keine Org-Struktur-Aenderungen** (keine Teamleads/Admins einladen, kein Rolle-Wechsel). User-Klaerung 2026-05-20: A2 (kein Co-Teamlead-Invite) + B1 (kein Rolle-Toggle) + C1 (Pflicht-Reassign vorher beim Delete).

User-Direktiven Discovery 2026-05-20:
- **Solo-Mode (BL-482):** reine Auto-Detection ohne Override-Toggle
- **Sidebar (BL-483):** komplett zusammenklappen → nur `Einstellungen` in Sidebar
- **Team-Tile (BL-484):** sichtbar fuer Admin+Teamlead — reine Tile-Permission, kein Page-Refactor
- **Teamlead-Edit (BL-485, NEU):** Invite-Restriction (nur `member`), Delete-Allow (nur eigene `member`, Hard-Lock-Reuse), kein Rolle-Toggle
- **Scope-Buendelung:** ein FEAT-811 mit 4 Sub-Slices SLC-821/822/823/824

## Scope

### In Scope

#### Sub-Slice 1 — SLC-821: Solopreneur-Mode (BL-482)

- Server-side Helper `getTeamSize(team_id)` (oder Reuse einer existierenden Aggregat-Funktion) — Count aller aktiven Profiles in derselben `team_id` wie der eingeloggte User
- In `sidebar-config.ts` oder einer Filter-Schicht: Wenn `team_size === 1` → Sidebar-Eintraege `/team` (Team-Cockpit) und `/settings/team` (Team-Verwaltung) ausblenden
- Beim ersten Invite (`profiles`-Insert mit gleicher `team_id`) → Items werden bei naechstem Sidebar-Render automatisch sichtbar (kein Restart, kein Cache-Bust noetig)
- **Kein Override-Setting** — User-Direktive: reine Auto-Detection ohne Toggle
- **Bezugspunkt fuer team_size**: Annahme aus aktuellem Code-Stand `profiles.team_id`. Falls die Foundation in V7 anders gewachsen ist (z.B. `profiles.tenant_id`), klaert /architecture die exakte Abfrage

#### Sub-Slice 2 — SLC-822: Sidebar-Konsolidierung Option A (BL-483)

- Alle 12 `VERWALTUNG_SETUP`-Sidebar-Eintraege aus der `SIDEBAR_CONFIG`-Array entfernen
- Einen einzigen neuen Eintrag `/settings` → "Einstellungen" hinzufuegen, sichtbar fuer ALL_ROLES (Permission innerhalb der Settings-Page wirkt weiter, jeder sieht seine erlaubten Tiles)
- **Sonderfall Tools-vs-Settings**: `/handoffs`, `/referrals`, `/audit-log` sind aktuell in `VERWALTUNG_SETUP`, sind aber funktional eher "operative Tools" als "Config". /architecture klaert, ob sie in eine neue `WERKZEUGE`-Section gehen, in `VERWALTUNG_MEIN` einziehen, oder als eigene Mini-Section bleiben. **Default-Annahme fuer V8.1:** sie wandern in eine kleine `WERKZEUGE`-Section, damit der Sidebar-Footer nicht leer ist
- `VERWALTUNG_SETUP` als Sidebar-Section-Konstante kann komplett geloescht werden, falls keine Eintraege uebrig bleiben (die 12 Items entfallen alle aus Sidebar)
- Settings-Tile-Page bleibt unveraendert (in V8 fertig refactored) — Settings-Tile ist die einzige Surface fuer Config
- Vorhandene Direkt-Links auf z.B. `/settings/pipelines` aus anderen Komponenten bleiben funktional (URLs aendern sich nicht)

#### Sub-Slice 3 — SLC-823: Teamlead-Tile-Sichtbarkeit (BL-484)

- **Reine UI-Sichtbarkeit, kein Edit-Verhalten**. Edit-Erweiterung wird in SLC-824 gemacht.
- Im Settings-Tile-Array (`/settings/page.tsx` Z.180-188) das Tile "Rollen-Verwaltung" `visibleFor` von `ADMIN_ONLY` zu `ADMIN_TEAMLEAD` aendern.
- Description Z.183 sprachlich neutralisieren auf "Team-Mitglieder einsehen und verwalten" (passt fuer Admin und Teamlead).
- Keine Aenderung an `/settings/team/page.tsx`, `team-members-table.tsx`, `invite-dialog.tsx`, `bulk-reassign-dialog.tsx` in diesem Slice.

#### Sub-Slice 4 — SLC-824: Teamlead-Edit-Erweiterung (BL-485, NEU 2026-05-20)

- **`lib/team/actions.ts` `inviteMember` Server-Action verengen** — neuer Guard: wenn `caller.role === "teamlead"` AND `payload.role !== "member"` → reject mit `INVALID_ROLE_FOR_TEAMLEAD_INVITER`. Admin-Pfad bleibt unveraendert (kann weiter alle 3 Rollen einladen).
- **`lib/team/actions.ts` `deleteProfile` Server-Action erweitern** — Permission-Layer von `assertRole(["admin"])` zu `assertRole(["admin", "teamlead"])`. Bei Teamlead-Caller zusaetzliche Guards:
  - `target.role === "member"` AND `target.team_id === caller.team_id` AND `target.user_id !== caller.user_id`
  - Bei Verletzung → reject mit `FORBIDDEN_OTHER_TEAM` / `FORBIDDEN_NON_MEMBER` / `FORBIDDEN_SELF`
  - Bestehende `countOwnerRecords`-Hard-Lock (V7-DEC-193) bleibt **unveraendert** — bei `open_records > 0` reject mit Re-Assign-Pflicht. Daten gehen niemals verloren.
- **`app/(app)/settings/team/team-members-table.tsx`** — Delete-Button-Sichtbarkeit Z.204:
  - Heute: `{callerIsAdmin && !isSelf && <DeleteButton>}`
  - Neu: `{(callerIsAdmin || (callerIsTeamlead && target.role === "member")) && !isSelf && <DeleteButton>}`
  - Neue Prop `callerIsTeamlead: boolean` ergaenzen, in `page.tsx` Z.173 aus `callerProfile.role` abgeleitet
  - Role-Select Z.159 bleibt admin-only — Teamlead sieht weiterhin nur Role-Badge
- **`app/(app)/settings/team/invite-dialog.tsx`** — Rollen-Dropdown Z.141-152:
  - Heute zeigt Teamlead `member` + `teamlead` Optionen
  - Neu: wenn `callerRole === "teamlead"` → nur `member`-Option
  - SelectItem `teamlead` Z.150 hinter `isAdmin`-Gate stellen (heute nur SelectItem `admin` hinter Gate)
- **audit_log.context** — bestehende `team.member_deleted`-Action erhaelt zusaetzliches Context-Feld `caller_role` fuer forensische Nachvollziehbarkeit (forensisch unterscheidbar: Admin-Delete vs Teamlead-Delete). Keine Schema-Migration — `audit_log.context` ist JSONB.
- **Vitest** — 6-8 neue Cases:
  - inviteMember Teamlead-Caller mit role='member' → OK
  - inviteMember Teamlead-Caller mit role='teamlead' → REJECT `INVALID_ROLE_FOR_TEAMLEAD_INVITER`
  - inviteMember Teamlead-Caller mit role='admin' → REJECT (bestehender V7-Guard)
  - deleteProfile Teamlead-Caller, target=member im eigenen Team, open_records=0 → OK
  - deleteProfile Teamlead-Caller, target=teamlead im eigenen Team → REJECT `FORBIDDEN_NON_MEMBER`
  - deleteProfile Teamlead-Caller, target=member in fremdem Team → REJECT `FORBIDDEN_OTHER_TEAM`
  - deleteProfile Teamlead-Caller, target=self → REJECT `FORBIDDEN_SELF`
  - deleteProfile Teamlead-Caller, target=member open_records>0 → REJECT `OPEN_RECORDS_BLOCK_DELETE` (Hard-Lock-Pre-Check unveraendert)
  - audit_log-Insert nach Delete → context.caller_role=teamlead persisted

### Out of Scope

- 4. Rolle / Auditor / Read-Only-Steuerberater — wie schon in V8 bestaetigt
- Sidebar-Brand-Refresh, Icon-Refactor, Theming — separater Theming-Tracker (BL-441)
- Mobile-Hamburger-Restructure — V7-Foundation bleibt
- Neue Settings-Tiles, neue Sections — V8.1 ist Konsolidierung, kein Feature-Add
- Override-Setting fuer Solopreneur-Mode (z.B. "Team-Vorbereitungs-Modus") — explizit verworfen 2026-05-20
- Migration der Tools-Section (Handoffs/Referrals/Audit-Log) zu echtem Dashboard — bleiben Sidebar-Links
- Visual-Refactor der `/settings/team`-Page — V8.1 aendert nur Sichtbarkeit + Permission-Guards, nicht Layout
- Rolle-Toggle Member ↔ Teamlead durch Teamlead — explizit verworfen 2026-05-20 ("habe ich jetzt gerade keine Lust drauf"), V8.x+ optional
- Combined-Modal `DeleteMemberWithReassign` — verworfen zugunsten von Pflicht-Reassign-Vorbedingung (V7-Hard-Lock-Reuse, billigeres UX-Pattern)
- Soft-Delete (is_active-Spalte) — verworfen weil Schema-Migration noetig waere, V8.1 ist no-migration-Sprint

## Acceptance Criteria

### SLC-821 Solopreneur-Mode
- Frisch eingeloggter Admin mit team_size=1: `/team` und `/settings/team` Sidebar-Eintraege sind NICHT sichtbar
- Nach Admin-Invite eines Members (Smoke ueber bestehendes Invite-Flow): nach Reload des Layouts werden beide Eintraege wieder sichtbar
- Member mit team_size=1 (theoretischer Fall — kein Admin im Tenant) sieht die Items ohnehin nicht (Permission-Layer war schon vorher Admin/Teamlead-only) — keine Regression
- Kein neues Setting, kein neuer Toggle, keine neue Migration

### SLC-822 Sidebar-Konsolidierung
- Sidebar zeigt KEINEN der 12 VERWALTUNG_SETUP-Eintraege mehr
- Ein neuer Eintrag "Einstellungen" → `/settings` ist fuer ALL_ROLES sichtbar
- `/settings`-Tile-Page rendert weiterhin korrekt mit ihren 3 Sections und allen Tiles entsprechend Permission
- `/handoffs`, `/referrals`, `/audit-log` bleiben per Sidebar erreichbar (Default in `WERKZEUGE`-Section, /architecture finalisiert)
- Bestehende Direkt-Links zu `/settings/pipelines`, `/settings/templates`, etc. aus anderen Komponenten/E-Mails/Audit-Log-Render funktionieren unveraendert (keine URL-Aenderung)

### SLC-823 Teamlead-Tile-Sichtbarkeit
- Tile "Rollen-Verwaltung" erscheint im `/settings`-Layout sowohl fuer Admin als auch Teamlead
- Description ist sprachlich neutral ("Team-Mitglieder einsehen und verwalten")
- Member sieht das Tile NICHT
- Sidebar-Eintrag "Team-Verwaltung" und Tile-Sichtbarkeit sind konsistent fuer Admin+Teamlead
- **Edit-Verhalten unveraendert in diesem Slice** — kommt in SLC-824

### SLC-824 Teamlead-Edit-Erweiterung
- Server-Action `inviteMember`: Teamlead-Caller mit `role='member'` PASS, mit `role='teamlead'` REJECT
- Server-Action `deleteProfile`: Teamlead-Caller mit `target=member+eigenes-Team+nicht-self+open_records=0` PASS
- Server-Action `deleteProfile`: Teamlead-Caller mit fremdem Team, oder target≠member, oder open_records>0 REJECT mit korrektem Error-Code
- UI: Teamlead sieht Delete-Buttons nur fuer eigene Member (`target.role === 'member'`)
- UI: Teamlead-Invite-Dialog zeigt nur "Member"-Option im Rollen-Dropdown
- audit_log.context enthaelt `caller_role` Feld nach jedem Member-Delete
- Admin-Pfade alle unveraendert

### Gesamt
- `npm run build`, `npm run lint`, `npm run test` clean
- Vitest Coverage fuer neue Sidebar-Filter-Logik (Solopreneur-Helper, Sidebar-Konsolidierung Test)
- Live-Smoke gegen business.strategaizetransition.com fuer alle 3 Rollen (Admin/Teamlead/Member)

## Open Points

Alle 5 Architecture-Open-Questions sind in RPT-491 + DEC-227/228/229/230 geklaert. Verbleibende Slice-Planning-Detailfragen:

- **Exakte Schreibweise:** "WERKZEUGE" / "TOOLS" / "HILFSMITTEL"
- **Tile-Description "Rollen-Verwaltung":** semantisch leicht anpassen oder belassen?
- **Reihenfolge der Sub-Slices:** SLC-821 → SLC-822 → SLC-823 → SLC-824 (vom kleinsten Risiko aufsteigend, sequentiell)

## Risks / Assumptions

- **Risk:** Wenn `VERWALTUNG_SETUP` als Sidebar-Section komplett verschwindet und `/handoffs`/`/referrals`/`/audit-log` ohne Heimat sind, koennen User sie nicht mehr finden. Mitigation: explizite `WERKZEUGE`-Section
- **Risk:** Direkt-Links auf `/settings/templates` aus E-Mail-Composing-Studio oder Workflow-Builder koennten Permissions-Probleme bekommen, wenn Tile-Permission und Page-Permission auseinanderlaufen. Mitigation: keine URL-Aenderung, Page-Permission bleibt unveraendert
- **Risk:** Wenn Solopreneur-Mode (SLC-821) den `team_size`-Query in jedem Sidebar-Render macht, wird das ein N+1-artiger Aufruf — Mitigation: Helper soll in der Layout-Server-Side-Render-Phase einmal pro Request gecached werden (React `cache()`)
- **Risk (SLC-824):** Teamlead-Delete-Berechtigung erweitert die Angriffs-Oberflaeche — wenn Guards falsch implementiert sind, koennte Teamlead Member fremder Teams loeschen. Mitigation: 3-Guard-Layer (target.role, target.team_id, target.user_id) + bestehende Hard-Lock-Pre-Check + ausfuehrliche Vitest-Coverage (6-8 Cases)
- **Risk (SLC-824):** V7-Tests fuer `inviteMember` und `deleteProfile` koennten brechen — Mitigation: Test-Adaption ist Teil von SLC-824
- **Assumption:** V8-Image (`c5e0f0c`) ist im Burn-In stabil (post-launch noch nicht abgeschlossen). Falls /post-launch V8 ein Blocker-Issue aufdeckt, V8.1 wartet
- **Assumption:** Keine Datenbank-Aenderung noetig. V8.1 ist UI-/Permission-/Filter-Layer-Sprint (audit_log.context ist JSONB — keine Migration)
- **Assumption:** `countOwnerRecords`-Hard-Lock-Pattern aus V7-DEC-193 funktioniert weiter wie spezifiziert (8 Kerntabellen). Code-Audit in SLC-824 verifiziert das.

## Success Criteria (Mapping auf Goal)

- Solopreneur startet das System und sieht keine wertlosen Team-Items mehr (BL-482 closed)
- Sidebar ist um 12 Eintraege schlanker, eine einzige Surface fuer Config ist `/settings` (BL-483 closed)
- Teamlead-Sichtbarkeit von `/settings/team` ist konsistent zwischen Sidebar und Tile-Page (BL-484 closed)
- Teamlead kann eigene Member einladen (nur als 'member') und loeschen (mit Pflicht-Reassign-Vorbedingung) — operatives Team-Management ohne Admin-Eingriff (BL-485 closed)
- Daten bleiben bei jedem Delete erhalten — Hard-Lock-Pre-Check verhindert versehentliche Loeschung
- Keine Regression in V8-Stack: Settings-Tile-Page bleibt funktional, Sidebar-Items in anderen Sections bleiben unveraendert, Admin-Pfade fuer Invite/Delete bleiben identisch
- Mobile (<768px) bleibt funktional

## Related

- DEC-196 (Permission-Matrix Admin/Teamlead/Member aus V7.1)
- DEC-193 (V7 Profile-Delete Hard-Lock — superseded by DEC-230, Mechanik bleibt erhalten)
- DEC-194 (V7 Invite-Flow — superseded by DEC-230, Teamlead-Role-Restriction verengt)
- DEC-227/228/229/230 (V8.1 Architecture-DECs, RPT-491)
- FEAT-801 (V8 Settings-Layout-Refactor) — V8.1 baut darauf auf, dass `/settings` schon 3 Sections + Tiles hat
- FEAT-701 (Multi-User-UX aus V7)
- V8.1 Discovery 2026-05-20 (RPT-490) + Architecture (RPT-491) + Teamlead-Permission-Klaerung (in dieser Conversation 2026-05-20)
- BL-482, BL-483, BL-484, BL-485 (Backlog-Items, V8.1)
- `sidebar-config.ts` aktuell 12 VERWALTUNG_SETUP-Eintraege (sidebar-config.ts:250-354)
- `/settings/page.tsx` aktuell `ADMIN_ONLY`-Rollen-Verwaltung-Tile (~Z.187)
- `/settings/team/team-members-table.tsx` `callerIsAdmin && !isSelf` Z.159/204
- `/settings/team/invite-dialog.tsx` Rollen-Dropdown Z.141-152
- `/lib/team/actions.ts` Server-Actions inviteMember/changeRole/deleteProfile
