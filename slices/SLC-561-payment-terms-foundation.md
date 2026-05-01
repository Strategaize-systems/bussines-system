# SLC-561 — Payment-Terms Foundation (Schema + Templates-CRUD + /settings/payment-terms)

## Meta
- Feature: FEAT-561 (Sub-Theme A — Vorauswahl)
- Priority: Blocker
- Status: planned
- Created: 2026-05-01

## Goal

V5.6 Schema-Foundation und Templates-Vorauswahl fertigstellen. MIG-027 Apply auf Hetzner mit allen 5 Schema-Aenderungen (`payment_terms_templates`, `proposal_payment_milestones`, `proposals.skonto_*`, `meetings.briefing_generated_at`, `user_settings.briefing_*`). Neue Settings-Page `/settings/payment-terms` mit CRUD-UI fuer Templates: Anlegen, Editieren, Loeschen, Default-Setzen. Default-Mutex via UNIQUE-Index garantiert max. 1 Default-Template (DEC-115). Seed: "30 Tage netto" als Initial-Default. Settings-Sidebar-Nav (`/settings/branding`, `/settings/payment-terms`, `/settings/briefing` spaeter) wird im selben Slice angelegt — kleine Layout-Touch-Operation. Diese Foundation-Schicht ist Voraussetzung fuer SLC-562 (Editor-Dropdown nutzt `listPaymentTermsTemplates`) und SLC-564 (`/settings/briefing` wird in SLC-564 angelegt, nutzt aber die Sidebar-Nav-Pattern aus diesem Slice).

## Scope

- **MIG-027 Apply auf Hetzner:**
  - Datei: `sql/027_v56_payment_terms_and_briefing.sql` (NEU) — vollstaendige Migration nach MIG-027-Spec aus MIGRATIONS.md
  - Idempotent durch `IF NOT EXISTS` + `ON CONFLICT DO NOTHING` + DEFAULT-Werte
  - Apply-Procedure laut `.claude/rules/sql-migration-hetzner.md`: Base64-Transfer + `psql -U postgres -d postgres < /tmp/027_*.sql` (NICHT supabase_admin)
  - Verifikation: `\d payment_terms_templates`, `\d proposal_payment_milestones`, `\d proposals` (skonto-Spalten), `\d meetings` (briefing_generated_at), `\d user_settings` (briefing_*-Spalten)
  - Idempotenz-Smoke: zweiter Apply-Run ohne Fehler
- **`payment_terms_templates`-Server-Actions:**
  - Datei: `cockpit/src/app/(app)/settings/payment-terms/actions.ts` (NEU)
  - `listPaymentTermsTemplates(): Promise<PaymentTermsTemplate[]>` — SELECT alle Rows ORDER BY `is_default DESC, label ASC`
  - `createPaymentTermsTemplate({label, body}): Promise<{ok: true, id} | {ok: false, error}>` — INSERT mit `is_default=false`
  - `updatePaymentTermsTemplate({id, label, body}): Promise<{ok: true} | {ok: false, error}>` — UPDATE label + body, `is_default` separat
  - `deletePaymentTermsTemplate({id}): Promise<{ok: true} | {ok: false, error}>` — DELETE, mit Guard: kann nicht geloescht werden wenn `is_default=true` (Hinweis "Setze zuerst ein anderes Template als Default"). Wenn nur 1 Template uebrig ist, kann es trotzdem geloescht werden (User-Verantwortung).
  - `setDefaultPaymentTermsTemplate({id}): Promise<{ok: true} | {ok: false, error}>` — Transaction: UPDATE alle SET `is_default=false` + UPDATE id SET `is_default=true`
  - Audit-Log fuer alle Operations (action='create'/'update'/'delete', entity_type='payment_terms_template')
- **`/settings/payment-terms`-Page:**
  - Datei: `cockpit/src/app/(app)/settings/payment-terms/page.tsx` (NEU)
  - Layout: Settings-Sidebar-Nav (links) + Main-Content (rechts)
  - Main-Content:
    - Headline "Zahlungsbedingungen"
    - Beschreibung (1 Satz "Vorlagen fuer typische Zahlungsbedingungen, die im Angebot-Editor per Dropdown auswaehlbar sind.")
    - Liste aller Templates als shadcn-`<Card>`s mit:
      - Label (gross)
      - Body (klein, 1-2 Zeilen Preview)
      - Default-Badge (gruen) wenn `is_default=true`
      - "Default setzen"-Button (sichtbar wenn `!is_default`)
      - "Bearbeiten"-Button (oeffnet Edit-Dialog)
      - "Loeschen"-Button (oeffnet Confirm-Dialog)
    - Top-rechts "+ Neue Vorlage"-Button (oeffnet Create-Dialog)
  - Create-Dialog: shadcn-`<Dialog>` mit Label-Input + Body-Textarea + Save-Button
  - Edit-Dialog: gleiches Form, vorbefuellt
  - Confirm-Delete-Dialog: shadcn-`<AlertDialog>` "Vorlage '{label}' wirklich loeschen?"
  - Default-Toggle ohne Confirm (sofortiger Switch)
