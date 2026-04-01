# Decisions

## DEC-001 — Skill-basiertes Pattern statt klassische Web-App
- Status: accepted
- Reason: Claude Max Subscription deckt die AI-Arbeit ab ohne API-Kosten. Skills sind leicht anpassbar (Markdown), pro Firma individualisierbar, und das Pattern ist bereits erprobt im Dev System.
- Consequence: Die eigentliche Business-Logik (Content-Erstellung, Lead-Recherche, Pipeline-Updates) läuft über Claude Code Skills, nicht über Web-App-Logik. Das Cockpit ist primär Sichtbarkeits- und Steuerungsschicht.

## DEC-002 — Interne Plattform, kein SaaS
- Status: accepted
- Reason: Plattform dient ausschließlich dem Eigentümer und späteren Mitarbeitern. Kein Multi-Tenancy, kein öffentliches Onboarding, keine externe Abrechnung nötig.
- Consequence: Deutlich reduzierter Overhead bei Auth, Billing, Scaling, Compliance. Fokus auf Funktionalität und Bedienbarkeit.

## DEC-003 — Pro Firma separat anpassbar
- Status: accepted
- Reason: Jede Firma hat andere Zielgruppen, andere Kanäle, andere Vorlagen. Ein monolithisches System wäre zu starr.
- Consequence: Basis-System liefert gemeinsame Skills und Cockpit-Grundlage. Pro Firma werden eigene Skills, Daten und ggf. Cockpit-Anpassungen in separaten Repositories verwaltet.

## DEC-004 — Externe Tools wo sinnvoll, nicht alles selbst bauen
- Status: accepted
- Reason: E-Mail, Social Media Publishing, Buchhaltung, Kalender etc. sind gelöste Probleme. Eigenentwicklung wäre unverhältnismäßig.
- Consequence: Postiz (Social Publishing), Listmonk/Dittofeed (E-Mail), n8n (Workflow-Glue), externe Buchhaltungs-APIs werden eingebunden statt nachgebaut. Eigenbau fokussiert auf Cockpit, Skill-Orchestrierung und Datenmodell.

## DEC-005 — CRM-Grundlage: NextCRM als Codebasis
- Status: accepted
- Reason: NextCRM ist MIT-lizensiert, nah am Ziel-Stack (Next.js, shadcn/ui, Tailwind v4), bringt CRM-Datenmodell, Kanban, Invoicing, E-Mail-Client und MCP-Server mit. Die Webseite ist dünn, aber die Codebasis ist solide und deckt den CRM-Kern ab. Eigenbau wäre unverhältnismäßig.
- Consequence: NextCRM wird als Codebasis für den CRM-Teil des Cockpits geforkt. Prisma wird durch Supabase ersetzt (siehe DEC-006). Atomic CRM bleibt als Referenz für Supabase-Integration.

## DEC-006 — Datenbank: Supabase statt Prisma direkt
- Status: accepted
- Reason: Supabase bringt Auth, Storage, Realtime und Row Level Security mit. Wissen wird durch andere Strategaize-Projekte aufgebaut. Wichtig für spätere Multi-User-Szenarien (Vertrieb + Marketing getrennt). Prisma aus NextCRM wird auf Supabase-Client umgestellt.
- Consequence: PostgreSQL läuft über Supabase (self-hosted oder Cloud). Auth, Rollen und RLS stehen von Anfang an zur Verfügung, auch wenn V1 nur Single-User ist.

## DEC-007 — Hosting: Separater Hetzner-Server
- Status: accepted
- Reason: Cockpit, n8n, Postiz, Listmonk, Supabase/PostgreSQL — das ist zu viel für den bestehenden Server. Business System braucht eigene Infrastruktur.
- Consequence: Eigener Hetzner-Server mit Coolify. Genaue Sizing-Entscheidung erfolgt wenn Architektur steht.

## DEC-008 — Brand System als Vorschaltung pro Firma/Projekt
- Status: accepted
- Reason: Jedes Projekt (Strategaize, ImmoCheck Heft, zukünftige Firmen) braucht ein eigenes Brand System bevor Marketing-Materialien erstellt werden können. Der Style Guide allein reicht nicht — es braucht einen vollständigen Brand Guide (Positionierung, Tonalität, Zielgruppe, Visual Identity), auf dessen Basis dann der Style Guide und die Marketing-Vorlagen generiert werden.
- Consequence: Brand Guide Erstellung wird als eigenständiger Workflow in das System eingebaut. Reihenfolge pro Firma: Brand Guide → Style Guide → Design Tokens → Marketing-Vorlagen. Der `/create-brand-system` Skill muss beides abdecken: den strategischen Brand Guide und die technischen Design-Artefakte.

## DEC-009 — ui-ux-pro-max-skill als Grundlage für Brand System (Option A)
- Status: accepted
- Reason: Das Repository (MIT, ~52k Stars) liefert 60-70% des Brand System Workflows fertig: Brand Guide Generierung, 3-Layer Design Tokens (JSON + CSS + Tailwind), Marketing-Banner, Präsentations-Slides, UI-Styling mit shadcn/ui. Dazu wertvolle Datenbanken (161 Farbpaletten, 57 Font-Pairings, 99 UX-Richtlinien). Selbstbau wäre unverhältnismäßig.
- Consequence: Skills `brand`, `design-system`, `banner-design`, `slides`, `ui-styling` werden als Basis übernommen. Ein Adapter konvertiert Output ins Strategaize-Format (`strategaize_styleguide.md`). Eigene Marketing-Templates (E-Mail, Dokumente, One-Pager) werden obendrauf gebaut. Logo-/CIP-Generierung (Gemini-abhängig) wird NICHT genutzt — Logos weiterhin über Canva/Figma/AI-Tools.

