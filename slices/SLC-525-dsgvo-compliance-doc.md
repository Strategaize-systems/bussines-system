# SLC-525 — DSGVO-Compliance-Doku (via /compliance Skill)

## Meta
- Feature: FEAT-525
- Priority: Medium
- Status: planned
- Created: 2026-04-25

## Goal

Eine zentrale, exportierbare DSGVO-Doku als `docs/COMPLIANCE.md` wird via `/compliance`-Skill (Dev System) gegen den V5.2-Endzustand des Business Systems generiert. Doku beschreibt erhobene personenbezogene Daten, Datenfluesse, Speicherorte/Regionen, Retention-Policies, Drittanbieter, DPA-Status, Loeschkonzept und datenschutzkonforme Defaults. Verweist auf den V5.2-Endzustand (7d Retention, Whisper-Provider laut ENV).

## Scope

- `/compliance`-Skill ausfuehren gegen den Business-System-Stand nach Abschluss von SLC-521..524
- Output `docs/COMPLIANCE.md` mit den 8 Pflicht-Sektionen aus FEAT-525:
  1. Erhobene personenbezogene Daten
  2. Datenfluesse pro Quelle
  3. Speicherorte und Regionen
  4. Retention-Policies
  5. Drittanbieter-Liste
  6. Auftragsverarbeitungsvertraege (DPA-Status)
  7. Loeschkonzept
  8. Datenschutzkonforme Defaults (inkl. Verweis auf FEAT-523-Templates)
- Stale-Data-Hinweis: Datum + V5.2-Release-Bezug im Doc-Header
- Hinweis im Abschnitt "Drittanbieter" auf den aktuellen Whisper-Provider (V5.2-Stand: OpenAI-US) und den geplanten Pre-Go-Live-Switch auf Azure-EU

## Out of Scope

- Anwaltliche Pruefung der Doku (User-Verantwortung)
- PDF-Export (Markdown reicht; User kann manuell konvertieren)
- Mehrsprachige Versionen (DE-only fuer V5.2)
- Auto-Refresh-Mechanismus bei Schema-Aenderungen (manuell zu pflegen)

## Acceptance Criteria

- AC1: `docs/COMPLIANCE.md` existiert
- AC2: Alle 8 Pflicht-Sektionen sind ausgefuellt mit projektspezifischen Inhalten
- AC3: Header enthaelt Datum (2026-04-25) und V5.2-Release-Bezug
- AC4: Sektion "Retention-Policies" referenziert 7d Rohdaten + langfristig Activities
- AC5: Sektion "Speicherorte" listet Hetzner Frankfurt + Bedrock Frankfurt + Whisper-Provider
- AC6: Sektion "Drittanbieter" enthaelt: AWS Bedrock, OpenAI Whisper (V5.2-aktuell, US), Cal.com, IMAP-Server, Asterisk PBX (self-hosted, kein Drittanbieter), SMAO (vorbereitet, nicht aktiv)
- AC7: Sektion "Datenschutzkonforme Defaults" verweist auf `/settings/compliance` (FEAT-523) und 7d-Retention (FEAT-521)
- AC8: Sektion "Loeschkonzept" beschreibt: Kontakt/Deal-Loeschung kaskadiert auf Activities/Calls/Meetings/Recordings; Rohdaten-Retention loescht WAV automatisch nach 7d
- AC9: Hinweis auf geplanten Azure-Whisper-Switch ist sichtbar (Pre-Go-Live, ausserhalb V5.2)
- AC10: Markdown-Validitaet: Datei laesst sich in jedem Markdown-Renderer korrekt rendern

## Dependencies

- SLC-521 done — fuer korrekte Retention-Werte in der Doku
- SLC-522 done — fuer korrekten Azure-Adapter-Status und Switch-Anleitung
- SLC-523 done — fuer Verweis auf `/settings/compliance` Templates
- SLC-524 done — fuer korrekte Meeting-Timeline-Funktionalitaet (referenziert in "Datenfluesse")

## Risks

- **Risk:** Ohne aktuelle Slices in done-Status koennten Doku-Werte nicht stimmen (z.B. "7d Retention" wenn SLC-521 noch nicht deployed). 
  Mitigation: SLC-525 ist LAST in der Reihenfolge — wird erst nach allen anderen ausgefuehrt.
- **Risk:** `/compliance`-Skill koennte Annahmen ueber Architecture haben, die nicht zu V5.2-Stand passen. 
  Mitigation: Skill-Output reviewen und Korrekturen direkt in `docs/COMPLIANCE.md` vornehmen, falls Skill nicht 100% passt.
- **Risk:** Doku enthaelt vertrauliche Details (z.B. interne Datenfluesse), die ggf. nicht an externe Kunden gehen sollen. 
  Mitigation: Sektion "Drittanbieter" und "Datenfluesse" pragmatisch halten — keine internen Implementierungs-Details.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `docs/COMPLIANCE.md` (neu) | Generierte DSGVO-Doku mit 8 Sektionen |

## QA Focus

- Datei existiert und ist Markdown-valide
- Alle 8 Sektionen sind vorhanden
- Werte (7d Retention, Whisper-Provider) entsprechen dem aktuellen V5.2-Endzustand
- Keine "TODO" oder Platzhalter-Texte in der finalen Version
- Datum + V5.2-Bezug im Header
- Sichtbarer Hinweis "vor produktiver Nutzung anwaltlich pruefen" (analog Templates)

## Micro-Tasks

### MT-1: /compliance Skill ausfuehren
- Goal: Skill gegen Business System (V5.2-Stand) starten
- Files: `docs/COMPLIANCE.md` (Skill-Output)
- Expected behavior: Skill generiert vollstaendige Markdown-Doku mit 8 Sektionen
- Verification: Datei existiert; Sektionen vorhanden
- Dependencies: SLC-521..524 done

### MT-2: Skill-Output review + Korrekturen
- Goal: Doku gegen V5.2-Stand pruefen, Werte (Retention, Provider, Anbieter) verifizieren
- Files: `docs/COMPLIANCE.md`
- Expected behavior: Werte stimmen mit Code/ENVs ueberein. Verweise auf FEAT-521/523 sind korrekt.
- Verification: Manueller Cross-Check gegen ARCHITECTURE.md V5.2-Section + .env.example
- Dependencies: MT-1

### MT-3: Header + Anwalts-Hinweis ergaenzen
- Goal: Datum, V5.2-Bezug und Anwalts-Hinweis im Header
- Files: `docs/COMPLIANCE.md`
- Expected behavior: Header enthaelt: "Erstellt: 2026-04-25 (V5.2-Release)" und "Diese Doku ist eine pragmatische Standardvorlage. Vor produktivem Einsatz anwaltlich pruefen."
- Verification: Sichtbar im Header
- Dependencies: MT-2
