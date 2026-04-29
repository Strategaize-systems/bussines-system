# SLC-554 — Status-Lifecycle Server Actions + Versionierung + Auto-Expire-Cron

## Meta
- Feature: FEAT-554
- Priority: High
- Status: planned
- Created: 2026-04-29

## Goal

Operativer Verhandlungs-Workflow auf bestehendem Schema (SLC-551). Status-Uebergaenge `draft → sent → accepted | rejected | expired` per Whitelist-gekapselter Server Action (DEC-108 idempotent), Versionierung per `createProposalVersion` (DEC-109 V1-Status unangetastet, kein `superseded`-Status), Auto-Expire-Cron taeglich 02:00 Berlin (DEC-110, Pattern aus `recording-retention/route.ts`). Audit-Eintrag pro Aktion in `audit_log` mit User-ID (manuell) oder NULL (Cron). UI-Erweiterung in SLC-552 Workspace: "Sent markieren"-Button + "Accepted"/"Rejected"-Buttons mit Confirm-Modal, "Neue Version erstellen"-Button funktional, Versions-Liste im Header. `/proposals`-Listing zeigt Status-Badge.

## Scope

- **Server Actions (`cockpit/src/app/(app)/proposals/actions.ts` Erweiterung):**
  - `transitionProposalStatus(proposalId: string, newStatus: 'sent'|'accepted'|'rejected'|'expired'): Promise<{ ok: true } | { ok: false; error: string }>`
    - Whitelist: `draft → sent`, `sent → accepted`, `sent → rejected`, `sent → expired` (kein Reverse, kein direkter `draft → accepted`)
    - Idempotent (DEC-108): aktueller Status == newStatus → No-op (returnt `ok: true`, kein Audit)
    - Setzt entsprechenden Timestamp: `accepted_at`, `rejected_at`, `expired_at` (NULL fuer `sent`-Transition, weil `sent` keinen eigenen Timestamp hat — nur Audit-Eintrag)
    - Audit-Eintrag mit `action='status_change'`, `entity_type='proposal'`, `entity_id=proposalId`, `actor_id=userId` (oder NULL fuer Cron), `changes={before:oldStatus, after:newStatus}`, `context='User-triggered'` oder `'Auto-expire by cron'`
  - `createProposalVersion(parentProposalId: string): Promise<{ ok: true; newProposalId: string } | { ok: false; error: string }>`
    - Liest parent-`proposal` + alle parent-`proposal_items`
    - INSERT neue `proposals`-Row mit `parent_proposal_id=parentId`, `version=parent.version+1`, `status='draft'`, alle anderen Felder (deal_id/contact_id/company_id/title/tax_rate/payment_terms/notes/valid_until) kopiert. `pdf_storage_path = NULL` (frisch zu generieren), `accepted_at=NULL`, `rejected_at=NULL`, `expired_at=NULL`, `subtotal_net=NULL`, `tax_amount=NULL`, `total_gross=NULL`
    - INSERT alle `proposal_items` mit neuer `proposal_id`, alle Snapshot-Felder kopiert (`snapshot_name`, `snapshot_description`, `snapshot_unit_price_at_creation`, `quantity`, `unit_price_net`, `discount_pct`, `position_order`)
    - Audit-Eintrag mit `action='create'`, `entity_type='proposal'`, `entity_id=newProposalId`, `context='Version V' + (parent.version+1) + ' of proposal V' + parent.version`
    - DEC-109: Parent-Proposal-Status bleibt unangetastet
    - Returns `{ ok: true, newProposalId }`
  - `expireOverdueProposals()` — Cron-only-Action (kein UI-Trigger)
    - SELECT `proposals` WHERE `status='sent'` AND `valid_until < CURRENT_DATE`
    - UPDATE Batch in einer Transaction: `SET status='expired', expired_at=now()` fuer betroffene IDs
    - Audit-Eintrag pro Row mit `actor_id=NULL`, `action='status_change'`, `changes={before:'sent', after:'expired'}`, `context='Auto-expire by cron — valid_until passed'`
    - Returns `{ expiredCount, expiredIds }`
- **Cron-Endpoint:**
  - Datei `cockpit/src/app/api/cron/expire-proposals/route.ts` analog `cockpit/src/app/api/cron/recording-retention/route.ts` Pattern
  - POST-Handler: `verifyCronSecret(request)` (existing in `verify-cron-secret.ts`), Service-Role-Client, ruft `expireOverdueProposals()`, returnt JSON `{ ok: true, expiredCount }`
  - Logging: `console.log('[cron] expire-proposals: $count proposals expired:', expiredIds)`
