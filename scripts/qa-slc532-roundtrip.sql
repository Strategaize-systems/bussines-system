BEGIN;

\echo === 1. SELECT source ===
SELECT id, title, is_system, language, category FROM email_templates WHERE title='Erstansprache Multiplikator (DE)' AND is_system=true;

\echo === 2. INSERT (analog duplicateSystemTemplate) ===
INSERT INTO email_templates (
  title, subject_de, subject_nl, subject_en, body_de, body_nl, body_en,
  placeholders, is_system, category, language
)
SELECT
  title || ' (Kopie)',
  subject_de, subject_nl, subject_en, body_de, body_nl, body_en,
  COALESCE(placeholders, '[]'::jsonb), false, category, COALESCE(language, 'de')
FROM email_templates
WHERE title='Erstansprache Multiplikator (DE)' AND is_system=true
RETURNING id, title, is_system, language, category;

\echo === 3. Verify Filter own findet die Kopie ===
SELECT id, title, is_system FROM email_templates WHERE is_system=false ORDER BY created_at DESC LIMIT 3;

\echo === 4. Rollback ===
ROLLBACK;

\echo === 5. Nach Rollback leer? ===
SELECT count(*) AS leftover_kopie FROM email_templates WHERE title LIKE '%Kopie%';
