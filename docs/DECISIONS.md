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

## DEC-035 — Whisper-Adapter-Pattern statt direktem OpenAI-SDK-Aufruf
- Status: accepted
- Reason: Die KI-Welt aendert sich schnell. V4.1 startet mit OpenAI Whisper API (US-Region, bekannt akzeptabel gemaess DEC-019), aber Azure OpenAI Whisper in EU-Region ist mittelfristig die bevorzugte Route (DSGVO-Komfort, vergleichbare Qualitaet). Self-hosted Whisper (wie im Blueprint) bleibt Option fuer Kunden-Instanzen. Direkter SDK-Aufruf im Business-Code wuerde jeden Provider-Wechsel zum Feature-Rewrite machen.
- Consequence: In V4.1 wird ein Transcription-Adapter-Service gebaut (Interface + OpenAI-Implementation). Business-Code kennt nur das Interface (`transcribe(audioFile) -> transcript`). Provider-Wechsel = neue Adapter-Implementation + ENV-Variable. Kein Feature-Code muss sich aendern. Azure-Migration wird ein eigener Slice wenn Account da ist, nicht Teil von V4.1.

## DEC-036 — Jitsi + Jibri als shared Meeting-Infrastructure (Business + Blueprint)
- Status: accepted
- Reason: Meeting-Aufzeichnungs-Pipeline wird in Business System V4.1 und Blueprint V4 gebraucht. Doppelarbeit vermeiden. Eine Jitsi-Instance mit getrennten Tenant-Konfigurationen ist effizienter als zwei separate Deployments. Shared-Infrastructure erlaubt Wiederverwendung von Recording-Pipeline, Storage-Setup und Security-Hardening. Spaeter (Kunden-Instanzen, lokale Desktop-Installationen) kann das Pattern als Docker-Compose-Baustein wiederverwendet werden.
- Consequence: V4.1 baut ein Jitsi + Jibri Deployment das beide Systeme bedienen kann. Initial nur Business-Tenant aktiv, Blueprint-Tenant kommt dazu wenn Blueprint V4 umgesetzt wird. Getrennte Authentication pro Tenant, aber geteilte Infrastruktur. Bei Multi-Kunden-Deployments spaeter: pro Kunde eigener Jitsi-Stack via Docker-Compose-Template.

## DEC-037 — Insight-Review-Queue nur fuer schreibende KI-Aenderungen (nicht informative)
- Status: accepted
- Reason: Klick-Muedigkeit vermeiden. KI generiert in V4 bereits viele Outputs (E-Mail-Insights, Deal-Summaries, Timeline-Eintraege). Jeden davon durch Review-Queue jagen = Mensch wird zum Flaschenhals, KI-Benefit verschwindet. Schreibende Aenderungen an Deal/Kontakt-Properties (Status, Stage, Wert, Rolle, Tag) sind aber risk-sensitiv — eine KI-Halluzination im Deal-Status verzerrt Pipeline-Reporting. Informative Outputs (Summaries, Insights in Timeline) bleiben direkt sichtbar mit klarem KI-Badge und sind jederzeit editierbar.
- Consequence: V4.3 baut eine Queue NUR fuer schreibende KI-Aktionen auf Deal-/Kontakt-Properties. Timeline-Eintraege, Meeting-Summaries und E-Mail-Insights bleiben direkte Schreiboperationen mit KI-Kennzeichnung. V4 Freigabe-Mechanismus fuer Wiedervorlagen bleibt unveraendert. V4.3-Queue kennt Aktions-Typen: property_change, status_change, tag_change, value_change.

## DEC-038 — DSGVO-Einwilligung einmalig beim Kontakt-Onboarding, widerrufbar
- Status: accepted
- Reason: Pro-Meeting-Abfrage der Einwilligung ist unpraktisch (Teilnehmer genervt, Click-Ermuedung, UX-Stoerung kurz vor Meeting-Start). Einmalige Einwilligung beim Onboarding ist DSGVO-konform, wenn: transparente Info vorab (Art der Verarbeitung, Zweck, Rechte), Widerruf jederzeit moeglich, dokumentiert (wer/wann/wie). Kerndienstleistung kann in vollem Umfang erst mit Einwilligung erbracht werden — das wird dem Kontakt transparent kommuniziert, ist aber kein erzwungener Consent (Kontakt kann ablehnen und wird dann manuell bearbeitet).
- Consequence: FEAT-411 implementiert Onboarding-Flow: Einwilligungs-Mail-Template, Public-Page fuer Zustimmung/Ablehnung, consent_status am Kontakt, Widerruf-Link, Audit-Log aller Consent-Aenderungen. Recording in FEAT-404 prueft consent_status vor Aufzeichnung. Ohne granted-Consent: Meeting laeuft, aber keine Aufzeichnung — User sieht UI-Hinweis.

## DEC-039 — V4.x Scope-Split: Meeting Intelligence / Wissensbasis / Insight Governance
- Status: accepted
- Reason: Ursprueunglich waren FEAT-401, -402, -404, -409 fuer V4.1 geplant. Gemeinsam sind sie zu breit fuer einen sauberen Zyklus. Prinzip "wenn wir es machen, machen wir es richtig" bedeutet: lieber drei fokussierte Versionen als eine grosse halb-fertige. FEAT-404 + FEAT-409 + FEAT-411 bilden die Meeting-Basis (V4.1). FEAT-401 Wissensbasis verlangt Cross-Source-Integration — das ist eigene Version (V4.2). FEAT-402 Queue macht erst Sinn, wenn es genug KI-Schreiboperationen gibt — das ist V4.3.
- Consequence: Roadmap hat jetzt V4.1 (Meeting Intelligence), V4.2 (Wissensbasis), V4.3 (Insight Governance). Jede Version bleibt kompakt und komplett-abschliessbar. Keine halb-fertigen Features ueber mehrere Versionen verteilt. Zyklen bleiben kurz, aber jede Version liefert ein rundes Ergebnis.

## DEC-040 — Jitsi + Jibri Co-Location auf CPX32 mit CPX42-Upgrade-Pfad
- Status: accepted
- Reason: Dedizierter Meeting-Server haette zweite Coolify-Instanz erzeugt (~15-20 EUR/Monat zusaetzlich + mehr Admin). V4-Bestand belegt aktuell nur ~2.5 GB von 8 GB auf CPX32. Jitsi-Stack (~1 GB idle) + 1 paralleles Jibri-Recording (~2.5 GB aktiv) passt in die restlichen ~5.5 GB. Single-User-Realitaet: 1 Meeting parallel reicht. Upgrade auf CPX42 (8 vCPU / 16 GB) ist Hetzner-Resize ohne Code-Change, sobald regelmaessig 2+ parallele Recordings anstehen (Blueprint-Tenant, Kunden-Instanzen).
- Consequence: V4.1 Docker Compose erhaelt Jitsi-Stack als neue Services auf bestehendem Server. Shared `coolify` Network. Hetzner-Firewall: Port 10000/udp oeffnen fuer JVB Media. Kein eigener TURN-Server in V4.1 (Public STUN ausreichend fuer ueblichen Netzwerk-Kontext). Upgrade-Trigger dokumentiert: Bei wiederholter Ressourcen-Konkurrenz Resize auf CPX42 durchfuehren.

## DEC-041 — Whisper-Adapter als Library-Abstraktion (nicht separater Proxy-Service)
- Status: accepted
- Reason: DEC-035 verlangt Adapter-Pattern, laesst Umsetzung offen. Library-Abstraktion in `/lib/ai/transcription/` ist konsistent zum bestehenden LLM-Pattern (`/lib/ai/bedrock`), erzeugt keinen Extra-Container, keine Zusatzlatenz, kein Extra-Admin. Separater REST-Proxy waere theoretisch besser shareable zwischen Business + Blueprint, bringt aber Overhead den V4.1 nicht rechtfertigt. Provider-Switch via `TRANSCRIPTION_PROVIDER` ENV-Variable ist einfach und ausreichend fuer OpenAI → Azure → Self-hosted Migration.
- Consequence: `/lib/ai/transcription/provider.ts` definiert Interface `TranscriptionProvider`. `openai.ts` implementiert V4.1, `azure.ts` + `selfhosted.ts` sind leere Platzhalter. `factory.ts` liest ENV und liefert Instanz. Business-Code ruft ausschliesslich `getTranscriptionProvider().transcribe(...)`. Kein direkter `openai`-Import ausserhalb des Adapter-Moduls.

## DEC-042 — Public-Consent-Page unter /consent/{token} mit Middleware-Whitelist
- Status: accepted
- Reason: Kurze lesbare URL in E-Mails ist wichtig (weniger Copy-Paste-Probleme). Alternative `/p/consent/{token}` haette klareren Public-Namespace, ist aber unnoetig verbose. Middleware-Whitelist fuer genau `/consent/*` ist ein One-Liner parallel zu bereits whitelisted `/api/cron/*`.
- Consequence: Next.js App-Router erhaelt `app/consent/[token]/page.tsx` + `app/consent/[token]/revoke/page.tsx`. `middleware.ts` erlaubt unauthentifizierten Zugriff auf `/consent/*`. Rate-Limit 100 Requests/IP/Stunde speziell auf diesen Pfad. IP-Minimierung: SHA256-Hash mit DAILY_SALT, Plain-IP wird nicht persistiert.

## DEC-043 — Recording-Retention ENV-konfigurierbar, Default 30 Tage
- Status: accepted
- Reason: DSGVO-Prinzip der Datenminimierung spricht fuer kurze Retention. 30 Tage sind praktisch (nachtraegliche Manuelle Review moeglich, z.B. bei Unklarheiten im Summary). Fix-Code-Konstante haette bei spaeterem Aenderungswunsch Deploy-Zyklus erzwungen. ENV-Variable `RECORDING_RETENTION_DAYS` erlaubt Anpassung auf 60/90 Tage ohne Code-Aenderung, falls sich im Live-Betrieb zeigt dass laengere Retention sinnvoll ist.
- Consequence: `RECORDING_RETENTION_DAYS=30` Default in Env-File. `/api/cron/recording-retention` laeuft taeglich 04:00 UTC, loescht Supabase-Storage-Objekte mit `recording_started_at < now() - N days`, setzt `meetings.recording_status = 'deleted'`. Transkript + Summary bleiben permanent. Aenderung erfordert nur Coolify-ENV-Update + Container-Restart.

## DEC-044 — Ad-hoc Meeting-Teilnehmer werden automatisch als Kontakt mit consent_status='pending' angelegt
- Status: accepted
- Reason: Meetings aus weitergeleiteten Einladungen koennen E-Mail-Adressen enthalten, die noch nicht in `contacts` existieren. Harte Pruefung "muss existieren" wuerde Meetings blockieren. Stilles Ignorieren wuerde Teilnehmer-Liste unvollstaendig machen. Konsistenz zu V4-IMAP-Logik: eingehende E-Mails legen neue Kontakte auto-an. Gleiches Muster hier. Recording startet nicht (Consent fehlt) — das ist erwuenschtes Verhalten bei unbekannten Personen, nicht Fehler.
- Consequence: Beim Meeting-Start werden Teilnehmer-E-Mails gegen `contacts` gepruefft. Unbekannte: `INSERT INTO contacts (email, display_name, consent_status='pending', consent_source='ad_hoc')`. UI zeigt im Deal-Workspace: "Aufzeichnung deaktiviert — Einwilligung fehlt fuer {email}". User kann Ad-hoc-Kontakt nachtraeglich mit Deal verknuepfen und Consent-Anfrage ausloesen. Woechentlicher Cleanup-Report: Pending-Kontakte >30d ohne Deal als Review-Liste.

