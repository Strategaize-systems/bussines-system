-- V6.5 SLC-657 MT-3 — Source-zu-Campaign Bulk-UPDATE (DEC-159 / DEC-160 / MIG-031).
--
-- Idempotent. Nicht-destruktiv. Backup-Felder bleiben erhalten (DEC-160).
--
-- Status (2026-05-08): READY-WHEN-NEEDED. Pre-Audit zeigte 0 Legacy-Daten,
-- daher hat dieses Skript bei Apply 0 Rows-Updated und ist No-Op. Ablauf
-- bleibt fuer spaetere Daten-Bestaende dokumentiert.
--
-- Apply-Anweisung:
--   1. Mapping-File pflegen: sql/migrations/031_v65_source_to_campaign_mapping.json
--   2. Pre-Audit erneut ausfuehren: 031_v65_pre_audit.sql
--   3. Apply mit Mapping als psql-Variable:
--      MAPPING=$(cat sql/migrations/031_v65_source_to_campaign_mapping.json)
--      docker exec -i <db-container> psql -U postgres -d postgres \
--        -v mapping_json="'$MAPPING'" < /tmp/031_v65_bulk_update.sql
--      (Alternativ: Apply in psql-Shell mit `\set mapping_json '<JSON>'`)
--
-- Verification:
--   - Erster Run: N Rows updated; audit_log enthaelt 1 source_migration_v65-Eintrag
--   - Re-Run: 0 Rows updated (Idempotenz via campaign_id IS NULL Filter)

\echo '=== Source-to-Campaign Bulk-UPDATE — Start ==='

BEGIN;

-- contacts: UPDATE wo campaign_id IS NULL UND es ein Mapping-Eintrag gibt.
WITH mapping AS (
  SELECT
    m.entity,
    m.source_value,
    m.source_detail_value,
    m.campaign_id::uuid AS campaign_id
  FROM jsonb_to_recordset(:'mapping_json'::jsonb) AS m(
    entity              TEXT,
    source_value        TEXT,
    source_detail_value TEXT,
    campaign_id         TEXT
  )
  WHERE m.campaign_id IS NOT NULL
),
contacts_updated AS (
  UPDATE contacts c
  SET    campaign_id = m.campaign_id
  FROM   mapping m
  WHERE  m.entity = 'contact'
    AND  c.campaign_id IS NULL
    AND  c.source IS NOT DISTINCT FROM m.source_value
    AND  c.source_detail IS NOT DISTINCT FROM m.source_detail_value
  RETURNING c.id
),
companies_updated AS (
  UPDATE companies co
  SET    campaign_id = m.campaign_id
  FROM   mapping m
  WHERE  m.entity = 'company'
    AND  co.campaign_id IS NULL
    AND  co.source_type IS NOT DISTINCT FROM m.source_value
    AND  co.source_detail IS NOT DISTINCT FROM m.source_detail_value
  RETURNING co.id
),
stats AS (
  SELECT
    (SELECT COUNT(*) FROM contacts_updated)  AS contacts_updated,
    (SELECT COUNT(*) FROM companies_updated) AS companies_updated,
    (SELECT COUNT(*) FROM mapping)           AS mapping_entries
)
INSERT INTO audit_log (
  action,
  entity_type,
  entity_id,
  changes,
  created_at
)
SELECT
  'source_migration_v65',
  'migration',
  gen_random_uuid(),
  jsonb_build_object(
    'migration',         'MIG-031',
    'slice',             'SLC-657',
    'contacts_updated',  s.contacts_updated,
    'companies_updated', s.companies_updated,
    'mapping_entries',   s.mapping_entries,
    'applied_at',        NOW()
  ),
  NOW()
FROM stats s
WHERE s.contacts_updated > 0 OR s.companies_updated > 0;

\echo '=== Bulk-UPDATE applied (audit_log-Eintrag nur wenn Rows updated) ==='

COMMIT;

\echo '=== Source-to-Campaign Bulk-UPDATE — Done ==='

-- Post-Apply-Verifikation:
\echo ''
\echo '=== Migration-Status Post-Apply ==='
SELECT
  'contacts'                         AS table_name,
  COUNT(*)                           AS total_rows,
  COUNT(campaign_id)                 AS with_campaign,
  COUNT(*) - COUNT(campaign_id)      AS without_campaign,
  COUNT(source) FILTER (WHERE source IS NOT NULL) AS with_legacy_source
FROM contacts
UNION ALL
SELECT
  'companies'                        AS table_name,
  COUNT(*)                           AS total_rows,
  COUNT(campaign_id)                 AS with_campaign,
  COUNT(*) - COUNT(campaign_id)      AS without_campaign,
  COUNT(source_type) FILTER (WHERE source_type IS NOT NULL) AS with_legacy_source
FROM companies;

\echo ''
\echo '=== Letzte source_migration_v65-Eintraege ==='
SELECT created_at, changes
FROM audit_log
WHERE action = 'source_migration_v65'
ORDER BY created_at DESC
LIMIT 5;
