# SLC-541 — V5.4-Polish (Composing-Studio + Hygiene)

## Meta
- Feature: FEAT-541
- Priority: High
- Status: planned
- Created: 2026-04-28

## Goal

Vier zusammenhaengende Hygiene-Themen nach V5.3-Release in einen Slice gebuendelt: Color-Picker AC9-Drift Fix (ISSUE-043), ESLint Hook-Order Cleanup, COMPLIANCE.md V5.3-Section, Coolify-Cron-Cleanup-User-Anleitung in REL-019-Notes. Ziel: V5.3-Composing-Studio-Stack ist polished + hygienisch, AC9 aus FEAT-531 wieder zuverlaessig erfuellt, kein Lint-Noise, COMPLIANCE.md auf V5.3-Stand, Coolify-Crons aufgeraeumt (User-Aktion).

## Scope

- **Color-Picker AC9-Drift Fix (ISSUE-043, DEC-102):**
  - Neue Komponente `cockpit/src/components/branding/conditional-color-picker.tsx` mit Toggle-Checkbox "Markenfarbe verwenden" + native `<input type="color">`
  - Toggle aus → Color-Picker disabled, Wert NULL
  - Toggle an → Color-Picker aktiv, Wert = Hex
  - Initialer Toggle-State leitet sich aus `value !== null` ab
  - `/settings/branding`-Form auf neue Komponente umstellen (primary + secondary Color-Picker)
  - Form-Submit-Mapping: NULL bei Toggle aus, Hex bei Toggle an
  - **Keine Datenmigration:** Bestehende Branding-Eintraege bleiben unveraendert (DEC-102 Defensive-Migration-Verzicht)
- **ESLint Hook-Order Cleanup:**
  - `cockpit/src/components/email/new-template-dialog.tsx` und `cockpit/src/components/email/inline-edit-dialog.tsx`
  - Alle Hooks unconditional am Komponent-Top-Level vor jedem `if`/`return`
  - Keine Funktional-Aenderung erwartet
- **COMPLIANCE.md V5.3-Section (DEC-103 — Doku im selben Slice):**
  - Neue Sektion "V5.3 — E-Mail Composing Studio" in `docs/COMPLIANCE.md`
  - Beschreibt 3 Datenfluesse: Branding-Settings (Logo in Storage, Farben/Footer in DB), Composing-Studio (Body-Text + Vorausfuell-Vars an Bedrock fuer KI-Improve), Inline-Edit-Diktat (Whisper-Transkript + Body an Bedrock)
  - Whisper-Provider-Hinweis: aktuell openai-default V5.2, Azure-Code-Ready ab V5.2 (Pre-Pflicht-Switch)
  - Retention: Branding-Settings persistiert bis User loescht; KI-Calls werden geloggt aber nicht der Mail-Body
- **Coolify-Cron-Cleanup-User-Anleitung in REL-019-Notes:**
  - Anleitung als Sektion in `docs/RELEASES.md` REL-019-Eintrag
  - Klick-fuer-Klick-Schritte mit konkreten Cron-Namen aus Coolify-UI:
    - (a) Konsolidieren: `Classify` vs `classify-emails` → behalten `classify-emails`, loeschen `Classify`
    - (b) Konsolidieren: zwei `embedding-sync` (5min + 15min) → behalten 15min, loeschen 5min
    - (c) Konsolidieren: `retention` (V4.1 Whisper) vs `recording-retention` (V5.2) — pruefen ob V4.1-Endpoint noch lebt; wenn nicht, loeschen
    - (d) Reparieren oder loeschen: Cron mit literalem `CRON_SECRET_VALUE` als x-cron-secret (verifizieren via Cron-Logs vorab)
    - (e) 3 Crons mit Klartext-CRON_SECRET im Command auf `process.env.CRON_SECRET`-Pattern umstellen (`imap-sync`, `retention`, `embedding-sync`-alt)
- Update `docs/STATE.md` (Phase implementing → done bei Slice-Abschluss), `slices/INDEX.md` (Status `done`), `planning/backlog.json` (BL-406 + BL-396 → done)

## Out of Scope

