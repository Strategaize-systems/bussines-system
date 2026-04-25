# SLC-521 — Recording-Retention 7d Hardening

## Meta
- Feature: FEAT-521
- Priority: High
- Status: planned
- Created: 2026-04-25

## Goal

Rohdaten-Retention (WAV + Roh-Transkripte) wird von 30 auf 7 Tage reduziert. Default-Wert in Code und docker-compose-File angepasst. ENV-Override bleibt technisch moeglich. Doku weist auf DSGVO-Begruendung hin. Activities (AI-Summary) bleiben unangetastet — nur Rohdaten werden frueher geloescht.

## Scope

- Default-Wert `RECORDING_RETENTION_DAYS` in `cockpit/src/app/api/cron/recording-retention/route.ts` von `"30"` auf `"7"` aendern
- Default-Wert in `docker-compose.yml` von `${RECORDING_RETENTION_DAYS:-30}` auf `${RECORDING_RETENTION_DAYS:-7}` aendern
- `.env.example` um Eintrag `RECORDING_RETENTION_DAYS=7` mit Kommentar zur DSGVO-Begruendung ergaenzen (falls nicht vorhanden — sonst aktualisieren)
- ARCHITECTURE.md V5.2-Section verlinkt; konkrete Doku-Zeile zur 7d-Default-Begruendung in der allgemeinen Retention-Sektion ergaenzen

## Out of Scope

- Aenderung der Retention-Logik selbst (nur Default-Wert)
- Activities/Summary-Retention (separates Konzept, langfristig erhalten)
- Audit-Log fuer geloeschte Rohdaten (existiert bereits)
- Per-Bucket-individuelle Retention (zu fein fuer V5.2)

## Acceptance Criteria

- AC1: `cockpit/src/app/api/cron/recording-retention/route.ts` Default-Wert ist `"7"` (statt `"30"`)
- AC2: `docker-compose.yml` Default-Wert ist `${RECORDING_RETENTION_DAYS:-7}`
- AC3: ENV-Override funktioniert weiterhin — Test mit `RECORDING_RETENTION_DAYS=14` produziert 14d-Cutoff
- AC4: Retention-Cron loescht Recordings die aelter sind als der Schwellwert (unveraendert, nur Default)
- AC5: Activities (AI-Summary) bleiben erhalten — Cron nicht betroffen
- AC6: `.env.example` enthaelt Kommentar mit DSGVO-Begruendung fuer 7d
- AC7: Cron-Run gegen Test-Daten zeigt korrekte Cutoff-Berechnung (>=8 Tage alt → loeschen)

## Dependencies

- Keine externen Abhaengigkeiten
- Kein anderer V5.2-Slice
- Kann sofort starten

## Risks

- **Risk:** 7 Tage zu kurz fuer Pipeline-Fehler-Recovery, falls Pipeline-Issues erst spaet entdeckt werden.
  Mitigation: Cron laeuft taeglich; Pipeline-Fehler werden in den ersten 24h via Logs und Status-Felder sichtbar; 7d ist Puffer.
- **Risk:** Bestehende Recordings (zwischen 7 und 30 Tagen alt) werden beim ersten Cron-Run nach Deploy aktiv geloescht. Das ist gewuenscht, aber im Deploy-Plan zu dokumentieren — User erwartet keine "alle alten Recordings sind weg"-Ueberraschung.
  Mitigation: Vor Deploy ggf. einmalig manueller Backup-Check oder Logs reviewen.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/app/api/cron/recording-retention/route.ts` | Default `"30"` → `"7"` |
| `docker-compose.yml` | Default `${...:-30}` → `${...:-7}` |
| `.env.example` | Eintrag/Aktualisierung `RECORDING_RETENTION_DAYS=7` + Kommentar |
| `docs/ARCHITECTURE.md` | Doku-Zeile zur 7d-Default-Begruendung (optional, V5.2-Section ist bereits angelegt) |

## QA Focus

- Cron-Run mit ENV-Override (z.B. `RECORDING_RETENTION_DAYS=14`) verhaelt sich erwartungsgemaess
- Activities (AI-Summary) sind nach Cron-Run noch da
- Doku-Aenderungen sind committed
- TypeScript-Kompilation gruen
- Manueller Smoke-Test gegen Staging-DB: Recording aelter 7d ist als geloescht markiert; Recording juenger 7d bleibt

## Micro-Tasks

### MT-1: Default-Wert in Cron-Route aendern
- Goal: `RECORDING_RETENTION_DAYS`-Default in der Cron-Route von 30 auf 7
- Files: `cockpit/src/app/api/cron/recording-retention/route.ts`
- Expected behavior: `process.env.RECORDING_RETENTION_DAYS || "7"` (statt `"30"`)
- Verification: TypeScript kompiliert; `grep RECORDING_RETENTION_DAYS cockpit/src/app/api/cron/recording-retention/route.ts` zeigt `|| "7"`
- Dependencies: none

### MT-2: Default-Wert in docker-compose.yml aendern
- Goal: ENV-Default im Compose-File von 30 auf 7
- Files: `docker-compose.yml`
- Expected behavior: `RECORDING_RETENTION_DAYS: ${RECORDING_RETENTION_DAYS:-7}` (statt `:-30`)
- Verification: `grep RECORDING_RETENTION_DAYS docker-compose.yml` zeigt `:-7`
- Dependencies: none

### MT-3: .env.example dokumentieren
- Goal: Eintrag mit DSGVO-Begruendung in der Beispiel-Env
- Files: `.env.example`
- Expected behavior: Kommentar erklaert "DSGVO-Datensparsamkeit, Rohdaten 7d, Activities langfristig" + `RECORDING_RETENTION_DAYS=7`
- Verification: Datei enthaelt den Eintrag; `grep -A 1 "RECORDING_RETENTION" .env.example` zeigt Wert + Kommentar
- Dependencies: none

### MT-4: ARCHITECTURE.md Retention-Begruendung
- Goal: Klare Doku-Zeile zur Default-Reduzierung im V5.2-Block
- Files: `docs/ARCHITECTURE.md`
- Expected behavior: Hinweis "Rohdaten-Default 7d ab V5.2 (DSGVO Datensparsamkeit), Activities/Summary unbeeinflusst"
- Verification: Sichtbar in der V5.2-Section
- Dependencies: none

### MT-5: Manueller Cron-Smoke-Test (QA)
- Goal: Cron-Endpoint mit ENV-Override gegen Staging-DB testen
- Files: keine
- Expected behavior: Cron ueberlebt einen Aufruf, loggt korrekten Cutoff, betroffene Recording-IDs sichtbar
- Verification: Logs zeigen "cutoff: 7 days ago" oder den ENV-Override-Wert
- Dependencies: MT-1, MT-2
