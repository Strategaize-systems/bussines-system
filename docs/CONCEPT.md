# Strategaize Business System — Konzept

> Discovery-Input-Dokument. Stand: 2026-03-26.
> Detail-Recherche: [RESEARCH.md](RESEARCH.md) | Skill-Vergleich: [SKILL_COMPARISON.md](SKILL_COMPARISON.md)

---

## 1. Was ist das?

Eine interne Business-Operations-Plattform, die Marketing, Lead Generation und CRM in einem System vereint. Gebaut nach dem gleichen Pattern wie das Strategaize Dev System:

- **Claude Code Skills** (Max-Subscription) erledigen die eigentliche Arbeit — keine API-Kosten
- **Business Cockpit** (Next.js) liefert Sichtbarkeit und Steuerung
- **Pro Firma anpassbar** — Basis-System mit gemeinsamen Skills, firma-spezifische Erweiterungen in separaten Repos
- **Externe Systeme via API / n8n** wo sinnvoll — nicht alles selbst bauen

## 2. Für wen?

Nicht SaaS. Rein internes Tool für den Eigentümer und ggf. spätere Mitarbeiter, um die eigenen Firmen (B2B-Beratung/Advisory für KMU) operativ voranzubringen.

Kontext: B2B. Zielplattformen sind LinkedIn, Website, Blog, E-Mail — nicht TikTok, Instagram, B2C-Massenmarketing.

## 3. Was soll es können?

### Modul 1: Marketing & Content Engine
- AI-gestützte Content-Erstellung (Texte, Ads, Blog-Posts, Video-Konzepte, Präsentationen)
- Vorlagen-System (Anschreiben, Proposals, Ad-Templates, Blog-Vorlagen)
- Redaktionskalender / Content-Planung
- Publishing an Kanäle (LinkedIn API, Website, etc.)
- Style Guides und Brand-Richtlinien pro Firma

### Modul 2: Lead Generation & Outreach
- Leads ableiten aus Marketing-Aktivitäten
- Lead-Recherche (externe APIs, DSGVO-konform)
- Zwei Zielgruppen-Kanäle:
  - **Endkunden** — direkte Ansprache
  - **Multiplikatoren** — z.B. Steuerberater, die unsere Zielkunden haben
- Outreach-Tracking (E-Mail extern via IMAP/SMTP, Status intern)
- Lead-Scoring basierend auf Aktivitäten und Interaktionen

### Modul 3: CRM & Pipeline
- Kontakt- und Firmenverwaltung
- Kanban-Pipeline (à la Pipedrive) — getrennt für Endkunden und Multiplikatoren
- Dokumente, Vorlagen, Vorschläge pro Kontakt
- Statusverfolgung: wo steht wer, was ist der nächste Schritt
- Einfache Rechnungserstellung (PDF-Templates)
- Zahlungsstatus-Prüfung (Konto-API)
- Übergabe an Buchhaltungssystem (externe API)

### Modul 4: Brand & Design System
- **Brand Guide als Vorschaltung** — bevor Marketing-Materialien erstellt werden können, muss pro Firma ein Brand Guide existieren (Positionierung, Tonalität, Zielgruppe, Visual Identity, Farbwelt, Typografie)
- Der Brand Guide ist Voraussetzung für alles andere: Style Guide, Design Tokens, Marketing-Vorlagen
- Reihenfolge pro Firma: Brand Guide → Style Guide → Design Tokens (theme.ts, globals.css) → Canva Brand Kit → Marketing-Vorlagen
- Gilt für jedes neue Projekt/Firma (Strategaize, ImmoCheck Heft, zukünftige Projekte)
- Muss prompt-basiert funktionieren — kein manuelles Design nötig

## 4. Work Cockpit — Tagesgeschäft

Das Business Cockpit ist nicht nur eine Übersichts-Seite, sondern ein **operatives Arbeits-Cockpit** für den Tagesablauf. Der Eigentümer arbeitet primär aus dem Cockpit heraus.

### Tagesablauf-Bereiche