## DEC-045 — Jibri-Recording-Format MP4 (Jibri-Default)
- Status: accepted
- Reason: Jibri erzeugt standardmaessig MP4 (ffmpeg-Pipeline, H.264 + AAC). MP4 ist universell kompatibel mit OpenAI Whisper API (keine Pre-Conversion noetig), ffprobe (Duration), Browser-Playback im Deal-Workspace. WebM (VP8/Opus) waere ~20-30% kleiner, erfordert aber Jibri-Config-Hacks und ist bei OpenAI Whisper API nicht nativ unterstuetzt. Fuer V4.1 Volume (1-2 Meetings/Tag) ist Dateigroesse irrelevant.
- Consequence: Jibri laeuft mit Default-Config, MP4-Output nach `/recordings/{room}.mp4`. Upload-Cron detektiert `.mp4`-Files, laedt sie in Supabase Storage Bucket `meeting-recordings`. Whisper-Adapter reicht File direkt an OpenAI weiter ohne Konvertierung. ffprobe liefert `recording_duration_seconds`.

## DEC-046 — RAG mit pgvector + Bedrock Titan Embeddings V2 statt Context-Window-Stuffing
- Status: accepted
- Reason: Drei Gruende fuer RAG statt Context-Window-Stuffing:
  (1) Skalierbarkeit: Context-Window (200k Tokens) reicht fuer ~10 Meeting-Transkripte. Bei 50+ Meetings pro Deal ist das nicht mehr moeglich. RAG skaliert unbegrenzt.
  (2) Qualitaet: SQL kann nicht semantisch filtern. "Vollmacht" findet nicht "Vertretungsbefugnis". Embedding-basierte Suche findet semantisch verwandte Inhalte.
  (3) Kosten: RAG-Queries sind ~10x guenstiger pro Anfrage (10k statt 100k Tokens im LLM-Context). Embedding-Generierung kostet ~$0.0002/1k Tokens (vernachlaessigbar).
  Infrastruktur-Aufwand ist gering: pgvector ist in Supabase PostgreSQL enthalten (ein CREATE EXTENSION Befehl). Titan Embeddings V2 laeuft ueber denselben Bedrock-Account in Frankfurt. Kein neuer Container, kein neuer Provider, kein neues DPA.
  Das Pattern ist wiederverwendbar fuer Intelligence Studio, Onboarding-Plattform und alle zukuenftigen Strategaize-Systeme mit Wissensbasis-Anforderungen.
- Consequence: V4.2 implementiert RAG-Pipeline: Chunking → Titan Embeddings V2 (eu-central-1) → pgvector in PostgreSQL → Similarity Search → Bedrock Claude Sonnet fuer Antwortgenerierung. `knowledge_chunks` Tabelle mit vector(1024) Spalte + HNSW-Index. Embedding-Adapter-Pattern analog zu Whisper-Adapter (DEC-047). Backfill aller bestehenden Daten bei Deploy. Dev-System-Regel `rag-embedding-pattern.md` dokumentiert das Pattern fuer Wiederverwendung.

## DEC-047 — Embedding-Adapter-Pattern (analog Whisper-Adapter DEC-035)
- Status: accepted
- Reason: Konsistenz mit bestehendem Provider-Adapter-Pattern (DEC-035 Whisper, Data-Residency-Regel). V4.2 nutzt Amazon Titan Embeddings V2. Spaeterer Wechsel zu Cohere Embed Multilingual V3 (besseres Deutsch?) oder anderem Modell muss ohne Feature-Rewrite moeglich sein. Region-Config ueber ENV (gleiche Regel wie LLM und Whisper). Interface analog: `embed(text) → number[]`, `embedBatch(texts[]) → number[][]`.
- Consequence: `/lib/ai/embeddings/provider.ts` definiert `EmbeddingProvider` Interface. `titan.ts` implementiert V4.2-Provider (Bedrock Titan V2). `factory.ts` liest `EMBEDDING_PROVIDER` ENV-Variable. Business-Code ruft ausschliesslich `getEmbeddingProvider().embed(...)`. Kein direkter Bedrock-Import ausserhalb des Adapter-Moduls. Bei Provider-Wechsel: neue Adapter-Klasse + ENV-Aenderung + Re-Embedding aller Daten (bewusster Tradeoff: Embeddings sind modellspezifisch, kein Mix moeglich).

## DEC-048 — Embedding-Dimensionen 1024 + Sentence-Boundary Chunking
- Status: accepted
- Reason: Titan V2 unterstuetzt 256/512/1024 Dimensionen. 1024 liefert die beste Retrieval-Qualitaet (hoechste semantische Aufloesung). Speicher-Overhead bei <50k Chunks (realstische V4.2-Menge) ist ~50 MB Unterschied zwischen 512 und 1024 — irrelevant auf CPX32. Chunking an Satzgrenzen statt fixen Token-Positionen vermeidet abgeschnittene Saetze, die die Embedding-Qualitaet verschlechtern. Token-Heuristik (text.length/4) reicht fuer Chunk-Groessen-Steuerung — kein externer Tokenizer noetig.
- Consequence: `EMBEDDING_DIMENSIONS=1024` als Default in ENV. `knowledge_chunks.embedding` ist `vector(1024)`. Chunker schneidet an Satzgrenzen (Regex: `/[.!?]\s+/`), Target 600-800 Tokens, Overlap 100 Tokens bei Meeting-Transkripten und Dokumenten. E-Mails und Activities als Single-Chunk wenn <800 Tokens. Bei spaeterem Wechsel auf 512: HNSW-Index muss neu gebaut werden (ALTER COLUMN + Re-Embedding).

## DEC-049 — ai_action_queue erweitern statt neue Tabelle fuer Insight-Review-Queue
- Status: accepted
- Reason: Die bestehende ai_action_queue hat bereits das richtige Pattern (suggest → approve/reject, status-Tracking, expires_at, decided_at, decided_by, ai_feedback). Neue Aktionstypen (property_change, status_change, tag_change, value_change) ergaenzen die bestehenden (followup, gatekeeper). Eine neue Tabelle wuerde Duplikation erzeugen und die Freigabe-UI fragmentieren — zwei separate Queues zu reviewen waere fuer den User schlechter als eine einheitliche.
- Consequence: ai_action_queue wird um neue Spalten erweitert: target_entity_type (TEXT), target_entity_id (UUID), proposed_changes (JSONB), confidence (FLOAT). Bestehende Followup- und Gatekeeper-Eintraege sind nicht betroffen (neue Spalten nullable). Die Freigabe-UI in Mein Tag zeigt alle Queue-Typen einheitlich. Schema-Migration als Teil von V4.3 SLC-Planung.

## DEC-050 — Separater signal-extract Cron statt inline in meeting-summary/classify
- Status: accepted
- Reason: Signal-Extraktion ist ein eigener LLM-Call mit eigenem Prompt und eigener Fehlerdomaene. Inline in den bestehenden Crons wuerde Timeouts ueberlasten (meeting-summary bereits 120s), Fehlerisolation verletzen und Retry-Verhalten verkomplizieren. Meeting-Summary und E-Mail-Classify setzen nur `signal_status = 'pending'`, der signal-extract Cron verarbeitet asynchron.
- Consequence: Neuer Cron-Job alle 5 Minuten. Max 3 Items pro Durchlauf (Bedrock-Rate-Limit-Schutz). Latenz zwischen Summary und Signal: maximal 5 Minuten (akzeptabel, User sieht Signale beim naechsten Mein-Tag-Besuch).

## DEC-051 — Ein generischer Signal-Prompt statt pro-Typ spezialisiert
- Status: accepted
- Reason: Kontextuelle Signale ueberlappen (ein Satz kann Stage + Value erwaehnen). Ein Call statt vier spart ~75% Bedrock-Kosten. Zod-Schema erzwingt Struktur unabhaengig vom Prompt-Design. Bei schlechter Qualitaet kann spaeter auf spezialisierte Prompts umgestellt werden.
- Consequence: Ein Signal-Extraktion-Prompt mit Zod-Schema (SignalSchema) fuer alle 4 Signal-Typen. Ein LLM-Call pro Meeting/E-Mail.

## DEC-052 — Confidence-Schwelle 0.4 fuer Signal-Queue-Eintrag
- Status: accepted
- Reason: Niedrig-Confidence-Signale (< 0.4) ueberfluten die Queue mit schlechten Vorschlaegen. Besser wenige gute als viele schlechte. Schwellwert als ENV konfigurierbar (AI_SIGNAL_MIN_CONFIDENCE).
- Consequence: Signale unter 0.4 werden still verworfen (nur geloggt, nicht in Queue). Kann nach Erfahrungswerten angepasst werden.

## DEC-053 — E-Mail-Signale nur bei classification anfrage/antwort
- Status: accepted
- Reason: Nur geschaeftsrelevante E-Mails (Anfragen, Antworten) enthalten Deal-Signale. Newsletter, Spam, Auto-Replies, Info-Mails haben keinen Handlungsbedarf fuer Property-Aenderungen. Reduziert LLM-Kosten und Queue-Noise.
- Consequence: Der classify Cron setzt signal_status nur bei classification IN ('anfrage', 'antwort'). Andere E-Mails erhalten keinen signal_status.

## DEC-054 — KI-Badge via Activities statt Entity-Spalte
- Status: accepted
- Reason: Eine Spalte `ai_applied_at` auf deals wuerde nur die letzte Aenderung speichern und erfordert Schema-Aenderung. Activities bieten volle Historie (was wurde wann geaendert, welche Queue-Aktion) und existieren bereits. 30-Tage-Fenster fuer Badge-Anzeige verhindert UI-Ueberladung.
- Consequence: Jede angewandte Queue-Aktion erzeugt eine Activity (type='ai_applied'). Deal-Workspace prueft Activities mit ai_generated=true der letzten 30 Tage. Keine Schema-Aenderung an deals/contacts noetig.

## DEC-055 — Produkt-Stammdaten als eigenstaendige Tabelle
- Status: accepted
- Reason: Produkte sind eigenstaendige Entitaeten mit eigenem Lebenszyklus (aktiv/inaktiv/archiviert), eigenen Feldern und eigenen Auswertungen. Kein JSON-Feld auf Deals, sondern normalisierte Tabelle. Ermoeglicht spaetere Integration mit Intelligence Studio (System 4).
- Consequence: Neue Tabelle `products` mit Standard-CRUD. Zuordnung zu Deals ueber `deal_products` (n:m).

