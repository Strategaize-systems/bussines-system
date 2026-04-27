-- =====================================================
-- MIG-023 — V5.3 Branding + Email-Templates Schema + Systemvorlagen-Seed
-- =====================================================
-- Diese Migration ist in zwei Teile gegliedert:
--   Teil 1 (SLC-531, dieser File): branding_settings + Storage Bucket "branding"
--   Teil 2 (SLC-532, ergaenzt diesen File): email_templates-Erweiterung + Seed
--
-- Beide Teile sind idempotent (IF NOT EXISTS, ON CONFLICT DO NOTHING) und koennen
-- nacheinander oder zusammen ausgefuehrt werden.
--
-- DEC-088 Branding-Settings als eigene Tabelle (single-row)
-- DEC-089 Logo-Storage via Supabase Storage Bucket "branding"
-- DEC-095 Branding-Renderer als Single-Source-of-Truth fuer HTML-Output

-- =====================================================
-- Teil 1 — SLC-531 Branding Foundation
-- =====================================================

-- 1. branding_settings (single-row, DEC-088)
-- =====================================================
-- Single-row enforcement an App-Level (Server-Action UPSERT auf erste Row).
-- Multi-Branding-Erweiterung in V7+ via additivem ALTER TABLE (z.B. tenant_id).

CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT NULL,
  primary_color TEXT NULL,
  secondary_color TEXT NULL,
  font_family TEXT NULL DEFAULT 'system',
  footer_markdown TEXT NULL,
  contact_block JSONB NULL,
  updated_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS + Policies + Grants
-- =====================================================

ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'branding_settings' AND policyname = 'authenticated_full_access'
  ) THEN
    CREATE POLICY "authenticated_full_access" ON branding_settings
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON branding_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON branding_settings TO service_role;

-- 3. Initiale Empty-Row (single-row enforcement an App-Level)
-- =====================================================
-- Idempotent: WHERE NOT EXISTS verhindert zweite Row bei Re-Run.

INSERT INTO branding_settings (logo_url, primary_color, secondary_color, font_family, footer_markdown, contact_block)
SELECT NULL, NULL, NULL, 'system', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM branding_settings);

-- 4. Storage Bucket "branding" (DEC-089)
-- =====================================================
-- Public-Read: Logo-URL muss in versendeten Mails ohne Auth ladbar sein.
-- Authenticated-Write geht ohnehin nur ueber Server Actions mit service_role
-- (BYPASSRLS). Keine eigenen storage.objects-Policies (siehe MIG-021 +
-- meeting-recordings/call-recordings Pattern).
--
-- Limits: 2 MB pro Datei, MIME-Type-Check zusaetzlich an App-Level (Server Action).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  2097152,  -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Teil 2 — SLC-532 Email-Templates Schema + Systemvorlagen-Seed
-- =====================================================
-- DEC-090 layout JSONB nullable ohne Schema (Future-Proofing V7+ Block-Builder)
-- DEC-091 Systemvorlagen via SQL-Seed-INSERT mit ON CONFLICT DO NOTHING

-- 5. email_templates Schema-Erweiterung (additiv, idempotent)
-- =====================================================
-- AC1: bestehende Rows behalten alle Werte; neue Spalten haben Defaults
-- (is_system=false via DEFAULT, language='de' via DEFAULT, category=NULL, layout=NULL).

ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS category TEXT NULL;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'de';
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS layout JSONB NULL;

-- Indizes fuer Filter-Queries (system vs. own, by category)
CREATE INDEX IF NOT EXISTS idx_email_templates_is_system ON email_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);

-- 6. Seed: 6 DE-Systemvorlagen + 1 EN + 1 NL
-- =====================================================
-- Idempotenz: ON CONFLICT DO NOTHING via stabilem title-Match.
-- Wir verwenden einen partial-unique-index als Conflict-Target damit
-- ON CONFLICT (title) bei wiederholtem Lauf kein Insert-Duplikat erzeugt.
-- Diese Constraint gilt nur fuer Systemvorlagen (is_system=true) und stoert
-- User-Templates nicht.

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_system_title_unique
  ON email_templates(title)
  WHERE is_system = true;