| Bereich | Was passiert hier |
|---|---|
| **Vorbereitung & Aufbau** | Marketing-Materialien erstellen, Content planen, Vorlagen vorbereiten, Brand-Assets pflegen |
| **Kunden gewinnen** | Pipeline bearbeiten, Leads qualifizieren, Outreach starten, Follow-ups, Proposals erstellen |
| **Kunde wird aktiv** | Rechnung erstellen (Daten sind schon im CRM), Zahlungsstatus prüfen, Buchhaltungs-Übergabe |
| **Kunde an operatives System übergeben** | Wenn bezahlt → Kundendaten an das jeweilige operative System übergeben (konfigurierbar pro Firma/Projekt) |

### Cockpit-Aktionen

Aus dem Cockpit heraus muss der Eigentümer Workflows starten können — nicht durch manuelles Aufrufen einzelner Skills, sondern durch **einfache Aktionen** die mehrere Schritte automatisch orchestrieren:

Beispiel: "Neuen Blog-Beitrag erstellen"
```
1. Eigentümer klickt "Blog-Beitrag erstellen" im Cockpit
2. Eingabe: Thema, Zielgruppe, Kernaussagen (per Text oder Spracheingabe über lokales LLM)
3. System führt automatisch aus:
   → Skill 1: Keyword-Research + SEO-Analyse
   → Skill 2: Blog-Text generieren (mit Brand-Richtlinien)
   → Skill 3: LinkedIn-Zusammenfassung ableiten
   → Skill 4: Social-Media-Post für Publishing vorbereiten
4. Rückfragen kommen zurück ins Cockpit (oder LLM-Interface)
5. Eigentümer gibt Feedback / Freigabe
6. Finaler Output wird über n8n an Kanäle verteilt (Blog, LinkedIn, etc.)
```

### Multi-Step-Workflow-Prinzip

Workflows bestehen aus **verketteten Skills** die automatisch nacheinander laufen. Der Eigentümer gibt nur den Impuls und trifft Entscheidungen an Rückfrage-Punkten:

```
┌─────────────────────────────────────────┐
│          Cockpit (Startpunkt)           │
│  Button: "Blog erstellen"              │
│  Eingabe: Thema / Sprachnotiz          │
└──────────────┬──────────────────────────┘
               ↓
┌──────────────┴──────────────────────────┐
│     Lokales LLM / Eingabe-Interface     │
│  Sprache → Text, Strukturierung,        │
│  Grundideen aufbereiten                 │
└──────────────┬──────────────────────────┘
               ↓ (via n8n)
┌──────────────┴──────────────────────────┐
│     Skill-Kette (automatisch)           │
│  Skill 1 → Skill 2 → Skill 3 → ...    │
│  Rückfragen → zurück ins Cockpit/LLM   │
└──────────────┬──────────────────────────┘
               ↓
┌──────────────┴──────────────────────────┐
│     Freigabe im Cockpit                 │
│  Review, letzte Anpassungen, Go         │
└──────────────┬──────────────────────────┘
               ↓ (via n8n)
┌──────────────┴──────────────────────────┐
│     Publishing / Aktion                 │
│  Blog → Website API                    │
│  LinkedIn → LinkedIn API / Postiz      │
│  Rechnung → PDF → Buchhaltungs-API     │
│  Neuer Kunde → Operatives System (konfig.) │
└─────────────────────────────────────────┘
```

### Eingabe-Modus

Der Eigentümer will nicht in Claude Code tippen, sondern:
- Im Cockpit auf einen Button klicken
- Thema/Idee eingeben — entweder als Text oder per **Spracheingabe über ein lokales LLM** (wie bei einem Chat)
- Feedback und Entscheidungen im selben Interface treffen
- Das Ergebnis im Cockpit sehen und freigeben

Die Brücke zwischen Cockpit-UI und Claude Code Skills läuft über **n8n** als Orchestrator: Cockpit → n8n → Skill-Kette → n8n → Cockpit (Rückfrage/Ergebnis).

### Kunden-Lifecycle im Cockpit

```
Lead (Marketing)  →  Qualifiziert (Pipeline)  →  Proposal gesendet
        ↓                                              ↓
   Nicht qualifiziert                           Angenommen / Abgelehnt
   (zurück in Nurture)                                 ↓
                                                Rechnung erstellt
                                                (Daten aus CRM)
                                                       ↓
                                                Bezahlt? (Check via API)
                                                       ↓
                                         Ja: Kunde → Operatives System
                                         (konfigurierbar: welches System, welche Daten)
                                                       ↓
                                              Buchhaltungs-Übergabe
```

Jeder dieser Schritte soll aus dem Cockpit heraus angestoßen werden können.

