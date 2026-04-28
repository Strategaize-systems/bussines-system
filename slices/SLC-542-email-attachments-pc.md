# SLC-542 — E-Mail-Anhaenge-Upload (PC-Direkt)

## Meta
- Feature: FEAT-542
- Priority: High
- Status: planned
- Created: 2026-04-28

## Goal

User kann im Composing-Studio (`/emails/compose`) Dateien von seinem PC per Drag&Drop oder File-Picker an seine ausgehende Mail anhaengen. Anhang wird in einem dedizierten privaten Storage-Bucket persistiert (DEC-097 Junction-Table-Pattern, DEC-098 compose_session_id-Path), mit der `emails`-Row via Junction-Table verknuepft, und beim SMTP-Versand als Multipart-Anhang mitgesendet. Tracking-Pixel + Cadence-Engine bleiben unbeeintraechtigt.

## Scope

- **MIG-025 anwenden auf Hetzner:**
  - Storage-Bucket `email-attachments` (privat, `public=false`)
  - Junction-Table `email_attachments` mit FK ON DELETE CASCADE
  - Index `idx_email_attachments_email_id`
  - RLS `authenticated_full_access`
- **MIME-Whitelist als shared Konstante (DEC-099):**
  - `cockpit/src/lib/email/attachments-whitelist.ts` mit `MIME_WHITELIST`, `EXTENSION_WHITELIST`, `MAX_FILE_SIZE_BYTES` (10 MB), `MAX_TOTAL_SIZE_BYTES` (25 MB)
  - Validation-Helper `validateAttachment(file, totalSizeSoFar)` returnt `{ ok: true } | { ok: false, error: string }`
  - Erlaubt: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, GIF, TXT, CSV, ZIP
  - Verboten: EXE, BAT, SH, JS, andere Scripting-Formate
  - ZIP rein ohne Inhalt-Inspection (DEC-100)
- **Server Actions:**
  - `cockpit/src/app/(app)/emails/compose/attachment-actions.ts`:
    - `uploadEmailAttachment(formData)` — Service-Role-Storage-Client, Path `{user_id}/{compose_session_id}/{filename}`, returnt `{ storagePath, filename, mimeType, sizeBytes }`
    - `deleteEmailAttachment(storagePath)` — Service-Role-Storage-Client, Path-Owner-Check (user_id-Prefix muss matchen)
- **Compose-Form-UI:**
  - Neue Komponente `cockpit/src/components/email/attachments-section.tsx`
  - Drag&Drop-Zone + File-Picker-Button "Datei anhaengen"
  - AttachmentsList: pro File Icon (MIME-basiert) + Filename + Size + Loeschen-Button
  - Browser-Side Validation gegen `attachments-whitelist.ts` (MIME + Size-Pro-File + Total-Size)
  - Optimistic UI: Anhang sofort in Liste mit "Lade hoch..."-State, dann mit Storage-Path-Update
  - Loeschen ruft `deleteEmailAttachment` und entfernt aus Liste
- **Compose-Form-Integration (DEC-101):**
  - `<AttachmentsSection>` direkt unterhalb der Body-Textarea in `compose-form.tsx`
  - Compose-Session-ID via `useState(() => crypto.randomUUID())` beim Page-Open (DEC-104 Tab-Session)
  - State `attachments: AttachmentMeta[]` mit `{ storagePath, filename, mimeType, sizeBytes }`
- **Live-Preview-Indikator:**
  - Neue Komponente `cockpit/src/components/email/attachments-preview.tsx`
  - Im rechten Panel (`live-preview.tsx`) unterhalb der Body-Preview
  - Sektion "Anhaenge" mit Icon + Filename + Size pro Anhang, kein Inhalts-Render
