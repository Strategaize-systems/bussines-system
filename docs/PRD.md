# Product Requirements Document

## Purpose

Das Strategaize Business System ist eine interne Business-Operations-Plattform, die Marketing, Lead Generation und CRM in einem skill-gesteuerten System vereint. Claude Code Skills erledigen die operative Arbeit (Content erstellen, Leads recherchieren, Pipeline managen), ein Next.js Cockpit liefert Sichtbarkeit und Steuerung. Pro Firma anpassbar, B2B-fokussiert, keine SaaS, keine API-Kosten dank Claude Max Subscription.

## Vision

Ein einziger Ort, von dem aus der Eigentümer sein gesamtes Business Development steuert: Content erstellen, Leads generieren, Pipeline bearbeiten, Proposals senden, Rechnungen schreiben — ohne zwischen verschiedenen Tools hin- und herzuspringen. Die Plattform wächst mit: neue Skills können jederzeit hinzugefügt, getestet und entfernt werden. Pro Firma wird das System mit eigenem Brand System und eigenen Skills angepasst.

## Target Users

### Primär: Eigentümer (Single User V1)
- Nutzt das System täglich für Marketing, Lead Gen und Pipeline-Management
- Kein Designer — alles muss prompt-basiert funktionieren
- Arbeitet in V1 direkt über Claude Code mit Skills, Cockpit zeigt Status
- B2B-Beratung/Advisory für KMU

### Später: Mitarbeiter (V2+)
- Vertrieb und Marketing könnten getrennt arbeiten
- Supabase Auth + RLS sind von Anfang an vorbereitet

## Problem Statement

Der Eigentümer betreibt mehrere B2B-Beratungsfirmen und muss täglich:
- Marketing-Content erstellen (Blog, LinkedIn, Ads, Proposals)
- Leads identifizieren und qualifizieren (Endkunden + Multiplikatoren)
- Eine Sales-Pipeline pflegen (wo steht wer, was ist der nächste Schritt)
- Dokumente und Vorlagen pro Kontakt verwalten
- Brand-Konsistenz über mehrere Firmen/Projekte sicherstellen

Aktuell gibt es kein zentrales System dafür. Die Arbeit verteilt sich über mehrere Tools ohne Zusammenhang.

## V1 Scope

V1 liefert den CRM-Kern, das Basis-Cockpit und die ersten Marketing-Skills. Arbeitsweise ist Claude Code direkt (wie Dev System), das Cockpit zeigt Status und Daten.

### FEAT-001: CRM-Datenbasis
Kontakte, Firmen, Tags, Notizen, Aktivitäten und Dateien/Dokumente in Supabase verwalten. NextCRM als Codequelle für Datenmodell und UI-Komponenten, Prisma durch Supabase-Client ersetzt.

**Acceptance Criteria:**
- Kontakte anlegen, bearbeiten, löschen, suchen
- Firmen anlegen mit zugeordneten Kontakten
- Tags vergeben (frei definierbar)
- Notizen und Aktivitäten pro Kontakt erfassen (Anruf, E-Mail, Meeting, Notiz)
- Dateien/Dokumente pro Kontakt hochladen und verwalten (Supabase Storage)
- Kontakt-Detailseite zeigt alle zugehörigen Daten auf einen Blick

### FEAT-002: Pipeline-Management
Zwei getrennte Kanban-Pipelines (Endkunden und Multiplikatoren) mit konfigurierbaren Stages.

**Acceptance Criteria:**
- Kanban-Board mit Drag & Drop
- Zwei separate Pipelines: Endkunden und Multiplikatoren
- Pipeline-Stages konfigurierbar (Name, Reihenfolge, Farbe)
- Kontakt/Deal einer Pipeline zuordnen
- Deal-Karte zeigt: Kontakt, Firma, Stage, letzte Aktivität, nächste Aktion
- Statusübergänge werden als Aktivität protokolliert
- Filter: nach Stage, nach Tag, nach letzter Aktivität

### FEAT-003: Business Cockpit Dashboard
Übersichts- und Einstiegs-Dashboard im Cockpit. Zeigt den aktuellen Stand und ermöglicht Navigation zu allen Bereichen.

**Acceptance Criteria:**
- Pipeline-Zusammenfassung (wie viele Deals pro Stage, getrennt nach Pipeline)
- Letzte Aktivitäten (chronologisch, über alle Kontakte)
- Nächste Aktionen / offene Follow-ups
- Redaktionskalender: einfache Tabellen- oder Kalender-Ansicht mit geplanten Content-Einträgen
- Quick-Links zu: Kontakte, Pipeline Endkunden, Pipeline Multiplikatoren, Kalender
- Responsiv, shadcn/ui, Strategaize-Styleguide-konform

### FEAT-004: Kern-Marketing-Skills
5-8 Marketing-Skills im Strategaize-Skill-Format, adaptiert aus Open-Source-Libraries. Funktionieren in Claude Code direkt (Max Subscription).

**Acceptance Criteria:**
- Jeder Skill hat eine SKILL.md im Strategaize-Format
- Skills sind über Claude Code als `/skill-name` aufrufbar
- Skill-Output wird als Datei gespeichert (Markdown, Text, oder strukturiert)
- Folgende Skills sind V1:

| Skill | Quelle | Funktion |
|---|---|---|
| `/content-strategy` | coreyhaines31 | Content-Pillars, Topic Clusters, Redaktionskalender planen |
| `/copywriting` | coreyhaines31 | Conversion Copywriting für Web-Texte |
| `/blog-post` | coreyhaines31 (content-strategy) + kostja94 (article) | Blog-Beitrag generieren mit SEO |
| `/linkedin-post` | kostja94 (linkedin) | LinkedIn-Post mit Plattform-Specs |
| `/cold-email` | coreyhaines31 | B2B Cold Outreach E-Mail-Sequenzen |
| `/sales-enablement` | coreyhaines31 | Pitch Decks, One-Pager, Objection Docs, Proposals |
| `/create-proposal` | zubair-trabzada (market-proposal) | Client Proposal mit Pricing, ROI, Follow-up |
| `/competitor-analysis` | zubair-trabzada (market-competitors) | Wettbewerbs-Analyse mit SWOT |

### FEAT-005: Brand System
Pro Firma ein Brand System generieren: Brand Guide → Style Guide → Design Tokens → Canva Brand Kit Anleitung. Basierend auf ui-ux-pro-max-skill (adaptiert).

**Acceptance Criteria:**
- `/create-brand-system` Skill vorhanden und aufrufbar
- Input: Firmenname, Logo-Beschreibung, Kernfarben, Branche, Zielgruppe, Tonalität
- Output: `brand-guide.md` (Positionierung, Tonalität, Visual Identity, Messaging)
- Output: `style-guide.md` im Strategaize-Format (konvertiert aus ui-ux-pro-max Output)
- Output: `design-tokens.json` + `design-tokens.css` (3-Layer Token-Architektur)
- Output: `canva-brand-kit.md` (Hex-Codes, Fonts, Spacing für manuelles Canva-Setup)
- Alle Outputs unter `/brand/{firmenname}/` abgelegt
- Andere Marketing-Skills lesen das Brand System automatisch als Kontext

## Out of Scope V1

| Was | Warum nicht V1 |
|---|---|
| n8n-Workflow-Orchestrierung | Erst wenn Skills manuell erprobt sind (V2/V3) |
| Cockpit-Buttons → automatische Skill-Ketten | Infrastruktur-Aufwand, setzt stabile Skills voraus (V2) |
| Spracheingabe / lokales LLM | Eigene Architektur (V4) |
| LinkedIn API / Postiz Publishing | Erst wenn Content-Erstellung stabil (V2) |
| Lead-Scoring | Setzt genug Daten voraus (V3) |
| E-Mail-Marketing-Automatisierung | V3, Listmonk/Dittofeed |
| Rechnungserstellung + Zahlungs-Check | V3 |
| Bank-API / Buchhaltungs-Übergabe | V3+ |
| Kunden-Übergabe an operatives System | V3 |
| Content-Performance-Tracking | V4 |
| AI-Pipeline-Vorschläge | V4 |
| Multi-User mit Rollen | V2+ (Supabase Auth/RLS vorbereitet) |

## Constraints

1. **Kein SaaS** — rein interne Nutzung, Single User in V1
2. **Claude Max** — keine API-Kosten, alle AI-Arbeit über Max Subscription
3. **Self-Hosted** — separater Hetzner-Server mit Coolify
4. **Supabase** — Auth, Storage, RLS, PostgreSQL (self-hosted oder Cloud)
5. **NextCRM Fork** — Prisma → Supabase umstellen
6. **B2B-Fokus** — LinkedIn, Website, Blog, E-Mail. Kein TikTok/Instagram/B2C
7. **Prompt-basiert** — kein manuelles Design, alles AI-generiert
8. **DSGVO** — besonders bei Lead-Recherche und Kontaktdaten

## Risks / Assumptions

| Risiko | Mitigation |
|---|---|
| NextCRM Prisma→Supabase Umstellung aufwändiger als erwartet | Atomic CRM als Supabase-Referenz, ggf. nur Datenmodell übernehmen statt vollständigen Fork |
| Skill-Adaptation aus Open-Source-Libraries erfordert mehr Arbeit als gedacht | Mit 2-3 Skills starten, Rest iterativ |
| ui-ux-pro-max-skill Python-Abhängigkeit passt nicht zur Node-Infrastruktur | Nur Datenbanken + Skill-Texte nutzen, Python-Scripts optional |
| Single-User-Fokus V1 erschwert späteren Multi-User-Umbau | Supabase Auth/RLS von Anfang an (DEC-006), auch wenn V1 Single-User |

## Success Criteria

V1 ist erfolgreich wenn:
1. Kontakte und Firmen können im Cockpit verwaltet werden
2. Zwei Pipelines (Endkunden + Multiplikatoren) funktionieren als Kanban
3. Dashboard zeigt Pipeline-Status, letzte Aktivitäten, nächste Aktionen
4. Mindestens 5 Marketing-Skills funktionieren in Claude Code
5. Brand System kann für eine Firma generiert werden (Brand Guide + Tokens)
6. Redaktionskalender zeigt geplante Content-Einträge
7. Alles läuft self-hosted auf Hetzner

## Delivery Mode

**Internal Tool** — pragmatische QA, genug um Chaos zu vermeiden, Fokus auf Funktionalität und Bedienbarkeit.