## 5. Architektur-Pattern (erweitert)

```
┌──────────────────────────────────────────────────────────┐
│              Business Cockpit (Next.js)                   │
│  Work-Dashboard · Pipeline · Content-Kalender · Aktionen │
│  Kontakte · Leads · Dokumente · Status · Freigaben       │
│          (Arbeits- und Steuerungsschicht)                 │
└────────────┬───────────────────────┬─────────────────────┘
             │ liest/schreibt        │ Eingabe/Rückfragen
┌────────────┴──────────────┐  ┌─────┴─────────────────────┐
│   Strukturierte Daten     │  │  Lokales LLM (optional)   │
│   JSON · MD · PostgreSQL  │  │  Sprache → Text           │
└────────────┬──────────────┘  │  Ideen strukturieren      │
             │                 └─────┬─────────────────────┘
             │ bearbeitet durch      │
┌────────────┴───────────────────────┴─────────────────────┐
│            n8n (Workflow-Orchestrierung)                   │
│  Verkettet Skills · Routet Rückfragen · Verteilt Output  │
└────────────┬─────────────────────────────────────────────┘
             │ ruft auf
┌────────────┴─────────────────────────────────────────────┐
│             Claude Code Skills (Max)                      │
│  Fluides System: Skills können jederzeit hinzugefügt,    │
│  getestet, angepasst oder entfernt werden.               │
└────────────┬─────────────────────────────────────────────┘
             │ verbindet sich mit
┌────────────┴─────────────────────────────────────────────┐
│             Externe Systeme (via API)                     │
│  LinkedIn · E-Mail · Buchhaltung · Website · Postiz      │
│  Listmonk · Canva · Operative Systeme (pro Firma) · Bank │
└──────────────────────────────────────────────────────────┘
```

## 6. Fluides Skill-System

Das Skill-System ist **kein starres Feature-Set**, sondern eine lebende Sammlung:

- **Kern-Skills** sind immer aktiv (Content erstellen, Pipeline updaten, Proposal erstellen)
- **Optionale Skills** können pro Firma oder pro Projekt aktiviert werden
- **Experimentelle Skills** können jederzeit hinzugefügt und getestet werden — funktioniert es, bleibt es; funktioniert es nicht, wird es entfernt
- **Das Cockpit muss diese Fluidität abbilden** — keine starre Navigation, sondern eine anpassbare Skill-Übersicht, ggf. nach Themenbereichen gruppiert (Marketing, Leads, Pipeline, Admin)

### Skill-Quellen

Es existieren bereits Open-Source Skill-Libraries, die als Grundlage adaptiert werden können:

| Quelle | Was wir übernehmen | Stärke |
|---|---|---|
| **coreyhaines31/marketingskills** (MIT) | B2B-Kern: Cold Email, Sales Enablement, RevOps, Content Strategy, Pricing | Tiefste Skill-Qualität (500-2000 Zeilen) |
| **zubair-trabzada/ai-marketing-claude** (MIT) | Proposal, Audit, Competitors, Funnel, Reports + Orchestrator-Pattern | Produziert fertige Dateien, Strategaize-nahes Pattern |
| **kostja94/marketing-skills** (MIT) | Keyword Research, LinkedIn, E-Mail Deliverability, Seiten-Generatoren | Breiteste Abdeckung (160+ Skills), SEO-Tiefe |

### Skills, die selbst gebaut werden müssen

- CRM-Integration-Workflows (Pipeline-Updates über Skills)
- Multiplikatoren-Ansprache (Steuerberater, Verbände etc.)
- Proposal Follow-up Automation
- Client Onboarding (Post-Sale)
- Thought-Leadership-Kalender
- Brand System Generator (Style Guide + Tokens pro Firma)
- Rechnungserstellung + Buchhaltungs-Übergabe

Detaillierter Skill-Vergleich mit "Best Of"-Liste: siehe [SKILL_COMPARISON.md](SKILL_COMPARISON.md)

## 7. Brand & Design System Workflow

Der Eigentümer ist kein Designer. Alles muss prompt-basiert funktionieren.

### Aufteilung nach Output-Typ