- Reset-Button "Alle Branding-Werte loeschen" (Toggle reicht — Reset-Button waere globale Alternative)
- Datenmigration bestehender Branding-Eintraege auf Toggle-Aus (User-Erwartung: was da ist, ist aktiv)
- ESLint-Cleanup ueber die zwei Ziel-Dateien hinaus (V5.4-Scope eng, andere Lint-Hinweise bleiben offen)
- COMPLIANCE.md-Anwalts-Pruefung — V5.4 schreibt nur den Doku-Stand, Review bleibt Pre-Recording-Pflicht
- Automatisierter Coolify-Cron-Cleanup via API (BL-396 ist Operations-Hygiene, kein Code)
- Live-Smoke der Coolify-UI-Aenderungen (User-Aktion, /qa verifiziert nur die Anleitung)

## Acceptance Criteria

- AC1: `<ConditionalColorPicker>`-Komponente in `cockpit/src/components/branding/conditional-color-picker.tsx` exportiert mit Props `{ label, value, onChange, defaultColor }`
- AC2: Auf `/settings/branding` ist vor jedem Color-Picker (primary + secondary) ein Toggle "Markenfarbe verwenden" sichtbar
- AC3: Toggle aus → Color-Picker visuell disabled, beim Speichern wird `primary_color`/`secondary_color` als NULL persistiert
- AC4: Toggle an → Color-Picker aktiv, beim Speichern wird der gewaehlte Hex-Wert persistiert
- AC5: Initial-Render leitet Toggle-State korrekt aus DB-Wert ab (NULL = aus, Hex = an)
- AC6: Bestehende Branding-Eintraege ohne explizites Speichern bleiben unveraendert (kein Datenmigration)
- AC7: AC9 aus FEAT-531 ist wieder zuverlaessig erfuellt — Mail ohne aktivierte Branding-Farben geht bit-fuer-bit wie V5.2 raus, unabhaengig davon ob der User die Settings-Page besucht hat. Live-Smoke-Verifikation: User mit `primary_color=NULL`, eine Mail per Compose-Studio raus, gerendert via `textToHtml`-Fallback, nicht via `renderBrandedHtml`-Output
- AC8: `npm run lint` zeigt keine React-Hook-Order-Warnings mehr in `new-template-dialog.tsx` und `inline-edit-dialog.tsx`
- AC9: Visueller Smoke der zwei betroffenen Dialoge nach Cleanup — keine Funktional-Aenderung
- AC10: `docs/COMPLIANCE.md` enthaelt einen V5.3-Abschnitt mit den 3 Features (Branding, Composing-Studio, Inline-Edit) und nennt die jeweiligen Datenfluesse
- AC11: `docs/RELEASES.md` REL-019-Eintrag enthaelt die Coolify-Cron-Cleanup-User-Anleitung als Sektion mit den 5 Sub-Schritten (a)..(e)
- AC12: TypeScript-Build gruen, kein neuer Build-Error

## Dependencies

- FEAT-531 (Branding-Settings-Page existiert seit V5.3)
- FEAT-533 (`new-template-dialog.tsx` existiert seit V5.3)
- FEAT-534 (`inline-edit-dialog.tsx` existiert seit V5.3)
- `/docs/COMPLIANCE.md` aus V5.2 (FEAT-525)
- DEC-102 (ConditionalColorPicker-Pattern)
- DEC-103 (Polish-Slicing)

## Risks

- **Risk:** Color-Picker-Toggle-State-Ableitung zeigt initial falsch (z.B. Toggle aus bei vorhandenem Wert).
  Mitigation: AC5 verlangt korrekte Ableitung aus DB-Wert. Live-Smoke verifiziert: User mit `primary_color=NULL` sieht Toggle aus, mit Hex-Wert sieht Toggle an mit Wert.
- **Risk:** ESLint-Cleanup deckt latente Hook-Order-Bugs auf, die unter Strict-Mode anders rendern.
  Mitigation: AC9 verlangt visuellen Smoke der zwei Dialoge nach Cleanup. Keine Funktional-Aenderung erwartet, aber Verifikation mandatory.
- **Risk:** COMPLIANCE.md-V5.3-Section ist unvollstaendig — Anwalts-Review-Aufwand steigt spaeter.
  Mitigation: Klare Sektions-Struktur (3 Features, jeweils Datenfluss + Retention + Provider). Anwalt review sich der Vollstaendigkeit, hat aber Strukturhilfe.
- **Risk:** Coolify-Cron-Cleanup-Anleitung wird vom User missverstanden, falsche Crons geloescht.
  Mitigation: Schritt-fuer-Schritt mit konkreten Cron-Namen + Pre-Snapshot-Empfehlung (Coolify-Cron-Liste vor Aenderung exportieren oder photographieren).
