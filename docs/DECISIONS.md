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

## DEC-018 — LLM im Cockpit: Claude Sonnet 4.6 via AWS Bedrock Frankfurt (erweitert DEC-001)
- Status: accepted
- Reason: Das KI-Analyse Cockpit (Dashboard) und der KI-Assistent (Mein Tag) brauchen Echtzeit-LLM-Zugang direkt im Browser. Claude Code Skills (DEC-001) funktionieren nur offline/CLI — nicht für interaktive User-Abfragen in der Web-App. AWS Bedrock Frankfurt (eu-central-1) ist DSGVO-konform (EU-Region, kein Training auf Kundendaten). Claude Sonnet 4.6 (neuestes Modell) kostet gleich viel wie ältere Modelle. Blueprint Plattform nutzt Bedrock bereits produktiv — bewährter Stack.
- Consequence: DEC-001 bleibt gültig für Batch-Operationen (Skills). Zusätzlich: API-Route /api/ai/chat für Echtzeit-LLM-Abfragen. AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_REGION=eu-central-1 als Env Vars. Geschätzte Kosten: 5-15 EUR/Monat bei normaler Nutzung. Zwei Modi: Query-Modus (Dashboard, read-only) und Action-Modus (Mein Tag, read+write+execute).

## DEC-019 — Whisper: OpenAI API bleibt akzeptabel, Self-Hosted als Option
- Status: accepted
- Reason: Whisper läuft aktuell via OpenAI API (Cloud, US-basiert). Für Business-Development-Daten (Kontaktdaten, Firmennamen, Adressen) ist das mit OpenAI DPA vertretbar — keine hochsensiblen internen Daten werden verarbeitet. Blueprint Plattform hostet Whisper selbst auf Hetzner (Docker) als DSGVO-sauberere Variante. Für das Business System ist der OpenAI-Weg pragmatisch genug. Falls später EU-only nötig: gleichen Docker-Container wie Blueprint deployen.
- Consequence: OpenAI Whisper API bleibt. OPENAI_API_KEY in .env. Kosten: ~0.006 EUR/Minute. Fallback-Option dokumentiert: Self-Hosted Whisper auf Hetzner (onerahmet/openai-whisper-asr-webservice). Migration wäre ~2h Arbeit wenn nötig.

## DEC-020 — Mobile Zugriff: PWA statt native App
- Status: accepted
- Reason: Business System ist eine Web-App auf Hetzner — Mobile Zugriff ist per Browser bereits möglich. PWA (Progressive Web App) bietet App-ähnliches Erlebnis (Startbildschirm-Icon, Fullscreen, Offline-Cache) ohne App Store und ohne native Entwicklung. Voice-Input funktioniert nativ im mobilen Browser. Whisper API ist server-seitig. Ideal für Demos bei Kunden (Tablet/Smartphone zeigen).
- Consequence: PWA-Manifest + Service Worker in Next.js. Mobile-optimiertes Layout für "Mein Tag" als Priorität. Kein React Native, kein Flutter, kein App Store. Installierbar auf iOS + Android direkt aus dem Browser.

## DEC-021 — Activities bleibt polymorpher Timeline-Store, Meetings/Calls als eigene Tabellen
- Status: accepted
- Reason: Activities dient als bewährter User-facing Timeline-Store für alle Entitäten (Deal, Contact, Company). Meetings und Calls brauchen reichere Felder (Teilnehmer, Agenda, Transkription, Ergebnisse) die nicht in das generische Activity-Schema passen. Aufteilen statt Überladen.
- Consequence: Activities-Tabelle bleibt und bekommt source_type + source_id für Rückverlinkung. Neue meetings-Tabelle (V3) mit strukturierten Feldern. Calls-Tabelle folgt bei Bedarf. Jedes Meeting/Call erzeugt automatisch einen Activity-Eintrag als Timeline-Referenz.

## DEC-022 — Workspaces als eigene Routen statt modale Overlays
- Status: accepted
- Reason: Company- und Contact-Detail existieren bereits als eigene Routen (/companies/[id], /contacts/[id]). Deal-Workspace ist zu komplex für ein Side-Panel (Timeline, Tasks, KI-Briefing, Prozess-Check, Direktaktionen). Konsistentes Pattern für alle drei Workspace-Typen.
- Consequence: Deal-Workspace wird eigene Route /deals/[id]. DealDetailSheet wird durch Workspace-Seite ersetzt. Alle Workspaces folgen demselben Layout-Pattern. Pipeline-Kanban bleibt als Übersicht, Klick auf Deal öffnet Workspace-Route.

