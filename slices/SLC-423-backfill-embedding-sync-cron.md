# SLC-423 — Backfill + Embedding-Sync-Cron

## Slice Info
- Feature: FEAT-401 (Wissensbasis Cross-Source)
- Priority: High
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-355

## Goal
Alle bestehenden Daten (Meetings, E-Mails, Activities, Dokumente) einmalig embedden und einen Cron-Job einrichten, der verpasste oder fehlgeschlagene Embeddings nachholt. Nach diesem Slice sind echte Vektoren in der DB vorhanden, was die Query-Entwicklung (SLC-424) mit realen Daten ermoeglicht.

## Scope
- `/api/knowledge/backfill` — Admin-Endpoint fuer einmaligen Bestandsimport
- Backfill-Logik in `/lib/knowledge/backfill.ts`: Iteriert Meetings (transcript IS NOT NULL), email_messages (body_text IS NOT NULL), activities (body IS NOT NULL), documents. Idempotent durch Unique Constraint (source_type, source_id, chunk_index).
- Progress-Reporting: Response mit Zaehler pro Quelltyp (processed, skipped, failed)
- `/api/cron/embedding-sync` — Cron-Endpoint (alle 15 Min): Sucht knowledge_chunks mit status='pending' oder 'failed', Retry-Logik (max 3 Versuche via metadata.retry_count), re-embedded und setzt auf 'active'
- Cron-Job in Coolify registrieren: `node -e "fetch('http://localhost:3000/api/cron/embedding-sync', {method:'POST', headers:{'x-cron-secret':'...'}})"` alle 15 Min
- Rate-Limiting: Backfill verarbeitet Chunks sequentiell mit kurzen Pausen (50ms zwischen Embedding-Calls), um Bedrock nicht zu ueberlasten

## Out of Scope
- Auto-Embedding bei neuen Daten (SLC-426)
- Query-API (SLC-424)
- UI (SLC-425)
- Titan V2 Deutsch-Qualitaets-Evaluierung (passiert in SLC-424 QA mit echten Queries)

## Micro-Tasks

### MT-1: Backfill-Logik
- Goal: Zentrale Backfill-Funktion die alle Quelltypen iteriert und indexiert
- Files: `cockpit/src/lib/knowledge/backfill.ts`
- Expected behavior: `runBackfill()` — (1) Meetings mit transcript IS NOT NULL laden, fuer jedes `indexMeeting(id)` aufrufen, (2) email_messages mit body_text IS NOT NULL, (3) activities mit body IS NOT NULL, (4) documents. Skip wenn bereits Chunks fuer diese source_id existieren (Idempotenz). Zaehler pro Quelltyp: processed, skipped (bereits vorhanden), failed. Sequentiell mit 50ms Pause zwischen Embedding-Calls.
- Verification: Manueller Aufruf mit Teilmenge der Daten, Zaehler korrekt
- Dependencies: SLC-422 (Indexer)

### MT-2: Backfill API-Endpoint
- Goal: Admin-geschuetzter Endpoint zum Ausloesen des Backfills
- Files: `cockpit/src/app/api/knowledge/backfill/route.ts`
- Expected behavior: POST, Auth-Check (nur authentifizierte User), ruft runBackfill() auf, liefert JSON mit Zaehler-Summary `{meetings: {processed, skipped, failed}, emails: {...}, activities: {...}, documents: {...}, total: {...}, durationMs}`. Timeout-Handling: Bei sehr vielen Daten in Batches verarbeiten (LIMIT 100 pro Quelltyp pro Call, mit Offset-Parameter fuer Folge-Calls).
- Verification: Curl-Test gegen deployed Endpoint, Response zeigt korrekte Zaehler
- Dependencies: MT-1