- **Coolify-Cron-Anleitung in REL-020-Notes:**
  - User-Anleitung im Release-Doc: Coolify-Cron `expire-proposals` mit Schedule `0 2 * * *` (02:00 Berlin Time), Container `app`, Command `node -e 'fetch(\"https://<DOMAIN>/api/cron/expire-proposals\", { method: \"POST\", headers: { \"Authorization\": \"Bearer \" + process.env.CRON_SECRET } }).then(r => r.text()).then(console.log)'`
  - Hinweis: Pattern wie SLC-541 Coolify-Crons
- **SLC-552 Workspace-Erweiterungen:**
  - "Sent markieren"-Button (sichtbar nur bei `status='draft'`): Confirm-Modal "Soll dieses Angebot als gesendet markiert werden? Datum=heute" → bei OK: `transitionProposalStatus(id, 'sent')`
  - "Accepted markieren"-Button (sichtbar nur bei `status='sent'`): Confirm-Modal → bei OK: `transitionProposalStatus(id, 'accepted')`
  - "Rejected markieren"-Button (sichtbar nur bei `status='sent'`): Confirm-Modal → bei OK: `transitionProposalStatus(id, 'rejected')`
  - "Neue Version erstellen"-Button (sichtbar in `<PreviewPanel>` aus SLC-552, war disabled): `disabled={false}`, onClick: `createProposalVersion(parentId)` → bei Success: `router.push('/proposals/' + newProposalId + '/edit')`
  - Status-Badge im Workspace-Header neben "V{version}": Badge mit Status-Color (draft=grau, sent=gruen, accepted=gruen-fett, rejected=rot, expired=orange)
  - Versions-Liste expandable im Workspace-Header: zeigt alle Versionen mit gleicher `deal_id`-Kette (Vorgaenger via `parent_proposal_id` traverse) sortiert nach `version DESC`, Click-Through-Link auf Edit-Page
- **`/proposals`-Listing-Erweiterung:**
  - Status-Badge in Tabellen-Spalte (war evtl. schon V2 vorhanden, jetzt mit V5.5-Farb-Mapping)
  - "Anzeigen"-Button (Read-only-View) auf Status `sent`/`accepted`/`rejected`/`expired` — fuehrt zu `/proposals/{id}/edit?readonly=1` (oder neue Read-only-Route, in dieser Slice: einfaches Disabled-State-Rendering im Workspace bei `?readonly=1`)
- **Read-only-Mode im Workspace (Bonus, einfach):**
  - Wenn URL-Param `readonly=1`: Editor-Felder disabled, "Sent markieren" und Item-CRUD-Buttons disabled. "PDF anzeigen"-Button (statt "PDF generieren") zeigt vorheriges PDF aus `pdf_storage_path` direkt im iframe
  - "Neue Version erstellen"-Button bleibt verfuegbar
- **Audit-Smoke:**
  - Pro Status-Transition: 1 Eintrag in `audit_log`
  - Pro Versions-Erstellung: 1 Eintrag in `audit_log`
  - Pro Cron-Run: N Eintraege (1 pro expirter Row)
- Update `docs/STATE.md`, `slices/INDEX.md`, `planning/backlog.json`, `features/INDEX.md`, `docs/RELEASES.md` (REL-020-Notes Cron-Anleitung).

## Out of Scope

- Auto-Stage-Wechsel im Deal bei Acceptance (V6.x-Kandidat — User-Anforderung in Backlog dokumentieren)
- E-Mail-Notifications bei Expire-Naehe (V5.6+)
- Status-Reverse (kein "Un-accept" — Audit-Wahrheit)
- Branch-Versionierung (nur lineare Kette via `parent_proposal_id`)
- Bulk-Status-Transitions (Multi-Select in `/proposals`-Listing)
- Composing-Studio-Hookup mit Auto-Sent-Status — Inhalt von SLC-555 (DEC-108 Auto-Trigger)
- Deal-Workspace Status-Indikator (zeigt aktuell aktive Version) — V5.5.x oder V5.6
- Status-History-Visualisierung als Timeline-View
- Multi-Tenant Cron (NULL-actor reicht in Single-User-Modus)
- Sommerzeit-Edge-Case-Tests (DEC-110 akzeptiert 02:00 Berlin als ausreichend)
- Cron-Setup-Auto-via-Coolify-API (manueller User-Klick laut feedback_manual_deploy.md)