## DEC-056 — Produkt-Kategorien als Freitext mit Autocomplete
- Status: accepted
- Reason: Produkt-Kategorien aendern sich mit dem Geschaeft. Ein festes Enum wuerde staendig Migrationen erfordern. Freitext mit Autocomplete ist flexibler und bereits erprobtes UI-Pattern (wie Branchen auf Firmen).
- Consequence: `products.category` ist TEXT, kein Enum. Frontend bietet Autocomplete basierend auf bestehenden Werten.

## DEC-057 — Deal-Produkt-Zuordnung als n:m-Tabelle
- Status: accepted
- Reason: SQL-Joins fuer Umsatz-pro-Produkt-Auswertungen sind trivial mit Tabelle, komplex mit Array. Preis und Menge pro Zuordnung moeglich. Referentielle Integritaet durch FK-Constraints. Array-Feld waere denormalisiert und wuerde jede Auswertung verkomplizieren.
- Consequence: Neue Tabelle `deal_products` mit deal_id, product_id, price, quantity. Unique Constraint auf (deal_id, product_id). ON DELETE RESTRICT auf product_id (Produkte mit Deal-Zuordnungen koennen nicht geloescht, nur archiviert werden).

## DEC-058 — Ziel-Unique-Constraint mit COALESCE
- Status: accepted
- Reason: Ein User soll nicht zwei Umsatz-Jahresziele fuer 2026 fuer dasselbe Produkt haben koennen. Gleichzeitig muss ein Gesamtziel (product_id=NULL) neben produktspezifischen Zielen existieren koennen. PostgreSQL behandelt NULL != NULL bei Unique Constraints, daher COALESCE auf einen Sentinel-UUID.
- Consequence: Unique Index auf goals(user_id, type, period, period_start, COALESCE(product_id, '00000000-...'::UUID)).

## DEC-059 — KPI-Snapshots als generische Tabelle
- Status: accepted
- Reason: Eine Tabelle mit kpi_type-Spalte statt separate Tabellen pro KPI. Ein Cron-Job, ein Index-Pattern, ein Query-Pattern. Neue KPIs hinzufuegen = nur neuer kpi_type-Wert, kein Schema-Change. Speicherverbrauch vernachlaessigbar (~18.000 Zeilen/Jahr).
- Consequence: Neue Tabelle `kpi_snapshots` mit kpi_type TEXT. Idempotenz ueber Unique Index auf (date, user, type, period, product).

## DEC-060 — CSV-Import als Server Action
- Status: accepted
- Reason: Fuer Internal Tool ist eine Server Action einfacher als ein separater API-Endpoint. Client-Side CSV-Parsing (Papa Parse), Validierung und Preview, dann Server Action fuer den tatsaechlichen Insert. Kein File-Upload an Server noetig.
- Consequence: Server Action `importGoalsFromCSV()` empfaengt validierte Daten, kein File. CSV-Parsing und Validierung passieren im Browser.

## DEC-061 — GoalCard Premium-Styling statt KPICard-Ersatz (V6.1)
- Status: accepted
- Reason: GoalCard hat komplexere Logik als KPICard (Progress-Ring, Prognose-Integration, abgeleitete Ziele). Ersetzen wuerde Funktionalitaet verlieren. Stattdessen wird GoalCard mit KPICard-Styling aufgeruestet (Gradient-Akzentlinie, Brand-Shadows, hover-Effekte).
- Consequence: GoalCard behaelt eigene Implementierung, uebernimmt aber visuelles Pattern von KPICard. Kein Rewrite, sondern CSS/Tailwind-Anpassung.

## DEC-062 — Prognose als kompakte ForecastCard statt Full-Width-Block (V6.1)
- Status: accepted
- Reason: User-Feedback: "alles noch ein bisschen zu wuchtig". Drei separate Forecast-Werte (Pipeline-gewichtet, historisch, kombiniert) in Full-Width-Block ist zu breit. Kompakte Kachel neben Goal-Cards spart Platz und verbessert Uebersicht.
- Consequence: ForecastBlock wird zu ForecastCard umgebaut. Zeigt nur kombinierten Forecast + Delta + Deals-noetig. Detail-Werte optional per Hover/Tooltip.

## DEC-063 — Wochen-Check als Tab-Toggle in DailyActivityCheck (V6.1)
- Status: accepted
- Reason: Kein separater Route oder Seite noetig. Heute/Woche-Toggle ist natuerlicher Wechsel innerhalb derselben Karte. WeeklyComparison-Komponente wird ueberfluessig und entfaellt.
- Consequence: DailyActivityCheck erweitert um Toggle + 5-Spalten-Tagesraster. WeeklyComparison entfaellt. Neue Server Action fuer per-Tag-Abfrage.

## DEC-064 — Eigener Cadence-Execute-Cron statt IMAP-Sync-Erweiterung (V5)
- Status: accepted
- Reason: Cadence-Execution hat andere Intervalle (15 Min vs. 5 Min), andere Logik (Template-Rendering, Abort-Check, Step-Advance) und andere Fehlerbehandlung als IMAP-Sync. Mischung in einen Cron wuerde beide Pipelines fehleranfaellig machen.
- Consequence: Neuer `/api/cron/cadence-execute` Endpoint (alle 15 Min). Neuer Coolify Cron-Job. Bestehende Crons bleiben unveraendert.

## DEC-065 — E-Mail-Zuordnung 3-Stufen im bestehenden Pipeline (V5)
- Status: accepted
- Reason: Stufe 1 (exakter Adress-Match) ist bereits im IMAP-Sync implementiert und erfordert nur das Setzen von assignment_source. Stufe 2 (KI-Match) passt natuerlich in den Classify-Cron, der bereits Bedrock nutzt und E-Mails nach Klassifikation verarbeitet. Ein separater Zuordnungs-Cron waere Overhead ohne Vorteil.
- Consequence: IMAP-Sync wird um assignment_source erweitert (minimal). Classify-Cron erhaelt KI-Match-Logik fuer nicht-zugeordnete relevante E-Mails. Kein neuer Cron-Endpoint noetig.

## DEC-066 — Self-hosted Tracking via eigene API-Route (V5)
- Status: accepted
- Reason: Tracking-Pixel und Link-Wrapping sind technisch simpel (1x1 GIF + 302 Redirect). Ein externer Tracking-Service wuerde Abhaengigkeit, Kosten und Datenschutz-Komplexitaet einfuehren ohne Mehrwert fuer Single-User internes Tool. Eigene Route `/api/track/[id]` unter voller Kontrolle.
- Consequence: Oeffentliche API-Route ohne Auth. Middleware-Whitelist-Erweiterung. Tracking-Zuverlaessigkeit ~50-70% (Pixel-Blocking akzeptiert). Keine externe Abhaengigkeit.

## DEC-067 — Export-API-Key als ENV-Variable statt user_settings (V5)
- Status: accepted
- Reason: Single-User-System. Ein API-Key reicht. user_settings wuerde UI fuer Key-Management erfordern (Generierung, Anzeige, Rotation) — Overengineering fuer den Anwendungsfall. ENV ist konsistent mit bestehenden Secrets (CRON_SECRET, SMTP_PASSWORD).
- Consequence: `EXPORT_API_KEY` in Coolify ENV. Key-Rotation erfordert Redeploy. Bei spaeterem Multi-User (V7): Migration zu user_settings oder OAuth2 moeglich.

## DEC-068 — Cadence-Abbruch via Thread-ID primaer + From-Address Fallback (V5)
- Status: accepted
- Reason: Thread-ID-Match (via email_messages.thread_id auf Threads der Cadence-E-Mails) ist praezise aber setzt voraus, dass der Empfaenger im selben Thread antwortet. From-Address-Fallback (email_messages WHERE from_address = kontakt.email AND received_at > enrollment.started_at) fängt Antworten auf, die den Thread brechen. Zusammen decken beide Pfade >95% der realen Antwort-Szenarien ab.
- Consequence: Cadence-Abort-Check prueft beide Bedingungen. False-Positive moeglich bei From-Address-Fallback (Kontakt schreibt unabhaengige E-Mail → Cadence stoppt). Akzeptabel, weil false-positive (zu frueh stoppen) besser ist als false-negative (trotz Antwort weiter mailen).

## DEC-069 — Shared Email-Send-Layer mit Tracking-Injection (V5)
- Status: accepted
- Reason: Manueller E-Mail-Versand (emails/actions.ts) und Cadence-E-Mail-Versand brauchen denselben SMTP-Pfad, dieselbe DB-Logging-Logik und dieselbe Tracking-Injection. Ohne Shared Layer wuerde Code dupliziert und Tracking nur in einem Pfad funktionieren.
- Consequence: Neuer `/lib/email/send.ts` als zentraler Versand-Layer. Bestehender sendEmail in actions.ts wird Wrapper um den Shared Layer. Cadence-Execution nutzt denselben Layer. Tracking-Pixel und Link-Wrapping werden transparent injiziert.

## DEC-070 — Asterisk 20 LTS als PBX-Container (V5.1)
- Status: accepted
- Reason: Asterisk ist die etablierteste Open-Source-PBX. Version 20 ist LTS (Support bis 2028). Docker-Container auf bestehendem Hetzner-Server minimiert Infrastruktur-Kosten. PJSIP-Stack unterstuetzt WebRTC nativ (WSS-Transport, DTLS-SRTP, Opus). Alternative FreeSWITCH ist komplexer zu konfigurieren und weniger verbreitet. Asterisk idle RAM: ~50-80 MB — vernachlaessigbar neben Jitsi.
- Consequence: Neuer Docker-Service `asterisk` im docker-compose.yml. Custom Dockerfile auf Debian Bookworm mit Asterisk 20 LTS. PJSIP als einziger SIP-Stack (kein chan_sip). Config-Dateien im Repo unter `/asterisk/config/`. ENV-basierte SIP-Trunk- und SMAO-Konfiguration ueber entrypoint.sh Template-Rendering.

## DEC-071 — SIP.js als WebRTC-Library (V5.1)
- Status: accepted
- Reason: SIP.js ist die am aktivsten gewartete SIP-over-WebSocket Library (letzer Release 2024, TypeScript-native). Saubere API fuer UserAgent, Registerer, Inviter, Session. JsSIP ist aelter und weniger aktiv gewartet. Beide Libraries sind funktional aehnlich, aber SIP.js hat bessere TypeScript-Typen und klarere Dokumentation.
- Consequence: `sip.js` als neue package.json Dependency (~200 KB Bundle). Browser-seitige WebRTC-Integration ueber SIP.js UserAgent. Registrierung bei Asterisk via WSS (TLS-terminiert durch Traefik). Session-Events steuern die CallWidget-UI.

## DEC-072 — WSS ueber eigene Subdomain sip.strategaizetransition.com (V5.1)
- Status: accepted
- Reason: WebSocket-Verbindungen fuer SIP sind persistent und haben andere Lastcharakteristik als HTTP-Requests. Eigene Subdomain trennt SIP-Traffic sauber von HTTP-Traffic. Traefik routet nach Host-Header — keine Pfad-Kollisionen mit Next.js. Pfad-basierter Ansatz (/ws/sip) wuerde komplexeres Next.js-Middleware-Setup erfordern und koennte mit bestehenden WebSocket-Nutzungen kollidieren.
- Consequence: DNS A-Record `sip.strategaizetransition.com` → gleiche Server-IP. Coolify-Domain-Konfiguration fuer `asterisk`-Service. Traefik-Labels analog zu `jitsi-web`-Pattern. TLS-Zertifikat via Let's Encrypt (Coolify-Standard).