- **Settings-Sidebar-Nav (gemeinsame Layout-Schicht):**
  - Datei: `cockpit/src/app/(app)/settings/layout.tsx` (NEU oder MODIFY existing)
  - Sidebar mit Links: "Branding", "Zahlungsbedingungen", "Briefing" (Briefing-Link rendert ab SLC-564 — bis dahin als TODO oder verstecktes Item)
  - Active-State via `usePathname` (`next/navigation`)
  - shadcn-`<NavigationMenu>` oder einfaches `<aside>` mit `<Link>`s
- **`PaymentTermsTemplate`-Type:**
  - Datei: `cockpit/src/lib/types/proposal-payment.ts` (NEU)
  - `type PaymentTermsTemplate = { id: string; label: string; body: string; is_default: boolean; created_at: string; updated_at: string }`
- **Cockpit-Records-Update:**
  - `slices/INDEX.md`: SLC-561 Status `planned -> done`
  - `planning/backlog.json`: BL-413 (SLC-561-Tracking) `planned -> done`
  - `docs/STATE.md`: Phase auf `implementing`, naechste = SLC-562
  - `docs/MIGRATIONS.md`: MIG-027 Date-Stempel auf Apply-Date

## Out of Scope

- Editor-Dropdown im Proposal-Workspace (das ist SLC-562)
- Skonto-Toggle im Editor (das ist SLC-562)
- Split-Plan-Section (das ist SLC-563)
- PDF-Renderer-Erweiterung (das ist SLC-563)
- `/settings/briefing` Page (das ist SLC-564)
- Briefing-Cron (das ist SLC-564)
- Multi-Default-Templates (User-Lokalisierung etc. — Single-User V5.6, V7+ Multi-User-Erweiterung)
- Auto-Migration von bestehenden `proposals.payment_terms` Freitext-Werten in das Template-System (PRD V5.6 Constraint)
- Branding-spezifische Default-Templates pro Branding-Profile (V7+)

## Acceptance Criteria

- AC1: MIG-027 erfolgreich auf Hetzner appliziert. Idempotenz-Smoke: zweiter Run ohne Fehler.
- AC2: `\d payment_terms_templates` zeigt alle 7 Spalten korrekt + UNIQUE-Index `idx_payment_terms_templates_default WHERE is_default = true`.
- AC3: `\d proposal_payment_milestones` zeigt alle 9 Spalten + Indizes (UNIQUE auf `(proposal_id, sequence)`, FK-Cascade auf `proposal_id`).
- AC4: `\d proposals` zeigt neue Spalten `skonto_percent NUMERIC(4,2)`, `skonto_days INTEGER` mit CHECK-Constraints.
- AC5: `\d meetings` zeigt neue Spalte `briefing_generated_at TIMESTAMPTZ` + Partial-Index `idx_meetings_briefing_pending`.
- AC6: `\d user_settings` zeigt neue Spalten `briefing_trigger_minutes`, `briefing_push_enabled`, `briefing_email_enabled` mit DEFAULTs (30, true, true).
- AC7: Seed-INSERT eingespielt: `SELECT * FROM payment_terms_templates` zeigt mindestens 1 Row "30 Tage netto" mit `is_default=true`.
- AC8: V5.5-Proposals bleiben unveraendert lesbar: `SELECT * FROM proposals WHERE id IN (...)` ohne Schema-Bruch, alle alten Spalten unveraendert.
- AC9: V5.5-PDFs koennen weiterhin generiert werden (regression-frei in `/proposals/[id]/edit` "PDF generieren"-Klick).
- AC10: `/settings/payment-terms` Page lautet auf, zeigt alle Templates inkl. Seed-Template als Cards.
- AC11: "Neue Vorlage"-Dialog funktioniert: Anlegen mit Label + Body schreibt Row in `payment_terms_templates` (mit `is_default=false`).
- AC12: "Bearbeiten"-Dialog funktioniert: UPDATE label + body, `updated_at` rotiert.
- AC13: "Loeschen"-Confirm-Dialog: Geblockt wenn `is_default=true` mit Hinweis. Andernfalls: DELETE, Audit-Log.
- AC14: "Default setzen"-Klick: Transaction setzt is_default um, UNIQUE-Constraint greift bei Race (Implementation per Sequenz: erst false, dann true).
- AC15: Audit-Log enthaelt alle Operations: action='create'/'update'/'delete', entity_type='payment_terms_template', entity_id, actor_id=userId.
- AC16: Settings-Sidebar-Nav existiert mit "Branding"-Link (existing) + "Zahlungsbedingungen"-Link (neu). Active-State korrekt highlightet.
- AC17: TypeScript-Build (`npm run build`) gruen.
- AC18: Vitest (`npm run test`) gruen — keine Regressions auf existing Tests.
- AC19: ESLint (`npm run lint`) gruen.