## Acceptance Criteria

- AC1: `transitionProposalStatus` Whitelist-Validierung greift: Aufruf mit `draft → accepted` schlaegt fehl mit `error: 'invalid transition'`. Aufruf mit `accepted → draft` schlaegt fehl. Erlaubte 4 Transitions laufen.
- AC2: Idempotenz (DEC-108): Aufruf mit aktuellem Status == newStatus returnt `ok: true`, kein neuer Audit-Eintrag.
- AC3: Status-Transition setzt entsprechenden Timestamp: `accepted_at`/`rejected_at`/`expired_at`. Bei `sent`: kein Timestamp-Update (nur Audit).
- AC4: Audit-Log-Eintrag pro Transition: `action='status_change'`, `actor_id=userId` (manuell) oder `NULL` (Cron), `changes={before, after}`.
- AC5: `createProposalVersion(parentId)` legt neue `proposals`-Row mit korrekten Werten an: `parent_proposal_id=parentId`, `version=parent.version+1`, `status='draft'`, alle Item-Snapshots kopiert, `pdf_storage_path=NULL`, Lifecycle-Timestamps NULL.
- AC6: DEC-109: Parent-Proposal bleibt nach `createProposalVersion` unveraendert (kein Status-Update).
- AC7: Audit-Log-Eintrag fuer Versions-Erstellung mit `action='create'` und `context='Version V$n+1 of proposal V$n'`.
- AC8: Cron-Endpoint `/api/cron/expire-proposals` (POST) verifiziert `CRON_SECRET` und ruft `expireOverdueProposals()`. Returns JSON `{ ok: true, expiredCount }`.
- AC9: `expireOverdueProposals` UPDATE-Query: nur `status='sent'` AND `valid_until < CURRENT_DATE` werden zu `expired` mit `expired_at=now()`. Andere Status werden nicht angetastet.
- AC10: Audit-Eintrag pro expirter Row mit `actor_id=NULL`, `context='Auto-expire by cron — valid_until passed'`.
- AC11: SLC-552 Workspace zeigt Status-Aktion-Buttons abhaengig vom aktuellen Status: `draft` → "Sent markieren", `sent` → "Accepted" + "Rejected", andere Status → keine Aktion-Buttons.
- AC12: Confirm-Modal vor jeder Status-Aktion mit Bestaetigung-Button.
- AC13: "Neue Version erstellen"-Button im PreviewPanel ist funktional (zuvor disabled aus SLC-552). Klick erzeugt neuen Draft + redirected.
- AC14: Workspace-Header zeigt Status-Badge mit Color-Mapping (draft=grau, sent=gruen, accepted=gruen-fett, rejected=rot, expired=orange).
- AC15: Versions-Liste im Workspace-Header expandable (Click "V{n}" Badge oeffnet Liste): alle Versionen der `parent_proposal_id`-Kette mit Click-Through-Link.
- AC16: `/proposals`-Listing: Status-Badge mit Color-Mapping. "Anzeigen"-Button auf Non-Draft-Rows fuehrt zu `/proposals/{id}/edit?readonly=1`.
- AC17: Read-only-Mode (`?readonly=1`): Editor-Felder + Item-CRUD disabled, "Neue Version erstellen" weiterhin verfuegbar.
- AC18: Coolify-Cron-Anleitung in REL-020-Notes (`docs/RELEASES.md`) mit konkreter Cron-Expression + Container + Command + Sicherheits-Hinweis (CRON_SECRET via process.env, kein Klartext).
- AC19: TypeScript-Build (`npm run build`) gruen. `npm run test` (wenn Tests existieren) gruen.
- AC20: Cron-Smoke auf Hetzner: manueller POST an `/api/cron/expire-proposals` mit korrekter Auth-Header → 200 + JSON-Response. Mit falschem Header → 401.

## Dependencies

- SLC-551 (Schema, Lifecycle-Timestamps + `parent_proposal_id`)
- SLC-552 (Workspace-Layout fuer Buttons + PreviewPanel-Slot fuer "Neue Version erstellen", Versions-Header-Slot)
- V3 `audit_log` (FEAT-307, existing)
- Existing Cron-Pattern (`recording-retention/route.ts`, `verify-cron-secret.ts`, `cockpit/src/lib/supabase/admin.ts` fuer Service-Role-Client)
- Coolify-Cron-Infrastruktur (existing, User legt manuell an)

