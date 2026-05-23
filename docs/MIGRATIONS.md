# Migrations

### MIG-040 — V8.4 Hotfix emails.owner_user_id (APPLIED 2026-05-23 via SSH+base64)
- Date: 2026-05-23 (~14:08 UTC, postgres-User, idempotent ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS + NOTIFY pgrst, Verify-Block PASS).
- Scope: 1 ALTER `emails` + 1 INDEX + 1 NOTIFY pgrst.
  ```sql
  ALTER TABLE emails
    ADD COLUMN IF NOT EXISTS owner_user_id UUID
      REFERENCES profiles(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_emails_owner_user_id ON emails(owner_user_id);
  NOTIFY pgrst, 'reload schema';
  ```
- Reason: MIG-033 (V7 SLC-704, 2026-05-14) ergaenzte owner_user_id auf 8 Kerntabellen (companies, contacts, deals, activities, meetings, proposals, email_messages, calls), aber die outgoing-Mail-Tabelle `emails` wurde vergessen. Code in `cockpit/src/lib/email/send.ts` Zeilen 133+232 inserted `owner_user_id` wenn `params.ownerUserId` truthy ist. Vor V8.4 SLC-846: Compose-Caller setzte ownerUserId nicht → INSERT-Spread liess die Spalte weg → kein DB-Error. Mit V8.4 SLC-846 ergaenzte sendComposedEmail um ownerUserId (fuer tenantSlug-Lookup im DSE-Footer-Render). Ab V8.4-Deploy (2026-05-23 09:18 UTC) failt jeder Compose-Send mit `Could not find the 'owner_user_id' column of 'emails' in the schema cache`.
- Affected Areas: emails-Tabelle, RLS-Policies fuer V7-Owner-Scope (V7-RLS-Helper greift jetzt auch auf outgoing-mails), PostgREST Schema-Cache.
- Risk: Niedrig — ADD COLUMN IF NOT EXISTS ist idempotent. Bestehende rows haben owner_user_id=NULL (FK ON DELETE SET NULL erlaubt). Keine Daten-Migration noetig.
- Rollback Notes: Falls noetig: `ALTER TABLE emails DROP COLUMN IF EXISTS owner_user_id; NOTIFY pgrst, 'reload schema';` — aber waere nicht sinnvoll, da Code dann wieder failt sobald ownerUserId truthy ist.
- Discovery: User-Browser-Smoke 2026-05-23 ~14:05 UTC im Composing-Studio. Roter Error-Banner "Could not find the 'owner_user_id' column of 'emails' in the schema cache" oberhalb des Senden-Buttons sichtbar. Cross-Check vorher via psql `SELECT owner_user_id FROM emails` bestaetigte `column does not exist`. RPT-533.

### MIG-038 — V8.4 SLC-841 legal_documents + teams.slug (Phase 1-4 APPLIED 2026-05-23, Phase 5 APPLIED 2026-05-23 via SLC-842)
- Date: 2026-05-23 (Phase 1-4 applied via SSH+base64 in SLC-841 MT-2 — postgres-User, idempotent. Phase 5 applied via SSH+base64 in SLC-842 MT-4b — `038_v84_customer_dse_phase5.sql` mit base64-embedded customer-dse-default.md content, INSERT 0 2 fuer 2 Teams, content_md length 10205 chars verifiziert).
- Scope: 1 neue Tabelle `legal_documents` + 1 ALTER `teams.slug` + Backfill + DEFAULT + UNIQUE-Index + RLS-Policies + Default-Seed in `038_v84_customer_dse.sql`:
  - **Phase 1 — legal_documents Table:**
    ```sql
    CREATE TABLE IF NOT EXISTS legal_documents (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_team_id  UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      kind            TEXT NOT NULL CHECK (kind IN ('customer-dse')),
      content_md      TEXT NOT NULL,
      updated_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(tenant_team_id, kind)
    );
    ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS legal_documents_select_team ON legal_documents;
    CREATE POLICY legal_documents_select_team ON legal_documents
      FOR SELECT TO authenticated
      USING (is_admin() OR tenant_team_id = get_my_team_id());
    DROP POLICY IF EXISTS legal_documents_admin_mutate ON legal_documents;
    CREATE POLICY legal_documents_admin_mutate ON legal_documents
      FOR ALL TO authenticated
      USING (is_admin() AND tenant_team_id = get_my_team_id())
      WITH CHECK (is_admin() AND tenant_team_id = get_my_team_id());
    GRANT SELECT, INSERT, UPDATE, DELETE ON legal_documents TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON legal_documents TO service_role;
    ```
  - **Phase 2 — teams.slug ADD COLUMN + Backfill (OP-V7-Pattern):**
    ```sql
    ALTER TABLE teams ADD COLUMN IF NOT EXISTS slug TEXT;
    DO $$
    DECLARE r record; base_slug text; candidate text; suffix int;
    BEGIN
      FOR r IN SELECT id, name FROM teams WHERE slug IS NULL ORDER BY created_at LOOP
        base_slug := lower(translate(r.name, 'aeoeueAOEUEss ', 'aoeAOEss-'));
        base_slug := regexp_replace(base_slug, '[^a-z0-9-]+', '-', 'g');
        base_slug := regexp_replace(base_slug, '-+', '-', 'g');
        base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
        base_slug := left(base_slug, 60);
        IF base_slug = '' THEN
          base_slug := 't-' || substring(r.id::text, 1, 8);
        END IF;
        candidate := base_slug;
        suffix := 2;
        WHILE EXISTS (SELECT 1 FROM teams WHERE slug = candidate) LOOP
          candidate := base_slug || '-' || suffix;
          suffix := suffix + 1;
        END LOOP;
        UPDATE teams SET slug = candidate WHERE id = r.id;
      END LOOP;
    END$$;
    ```
  - **Phase 3 — NOT NULL + UNIQUE lower-Index:**
    ```sql
    ALTER TABLE teams ALTER COLUMN slug SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS teams_slug_lower_unique ON teams (lower(slug));
    ```
  - **Phase 4 — DEFAULT fuer Legacy-Test-Inserts (Migration-aa-Pattern):**
    ```sql
    ALTER TABLE teams ALTER COLUMN slug SET DEFAULT ('t-' || replace(gen_random_uuid()::text, '-', ''));
    ```
  - **Phase 5 — Default-Seed legal_documents fuer alle bestehenden teams:**
    ```sql
    INSERT INTO legal_documents (tenant_team_id, kind, content_md)
    SELECT t.id, 'customer-dse', '<Default-Markdown aus cockpit/src/content/legal/customer-dse-default.md>'
    FROM teams t
    ON CONFLICT (tenant_team_id, kind) DO NOTHING;
    ```
  - **Phase 6 — Schema-Reload:**
    ```sql
    NOTIFY pgrst, 'reload schema';
    ```
- Reason: FEAT-824 Customer-Facing DSE Multi-Tenant-Foundation. Pro Tenant (`team_id`-scoped) eigene Customer-DSE editierbar in `/settings/compliance/customer-dse`, lesbar via Public-Route `/p/[tenant-slug]/datenschutz`. RLS via V7-Helper (`is_admin`, `get_my_team_id`). Tenant-Slug aus `teams.name` via Slugify-Backfill (OP-V7 SLC-131 Reuse). V1 Single-Row pro Tenant-Kind (DEC-231), V2 ergaenzt History additive.
- Affected Areas:
  - Neue Tabelle `legal_documents` mit RLS-Scope auf team_id + 2 Policies (SELECT-team + admin_mutate).
  - `teams`-Tabelle bekommt 1 neue Spalte `slug` mit Backfill + UNIQUE-Index + DEFAULT-Patch.
  - Bestehende `teams`-Row `Strategaize Transition BV` → erwarteter Slug `strategaize-transition-bv`.
  - `legal_documents` enthaelt 1 Default-Seed-Row pro existing team nach Apply.
  - Neue Server-Actions (`getCustomerDse`, `updateCustomerDse`, `resetCustomerDseToDefault`) bauen darauf auf.
  - `audit_log` bekommt 1 neue Action `customer_dse.updated` — keine Schema-Aenderung am audit_log.
- Risk: niedrig-mittel. Additive Migration. Risiken: (1) Slug-Backfill-Empty-Edge-Case fuer Teams mit nur Sonderzeichen — durch Pflicht-Empty-Fallback (`t-<uuid8>`) abgedeckt. (2) Default-Seed muss vor Phase 5 als Markdown-File existieren in `cockpit/src/content/legal/customer-dse-default.md` — SLC-842 erstellt das. Bei fehlendem File: Phase 5 muss als Placeholder-Text laufen, Tenant-Admin muss spaeter manuell DSE editieren. (3) RLS-Policy-Pflicht GRANTs vorhanden (`feedback_migration_rls_needs_grants`-Compliance). (4) NOTIFY pgrst Pflicht.
- Rollback Notes:
  ```sql
  -- Roll-Back-Reihenfolge (idempotent):
  DROP TABLE IF EXISTS legal_documents CASCADE;
  DROP INDEX IF EXISTS teams_slug_lower_unique;
  ALTER TABLE teams ALTER COLUMN slug DROP NOT NULL;
  ALTER TABLE teams ALTER COLUMN slug DROP DEFAULT;
  ALTER TABLE teams DROP COLUMN IF EXISTS slug;
  NOTIFY pgrst, 'reload schema';
  ```
  Backup vor Rollback Pflicht falls legal_documents-Rows manuell editiert wurden: `pg_dump --table=legal_documents > legal_documents_backup.sql`.
- Implementation-Notes (SLC-841 MT-1, 2026-05-23):
  - Phase 2 Slugify nutzt **chained `replace()` statt `translate()`** — translate() kann 1→2-Char-Umlaut-Mappings (ä→ae) nicht abbilden, daher in der ausgefuehrten Migration durch 7 explizite replace()-Calls ersetzt (ä/ö/ü/Ä/Ö/Ü/ß). Funktionsidentisch fuer reine ASCII-Namen, korrekt fuer Umlaut-Namen.
  - **Phase 5 NICHT enthalten** (sliced auf SLC-842 nach Default-Markdown-Anlage). legal_documents bleibt nach SLC-841 LEER. Public-Route SLC-843 wuerde dann 404 zurueck geben — Reihenfolge SLC-842 vor SLC-843 ist Pflicht (DEC-238).
- Verification (Post-Apply 2026-05-23):
  - **AC1 PASS** — `\d legal_documents`: 7 Spalten (id/tenant_team_id/kind/content_md/updated_by/updated_at/created_at), RLS=ENABLED, 2 Policies (legal_documents_admin_mutate fuer ALL, legal_documents_select_team fuer SELECT), UNIQUE(tenant_team_id, kind), FK legal_documents_tenant_team_id_fkey REFERENCES teams(id) ON DELETE CASCADE, FK legal_documents_updated_by_fkey REFERENCES profiles(id) ON DELETE SET NULL.
  - **AC2 PASS** — `\d teams`: neue Spalte `slug` TEXT NOT NULL, DEFAULT `'t-'::text || replace(gen_random_uuid()::text, '-'::text, ''::text)`, UNIQUE-Index `teams_slug_lower_unique` btree (lower(slug)).
  - **AC3 PARTIAL** — Spec-Erwartung `strategaize-transition-bv` ist outdated (Team wurde zu "Strategaize" zurueckumbenannt). Tatsaechliche Backfill-Ergebnisse: `Strategaize` → `strategaize`, `[TEST] Test-Team` → `test-test-team`. Funktional erfuellt — Slugs sind unique, lowercase, deterministisch.
  - **AC4 PASS** — `information_schema.role_table_grants` fuer `legal_documents`: `authenticated` hat SELECT/INSERT/UPDATE/DELETE, `service_role` hat SELECT/INSERT/UPDATE/DELETE. 8 Eintraege total.
  - **AC5 PASS** — PostgREST-Smoke via Kong-Container interner Aufruf von `http://supabase-rest:3000/legal_documents?limit=1` ohne JWT: HTTP/1.1 401 Unauthorized. NICHT 404 → Schema-Cache geladen, RLS aktiv.
  - **AC6 PASS** — RLS-Live-DB-Tests `cockpit/__tests__/rls/legal-documents-rls.test.ts` via node:20 im k9f5pn5upfq7etoefb5ukbcg_business-net: 7/7 Tests PASS in 87ms. Tenant-A-Admin INSERT erlaubt, Member INSERT geblockt (RLS-Policy-Error), Cross-Tenant-Isolation Member-A sieht NICHT Tenant-B-DSE (0 Rows), Member UPDATE 0 affected, UNIQUE-Violation 23505, FK ON DELETE CASCADE bestaetigt (confdeltype='c').

### MIG-037 — V7.6 SLC-762 custom_reports
- Date: 2026-05-19 (applied via SSH+base64 in SLC-762 MT-1 — postgres-User, idempotent)
- Scope: 1 neue Tabelle `custom_reports` + 2 Indizes + 4 RLS-Policies + 2 GRANTs in `037_v76_custom_reports.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL CHECK (context_type IN ('mein-tag', 'cockpit')),
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
    prompt_template TEXT NOT NULL CHECK (char_length(prompt_template) BETWEEN 10 AND 2000),
    description TEXT,
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_custom_reports_owner_ctx
    ON custom_reports(owner_user_id, context_type);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_reports_owner_name
    ON custom_reports(owner_user_id, name);

  ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS custom_reports_owner_select ON custom_reports;
  CREATE POLICY custom_reports_owner_select ON custom_reports
    FOR SELECT USING (owner_user_id = auth.uid());

  DROP POLICY IF EXISTS custom_reports_owner_insert ON custom_reports;
  CREATE POLICY custom_reports_owner_insert ON custom_reports
    FOR INSERT WITH CHECK (owner_user_id = auth.uid());

  DROP POLICY IF EXISTS custom_reports_owner_update ON custom_reports;
  CREATE POLICY custom_reports_owner_update ON custom_reports
    FOR UPDATE USING (owner_user_id = auth.uid())
    WITH CHECK (owner_user_id = auth.uid());

  DROP POLICY IF EXISTS custom_reports_owner_delete ON custom_reports;
  CREATE POLICY custom_reports_owner_delete ON custom_reports
    FOR DELETE USING (owner_user_id = auth.uid());

  GRANT SELECT, INSERT, UPDATE, DELETE ON custom_reports TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON custom_reports TO service_role;

  NOTIFY pgrst, 'reload schema';
  ```
- Reason: FEAT-762 Custom-Reports erlaubt User-eigene Berichts-Vorlagen im KI-Workspace. Owner-Scope-Isolation per RLS, UNIQUE(owner_user_id, name) verhindert Duplikate, usage_count + last_used_at fuer Dropdown-Sort.
- Affected Areas:
  - Neue Tabelle `custom_reports` mit 10 Spalten + 4 RLS-Policies + 2 Indizes.
  - Keine bestehenden Tabellen beruehrt (rein additiv).
  - V7.6-Server-Actions (saveCustomReport/listCustomReports/runCustomReport/renameCustomReport/deleteCustomReport) bauen darauf auf.
  - `audit_log` bekommt 4 neue Action-Werte (`custom_report.created`/`executed`/`renamed`/`deleted`) — keine Schema-Aenderung am audit_log.