| Output | Tool | Warum |
|---|---|---|
| Landing Pages, Hero, CTA | **Claude Code** (Skill → HTML/React) | Code-basiert, deployfähig |
| E-Mail-Templates | **Claude Code** (Skill → HTML) | Template-Engine |
| PDFs, One-Pager, Reports | **Claude Code** (Skill → Markdown → PDF) | Template-basiert |
| LinkedIn-Text-Posts | **Claude Code** (Skill) | Reiner Text |
| Pitch Decks / Slides | **Canva** (Brand Kit + Prompt) | Visuell, "Magic Design" |
| Social Media Graphics | **Canva** (Brand Kit + Prompt) | Visuell, viele Vorlagen |
| LinkedIn Carousel | **Canva** (Brand Kit + Prompt) | Visuell, Swipe-Format |
| Meeting Backgrounds | **Canva** (einmalig) | Einmalig erstellen |
| Logo-Varianten | **AI-generiert** (ChatGPT/DALL-E/Canva) | Wie bisher |

### Workflow pro neue Firma

```
1. /create-brand-system
   → Input: Firmenname, Logo, Kernfarben, Branche, Zielgruppe, Tonalität
   → Output: brand-guide.md + theme.ts + globals.css + canva-brand-kit.md

2. Canva: Brand Kit einrichten (Farben, Fonts, Logo hochladen)

3. /create-marketing-templates
   → Landing Page, E-Mail, LinkedIn Templates (Code-basiert)

4. Canva/Figma: Visuelles (Präsentationen, Social Graphics) mit Brand Kit

5. Skills nutzen Templates automatisch für Content-Erstellung
```

### Grundlage: ui-ux-pro-max-skill (Open Source)

Als Basis für den Brand System Workflow wird das Repository [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT, ~52k Stars) eingesetzt:

| Skill aus dem Repo | Was wir nutzen |
|---|---|
| `brand` | Brand Guide generieren → `brand-guidelines.md` + `design-tokens.json` + `design-tokens.css` |
| `design-system` | 3-Layer Token-Architektur (Primitive → Semantic → Component) + Tailwind-Integration |
| `banner-design` | Marketing-Banner (Social Media, Google Ads, Website Heroes) |
| `slides` | HTML-Präsentationen (Pitch Decks, Sales Decks) |
| `ui-styling` | UI-Styling mit shadcn/ui + Tailwind |

**Datenbanken aus dem Repo:** 161 Farbpaletten, 57 Font-Pairings, 99 UX-Richtlinien — werden als Referenz-Material genutzt.

**Was wir obendrauf bauen:**
- Adapter der Output ins Strategaize-Format konvertiert (`strategaize_styleguide.md`)
- Eigene Marketing-Templates (E-Mail, Dokumente, One-Pager — nicht im Repo enthalten)
- Per-Firma-Verwaltung (Repo ist generisch, wir brauchen firma-spezifisch)

**Was wir NICHT nutzen:** Logo-/CIP-Generierung (Gemini-abhängig) — Logos werden wie bisher manuell über Canva/Figma/AI-Tools erstellt.

### Bestehendes Design System (Referenz)

Für das Dev System / Cockpit existiert bereits ein 3-Tier-System:
- `strategaize_styleguide.md` — 596 Zeilen, vollständiger Brand Guide
- `theme.ts` — TypeScript Design Tokens
- `globals.css` — CSS Custom Properties

Referenzkopie liegt unter `/docs/STYLE_GUIDE_REFERENCE.md`. Dient als Vorlage für den Format-Adapter.

### Design-Seiten-Struktur (pro Firma)

| Seite | Inhalt | Erstellt durch | Status |
|---|---|---|---|
| 01 — Brand Core | Logo, Farben, Typography | Canva/Figma (manuell) | Pro Firma neu |
| 02 — Product UI | Komponenten, Buttons, Tables | Claude Code | Basis vorhanden |
| 03 — Product Screens | Dashboard, Pages | Claude Code | Basis vorhanden |
| 04 — Marketing Web | Landing Pages, Hero, CTA | Claude Code → Figma Review | Neu bauen |
| 05 — Presentations | Pitch Decks, Slides | Canva (prompt-basiert) | Neu bauen |
| 06 — Reports/PDFs | One-Pager, Dokumente | Claude Skill → PDF | Neu bauen |
| 07 — Meeting Assets | Backgrounds, Screens | Canva (einmalig) | Neu bauen |
| 08 — Social & Content | LinkedIn, Carousel | Claude Skill (Text) + Canva (Visuell) | Neu bauen |
| 09 — Charts & Data Viz | Diagramme, KPIs | Claude Code (Recharts etc.) | Teilweise vorhanden |
| 10 — Templates | Starter Kits | Beides | Neu bauen |

