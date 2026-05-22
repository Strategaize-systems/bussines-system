# Bedienungsanleitung — Strategaize Business Development System

> **Status:** Entwurf 2026-05-22 (V8.2 stable, Internal-Test-Mode). Vor Customer-Live werden die Inhalte poliert und Anwalts-/UX-geprueft (per `feedback_compliance_gate_later`). Adressdaten und KvK-/BTW-Nummern in den Drafts sind noch Platzhalter.
> **Zielgruppe:** Admin (Eigentuemer) + Teamlead + Member. Nicht-technische Sprache, Sie-Form.

---

## Inhalt der Anleitung

Die Anleitung ist nach **User-Flows** gegliedert, nicht nach Features. Jeder Guide beantwortet die Frage "Was will ich tun?" — nicht "Welche Komponente nutze ich?".

### Empfohlene Lese-Reihenfolge

#### 1. Erste Schritte
Grundlagen, jede Rolle:

| # | Guide | Wer | Dauer |
|---|---|---|---|
| 1 | [Mein Tag — Ihre tagliche Vertriebsroutine](mein-tag.md) | Alle Rollen | 10 Min |
| 2 | [Pipeline — Vertriebs-Steuerung per Drag&Drop](pipeline.md) | Alle Rollen | 10 Min |
| 3 | [Deal-Detail — Alle Infos zu einem Lead an einem Ort](deal-detail.md) | Alle Rollen | 10 Min |
| 4 | [Compose-Studio — E-Mails schreiben mit KI](compose.md) | Alle Rollen | 10 Min |

#### 2. Verwaltung
Fuer Admin + Teamlead:

| # | Guide | Wer | Dauer |
|---|---|---|---|
| 5 | [Settings — System-Konfiguration](settings.md) | Admin, Teamlead | 8 Min |
| 6 | [Team-Verwaltung — Mitglieder einladen und verwalten](team-verwaltung.md) | Admin, Teamlead | 8 Min |

#### 3. KI-Werkzeuge
Optional, aber sehr empfohlen:

| # | Guide | Wer | Dauer |
|---|---|---|---|
| 7 | [KI optimal nutzen — Master-Guide fuer alle KI-Features](ki-usage.md) | Alle Rollen | 12 Min |
| 8 | [Workflow-Automation — Regeln, die fuer Sie arbeiten](workflow-automation.md) | Admin | 10 Min |
| 9 | [Custom-Reports — Eigene KI-Berichts-Vorlagen](custom-reports.md) | Alle Rollen | 8 Min |

#### 4. Spezial-Themen
Bei Bedarf:

| # | Guide | Wer | Dauer |
|---|---|---|---|
| 10 | [Kampagnen + UTM-Tracking](kampagnen.md) | Admin | 8 Min |
| 11 | [Zahlungsbedingungen + Pre-Call Briefing](zahlungsbedingungen.md) | Alle Rollen | 8 Min |
| 12 | [Steuern: NL+DE-VAT + Reverse-Charge](vat-reverse-charge.md) | Admin | 8 Min |

---

## Kurz-Ueberblick — was kann das System?

Das **Strategaize Business Development System** ist ein KI-unterstuetztes Vertriebs- und Beziehungssystem fuer beratungsintensives B2B-Geschaeft. Es ist **kein generisches CRM**, sondern ein **prozesszentriertes Arbeitssystem** mit drei Saeulen:

1. **Workspace-basiert** — Sie arbeiten in einem fokussierten Arbeitsbereich (Mein Tag, Deal-Detail, KI-Analyse), nicht in einer Datenbank-Liste.
2. **KI-unterstuetzt** — KI hilft bei Tagesplanung, Pipeline-Risiko-Analyse, E-Mail-Vorlagen, Win/Loss-Analyse, Workflow-Bau.
3. **Multiplikator-orientiert** — Empfehlungen + Mittler-Netz werden als gleichberechtigte Quelle gleichbehandelt mit Direkt-Leads.

---

## So lesen Sie diese Anleitung

Jeder Guide ist gleich aufgebaut:

```
Ziel                 — Was Sie nach dem Guide koennen
Voraussetzungen      — Was vorher erfuellt sein muss
Schritte             — Nummerierte Klick-Anleitung
Erwartetes Ergebnis  — Was Sie sehen sollten
Tipps                — Praktische Hinweise, die nicht offensichtlich sind
Haeufige Probleme    — Wo Leute haengenbleiben + Loesung
```

---

## Wo finden Sie was?

Die App ist in vier Sidebar-Sections gegliedert:

- **VERWALTUNG_MEIN** — Ihre eigenen Pages (Mein Tag, Aufgaben, Termine, Mailbox, Settings)
- **TEAM** — Team-Aggregat (nur sichtbar wenn `team_size > 1`, sonst Solopreneur-Mode)
- **ARBEITSBEREICHE** — Pipeline, Multiplikatoren, Deals, Firmen, Kontakte
- **WERKZEUGE** — Handoffs, Empfehlungen, Audit-Log

Plus das **KI-Analyse-Cockpit** als Top-Eintrag (eine zentrale Berichts-Anlaufstelle).

---

## Internal-Test-Mode

Das System ist aktuell im **Internal-Test-Mode** — Sie als Eigentuemer sind primaerer Test-User vor produktivem Einsatz mit Kunden-Daten. Diese Anleitung beschreibt den **Code-Side-Stand**. Pre-Customer-Live werden:

- Anwaltspruefung der Datenschutz- und KI-Texte erfolgen
- Sprachregeln (DSGVO-konforme Einwilligungstexte) finalisiert
- Audio-Transkription auf Azure-EU-Whisper umgeschaltet (aktuell openai-default als Internal-Test)

Details siehe `/docs/COMPLIANCE.md`.

---

## Naechste Schritte

1. Starten Sie mit **[Mein Tag](mein-tag.md)** — das ist Ihre tagliche Anlaufstelle.
2. Bei Fragen zur KI: **[KI optimal nutzen](ki-usage.md)**.
3. Vor erster Pipeline-Arbeit: **[Pipeline](pipeline.md)**.

Voice-Over-Skripte fuer Tutorial-Videos finden Sie unter `/deliverables/user-guide/voice-over/`.
Playwright-Screencap-Script unter `/deliverables/user-guide/screencaps.spec.ts`.