## DEC-010 — NextCRM als Referenz, nicht als Fork (supersedes DEC-005 teilweise)
- Status: accepted
- Reason: NextCRM hat ~40 Modelle, 50+ Prisma Server Actions, NextAuth statt Supabase Auth, MinIO statt Supabase Storage. Ein Fork + Supabase-Migration wäre im Wesentlichen ein Neuschreiben der gesamten Datenzugriffsschicht. V1 braucht nur ~10 Tabellen, nicht 40. Ein frischer Aufbau mit dem bewährten Blueprint-Supabase-Pattern ist weniger Arbeit als ein Fork-Entrümpeln.
- Consequence: Frisches Next.js Projekt mit Supabase (Blueprint-Pattern). NextCRM wird lokal als Referenz-Katalog gehalten — UI-Patterns (Tabellen, Formulare, Kanban), Datenmodell-Inspiration und shadcn-Komponenten werden bei Bedarf einzeln kopiert und angepasst. Kein Git-Fork.

## DEC-011 — Firecrawl self-hosted für Lead-Enrichment (V3)
- Status: accepted
- Reason: Firecrawl (AGPL, self-hosted via Docker) wandelt Website-URLs in strukturierte Daten um (Firma, E-Mail, Telefon, Branche). Perfekt für Lead-Enrichment. AGPL ist für internes Tooling kein Problem. Läuft auf dem gleichen Hetzner-Server.
- Consequence: Firecrawl wird als V3-Baustein in der Docker Compose Architektur vorgesehen (auskommentiert in V1). Benötigt 4-8 GB RAM zusätzlich — Server-Sizing muss bei V3 angepasst werden.

## DEC-012 — Skills-Master im Dev System, nicht im Business System
- Status: accepted
- Reason: Business-Development-Skills (Marketing, Brand, Voice Guide) waren nur im Business System verfügbar. Für neue Projekte (ImmoCheck etc.) müssten sie geforkt werden. User-Vision: Dev System hat zwei Branches — Software-Bau + Business-Development. Skills müssen wiederverwendbar sein.
- Consequence: 10 Skills + 3 Referenz-Dateien als Master ins Dev System verschoben (.claude/skills-business/, .claude/references/). Business System behält Kopien in .claude/commands/ für die deployed Instanz. Neue Projekte nutzen die Dev-System-Skills direkt. CRM-Stack Template im Dev System als Architektur-Vorlage.

## DEC-013 — Drei-Ebenen-Modell: Dev System → Business-Development-Instanzen → Operative Plattformen
- Status: accepted
- Reason: Klarstellung der System-Architektur nach Missverständnis. Dev System = Werkzeugkasten (Software-Bau + Business-Development). Business-Development-Instanzen = pro Firma deployed (Strategaize, ImmoCheck). Operative Plattformen = Tagesgeschäft-Software (Blueprint, Operating System).
- Consequence: Jede Firma bekommt ein eigenes Projekt (kein Fork). Dev System stellt alle Skills und Templates bereit. Business System Repo ist NUR die Strategaize-Instanz.

## DEC-014 — V2 Neuausrichtung: Revenue & Relationship System statt Marketing+CRM
- Status: accepted
- Reason: User-Review zeigte fundamentales Missverstaendnis beim V1-Scope. System ist kein generisches CRM mit Marketing-Skills, sondern ein fokussiertes Vertriebs- und Akquise-System. Content-Produktion gehoert zu System 4 (Intelligence Studio).
- Consequence: PRD komplett neu geschrieben. 15 neue Features (FEAT-101 bis FEAT-115). Content-Kalender und Marketing-Skills aus System entfernt. 10 geschaeftsspezifische Module definiert. Bestehende Infrastruktur (Supabase, Docker, Auth) bleibt.

## DEC-015 — Zwei separate Pipeline-Boards (Multiplikatoren + Kunden)
- Status: accepted
- Reason: Multiplikator-Pipeline (10 Stufen, Beziehungsaufbau) und Kunden-Pipeline (12 Stufen, Deal-Closing) haben komplett unterschiedliche Stages, Metriken und Zeitrahmen. Ein kombiniertes Board mit 22 Stages waere unbrauchbar.
- Consequence: Zwei separate Kanban-Boards mit geschaeftsspezifischen Stufen. Bestehende Pipeline-Komponente wird wiederverwendet.

## DEC-016 — E-Mail: SMTP-Versand aus dem System, kein manuelles Copy/Paste
- Status: accepted
- Reason: Manuelle E-Mail-Dokumentation (Copy/Paste) ist nicht praxistauglich. SMTP-Integration ermoeglicht direkten Versand + automatisches Logging. Kein Newsletter-System, nur 1:1 Vertriebskommunikation.
- Consequence: SMTP-Konfiguration (Gmail App-Passwort oder eigener Server). E-Mail-Compose UI im System. IMAP fuer empfangene Mails erst V3.

## DEC-017 — Cal.com/Calendly fuer Meeting-Buchung statt eigener Loesung
- Status: accepted
- Reason: Meeting-Buchungssystem selbst zu bauen ist unverhältnismäßig. Cal.com (Open Source, Self-Hosted) oder Calendly deckt den Bedarf ab. V1 als Link-Integration, V2 als Sync.
- Consequence: Meeting-Buchungs-Button pro Kontakt der zu externem Buchungstool fuehrt. Keine eigene Buchungslogik.
