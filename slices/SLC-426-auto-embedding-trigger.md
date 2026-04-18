# SLC-426 — Auto-Embedding Trigger

## Slice Info
- Feature: FEAT-401 (Wissensbasis Cross-Source)
- Priority: Medium
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-354

## Goal
Automatisches Embedding bei neuen Daten in die bestehenden Cron-Jobs und Server Actions integrieren. Neue Meeting-Transkripte, E-Mails, Activities und Dokumente werden automatisch gechunkt und embedded, ohne dass ein manueller Backfill noetig ist. Fire-and-forget mit Fallback auf den Embedding-Sync-Cron (SLC-423).

## Scope
- Integration in `/api/cron/meeting-summary` — nach `summary_status='completed'`: `indexMeeting(meetingId)` aufrufen
- Integration in `/api/cron/imap-sync` — nach jedem neuen email_message INSERT: `indexEmail(emailId)` aufrufen
- Integration in Activity-Create Server Actions — nach Activity INSERT: `indexActivity(activityId)` aufrufen
- Integration in Document-Upload Server Actions — nach Document INSERT: `indexDocument(documentId)` aufrufen
- Alle Trigger sind fire-and-forget: Bei Fehler wird Chunk mit status='pending' oder 'failed' erstellt, Embedding-Sync-Cron (SLC-423) holt es nach
- Kein Blocking des Haupt-Requests: Embedding laeuft async (nicht await im kritischen Pfad, sondern .catch()-Pattern oder try/catch mit silent-fail)

## Out of Scope
- Schema-Aenderungen (SLC-421)
- Chunking/Indexer-Logik (SLC-422, bereits implementiert)
- Backfill bestehender Daten (SLC-423, bereits erledigt)
- Query-API (SLC-424)
- UI (SLC-425)
- Re-Embedding bei Quell-Updates (handled durch Indexer Re-Embedding-Logik in SLC-422)

## Micro-Tasks

### MT-1: Meeting-Summary-Trigger
- Goal: Nach erfolgreicher Meeting-Summary automatisch Meeting-Chunks embedden
- Files: `cockpit/src/app/api/cron/meeting-summary/route.ts`
- Expected behavior: Nach der Zeile wo `summary_status='completed'` gesetzt wird: `indexMeeting(meetingId).catch(err => console.error('Auto-embed meeting failed:', meetingId, err))`. Fire-and-forget — Cron-Response wartet nicht auf Embedding. Log-Zeile bei Erfolg: "Auto-embedded meeting {id}: {N} chunks".
- Verification: Meeting-Summary-Cron durchlaufen lassen → knowledge_chunks fuer dieses Meeting in DB
- Dependencies: SLC-422 (indexMeeting), SLC-423 (Cron als Fallback)

### MT-2: IMAP-Sync-Trigger
- Goal: Nach jedem neuen E-Mail-INSERT automatisch E-Mail-Chunks embedden
- Files: `cockpit/src/app/api/cron/imap-sync/route.ts`
- Expected behavior: Nach dem INSERT von email_messages (innerhalb der Sync-Schleife): `indexEmail(emailId).catch(err => console.error('Auto-embed email failed:', emailId, err))`. Fire-and-forget. Achtung: IMAP-Sync kann viele E-Mails auf einmal verarbeiten — Embedding-Calls nicht parallel (sequentiell mit den Inserts, Embedding pro Mail ~50-100ms).
- Verification: IMAP-Sync-Cron durchlaufen lassen → neue E-Mails haben knowledge_chunks
- Dependencies: SLC-422 (indexEmail)

### MT-3: Activity-Create-Trigger
- Goal: Nach Activity-Erstellung automatisch Activity-Chunks embedden
- Files: Activity-Create Server Actions (Pfad ermitteln: vermutlich `cockpit/src/app/actions/activities.ts` oder aehnlich)
- Expected behavior: Nach erfolgreichem Activity INSERT: `indexActivity(activityId).catch(...)`. Nur bei Activities mit body IS NOT NULL und body.length > 0 (leere Activities nicht embedden). Fire-and-forget.
- Verification: Neue Activity im Deal-Workspace erstellen → knowledge_chunk fuer diese Activity in DB
- Dependencies: SLC-422 (indexActivity)