- Risk: minimal. Additive Tabelle. Bei UNIQUE-Conflict-Apply (idempotent via IF NOT EXISTS) wirft Postgres nichts. RLS-Grants Pflicht laut `feedback_migration_rls_needs_grants` — sonst PostgREST 401 silent-fail.
- Rollback Notes: `DROP TABLE IF EXISTS custom_reports CASCADE;` — kein Backfill noetig (Feature ist neu, V7.6-First-Live keine User-Daten gegangen). `NOTIFY pgrst, 'reload schema';` nach Drop. Vorher pruefen: gibt es bereits Live-Daten? Falls ja: Export per `pg_dump --table=custom_reports` als Backup.
- Verification (post-Apply in SLC-762 MT-1, 2026-05-19):
  - `\d custom_reports` zeigt 10 Spalten, RLS=ENABLED, 4 Policies, 2 Indizes (1 BTREE `idx_custom_reports_owner_ctx` + 1 UNIQUE `idx_custom_reports_owner_name`), 3 CHECK-Constraints, FK auf `auth.users(id) ON DELETE CASCADE`. PASS.
  - `SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'custom_reports'::regclass;` zeigt 4 Eintraege: delete=`d`, insert=`a`, select=`r`, update=`w`. PASS.
  - `information_schema.role_table_grants` fuer `custom_reports`: `authenticated` hat SELECT/INSERT/UPDATE/DELETE, `service_role` hat SELECT/INSERT/UPDATE/DELETE. PASS.
  - PostgREST-Smoke ueber Coolify-internal Kong (`http://supabase-kong-...:8000/rest/v1/custom_reports?limit=1` mit anon-Header) liefert HTTP 401 (Endpoint registriert, RLS filtert ohne authentifiziertem JWT). NICHT 404 = Schema-Cache aktiv (Pattern aus `reference_postgrest_schema_reload`). PASS.
  - RLS-Live-DB-Tests via node:20 im Coolify-Net (`coolify-test-setup.md`): 6/6 PASS in 403ms — Owner-Isolation, UNIQUE-23505, FK confdeltype='c' (CASCADE).

### MIG-036 — V7.5 SLC-752 automation_rules.created_via
- Date: 2026-05-16 (applied via SSH+base64 in SLC-752 MT-0 — postgres-User, idempotent)
- Scope: 1 additive Aenderung in `036_v75_automation_rules_created_via.sql`:
  ```sql
  ALTER TABLE automation_rules
    ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'click_wizard';

  ALTER TABLE automation_rules
    ADD CONSTRAINT automation_rules_created_via_check
    CHECK (created_via IN ('click_wizard', 'nl_sculptor'));

  COMMENT ON COLUMN automation_rules.created_via IS '...';
  ```
- Reason: FEAT-751 Natural-Language Workflow-Sculptor braucht Provenance-Marker, damit Inspection-Logs und Builder-UI unterscheiden koennen, ob eine Rule durch den V6.2 4-Step-Wizard oder den V7.5 NL-Surface angelegt wurde.
- Affected Areas:
  - `automation_rules`-Table: neue Spalte mit Whitelist + DEFAULT.
  - Bestehende Rules (2 Rows): rueckwirkend auf `click_wizard` gesetzt via DEFAULT-Greif.
  - V7.5-Sculptor (SLC-752+): wird beim Apply via Server Action `created_via='nl_sculptor'` setzen.
- Risk: minimal. Additive Spalte mit DEFAULT, kein Query-Pfad bricht, kein Backfill noetig.
- Rollback Notes: `ALTER TABLE automation_rules DROP COLUMN created_via;` Vorher pruefen ob V7.5-Inspection-Log noch aktive Referenzen auf `created_via` haelt — andernfalls Inspection-Log-Query brechen.
- Verification (2026-05-16): `\d automation_rules` zeigt `created_via TEXT NOT NULL DEFAULT 'click_wizard'::text` + `automation_rules_created_via_check CHECK (created_via IN ('click_wizard','nl_sculptor'))`. 2 bestehende Rows = 'click_wizard'.

### MIG-032 — V6.6 Working-Hours-Setting + Win/Loss-Auto-Trigger Schema
- Date: 2026-05-11 (applied via SSH+base64 in SLC-665 MT-1, plus MIG-032b system-rule INSERT)
- Scope: 3 additive Aenderungen in `032_v66_working_hours_and_winloss.sql` + `032b_v66_system_winloss_rule.sql`:
  1. Erweiterung `user_settings` um 2 nullable TIME-Spalten (DEC-172):
     ```sql
     ALTER TABLE user_settings
       ADD COLUMN IF NOT EXISTS working_hours_start TIME NULL,
       ADD COLUMN IF NOT EXISTS working_hours_end TIME NULL;
     ALTER TABLE user_settings
       ADD CONSTRAINT user_settings_working_hours_check
       CHECK (
         (working_hours_start IS NULL AND working_hours_end IS NULL)
         OR (working_hours_start IS NOT NULL AND working_hours_end IS NOT NULL AND working_hours_start < working_hours_end)
       );
     ```
  2. Neue Tabelle `auto_winloss_runs` (DEC-171):
     ```sql
     CREATE TABLE IF NOT EXISTS auto_winloss_runs (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
       target_status TEXT NOT NULL CHECK (target_status IN ('won', 'lost')),
       triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       triggered_by_user_id UUID NULL,
       triggered_by_system BOOLEAN NOT NULL DEFAULT true,
       bedrock_output TEXT NULL,
       bedrock_model TEXT NULL,
       bedrock_completed_at TIMESTAMPTZ NULL,
       status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
       error_message TEXT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );
     CREATE INDEX IF NOT EXISTS idx_auto_winloss_runs_deal ON auto_winloss_runs(deal_id);
     CREATE INDEX IF NOT EXISTS idx_auto_winloss_runs_recent
       ON auto_winloss_runs(deal_id, target_status, triggered_at DESC);
     ALTER TABLE auto_winloss_runs ENABLE ROW LEVEL SECURITY;
     CREATE POLICY authenticated_full_access ON auto_winloss_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
     GRANT ALL ON auto_winloss_runs TO authenticated;
     GRANT ALL ON auto_winloss_runs TO service_role;
     ```
  3. Neue Spalte `automation_rules.is_system` (DEC-171, schuetzt System-Rule vor Builder-UI-Listing):
     ```sql
     ALTER TABLE automation_rules
       ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;
     CREATE INDEX IF NOT EXISTS idx_automation_rules_is_system
       ON automation_rules(is_system) WHERE is_system = true;
     ```
- Reason: V6.6 FEAT-662 (Kalender-Polish + Working-Hours-Setting) und FEAT-666 (Win/Loss-Auto-Trigger) brauchen das gemeinsame Schema in einer Migration. DEC-171 + DEC-172 haben die Strategie festgelegt. `is_system` als dritte additive Aenderung notwendig damit die System-Rule nicht im Builder-UI auftaucht und nicht versehentlich von Usern editiert wird (per `is_system=false`-Filter in `listAutomationRules`). Bestehende `user_settings`-Rows bleiben funktional ohne Working-Hours-Wert (nullable). `auto_winloss_runs` ist eine eigene, neue Tabelle ohne Touch auf bestehende V4.3/V5.x AI-Run-Strukturen — additive Migration ohne Regression-Risiko. CHECK-Constraint auf working_hours sichert Daten-Integritaet (Both-NULL-or-Both-Set + Start<End). RLS-Pattern konsistent zu MIG-027/030.
- Affected Areas:
  - Settings-Page `/settings/working-hours` (NEU, SLC-667) mit Server Actions `getWorkingHoursSettings`, `updateWorkingHoursSettings`
  - `cockpit/src/components/kalender-client.tsx` (SLC-667) — Hartkodierung 07:00-20:00 zu `DEFAULT_HOUR_RANGE` Konstante 06:00-21:00, Working-Hours-Lookup, Toggle-Logik
  - `cockpit/src/lib/automation/actions/auto_winloss_extract.ts` (NEU, SLC-665) — Workflow-Action-Implementation
  - `cockpit/src/lib/winloss/runWinLossExtract.ts` (NEU, SLC-665) — Bedrock-Wrapper-Pfad mit Reuse FEAT-114 Loss-Analysis-Logik
  - `cockpit/src/app/api/winloss/[deal_id]/route.ts` (NEU, SLC-665) — Read-API-Endpoint im FEAT-622-Pattern mit Bearer-Auth EXPORT_API_KEY
  - System-Workflow-Rule-Anlage (SLC-665) — Code-konstante registriert `auto_winloss_extract` als Action-Type, einmaliger INSERT in `automation_rules` mit `is_system=true`, `trigger=deal.stage_changed`
  - audit_log (INSERT pro Auto-Trigger-Run + INSERT pro skipped-recent-Run + INSERT pro manueller Re-Run-Klick mit triggered_by_user_id)
  - automation_runs (INSERT pro auto_winloss_extract-Run, V6.2-Pattern)
- Risk: Niedrig — rein additive Aenderungen. Beide Aenderungen sind nullable/neu, kein Daten-Migration-Schritt noetig. UNIQUE-Constraints fehlen bewusst (DEC-171: Time-Window-Throttle erlaubt sinnvolle Re-Runs ueber lange Zeit). CHECK-Constraints auf working_hours_start<working_hours_end + target_status-Whitelist + status-Whitelist blockieren ungueltige Inputs am DB-Level. Indizes optimiert fuer Time-Window-Lookup-Pattern (5-Min-Throttle-Query). RLS authenticated_full_access konsistent mit V5.7+/V6.x-Pattern fuer Single-User-Mode (V7-Multi-User-Erweiterung folgt). KEIN Lock-Wait beim Apply (ALTER ADD COLUMN nullable + CREATE TABLE sind beide Postgres-Standard ohne Table-Lock).
- Rollback Notes:
  - `DROP TABLE IF EXISTS auto_winloss_runs CASCADE;`
  - `ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_working_hours_check;`
  - `ALTER TABLE user_settings DROP COLUMN IF EXISTS working_hours_start;`
  - `ALTER TABLE user_settings DROP COLUMN IF EXISTS working_hours_end;`
  - V6.5-Code funktioniert nach Rollback unveraendert weiter — `kalender-client.tsx` muss auf 07:00-20:00-Hartkodierung zurueckgesetzt werden (Code-Rollback), Workflow-Action-Code muss aus automation/actions-Registry entfernt werden, System-Workflow-Rule muss aus automation_rules geloescht werden (DELETE WHERE is_system=true AND action_type='auto_winloss_extract'). Read-API-Route /api/winloss/[deal_id] gibt 404 zurueck nach DROP TABLE.

### MIG-030 — V6.5 VIES-Cache Tabelle (FEAT-652)
- Date: 2026-05-08 (applied via SSH+base64 in SLC-655 Implementation)
- Scope: 1 additive Aenderung — neue Tabelle `vat_id_validations` als Cache-Layer fuer VIES-Online-Lookup-Resultate.
  ```sql
  CREATE TABLE vat_id_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country VARCHAR(2) NOT NULL,
    number VARCHAR(50) NOT NULL,
    is_valid BOOLEAN NOT NULL,
    vies_response JSONB,
    source TEXT NOT NULL CHECK (source IN ('vies', 'vies_unavailable', 'format_only')),
    validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(country, number)
  );
  CREATE INDEX idx_vat_id_validations_lookup ON vat_id_validations(country, number, expires_at);
  ALTER TABLE vat_id_validations ENABLE ROW LEVEL SECURITY;
  CREATE POLICY authenticated_full_access ON vat_id_validations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  GRANT ALL ON vat_id_validations TO authenticated;
  GRANT ALL ON vat_id_validations TO service_role;
  ```
- Reason: V6.5 FEAT-652 implementiert VIES-Online-Lookup mit 24h-TTL-Caching (DEC-157). Cache-Layer als DB-Tabelle survives Container-Restart (vs. In-Memory) und liefert Audit-Trail. UNIQUE(country, number) schuetzt vor Duplikaten, expires_at-Index erlaubt schnelle Cache-Pruefung. RLS-Pattern konsistent zu V5.7 vat-id-Schema.
- Affected Areas:
  - Neue Tabelle `vat_id_validations` (5 Spalten, 1 UNIQUE-Index, 1 Lookup-Index, RLS aktiv)
  - Neue Server-Action / Lib `cockpit/src/lib/vat/vies-client.ts` (Lookup-Funktion mit Cache-Layer)
  - Erweiterung `cockpit/src/lib/vat/vat-id.ts` um VIES-Tier (Format-Layer bleibt unveraendert)
  - UI-Indikator in Branding-Form + Company-Form (3 Status-Badges per DEC-158)
- Risk: Niedrig. Rein additiv. Keine bestehenden Tabellen geaendert. VIES-Adapter ist optional — wenn ENV `VIES_ENABLED=false`, faellt System auf Format-only zurueck (DEC-158 graceful-degradation).
- Rollback Notes:
  - `DROP TABLE vat_id_validations CASCADE;`
  - V5.7-Format-only-Validierung funktioniert weiter unveraendert
  - Branding-Form + Company-Form fallback auf Format-only-Display

### MIG-031 — V6.5 Source-zu-Kampagne Bulk-Migration (FEAT-653 BL-424)
- Date: 2026-05-08 (Skripte ready, Apply als No-Op deferred bis Daten anfallen)
- Status: ready-when-needed (kein Production-Apply, Pre-Audit zeigte 0 Legacy-Daten)
- Apply-History:
  - Pre-Audit ausgefuehrt 2026-05-08 in SLC-657 MT-1: 0 contacts mit `source`/`source_detail`, 0 companies mit `source_type`/`source_detail`, 0 Kampagnen in DB. Bulk-UPDATE-Skript ist No-Op fuer aktuellen Daten-Stand.
  - Skripte commited als Repo-Artefakt: `sql/migrations/031_v65_pre_audit.sql` (read-only Audit), `sql/migrations/031_v65_source_to_campaign_mapping.json` (User-Mapping-Template, leer), `sql/migrations/031_v65_bulk_update.sql` (idempotenter UPDATE), `sql/migrations/031_v65_source_to_campaign_mapping.README.md` (Schema-Doku + Apply-Anweisung).
  - Re-Apply-Pfad: bei produktivem Daten-Anfall Pre-Audit erneut + Mapping-JSON pflegen + Bulk-UPDATE ausfuehren.
