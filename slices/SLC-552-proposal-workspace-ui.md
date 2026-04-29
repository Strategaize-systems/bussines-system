# SLC-552 — Angebot-Workspace UI (3-Panel + Position-Liste + Editor + HTML-Live-Preview)

## Meta
- Feature: FEAT-552
- Priority: High
- Status: planned
- Created: 2026-04-29

## Goal

Vollbild-Schreibumgebung `/proposals/[id]/edit` mit 3-Panel-Layout analog V5.3 Composing-Studio. Position-Liste links (Drag&Drop, Add via Product-Picker, Inline-Edit), Editor mitte (Title/Empfaenger/Tax-Rate/Valid-Until/Payment-Terms/Notes), HTML-Live-Preview rechts (debounced, aktualisiert on Form-Change). Server Actions fuer Item-CRUD + Auto-Save (DEC-106 HTML-Approximation, kein PDF-Render in dieser Slice). Drei Einstiegspunkte: Deal-Workspace Quickaction, Pipeline-Card-Kontextmenue, `/proposals`-Listing "Bearbeiten"-Button auf Drafts.

## Scope

- **Route + Layout:**
  - `cockpit/src/app/(app)/proposals/[id]/edit/page.tsx` (Server Component) ruft `getProposalForEdit(id)` aus SLC-551, leitet bei `null` redirect zu `/proposals`.
  - `cockpit/src/app/(app)/proposals/[id]/edit/proposal-workspace.tsx` (Client Component, "use client") rendert 3-Panel via CSS-Grid analog V5.3-Pattern aus `compose-studio.tsx`.
  - Mobile-Tabs in derselben Route (Mobile = Stacked Tabs "Positionen / Editor / Vorschau") via responsive Tailwind-Breakpoints, Pattern aus V5.3 (DEC-093).
- **Panel links — Position-Liste (`<ProposalPositionList>`):**
  - Drag-and-Drop via `@dnd-kit/sortable` (V5.5-Architecture-Dependency, package.json-Add bei Bedarf).
  - "Produkt hinzufuegen"-Button oeffnet `<ProposalProductPicker>` Dialog: Liste aus `products` (Filter `status='active'`), Suchfeld, Klick fuegt Position hinzu (Snapshot von `products` wird in `proposal_items` geschrieben).
  - Pro Item: Snapshot-Name (Read-only-Anzeige), Inline-editierbar Menge / Einzelpreis-Net / Discount-%, Zwischensumme (live berechnet `quantity * unit_price_net * (1 - discount_pct/100)`), Loeschen-Icon-Button.
  - Footer-Block: Subtotal Net, Steuer (auf `proposal.tax_rate`), Total Brutto (alle live berechnet).
- **Panel mitte — Editor (`<ProposalEditor>`):**
  - React-Hook-Form + Zod-Schema (`proposalEditSchema`).
  - Felder: Title (Text), Empfaenger-Combobox (Contact aus Deal-Kontext, optional Company-Switch), Tax-Rate-Dropdown (0/7/19), `valid_until` Date-Picker (Default +30d aus Branding), `payment_terms` Textarea (Default aus Branding), `notes` Textarea (intern, nicht im PDF).
  - Auto-Save debounced 500ms ruft `updateProposal` Server Action.
  - Versions-Header: "V{version}" Badge + (wenn `parent_proposal_id`) Link auf "Vorgaenger V{n-1}".
- **Panel rechts — HTML-Live-Preview (`<ProposalPreviewPanel>`):**
  - HTML-Approximation des PDF-Layouts (Header + Position-Tabelle + Summary + Footer) — DEC-106.
  - Debounced 250ms Re-Render bei Form-Change.
  - User-Hinweis-Banner: "Vorschau (HTML) — finales PDF kann minimal abweichen".
  - "PDF generieren"-Button als Placeholder mit `disabled` + Tooltip "Verfuegbar in V5.5 SLC-553" (in dieser Slice noch nicht funktional — der echte Render kommt in SLC-553).
  - "Neue Version erstellen"-Button als Placeholder mit `disabled` + Tooltip "Verfuegbar in V5.5 SLC-554".