## DEC-073 — WAV-Aufnahme via MixMonitor (V5.1)
- Status: accepted
- Reason: MixMonitor ist Asterisk's native Recording-Applikation. WAV (PCM, 16-bit) ist das Default-Format und wird von OpenAI Whisper API direkt akzeptiert — keine Konvertierung noetig. Opus waere ~5x kleiner, erfordert aber MixMonitor-Nachbearbeitung oder Custom-Encoding. Bei V5.1-Volumen (1-5 Calls/Tag, <30 Min) ist Dateigroesse irrelevant (~10 MB/Min WAV). Retention-Cron loescht nach 30 Tagen.
- Consequence: MixMonitor schreibt WAV nach `/var/spool/asterisk/monitor/{callId}.wav`. call-processing-Cron laedt WAV direkt in Supabase Storage. Whisper-Adapter erhaelt WAV ohne Konvertierung. Spaeterer Wechsel auf Opus-Recording moeglich ueber MixMonitor-Options (kein Code-Change, nur Config).

## DEC-074 — Calls als eigene Tabelle (V5.1, erweitert DEC-021)
- Status: accepted
- Reason: DEC-021 hat bereits festgelegt: "Activities bleibt polymorpher Timeline-Store, Meetings/Calls als eigene Tabellen. Calls-Tabelle folgt bei Bedarf." V5.1 implementiert nun die Calls-Tabelle. Calls brauchen reichere Felder als Activities (Recording-URL, Transcript, Summary, Voice-Agent-Klassifikation, Dauer, Richtung). Bestehende Activities-Tabelle zeigt Call-Summary in der Timeline ueber source_type='call' + source_id.
- Consequence: Neue `calls`-Tabelle mit Recording-Pipeline-Feldern (analog meetings). Activity-Insert mit type='call' und source_id-Verlinkung. Deal-Workspace Timeline rendert Call-Activities mit Dauer und Summary-Preview.

## DEC-075 — Generisches VoiceAgentProvider-Interface (V5.1)
- Status: accepted
- Reason: SMAO (Berlin, KI-Voice-Agent) ist ein kleines Startup — API kann sich aendern oder Firma kann verschwinden. Synthflow (Berlin, besser funded) ist Backup. Adapter-Pattern ist konsistent zu bestehenden Providern: Whisper (DEC-035), Embeddings (DEC-047), LLM (DEC-018). Generic Interface definiert was wir brauchen (Transcript, Classification, CallerInfo), nicht was der Provider liefert.
- Consequence: `/lib/telephony/voice-agent/provider.ts` definiert `VoiceAgentProvider`-Interface. `smao.ts` ist erste Implementierung. `synthflow.ts` ist Platzhalter. `factory.ts` liest `VOICE_AGENT_PROVIDER` ENV. Provider-Wechsel = neue Adapter-Klasse + ENV-Aenderung. Kein Feature-Code muss sich aendern.

## DEC-076 — Statische Asterisk-Konfiguration, kein ARI (V5.1)
- Status: accepted
- Reason: ARI (Asterisk REST Interface) ermoeglicht dynamische Call-Steuerung via HTTP-API — maechtig, aber komplex. V5.1 braucht nur: ausgehende Anrufe, eingehende Routing, MixMonitor, Echo-Test. Das ist mit statischen Config-Dateien (pjsip.conf, extensions.conf) sauber abbildbar. ARI wuerde einen zusaetzlichen HTTP-Client im Next.js-Backend erfordern und die Fehlerdomaene vergroessern. Bei Multi-User-Telefonie (V7): ARI nachruestbar.
- Consequence: Asterisk-Config als statische `.conf`-Dateien im Repo unter `/asterisk/config/`. ENV-Variablen werden beim Container-Start via `entrypoint.sh` (envsubst) in die Config geschrieben. Config-Aenderungen erfordern Container-Rebuild. Fuer Single-User akzeptabel.

## DEC-077 — RTP-Port-Range 16384-16484 (V5.1)
- Status: accepted
- Reason: Asterisk-Default ist 10000-20000. Port 10000 ist bereits von Jitsi JVB belegt. Engere Range (100 Ports) reicht fuer 50 parallele Calls (weit mehr als Single-User braucht). 16384 als Start ist SIP-Industrie-Standard (RFC 3550 empfiehlt 16384-32767). Weniger offene Ports auf Hetzner-Firewall = kleinere Angriffsflaeche.
- Consequence: `rtp.conf` mit `rtpstart=16384`, `rtpend=16484`. Hetzner Cloud Firewall: UDP 16384-16484 eingehend oeffnen. Kein Konflikt mit Jitsi JVB (Port 10000). Bei Bedarf erweiterbar.

## DEC-078 — Ulaw-only Codec am webrtc-user Endpoint (V5.1, interim)
- Status: accepted
- Reason: `codec_opus.so` ist im Standard-Ubuntu-asterisk-Paket NICHT enthalten und muesste aus Third-Party-Repo (digium-opus) oder Custom-Build nachinstalliert werden. Bei /qa SLC-514 aufgedeckt: Browser sendet Opus, Asterisk kann nicht zu SLIN dekodieren, 40+ "No translator path" Warnings pro Call, MixMonitor schreibt 44-Byte-Header-only-WAVs. Kurzfristige Loesung: Opus aus der Codec-allow-Liste entfernen. Browser + SIP.js handeln dann sauber PCMU/G.711 (ulaw) im SDP-Answer aus. Ulaw ist 8kHz Telefonie-Standard — Audio-Qualitaet niedriger als Opus (16kHz), aber fuer Whisper-Transkription ausreichend (Whisper unterstuetzt ulaw nativ).
- Consequence: `allow = ulaw` am webrtc-user-Endpoint in `asterisk/config/pjsip.conf`. Opus-Reenablement wird nach V5.1-Release als separater Task angegangen (Third-Party-Repo evaluieren, codec_opus.so installieren, Performance-Vergleich). Audio-Qualitaet ist fuer Call-Recording + Transkription voll ausreichend, fuer reine Sprach-Kommunikation etwas schlechter hoerbar als Opus.

## DEC-079 — direct_media = no am webrtc-user Endpoint (V5.1)
- Status: accepted
- Reason: Asterisk-PJSIP-Default ist `direct_media = yes`, was RTP-Streams peer-to-peer zwischen den Endpoints routet und Asterisk selbst aus dem Media-Pfad raushaelt. Fuer reine SIP-Proxy-Szenarien (Trunk-zu-Trunk) ist das effizient. Fuer WebRTC-Szenarien mit MixMonitor/Echo/Queue ist es aber brechend: Asterisk sieht die Audio-Daten nicht, MixMonitor schreibt 0-Byte-Artefakte, Echo() echo't leeren Stream. Bei /qa SLC-514 als Bestandteil des Audio-Flow-Problems identifiziert.
- Consequence: `direct_media = no` explizit am webrtc-user-Endpoint in `asterisk/config/pjsip.conf`. Asterisk bleibt im RTP-Pfad, MixMonitor und Echo funktionieren. Tradeoff: minimal hoehere CPU-Last auf Asterisk-Container (RTP-Forwarding statt reines SIP-Signaling), bei Single-User-Setup vernachlaessigbar. Fuer zukuenftige Trunk-zu-Trunk-Features (Multi-User V7) bleibt direct_media als separater Endpoint-Config offen.

## DEC-080 — Call-Recordings Storage RLS via BYPASSRLS statt Object-Policies (V5.1)
- Status: accepted
- Reason: MIG-020 hatte initial Object-Level-RLS-Policies fuer den call-recordings Bucket angelegt (analog zu einem theoretischen Multi-User-Szenario). Bei /qa SLC-514 aufgedeckt: Die Policies waren (a) fehlerhaft (FOR ALL USING ohne WITH CHECK blockt INSERT), und (b) unnoetig, weil der Bucket ausschliesslich server-seitig (Cron) beschrieben und nur via API-Route gelesen wird. Das bestehende meeting-recordings Bucket (V4.1) hat KEINE Object-Policies und funktioniert ueber BYPASSRLS auf service_role. Gleiches Pattern hier ist konsistenter und weniger fehleranfaellig.
- Consequence: MIG-021 raeumt die fehlerhaften call_recordings_* Policies weg. MIG-020 wurde im Repo um die Policies-Section bereinigt (mit Kommentar und Verweis auf MIG-021). Alle Storage-Uploads/Downloads laufen kuenftig via service_role + BYPASSRLS, authentifizierte User-Zugriffe auf Recordings passieren ausschliesslich via App-Routes mit Berechtigungs-Checks auf der Deal/Contact-Ebene.

## DEC-081 — V5.2 Compliance-Sprint vor Go-Live (Consent + Retention + Azure-Whisper)
- Status: accepted
- Reason: SLC-514 ist technisch produktionsreif, aber das System darf nicht live gehen ohne DSGVO-Compliance-Massnahmen. In der Strategiediskussion am 2026-04-24 mit dem User festgelegt: (1) Consent wird organisatorisch geloest (Meeting-first / E-Mail-first Sales-Prozess, Cold-Calling vermeiden) statt durch zusaetzliches Gating-UI. (2) Rohdaten-Retention wird von 30 auf 7 Tage reduziert. (3) TRANSCRIPTION_PROVIDER muss auf Azure OpenAI EU-Region umgestellt werden (aktuell OpenAI-API-US = DSGVO-Risiko seit Schrems II). (4) Einwilligungstexte als Templates fuer Meeting-Einladungen + E-Mail-Fusstexte. (5) Meeting-Timeline-Details (MeetingTimelineItem analog CallTimelineItem) als UI-Parity-Task.
- Consequence: V5.2-Sprint wird NACH SLC-515 (SMAO Voice-Agent) eingeplant, vor dem ersten Go-Live mit echten Kunden-/Interessenten-Calls. Waehrend der Bauphase (nur User testet mit sich selbst via Echo-Extension) sind die Compliance-Themen nicht blockend. Als DSGVO-Voraussetzung fuer Release auf anderen Usern: V5.2 muss vorher deployed sein. Detailplanung + Slice-Nummern werden beim V5.2 /requirements-Schritt festgelegt. Siehe Memory project_business_system_consent_strategy.md.

## DEC-082 — Meeting-Summary-Schema mit key_topics analog Call-Summary
- Status: accepted
- Reason: Beim Bau der Call-Summary-Pipeline (SLC-514) wurde ein erweitertes Prompt-Schema mit `key_topics: string[]` etabliert (3-6 Stichworte zum Tagging und zur RAG-Suche). Die aeltere Meeting-Summary (V4.1) hatte das nicht. User wollte Parity. Decisions bleibt Meeting-spezifisch (bei Calls weniger relevant). key_topics wird additiv und optional ergaenzt, sodass bestehende Meeting-Summaries gueltig bleiben.
- Consequence: meeting-summary.ts Schema + Prompt um optional key_topics erweitert. AiSummary-Type erweitert. summary-panel.tsx rendert Themen als Badges (Layout analog call-timeline-item.tsx). Bestehende Meeting-Summaries ohne key_topics zeigen den Block nicht. Neue Summaries bekommen die Stichworte automatisch. Cross-Source-Konsistenz fuer kuenftige RAG/Such-Funktionen ueber alle Pipelines hinweg.