## DEC-023 — Zentraler LLM-Service-Layer für Bedrock-Integration
- Status: accepted
- Reason: Alle KI-Features (Briefing, Summary, Analyse, Coaching) sollen denselben Bedrock-Zugang nutzen. Direct-API-Calls aus Components führen zu Inkonsistenz, fehlender Fehlerbehandlung und fehlendem Confirm-before-write. Zentraler Layer ermöglicht einheitliches Prompt-Management und Audit.
- Consequence: /lib/ai/ als zentraler Service mit Bedrock-Client, Prompt-Templates, Response-Parser, Confirm-before-write-Middleware. Alle Components nutzen diesen Layer statt direkter API-Calls. Ergänzt DEC-018 (Bedrock Frankfurt).

## DEC-024 — Dedizierte audit_log-Tabelle parallel zu Activities
- Status: accepted
- Reason: Activities ist User-facing (Timeline, Conversations, Notes). Audit braucht system-facing Änderungsprotokoll (Actor, Action, Entity, Before/After). Beides in einer Tabelle vermischt Zweck und erschwert Governance-Abfragen.
- Consequence: Neue audit_log-Tabelle mit: actor_id, action, entity_type, entity_id, changes (JSONB), created_at. Wird bei kritischen Mutations befüllt (Statuswechsel, Freigaben, Zieländerungen, Zuordnungskorrekturen). Activities bleibt unverändert als Timeline.

## DEC-025 — Wissensschicht als eigene Tabellen (Phase 3+)
- Status: accepted
- Reason: Wissens-Lifecycle (Vorschlag → Review → Freigabe → Nutzbar) ist eigenständig und passt nicht in bestehende Tabellen. Insights, Knowledge Entries, Review Decisions brauchen eigene Struktur.
- Consequence: Eigene Tabellen (insights, knowledge_entries, review_decisions) werden in V4 gebaut. V3 bereitet architektonisch vor: Insight-Export wird von JSON-File auf DB-basiert umgestellt. Bestehende Conversation-Felder (objections, opportunities, risks) bleiben als Rohquelle erhalten.

## DEC-026 — Kalender: Eigene calendar_events-Tabelle für V3
- Status: accepted
- Reason: Mein Tag braucht echte Kalender-Daten für Tagesplanung, Zeitbudgetierung und Meeting-Prep. Cal.com-API-Sync ist zu komplex für V3 und nicht nötig für Single-User-MVP. Einfache eigene Tabelle reicht.
- Consequence: Neue calendar_events-Tabelle in V3 mit: title, start_time, end_time, type, related entities, description. Cal.com-Sync frühestens V4. Mein Tag zeigt echte Events statt Dummy-Daten.

## DEC-027 — Kartensuche: Leaflet + OpenStreetMap statt Mapbox
- Status: accepted
- Reason: Internal-Tool braucht keine Premium-Kartendienste. Leaflet ist Open Source, kostenlos, keine API-Keys noetig. Mapbox hat Usage-Limits und Kosten. OSM-Tiles sind frei und ausreichend fuer PLZ-basierte Deutschlandkarte. react-leaflet ist die Standard-React-Integration.
- Consequence: Dependencies: leaflet + react-leaflet + leaflet.heat (Heatmap-Plugin). Kein API-Key-Management. Kein Vendor-Lock-in. Kartendaten von OpenStreetMap (tile.openstreetmap.org).

## DEC-028 — Geocoding: Statische PLZ-Lookup-Tabelle statt API
- Status: accepted
- Reason: Deutschland hat ca. 8.000 PLZ-Codes. Eine statische JSON-Datei mit PLZ→Koordinaten-Mapping ist schneller, zuverlaessiger und kostenlos im Vergleich zu Geocoding-APIs (Nominatim rate-limited, Google Geocoding kostenpflichtig). Fuer PLZ-Level-Genauigkeit (nicht Strassen-Level) voellig ausreichend.
- Consequence: Statische plz-coordinates.json Datei (~200KB) im Projekt. Kein externer API-Call. Sofortige Aufloesung. Offline-faehig. Daten: OpenGeodata.de oder aehnliche freie Quellen.

## DEC-029 — Gesamtkalender + Cal.com als ein Feature-Block in V4
- Status: accepted
- Reason: Gesamtkalender-Ansicht (BL-339) und Cal.com (BL-208) separat zu bauen wuerde Doppelarbeit erzeugen. Wenn in V3.3 eine eigene Kalender-UI gebaut wird und in V4 Cal.com dazukommt, bringt Cal.com eine eigene UI und Sync-Logik mit — die V3.3-Komponente wuerde teilweise obsolet. Cal.com als Backend/Engine (Sync, Buchung, .ics) plus Kalender-Ansicht als Frontend darauf aufbauend ergibt einen sauberen Feature-Block.
- Consequence: BL-339 aus V3.3 nach V4 verschoben. V4 baut Gesamtkalender + Cal.com zusammen. V3.3 bleibt rein UI/Frontend ohne neue Infrastruktur (6 Slices). Mein Tag Kalender-Panel (Tagesansicht) bleibt unveraendert als Zwischenloesung.