- **`send.ts`-Erweiterung (Backwards-Compatible):**
  - `sendEmailWithTracking(opts)` bekommt optionalen Parameter `attachments?: { storagePath, filename, mimeType }[]` (Default: `[]`)
  - Default leer = bit-identisches V5.3-Verhalten (Cadences, Auto-Reply unbeeintraechtigt)
  - Bei nicht-leerer Liste: Storage-Files via service_role downloaden (`supabase.storage.from('email-attachments').download(path)`), als Buffer an Nodemailer `attachments`-Array uebergeben
  - Multipart-Mail wird automatisch erzeugt (Nodemailer-Standard)
- **`sendComposedEmail` Server Action erweitert:**
  - Bestehende Action bekommt `attachments`-State aus Compose-Form
  - Ruft `sendEmailWithTracking` mit Anhaengen
  - Nach erfolgreichem Send: persistiert `email_attachments`-Junction-Rows mit FK zu `emails.id` (Service-Role, in derselben Action)
- **Smoke-Test mit echter Mail:**
  - 3 Test-Faelle dokumentiert in QA-Report:
    1. PDF-Anhang an Gmail — Tracking-Pixel-Event muss feuern, PDF muss downloadbar sein
    2. PNG-Anhang an Gmail — Anhang kommt korrekt an
    3. ZIP-Anhang an Gmail — wird akzeptiert ohne Inhalt-Inspection (DEC-100)
- **Cadence-Engine-Regression-Check:**
  - Bestehender Cadence-Send-Pfad ohne Anhaenge muss bit-identisch zu V5.3 funktionieren
  - Verifikation: Cadence-Mail raus, Output-DB-Eintraege gleich wie vor V5.4
- Update `docs/STATE.md`, `slices/INDEX.md`, `planning/backlog.json` (BL-404 → done), `docs/MIGRATIONS.md` (MIG-025 mit Apply-Date)

## Out of Scope

- Anhang-Auswahl aus dem System (Angebot anhaengen) — wartet auf BL-405 + BL-404 Teil 2
- Anhang-Auswahl aus der bestehenden Document-Library (`documents`-Bucket)
- Inhalt-Inspection von ZIP-Dateien (Server-side Unzip + MIME-Check pro File)
- Cron-Cleanup fuer Storage-Volume in `email-attachments`-Bucket (DEC-104 deferred)
- Anhang-Re-Send aus Audit-Spur (technisch moeglich, aber keine UI in V5.4)
- Drag&Drop-Reorder der Anhaenge
- Inline-Bilder im Body (Cid-References)
- Anhang-Versand in Cadences/Sequences (keine Cadence-UI fuer Anhaenge in V5.4)
- Inbound-Anhaenge (Download von Anhaengen aus eingehenden IMAP-Mails) — anderes Thema, FEAT-405
- Verwaiste-Anhaenge-Cleanup-Cron bei Compose-Session-Abandon
- Storage-Volumen-Monitoring-Alerting (Operations-Topic)

## Acceptance Criteria