## DEC-083 — Compliance-Templates als eigene Tabelle (NICHT user_settings erweitern)
- Status: accepted
- Reason: V5.2 FEAT-523 braucht 3 separate Template-Bloecke (meeting_invitation, email_footer, calcom_booking). Optionen: (a) `user_settings` um JSONB-Spalte `compliance_templates` erweitern; (b) neue Tabelle `compliance_templates` mit `template_key` PK. Option (a) waere weniger Migration, aber schwerer zu validieren (verschachteltes JSON), schwerer Default-Reset pro Block, und passt nicht zum Charakter der Daten — Compliance-Templates sind nicht user-spezifisch (nur ein Eigentuemer in V5.2), sondern System-Templates die User editieren kann. Option (b) ist sauberer: pro Template-Key eine Row mit `body_markdown` (User-Wert) und `default_body_markdown` (Skill-mitgelieferter Default), sodass "Reset auf Default" trivial ist und Schema-Validierung pro Spalte funktioniert.
- Consequence: MIG-022 erstellt Tabelle `compliance_templates` mit Spalten `template_key TEXT PK`, `body_markdown TEXT NOT NULL`, `default_body_markdown TEXT NOT NULL`, `updated_by UUID NULL` (FK profiles.id), `updated_at TIMESTAMPTZ`. 3 Default-Rows werden bei Migration eingefuegt. RLS analog `user_settings` (`authenticated_full_access`). Server Action `getComplianceTemplate(template_key)` und `updateComplianceTemplate(key, body)` in `cockpit/src/app/(app)/settings/compliance/actions.ts`. Spaeter (V7 Multi-User) kann die Tabelle um `tenant_id` erweitert werden, ohne das aktuelle Modell zu brechen.

## DEC-084 — Variablen-Engine als eigene Mini-Implementation
- Status: accepted
- Reason: FEAT-523 braucht Token-Ersetzung wie `{user_name}` -> "Immo Bellaerts". Optionen: (a) Lodash `_.template` (Bundle-Size +5kb, eval-aehnlich, ueberkomplex); (b) handlebars (Bundle-Size +120kb, voellig ueberdimensioniert); (c) eigene Mini-Implementation mit Regex-Replace. Eigene Mini-Implementation ist trivial (15 Zeilen), hat keine Bundle-Kosten, ist voll typisiert und sicher (kein eval). Token-Liste ist klein und stabil (6 Tokens).
- Consequence: Datei `cockpit/src/lib/compliance/variables.ts` exportiert `applyTemplateVariables(template: string, vars: Record<string, string>): string`. Pattern: `/\{(\w+)\}/g` Regex-Replace, unbekannte Tokens bleiben sichtbar (z.B. `{firma}` bleibt stehen wenn `firma` nicht im vars-Objekt ist) — das ist User-friendly Debug, kein leeres String. Erlaubte Tokens dokumentiert: `user_name`, `user_email`, `firma` (eigene Firma), `kontakt_name`, `kontakt_email`, `kontakt_firma`. Die Token-Liste wird im UI als Hilfe angezeigt. Bei Bedarf koennen spaeter weitere Tokens additiv hinzukommen.

## DEC-085 — Azure OpenAI Whisper via openai-NPM-SDK (AzureOpenAI-Client), nicht eigener HTTP-Client
- Status: accepted
- Reason: Das `openai`-NPM-SDK exportiert seit v4 einen `AzureOpenAI`-Client mit identischem Vertrag wie der OpenAI-Client (`client.audio.transcriptions.create(...)`). Der bestehende OpenAIWhisperProvider nutzt genau diese SDK bereits. Eigener HTTP-Client (fetch + multipart/form-data) waere ~50 LOC mehr Code, eigene Fehlerbehandlung, eigenes Timeout-Handling, eigene Multipart-Logic — ohne Mehrwert. Der AzureOpenAI-Client kuemmert sich um Endpoint-URL-Bau, API-Key-Header und Deployment-ID-Routing.
- Consequence: `AzureWhisperProvider.transcribe()` instanziiert `AzureOpenAI`-Client aus `openai`-Package mit `endpoint`, `apiKey`, `deployment` (Deployment-Name) und `apiVersion`. Methoden-Signatur identisch zu OpenAI-Variante (`client.audio.transcriptions.create({...})`). Damit sind Erfolgs- und Fehlerpfade strukturell identisch — Unit-Tests koennen das gleiche Mock-Pattern wie der OpenAI-Provider nutzen. Keine neue Dependency.

## DEC-086 — Azure-API-Version via ENV mit Default
- Status: accepted
- Reason: Microsoft veroeffentlicht regelmaessig neue Azure OpenAI API-Versionen (z.B. `2024-06-01`, `2024-10-21`). Hardcoded Version waere bequem, blockiert aber jeden Update-Pfad ohne Code-Aenderung. ENV-Variable mit sinnvollem Default ist Standard fuer alle anderen Adapter im System. Kosten: 1 zusaetzliche ENV-Variable.
- Consequence: ENV `AZURE_OPENAI_API_VERSION` mit Default `2024-06-01` (stable, GA seit 2024-06). `AzureWhisperProvider` liest diese ENV. In `.env.example` und `docker-compose.yml` als kommentierter Eintrag mit Hinweis "vor Go-Live ggf. auf neuere stable-Version anpassen".

## DEC-087 — MeetingTimelineItem nutzt meeting.ai_summary direkt — kein Mapping-Layer
- Status: accepted
- Reason: Audit der bestehenden Schemas: Meeting-Summary (`cockpit/src/lib/ai/prompts/meeting-summary.ts`) und Call-Summary haben **identische** Top-Level-Felder: `outcome`, `decisions[]`, `action_items[{owner, task}]`, `next_step`, `key_topics[]?`. Beide werden nach demselben Bedrock-Sonnet-Pattern als JSON erzeugt und in einer `ai_summary`-JSONB-Spalte abgelegt. Ein Mapping-Layer wurde im /requirements-Step als Open Question dokumentiert — ist aber faktisch nicht noetig.
- Consequence: `MeetingTimelineItem`-Komponente kann das `meeting.ai_summary`-Objekt direkt mit derselben Logik wie `CallTimelineItem` rendern. Keine Adapter-Funktion, kein Schema-Mapping. Komponente unterscheidet sich nur in: Icon (Calendar statt Phone), Direction-Label-Logik (Meeting hat keinen `direction`-Begriff, nur Title/Location), Type-Badge ("Meeting" statt "Anruf"). Backwards Compatibility: alte Meetings ohne `key_topics` und ohne erweitertes Schema rendern korrekt — die `hasSummary`-Pruefung filtert leere Felder bereits sauber (siehe call-timeline-item.tsx Zeilen 35-39).

## DEC-088 — Branding-Settings als eigene Tabelle (single-row), nicht user_settings-Erweiterung
- Status: accepted
- Reason: Branding-Daten sind mehrere typisierte Felder (Logo-URL, 2 Hex-Farben, Schrift-Enum, Markdown-Footer, JSONB-Kontaktblock) mit klarer semantischer Eigenstaendigkeit. Eine Erweiterung von `user_settings` (V4.1, FEAT-409) wuerde das Schema vermischen (User-Praeferenzen + Marketing-Branding) und macht spaetere Multi-Branding-Erweiterung (V7) komplizierter. Ein JSON-Blob in `system_settings`/`user_settings` waere weniger typisiert und schwerer zu validieren. Eigene Tabelle `branding_settings` (single-row) ist analog DEC-083 (Compliance-Templates als eigene Tabelle).
- Consequence: Neue Tabelle `branding_settings` in MIG-023 mit typisierten Spalten (`logo_url`, `primary_color`, `secondary_color`, `font_family`, `footer_markdown`, `contact_block JSONB`, `updated_by`, `updated_at`). RLS `authenticated_full_access`. Single-row enforcement an App-Level (UPSERT auf erste Row, keine zweite anlegen). Server Actions `getBranding`/`updateBranding` in `cockpit/src/app/(app)/settings/branding/actions.ts`. Multi-Branding-Erweiterung in V7 fuegt einfach `tenant_id`/`profile_id`-Spalte hinzu — kein Schema-Bruch.

## DEC-089 — Logo-Storage via Supabase Storage Bucket "branding", nicht Data-URI
- Status: accepted
- Reason: Logos sind typisch 50-300 KB. Data-URI in DB wuerde jede `branding_settings`-Read-Query verlangsamen und HTML-Output aufblaehen. Outlook und manche Corporate-Mail-Gateways blockieren oder duenne Data-URIs in `<img src=>`. Public-URL aus Storage Bucket ist zuverlaessiger im E-Mail-Rendering. Strategaize hat bereits Storage-Buckets als Pattern: `documents` (V3), `recordings` (V4 Meetings), `call-recordings` (V5.1).
- Consequence: Neuer Bucket `branding` mit Public-Read, Authenticated-Write. Pfad-Schema `branding/logo-{timestamp}.{ext}`. App-Level-Validierung: max 2 MB, MIME-Types `image/png|jpeg|svg+xml|webp`. Bucket-Erstellung als Teil von MIG-023 (storage.buckets-Insert). Public-URL wird in `branding_settings.logo_url` persistiert. Bei neuem Upload wird alter Logo-File geloescht (App-Level, einfach idempotent).

## DEC-090 — `email_templates.layout` als nullable JSONB ohne Schema (Future-Proofing)
- Status: accepted
- Reason: V5.3 nutzt einfachen Markdown-Body, kein Block-basiertes Layout (Drag-and-Drop wie Mailchimp ist explizit Out-of-Scope). Aber: in V7+ ist Block-Layout wahrscheinlich ein Topic. Schema jetzt vorbereiten ist billig (1 nullable JSONB-Spalte), spaetere Migration bei vollem Datenbestand teuer. Schema festzulegen ohne Use-Case waere over-engineering.
- Consequence: `email_templates.layout JSONB NULL` in MIG-023 ohne Constraint. V5.3-Code ignoriert das Feld komplett (alle Template-Lesepfade nehmen nur `body_*` und `subject_*`). V7+-Block-Builder kann dasselbe Feld mit konkreter JSON-Struktur befuellen ohne Schema-Migration. Dokumentation: V5.3-Code-Kommentar "layout reserviert fuer V7+ Block-Builder" in `template-actions.ts`.

## DEC-091 — Systemvorlagen via SQL-Migration (Seed-INSERT), nicht TS-Seed-Funktion bei App-Start
- Status: accepted
- Reason: Eine Quelle der Wahrheit fuer Schema + Daten. Cockpit-Tracking via MIGRATIONS.md (sichtbar im Cockpit-Audit-Trail). TS-Seed-Funktion bei App-Start hat das Problem, dass App-Restarts auf Production teuer sind und Seeds idempotent sein muessen — was ON CONFLICT in SQL ohnehin sauberer macht. SQL-Migration ist analog zu MIG-022 (Compliance-Templates Default-Rows mit ON CONFLICT DO NOTHING).
- Consequence: MIG-023 enthaelt `INSERT INTO email_templates (...) ON CONFLICT DO NOTHING` fuer 6+ Systemvorlagen (DE) und 1-2 EN/NL. Konkrete Body-Texte werden in der SLC-532-Implementierung ausformuliert (Architektur-Entscheidung ist nur die Seed-Strategie, nicht der Inhalt). Spaetere System-Vorlagen-Erweiterung erfolgt via neue MIG-XXX, nicht via TS-Code.

