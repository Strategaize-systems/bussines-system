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