## DEC-030 — IMAP-Provider: IONOS direkt statt Gmail-Weiterleitung
- Status: accepted
- Reason: Domain laeuft bei IONOS. IONOS IMAP-Server (imap.ionos.de) bietet Standard-IMAP-Zugang in Deutschland. Gmail-Weiterleitung wuerde Daten ueber US-Server leiten und widerspricht der EU-only Datenhaltungs-Strategie (Hetzner DE, Bedrock Frankfurt). Kein OAuth2-Gebastel wie bei Gmail noetig. Kein zusaetzlicher Delay durch Weiterleitung.
- Consequence: IMAP-Sync verbindet sich direkt mit imap.ionos.de (Port 993, SSL). E-Mail-Daten bleiben komplett in DE/EU: IONOS (Mailserver) → Hetzner (Sync + Speicherung) → Bedrock Frankfurt (KI-Analyse). IONOS-Credentials als Env Vars im Docker Setup.

## DEC-031 — V4 Self-Hosted Everything: Cal.com + Jitsi auf Hetzner
- Status: accepted
- Reason: Konsistente Infrastruktur-Strategie: alles Self-Hosted auf Hetzner, kein Vendor-Lock-in, volle Datenkontrolle. Cal.com Community Edition ist Open Source und Docker-faehig. Jitsi (fuer V4.1) ebenfalls Self-Hosted. Server-Upgrade von CPX32 bei Bedarf — aktuell keine Last, Erweiterung jederzeit moeglich.
- Consequence: Cal.com als Docker-Container auf Hetzner Business System Server. Jitsi (V4.1) ebenfalls. Bei Server-Last-Problemen: CPX32 → CPX42 oder CPX52. User wird rechtzeitig informiert wenn Upgrade noetig.

## DEC-032 — V4/V4.1 Scope-Split: KI-Gatekeeper zuerst, Meeting-Intelligence danach
- Status: accepted
- Reason: 10 geplante V4-Features sind zu viel fuer eine Version. KI-Gatekeeper (IMAP + E-Mail-Analyse) veraendert das Tagesgeschaeft am staerksten und ist DAS Differenzierungsmerkmal. Meeting-Intelligence (Jitsi, Transkription) und Wissensschicht brauchen schwere Infrastruktur (eigener Video-Server) und koennen unabhaengig nachgeliefert werden.
- Consequence: V4 = 6 Features (FEAT-403, 405, 406, 407, 408, 410). V4.1 = 4 Features (FEAT-401, 402, 404, 409). V4 fokussiert auf E-Mail-Intelligence + Kalender. V4.1 fokussiert auf Meeting-Intelligence + Wissensschicht.

## DEC-033 — Background Processing: Cron-API-Routes statt Worker-Container
- Status: accepted
- Reason: Single-User internal tool braucht kein Queue-System (Bull, RabbitMQ). Cron-API-Routes sind einfacher zu deployen, debuggen und monitoren. Coolify hat eingebaute Cron-Funktion. Kein separater Worker-Container, kein Queue-Management, kein zusaetzlicher RAM-Verbrauch. IMAP-Sync, E-Mail-Klassifikation, Wiedervorlagen-Generierung und Retention-Cleanup laufen als periodische HTTP-Calls.
- Consequence: Neue API-Routes unter /api/cron/ (imap-sync, classify, followups, retention). Geschuetzt via CRON_SECRET Header. Coolify ruft Endpoints periodisch auf. Bei Fehler: naechster Cron-Lauf versucht es erneut. Keine garantierte Delivery, aber fuer Single-User akzeptabel.

## DEC-034 — Cal.com eigene PostgreSQL-Instanz statt shared mit Supabase
- Status: accepted
- Reason: Cal.com hat eigenes Prisma-Schema das mit Supabase-Schema kollidieren wuerde. Saubere Isolation: Cal.com-Probleme betreffen nicht die Business-DB. Unabhaengige Upgrades moeglich. PostgreSQL 15 Alpine braucht nur ca. 50-100 MB zusaetzlich.
- Consequence: Separater calcom-db Container (postgres:15-alpine) in docker-compose.yml. Eigenes Volume (calcom-db-data). Eigene Credentials (CALCOM_DB_PASSWORD). Cal.com und Business System teilen Docker Network, aber nicht die Datenbank.