## DEC-092 — Empfaenger-KI-Vorschlag deterministisch (letzter Inbound-Kontakt → Primary-Contact), kein LLM-Ranking
- Status: accepted
- Reason: V5.3-Scope ist "Mail in unter 60 Sekunden raus". Ein LLM-Call fuer Empfaenger-Ranking kostet Bedrock-Tokens, dauert ~1-2s und ist deterministisch nicht besser als die einfache Heuristik "wer hat zuletzt geschrieben?". Bei Mehrdeutigkeit (mehrere Kontakte schreiben) ist Primary-Contact als Fallback ausreichend. KI-Calls sind nach DEC-052 on-click und sollten Mehrwert bringen — Empfaenger-Vorschlag aus Datenbank-Heuristik bringt mehr Wert als LLM-Ranking.
- Consequence: Server Action `recipient-suggest.ts` ist eine reine SQL-Query (letzte Inbound-Mail fuer Deal sortiert nach `created_at DESC` → `from_address` mappen auf Contact). Fallback `deals.primary_contact_id`. Subject-Vorschlag ist eine Stage-basierte Lookup-Map (hartkodiert in Code, z.B. `discovery → "Erstansprache"`, `proposal → "Follow-up Angebot"`). Kein Bedrock-Call. KI-Ranking via LLM bleibt Open Decision fuer V7+ wenn User-Feedback zeigt, dass deterministisch nicht reicht.

## DEC-093 — Mobile-Composing-Studio: Tabs in derselben Route, kein Sheet-Routing-Split
- Status: accepted
- Reason: Ein Routing-Split (Mobile sieht alte `email-sheet.tsx`, Desktop sieht neue `/emails/compose`) wuerde zwei UI-Pfade pflegen, zwei Tracking-Pfade testen, und der User waere beim Geraetewechsel ploetzlich in einem anderen UI. Tabs in derselben Route ist Standard-Responsive-Pattern (siehe Strategaize Onboarding-Plattform Workspace-Layout) und vermeidet Code-Doppelung. Der bestehende `email-sheet.tsx` bleibt funktional als kleinerer Inline-Editor (z.B. fuer Schnellaktionen aus Tabellenzeilen) — V5.3 ergaenzt die neue Vollbild-Seite, ersetzt nicht abrupt.
- Consequence: `/emails/compose` rendert auf Desktop 3-Panel-Layout (Tailwind `md:grid-cols-[280px_1fr_440px]`). Auf Mobile (`< md`) rendert dieselbe Komponente Tabs (Vorlagen / Erfassen / Preview) via `Tabs`-Komponente von shadcn/ui. State bleibt ueber Tab-Wechsel erhalten (kein State-Reset). Bestehender `email-sheet.tsx` bleibt unveraendert verfuegbar fuer Inline-Schnellaktionen.

## DEC-094 — Inline-Edit-Diktat: pragmatisch raten, Diff-Vorschau ist Sicherheitsnetz
- Status: accepted
- Reason: Ein Modus "KI fragt bei Mehrdeutigkeit nach" wuerde den Workflow verlangsamen (User wartet auf Frage, antwortet, wartet auf Re-Generation). Der eigentliche Sicherheitsmechanismus gegen falsche Aenderungen ist die zwingende Diff-Vorschau — der User sieht die Aenderung BEFORE Uebernahme. Wenn die KI falsch liegt, klickt der User "Verwerfen" und probiert nochmal. Pragmatisch raten + Diff-Preview ist schneller als Konversations-Modus.
- Consequence: System-Prompt in `email-inline-edit.ts` enthaelt explizite Regeln: "Wenn die Anweisung mehrdeutig ist, waehle die wahrscheinlichste Interpretation. Erfinde keine Fakten, Namen oder Zahlen. Behalte Sprache und Ton des Original-Bodys bei. Aendere nur den Teil, den der User explizit nennt." Diff-Vorschau ist mandatory (User-Klick "Akzeptieren" pflichtig vor Body-Replace). Smoke-Test in SLC-535 QA-Report dokumentiert min. 3 Test-Faelle (klare Anweisung, mehrdeutige Anweisung, problematische Anweisung mit erwartetem Verwerfen).

## DEC-095 — Branding-Renderer als Single-Source-of-Truth fuer HTML-Output
- Status: accepted
- Reason: Wenn Live-Preview und tatsaechlicher Versand zwei verschiedene Render-Pfade haetten (z.B. Preview rendert clientseitig anders), entstehen Drift-Bugs ("die Mail sah in der Vorschau anders aus"). Diese Bugs sind teuer zu finden, weil Preview-Render-Code und Send-Render-Code unabhaengig drifteten. Architekturleitplanke aus PRD V5.3.
- Consequence: `cockpit/src/lib/email/render.ts` exportiert eine pure Funktion `renderBrandedHtml(body, branding, vars) → string`. Live-Preview ruft diese Funktion direkt im Client. `send.ts` ruft dieselbe Funktion serverseitig. Keine separate Preview-Render-Logik. Pure Function ohne I/O → trivial via Snapshot-Tests testbar (min. 3 Snapshots in SLC-531: leeres Branding-Fallback, vollstaendiges Branding, edge-case Branding mit nur Logo). Variablen-Ersetzung passiert VOR dem HTML-Render (in derselben Funktion, separate interne Sub-Funktion).

## DEC-096 — `generateEmailTemplate` als Server Action (kein Unified-Endpoint), App-Level-Read-Only-Guard fuer Systemvorlagen auf BOTH delete + update
- Status: accepted
- Reason: Zwei kleine, aber konsequente Architektur-Entscheidungen aus SLC-532-Implementation:
  (a) Der KI-Vorlagen-Generator wird vom Composing-Studio (SLC-533) ueber eine Server Action aufgerufen, nicht aus einer Client-Komponente. Ein Re-Routing ueber den Unified-Endpoint `/api/ai/query` waere ein unnoetiger HTTP-Hop ueber den eigenen Server (Server Action → fetch zu `/api/ai/query` → Server Action). Direkter `queryLLM`-Call in der Server Action ist 5 Zeilen weniger Code, vermeidet doppelte Auth/Rate-Limit-Boilerplate, und gibt dem Composing-Studio direkt typisierte Rueckgabe statt JSON-Roundtrip. Pattern-Wahl ist generell: Client-Caller → Unified-Endpoint, Server-Caller → Server Action mit `queryLLM` (siehe Dev-System IMP-167).
  (b) Systemvorlagen (`is_system=true`) sind App-Level-Read-Only. Slice-Spec verlangte den Guard nur auf `deleteEmailTemplate`. Ohne zusaetzlichen Guard auf `updateEmailTemplate` koennte ein User die Read-Only-Semantik trivial umgehen (Body-Ueberschreibung, oder bei FormData-Mapping sogar `is_system`-Toggle). Read-Only-Garantie braucht Guard auf BOTH Operationen (siehe Dev-System IMP-168). Insert ist sicher, weil `createEmailTemplate` `is_system=false` hartkodiert setzt und kein FormData-Mapping fuer das Feld erlaubt.
- Consequence:
  - `cockpit/src/app/(app)/emails/compose/template-generate-action.ts` ruft `queryLLM` direkt mit Auth + Rate-Limit + Audit-Log (`[ai-audit] generateEmailTemplate provider=bedrock region=... model=... user=... lang=...`). Der Audit-Log-Format-String matcht das Pattern, das auch der Unified-Endpoint produzieren wuerde — kuenftige Aggregation bleibt moeglich.
  - `cockpit/src/app/(app)/settings/template-actions.ts` blockt sowohl `deleteEmailTemplate` als auch `updateEmailTemplate` fuer `is_system=true` mit klarer Fehlermeldung. Code-Kommentar verweist auf "duplicateSystemTemplate als legitimer Pfad fuer User-Anpassung".
  - Inline-Edit-Diktat (SLC-535) wird denselben Server-Action-Pattern verwenden (Voice-Input → Server Action mit Bedrock-Direct-Call). Konsequenz wird in SLC-535-Implementation referenziert.
  - Defense-in-Depth via DB-Trigger oder RLS-Policy auf `is_system`-Toggle ist V7-Topic (Multi-User), nicht V5.3.

## DEC-097 — Junction-Table `email_attachments` statt JSON-Spalte auf `emails` (V5.4)
- Status: accepted
- Reason: V5.4 FEAT-542 muss N Anhaenge pro Mail persistieren. Eine eigene `email_attachments`-Junction-Tabelle ermoeglicht Aggregat-Queries (z.B. "alle PDFs der letzten 30 Tage"), Index-Performance auf `email_id`, sauberes Schema mit FK + Cascade, und passt zu bestehenden Datenmodell-Patterns (Activities, Documents). JSON-Spalte auf `emails` waere kompakter, aber Queries und Cleanup operativ unangenehm und schwerer zu indexieren.
- Consequence: MIG-025 legt `email_attachments` an mit `(id UUID PK, email_id UUID FK ON DELETE CASCADE, storage_path TEXT, filename TEXT, mime_type TEXT, size_bytes BIGINT, created_at TIMESTAMPTZ)`. Index auf `email_id`. RLS `authenticated_full_access`. Insert nach erfolgreichem SMTP-Send in `sendEmailWithTracking`. Storage-Files NICHT cascade — Audit-Spur bleibt im Bucket erhalten (zukuenftiger Cleanup-Cron).

## DEC-098 — Storage-Path mit `compose_session_id`, kein Post-Send-Move (V5.4)
- Status: accepted
- Reason: Beim Anhang-Upload existiert `email_id` noch nicht (entsteht erst nach Send). Zwei Wege moeglich: (a) Path mit `compose_session_id`, nach Send Move zu `email_id`-Folder, oder (b) Path mit `compose_session_id` bleibt, Junction-Table mappt. Variante (a) waere zusaetzlicher Storage-Roundtrip pro Anhang fuer reine Path-Hygiene — kein operativer Gewinn. Junction-Table ist der Index, nicht der Path. Audit-Anfragen ueber `SELECT storage_path FROM email_attachments WHERE email_id = ?` funktionieren in beiden Varianten gleich.
- Consequence: Server Action `uploadEmailAttachment(file, composeSessionId)` schreibt direkt in finalen Path `{user_id}/{compose_session_id}/{filename}`. `sendComposedEmail` erstellt nach Send Junction-Rows mit exaktem Upload-Pfad. Keine Move-Operation. Path-Schema-Drift (`compose_session_id` taucht ewig in Storage-Listings auf) ist akzeptiert — kein User-Sichtbarkeits-Issue weil privater Bucket.