- **Risk:** Form-Submit-Mapping schlaegt fehl wenn Toggle-State nicht in FormData gemappt wird.
  Mitigation: MT-2 verifiziert den Mapping-Pfad (FormData → Server Action → Update). Live-Smoke pre/post Speichern.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/components/branding/conditional-color-picker.tsx` | NEU: ConditionalColorPicker-Komponente |
| `cockpit/src/app/(app)/settings/branding/branding-form.tsx` | MODIFY: primary + secondary Color-Picker auf ConditionalColorPicker umstellen |
| `cockpit/src/app/(app)/settings/branding/actions.ts` | MODIFY (falls noetig): Form-Submit-Mapping NULL/Hex |
| `cockpit/src/components/email/new-template-dialog.tsx` | MODIFY: Hook-Order Cleanup |
| `cockpit/src/components/email/inline-edit-dialog.tsx` | MODIFY: Hook-Order Cleanup |
| `docs/COMPLIANCE.md` | MODIFY: V5.3-Section neu |
| `docs/RELEASES.md` | MODIFY: REL-019 mit Coolify-Anleitung |
| `docs/STATE.md` | Slice done |
| `slices/INDEX.md` | SLC-541 status `done` |
| `planning/backlog.json` | BL-406 + BL-396 status `done` |

## QA Focus

- **Color-Picker Toggle-Verhalten Live-Smoke:**
  - Browser oeffnen `/settings/branding`
  - Initial: Toggle-State korrekt aus DB-Wert abgeleitet
  - Toggle aus → Color-Picker disabled
  - Toggle an → Color-Picker aktiv mit Default-Color (`#4454b8` primary, `#94a3b8` secondary)
  - Speichern → DB-Wert NULL bei Toggle aus, Hex bei Toggle an
  - Reload → Toggle-State korrekt wiederhergestellt
- **AC9-Verifikation (FEAT-531-Bit-Identitaet):**
  - User mit `primary_color=NULL` und `secondary_color=NULL`
  - Mail per `/emails/compose` raus
  - Output muss bit-identisch zu V5.2 sein (`textToHtml`-Fallback, kein `renderBrandedHtml`-Output)
- **ESLint-Build-Output:** `npm run lint` zeigt keine Hook-Order-Warnings mehr in den 2 Ziel-Dateien
- **Visueller Smoke:** NewTemplateDialog + InlineEditDialog oeffnen, schliessen, Aktionen durchfuehren — keine Funktional-Aenderung
- **COMPLIANCE.md-Existenz-Check:** Sektion "V5.3" mit 3 Sub-Sektionen (Branding, Composing-Studio, Inline-Edit) existiert
- **REL-019-Notes-Existenz-Check:** Coolify-Cron-Cleanup-Sektion mit 5 Sub-Schritten (a)..(e) existiert
- **TypeScript-Build:** `npm run build` gruen

## Micro-Tasks

### MT-1: ConditionalColorPicker-Komponente
- Goal: Wiederverwendbare Toggle+Color-Picker-Komponente
- Files: `cockpit/src/components/branding/conditional-color-picker.tsx`
- Expected behavior:
  - Props: `{ label: string, value: string | null, onChange: (val: string | null) => void, defaultColor: string }`
  - State: `enabled = value !== null` (abgeleitet aus value)
  - shadcn `<Checkbox>` + Label "Markenfarbe verwenden"
  - Native `<input type="color">` daneben, `disabled={!enabled}`
  - Toggle-Click: setze enabled, ruf onChange(enabled ? defaultColor : null)
  - Color-Input-onChange: ruf onChange(newHex)
  - Keine Submit-Logik in der Komponente — Form-Submit ist Eltern-Verantwortung
- Verification: TypeScript-Compile + Komponente wird in MT-2 eingesetzt
- Dependencies: none

### MT-2: /settings/branding-Form-Update
- Goal: primary + secondary Color-Picker auf ConditionalColorPicker umstellen
- Files: `cockpit/src/app/(app)/settings/branding/branding-form.tsx`, evtl. `actions.ts`
- Expected behavior:
  - 2 ConditionalColorPicker-Instanzen (primary mit defaultColor `#4454b8`, secondary mit `#94a3b8`)
  - State `primaryColor: string | null`, `secondaryColor: string | null`
  - Form-Submit: FormData mit `primary_color = primaryColor || ''` und `secondary_color = secondaryColor || ''`
  - Server Action `updateBranding` map empty-string zu NULL (wenn nicht schon der Fall)
  - Initial-Load: aus `branding_settings`-Row, `primaryColor = row.primary_color` (kann NULL sein)