- **Server Actions (`cockpit/src/app/(app)/proposals/actions.ts` Erweiterung):**
  - `updateProposal(proposalId, patch: Partial<...>)` — Partial-Update, RLS-Guard (User darf nur eigene), Audit-Eintrag bei nicht-trivialen Aenderungen (Title/Tax-Rate/Valid-Until/Payment-Terms; nicht bei Auto-Save-Notes).
  - `addProposalItem(proposalId, productId, quantity)` — liest aktuellen `products`-Row, schreibt `proposal_items` mit Snapshot (`snapshot_name`, `snapshot_description`, `snapshot_unit_price_at_creation`), `position_order = MAX+1`, `unit_price_net = product.standard_price`.
  - `updateProposalItem(itemId, patch: Partial<...>)` — Inline-Edit von Menge/Einzelpreis/Discount. Audit-relevant.
  - `removeProposalItem(itemId)` — DELETE, kein Soft-Delete (Cascade aus `proposal_id` reicht nicht hier — explicit DELETE).
  - `reorderProposalItems(proposalId, orderedItemIds: string[])` — UPDATE `position_order` per Index, in einer Transaction.
- **Brutto/Netto-Live-Berechnung im Browser:**
  - Pure-Function Helper `cockpit/src/lib/proposal/calc.ts`: `calculateTotals(items, taxRate) => { subtotal, tax, total }`. Cent-genau (NUMERIC-Pattern: `Math.round(value * 100) / 100`).
  - Unit-Tests fuer Edge-Cases: leere Items, 0% Tax, 100% Discount, mehrere Items.
  - Konsistenz-Hinweis: gleiche Funktion wird in SLC-553 PDF-Renderer als auch in `<ProposalPreviewPanel>` verwendet.
- **Einstiegspunkte:**
  - Deal-Workspace `cockpit/src/app/(app)/deals/[id]/page.tsx` Quickaction-Bar: neuer Button "Angebot erstellen" → ruft `createProposal({deal_id, contact_id, company_id})` aus SLC-551 → `router.push('/proposals/' + newId + '/edit')`.
  - Pipeline-Card `cockpit/src/app/(app)/pipeline/[slug]/page.tsx` Kontextmenue: neuer Eintrag "Angebot erstellen" → gleiche Logik.
  - `/proposals`-Tabelle `cockpit/src/app/(app)/proposals/proposals-client.tsx`: neuer "Bearbeiten"-Button auf Status `draft` → Link auf `/proposals/<id>/edit`.
- **HTML-Preview-Approximation:**
  - Komponenten-Datei `cockpit/src/components/proposal/proposal-html-preview.tsx`
  - Pure-Render: Briefkopf-Block (Logo aus `branding.logo_path` + Markenfarbe-Linie), Empfaenger-Block, Angebot-Header (Title + V{n} + Datum + Gueltig bis), Position-Tabelle mit Tailwind-Styling, Summary, Footer.
  - KEIN Server-PDF-Render hier (DEC-106 — das ist SLC-553).
- Update `docs/STATE.md`, `slices/INDEX.md`, `planning/backlog.json`, `features/INDEX.md`.

## Out of Scope

- PDF-Generierung via pdfmake — Inhalt von SLC-553
- Versionierungs-Server-Action `createProposalVersion` — Inhalt von SLC-554
- Status-Lifecycle UI (Send/Accept/Reject-Buttons) — Inhalt von SLC-554
- Composing-Studio-Hookup — Inhalt von SLC-555
- Mobile-Layout-Polish (Stacked-Tabs sind funktional, aber kein Premium-Polish)
- Collaborative-Editing
- Inline-Produkt-Erstellung aus Angebot
- WYSIWYG-PDF-Editor
- Drag-Reorder via Touch-Devices (`@dnd-kit/sortable` Touch-Sensor optional, zuerst Mouse-only)
- Auto-Save-Konflikt-Resolution (mehrere Tabs gleichzeitig editieren) — Single-User-Single-Tab-Annahme
- Bulk-Item-Operations (Multi-Select-Delete etc.)

## Acceptance Criteria