## DEC-099 — MIME-Whitelist als shared Konstante, nicht Server-only (V5.4)
- Status: accepted
- Reason: MIME-Validierung passiert auf zwei Ebenen: Browser-Filter (UX, verbotene Files gar nicht ladbar) und Server-Action (Sicherheit, Browser-Bypass). Wenn beide Ebenen ihre eigene Whitelist haetten, drift moeglich — klassische Bug-Quelle. Eine plain TypeScript-Datei ohne Server-Side-Effects ist trivial in beide Welten importierbar.
- Consequence: `cockpit/src/lib/email/attachments-whitelist.ts` exportiert `MIME_WHITELIST` (Array von MIME-Types), `EXTENSION_WHITELIST` (abgeleitet), `MAX_FILE_SIZE_BYTES` (10 MB), `MAX_TOTAL_SIZE_BYTES` (25 MB). Browser nutzt Konstanten in `<input type="file" accept="...">` und in `onChange`-Validation. Server Action ruft `validateAttachment(file)` mit derselben Konstante. Kein Server-only-Marker, kein Node-only-Code in der Datei.

## DEC-100 — ZIP rein, Inhalt nicht inspizieren (V5.4)
- Status: accepted
- Reason: ZIPs koennen verbotene Formate (EXE, JS, BAT) im Inneren tragen → unsere MIME-Whitelist gilt nur am Top-Level. Drei Optionen: (a) ZIP raus, Maximalsicherheit aber UX-Einschraenkung fuer B2B-Vertrieb (Multi-File-Pakete sind realistisch), (b) ZIP rein, kein Inhalt-Inspection, B2B-pragmatisch, (c) ZIP rein mit Server-side Unzip + Per-File-MIME-Check, hoher Implementierungs-Aufwand mit Edge-Cases (verschluesselte ZIPs, geschachtelte ZIPs, Bombs). User selbst legt Files aus, kein Forwarding-Use-Case → Restrisiko klein. Empfaenger-Mailserver-Filter ist die zweite Verteidigungslinie.
- Consequence: Whitelist enthaelt `application/zip` und Endung `.zip`. Keine Unzip-Logik, keine Library. Akzeptiertes B2B-Restrisiko ist im PRD V5.4 Risks-Section dokumentiert. Wenn User-Bedarf entsteht (z.B. Compliance-Anforderung): separater Slice mit Server-side Unzip.

## DEC-101 — Anhang-UI als Sektion unter Body (nicht Tab) (V5.4)
- Status: accepted
- Reason: Compose-Form-UX-Frage: Anhang-Bereich als eigene Sektion unter Body-Textarea oder als Tab. Sektion ist flacher (User sieht Body und Anhaenge ohne Klick), Tab waere 1 zusaetzlicher Klick + Erinnerungs-Risiko ("ich hatte einen Anhang dran, ist der noch da?"). B2B-Vertriebs-Mails haben oft 1-2 Anhaenge, nicht 10 — Sektion bleibt visuell erfassbar.
- Consequence: `<AttachmentsSection>`-Komponente direkt unter `<BodyTextarea>` in `compose-form.tsx`. Vertikaler Layout-Verlauf: Empfaenger → Betreff → Body → Anhaenge → Send-Button. Kein zusaetzlicher Tab-State. Live-Preview-Indikator analog im rechten Panel unter Body-Render.

## DEC-102 — Color-Picker via wiederverwendbare `<ConditionalColorPicker>`-Komponente (V5.4)
- Status: accepted
- Reason: ISSUE-043 zeigt: native `<input type="color">` submitted immer einen gueltigen Hex-Wert, auch wenn der User die Picker nie bewusst angefasst hat. AC9 aus FEAT-531 ("Mail ohne Branding bit-fuer-bit identisch zu V5.2") gilt nur noch im Initial-State. Drei Loesungen moeglich: (a) Toggle-Checkbox vor jedem Color-Picker, (b) globaler Reset-Button "Branding zuruecksetzen", (c) Text-Input mit Hex-Validation. Toggle ist semantisch klar ("Markenfarbe verwenden: ja/nein") und lokal pro Color-Picker — primary aktiv und secondary inaktiv ist moeglich. Reset-Button waere global und zu grob. Text-Input verliert die Color-Visualisierung. Toggle als wiederverwendbare Komponente macht spaetere Branding-Erweiterungen (Hover-Color, Background) trivial.
- Consequence: Neue Komponente `cockpit/src/components/branding/conditional-color-picker.tsx` mit Props `{ label, value, onChange, defaultColor }`. State `enabled = value !== null`. Toggle-Click setzt entweder NULL oder `defaultColor`. Native `<input type="color">` bleibt erhalten, ist aber `disabled` wenn Toggle aus. Form-Submit-Mapping: NULL bei Toggle aus, Hex bei Toggle an. Bestehende Branding-Eintraege werden NICHT in der Migration auf NULL gesetzt — User-Mental-Model "wenn Wert da ist, ist es aktiv" bleibt konsistent.

## DEC-103 — V5.4-Polish in einen Slice (SLC-541), kein Code/Doku-Split (V5.4)
- Status: accepted
- Reason: V5.4 FEAT-541 buendelt 4 Themen: Color-Picker-Toggle (Code), ESLint Hook-Order (Code), COMPLIANCE.md V5.3-Update (Doku), Coolify-Cron-Cleanup-Anleitung (Doku). Die 4 Themen sind zusammen ~3-4h Arbeit. Aufteilung in 2 Slices (Code vs. Doku) waere Slicing-Overhead ohne Gewinn — ein Slice = ein QA-Lauf = ein Commit-Bundle = ein Release-Eintrag. COMPLIANCE.md-Update und Coolify-Cron-Doku sind Dokumentations-Add-Ons, die im selben PR-Mental-Model wie die Code-Aenderung funktionieren.
- Consequence: SLC-541 hat 5 logische Micro-Tasks (MT-1 ConditionalColorPicker-Komponente, MT-2 /settings/branding-Form-Update, MT-3 ESLint-Cleanup, MT-4 COMPLIANCE.md-V5.3-Section, MT-5 REL-019-Notes mit Coolify-Anleitung). QA fokussiert: Color-Picker-Toggle-Live-Smoke + AC9-Verifikation, ESLint-Build-Output-Pruefung, COMPLIANCE.md-Existenz-Check, REL-019-Notes-Existenz-Check. Coolify-Cron-Cleanup ist User-Aktion in REL-019-Notes; QA verifiziert nur die Anleitung, nicht den Coolify-Zustand.

## DEC-104 — Verwaiste-Anhaenge-Cleanup deferred (kein V5.4-Cron) (V5.4)
- Status: accepted
- Reason: Compose-Session-ID = UUID beim Page-Open (`useState(() => crypto.randomUUID())`), Lebensdauer = Tab-Session. Bei Page-Reload ohne Send bleiben hochgeladene Anhaenge im Storage als verwaiste Files. Cleanup-Cron ist zusaetzliche Komplexitaet: welche Compose-Sessions sind verwaist? Wie lange Wartezeit? Welche `email_attachments`-Junction-Rows existieren noch nicht und sind damit definitiv verwaist? Vs. welche sind noch in einer offenen Tab-Session? V5.4-Scope ist eng. Storage-Volumen-Druck ist nicht akut — Branding-Bucket hat heute <10 MB Logos, `email-attachments`-Bucket wird in den ersten Wochen <100 MB sein.
- Consequence: Tech-Debt im PRD V5.4 dokumentiert (Out-of-Scope-Section: "Verwaiste-Anhaenge-Cleanup-Cron"). Kein Code-Aufwand in V5.4. Monitoring-Punkt: bei `email-attachments`-Bucket >2 GB → Cleanup-Slice mit klarer Strategie planen (z.B. >7d Storage-Files ohne `email_attachments`-Junction-Row → Delete).

## DEC-105 — PDF-Library: pdfmake fuer Server-side Angebot-Renderer (V5.5)
- Status: accepted
- Reason: Drei realistische Optionen evaluiert: (a) `pdfmake` — deklaratives JSON-DocumentDefinition, Node-only, kein Headless-Browser, ~700 KB Bundle, Standard-Schriften ohne Custom-Font-Pipeline. (b) `PDFKit` — imperative Drawing-API, sehr maechtig, hoher Code-Aufwand fuer Tabellen-Layouts mit Discount/Subtotal-Berechnung. (c) Puppeteer/Chromium HTML->PDF — voller HTML/CSS-Support, aber 200+ MB Container-Image, +3-5s Cold-Start im Coolify-Setup, Memory-Druck auf CPX32. pdfmake passt zur Coolify-Container-Runtime (Node-only, klein), liefert sauberes Tabellen-Layout out-of-the-box (Vorbild fuer Position-Tabelle), und ist deklarativ wartbar (Layout-Aenderung = JSON-Anpassung, nicht Drawing-Code-Refactor). Risiko: pdfmake-Layout-Engine ist nicht so flexibel wie HTML/CSS — fuer Standard-Angebot-Layout aber ausreichend.
- Consequence: V5.5 nutzt `pdfmake` als einzige PDF-Library. Adapter `cockpit/src/lib/pdf/proposal-renderer.ts` kapselt die Library. Interface `renderProposalPdf(proposal, items, branding) => Buffer`. Standard-Schriften (Roboto-Subset oder Helvetica) — kein Custom-Font-Loading. Falls in V6+ HTML-CSS-Layout-Fluss noetig wird (z.B. Marketing-Brochure-PDFs): Migration auf Puppeteer als eigene Architektur-Entscheidung.

## DEC-106 — Live-Preview: HTML-Approximation im Browser, Server-PDF on-demand (V5.5)
- Status: accepted
- Reason: Live-Preview hat zwei Modi denkbar: (a) Server-Render bei jeder Aenderung (200-500ms Latenz pro Edit, Cold-Start wenn lange nichts gerendert wurde, hoher Storage-Schreib-Druck wenn jeder Tasten-Druck ein File-Write triggert), (b) Browser-HTML-Approximation (live, sofortig, evtl. minimal abweichend von Server-PDF — andere Schrift-Metriken, Tabellen-Spaltenbreiten). Variante (a) waere bit-genau, aber praktisch nicht live-faehig. Variante (b) ist user-tauglich live, aber Preview-vs-PDF-Drift ist akzeptierte Toleranz. Kompromiss: HTML-Preview fuer Live-Editing, Server-PDF on-demand per "PDF generieren"-Button + obligatorisch beim Send.
- Consequence: `<ProposalPreviewPanel>` rendert HTML-Approximation des PDF-Layouts (Position-Tabelle, Branding-Header, Brutto/Netto/Steuer-Summary). Komponenten teilen sich Daten-Quelle (Form-State), aber NICHT die Render-Logik (HTML vs. pdfmake-DocDef). User-sichtbarer Hinweis: "Vorschau (HTML) — finales PDF kann minimal abweichen". "PDF generieren"-Button schreibt das echte PDF in `proposal-pdfs`-Bucket und zeigt es in `<iframe>`. Beim Send (FEAT-555) wird zwingend das letzte gespeicherte PDF angehaengt — keine On-the-fly-Generierung im Send-Pfad.

