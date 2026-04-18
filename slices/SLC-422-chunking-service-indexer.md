# SLC-422 — Chunking-Service + Indexer

## Slice Info
- Feature: FEAT-401 (Wissensbasis Cross-Source)
- Priority: High
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-352 (Chunking-Teil)

## Goal
Quelltypspezifischen Chunking-Service und Indexer implementieren. Der Chunker zerlegt Texte aus vier Quellen (Meetings, E-Mails, Activities, Dokumente) in Chunks mit sentence-boundary-aware Splitting (DEC-048). Der Indexer nimmt Chunks entgegen, embedded sie via EmbeddingProvider (SLC-421) und speichert sie in knowledge_chunks. Dokument-Text-Extraktion fuer PDF und DOCX wird integriert.

## Scope
- `/lib/knowledge/chunker.ts` — Vier Chunk-Funktionen: chunkMeeting, chunkEmail, chunkActivity, chunkDocument
- Token-Heuristik: `tokens ~ text.length / 4` (DEC-048)
- Sentence-boundary-aware Splitting: Cut an `.`, `!`, `?` gefolgt von Whitespace
- Overlap: 100 Tokens bei Meeting-Transkripten und Dokumenten, kein Overlap bei E-Mails und Activities
- `/lib/knowledge/indexer.ts` — embedAndStore(chunks), indexMeeting(id), indexEmail(id), indexActivity(id), indexDocument(id)
- Re-Embedding-Logik: Bei Update der Quelle alte Chunks auf `status='deleted'` setzen, neue erstellen, alte loeschen
- Dokument-Text-Extraktion: `pdf-parse` fuer PDF, `mammoth` fuer DOCX, Direktzugriff fuer TXT/MD
- npm-Dependencies: `pdf-parse` (^1.1.1), `mammoth` (^1.8.0)
- Metadata-Anreicherung: title, date, deal_id, contact_id, company_id, source_url pro Chunk

## Out of Scope
- Backfill bestehender Daten (SLC-423)
- Auto-Embedding-Trigger in bestehenden Endpoints (SLC-426)
- Query-API (SLC-424)
- UI (SLC-425)
- OCR fuer gescannte PDFs/Bilder
- Excel/CSV-Extraktion

## Micro-Tasks

### MT-1: Token-Heuristik + Sentence-Boundary-Splitter
- Goal: Utility-Funktionen fuer Token-Zaehlung und sentence-boundary-aware Text-Splitting
- Files: `cockpit/src/lib/knowledge/chunker.ts`
- Expected behavior: `estimateTokens(text)` liefert `Math.ceil(text.length / 4)`. `splitAtSentenceBoundary(text, targetTokens, overlapTokens)` liefert Array von Chunks mit korrekter Groesse und Overlap. Schneidet an `.`/`!`/`?` + Whitespace, nie mitten im Satz. Letzter Chunk darf kuerzer sein.
- Verification: Manuelle Tests mit deutschen Beispieltexten (Meeting-Transkript-artig), Chunk-Groessen pruefen
- Dependencies: none

### MT-2: chunkMeeting
- Goal: Meeting-Transkript in Chunks mit Metadaten zerlegen
- Files: `cockpit/src/lib/knowledge/chunker.ts`
- Expected behavior: Liest `meetings.transcript` + `ai_summary.outcome` als Kontext-Header. Sentence-boundary Split bei ~700 Tokens Target, 100 Token Overlap. Jeder Chunk hat metadata: `{title: meeting.title, date: meeting.scheduled_at, deal_id, contact_id, company_id, source_url: "/meetings/{id}"}`. chunk_index 0-basiert.
- Verification: Test mit Sample-Transkript (~3000 Zeichen = ~750 Tokens), erwartete 2-3 Chunks
- Dependencies: MT-1

### MT-3: chunkEmail
- Goal: E-Mail in Chunks zerlegen (meist Single-Chunk)
- Files: `cockpit/src/lib/knowledge/chunker.ts`
- Expected behavior: Kombiniert `subject + "\n\n" + body_text`. Wenn <800 Tokens: Single-Chunk. Wenn >800 Tokens: Sentence-boundary Split ohne Overlap. metadata: `{title: subject, date: received_at, deal_id, contact_id, company_id, source_url: "/emails/{thread_id}"}`.
- Verification: Test mit kurzer E-Mail (Single-Chunk) und langer E-Mail (Multi-Chunk)
- Dependencies: MT-1

### MT-4: chunkActivity
- Goal: Activity als Single-Chunk mit Metadaten
- Files: `cockpit/src/lib/knowledge/chunker.ts`
- Expected behavior: `activity.body` als Single-Chunk (fast immer <500 Tokens). Metadata: `{title: activity.type + " - " + activity.subject, date: activity.created_at, deal_id, contact_id, source_url: "/deals/{deal_id}"}`. Leere Activities (body null/leer) werden uebersprungen.
- Verification: Test mit Sample-Activity
- Dependencies: MT-1