- AC1: MIG-025 ist auf Hetzner angewendet — Bucket `email-attachments` existiert (privat), Tabelle `email_attachments` existiert mit FK + Index + RLS
- AC2: `cockpit/src/lib/email/attachments-whitelist.ts` exportiert `MIME_WHITELIST`, `EXTENSION_WHITELIST`, `MAX_FILE_SIZE_BYTES` (10 MB), `MAX_TOTAL_SIZE_BYTES` (25 MB), `validateAttachment`-Helper
- AC3: Im Composing-Studio ist unterhalb der Body-Textarea ein Anhang-Bereich mit Drag&Drop-Zone und File-Picker-Button sichtbar
- AC4: Drag&Drop einer Datei oder Klick auf File-Picker fuegt die Datei zur Anhang-Liste hinzu, Storage-Upload erfolgt asynchron
- AC5: Anhang-Liste zeigt pro File: Icon (MIME-basiert), Filename, Size, Loeschen-Button
- AC6: MIME-Whitelist greift auf Browser-Ebene (verbotene Files koennen gar nicht erst hinzugefuegt werden, klare Fehlermeldung) UND auf Server-Ebene (`uploadEmailAttachment` lehnt ab mit Error)
- AC7: Size-Limit 10 MB pro File und 25 MB Total wird Browser- und Server-seitig validiert
- AC8: Loeschen eines Anhangs entfernt die Storage-Datei (`deleteEmailAttachment`) und nimmt sie aus der Anhang-Liste raus
- AC9: Live-Preview rechts zeigt eine Anhang-Indikator-Sektion mit Icon + Filename + Size pro Anhang
- AC10: "Senden" produziert eine Mail mit Multipart-Body, die in Gmail mit den Anhaengen ankommt (Smoke-Test PDF + PNG + ZIP)
- AC11: Nach Versand existieren `email_attachments`-Junction-Rows mit FK zu `emails.id`. Storage-Files bleiben im Bucket (DEC-098 keine Move-Operation)
- AC12: Tracking-Pixel-Event feuert bei Anhang-Mail mit Tracking-Pixel (Smoke-Test mit Gmail, Open-Event in `email_tracking_events`)
- AC13: `sendEmailWithTracking` ohne `attachments`-Parameter (Default leer) verhaelt sich bit-identisch zu V5.3 — Cadence-Engine-Regression-Check verifiziert
- AC14: ZIP-Dateien werden akzeptiert ohne Inhalt-Inspection (DEC-100)
- AC15: TypeScript-Build gruen, kein neuer Build-Error

## Dependencies

- FEAT-532 (Composing-Studio-UI: Compose-Form, Live-Preview)
- DEC-085 (Branding-Bucket-Pattern wiederverwenden)
- DEC-097..104 (alle V5.4-Architecture-DECs)
- Self-Hosted Supabase Storage (existing Infra)
- Nodemailer `attachments`-Array Support (existing Lib in `send.ts`)
- MIG-025 (geplant, in MT-1 anwenden)
- Service-Role Storage-Client (existing in `cockpit/src/lib/supabase/admin.ts`)

## Risks

- **Risk:** Tracking-Pixel bei Multipart-Mail wird vom Mailclient ignoriert.
  Mitigation: AC12 verlangt Smoke-Test mit Gmail. Wenn Pixel nicht feuert → Special-Casing dokumentieren (Pixel-Position im HTML-Body, ggf. inline-Style anders).
- **Risk:** 25 MB Total-Limit ueberschreitet SMTP-Provider-Limit.
  Mitigation: aktueller Outbound-Provider erlaubt 25 MB Default. Server-Action liefert klare Fehlermeldung bei SMTP-Reject. Fallback: Limit auf 20 MB reduzieren.
- **Risk:** Storage-Service-Role-Client kann Datei nicht herunterladen (Permission-Issue).
  Mitigation: MIG-025 setzt RLS so, dass service_role Vollzugriff hat (Default in Supabase). Smoke-Test mit echtem Download verifiziert.
- **Risk:** Nodemailer `attachments`-Buffer-Konversion bricht bei grossen Files.
  Mitigation: 10 MB pro File ist gut handhabbar fuer In-Memory-Buffer. Bei OOM-Risiko: Stream-API von Nodemailer nutzen (`content: stream` statt `content: buffer`).
- **Risk:** Cadence-Engine-Regression — Cadence-Send schlaegt fehl wegen `attachments`-Parameter-Default.
  Mitigation: AC13 verlangt expliziten Regression-Check. Cadence-Code-Pfad ruft `sendEmailWithTracking` ohne `attachments` — Default `[]` bewirkt bit-identisches Verhalten.
- **Risk:** Verwaiste Storage-Files bei Page-Reload-Abandonment (Compose-Session ohne Send).
  Mitigation: DEC-104 akzeptiert das als Tech-Debt. Monitoring-Punkt fuer Cleanup-Cron-Slice spaeter.
