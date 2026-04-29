# SLC-555 — Composing-Studio Proposal-Picker + Send-Pfad-Erweiterung (BL-404 Teil 2)

## Meta
- Feature: FEAT-555
- Priority: High
- Status: planned
- Created: 2026-04-29

## Goal

V5.4 Composing-Studio (`/emails/compose`) bekommt zweiten Anhang-Pfad neben PC-Direkt-Upload. "Angebot anhaengen"-Button im Anhang-Bereich oeffnet `<ProposalAttachmentPicker>` mit Liste aller Angebote des aktuellen Deal-Kontexts (DEC-112: alle Status sichtbar mit Status-Badge + Warning bei `expired`/`rejected`). Auswahl haengt PDF aus `proposal-pdfs`-Bucket an, schreibt Junction-Row mit `source_type='proposal'` + `proposal_id` (DEC-108-Diskriminator aus SLC-551). Send-Pipeline (`cockpit/src/lib/email/send.ts`) unterscheidet via `source_type` und holt Buffer aus dem richtigen Bucket. Nach erfolgreichem Send: idempotentes `transitionProposalStatus(id, 'sent')` (DEC-108). V5.4 PC-Upload-Pfad bleibt regression-frei (parallel testbar). REL-020 als Final-Release nach diesem Slice.

## Scope

- **`<ProposalAttachmentPicker>`-Komponente:**
  - Datei `cockpit/src/components/email/proposal-attachment-picker.tsx`
  - shadcn-`<Dialog>` mit Title "Angebot anhaengen"
  - Server-Loader: `getProposalsForDeal(dealId)` Server Action (DEC-112: alle Status, kein Filter)
  - Liste pro Angebot: Title + Version + Status-Badge (`<StatusBadge>` aus SLC-554) + Created-Date + (wenn `expired` oder `rejected`: Warning-Text "Achtung: dieses Angebot ist {status}")
  - Klick auf Angebot oeffnet Bestaetigungs-Modal bei `expired`/`rejected`: "Achtung: dieses Angebot ist {status}. Trotzdem anhaengen?" → bei OK: anhaengen
  - Andere Status: direkt anhaengen
  - Wenn `dealId` NULL (Compose ohne Deal-Bezug): Picker zeigt leere Liste mit Hinweis "Kein Deal verknuepft — Angebot-Anhang nur mit Deal-Kontext moeglich"
- **Server Action `attachProposalToCompose`:**
  - Datei: `cockpit/src/app/(app)/emails/compose/attachment-actions.ts` (existing aus V5.4, MODIFY)
  - Signature: `attachProposalToCompose({ composeSessionId, proposalId }): Promise<{ ok: true; attachment: AttachmentMeta } | { ok: false; error: string }>`
  - Auth-Check, SELECT `proposal` (RLS implicit)
  - Validierung: `proposal.pdf_storage_path != NULL` (PDF muss generiert worden sein → SLC-553-Vorbedingung). Falls NULL: returnt `error: 'PDF wurde noch nicht generiert. Bitte zuerst im Workspace PDF generieren.'`
  - SELECT `deal.title` fuer Filename-Pattern
  - Filename: `Angebot-{slug(deal.title)}-V{proposal.version}.pdf` (oder `.testmode.pdf` wenn Storage-Pfad mit `.testmode.pdf` endet — laut SLC-553)
  - Returnt `{ ok: true, attachment: { storagePath: proposal.pdf_storage_path, filename, mimeType: 'application/pdf', sizeBytes: ?, source_type: 'proposal', proposalId } }`
  - **Kein** Junction-Insert in dieser Action — der Insert passiert erst beim Send (consistent mit V5.4 PC-Upload-Pfad)
  - SizeBytes aus Storage-Metadata abfragen ODER auf 0 setzen falls nicht trivial verfuegbar (Read im Send-Pfad funktioniert auch ohne)