- AC1: Route `/proposals/[id]/edit` rendert das 3-Panel-Layout (Desktop: Grid 3-Spalten, Mobile: Stacked-Tabs).
- AC2: "Produkt hinzufuegen"-Button oeffnet `<ProposalProductPicker>`, Klick auf Produkt fuegt Position-Item hinzu (Snapshot-Felder + `unit_price_net = standard_price` + `position_order = MAX+1`).
- AC3: Drag-and-Drop einer Position aendert `position_order` in DB (`reorderProposalItems`-Action laeuft, Audit-Eintrag bei Bedarf).
- AC4: Inline-Edit von Menge/Einzelpreis/Discount in einer Position triggert `updateProposalItem` Action; Live-Berechnung von Subtotal/Steuer/Total aktualisiert sich im Footer-Block.
- AC5: Loeschen-Icon einer Position entfernt sie aus DB und UI.
- AC6: Editor-Panel: Auto-Save debounced 500ms persistiert Title/Tax-Rate/Valid-Until/Payment-Terms via `updateProposal`. Visueller Indikator "Gespeichert"/"Speichert..." sichtbar.
- AC7: HTML-Live-Preview rechts aktualisiert sich debounced 250ms bei jeder Aenderung (Title, Items, Tax-Rate, etc.). User-Hinweis "Vorschau (HTML) — finales PDF kann minimal abweichen" sichtbar.
- AC8: Brutto/Netto-Live-Berechnung im Footer + Preview ist Cent-genau (Test-Fall: 3 Items mit Discount 10% + Tax 19% — manuelle Rechen-Verifikation in QA-Report).
- AC9: "Angebot erstellen"-Button im Deal-Workspace funktioniert: ruft `createProposal({deal_id, contact_id, company_id})` aus SLC-551, redirected zu `/proposals/<newId>/edit`.
- AC10: "Angebot erstellen" im Pipeline-Card-Kontextmenue funktioniert (gleiches Verhalten).
- AC11: `/proposals`-Listing zeigt "Bearbeiten"-Button auf Status `draft` — Klick navigiert zu `/proposals/<id>/edit`.
- AC12: Bestehender V2-Modal "Neues Angebot" (`proposal-form.tsx`) ist NICHT entfernt — er bleibt als Fallback fuer V2-Stub-Bestand. UI-Diskussion mit User in QA, nicht in Slice (Default: behalten).
- AC13: Versions-Header zeigt "V{n}" Badge. Wenn `parent_proposal_id`: Link auf Vorgaenger-Edit-Page.
- AC14: TypeScript-Build (`npm run build`) gruen. `npm run test` (Unit-Tests fuer `calc.ts`) gruen.
- AC15: Browser-Smoke (Chrome): ueber alle 3 Einstiegspunkte ein neues Angebot anlegen, 3 Items hinzufuegen, alle Felder befuellen, Drag-Reorder, Loeschen — alle Operationen persistieren in DB.

## Dependencies

- SLC-551 (Schema + `createProposal` + `getProposalForEdit` + Pfad-Helper)
- V5.3 `branding_settings` (Default `payment_terms`, `valid_until`)
- V6 `products` (Picker-Source)
- React-Hook-Form + Zod (existing in V5.3 Composing-Studio)
- `@dnd-kit/sortable` — falls noch nicht installiert: package.json-Add (Architecture-Dependency)
- Composing-Studio-Pattern aus V5.3 (`compose-studio.tsx` als 3-Panel-Vorbild)

## Risks

- **Risk:** `@dnd-kit/sortable` ist nicht in package.json, npm-install + Build-Lock-Update noetig.
  Mitigation: MT-1 prueft package.json + addiert bei Bedarf. Lock-File-Commit in derselben Commit.
- **Risk:** Auto-Save 500ms triggert massive Server-Calls bei schneller Texteingabe.
  Mitigation: lodash-debounce (existing in Compose-Studio) auf 500ms. `updateProposal`-Action ist idempotent. Visueller "Speichert..."-State zeigt Reaktivitaet.
- **Risk:** HTML-Live-Preview-Drift zu finalem PDF (verschiedene Schrift-Metriken).
  Mitigation: User-Hinweis-Banner sichtbar (DEC-106 akzeptierter Tradeoff). SLC-553 PDF-Renderer rundet die "echte" Wahrheit.