## Dependencies

- V5.5 SLC-551 (`proposals`-Schema-Foundation, MIG-026 appliziert)
- V5.3 SLC-531 (`/settings/branding` Page existiert, dient als Layout-Vorlage)
- Coolify-DB Zugriff via SSH (Hetzner Business System Server)
- `.claude/rules/sql-migration-hetzner.md` Procedure

## Risks

- **Risk:** MIG-027 schlaegt fehl wegen Constraint-Konflikt mit bestehenden `meetings`-Daten (z.B. wenn `briefing_generated_at` als Spalte schon existiert von versuchtem Test-Run).
  Mitigation: `IF NOT EXISTS` auf allen ALTER TABLE + CREATE TABLE. Vor Apply: `\d meetings` und `\d user_settings` checken. Bei Konflikt: manueller DROP der Test-Spalten.
- **Risk:** Idempotenz-Smoke (zweiter Apply-Run) bricht weil Seed-INSERT ohne `ON CONFLICT DO NOTHING`.
  Mitigation: Migration explizit mit `ON CONFLICT (label) DO NOTHING` (oder `ON CONFLICT DO NOTHING`) im Seed-INSERT. Erst-Run: `INSERT INTO payment_terms_templates (label, body, is_default) VALUES (...) ON CONFLICT DO NOTHING;` — bei zweitem Run keine Duplikate.
- **Risk:** UNIQUE-Index `WHERE is_default=true` schlaegt fehl wenn beim ersten `setDefault` keine `is_default=false`-Konvertierung der bestehenden Default-Row passiert (Race im Default-Setter).
  Mitigation: Server Action `setDefaultPaymentTermsTemplate` macht das Update in Sequenz: erst `UPDATE ... SET is_default=false WHERE is_default=true`, dann `UPDATE ... SET is_default=true WHERE id=$1`. Bei sehr seltener Race (zwei parallele Calls): zweiter Call gibt sauberen Constraint-Violation-Error. UI-Feedback "Default bereits gesetzt".
- **Risk:** `/settings/payment-terms` Page rendert mit veralteten Daten nach Mutation (kein Cache-Invalidation).
  Mitigation: Server Actions nutzen `revalidatePath('/settings/payment-terms')` oder Client-Component-Refetch nach Action-Success.
- **Risk:** Settings-Sidebar-Nav bricht V5.3 `/settings/branding` Layout (existing Page).
  Mitigation: Layout-File ist NEU (`/settings/layout.tsx`) — bestehende Branding-Page ist `/settings/branding/page.tsx`. Layout-Wrapper rendert `children` einfach drumherum.
- **Risk:** Loesch-Block bei `is_default=true` ist UI-only — DB-seitig laesst sich Default-Template loeschen wenn keine Konkurrenz.
  Mitigation: Server Action checkt `if (template.is_default) return { ok: false, error: 'Setze zuerst ein anderes Template als Default' }`. Defense-in-Depth.