## Risks

- **Risk:** Whitelist-Pruefung wird bei zukuenftiger Erweiterung um neue Status (`superseded`, `revised`) inkonsistent.
  Mitigation: Whitelist als Konstante exportieren — `ALLOWED_TRANSITIONS: Record<oldStatus, newStatus[]>`. Eindeutige Single-Source-of-Truth.
- **Risk:** Cron-Secret leakt durch Klartext-Logging.
  Mitigation: `process.env.CRON_SECRET` in Code, kein Logging. Coolify-ENV speichert. REL-020-Notes warnen explizit.
- **Risk:** Cron-Run mehrfach pro Tag wegen Cron-Drift (z.B. Doppel-Eintrag in Coolify).
  Mitigation: Idempotenz: `expireOverdueProposals` ist DELETE-WHERE-Pattern, mehrfacher Lauf erzeugt keine doppelten Audit-Eintraege fuer bereits expirte Rows (Filter `status='sent'`). Sicherheit: User-Anleitung warnt vor Doppel-Eintraegen.
- **Risk:** `createProposalVersion` schlaegt mid-Transaction fehl (z.B. Items-Insert-Error nach Proposal-Insert) → Inkonsistenter State.
  Mitigation: Transaction-Pattern in Server Action: Supabase `rpc('create_proposal_version', ...)` als SQL-Function ODER 2-Step mit explicit Rollback-Handler. Falls 2-Step zu komplex: einfache Sequence + bei Item-Insert-Error: DELETE des angelegten Proposal-Stub. Trade-off-Abwaegung in MT-2.
- **Risk:** Read-only-Mode (`?readonly=1`) bypasst Status-Pruefung wenn URL manipuliert.
  Mitigation: Server-Side-Re-Check in jeder Item-CRUD-Server-Action: `if (proposal.status !== 'draft') return { ok: false, error: 'frozen' }`. Frontend-Disable ist nur UX, Server-Side-Block ist Sicherheit.
- **Risk:** Cron faengt erste Sommerzeit-Wechsel-Lauf nicht ab (02:00 Berlin existiert nicht beim Wechsel zur Sommerzeit).
  Mitigation: DEC-110 akzeptiert Tagesgranularitaet — nicht-laufender Tag wird beim naechsten Lauf nachgeholt. `valid_until DATE` ist Tag-genau, Stunde irrelevant.
- **Risk:** Versions-Liste-Traverse (`parent_proposal_id`-Kette) ineffizient bei langen Ketten.
  Mitigation: Recursive CTE in Server Action ODER 1-Level-Lookup (nur direkte Parent-Children). V5.5 Constraint 4: Max 5 Versionen → CTE ist OK. Index `idx_proposals_parent` aus SLC-551 hilft.
