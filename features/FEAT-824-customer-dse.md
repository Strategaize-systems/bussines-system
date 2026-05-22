# FEAT-824 — Customer-Facing Datenschutzerklaerung (Multi-Tenant-Ready)

- **Version:** V8.4
- **Status:** planned
- **Priority:** High (Compliance-Gate vor Customer-Live)
- **Created:** 2026-05-22
- **Related Backlog:** BL-488
- **Predecessor:** FEAT-821 V8.2 DSGVO-Public Foundation (Plattform-DSE), FEAT-523 V5.2 Einwilligungstexte (Consent-Templates)

## Problem Statement

Wenn die Plattform an Kunden des Plattform-Users (z.B. an Kunden von Strategaize Transition BV) kommuniziert, muss der Kunde gem. Art. 13 DSGVO darueber informiert werden, **wie der Plattform-User** seine Daten verarbeitet. Das ist rechtlich **eine andere Datenschutzerklaerung** als die Plattform-DSE (V8.2 `/datenschutz`):

| | Plattform-DSE (V8.2, live) | Kunden-DSE (V8.4, neu) |
|---|---|---|
| Verantwortlich | Strategaize Transition BV (die Plattform) | Der Plattform-User (z.B. Strategaize Transition BV als CRM-Betreiber, oder kuenftig Imo-Checkheft) |
| Datensubjekt | Plattform-User (immo@bellaerts.de, Teamleads, Members) | Kunden des Plattform-Users |
| Inhalt | Wie die Plattform User-Daten verarbeitet (Bedrock Frankfurt, Hetzner, RLS, etc.) | Wie der Plattform-User Kundendaten verarbeitet (CRM-Speicherung, E-Mail-Tracking, Anruf-Aufnahme, Meeting-Transkription) |
| Sichtbarkeit | Public `/datenschutz` mit Footer-Links | Public `/p/[tenant-slug]/datenschutz`, verlinkt im Consent-Form + Mail-Footer |

Heute sieht der Kunde im Consent-Form (`/app/consent/[token]/`) zwar einen Grant/Decline-Button, aber **keine Datenschutzerklaerung**, der er zustimmt. Das ist DSGVO-unzureichend (Informations-Pflicht Art. 13).

## Goal / Intended Outcome

Der Kunde sieht **vor** seiner Einwilligung eine vollstaendige Datenschutzerklaerung des sendenden Plattform-Users, kann sie in einem separaten Tab oeffnen + lesen, und gibt seine Einwilligung in Kenntnis dieser DSE ab. Audit-Trail erfasst die Tatsache der Einwilligung (Version + Timestamp + IP-Hash) gem. DSGVO-Nachweispflicht.

Multi-Tenant-Ready: Pro Tenant (= team_id) wird eine eigene DSE editierbar gehalten. Heute Single-Tenant (Strategaize Transition BV), aber Datenmodell + URLs sind ab V8.4 multi-tenant-faehig.

## Primary Users

| Rolle | Use-Case |
|---|---|
| **Tenant-Admin** (z.B. immo@bellaerts.de) | Editiert die DSE seines Tenants in `/settings/compliance`. Publiziert neue Version. Entscheidet beim Publish ob Re-Consent ausgeloest wird. |
| **Kunde des Tenants** (Empfaenger der Consent-Mail) | Oeffnet `/consent/[token]`, klickt auf Link "Datenschutzerklaerung lesen", liest `/p/[tenant-slug]/datenschutz` in neuem Tab, kehrt zum Consent-Form zurueck, gibt Einwilligung. |
| **Plattform-Owner** (Strategaize Dev-Team) | Verwaltet Default-Seed-Text fuer neue Tenants. Hat keine direkte Edit-Befugnis fuer Tenant-DSEs (Tenant-Isolation). |

## V1 Scope (Core)

### IN V1

