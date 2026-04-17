-- V4.1 SLC-415: Create meeting-recordings storage bucket
-- Private bucket, service-role only (cron jobs access via adminClient)
-- No RLS policies needed — service_role has BYPASSRLS

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-recordings',
  'meeting-recordings',
  false,
  524288000,  -- 500 MB max file size
  ARRAY['video/mp4']
)
ON CONFLICT (id) DO NOTHING;