- **`<AttachmentsSection>`-Erweiterung:**
  - Datei: `cockpit/src/components/email/attachments-section.tsx` (existing aus V5.4, MODIFY)
  - Neuer Button "Angebot anhaengen" neben "Datei hochladen", **nur sichtbar wenn `dealId` vorhanden**
  - onClick: oeffnet `<ProposalAttachmentPicker dealId={dealId} onSelect={handleProposalAttach} />`
  - `handleProposalAttach`: ruft `attachProposalToCompose`, bei Success: pusht Attachment in `attachments`-State (mit `source_type='proposal'`-Marker)
  - Pro Item Icon-Differenzierung: PC-Upload `<File />` Icon, Proposal `<FileText />` Icon (+ ggf. Color Brand-Color zur visuellen Unterscheidung)
  - Loeschen-Button entfernt aus State (kein Storage-Delete fuer Proposal-PDFs — die bleiben im `proposal-pdfs`-Bucket, sind durch Storage-Pfad gesteuert)
- **`<AttachmentsPreview>`-Erweiterung:**
  - Datei: `cockpit/src/components/email/attachments-preview.tsx` (existing aus V5.4, MODIFY)
  - Pro Item gleiche Icon-Differenzierung wie in AttachmentsSection
- **`AttachmentMeta`-Type-Erweiterung:**
  - `cockpit/src/lib/email/attachments-types.ts` (NEU oder Inline-Type-Def): `source_type: 'upload' | 'proposal'`, `proposalId?: string`
  - Backwards-Compat: existing AttachmentMeta-Konsumenten haben default `source_type='upload'`
- **`sendComposedEmail`-Send-Action-Erweiterung:**
  - Datei: `cockpit/src/app/(app)/emails/compose/send-action.ts` (existing aus V5.4, MODIFY)
  - Bei Send: `attachments` aus Compose-State enthaelt evtl. Mix aus `source_type='upload'` und `source_type='proposal'` Items
  - Neue Logik in `cockpit/src/lib/email/send.ts`:
    - Pro Anhang: wenn `source_type='upload'` → Buffer aus `email-attachments`-Bucket (existing V5.4-Pfad)
    - Wenn `source_type='proposal'` → Buffer aus `proposal-pdfs`-Bucket via `storagePath`
  - Beide Pfade: gleicher Nodemailer-Multipart-Mail-Build
  - Junction-Insert in `email_attachments` mit `source_type` + ggf. `proposal_id` (CHECK-Constraint aus SLC-551 greift)
  - Nach Send: pro Proposal-Anhang: `transitionProposalStatus(proposalId, 'sent')` (DEC-108 idempotent — wenn schon `sent`, kein Audit)
- **Mehrfach-Proposal-Anhang-Handling:**
  - Architecture: kein explizites Verbot von mehreren Proposal-Anhaengen, aber Out-of-Scope laut FEAT-555 ("max ein Angebot")
  - Pragmatic-Implementation: keine Hard-Block, aber UI zeigt Warning "Mehrere Angebote — sicher?"
  - Hinweis im QA: User-Edge-Case-Test ob mehrfach OK ist
- **Filename-Pattern beim Send:**
  - PDF wird mit Filename `Angebot-{slug(deal.title)}-V{version}.pdf` (oder `.testmode.pdf` wenn aktiv) versendet — der Empfaenger sieht diesen Filename
  - Server-Side-Sanitization mit `sanitizeProposalFilename` aus SLC-553 (Single-Source-of-Truth)
- **Smoke-Test echte Mail:**
  - 3 Test-Faelle in QA-Report:
    1. Mail mit Proposal-PDF an Gmail → Mail kommt an, PDF downloadbar, Tracking-Pixel feuert, Proposal-Status auf `sent`
    2. Mail mit PC-Upload (V5.4-Regression) → unveraendert funktional
    3. Mail mit Proposal + PC-Upload kombiniert → beide Anhaenge in Multipart-Mail
- **Status-Auto-Sent-Idempotenz:**
  - Test-Fall: Proposal mit Status `sent` (manuell gesetzt) → erneute Send via Composing-Studio → kein doppelter Audit-Eintrag
- Update `docs/STATE.md`, `slices/INDEX.md`, `planning/backlog.json` (BL-404 → done, BL-405 → done), `features/INDEX.md` (alle FEAT-551..555 → done), `docs/RELEASES.md` (REL-020 vorbereiten).

## Out of Scope