1. **DB-Schema:** Neue Tabelle `legal_documents` mit `tenant_team_id` (FK auf teams.id), `kind` ('customer-dse'), `content_md`, `published_at`, `created_at`, `updated_at`. RLS scoped auf `team_id`.
2. **Default-Seed:** Bei Migration wird Default-Markdown-Text mit Platzhaltern (`{{tenant_name}}`, `{{tenant_address}}`, `{{kvk_or_handelsregister}}`, `{{contact_email}}`) erzeugt fuer alle bestehenden Teams. Tenant-Admin muss Platzhalter ersetzen, bevor DSE als "ready" gilt.
3. **Markdown-Editor:** `/settings/compliance/customer-dse` Page (Admin-only) mit Textarea-Editor + Live-Preview-Pane. Pattern-Reuse aus `/settings/compliance` (V5.2 Templates).
4. **Public-Route:** `/p/[tenant-slug]/datenschutz` (z.B. `/p/strategaize-transition-bv/datenschutz`). Liest aktive DSE per `tenant-slug` -> `team_id` Aufloesung, rendert via `renderLegalMarkdown` (V8.2 Reuse) in eigener `.customer-dse-content`-CSS-Schicht. Middleware-Whitelist um `/p/` ergaenzen.
5. **Consent-Form-Verlinkung:** `consent-form.tsx` bekommt Link "Datenschutzerklaerung lesen" mit `target="_blank"` auf `/p/[tenant-slug]/datenschutz` des Tenants des aktuellen Consent-Tokens.
6. **Mail-Footer-Auto-Insert:** Jede vom System verschickte Kunden-Mail (Compose-Studio, Consent-Request, Pre-Call-Briefing, Follow-Up) bekommt automatisch DSE-Link im Footer ("Datenschutzerklaerung: https://business.strategaizetransition.com/p/[tenant-slug]/datenschutz"). Implementierung in zentralem Mail-Composer.

### OUT OF V1 (V2+)

- **Versionierung mit History + Re-Consent-Choice pro Publish** — User hat in der Klaerung "Tenant-Admin entscheidet pro Publish" gewaehlt. Aber im V1-Scope nicht angekreuzt. **Open Question fuer /architecture**: V1 nur Latest-Version-Single-Row, oder direkt Versionierung-Tabelle mit Re-Consent-Choice? Bei deferred V2 ist die Publish-Regel V2-Konzept.
- **Template-Variables Auto-Replacement** — `{{tenant_name}}` etc. werden in V1 NICHT zur Render-Zeit ersetzt, sondern muessen vom Tenant-Admin manuell im Editor-Text ausgefuellt werden. V2-Kandidat fuer DRY-Pflege.
- **Approval-Workflow** (Draft -> Anwalts-Review -> Publish) — V2+
- **Mehrsprachigkeit** (DE/EN/NL) — V2+
- **Subdomain pro Tenant** (z.B. `strategaize.business...` vs. `immocheckheft.business...`) — Infrastruktur-Issue, V3+
- **Granulare Einwilligungen** (Marketing/Tracking/Recording getrennt) — DSGVO-Best-Practice, V2+
- **Kunden-PDF-Export der DSE** — V2+

## Core Features (V1)

| F | Feature | User-Story | Acceptance |
|---|---|---|---|
| F1 | DSE-Tabelle (team_id-scoped) | Als Plattform brauche ich DSE-Speicherung pro Tenant | `legal_documents` Tabelle mit RLS (team_id-Scope), nur eigener Tenant sichtbar/editierbar |
| F2 | Default-Seed bei Migration | Als neuer Tenant bekomme ich Default-DSE-Text mit Platzhaltern | Bei Migration alle existierenden teams.id bekommen `legal_documents`-Row mit Default-Text |
| F3 | Markdown-Editor `/settings/compliance/customer-dse` | Als Tenant-Admin will ich meine DSE editieren | Textarea + Save + Live-Preview, admin-only via `assertRole(['admin'])` |
| F4 | Public-Route `/p/[tenant-slug]/datenschutz` | Als Kunde will ich die DSE lesen | Page liest team_id via slug, rendert Markdown via `renderLegalMarkdown`, `.customer-dse-content` CSS-Schicht |
| F5 | Consent-Form-Verlinkung | Als Kunde will ich VOR Einwilligung die DSE sehen | `consent-form.tsx` zeigt Link "Datenschutzerklaerung lesen" `target="_blank"` vor Grant/Decline-Buttons |
| F6 | Mail-Footer-Auto-Insert | Als Plattform stelle ich sicher dass jede Mail die DSE referenziert | Mail-Composer zentral patched, Footer-Block mit DSE-URL des sendenden Tenants automatisch eingefuegt |
| F7 | Slug-Generator + Eindeutigkeit | Als Plattform brauche ich URL-faehige Tenant-Slugs | `teams.slug`-Spalte (UNIQUE), Auto-Generate aus team_name bei Erstanlage, Pattern aus `reference_partner_slug_pattern` reusen |