- **Risk:** Drag&Drop-Sortierung schreibt `position_order` inkonsistent (Race-Condition mit Auto-Save).
  Mitigation: `reorderProposalItems` ist atomic (Transaction). UI sperrt Position-Liste waehrend des Reorder-Server-Calls (Loading-Overlay).
- **Risk:** Auto-Save schreibt `updateProposal` mit invaliden Werten (z.B. `tax_rate='abc'`).
  Mitigation: Zod-Schema validiert Browser-side + Server-side. Bei Validation-Error: Toast + Auto-Save aussetzen.
- **Risk:** Calculator (`calc.ts`) liefert Floating-Point-Driften bei NUMERIC-Werten.
  Mitigation: Math.round-Pattern (`Math.round(value * 100) / 100`) fuer alle Zwischensummen. Unit-Tests verifizieren Cent-Genauigkeit.
- **Risk:** Pipeline-Kontextmenue-Eintrag "Angebot erstellen" kollidiert mit existierenden Aktionen.
  Mitigation: MT-9 prueft existing Pipeline-Kontextmenue (vermutlich aus SLC-322), addiert nur neuen Eintrag, kein Refactor.
- **Risk:** Bestehender V2-Modal "Neues Angebot" bleibt sichtbar — User verwirrt sich, ob das noch funktioniert.
  Mitigation: AC12 explicit halten. UI-Diskussion in QA: ggf. Modal-Button umbenennen "Schnell-Angebot (legacy)" oder versteckt — aber NICHT in dieser Slice. Default: behalten, kein Touch.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/app/(app)/proposals/[id]/edit/page.tsx` | NEU: Server Component Wrapper |
| `cockpit/src/app/(app)/proposals/[id]/edit/proposal-workspace.tsx` | NEU: Client Workspace 3-Panel |
| `cockpit/src/app/(app)/proposals/[id]/edit/position-list.tsx` | NEU: Position-Liste mit Drag&Drop |
| `cockpit/src/app/(app)/proposals/[id]/edit/proposal-editor.tsx` | NEU: Editor-Panel (Form + Auto-Save) |
| `cockpit/src/app/(app)/proposals/[id]/edit/preview-panel.tsx` | NEU: HTML-Live-Preview-Wrapper |
| `cockpit/src/components/proposal/proposal-product-picker.tsx` | NEU: Product-Picker-Dialog |
| `cockpit/src/components/proposal/proposal-html-preview.tsx` | NEU: HTML-Approximation des PDF-Layouts |
| `cockpit/src/lib/proposal/calc.ts` | NEU: Pure-Function `calculateTotals` |
| `cockpit/src/lib/proposal/calc.test.ts` | NEU: Unit-Tests fuer `calc.ts` |
| `cockpit/src/lib/proposal/zod-schemas.ts` | NEU: Zod-Schemas fuer Form-Validierung |
| `cockpit/src/app/(app)/proposals/actions.ts` | MODIFY: `updateProposal`, `addProposalItem`, `updateProposalItem`, `removeProposalItem`, `reorderProposalItems` |
| `cockpit/src/app/(app)/deals/[id]/page.tsx` | MODIFY: Quickaction "Angebot erstellen" |
| `cockpit/src/app/(app)/pipeline/[slug]/page.tsx` | MODIFY: Kontextmenue-Eintrag (sucht existing pattern aus SLC-322) |
| `cockpit/src/app/(app)/proposals/proposals-client.tsx` | MODIFY: "Bearbeiten"-Button auf Drafts |
| `package.json`, `package-lock.json` | MODIFY: `@dnd-kit/sortable` (falls nicht vorhanden) |
| `docs/STATE.md` | Slice-Status-Update |
| `slices/INDEX.md` | SLC-552 anlegen |
| `planning/backlog.json` | BL-408 (SLC-552 Tracking) anlegen |

## QA Focus

- **Build + Lint:**
  - `npm run build` gruen
  - `npm run lint` gruen (V5.4 ESLint-Hook-Order-Pattern beachten — Hooks unconditional am Top-Level)
  - `npm run test` gruen (Unit-Tests fuer `calc.ts`)
- **Calculator-Cent-Genauigkeit:**
  - Test-Fall A: 1 Item, qty=3, price=100.50, discount=0%, tax=19% → subtotal 301.50, tax 57.29 (gerundet), total 358.79
  - Test-Fall B: 2 Items, qty=2/1, price=50/75, discount=10%/0%, tax=7% → manuelle Rechen-Verifikation
  - Test-Fall C: leere Items → 0/0/0
- **Browser-Smoke (Chrome) — Drei-Einstiegspunkt-Test:**
  - Einstiegspunkt 1: Deal-Workspace → "Angebot erstellen" → Workspace oeffnet sich
  - Einstiegspunkt 2: Pipeline-Card-Kontextmenue → "Angebot erstellen" → Workspace oeffnet sich
  - Einstiegspunkt 3: `/proposals`-Liste → "Bearbeiten" auf Draft-Row → Workspace oeffnet sich
- **Position-CRUD-Smoke:**
  - 3 Items hinzufuegen via Product-Picker — DB enthaelt Items mit Snapshot-Feldern
  - Drag-Reorder Item 1 ↔ Item 3 — `position_order` in DB konsistent
  - Inline-Edit Menge=5 in Item 2 — `updateProposalItem`-Action laeuft, Live-Berechnung korrekt
  - Loeschen Item 2 — DB-Row weg, Position-Liste rendert weiter
- **Editor-Auto-Save-Smoke:**
  - Title aendern → 500ms warten → "Gespeichert"-State sichtbar → DB-Row aktualisiert
  - Tax-Rate von 19% auf 7% → Live-Berechnung im Footer + Preview aktualisiert sich
  - Valid-Until auf +60d aendern → DB-Row aktualisiert
- **HTML-Live-Preview-Smoke:**
  - Title-Tippen aktualisiert Preview debounced 250ms
  - User-Hinweis-Banner "Vorschau (HTML) — finales PDF kann minimal abweichen" sichtbar
  - "PDF generieren"-Button disabled mit Tooltip "Verfuegbar in V5.5 SLC-553"
  - "Neue Version erstellen"-Button disabled mit Tooltip "Verfuegbar in V5.5 SLC-554"
- **Versions-Header-Smoke:**
  - Initial: "V1" Badge sichtbar, kein Vorgaenger-Link
  - Bei `parent_proposal_id != null`: "V{n}" + Vorgaenger-Link sichtbar (Test-Setup: manueller SQL-Insert eines V2-Stubs)
- **V2-Modal-Bestand:**
  - `/proposals` weiterhin mit "Neues Angebot"-Modal (V2) funktional
  - Audit-Note in QA-Report: ist der V2-Modal noch sinnvoll? (User-Diskussion fuer V5.5.x oder V5.6+ delegieren)
- **Mobile-Smoke:**
  - Browser-DevTools mobile-viewport: Stacked-Tabs sichtbar, Switching-Tabs zeigt jeweiliges Panel

## Micro-Tasks

### MT-1: Pre-Check `@dnd-kit/sortable` + Zod-Schemas
- Goal: package.json-State + Form-Validierung-Schemas
- Files: `package.json`, `package-lock.json`, `cockpit/src/lib/proposal/zod-schemas.ts`
- Expected behavior:
  - `package.json` checken: ist `@dnd-kit/sortable` da? Wenn nicht: `npm install @dnd-kit/sortable @dnd-kit/core` (~`^8.0.0`)
  - Lock-File commit in derselben Commit
  - `zod-schemas.ts` exportiert `proposalEditSchema` (title required, tax_rate enum [0,7,19], valid_until DateString, payment_terms optional, notes optional) + `proposalItemSchema` (quantity > 0, unit_price_net >= 0, discount_pct in 0-100)
- Verification: `npm run build` gruen, Schema-Imports laufen
- Dependencies: SLC-551 abgeschlossen

### MT-2: Pure-Function Calculator + Unit-Tests
- Goal: Cent-genaue Brutto/Netto-Berechnung als Single-Source-of-Truth
- Files: `cockpit/src/lib/proposal/calc.ts`, `cockpit/src/lib/proposal/calc.test.ts`
- Expected behavior:
  - Export `calculateLineTotal(qty: number, unitPrice: number, discountPct: number): number` — line-net mit `Math.round((qty * price * (1 - discount/100)) * 100) / 100`
  - Export `calculateTotals(items: { quantity, unit_price_net, discount_pct }[], taxRatePct: number): { subtotal, tax, total }` — alle Cent-genau gerundet
  - Unit-Tests fuer 3+ Edge-Cases (leere Items, 100% discount, mehrere Items mit verschiedenen Discounts, Tax 0%, Tax 19%)
- Verification: `npm run test -- calc` gruen
- Dependencies: none

### MT-3: Server Actions `addProposalItem`, `updateProposalItem`, `removeProposalItem`, `reorderProposalItems`, `updateProposal`
- Goal: Item-CRUD + Proposal-Update via Server Actions
- Files: `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY)
- Expected behavior:
  - `addProposalItem(proposalId, productId, quantity=1)`: SELECT `products` (existing + active), INSERT in `proposal_items` mit `position_order = (SELECT COALESCE(MAX(position_order), 0) + 1 FROM proposal_items WHERE proposal_id=...)`, Snapshot-Felder kopieren (`snapshot_name = product.name`, `snapshot_description = product.description`, `snapshot_unit_price_at_creation = product.standard_price`), `unit_price_net = product.standard_price`, `discount_pct = 0`
  - `updateProposalItem(itemId, patch)`: Partial-Update (nur quantity/unit_price_net/discount_pct), RLS-Guard implicit, Audit-Eintrag bei Aenderung
  - `removeProposalItem(itemId)`: DELETE, kein Soft-Delete
  - `reorderProposalItems(proposalId, orderedItemIds: string[])`: Transaction mit UPDATE pro Item (Index → `position_order`)
  - `updateProposal(proposalId, patch)`: Partial-Update (title/tax_rate/valid_until/payment_terms/notes), Audit-Eintrag bei nicht-trivialen Aenderungen (Notes ohne Audit), `revalidatePath('/proposals/' + proposalId + '/edit')`
  - Alle Actions returnieren `{ ok: true } | { ok: false, error: string }`