- Mehrere Proposal-Anhaenge in einer Mail als Hard-Block (nur UI-Warning)
- Auto-Send-mit-Default-Begleittext
- Picker fuer Angebote anderer Deals (nur aktueller Deal-Kontext)
- Anhang ohne Deal-Kontext (Compose-ohne-Deal-Bezug → Picker zeigt leere Liste mit Hinweis, kein Cross-Deal-Browsing)
- Inbound-Anhaenge (Download von Anhaengen aus eingehenden IMAP-Mails) — out-of-scope, FEAT-405
- Proposal-Anhang-Re-Send aus Audit-Spur (technisch moeglich, aber keine UI in V5.5)
- Storage-Cleanup fuer alte Proposal-PDFs (V5.6+)
- Composing-Cadence-Engine-Pfad fuer Proposal-Anhaenge (Cadences senden derzeit ohne Anhaenge — V5.6+ falls noetig)
- Auto-Send-Trigger ohne User-Klick (Send muss explizit User-getriggert sein)

## Acceptance Criteria

- AC1: `<AttachmentsSection>` zeigt "Angebot anhaengen"-Button **nur wenn `dealId` vorhanden**.
- AC2: Klick auf "Angebot anhaengen" oeffnet `<ProposalAttachmentPicker>` mit Liste aller Angebote des aktuellen Deals (DEC-112: alle Status sichtbar).
- AC3: Picker zeigt pro Angebot: Title, Version-Badge, Status-Badge mit Color-Mapping aus SLC-554, Created-Date.
- AC4: Bei Auswahl von `expired`/`rejected`-Angebot: Confirm-Modal "Achtung: dieses Angebot ist {status}. Trotzdem anhaengen?" → bei OK: anhaengen.
- AC5: Picker zeigt leere Liste mit Hinweis "Kein Deal verknuepft" wenn `dealId` NULL.
- AC6: Server Action `attachProposalToCompose` validiert `pdf_storage_path != NULL`. Wenn NULL: returnt `error` mit klarer Message ("PDF noch nicht generiert").
- AC7: Filename-Pattern: `Angebot-{slug(deal.title)}-V{version}.pdf` (oder `.testmode.pdf` wenn Storage-Pfad-Suffix `.testmode.pdf` ist).
- AC8: Anhang-Liste in `<AttachmentsSection>` zeigt PC-Uploads und Proposal-Anhaenge mit Icon-Differenzierung (Generic-File vs Document-with-Brand-Icon).
- AC9: Loeschen-Button in der Liste entfernt das Item aus State. **Storage-File im `proposal-pdfs`-Bucket bleibt** (kein Cascade-Delete — Audit-Wahrheit).
- AC10: Send-Pipeline (`sendEmailWithTracking`) unterscheidet `source_type` und holt Buffer aus richtigem Bucket: `email-attachments` fuer `'upload'`, `proposal-pdfs` fuer `'proposal'`.
- AC11: Nach Send: Junction-Row in `email_attachments` mit `source_type` + `proposal_id` (NOT NULL bei Proposal). CHECK-Constraint aus SLC-551 greift.
- AC12: Multipart-Mail mit Proposal-PDF-Anhang kommt in Gmail mit korrektem Filename + downloadbar an.
- AC13: Tracking-Pixel-Event feuert bei Proposal-Anhang-Mail (Gmail-Open-Smoke).
- AC14: Nach Send: `transitionProposalStatus(proposalId, 'sent')` wird gerufen — Status auf `sent`, Audit-Eintrag.
- AC15: Idempotenz: Wenn Proposal bereits `sent` ist und erneut gesendet wird, kein doppelter Audit-Eintrag (DEC-108).
- AC16: V5.4 PC-Direkt-Upload-Pfad ist regression-frei: PC-Upload-Mail funktioniert wie zuvor (Smoke-Test).
- AC17: Mail mit Proposal + PC-Upload kombiniert: beide Anhaenge in Multipart-Mail enthalten und korrekt downloadbar.
- AC18: TypeScript-Build (`npm run build`) gruen.
- AC19: REL-020-Notes in `docs/RELEASES.md` enthalten Final-Release-Hinweise: alle 5 V5.5-Slices implementiert, Internal-Test-Mode aktiv, Cron-Setup-Anleitung (aus SLC-554), pdfmake-Dependency, Hinweis auf Pre-Production-Compliance-Gate vor V5.6.

## Dependencies