## Constraints

- **Stack:** Next.js 16 + Supabase + Server-Components. Pattern-Reuse aus V8.2 (`renderLegalMarkdown`, `LegalPageShell`-Variante).
- **Multi-Tenant per `team_id`** (User-Direktive, V7-RLS-Helper-Reuse). Kein eigenes `tenant_id`-Schema-Refactor.
- **Default-Seed muss DSGVO-belastbar sein** als Ausgangstext, aber Tenant-Admin muss spezifische Platzhalter ergaenzen (Adressen, KvK/HR-Nr, BTW/USt-ID, Auftragsverarbeiter-Liste, Speicherdauer).
- **Public-Route ohne Auth** (`/p/[tenant-slug]/datenschutz` in Middleware-`publicPaths`-Whitelist) — analog V8.2-Hotfix-Lehre IMP-736 NICHT vergessen.
- **`feedback_compliance_gate_later`:** Anwalts-Pruefung der Default-Texte ist deferred bis Pre-Customer-Live. V8.4 produziert *technische* Foundation, nicht juristische Endfassung.
- **`feedback_strategaize_pattern_reuse`:** Slug-Generator, Public-Route-Pattern und Markdown-Renderer existieren — neu schreiben verboten.

## Risks / Assumptions

| Risk | Mitigation |
|---|---|
| **R1** Default-Seed-Text ist Pseudo-DSE | Klar als Entwurf markiert ("Internal-Test-Mode"-Banner), Tenant-Admin-Onboarding-Hinweis verpflichtend |
| **R2** Tenant-Slug-Kollision (z.B. zwei Tenants mit "strategaize") | UNIQUE-Constraint auf `teams.slug`, Auto-Suffix-Nummerierung bei Konflikt (Pattern aus OP) |
| **R3** Mail-Footer-Auto-Insert bricht bestehende Mails | Mail-Composer zentral patchen, Vorher-Nachher-Snapshot-Tests fuer existierende Templates |
| **R4** Versionierung-Frage offen | /architecture klaert. Empfehlung: V1 Latest-Version-Single-Row, V2 Versionierung-Tabelle |
| **R5** Pre-Existing-Kunden-Consent verweist nicht auf DSE | Migration NACH Publish: bestehende `consent_status = 'granted'` werden NICHT angefasst (entsprechen alter Sachlage), neue Consents ab Live-Date sehen DSE-Verlinkung |
| **R6** Plattform-Slug `business.strategaizetransition.com/p/strategaize-transition-bv/datenschutz` ist semantisch redundant | Acceptable in V1, Subdomain-Branding ist V3+ |

### Assumptions

- Plattform bleibt vorerst Single-Tenant (Strategaize Transition BV). V8.4 baut Multi-Tenant-Foundation pro-aktiv fuer kuenftige Tenant-Onboarding ohne Schema-Refactor.
- `teams.id` ist semantisch heute Top-Level-Tenant-Id (auch wenn V7-RLS-Helper es als "Team-Untergruppe" benannt hat).
- Bestehende Consent-Foundation (V4.1 + V5.2) bleibt unangetastet. V8.4 erweitert sie nur um die DSE-Verlinkung im Form.

## Success Criteria