-- DE: Erstansprache Multiplikator
INSERT INTO email_templates (title, is_system, category, language, subject_de, body_de, placeholders)
VALUES (
  'Erstansprache Multiplikator (DE)',
  true,
  'erstansprache',
  'de',
  'Kurzer Austausch zu {{firma}} und unserem Co-Innovations-Ansatz?',
  $$Hallo {{vorname}},

ich melde mich kurz, weil mir {{firma}} im Kontext unserer Arbeit mit {{position}}-naher Wertschoepfung aufgefallen ist.

Wir arbeiten bei Strategaize aktuell an einem Co-Innovations-Format mit Multiplikatoren wie Ihnen — kein Verkaufsgespraech, sondern ein Austausch ueber gemeinsame Hebel.

Haetten Sie in den naechsten zwei Wochen 20 Minuten fuer ein erstes Kennenlernen?

Viele Gruesse$$,
  '["{{vorname}}", "{{nachname}}", "{{firma}}", "{{position}}"]'::jsonb
)
ON CONFLICT (title) WHERE is_system = true DO NOTHING;

-- DE: Erstansprache Lead
INSERT INTO email_templates (title, is_system, category, language, subject_de, body_de, placeholders)
VALUES (
  'Erstansprache Lead (DE)',
  true,
  'erstansprache',
  'de',
  '{{firma}}: kurzer Austausch zu {{deal}}?',
  $$Hallo {{vorname}},

ich habe gesehen, dass {{firma}} im Bereich, in dem wir aktuell mit aehnlichen Unternehmen arbeiten, aktiv ist. Daher der direkte Weg.

Wir helfen Teams wie Ihrem dabei, ihre {{deal}}-bezogenen Prozesse messbar zu vereinfachen — ohne Tool-Wildwuchs und ohne Berater-Pingpong.

Hat es Sinn, dass wir 20 Minuten dazu sprechen? Ich schicke Ihnen gerne zwei konkrete Terminvorschlaege.

Viele Gruesse$$,
  '["{{vorname}}", "{{nachname}}", "{{firma}}", "{{deal}}"]'::jsonb
)
ON CONFLICT (title) WHERE is_system = true DO NOTHING;

-- DE: Follow-up Erstgespraech
INSERT INTO email_templates (title, is_system, category, language, subject_de, body_de, placeholders)
VALUES (
  'Follow-up nach Erstgespraech (DE)',
  true,
  'follow-up',
  'de',
  'Kurzer Nachfass zu unserem Gespraech zu {{deal}}',
  $$Hallo {{vorname}},

danke fuer den Austausch heute zu {{deal}}. Ich nehme aus dem Gespraech mit:

- die aktuelle Situation bei {{firma}} ist klarer geworden
- die zwei naechsten Schritte sind besprochen
- ich melde mich wie verabredet bis Ende der Woche

Falls Ihnen in der Zwischenzeit noch Fragen einfallen, einfach hier antworten.

Viele Gruesse$$,
  '["{{vorname}}", "{{nachname}}", "{{firma}}", "{{deal}}"]'::jsonb
)
ON CONFLICT (title) WHERE is_system = true DO NOTHING;

-- DE: Follow-up Angebot
INSERT INTO email_templates (title, is_system, category, language, subject_de, body_de, placeholders)
VALUES (
  'Follow-up Angebot (DE)',
  true,
  'angebot',
  'de',
  'Kurzer Stand zu unserem Angebot fuer {{firma}}',
  $$Hallo {{vorname}},

ich wollte kurz nachhoeren, ob unser Angebot zu {{deal}} bei Ihnen schon zur internen Abstimmung kommt — oder ob es noch Punkte gibt, die ich klarer machen kann.

Wenn es hilft, gehen wir die offenen Punkte gemeinsam in 15 Minuten am Telefon durch — schneller und konkreter als per Mail-Pingpong.

Viele Gruesse$$,
  '["{{vorname}}", "{{nachname}}", "{{firma}}", "{{deal}}"]'::jsonb
)
ON CONFLICT (title) WHERE is_system = true DO NOTHING;

