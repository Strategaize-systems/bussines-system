# FEAT-555 — Angebot-Anhang im Composing-Studio (BL-404 Teil 2)

## Status
planned

## Version
V5.5

## Purpose
Im V5.4 Composing-Studio (`/emails/compose`) ein Angebot des aktuellen Deals als Multipart-Anhang an die ausgehende Mail haengen. Loest BL-404 Teil 2 ein.

## Context
- V5.4 FEAT-542 hat den PC-Direkt-Upload-Pfad implementiert. `email_attachments`-Junction-Table existiert. Multipart-SMTP via API-Route ist live.
- BL-404 Teil 2 wartet seit 2026-04-27 auf BL-405. Mit V5.5 wird der zweite Pfad (System-Angebot) freigeschaltet.

## Scope
**UI:**
- Im Composing-Studio Anhang-Sektion neuer Button "Angebot anhaengen" (neben "Datei hochladen")
- Picker-Dialog zeigt Angebote des aktuellen Deals (`deal_id` aus Compose-Kontext)
- Liste mit Status-Badge: `draft`, `sent`, `accepted`, `rejected`, `expired`
- Warnung wenn `expired`/`rejected`: "Achtung: dieses Angebot ist nicht mehr gueltig"
- Auswahl haengt PDF an

**Backend:**
- Server-Action erweitert: Anhang aus `proposal-pdfs`-Bucket lesen statt User-Upload-Bucket
- `email_attachments`-Insert mit `source_type = 'proposal'` + `proposal_id` (neue Spalte oder via metadata)
- Filename-Pattern: `Angebot-{deal-title-slug}-V{version}.pdf`
- MIME `application/pdf` fix
- Bei Send: optional automatisches `transitionProposalStatus(id, 'sent')` (siehe Open Question PRD)

**Schema-Erweiterung `email_attachments` (klein):**
- Neue Spalte `source_type TEXT NOT NULL DEFAULT 'upload'` (Werte: `upload`, `proposal`)
- Neue Spalte `proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL`
- Migrations-Hop in MIG-026 oder eigenes MIG-027 — Entscheid in `/architecture`

## Out of Scope
- Mehrere Angebot-Anhaenge in einer Mail (max ein Angebot)
- Auto-Send-mit-Default-Begleittext
- Picker fuer Angebote anderer Deals
- Anhang ohne Deal-Kontext (Compose ohne Deal-Bezug → Picker zeigt nichts)

## Acceptance Criteria
1. "Angebot anhaengen"-Button erscheint in Composing-Studio nur wenn Deal-Kontext vorhanden
2. Picker zeigt Angebote des aktuellen Deals mit Status-Badge
3. Auswahl haengt PDF korrekt an (Filename-Pattern eingehalten)
4. Multipart-Mail kommt in Gmail/Outlook mit korrektem PDF an
5. Tracking-Pixel-Event feuert auch bei Angebot-Anhang
6. Bestehender V5.4 PC-Direkt-Upload-Pfad ist regression-frei (parallel testbar)
7. Bei Send wird Angebot-Status auf `sent` gesetzt (gemaess /architecture-Entscheid)

## Dependencies
- FEAT-551 (Schema mit pdf_storage_path)
- FEAT-553 (PDF muss existieren)
- FEAT-554 (Status-Transition)
- V5.4 FEAT-542 (`email_attachments`, Multipart-Pipeline)

## Open Questions
- Status-Sent-Trigger automatisch (siehe PRD)
- Anhang-Picker-Filter (siehe PRD)

## Related
- BL-405 (high, version=V5.5)
- BL-404 Teil 2 (in_progress, version=V5.4 — wird mit V5.5 abgeschlossen)