- SLC-551 (`email_attachments.source_type` + `proposal_id`-Spalten + CHECK-Constraint)
- SLC-552 (Workspace + ConsiderierungAttachmentPicker-Pattern)
- SLC-553 (PDF muss existieren — `proposal.pdf_storage_path` MUSS gesetzt sein vor Anhaengen, Filename-Helper)
- SLC-554 (`transitionProposalStatus`, `<StatusBadge>`-Komponente)
- V5.4 FEAT-542 (`<AttachmentsSection>`, `<AttachmentsPreview>`, `email_attachments`-Junction, Multipart-Pipeline in `send.ts`)
- V5.3 FEAT-532 (Composing-Studio-Form, `dealId`-Prop)

## Risks

- **Risk:** Picker-Liste-Loader ruft `getProposalsForDeal` mit grossen Datenmengen → Latenz.
  Mitigation: V5.5 Constraint 4: Max 5 Versionen pro Deal. Ohne Deal: leere Liste. Bei sehr vielen historischen Drafts: Pagination spaeter (out-of-scope).
- **Risk:** Anhaengen funktioniert nicht weil `pdf_storage_path = NULL` (User hat noch nicht "PDF generieren" geklickt).
  Mitigation: AC6 explicit. Klare Fehlermeldung. UI-Hinweis im Picker: bei `pdf_storage_path = NULL` Item disabled mit Tooltip "PDF nicht generiert".
- **Risk:** Multipart-Mail ueberschreitet SMTP-Provider-Limit bei mehreren Proposal-PDFs + PC-Uploads.
  Mitigation: V5.4 Total-Size-Limit 25 MB greift weiterhin (validiert beim Add). Proposal-PDFs typisch <500 KB → kein Druck.
- **Risk:** Tracking-Pixel feuert nicht bei Proposal-Anhang (Mail-Client filtert Multipart-Body).
  Mitigation: V5.4 hat das schon erfolgreich gehandhabt (PC-Upload mit Pixel funktioniert). Smoke-Test mit Gmail in AC13.
- **Risk:** `attachProposalToCompose` erlaubt Cross-Deal-Anhaengen wenn Frontend-State manipuliert wird.
  Mitigation: Server-Side-Re-Check: `if (proposal.deal_id !== currentDealId) return { error: 'forbidden' }`. RLS-Pruefung implicit.
- **Risk:** Filename-Sanitization erzeugt Kollisionen wenn 2 Deals gleichen Titel haben.
  Mitigation: Filename ist nur Display fuer Empfaenger — keine Kollisions-Pflicht. Im Junction-Insert ist `storage_path` (proposal_id-eindeutig) der Identifier.
- **Risk:** `transitionProposalStatus` wird mehrfach gerufen wenn User Mail mehrfach sendet (z.B. Re-Send).
  Mitigation: DEC-108 Idempotenz-Garantie aus SLC-554.
- **Risk:** V5.4-Cadence-Engine bricht weil Junction-Schema sich geaendert hat.
  Mitigation: V5.4 Cadence-Engine sendet ohne Anhaenge → Junction-Insert hat `source_type='upload'` (default) und `proposal_id=NULL` (default) → CHECK-Constraint passt → kein Bruch. AC16-Regression verifiziert.
- **Risk:** Bei Send-Fehler bleibt Proposal-Status nicht synchron (Mail nicht raus, aber `transitionProposalStatus` bereits gerufen).
  Mitigation: Reihenfolge: erst Mail erfolgreich senden, dann transition + Junction-Insert. Bei Send-Error: kein transition, kein Insert (User kann erneut senden).