### MT-4: Document-Upload-Trigger
- Goal: Nach Dokument-Upload automatisch Dokument-Chunks embedden
- Files: Document-Upload Server Actions (Pfad ermitteln: vermutlich `cockpit/src/app/actions/documents.ts` oder aehnlich)
- Expected behavior: Nach erfolgreichem Document INSERT + Storage Upload: `indexDocument(documentId).catch(...)`. Nur fuer unterstuetzte Formate (PDF, DOCX, TXT, MD). Fire-and-forget.
- Verification: Dokument hochladen → knowledge_chunks fuer dieses Dokument in DB
- Dependencies: SLC-422 (indexDocument)

### MT-5: Error-Handling + Logging vereinheitlichen
- Goal: Konsistentes Error-Handling und Logging ueber alle Trigger
- Files: Alle in MT-1..4 geaenderten Dateien
- Expected behavior: (1) Jeder Trigger loggt bei Erfolg: `console.log('Auto-embedded {type} {id}: {N} chunks')`, (2) Bei Fehler: `console.error('Auto-embed {type} failed: {id}', err.message)` — kein Stack-Trace im Log, nur Message, (3) Kein Crash des Haupt-Endpoints bei Embedding-Fehler, (4) Audit-Log-Eintrag via Indexer (bereits in SLC-422 implementiert).
- Verification: Provozierter Fehler (z.B. Bedrock temporaer nicht erreichbar) → Haupt-Endpoint funktioniert trotzdem, Error-Log zeigt Fehler
- Dependencies: MT-1..4

### MT-6: Build-Verifikation
- Goal: `npm run build` gruen
- Files: keine neuen Dateien
- Expected behavior: Build fehlerfrei
- Verification: `npm run build` exit code 0
- Dependencies: MT-5

## Acceptance Criteria
1. Neues Meeting-Transkript (nach Summary) wird automatisch embedded
2. Neue E-Mail (nach IMAP-Sync) wird automatisch embedded
3. Neue Activity wird automatisch embedded (wenn Body nicht leer)
4. Neues Dokument (nach Upload) wird automatisch embedded (PDF/DOCX/TXT/MD)
5. Alle Trigger sind fire-and-forget — Fehler im Embedding blockiert nicht den Haupt-Endpoint
6. Bei Embedding-Fehler: Chunk mit status='pending'/'failed', Cron holt nach
7. Log-Zeilen bei Erfolg und Fehler vorhanden
8. `npm run build` gruen

## Dependencies
- SLC-421 (pgvector + EmbeddingProvider)
- SLC-422 (Chunker + Indexer mit indexMeeting/indexEmail/indexActivity/indexDocument)
- SLC-423 (Embedding-Sync-Cron als Fallback)

## QA Focus
- **Fire-and-forget-Verifikation:** Meeting-Summary-Cron antwortet nicht langsamer als vorher (Embedding darf Cron-Latenz nicht verdoppeln)
- **IMAP-Sync-Last:** Bei Batch von 50 neuen E-Mails: IMAP-Sync laeuft durch ohne Timeout, Embeddings werden alle erstellt (oder als pending fuer Cron)
- **Activity-Trigger:** Activity mit body="" wird NICHT embedded (kein leerer Chunk)
- **Dokument-Trigger:** PNG/JPG-Upload loest KEIN Embedding aus (nur PDF/DOCX/TXT/MD)
- **Cron-Fallback:** Manuell ein Chunk mit status='pending' einfuegen → Embedding-Sync-Cron setzt auf 'active'
- **Kein Duplicate:** Doppelter Trigger (z.B. Cron laeuft 2x) erzeugt keine Duplicate-Chunks (Unique Constraint)

## Geschaetzter Aufwand
0.5-1 Tag (Integration in 4 bestehende Endpoints + Error-Handling)