- **Risk:** ZIP-Anhang mit Schadcode wird unbemerkt rausgesendet.
  Mitigation: User selbst legt Files aus, kein Forwarding-Use-Case. Empfaenger-Mailserver-Filter ist zweite Linie. DEC-100 akzeptiertes B2B-Restrisiko.
- **Risk:** MIME-Whitelist-Konstante wird in Browser anders importiert als in Server (Server-only-Import-Issue).
  Mitigation: Datei hat keinen `"use server"` Marker, kein Node-only-Code. MT-2 verifiziert Import in beiden Pfaden.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `sql/migrations/025_v54_email_attachments.sql` | NEU: MIG-025 SQL |
| `cockpit/src/lib/email/attachments-whitelist.ts` | NEU: Whitelist-Konstanten + validateAttachment-Helper |
| `cockpit/src/app/(app)/emails/compose/attachment-actions.ts` | NEU: uploadEmailAttachment + deleteEmailAttachment Server Actions |
| `cockpit/src/components/email/attachments-section.tsx` | NEU: Drag&Drop + File-Picker + AttachmentsList |
| `cockpit/src/components/email/attachments-preview.tsx` | NEU: Live-Preview-Indikator |
| `cockpit/src/app/(app)/emails/compose/compose-form.tsx` | MODIFY: AttachmentsSection einbinden + Compose-Session-ID + State |
| `cockpit/src/app/(app)/emails/compose/live-preview.tsx` | MODIFY: AttachmentsPreview einbinden |
| `cockpit/src/lib/email/send.ts` | MODIFY: sendEmailWithTracking um attachments-Parameter erweitern + Multipart-Logic |
| `cockpit/src/app/(app)/emails/compose/send-action.ts` | MODIFY: sendComposedEmail um attachments-Handling + Junction-Insert |
| `docs/STATE.md` | Slice done |
| `docs/MIGRATIONS.md` | MIG-025 Date setzen (applied) |
| `slices/INDEX.md` | SLC-542 status `done` |
| `planning/backlog.json` | BL-404 status `done` |
| `features/INDEX.md` | FEAT-541 + FEAT-542 → `done` (am Slice-Ende) |

## QA Focus

- **MIG-025 Apply-Verifikation:**
  - Bucket existiert, ist privat
  - Tabelle hat 6 Spalten + Index + RLS aktiv
  - SELECT als authenticated mit BYPASSRLS (service_role) funktioniert
- **MIME-Whitelist Browser-Block:**
  - `<input accept="...">` blockt EXE-File-Auswahl
  - onChange-Validation im Browser bei manuellem Drag&Drop
- **MIME-Whitelist Server-Block:**
  - Direkter Server-Action-Call mit verbotenem MIME-Type → klarer Fehler
- **Size-Limits:**
  - 11 MB-File wird abgelehnt (Browser + Server)
  - 3 Files mit jeweils 9 MB → 27 MB Total → wird abgelehnt (Total-Limit)
- **Drag&Drop + File-Picker:**
  - Beide Wege funktionieren, Anhaenge erscheinen in Liste
- **Loeschen-Smoke:**
  - Anhang loeschen entfernt Storage-File (Verifikation via Storage-Listing)
- **Multipart-Smoke an Gmail:**
  - PDF + PNG + ZIP gleichzeitig
  - Anhaenge in Gmail downloadbar
  - Tracking-Pixel-Event feuert (in `email_tracking_events`-Tabelle nach Mail-Open)
- **Cadence-Engine-Regression-Check:**
  - Bestehende Cadence-Send-Pfad funktioniert
  - Output-DB-Eintraege bit-identisch zu V5.3
- **Junction-Table-Insert-Verifikation:**
  - Nach Send existieren `email_attachments`-Rows mit korrekten Werten
- **TypeScript-Build:** `npm run build` gruen
- **Verwaiste-Files-Beobachtung (Tech-Debt):** Bucket-Volume nach 5 Test-Compose-Sessions ohne Send dokumentieren (Monitoring-Punkt)

