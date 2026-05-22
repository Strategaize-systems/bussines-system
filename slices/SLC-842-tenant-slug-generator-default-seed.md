# SLC-842 — V8.4 Slug-Generator + Reserved-Slugs + Default-Seed-Markdown + Phase-5-Apply

- **Feature:** FEAT-824 / BL-488
- **Version:** V8.4
- **Status:** planned
- **Priority:** Blocker
- **Created:** 2026-05-22
- **Estimated:** ~2h Code-Side
- **Depends-On:** SLC-841
- **Architecture:** DEC-232 (Slug-Backfill), DEC-237 (Auftragsverarbeiter Markdown-Block)
- **Pattern-Reuse:** OP-V7 SLC-131 (`reference_partner_slug_pattern`) — 6 Bausteine 1:1

## Goal

TypeScript-Slug-Generator + Reserved-Slugs-Liste + Default-Seed-Markdown-File anlegen, dann MIG-038 Phase 5 (Default-Seed INSERT) auf Hetzner anwenden. Nach diesem Slice hat jedes bestehende Team eine Default-Customer-DSE-Row in `legal_documents`, und neue Teams bekommen via Server-Action expliziten Slug + Default-DSE.

## Scope

### IN
- `lib/team/slug.ts` Pure-Function 1:1 Reuse aus OP-V7 SLC-131 (Quell-Pfad-Header-Kommentar Pflicht laut `strategaize-pattern-reuse.md`): `generateSlug(displayName)` + `generateUniqueSlug(displayName, existingSlugs)` + Empty-Throw
- `lib/team/reserved-slugs.ts` mit BS-spezifischer Reserved-Liste + `isReservedSlug(slug)` Helper
- `cockpit/src/content/legal/customer-dse-default.md` Default-Seed-Markdown mit Platzhaltern (`{{tenant_name}}, {{tenant_address}}, {{kvk_or_handelsregister}}, {{contact_email}}`) + Auftragsverarbeiter-Markdown-Block (DEC-237)
- MIG-038 Phase 5 Apply: `INSERT INTO legal_documents SELECT id, 'customer-dse', '<default-md-content>' FROM teams ON CONFLICT (tenant_team_id, kind) DO NOTHING;` ueber file-read + base64-Pipe (Markdown-Content als String-Literal)
- Vitest fuer Slug-Generator: 9-12 Cases (Standard + Sonderzeichen + Umlaute + Truncate + Empty-Throw + generateUniqueSlug Kollision + Reserved + Multi-Suffix + Case-Insensitive)

### OUT
- Team-Erstellungs-Server-Action-Patch (V8.4 hat keinen Tenant-Onboarding-Flow, kein Aktor heute — V8.5+ bei Multi-Tenant-Onboarding)
- Editor-UI (SLC-844)
- Public-Route (SLC-843)
- Auftragsverarbeiter-Tabelle (V2)

## Acceptance Criteria

- **AC1** `lib/team/slug.ts` enthaelt `generateSlug` + `generateUniqueSlug` mit OP-V7-konformer NFD-Decompose-Logik (deutsche Umlaute pre-translit + Lowercase + Combining-Marks-Strip + Regex + Collapse + Truncate60). Header-Kommentar nennt Quell-Pfad `strategaize-onboarding-plattform/src/lib/partner/slug.ts`.
- **AC2** `lib/team/reserved-slugs.ts` enthaelt `RESERVED_SLUGS` Set + `isReservedSlug(slug)` mit lowercase-compare. Mindest-Set: `admin, api, public, p, partner, strategaize, auth, assets, _next, favicon.ico, dashboard, login, datenschutz, impressum, settings, help, consent, deals, pipeline, contacts, companies, multiplikatoren, calendar, mein-tag, focus, audit-log, handoffs, referrals`.
- **AC3** `cockpit/src/content/legal/customer-dse-default.md` enthaelt strukturierte Markdown-DSE mit Platzhaltern + `## Auftragsverarbeiter`-Section (Markdown-Tabelle: Anbieter, Rolle, Sitz, DPA-Link). Mindestens 4 Sub-Verarbeiter: Hetzner Cloud (DE/FI), Coolify (NL), AWS Bedrock (DE-Frankfurt), Strategaize-Plattform.
- **AC4** Vitest `lib/team/slug.test.ts` mit 9+ Tests PASS. Test-Pattern aus OP-V7 SLC-131 dokumentiert in `reference_partner_slug_pattern.md`.
- **AC5** MIG-038 Phase 5 angewandt auf Hetzner: `SELECT COUNT(*) FROM legal_documents WHERE kind='customer-dse';` = `SELECT COUNT(*) FROM teams;` (1 = 1 fuer aktuellen einzigen Tenant).
- **AC6** Default-Seed-Markdown im legal_documents-Eintrag korrekt geladen — `SELECT length(content_md) FROM legal_documents WHERE tenant_team_id=<id> AND kind='customer-dse';` > 1000 Zeichen.