- Verification: Live-Smoke Toggle-Verhalten + DB-Wert-Pruefung pre/post Speichern
- Dependencies: MT-1

### MT-3: ESLint Hook-Order Cleanup
- Goal: React-Hook-Order-Warnings in 2 Dateien aufloesen
- Files: `cockpit/src/components/email/new-template-dialog.tsx`, `cockpit/src/components/email/inline-edit-dialog.tsx`
- Expected behavior:
  - Alle `useState`, `useEffect`, `useCallback`, `useMemo` etc. am Komponent-Top-Level vor jedem `if`-Statement und vor jedem `return`
  - Keine Funktional-Aenderung — nur Reorder
- Verification: `npm run lint` clean fuer die 2 Dateien; visueller Smoke der Dialoge
- Dependencies: none

### MT-4: COMPLIANCE.md V5.3-Section
- Goal: V5.3-Section mit 3 Features beschreiben
- Files: `docs/COMPLIANCE.md`
- Expected behavior:
  - Neue Sektion "## V5.3 — E-Mail Composing Studio" am Ende der V5.x-Sequenz
  - Sub-Sektion "### Branding-Settings (FEAT-531)":
    - Welche Daten persistiert: Logo (Storage `branding`-Bucket), Farben (DB), Footer-Text (DB), Kontakt-Block (DB)
    - Retention: bis User loescht
    - Datenfluss: Logo wird via `/api/branding/logo`-Proxy ausgeliefert (kein direkter Storage-Public-Read)
  - Sub-Sektion "### Composing-Studio (FEAT-532, FEAT-533)":
    - KI-Calls an Bedrock Frankfurt: Body-Text + Empfaenger-/Betreff-Vorausfuell-Vars + System-Prompt
    - Audit-Log auf Server, Mail-Body NICHT geloggt (nur Length + Provider/Model/User/Lang)
    - KI-Vorlagen-Generator: User-Prompt-Text an Bedrock, JSON-Output zurueck
  - Sub-Sektion "### Inline-Edit-Diktat (FEAT-534)":
    - Whisper-Provider: aktuell openai-default V5.2, Azure-Code-Ready ab V5.2 (Pre-Pflicht-Switch vor erstem produktivem Recording)
    - Audio-Stream zu Whisper, Transkript zurueck, dann Transkript + Body an Bedrock
    - Audio-Stream wird NICHT persistiert (live-stream)
- Verification: Sektion existiert + 3 Sub-Sektionen mit Datenfluss-Beschreibungen vorhanden
- Dependencies: none

### MT-5: REL-019-Notes mit Coolify-Cron-Cleanup-Anleitung
- Goal: User-Anleitung als Doku-Sektion in REL-019
- Files: `docs/RELEASES.md`
- Expected behavior:
  - REL-019 noch nicht angelegt — kommt im /deploy-Schritt. Aber: Vorab-Skizze als kommentierte Sektion, oder neue Sektion "Coolify-Cron-Cleanup (User-Aktion mit V5.4-Deploy)" innerhalb der V5.4-Carryover-Notes
  - Pre-Snapshot-Empfehlung: "Vor Aenderungen: Cron-Liste exportieren oder per Screenshot dokumentieren"
  - 5 Sub-Schritte (a)..(e) klar beschrieben:
    - (a) Klassifizierungs-Cron-Konsolidierung mit konkreten Namen
    - (b) Embedding-Sync-Konsolidierung (welcher behalten, welcher geloescht)
    - (c) Retention-Cron-Pruefung mit Endpoint-Verifikations-Schritt
    - (d) Kaputter `CRON_SECRET_VALUE`-Cron-Reparatur oder -Loeschung mit Log-Hinweis
    - (e) Klartext-CRON_SECRET-Migration auf `process.env.CRON_SECRET`-Pattern (3 betroffene Crons benannt)
  - Hinweis "User-Aktion" + Verifikations-Schritt nach Aenderung (Cron-Logs-Check)
- Verification: Sektion existiert mit 5 Sub-Schritten
- Dependencies: none

## Schaetzung

~3-4h:
- MT-1 (ConditionalColorPicker): ~30min
- MT-2 (Form-Update): ~45min
- MT-3 (ESLint-Cleanup): ~30min
- MT-4 (COMPLIANCE.md): ~45min
- MT-5 (REL-019-Notes): ~30min
- Buffer + Smoke + Build-Check: ~30-60min
