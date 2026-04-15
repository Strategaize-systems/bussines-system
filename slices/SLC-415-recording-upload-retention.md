# SLC-415 — Recording-Upload-Cron + Retention-Cron

## Slice Info
- Feature: FEAT-404
- Priority: High
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-349 (Retention), BL-201 (Teil)

## Goal
Automatisches Weitertragen von Jibri-Aufzeichnungen in Supabase Storage und zeitgesteuerte Loeschung nach `RECORDING_RETENTION_DAYS` (Default 30, DEC-043). Kein Transkript/Summary hier — das loest SLC-416 aus. Am Ende dieses Slice liegen MP4s persistent in Supabase Storage (EU), `meetings.recording_url` und `recording_duration_seconds` sind gesetzt, Retention-Cron laeuft taeglich.

## Scope
- Supabase Storage Bucket `meeting-recordings` anlegen + RLS/Access-Policies (nur Service-Role)
- `POST /api/cron/meeting-recording-poll` (alle 2 Min, CRON_SECRET)
- `POST /api/cron/recording-retention` (taeglich 04:00 UTC, CRON_SECRET)
- Shared-Volume-Scan-Logik: Liest `/recordings/*.mp4`, matcht `jitsi_room_name` aus `meetings`
- ffprobe fuer `recording_duration_seconds`
- Upload via Supabase-Storage-Client, Pfad `{meeting_id}/{filename}.mp4`
- Nach erfolgreichem Upload: lokale Datei loeschen, `meetings.recording_url` + `recording_status='completed'` + `recording_duration_seconds` gesetzt
- Retention-Cron: Query `meetings WHERE recording_started_at < now() - N days AND recording_status IN ('completed','failed')` → Supabase Storage Remove + `recording_status='deleted'`
- ENV-Variablen: `RECORDING_RETENTION_DAYS=30`, `SUPABASE_STORAGE_RECORDINGS_BUCKET=meeting-recordings`
- Coolify Cron-Job-Konfiguration (2-Min-Intervall + taeglich 04:00)
- Audit-Log-Eintraege: `recording_completed`, `recording_retention_deleted`

## Out of Scope
- Jibri-Retry bei Chrome-Crash (ist Jibri-interne Restart-Policy)
- Transkription-Trigger (SLC-416 liest `meetings.recording_status='completed'`)
- Failed-Recording-UI (SLC-416)
- Video-Playback-UI im Deal-Workspace (Stretch in SLC-416)

## Micro-Tasks

### MT-1: Supabase-Storage-Bucket
- Goal: Bucket `meeting-recordings` anlegen, Service-Role-only Access
- Files: `cockpit/sql/11b_storage_bucket.sql` (oder Supabase Studio UI-Snippet dokumentiert)
- Expected behavior: Bucket privat, nur Service-Role kann lesen/schreiben
- Verification: `supabase storage ls meeting-recordings` mit Service-Role klappt, mit Anon-Key nicht
- Dependencies: none

### MT-2: Storage-Client-Helper
- Goal: Wrapper `/lib/storage/recordings.ts` mit `uploadRecording`, `removeRecording`
- Files: `cockpit/src/lib/storage/recordings.ts`
- Expected behavior: Nutzt Service-Role-Client (server-side only), fehlerrobust
- Verification: Unit-Test mit Mock-Storage-Client
- Dependencies: MT-1

### MT-3: Upload-Cron Route
- Goal: `POST /api/cron/meeting-recording-poll` scannt `/recordings/*.mp4`, matcht Meetings, uploaded, updated DB
- Files: `cockpit/src/app/api/cron/meeting-recording-poll/route.ts`
- Expected behavior: Idempotent (schon hochgeladene Dateien werden nicht nochmal verarbeitet), CRON_SECRET-Schutz
- Verification: Datei manuell in Shared Volume ablegen → Cron-Call per curl → Supabase Storage zeigt Datei
- Dependencies: MT-2

### MT-4: ffprobe-Integration
- Goal: Duration aus MP4 ermitteln via `fluent-ffmpeg.ffprobe`
- Files: `cockpit/src/lib/meetings/ffprobe.ts`
- Expected behavior: Liefert `durationSeconds` auf volle Sekunden
- Verification: Test mit Sample-MP4
- Dependencies: MT-3 (nutzt es)

### MT-5: Retention-Cron Route
- Goal: `POST /api/cron/recording-retention` loescht abgelaufene Recordings
- Files: `cockpit/src/app/api/cron/recording-retention/route.ts`
- Expected behavior: Query + Delete + DB-Update + Audit-Log; idempotent; CRON_SECRET-Schutz
- Verification: Test-Meeting mit altem `recording_started_at` anlegen → Cron-Call → Storage leer + `recording_status='deleted'`
- Dependencies: MT-2

### MT-6: Coolify Cron-Jobs konfigurieren
- Goal: 2 Cron-Jobs in Coolify anlegen (Container `app`, node -e fetch() per feedback_coolify_cron_node)
- Files: `docs/ARCHITECTURE.md` (Cron-Tabelle aktualisieren)
- Expected behavior: Coolify ruft Endpoints periodisch mit CRON_SECRET
- Verification: Coolify-Log zeigt erfolgreichen Cron-Lauf; DB-Tabelle zeigt Activity
- Dependencies: MT-3, MT-5

### MT-7: Volume-Monitoring-Hinweis
- Goal: Log-Warnung wenn `/recordings` groesser als Schwellwert (z.B. 5 GB)
- Files: In Cron-Route inline
- Expected behavior: Stats-Log bei jedem Lauf, Warn-Log bei Ueberschreitung
- Verification: Manuell mit grossem File testen
- Dependencies: MT-3

## Acceptance Criteria
1. Supabase Bucket `meeting-recordings` existiert, privat, nur Service-Role-Zugriff
2. Cron-Lauf uploadet neue MP4s aus `/recordings/` nach Supabase, Pfad `{meeting_id}/...mp4`
3. `meetings.recording_url`, `recording_status='completed'`, `recording_duration_seconds` korrekt gesetzt
4. Lokale Datei nach erfolgreichem Upload geloescht (Volume wird nicht voll)
5. Retention-Cron loescht Recordings >30d, setzt `recording_status='deleted'`, Transkript + Summary bleiben
6. Idempotenz: Cron-Doppellauf erzeugt keinen Duplicate-Upload, keine doppelte Loeschung
7. Audit-Log-Eintraege bei Completed + Retention-Deleted
8. CRON_SECRET-Schutz aktiv, Ohne Header HTTP 401
9. Volume-Warn-Log bei >5 GB

## Dependencies
- SLC-412 (Jitsi-Jibri muss Aufzeichnungen produzieren)
- SLC-411 (MIG-011 fuer Recording-Felder in meetings)

## QA Focus
- **Idempotenz:** Upload + Retention duerfen ohne Schaden mehrfach laufen
- **Security:** Bucket nicht public, CRON_SECRET aktiv
- **Dateigroesse:** Upload von >100MB MP4s funktioniert (Timeout + Chunking)
- **Retention-Grenzen:** Nur `completed` und `failed` Recordings loeschen, nicht `recording`/`uploading`/`pending`
- **Audit-Log:** Jeder Upload + jede Loeschung geloggt
- **Error-Handling:** Supabase-API-Fehler → Status bleibt `completed`-Versuch, Retry nicht abgebrochen

## Geschaetzter Aufwand
1.5 Tage (Cron + Storage + Testing)
