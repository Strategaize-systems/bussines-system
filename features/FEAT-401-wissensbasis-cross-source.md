# FEAT-401 — Wissensbasis Cross-Source (Voice-Deal-Chat)

## Summary

Cross-Source-Wissensbasis mit RAG-Pipeline (Retrieval-Augmented Generation). Alle geschaeftsrelevanten Informationen aus vier Quellen — Meeting-Transkripte, E-Mails, Deal-Daten und Dokumente — werden ueber semantische Embeddings durchsuchbar. Abfrage per natuerlicher Sprache (Text + Voice) aus dem Deal-Workspace.

## Version

V4.2

## Status

planned

## Sub-Features

### FEAT-401a — Embedding-Pipeline + Vektor-Speicher

- pgvector Extension in bestehender Supabase PostgreSQL
- `knowledge_chunks` Tabelle mit Vektor-Spalte
- Chunking-Service (quelltypspezifisch: Meetings paragraph-basiert, E-Mails pro Mail, Activities pro Eintrag, Dokumente seiten-/absatzbasiert)
- Amazon Titan Text Embeddings V2 via Bedrock Frankfurt (eu-central-1)
- Adapter-Pattern (`EmbeddingProvider` Interface) analog zu Whisper-Adapter (DEC-035)
- Auto-Embedding bei neuen Daten (Meeting-Transkript, IMAP-Sync, Activity, Dokument-Upload)
- Backfill-Script fuer bestehende Daten (idempotent)

### FEAT-401b — RAG Query API

- `/api/knowledge/query` (authentifiziert, rate-limited)
- Pipeline: Query embedden → pgvector Similarity Search → Top-N Chunks → Bedrock Claude Sonnet → strukturierte Antwort
- Scope-Logik: deal / contact / company / all
- Strukturierte Response mit Quellenangaben (Typ, Titel, Datum, Snippet, Link, Relevanz)
- Confidence-Level basierend auf Vektor-Distanz

### FEAT-401c — Deal Knowledge Query UI

- "Wissen"-Tab im Deal-Workspace (/deals/[id])
- Text-Input + Voice-Input (Whisper, bestehendes Pattern)
- Ergebnis: Antwort-Text + Quellen-Cards mit Klick-Navigation zum Original
- Scope-Toggle: "Nur dieser Deal" / "Alle Daten"
- On-click, kein auto-load (Kostenschutz, DEC-030)

### FEAT-401d — Backfill + Monitoring

- Einmaliger Backfill aller bestehenden Daten
- Audit-Logging jedes Embedding-Calls (Data-Residency Compliance)
- Cron-Job `/api/cron/embedding-sync` fuer verpasste Auto-Embeddings (alle 15 Min)

## Datenquellen

| Quelle | Tabelle | Felder | Herkunft |
|---|---|---|---|
| Meeting-Transkripte | meetings | transcript, ai_summary | V4.1 Whisper + Bedrock |
| E-Mail-Inhalte | email_messages | body_text, subject | V4 IMAP-Sync |
| Deal-Kontext | deals, activities, tasks, proposals, signals | diverse | V2+ |
| Dokumente | documents | name, description, Dateiinhalt | V2+ |

## Architektur-Entscheidungen

- DEC-046: RAG mit pgvector + Bedrock Titan Embeddings V2 statt Context-Window-Stuffing
- DEC-047: Embedding-Adapter-Pattern (analog Whisper-Adapter DEC-035)

## Dependencies

- V4.1 Meeting Intelligence (Transkripte + Summaries)
- V4 IMAP Integration (E-Mail-Inhalte)
- Bedrock-Zugang (eu-central-1, bereits konfiguriert)
- pgvector Extension in PostgreSQL

## Success Criteria

1. Natuerlichsprachliche Frage im Deal-Workspace liefert praezise Antwort mit Quellenangabe
2. Alle 4 Datenquellen sind durchsuchbar
3. Semantische Suche ("Vollmacht" findet "Vertretungsbefugnis")
4. Voice-Input funktioniert
5. Bestehende Daten sind nach Backfill durchsuchbar
6. EU-only (Bedrock Frankfurt)
7. Query-Latenz <10 Sekunden

## Reuse-Potential

Das RAG-Pattern (pgvector + Titan Embeddings + Adapter) ist als Strategaize-weiter Standard konzipiert:
- Intelligence Studio: Marktdaten, Wettbewerbsanalysen, interne Dokumente durchsuchbar
- Onboarding-Plattform: Blueprint-Ergebnisse, Fragebogen-Antworten, Debrief-Items durchsuchbar
- Zukuenftige Projekte: Jedes System das unstrukturierte Texte semantisch durchsuchbar machen muss