| # | Kriterium | Verifikation |
|---|---|---|
| S1 | Tenant-Admin kann DSE im Editor speichern | Live-Smoke: Edit + Save -> Preview zeigt neuen Inhalt |
| S2 | Public-URL `/p/[tenant-slug]/datenschutz` rendert die DSE ohne Login | HTTP 200, Markdown rendered, `.customer-dse-content` CSS aktiv |
| S3 | Consent-Form zeigt DSE-Link vor Grant/Decline | Live-Smoke: Token-URL -> Form hat Link "Datenschutzerklaerung lesen" |
| S4 | Mail-Footer enthaelt DSE-URL des sendenden Tenants | Test-Mail an immo@bellaerts.de -> Footer enthaelt `https://.../p/[slug]/datenschutz`-Link |
| S5 | Slug-Generator vermeidet Kollisionen | Unit-Test: zwei teams "Strategaize Inc" + "Strategaize BV" -> 2 unique Slugs |
| S6 | Default-Seed wird bei Migration eingefuegt fuer alle existierenden Teams | DB-Check: COUNT(*) FROM legal_documents WHERE kind = 'customer-dse' = COUNT(*) teams |
| S7 | RLS verhindert Cross-Tenant-Zugriff im Editor | Vitest: Tenant-A-Admin sieht NICHT Tenant-B-DSE |
| S8 | Public-Route ist nicht auth-gated (Middleware-Whitelist) | HTTP-Smoke: `/p/[slug]/datenschutz` HTTP 200 ohne Cookie (NICHT 307 -> /login) |

## Open Questions (fuer /architecture)

1. **Versionierung jetzt oder spaeter?** User hat "Tenant-Admin entscheidet pro Publish" als Regel gewaehlt, aber im V1-Scope nicht angekreuzt. Architektur-Tradeoff: V1 = nur `legal_documents` 1 Row pro Tenant (kein History) vs. V1 = `legal_documents` + `legal_document_versions` (History + Re-Consent-Mechanik). Empfehlung: V1 KISS = 1 Row, V2 fuer History.
2. **Slug-Schema fuer Plattform-User immo@bellaerts.de**: Was ist der initiale Tenant-Slug? `strategaize-transition-bv`? `default`? Onboarding-Konvention noch nicht definiert.
3. **Re-Consent-Cron-Integration**: Wenn Versionierung kommt, wie greift `pending-consent-renewal`-Cron auf DSE-Version-Changes zu? Out-of-scope V1 wenn Versionierung defer V2.
4. **Mail-Composer Touchpoints**: Welche Mail-Pfade muessen Footer-Auto-Insert bekommen? Compose-Studio + Consent-Request + Cadences + Pre-Call-Briefing + Follow-Up + Magic-Link + Set-Password — Inventur in /architecture.
5. **Auftragsverarbeiter-Liste im Default-Seed**: Soll diese aus zentraler `auftragsverarbeiter`-Tabelle gezogen werden, oder als Markdown-Block im Default-Text? V1 vermutlich Markdown-Block, V2 Tabellen-basiert.
6. **Customer-DSE-CSS** (`.customer-dse-content`) — eigene Schicht analog `.legal-content` und `.help-content`, oder reuse `.legal-content`? Empfehlung: eigene Schicht analog V8.3-Pattern.
7. **Slug-Aufloesung Public-Route**: Server-Component liest `teams.slug` -> `team_id` -> `legal_documents.content_md`. Pattern fuer Hairpin-Routing innerhalb (app)-Layout-fremder Public-Route. Architektur muss klaeren.

## Delivery Mode

**Internal-Tool** (aktuell), wird zu **SaaS-relevant** sobald Multi-Tenant-Onboarding live geht. Internal-Test-Mode bleibt aktiv bis Pre-Customer-Live-Anwaltspruefung (`feedback_compliance_gate_later`).

## Recommended Next Step

`/architecture FEAT-824` — entscheidet die 7 Open Questions, vor allem Versionierung-V1-vs-V2. Architektur sollte ca. 6-10 Slices definieren (Schema-Migration, Slug-Generator, Default-Seed, Public-Route, Editor, Mail-Composer-Patch, Consent-Form-Patch, Tests). Aufwand: ~6-10h Code-Side, ~2 Wochen-Slot V8.4.