- **Risk:** Audit-Log Entity-Type-String `payment_terms_template` ist neu, koennte bestehende Audit-Reports/UIs verwirren.
  Mitigation: Generic-Type-String, kein Filter-Konflikt. Bestehende Audit-Reports zeigen zusaetzlichen Type — Whitelist im Audit-UI ggf. spaeter erweitern (V7+).

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `sql/027_v56_payment_terms_and_briefing.sql` | NEU: Vollstaendige MIG-027-Migration (5 Schema-Aenderungen + Seed) |
| `cockpit/src/app/(app)/settings/payment-terms/page.tsx` | NEU: Settings-Page mit Liste + CRUD-UI |
| `cockpit/src/app/(app)/settings/payment-terms/actions.ts` | NEU: 5 Server Actions (list/create/update/delete/setDefault) |
| `cockpit/src/app/(app)/settings/layout.tsx` | NEU oder MODIFY: Settings-Sidebar-Nav-Wrapper |
| `cockpit/src/lib/types/proposal-payment.ts` | NEU: PaymentTermsTemplate-Type |
| `docs/MIGRATIONS.md` | MODIFY: MIG-027 Date-Stempel auf Apply-Date |
| `docs/STATE.md` | Phase-Update + naechster Slice |
| `slices/INDEX.md` | SLC-561 Status `planned -> done` |
| `planning/backlog.json` | BL-413 Status `planned -> done` |

## QA Focus

- **Build + Test:**
  - `npm run build` gruen
  - `npm run test` gruen
  - `npm run lint` gruen
- **MIG-027-Apply:**
  - Erst-Apply auf Hetzner ohne Fehler
  - Idempotenz-Smoke: zweiter Run ohne Duplikat-Errors
  - Schema-Verifikation per `\d`-Befehlen
  - V5.5-Proposals bleiben unveraendert (`SELECT id, status FROM proposals LIMIT 5;` zeigt alte Daten)
  - V5.5-`proposal_items` bleibt unveraendert
- **Server-Actions:**
  - `listPaymentTermsTemplates`: liefert Array mit Seed-Template
  - `createPaymentTermsTemplate`: legt Row an, `is_default=false`
  - `updatePaymentTermsTemplate`: Label + Body geaendert, `updated_at` rotiert
  - `deletePaymentTermsTemplate`: Default-Block greift, andere loeschbar
  - `setDefaultPaymentTermsTemplate`: Default-Switch sauber
- **Default-Race-Smoke:**
  - 2 parallele `setDefaultPaymentTermsTemplate`-Calls (DevTools-Test): erster gewinnt, zweiter bekommt klaren Fehler oder UI-Feedback
- **Page-UI-Smoke:**
  - `/settings/payment-terms` lautet auf
  - Seed-Template "30 Tage netto" sichtbar mit Default-Badge
  - "+ Neue Vorlage": Dialog oeffnet, Save funktioniert, neue Card erscheint
  - "Bearbeiten": Dialog mit vorbefuellten Werten, Save aktualisiert Card
  - "Loeschen" auf Default-Template: Hinweis erscheint, kein DELETE
  - "Loeschen" auf nicht-Default: Confirm-Dialog → DELETE, Card verschwindet
  - "Default setzen" auf Non-Default: Default-Badge wandert
- **Settings-Sidebar-Nav-Smoke:**
  - `/settings/branding` zeigt Sidebar mit aktiviertem "Branding"-Item
  - `/settings/payment-terms` zeigt Sidebar mit aktiviertem "Zahlungsbedingungen"-Item
  - Klick zwischen den Tabs funktioniert
  - V5.3-Branding-Page rendert weiterhin korrekt (kein Layout-Bruch)
- **Audit-Log-Smoke:**
  - Nach Create/Update/Delete: `SELECT * FROM audit_log WHERE entity_type='payment_terms_template' ORDER BY created_at DESC LIMIT 10;` zeigt Eintraege
- **V5.5-Regression-Smoke:**
  - `/proposals/[id]/edit` Workspace lautet auf, "PDF generieren" funktioniert wie zuvor
  - Composing-Studio Anhang-Picker funktioniert
- **REL-022-Vorbereitung (optional):**
  - `docs/RELEASES.md` REL-022-Section als `planned`-Stub anlegen (Final-Release-Notes spaeter in SLC-564 Final-Check)

## Micro-Tasks

### MT-1: MIG-027 SQL-File schreiben
- Goal: Vollstaendige Migration nach MIG-027-Spec
- Files: `sql/027_v56_payment_terms_and_briefing.sql` (NEU)
- Expected behavior:
  - Alle 5 Schema-Aenderungen aus MIG-027 (MIGRATIONS.md):
    1. `CREATE TABLE IF NOT EXISTS payment_terms_templates (...)` + UNIQUE-Index + RLS + Seed
    2. `CREATE TABLE IF NOT EXISTS proposal_payment_milestones (...)` + Indizes + UNIQUE + RLS
    3. `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS skonto_percent ...` + skonto_days + CHECK-Constraints
    4. `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS briefing_generated_at TIMESTAMPTZ` + Partial-Index
    5. `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS briefing_trigger_minutes ...` + briefing_push_enabled + briefing_email_enabled
  - Idempotent: alle CREATE/ALTER mit `IF NOT EXISTS`, Seed mit `ON CONFLICT DO NOTHING`
  - Header-Comment mit Datum + DEC-Referenzen
