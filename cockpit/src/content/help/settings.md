# Settings — System-Konfiguration

> Guide 5 von 12. **Wer:** Admin, Teamlead. **Dauer:** ~8 Min.

## Ziel

Sie wissen, wo Sie System-Konfigurationen einstellen und welche Settings-Tile fuer welche Rolle sichtbar ist.

## Voraussetzungen

- Rolle Admin oder Teamlead

## Aufbau der Seite

Bei Klick auf "Einstellungen" in der Sidebar oder als Tile-Page (`/settings`) sehen Sie eine **3-Section-Struktur** mit Tiles:

```
┌─────────────────────────────────────┐
│  PERSOENLICH (alle Rollen)          │
│  ├── Ich (Profil)                   │
│  ├── Arbeitsstunden                 │
│  └── Mailbox-Einstellungen          │
├─────────────────────────────────────┤
│  VERTRIEB (Admin + Teamlead)        │
│  ├── Pipelines                      │
│  ├── Produkte                       │
│  ├── Workflow-Automation            │
│  ├── NL-Regel-Historie              │
│  ├── Kampagnen                      │
│  ├── E-Mail-Templates               │
│  ├── Zahlungsbedingungen            │
│  └── Briefing-Konfig                │
├─────────────────────────────────────┤
│  SYSTEM (nur Admin)                 │
│  ├── Branding                       │
│  ├── Compliance-Templates           │
│  ├── Meetings (Jitsi-Config)        │
│  ├── Rollen-Verwaltung (Team)       │
│  └── Ziele + KPI-Targets            │
└─────────────────────────────────────┘
```

Tiles, die fuer Ihre Rolle nicht sichtbar sind, werden ausgeblendet. Solopreneur (team_size=1) sieht keine TEAM-Sidebar-Section, aber die Tiles bleiben in der System-Section sichtbar.

## Wichtige Settings im Schnelldurchlauf

### Branding (Admin)
- Logo (max 2 MB, PNG/JPEG/SVG/WebP)
- Primaer-/Sekundaerfarbe (Hex, Toggle pro Farbe — NULL = nicht aktiv)
- Schriftfamilie (System/Inter/Sans/Serif)
- Footer-Text (Markdown)
- Kontakt-Block (Name, Firma, Telefon, Web)
- VAT-ID (Format NL: `NL\d{9}B\d{2}`)
- business_country (NL oder DE — entscheidet Default-Steuersatz)

**Wichtig:** Branding wird in jeder ausgehenden E-Mail + jedem Angebot-PDF gerendert. Aenderungen wirken sofort fuer neue Inhalte.

### Pipelines (Admin + Teamlead)
- Stages pro Pipeline (Multiplikator + Opportunity)
- Pflichtfelder pro Stage definieren
- Reihenfolge per Drag&Drop

### Produkte (Admin)
- Stammdaten fuer Position-Items in Angeboten
- Preis-Snapshots (Snapshot bei Angebot-Erstellung schuetzt historische Preise)

### Workflow-Automation (Admin)
- Klick-Builder fuer Workflow-Regeln
- 3 Trigger: `deal.stage_changed`, `deal.created`, `activity.created`
- 4 Actions: `create_task`, `send_email_template`, `create_activity`, `update_field`
- Siehe [Workflow-Automation Guide](workflow-automation.md)

### NL-Regel-Historie (Admin)
- Audit-Log aller NL-Sculpt-Versuche (V7.5 NL-Builder)
- Anzeige: Klartext-Eingabe + Sculpt-Ergebnis + Cost + Status

### Kampagnen (Admin)
- Kampagnen anlegen + UTM-Konfigurationen
- Tracking-Link-Generator
- Performance-Dashboard pro Kampagne

### E-Mail-Templates (Admin)
- Wiederverwendbare Vorlagen
- Variablen-Tokens definieren

### Zahlungsbedingungen (Admin)
- Skonto-Regeln, Split-Plans
- Default-Conditions fuer neue Angebote
- Siehe [Zahlungsbedingungen-Guide](zahlungsbedingungen.md)

### Briefing-Konfig (Admin)
- Pre-Call Meeting-Briefing-Settings
- Cron-Zeit fuer automatische Briefings

### Compliance-Templates (Admin)
- 3 editierbare Texte:
  - Meeting-Einladung mit Recording-Einwilligungs-Hinweis
  - E-Mail-Footer (Datenschutz)
  - Cal.com-Buchungsflow-Text
- Defaults sind Skill-mitgeliefert, koennen je Block ueberschrieben werden
- **Wichtig:** Diese Texte sind pragmatische Standardvorlagen — vor Customer-Live sind sie anwaltlich zu pruefen (siehe `/docs/COMPLIANCE.md`)

### Meetings (Admin)
- Jitsi-Config (Public-URL, Recording-Bucket, etc.)
- JWT-Auth-Secret-Status

### Rollen-Verwaltung / Team (Admin + Teamlead)
- Siehe [Team-Verwaltung Guide](team-verwaltung.md)

### Ziele + KPI-Targets (Admin + Teamlead)
- Vertriebsziele pro Mitarbeiter (Umsatz, Deal-Count, Quote)
- KPI-Targets pro Produkt-Kategorie
- CSV-Import fuer Massendaten

## Wichtige System-Wide-Settings

### `business_country` (Branding)
NL oder DE — entscheidet:
- Default-Steuersatz fuer neue Angebote (NL=21%, DE=19%)
- Reverse-Charge-Voraussetzung
- VAT-ID-Format-Validation

### `RECORDING_RETENTION_DAYS` (ENV, nicht in UI)
Default 7 Tage. Audio-Aufnahmen werden danach automatisch aus dem Bucket geloescht. Transkripte + KI-Summaries bleiben permanent.

### `TRANSCRIPTION_PROVIDER` (ENV, nicht in UI)
Aktuell `openai` (US, Internal-Test-Mode). Vor Customer-Live: Switch auf `azure` (EU). Code-fertig per ISSUE-042.

### `BEDROCK_REGION` (ENV, nicht in UI)
`eu-central-1` (Frankfurt) — Code-Pin per DEC-211, drift wirft Startup-Exception.

## Tipps

- **Aenderungen wirken sofort** — keine Settings-Migration noetig.
- **Solopreneur** (team_size=1) sieht KEINE TEAM-Sidebar-Section, Settings/team-Tile ist sichtbar fuer Admin+Teamlead immer.
- **Settings-Pages haben jeweils eigene Permissions** — die Tile-Sichtbarkeit ist nur die erste Linie. Server-Action-Permissions sind die zweite Linie.

## Haeufige Probleme

### "Tile sichtbar, aber Klick fuehrt zu 403"
Tile-Visibility und Page-Permission koennen drift haben. Bug — Admin kontaktieren. Pre-V8.1-Stand hatte das fuer `/settings/team` (wurde mit V8.1 SLC-823 geschlossen).

### "Branding-Logo nicht in E-Mail sichtbar"
Browser-Cache. Mit `Strg+F5` aktualisieren oder warten bis Cache-Buster-Param `v=<timestamp>` neue Version zieht.

### "Workflow-Regel scheint nicht zu feuern"
Pruefen Sie:
1. Regel-Status `active` (nicht `disabled` oder `draft`)
2. Trigger-Event matched mit der ausloesenden Aktion
3. Conditions sind erfuellt
4. Cron-Fallback laeuft (automation-runner alle Minute)

## Siehe auch

- [Team-Verwaltung](team-verwaltung.md)
- [Workflow-Automation](workflow-automation.md)
- [Kampagnen](kampagnen.md)