- Scope: Datenmigration ohne Schema-Aenderung. Quell-Felder bleiben als read-only-Backup erhalten (DEC-160).
  - Pre-Migration-Audit-Query (User-Sign-Off-Pause): `SELECT source, source_detail, COUNT(*) FROM contacts WHERE source IS NOT NULL GROUP BY 1,2 ORDER BY 3 DESC; SELECT source_type, source_detail, COUNT(*) FROM companies WHERE source_type IS NOT NULL GROUP BY 1,2 ORDER BY 3 DESC;`
  - User-pflegt Mapping-File: `sql/migrations/031_v65_source_to_campaign_mapping.json` mit Struktur `[{"entity":"contact","source_value":"LinkedIn April","source_detail_value":null,"campaign_id":"<uuid>"}, ...]`
  - Bulk-UPDATE-SQL (idempotent via campaign_id IS NULL Filter):
    ```sql
    UPDATE contacts SET campaign_id = m.campaign_id::uuid
    FROM jsonb_to_recordset($1::jsonb) AS m(entity TEXT, source_value TEXT, source_detail_value TEXT, campaign_id TEXT)
    WHERE m.entity = 'contact'
      AND contacts.campaign_id IS NULL
      AND contacts.source = m.source_value
      AND contacts.source_detail IS NOT DISTINCT FROM m.source_detail_value;
    -- analog fuer companies mit source_type/source_detail
    ```
  - Audit-Log-Insert pro Migration-Run mit Stats (action='source_migration_v65', changes={migrated_contacts, migrated_companies, mapping_used, run_at})
  - KEINE Schema-Aenderung: source/source_detail/source_type bleiben in DB als read-only-Backup
- Reason: V6.4-Audit hat 4 Source-Schema-Drift-Items klassifiziert (CA-011..014). V6.5 raeumt Drift via einmalige Bulk-Migration auf, behaelt aber Backup-Felder fuer 6+ Monate Rollback-Pfad.
- Affected Areas:
  - Bestehende `contacts` / `companies` rows mit non-null `source*`-Feldern bekommen `campaign_id` gesetzt wenn Mapping existiert
  - Form-Inputs (`contact-form.tsx`, `company-form.tsx`) zeigen `source*`-Felder nur read-only-display wenn nicht-leer (Hinweis "Legacy-Quelle, neue Eingaben via Kampagne")
  - CSV-Export-Spalten-Schema in `/api/campaigns/[id]/export/route.ts` von `source_detail` auf `campaign_name` umstellen
- Risk: Niedrig wegen idempotenter UPDATE-Filter (campaign_id IS NULL). Risiko: User-Mapping-File enthaelt Tippfehler oder fehlerhafte Mappings → Pre-Migration-Audit + User-Sign-Off-Pause + ggf. Re-Run-Strategie. Falls falsche Mapping live: campaign_id = NULL UPDATE per source-Filter rollback-able, da Source-Felder als Backup erhalten bleiben.
- Rollback Notes:
  - Per-Item: `UPDATE contacts SET campaign_id = NULL WHERE source = 'LinkedIn April' AND campaign_id = '<falsche-uuid>'::uuid;`
  - Total: `UPDATE contacts SET campaign_id = NULL WHERE id IN (SELECT entity_id FROM audit_log WHERE action='source_migration_v65');` — falls audit_log-Trail die UUIDs enthaelt
  - Backup-Felder (source/source_detail/source_type) bleiben unveraendert — vollstaendige Re-Migration moeglich