## Micro-Tasks

### MT-1: MIG-025 Migration anwenden
- Goal: Bucket + Junction-Table + Index + RLS auf Hetzner
- Files: `sql/migrations/025_v54_email_attachments.sql`
- Expected behavior:
  - Migration enthaelt: Bucket-Insert (idempotent), Tabelle CREATE, Index CREATE, RLS ENABLE + Policy CREATE
  - Anwenden auf Hetzner via SSH analog Pattern aus `coolify-test-setup.md` Rule
  - Verifikations-Query: `SELECT * FROM storage.buckets WHERE id='email-attachments'; \d email_attachments;`
- Verification: Bucket privat, Tabelle existiert mit 6 Spalten, Index existiert, RLS aktiv
- Dependencies: none

### MT-2: MIME-Whitelist-Konstante + validateAttachment-Helper
- Goal: Single-Source-of-Truth fuer Browser + Server
- Files: `cockpit/src/lib/email/attachments-whitelist.ts`
- Expected behavior:
  - Export `MIME_WHITELIST` (Array von MIME-Strings)
  - Export `EXTENSION_WHITELIST` (Array von Endungen, abgeleitet)
  - Export `MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024` (10 MB)
  - Export `MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024` (25 MB)
  - Export `validateAttachment(file: File | { type, size, name }, totalSizeSoFar: number)`:
    - Prueft MIME gegen Whitelist
    - Prueft Endung gegen EXTENSION_WHITELIST (Defense-in-Depth)
    - Prueft Size <= MAX_FILE_SIZE_BYTES
    - Prueft (totalSizeSoFar + size) <= MAX_TOTAL_SIZE_BYTES
    - Returnt `{ ok: true } | { ok: false, error: string }` mit klarer Fehlermeldung
  - KEIN `"use server"` Marker, kein Node-only-Import (kein `fs`, `path`, etc.)
- Verification: Import-Test in Client-Komponente und Server-Action — beide gruen
- Dependencies: none

### MT-3: Server Actions uploadEmailAttachment + deleteEmailAttachment
- Goal: Service-Role-Storage-Operationen
- Files: `cockpit/src/app/(app)/emails/compose/attachment-actions.ts`
- Expected behavior:
  - `uploadEmailAttachment(formData: FormData)` — Auth-Check, FormData-Parse (`file` + `composeSessionId`), Server-Side-Validation via `validateAttachment` (Total-Size = 0 Pre-Check), Storage-Upload via service_role `supabase.storage.from('email-attachments').upload(path, file)`, Path `${userId}/${composeSessionId}/${file.name}`
  - Bei Erfolg: returnt `{ ok: true, attachment: { storagePath, filename, mimeType, sizeBytes } }`
  - Bei Fehler: returnt `{ ok: false, error }`
  - `deleteEmailAttachment(storagePath: string)` — Auth-Check, Path-Owner-Check (`storagePath` muss mit `${userId}/` starten), Storage-Delete via service_role
  - Bei Erfolg: `{ ok: true }`, bei Fehler `{ ok: false, error }`
- Verification: Server-Action-Smoke mit Postman oder Browser-DevTools — Upload + Download + Delete funktioniert
- Dependencies: MT-1 (Bucket existiert), MT-2 (Whitelist-Konstante)