### MT-3: Embedding-Sync-Cron-Logik
- Goal: Verpasste und fehlgeschlagene Embeddings nachholen
- Files: `cockpit/src/app/api/cron/embedding-sync/route.ts`
- Expected behavior: POST mit x-cron-secret Header. (1) Cron-Secret pruefen, (2) knowledge_chunks mit status='pending' oder 'failed' laden (LIMIT 50), (3) Fuer 'failed': retry_count aus metadata pruefen, max 3 Versuche, (4) Embedding via getEmbeddingProvider().embed(chunk_text), (5) UPDATE SET embedding=..., status='active', updated_at=now(), (6) Bei erneutem Fehler: retry_count+1 in metadata, status bleibt 'failed', (7) Bei retry_count >= 3: status='failed' permanent (kein weiterer Retry), (8) Response: `{processed, failed, skipped_max_retries}`.
- Verification: Manueller Test: Chunk mit status='pending' einfuegen, Cron aufrufen, Chunk hat danach status='active' + Embedding
- Dependencies: SLC-421 (EmbeddingProvider)

### MT-4: Cron-Job in Coolify registrieren
- Goal: Embedding-Sync-Cron alle 15 Minuten ausfuehren
- Files: keine Code-Dateien, Coolify-Konfiguration
- Expected behavior: Neuer Cron in Coolify: Name "embedding-sync", Command `node -e "fetch('http://localhost:3000/api/cron/embedding-sync', {method:'POST', headers:{'x-cron-secret':'CRON_SECRET_VALUE'}})"`, Frequency `*/15 * * * *`, Container "app"
- Verification: Coolify UI zeigt Cron, erster automatischer Run zeigt Log-Output
- Dependencies: MT-3

### MT-5: Backfill ausfuehren
- Goal: Einmaliger Backfill aller bestehenden Daten auf Production
- Files: keine Code-Dateien
- Expected behavior: POST /api/knowledge/backfill aufrufen (ggf. mehrfach mit Offset bei vielen Daten). Geschaetzt: <20 Meetings, 500-2000 E-Mails, 200-500 Activities, <50 Dokumente → ~1000-3000 Chunks → ~$1-3 Embedding-Kosten. Alle Chunks haben status='active'.
- Verification: `SELECT source_type, count(*) FROM knowledge_chunks WHERE status='active' GROUP BY source_type` — Zaehler plausibel
- Dependencies: MT-2, deployed auf Hetzner

### MT-6: Build-Verifikation
- Goal: `npm run build` gruen
- Files: keine neuen Dateien
- Expected behavior: Build fehlerfrei
- Verification: `npm run build` exit code 0
- Dependencies: MT-2, MT-3

## Acceptance Criteria
1. Backfill-Endpoint liefert korrekte Zaehler pro Quelltyp
2. Bestehende Meetings, E-Mails, Activities, Dokumente sind als knowledge_chunks mit status='active' in DB
3. Idempotenz: Erneuter Backfill-Call ueberspringt bereits vorhandene Chunks
4. Embedding-Sync-Cron verarbeitet Chunks mit status='pending' oder 'failed'
5. Retry-Logik: max 3 Versuche, danach permanent 'failed'
6. Cron laeuft alle 15 Min in Coolify
7. `npm run build` gruen
8. SELECT count(*) FROM knowledge_chunks WHERE status='active' zeigt plausible Zahl

## Dependencies
- SLC-421 (pgvector + EmbeddingProvider)
- SLC-422 (Chunker + Indexer)

## QA Focus
- **Idempotenz:** Doppelter Backfill erzeugt keine Duplikate (Unique Constraint)
- **Retry-Logik:** Chunk mit provoziertem Fehler wird 3x retried, dann permanent failed
- **Zaehler-Konsistenz:** processed + skipped + failed = total Quell-Eintraege
- **Kosten-Check:** Embedding-Kosten nach Backfill pruefen (AWS Billing), sollte <$5 sein
- **Datenqualitaet:** Stichprobe: 3-5 Chunks manuell pruefen — chunk_text ist sinnvoller Textabschnitt, nicht abgeschnitten mitten im Wort
- **Cron-Frequenz:** 15 Min, nicht oefter (Kostenkontrolle)

## Geschaetzter Aufwand
1-1.5 Tage (Backfill + Cron + Ausfuehrung + Verifikation)