## 8. Externe Systeme — Build vs. Buy

| Funktion | Selbst bauen | Extern anbinden | Grund |
|---|---|---|---|
| Kontakte/Firmen/Pipeline | Ja (Cockpit + Skills) | — | Kern der Plattform |
| Kanban-Pipeline | Ja (Cockpit UI) | — | Einfach, zentrale UX |
| Dokumente/Vorlagen | Ja (Skills + Templates) | — | AI-Generation = Kernwert |
| Content-Erstellung | Ja (Claude Skills) | — | Differentiator |
| Redaktionskalender | Ja (simpel) | — | 1 Tabelle + Kalender-View |
| Brand System | Ja (Skill + Tokens) | Canva (visuell) | Hybrid: Code + Visuell |
| LinkedIn-Publishing | — | LinkedIn API / MCP | Gut dokumentierte API |
| Social Publishing (Multi) | — | Postiz (self-hosted) | 30+ Plattformen, API |
| E-Mail senden/empfangen | — | IMAP/SMTP extern | Selbst bauen zu aufwändig |
| E-Mail-Marketing | — | Listmonk / Dittofeed | Self-hosted E-Mail-Engine |
| E-Mail-Tracking | — | Mailgun o.ä. | Open/Click-Tracking |
| Lead-Recherche | Teilweise | Apollo.io / Hunter.io | DSGVO, extern einfacher |
| Blog-Publishing | — | Website-API | Nicht nochmal ein CMS |
| Workflow-Orchestrierung | — | n8n (self-hosted) | 400+ Integrationen, Klebe-Schicht |
| Projektmanagement | Nein | Strategaize / Jira / Linear | Bereits vorhanden |
| Kalender | — | Google/Outlook CalDAV | Nicht nachbauen |
| Buchhaltung | — | API zum Buchhaltungssystem | Übergabe, nicht replizieren |
| Rechnungen | Ja (einfach) | — | PDF-Generation über Templates |
| Zahlungsstatus | — | Bank-API / Buchhaltungs-API | Nur Abfrage |
| Visuelle Marketing-Assets | — | Canva (Brand Kit) | Prompt-basiert, kein Design nötig |
| Kunden-Übergabe an operatives System | — | Konfigurierbar (API pro Firma/Projekt) | Wenn Kunde bezahlt → Daten ans jeweilige operative System übergeben |
| Spracheingabe / Chat | — | Lokales LLM (Ollama o.ä.) | Ideen einsprechen, Strukturierung |
| Workflow-Orchestrierung (Multi-Step) | Teilweise (Cockpit-Buttons) | n8n (Skill-Ketten) | Cockpit → n8n → Skills → Cockpit |

## 9. CRM-Grundlage

Zwei MIT-lizensierte Open-Source-Projekte als mögliche Code-Basis für den Cockpit-CRM-Teil:

| | NextCRM (Favorit) | Atomic CRM (Alternative) |
|---|---|---|
| Tech | Next.js 16, Prisma, PostgreSQL, shadcn/ui, Tailwind v4 | React, shadcn/ui, Supabase, Vite |
| Features | Accounts, Contacts, Leads, Invoicing, E-Mail, AI, MCP-Server | Kontakte, Deals, Kanban, Notizen |
| Umfang | Umfangreich | ~15k LOC, schlank |
| Lizenz | MIT | MIT |
| Status | Eigentümer evaluiert | Alternative |

Detail-Evaluierung: siehe [RESEARCH.md](RESEARCH.md)

## 10. Verzeichnisstruktur

### Basis-System

```
strategaize-business-system/
├── CLAUDE.md                         ← Regeln für Business-Skills
├── skills/
│   ├── marketing/                    ← Content, SEO, Social, Ads
│   ├── leads/                        ← Recherche, Scoring, Outreach
│   ├── pipeline/                     ← Pipeline, Proposals, Reviews
│   ├── admin/                        ← Rechnungen, Buchhaltung
│   └── brand/                        ← Brand System, Style Guide, Templates
├── data/
│   ├── contacts.json
│   ├── pipeline.json
│   ├── content-calendar.json
│   └── templates/
├── docs/
│   ├── STATE.md
│   ├── CONCEPT.md                    ← dieses Dokument
│   ├── DECISIONS.md
│   ├── RESEARCH.md                   ← Detail-Recherche
│   ├── SKILL_COMPARISON.md           ← Skill-Vergleich
│   └── STYLE_GUIDE_REFERENCE.md      ← Referenz vom Dev System
├── planning/
│   ├── roadmap.json
│   └── backlog.json
├── features/
│   └── INDEX.md
├── slices/
│   └── INDEX.md
├── reports/
└── cockpit/                          ← Next.js Dashboard
```

