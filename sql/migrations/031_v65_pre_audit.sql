-- V6.5 SLC-657 MT-1 — Pre-Migration-Audit (DEC-159).
--
-- Purpose: Liste alle distinct source-Werte mit Counts pro contacts + companies,
-- damit der User die Mapping-JSON-Datei
-- (sql/migrations/031_v65_source_to_campaign_mapping.json) sauber pflegen kann.
--
-- Read-only. Macht keine Aenderungen. Sicher mehrfach ausfuehrbar.
--
-- Apply: `docker exec -i <db-container> psql -U postgres -d postgres < /tmp/031_v65_pre_audit.sql`

\echo '=== contacts.source / contacts.source_detail (campaign_id IS NULL) ==='
SELECT
  'contact'        AS entity,
  source           AS source_value,
  source_detail    AS source_detail_value,
  COUNT(*)         AS row_count
FROM contacts
WHERE campaign_id IS NULL
  AND (source IS NOT NULL OR source_detail IS NOT NULL)
GROUP BY source, source_detail
ORDER BY row_count DESC, source NULLS LAST, source_detail NULLS LAST;

\echo ''
\echo '=== companies.source_type / companies.source_detail (campaign_id IS NULL) ==='
SELECT
  'company'        AS entity,
  source_type      AS source_value,
  source_detail    AS source_detail_value,
  COUNT(*)         AS row_count
FROM companies
WHERE campaign_id IS NULL
  AND (source_type IS NOT NULL OR source_detail IS NOT NULL)
GROUP BY source_type, source_detail
ORDER BY row_count DESC, source_type NULLS LAST, source_detail NULLS LAST;

\echo ''
\echo '=== Vorhandene Kampagnen (id, name) — fuer Mapping-Referenz ==='
SELECT id, name, status
FROM campaigns
ORDER BY created_at DESC;

\echo ''
\echo '=== Migration-Status Pre-Apply (Verifikation: campaign_id-Coverage vs. Legacy-Source) ==='
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