- Verification: Server-Action-Smoke per DevTools/Postman: alle 5 Actions laufen, DB-Effekte korrekt
- Dependencies: SLC-551, MT-1

### MT-4: `<ProposalPositionList>` Komponente
- Goal: Position-Liste mit Drag&Drop, Add, Inline-Edit, Loeschen
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/position-list.tsx`, `cockpit/src/components/proposal/proposal-product-picker.tsx`
- Expected behavior:
  - Props: `{ proposalId, items, taxRate, onItemsChange }`
  - Drag&Drop via `@dnd-kit/sortable` — `<SortableContext>` + `<SortableItem>` pro Position, OnDragEnd ruft `reorderProposalItems`-Action und mutiert lokalen State optimistisch
  - "Produkt hinzufuegen"-Button oeffnet `<ProposalProductPicker>`-Dialog (existing shadcn `<Dialog>`-Pattern)
  - Picker zeigt Liste aus `products` (Filter `status='active'`, sortiert nach `name`), Suchfeld, Klick ruft `addProposalItem` und schliesst Dialog
  - Pro Position: Snapshot-Name (Read-only-Anzeige + Tooltip "Snapshot vom $TIMESTAMP"), Inline-editable `<Input type=number>` fuer Menge / Einzelpreis / Discount-%, Zwischensumme rechts (live via `calculateLineTotal`), Loeschen-Icon-Button (Confirm-Dialog "Position entfernen?")
  - Footer-Block: Subtotal Net, Steuer ($taxRate%), Total Brutto (live via `calculateTotals`)
  - Inline-Edit triggert `updateProposalItem` debounced 500ms
- Verification: Browser-Smoke: Add+Reorder+Edit+Delete laufen
- Dependencies: MT-2, MT-3

### MT-5: `<ProposalEditor>` Komponente (Form + Auto-Save)
- Goal: Editor-Panel mit React-Hook-Form + Zod
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/proposal-editor.tsx`
- Expected behavior:
  - Props: `{ proposal, deal, company, contact, onProposalChange }`
  - React-Hook-Form mit `useForm<ProposalEdit>({ resolver: zodResolver(proposalEditSchema), defaultValues: ... })`
  - Felder via shadcn-Components: `<Input>` Title, `<Combobox>` Empfaenger (Contact aus deal.contacts), `<Select>` Tax-Rate (0/7/19), `<DatePicker>` Valid-Until, `<Textarea>` Payment-Terms, `<Textarea>` Notes
  - Auto-Save: `useEffect` watch alle Felder, lodash-debounce 500ms, ruft `updateProposal(proposalId, patch)` mit nur den geaenderten Feldern
  - State `saveStatus: 'idle' | 'saving' | 'saved' | 'error'` — visueller Indikator oben rechts
  - Versions-Header: "V{proposal.version}" Badge + (wenn `parent_proposal_id`) `<Link>` "Vorgaenger V{n-1}"