### Pro Firma (Erweiterung)

```
firma-xyz-business/
├── CLAUDE.md                         ← Erbt Basis + Firma-Anpassungen
├── skills/                           ← Firma-spezifische Skills
├── brand/                            ← Brand Guide, Tokens, Assets
├── data/                             ← Firma-Daten (Kontakte, Pipeline)
└── cockpit/                          ← Angepasstes Dashboard
```

## 11. Phasen-Plan

### Phase 1 — CRM-Kern (V1)
- Kontakte, Firmen, Tags, Notizen, Aktivitäten
- Zwei Pipelines (Endkunden + Multiplikatoren) mit Kanban
- Dokumente/Dateien pro Kontakt
- Basis-Cockpit-Dashboard
- CRM-Grundlage evaluieren und forken

### Phase 2 — Content & Marketing Engine (V2)
- Marketing-Skills adaptieren aus bestehenden Libraries (Best-Of-Auswahl)
- AI-gestützte Content-Erstellung (Blog, LinkedIn, Ads, Proposals)
- Brand System Generator (/create-brand-system)
- Vorlagen-System mit Brand-Richtlinien
- Redaktionskalender
- LinkedIn-API-Anbindung (MCP)
- Postiz self-hosted für Multi-Channel-Publishing

### Phase 3 — Lead Generation & Outreach (V3)
- Lead-Scoring basierend auf Marketing-Aktivitäten
- Lead-Recherche über externe APIs (DSGVO-konform)
- Outreach-Tracking (wer kontaktiert, Status, Follow-ups)
- Multiplikatoren-Kanal (Steuerberater, Verbände)
- Listmonk oder Dittofeed für E-Mail-Outreach
- Einfache Rechnungserstellung + Buchhaltungs-Übergabe

### Phase 4 — Intelligence Layer (V4)
- Pipeline-Performance-Analyse
- Automatische Nächste-Aktion-Vorschläge pro Lead
- Content-Performance-Tracking
- Reporting-Dashboard
- n8n als zentrale Workflow-Orchestrierung

## 12. Schlüssel-Prinzipien

1. **Orchestrieren, nicht replizieren** — externe Tools nutzen wo sinnvoll
2. **Skills statt API** — Claude Max, keine API-Kosten
3. **Cockpit = Sichtbarkeit** — die Intelligenz sitzt in den Skills
4. **Fluides Skill-System** — Skills können jederzeit hinzugefügt, getestet und entfernt werden
5. **Pro Firma anpassbar** — gemeinsame Basis, spezifische Erweiterungen
6. **Prompt-basiert, nicht Designer-abhängig** — alles muss ohne manuelle Design-Arbeit funktionieren
7. **Phasenweise aufbauen** — CRM-Kern zuerst, dann erweitern
8. **DSGVO von Anfang an** — besonders bei Leads und Scraping
9. **Einfach wo möglich** — interne Plattform, nicht SaaS-Perfektion nötig
10. **B2B-Fokus** — LinkedIn, Website, Blog, E-Mail. Kein TikTok, kein B2C-Massenmarketing.

## 13. Status

- Konzept: fertig (2026-03-26)
- Recherche: abgeschlossen (2026-03-26, ergänzt 2026-03-27)
- Skill-Vergleich: abgeschlossen (2026-03-26)
- Discovery: abgeschlossen (2026-03-26)
- Requirements: abgeschlossen (2026-03-27) — PRD erstellt, 5 V1-Features definiert
- Architecture: abgeschlossen (2026-03-27) — 9 Tabellen, Docker Compose, Dual-URL, Blueprint-Pattern
- Slice-Planning: abgeschlossen (2026-03-27) — 11 Slices, ~50 Micro-Tasks
- Nächster Schritt: **SLC-001 /frontend** (Next.js Scaffolding)