- **Risk:** Picker zeigt nicht-frisch-PDF-generierte Versionen mit veralteten Berechnungen.
  Mitigation: Picker zeigt Status `pdf_storage_path` als "PDF generiert" Indikator. Bei manchen Versionen: User muss zuerst im Workspace "PDF generieren" klicken → Re-Open Picker.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/components/email/proposal-attachment-picker.tsx` | NEU: Picker-Dialog |
| `cockpit/src/components/email/attachments-section.tsx` | MODIFY: "Angebot anhaengen"-Button bei dealId vorhanden + Icon-Differenzierung |
| `cockpit/src/components/email/attachments-preview.tsx` | MODIFY: Icon-Differenzierung |
| `cockpit/src/lib/email/attachments-types.ts` | NEU oder MODIFY: AttachmentMeta-Type-Erweiterung |
| `cockpit/src/app/(app)/emails/compose/attachment-actions.ts` | MODIFY: `attachProposalToCompose` ergaenzen |
| `cockpit/src/app/(app)/proposals/actions.ts` | MODIFY: `getProposalsForDeal(dealId)` ergaenzen |
| `cockpit/src/app/(app)/emails/compose/send-action.ts` | MODIFY: Proposal-Anhang-Handling + transitionProposalStatus-Call |
| `cockpit/src/lib/email/send.ts` | MODIFY: source_type-Diskriminator beim Buffer-Read |
| `cockpit/src/app/(app)/emails/compose/compose-form.tsx` | MODIFY: dealId-Prop weiterreichen |
| `docs/RELEASES.md` | MODIFY: REL-020-Notes vorbereiten |
| `docs/STATE.md` | Slice-Status-Update + V5.5 done |
| `slices/INDEX.md` | SLC-555 anlegen |
| `planning/backlog.json` | BL-411 (SLC-555 Tracking) anlegen, BL-404 + BL-405 → done |
| `features/INDEX.md` | FEAT-551..555 → `done` |

## QA Focus

- **Build + Test:**
  - `npm run build` gruen
  - `npm run test` gruen (wenn neue Tests existieren)
  - `npm run lint` gruen
- **`<ProposalAttachmentPicker>`-UI-Smoke:**
  - Mit `dealId`: Picker zeigt Liste mit allen Angeboten + Status-Badges
  - Bei `dealId=null`: leere Liste mit Hinweis
  - Status-Badge-Color-Mapping konsistent zu SLC-554
  - Klick auf `expired`-Angebot: Confirm-Modal sichtbar
- **`attachProposalToCompose`-Smoke:**
  - Bei `pdf_storage_path != NULL`: Returns `{ ok: true, attachment }`, Filename-Pattern korrekt
  - Bei `pdf_storage_path = NULL`: Returns `{ ok: false, error: 'PDF noch nicht generiert...' }`
  - Cross-Deal-Block: Aufruf mit `proposalId` aus anderem Deal → Error
- **Anhang-Mix-Smoke:**
  - 1x PC-Upload + 1x Proposal-Anhang → AttachmentsSection zeigt beide mit unterschiedlichen Icons
  - AttachmentsPreview zeigt beide
- **Send-Smoke (Gmail):**
  - Mail mit nur Proposal-Anhang an Gmail-Postfach → kommt an, PDF downloadbar, Filename korrekt
  - Mail mit nur PC-Upload (V5.4-Regression) → unveraendert
  - Mail mit Proposal + PC-Upload → beide Anhaenge in Multipart-Mail
  - Tracking-Pixel-Open-Event nach Mail-Open in Gmail (Verifikation in `email_tracking_events`)
- **Status-Auto-Sent-Smoke:**
  - Vor Send: `proposal.status = 'draft'`
  - Nach Send: `proposal.status = 'sent'`, `audit_log` enthaelt Eintrag mit `actor_id=userId`, `action='status_change'`
- **Status-Idempotenz-Smoke:**
  - Setze `proposal.status = 'sent'` manuell, sende erneut → Status bleibt `sent`, kein neuer Audit-Eintrag
- **Junction-Insert-Smoke:**
  - `SELECT * FROM email_attachments WHERE email_id IN (...)` zeigt korrekte Rows mit `source_type` + `proposal_id`
  - PC-Upload-Row: `source_type='upload', proposal_id=NULL`
  - Proposal-Row: `source_type='proposal', proposal_id={uuid}`
- **CHECK-Constraint-Smoke (Negativ-Test):**
  - INSERT manueller Test-Row mit `source_type='upload'` + `proposal_id={uuid}` schlaegt fehl
  - INSERT mit `source_type='proposal'` + `proposal_id=NULL` schlaegt fehl
- **V5.4 PC-Upload-Regression:**
  - Bestehende Compose-Workflow ohne Proposal-Pfad funktioniert wie zuvor (Cent-genaue Identitaet zur V5.4-Logik)
  - Cadence-Engine-Send (ohne Anhaenge) bleibt unbetroffen
- **Bonus: Performance-Smoke:**
  - Picker-Loader bei Deal mit 5 Versionen: < 500ms
  - Send-Pipeline mit Proposal-Anhang: gleiches Performance-Profil wie PC-Upload (V5.4-Baseline)

## Micro-Tasks

### MT-1: AttachmentMeta-Type-Erweiterung + getProposalsForDeal Server Action
- Goal: Type-Erweiterung + Picker-Loader
- Files: `cockpit/src/lib/email/attachments-types.ts` (NEU oder MODIFY existing inline), `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY)
- Expected behavior:
  - Type `AttachmentMeta` erweitert: `source_type: 'upload' | 'proposal'` (default `'upload'` fuer Backwards-Compat), `proposalId?: string`
  - V5.4-Konsumenten muessen nicht angepasst werden — Default `'upload'`
  - `getProposalsForDeal(dealId: string)` Server Action: SELECT `proposals` WHERE `deal_id=dealId`, ORDER BY `version DESC, created_at DESC`. Returnt Array mit `{ id, title, version, status, created_at, pdf_storage_path }` (kein Items, nur Meta)