- **Risk:** Status-Badge-Farben sind nicht WCAG-konform.
  Mitigation: Pattern aus V5.4 Style-Guide-V2 wiederverwenden. Bei Drift: Tailwind-Color-Token aus `cockpit/src/styles/tokens.ts` (existing).

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/app/(app)/proposals/actions.ts` | MODIFY: `transitionProposalStatus`, `createProposalVersion`, `expireOverdueProposals` ergaenzen |
| `cockpit/src/lib/proposal/transitions.ts` | NEU: `ALLOWED_TRANSITIONS`-Konstante + `isValidTransition`-Helper |
| `cockpit/src/lib/proposal/transitions.test.ts` | NEU: Unit-Tests fuer Whitelist |
| `cockpit/src/app/api/cron/expire-proposals/route.ts` | NEU: Cron-Endpoint analog `recording-retention` |
| `cockpit/src/app/(app)/proposals/[id]/edit/proposal-workspace.tsx` | MODIFY: Status-Action-Buttons + Confirm-Modals + Status-Badge + Versions-Liste |
| `cockpit/src/app/(app)/proposals/[id]/edit/preview-panel.tsx` | MODIFY: "Neue Version erstellen"-Button funktional |
| `cockpit/src/app/(app)/proposals/[id]/edit/page.tsx` | MODIFY: `?readonly=1` URL-Param-Handling |
| `cockpit/src/app/(app)/proposals/proposals-client.tsx` | MODIFY: Status-Badge + "Anzeigen"-Button auf Non-Draft-Rows |
| `cockpit/src/components/proposal/status-badge.tsx` | NEU: Status-Badge-Komponente mit Color-Mapping |
| `cockpit/src/components/proposal/proposal-versions-list.tsx` | NEU: Expandable Versions-Liste fuer Workspace-Header |
| `docs/RELEASES.md` | MODIFY: REL-020-Notes mit Coolify-Cron-Anleitung |
| `docs/STATE.md` | Slice-Status-Update |
| `slices/INDEX.md` | SLC-554 anlegen |
| `planning/backlog.json` | BL-410 (SLC-554 Tracking) anlegen |
| `features/INDEX.md` | FEAT-554 → `in_progress` |

## QA Focus

- **Build + Test:**
  - `npm run build` gruen
  - `npm run test -- transitions` gruen (Whitelist-Tests)
- **Status-Transition-Smoke:**
  - Erlaubte 4 Transitions: `draft → sent`, `sent → accepted`, `sent → rejected`, `sent → expired` — laufen ohne Error
  - Verbotene Transitions: `draft → accepted`, `accepted → draft`, `rejected → accepted` — werfen `error: 'invalid transition'`
  - Idempotenz-Smoke: `transitionProposalStatus(id, 'sent')` auf bereits-`sent`-Angebot → `ok: true`, kein zusaetzlicher Audit-Eintrag
  - Timestamp-Smoke: nach `accept` → `accepted_at != NULL`, nach `reject` → `rejected_at != NULL`
- **Audit-Smoke:**
  - Nach jeder Transition: 1 Eintrag in `audit_log` mit korrektem `actor_id` + `changes`
  - Nach Versions-Erstellung: 1 Eintrag mit `action='create'` + `context`
  - Nach Cron-Run: N Eintraege mit `actor_id=NULL`
- **Versionierung-Smoke:**
  - Erzeuge V1 (manuell), call `createProposalVersion(v1.id)` → V2 entsteht mit `parent_proposal_id=v1.id`, `version=2`, `status='draft'`, alle Items kopiert
  - V1-Status nach createProposalVersion: unveraendert (Audit-Eintrag-Diff vor/nach)
  - Items-Snapshot-Verifikation: V2-Items haben gleiche `snapshot_unit_price_at_creation` wie V1
- **UI-Smoke (Browser):**
  - "Sent markieren"-Button im Workspace bei `status='draft'` sichtbar, Confirm-Modal funktioniert, nach OK Status auf `sent`
  - "Accepted"-Button bei `status='sent'` sichtbar, nach Confirm Status auf `accepted`
  - "Rejected"-Button bei `status='sent'` sichtbar, nach Confirm Status auf `rejected`
  - Workspace-Header Status-Badge wechselt Farbe entsprechend
  - "Neue Version erstellen"-Button (Preview-Panel): Klick → Confirm → V2-Workspace oeffnet sich
  - Versions-Liste: Klick auf "V{n}" Badge oeffnet Liste, Click-Through navigiert
- **`/proposals`-Listing-Smoke:**
  - Status-Badge sichtbar mit Color-Mapping
  - "Anzeigen"-Button auf Non-Draft-Rows, Klick navigiert zu `/proposals/{id}/edit?readonly=1`
- **Read-only-Mode-Smoke:**
  - URL `/proposals/{id}/edit?readonly=1`: Editor-Inputs disabled, Item-Buttons disabled, "Neue Version erstellen" verfuegbar
  - Server-Side-Block-Verifikation: direkter `updateProposal`-Call auf nicht-Draft-Status → `ok: false, error: 'frozen'`
- **Cron-Smoke:**
  - Test-Setup: 2 Test-Proposals mit `status='sent'` und `valid_until = CURRENT_DATE - 1` und 1 mit `valid_until = CURRENT_DATE + 1`
  - Manueller POST an `/api/cron/expire-proposals` mit korrektem Auth-Header → JSON `{ ok: true, expiredCount: 2 }`
  - Verifikation: 2 Rows haben `status='expired'`, 1 Row unveraendert
  - Audit-Eintraege: 2 Eintraege mit `actor_id=NULL`
  - Falsche Auth-Header → 401
- **Coolify-Cron-Setup-Anleitung:**
  - REL-020-Notes enthalten Cron-Expression, Container-Name, Command, ENV-Variable-Hinweis
  - User-Test (nach Deploy + Cron-Anlage): erste 02:00-Run produziert log-Eintrag

## Micro-Tasks

### MT-1: Whitelist-Konstante + Server Action `transitionProposalStatus`
- Goal: Status-Transition-Logik mit Idempotenz + Audit
- Files: `cockpit/src/lib/proposal/transitions.ts`, `cockpit/src/lib/proposal/transitions.test.ts`, `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY)
- Expected behavior:
  - `transitions.ts` exportiert:
    - `ALLOWED_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]>` mit `{draft: ['sent'], sent: ['accepted','rejected','expired'], accepted: [], rejected: [], expired: []}`
    - `isValidTransition(from, to): boolean`
  - Unit-Tests fuer 4 valide + 4 invalide Transitions + Idempotenz
  - `transitionProposalStatus(proposalId, newStatus)` Server Action:
    - Auth-Check, SELECT current proposal status
    - Idempotenz-Check: `if (proposal.status === newStatus) return { ok: true }` ohne Audit
    - Whitelist-Check: `if (!isValidTransition(proposal.status, newStatus)) return { ok: false, error: 'invalid transition' }`
    - UPDATE `proposals SET status=newStatus, [accepted_at|rejected_at|expired_at]=now()` (Timestamp je nach Status)
    - Audit-Insert: `action='status_change'`, `actor_id=auth.uid()`, `changes={before, after}`, `context='User-triggered'`
    - `revalidatePath('/proposals/' + proposalId + '/edit')`