### MIG-029 — V6.2 Workflow-Automation + Kampagnen-Attribution Schema
- Date: 2026-05-06 (alle 3 Phasen applied auf Hetzner)
- Apply-History:
  - Phase 1 (Workflow): applied via SLC-621 (2026-05-05) — automation_rules + automation_runs + Anti-Loop-UNIQUE
  - Phase 2 (Campaigns): applied via SLC-624 (2026-05-05) — campaigns + 3 ALTER campaign_id FKs auf contacts/companies/deals + Partial-Indizes + RLS + GRANTS. Live-verifiziert via psql `\d campaigns`: 12 Spalten, 2 UNIQUE-Indizes (LOWER(name) + partial external_ref), 1 Partial-Index (status='active'), Date-Range-CHECK, RLS aktiv, 3 FK ON DELETE SET NULL.
  - Phase 3 (Tracking-Links): applied via SLC-625 (2026-05-06) — campaign_links (12 Spalten, UNIQUE-Token, target_url-CHECK https?://, FK CASCADE auf campaigns, idx_campaign_id) + campaign_link_clicks (id, link_id FK CASCADE, clicked_at, ip_hash, user_agent, referer, idx_link_id+clicked_at_DESC) + RLS + GRANTS. Live-verifiziert via psql `\d campaign_links` und `\d campaign_link_clicks`.
- Scope: 7 additive Aenderungen in einer Migration:
  1. Neue Tabelle `automation_rules` (DEC-129..134, FEAT-621):
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `name TEXT NOT NULL`, `description TEXT NULL`
     - `status TEXT NOT NULL CHECK (status IN ('active','paused','disabled')) DEFAULT 'paused'`
     - `trigger_event TEXT NOT NULL CHECK (trigger_event IN ('deal.stage_changed','deal.created','activity.created'))`
     - `trigger_config JSONB NOT NULL DEFAULT '{}'` (z.B. {stage_id, activity_types[]})
     - `conditions JSONB NOT NULL DEFAULT '[]'` (Array of {field, op, value} AND-only)
     - `actions JSONB NOT NULL DEFAULT '[]'` (ordered Array of {type, params, assignee?})
     - `references_stage_ids UUID[] DEFAULT '{}'` (denormalisiert fuer Stage-Loesch-Lookup, DEC-133)
     - `paused_reason TEXT NULL` (z.B. "Stage geloescht")
     - `created_by UUID NOT NULL`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
     - `last_run_at TIMESTAMPTZ NULL`, `last_run_status TEXT NULL` (Cache fuer UI)
     - 1 Partial-Index: `idx_automation_rules_active ON automation_rules(trigger_event, status) WHERE status='active'`
     - RLS `authenticated_full_access` (Single-User-V1, V7-Multi-User-Erweiterung folgt)
  2. Neue Tabelle `automation_runs` (DEC-129/131, FEAT-621):
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE`
     - `trigger_event TEXT NOT NULL`, `trigger_entity_type TEXT NOT NULL`, `trigger_entity_id UUID NOT NULL`
     - `trigger_event_audit_id UUID NULL` (FK soft-link zu audit_log.id, kein REFERENCES wegen audit_log-Delete-Edge-Case)
     - `conditions_match BOOLEAN NULL` (NULL bis evaluation done)
     - `status TEXT NOT NULL CHECK (status IN ('pending','running','success','partial_failed','failed','skipped')) DEFAULT 'pending'`
     - `started_at TIMESTAMPTZ DEFAULT now()`, `finished_at TIMESTAMPTZ NULL`
     - `action_results JSONB NOT NULL DEFAULT '[]'` ([{action_index, type, outcome, error_message?, audit_log_id?}])
     - `error_message TEXT NULL`
     - `created_at TIMESTAMPTZ DEFAULT now()`
     - **Anti-Loop-UNIQUE:** `UNIQUE (rule_id, trigger_entity_id, trigger_event_audit_id)` — verhindert dass identischer Trigger denselben Workflow erneut ausloest
     - 2 Indizes: `idx_automation_runs_pending ON started_at WHERE status IN ('pending','running')` (Cron-Pickup), `idx_automation_runs_rule ON (rule_id, started_at DESC)` (UI-Statistik)
     - RLS `authenticated_full_access`
  3. Neue Tabelle `campaigns` (DEC-135, FEAT-622):
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `name TEXT NOT NULL`, `type TEXT NOT NULL CHECK (type IN ('email','linkedin','event','ads','referral','other'))`
     - `channel TEXT NULL`, `start_date DATE NOT NULL`, `end_date DATE NULL`
     - `status TEXT NOT NULL CHECK (status IN ('draft','active','finished','archived')) DEFAULT 'draft'`
     - `external_ref TEXT NULL` (System-4-Campaign-Id, partial UNIQUE)
     - `notes TEXT NULL`, `created_by UUID NOT NULL`
     - `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
     - 2 UNIQUE-Constraints: `UNIQUE (LOWER(name))` (case-insensitive name), partial `UNIQUE (external_ref) WHERE external_ref IS NOT NULL`
     - 1 Partial-Index: `idx_campaigns_status_active ON (status, start_date) WHERE status='active'`
     - RLS `authenticated_full_access`
  4. Neue Tabelle `campaign_links` (DEC-137, FEAT-622):
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE`
     - `token TEXT UNIQUE NOT NULL` (8-char base64url via crypto.randomBytes)
     - `target_url TEXT NOT NULL`, `utm_source TEXT NOT NULL`, `utm_medium TEXT NOT NULL`, `utm_campaign TEXT NOT NULL`
     - `utm_content TEXT NULL`, `utm_term TEXT NULL`, `label TEXT NULL`
     - `click_count INTEGER NOT NULL DEFAULT 0` (denormalisiert, gepflegt von /r/[token]-Endpoint)
     - `created_at TIMESTAMPTZ DEFAULT now()`
     - 1 Index: `idx_campaign_links_campaign ON (campaign_id)`
     - RLS `authenticated_full_access`
  5. Neue Tabelle `campaign_link_clicks` (DEC-138, FEAT-622):
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `link_id UUID NOT NULL REFERENCES campaign_links(id) ON DELETE CASCADE`
     - `clicked_at TIMESTAMPTZ DEFAULT now()`
     - `ip_hash TEXT NULL` (SHA-256 von IP, DSGVO-konform)
     - `user_agent TEXT NULL` (truncated 200 chars)
     - `referer TEXT NULL` (truncated 500 chars)
     - 1 Index: `idx_campaign_link_clicks_link_time ON (link_id, clicked_at DESC)`
     - RLS `authenticated_full_access`
     - retention 90 Tage (Cleanup-Cron BL-XXX V6.3, NICHT V1-Scope)
  6. Erweiterung `contacts`, `companies`, `deals` um `campaign_id` (DEC-136 — additive FK, keine source*-Migration):
     - `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL;`
     - `ALTER TABLE companies ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL;`
     - `ALTER TABLE deals ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL;`
     - 3 Partial-Indizes: `idx_contacts_campaign WHERE campaign_id IS NOT NULL`, `idx_companies_campaign WHERE campaign_id IS NOT NULL`, `idx_deals_campaign WHERE campaign_id IS NOT NULL`
     - Bestehende `contacts.source`, `contacts.source_detail`, `companies.source_type`, `companies.source_detail` bleiben unangetastet (DEC-136)
  7. GRANTS auf alle neuen Tabellen: `GRANT ALL ON automation_rules, automation_runs, campaigns, campaign_links, campaign_link_clicks TO authenticated, service_role;`
- Reason: V6.2 FEAT-621 + FEAT-622 brauchen das gemeinsame Schema in einer Migration. DEC-129..141 haben die Strategie festgelegt. Bestehende Daten bleiben unveraendert lesbar (alle neuen Spalten nullable / mit Defaults). Bestehende source*-Felder werden NICHT migriert (DEC-136). Anti-Loop-Garantie via UNIQUE-Constraint auf `automation_runs(rule_id, trigger_entity_id, trigger_event_audit_id)`. KEIN Worker-Container, KEIN neuer Cron-Job ueber `automation-runner` hinaus.
- Affected Areas:
  - Neue Server Actions in `cockpit/src/app/(app)/settings/automation/actions.ts` (CRUD fuer automation_rules)
  - Neue Server Actions in `cockpit/src/app/(app)/settings/campaigns/actions.ts` (CRUD fuer campaigns)
  - Neue Server Actions in `cockpit/src/app/(app)/campaigns/[id]/actions.ts` (createCampaignLink, listCampaignLinks)
  - Neuer Helper `cockpit/src/lib/automation/dispatcher.ts` (Trigger-Dispatch nach Server-Action-Commit)
  - Neuer Helper `cockpit/src/lib/automation/executor.ts` (Action-Execution mit 4 Action-Types)
  - Neuer Helper `cockpit/src/lib/automation/dry-run.ts` (Trockenlauf gegen Source-Tabellen)
  - Neuer Helper `cockpit/src/lib/automation/field-whitelist.ts` (Code-Konfig DEC-130)
  - Neuer Helper `cockpit/src/lib/automation/assignee-resolver.ts` (Owner-Resolution DEC-134)
  - Neuer Helper `cockpit/src/lib/campaigns/token.ts` (8-char base64url Token-Generator DEC-137)
  - Neuer Helper `cockpit/src/lib/campaigns/mapper.ts` (utm→campaign Resolution DEC-135)
  - Neue Pages: `/settings/automation` Listing + `/settings/automation/[id]/edit`, `/settings/campaigns` + `/campaigns/[id]`
  - Neuer Public Route `/r/[token]/route.ts` (302-Redirect + Click-Log)
  - Neuer Cron-Endpoint `/api/cron/automation-runner/route.ts` (Pattern aus expire-proposals/route.ts)
  - Neuer API-Endpoint `/api/campaigns/[id]/performance/route.ts` (Bearer-Auth via verifyExportApiKey)
  - Erweiterung Server Actions: `deals/actions.ts` (updateDealStage, createDeal — dispatchAutomationTrigger-Aufruf), `activities/actions.ts` (createActivity — dispatch), `pipeline-stages/actions.ts` (deletePipelineStage — Soft-Disable referenzierender Regeln)
  - Erweiterung Stammdaten-UI: Contacts/Companies/Deals Edit-Form bekommt Kampagne-Dropdown
  - Erweiterung `/funnel`-Page: Kampagne-Filter-Dropdown (DEC-139)
  - KEINE Aenderung an `audit_log`-Schema (existing reicht), `email_templates`, `proposal*`, `meetings`, `briefing-cron`, `pgvector`-Tabellen, `email_messages`, `recordings`, `transcripts`
- Risk: Niedrig — alle Aenderungen rein additiv. Neue Tabellen ohne Konflikt mit bestehenden. ALTER TABLE auf contacts/companies/deals ist Metadata-Change ohne Daten-Touch (alle 3 Spalten NULLable mit Default NULL). Anti-Loop-UNIQUE-Constraint hat klare Semantik (NULL-Werte in trigger_event_audit_id sind aus Postgres-UNIQUE-Sicht "verschieden" — daher Anti-Loop greift nur wenn audit_id gesetzt ist; trigger ohne audit_id wie deal.created sollte audit_id auf deal.id setzen oder via separate "synthetic trigger event id" Strategie behandeln, das wird in SLC-621 abschliessend implementiert).
- Rollback Notes:
  - `DROP TABLE campaign_link_clicks CASCADE;`
  - `DROP TABLE campaign_links CASCADE;`
  - `ALTER TABLE deals DROP COLUMN IF EXISTS campaign_id;`
  - `ALTER TABLE companies DROP COLUMN IF EXISTS campaign_id;`
  - `ALTER TABLE contacts DROP COLUMN IF EXISTS campaign_id;`
  - `DROP TABLE campaigns CASCADE;`
  - `DROP TABLE automation_runs CASCADE;`
  - `DROP TABLE automation_rules CASCADE;`
  - V5.7-Code funktioniert nach Rollback unveraendert weiter — bestehende source*-Felder bleiben primary attribution. Falls vor Rollback Tracking-Links public verteilt wurden: 302-Redirect-URLs werden zu 404 (Public-Endpoint /r/[token] verschwindet — Soft-Fail).

### MIG-001 — Initial Schema V1
- Date: 2026-03-27
- Scope: 9 Tabellen (profiles, companies, contacts, pipelines, pipeline_stages, deals, activities, documents, content_calendar) + RLS Policies + Seed-Daten (2 Pipelines mit Default-Stages)
- Reason: Initiales Schema für V1 CRM-Kern, Pipeline-Management, Aktivitäten-Log, Dokumente und Redaktionskalender.
- Affected Areas: Gesamte Datenbasis. Alle CRUD-Operationen im Cockpit.
- Risk: Erste Migration, kein bestehendes Schema. Risiko gering.
- Rollback Notes: DROP TABLE in umgekehrter Reihenfolge (content_calendar, documents, activities, deals, pipeline_stages, pipelines, contacts, companies, profiles).

### MIG-002 — Fix overall_score type in fit_assessments
- Date: 2026-04-02
- Scope: fit_assessments.overall_score von INT auf NUMERIC(3,1) geändert
- Reason: Score-Berechnung erzeugt Dezimalwerte (z.B. 3.4), die bei INT verloren gehen. QA-Finding aus SLC-109.
- Affected Areas: fit_assessments Tabelle, Fit-Assessment Anzeige
- Risk: Gering — ALTER COLUMN TYPE ist verlustfrei für bestehende INT-Werte
- Rollback Notes: ALTER TABLE fit_assessments ALTER COLUMN overall_score TYPE INT;

### MIG-003 — Deal-Status-Workflow (V2.1)
- Date: 2026-04-04
- Scope: deals Tabelle — closed_at Timestamp hinzugefügt, lost_reason entfernt, Indexes auf status und closed_at
- Reason: Deal-Status-Lifecycle (active → won/lost) mit Auto-Status bei Stage-Wechsel. DB-Cleanup orphaned Fields.
- Affected Areas: Pipeline, Deal-CRUD, Dashboard
- Risk: Gering — lost_reason war nie in Benutzung (orphaned Field)
- Rollback Notes: ALTER TABLE deals DROP COLUMN closed_at; ALTER TABLE deals ADD COLUMN lost_reason TEXT;

### MIG-004 — Lead-Management-Pipeline (V2.1)
- Date: 2026-04-06
- Scope: Neue Pipeline "Lead-Management" mit 7 Stages (Identifiziert → Qualifiziert)
- Reason: Dritte Pipeline für Marketing-Outreach und Lead-Qualifizierung (SLC-208)
- Affected Areas: Pipelines, Pipeline-Stages, Sidebar, /pipeline/leads Route
- Risk: Gering — additive Änderung, kein Impact auf bestehende Pipelines
- Rollback Notes: DELETE FROM pipeline_stages WHERE pipeline_id = 'b0000000-0000-0000-0000-000000000003'; DELETE FROM pipelines WHERE id = 'b0000000-0000-0000-0000-000000000003';

### MIG-005 — V3 Schema-Erweiterungen
- Date: 2026-04-09
- Scope: 3 neue Tabellen (meetings, calendar_events, audit_log). Activities erweitert um source_type + source_id. Profiles role-Default von 'owner' auf 'admin' geaendert, team-Spalte hinzugefuegt. RLS (authenticated_full_access) + Grants auf neuen Tabellen. 9 Indexes.
- Reason: V3 Operative Kontextlogik — Meeting-Management (FEAT-308), Kalender-Events (FEAT-309), Governance-Basis (FEAT-307), Timeline-Rueckverlinkung (DEC-021).
- Affected Areas: Gesamte Datenbasis, Mein Tag, Deal-Workspace, Audit-Log-Viewer
- Risk: Gering — rein additive Aenderungen (neue Tabellen, neue Spalten, Default-Aenderung). Kein Impact auf bestehende Daten. Verifiziert auf Hetzner.
- Rollback Notes: DROP TABLE audit_log; DROP TABLE calendar_events; DROP TABLE meetings; ALTER TABLE activities DROP COLUMN source_type; ALTER TABLE activities DROP COLUMN source_id; ALTER TABLE profiles DROP COLUMN team; ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'owner';

### MIG-007 — V3.1 Task-Typ-Feld (Auto-Wiedervorlagen)
- Date: 2026-04-10
- Scope: tasks Tabelle — type-Spalte hinzugefuegt (TEXT DEFAULT 'manual'), Index auf type
- Reason: SLC-316 Auto-Wiedervorlagen — Tasks muessen zwischen manuell erstellten und automatischen Follow-up-Tasks unterscheidbar sein. Ermoeglicht Filterung in Aufgabenliste und differenzierte Anzeige in Mein Tag.
- Affected Areas: Tasks, Aufgaben-Seite, Mein Tag, E-Mail-Versand, Meeting-Completion
- Risk: Gering — rein additive Aenderung. Bestehende Tasks erhalten automatisch type='manual' als Default.
- Rollback Notes: ALTER TABLE tasks DROP COLUMN type; DROP INDEX idx_tasks_type;

### MIG-009 — V3.1 Templates + Attribution + Duplikat-Indizes
- Date: 2026-04-10
- Scope: Neue Tabelle email_templates (CRUD + RLS). companies: source_type + source_detail Spalten. contacts: source_detail Spalte. Indizes fuer Duplikat-Erkennung (contacts.email, companies.name).
- Reason: SLC-318 Templates, Duplikate, Attribution. E-Mail-Templates in 3 Sprachen, strukturierte Quell-Zuordnung, Duplikat-Warnung.
- Affected Areas: Settings (Template-CRUD), E-Mail-Compose (Template-Auswahl), Kontakte + Firmen (Source-Felder, Duplikat-Check)
- Risk: Gering — rein additive Aenderungen.
- Rollback Notes: DROP TABLE email_templates; ALTER TABLE companies DROP COLUMN source_type; ALTER TABLE companies DROP COLUMN source_detail; ALTER TABLE contacts DROP COLUMN source_detail;

### MIG-008 — V3.1 Yesterday Review + Unseen Events
- Date: 2026-04-10
- Scope: profiles Tabelle — last_login_at Spalte hinzugefuegt. Index auf tasks.completed_at.
- Reason: SLC-317 Tageseinschaetzung erweitert — "Seit letztem Login" Feature braucht Zeitstempel, Vortags-Queries brauchen Index auf completed_at.
- Affected Areas: Profiles, Mein Tag, Tasks
- Risk: Gering — rein additive Aenderung.
- Rollback Notes: ALTER TABLE profiles DROP COLUMN last_login_at; DROP INDEX idx_tasks_completed_at;

### MIG-006 — V3 RLS-Umbau (geplant)
- Date: TBD
- Scope: created_by-Backfill auf bestehende Rows. RLS-Policies von full_access auf operator_own_data umstellen (deals, tasks, emails, activities, documents, meetings, calendar_events). audit_log: admin-only.
- Reason: FEAT-307 Governance-Basis — Rollenbasierte Sichtbarkeit (Operator sieht eigene Daten, Admin sieht alles).
- Affected Areas: Alle geschaeftsrelevanten Tabellen, Auth-Flow, Server Actions
- Risk: Mittel — created_by-Backfill muss vor RLS-Umbau laufen. Single-User-Szenario reduziert Risiko.
- Rollback Notes: Pro Tabelle: DROP POLICY operator_own_data, DROP POLICY admin_full_access, CREATE POLICY authenticated_full_access FOR ALL TO authenticated USING (true).

### MIG-010 — V4 IMAP + KI-Gatekeeper Schema
- Date: 2026-04-12
- Scope: 5 neue Tabellen (email_messages, email_threads, email_sync_state, ai_action_queue, ai_feedback). calendar_events erweitert um source, external_id, sync_status, booking_link. RLS + Grants + Indizes.
- Reason: V4 KI-Gatekeeper + Externe Integrationen. IMAP E-Mail-Sync (FEAT-405), KI-Klassifikation (FEAT-408), KI-Wiedervorlagen (FEAT-407), Auto-Reply-Erkennung (FEAT-410), Cal.com-Sync (FEAT-406).
- Affected Areas: E-Mail-System (IMAP inbound neben SMTP outbound), Mein Tag (Gatekeeper, Wiedervorlagen), Kalender (Cal.com Sync), KI-Layer (Klassifikation, Action-Queue)
- Risk: Mittel — Rein additive Aenderungen (neue Tabellen, neue Spalten). Bestehende emails-Tabelle bleibt unveraendert. Kein Impact auf bestehende Daten. IMAP-Credentials muessen vorher in Coolify Env Vars stehen.
- Rollback Notes: DROP TABLE ai_feedback; DROP TABLE ai_action_queue; DROP TABLE email_sync_state; DROP TABLE email_messages; DROP TABLE email_threads; ALTER TABLE calendar_events DROP COLUMN source; ALTER TABLE calendar_events DROP COLUMN external_id; ALTER TABLE calendar_events DROP COLUMN sync_status; ALTER TABLE calendar_events DROP COLUMN booking_link;

### MIG-012 — Fix fehlende RLS-Policies auf V2/V3-Tabellen
- Date: 2026-04-16
- Scope: `authenticated_full_access` Policy auf 6 Tabellen (emails, fit_assessments, handoffs, proposals, referrals, signals) nachgezogen. RLS war auf diesen Tabellen aktiviert, aber keine Policy definiert — Postgres-Verhalten war damit "alles verboten" fuer authenticated. Idempotent via DROP POLICY IF EXISTS + CREATE POLICY. Zusaetzlich explizite Grants fuer authenticated + service_role.
- Reason: Historisch fehlerhafte Migration — V2/V3 haben RLS aktiviert, aber die V1-Policy-Struktur aus `02_rls.sql` wurde nicht fuer neue Tabellen wiederholt. Bei SLC-411 Live-Test ("E-Mail versenden" Klick) als 535-nachfolgender RLS-Fehler sichtbar geworden. Siehe ISSUE-034.
- Affected Areas: E-Mail-Versand-Logging, Fit-Assessment, Handoffs, Proposals, Referrals, Signals — alle Cockpit-UI-Pfade, die als authenticated User in diese Tabellen schrieben.
- Risk: Gering — rein additive Aenderung (Policies hinzufuegen, nichts entfernen). `authenticated_full_access` ist das V1-Standard-Muster (USING true WITH CHECK true). service_role/adminClient war nicht betroffen (BYPASSRLS).
- Rollback Notes: Fuer Rollback: `DO $$ DECLARE tbl TEXT; BEGIN FOREACH tbl IN ARRAY ARRAY['emails','fit_assessments','handoffs','proposals','referrals','signals'] LOOP EXECUTE format('DROP POLICY IF EXISTS "authenticated_full_access" ON %I', tbl); END LOOP; END $$;` (stellt den pre-fix State wieder her — NICHT empfohlen, weil der pre-fix State gebrochen war).

### MIG-011 — V4.1 Meeting Intelligence Schema
- Date: 2026-04-16
- Scope: Neue Tabelle `user_settings` (1:1 zu profiles, Reminder- und Agenda-Einstellungen, push_subscription). `contacts` erweitert um 7 Felder (consent_status, consent_date, consent_source, consent_token, consent_token_expires_at, consent_requested_at, opt_out_communication). `meetings` erweitert um 11 Recording-/Transcript-/Summary-/Agenda-Felder (jitsi_room_name, recording_url, recording_status, recording_started_at, recording_duration_seconds, transcript_status, summary_status, ai_summary JSONB, ai_agenda, ai_agenda_generated_at, reminders_sent JSONB). `activities.ai_generated` BOOLEAN DEFAULT false. `audit_log.actor_id` wird NULLABLE (fuer Public-Page-Events). Neue audit_log-Actions fuer Consent- (consent_requested/granted/declined/revoked/communication_opt_out_changed) und Recording-Lifecycle (recording_started/completed/failed, transcript_generated, summary_generated). RLS authenticated_full_access auf user_settings. Indizes: idx_contacts_consent_token (partial), idx_contacts_consent_status, idx_contacts_opt_out (partial), idx_meetings_recording_status (partial).
- Reason: V4.1 Meeting Intelligence Basis — FEAT-404 Call Intelligence (Jitsi+Jibri+Whisper+Bedrock-Summary), FEAT-409 Meeting-Erinnerungen, FEAT-411 DSGVO-Einwilligungsflow inkl. ISSUE-032 (opt_out_communication). Aktiviert das in MIG-005 vorbereitete `meetings.transcript`-Feld.
- Affected Areas: Kontakte (Consent-UI, Public-Page, Opt-out-Toggle), Meetings (Deal-Workspace Recording-Status, Timeline-Summary-Activity), User-Settings (neue Seite in spaeteren Slices), Audit-Log (Consent-Events, Public-Actor=NULL)
- Risk: Mittel — rein additive Aenderungen. Bestand-Kontakte erhalten `consent_status = 'pending'` und `opt_out_communication = false` als Default. Recording-bezogene Meetings-Felder sind alle nullable — keine Auswirkung auf V4-Bestands-Meetings ohne Recording. `user_settings`-Tabelle ist neu ohne Impact auf bestehende Daten. `audit_log.actor_id DROP NOT NULL` ist abwaertskompatibel (vorhandene Rows bleiben gueltig).
- Rollback Notes: DROP TABLE user_settings; ALTER TABLE activities DROP COLUMN ai_generated; ALTER TABLE meetings DROP COLUMN reminders_sent, DROP COLUMN ai_agenda_generated_at, DROP COLUMN ai_agenda, DROP COLUMN ai_summary, DROP COLUMN summary_status, DROP COLUMN transcript_status, DROP COLUMN recording_duration_seconds, DROP COLUMN recording_started_at, DROP COLUMN recording_status, DROP COLUMN recording_url, DROP COLUMN jitsi_room_name; ALTER TABLE contacts DROP COLUMN opt_out_communication, DROP COLUMN consent_requested_at, DROP COLUMN consent_token_expires_at, DROP COLUMN consent_token, DROP COLUMN consent_source, DROP COLUMN consent_date, DROP COLUMN consent_status; ALTER TABLE audit_log ALTER COLUMN actor_id SET NOT NULL (nur wenn alle Rows eine actor_id haben); (audit_log-Rows mit Consent-Actions bleiben als Historie).

### MIG-013 — user_settings Backfill + Auto-Insert Trigger
- Date: 2026-04-17
- Scope: Backfill-INSERT fuer bestehende Profile ohne user_settings-Row (ON CONFLICT DO NOTHING). Neue Trigger-Funktion fn_create_user_settings() + Trigger trg_create_user_settings auf profiles (AFTER INSERT). Idempotent.
- Reason: SLC-417 — user_settings-Tabelle wurde in MIG-011 erstellt, aber ohne Daten. Backfill stellt sicher, dass bestehende User sofort Defaults haben. Trigger stellt sicher, dass kuenftige Profile automatisch eine user_settings-Row erhalten.
- Affected Areas: user_settings (neue Rows), profiles (neuer Trigger)
- Risk: Gering — rein additiver INSERT mit ON CONFLICT DO NOTHING. Trigger ist idempotent (DROP IF EXISTS vor CREATE).
- Rollback Notes: DROP TRIGGER IF EXISTS trg_create_user_settings ON profiles; DROP FUNCTION IF EXISTS fn_create_user_settings(); DELETE FROM user_settings WHERE user_id NOT IN (SELECT user_id FROM user_settings WHERE updated_at != created_at);

### MIG-014 — V4.2 pgvector + knowledge_chunks Schema
- Date: 2026-04-18
- Scope: pgvector Extension aktivieren. Neue Tabelle `knowledge_chunks` mit vector(1024) Spalte, HNSW-Index (m=16, ef_construction=64), Lookup-Indizes (source, status, deal_id aus JSONB), Unique Constraint (source_type, source_id, chunk_index). RLS authenticated_full_access + Grants.
- Reason: V4.2 Wissensbasis Cross-Source (FEAT-401, DEC-046). RAG-Pipeline benoetigt Vektor-Speicher fuer semantische Suche ueber Meeting-Transkripte, E-Mails, Deal-Activities und Dokumente.
- Affected Areas: PostgreSQL (neue Extension + Tabelle). Kein Impact auf bestehende Tabellen.
- Risk: Gering — rein additive Aenderung. pgvector ist in supabase/postgres:15.6.1.145 enthalten. HNSW-Index-Build ist bei leerer Tabelle instantan. Erst bei Backfill (~3.000 Chunks) wird der Index relevant.
- Rollback Notes: DROP TABLE knowledge_chunks; DROP EXTENSION vector;

### MIG-015 — V4.2 Knowledge Search RPC Function
- Date: 2026-04-18
- Scope: PostgreSQL-Funktion `search_knowledge_chunks` fuer pgvector Similarity Search via Supabase RPC. Parameter: query_embedding (TEXT → vector cast), match_count, filter_scope (deal/contact/company/null), filter_id. Returns: id, source_type, source_id, chunk_index, chunk_text, metadata, similarity (cosine). SECURITY DEFINER. GRANT EXECUTE fuer authenticated + service_role.
- Reason: Supabase PostgREST kann pgvector `<=>` Operator nicht direkt. RPC-Funktion kapselt die Similarity Search als aufrufbare API. SLC-424 RAG Query API.
- Affected Areas: Keine bestehenden Tabellen betroffen. Neue Funktion im public Schema.
- Risk: Gering — rein additiv, nutzt bestehende knowledge_chunks Tabelle und HNSW-Index.
- Rollback Notes: DROP FUNCTION search_knowledge_chunks;

### MIG-016 — V4.3 ai_action_queue Erweiterung + Signal-Status
- Date: 2026-04-19
- Scope: ALTER ai_action_queue ADD COLUMN target_entity_type TEXT, target_entity_id UUID, proposed_changes JSONB, confidence FLOAT. ALTER meetings ADD COLUMN signal_status TEXT. ALTER email_messages ADD COLUMN signal_status TEXT. Index auf ai_action_queue(target_entity_type, target_entity_id). Alle Spalten nullable — kein Impact auf bestehende Daten.
- Reason: V4.3 Insight Governance braucht strukturierte Property-Vorschlaege in der Queue (DEC-049) und Signal-Status-Tracking auf Meetings/E-Mails (DEC-050).
- Affected Areas: ai_action_queue (erweitert), meetings (erweitert), email_messages (erweitert). TypeScript-Types in ai-queue.ts.
- Risk: Gering — rein additive ALTERs, nullable Spalten, keine bestehenden Daten betroffen.
- Rollback Notes: ALTER TABLE ai_action_queue DROP COLUMN target_entity_type, DROP COLUMN target_entity_id, DROP COLUMN proposed_changes, DROP COLUMN confidence; ALTER TABLE meetings DROP COLUMN signal_status; ALTER TABLE email_messages DROP COLUMN signal_status;

### MIG-017 — V6 Schema (Produkte, Ziele, KPI-Snapshots)
- Date: 2026-04-20
- Scope: 4 neue Tabellen (products, deal_products, goals, kpi_snapshots) mit Indexes, Unique Constraints (COALESCE-Pattern fuer nullable product_id), RLS-Policies (authenticated_full_access), Grants. Rein additiv — keine bestehenden Tabellen werden geaendert.
- Reason: Datenbasis fuer V6 Produkt-Stammdaten (FEAT-601), Ziel-Tracking (FEAT-602), Performance-Cockpit (FEAT-603) und KPI-History (FEAT-604).
- Affected Areas: Deal-Workspace (Produkt-Zuordnung), neue Performance-Seite, neuer Settings-Bereich, neuer Cron-Job.
- Risk: Gering — rein additiv, keine ALTERs auf bestehende Tabellen.
- Rollback Notes: DROP TABLE kpi_snapshots, goals, deal_products, products CASCADE;

### MIG-018 — V6 Activity KPI Targets
- Date: 2026-04-20
- Scope: 1 neue Tabelle (activity_kpi_targets) mit Unique Index (user_id, kpi_key), RLS, Grants. Speichert definierbare Tages-Sollwerte fuer Aktivitaets-KPIs (Telefonate, Meetings, Deal-Bewegungen, etc.).
- Reason: Basis fuer Activity-based KPI-Tracking — taegliche Disziplin-Messung als Hebel fuer Umsatzziele.
- Affected Areas: Performance-Cockpit (/performance), Ziel-Verwaltung (/performance/goals).
- Risk: Gering — rein additiv, 1 neue Tabelle.
- Rollback Notes: DROP TABLE activity_kpi_targets CASCADE;

### MIG-019 — V5 Automatisierung + Vertriebsintelligenz Schema
- Date: 2026-04-21
- Scope: 5 neue Tabellen (cadences, cadence_steps, cadence_enrollments, cadence_executions, email_tracking_events) mit Indexes, Unique Constraints (COALESCE-Pattern fuer nullable deal_id/contact_id), CHECK Constraint (enrollment_target), RLS-Policies, Grants. 2 Tabellen-Erweiterungen: emails (+tracking_id UUID, +tracking_enabled BOOLEAN), email_messages (+assignment_source TEXT, +ai_match_confidence NUMERIC).
- Reason: Datenbasis fuer V5 Cadences (FEAT-501), E-Mail-Auto-Zuordnung (FEAT-505) und E-Mail-Tracking (FEAT-506).
- Affected Areas: E-Mail-Versand (Tracking), IMAP-Sync (Auto-Zuordnung), neue Cadences-Seite, Export-API.
- Risk: Gering — rein additiv. Neue Tabellen + 4 neue Spalten auf bestehende Tabellen (nullable, kein Breaking Change).
- Rollback Notes: DROP TABLE email_tracking_events, cadence_executions, cadence_enrollments, cadence_steps, cadences CASCADE; ALTER TABLE emails DROP COLUMN tracking_id, DROP COLUMN tracking_enabled; ALTER TABLE email_messages DROP COLUMN assignment_source, DROP COLUMN ai_match_confidence;

### MIG-020 — V5.1 Asterisk Telefonie Schema
- Date: 2026-04-22
- Scope: 1 neue Tabelle (calls) mit 22 Spalten: direction, status, phone_number, caller_id, started_at, connected_at, ended_at, duration_seconds, recording_url, recording_status, transcript, transcript_status, ai_summary (JSONB), summary_status, voice_agent_handled, voice_agent_classification, voice_agent_transcript, asterisk_channel_id, sip_call_id, created_by. 6 Indexes (deal, contact, status, recording, direction). RLS + Grants fuer authenticated + service_role. Supabase Storage Bucket "call-recordings".
- Reason: Datenbasis fuer V5.1 Click-to-Call (FEAT-512), Anruf-Aufnahme-Pipeline (FEAT-513) und SMAO-Voice-Agent-Adapter (FEAT-514). Folgt DEC-021 Pattern (eigene Tabelle fuer reichere Daten, Activity fuer Timeline).
- Affected Areas: Deal-Workspace (Anrufen-Button + Call-Timeline), Cron-Pipeline (call-processing), Webhook (voice-agent), Supabase Storage (neuer Bucket).
- Risk: Gering — rein additiv. Eine neue Tabelle, kein Schema-Change an bestehenden Tabellen.
- Rollback Notes: DROP TABLE calls CASCADE; Supabase Storage Bucket "call-recordings" loeschen.

### MIG-021 — V5.1 Storage Grants + Role Delegation Fix
- Date: 2026-04-24
- Scope: Role membership (GRANT anon/authenticated/service_role TO supabase_storage_admin), USAGE on storage schema fuer service_role/anon/authenticated, CRUD-Grants auf storage-Tabellen, search_path=storage,public fuer alle drei Supabase-Rollen. Entfernt die in MIG-020 angelegten call_recordings_* Policies (waren fehlerhaft und unnoetig, da BYPASSRLS auf service_role greift).
- Reason: Storage-Uploads waren an allen Buckets gebrochen (Meeting + Call). storage-api nutzt set_config('role','service_role',...), was ohne Role-Membership von supabase_storage_admin mit PostgreSQL-Error 42501 fehlschlug — gemeldet als "new row violates row-level security policy". Beim SLC-514 E2E-Test entdeckt (ISSUE-040).
- Affected Areas: Alle Supabase Storage Buckets (meeting-recordings, call-recordings). Call-Recording-Pipeline, Meeting-Recording-Poll, Retention-Cron. Keine Data-Migration, nur Permissions.
- Risk: Gering — idempotent, rein additiv auf Permission-Ebene. DROP POLICY nur auf den fehlerhaften MIG-020-Policies.
- Rollback Notes: Theoretisch REVOKE der Grants + Restore Policies aus MIG-020 — nicht empfohlen, da Pre-Fix-Zustand non-funktional war.

### MIG-022 — V5.2 Compliance-Templates Schema
- Date: 2026-04-25 (applied — SLC-523)
- Scope: 1 neue Tabelle `compliance_templates` mit Spalten: `template_key TEXT PRIMARY KEY` (CHECK in (`'meeting_invitation'`, `'email_footer'`, `'calcom_booking'`)), `body_markdown TEXT NOT NULL` (User-editierter Wert), `default_body_markdown TEXT NOT NULL` (Skill-mitgelieferter Default fuer Reset-Button), `updated_by UUID NULL REFERENCES profiles(id)`, `updated_at TIMESTAMPTZ DEFAULT now()`. RLS-Policy `authenticated_full_access` analog `user_settings`. 3 Default-Rows als INSERT mit ON CONFLICT DO NOTHING (idempotent).
- Reason: V5.2 FEAT-523 (Einwilligungstexte als Templates) braucht persistenten Speicher fuer 3 Template-Bloecke. DEC-083 hat eigene Tabelle (statt user_settings-Erweiterung) festgelegt — saubere Trennung, einfacher Reset-auf-Default, klare Schema-Validierung pro Spalte.
- Affected Areas: Settings-Page `/settings/compliance` (neu), Server Actions `getComplianceTemplate` / `updateComplianceTemplate` (neu in `cockpit/src/app/(app)/settings/compliance/actions.ts`). Keine Aenderung an bestehenden Tabellen.
- Risk: Gering — rein additiv, eine neue Tabelle ohne FK-Beziehungen ausser nullable `updated_by`. Idempotent (IF NOT EXISTS, ON CONFLICT DO NOTHING).
- Rollback Notes: `DROP TABLE compliance_templates CASCADE;`

### MIG-025 — V5.4 SLC-542 Email-Attachments Schema
- Date: 2026-04-28 (applied auf Hetzner via SSH/base64-Pattern, SLC-542 MT-1)
- Scope: 4 Aenderungen in einer Migration `025_v54_email_attachments.sql`:
  1. Storage Bucket `email-attachments` (privat, `public=false`) via `INSERT INTO storage.buckets (id, name, public) VALUES ('email-attachments', 'email-attachments', false) ON CONFLICT DO NOTHING;`
  2. Neue Tabelle `email_attachments` als Junction zwischen `emails` und Storage:
     - `id UUID PK DEFAULT gen_random_uuid()`
     - `email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE`
     - `storage_path TEXT NOT NULL`
     - `filename TEXT NOT NULL`
     - `mime_type TEXT NOT NULL`
     - `size_bytes BIGINT NOT NULL`
     - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  3. Index `idx_email_attachments_email_id` auf `email_attachments(email_id)`.
  4. RLS auf `email_attachments` enable + Policy `authenticated_full_access` (FOR ALL TO authenticated USING (true) WITH CHECK (true)). Service-Role hat BYPASSRLS.
- Reason: V5.4 FEAT-542 (E-Mail-Anhaenge-Upload PC-Direkt) braucht Persistenz fuer hochgeladene Anhaenge und Verknuepfung zur `emails`-Tabelle. DEC-097 (Junction-Table statt JSON-Spalte), DEC-098 (compose_session_id-Path, kein Post-Send-Move) haben die Strategie festgelegt.
- Affected Areas:
  - Neuer Storage-Bucket `email-attachments` auf Self-Hosted Supabase
  - Neue Tabelle `email_attachments` mit Index + RLS
  - Server Actions `uploadEmailAttachment`, `deleteEmailAttachment` (neu in `cockpit/src/app/(app)/emails/compose/attachment-actions.ts`)
  - `cockpit/src/lib/email/send.ts` Erweiterung um optionalen `attachments`-Parameter (additiv, Default leer)
  - `cockpit/src/lib/email/attachments-whitelist.ts` (neu, MIME-Whitelist + Size-Limits)
  - KEINE Aenderung an `emails`, `branding_settings`, `email_templates`.
- Risk: Niedrig — rein additive Aenderungen. FK auf `emails(id)` mit `ON DELETE CASCADE` wirkt erst, wenn Mail-Loeschung implementiert wird (heute nicht der Fall). Storage-Bucket-Anlage ist idempotent. Backwards Compatibility: `sendEmailWithTracking` ohne `attachments`-Parameter (Default leer) ist bit-identisch zu V5.3 (Cadences, Auto-Reply unbeeintraechtigt).
- Rollback Notes:
  - `DROP TABLE email_attachments CASCADE;`
  - `DELETE FROM storage.objects WHERE bucket_id='email-attachments'; DELETE FROM storage.buckets WHERE id='email-attachments';`
  - `send.ts`-Aenderung ist rein additiv (Default `attachments=[]`) — kein Code-Rollback noetig wenn Tabelle weg ist.

### MIG-024 — V5.3 SLC-531 Branding Storage Public-Read + Logo-URL-Reset (Hotfix)
- Date: 2026-04-27 (applied auf Hetzner)
- Scope: 1. SELECT-Policy `branding_public_read` auf `storage.objects` fuer anon+authenticated mit `bucket_id='branding'`. 2. UPDATE `branding_settings.logo_url=NULL WHERE logo_url LIKE 'http://supabase-kong:%'` — alte interne Docker-URLs unbrauchbar.
- Reason: ISSUE-044 — Logo-Anzeige im Browser broken nach SLC-531 Upload. Hosting-Setup proxied `/supabase/...` nicht zu Kong; Strategie-Switch auf Next.js-API-Route `/api/branding/logo`. Storage-Policy bleibt drin als Defense-in-Depth fuer kuenftige Public-Buckets.
- Affected Areas: storage.objects-Policies, branding_settings.logo_url-Werte
- Risk: Niedrig — DROP POLICY IF EXISTS + CREATE POLICY ist idempotent; UPDATE betrifft nur defekte URLs.
- Rollback Notes: `DROP POLICY IF EXISTS "branding_public_read" ON storage.objects;` (UPDATE ist nicht reversibel — User laedt Logo neu hoch)

### MIG-023 — V5.3 Branding + Email-Templates Schema + Systemvorlagen-Seed
- Date: 2026-04-27 (Teil 1 SLC-531 + Teil 2 SLC-532 beide applied auf Hetzner)
- Scope: 3 Aenderungen in einer Migration `023_v53_branding_email_templates.sql`:
  1. Neue Tabelle `branding_settings` (single-row): `id UUID PK`, `logo_url TEXT NULL`, `primary_color TEXT NULL`, `secondary_color TEXT NULL`, `font_family TEXT NULL DEFAULT 'system'`, `footer_markdown TEXT NULL`, `contact_block JSONB NULL`, `updated_by UUID NULL REFERENCES profiles(id)`, `updated_at TIMESTAMPTZ DEFAULT now()`. RLS `authenticated_full_access`. Initiale Empty-Row via INSERT ON CONFLICT DO NOTHING (single-row enforcement an App-Level).
  2. Erweiterung `email_templates` um 4 nullable Spalten: `is_system BOOLEAN DEFAULT false`, `category TEXT NULL`, `language TEXT NULL DEFAULT 'de'`, `layout JSONB NULL`. 2 Indizes: `idx_email_templates_is_system`, `idx_email_templates_category`.
  3. Storage Bucket `branding` (Public-Read, Authenticated-Write) via `INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true) ON CONFLICT DO NOTHING;` plus passende `storage.objects`-RLS-Policies.
  4. Seed-INSERT fuer 6 DE-Systemvorlagen + 1-2 EN/NL via INSERT ON CONFLICT DO NOTHING (`is_system=true`, `category` gesetzt, `language` gesetzt). Konkrete Body-Texte werden in der Migration ausformuliert.
- Reason: V5.3 FEAT-531 (Branding-Settings + zentrale Mail-Layout-Engine) braucht typisierte Branding-Spalten und Storage fuer Logo. FEAT-533 (Systemvorlagen + KI-Vorlagen-Generator) braucht Schema-Erweiterung auf `email_templates` fuer Filter `is_system`/`category` und Sprache. DEC-088 (eigene Tabelle), DEC-089 (Storage Bucket), DEC-090 (`layout` als nullable JSONB), DEC-091 (SQL-Seed) haben die Strategie festgelegt.
- Affected Areas:
  - Settings-Page `/settings/branding` (neu), Server Actions `getBranding`/`updateBranding`/`uploadLogo` (neu in `cockpit/src/app/(app)/settings/branding/actions.ts`).
  - `cockpit/src/lib/email/render.ts` (neu, pure Function `renderBrandedHtml`).
  - `cockpit/src/lib/email/send.ts` Renderer-Hook (additiv: Branding-Pfad neben `textToHtml`-Fallback).
  - `cockpit/src/app/(app)/settings/template-actions.ts` Erweiterung (Filter `is_system`/`category`, neue Action `duplicateSystemTemplate`).
  - Composing-Studio Route `/emails/compose` (neu, FEAT-532).
  - KEINE Aenderung an `emails`, `contacts`, `deals`, `companies`, `cadences`, `compliance_templates`.
- Risk: Niedrig — rein additive Aenderungen. `branding_settings` ist neue Tabelle ohne FK-Constraints (ausser nullable `updated_by`). `email_templates`-Erweiterung ist nullable mit Defaults — Backwards Compatibility fuer alle bestehenden Rows. Storage Bucket ist additiv. Seed-INSERTs sind idempotent (ON CONFLICT DO NOTHING). Backwards Compatibility-Test: bestehende Mails ohne Branding gehen weiterhin via `textToHtml`-Fallback raus (Bit-fuer-Bit identisch zum heutigen Output).
- Rollback Notes:
  - `DROP TABLE branding_settings CASCADE;`
  - `ALTER TABLE email_templates DROP COLUMN IF EXISTS is_system, DROP COLUMN IF EXISTS category, DROP COLUMN IF EXISTS language, DROP COLUMN IF EXISTS layout;`
  - `DELETE FROM storage.objects WHERE bucket_id='branding'; DELETE FROM storage.buckets WHERE id='branding';`
  - `DELETE FROM email_templates WHERE is_system=true;` (nur falls Spalte noch existiert)
  - Seed-INSERTs sind via Title-Prefix `System: ...` identifizierbar — falls Spalte `is_system` schon dropped, alternativ via Title-Filter.

### MIG-026 — V5.5 Angebot-Erstellung Schema
- Date: 2026-04-29 — applied auf Hetzner Business-System (Container `supabase-db-k9f5pn5upfq7etoefb5ukbcg-075438771312`) als Teil von SLC-551 (`/backend`). Erstapply + Idempotenz-Smoke (zweiter Run) sauber durchgelaufen.
- Scope: 4 Aenderungen in einer Migration `026_v55_proposal_creation.sql`:
  1. Erweiterung `proposals` um 11 nullable Spalten:
     - `subtotal_net NUMERIC(12,2)` — berechnete Netto-Summe
     - `tax_rate NUMERIC(5,2) NOT NULL DEFAULT 19.00` — Steuersatz Snapshot
     - `tax_amount NUMERIC(12,2)` — berechnete Steuersumme
     - `total_gross NUMERIC(12,2)` — berechnete Brutto-Summe
     - `valid_until DATE` — Gueltigkeitszeitraum
     - `payment_terms TEXT` — Zahlungsfrist (Free-Text)
     - `parent_proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL` — Versionierung (DEC-109)
     - `accepted_at TIMESTAMPTZ`
     - `rejected_at TIMESTAMPTZ`
     - `expired_at TIMESTAMPTZ`
     - `pdf_storage_path TEXT` — Pfad in `proposal-pdfs`-Bucket (DEC-111)
     - 3 Indizes: `idx_proposals_parent`, `idx_proposals_valid_until`, `idx_proposals_status_active` (partial: WHERE status IN ('draft','sent'))
  2. Neue Tabelle `proposal_items` (DEC-107):
     - `id UUID PK DEFAULT gen_random_uuid()`
     - `proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE`
     - `product_id UUID REFERENCES products(id) ON DELETE SET NULL` — Snapshot bleibt auch wenn Produkt geloescht
     - `position_order INT NOT NULL` — fuer Drag-and-Drop-Sortierung
     - `quantity NUMERIC(10,2) NOT NULL DEFAULT 1`
     - `unit_price_net NUMERIC(12,2) NOT NULL` — effektiver Angebotspreis
     - `discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0`
     - `snapshot_name TEXT NOT NULL` — Produkt-Name beim Angebot
     - `snapshot_description TEXT`
     - `snapshot_unit_price_at_creation NUMERIC(12,2)` — Audit-Snapshot Listenpreis (DEC-107)
     - `created_at TIMESTAMPTZ DEFAULT now()`
     - 2 Indizes: `idx_proposal_items_proposal`, `idx_proposal_items_product` (partial: WHERE product_id IS NOT NULL)
     - RLS `authenticated_full_access` analog `deal_products`
  3. Erweiterung `email_attachments` um 2 Spalten (FEAT-555 / DEC-108):
     - `source_type TEXT NOT NULL DEFAULT 'upload'` — Werte: `upload`, `proposal`
     - `proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL`
     - 1 Partial-Index: `idx_email_attachments_proposal` WHERE `proposal_id IS NOT NULL`
     - CHECK-Constraint: `(source_type='upload' AND proposal_id IS NULL) OR (source_type='proposal' AND proposal_id IS NOT NULL)` — Daten-Konsistenz
  4. Storage-Bucket `proposal-pdfs` (DEC-111):
     - `INSERT INTO storage.buckets (id, name, public) VALUES ('proposal-pdfs', 'proposal-pdfs', false) ON CONFLICT DO NOTHING;`
     - RLS-Policies auf `storage.objects`:
       - SELECT/INSERT/UPDATE/DELETE fuer authenticated mit Pfad-Scope `(auth.uid())::text = (storage.foldername(name))[1]`
- Reason: V5.5 FEAT-551 (Schema-Erweiterung), FEAT-554 (Versionierung), FEAT-555 (Composing-Studio-Hookup) brauchen alle in einer Migration definiertes Schema. DEC-105..114 haben die Strategie festgelegt. Bestehende V2-Stub-Daten bleiben unveraendert lesbar (alle neuen Spalten nullable mit Defaults). FK auf `products` mit `ON DELETE SET NULL` schuetzt Snapshot-Wahrheit (DEC-107). FK auf `parent_proposal_id` mit `ON DELETE SET NULL` schuetzt Versions-Audit (DEC-109).
- Affected Areas:
  - `cockpit/src/app/(app)/proposals/actions.ts` (massive Erweiterung — neue Server Actions: `addProposalItem`, `updateProposalItem`, `removeProposalItem`, `reorderProposalItems`, `transitionProposalStatus`, `createProposalVersion`, `generateProposalPdf`, `getProposalsForDeal` etc.)
  - Neue Komponenten unter `cockpit/src/app/(app)/proposals/[id]/edit/*` (FEAT-552 Workspace)
  - Neuer Adapter `cockpit/src/lib/pdf/proposal-renderer.ts` (FEAT-553)
  - Neuer Cron-Endpoint `cockpit/src/app/api/cron/expire-proposals/route.ts` (FEAT-554, DEC-110)
  - `cockpit/src/lib/email/send.ts` Erweiterung um Source-Type=Proposal-Pfad (FEAT-555)
  - `cockpit/src/components/email/attachments-section.tsx` Erweiterung um Proposal-Picker (FEAT-555)
  - KEINE Aenderung an `products`, `deal_products`, `companies`, `contacts`, `deals`, `audit_log` (existing Schema reicht), `branding_settings` (existing Renderer reicht)
- Risk: Niedrig — rein additive Aenderungen. `proposals`-Erweiterung: alle Spalten nullable mit Defaults, bestehende Stub-Rows haben `subtotal_net=NULL`, `total_gross=NULL` (legitim, V2-Stubs hatten nie Berechnung). `proposal_items` ist neue Tabelle ohne Konflikte. `email_attachments`-Erweiterung: `source_type DEFAULT 'upload'` fuer alle existing V5.4-Rows — automatisch konsistent, CHECK-Constraint passt da `proposal_id` per Default NULL ist. Storage-Bucket ist additiv. Tax-Rate Default 19% (DE-Standard) ist Geschaeftsregel — bei Internationalisierung in V6+ pro-Tenant-Default.
- Rollback Notes:
  - `DROP TABLE proposal_items CASCADE;`
  - `ALTER TABLE proposals DROP COLUMN IF EXISTS subtotal_net, DROP COLUMN IF EXISTS tax_rate, DROP COLUMN IF EXISTS tax_amount, DROP COLUMN IF EXISTS total_gross, DROP COLUMN IF EXISTS valid_until, DROP COLUMN IF EXISTS payment_terms, DROP COLUMN IF EXISTS parent_proposal_id, DROP COLUMN IF EXISTS accepted_at, DROP COLUMN IF EXISTS rejected_at, DROP COLUMN IF EXISTS expired_at, DROP COLUMN IF EXISTS pdf_storage_path;`
  - `ALTER TABLE email_attachments DROP CONSTRAINT IF EXISTS email_attachments_source_type_check, DROP COLUMN IF EXISTS source_type, DROP COLUMN IF EXISTS proposal_id;`
  - `DELETE FROM storage.objects WHERE bucket_id='proposal-pdfs'; DELETE FROM storage.buckets WHERE id='proposal-pdfs';`
  - V2-Stub-Proposals bleiben nach Rollback unveraendert lesbar — bestehende `/proposals`-Tabelle funktioniert wieder im V5.4-Zustand.

### MIG-028 — V5.7 NL+DE-VAT + Reverse-Charge Schema
- Date: 2026-05-04 (applied auf Hetzner Business System DB im Rahmen SLC-571 `/backend` MT-1, Container `supabase-db-k9f5pn5upfq7etoefb5ukbcg-074821936116`, base64-Pattern, idempotent re-applied verifiziert)
- Scope: 5 additive Aenderungen in einer Migration `028_v57_nl_de_vat_reverse_charge.sql`:
  1. `branding_settings.vat_id TEXT NULL` (DEC-124) — Strategaize-eigene Steuernummer (USt-IdNr. oder BTW-Nummer, Format kontextabhaengig validiert ueber `business_country`).
  2. `branding_settings.business_country TEXT NOT NULL DEFAULT 'NL'` (DEC-128, supersedes DEC-122) — globaler Country-Switch der Installation. CHECK-Constraint `branding_settings_business_country_whitelist` prueft `IN ('DE', 'NL')`. Bestehende Branding-Row bekommt automatisch `'NL'` durch DEFAULT.
  3. `companies.vat_id TEXT NULL` (DEC-124) — Empfaenger-VAT-ID (EU-General Format-Validation).
  4. `proposals.tax_rate` CHECK-Whitelist erweitert auf `{0.00, 7.00, 9.00, 19.00, 21.00}` (DEC-128, supersedes DEC-122):
     - `ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_tax_rate_whitelist;`
     - `ALTER TABLE proposals ADD CONSTRAINT proposals_tax_rate_whitelist CHECK (tax_rate IN (0.00, 7.00, 9.00, 19.00, 21.00));`
     - Whitelist deckt NL-Saetze {0, 9, 21} und DE-Saetze {0, 7, 19} ab. Pre-Apply-Audit zeigte Live-DB-Bestand aus `tax_rate IN {7, 19}` — beide Werte bleiben in der neuen Whitelist gueltig (Snapshot-Prinzip DEC-107). Default `proposals.tax_rate=19.00` bleibt unveraendert; App-Layer setzt initial den Country-spezifischen Default beim Anlegen neuer Angebote.
  5. `proposals.reverse_charge BOOLEAN NOT NULL DEFAULT false` + Konsistenz-CHECK (DEC-123):
     - `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS reverse_charge BOOLEAN NOT NULL DEFAULT false;`
     - `ALTER TABLE proposals ADD CONSTRAINT proposals_reverse_charge_consistency CHECK (reverse_charge = false OR tax_rate = 0.00);`
     - Konsistenzschutz: wenn Flag gesetzt, MUSS tax_rate=0.00 sein.
- Reason: V5.7 FEAT-571 braucht NL+DE-konforme Steuerlogik fuer den Angebot-Pfad. Pre-Apply-Audit am 2026-05-04 zeigte zusaetzlich zu erwarteten `tax_rate=19.00`-Rows auch zwei `tax_rate=7.00`-Rows in der Live-DB (Test-Daten waehrend V5.5-QA). User-Klaerung 2026-05-04 erweiterte den Scope: globaler `business_country`-Switch in den Einstellungen ("Grund-Einstellung"), Whitelist deckt DE+NL Saetze ab. DEC-122 + DEC-124 wurden entsprechend supersedet/erweitert; DEC-128 dokumentiert die finale Strategie. KEIN VIES-Lookup, KEINE Daten-Migration der Legacy-Rows.
- Affected Areas:
  - Neue Datei `cockpit/src/lib/validation/vat-id.ts` mit `validateNlVatId`, `validateDeVatId`, `validateEuVatId` + `EU_COUNTRY_CODES`-Constant
  - Neue Datei `cockpit/src/lib/validation/vat-id.test.ts` mit 30 Vitest-Cases (alle gruen)
  - `cockpit/src/types/branding.ts` ergaenzt `vatId`, `businessCountry`, `BUSINESS_COUNTRIES`-Constant
  - `cockpit/src/app/(app)/settings/branding/actions.ts` getBranding/updateBranding um vat_id + business_country erweitert, kontextabhaengige vat_id-Validation
  - `cockpit/src/app/(app)/settings/branding/branding-form.tsx` Country-Dropdown + vat_id-Feld mit inline-Validation
  - `cockpit/src/app/(app)/companies/actions.ts` createCompany/updateCompany um vat_id + EU-Validation
  - `cockpit/src/app/(app)/companies/company-form.tsx` vat_id-Feld nach `address_country` mit inline-Validation
  - `cockpit/src/lib/email/render.test.ts` Mock-Branding-Objekte um neue Felder ergaenzt (TS-Build-Fix)
  - KEINE Aenderung an `proposal_items`, `proposal_payment_milestones`, `payment_terms_templates`, `email_attachments`, `audit_log`, `proposal-pdfs`-Bucket
  - Editor-UI (Dropdown-Filter) und PDF-Renderer-Erweiterung folgen in MT-5..MT-9 (gleicher Slice)
- Risk: Niedrig — rein additive Aenderungen, alle ALTER-Statements sind Metadata-Changes ohne Daten-Touch. Idempotenz verifiziert via Re-Apply (alle Spalten/Constraints vorhanden, NOTICE statt ERROR). Pre-Apply-Audit + erweiterte Whitelist verhindern, dass Legacy 7%-Rows bei Apply abgewiesen werden.
- Rollback Notes:
  - `ALTER TABLE companies DROP COLUMN IF EXISTS vat_id;`
  - `ALTER TABLE branding_settings DROP COLUMN IF EXISTS vat_id;`
  - `ALTER TABLE branding_settings DROP CONSTRAINT IF EXISTS branding_settings_business_country_whitelist; ALTER TABLE branding_settings DROP COLUMN IF EXISTS business_country;`
  - `ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_reverse_charge_consistency; ALTER TABLE proposals DROP COLUMN IF EXISTS reverse_charge;`
  - `ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_tax_rate_whitelist;`
  - V5.6-Code funktioniert nach Rollback unveraendert weiter — bestehende Angebote sind regression-frei. Bestehende V5.7-Angebote mit `reverse_charge=true` koennen nach Rollback nicht mehr korrekt gerendert werden — manueller Fix oder Re-Migration noetig.

### MIG-027 — V5.6 Zahlungsbedingungen + Pre-Call Briefing Schema
- Date: 2026-05-01 (applied auf Hetzner Business System DB im Rahmen SLC-561 `/backend`. Hinweis: Spec hatte `meetings.start_time` referenziert — echte Spalte ist `scheduled_at`, im Migration-File korrigiert.)
- Scope: 5 Aenderungen in einer Migration `027_v56_payment_terms_and_briefing.sql`:
  1. Neue Tabelle `payment_terms_templates` (DEC-115/DEC-121, Sub-Theme A):
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `label TEXT NOT NULL` — z.B. "30 Tage netto", "Vorkasse"
     - `body TEXT NOT NULL` — der vorgefuellte Freitext fuer `proposals.payment_terms`
     - `is_default BOOLEAN NOT NULL DEFAULT false` — UNIQUE partial index sichert max 1 Default
     - `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
     - 1 Index: `CREATE UNIQUE INDEX idx_payment_terms_templates_default ON payment_terms_templates(is_default) WHERE is_default = true;`
     - RLS `authenticated_full_access` (Single-User-Modus, V7-Multi-User-Erweiterung folgt)
     - Seed: `INSERT INTO payment_terms_templates (label, body, is_default) VALUES ('30 Tage netto', 'Zahlbar innerhalb von 30 Tagen netto.', true) ON CONFLICT DO NOTHING;` — Branding-Default-Migration
  2. Neue Tabelle `proposal_payment_milestones` (DEC-115, Sub-Theme B):
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE`
     - `sequence INT NOT NULL` — fuer Reihenfolge-Sortierung im PDF
     - `percent NUMERIC(5,2) NOT NULL CHECK (percent > 0 AND percent <= 100)` — einzelner Milestone-Anteil
     - `amount NUMERIC(12,2)` — berechneter Betrag (= proposals.total_gross * percent/100), Snapshot beim Save
     - `due_trigger TEXT NOT NULL CHECK (due_trigger IN ('on_signature', 'on_completion', 'days_after_signature', 'on_milestone'))`
     - `due_offset_days INT` — nur fuer `due_trigger='days_after_signature'`, sonst NULL
     - `label TEXT` — User-Freitext fuer Milestone-Beschreibung (z.B. "Anzahlung", "Nach Kickoff")
     - `created_at TIMESTAMPTZ DEFAULT now()`
     - 1 Index: `idx_proposal_payment_milestones_proposal` auf `proposal_id`
     - 1 UNIQUE: `(proposal_id, sequence)` — verhindert Sequence-Duplikate
     - RLS `authenticated_full_access` analog `proposal_items`
     - **Sum-Validation strict 100%**: NICHT als DB-CHECK-Constraint (kann nicht ueber Aggregat definiert werden ohne Trigger), sondern App-Level in `saveProposalPaymentMilestones` Server Action (DEC-115)
  3. Erweiterung `proposals` um 2 nullable Spalten (DEC-116, Sub-Theme C):
     - `skonto_percent NUMERIC(4,2) NULL CHECK (skonto_percent IS NULL OR (skonto_percent > 0 AND skonto_percent < 10))` — typisch 1-3%
     - `skonto_days INTEGER NULL CHECK (skonto_days IS NULL OR (skonto_days > 0 AND skonto_days <= 90))`
     - 1 zusaetzlicher CHECK auf Beide-oder-keiner: `(skonto_percent IS NULL AND skonto_days IS NULL) OR (skonto_percent IS NOT NULL AND skonto_days IS NOT NULL)` — verhindert halben State
  4. Erweiterung `meetings` um 1 nullable Spalte (DEC-118):
     - `briefing_generated_at TIMESTAMPTZ NULL` — Idempotenz-Marker fuer Briefing-Cron
     - 1 Partial-Index: `CREATE INDEX idx_meetings_briefing_pending ON meetings(start_time) WHERE briefing_generated_at IS NULL AND deal_id IS NOT NULL;` — Cron-Query-Performance
  5. Erweiterung `user_settings` um 3 Spalten (DEC-117):
     - `briefing_trigger_minutes INT NOT NULL DEFAULT 30 CHECK (briefing_trigger_minutes IN (15, 30, 45, 60))`
     - `briefing_push_enabled BOOLEAN NOT NULL DEFAULT true`
     - `briefing_email_enabled BOOLEAN NOT NULL DEFAULT true`
     - Backfill fuer existierende Rows: `UPDATE user_settings SET briefing_trigger_minutes=30, briefing_push_enabled=true, briefing_email_enabled=true WHERE briefing_trigger_minutes IS NULL;` (idempotent dank DEFAULT — bestehende Rows haben bereits Default-Werte nach Schema-Apply, das Backfill ist Defense-in-Depth)
- Reason: V5.6 FEAT-561 (Vorauswahl + Split-Plan + Skonto) und FEAT-562 (Pre-Call Briefing Cron) brauchen das gemeinsame Schema in einer Migration. DEC-115..121 haben die Strategie festgelegt. Bestehende V5.5-Proposal-Daten bleiben unveraendert lesbar (alle neuen Spalten nullable). Bestehende `meetings`-Rows bekommen `briefing_generated_at=NULL` als Default — Cron-Query findet sie nicht (Partial-Index filtert NULL). Bestehende `user_settings`-Rows bekommen Default-Werte fuer Briefing-Felder. KEIN Auto-Migration von V5.5-`proposals.payment_terms` Freitext-Werten in das neue Template-System (Constraint laut PRD V5.6 Constraints).
- Affected Areas:
  - Neue Settings-Page `/settings/payment-terms` (SLC-561) mit Server Actions `listPaymentTermsTemplates`, `createPaymentTermsTemplate`, `updatePaymentTermsTemplate`, `deletePaymentTermsTemplate`, `setDefaultPaymentTermsTemplate`
  - Neue Settings-Page `/settings/briefing` (SLC-564) mit Server Actions `getBriefingSettings`, `updateBriefingSettings`
  - `cockpit/src/app/(app)/proposals/[id]/edit/*` — Editor-Erweiterung um Bedingungs-Dropdown + Skonto-Toggle (SLC-562) und Split-Plan-Section (SLC-563)
  - `cockpit/src/lib/pdf/proposal-renderer.ts` Adapter-Erweiterung (DEC-120, SLC-563)
  - Neuer Cron-Endpoint `cockpit/src/app/api/cron/meeting-briefing/route.ts` (SLC-564, DEC-118 Pattern aus `expire-proposals/route.ts`)
  - Neue Server Action `saveProposalPaymentMilestones(proposalId, milestones[])` mit Sum-Validation strict 100% (DEC-115, SLC-563)
  - Wiederverwendung `cockpit/src/lib/ai/prompts/deal-briefing.ts` (existierende `buildDealBriefingPrompt` + `validateDealBriefing` aus FEAT-301) — keine LLM-Adapter-Aenderung
  - KEINE Aenderung an `activities` (V3 `source_type`/`source_id`-Pattern reicht), `proposals.payment_terms` (Freitext bleibt), `email_attachments`, `proposal_items`, `audit_log`, `proposal-pdfs`-Bucket, `branding_settings`
- Risk: Niedrig — rein additive Aenderungen. Alle neuen Spalten auf bestehenden Tabellen sind nullable mit Defaults oder NOT NULL DEFAULT (DB-Apply ohne Lock-Wait, Postgres-Standard fuer simple DEFAULT-Werte). `payment_terms_templates`-Seed ist idempotent (`ON CONFLICT DO NOTHING`). UNIQUE-Index auf `is_default` true sichert Daten-Integritaet (max 1 Default-Template). CHECK-Constraints auf `skonto_percent`/`skonto_days` sind konservativ und blockieren ungueltige Inputs am DB-Level. Cron-Partial-Index `idx_meetings_briefing_pending` filtert auf `deal_id IS NOT NULL` — Meetings ohne Deal werden ignoriert (PRD-Constraint). Backwards-Compatibility: bestehende `proposals` ohne Skonto/Milestones rendern bit-identisch zu V5.5-PDF-Output (DEC-120). bestehende `meetings` ohne `briefing_generated_at` werden vom Cron NICHT retroaktiv verarbeitet (Partial-Index + Time-Window-Filter beruecksichtigen nur Meetings im naechsten Trigger-Fenster).
- Rollback Notes:
  - `DROP TABLE proposal_payment_milestones CASCADE;`
  - `DROP TABLE payment_terms_templates CASCADE;`
  - `ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_skonto_check, DROP COLUMN IF EXISTS skonto_percent, DROP COLUMN IF EXISTS skonto_days;`
  - `ALTER TABLE meetings DROP COLUMN IF EXISTS briefing_generated_at;` (Partial-Index droppt automatisch)
  - `ALTER TABLE user_settings DROP COLUMN IF EXISTS briefing_trigger_minutes, DROP COLUMN IF EXISTS briefing_push_enabled, DROP COLUMN IF EXISTS briefing_email_enabled;`
  - V5.5-Proposals bleiben nach Rollback unveraendert nutzbar — bestehende `/proposals`-Pipeline + PDF-Render funktioniert wieder im V5.5-Zustand. Briefing-Activities (Type `briefing`) bleiben in `activities`-Tabelle bestehen — User kann diese behalten oder mit `DELETE FROM activities WHERE type='briefing'` manuell entfernen (nicht zwingend, da Type-String unbeachtet von alten UIs).

### MIG-033 — V7 Multi-User Schema (Phase A)
- Date: 2026-05-12
- Scope: Strukturschicht fuer Multi-User-Modell. Drei Aenderungstypen:
  1. Neue Tabelle `teams`:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `name TEXT NOT NULL`
     - `created_at TIMESTAMPTZ DEFAULT now()`
     - 1 UNIQUE: `(name)`
     - RLS `authenticated_select_all` (alle Eingeloggten duerfen Team-Liste sehen — Verwaltungs-UI braucht das)
  2. Erweiterung `profiles`:
     - `ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','teamlead','member'));` — V7-Enum-Strict (DEC-181)
     - `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;` — nullable bis MIG-034-Backfill
     - 1 Index: `CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON profiles(team_id);`
     - Hinweis: `profiles.team TEXT` (V3 MIG-005) bleibt deprecated, wird NICHT in MIG-033 gedroppt — physisches Drop ist V7.x-Cleanup-Migration nach Code-Migration abgeschlossen
  3. Erweiterung 8 Kerntabellen mit `owner_user_id` (DEC-182):
     - `companies`, `contacts`, `deals`, `activities`, `meetings`, `proposals`, `email_messages`, `calls`
     - Pro Tabelle: `ALTER TABLE <name> ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;` — nullable in MIG-033
     - Pro Tabelle: `CREATE INDEX IF NOT EXISTS idx_<name>_owner_user_id ON <name>(owner_user_id);`
  4. Erweiterung `audit_log` um Drilldown-Audit-Spalte:
     - `ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS view_as_target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;`
     - 1 Partial-Index: `CREATE INDEX IF NOT EXISTS idx_audit_log_view_as ON audit_log(view_as_target_user_id) WHERE view_as_target_user_id IS NOT NULL;`
- Reason: V7 Multi-User-Foundation FEAT-502 braucht ownership-tracking auf Kerntabellen + Team-Modell. Drei-Phasen-Migration (Schema vor Backfill vor RLS-Switch) erlaubt Backout bei jedem Schritt: nach Phase A laeuft Code im V6.6-Verhalten weiter (Spalten unbenutzt, alte RLS aktiv).
- Affected Areas: profiles, teams, companies, contacts, deals, activities, meetings, proposals, email_messages, calls, audit_log
- Risk: Niedrig — rein additive Aenderungen, keine Daten-Aenderung. CHECK-Constraint auf profiles.role darf nicht failen, weil V3 Bestand alle auf 'admin'. Sicherheits-Smoke vor Apply: `SELECT DISTINCT role FROM profiles;` muss Subset von {admin, teamlead, member} liefern (V6.6: nur 'admin').
- Rollback Notes:
  - `ALTER TABLE audit_log DROP COLUMN IF EXISTS view_as_target_user_id;`
  - Pro Kerntabelle: `ALTER TABLE <name> DROP COLUMN IF EXISTS owner_user_id;`
  - `ALTER TABLE profiles DROP COLUMN IF EXISTS team_id;`
  - `ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;`
  - `DROP TABLE IF EXISTS teams CASCADE;`
  - V6.6-Verhalten vollstaendig wiederhergestellt; bestehende Datensaetze unveraendert.

### MIG-034 — V7 Multi-User Backfill (Phase B)
- Date: 2026-05-12
- Scope: Daten-Migration fuer Multi-User-Foundation. Vier Operationen:
  1. Default-Team anlegen:
     - `INSERT INTO teams (name) VALUES ('Strategaize') ON CONFLICT (name) DO NOTHING;`
  2. Profiles auf Default-Team mappen:
     - `UPDATE profiles SET team_id = (SELECT id FROM teams WHERE name='Strategaize') WHERE team_id IS NULL;`
     - Falls bestehende `team TEXT`-Werte existieren: `INSERT INTO teams (name) SELECT DISTINCT team FROM profiles WHERE team IS NOT NULL AND team != '' ON CONFLICT DO NOTHING;` plus Mapping-UPDATE
  3. owner_user_id-Backfill auf 8 Kerntabellen:
     - Pro Tabelle: `UPDATE <name> SET owner_user_id = (SELECT id FROM profiles WHERE role='admin' ORDER BY id LIMIT 1) WHERE owner_user_id IS NULL;`
     - System-Records (Cron-Inserts ohne User-Context) bleiben bewusst NULL — Admin sieht sie ueber RLS-NULL-Policy in MIG-035
  4. Verifikations-Audit-Eintrag:
     - `INSERT INTO audit_log (event, user_id, payload) VALUES ('v7_backfill_complete', (SELECT id FROM profiles WHERE role='admin' LIMIT 1), jsonb_build_object('companies', (SELECT COUNT(*) FROM companies WHERE owner_user_id IS NOT NULL), 'contacts', (SELECT COUNT(*) FROM contacts WHERE owner_user_id IS NOT NULL), ...));`
- Reason: V7 Multi-User-Foundation FEAT-502 braucht 100% Backfill, sonst werden Bestandsdaten nach RLS-Switch in MIG-035 unsichtbar fuer Teamlead/Member. Default-User = Admin Immo ist gerechtfertigt, weil V6.6-Daten ausschliesslich von Immo erzeugt wurden.
- Affected Areas: teams (Insert), profiles (Update), companies/contacts/deals/activities/meetings/proposals/email_messages/calls (Update aller bestehenden Zeilen), audit_log (1 Verifikations-Eintrag)
- Risk: Mittel — Backfill auf 8 Kerntabellen aendert alle bestehenden Zeilen. Idempotenz: WHERE owner_user_id IS NULL filtert wiederholte Apply. Verifikations-Query nach Apply: `SELECT 'companies', COUNT(*) FROM companies WHERE owner_user_id IS NULL UNION ALL SELECT 'contacts', ... UNION ALL ...` MUSS Counts gleich 0 fuer User-erzeugte Records liefern (System-Records mit NULL akzeptiert).
- Rollback Notes:
  - Pro Kerntabelle: `UPDATE <name> SET owner_user_id = NULL WHERE owner_user_id IS NOT NULL;`
  - `UPDATE profiles SET team_id = NULL WHERE team_id IS NOT NULL;`
  - `DELETE FROM teams WHERE name='Strategaize';`
  - Vorsicht: nach Rollback haben Bestandsdaten KEINEN Owner mehr. Re-Apply MIG-034 als Recovery-Pfad.

### MIG-035 — V7 Multi-User RLS Switch (Phase C)
- Date: 2026-05-12
- Scope: RLS-Aktivierung mit owner-aware Policies. Drei Schritte:
  1. Helper-SQL-Functions (DEC-183):
     - `CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$ SELECT role = 'admin' FROM profiles WHERE id = auth.uid(); $$;`
     - `CREATE OR REPLACE FUNCTION is_teamlead() RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$ SELECT role = 'teamlead' FROM profiles WHERE id = auth.uid(); $$;`
     - `CREATE OR REPLACE FUNCTION get_my_team_id() RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$ SELECT team_id FROM profiles WHERE id = auth.uid(); $$;`
     - `CREATE OR REPLACE FUNCTION can_see_owner(target_owner UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$ SELECT is_admin() OR target_owner = auth.uid() OR (is_teamlead() AND EXISTS (SELECT 1 FROM profiles WHERE id = target_owner AND team_id = get_my_team_id())); $$;`
     - GRANT EXECUTE auf alle vier Functions an `authenticated`
  2. Pro Kerntabelle (8x) alte Policies droppen + 4 neue setzen:
     - `DROP POLICY IF EXISTS authenticated_full_access ON <name>;`
     - `CREATE POLICY <name>_select ON <name> FOR SELECT USING (can_see_owner(owner_user_id) OR (is_admin() AND owner_user_id IS NULL));`
     - `CREATE POLICY <name>_insert ON <name> FOR INSERT WITH CHECK (owner_user_id = auth.uid() OR is_admin() OR (is_teamlead() AND can_see_owner(owner_user_id)));`
     - `CREATE POLICY <name>_update ON <name> FOR UPDATE USING (can_see_owner(owner_user_id)) WITH CHECK (can_see_owner(owner_user_id));`
     - `CREATE POLICY <name>_delete ON <name> FOR DELETE USING (owner_user_id = auth.uid() OR is_admin() OR (is_teamlead() AND can_see_owner(owner_user_id)));`
  3. profiles + teams Policies:
     - profiles: SELECT (alle Team-Members sehen einander), UPDATE (Admin nur), DELETE (Admin nur)
     - teams: SELECT (alle Eingeloggten), INSERT/UPDATE/DELETE (Admin nur)
  4. owner_user_id NOT NULL Constraint (jetzt sicher, weil MIG-034 Backfill gelaufen ist):
     - Pro Kerntabelle: `ALTER TABLE <name> ALTER COLUMN owner_user_id SET NOT NULL;` — ABER nicht setzen falls System-Records (NULL) bewusst erlaubt sind. ENTSCHEIDUNG: NULL bleibt erlaubt fuer System-Records (Cron-Inserts ohne User-Context, siehe DEC-182). NOT NULL wird NICHT gesetzt.
- Reason: V7 Multi-User-Foundation FEAT-502 verlangt hardware-Daten-Isolation per RLS. Helper-Functions zentralisieren Logik. SECURITY DEFINER erlaubt is_admin/is_teamlead etc. auf profiles zu lesen, ohne dass User direkte SELECT-Policy auf profiles haben muss (Permission-Decoupling). STABLE markiert Postgres-Cache-Faehigkeit pro Statement.
- Affected Areas: 8 Kerntabellen (RLS-Policies), profiles + teams (RLS-Policies), 4 neue SQL-Functions, audit_log.view_as_target_user_id (Index)
- Risk: Hoch — RLS-Switch ist Verhalten-aendernd. Nach Apply sind alte Frontend-Queries die NICHT als RLS-aware-User laufen (z.B. Cron-Jobs ohne SET LOCAL ROLE) gebrochen. Pre-Apply-Smoke: `SELECT * FROM deals LIMIT 1;` als Admin-Session MUSS Daten zurueck-geben. Post-Apply-Smoke: gleiche Query mit RLS aktiv MUSS Daten zurueckgeben fuer Admin, KEINE Daten fuer ungueltige Session, Member-Scoped Daten fuer Member-Session. PgBench-Smoke fuer Helper-Function-Performance (10k SELECTs sequentially) MUSS unter 5s bleiben.
- Rollback Notes:
  - Pro Kerntabelle 4 Policies: `DROP POLICY IF EXISTS <name>_select ON <name>;` etc.
  - Pro Kerntabelle: `CREATE POLICY authenticated_full_access ON <name> FOR ALL USING (auth.role() = 'authenticated');` (V6.6-Zustand)
  - profiles + teams Policies reverten auf authenticated_full_access
  - `DROP FUNCTION IF EXISTS is_admin(), is_teamlead(), get_my_team_id(), can_see_owner(UUID);`
  - audit_log.view_as_target_user_id-Spalte bleibt (additive aus MIG-033, gehoert nicht zu RLS-Switch)
  - Nach Rollback: V6.6-Verhalten aktiv, Multi-User-Daten-Isolation aufgehoben, alle Eingeloggten sehen alles wieder. Code-Pfade die assertRole/assertNotReadOnlyContext nutzen werfen evtl. trotzdem 403 — dafuer braucht es zusaetzlichen Code-Revert (assertRole wird Permissive in V6.6).

### V7 Migration Cookbook (SLC-701)
- Date: 2026-05-12
- Scope: Schritt-fuer-Schritt-Apply + Backout-Recovery fuer MIG-033/034/035 auf Hetzner-Coolify-DB (Container `supabase-db-k9f5pn5upfq7etoefb5ukbcg-151720499060`, Netz `k9f5pn5upfq7etoefb5ukbcg_business-net`). Folgt der Regel `feedback_sql_on_hetzner.md` (base64 → /tmp → `psql -U postgres`).

#### Apply-Sequenz (Phase A → B → C)

```bash
# 0) Pre-Apply: Schema-Snapshot als Backup-Punkt
ssh root@91.98.20.191 'docker exec supabase-db-k9f5pn5upfq7etoefb5ukbcg-151720499060 pg_dump -U postgres -s postgres > /tmp/pre_mig_033_schema.sql'

# 1) Phase A — Schema
BASE64=$(base64 -w 0 sql/migrations/033_v7_schema.sql)
ssh root@91.98.20.191 "echo '$BASE64' | base64 -d > /tmp/033.sql && docker exec -i supabase-db-k9f5pn5upfq7etoefb5ukbcg-151720499060 psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/033.sql"

# 1a) Verifikation Phase A
ssh root@91.98.20.191 "docker exec supabase-db-k9f5pn5upfq7etoefb5ukbcg-151720499060 psql -U postgres -d postgres -c \"\\d teams\" && \
  docker exec supabase-db-k9f5pn5upfq7etoefb5ukbcg-151720499060 psql -U postgres -d postgres -c \"SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND column_name='owner_user_id';\""
# Erwartet: teams existiert, owner_user_id-Spalten-Count = 8.

# 2) Phase B — Backfill (nur nach Phase-A-Verifikation)
BASE64=$(base64 -w 0 sql/migrations/034_v7_backfill.sql)
ssh root@91.98.20.191 "echo '$BASE64' | base64 -d > /tmp/034.sql && docker exec -i supabase-db-k9f5pn5upfq7etoefb5ukbcg-151720499060 psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/034.sql"

# 2a) Verifikation Phase B: 0 NULL-Owner ueber 8 Kerntabellen
ssh root@91.98.20.191 "docker exec supabase-db-k9f5pn5upfq7etoefb5ukbcg-151720499060 psql -U postgres -d postgres -c \"
  SELECT 'companies' AS t, COUNT(*) FROM companies WHERE owner_user_id IS NULL
  UNION ALL SELECT 'contacts', COUNT(*) FROM contacts WHERE owner_user_id IS NULL
  UNION ALL SELECT 'deals', COUNT(*) FROM deals WHERE owner_user_id IS NULL
  UNION ALL SELECT 'activities', COUNT(*) FROM activities WHERE owner_user_id IS NULL
  UNION ALL SELECT 'meetings', COUNT(*) FROM meetings WHERE owner_user_id IS NULL
  UNION ALL SELECT 'proposals', COUNT(*) FROM proposals WHERE owner_user_id IS NULL
  UNION ALL SELECT 'email_messages', COUNT(*) FROM email_messages WHERE owner_user_id IS NULL
  UNION ALL SELECT 'calls', COUNT(*) FROM calls WHERE owner_user_id IS NULL;\""
# Erwartet: 8 Zeilen, alle count = 0.

# 3) Phase C — RLS-Switch (nur nach Phase-B-Verifikation)
BASE64=$(base64 -w 0 sql/migrations/035_v7_rls_switch.sql)
ssh root@91.98.20.191 "echo '$BASE64' | base64 -d > /tmp/035.sql && docker exec -i supabase-db-k9f5pn5upfq7etoefb5ukbcg-151720499060 psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/035.sql"

# 3a) Verifikation Phase C: 4 Helper-Functions + 32 Policies aktiv
ssh root@91.98.20.191 "docker exec supabase-db-k9f5pn5upfq7etoefb5ukbcg-151720499060 psql -U postgres -d postgres -c \"
  SELECT proname, prosecdef FROM pg_proc
   WHERE proname IN ('is_admin','is_teamlead','get_my_team_id','can_see_owner');\""
# Erwartet: 4 Zeilen, prosecdef = t (SECURITY DEFINER) fuer alle 4.
```

#### Backout-Cookbook (MT-8 verifiziert)

Phase A — Schema (vollstaendig reversibel):

```sql
-- Im Postgres-Container ausfuehren:
ALTER TABLE audit_log DROP COLUMN IF EXISTS view_as_target_user_id;
ALTER TABLE companies      DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE contacts       DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE deals          DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE activities     DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE meetings       DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE proposals      DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE email_messages DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE calls          DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS team_id;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
DROP TABLE IF EXISTS teams CASCADE;
```

Re-Apply: einfach MIG-033 erneut anwenden (idempotent durch IF NOT EXISTS).

Phase B — Backfill (Daten-Recovery, NICHT echter Rollback):

```sql
-- Achtung: setzt Daten zurueck, danach sind Records ohne Owner. Re-Apply MIG-034 als Pflicht.
UPDATE companies      SET owner_user_id = NULL;
UPDATE contacts       SET owner_user_id = NULL;
UPDATE deals          SET owner_user_id = NULL;
UPDATE activities     SET owner_user_id = NULL;
UPDATE meetings       SET owner_user_id = NULL;
UPDATE proposals      SET owner_user_id = NULL;
UPDATE email_messages SET owner_user_id = NULL;
UPDATE calls          SET owner_user_id = NULL;
UPDATE profiles SET team_id = NULL;
DELETE FROM teams WHERE name = 'Strategaize';
```

Phase C — RLS-Switch (vollstaendig reversibel auf V6.6-Verhalten):

```sql
DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN SELECT unnest(ARRAY[
    'companies','contacts','deals','activities',
    'meetings','proposals','email_messages','calls'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', v_table, v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', v_table, v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', v_table, v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON %I', v_table, v_table);
    EXECUTE format('CREATE POLICY authenticated_full_access ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', v_table);
  END LOOP;
END$$;

DROP POLICY IF EXISTS profiles_select_team   ON profiles;
DROP POLICY IF EXISTS profiles_admin_insert  ON profiles;
DROP POLICY IF EXISTS profiles_admin_update  ON profiles;
DROP POLICY IF EXISTS profiles_admin_delete  ON profiles;
CREATE POLICY authenticated_full_access ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS teams_select_all   ON teams;
DROP POLICY IF EXISTS teams_admin_insert ON teams;
DROP POLICY IF EXISTS teams_admin_update ON teams;
DROP POLICY IF EXISTS teams_admin_delete ON teams;

DROP FUNCTION IF EXISTS can_see_owner(UUID);
DROP FUNCTION IF EXISTS get_my_team_id();
DROP FUNCTION IF EXISTS is_teamlead();
DROP FUNCTION IF EXISTS is_admin();
```

- Reason: Mindest-Reversibilitaet pro Phase. Phase A reversibel (Schema), Phase B Daten-Recovery (kein True-Rollback), Phase C reversibel auf V6.6.
- Affected Areas: dokumentiert; keine Schema-Aenderungen durch dieses Cookbook.
- Risk: Niedrig — Cookbook ist Doku, nicht ausfuehrbar.
- Rollback Notes: dieses Cookbook IST das Rollback.
