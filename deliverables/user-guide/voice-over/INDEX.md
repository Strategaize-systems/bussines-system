# Voice-Over-Skripte fuer Tutorial-Videos

> Status: Entwurf 2026-05-22. 12 Skripte fuer 2-3 Min Tutorial-Videos. **Sprecher-Tonart:** deutsch, Sie-Form, freundlich-erklaerend, mittlere Geschwindigkeit (~150 Worte/Min).

## Skripte-Liste

| Lektion | Slug | Dauer | Wer |
|---|---|---|---|
| Lektion 1 — Mein Tag starten | [mein-tag.md](mein-tag.md) | 2:30 | Alle Rollen |
| Lektion 2 — Pipeline beherrschen | [pipeline.md](pipeline.md) | 2:45 | Alle Rollen |
| Lektion 3 — Deal-Detail | [deal-detail.md](deal-detail.md) | 2:30 | Alle Rollen |
| Lektion 4 — E-Mails mit KI | [compose.md](compose.md) | 2:45 | Alle Rollen |
| Lektion 5 — Settings + Branding | [settings.md](settings.md) | 2:00 | Admin |
| Lektion 6 — Team einladen | [team-verwaltung.md](team-verwaltung.md) | 2:15 | Admin |
| Lektion 7 — KI optimal nutzen (Master) | [ki-usage.md](ki-usage.md) | 3:00 | Alle Rollen |
| Lektion 8 — Workflow-Automation | [workflow-automation.md](workflow-automation.md) | 2:45 | Admin |
| Lektion 9 — Custom-Reports | [custom-reports.md](custom-reports.md) | 2:00 | Alle Rollen |
| Lektion 10 — Kampagnen + UTM | [kampagnen.md](kampagnen.md) | 2:15 | Admin |
| Lektion 11 — Zahlungen + Briefing | [zahlungsbedingungen.md](zahlungsbedingungen.md) | 2:00 | Alle Rollen |
| Lektion 12 — Steuern NL+DE | [vat-reverse-charge.md](vat-reverse-charge.md) | 2:15 | Admin |

**Gesamt-Dauer**: ~30 Min ueber 12 Lektionen.

## Empfohlene Produktions-Reihenfolge

1. Erst alle Texte review + glaetten
2. Dann Playwright `screencaps.spec.ts` ausfuehren → Screenshots + Videos sammeln
3. Pro Lektion: Voice-Over aufnehmen oder TTS generieren
4. Zusammenschnitt: Screencap + Voice-Over → Video
5. Optional: Untertitel-File generieren (aus Voice-Over-Markdown)

## Recording-Hinweise

- **Geraet**: gutes USB-Mikro reicht (z.B. Blue Yeti)
- **Software**: Audacity, OBS, oder Synthesia/Narakeet fuer TTS
- **Tonalitaet**: ruhig, klar, kein Marketing-Sprech
- **Pausen**: 0.5-1 Sek nach jeder Bullet
- **Auf-Cut**: schneidet Atemgeraeusche raus