- Verification: `npm run test -- transitions` gruen, Server-Action-Smoke per DevTools
- Dependencies: SLC-552 abgeschlossen

### MT-2: Server Action `createProposalVersion`
- Goal: Versionierung mit Item-Snapshot-Kopie + Audit
- Files: `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY)
- Expected behavior:
  - Signature: `createProposalVersion(parentProposalId: string): Promise<{ ok: true; newProposalId: string } | { ok: false; error: string }>`
  - Auth-Check, SELECT parent + items (via `getProposalForEdit`)
  - INSERT new `proposals`: `parent_proposal_id=parentId`, `version=parent.version+1`, `status='draft'`, kopiere `deal_id`/`contact_id`/`company_id`/`title`/`tax_rate`/`payment_terms`/`notes`/`valid_until`. NULL fuer `pdf_storage_path`, `accepted_at`, `rejected_at`, `expired_at`, `subtotal_net`, `tax_amount`, `total_gross`
  - INSERT items: jede parent-Item-Row als neue Row mit neuer `proposal_id` + UUID, alle Felder kopiert
  - Wenn Item-Insert fehlschlaegt: DELETE des angelegten Proposal-Stub (Cleanup)
  - Audit-Insert: `action='create'`, `context='Version V' + (parent.version+1) + ' of proposal V' + parent.version`
  - Returns `{ ok: true, newProposalId }`
- Verification: Server-Action-Smoke: V1 mit 3 Items → V2 mit 3 kopierten Items, V1 unveraendert
- Dependencies: MT-1

### MT-3: Cron-Action `expireOverdueProposals` + Cron-Endpoint
- Goal: Auto-Expire-Logik + HTTP-Trigger
- Files: `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY), `cockpit/src/app/api/cron/expire-proposals/route.ts` (NEU)
- Expected behavior:
  - `expireOverdueProposals()` (kein Auth-Check, wird via Service-Role-Client gerufen):
    - SELECT `proposals.id, proposals.status, proposals.valid_until` WHERE `status='sent' AND valid_until < CURRENT_DATE`
    - Wenn 0 Rows: returnt `{ expiredCount: 0, expiredIds: [] }`
    - Sonst: UPDATE Batch `SET status='expired', expired_at=now()` fuer alle IDs (eine Query mit `IN`-Liste)
    - Audit-Insert pro Row mit `actor_id=NULL`, `action='status_change'`, `changes={before:'sent', after:'expired'}`, `context='Auto-expire by cron — valid_until passed'`
    - Returns `{ expiredCount, expiredIds }`
  - `route.ts` analog `recording-retention/route.ts`:
    ```ts
    export async function POST(request: Request) {
      if (!verifyCronSecret(request)) return new Response('unauthorized', { status: 401 });
      const result = await expireOverdueProposals();
      console.log('[cron] expire-proposals:', result);
      return Response.json({ ok: true, ...result });
    }
    ```