### MT-5: chunkDocument + Text-Extraktion
- Goal: Dokument-Textextraktion (PDF/DOCX/TXT) + Chunking
- Files: `cockpit/src/lib/knowledge/chunker.ts`
- Expected behavior: PDF via `pdf-parse` (Buffer → Text), DOCX via `mammoth` (Buffer → Plain-Text), TXT/MD direkt. Sentence-boundary Split bei ~700 Tokens, 100 Token Overlap. metadata: `{title: doc.name, date: doc.created_at, deal_id, source_url: "/documents/{id}"}`. Nicht-unterstuetzte Formate (Bilder, Excel) werden uebersprungen mit Log-Warning.
- Verification: Test mit kleinem PDF und DOCX
- Dependencies: MT-1

### MT-6: npm-Dependencies installieren
- Goal: pdf-parse und mammoth installieren
- Files: `cockpit/package.json`, `cockpit/package-lock.json`
- Expected behavior: `npm install pdf-parse mammoth` erfolgreich, Versionen in package.json
- Verification: `npm ls pdf-parse mammoth`
- Dependencies: none

### MT-7: Indexer — embedAndStore
- Goal: Zentrale Indexer-Funktion die Chunks embedded und in knowledge_chunks speichert
- Files: `cockpit/src/lib/knowledge/indexer.ts`
- Expected behavior: `embedAndStore(chunks: Chunk[])` — fuer jeden Chunk: (1) Embedding via getEmbeddingProvider().embed(chunk.text), (2) INSERT in knowledge_chunks mit source_type, source_id, chunk_index, chunk_text, embedding, metadata, embedding_model. Bei Fehler: status='failed' setzen. Audit-Log pro Embedding-Call (Provider, Region, Model-ID, Chunk-Count, Timestamp).
- Verification: Manueller Test: Chunk-Array → DB-Eintraege mit korrektem Embedding + Metadata
- Dependencies: MT-1 (Chunk-Interface), SLC-421 (EmbeddingProvider)

### MT-8: Indexer — Source-spezifische Index-Funktionen
- Goal: Convenience-Funktionen die Quelle laden, chunken und indexieren
- Files: `cockpit/src/lib/knowledge/indexer.ts`
- Expected behavior: `indexMeeting(meetingId)` — Meeting laden, chunkMeeting aufrufen, embedAndStore. Analog: `indexEmail(emailId)`, `indexActivity(activityId)`, `indexDocument(documentId)`. Bei Document: Datei aus Supabase Storage laden, Text extrahieren, dann chunken. Re-Embedding-Logik: Bestehende Chunks mit gleicher source_id auf 'deleted' setzen, neue erstellen, alte loeschen.
- Verification: Manueller Test: indexMeeting mit echtem Meeting → Chunks in DB
- Dependencies: MT-2, MT-3, MT-4, MT-5, MT-7

### MT-9: Re-Export + Build-Verifikation
- Goal: Index-Datei fuer /lib/knowledge/ + Build gruen
- Files: `cockpit/src/lib/knowledge/index.ts`
- Expected behavior: Re-exportiert chunker und indexer Funktionen. `npm run build` gruen.
- Verification: `npm run build` exit code 0
- Dependencies: MT-8

## Acceptance Criteria
1. chunkMeeting/chunkEmail/chunkActivity/chunkDocument liefern korrekte Chunk-Arrays mit Metadaten
2. Sentence-boundary Splitting schneidet nie mitten im Satz
3. Token-Heuristik liefert plausible Werte (~text.length/4)
4. Overlap bei Meetings und Dokumenten vorhanden (~100 Tokens), kein Overlap bei E-Mails und Activities
5. PDF-Textextraktion liefert lesbaren Text (pdf-parse)
6. DOCX-Textextraktion liefert lesbaren Text (mammoth)
7. indexMeeting/indexEmail/indexActivity/indexDocument speichern Chunks mit korrektem Embedding in DB
8. Re-Embedding-Logik: Update loescht alte Chunks und erstellt neue
9. Audit-Log pro Embedding-Call vorhanden (Provider, Region, Model-ID)
10. `npm run build` gruen

## Dependencies
- SLC-421 (pgvector + EmbeddingProvider muessen funktionieren)

## QA Focus
- **Chunk-Groessen:** Kein Chunk >1000 Tokens (Titan V2 Limit 8192, aber Target 800)
- **Sentence-Boundary:** Deutsche Texte mit Abkuerzungen ("z.B.", "d.h.") duerfen nicht falsch gesplittet werden
- **Metadata-Vollstaendigkeit:** Jeder Chunk hat title, date, mindestens eine FK (deal_id, contact_id, company_id)
- **Leere Quellen:** Activities mit leerem Body werden uebersprungen, nicht als leerer Chunk gespeichert
- **Dokument-Formate:** Nicht-unterstuetzte Formate loggen Warning, crashen nicht
- **Re-Embedding:** Nach Update: alte Chunks geloescht, neue korrekt, kein Duplikat

## Geschaetzter Aufwand
1.5-2 Tage (Chunker + Indexer + Text-Extraktion + Edge-Cases)