## DEC-107 — `proposal_items`-Snapshot inkl. `snapshot_unit_price_at_creation` (V5.5)
- Status: accepted
- Reason: Snapshot-Tiefe-Frage: reichen `snapshot_name` + `snapshot_description`? Audit-Use-Case: "Was war der Standardpreis von Produkt X als das Angebot erstellt wurde?" — heute beantwortbar nur ueber `git log` von `products`-Tabelle (de-facto unmoeglich). Spalte `snapshot_unit_price_at_creation NUMERIC(12,2)` kostet 8 Bytes pro Item-Row, ist beim Insert trivial mitzuschreiben, und macht spaetere Audit-Queries ("Wir haben diesen Kunden 20% unter Listenpreis bekommen") moeglich. Ohne Snapshot waere die Audit-Information dauerhaft verloren wenn `products.standard_price` aktualisiert wird.
- Consequence: `proposal_items` enthaelt `snapshot_name TEXT NOT NULL`, `snapshot_description TEXT`, `snapshot_unit_price_at_creation NUMERIC(12,2)`. Server-Action `addProposalItem` liest aktuellen `products`-Row und schreibt alle drei Snapshots beim Insert. `unit_price_net` (effektiver Angebotspreis) bleibt separat — kann gleich oder abweichend zum Listenpreis sein. UI zeigt Standardpreis nur als "abgeleitet aus Produkt" — User-seitig editierbar wird `unit_price_net`.

## DEC-108 — Status-Sent-Trigger: automatisch beim Send + manueller Klick als Fallback (V5.5)
- Status: accepted
- Reason: Drei Szenarien: (a) User sendet das Angebot ueber das Composing-Studio (FEAT-555), (b) User sendet das Angebot extern (Word, eigener E-Mail-Client) und will den System-Status pflegen, (c) User schickt nur eine Vorschau, will Status nicht aendern. Variante "automatisch beim Send" deckt (a) ab, ignoriert (b)+(c). Variante "nur manuell" zwingt User zu Doppelaktion bei (a). Kombination ist sauber: automatisch beim FEAT-555-Send + manueller Button "Als gesendet markieren" + bewusster No-op wenn extern (User klickt nicht).
- Consequence: FEAT-555 `attachProposalAndSend` ruft am Ende `transitionProposalStatus(id, 'sent')`. Server-Action `transitionProposalStatus` ist idempotent (Status `sent` bleibt `sent`, kein zweiter Audit-Eintrag wenn Status nicht aendert). UI im Workspace hat zusaetzlich Button "Als gesendet markieren" — funktioniert nur wenn Status aktuell `draft`. Confirm-Modal: "Soll dieses Angebot als gesendet markiert werden? Datum=heute".

## DEC-109 — Versionierung-Lifecycle: V1-Status bleibt unangetastet wenn V2 erstellt wird (V5.5)
- Status: accepted
- Reason: Wenn V2 angelegt wird, was passiert mit V1? Drei Optionen: (a) V1 bleibt im urspruenglichen Status (sent/accepted/rejected), V2 ist eigene Datenkette, (b) V1 wird automatisch auf `superseded` gesetzt, neue Status-Variante, (c) V1 wird automatisch `rejected` (semantisch fragwuerdig, V1 wurde nicht abgelehnt). Audit-Wahrheit ist wichtiger als Aufraeumen: V1 wurde tatsaechlich gesendet, ggf. tatsaechlich angenommen — der historische Status bleibt korrekt. V2 ist eine neue Verhandlungsrunde, keine "Korrektur" von V1. UI zeigt Versionsbaum, sodass klar wird welche Version aktuell aktiv ist.
- Consequence: `createProposalVersion(parentId)` setzt nur den neuen Row-Status (`status='draft'`, `parent_proposal_id=parentId`, `version=parent.version+1`) — KEIN Update auf parent. Status `superseded` wird NICHT eingefuehrt. UI zeigt im Workspace-Header "V2 (Vorgaenger: V1, sent am ...)" mit Click-Through-Link. Pipeline/Deal-Workspace zeigt aktive (= hoechste Version mit `status IN (draft, sent)`) Version prominent + Versions-Liste expandable.

## DEC-110 — Auto-Expire-Cron taeglich 02:00 Berlin (V5.5)
- Status: accepted
- Reason: Existierende Daily-Crons laufen 02:00 Berlin Time (`recording-retention`, `kpi-snapshot`, `pending-consent-renewal`). Konsistenz vermeidet Cron-Schedule-Drift. Last ist gering (`UPDATE proposals SET status='expired', expired_at=now() WHERE status='sent' AND valid_until < CURRENT_DATE`). Ein Lauf pro Tag ist ausreichend — Tagesgranularitaet bei `valid_until DATE`-Spalte.
- Consequence: Neuer Cron-Endpoint `cockpit/src/app/api/cron/expire-proposals/route.ts` analog `recording-retention/route.ts` Pattern (CRON_SECRET-Verify, Service-Role-Client, einzelner UPDATE-Query, Logging mit Count). Coolify-Cron-Eintrag `expire-proposals` mit Cron-Expression `0 2 * * *` (02:00 Berlin) nach SLC-554-Deploy. Audit-Log-Eintraege pro expirtem Angebot mit `action='status_change'`, `actor_id=NULL` (System), `context='Auto-expire by cron — valid_until passed'`. REL-020-Notes inklusiv Coolify-Setup-Anleitung.

## DEC-111 — Storage-Bucket-Pfad: `{user_id}/{proposal_id}/v{version}.pdf` (V5.5)
- Status: accepted
- Reason: Pfad-Schema-Frage: (a) `{user_id}/{proposal_id}/v{version}.pdf` — Versionierung im Pfad sichtbar, jede Version eigenes File, alte Versionen bleiben fuer Audit. (b) `{user_id}/{deal_id}/{proposal_id}.pdf` — Deal-Gruppierung im Pfad, aber keine Versionierung (oder Overwrite). (c) `{proposal_id}.pdf` flach — kein User-Scope, kein Cascade-Delete-Pfad. Variante (a) ist am praezisesten: User-Scope (RLS), Proposal-Folder (alle Versionen sehen + listen), Versions-File (Audit-Wahrheit). Pfad-Schema spiegelt das Datenmodell `proposals.parent_proposal_id`-Kette.
- Consequence: `proposal-pdfs`-Bucket, RLS-Policy `(auth.uid())::text = (storage.foldername(name))[1]` (User scope auf erstem Path-Segment). Adapter `getProposalPdfPath(userId, proposalId, version) => string` als single-source-of-truth. PDF-Renderer schreibt unter diesem Pfad. `proposals.pdf_storage_path` persistiert den vollen Pfad. Beim Versions-Erstellen (DEC-109) wird beim ersten "PDF generieren"-Klick der V2-Pfad geschrieben — alte V1-Datei bleibt unberuehrt.

## DEC-112 — Anhang-Picker im Composing-Studio: alle Status zeigen + Warning bei expired/rejected (V5.5)
- Status: accepted
- Reason: Picker-Filter-Frage: (a) nur `draft`+`sent` zeigen — sauber, aber User kann ein abgelaufenes Angebot nicht erneut anhaengen wenn er es bewusst nochmal sendet. (b) alle Status zeigen — flexibler, aber Risiko dass User versehentlich abgelaufenes Angebot raussendet. Loesung: alle Status zeigen, aber bei `expired`/`rejected` deutliche Warning-Badge im Picker und Confirm-Modal beim Anhaengen. Use-Case fuer "expired anhaengen": "Hier nochmal das alte Angebot zur Diskussion" — legitim mit User-Confirm.
- Consequence: Anhang-Picker zeigt alle Angebote des aktuellen Deals. Status-Badge: `draft` (grau), `sent` (gruen), `accepted` (gruen-fett), `rejected` (rot), `expired` (orange). Bei Auswahl von `expired`/`rejected`: Confirm-Modal "Achtung: dieses Angebot ist {status}. Trotzdem anhaengen?". Filename-Pattern bleibt `Angebot-{deal-slug}-V{version}.pdf` — der Status-Hinweis ist im UI, nicht im Filename.

## DEC-113 — Internal-Test-Mode-Watermark: Footer-Zeile + Filename-Suffix (V5.5)
- Status: accepted
- Reason: Watermark-Format-Frage: (a) Diagonal-Wasserzeichen quer ueber jede Seite (sehr deutlich, optisch stoerend in Demo-Calls), (b) Footer-Zeile (subtil, leicht zu uebersehen), (c) Filename-Suffix `.testmode.pdf` (sichtbar im File-System aber nicht im PDF), (d) Header-Banner (ablenkend). Kombination Footer + Filename ist die Goldlocks-Variante: im PDF-Footer liest jeder Empfaenger "Internal-Test-Mode — nicht fuer externe Empfaenger" mindestens beim Drucken/Speichern, im File-Manager sieht der User selbst den `.testmode.pdf`-Suffix. Wird in V5.6 (Post-Compliance-Gate) per Feature-Flag deaktiviert.
- Consequence: PDF-Renderer (DEC-105) prueft Feature-Flag `INTERNAL_TEST_MODE` (default `true` in V5.5). Wenn aktiv: Footer enthaelt fixe Zeile "INTERNAL-TEST-MODE — nicht fuer externe Empfaenger" in 8pt-Font, mittig. Filename-Pattern wird zu `Angebot-{deal-slug}-V{version}.testmode.pdf`. Wenn Flag false (zukuenftiges V5.6): Footer ohne Test-Zeile, Filename ohne `.testmode`-Suffix. Feature-Flag wird via ENV `INTERNAL_TEST_MODE_ACTIVE=true` gesetzt — gleiche Pattern wie V5.1 Compliance-Mechanismus.

## DEC-114 — V5.5 Slicing-Schnitt: 5 Slices SLC-551..555 1:1 zu Features (V5.5)
- Status: accepted
- Reason: Alternative Aufteilung waere (a) Schema (FEAT-551) als isolierter Backend-Slice und Workspace-UI (FEAT-552) splitten in Position-Liste und Editor-Layout, (b) PDF-Renderer (FEAT-553) splitten in Library-Setup + Layout-Implementation, (c) FEAT-554 Status splitten in Lifecycle + Versionierung. 1:1 Mapping ist klarer Boundary, jedes Feature hat dedizierte ACs und QA-Fokus. Schaetzungen: SLC-551 (Schema) ~3-4h, SLC-552 (Workspace) ~6-8h, SLC-553 (PDF) ~5-7h, SLC-554 (Status+Versionierung) ~4-6h, SLC-555 (Composing-Hookup) ~3-4h. Gesamt ~21-29h. Reihenfolge zwingend: SLC-551 -> 552 -> 553 -> 554 -> 555 (jeder baut auf dem vorigen auf).
- Consequence: `/slice-planning V5.5` plant exakt 5 Slices SLC-551..555 1:1 zu FEAT-551..555. Pro Slice ein QA-Lauf, ein Commit-Bundle, ein incremental-Coolify-Redeploy. Kein V5.5-Big-Bang-Release — schrittweiser Aufbau, jeder Schritt im Internal-Test-Mode auf Hetzner verifizierbar. Final-Check + Go-Live + Deploy am Ende der 5 Slices als REL-020.