- Verification: Local-Test: Test-Proposal mit valid_until=yesterday + status=sent, manueller `curl -X POST -H "Authorization: Bearer $CRON_SECRET" /api/cron/expire-proposals` → 200, Status auf expired
- Dependencies: MT-1

### MT-4: Status-Badge + Versions-Liste-Komponenten
- Goal: Reusable UI-Komponenten
- Files: `cockpit/src/components/proposal/status-badge.tsx` (NEU), `cockpit/src/components/proposal/proposal-versions-list.tsx` (NEU)
- Expected behavior:
  - `<StatusBadge status={ProposalStatus} />`: shadcn-Badge mit Color-Mapping (`draft=secondary`, `sent=success`, `accepted=success-fett`, `rejected=destructive`, `expired=warning`)
  - `<ProposalVersionsList currentProposalId={string} />`: ruft Server Action `getProposalVersionsChain(proposalId)` (NEU in actions.ts, Recursive CTE), zeigt expandable Liste sortiert nach `version DESC`, currentProposal hervorgehoben, Click-Through-`<Link>` auf andere Versionen
- Verification: Storybook-Smoke ODER Browser-Smoke beider Komponenten
- Dependencies: MT-1

### MT-5: Workspace-Erweiterung — Status-Action-Buttons + Confirm-Modals
- Goal: 3 Status-Buttons + Confirm-Dialogs
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/proposal-workspace.tsx` (MODIFY)
- Expected behavior:
  - Top-Bar des Workspace: links Status-Badge + Versions-Liste-Toggle, rechts Aktion-Buttons
  - "Sent markieren"-Button (sichtbar nur bei `status='draft'`): shadcn-`<AlertDialog>` Confirm "Soll dieses Angebot als gesendet markiert werden? Datum=heute" → bei OK: `transitionProposalStatus(id, 'sent')` + State-Update
  - "Accepted markieren"-Button (sichtbar nur bei `status='sent'`): Confirm + transition
  - "Rejected markieren"-Button (sichtbar nur bei `status='sent'`): Confirm + transition
  - Optional: bei Erfolg Toast "Status auf {newStatus} gesetzt"
  - Top-Bar mit `<StatusBadge>` neben "V{version}"
  - "Neue Version erstellen"-Button im PreviewPanel (kommt aus MT-6)
- Verification: Browser-Smoke aller 3 Buttons
- Dependencies: MT-1, MT-4

### MT-6: PreviewPanel "Neue Version erstellen"-Button funktional + Read-only-Mode
- Goal: Button aktivieren + readonly URL-Param-Handling
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/preview-panel.tsx` (MODIFY), `cockpit/src/app/(app)/proposals/[id]/edit/page.tsx` (MODIFY), `cockpit/src/app/(app)/proposals/[id]/edit/proposal-workspace.tsx` (MODIFY — readonly-Prop reichen)
- Expected behavior:
  - PreviewPanel: "Neue Version erstellen"-Button `disabled={false}`, onClick: shadcn-Confirm "Neue Version (V{n+1}) erstellen?" → bei OK: `createProposalVersion(parentId)` → bei Success `router.push('/proposals/' + newId + '/edit')`
  - `page.tsx` ruft `getProposalForEdit(id)` und liest `searchParams.readonly === '1'` als `readonly: boolean` → an `<ProposalWorkspace readonly={readonly} ... />` reichen
  - Wenn `readonly=true`:
    - Editor-Felder (Title/Tax-Rate/Valid-Until/Payment-Terms/Notes) als `<Input disabled>`
    - PositionList: "Produkt hinzufuegen", Inline-Edit, Drag-Reorder, Loeschen-Buttons disabled
    - Status-Action-Buttons disabled
    - "Neue Version erstellen" bleibt aktiv
    - "PDF generieren"-Button wird zu "PDF anzeigen" wenn `pdf_storage_path != NULL`: zeigt direkt den vorhandenen PDF im iframe (Signed-URL)
  - Server-Side-Block: alle Item-CRUD-Server-Actions checken `if (proposal.status !== 'draft') return { error: 'frozen' }` (zusaetzlich zu Frontend-Disable)
- Verification: Browser-Smoke: ?readonly=1 disabled alle Inputs, Server-Action-Direct-Call lehnt ab
- Dependencies: MT-2, MT-5, SLC-553 (PDF-Anzeige)