- Verification: Action-Smoke per DevTools, Type-Build gruen
- Dependencies: SLC-554 abgeschlossen

### MT-2: Server Action `attachProposalToCompose`
- Goal: Anhang-Logik mit Validierung
- Files: `cockpit/src/app/(app)/emails/compose/attachment-actions.ts` (MODIFY)
- Expected behavior:
  - Signature: `attachProposalToCompose({ composeSessionId: string, proposalId: string }): Promise<{ ok: true; attachment: AttachmentMeta } | { ok: false; error: string }>`
  - Auth-Check, SELECT proposal + deal (Promise.all)
  - Cross-Deal-Block: optional Caller-Side, weil RLS-Layer das schon abdeckt — aber defensive Check `if (!proposal) return { error: 'not found' }` ist genug
  - Validierung: `if (!proposal.pdf_storage_path) return { ok: false, error: 'PDF wurde noch nicht generiert. Bitte zuerst im Workspace PDF generieren.' }`
  - Filename: `sanitizeProposalFilename(deal.title, proposal.version, isTestModePath(proposal.pdf_storage_path))` aus SLC-553-Helper. `isTestModePath`: prueft ob Pfad mit `.testmode.pdf` endet
  - Returns `{ ok: true, attachment: { storagePath: proposal.pdf_storage_path, filename, mimeType: 'application/pdf', sizeBytes: 0, source_type: 'proposal', proposalId: proposal.id } }`
- Verification: Action-Smoke: mit existing Proposal mit PDF → ok, ohne PDF → error
- Dependencies: SLC-553 (`sanitizeProposalFilename`)

### MT-3: `<ProposalAttachmentPicker>`-Komponente
- Goal: UI-Picker-Dialog
- Files: `cockpit/src/components/email/proposal-attachment-picker.tsx` (NEU)
- Expected behavior:
  - Props: `{ dealId: string | null, open: boolean, onClose: () => void, onSelect: (att: AttachmentMeta) => void }`
  - shadcn-`<Dialog>`-Wrapper
  - Server-Loader via React Server Component ODER Client-Component mit `useEffect`-Fetch via `getProposalsForDeal`
  - Wenn `dealId=null`: leere Liste mit Hinweis
  - Liste pro Angebot: shadcn-`<Card>` mit Title + `<StatusBadge>` (SLC-554) + Version + Created-Date + (wenn `expired`/`rejected`: `<Alert>` mit Warning-Text + (wenn `pdf_storage_path=NULL`: disabled-State mit Tooltip "PDF noch nicht generiert"))
  - Klick: bei `expired`/`rejected` Confirm-Modal → bei OK: `attachProposalToCompose` → bei Success `onSelect(attachment); onClose()`
  - Andere Status: direkt `attachProposalToCompose`
  - Loading-State waehrend Action-Call
- Verification: Browser-Smoke: alle 4 Status-Cases (Draft/Sent/Accepted/Rejected/Expired)
- Dependencies: MT-1, MT-2, SLC-554 `<StatusBadge>`