### MT-4: AttachmentsSection-Komponente (Drag&Drop + File-Picker + Liste)
- Goal: UI-Komponente fuer Anhang-Verwaltung
- Files: `cockpit/src/components/email/attachments-section.tsx`
- Expected behavior:
  - Props: `{ composeSessionId: string, attachments: AttachmentMeta[], onAdd: (att: AttachmentMeta) => void, onRemove: (storagePath: string) => void }`
  - Drag&Drop-Zone (border-dashed, hover-Effect, onDrop-Handler) + File-Picker-Button mit `<input type="file" accept={EXTENSION_WHITELIST.join(',')}>`
  - Browser-Side Validation via `validateAttachment` mit aktuellem `totalSizeSoFar = sum(attachments.size)`
  - Bei Validation-Fehler: Toast oder Inline-Error (shadcn `<Alert>` oder `toast()`)
  - Bei Validation-OK: ruf `uploadEmailAttachment(formData)` mit FormData-Append-Pattern
  - Optimistic UI: temporary Item mit "Lade hoch..."-Spinner, dann ersetzt durch echtes Item nach Server-Response
  - AttachmentsList: pro Item Icon basierend auf MIME (PDF → 📄, PNG → 🖼️, ZIP → 📦, Default → 📎), Filename, Size (kB/MB-formatiert), Loeschen-Button (`<button onClick={() => removeWithServer(att.storagePath)}>×</button>`)
  - Loeschen ruft `deleteEmailAttachment` und removed aus State (via `onRemove`)
- Verification: Browser-Test: Drag&Drop + File-Picker + Loeschen funktional, Whitelist-Block sichtbar
- Dependencies: MT-3

### MT-5: Compose-Form-Integration
- Goal: AttachmentsSection in compose-form.tsx einbinden
- Files: `cockpit/src/app/(app)/emails/compose/compose-form.tsx` (MODIFY)
- Expected behavior:
  - State `composeSessionId = useState(() => crypto.randomUUID())[0]` — stabil pro Page-Load (Tab-Session, DEC-104)
  - State `attachments: AttachmentMeta[]` mit `useState<AttachmentMeta[]>([])`
  - Handlers `handleAddAttachment(att)` (append) und `handleRemoveAttachment(storagePath)` (filter)
  - `<AttachmentsSection composeSessionId={composeSessionId} attachments={attachments} onAdd={handleAddAttachment} onRemove={handleRemoveAttachment} />` direkt unterhalb der Body-Textarea
  - `attachments` und `composeSessionId` werden an `sendComposedEmail` durchgereicht (siehe MT-8)
- Verification: Browser-Test: Section sichtbar, State synchronisiert, Drag&Drop fuegt Item hinzu
- Dependencies: MT-4

### MT-6: Live-Preview-Anhang-Indikator
- Goal: AttachmentsPreview in live-preview.tsx unter Body-Render
- Files: `cockpit/src/components/email/attachments-preview.tsx` (NEU), `cockpit/src/app/(app)/emails/compose/live-preview.tsx` (MODIFY)
- Expected behavior:
  - `<AttachmentsPreview attachments={attachments} />` Komponente
  - Wenn `attachments.length === 0`: nichts rendern
  - Sonst: Sektion mit Header "📎 Anhaenge" + Liste
  - Pro Item: Icon (gleiche Logic wie AttachmentsSection) + Filename + Size
  - Kein Inhalts-Render (kein PDF-Embed, kein Image-Preview)
  - In `live-preview.tsx` nach dem `<BrandedHTML>`-Block einbinden
- Verification: Browser-Test: Preview zeigt Anhang-Indikator, kein Drift zur Mail-Realitaet
- Dependencies: MT-5

### MT-7: send.ts Multipart-Erweiterung
- Goal: sendEmailWithTracking um attachments-Parameter
- Files: `cockpit/src/lib/email/send.ts` (MODIFY)
- Expected behavior:
  - Erweiterung der Options-Type: `attachments?: { storagePath: string, filename: string, mimeType: string }[]`
  - Default: undefined → keine Multipart-Aenderung, bit-identisches V5.3-Verhalten
  - Wenn `attachments?.length > 0`:
    - Service-Role-Storage-Client: `supabase.storage.from('email-attachments').download(path)` pro File → Blob → ArrayBuffer → Buffer
    - Nodemailer `mailOptions.attachments = [{ filename, content: buffer, contentType: mimeType }, ...]`
    - Nodemailer baut Multipart automatisch
  - Tracking-Pixel-Injection bleibt im HTML-Body wie bisher (kein Spezial-Handling)
  - Audit-Log erweitert um `attachmentsCount = attachments?.length ?? 0`