- Verification: SQL-Syntax-Check `psql --no-psqlrc -c "BEGIN; \i sql/027_*.sql; ROLLBACK;"` lokal (oder direkt auf Hetzner mit Rollback-Test). File-Lint `wc -l` ~80-120 Zeilen.
- Dependencies: keine

### MT-2: Apply MIG-027 auf Hetzner
- Goal: Migration auf Production-DB ausfuehren
- Files: keine (DB-Action)
- Expected behavior:
  - User-Aktion mit User-Anwesenheit (Hetzner-SSH erforderlich, agent-driven nach `.claude/rules/sql-migration-hetzner.md`)
  - Container-Name ermitteln: `docker ps --format "{{.Names}}" | grep supabase-db`
  - Base64-Transfer: `base64 -w 0 sql/027_v56_payment_terms_and_briefing.sql` lokal -> Echo auf Server in `/tmp/`
  - Apply: `docker exec -i <container> psql -U postgres -d postgres < /tmp/027_*.sql`
  - Verifikation: `\d payment_terms_templates`, `\d proposal_payment_milestones`, `\d proposals`, `\d meetings`, `\d user_settings` auf Hetzner-Konsole
  - Idempotenz-Smoke: zweiter Apply-Run ohne Fehler
- Verification: alle 5 `\d`-Outputs zeigen erwartete Spalten + Indizes. `SELECT * FROM payment_terms_templates;` zeigt Seed-Row "30 Tage netto" mit `is_default=true`.
- Dependencies: MT-1

### MT-3: PaymentTermsTemplate-Type + listPaymentTermsTemplates Server Action
- Goal: Type-Definition + Read-Action
- Files: `cockpit/src/lib/types/proposal-payment.ts` (NEU), `cockpit/src/app/(app)/settings/payment-terms/actions.ts` (NEU)
- Expected behavior:
  - Type `PaymentTermsTemplate` exportiert: `{ id, label, body, is_default, created_at, updated_at }`
  - Action `listPaymentTermsTemplates(): Promise<PaymentTermsTemplate[]>` — Auth-Check, SELECT alle Rows ORDER BY `is_default DESC, label ASC`
  - Server-Action-Default-Pattern (`'use server'` directive)
- Verification: TypeScript-Build gruen. DevTools-Smoke: Action-Call liefert Seed-Template-Array.
- Dependencies: MT-2

### MT-4: createPaymentTermsTemplate + updatePaymentTermsTemplate Server Actions
- Goal: Mutate-Actions fuer Anlegen + Editieren
- Files: `cockpit/src/app/(app)/settings/payment-terms/actions.ts` (MODIFY)
- Expected behavior:
  - `createPaymentTermsTemplate({label, body})`:
    - Validation: `label.length > 0 && label.length <= 100`, `body.length > 0`
    - INSERT mit `is_default=false`, returnt `{ ok: true, id }` oder `{ ok: false, error }`
    - Audit-Log: action='create', entity_type='payment_terms_template'
    - revalidatePath('/settings/payment-terms')
  - `updatePaymentTermsTemplate({id, label, body})`:
    - Gleiche Validation
    - UPDATE label + body + `updated_at=now()`
    - Audit-Log: action='update', entity_type='payment_terms_template'
    - revalidatePath
- Verification: DevTools-Smoke beide Actions. Audit-Log-Eintraege da.
- Dependencies: MT-3

### MT-5: deletePaymentTermsTemplate + setDefaultPaymentTermsTemplate Server Actions
- Goal: Delete + Default-Toggle
- Files: `cockpit/src/app/(app)/settings/payment-terms/actions.ts` (MODIFY)
- Expected behavior:
  - `deletePaymentTermsTemplate({id})`:
    - SELECT row, wenn `is_default=true`: returnt `{ ok: false, error: 'Setze zuerst ein anderes Template als Default' }`
    - DELETE, Audit-Log: action='delete'
    - revalidatePath
  - `setDefaultPaymentTermsTemplate({id})`:
    - In Transaction: `UPDATE payment_terms_templates SET is_default=false WHERE is_default=true; UPDATE payment_terms_templates SET is_default=true WHERE id=$1;`
    - Audit-Log: action='update', context='Set as default'
    - revalidatePath