### MT-4: `<AttachmentsSection>`-Erweiterung — "Angebot anhaengen"-Button + Icon-Differenzierung
- Goal: Anhang-Sektion erweitern
- Files: `cockpit/src/components/email/attachments-section.tsx` (MODIFY)
- Expected behavior:
  - Neuer Prop `dealId: string | null` (durchgereicht aus `compose-form.tsx`)
  - Neuer Button "Angebot anhaengen" (Icon `FileText`) neben "Datei hochladen", **conditional render** wenn `dealId != null`
  - State `proposalPickerOpen: boolean`
  - onClick: `setProposalPickerOpen(true)`
  - `<ProposalAttachmentPicker dealId={dealId} open={...} onClose={...} onSelect={handleAttachmentSelect} />`
  - `handleAttachmentSelect(att: AttachmentMeta)` — pusht in `attachments`-State
  - Anhang-Liste: pro Item Icon basierend auf `source_type`: `'upload'` → Generic-File, `'proposal'` → `<FileText>` mit Brand-Color
  - Loeschen-Button entfernt nur aus State (kein Storage-Delete fuer Proposal-Anhaenge)
- Verification: Browser-Smoke: Picker oeffnet sich, Item gelangt in Liste mit korrektem Icon
- Dependencies: MT-3

### MT-5: `<AttachmentsPreview>`-Erweiterung — Icon-Differenzierung
- Goal: Live-Preview-Indikator-Update
- Files: `cockpit/src/components/email/attachments-preview.tsx` (MODIFY)
- Expected behavior:
  - Pro Item gleiche Icon-Differenzierung wie in `<AttachmentsSection>` basierend auf `source_type`
- Verification: Browser-Smoke: Preview zeigt korrekten Icon
- Dependencies: MT-4

### MT-6: `compose-form.tsx` — dealId-Prop-Reichung
- Goal: dealId an `<AttachmentsSection>` durchreichen
- Files: `cockpit/src/app/(app)/emails/compose/compose-form.tsx` (MODIFY)
- Expected behavior:
  - `dealId` ist bereits aus URL-Param oder Server-Loader vorhanden (existing aus V5.3 Composing-Studio)
  - `<AttachmentsSection dealId={dealId} ... />` durchreichen
- Verification: Build gruen, Typcheck gruen
- Dependencies: MT-4

### MT-7: `send.ts` — source_type-Diskriminator beim Buffer-Read
- Goal: Pipeline-Erweiterung um Proposal-Bucket-Read
- Files: `cockpit/src/lib/email/send.ts` (MODIFY)
- Expected behavior:
  - Bestehender V5.4-Pfad: `attachments` enthaelt `{ storagePath, filename, mimeType }` — buffer-load aus `email-attachments`-Bucket
  - Erweitert: pro Anhang prueft `source_type`:
    - `'upload'` → `supabase.storage.from('email-attachments').download(storagePath)` (existing)
    - `'proposal'` → `supabase.storage.from('proposal-pdfs').download(storagePath)` (neu)
  - Beide Pfade liefern Buffer fuer Nodemailer-`attachments`-Array
  - Audit-Log-Erweiterung: `attachmentsCount = uploadCount + proposalCount` mit Breakdown im Log
- Verification: Send-Smoke mit beiden Anhang-Typen
- Dependencies: SLC-551 (Bucket existiert)

### MT-8: `sendComposedEmail` — transitionProposalStatus + Junction-Insert mit source_type
- Goal: Send-Action-Erweiterung
- Files: `cockpit/src/app/(app)/emails/compose/send-action.ts` (MODIFY)
- Expected behavior:
  - Bestehender V5.4-Pfad bleibt unangetastet — Junction-Insert hat default `source_type='upload'`, `proposal_id=NULL`
  - Erweitert: pro Anhang in `attachments`-Array Junction-Insert mit `source_type` + (wenn 'proposal') `proposal_id`
  - CHECK-Constraint aus SLC-551 greift — kein invalid State moeglich
  - Nach erfolgreichem Send: pro Proposal-Anhang `transitionProposalStatus(proposalId, 'sent')` (idempotent, kein Throw bei `error`)
  - Bei Send-Error: kein transition, kein Insert (User kann erneut senden)
- Verification: Send-Smoke: Junction-Rows korrekt, Status-Update + Audit
- Dependencies: MT-7, SLC-554 `transitionProposalStatus`