- Verification: Smoke-Test mit echter Mail an Gmail — Anhang kommt an, Tracking-Pixel feuert
- Dependencies: MT-1

### MT-8: sendComposedEmail um attachments-Handling + Junction-Insert
- Goal: Bestehende Send-Action erweitern
- Files: `cockpit/src/app/(app)/emails/compose/send-action.ts` (MODIFY)
- Expected behavior:
  - Bestehende Action bekommt zusaetzlichen FormData-Parameter `attachments` (JSON-stringified `AttachmentMeta[]`) und `composeSessionId`
  - Parse `attachments` (defensive: Array.isArray-Check, Whitelist-Re-Validation pro Item Server-side)
  - Ruft `sendEmailWithTracking({...rest, attachments})` mit dem Anhang-Array
  - Nach erfolgreichem Send: `INSERT INTO email_attachments (email_id, storage_path, filename, mime_type, size_bytes) VALUES ...` fuer jeden Anhang (Service-Role)
  - Bei Send-Fehler: keine Junction-Insert, Storage-Files bleiben (User kann erneut senden ohne Re-Upload)
- Verification: Live-Smoke: Mail mit 2 Anhaengen senden, DB-Eintraege pruefen (`SELECT * FROM email_attachments`)
- Dependencies: MT-3, MT-5, MT-7

### MT-9: Smoke-Test 3 Faelle + Cadence-Regression-Check
- Goal: 3 dokumentierte Test-Faelle in QA-Report + Cadence-Regression
- Files: keine (manueller Test im QA-Report)
- Expected behavior:
  - **Test-Fall 1 — PDF an Gmail:**
    - 5 MB PDF anhaengen, Mail an gmail-test-Postfach
    - Gmail empfaengt Mail mit PDF-Anhang downloadbar
    - Tracking-Pixel-Event feuert nach Mail-Open (Verifikation in `email_tracking_events`)
  - **Test-Fall 2 — PNG an Gmail:**
    - 0.5 MB PNG anhaengen, Mail raus
    - Gmail zeigt PNG inline-preview, Anhang downloadbar
  - **Test-Fall 3 — ZIP an Gmail:**
    - 2 MB ZIP anhaengen (mit PDF + Bild im Inneren)
    - Gmail empfaengt ZIP, ZIP-Download funktioniert, Inhalt unveraendert
    - Akzeptanz ohne Inhalt-Inspection (DEC-100)
  - **Cadence-Regression:**
    - Bestehende Cadence aktivieren mit normalem Send (ohne Anhang)
    - Cadence-Mail raus, DB-Eintraege in `emails` + `email_tracking_events` bit-identisch zu V5.3-Pattern
    - Optional: SQL-Diff vor/nach Slice fuer 1 Cadence-Send
  - Dokumentation in QA-Report (RPT-XXX): pro Fall Mail-ID, Storage-Path, Junction-Row-ID, Tracking-Event-Status, Beobachtungen
- Verification: 3 Faelle dokumentiert, Cadence-Regression bestaetigt
- Dependencies: MT-1..MT-8

## Schaetzung

~1-1.5 Tage:
- MT-1 (MIG-025 + Apply): ~30min
- MT-2 (Whitelist-Konstante): ~30min
- MT-3 (Server Actions): ~1h
- MT-4 (AttachmentsSection): ~1.5h
- MT-5 (Compose-Form-Integration): ~30min
- MT-6 (Live-Preview-Indikator): ~30min
- MT-7 (send.ts Multipart): ~1h
- MT-8 (sendComposedEmail Update): ~45min
- MT-9 (Smoke-Test + Cadence-Regression): ~1.5h
- Buffer + Build + Bug-Fixing: ~1-2h

**Gesamt: ~8-10h, ein Tag mit etwas Puffer.**