- Verification: DevTools-Smoke. Default-Block-Test: Delete auf Default-Row blockiert. Default-Switch-Test: Badge wandert.
- Dependencies: MT-4

### MT-6: Settings-Sidebar-Nav-Layout
- Goal: Gemeinsamer Layout-Wrapper fuer alle `/settings/*`-Pages
- Files: `cockpit/src/app/(app)/settings/layout.tsx` (NEU oder MODIFY)
- Expected behavior:
  - Layout-Component mit Sidebar (links) + Children-Slot (rechts)
  - Sidebar-Items:
    - "Branding" -> `/settings/branding`
    - "Zahlungsbedingungen" -> `/settings/payment-terms`
    - "Briefing" -> `/settings/briefing` (rendert ab SLC-564, in SLC-561 als TODO-Item oder verstecktes/disabled-Item)
  - Active-State via `usePathname` (`next/navigation`) — aktives Item bekommt visuell hervorgehobenen Style (z.B. bg-muted)
  - shadcn-Pattern: `<aside>` + `<nav>` + `<Link>`s, Tailwind-styled
- Verification: Browser-Smoke: `/settings/branding` und `/settings/payment-terms` rendern beide mit Sidebar. Active-Item korrekt highlightet.
- Dependencies: MT-5

### MT-7: `/settings/payment-terms` Page mit CRUD-UI
- Goal: User-facing CRUD-Interface
- Files: `cockpit/src/app/(app)/settings/payment-terms/page.tsx` (NEU)
- Expected behavior:
  - Server-Component (oder Client-Component mit useEffect-Fetch via Action)
  - Headline + Beschreibung
  - Liste aller Templates als shadcn-`<Card>`s mit allen Action-Buttons
  - Default-Badge: `<Badge variant="default">Default</Badge>` wenn `is_default=true`
  - "Bearbeiten" + "Loeschen"-Buttons mit Icon (`Pencil`, `Trash`)
  - "Default setzen"-Button: ghost-style, klein
  - Top-rechts: "+ Neue Vorlage" Primary-Button
  - 3 Dialoge:
    - Create-Dialog: Label-Input (max-100 Char) + Body-Textarea (min-10 Char)
    - Edit-Dialog: gleiches Form, vorbefuellt
    - Confirm-Delete: shadcn-`<AlertDialog>` mit Description "{label}" + Delete-Button (destructive)
  - Action-Feedback via `<Toast>` (existing aus shadcn-Setup)
- Verification: Browser-Smoke: alle CRUD-Pfade durchlaufen
- Dependencies: MT-6

### MT-8: V5.5-Regression-Smoke + Cockpit-Records-Update
- Goal: Sicherstellen dass V5.5-Pfade unbetroffen + Tracking-Files aktualisieren
- Files: `slices/INDEX.md` (MODIFY), `planning/backlog.json` (MODIFY), `docs/STATE.md` (MODIFY), `docs/MIGRATIONS.md` (MODIFY)
- Expected behavior:
  - V5.5-Smoke: `/proposals/{id}/edit` Workspace lautet auf, "PDF generieren" Button funktioniert, Composing-Studio Anhang-Picker zeigt Proposals
  - `slices/INDEX.md`: SLC-561 Status `planned -> done`
  - `planning/backlog.json`: BL-413 Status `planned -> done`
  - `docs/STATE.md`: Current Focus auf "V5.6 SLC-561 done, naechste SLC-562", Phase auf `implementing`
  - `docs/MIGRATIONS.md`: MIG-027 Date-Stempel von `planned` auf Apply-Date
- Verification: Cockpit-Refresh nach Commit zeigt SLC-561 done, Phase implementing, BL-413 done. V5.5-Pfade per Browser-Smoke unbetroffen.
- Dependencies: MT-1..MT-7

## Schaetzung

~3-4h:
- MT-1 (MIG-027 SQL-File schreiben): ~30min
- MT-2 (Apply auf Hetzner): ~20min (inkl. SSH + Verifikation)
- MT-3 (Type + listAction): ~20min
- MT-4 (create/update Actions): ~30min
- MT-5 (delete/setDefault Actions): ~30min
- MT-6 (Sidebar-Layout): ~30min
- MT-7 (Page mit CRUD-UI): ~45-60min
- MT-8 (V5.5-Smoke + Records-Update): ~20min
- Buffer + Bug-Fix: ~30min