- Verification: Browser-Smoke: Felder editieren, 500ms warten, "Gespeichert"-State, DB-Row aktualisiert
- Dependencies: MT-1, MT-3

### MT-6: `<ProposalHtmlPreview>` Komponente (HTML-Approximation)
- Goal: HTML-Layout das dem PDF nahekommt — debounced live update
- Files: `cockpit/src/components/proposal/proposal-html-preview.tsx`, `cockpit/src/app/(app)/proposals/[id]/edit/preview-panel.tsx`
- Expected behavior:
  - `<ProposalHtmlPreview>` Pure-Render Komponente
  - Props: `{ proposal, items, branding, deal, company, contact }`
  - Render-Struktur:
    - Briefkopf: Logo (aus `branding.logo_path` per Storage-Public-URL) + Markenfarbe-Linie (CSS `border-bottom`)
    - Empfaenger-Block: `company.name`, `contact.first_name + last_name`, `company.address`
    - Angebot-Header: Title + V{n} + Datum + "Gueltig bis: $valid_until"
    - Position-Tabelle: Pos | Produkt | Menge | Einzelpreis | Discount | Summe (Tailwind-Tabelle mit `border` + `divide-y`)
    - Summary: Subtotal, Steuer ($rate%), Total
    - Konditionen-Block: `payment_terms` als prerender-Text
    - Footer: `branding.footer_markdown` rendered via existing markdown-Renderer (V5.3-Pattern), Test-Mode-Zeile wenn `INTERNAL_TEST_MODE_ACTIVE='true'`
  - `<PreviewPanel>` Wrapper: User-Hinweis-Banner oben "Vorschau (HTML) — finales PDF kann minimal abweichen", `<ProposalHtmlPreview>` darunter, "PDF generieren"-Button (disabled, Tooltip "SLC-553"), "Neue Version erstellen"-Button (disabled, Tooltip "SLC-554")
  - Debounce 250ms via `useDeferredValue` oder lodash-debounce