-- DE: Danke nach Termin
INSERT INTO email_templates (title, is_system, category, language, subject_de, body_de, placeholders)
VALUES (
  'Danke nach Termin (DE)',
  true,
  'danke',
  'de',
  'Danke fuer den Termin — und der naechste Schritt',
  $$Hallo {{vorname}},

danke fuer Ihre Zeit heute. Aus meiner Sicht haben wir drei Punkte konkret gemacht:

1. das Ziel fuer {{deal}} ist klar
2. die naechsten Schritte sind verabredet
3. wir sehen uns wieder am vereinbarten Termin

Falls etwas davon nicht so bei Ihnen angekommen ist, kurz hier antworten — dann gleichen wir das ab, bevor wir weitermachen.

Viele Gruesse$$,
  '["{{vorname}}", "{{nachname}}", "{{firma}}", "{{deal}}"]'::jsonb
)
ON CONFLICT (title) WHERE is_system = true DO NOTHING;

-- DE: Re-Aktivierung kalter Lead
INSERT INTO email_templates (title, is_system, category, language, subject_de, body_de, placeholders)
VALUES (
  'Re-Aktivierung kalter Lead (DE)',
  true,
  'reaktivierung',
  'de',
  'Kurz auf den Schirm: {{firma}} und {{deal}}',
  $$Hallo {{vorname}},

unser letzter Austausch zu {{deal}} liegt eine Weile zurueck — daher ohne Erwartung, sondern als ehrlicher Pingback.

Bei {{firma}} hat sich seitdem vermutlich einiges veraendert. Bei uns ebenfalls: das Thema, das wir damals besprochen hatten, ist heute klarer und einfacher umsetzbar als noch vor einigen Monaten.

Falls es jetzt wieder relevant ist, melden Sie sich gerne. Falls nicht, ist auch das eine klare Antwort.

Viele Gruesse$$,
  '["{{vorname}}", "{{nachname}}", "{{firma}}", "{{deal}}"]'::jsonb
)
ON CONFLICT (title) WHERE is_system = true DO NOTHING;

-- EN: Cold Outreach
INSERT INTO email_templates (title, is_system, category, language, subject_en, body_en, placeholders)
VALUES (
  'Cold Outreach (EN)',
  true,
  'erstansprache',
  'en',
  'Quick note re {{firma}} and {{deal}}',
  $$Hi {{vorname}},

I noticed {{firma}} works in an area where we have been helping similar teams cut tool sprawl and shorten {{deal}} cycles, so I wanted to reach out directly.

If a 20-minute conversation could be useful, I am happy to share two concrete time slots. If the timing is off, just say so and I will not chase.

Best regards$$,
  '["{{vorname}}", "{{nachname}}", "{{firma}}", "{{deal}}"]'::jsonb
)
ON CONFLICT (title) WHERE is_system = true DO NOTHING;

-- NL: Eerste contact
INSERT INTO email_templates (title, is_system, category, language, subject_nl, body_nl, placeholders)
VALUES (
  'Eerste contact (NL)',
  true,
  'erstansprache',
  'nl',
  'Korte vraag over {{firma}} en {{deal}}',
  $$Hallo {{vorname}},

ik zag dat {{firma}} actief is in een domein waar wij momenteel met vergelijkbare teams werken aan {{deal}}-trajecten — daarom een directe mail.

Heeft het zin om er 20 minuten over te spreken? Ik stuur graag twee concrete tijdstippen. Als het nu niet past, hoor ik dat ook graag — geen achtervolging.

Met vriendelijke groet$$,
  '["{{vorname}}", "{{nachname}}", "{{firma}}", "{{deal}}"]'::jsonb
)
ON CONFLICT (title) WHERE is_system = true DO NOTHING;

-- =====================================================
-- Verifikations-Queries (manuell, nach Deploy)
-- =====================================================
-- \d branding_settings
-- SELECT count(*) FROM branding_settings;                            -- erwartet: 1
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'branding';
-- SELECT polname FROM pg_policies WHERE tablename = 'branding_settings';
-- \d email_templates                                                 -- erwartet: 4 neue Spalten + 2 neue Indizes
-- SELECT count(*) FROM email_templates WHERE is_system = true;       -- erwartet: >= 6
-- SELECT language, count(*) FROM email_templates WHERE is_system = true GROUP BY language;
--                                                                     -- erwartet: de >= 6, en >= 1, nl >= 1