## Micro-Tasks

### MT-1: lib/team/slug.ts 1:1 Reuse aus OP-V7
- Goal: Slug-Generator portieren mit Quell-Pfad-Header-Kommentar.
- Files: `cockpit/src/lib/team/slug.ts` (NEU, ~80 Zeilen)
- Expected behavior: `generateSlug("Strategaize Transition BV")` → `"strategaize-transition-bv"`. `generateSlug("Müller GmbH")` → `"mueller-gmbh"` (Umlaut-pre-translit). `generateSlug("--")` → throws. `generateUniqueSlug("Strategaize", new Set(["strategaize"]))` → `"strategaize-2"`. `generateUniqueSlug("admin", new Set())` → `"admin-2"` (Reserved-Hit triggert Suffix).
- Verification: Header-Kommentar enthaelt: `// Pattern aus strategaize-onboarding-plattform/src/lib/partner/slug.ts // (Memory: reference_partner_slug_pattern.md / Rule: strategaize-pattern-reuse.md).`
- Dependencies: —

### MT-2: lib/team/reserved-slugs.ts BS-spezifisch
- Goal: Reserved-Slugs-Liste fuer BS-Top-Level-Pfade + Helper.
- Files: `cockpit/src/lib/team/reserved-slugs.ts` (NEU, ~30 Zeilen)
- Expected behavior: `RESERVED_SLUGS` exportierter Set, `isReservedSlug(s)` lowercase-compare. Top-Level-BS-Pfade aus `cockpit/src/app/`-Top-Level + Strategaize-Common-Reserved.
- Verification: `isReservedSlug("Admin")` → `true`, `isReservedSlug("Strategaize-Transition-BV")` → `false`, `isReservedSlug("dashboard")` → `true`.
- Dependencies: —

### MT-3: customer-dse-default.md mit Platzhaltern + Auftragsverarbeiter-Block
- Goal: Default-DSE-Markdown-Text mit ENTWURF-Banner, Verantwortliche-Section mit Platzhaltern, Auftragsverarbeiter-Tabelle, Rechtsgrundlagen, Speicherdauer, Betroffenenrechte. Reuse-Basis: 70% Layout aus `cockpit/src/content/legal/datenschutz.md` (V8.2 Plattform-DSE), aber angepasst auf **Tenant-zu-Kunde**-Verantwortliche-Beziehung (statt Plattform-zu-User).
- Files: `cockpit/src/content/legal/customer-dse-default.md` (NEU, ~150-200 Zeilen Markdown)
- Expected behavior:
  - ENTWURF-Banner oben + Anwalts-Pruefungs-Hinweis (analog V8.2-Pattern)
  - § 1 Verantwortlicher mit Platzhaltern `{{tenant_name}}`, `{{tenant_address}}`, `{{kvk_or_handelsregister}}`, `{{contact_email}}`
  - § 2 Datenschutzbeauftragter
  - § 3 Verarbeitete Daten und Zwecke (Kontaktdaten, Meeting-Transkripte, E-Mails, Calls)
  - § 4 Rechtsgrundlagen (Art. 6 Abs. 1 lit. b + f DSGVO)
  - § 5 Speicherdauer (laufende Geschaeftsbeziehung + N Jahre)
  - § 6 Auftragsverarbeiter (Markdown-Tabelle mit `| Anbieter | Rolle | Sitz | DPA |` und 4+ Zeilen: Hetzner Cloud, Coolify, AWS Bedrock, Strategaize-Plattform)
  - § 7 Betroffenenrechte (Auskunft, Loeschung, Widerspruch, Beschwerde)
  - § 8 Aenderungen der DSE