### MT-7: `/proposals`-Listing Status-Badge + "Anzeigen"-Button
- Goal: Listing-Erweiterung
- Files: `cockpit/src/app/(app)/proposals/proposals-client.tsx` (MODIFY)
- Expected behavior:
  - In Tabellen-Spalte "Status": `<StatusBadge status={row.status} />`
  - In Aktionen-Spalte: "Bearbeiten"-Button (existing aus SLC-552, nur bei `status='draft'`), "Anzeigen"-Button (sichtbar bei Non-Draft) → `<Link href={'/proposals/' + id + '/edit?readonly=1'}>`
- Verification: Browser-Smoke
- Dependencies: MT-4, MT-6

### MT-8: Cron-Smoke auf Hetzner + REL-020-Notes-Anleitung
- Goal: Live-Cron-Verifikation + Doku
- Files: `docs/RELEASES.md` (MODIFY)
- Expected behavior:
  - Setup: 2 Test-Proposals via SQL: 1x `status='sent', valid_until=CURRENT_DATE - INTERVAL '1 day'` + 1x `status='sent', valid_until=CURRENT_DATE + INTERVAL '1 day'`
  - Manueller cURL-Test auf Hetzner gegen Public-Domain: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<DOMAIN>/api/cron/expire-proposals`
  - Erwartet: JSON `{ ok: true, expiredCount: 1, expiredIds: [...] }`
  - Verifikation: SQL `SELECT id, status, expired_at FROM proposals WHERE id IN (...)` → 1x expired, 1x sent
  - Audit-Smoke: 1 Eintrag mit `actor_id=NULL`, `context='Auto-expire by cron'`
  - REL-020-Notes Section "Coolify-Cron Setup" hinzufuegen mit:
    - Cron-Name: `expire-proposals`
    - Schedule: `0 2 * * *` (02:00 Berlin Time)
    - Container: `app`
    - Command (`feedback_coolify_cron_node.md` Pattern): `node -e 'fetch("https://<DOMAIN>/api/cron/expire-proposals", { method: "POST", headers: { Authorization: "Bearer " + process.env.CRON_SECRET } }).then(r => r.text()).then(console.log)'`
    - ENV: CRON_SECRET muss gesetzt sein (existing aus V5.1 retention-Cron)
    - Sicherheits-Hinweis: kein Klartext, immer process.env
- Verification: Cron-Smoke laeuft auf Hetzner, REL-020-Notes hat vollstaendige Anleitung
- Dependencies: MT-3 + Hetzner-Deploy von MT-1..7

### MT-9: Final-QA — End-to-End Versionierung + Cron + Status-Lifecycle
- Goal: Cross-Cut-Smoke
- Files: keine (manueller Test)
- Expected behavior:
  - Test-Fall A: Erzeuge V1 → markiere `sent` → Confirm-Modal → DB `status=sent` + Audit
  - Test-Fall B: V1 sent → "Accepted" → DB `status=accepted, accepted_at != NULL`
  - Test-Fall C: V1 sent → "Neue Version erstellen" → V2 entsteht mit `version=2, status=draft, parent_proposal_id=V1.id`, V1-Status unveraendert
  - Test-Fall D: V2 als sent markiert + valid_until=yesterday → manueller Cron-Call → V2 expired
  - Test-Fall E: V1 (jetzt accepted) → Read-only-View `?readonly=1` → alle Inputs disabled, "Neue Version erstellen" verfuegbar
  - Test-Fall F: Versions-Liste im Workspace-Header zeigt V2 mit Click-Through zu V1 + zurueck
  - Audit-Log-Diff vor/nach: korrekte Anzahl Eintraege
  - Dokumentation in QA-Report
- Verification: Alle 6 Faelle dokumentiert
- Dependencies: MT-1..MT-8

## Schaetzung

~4-6h:
- MT-1 (Whitelist + transitionProposalStatus): ~1h
- MT-2 (createProposalVersion): ~1h
- MT-3 (expireOverdueProposals + Cron-Endpoint): ~45min
- MT-4 (StatusBadge + VersionsList): ~45min
- MT-5 (Workspace Status-Buttons): ~45min
- MT-6 (Neue-Version-Button + Read-only-Mode): ~1h
- MT-7 (Listing-Erweiterung): ~30min
- MT-8 (Cron-Smoke + REL-020-Notes): ~30min
- MT-9 (Final-QA E2E): ~45min
- Buffer + Bug-Fix: ~45min-1h