### MT-9: REL-020 Final-Release-Notes vorbereiten
- Goal: Doku-Vorbereitung fuer Go-Live
- Files: `docs/RELEASES.md` (MODIFY)
- Expected behavior:
  - REL-020-Section mit Status `planned` (Final-Check + Go-Live + Deploy danach):
    - Datum: planned
    - Scope: V5.5 Angebot-Erstellung — alle 5 Slices SLC-551..555 implementiert (FEAT-551..555 done)
    - Summary: 1-2 Saetze
    - Risks: Internal-Test-Mode aktiv, pdfmake-Library 700KB, Storage-Volumen-Wachstum (V5.6+ Cleanup)
    - Cron-Setup-Anleitung (aus SLC-554 MT-8): expire-proposals 02:00 Berlin
    - Pre-Production-Compliance-Gate-Hinweis: vor V5.6 Anwalts-Pruefung + Azure-Whisper-Switch + ISSUE-042 (OpenAI-Key)
    - Rollback-Notes: Rollback-Path aus MIG-026 (DROP TABLE proposal_items, ALTER TABLE proposals DROP COLUMN ..., etc.)
- Verification: REL-020-Section sichtbar in `docs/RELEASES.md`, Format gemaess `project-records-format.md` Rule
- Dependencies: MT-8

### MT-10: Cross-Cut Smoke-Test 3 Faelle + V5.4-Regression
- Goal: End-to-End Verifikation mit echten Mails
- Files: keine (manueller Test im QA-Report)
- Expected behavior:
  - Test-Fall 1: Mail mit Proposal-Anhang an Gmail
    - Pre-Setup: Proposal mit `pdf_storage_path != NULL` (vorher in SLC-553 generiert)
    - In Composing-Studio: Anhaenge → "Angebot anhaengen" → Picker → Klick auf Proposal → Mail senden an Gmail-Test
    - Verifikation: Mail kommt an, PDF downloadbar mit Filename `Angebot-{deal-slug}-V{n}.pdf` (oder `.testmode.pdf`)
    - Tracking-Pixel-Open-Event in `email_tracking_events`
    - `proposals.status = 'sent'`, `audit_log` enthaelt Eintrag
  - Test-Fall 2: Mail mit PC-Upload (V5.4-Regression)
    - In Composing-Studio: PC-Upload anhaengen → senden
    - Verifikation: bit-identisches Verhalten zur V5.4-Baseline (Junction-Row mit `source_type='upload'`, kein Proposal-Status-Update)
  - Test-Fall 3: Mail mit Proposal + PC-Upload kombiniert
    - Anhaenge: PC-Upload + Proposal-PDF
    - Mail kommt an Gmail mit beiden Anhaengen, beide downloadbar, korrekte Filenames
    - Junction-Rows: 1x `source_type='upload'`, 1x `source_type='proposal'`
  - Idempotenz-Smoke (Bonus):
    - Setze Proposal-Status manuell auf `sent`, sende erneut → Status bleibt `sent`, kein zusaetzlicher Audit-Eintrag
  - Cadence-Regression-Smoke:
    - Bestehende Cadence (V5.4) sendet Mail ohne Anhaenge → bit-identisch zu V5.4
- Verification: 3 Test-Faelle dokumentiert in QA-Report mit Mail-IDs, Junction-Row-IDs, Tracking-Event-Status
- Dependencies: MT-1..MT-9

## Schaetzung

~3-4h:
- MT-1 (Type-Erweiterung + getProposalsForDeal): ~30min
- MT-2 (attachProposalToCompose): ~30min
- MT-3 (ProposalAttachmentPicker): ~45min
- MT-4 (AttachmentsSection-Erweiterung): ~30min
- MT-5 (AttachmentsPreview-Erweiterung): ~15min
- MT-6 (compose-form dealId-Prop): ~10min
- MT-7 (send.ts source_type-Diskriminator): ~30min
- MT-8 (sendComposedEmail Junction + transition): ~30min
- MT-9 (REL-020-Notes): ~20min
- MT-10 (Cross-Cut-Smoke 3 Faelle + V5.4-Regression): ~45min
- Buffer + Bug-Fix: ~30-45min