- Verification: Browser-Smoke: jede Form-Aenderung aktualisiert Preview innerhalb 300ms
- Dependencies: MT-2

### MT-7: `<ProposalWorkspace>` 3-Panel-Layout + Server Component Wrapper
- Goal: Compose der 3 Panels in 3-Spalten-Grid + Mobile-Tabs
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/page.tsx`, `cockpit/src/app/(app)/proposals/[id]/edit/proposal-workspace.tsx`
- Expected behavior:
  - `page.tsx` (Server Component): ruft `getProposalForEdit(id)`, redirect zu `/proposals` bei `null`, sonst `<ProposalWorkspace payload={...} />` rendern
  - `proposal-workspace.tsx` ("use client"): State `proposal`, `items`, debounced-Form-State; CSS-Grid `lg:grid-cols-[300px_1fr_500px]` (Position-Liste links, Editor mitte, Preview rechts), Mobile `<Tabs>`-Component analog `compose-studio.tsx`
  - State-Sync: PositionList-onChange aktualisiert items-State; Editor-onChange aktualisiert proposal-State; PreviewPanel sieht beides
- Verification: Browser-Smoke: Layout in Desktop + Mobile sichtbar
- Dependencies: MT-4, MT-5, MT-6

### MT-8: Einstiegspunkt 1 — Deal-Workspace Quickaction "Angebot erstellen"
- Goal: Quickaction-Button im Deal-Workspace
- Files: `cockpit/src/app/(app)/deals/[id]/page.tsx` (MODIFY) ggf. inkl. Sub-Component (Quickaction-Bar)
- Expected behavior:
  - Identifiziere existing Quickaction-Bar-Komponente (vermutlich `cockpit/src/components/deal/quickaction-bar.tsx` oder vergleichbar)
  - Neuer Button "Angebot erstellen" (Icon `FileText` + Label) onClick: `await createProposal({ deal_id, contact_id: deal.primary_contact_id, company_id: deal.company_id })` → bei `ok=true`: `router.push('/proposals/' + proposalId + '/edit')`
  - Bei `ok=false`: Toast-Error
- Verification: Browser-Smoke: Klick erzeugt Draft + redirected
- Dependencies: SLC-551 `createProposal`

### MT-9: Einstiegspunkt 2 — Pipeline-Card-Kontextmenue "Angebot erstellen"
- Goal: Kontextmenue-Eintrag auf Pipeline-Cards
- Files: `cockpit/src/app/(app)/pipeline/[slug]/page.tsx` (MODIFY) ggf. inkl. Sub-Component
- Expected behavior:
  - Identifiziere existing Kontextmenue (existing aus V3.2 SLC-322 oder V5.x)
  - Neuer Eintrag "Angebot erstellen" → ruft `createProposal` mit Card-Deal-Kontext + redirect
  - Wenn Pipeline-Card kein Kontextmenue hat: Quickaction-Icon-Button daneben
- Verification: Browser-Smoke: Klick erzeugt Draft + redirected
- Dependencies: SLC-551 `createProposal`

### MT-10: Einstiegspunkt 3 — `/proposals` "Bearbeiten"-Button auf Drafts
- Goal: Listing-Tabelle erweitern
- Files: `cockpit/src/app/(app)/proposals/proposals-client.tsx` (MODIFY)
- Expected behavior:
  - Pro Tabellen-Row mit `status='draft'`: neuer "Bearbeiten"-Button (Icon `Pencil`) als `<Link href={'/proposals/' + id + '/edit'}>`
  - Anderen Status (sent/accepted/rejected/expired): "Anzeigen"-Button (Read-only-View) — kann SLC-554 erweitern; in dieser Slice nur "Bearbeiten" auf Draft
- Verification: Browser-Smoke: Klick navigiert
- Dependencies: keine Server-Action, nur UI

### MT-11: Browser-Smoke + Cross-Cut-Tests
- Goal: 3 Einstiegspunkte + komplette CRUD-Pfade
- Files: keine (manueller Test im QA-Report)
- Expected behavior:
  - Test-Fall A: Vom Deal-Workspace neues Angebot anlegen, 3 Items hinzufuegen, Drag-Reorder, Inline-Edit, Loeschen, Auto-Save Title-Aenderung
  - Test-Fall B: Vom Pipeline-Card-Kontextmenue Angebot anlegen → workspace oeffnet sich
  - Test-Fall C: `/proposals`-Liste "Bearbeiten" auf Draft → workspace oeffnet sich
  - Cent-Genauigkeit-Manueller-Check: 1 Item qty=3, price=100.50, discount=0%, tax=19% → Subtotal 301.50, Tax 57.29, Total 358.79
  - Dokumentation in QA-Report mit Screenshots
- Verification: Alle 3 Faelle dokumentiert
- Dependencies: MT-8, MT-9, MT-10

## Schaetzung

~6-8h:
- MT-1 (Pre-Check + Zod-Schemas): ~30min
- MT-2 (Calculator + Tests): ~30min
- MT-3 (5 Server Actions): ~1.5h
- MT-4 (PositionList + Picker): ~1.5h
- MT-5 (Editor + Auto-Save): ~1h
- MT-6 (HtmlPreview + PreviewPanel): ~1h
- MT-7 (Workspace + Page): ~30min
- MT-8 (Deal-Quickaction): ~30min
- MT-9 (Pipeline-Kontextmenue): ~30min
- MT-10 (Proposals-Liste-Button): ~15min
- MT-11 (Browser-Smoke): ~45min
- Buffer + Bug-Fix: ~1-1.5h
