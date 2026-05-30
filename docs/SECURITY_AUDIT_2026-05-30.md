# Security Audit 2026-05-30 — Strategaize Business System

## Zusammenfassung

- Blocker: 0
- High: 8
- Medium: 7
- Low: 5
- DSGVO-flagged: 6 (Subset von oben, kann ueberlappen)

Audit-Scope: cockpit/src/**, sql/** (sql/01..20 + sql/migrations/019..040), cockpit/package.json. Test-Files (__tests__, *.test.ts) und node_modules ausgenommen. Audit-Datum: 2026-05-30. Auditor: Claude Code (autonomous run).

Bekannte Issues aus `/docs/KNOWN_ISSUES.md` (insb. ISSUE-042, ISSUE-058, ISSUE-066, ISSUE-086) wurden NICHT erneut gelistet — Filter-Liste am Ende des Reports.

Globaler Kontext: V7 RLS-Switch (MIG-035) hat 8 Kerntabellen (companies/contacts/deals/activities/meetings/proposals/email_messages/calls) + profiles + teams auf owner-/team-aware Policies umgestellt. Eine grosse Anzahl von Zweittabellen ist aber weiterhin auf der V1-`authenticated_full_access`-Policy stehen geblieben. Im aktuellen Internal-Test-Mode (1 Admin + Test-Member-Seed) sind diese theoretische Risiken, mit Customer-Live oder einem zusaetzlichen User werden viele zu echten Cross-Owner-Reads.

## Findings

### SEC-001 — IDOR + Cross-Owner-Bedrock-Cost in /api/meetings/[id]/generate-agenda
- Severity: High
- Klasse: IDOR / RLS-Bypass / Cost-Manipulation
- File: cockpit/src/app/api/meetings/[id]/generate-agenda/route.ts:33-56
- DSGVO: ja
- Beschreibung: Endpoint ist auth-gated (`getUser()`), liest aber das Meeting per `createAdminClient()` (service_role / BYPASSRLS) auf `params.id` ohne Tenant-/Owner-Scope-Check. Jeder authenticated User kann eine beliebige Meeting-UUID schicken, kriegt die Meeting-Metadaten + eine LLM-Agenda generiert, die anschliessend `ai_agenda` auf der fremden Row UEBERSCHREIBT (`admin.from("meetings").update`). Plus: Bedrock-Cost wird auf das Caller-Konto gebucht. Reproduktion: als Member A `POST /api/meetings/<UUID-eines-fremden-Meetings>/generate-agenda`.
- Vorschlag: Vor dem `admin.from("meetings")…`-Lookup einen RLS-konformen Vor-Check ueber den USER-Client laufen lassen: `await supabase.from("meetings").select("id").eq("id", id).maybeSingle()` → wenn null, 404. Erst danach den service_role-Pfad fuer Bedrock + Persistenz. Alternativ: `can_see_owner(meetings.owner_user_id)` direkt in SQL pruefen.
- Aufwand: S

### SEC-002 — IDOR + Cross-Owner-Bedrock-Cost in /api/signals/extract
- Severity: High
- Klasse: IDOR / RLS-Bypass / Cost-Manipulation
- File: cockpit/src/app/api/signals/extract/route.ts:79-131
- DSGVO: ja
- Beschreibung: Gleiches Pattern wie SEC-001. Auth-Check ja, aber Deal-/Meeting-/Email-Lookup ueber `createAdminClient()` mit `body.deal_id` ohne Owner-Check. Auf fremden Deals wird Bedrock-Signal-Extract ausgefuehrt, Signals werden auf fremde Source-Rows persistiert. PII aus fremden Meetings/Emails wird zu Bedrock geschickt (DSGVO-Verarbeitungs-Grundlage fehlt fuer Cross-Tenant).
- Vorschlag: Vor `admin.from("deals")` einen `await supabase.from("deals").select("id").eq("id", body.deal_id).maybeSingle()` als User-Client-Gate. Bei null → 404 sofort.
- Aufwand: S

### SEC-003 — IDOR in /api/knowledge/query (Cross-Owner Deal-Context + Knowledge-Search)
- Severity: High
- Klasse: IDOR / RLS-Bypass
- File: cockpit/src/app/api/knowledge/query/route.ts:99-179, cockpit/src/lib/knowledge/search.ts
- DSGVO: ja
- Beschreibung: `loadDealContext()` nutzt `createAdminClient()` zum Lesen eines beliebigen `dealId` und liefert Deal-Title, Stage-Name, Contact-Name, Company-Name zurueck. Plus `queryKnowledge()` ruft die `search_knowledge_chunks` SECURITY-DEFINER-Function (siehe SEC-007), die die Embedding-Suche ueber ALLE Chunks ohne Tenant-/Owner-Filter laufen laesst. Jeder authenticated User kann Knowledge-Snippets aus fremden Deals/Contacts/Companies als Bedrock-Antwort zurueckbekommen.
- Vorschlag: (a) `loadDealContext` durch USER-Client ersetzen, RLS uebernimmt Owner-Check. (b) `search_knowledge_chunks` um `caller_uid` + Owner-Filter erweitern (siehe SEC-007). (c) `knowledge_chunks` Tabelle owner-/team-aware machen (siehe SEC-008).
- Aufwand: M

### SEC-004 — IDOR in /api/meetings/[id]/retry-summary + retry-transcript
- Severity: High
- Klasse: IDOR / RLS-Bypass
- Files: cockpit/src/app/api/meetings/[id]/retry-summary/route.ts:19-50; cockpit/src/app/api/meetings/[id]/retry-transcript/route.ts (analoges Pattern)
- DSGVO: ja
- Beschreibung: Beide Routes lesen+updaten `meetings` per `createAdminClient()` auf `params.id` ohne Owner-Scope-Check. User kann auf fremde Meetings retry triggern, was zu erneuter Whisper-Transkription (Cost) + erneuter LLM-Summary-Generierung (Cost + PII-Verarbeitung) auf fremden Audio-Daten fuehrt.
- Vorschlag: Wie SEC-001 — User-Client-Gate vor admin-Update.
- Aufwand: S

### SEC-005 — Naive Regex-basierte HTML-Sanitization fuer Email-Body (XSS via IMAP-Empfaenger)
- Severity: High
- Klasse: XSS / Stored-XSS
- File: cockpit/src/app/(app)/emails/email-detail.tsx:232,331-338
- DSGVO: nein (kein PII-Leak per se, aber Session-Theft moeglich)
- Beschreibung: `sanitizeHtml()` ist eine handgeschriebene Regex-Funktion (4 Zeilen), die `<script>`, `on*=`-Handler und `javascript:` zu entfernen versucht. Trivial umgehbar: `<svg onload=alert(1)>` (regex matched nur quoted Attribute), `<img src=x onerror=alert(1)>` ohne Whitespace, HTML-Entity-Encoding (`onload&#x3D;alert(1)`), `<iframe srcdoc>`, `<style>`-tag mit `expression()`, `data:`-URIs in `<a href>`. Email-Body kommt aus IMAP-Sync (mailparser → `email_messages.body_html`), also externer Untrusted-Input. Ein praeparierter Inbound-Mail-Body wird beim ersten Oeffnen des Mail-Details als XSS gerendert, kann Supabase-Auth-Cookies stehlen (wenn nicht HttpOnly bei dieser Konfig) und Session-Hijack ausloesen.
- Vorschlag: `isomorphic-dompurify` oder `sanitize-html` als Dep einbauen, Email-HTML rendering in iframe sandbox (`sandbox="allow-same-origin"` weglassen) oder Server-side mit DOMPurify-jsdom. Strategaize hat bereits remark-html — fuer Email-HTML reicht das aber nicht (HTML-Input ungleich Markdown).
- Aufwand: M

### SEC-006 — Tabellen mit RLS-Policy `authenticated_full_access` (Cross-Owner Read/Write — V7 RLS-Switch unvollstaendig)
- Severity: High
- Klasse: RLS-Bypass / Cross-Tenant-Read / Tenant-Isolation
- Files: sql/13_v41_migration.sql:113-117 (user_settings); sql/16_v42_pgvector_knowledge_chunks.sql:43-45 (knowledge_chunks); sql/19_v6_migration.sql:23,45,77,104 (products, deal_products, goals, kpi_snapshots); sql/20_v6_activity_kpi_targets.sql:20-21; sql/08_v3_schema.sql:124-134 (calendar_events, audit_log + meetings/calendar_events vor V7-Switch); sql/migrations/019_v5_schema.sql (cadences + 3 Sub-Tabellen + email_tracking_events); sql/migrations/022_v52_compliance_templates.sql:35; sql/migrations/023_v53_branding_email_templates.sql:46 (branding_settings); sql/migrations/025_v54_email_attachments.sql:69; sql/migrations/026_v55_proposal_creation.sql:88 (proposal_items); sql/migrations/027_v56_payment_terms_and_briefing.sql:50,107 (payment_terms_templates, proposal_payment_milestones); sql/migrations/029_v62_automation_and_campaigns.sql:88-241 (automation_rules, automation_runs, campaigns, campaign_links, campaign_link_clicks); sql/migrations/030_v65_vies_cache.sql:27; sql/migrations/032_v66_working_hours_and_winloss.sql:71 (auto_winloss_runs); sql/migrations/011_v31_templates_attribution.sql:21 (email_templates); sql/04_v2_migration.sql:222-237 (emails, proposals, fit_assessments, tasks, handoffs, referrals, signals — proposals wurde in V7 owner-aware, der Rest nicht); sql/12_v4_migration.sql:174-192 (email_threads, email_sync_state, ai_action_queue, ai_feedback)
- DSGVO: ja
- Beschreibung: V7 SLC-704 MIG-035 hat 8 Kerntabellen owner-aware umgestellt (companies/contacts/deals/activities/meetings/proposals/email_messages/calls + profiles + teams). Alle anderen ~25 Tabellen (insb. user_settings, knowledge_chunks, audit_log, calendar_events, tasks, signals, fit_assessments, handoffs, referrals, emails (Outbound!), email_templates, automation_rules/runs, campaigns + links + click-logs, kpi_snapshots, goals, products, deal_products, cadences/steps/enrollments/executions, branding_settings, email_threads, email_sync_state, ai_action_queue, ai_feedback, compliance_templates, vat_id_validations, auto_winloss_runs, email_attachments, payment_terms_templates, proposal_payment_milestones, proposal_items, activity_kpi_targets) sind weiter mit `FOR ALL TO authenticated USING (true)`. Jeder authenticated User kann Read+Update+Delete auf allen Rows. Im Internal-Test-Mode (Admin = User Immo) ohne Customer keine Auswirkung — sobald aber ein Customer-User dazu kommt (was V7 ja Multi-User-Mode aktiviert hat) sind das echte Cross-Tenant-Reads. Beispiel: ein Member kann `UPDATE user_settings SET push_subscription = '<eigener Endpoint>' WHERE user_id = '<admin-uid>'` und alle Admin-Push-Notifications uebernehmen. Beispiel 2: SELECT * FROM audit_log → vollstaendiger Audit-Trail aller User sichtbar.
- Vorschlag: V7.2-Folge-Slice oder V8-Foundation-Sweep: jede dieser Tabellen pro Klasse umstellen — (a) per-User-Stammdaten (user_settings, kpi_snapshots, goals) → `user_id = auth.uid()`-Policy, (b) team-bezogene Konfiguration (branding_settings, email_templates, payment_terms_templates, automation_rules) → Admin-mutate, alle-read, (c) abgeleitete-Records von Owner-Entity (email_attachments, proposal_items, signals, fit_assessments, tasks, calendar_events, auto_winloss_runs, automation_runs) → join auf Parent-Tabelle mit `can_see_owner()`, (d) audit_log → Admin-only oder eigene-actor-Rows, (e) knowledge_chunks → owner_user_id + team_id ergaenzen, RLS-Policy + Backfill der bestehenden chunks.
- Aufwand: L

### SEC-007 — `search_knowledge_chunks` SECURITY DEFINER ohne search_path-Lock + ohne Tenant-Filter
- Severity: High
- Klasse: RLS-Bypass / SQL-Injection-Defense
- File: sql/17_v42_knowledge_search_rpc.sql:10-49
- DSGVO: ja
- Beschreibung: PL/pgSQL Function `search_knowledge_chunks` ist SECURITY DEFINER ohne `SET search_path = ''` oder `SET search_path = public`. Das oeffnet die klassische CVE-Klasse SECURITY-DEFINER-Hijack: wenn ein User-spezifischer search_path eine eigene `knowledge_chunks`-Tabelle oder `vector`-Operator-Function injiziert, koennte die Function gegen die falsche Tabelle laufen. Zusaetzlich: kein Tenant-/Owner-Filter im Function-Body — Funktion sucht ueber ALLE `knowledge_chunks` mit `status='active'`. RLS auf `knowledge_chunks` wird bei SECURITY DEFINER auch dann umgangen, wenn diese existieren wuerde (siehe SEC-006).
- Vorschlag: (a) `SET search_path = public` an die Function-Definition haengen (Standard-Pattern wie in `is_admin`/`get_my_team_id` aus MIG-035). (b) Function um `caller_uid uuid` Param erweitern, JOIN auf `meetings`/`email_messages`/`activities`/`documents` mit `can_see_owner(parent.owner_user_id)` Filter ergaenzen. Alternativ Function auf SECURITY INVOKER umstellen und RLS auf knowledge_chunks korrekt setzen (SEC-006).
- Aufwand: M

### SEC-008 — Storage-Bucket `documents`: alle authenticated User koennen lesen+schreiben+loeschen (kein User-/Tenant-Scope)
- Severity: High
- Klasse: Storage / RLS-Bypass
- File: sql/02_rls.sql:47-57
- DSGVO: ja
- Beschreibung: Drei Policies (`authenticated_upload_documents`, `authenticated_read_documents`, `authenticated_delete_documents`) ohne Filter auf erstes Path-Segment / Owner / Tenant. Jeder authenticated User kann (a) jedes hochgeladene Dokument runterladen (SELECT), (b) ueber dem Bucket beliebige Files anlegen, (c) jeden anderen Storage-Object loeschen. `documents`-Bucket enthaelt Deal-/Company-/Contact-Anhaenge (Vertrags-PDFs, etc.). Cross-Tenant-DSGVO-relevante Files koennen exfiltriert werden.
- Vorschlag: Analog `proposal_pdfs_user_select` Policies in MIG-026 — user-scoped per first-path-segment: `bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]`. Plus Doc-Upload-Code in `lib/actions/document-actions.ts` muss den Path mit `<user-id>/<deal-id>/...` praefixen. Backfill bestehender Files.
- Aufwand: M

### SEC-009 — Open Redirect via /api/track/[id] (`url`-Query-Param ungeprueft)
- Severity: Medium
- Klasse: Open Redirect / Phishing-Enablement
- File: cockpit/src/app/api/track/[id]/route.ts:57-73
- DSGVO: nein
- Beschreibung: Wenn `t=click` und `url=<beliebige-URL>` im Query, returnt der Endpoint `NextResponse.redirect(linkUrl, 302)` ohne URL-Validation. `trackingId` muss existieren, aber `url` wird nicht gegen die zur Tracking-ID gehoerige Original-Click-URL geprueft. Attacker kann einen legitimen Tracking-Link mit fremdem `url=`-Param verteilen — der Browser sieht `business.strategaizetransition.com/api/track/<valid-id>?t=click&url=https://phish.example.com` und folgt der Phishing-Redirect-Kette. Ueberrasch: link_url + link_index landen einfach in `email_tracking_events` ohne Konsistenz-Check.
- Vorschlag: (a) URL gegen `campaign_links.target_url` der referenzierten tracking_id pruefen (Link-Whitelist). (b) Alternativ — wenn das URL-Query-Pattern absichtlich frei sein soll fuer multi-link tracking — eine Host-Whitelist (eigene Domains + bekannte Outbound-Partner) erzwingen, sonst Fallback auf FALLBACK_URL.
- Aufwand: S

### SEC-010 — Cron-Secret + Export-API-Key Vergleich ohne timing-safe-compare
- Severity: Medium
- Klasse: Cron-Auth / Timing-Attack-Surface
- Files: cockpit/src/app/api/cron/verify-cron-secret.ts:18; cockpit/src/lib/export/auth.ts:33
- DSGVO: nein
- Beschreibung: 17 Cron-Endpoints + 6 Export-/Read-API-Endpoints (`/api/leads/intake`, `/api/campaigns/[id]/performance`, `/api/campaigns/[id]/export`, `/api/winloss/[deal_id]`, `/api/export/*`) nutzen JavaScript `!==` String-Vergleich gegen das aus ENV gelesene Secret/Bearer. Das ist nicht timing-safe — ein Attacker mit Netzwerk-Zugang koennte Secret-Bytes byteweise rekonstruieren via Response-Latenz-Statistik (klassisches Timing-Side-Channel). Praktisch durch HTTPS/TCP-Jitter abgemildert, aber best-practice ist `crypto.timingSafeEqual` (so wie Cal.com-Webhook + SMAO-Webhook es schon machen).
- Vorschlag: `verifyCronSecret` und `verifyExportApiKey` auf timing-safe umstellen: beide Strings zu Buffer, Length-Check, dann `crypto.timingSafeEqual(a, b)`. Pattern siehe `cockpit/src/lib/calcom/webhook-handler.ts:61-67`.
- Aufwand: S

### SEC-011 — Klartext-IP-Persistenz in email_tracking_events (DSGVO)
- Severity: Medium
- Klasse: DSGVO / Logging
- File: cockpit/src/app/api/track/[id]/route.ts:43-68
- DSGVO: ja
- Beschreibung: `/api/track/[id]` persistiert volle IP-Adresse plus User-Agent in `email_tracking_events.ip_address` (TEXT) — kein Hashing. Im Gegensatz dazu hashed der spiegelartige `/r/[token]` Endpoint die IP via `hashIp()` mit SHA-256+Salt (DSGVO-konform). Open-Open-Tracking-Pixel sammelt damit pro Email-Open klartext-IP-Adressen aller Empfaenger — DSGVO Art. 5 Abs. 1 lit. c (Datenminimierung).
- Vorschlag: `extractClientIp` + `hashIp` aus `cockpit/src/lib/campaigns/ip-hash.ts` analog zu `/r/[token]` einsetzen. `email_tracking_events.ip_address` schema-mauml;ssig zu `ip_hash` migrieren + Backfill (vorhandene Klartext-IPs anonymisieren oder Tabelle truncaten — abhaengig von audit-need).
- Aufwand: S

### SEC-012 — PostgREST `.or()`-Filter-Injection-Risiko in /api/deals/typeahead
- Severity: Medium
- Klasse: SQL-Injection / PostgREST-Filter-Injection
- File: cockpit/src/app/api/deals/typeahead/route.ts:67-72; cockpit/src/lib/deals/typeahead.ts:18-27
- DSGVO: nein
- Beschreibung: `sanitizeTypeaheadQuery` escaped `\`, `%`, `_`, capped auf 200 Zeichen. ABER `.or(`first_name.ilike.${pattern},last_name.ilike.${pattern}`)` interpoliert den escaped User-Input direkt in die PostgREST `.or()`-Filter-Sprache. PostgREST Filter-Syntax verwendet Komma als Separator zwischen Filter-Klauseln und Punkt als Trennzeichen. Wenn `pattern` ein Komma oder Punkt enthaelt (was beides nicht escaped wird), kann der Filter-Ausdruck strukturell modifiziert werden. Praktisch eng beschraenkt durch Supabase-JS-Client-Parsing, aber strukturelles Risiko bleibt.
- Vorschlag: (a) Komma + Punkt zur Escape-Liste in `sanitizeTypeaheadQuery` hinzufuegen, ODER (b) zwei separate `.ilike()`-Queries ausfuehren (statt `.or()` mit Interpolation), Ergebnisse via JS-Set vereinen.
- Aufwand: S

### SEC-013 — /api/transcribe ohne Rate-Limit (Cost-DoS)
- Severity: Medium
- Klasse: Rate-Limit / Cost-DoS
- File: cockpit/src/app/api/transcribe/route.ts:5-49
- DSGVO: nein
- Beschreibung: Endpoint hat Auth-Check, aber kein `checkRateLimit()` (im Gegensatz zu /api/ai/query und /api/knowledge/query, die beide 10/min/User haben). Ein authenticated User kann beliebig viele Audio-Files durchschicken — jeder Call schickt das Audio an OpenAI Whisper API (Kosten + Audio-PII an US-Endpoint). DoS-Pfad fuer den Bedrock-Budget-Account.
- Vorschlag: `checkRateLimit(user.id)` einbauen (Token-Bucket aus `lib/ai/rate-limiter`). Plus Audio-Size-Limit (z.B. 25 MB) und Audio-Format-Whitelist analog email-attachments.
- Aufwand: S

### SEC-014 — DOM-XSS-Risiko via /p/[tenant-slug]/datenschutz Customer-Markdown ohne Sanitize
- Severity: Medium
- Klasse: XSS / Stored-XSS (Admin-controlled)
- Files: cockpit/src/lib/legal/markdown.ts:13-19; cockpit/src/app/p/[tenant-slug]/datenschutz/page.tsx:48; cockpit/src/components/settings/CustomerDseEditor.tsx:118
- DSGVO: nein
- Beschreibung: `renderLegalMarkdown()` ruft `remarkHtml({ sanitize: false })`. Fuer Static-Files unter `src/content/legal/` (eigene Repo-Files) ist das OK. ABER `customer-dse`-Editor laesst Admin/Teamlead beliebigen Markdown in `legal_documents.content_md` speichern, der dann auf `/p/<tenant-slug>/datenschutz` an Public ausgeliefert wird via `dangerouslySetInnerHTML` (`CustomerDsePageShell` + `CustomerDseEditor` Preview). Ein boesartiger Tenant-Admin koennte `<script>` oder `<iframe src="javascript:...">` einbetten. Im Internal-Test-Mode 1-Admin ist das selbst-XSS, in Multi-Tenant-Production wird das zu Stored-XSS gegen Public-Visitor.
- Note: In KNOWN_ISSUES als "L-1 Markdown-sanitize fuer Admin-Content" als akzeptiertes Risiko erwaehnt (V8.8-Release-Notes). Aus Security-Sicht ist das aber kein Low — Public-XSS gegen Tenant-Datenschutz-Page kann Phishing/Drive-by-Download enablen.
- Vorschlag: `remarkHtml({ sanitize: true })` ODER nach Render-Pipeline eine `rehype-sanitize`-Stufe einbauen mit erlaubtem Tag-Schema (Strategaize-Approved-Subset: h1-h6, p, ul, ol, li, table, th, td, a, strong, em). Markdown-Editor-Side zusaetzlich serverseitig validieren.
- Aufwand: M

### SEC-015 — Default-IP-Hash-Salt ist konstant im Code (DSGVO + Pre-Customer-Live)
- Severity: Low
- Klasse: DSGVO / Crypto-Default
- File: cockpit/src/lib/campaigns/ip-hash.ts:10-13
- DSGVO: ja
- Beschreibung: `DEFAULT_SALT = "strategaize-business-system-v62-default-salt"` ist hardcoded und im Repo-Code committed. Wenn die ENV `IP_HASH_SALT` nicht gesetzt ist (oder ein neuer Coolify-Setup vergisst sie), faellt der Hash auf einen oeffentlich bekannten Salt zurueck. SHA-256(IP + bekannter Salt) ist nicht mehr Pseudonymisierung sondern reversibel via Rainbow-Table fuer alle 4-Mrd. IPv4-Adressen. ISSUE-054 sagt, dass Production-ENV gesetzt ist — aber Code-Default ist trotzdem Compliance-Risk und sollte aus dem Code raus.
- Vorschlag: Default-Konstante entfernen, `getIpHashSalt()` wirft wenn ENV fehlt. Daemon-Health-Check beim App-Start: `process.env.IP_HASH_SALT?.length >= 32` sonst Fail-fast.
- Aufwand: S

### SEC-016 — Passwort-Policy 8 Zeichen, keine Komplexitaet
- Severity: Low
- Klasse: Auth / Password-Policy
- File: cockpit/src/app/auth/set-password/actions.ts:19
- DSGVO: nein
- Beschreibung: Set-Password Server-Action prueft nur `password.length < 8`. Keine Komplexitaets-Anforderung (Mix aus Letters/Digits/Symbols), kein Zxcvbn-Score, keine HaveIBeenPwned-Check. Internal-Test akzeptabel — bei Customer-Onboarding via Multi-Tenant ein Soft-Risk.
- Vorschlag: Mindestens 12 Zeichen + Verbot aus Top-1000-Common-Passwords. Optional: zxcvbn-Score >= 3. GoTrue/Supabase hat selbst eine Server-Side-Password-Strength-Konfig — die nutzen.
- Aufwand: S

### SEC-017 — Keine HTTP Security-Headers in next.config.ts
- Severity: Low
- Klasse: Defense-in-Depth / Security-Headers
- File: cockpit/next.config.ts (komplett)
- DSGVO: nein
- Beschreibung: Keine `headers()`-Konfiguration. Damit fehlen Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security (HSTS wird wahrscheinlich von Traefik gesetzt, aber Defense-in-Depth fehlt). CSP wuerde insb. SEC-005 (Email-XSS) und SEC-014 (Customer-DSE-XSS) deutlich entschaerfen — ein `Content-Security-Policy: script-src 'self' 'unsafe-inline'` blockiert Inline-Script-XSS strukturell.
- Vorschlag: `next.config.ts` `async headers()` einbauen mit X-Frame-Options=SAMEORIGIN, X-Content-Type-Options=nosniff, Referrer-Policy=strict-origin-when-cross-origin, Permissions-Policy minimal. CSP separat planen (V9-Foundation), weil das mit pdfmake + Bedrock-Streaming + DnD-Kit + Voice-Capture eine Inventur aller Inline-Scripts braucht.
- Aufwand: S (Basis-Headers), L (full CSP)

### SEC-018 — Logo-Endpoint /api/branding/logo ohne Tenant-Scope-Limit (Defense-in-Depth)
- Severity: Low
- Klasse: Storage / Tenant-Isolation
- File: cockpit/src/app/api/branding/logo/route.ts:32-47
- DSGVO: nein
- Beschreibung: Endpoint listet die `branding`-Bucket-Files (`sortBy created_at desc, limit 10`) und liefert das neueste File aus. Single-Tenant V1-Pattern. Bei kuenftigem Multi-Tenant wuerde der erste Tenant-Upload das Logo aller anderen Tenants ueberschreiben. Aktuell keine echte Vulnerability — strukturelles Followup-Risiko fuer V7+ Multi-Tenant.
- Vorschlag: Path-Praefix mit `team_id` (siehe SEC-008 Pattern). Endpoint nimmt `tenant-slug` query und liefert das entsprechende Subfolder-File.
- Aufwand: M (Coupled mit Customer-DSE-Tenant-Routing aus V8.4)

### SEC-019 — `serverActions.bodySizeLimit: "4mb"` kann grosse Audio-/Logo-Uploads erlauben
- Severity: Low
- Klasse: Rate-Limit / Cost-DoS
- File: cockpit/next.config.ts:22-24
- DSGVO: nein
- Beschreibung: 4 MB Server-Action-Body-Limit gilt fuer alle Server-Actions. uploadLogo + Voice-Record gehen dadurch. Email-Anhang nutzt API-Route (separate Logik, Limit 10MB/file). Mit `/api/transcribe` Audio-File-Upload kombiniert mit Bedrock-Cost-DoS (SEC-013) entsteht Cost-Pfad fuer 4MB+ Audio pro Request, mehrere parallele Requests pro Sekunde.
- Vorschlag: Body-Limit ist OK — aber Rate-Limit auf /api/transcribe + /api/emails/attachments einbauen (SEC-013).
- Aufwand: S

### SEC-020 — Knowledge-Indexer + Cron-Embedding-Sync: Cost-Verbrauch ohne Tenant-Scope-Audit
- Severity: Low
- Klasse: Cost-Manipulation / Audit-Gap
- Files: cockpit/src/app/api/cron/embedding-sync/route.ts; cockpit/src/lib/knowledge/indexer.ts
- DSGVO: ja (Cross-Tenant-Embeddings gemischt)
- Beschreibung: Embedding-Sync-Cron indexiert ALLE neuen Source-Rows (meeting/email/activity/document) cross-tenant ohne `owner_user_id`-Tracking auf den entstehenden `knowledge_chunks` (siehe SEC-006). Wenn V7-RLS auf Source-Tabellen greift, aber Embeddings ohne Owner gespeichert werden, sind sie nicht via Source-RLS rueck-filterbar. Audit-Trail fehlt fuer "welches Embedding wurde fuer welchen User auf welche Source-Row angewendet".
- Vorschlag: (a) `knowledge_chunks` Schema um `owner_user_id` + `team_id` ergaenzen (Backfill aus parent), (b) Embedding-Cron schreibt Owner aus Parent-Source-Row mit, (c) `search_knowledge_chunks` Function filtert per Owner-Param + `can_see_owner()`.
- Aufwand: M

## Bereits bekannte Issues (Filter)

Folgende Findings wurden NICHT dupliziert, weil sie 1:1 in `/docs/KNOWN_ISSUES.md` stehen:

- ISSUE-042: OpenAI-Key in untrackter Datei am Repo-Root — bekanntes Compliance-Gate-Item (Pre-Customer-Live Pflicht). Plus: `cockpit/src/lib/ai/transcription/openai.ts` sendet Audio an `api.openai.com` (US-Endpoint), wenn `TRANSCRIPTION_PROVIDER=openai` — Azure-EU-Switch ist code-ready aber nicht aktiviert. Gate steht im STATE.md "Spaeter (nicht jetzt)".
- ISSUE-058: postcss <8.5.10 XSS-Vulnerability — bekannt, akzeptiert bis Upstream-Next-Release. `npm audit` zeigt nur Build-Time-Risiko.
- ISSUE-066: SLC-706 Defense-in-Depth-Gap AsyncLocalStorage propagiert nicht in Server-Action-Requests — RESOLVED via SLC-751 Middleware-Header-Pattern.
- ISSUE-064/065/070: SLC-704 Defense-in-Depth-Gaps Mutate-Server-Actions ohne `assertNotReadOnlyContext` — alle resolved.
- ISSUE-086: Help-Hotspot-Screenshot enthaelt User-Name (Pre-Customer-Live) — Internal-Test-Mode-Toleranz, wird via IS BL-105 geloest.
- ISSUE-076/080/081/082/083/084/085: alle resolved bzw. spezifische Polish-Issues ohne Security-Bezug.
- Customer-DSE Markdown-Sanitize wurde als "L-1" im V8.8-Release-Notes als akzeptiertes Risiko vermerkt — aus Security-Sicht ist das ein Medium (SEC-014), daher hier separat gelistet mit hoeherer Severity-Empfehlung.

## Audit-Methodik

- Lese-Pass: `CLAUDE.md`, `docs/ARCHITECTURE.md` (Section 1-300), `docs/STATE.md` (V8.8 Stand), `docs/KNOWN_ISSUES.md` (alle 787 Zeilen, Filter-Set erstellt), `planning/roadmap.json` (implizit ueber STATE).
- Grep ueber `sql/**`: `CREATE FUNCTION`, `SECURITY DEFINER` (5 Treffer, alle aus V7-RLS oder Reserved-Slug-Trigger inspiziert), `ENABLE ROW LEVEL SECURITY` (47 Tabellen identifiziert), `CREATE POLICY` (Cross-Reference gegen V7-Switch).
- Grep ueber `cockpit/src/**`: `verifyCronSecret`/`x-cron-secret`/`CRON_SECRET` (17 Cron-Routes verifiziert), `createAdminClient`/`SUPABASE_SERVICE_ROLE_KEY`/`service_role` (91 Files identifiziert, 6 kritische Public-/Auth-API-Routes inspiziert), `dangerouslySetInnerHTML` (6 Treffer inspiziert, 1 Custom-Sanitize-Bug + 2 Markdown-Sanitize-False-Trust), `target="_blank"` (alle mit `rel`), `process.env.` (Bedrock-Region-Pin verifiziert, IP-Hash-Salt-Default gefunden), `sk-`/`AKIA`/`-----BEGIN`/`password` (keine Treffer im Code).
- Read der 44 API-Routes selektiv: alle Public/Webhook/Cron-Routes vollstaendig, alle Auth-protected Routes mit IDOR-Risiko-Pattern (params-id + createAdminClient ohne RLS-Vor-Check).
- Auth-Flow: Auth-Callback + Set-Password + Invite-Flow + Server-Action-Permission-Guards inspiziert.
- Storage: Bucket-Policies fuer `documents`, `proposal-pdfs`, `branding`, `email-attachments` gegen User-Scope-Pattern verglichen.
- Cross-Reference V7 RLS-Switch (MIG-035) gegen alle bestehenden `ENABLE ROW LEVEL SECURITY`-Statements zur Identifikation der nicht-migrierten Tabellen.
- `next.config.ts` + `cockpit/package.json` inspiziert (Deps + Build-Config).