- Verification: `wc -l customer-dse-default.md` > 150, alle Platzhalter `{{...}}` im File sichtbar.
- Dependencies: —

### MT-4: MIG-038 Phase 5 Apply + Vitest
- Goal: Default-Markdown auf Hetzner laden + Phase-5-INSERT ausfuehren + Vitest schreiben.
- Files:
  - `cockpit/src/lib/team/slug.test.ts` (NEU, 9-12 Tests)
  - Hetzner-side: `legal_documents` UPDATE oder INSERT mit base64-Pipe-Content
- Expected behavior:
  - Hetzner-Apply: Markdown-Inhalt aus `customer-dse-default.md` als base64-encoded String per `psql -c "INSERT INTO legal_documents ... SELECT id, 'customer-dse', decode('<base64>', 'base64')::text FROM teams ON CONFLICT (tenant_team_id, kind) DO NOTHING;"` — ODER per `\copy` aus File. Empfehlung: File auf Server kopieren (scp oder cat-pipe), dann `cat /tmp/customer-dse-default.md | psql ...` oder Inline-String-Literal mit `$$...$$`-Quoting.
  - Vitest: 9-12 Cases siehe AC4. Reuse Test-Pattern aus OP-V7 SLC-131.
- Verification:
  - `SELECT COUNT(*) FROM legal_documents WHERE kind='customer-dse';` = `SELECT COUNT(*) FROM teams;` (= 1)
  - `SELECT length(content_md) FROM legal_documents WHERE tenant_team_id=<id>;` > 1000
  - `npx vitest run lib/team/slug.test.ts` 9+ PASS
- Dependencies: MT-1, MT-2, MT-3

## Risks / Notes

- **R1** Markdown-File-Apply-Strategie via base64 oder $$-Quoting fuer Newlines + Sonderzeichen. Empfehlung base64 (`sql-migration-hetzner.md`-Pattern), weil `$$...$$` mit eingebetteten `$`-Zeichen bricht.
- **R2** Pre-Existing Slug-Mapping unter `lib/handbook/slugify.ts` (github-slugger) NICHT reusen — laesst Umlaute durch. Stolperfalle aus `reference_partner_slug_pattern`. Eigener Generator mit NFD-Decompose-Logik. Falls `lib/handbook/slugify.ts` nicht existiert, gerne — kein Konflikt.
- **R3** Default-Seed-Markdown enthaelt Platzhalter (`{{tenant_name}}` etc.). Tenant-Admin MUSS sie im Editor (SLC-844) manuell ersetzen, sonst zeigt die Public-Route den ENTWURF-Banner + Platzhalter im Klartext. V1 akzeptabel (Internal-Test-Mode). V2 mit Auto-Replacement.
- **R4** Sub-Verarbeiter-Liste muss korrekt sein. Min-Set fuer aktuellen Tenant: Hetzner Cloud GmbH (DE) als Infrastructure, Coolify (NL) als Platform, AWS Bedrock (DE-Frankfurt) als KI-Provider, Strategaize Transition BV als Plattform-Betreiber. Hinweis: DPA-Links sind Platzhalter, Anwalts-Pruefung-deferred.

## Worktree-Isolation

Worktree-Branch `slc-842-slug-generator-default-seed` empfohlen — Touchpoint Hetzner-DB via INSERT.

## Done-Definition

- 3 neue Code-Files committed (slug.ts, reserved-slugs.ts, customer-dse-default.md)
- Vitest 9+ Tests PASS
- Hetzner-Apply Phase 5 erfolgreich (1 Row in legal_documents)
- AC1-AC6 verifiziert
- `/qa` PASS
- Slice-Branch ready
