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

## DEC-115 — Sum-Validation Split-Plan strict 0% Toleranz (V5.6)
- Status: accepted
- Reason: User-Direktive 2026-05-01 (F2-Korrektur). Empfehlung war 0.5% Toleranz wegen Rundungsproblem (33.33+33.33+33.33=99.99). User-Position: Pattern wie Lohnabrechnungs-Tools — User uebernimmt Verantwortung fuer 100%-Summen. Toleranz waere semantisch unsauber (was ist mit 99.5% bei expliziter Tippfehler-Eingabe?). Frontend-Mitigation via Live-Summen-Anzeige in Echtzeit + klares Error-State macht den Anspruch klar bedienbar. Strict-Validation hat zusaetzlich den Vorteil, dass Backend nicht raten muss ob 99.99 ein Tippfehler oder Rundung ist.
- Consequence: Server Action `saveProposalPaymentMilestones(proposalId, milestones[])` validiert `SUM(milestones.percent) == 100.00` exakt (NUMERIC(5,2)-Typ, kein Float-Drift). Bei Abweichung: Throw mit klarer Fehlermeldung "Summe muss exakt 100% sein, aktuell {sum}%". Frontend zeigt Live-Summen-Indikator unterhalb der Milestone-Liste: gruen bei 100.00, rot mit Diff-Anzeige sonst. Save-Button ist `disabled` solange Sum != 100.00. Kein Toleranz-Konstante, keine Rundungs-Logik. DB-CHECK-Constraint ist nicht moeglich (Constraint kann nicht ueber Aggregat-Werte definiert werden ohne Trigger) — Validation ist App-Level (analog zu Composing-Studio Sum-Checks).

## DEC-116 — Skonto als separate Spalten auf `proposals` mit UI-Mutex zu Vorkasse (V5.6)
- Status: accepted
- Reason: User-Direktive 2026-05-01 (F4-Korrektur). Empfehlung war "Teil der Bedingung" (Freitext-Wert oder Template). User-Position: Skonto ist DE-spezifisch (in NL/internationalen Markten unueblich) und braucht Pro-Angebot-Kontrolle (Toggle on/off). Strukturierte Spalten erlauben PDF-Renderer praezise Block-Generierung "Skonto: X % bei Zahlung innerhalb Y Tagen". Alternative "im Template-Body verstecken" haette PDF-Renderer-Logik mit Freitext-Parsing belastet — fragil. Mutex-Logik UI-only (nicht DB-Constraint), weil DB nur prueft was es kann (`skonto_percent` Range, `skonto_days` Range), aber Vorkasse-Erkennung ueber JOIN auf `proposal_payment_milestones` waere ein Trigger — Over-Engineering fuer V5.6 Scope.
- Consequence: MIG-027 ergaenzt `proposals.skonto_percent NUMERIC(4,2) NULL` und `proposals.skonto_days INTEGER NULL`. Datenmodell-seitig sind beide Felder unabhaengig von `proposal_payment_milestones`. UI im Proposal-Editor: Toggle "Skonto anbieten?" (default off). Bei aktiv: zwei Felder (Prozent 0.01-9.99, Tage 1-90). Beim Speichern: NULL bei Toggle off, beide Werte bei Toggle on. UI-Mutex zu Vorkasse: Frontend prueft `useMemo(() => milestones.find(m => m.due_trigger === 'on_signature' && m.percent === 100))` — bei Match wird Skonto-Toggle `disabled` mit Tooltip "Bei Vorkasse nicht anwendbar". Kein Backend-Reject wenn beides gesetzt — Mutex ist UX, nicht Datenintegritaet. PDF-Renderer (DEC-120) rendert Skonto-Block nur wenn `skonto_percent IS NOT NULL`. Internationaler Use-Case: NL-User aktiviert Toggle einfach nicht, PDF kommt ohne Skonto-Block raus.

## DEC-117 — Briefing-Trigger user-konfigurierbar via `user_settings` (V5.6)
- Status: accepted
- Reason: User-Direktive 2026-05-01 (F6-Korrektur). Empfehlung war fix 30 Min als Default-Compromise. User-Position: braucht Flexibilitaet — Tagesgeschaeft hat Termine mit unterschiedlicher Vorbereitungszeit (kurzer Touch-Base 15 Min vs. Pitch 60 Min). Optionen 15/30/45/60 sind diskret (nicht beliebig), das vermeidet Cron-Logik-Komplexitaet (kein "find ALL meetings in next X minutes for ALL users" — Single-User: ein Trigger-Wert). Persistierung in `user_settings` ist additive Erweiterung der existierenden Tabelle (FEAT-409, V4.1) — keine neue Tabelle, keine RLS-Aenderung, keine Migration-Komplexitaet. Diskrete Werte (Enum-Style) statt freier Integer schuetzen vor Edge-Cases (z.B. User setzt 0 oder 9999).
- Consequence: MIG-027 ergaenzt `user_settings.briefing_trigger_minutes INT NOT NULL DEFAULT 30 CHECK (briefing_trigger_minutes IN (15, 30, 45, 60))`, `briefing_push_enabled BOOLEAN NOT NULL DEFAULT true`, `briefing_email_enabled BOOLEAN NOT NULL DEFAULT true`. Cron `meeting-briefing` liest pro Lauf die Settings (Single-Row-Select fuer Single-User), bestimmt Fenster `[now, now + briefing_trigger_minutes + 5 min]`. Cron-Frequenz bleibt fix bei 5 Min — die +5 ist der Toleranz-Puffer fuer den naechsten Lauf. Neue Settings-Page `/settings/briefing` rendert: Trigger-Zeit als Radio-Group (15/30/45/60 Min), Push-Toggle, E-Mail-Toggle. Default-Backfill fuer existierende `user_settings`-Rows: `UPDATE user_settings SET briefing_trigger_minutes=30 WHERE briefing_trigger_minutes IS NULL` — sauber idempotent dank DEFAULT.

## DEC-118 — Briefing-Cron Idempotenz: `meetings.briefing_generated_at` Marker per UPDATE WHERE NULL (V5.6)
- Status: accepted
- Reason: F11-Empfehlung uebernommen. Cron laeuft 5-Min-Takt — wenn ein Meeting im Trigger-Fenster bleibt waehrend der Bedrock-Call 5-15s laeuft, koennte derselbe Cron-Lauf das Meeting beim naechsten Tick nochmal sehen. Klassische Concurrency-Loesung: Idempotenz-Marker an der Source-Row, der per `UPDATE meetings SET briefing_generated_at = now() WHERE id = $1 AND briefing_generated_at IS NULL` gesetzt wird VOR dem LLM-Call. Postgres-MVCC garantiert Atomicity: nur einer der konkurrierenden UPDATE-Queries gewinnt, der andere bekommt 0-Row-Result und skippt das Meeting. Pattern ist 1:1 identisch zu DEC-110 (Auto-Expire-Cron) und DEC-108 (idempotenter Status-Transition). Alternative: PG_TRY_ADVISORY_LOCK pro Meeting — kompakter, aber weniger sichtbar im Audit (kein DB-Marker bleibt zurueck wenn Lock released).
- Consequence: MIG-027 ergaenzt `meetings.briefing_generated_at TIMESTAMPTZ NULL`. Cron-Endpoint `cockpit/src/app/api/cron/meeting-briefing/route.ts`:
  ```
  for meeting in candidate_meetings:
    UPDATE meetings SET briefing_generated_at=now() WHERE id=$1 AND briefing_generated_at IS NULL RETURNING id
    if no row returned: skip (concurrent run got it)
    if row returned:
      try: generate briefing -> insert activity -> push -> email
      catch: UPDATE meetings SET briefing_generated_at=NULL WHERE id=$1 (re-arm fuer naechsten Lauf)
  ```
  Bei Bedrock-Fehler (Timeout, 503): Reset des Markers, damit naechster Cron-Tick es erneut versucht. Bei dauerhaftem Fehler (LLM-Output validiert nicht): Marker bleibt gesetzt mit Fehler-Activity am Deal als Artefakt — User sieht "Briefing-Generierung fehlgeschlagen" statt stille Loop. Audit-Eintrag pro Briefing mit `actor_id=NULL`, `action='create'`, `entity_type='activity'`, `context='Auto-briefing for meeting {meeting_id} generated at T-{trigger_minutes}min'`.

## DEC-119 — Briefing-Persistierung als Activity (`type='briefing'`) (V5.6)
- Status: accepted
- Reason: F8-Empfehlung uebernommen. Drei Optionen: (a) eigene Tabelle `meeting_briefings` — Maximalstruktur, aber neue Schema-Pflege + neue API-Endpoints + neue Workspace-Hooks fuer Anzeige. (b) JSONB-Spalte `meetings.briefing_payload` — kompakt, aber Briefing ist deal-zentriert (User will nach dem Meeting "alle Briefings dieses Deals" sehen, nicht "Briefing dieses einen Meetings"). (c) Activity (`type='briefing'`) am Deal — passt in bestehendes Daten-Modell, ist sofort sichtbar in Deal-Workspace-Timeline (FEAT-301 zeigt Activities chronologisch), erlaubt spaetere Vergleichs-Use-Cases ("alle Briefings vs. tatsaechlicher Meeting-Outcome"). Activity-Stack ist robust (Audit, Indexierung, RLS).
- Consequence: Cron-Endpoint inserted `INSERT INTO activities (deal_id, type, title, description, source_type, source_id, ai_generated, created_by) VALUES ({deal_id}, 'briefing', 'Pre-Call Briefing fuer {meeting.title}', {briefing_json_stringified}, 'meeting', {meeting_id}, true, NULL)`. Verbindung zum Meeting nutzt das existierende V3-Pattern (`activities.source_type` + `source_id` aus `08_v3_schema.sql`) — KEIN neuer `meeting_id`-FK noetig, KEINE Schema-Aenderung an `activities`. `activities.type` hat keinen CHECK-Constraint (verifiziert) — `briefing` ist eine reine String-Konvention. `ai_generated=true`-Flag aus V4.1 ist bereits vorhanden und wird gesetzt. UI: Deal-Workspace zeigt Briefing-Activity in der Timeline mit Briefing-Icon + Expandable-Render der `keyFacts`/`openRisks`/`suggestedNextSteps`-Sections. Wiederverwendung des bestehenden `<DealBriefingPanel>`-Render-Codes (FEAT-301), neue Variante `<ActivityBriefingCard>` als Wrapper auf der Activity-Timeline. Im Briefing-Activity-`description` wird der validierte JSON-Output des Briefings (`{summary, keyFacts, openRisks, suggestedNextSteps, confidence}`) als Stringified-JSON persistiert — Re-Render parsed JSON.

## DEC-120 — PDF-Renderer-Erweiterung mit V5.5-Fallback bit-identisch (V5.6)
- Status: accepted
- Reason: V5.5 hat bestehende, abgesendete PDFs in `proposal-pdfs`-Bucket — diese Files werden NICHT neu generiert, aber neue Generierungen fuer alte Proposals (z.B. Versionserstellung `createProposalVersion(parentId)`) muessen weiterhin bit-identisch zur V5.5-Render-Logik bleiben, sonst entsteht Drift "alte vs neue Versionen sehen unterschiedlich aus". Loesung: pdfmake-Adapter (`renderProposalPdf`) behaelt seine Signatur, neue Felder werden als optionale Render-Bloecke nach dem bestehenden Layout angefuegt. Block-Logik: nur rendern wenn Daten vorhanden. Proposals ohne Milestones/Skonto erhalten exakt das V5.5-PDF — keine Layout-Verschiebung, kein Drift. SLC-553-Snapshot-Tests werden um Konditionen-Block-Snapshots erweitert.
- Consequence: `cockpit/src/lib/pdf/proposal-renderer.ts` Adapter-Erweiterung:
  - Signatur unveraendert: `renderProposalPdf(proposal, items, branding) => Buffer`. `proposal` enthaelt jetzt zusaetzlich `payment_milestones[]` (joined aus `proposal_payment_milestones`), `skonto_percent`, `skonto_days`.
  - DocDef-Aufbau bleibt identisch fuer Briefkopf, Position-Tabelle, Brutto/Netto-Summary.
  - Neuer Block "Konditionen / Teilzahlungen" zwischen Summary und Footer:
    - Wenn `payment_milestones.length === 0` UND `skonto_percent IS NULL`: Block fehlt (= V5.5-Output bit-identisch)
    - Wenn `payment_milestones.length > 0`: Tabelle "Teilzahlung | Faelligkeit | Betrag" mit allen Milestones, jeweils inkl. `due_trigger`-Label-Render und (bei `days_after_signature`) `due_offset_days`-Anzeige
    - Wenn `skonto_percent IS NOT NULL`: Zeile "Skonto: {percent}% bei Zahlung innerhalb {days} Tagen" unter der Milestone-Tabelle (oder unter Summary wenn keine Milestones)
  - Footer + `.testmode.pdf`-Suffix-Logik (DEC-113) bleiben unveraendert — bei V5.6 (Internal-Test-Mode-aktiv) erhalten neue PDFs weiterhin Test-Mode-Watermark.
  - Snapshot-Tests werden in SLC-563 um 4 Cases erweitert: (1) ohne Milestones+Skonto = bit-identisch zu V5.5-Snapshot, (2) mit Milestones nur, (3) mit Skonto nur, (4) mit beidem. Diff zu V5.5-Snapshot ist Snapshot-Pflicht (Regression-Schutz).

## DEC-122 — NL-VAT-Whitelist {0, 9, 19, 21} + Default 21 (V5.7)
- Status: superseded
- Reason: Strategaize-Sitz ist NL — neue Angebote brauchen NL-Saetze 21/9/0. Aber bestehende V5.5/V5.6-Test-Angebote in der Live-DB wurden mit `tax_rate=19.00` (DE-Standard) erstellt. Snapshot-Prinzip aus DEC-107 verbietet retroaktive Aenderung dieser persistierten Werte. Drei Optionen: (a) strict CHECK {0,9,21} + Migration aller 19%-Rows auf 21% — bricht das Snapshot-Prinzip, kann Cent-Drift erzeugen, brueskiert die User-Vorstellung "Angebot ist eingefroren". (b) CHECK ganz weglassen + nur App-Level-Validierung — verliert DB-Integritaets-Garantie, ungueltige tax_rates landen in DB bei Bug. (c) Whitelist {0,9,19,21} + UI-Dropdown nur 21/9/0 fuer neue Rows + 19% lesbar fuer Legacy. Variante (c) ist additiv, keine Daten-Migration noetig, DB-CHECK greift weiterhin gegen freie Eingabe (z.B. 7, 16, 25), Editor-UI zeigt nur die NL-relevanten Optionen. Default fuer neue Rows wird auf 21.00 gewechselt.
- Consequence: Superseded durch DEC-128 (User-Entscheidung 2026-05-04: DE+NL parallel ueber `business_country`-Switch unterstuetzen, Whitelist um DE-7 erweitert, Pre-Apply-Audit zeigte zusaetzlich `tax_rate=7.00` Legacy-Rows). MIG-028 setzt nun Whitelist `{0, 7, 9, 19, 21}` und Default je nach Country.

## DEC-123 — Reverse-Charge als BOOLEAN-Flag `reverse_charge` auf proposals + Voraussetzungs-Logik (V5.7)
- Status: accepted
- Reason: Reverse-Charge muss persistiert sein (PDF-Render und Audit-Log brauchen den Status), nicht nur abgeleitet. Drei Optionen: (a) `tax_rate = 0` impliziert Reverse-Charge — verwechselt steuerfrei (echte 0%) mit Reverse-Charge, semantisch falsch. (b) Separates Enum `tax_treatment` mit Werten `standard|exempt|reverse_charge` — flexibler, aber V5.7 hat keinen Bedarf an mehr als 2 Modi (standard vs. reverse-charge), Enum-Erweiterung waere YAGNI. (c) BOOLEAN `reverse_charge NOT NULL DEFAULT false` + DB-CHECK dass `reverse_charge = false OR tax_rate = 0.00` — explicit, einfach, app- und DB-validiert. Variante (c) ist die kleinste und klarste Aenderung. Voraussetzungs-Logik fuer Toggle-Aktivierung wird app-side enforced (UI + Server-Action), DB-CHECK schuetzt nur die Konsistenz tax_rate=0 wenn Flag gesetzt.
- Consequence: MIG-028 fuegt `proposals.reverse_charge BOOLEAN NOT NULL DEFAULT false` hinzu plus CHECK `reverse_charge = false OR tax_rate = 0.00`. Editor-Toggle in `proposal-editor.tsx` ist nur aktivierbar wenn alle 3 Voraussetzungen erfuellt: (1) `branding_settings.vat_id IS NOT NULL`, (2) `companies.vat_id IS NOT NULL` (Empfaenger), (3) `companies.address_country` ist EU-Land-Code AND nicht 'NL'. Bei Toggle-ON wird `tax_rate` im UI auf 0% gelockt + Server-Action validiert beide Felder kombiniert. Bei Toggle-OFF wird `tax_rate` auf den User-zuletzt-gewaehlten Wert (oder 21% Default) zurueckgesetzt. UI-Hinweis "Reverse-Charge nicht moeglich — BTW-Nummer Strategaize/Empfaenger fehlt oder Empfaenger sitzt in NL" wenn eine Voraussetzung fehlt. Drittland-Empfaenger (Country!=EU) sehen den Toggle disabled — V5.7 ignoriert Drittland-Pfade.

## DEC-124 — VAT-ID Format-only-Validation + branding_settings.vat_id (V5.7)
- Status: accepted
- Reason: Open Question 3 fragt nach Format-only vs. VIES-Real-Time-Lookup. VIES-Lookup (https://ec.europa.eu/taxation_customs/vies/) ist ein externer SOAP/REST-Service mit unklarer Verfuegbarkeit, Caching-Pflicht (24h-TTL ueblich), und neuer Code-Adapter mit Error-Handling. Risiko: VIES-Down blockiert Save-Flow. V5.7-Scope ist klein (~5-7h) — VIES-Integration koennte +3-5h kosten und einen externen Service-Failure-Pfad einfuehren. Format-only-Pattern-Validation ist trivial: Strategaize-vat_id wird kontextabhaengig validiert (NL-Format `^NL\d{9}B\d{2}$` wenn `business_country='NL'`, DE-USt-IdNr.-Format `^DE\d{9}$` wenn `business_country='DE'` — siehe DEC-128), EU-Format-Regex fuer Empfaenger (`^[A-Z]{2}[A-Z0-9]{2,12}$` + Country-Code-Whitelist fuer EU-Mitglieder). User trippt sich nicht ueber Tippfehler an, aber kann theoretisch eine erfundene Nummer eingeben — das ist akzeptabel fuer Internal-Test-Mode und kann mit BL-420-VIES-Lookup spaeter gehaerten werden.
- Consequence: MIG-028 fuegt `branding_settings.vat_id TEXT NULL` und `companies.vat_id TEXT NULL` hinzu. Validation in `cockpit/src/lib/validation/vat-id.ts` (neu): `validateNlVatId(input)`, `validateDeVatId(input)`, `validateEuVatId(input)` mit Regex + Country-Code-Whitelist (27 EU-Mitgliedstaaten 2026). Settings-Page `/settings/branding` ergaenzt das vat_id-Eingabefeld (kontextabhaengig validiert ueber `business_country`) nach dem Footer-Markdown-Block, mit inline Format-Error. Company-Stammdaten-Edit-Form ergaenzt das vat_id-Feld nach `address_country` (immer EU-General). Beide Felder NULLable — User kann sie spaeter nachtragen. KEIN VIES-Lookup in V5.7. Backlog-Item `BL-420 VIES-Lookup-Integration` wird angelegt fuer spaeter.

## DEC-125 — Reverse-Charge-PDF-Block bilingual NL/EN + hardcoded Phrase (V5.7)
- Status: accepted
- Reason: Open Question 1+2+5 zusammen. (1) Pflichtformulierung: NL-Steuerpraxis nutzt zwei Varianten "BTW verlegd" (NL) oder "Reverse Charge" (EN). Internationale Konvention bei B2B-EU-Cross-Border ist die Kombination NL/EN, plus Verweis auf Article 196 VAT Directive 2006/112/EC. Diese Phrase ist NICHT NL-spezifisch, sondern EU-VAT-Directive-konform. (2) ICP-Meldung (Opgaaf ICP) ist eine quartalsweise Reporting-Pflicht des Unternehmers an die NL-Steuerbehoerde, NICHT eine Pflicht-Zeile auf der Rechnung — das ist ein verbreiteter Irrtum. ICP-Meldung bleibt User-Aufgabe ausserhalb des Systems. (3) Sprache: PDF bleibt deutsch (Strategaize-Kunden sind primaer DE-Sprachraum), nur der Reverse-Charge-Block ist bilingual NL/EN — das ist die Konvention.
- Consequence: Neue Datei `cockpit/src/lib/pdf/reverse-charge-block.ts` (oder Constant in `proposal-renderer.ts`) mit hardcoded Phrase: `"BTW verlegd / Reverse Charge — Article 196 VAT Directive 2006/112/EC"`. Block-Render im pdfmake-Adapter: bei `reverse_charge=true` wird unter dem Tax-Row ein neuer Block "BTW verlegd / Reverse Charge — Article 196 VAT Directive 2006/112/EC" + Zeile "BTW-Nr. {strategaize.vat_id} — BTW-Nr. {company.vat_id}" gerendert. Bei `reverse_charge=false` aber NL-Sitz (Strategaize) wird im Footer optional die Strategaize-BTW-Nummer ergaenzt (immer, auch bei DE-Kunden — NL-konvention). KEINE Pflicht-Phrase fuer ICP, KEINE NL-Sprach-Variante des restlichen PDF-Inhalts in V5.7. Phrase ist hardcoded — falls spaeter Anwaltspruefung andere Formulierung verlangt, einzeiliger Code-Change im File. KEINE DB-Konfiguration in V5.7 (YAGNI fuer Single-Tenant).

## DEC-126 — Skonto-Toggle Bugfix Option A (Optimistic-Revert via useRef last-known-good) (V5.7)
- Status: accepted
- Reason: BL-419 hat 3 Fix-Optionen (A Optimistic-Revert, B Server-Refetch, C UI-Lock). Option B (Server-Refetch) ist robust aber verursacht Netzwerk-Roundtrip pro Save-Error — UX-Kosten bei flaky Connection oder vielen Validation-Errors waehrend Tippen. Option C (UI-Lock) erfordert pending-State-Indikator + ist mit existierendem useSkontoMutex bereits 50% gebaut, aber das Mutex-Pattern adressiert eine andere Klasse Bug (concurrent-edits) — der eigentliche State-Drift entsteht durch verworfenes optimistic update bei Save-Error. Option A (Optimistic-Revert) ist die kleinste Aenderung: ein useRef speichert den letzten gueltigen DB-State, bei Save-Error wird der React-State auf diesen Wert zurueckgerollt. ~30-60min Aufwand. Funktioniert auch mit Bun-Build und SSR-React.
- Consequence: In `proposal-editor.tsx` neuer `useRef<{ skonto_percent: number | null; skonto_days: number | null }>` initialisiert mit DB-State. Bei jedem erfolgreichen Save wird ref auf neuen DB-State aktualisiert. Bei Save-Error setzt der debouncedPersist-Pfad den proposal-State (skonto_percent + skonto_days) auf den ref-Wert zurueck — Toggle bleibt im konsistenten State. Vitest fuer Save-Error-Pfad in `proposal-editor.test.tsx` (neu): Mock Server-Action der mit `{error: 'validation'}` antwortet, verifiziert dass nach 5x Error in Folge der State weiterhin den initial-DB-Wert haelt. Browser-Smoke gegen RPT-277-Repro: ungueltige Prozent-Werte tippen, Toggle pruefen. Pattern wird bei Bedarf in PaymentTermsDropdown + SplitPlanSection nachgezogen — V5.7 prueft das in der Investigation, falls dieselbe Klasse Bug auftritt: in Scope. Falls nicht: out-of-scope (PaymentTermsDropdown nutzt anderen Persist-Pfad).

## DEC-128 — Country-Switch `business_country` global pro Strategaize-Installation (V5.7, supersedes DEC-122)
- Status: accepted
- Reason: User-Entscheidung 2026-05-04 nach Pre-Apply-Audit MIG-028. Audit zeigte 2 Legacy-Rows mit `tax_rate=7.00` zusaetzlich zu den erwarteten 19% — User klaerte: "Es gibt in DE 7+19, in NL 9+21. Bitte alle vier rein, aber wir sollten in den Einstellungen festlegen koennen, wo die Firma ansaessig ist und Rechnungen stellt. Kann auch vorkommen, dass ich von DE aus eine Rechnung stelle." Daraus folgt: globaler Schalter pro Installation, kein Pro-Proposal-Switch. Drei Optionen: (a) Pro-Proposal-Country (jedes Angebot kennt sein "Versender-Land") — Daten-Modell-Aufblaehung, jedes Proposal braucht country, nicht im Sinne des Users der von einer Geschaeftseinheit ausgeht. (b) Globaler Switch in branding_settings (single-row, eine Strategaize-Installation = eine Mehrwertsteuer-Welt zur Zeit, Wechsel moeglich, aber bewusst) — entspricht User-Vorstellung "Grund-Einstellung". (c) Multi-Tenant-Faehigkeit (Pro-Tenant-Country) — V7+, out-of-scope. Variante (b) ist die richtige Granularitaet.
- Consequence: MIG-028 fuegt `branding_settings.business_country TEXT NOT NULL DEFAULT 'NL' CHECK (business_country IN ('DE', 'NL'))` hinzu. DB-Whitelist `proposals.tax_rate` wird auf `{0.00, 7.00, 9.00, 19.00, 21.00}` erweitert (5 Werte: NL 0/9/21 + DE 0/7/19 — 0% ist beiden gemeinsam, ueber Reverse-Charge oder echte Steuerbefreiung). Default `proposals.tax_rate` bleibt `19.00` (DEC-107 Snapshot-Prinzip — die Default-Spalte wird nicht geaendert; die App-Layer setzt initial den Country-spezifischen Default beim Anlegen neuer Angebote: NL=21, DE=19). Editor-Dropdown filtert `tax_rate`-Optionen pro `business_country`: DE zeigt 0%/7%/19%, NL zeigt 0%/9%/21%, Legacy-Wert wird zusaetzlich gerendert wenn Proposal ihn persistiert (z.B. ein DE-Mode-Editor sieht ein altes 9%-Proposal mit Dropdown-Wert "9%" als Legacy-Eintrag, kann auf 0/7/19 wechseln). Strategaize-vat_id (`branding_settings.vat_id`) wird kontextabhaengig validiert: DE=`^DE\d{9}$` (USt-IdNr.), NL=`^NL\d{9}B\d{2}$` (BTW-Nummer). Empfaenger-vat_id auf `companies.vat_id` bleibt EU-General (DEC-124). PDF-Footer zeigt Strategaize-vat_id mit korrektem Bezeichner ("USt-IdNr." in DE-Mode, "BTW-Nr." in NL-Mode). Reverse-Charge-Toggle bleibt in V5.7 NL-spezifisch — der Toggle ist im DE-Mode disabled mit Tooltip "Reverse-Charge in DE-Mode (§ 13b UStG) nicht in V5.7-Scope". Ein neuer Backlog-Item `BL-421 DE-Reverse-Charge § 13b UStG + ICP-Equivalente` wird angelegt. Kein Daten-Migrations-Schritt fuer die zwei 7%-Legacy-Rows oder die drei 19%-Legacy-Rows — Snapshot-Prinzip greift weiter (DEC-107).

## DEC-127 — V5.7 Slicing-Schnitt: 2 Slices SLC-571 + SLC-572 (V5.7)
- Status: accepted
- Reason: V5.7 hat 2 Features. FEAT-571 hat 4 Touchpoints (DB-Schema, Settings-UI, Editor-UI, PDF-Renderer) die alle ueber den gleichen Workflow getestet werden (User: Branding-BTW eintragen → Company-BTW eintragen → Angebot anlegen → Reverse-Charge-Toggle → PDF-Vorschau). Splitting in 2 Slices (z.B. 571a Schema+Settings, 571b Editor+PDF) wuerde die Smoke-Test-Kette zerreissen ohne Atomicity-Vorteil. ~5-7h ist im oberen Slice-Limit, aber noch atomic-testbar. FEAT-572 ist ein 30-60min-Bugfix mit eigenem Repro-Pfad (Skonto-Toggle) und gehoert nicht in den NL-VAT-Slice.
- Consequence: SLC-571 = "NL-VAT + Reverse-Charge" (FEAT-571, ~5-7h, MIG-028 + 2 Settings-Eingabefelder + Editor-Dropdown + Reverse-Charge-Toggle + Voraussetzungs-Logik + PDF-Block). SLC-572 = "Skonto-Toggle Bugfix" (FEAT-572, ~30-60min, Investigation + Option-A-Fix + Vitest + Browser-Smoke). Reihenfolge: 571 zuerst (groesserer Pfad, eigener QA-Cycle), 572 danach. Pro Slice: `/backend|/frontend` -> `/qa` -> Coolify-Redeploy. Final-Check + Go-Live + Deploy als REL-023 nach SLC-572. Kein Slicing-Hop zwischen den Slices noetig (FEAT-572 unabhaengig von FEAT-571 — man koennte 572 auch zuerst machen, aber 571 hat die hoehere Geschaeftsprioritaet).

## DEC-121 — V5.6 Slicing-Schnitt: 4 Slices SLC-561..564 (V5.6)
- Status: accepted
- Reason: F12-Empfehlung uebernommen. Alternative waere (a) 2 Slices (FEAT-561 als ein Block + FEAT-562 als ein Block) — zu gross, FEAT-561 hat 3 unabhaengige Sub-Themen mit 2 Schemas + 2 UI-Bereichen + 1 PDF-Erweiterung (~10-15h). (b) 5 Slices (Sub-Themen einzeln) — zu klein, A+C teilen sich Editor-UI-Komponente. 4 Slices balancieren Sub-Themen-Schnitt mit Slice-Atomicity:
  - SLC-561: Schema + Vorauswahl-Backend (MIG-027 Teile + `payment_terms_templates` CRUD + `/settings/payment-terms` Page) — entkoppelt von Editor-Aenderungen
  - SLC-562: Editor-Dropdown + Skonto-Felder (Sub-Themes A + C UI-Erweiterungen am bestehenden Proposal-Editor) — geteilte UI-Touch-Point
  - SLC-563: Split-Plan-UI + PDF-Renderer-Erweiterung (Sub-Theme B + DEC-120) — eigenes Rendering-Risk
  - SLC-564: Pre-Call Briefing Cron + Push/E-Mail-Delivery + `/settings/briefing` Page (FEAT-562 als ein Block) — orthogonal zu FEAT-561, eigene QA-Smoke-Pfade
- Consequence: `/slice-planning V5.6` plant exakt 4 Slices SLC-561..564 mit der oben definierten Sub-Theme-Verteilung. Reihenfolge zwingend: 561 -> 562 -> 563 -> 564 (561 schaftt Schema + Templates, 562 nutzt Templates im Dropdown, 563 erweitert PDF-Renderer der bestehenden V5.5-Pipeline, 564 ist orthogonal aber profitiert von vorhandener `/settings/*`-Pattern aus 561). Schaetzungen: SLC-561 ~3-4h, SLC-562 ~3-4h, SLC-563 ~5-7h, SLC-564 ~4-6h. Gesamt ~15-21h. Pro Slice: `/backend|/frontend` -> `/qa` -> Coolify-Redeploy. Final-Check + Go-Live + Deploy als REL-022 nach SLC-564.

## DEC-129 — V6.2 Workflow-Trigger Hybrid: Sync-Dispatch + Async-Execute + Cron-Fallback (V6.2)
- Status: accepted
- Reason: Open Question F1+F3. Drei Optionen geprueft: (a) Postgres LISTEN/NOTIFY — reliability-stark, aber persistent connection + reconnect-loop in Next.js serverless schlechter Match, neuer Worker-Container waere Architektur-Sprung. (b) Pure-Cron-Polling alle 1-5 Min — bricht 30s-AC im Worst-Case, simple aber zu langsam. (c) Hybrid: Sync-Dispatch nach Server-Action-Commit + asynchrone Execution via fire-and-forget Promise + Cron-Fallback fuer App-Crash-Recovery — kein neuer Container, alle Mutations laufen ohnehin durch Server Actions (`feedback_no_browser_supabase.md`), 30s-AC erfuellt mit Sicherheitsmarge. Variante (c) hat den groessten Reliability/Komplexitaet-Tradeoff zugunsten von "weniger Infrastruktur".
- Consequence: Neuer Helper `cockpit/src/lib/automation/dispatcher.ts` exportiert `dispatchAutomationTrigger({event, entityType, entityId, triggerEventAuditId, changes})`. Aufgerufen von Server Actions nach erfolgreichem DB-Commit + audit_log-INSERT (deals/actions.ts updateDealStage+createDeal, activities/actions.ts createActivity, ggf. weitere die in SLC-621 als Code-Konfig dokumentiert werden). Dispatcher (1) selektiert aktive Regeln per Index `idx_automation_rules_active`, (2) macht App-Level-Condition-Match, (3) inserted automation_runs (status='pending', UNIQUE(rule_id, trigger_entity_id, trigger_event_audit_id) ON CONFLICT DO NOTHING — Anti-Loop), (4) `void executeAutomationRun(runId).catch(logErr)` — fire-and-forget. Cron `/api/cron/automation-runner/route.ts` laeuft alle 1 Min (Coolify-Cron `* * * * *`, CRON_SECRET-Header, Pattern aus expire-proposals/route.ts), pickt pending/running Runs > 60s alt und re-executed sie idempotent. KEINE Postgres-Trigger, KEINE LISTEN/NOTIFY, KEIN Worker-Container, KEINE neue npm-Library.

## DEC-130 — V6.2 update_field-Whitelist als Code-Konfig (V6.2)
- Status: accepted
- Reason: Open Question F2. DB-Tabelle waere zur Laufzeit aenderbar via Settings-UI, aber: (1) Single-User-V1 hat keinen produktiven Bedarf, neue erlaubte Felder sind Code-Aenderung mit zugehoerigem Validator-Code, der zur Laufzeit-Konfig nicht zur Verfuegung steht (Validator-Funktionen wie validateStageId, validateTagsArray sind TS-Code). (2) Code-Konfig ist Type-safe (TypeScript), Reviewable in Git-Diff, Test-bar via Vitest, gegen versehentliche PII-Eintraege geschuetzt. (3) Settings-UI fuer dynamische Whitelist-Pflege waere ein Sub-Feature mit eigener Komplexitaet (Validator-Auswahl, Range-Editor) — YAGNI fuer V1.
- Consequence: Neue Datei `cockpit/src/lib/automation/field-whitelist.ts` mit Konstante `UPDATE_FIELD_WHITELIST: Record<EntityType, FieldSpec[]>`. V1-Whitelist:
  - `deal`: {stage_id, validate: validateStageId}, {value, validate: positive number}, {expected_close_date, validate: ISO date}
  - `contact`: {tags, validate: validateTagsArray}
  - `company`: {tags, validate: validateTagsArray}
  
  Explizit NICHT in V1-Whitelist: `email`, `phone`, `name` (PII), `password`, `vat_id`, `consent_*`, alle System-Felder (`id`, `created_at`, etc.). Erweiterung in spaeteren Versionen via Code-PR. Vitest-Test prueft die Whitelist-Membership fuer alle 4 Action-Pfade.

## DEC-131 — V6.2 automation_runs als Engine-Internal + audit_log fuer Side-Effects (V6.2)
- Status: accepted
- Reason: Open Question F4. Drei Optionen: (a) Nur audit_log erweitern um `entity_type='automation_run'` mit context-Freitext — verliert Strukturierung (kein Status-Lifecycle, kein Action-Results-Array, schwer zu queryen fuer UI-Statistik). (b) Nur neue automation_runs ohne audit_log-Side-Effects — bricht das bestehende Audit-Pattern (Stage-Change durch Automation waere nicht im audit_log dokumentiert). (c) Beide separat: automation_runs ist Engine-Internal (Workflow-Lifecycle, Idempotency-UNIQUE, Action-Results-JSONB, UI-Statistik via SELECT FROM automation_runs WHERE rule_id=X), audit_log dokumentiert die GESCHAEFTLICHEN Aenderungen mit `actor_id=NULL` (V4.1-System-Marker, konsistent mit recording-retention/meeting-briefing-Pattern), `context='Automation rule {rule.name} executed'`. Beide Tabellen sind komplementaer — automation_runs antwortet "wann hat Regel X gelaufen", audit_log antwortet "wer hat Deal Y veraendert".
- Consequence: MIG-029 fuegt `automation_runs` als neue Tabelle hinzu. `automation_runs.action_results` JSONB enthaelt pro Action `{action_index, type, outcome:'success'|'failed'|'skipped', error_message?, audit_log_id?}` — letzter Pointer zum audit_log-Eintrag wenn Side-Effect geschrieben wurde. Workflow-Action-Side-Effects (z.B. update_field auf deals.stage_id) schreiben einen audit_log-Eintrag mit `actor_id=NULL`, `entity_type=<entity>`, `action='update'`, `changes={field: {before, after}}`, `context='Automation rule {rule.name} executed'`. UI-Audit-Log-Renderer (existing aus V5.7) zeigt diese System-Eintraege mit System-Icon-Hint statt User-Avatar.

## DEC-132 — V6.2 Trockenlauf via direkte Source-Tabellen-Query (V6.2)
- Status: accepted
- Reason: Open Question F5. Drei Optionen: (a) Replay-Layer der historische Trigger-Events aus einer dedizierten Event-Stream-Tabelle rekonstruiert — neue Tabelle, neue Pflege, neuer Konsistenzpfad. (b) Trockenlauf gegen Live-Daten ohne Read-only-Garantie — Risiko von Side-Effects bei Bugs. (c) Read-only-SQL-Query gegen Source-Tabellen (audit_log fuer stage_changed, deals fuer created, activities fuer created), App-Level-Condition-Match, KEINE DB-Schreibvorgaenge — einfach, performant fuer 30-Tage-Window (~10k Eintraege Single-User), keine neue Infrastruktur. Variante (c) ist die kleinste und klarste Loesung.
- Consequence: Neue Datei `cockpit/src/lib/automation/dry-run.ts` mit `dryRunRule(rule, daysBack=30): Promise<DryRunResult[]>`. Liest aus Source-Tabellen je trigger_event:
  - `deal.stage_changed` → SELECT FROM audit_log WHERE entity_type='deal' AND action='stage_change' AND created_at > now() - interval '30 days' (matched changes-JSONB.stage_id-before/after)
  - `deal.created` → SELECT FROM deals WHERE created_at > now() - interval '30 days'
  - `activity.created` → SELECT FROM activities WHERE created_at > now() - interval '30 days'
  
  Pro Treffer: Lade Entity-Snapshot, App-Level-Condition-Match, gib `{entity_id, entity_label, would_match, matched_actions, sample_outcome}` zurueck. Result-Limit 100 (UI-Anzeige als "Vorschau"). Vitest-Test mit gemockten audit_log-Inserts. KEINE Action-Execution, KEINE DB-Side-Effects.

## DEC-133 — V6.2 Stage-Loesch Soft-Disable referenzierender Regeln (V6.2)
- Status: accepted
- Reason: Open Question F6. Drei Optionen: (a) Hard-Block — User kann Stage nicht loeschen waehrend Regel referenziert. UX-Risiko: legitime Stage-Loeschung blockiert wegen "Altlast"-Regel. (b) CASCADE — Stage geloescht entfernt Regel-Eintrag automatisch. Datenverlust-Risiko: User merkt nicht dass Regel weg ist, audit_log-Trace fehlt. (c) Soft-Disable + Warning — Regeln werden auf paused gesetzt, paused_reason wird gespeichert, audit_log dokumentiert das, UI zeigt pausiert-Badge. User kann Regel manuell editieren oder loeschen. Variante (c) ist der saubere Mittelweg.
- Consequence: `automation_rules.references_stage_ids UUID[] DEFAULT '{}'` als denormalisierter Cache, gepflegt von Server Action `saveAutomationRule` (Walk durch trigger_config.stage_id + conditions[].value-Felder die stage_id-References enthalten, sammle alle UUIDs). Server Action `deletePipelineStage(stageId)` (existing oder erweitert) checkt `SELECT id, name FROM automation_rules WHERE references_stage_ids @> ARRAY[$stageId] AND status='active'`. Wenn dependent rules: UPDATE rules SET status='paused', paused_reason=`Pipeline-Stage "${stageName}" wurde geloescht ${date}`, INSERT audit_log mit `entity_type='automation_rule'`, `action='auto_pause'`, `context='Referenced stage deleted'`. UI zeigt Toast "X Automation-Regeln wurden pausiert weil sie diese Stage referenziert haben." `/settings/automation` Listing zeigt paused-Regeln mit Warning-Badge + "Pausiert: <Reason>" + Edit-Link. Re-Aktivierung erfordert manuelle Edit-Action durch User.

## DEC-134 — V6.2 create_task Action: Owner default Deal-Owner mit Override (V6.2)
- Status: accepted
- Reason: Open Question F7. Drei Optionen: (a) Trigger-User als Default — sinnvoll wenn User die Aktion ausgeloest hat, aber bei automatischen Triggers (Cadence-completed, Cron-Insert) gibt es keinen Trigger-User → Fallback noetig. (b) Deal-Owner als Default — konsistent fuer alle Trigger-Typen, single-User-V1 trivial (alle drei = derselbe), V7-Multi-User skaliert sauber. (c) Hardcoded ein bestimmter User — V1-trivial aber unflexibel fuer V7. Variante (b) mit Override-Option (Trigger-User, Deal-Owner, Bestimmter-User) ist die beste Balance fuer V1 + V7-Skalierbarkeit.
- Consequence: `automation_rules.actions[].assignee` als optionales Feld mit Werten `'deal_owner'` (Default) | `'trigger_user'` | `<UUID>` (specific user). Action-Executor `executeAutomationRun` resolved den finalen User-ID-Wert je Action:
  - `deal_owner` → SELECT deals.owner_id FROM deals WHERE id=$dealId (Fallback: erster active User wenn deals.owner_id IS NULL — Single-User-V1 ist das immer der eine User)
  - `trigger_user` → audit_log.actor_id der den Trigger ausgeloest hat (NULL bei System-Trigger → Fallback auf deal_owner)
  - `<UUID>` → direkt ohne Resolution
  
  Builder-UI zeigt im create_task-Action-Sub-Form ein Dropdown "Verantwortlich" mit 3 Optionen. Single-User-V1: alle drei zeigen denselben User. V7-Multi-User: Dropdown wird zur strategischen Wahl. assignee-Resolution-Logik in `cockpit/src/lib/automation/assignee-resolver.ts` (neu, ~30 Zeilen, Vitest-getestet).

## DEC-135 — V6.2 utm→campaign-Mapping Hybrid: external_ref primary + name case-insensitive Fallback (V6.2)
- Status: accepted
- Reason: Open Question F8. Drei Optionen: (a) NUR `utm_campaign = campaigns.name` case-insensitive — fragil bei Renames (Kampagne wird umbenannt → Tracking bricht), aber simpel ohne System-4-Vertrag. (b) NUR `external_ref` Match — robust gegen Renames, aber erfordert dass System 4 jeden tracking-link mit externer ID erzeugt. (c) Hybrid: Priority 1 external_ref (wenn `utm_source='system4'` AND `utm_content` enthaelt System-4-Campaign-Id), Priority 2 utm_campaign-Name-Match case-insensitive trim — robust gegen System-4-Renames UND Standalone-Manual-Links. Variante (c) ist die zukunftsfeste und V1-pragmatische Wahl.
- Consequence: Neue Datei `cockpit/src/lib/campaigns/mapper.ts` mit `resolveCampaignFromUtm(utm: UtmParams): Promise<string | null>`:
  ```
  if (utm.utm_source === 'system4' && utm.utm_content) {
    const c = await findCampaignByExternalRef(utm.utm_content);
    if (c) return c.id;
  }
  if (utm.utm_campaign) {
    const trimmed = utm.utm_campaign.trim();
    const c = await findCampaignByName(trimmed);  // case-insensitive: WHERE LOWER(name) = LOWER($trimmed)
    if (c) return c.id;
  }
  return null;
  ```
  
  `campaigns.external_ref` ist UNIQUE (partial: WHERE external_ref IS NOT NULL) — keine Duplikate. `campaigns.name` ist UNIQUE auf LOWER(name) — verhindert Mehrdeutigkeit. Bei Mapping-Fail: Lead bekommt `campaign_id=NULL`, `source*`-Freitext-Felder bleiben primary attribution. Tooltip in Reporting "Kampagne nicht zugeordnet — utm_campaign matchte keinen aktiven Kampagnen-Namen". Server-Side-Vitest fuer 6 Mapping-Cases (external_ref hit, name hit, both no match, name with extra whitespace, mixed case, utm_source other than system4).

## DEC-136 — V6.2 Source-Field-Migration: keine Auto-Migration in V1 (V6.2)
- Status: accepted
- Reason: Open Question F9. Drei Optionen: (a) Auto-Migration aller bestehenden `contacts.source`/`source_detail`/`companies.source_type`/`source_detail` Freitext-Werte zu `campaign_id` via Best-Effort-Mapping — risk: schlechte Matches verfaelschen Reporting, manuelle Pflege wuerde sowieso besser sein. (b) Manuelles Settings-Tool mit Bulk-Mapping-UI (User waehlt aus Liste alter source-Werte und mappt zu Kampagnen) — Sub-Feature mit eigener Komplexitaet, V1-Scope-Sprengung. (c) Gar keine V1-Migration: bestehende source*-Felder bleiben backward-compatible erhalten, neue Leads bekommen campaign_id, alte Leads behalten source-Freitext. UI zeigt beide parallel in Stammdaten ("Quelle (Legacy): LinkedIn April" + "Kampagne: -"). User kann manuell Kampagne nachtragen wenn relevant. Variante (c) ist die saubere additive Loesung.
- Consequence: MIG-029 fuegt nur additiv `campaign_id`-FK-Spalten hinzu, KEIN Auto-Update der existierenden source*-Felder. Stammdaten-UI in `cockpit/src/app/(app)/contacts/[id]/edit/*` und `companies/[id]/edit/*` zeigt zwei Felder im "Akquisitions-Quelle"-Block: "Quelle (Legacy)" (Freitext, bestehende source/source_detail) read-only-display + "Kampagne" (Dropdown-Picker) editable. Reporting nutzt `campaign_id` primaer, fallt zurueck auf source* nur wenn campaign_id NULL ist. Spaeter (V6.3+ wenn relevant): Bulk-Mapping-UI als BL-XXX. Aktuell BL-Eintrag: BL-XXX `Source-zu-Kampagne Bulk-Migration-Tool` (low priority, on-demand).

## DEC-137 — V6.2 Tracking-Link-Token: 8-char base64url via crypto.randomBytes (V6.2)
- Status: accepted
- Reason: Open Question F10. Drei Optionen: (a) UUID v4 — 36-char URL-haesslich, ueberproportioniert fuer das Use-Case-Volumen. (b) UUID-Prefix (erste 8 char) — Kollisions-Risiko nicht-trivial bei Truncation, weniger Entropie als kontrolliert. (c) `nanoid` library 8-char — gute Entropie aber neue Dependency. (d) Node-stdlib `crypto.randomBytes(6).toString('base64url')` — 8-char URL-safe, ~2.8e14 Combos (kollision <0.001% bei 1M Links), keine Dependency, ~1 Zeile Code. Variante (d) ist die kleinste und konsistent mit Constraint "keine neuen npm-Packages wenn vermeidbar".
- Consequence: Neue Datei `cockpit/src/lib/campaigns/token.ts` mit `generateCampaignToken(): string` = `randomBytes(6).toString('base64url')`. Server Action `createCampaignLink(campaignId, params)` ruft den Helper, retried max 5x bei UNIQUE-Conflict (extrem unwahrscheinlich). `campaign_links.token TEXT UNIQUE NOT NULL` (DB-Constraint). URL-Pattern: `https://app.example.com/r/<token>` (Public Route, KEIN Auth, Coolify-Traefik direkt routet). Vitest-Test fuer Token-Format `^[A-Za-z0-9_-]{8}$` und Uniqueness-Generation-Loop (1000x ohne Kollision).

## DEC-138 — V6.2 First-Touch-Lock + Multi-Touch-Visibility via Click-Log (V6.2)
- Status: accepted
- Reason: Open Question F11. Drei Optionen: (a) Last-Touch — `campaign_id` wird bei jedem Click ueberschrieben. UX-Problem: ein Lead "wandert" zwischen Kampagnen, Reporting wird volatile. (b) First-Touch-Lock — campaign_id wird nur beim ersten utm-Encounter gesetzt, danach gelocked. Konservativ, predictable. Verliert Multi-Touch-Visibility. (c) Multi-Touch-Modell mit campaign_associations-Tabelle — komplex, neue Pflege, V1-Out-of-Scope. (d) First-Touch-Lock + Click-Log fuer spaetere Multi-Touch-Auswertung — best of both worlds: campaign_id ist stable First-Touch, aber `campaign_link_clicks` enthaelt alle Clicks mit FK auf den `link_id` (der die Kampagne traegt), Multi-Touch-Auswertung ist via JOIN nachruestbar ohne Schema-Aenderung. Variante (d) ist die zukunftssichere Wahl ohne V1-Komplexitaet.
- Consequence: Bei Lead-Insert via `/api/leads/intake` oder Form-Embed-Webhook: `INSERT INTO contacts (..., campaign_id) VALUES (..., $resolved)`. Bei Lead-Update (E-Mail-Match auf existierenden Kontakt): `UPDATE contacts SET campaign_id = COALESCE(campaign_id, $resolved) WHERE id=$id` — First-Touch-Lock. Click-Log enthaelt FK auf link_id der die Kampagne traegt: Multi-Touch-Auswertung ist via `SELECT contacts.id, COUNT(DISTINCT campaign_links.campaign_id) FROM contacts JOIN campaign_link_clicks ON ... JOIN campaign_links ON ...` rekonstruierbar. V6.2 Reporting zeigt First-Touch (campaign_id) als primaere Attribution. V6.3+ optional: "Multi-Touch-Journey"-Tab auf Lead-Detail-Page der alle Click-Events visualisiert.

## DEC-139 — V6.2 Funnel-Report-Filter: Dropdown im Filter-Bar (V6.2)
- Status: accepted
- Reason: Open Question F12. Drei Optionen: (a) Nur Query-Param `?campaign_id=X`, kein UI-Element — minimal-invasive aber nicht-discoverbar. User muss URL-Hack kennen. (b) Dropdown im Filter-Bar des Funnel-Reports zwischen "Pipeline" und "Stage" — discoverbar, konsistent mit existierenden Filter-Elementen, ~1h UI-Aufwand. (c) Eigene `/campaigns/[id]/funnel`-Page mit isoliertem Funnel — Code-Duplication zur existierenden /funnel-Page, Maintenance-Overhead. Variante (b) ist die richtige Granularitaet.
- Consequence: Existing `/funnel`-Page (FEAT-335) bekommt neue Komponente `<CampaignFilterDropdown>` zwischen Pipeline-Filter und Stage-Filter. Backend-Query in der existierenden Funnel-Loader erweitert um `WHERE deals.campaign_id = $X` (optional, NULL=alle). Performance: existing Funnel-Query nutzt schon `WHERE pipeline_id` als Index — `idx_deals_campaign` ergaenzt fuer Combined-Filter. UI zeigt Empty-State "Keine Deals in dieser Kampagne in diesem Pipeline-Stage" wenn beide Filter aktiv und kein Match. Vitest-Test fuer Funnel-Loader mit campaign_id-Param. Browser-Smoke in SLC-625-QA.

## DEC-140 — V6.2 Read-API: Reuse FEAT-504/DEC-067 Bearer-Token-Pattern (V6.2)
- Status: accepted
- Reason: Open Question F13. Drei Optionen: (a) Neuer Auth-Pfad (z.B. JWT-Token, OAuth) — ueberkomplex fuer Single-Tenant-V1 + System-4-Polling. (b) Public Endpoint ohne Auth — Daten-Leak-Risiko (Lead-Counts und Deal-Values sind sensitive). (c) Reuse FEAT-504-Pattern (Bearer-Token via `EXPORT_API_KEY` ENV, geprueft via existing `verifyExportApiKey` Helper aus `cockpit/src/lib/export/auth.ts`) — kein neuer Auth-Code, konsistent mit anderen System-Integration-Endpoints, einzelner ENV-Wert in Coolify. Variante (c) ist die geringste-Komplexitaet-Wahl.
- Consequence: Neuer Endpoint `cockpit/src/app/api/campaigns/[id]/performance/route.ts` exported `GET`, ruft `verifyExportApiKey(req)` zuerst (returnt 401 bei Auth-Failure), dann `loadCampaignPerformance(campaignId)` der die KPI-Aggregation per SQL macht (Lead-Count, Deal-Count, Won-Count, Won-Value, Click-Count last-30d, etc.), gibt JSON-Response zurueck. KEINE neue ENV-Variable (existing `EXPORT_API_KEY` reicht). System-4-Doku im Repo `/docs/INTEGRATION-API.md` (neu, optional V1) bekommt einen Eintrag fuer dieses Endpoint. Vitest fuer 3 Cases (auth ok / auth fail / campaign not found). Smoke-Test mit curl + Bearer-Header in SLC-625-QA.

## DEC-141 — V6.2 Slicing-Schnitt: 5 Slices SLC-621..625 (V6.2)
- Status: accepted
- Reason: PRD V6.2 schlug 6 Slices vor (SLC-621..626). Nach DEC-129..140-Konsolidierung empfehlen sich 5 Slices: SLC-626 (Read-API + Funnel-Filter) ist <3h und thematisch eng mit SLC-625 (Reporting-KPIs) verbunden — der Reporting-Pfad ist End-to-End "Click-bis-Read-API" und macht atomic-getestet mehr Sinn als 2 Mini-Slices. FEAT-621-Workflow bleibt 3 Slices (Foundation/Engine/UI), FEAT-622-Attribution bleibt 2 Slices (Foundation/Reporting). Alternative Splits geprueft: (a) FEAT-621 in 2 Slices (Schema+Engine kombiniert, UI separat) — Schema+Engine waere ~9-13h, zu gross. (b) 6 Slices wie urspruenglich — SLC-626 zu klein, kein Atomic-Vorteil. (c) 4 Slices (FEAT-621 in 2 Slices, FEAT-622 in 2 Slices) — Engine+UI kombiniert waere ~10-14h, Slice-Atomicity-Limit gerissen. 5 Slices ist die richtige Balance.
- Consequence: `/slice-planning V6.2` plant exakt 5 Slices SLC-621..625 mit der oben definierten FEAT-Verteilung. Reihenfolge zwingend: 621 -> 622 -> 623 (Workflow-Engine zuerst, Builder-UI baut auf Engine), 624 -> 625 (Attribution danach, Reporting baut auf Foundation). 624 koennte parallel zu 623 laufen wenn separater Branch — aber Empfehlung: sequenziell, weil V6.2 ein Single-User-Solo-Build ist und Worktree-Switching Kontext-Kosten hat. Schaetzungen: SLC-621 ~4-6h, SLC-622 ~5-7h, SLC-623 ~5-7h, SLC-624 ~4-6h, SLC-625 ~5-8h. Gesamt ~23-34h. Pro Slice: `/backend|/frontend` -> `/qa` -> Coolify-Redeploy. Final-Check + Go-Live + Deploy als REL-024 nach SLC-625.

## DEC-142 — V6.4 ISSUE-057-Fix: proposals.value -> total_gross (V6.4)
- Status: accepted
- Reason: Schema-Drift seit V5.5/MIG-026 (2026-04-29). FollowupEngine in `cockpit/src/lib/ai/followup-engine.ts:194-208` selektiert + sortiert auf `value`, das es nach der V5.5-Restrukturierung des Proposal-Schemas nicht mehr gibt. Die tatsaechlich relevanten Felder sind `subtotal_net`, `tax_amount`, `total_gross`. `total_gross` ist die richtige Wahl fuer "Open-Proposal-Sortierung nach Wert", weil es der bruttoorientierten Geschaeftsperspektive entspricht (so wie der User Open-Deal-Bedeutung wahrnimmt).
- Consequence: SLC-641 aendert 2 Stellen (Select-String + order-Spalte) auf `total_gross`. Vitest-Pure-Function-Test fuer den Query-Builder ergaenzt um Regression zu verhindern. Live-Smoke nach Deploy: Followup-Cron triggern und Container-Log inspizieren — kein "column proposals.value" mehr. Alternative `subtotal_net` waere ebenfalls valid, aber inkonsistent mit der KPI-Card "Pipeline-Wert" die ueberall `total_gross` zeigt.

## DEC-143 — V6.4 Click-Log-Cleanup-Cron: Pattern analog expire-proposals (V6.4)
- Status: accepted
- Reason: BL-423 Click-Log-Cleanup-Cron ist die V6.4-DSGVO-Pflicht-Komponente. V5.5 hat mit `expire-proposals` bereits ein erprobtes Pattern fuer "Daily-Cleanup-Cron mit Bearer-Auth + Audit-Log + idempotent". Dieses Pattern 1:1 wiederzuverwenden spart Zeit, reduziert Risiko, sichert Konsistenz. Andere Optionen (Postgres pg_cron / externer Cron-Anbieter / In-App-Scheduler) eingeschaetzt: alle bringen eigene Container/Dependencies — verletzt V6.4-Constraint "keine neuen Container".
- Consequence: SLC-641 erstellt `cockpit/src/app/api/cron/click-log-cleanup/route.ts` mit identischer Struktur wie `expire-proposals` — POST-Endpoint, `verifyCronSecret`, admin-Client-DELETE, audit_log-INSERT, idempotente JSON-Response. Coolify-Cron-Eintrag wird vom User manuell angelegt (Pattern wie alle anderen Coolify-Crons). Cron-Schedule: taeglich 03:00 UTC (+1h Offset zu expire-proposals 02:00 UTC um Konflikte zu vermeiden).

## DEC-144 — V6.4 Click-Log Hard-Delete statt Soft-Delete (V6.4)
- Status: accepted
- Reason: campaign_link_clicks-Eintraege sind anonymisiert (IP-Hash mit Salt, kein Klartext, kein User-Identifier). 90 Tage ist DSGVO-konformes Retention-Maximum konsistent zu COMPLIANCE.md V5.2 (Email-Retention-Pattern). Es gibt keinen Use-Case fuer Recovery — nach 90 Tagen ist die analytische Relevanz < die Compliance-Pflicht zur Loeschung. Soft-Delete (z.B. `deleted_at TIMESTAMP`-Column) wuerde die Tabelle weiter wachsen lassen und gegen den DSGVO-Geist arbeiten. Hard-Delete ist die einzige korrekte Loesung.
- Consequence: SLC-641 verwendet `DELETE FROM campaign_link_clicks WHERE created_at < cutoff` ohne Soft-Delete-Spalte. Audit-Log-Eintrag persistent (Compliance-Nachweis), aber Click-Eintraege sind weg. Kein Recovery-Pfad. Pattern fuer andere DSGVO-Retention-Crons (z.B. zukuenftige email_message-Retention) festgelegt.

## DEC-145 — V6.4 Audit-Methodik: Strukturierte RPTs mit Per-Item-Format + Severity (V6.4)
- Status: accepted
- Reason: User-Wunsch "doppelt und dreifach gebaut aufraeumen" braucht eine reproduzierbare Methodik. Pauschale "schau dir Code an und raeum auf"-Direktive fuehrt zu unkontrolliertem Refactor mit Regressionsrisiko. Strukturierte Audit-Methodik mit Per-Item-Format zwingt jeden Fund zur konkreten Klassifikation, jeden Cleanup-Vorschlag zur User-Pruefung. Severity-Klassifikation ("Klar-obsolet" / "Verdacht" / "Behalten") macht Risiko-Niveaus explizit. Pattern reuse-faehig fuer zukuenftige V6.5-Schema-Audits, V7-Multi-User-Audits etc.
- Consequence: SLC-642 (Code-Audit) und SLC-644 (UI-Audit) produzieren je einen RPT-XXX mit Per-Item-Liste. Item-Format: `## CA-NNN — Titel` (Code-Audit) bzw. `## UA-NNN — Titel` (UI-Audit). Felder: Typ, Pfad, Severity, Beobachtung, Cleanup-Vorschlag, Risiko, User-Entscheidung. Severity-Definitionen sind in ARCHITECTURE.md festgehalten. User-Sign-Off-Pause zwischen Inventur-Slice und Cleanup-Slice ist Pflicht.

## DEC-146 — V6.4 Cron-Cleanup: Soft-Disable + 30 Tage Beobachtung statt Hart-Loeschung (V6.4)
- Status: accepted
- Reason: User-Sign-Off 2026-05-07. Cron-Jobs sind Scheduler-getriebene Pfade — wenn ein Cron geloescht wird und doch noch gebraucht wurde, bemerkt das niemand bis ein Workflow leise scheitert (Beispiel: ISSUE-057 selbst war exakt so ein Pfad). Soft-Disable (Coolify-Cron-Eintrag deaktiviert, Code bleibt) ist reversibel — User kann den Cron wieder einschalten ohne Code-Restore. 30 Tage Beobachtung gibt Zeit fuer "Oh, der wurde fuer den Quartals-Job gebraucht"-Erkenntnisse. Andere Code-Pfade (Server-Actions, API-Routes, AI-Engine-Methoden) brauchen kein Soft-Disable, weil Vitest + Live-Smoke direkt zeigen ob etwas bricht — Soft-Disable lohnt sich nur fuer Scheduler.
- Consequence: SLC-643 fuer Cron-Loeschungs-Items aus dem Audit:  Coolify-Cron deaktivieren, Code+Endpoint bleiben unberuehrt, BL fuer V6.5+ angelegt mit Datum "Soft-Disable seit YYYY-MM-DD". Fuer Server-Actions/API-Routes/AI-Methoden mit Decision "loeschen": direkt loeschen in V6.4. Atomare Commits pro Item, Rollback einzelner Items moeglich.

## DEC-147 — V6.4 Audit-Tooling: /doctor-Skill-Reuse statt neuer Mechanismus (V6.4)
- Status: accepted
- Reason: Bestehender `/doctor`-Skill ist eher fuer "Diagnose unstabiler Releases" konzipiert, nicht fuer "systematischer Code-Audit". Aber er bietet bereits die Grundstruktur (Bericht-Format, Severity-Konzept, Recovery-Empfehlungen) die wir ohnehin brauchen. Einen neuen Audit-Skill bauen wuerde Dev-System-Komplexitaet erhoehen ohne 10-fachen Mehrwert. Stattdessen: /doctor erweitert nutzen + Audit-Pattern als IMP fuer Dev-System dokumentieren, damit zukuenftige Audits die gleiche Methodik wiederverwenden koennen.
- Consequence: SLC-642 + SLC-644 nutzen `/doctor` als Vehikel mit explizitem Audit-Scope-Argument (`/doctor V6.4-code-audit` bzw. `/doctor V6.4-ui-audit`). IMP wird in `strategaize-dev-system/docs/SKILL_IMPROVEMENTS.md` ergaenzt: "Audit-Pattern fuer /doctor: Per-Item-Format, Severity-Klassifikation, User-Sign-Off-Pause, atomare-Commit-Strategie pro Item". Dadurch ist die V6.4-Methodik fuer V6.5-Schema-Audit, V7-Multi-User-Audit usw. wiederverwendbar.

## DEC-148 — V6.4 Audit-Scope: Code only, Schema-Audit auf V6.5 (V6.4)
- Status: accepted
- Reason: User-Sign-Off 2026-05-07 (F2-Antwort). DB-Schema-Audit (ungenutzte Spalten, redundante Indizes, ungeloeste FK-Drift) ist deutlich riskanter als Code-Audit, weil Schema-Aenderungen in vielen Konsumenten gleichzeitig sichtbar werden (siehe ISSUE-057 selbst — MIG-026-Schema-Aenderung hat 6 Tage spaeter erst einen Bug enthuellt). Code-Audit kann mit Vitest + Live-Smoke schnell verifiziert werden. Schema-Audit braucht andere Tools (DB-Reflection, Migration-Backout-Tests). V6.4-Hygiene-Sprint soll klein und schnell sein — Schema-Audit als eigener V6.5-Sprint mit eigener Methodik.
- Consequence: SLC-642 inspiziert nur Code-Konsumenten der DB-Felder, nicht die Felder selbst. Source-Schema-Inkonsistenzen werden auf Code-Seite gemeldet (z.B. "Datei X liest source_detail, das mit campaign_id parallel ist") aber das Schema bleibt unangetastet. BL fuer V6.5: "DB-Schema-Hygiene-Audit (ungenutzte Spalten + redundante Indizes + FK-Drift)".

## DEC-149 — V6.4 AI-Engine-Konsolidierung deferred auf V6.5 (V6.4)
- Status: accepted
- Reason: User-Sign-Off 2026-05-07 (F9-Antwort). FollowupEngine + Briefing-Engine + Signal-Extract sind 3 unabhaengig gebaute AI-Pfade aus 3 verschiedenen Sprints (V4 + V5.6 + V4.3). Konsolidierung waere ein groesseres Refactor (gemeinsame Deal-Context-Loader-Schicht, gemeinsame Bedrock-Client-Konfiguration, Ergebnis-Caching). Das ist Hochwert, aber riskant — und V6.4 ist Hygiene, nicht Refactor. Wenn Audit Logik-Ueberlappung findet, wird das Item explizit als "spaeter (V6.5)" markiert, nicht "umsetzen".
- Consequence: SLC-642 Audit-Output kann AI-Engine-Ueberlappungen nennen, markiert sie aber konsequent als "spaeter (V6.5)" oder "nicht in V6.4". User-Decision-Optionen sind in V6.4 fuer AI-Engine-Items eingeschraenkt auf "spaeter" oder "nicht". V6.5-Slice wird ggf. fuer AI-Engine-Konsolidierung angelegt — BL-435+ entsteht in V6.4 als Folge-Backlog.

## DEC-150 — V6.4 UI-Audit-Tiefe: Klein in V6.4, Gross-Items deferren (V6.4)
- Status: accepted
- Reason: User-Sign-Off 2026-05-07 (F3+F10-Antwort). UI-Audit-Scope ist eng (5 Bereiche: Settings/Sidebar/Buttons/Pipeline-Stages/Headers), keine ganzen Page-Redesigns. Innerhalb dieser Bereiche werden Items klassifiziert nach Aufwand (klein <1h / mittel 1-3h / gross 3+h). Klein/Mittel ist V6.4-tauglich, gross wandert als BL nach V6.5. Begruendung: V6.4 ist Hygiene-Sprint mit klar abgegrenztem Zeitbudget (~14-21h gesamt), groessere UI-Restructures (z.B. komplette Settings-Page-Neuaufteilung) wuerden den Sprint sprengen.
- Consequence: SLC-644 markiert Items mit Aufwand-Schaetzung (klein/mittel/gross). SLC-645 implementiert nur klein/mittel-Items. Gross-Items werden als BL fuer V6.5 angelegt mit Begruendung im Audit-Report. Per-Item-Format enthaelt Aufwand-Feld: "Aufwand: klein <1h | mittel 1-3h | gross 3+h".

## DEC-151 — V6.4 Slicing-Schnitt + Release-Gate: 5 Slices SLC-641..645 (V6.4)
- Status: accepted
- Reason: PRD V6.4 schlug 5 Slices vor. Architektur-Pruefung bestaetigt: SLC-641 (Stabilitaet+DSGVO) ist atomic und gehoert zusammen (gleiches Pattern, gleiche Test-Suite). SLC-642+SLC-643 (Code-Audit Inventur+Cleanup) MUESSEN getrennt sein wegen User-Sign-Off-Pause. SLC-644+SLC-645 (UI-Audit Inventur+Cleanup) gleicher Grund. Alternative gepruefet: (a) Inventur+Cleanup pro Audit kombiniert in 1 Slice mit Pause-State — funktioniert technisch, aber bricht das atomare-Slice-Pattern (Slice-Spec sagt "Slice ist done wenn QA gruen", User-Sign-Off-Pause innerhalb Slice ist anti-Pattern). (b) 4 Slices (Stabilitaet + Code-Sprint + UI-Sprint + Cleanup-zusammen) — vermischt Inventur+Cleanup, gleicher Anti-Pattern. 5 Slices mit klaren Pause-Punkten ist die richtige Balance.
- Consequence: `/slice-planning V6.4` plant exakt 5 Slices SLC-641..645. Reihenfolge zwingend seriell: 641 -> 642 -> [Pause] -> 643 -> 644 -> [Pause] -> 645. Pro Slice: `/backend|/frontend` -> `/qa` -> Coolify-Redeploy. Final-Check + Go-Live + Deploy als REL-026 nach SLC-645. Schaetzungen: SLC-641 ~3-4h, SLC-642 ~2-3h, SLC-643 ~2-4h, SLC-644 ~2h, SLC-645 ~2-4h. Gesamt ~14-21h (Floor: ~11h, Ceiling: ~17h reine Arbeit, plus 2 User-Pause-Phases). **Release-Gate:** ISSUE-057 resolved + BL-423 Cleanup-Cron live + >=3 Code-Cleanups + >=2 UI-Cleanups + Vitest gruen + Live-Smoke ueber 5 Haupt-Pages. Mindest-Quoten sind defensive Floor — wenn Audit kaum Cleanup-Kandidaten findet, kann V6.4 mit angepasster Quote releaseable sein wenn der User explizit signed-off.

## DEC-152 — V6.5 BL-441 Theming-Sprint in 2 Phasen splitten (V6.5)
- Status: accepted
- Reason: BL-441 hat 2 fundamentale Tradeoffs: Phase A (Tokens-Setup in tailwind.config.ts) ist klein (~30min), low-risk, reversibel; Phase B (Migration 178 Drift-Stellen ueber 30 Files) ist gross (3+h), Visual-Regression-Risiko. In 1 Slice gebuendelt waeren das 4+h Arbeit mit grossem Diff — Review-Schwierig + Rollback-Risk-Mismatch (User koennte Tokens behalten wollen, Migration revertieren). Split: Slice 1 nur Tokens (review-bar als <100 Zeilen Diff), Slice 2 Migration-Phase iterativ. Alternative gepruefet: gar nicht splitten + iterativ Migration in spaetereren Slices — funktioniert auch, aber verschiebt Tokens-Setup ohne Mehrwert.
- Consequence: V6.5 SLC-651 = Tokens-Setup only (Phase A). V6.5 SLC-652 = Migration-Phase B Tranche 1 (Pipeline + Proposals = haerteste Drift-Files). Migration weiterer Files (Settings, Mein Tag, Kontakte, Dashboard etc) als spaetere V6.5- oder V6.6-Slices. Phase A Done-Kriterium: tailwind.config.ts hat colors.primary/success/warning/danger-Block + 1 Test-File migriert als Beweis.

## DEC-153 — V6.5 BL-441 Migration per Page-Bereich, iterativ statt big-bang (V6.5)
- Status: accepted
- Reason: 30 Files mit 178 Drift-Stellen in einem Slice migrieren ist Visual-Regression-Risiko-Maximum: 30 Pages muessten alle gleichzeitig manuell verifiziert werden, Diff-Review ueber ~500+ Zeilen, Rollback ist nuclear. Per Page-Bereich (Pipeline + Proposals; Settings + Kontakte; Mein Tag + Dashboard etc.) reduziert Risk pro Slice + erlaubt zwischendurch Live-Smoke + ggf. Token-Tweaks bei Mismatches.
- Consequence: SLC-652 (Migration Tranche 1) ist Pipeline + Proposals (zusammen ~50 Drift-Stellen). Spaetere Migrations-Tranchen werden ad-hoc geplant — V6.5 muss NICHT alle 30 Files migrieren, Mindest-Quote ist 2 Files migriert plus Tokens stehen.

## DEC-154 — V6.5 Visual-Regression-Strategie: Manual Page-Smokes (V6.4-Pattern), keine Snapshot-Tests (V6.5)
- Status: accepted
- Reason: Snapshot-Tests via Playwright/Storybook waeren fuer Visual-Regression formal sauberer, aber V6.5 ist Hintergrund-Sprint mit Internal-Test-Mode + Single-User. Setup-Aufwand fuer Snapshot-Toolchain (Playwright-Config + Snapshot-Storage + CI-Integration) waere ~3-5h plus laufende Wartung. Manual Page-Smokes haben sich in V5.5/V6.2/V6.4 als ausreichend bewiesen. V7-Multi-User-Sprint koennte Snapshot-Tests einfuehren, wenn der Multi-User-Use-Case mehrere visuelle States produziert.
- Consequence: V6.5-Slices nutzen Manual Page-Smokes pro betroffenem Page-Bereich (analog V6.4 SLC-645 RPT-339). User-Smoke ueber alle V6.5-UI-Aenderungen vor REL-027. Snapshot-Tests deferred auf V7 oder spaeter.

## DEC-155 — V6.5 ViewToggle Multi-Mode via Generic-Type-Refactor (V6.5)
- Status: accepted
- Reason: pipeline-view.tsx hat 4 Modi (Kanban + Liste + Funnel + Win/Loss), ViewToggle-Component hat aktuell 2 Modi (Cards/Liste). Optionen: (a) Eigene Variante ViewToggleMulti neben Bestehender — Duplication, 2 Components fuer das Konzept. (b) Bestehende ViewToggle generisch refactorn mit Mode-Type als Generic-Param + Props fuer ViewMode-Konfiguration (Icon, Label) — 1 Component, sauber, Pipeline + Kontakte nutzen sie beide. Generic-Type-Refactor ist marginal mehr Aufwand aber DRY-konform.
- Consequence: SLC-654 macht ViewToggle generisch: `<ViewToggle<TMode> modes={[{value, icon, label}]} active={mode} onSelect={...} />`. Existing 2-Modi-Caller (contacts-client.tsx) wird mit migriert. pipeline-view.tsx ersetzt inline-Pattern mit ViewToggle-Aufruf. TypeScript-Typ-Sicherheit ueber Generic-Param.

## DEC-156 — V6.5 UA-009 Pipeline-PageHeader via Slot-Pattern (V6.5)
- Status: accepted
- Reason: PageHeader-Component aktuell hat title + subtitle + (children fuer Right-Action). Pipeline hat unter dem Header noch Tabs (Pipeline-Selector) + KPIs (Stage-Counts). Direkt in PageHeader-children waere Layout-Konflikt (Right-Action ist horizontal). Slot-Pattern: PageHeader nimmt zusaetzlich `belowHeader` Slot fuer Inhalt UNTER dem Title-Block aber INNERHALB des sticky-Containers. Pipeline rendert Tabs+KPIs in `belowHeader`. Andere Pages (Mein Tag, Kontakte, Proposals) nutzen den Slot nicht — kein Breaking-Change.
- Consequence: SLC-655 erweitert PageHeader-Component um optionalen `belowHeader?: React.ReactNode`-Prop. Pipeline-View migriert von custom h1+div zu `<PageHeader title="Pipeline" subtitle="..." belowHeader={<PipelineTabsAndKPIs />} />`. Sticky-Verhalten + backdrop-blur funktionieren weiter, Tabs+KPIs scrollen mit dem Header oben.

## DEC-157 — V6.5 VIES-Cache als DB-Tabelle `vat_id_validations` (V6.5)
- Status: accepted
- Reason: VIES-Online-Lookup ist langsam (HTTP-Round-Trip ~500-2000ms) und rate-limited. Cache ist Pflicht, sonst friert UI ein. Optionen: (a) In-Memory-Cache (Map<string, Result>) — verliert bei Container-Restart, in Coolify-Redeploy alle Validierungen fluechtig. (b) DB-Tabelle `vat_id_validations` mit (country, number) UNIQUE-Index + expires_at-TTL — survives Container-Restart, audit-able, Pattern-konsistent zu audit_log. Setup-Aufwand: kleine MIG-030 + 1 Lookup-Funktion. Speicher-Footprint: <100 Rows in Single-User-Mode realistisch.
- Consequence: MIG-030 erstellt `vat_id_validations`-Tabelle (siehe MIGRATIONS.md). VIES-Adapter `lookupVatId(country, number)`: (1) DB-Lookup mit `expires_at > NOW()`, (2) wenn cache-miss VIES-API-Call, (3) Insert/Update mit `expires_at = NOW() + INTERVAL '24 hours'`, (4) Return result. Audit-Log-Eintrag pro Cache-Miss (action='vies_lookup', changes={country, valid, source}).

## DEC-158 — V6.5 VIES-Down-Behavior: Format-only-Fallback transparent mit Status-Badge (V6.5)
- Status: accepted
- Reason: VIES-Service hat in der Vergangenheit Downtimes gehabt (geplante Wartung mehrmals jaehrlich). User-Erwartung: VAT-ID-Validierung darf bei VIES-Down NICHT blockieren. Optionen: (a) Hartes Fail mit Error-Message — User kann nicht speichern, schlechte UX. (b) Transparenter Fallback ohne Hinweis — User glaubt VIES-Check ist erfolgt, ist aber nur Format-Check. (c) Fallback mit Status-Badge im UI ("Format-OK + VIES nicht erreichbar") — User informiert, kann trotzdem speichern. Option C bevorzugt fuer DSGVO-Compliance (nachvollziehbar welche Validierungs-Tiefe lief).
- Consequence: Branding-Form + Company-Form zeigen 3 Validierungs-States: "Format-Invalid" (rot), "Format-OK" (gelb mit Hinweis "VIES wird beim Speichern geprueft"), "VIES-OK" (gruen). Bei VIES-Down: "Format-OK + VIES nicht erreichbar" als Warning-Badge. Audit-Log-Trail unterscheidet via `source='vies'` vs `source='vies_unavailable'`.

## DEC-159 — V6.5 BL-424 Source-Migration als SQL-Skript mit User-Mapping-File, kein UI-Tool (V6.5)
- Status: accepted
- Reason: UI-Mapping-Tool wuerde 5-8h zusaetzlich kosten (Settings-Page + Mapping-CRUD + Bulk-UPDATE-UI + Validation). Single-User-Internal-Test-Mode hat realistisch <100 Legacy-Source-Werte. SQL-Skript mit User-pflegbarem Mapping-File (`sql/migrations/030_v65_source_to_campaign_mapping.json`) ist 10x schneller, lese-/diffbar in Git, einfach revertierbar. Trade-off: weniger user-friendly aber V6.5 ist Hintergrund-Sprint, User-Skill-Niveau ist hoch (Founder selbst).
- Consequence: SLC-656 produziert (a) Pre-Migration-Audit-Skript (SELECT distinct source-Werte mit Counts pro contacts/companies), (b) Mapping-JSON-File mit User-bestaetigtem Mapping `{"LinkedIn April": "campaign-id-X", ...}`, (c) Bulk-UPDATE-SQL mit COALESCE (campaign_id IS NULL als Filter), (d) Audit-Log-Insert pro UPDATE mit Stats. User pflegt Mapping zwischen (a) und (c). Idempotent: Re-Run aendert nichts wenn campaign_id schon gesetzt.

## DEC-160 — V6.5 BL-424 Source-Felder als read-only-Backup behalten, kein DROP COLUMN (V6.5)
- Status: accepted
- Reason: DROP COLUMN ist destructive + irreversibel. Source-Migration ist forward-only aber V6.5-Direktive sagt "ohne Loss". Optionen: (a) DROP source/source_detail/source_type nach Migration — Rollback unmoeglich, Daten weg. (b) Behalten als read-only-Backup, UI-Forms zeigen sie nur read-only wenn nicht-leer, neue Eingabe nur via CampaignPicker — voller Rollback-Pfad. Storage-Kosten der Backup-Spalten vernachlaessigbar.
- Consequence: MIG-031 macht KEIN DROP COLUMN — `contacts.source/source_detail`, `companies.source_type/source_detail` bleiben in DB. UI-Forms (contact-form.tsx, company-form.tsx) lesen sie nur read-only-display wenn nicht-leer (mit Hinweis "Legacy-Quelle, neue Eingaben via Kampagne"). Nach 6 Monaten produktivem Einsatz koennten die Backup-Spalten in V7+ als separater Cleanup-Slice gedroppt werden, wenn User-OK.

## DEC-161 — V6.5 BL-430 postcss-CVE-Akzeptanz als ISSUE-058 in KNOWN_ISSUES (V6.5)
- Status: accepted
- Reason: postcss <8.5.10 Vulnerability erfordert Next.js-Downgrade auf 9.3.3 (catastrophic — Next 9.x ist mehrere Jahre alt, App ist auf Next 14+ gebaut). Upstream-Next-Release mit gepatchter postcss-Version ist die einzige sichere Loesung. Bis dahin muss die CVE dokumentiert akzeptiert sein. Optionen: (a) Eigene SECURITY.md erstellen — zu schwer fuer 1 CVE, V6.5 ist Hintergrund-Sprint. (b) ISSUE-058 in KNOWN_ISSUES — Pattern-konform mit ISSUE-042 (OpenAI-Key-Akzeptanz), Cockpit-sichtbar, audit-trail durchgaengig.
- Consequence: KNOWN_ISSUES.md bekommt ISSUE-058 mit Severity=Low, Workaround=upstream-warten, Next-Action=npm audit periodisch (alle 4-8 Wochen) bei naechster Toolchain-Update-Welle erneut pruefen. Cockpit zeigt ISSUE-058 als open, V6.5 macht NICHT npm audit fix --force. SLC-657 dokumentiert nur, kein Code-Touch fuer postcss.

## DEC-162 — V6.5 DE-§13b Pflichtformulierung als PRELIMINARY, Anwaltspruefung deferred (V6.5)
- Status: accepted
- Reason: BL-421 schlaegt Phrase "Steuerschuldnerschaft des Leistungsempfaengers" + Verweis auf § 13b UStG / Art. 196 VAT Directive 2006/112/EC vor. Diese Phrase ist die uebliche DE-Formulierung in Rechnungs-Templates, aber rechtssichere Korrektheit erfordert Anwaltspruefung. User-Direktive 2026-05-01: "Compliance-Gate kommt viel spaeter". V6.5 implementiert die Phrase als PRELIMINARY, Pre-Production-Pflicht ist Anwalts-Sign-Off bevor erstes echte Kunden-PDF generiert wird.
- Consequence: SLC-653 implementiert DE-Reverse-Charge-Block mit BL-421-Phrase + Inline-Code-Kommentar `// PRELIMINARY: needs legal review before customer-live, ISSUE-042-Pattern (Pre-Production-Compliance-Gate)`. PDF-Renderer rendert die Phrase. Pre-Production-Gate-Checkliste (sobald sie kommt) muss Anwalts-Pruefung der Phrase enthalten. Falls Anwalt Aenderung verlangt: 1-Zeilen-Constant-Update + Re-Deploy.

## DEC-163 — V6.5 FEAT-653 bleibt 1 Feature, kein Split in Schema-Hygiene + Dep-Hygiene (V6.5)
- Status: accepted
- Reason: V6.5-Slice-Planning RPT-346.
- Consequence: SLC-657 traegt beide Sub-Topics in einem Slice.

## DEC-165 — V6.6 KI-Workspace als EINE Component mit Konfig-Prop, NICHT 3 Implementierungen (V6.6)
- Status: accepted
- Reason: V6.6 stellt das KI-Workspace-Hybrid-Pattern auf 3 Hauptarbeitsplaetzen bereit (Mein Tag, Deal-Detail, Dashboard). Das visuelle Layout (Berichts-Buttons-Reihe + Frage-Eingabe + Antwort-Fenster) ist auf allen drei identisch — Unterschiede sind reine Daten-Konfiguration (Berichts-Liste, Kontext-Quelle, Voice-Routing). Optionen: (a) 3 spezifische Implementierungen mit gemeinsamem Hook — Drift-Risiko ueber V7+, gleicher Bug an 3 Stellen fixen. (b) 1 generische Component `<KIWorkspace>` mit Konfig-Prop (context + reports + scope + voiceEnabled) — zentraler Wartungs-Punkt, klares API-Surface. Trade-off: kurzfristig +30min Engineering-Zeit fuer Prop-Surface-Design vs langfristig drift-frei.
- Consequence: SLC-661 baut `cockpit/src/components/ki-workspace/KIWorkspace.tsx` mit `KIWorkspaceProps = { context: "mein-tag"|"deal-detail"|"cockpit", reports: KIWorkspaceReport[], scope: { userId, dealId? }, voiceEnabled: boolean }`. Reports-Listen leben in `reports/registry.ts` als Konstanten pro Workspace-Typ (`MEIN_TAG_REPORTS`, `DEAL_DETAIL_REPORTS`, `COCKPIT_REPORTS`). KIWorkspace-Component wird isoliert in SLC-661 (ohne Caller) gebaut und Mock-getestet. SLC-662/664/666 verdrahten die drei Caller. R1-Mitigation aus PRD V6.6.

## DEC-166 — V6.6 Bedrock-Antwort synchron mit Spinner+Result, KEIN SSE-Streaming (V6.6)
- Status: accepted
- Reason: PRD V6.6 F2 erfragt Streaming-Tokens vs Polling vs synchroner Spinner. Bestehende Bedrock-Pfade (FEAT-301 briefing, FEAT-412 signal-extract, FEAT-403 cockpit-LLM, FEAT-114 loss-analysis) liefern alle synchron (REST-Server-Action mit await). SSE-Streaming-UI (Token-Append + Partial-State-Error-Handling + Cancel-Pattern + Connection-Drop-Recovery) ist eigener UI-Slice mit hohem Komplexitaets-Grad. V6.6 ist UI-Konsolidierungs-Sprint, nicht UI-Innovation. Trade-off: UX gefuehlt langsamer (Spinner statt Token-Stream) vs einfache Reuse aller bestehenden Pfade. Fuer Internal-Test-Mode-Single-User akzeptabel.
- Consequence: `useReportRun`-Hook nutzt synchrones Server-Action-Pattern + 5-min-Cache (in-Memory pro Server-Process, key = hash(reportId, scope, userId)). AnswerPane.tsx zeigt Spinner waehrend Bedrock-Call (typisch 2-8s), rendert Markdown nach Erhalt. SSE-Streaming als BL fuer V6.6.x oder spaeter. "Aktualisieren"-Button im Answer-Pane bypassed Cache.

## DEC-167 — V6.6 Voice-Eingabe via Whisper-Adapter + extrahierter useVoiceCapture-Hook (V6.6)
- Status: accepted
- Reason: PRD V6.6 F3. Zwei Optionen: (a) Direkter Bedrock-Voice-Endpoint — neuer Provider-Pfad, kein EU-Hosting verifiziert, ausserhalb V6.6-Scope. (b) Bestehender Whisper-Adapter (V5.2, EU-konform via Azure-Code-Ready) mit Audio-Capture-Logic aus pipeline-suche extrahiert als reusable Hook. Option (b) bleibt im Provider-Adapter-Pattern (DSGVO-rule data-residency.md). pipeline-suche wird in SLC-667 ohnehin entfernt — die Audio-Capture-Logik darf nicht verloren gehen.
- Consequence: SLC-661 extrahiert pipeline-suche-Voice-UI in `cockpit/src/components/ki-workspace/hooks/useVoiceCapture.ts` mit Surface `{ isRecording, start, stop, error }`. stop() returnt transkribierten Text via Whisper-Adapter. KIWorkspace nutzt den Hook, schreibt transkribierten Text ins Eingabefeld, User-OK triggert Bedrock-Call. SLC-667 entfernt pipeline-suche-Component, behaelt Hook. Production-Switch auf Azure-EU-Whisper bleibt Pre-Production-Compliance-Gate (User-Direktive 2026-05-01, separater Sprint).

## DEC-168 — V6.6 Kontext-Scope via scopeIds + Server-Action-Pfad pro Berichts-Button (V6.6)
- Status: accepted
- Reason: PRD V6.6 F4. KI-Workspace muss Kontext pro Berichts-Button laden. Optionen: (a) Frontend-Side Kontext-Load + an Bedrock schicken — Riesen-Payload, Sicherheit (RLS-Bypass-Risiko). (b) Server-Action pro Berichts-Button laedt Kontext explizit, Frontend uebergibt nur scopeIds. Option (b) ist konsistent mit V5.6 Briefing-Pattern + V6.2 Read-API-Pattern.
- Consequence: KIWorkspaceReport hat `serverActionPath`-Property. Server-Action-Naming `cockpit/src/lib/ki-workspace/reports/<reportId>.ts` exportiert `runReport(scope: KIWorkspaceScope): Promise<ReportResult>`. Pro Workspace-Typ definierter Kontext: Mein Tag = (deals eigene + activities heute + tasks heute + meetings heute), Deal-Detail = (deal + activities + tasks + proposals + companies + contacts via FK), Cockpit = (deals account-weit + pipeline_snapshots + automation_runs + auto_winloss_runs). Audit-Log-Eintrag pro Bedrock-Call mit reportId+scope-Hash.

## DEC-169 — V6.6 /performance-Migration als 1-Sprint-Redirect mit Toast, Mapping-Tabelle als Pflicht-Output (V6.6)
- Status: accepted
- Reason: PRD V6.6 R2 + F5+F6. /performance-Page hat Goal-Cards + Wochen-Check + Tagesaufloesung + Forecast — diese Funktionen muessen kontextualisiert in Mein Tag (Tagesanalyse-Bericht + Wochen-Performance-Bericht) und Cockpit (Forecast-Bericht) weiterleben. Ohne Mapping-Doc droht stiller Funktions-Verlust. Optionen: (a) Komplett loeschen ohne Bruecke — User-Bookmarks brechen, Migration nicht nachvollziehbar. (b) Permanent-Redirect ohne Loeschung — toter Code-Wartungs-Aufwand. (c) 1-Sprint-Redirect mit Toast + Loeschung in V6.7+ — User-Migrations-Bruecke + sauberer Cleanup-Pfad.
- Consequence: SLC-662 erstellt Mapping-Tabelle als Pflicht-Output (in V6.6-Architecture dokumentiert): /performance-Funktion -> neuer V6.6-Bericht-Pfad. /performance/page.tsx wird zur Redirect-Page mit Toast "Performance ist jetzt im Mein-Tag-KI-Workspace verfuegbar — Wochen-Performance-Berichts-Button" + redirect zu /mein-tag. Sidebar-Eintrag "Meine Performance" entfernt. V6.7+ BL: /performance-Datei + Redirect-Logik komplett loeschen (Cleanup-BL). KEINE Funktion darf wortlos verschwinden — SLC-662-Acceptance-Criteria enthaelt Mapping-Check.

## DEC-170 — V6.6 Activity-Sheet als Reuse Task-Sheet via ItemSheet-Refactor mit Type-Discriminator (V6.6)
- Status: accepted
- Reason: PRD V6.6 F7+F8. Task-Sheet (FEAT-302 Mein Tag) und Activity-Sheet (FEAT-664 Deal-Detail) zeigen ueberlappende Sektionen (Title + Datum + Inhalt + Aktionen). Optionen: (a) Neue Activity-Sheet-Component — Drift-Risiko, doppelter Animation-/Schliessen-/Keyboard-Code. (b) Reuse Task-Sheet als generische `<ItemSheet>` mit Type-Discriminator (`{ kind: "task" | "activity" }`) — eine Component, gemeinsame Schliessen-Patterns. Trade-off: Type-Discriminator-Komplexitaet vs Component-Drift-Vermeidung. Single-Component bevorzugt fuer Wartbarkeit.
- Consequence: SLC-665 erster Schritt: Refactor Task-Sheet zu `<ItemSheet>` mit `ItemSheetData = { kind: "task"; task: Task } | { kind: "activity"; activity: Activity; bedrockSummary?: BedrockSummary }`. Bedrock-Summary-Sektionen (Risiken, Einwaende, Naechste Schritte, Teilnehmer, Zusammenfassung) rendern conditional. Sheet oeffnet IMMER (auch ohne Bedrock-Summary), kompakte Basis-Daten als Fallback. Sektionen-Verfuegbarkeit pro Activity-Type: meeting=alle, email-lang=alle, email-kurz=basis, call=conditional (Asterisk-Recording-V5.1), note=basis.

## DEC-171 — V6.6 Win/Loss-Auto-Trigger als V6.2-Workflow-Action + auto_winloss_runs-Tabelle + 5-Min-Time-Window-Idempotenz (V6.6)
- Status: accepted
- Reason: PRD V6.6 F9+F10+F11+F32 + R4-Mitigation. Auto-Trigger braucht: Trigger-Position, Idempotenz, Daten-Persistenz, Read-API. Optionen: (a) Direkter Hook in pipeline.moveDealToStage — kein Audit-Log-Symmetrie mit V6.2-Workflow-Engine. (b) V6.2-Workflow-Action als System-Rule (kein Builder-UI-Zugriff) — konsistente Audit-Sicht ueber automation_runs + audit_log. Idempotenz-Optionen: UNIQUE auf (deal_id, target_status) — verhindert sinnvolle Re-Runs ueber lange Zeit (z.B. won 2026-05 → reopened lost 2026-06 → won 2026-07). Time-Window 5 Min App-Level — erlaubt langfristig mehrere Runs, blockt nur Stage-Toggling-Edge-Cases. Time-Window bevorzugt. Daten-Persistenz: neue eigene Tabelle `auto_winloss_runs` (vs Erweiterung bestehender Tabelle) — additive Migration ohne Regression-Risiko. Read-API: konsistent mit V6.2 FEAT-622 Campaign-Read-API-Pattern.
- Consequence: SLC-665 implementiert: (1) MIG-032 erstellt `auto_winloss_runs(id, deal_id FK CASCADE, target_status CHECK won|lost, triggered_at, triggered_by_user_id, bedrock_output TEXT, bedrock_model TEXT, bedrock_completed_at, status CHECK pending|succeeded|failed, error_message)` + Indizes. (2) Code-Konstante registriert neuen Workflow-Action-Type `auto_winloss_extract` in `cockpit/src/lib/automation/actions/auto_winloss_extract.ts`. (3) System-Rule angelegt (kein Builder-UI-Eintrag): `trigger=deal.stage_changed`, `filter=new_stage_id IN (won_stage_id, lost_stage_id)`, `action=auto_winloss_extract`, `is_system=true`. (4) Time-Window-Throttle 5 Min vor Insert: SELECT WHERE deal_id+target_status+triggered_at>NOW()-5min → No-Op bei Hit. (5) Bedrock-Call ueber FEAT-114 Loss-Analysis-Logic, gleicher Prompt fuer won/lost. (6) Read-API GET /api/winloss/[deal_id] returnt latest Run mit Bearer-Auth EXPORT_API_KEY. (7) Manueller Berichts-Button im Deal-KI-Workspace triggert Re-Run nur wenn letzter Run >24h alt; "Erneut analysieren"-Button overrided 24h-Cache. Stage-Toggling won → lost → won innerhalb 5 Min triggert genau 2 Runs (won + lost), nicht 3.

## DEC-172 — V6.6 Working-Hours-Setting in user_settings (TIME-Spalten) + localStorage-Toggle (V6.6)
- Status: accepted
- Reason: PRD V6.6 F12+F13+F18. user_settings-Tabelle existiert seit V4.1 + V5.6-Briefing-Cols — additive Erweiterung statt neue Tabelle ist Pattern-konsistent. Optionen Speicherung: (a) JSONB `preferences` — typenlos, fehleranfaellig. (b) TIME-Spalten direkt — typisiert, einfache Queries. (b) bevorzugt. Toggle-Persistenz: (a) DB-Setting — Roundtrip pro Toggle-Klick, ueberkomplex fuer Single-User. (b) localStorage pro User — roundtrip-frei, per-Browser. (b) bevorzugt fuer Single-User-Mode + UX. Multi-Device-Konsistenz ist V7-Item (User wechselt selten Browser).
- Consequence: MIG-032 erweitert `user_settings` additiv: `working_hours_start TIME NULL`, `working_hours_end TIME NULL`, CHECK `(both NULL OR start < end)`. Settings-Page `/settings/working-hours` mit zwei TimePicker-Inputs + Save-Server-Action. localStorage-Key `cockpit:kalender:working-hours-toggle:<userId>` mit Werten "full" oder "work". Default "full" wenn keine Working-Hours gesetzt. Toggle disabled mit Hint "Working-Hours in Settings setzen", wenn DB-Werte fehlen. kalender-client.tsx Hartkodierung 07:00-20:00 wird zu Konstante `DEFAULT_HOUR_RANGE = { start: 6, end: 21 }`. Termine ausserhalb der Working-Hours erscheinen als gestauchter Pre/Post-Bereich (1px-Linien-Trenner + reduzierte Hoehe), nicht ausgeblendet.

## DEC-173 — V6.6 Sidebar-Reorder ohne VERWALTUNG-Touch + subtle Sektion-Header (V6.6)
- Status: accepted
- Reason: PRD V6.6 F14+F31 + R5-Mitigation. Sidebar wird zu 4 Sektionen (ANALYSE / OPERATIV / ARBEITSBEREICHE / VERWALTUNG). VERWALTUNG ist V7-Item (Multi-User + Sichtbarkeits-Logik) — darf in V6.6 nicht beruehrt werden. Sektion-Header-Style-Optionen: (a) Bold uppercase-Header — visueller Bruch mit Style Guide V2. (b) Subtle font-medium text-muted-foreground caps mit kleinem Spacing — minimal-invasiv, konsistent mit Onboarding-Plattform-Sidebar-Pattern. (b) bevorzugt.
- Consequence: SLC-667 implementiert Sidebar-Reorder: ANALYSE [Dashboard], OPERATIV [Mein Tag, Focus, Kalender], ARBEITSBEREICHE [Deals, Pipeline, Firmen, Kontakte, Multiplikatoren], VERWALTUNG [bestehende Eintraege 1:1 unangetastet]. "Meine Performance" raus (Migration via FEAT-661). Sektion-Header als non-clickable `<div>` mit `text-xs font-medium text-muted-foreground uppercase tracking-wide`. Mobile (≤768px): Sidebar wird zu Hamburger-Menue, Sektion-Header bleiben sichtbar. KEINE Eintrag-Umbenennungen, KEINE Icon-Wechsel — User-Mental-Model bleibt durch identische Labels stabil.

## DEC-174 — V6.6 V7-Erweiterbarkeit via role_filter pro Report (V6.6)
- Status: accepted
- Reason: PRD V6.6 F17. V7 bringt Mitarbeiter- und Chef-Sicht mit unterschiedlichen Berichts-Listen. V6.6 baut Admin-Sicht. Optionen: (a) V6.6 hat keine V7-Hooks — V7 muss alle Caller refactorn. (b) Berichts-Listen-Konfig hat in V6.6 KEIN role_filter, aber V7 ergaenzt `role_filter?: ("admin"|"employee"|"chef")[]`-Property pro Report. KIWorkspace filtert zur Render-Zeit. (b) ist V7-vorbereitet ohne V6.6-Komplexitaet.
- Consequence: KIWorkspaceReport-Type hat in V6.6 KEIN role_filter (V7 fuegt es per einfacher Type-Erweiterung hinzu). Reports-Registry pro Workspace-Typ bleibt static-konstant. V6.6-Caller uebergeben nur (context + reports + scope + voiceEnabled). V7-Migration: optional `role_filter`-Property in jedem Report eintragen (V7-Slices), KIWorkspace filtert reports-Liste vor dem Rendern. Kein Breaking-Change fuer V6.6-Caller. Alle Settings haben user_id-Scope (DEC-172) — Multi-User-Differenzierung schon V6.6-vorbereitet.

## DEC-175 — V6.6 "AI-Bereitschaft"-Rename als zentrale UI-Label-Map, KEIN Schema-Touch (V6.6)
- Status: accepted
- Reason: PRD V6.6 F30. Field "KI-Reife" auf Firmen-Detail ist Bewertungs-Dropdown, kein KI-Feature. Optionen: (a) DB-Spaltenname umbenennen — Schema-Migration + Code-Wide-Rename + Template-Variablen-Migration, hoher Aufwand fuer Cosmetic-Change. (b) UI-Label-Map zentral, Spaltenname bleibt — ein Label-Wechsel-Punkt, keine Migration. (b) klar bevorzugt — schema-kompatibel, keine Regression.
- Consequence: SLC-667 erstellt `cockpit/src/lib/labels/ki-readiness.ts` mit Konstanten `KI_READINESS_LABEL = "AI-Bereitschaft"` + `KI_READINESS_OPTIONS = { high: "Hoch", medium: "Mittel", low: "Niedrig" }`. UI-Komponenten (firmen/[id]/page.tsx) importieren die Konstanten. DB-Spaltenname (`ai_readiness` oder vorhandener Name) bleibt unveraendert. E-Mail-Template-Variablen-Tag bleibt schema-kompatibel — falls "ki-reife" als Variable-Tag genutzt wird, wird sie als Alias zu `ai_readiness` gehalten (Reverse-Lookup im Template-Renderer). KEINE Migration noetig. Pipeline-NL-Suche zu Type-Ahead und Sparkles-Card-Removal sind separate Items im selben Slice (SLC-667).

## DEC-176 — V6.6 Slice-Schnitt 7 Slices SLC-661..667 mit zwingender Reihenfolge (V6.6)
- Status: accepted
- Reason: PRD V6.6 F15+F16. KI-Workspace-Component ist Foundation fuer 3 Caller (Mein Tag + Deal-Detail + Cockpit). Activity-Sheet braucht neuen Deal-Detail-Layout. Win/Loss-Auto-Trigger ist einziger Backend-Touch und gehoert zu Activity-Sheet-Slice (gemeinsame Acceptance-Criteria im Live-Smoke). Hygiene-Items (Sparkles + Sidebar + Kalender + Working-Hours) bilden einen klaren letzten Aufraeum-Slice. Optionen: (a) 5 Slices (Component+MeinTag bundle, DealDetail+Sheet+Trigger bundle, Cockpit, Hygiene, DealsListe) — zu grosse Slices fuer Live-Smoke-Granularitaet. (b) 7 Slices wie PRD vorgeschlagen — atomare Live-Smoke-Punkte, Rollback einzelner Slices moeglich. (b) bevorzugt.
- Consequence: V6.6 hat 7 Slices: SLC-661 KI-Workspace-Component (Foundation, ohne Caller, isoliert getestet, ~3-4h), SLC-662 Mein Tag (erster Caller + Performance-Migration, ~3-4h), SLC-663 Deals-Liste (parallelisierbar, kein KI-Workspace-Touch, ~2-3h), SLC-664 Deal-Detail-Layout-Swap (zweiter Caller + 3-KI-Module-Removal, ~3-4h), SLC-665 Activity-Sheet + Win/Loss-Auto-Trigger (ItemSheet-Refactor + MIG-032 + Workflow-Action + Read-API, ~3-4h), SLC-666 Cockpit (dritter Caller, ~2h), SLC-667 KI-Inventur + Kalender-Polish (Hygiene + Sidebar + Working-Hours, ~2-3h). Reihenfolge zwingend: 661 → 662 → (663 parallel ok) → 664 → 665 → (666 parallel zu 664/665 ok) → 667. Pro Slice: backend|frontend → /qa → User-Coolify-Deploy → Live-Smoke. Gesamt-/qa nach SLC-667. Final-Check + Go-Live + Deploy als REL-028. Release-Gate: 7 Bedingungen (siehe Architecture-Doc). Gesamt-Schaetzung 17-24h.

## DEC-177 — V6.6 Cache-Strategie: In-Memory pro Server-Process, 5-Min-TTL, key-by-scope-hash (V6.6)
- Status: accepted
- Reason: PRD V6.6 F29 + Antwort-Caching-Bedarf. Bedrock-Calls sind teuer (~2-8s pro Call + Token-Kosten). Internal-Test-Mode-Single-User mit ~5-10 Berichts-Klicks pro Stunde. Optionen: (a) Redis-Cache — Setup-Aufwand + neuer Container, ueberzogen fuer Single-User. (b) DB-Cache (Tabelle bedrock_response_cache) — Roundtrip + Schema-Migration, fuer 5-min-TTL ueberkomplex. (c) In-Memory pro Server-Process (Node-Module-Level Map) — trivial, ueberlebt Container-Restart nicht (akzeptabel: Cache-Lebensdauer ohnehin 5min). (c) bevorzugt fuer V6.6-Cockpit-Use-Case.
- Consequence: `cockpit/src/lib/ki-workspace/cache.ts` exportiert `getCached(reportId, scope, userId): ReportResult | null` und `setCached(...)`. Internal Map mit Key = `hash(reportId + JSON.stringify(scope) + userId)`. TTL 5 Minuten via Date.now()-Vergleich. "Aktualisieren"-Button im AnswerPane setzt `bypassCache=true` → Re-Bedrock-Call + Cache-Overwrite. Cache-Invalidierung explizit nach Stage-Wechsel (Auto-Trigger schreibt fresh data → Win/Loss-Cache fuer den Deal invalidieren). Container-Restart leert Cache vollstaendig — akzeptabel.

## DEC-178 — V6.6 Deals-Liste Konfiguration: Top-10 fest, Won-90-Tage-Default, ILIKE-Type-Ahead (V6.6)
- Status: accepted
- Reason: FEAT-663 F19+F20+F21+F22 zusammengefasst. (a) Top-10-Schwelle: PRD-Vorgabe ist Top-10 — User hat aktuell <500 aktive Deals, 10 ist sinnvolle erste Lese-Batch. Konfigurierbar (5/10/20) ist V7-Erweiterung. (b) Gewonnen-Sektion-Range: alle Won-Deals zeigen waere unbeschraenkt wachsend, last 90 Tage als Default + "Mehr anzeigen"-Button ist UX-Best-Practice. (c) "Naechste Aktion" auf Karte: Title + relatives Datum (z.B. "morgen", "in 3 Tagen", "ueberfaellig") ist UX-friendlicher als ISO-Datum. (d) Type-Ahead-Indexing: User hat <500 Deals, ILIKE-Suche reicht. Trigram-Index als BL falls Performance-Probleme bei >1000 Deals.
- Consequence: SLC-663 implementiert Server-side Top-10 mit `ORDER BY (value × probability) DESC LIMIT 10` (Stages won/lost/parked ausgeschlossen). Won/Lost-Sektionen mit Default-Filter `WHERE stage IN (won|lost) AND updated_at > NOW() - INTERVAL '90 days'` + "Mehr anzeigen"-Button. Karten-Inhalt: Title + Wert + Firma + Stage-Badge + Naechste-Aktion (von tasks-Tabelle, naechste offene Task fuer Deal, Format `<title>, <relativeDate>`) + Wahrscheinlichkeit-Pill. Type-Ahead: ILIKE-Suche ueber `deals.title ILIKE '%query%' OR companies.name ILIKE '%query%' OR contacts.full_name ILIKE '%query%'` LIMIT 10. Trigram-Index `pg_trgm` als BL-XXX falls bei >1000 Deals Latenz steigt.

## DEC-179 — V6.6 Deal-Detail-UX-Details: Pencil-Drawer + Stage-direkt-Wechsel + Mobile-Action-Bar-5+2 (V6.6)
- Status: accepted
- Reason: FEAT-664 F23+F24+F25 zusammengefasst. (a) Pencil-Icon: Modal vs Drawer. Drawer (rechts ausfahrend) ist konsistent mit Activity-Sheet-Pattern (gleiche Component-Library). Bewahrt visuelle Konsistenz. (b) Stage-Dropdown-Wechsel: Confirm-Dialog vor jedem Wechsel ist UX-Friction, besonders bei normalem Pipeline-Flow. Auto-Trigger laeuft im Hintergrund (DEC-171 Idempotenz schuetzt vor Toggle-Edge-Cases). Direkter Wechsel ohne Confirm bevorzugt. (c) Mobile-Action-Bar: 7 Buttons in einer Reihe ist auf <768px viewport-breaking. Optionen: horizontaler Scroll (UX-fragil), alle ins Mehr-Menue (Funktions-Verlust gefuehlt), 5 Hauptbuttons sichtbar + Angebot+Mehr ins Mehr-Dropdown. Letztere bewahrt 5 wichtigste Aktionen direkt zugaenglich.
- Consequence: SLC-664 implementiert Pencil-Drawer mit derselben Sheet-Library wie ItemSheet (Vaul oder shadcn-Sheet). Stage-Dropdown-Wechsel ohne Confirm — Auto-Trigger faengt won/lost ueber Workflow-Engine. Mobile (≤768px) Action-Bar zeigt 5 Hauptbuttons sichtbar (Task / E-Mail / Meeting-Dropdown / Anruf / Notiz), Angebot + Mehr-Menue als Dropdown-Hidden ueber Three-Dots. Desktop unveraendert (alle 7 Buttons sichtbar). Mein-Tag-Quick-Switch-Button ist auf allen Viewports sichtbar (rechts im Header).

## DEC-180 — V6.6 Cockpit-UX-Details: Anruf-Kontakt-Picker + Top-Chancen-Tab-im-Bericht + Forecast-Quartal-Default (V6.6)
- Status: accepted
- Reason: FEAT-665 F26+F27+F28 zusammengefasst. (a) Anruf-Button im kontextlosen Cockpit: Click-to-Call braucht Kontakt-ID. Optionen: Button hidden auf Cockpit (User-Funktions-Verlust) oder Kontakt-Picker-Dialog (User waehlt Kontakt → Click-to-Call). Picker-Dialog erhaelt Funktionalitaet ohne Drift. (b) Pipeline-Switcher im Top-Chancen-Bericht: separater Filter-Button (zweiter Bedrock-Call) vs Tab im Antwort-Fenster (in-place clientseitig). Tab-Pattern spart Bedrock-Cost und ist UX-direkter. (c) Forecast-Zeitraum: fest auf Quartal vs konfigurierbar via Frage-Eingabe. Default Quartal ist Standard-Sales-View, freie Frage-Eingabe ("Forecast Q3 2026") nutzt KI-Workspace-Frage-Pattern.
- Consequence: SLC-666 implementiert: (a) Anruf-Button auf Cockpit oeffnet Kontakt-Picker-Dialog (Reuse bestehender Kontakt-Picker-Component, ggf. /contacts Search-Filter). User-Auswahl triggert Click-to-Call ueber V5.1-Asterisk-Pfad. (b) Top-Chancen-Bericht-Bedrock-Antwort enthaelt Daten fuer ALLE Pipelines. Tabs im Antwort-Fenster (clientseitig) wechseln Sektionen ohne Re-Bedrock-Call. (c) Forecast-Bericht Default-Zeitraum aktuelles Quartal. Frage-Eingabe-Pattern wie "Forecast Q3 2026" oder "Forecast Mai 2026" wird vom Cockpit-Frage-Eingabe-Pfad ohnehin abgedeckt — Berichts-Button rendert Default, Frage-Eingabe rendert Custom.

## DEC-164 — V6.5 Brand-Tokens unter `--color-brand-*`-Namespace, nicht `--color-primary` (V6.5)
- Status: accepted
- Reason: shadcn (existing Stack) belegt `--color-primary` im `@theme inline`-Block fuer eine oklch-Greyscale-Foundation. Ein Brand-Override wuerde alle shadcn-Buttons/Links sofort visuell brechen. Slice-Spec SLC-651 nennt diesen Konflikt explizit als Fallback-Pfad. `brand-*`-Namespace haelt beide Systeme nebeneinander, kostet nur 6 Zeichen mehr pro Utility-Klasse (`text-brand-primary` vs `text-primary`).
- Consequence: Alle V6.5+ Theming-Slices (SLC-652..) MUESSEN `text-brand-*`/`bg-brand-*`/`hover:text-brand-*` nutzen. shadcn-Tokens (`--color-primary` etc.) bleiben unangetastet. Tailwind v4-Adaption per CSS-Variablen im `@theme inline`-Block in `cockpit/src/app/globals.css`. Migration aller bestehenden `text-[#XXX]` Drift-Stellen ueber 30 Files lebt in SLC-652+.
- Status: accepted
- Reason: BL-424 (Schema-Hygiene) und BL-430 (Dep-Hygiene) sind thematisch unverwandt. Trotzdem Bundle in 1 Feature: (a) beide sind Hintergrund-Sprint-Char, kein Release-Theme; (b) beide sind klein (jeweils 1-2 Slices); (c) Cockpit-Lesbarkeit bevorzugt 3 Features ueber 4 Features fuer einen Hintergrund-Sprint; (d) Slice-Plan kann beide trotzdem in separaten Slices abbilden (SLC-656 Source-Migration, SLC-657 npm audit). Splitting waere ueber-engineered.
- Consequence: V6.5 hat 3 Features (FEAT-651/652/653). FEAT-653 enthaelt 2 BLs (BL-424, BL-430), die als 2 separate Slices implementiert werden duerfen oder als 1 buendle-Slice — Slice-Planning entscheidet. Cockpit zeigt FEAT-653 als 1 Feature mit 2 BLs.

## DEC-181 — V7 Rollen-Modell: 3 flach (admin/teamlead/member), 1 User in 1 Team (V7)
- Status: accepted
- Reason: User-Direktive 2026-05-12 nach /requirements V7: "3-Rollen flach". Multi-Team-Membership (User in mehreren Teams) wuerde komplexes Many-to-Many-Membership-Pattern + Aktive-Team-Switching in der UI erfordern. Fuer das V7-Multi-User-Ziel (Steuerberater-Kanzlei mit 2-5 Beratern als Pilot) reicht 1:1. Manager-Rolle ueber Teamlead (Mehrstufen-Hierarchie) ist V8-Thema. Flachheit haelt RLS-Policies einfach und auditfaehig.
- Consequence: profiles.role als CHECK-Enum mit drei Werten. profiles.team_id als nullable UUID FK auf teams (nicht Many-to-Many user_team-Tabelle). UI zeigt Rolle als Read-Only-Feld (Admin darf aendern); Team-Wechsel ist Admin-Operation, kein User-Self-Service. Migration MIG-033 setzt CHECK-Constraint.

## DEC-182 — V7 owner_user_id auf 8 Kerntabellen, NULL = System-Record (V7)
- Status: accepted
- Reason: Daten-Isolation pro User braucht eine eindeutige Owner-Beziehung. Alternativen: (a) Shared-Owner via Many-to-Many-Tabelle (Owner-Liste) — komplex, RLS schwerer; (b) Owner als Computed-Field aus Activity-History — fragil und nicht-deterministisch. Eindeutiger Owner pro Record + Bulk-Reassign + audit_log fuer History bietet die richtige Balance fuer V7. NULL als System-Record erlaubt Cron-Jobs ohne `auth.uid()` Inserts ohne fragwuerdige Default-User-Hacks.
- Consequence: ALTER TABLE auf 8 Tabellen (companies, contacts, deals, activities, meetings, proposals, email_messages, calls) mit `owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL`. Bei Profile-Delete: SET NULL (Owner-Verlust akzeptiert, Admin sieht System-Records noch). MIG-033 erstellt Spalten + Index, MIG-034 backfilled auf User Immo, MIG-035 setzt RLS (NULL → only admin SELECT). System-Records sind nur ueber Admin/Service-Role schreibbar.

## DEC-183 — V7 RLS-Strategie: SQL-Helper-Functions + Policy-pro-Tabelle (V7)
- Status: accepted
- Reason: Alternativen: (a) Policies inlinen ueber jede Tabelle die `profiles.role`-Check und Team-Lookup ausschreibt — viel Duplication, schwer wartbar; (b) Application-Level-Filter in Server Actions statt RLS — verletzt das "Hard Isolation"-Prinzip (Code-Bugs leaken Daten); (c) Helper-Functions zentralisieren die Logik (is_admin / is_teamlead / can_see_owner) und werden in pro-Tabelle-Policies aufgerufen. Postgres cached STABLE-Functions pro Statement → akzeptable Performance.
- Consequence: MIG-035 erstellt 4 Helper-Functions (is_admin, is_teamlead, get_my_team_id, can_see_owner) als SQL STABLE. Pro Kerntabelle 4 Policies (SELECT/INSERT/UPDATE/DELETE) die die Helper aufrufen. Alte authenticated_full_access-Policies werden ersetzt. PgBench-Smoke vor SLC-701-Release verifiziert, dass is_admin()/is_teamlead() pro Statement gecached werden (kein N+1).

## DEC-184 — V7 Bulk-Reassign mit audit_log-Trail, kein previous_owner_user_id-Feld auf Tabellen (V7)
- Status: accepted
- Reason: Owner-Wechsel-Historie ist auditrelevant, aber gehoert nicht in die Domain-Tabellen. Alternativen: (a) `previous_owner_user_id UUID`-Spalte pro Tabelle — nur 1 Schritt zurueck, kein vollstaendiger Trail, vermehrt Schema-Drift; (b) Separate `ownership_history`-Tabelle — neue Tabelle nur fuer Audit, redundant zu bestehendem audit_log; (c) audit_log mit event=`owner_change` + old + new + record_id + record_type — wiederverwendet bestehende Infrastruktur, DSGVO-konform durch Retention-Policy.
- Consequence: Bulk-Reassign-Server-Action loggt pro betroffener Zeile einen audit_log-Eintrag (oder Batch mit `affected_rows`-Array). Keine Schema-Aenderung auf Domain-Tabellen ausser owner_user_id selbst. DSGVO-Auskunftspflicht ist via audit_log-Lookup abgedeckt. Bestehende COMPLIANCE.md-Section "Audit-Log-Retention" gilt unveraendert.

## DEC-185 — V7 Workflow-Rules + RAG + Auto-Winloss = team-shared (V7-Vereinfachung) (V7)
- Status: accepted
- Reason: Bestehende KI-Features sind impliziter Admin-Context. Owner-Filterung auf alle drei wuerde V7-Scope verdoppeln. Beratungs-Team teilt typischerweise Wissen ueber Kunden (RAG-Sicht), gleiche Automatisierungs-Regeln (Workflow), gleiche Cockpit-Definition von "Won/Lost". Restriktive Owner-Filterung wuerde Team-Kollaboration behindern. Owner-Filter ist V7.5-Optionalitaet (z.B. fuer Multi-Tenancy V8).
- Consequence: V7 implementiert KEIN Owner-Filter in RAG-Suche, KEINE Owner-Restriction auf Workflow-Rule-Evaluation, KEINE Owner-Restriction auf Auto-Winloss-Trigger. Member darf RAG-Suche im Team-Scope durchfuehren. Workflow-Rules sind admin/teamlead-edit + member-read-only. Auto-Winloss-Trigger feuert pro Owner-Deal (Owner-Context bleibt erhalten — Owner-Identitaet pro Trigger-Run bleibt im audit_log). KI-Workspace-Hybrid-Berichte respektieren Owner-Context bei `/mein-tag` und Team-Scope bei `/team`. /requirements V7.5 oder spaeter kann optional Owner-Filter nachruesten.

## DEC-186 — V7 Meeting/Call Owner = Host-User, Teilnehmer ueber audit_log (V7)
- Status: accepted
- Reason: Meeting/Call kann mehrere Team-Member als Teilnehmer haben. Welche Sichtbarkeit? Alternativen: (a) Owner = erster Teilnehmer — fragil; (b) Many-to-Many participants-Tabelle mit Visibility-Lookup — komplex fuer V7; (c) Owner = Host-User (= Click-to-Call-Ausloeser bei Calls, Meeting-Creator bei Meetings) — eindeutig, einfach, RLS-kompatibel. Teilnehmer sehen das Meeting trotzdem ueber die Team-Sicht (Teamlead) oder ueber Cross-Reference (deal-Activity-Link).
- Consequence: meetings.owner_user_id = meeting.created_by_user_id (= auth.uid() beim Create). calls.owner_user_id = User der Click-to-Call ausloest. Bei Multi-Teilnehmer-Meeting (z.B. Joint Meeting Berater A + B mit Kunde): Owner ist Host. Berater B sieht das Meeting NUR wenn beide im gleichen Team und Berater B = Teamlead (oder Admin). Falls Berater B als Member das Meeting sehen muss: Workaround ist Activity-Cross-Reference oder explizite Owner-Setzung auf B durch Admin. /requirements V8 kann Many-to-Many participants nachruesten.

## DEC-187 — V7 Aggregat-Strategy: Direkter JOIN ueber profiles.team_id, keine Materialized View in V7-Start (V7)
- Status: accepted
- Reason: Materialized View `team_kpi_snapshot` waere optional. Vorab-Optimierung ohne Daten-Beleg. Direkter JOIN ueber `profiles.team_id` + Index auf `owner_user_id` skaliert vermutlich gut bis 20 Member (typische Steuerberater-Kanzlei). Performance-Smoke in /qa SLC-705 mit Test-Seed (5 Member × 100 Deals × 500 Activities) verifiziert <500ms-Target. Falls Smoke FAIL: Materialized View ist klar definierter Fallback (V6.6 ki_workspace_report-Pattern).
- Consequence: `/team`-Aggregat-Query nutzt JOIN ueber `profiles` mit `WHERE team_id = get_my_team_id()` Filter. Indizes auf `deals.owner_user_id`, `activities.owner_user_id`, `profiles.team_id`. Falls Performance-Smoke FAIL (Hetzner echte Daten): MIG-036 als V7-Polish-Patch fuegt Materialized View hinzu mit Refresh-Trigger.

## DEC-188 — V7 Drilldown via URL-Path `/team/[user_id]/...`, server-side mit Read-Only-Guard (V7)
- Status: accepted
- Reason: Alternativen: (a) Session-Switching ("View As Member X" im Header umschalten) — Cookie-Manipulation, RLS-Bypass-Risiko, schwer auditierbar; (b) Client-side via Context-Provider — Race-Conditions bei SSR, schwer mit RLS zu vereinbaren; (c) Server-side URL-Path-Routing — URL ist deklarativ, bookmark-faehig, audit-friendly, RLS pruefen Server-Side via `can_see_owner(user_id)`. Read-Only-Context-Provider ueber den Page-Subtree markiert Mutate-Actions als gesperrt.
- Consequence: Routes `/team/[user_id]/mein-tag`, `/team/[user_id]/pipeline`, `/team/[user_id]/aktivitaeten` als parallele Read-Only-Variants. Server-Component validiert `can_see_owner(user_id)` als erste Aktion. `<ReadOnlyContextProvider>` markiert Subtree. `<DrilldownBanner>` informiert visuell. view_as-Audit-Eintrag pro Page-Load. Drilldown-Versuch durch Member liefert 403 (RLS verhindert SELECT). Server Actions in Drilldown-Subtree pruefen `getReadOnlyContext()` und werfen 403.

## DEC-189 — V7 Mutate-Lockdown: shared assertNotReadOnlyContext()-Helper, kein zentraler Middleware-Guard (V7)
- Status: accepted
- Reason: Middleware-Guard waere global aber haette Schwierigkeit, Mutate-Server-Actions von Read-Server-Components zu unterscheiden. Pro-Action-Guard ist explizit und auditierbar. shared `assertNotReadOnlyContext()`-Helper als erste Zeile in jeder Mutate-Action (Insert/Update/Delete) macht Lockdown sichtbar im Code. Vergleichbares Pattern: bestehende `assertRole()`-Helper.
- Consequence: `/lib/auth/read-only-context.ts` exportiert `assertNotReadOnlyContext()` + `<ReadOnlyContextProvider>`. Audit-Liste der ~80 bestehenden Server Actions wird in SLC-704 erstellt — pro Mutate-Action wird Guard ergaenzt. ESLint-Rule (custom) zu Refactor-Disziplin: Mutate-Server-Action MUSS `assertNotReadOnlyContext()` als ersten Aufruf haben. Test-Strategy: Vitest mit ReadOnlyContext-Mock, jede Mutate-Action muss 403 werfen.

## DEC-190 — V7 Sidebar-Config als zentrale TS-Array mit visibleFor-Array (V7)
- Status: accepted
- Reason: Alternativen: (a) Sidebar-Logik im Sidebar-Component verstreut mit role-Conditions im JSX — schwer testbar, schwer auditierbar; (b) JSON-Datei (sidebar-config.json) — kein Type-Safety; (c) TypeScript-Array mit typsicheren Items inkl. `visibleFor: Role[]` — Single Source of Truth, lint-fest, test-fest. Layout-Server-Component filtert Items via `.filter(i => i.visibleFor.includes(role))`. Sektionen werden automatisch ausgeblendet, wenn keine sichtbaren Items uebrig.
- Consequence: `cockpit/src/lib/navigation/sidebar-config.ts` mit `SIDEBAR_CONFIG: SidebarItem[]`. Sidebar-Component wird `<Sidebar items={SidebarItem[]} />` als props. `(authenticated)/layout.tsx` resolved Profile + filtert Config. Vitest-Tests pro Rolle zeigen erwartete Items + Sektionen. Visual-Diff in Playwright /qa SLC-702 (3 Rollen).

## DEC-191 — V7 Server-Side-Rollen-Guard via assertRole()-Helper am Anfang jeder geschuetzten Page (V7)
- Status: accepted
- Reason: Alternativen: (a) middleware.ts allein — Middleware schuetzt Routes, aber Server-Component-Composition (Layouts) braucht eigenen Guard fuer Sub-Page-Logik; (b) `assertRole()`-Helper in Server-Component am Start jeder Page — explizit, lokal sichtbar, mit Redirect-Logik fuer falsche Rolle. middleware.ts uebernimmt grobe Route-Schutz (z.B. /api/team-Routen), Page-Layout uebernimmt feine Schutz (z.B. /cockpit-Page leitet member zu /mein-tag um).
- Consequence: `/lib/auth/assert-role.ts` exportiert `assertRole(allowed: Role[])` als async-Server-Function die `redirect(...)` aufruft bei Mismatch. Pro Page in `(authenticated)/...` der nicht-fuer-alle-Rollen-zugaenglich ist (Cockpit, Workflow, Kampagnen, Team), erste Zeile = `await assertRole(['admin','teamlead']);`. middleware.ts schuetzt zusaetzlich API-Routes. ESLint-Custom-Rule pruft, dass jede Page-File in `(authenticated)/` einen assertRole-Aufruf oder eine getProfile-Verwendung hat.

## DEC-192 — V7 Mobile-Hamburger zentralisiert in (authenticated)/layout.tsx via Sheet (V7)
- Status: accepted
- Reason: Alternativen: (a) Per Page eigene MobileTopBar — Duplikation, leichter zu vergessen; (b) Zentrale Layout-Position — alle Pages bekommen die gleiche Mobile-Erfahrung. shadcn `<Sheet>` als Drawer-Component ist Brand-Token-faehig via Override. Mobile-Toggle-State per useState (kein localStorage — Drawer soll bei jedem Route-Wechsel automatisch schliessen).
- Consequence: `<MobileTopBar onMenuOpen={...} />` im Layout, nur `<md:hidden>` sichtbar. `<Sheet>`-Component mit `<SheetContent side="left" className="w-72 p-0">` rendert die gleiche Sidebar wie Desktop in Drawer-Format. Sektion-Header bleiben sichtbar. Brand-Token-Override im `components/ui/sheet.tsx` (bg-brand-background, text-brand-text). useState-Reset auf Route-Wechsel via `usePathname()`-Effect.

## DEC-193 — V7 Profile-Delete: Hard-Lock bei offenen Owner-Eintraegen, Re-Assign-Pflicht (V7)
- Status: superseded
- Superseded by: DEC-230 (V8.1 erweitert deleteProfile-Caller auf Teamlead, Hard-Lock-Pattern bleibt unveraendert — nur Permission-Layer wird breiter)
- Reason: Alternativen: (a) CASCADE DELETE — loescht alle User-Daten mit, Daten-Verlust; (b) SET NULL ohne Pre-Check — Records werden zu System-Records, Admin sieht sie, aber Teamlead/Member verlieren ploetzlich Sicht (Aggregat-Drift); (c) Hard-Lock mit Pre-Check + Re-Assign-Pflicht — sauber, vorhersagbar, DSGVO-konform (keine versehentliche Daten-Loeschung). Admin muss explizit ueber Bulk-Reassign alle offenen Records auf anderen User ueberfuehren, dann kann Profile geloescht werden.
- Consequence: Server Action `deleteProfile(userId)` zaehlt offene Records ueber 8 Kerntabellen. Falls > 0: throws Error mit Liste der betroffenen Tabellen + Counts. UI im /settings/team zeigt vor Delete einen Warn-Dialog mit Re-Assign-Link. Erst nach Bulk-Reassign auf 0 offene Records darf Profile geloescht werden. supabase.auth.admin.deleteUser() + profile-Row DELETE (CASCADE NULL auf owner_user_id-Spalten sorgt fuer NULL-Setzung).

## DEC-194 — V7 Invite-Flow: team_id pflichtig beim Invite, Default-Rolle = member (V7)
- Status: superseded
- Superseded by: DEC-230 (V8.1 verengt Teamlead-Caller-Role-Auswahl auf 'member', V7-Admin-Pfad bleibt unveraendert)
- Reason: Alternativen: (a) Invitee-Self-Service Team-Wahl bei First-Login — laesst Lecks zu (Invitee waehlt fremdes Team); (b) Pending-State ohne team_id und Admin assigned spaeter — zusaetzlicher Step; (c) team_id pflichtig im Invite-Form, Admin/Teamlead waehlt das Team — deterministisch, kein Race, Default = eigenes Team. Default-Rolle = member ist sicher (least privilege); Admin kann hochstufen.
- Consequence: `/settings/team`-Invite-Form: E-Mail (pflicht) + Initial-Rolle (Dropdown, Default member) + Team (Dropdown, Default eigenes). Server Action `invite(email, role, teamId)` validiert assertRole (admin oder teamlead-eigenes-Team). supabase.auth.admin.inviteUserByEmail() liefert user_id. INSERT INTO profiles mit (id, role, team_id) als atomare Operation. GoTrue verschickt E-Mail mit Set-Password-Link.

## DEC-195 — V7 audit_log.user_id beibehalten + neue Spalte view_as_target_user_id (V7)
- Status: accepted
- Reason: Bestehende audit_log-Architektur (V3 FEAT-307) hat `user_id` als triggering-User. Bei Drilldown-View-as ist Teamlead der "user" und Member der "target" — beides muss erfasst werden. Alternative: triggered_by_user_id-Spalte hinzufuegen + user_id-Semantik aendern — Drift-Risiko gegenueber Bestand. Sauberere Loesung: bestehendes user_id semantisch unveraendert (= triggering-User), neue optionale Spalte view_as_target_user_id fuer Drilldown.
- Consequence: MIG-033 fuegt `audit_log.view_as_target_user_id UUID NULL` hinzu. Bei normalen Audit-Eintraegen bleibt diese Spalte NULL. Bei Drilldown-Page-Load: event=`view_as`, user_id=Teamlead, view_as_target_user_id=Member. Audit-Search-UI in /settings/compliance erweitert um Filter "View-as-Drilldowns". Audit-Lookup pro Member ueber `WHERE view_as_target_user_id = $1 OR user_id = $1`.

## DEC-196 — V7.1 Settings-Permission-Matrix dreistufig (Admin / Admin+Teamlead / Alle) (V7.1)
- Status: accepted
- Reason: V7-Walkthrough 2026-05-14: Settings sind aktuell fuer alle Rollen offen. Versehentliche Aenderung durch Member an Branding/Steuern/Pipelines hat Cross-Team-Wirkung. User-Entscheidung 2026-05-15: nicht strikt Admin-only (das wuerde Teamlead die operativen Settings nehmen), sondern dreistufiger Cut nach Risiko-Klasse. **Strikt Admin (organisationsweite Tiefe):** Branding, Payment-Terms/Steuern, Pipelines/Stages, Produkte, Compliance, IMAP. **Admin+Teamlead (Team-operativ):** Workflow-Automation, E-Mail-Templates, Kampagnen, Team-Verwaltung. **Alle (persoenlich):** Mein-Profil (Stub), Working-Hours, Meeting-Einstellungen + Briefing.
- Consequence: 11 Settings-Sub-Pages bekommen `assertRole`-Guard als first line. `SIDEBAR_CONFIG` und Settings-Layout-Sidebar werden um explizite Items mit visibleFor erweitert. Settings-Landing-Kacheln werden rollen-gefiltert. Audit-Trail-Erweiterung NICHT in V7.1 (siehe DEC-197). Member-Stub-Profil-Page existiert nicht — Member sieht Working-Hours + Meeting + Briefing als persoenliche Settings; Profil-Page-Stub ist V7.2+ falls Bedarf.

## DEC-196b — V7.1 Settings-Sidebar als Slug-Filter aus SIDEBAR_CONFIG (V7.1)
- Status: accepted
- Reason: `/settings/layout.tsx` hat heute eine hardcoded 4-Item-Liste. Wenn FEAT-711 Settings-Sub-Pages-Visibility filtert, muessen zwei Sidebars konsistent bleiben: globale Sidebar + Settings-Sub-Sidebar. Zwei Sources of Truth zu pflegen ist Drift-Garant. Loesung: Settings-Sub-Sidebar-Items werden ueber Slug-Filter `pathname.startsWith("/settings/")` aus dem zentralen `SIDEBAR_CONFIG` abgeleitet.
- Consequence: `SIDEBAR_CONFIG` waechst um 11 neue Items fuer alle Settings-Sub-Pages mit korrekten `visibleFor`-Listen. `/settings/layout.tsx` ruft `filterByRole(role).filter(item => item.href.startsWith("/settings/"))`. Eine Source of Truth, kein Drift-Risiko. Hardcoded Liste in `SIDEBAR_ITEMS` (heute settings/layout.tsx:17-34) wird entfernt.

## DEC-197 — V7.1 KEIN neuer Settings-Audit-Trail in dieser Version (V7.1)
- Status: accepted
- Reason: V7.1 ist Polish-Sprint mit minimalem Aenderungs-Surface. Audit-Trail fuer Settings-Aenderungen (z.B. `settings_branding_update`) ist heute teils vorhanden, teils nicht — asymmetrisch. ISSUE-069 dokumentiert sogar Doc-Sync-Drift im bestehenden Audit-State. Erst Symmetrisieren (V7.1 FEAT-713), dann audit-trail-erweitern (V7.2 oder spaeter). Compliance-Gate-Auditoren brauchen Settings-Audit nur fuer Live-Drittnutzer-Phase — Internal-Test-Mode-State erlaubt das Defer.
- Consequence: Bestehende Settings-Update-Actions (saveBranding, savePaymentTerms, etc.) bleiben unveraendert in V7.1. FEAT-711-Implementation patcht NUR `assertRole`-Guards + Sidebar-Visibility — keine `audit_log.insert(...)`-Aufrufe. Folge-BL: BL-471 wird in V7.2-Planning aufgenommen falls Bedarf entsteht.

## DEC-198 — V7.1 assertRole-Mismatch redirected nach /mein-tag, KEIN 403-Page (V7.1)
- Status: accepted
- Reason: V7 `assertRole`-Implementation (assert-role.ts:24) macht heute `redirect("/mein-tag")` bei Mismatch. Konsistent mit DEC-191 (V7-Page-Guard-Pattern). FEAT-711 reuset diese Semantik unveraendert. Style-Guide-V2 hat keine 403-Page-Komponente. Eine neue 403-Page-Component einfuehren wuerde Scope-Drift in V7.1 sein (V7.2-Kandidat falls Drittnutzer-Test-Feedback das verlangt).
- Consequence: Member klickt auf `/settings/branding`-Direct-URL → stiller Redirect auf `/mein-tag`. Sidebar-Visibility-Filter macht das in 99% der Faelle unsichtbar (Member klickt erst gar nicht). URL-Share-via-Mail bleibt Edge-Case ohne 403-Erklaerung. Style-Guide-V2-Konsistenz bleibt gewahrt.

## DEC-199 — V7.1 Drilldown-Reuse via readOnly + viewAsUserId-Props an PipelineView (V7.1)
- Status: accepted
- Reason: Heute ist `/team/[user_id]/pipeline/page.tsx` eine separate reduzierte Drilldown-Variante (siehe Code-Comment "Volle Pipeline-Sicht kommt in V7.5+"). Drei Pattern moeglich: (A) eigene Variants — Code-Duplikation, Feature-Drift garantiert. (B) Wrapper-Component um PipelineView — Daten-Loading-Doppelung. (C) PipelineView bekommt `readOnly` + `viewAsUserId`-Props und Drilldown-Page ruft direkt PipelineView mit den Props auf — echtes Reuse, einmal Daten geladen, Filter-State-Isolation via Prop. (C) ist die saubere Loesung trotz +2 optionalen Props in der API.
- Consequence: `<PipelineView>` bekommt 2 neue optionale Props: `readOnly?: boolean` (default false; hidet Stage-Change/Edit/Delete/Drag-Drop/Create-Deal-Buttons) und `viewAsUserId?: string` (postfix fuer Filter-Storage-Key). Drilldown-Page lädt Daten mit `WHERE owner_user_id = $1` und uebergibt PipelineView. Analoge Anwendung auf Aktivitaeten- und Mein-Tag-Components in SLC-712 MT-5+6. Read-Only-Context-Layout-Wrap aus SLC-706 bleibt aktiv als Defense-in-Depth-Backup.

## DEC-200 — V7.1 Filter-State-Storage-Key mit viewAsUserId-Postfix (V7.1)
- Status: accepted
- Reason: PipelineView persistiert heute Filter-State in localStorage mit Key wie `pipeline-filter-state`. Wenn FEAT-712 die Component fuer Drilldown wiederverwendet, wuerde der Drilldown-Filter den Self-Filter ueberschreiben. Alternativen: (A) gar keine Persistierung in Drilldown — UX-Drift wenn Teamlead zwischen Filter-Settings hin- und herwechselt. (B) Storage-Key mit viewAsUserId-Postfix — saubere Isolation pro Drilldown-Ziel + Self bleibt unangetastet.
- Consequence: Storage-Key-Funktion: `getStorageKey(viewAsUserId)` returnt `pipeline-filter-state-viewAs-${viewAsUserId}` wenn Prop gesetzt, sonst `pipeline-filter-state`. Drilldown-Filter persistieren separat pro target_user_id. Wenn Teamlead von /team/[A]/pipeline auf /team/[B]/pipeline wechselt, ist Filter-State pro Member erhalten. Analoge Pattern in Aktivitaeten- und Mein-Tag-Components.

## DEC-201 — V7.1 Vitest-Pattern fuer Read-Only-Context-Tests: runWithReadOnlyContext-Wrapper (V7.1)
- Status: accepted
- Reason: FEAT-713 fordert 4 Vitest-Tests die `assertNotReadOnlyContext()`-Throw-Verhalten verifizieren. Zwei Pattern moeglich: (A) `vi.mock("@/lib/auth/read-only-context")` mit Mock-Storage — versteckt echtes Verhalten, kann false-positive-PASS produzieren. (B) `runWithReadOnlyContext({...}, async () => action())` im Test direkt — testet echte AsyncLocalStorage-Propagation, identisch zu Production-Pfad. (B) ist konsistent mit SLC-706 MT-6-Test-Pattern aus read-only-context.test.ts.
- Consequence: 4 Vitest-Tests folgen identischem Template: Supabase + pg-Client gemockt (damit kein echter DB-Call), `runWithReadOnlyContext({ viewerUserId, targetUserId }, async () => action())` wrapped die zu testende Server-Action. `expect(...).rejects.toThrow(/Mutation blocked: read-only context active/)`. Plus Assertion dass keine DB-Mutation passiert ist (z.B. `expect(stubPgClient.query).not.toHaveBeenCalled()`). Konsistente Test-Architektur cross-V7-Code.

## DEC-202 — V7.2 Container-Bootstrap-Pattern: Manual-Apply via docker exec, kein Dockerfile-Hook (V7.2)
- Status: accepted
- Reason: V7.2 will Multi-User-Seed nach jedem Coolify-Redeploy verfuegbar haben (ISSUE-073). Drei Pattern moeglich: (A) Dockerfile-Entrypoint-Script mit Wait-for-DB + ENV-Gate `SEED_MULTI_USER_ENABLED` — 2-3h Aufwand auf 3-4h V7.2-Sprint, plus Risiko-Surface (vergessenes ENV-Gate = Production-Daten-Drift). (B) Coolify-Pre-Deploy-Cron — kein etabliertes Pattern in diesem Codebase, ungetestet. (C) Manual-Apply via `docker exec <app-container> npx tsx scripts/seed-multi-user.ts` analog zu sql-migration-hetzner.md-Pattern — Agent dokumentiert den Run in /qa/Post-Launch-Reports. Pattern (C) ist konsistent mit existierender Strategaize-Disziplin: SSH/Migrations werden vom Agent ausgefuehrt (feedback_ssh_migrations_always_claude.md). Pattern (A) waere fuer V7.3+ moeglich wenn Staging/CI hinzukommt.
- Consequence: Seed-Run ist manueller Schritt nach jedem V7.2-Deploy (geschaetzt ~1-2x/Quartal, nicht pro Container-Restart). Konkrete Sequence dokumentiert in V7.2-Architecture Slice-Plan MT-3. Wenn spaeter ein zweiter Server-Standort (Staging, CI) oder Auto-Heal-Coolify-Restart die Seed-Daten wegspuelt, BL-475 in V7.3+ Roadmap fuer Bootstrap-Hook.

## DEC-203 — V7.2 vitest.rls.config.ts Path-Alias-Resolver via resolve.alias, nicht vite-tsconfig-paths Plugin (V7.2)
- Status: accepted
- Reason: ISSUE-074 fordert dass `@/...`-Imports in `__tests__/team/bulk-reassign.test.ts` aufloesbar werden. Zwei Optionen: (A) `vite-tsconfig-paths`-Plugin (liest automatisch tsconfig.json paths). (B) `resolve.alias` direkt in vitest.rls.config.ts (Pattern-Reuse aus vitest.config.ts:21-23). Default-jsdom-Config nutzt bereits Option (B): `resolve.alias: { "@": path.resolve(__dirname, "./src") }`. Plugin-Option waere zusaetzliche Dependency (vite-tsconfig-paths ist NICHT in dependencies, trotz frueherer ISSUE-074-Notiz die `bereits in dependencies` behauptete — Realstand 2026-05-16 bestaetigt: nicht installiert). Plugin-Option haette nur Mehrwert wenn Aliases ueber `@/...` hinausgehen, was V7.2 nicht plant.
- Consequence: 4-Zeilen-Patch in vitest.rls.config.ts: `import path from "node:path"` plus `resolve: { alias: { "@": path.resolve(__dirname, "./src") } }` Block. Pattern-Reuse-Pflicht erfuellt (strategaize-pattern-reuse.md). Keine npm-Install-Operation. Bei kuenftigen Multi-Alias-Anforderungen Switch auf vite-tsconfig-paths-Plugin in V8+ moeglich.

## DEC-204 — V7.2 qa-admin UUID 0...0ba001 + role=admin + TEST_TEAM_ID-Zuordnung (V7.2)
- Status: accepted
- Reason: BL-471 verlangt qa-admin als 3. Test-Rolle. UUID-Konvention-Optionen: (A) `00000000-0000-0000-0000-000000000080` (numerische Sequenz nach Teamlead 078 vor Member 081). (B) `00000000-0000-0000-0000-0000000ba001` (gemaess BL-471-Spec, distinkter "ba"-Range trennt admin sichtbar von numerischer Teamlead/Member-Range). Option (B) gewinnt: visuell unverwechselbar als "Admin-Range" in pgsql-Output, BL-471-Wert bereits in Backlog dokumentiert, kein Re-Numbering-Risiko gegen historische Tests die 080 koennten erwartet haben. Team-Zuordnung: qa-admin sitzt im TEST_TEAM_ID (077) statt im Strategaize-Production-Team, damit RLS-Matrix-Tests admin-Rolle isoliert ohne Strategaize-Production-Daten-Zugriff testen koennen. Production-Admin richard@bellaerts.de bleibt separat im Strategaize-Team.
- Consequence: `TEST_ADMIN_ID = "00000000-0000-0000-0000-0000000ba001"` als neue Konstante in seed-multi-user.ts. Profile-Eintrag mit `role=admin`, `team_id=TEST_TEAM_ID`, `display_name="[TEST] Test-Admin"`. Auth-User in create-qa-test-users.mjs mit email `qa-admin@strategaize.test`, password `QaV72-Admin!`. RLS-Matrix-Test admin-Rolle ueber qa-admin verifiziert. Production-richard@bellaerts.de unbetroffen.

## DEC-205 — V7.5 Sculptor-Prompt-Architektur: Single-Shot mit zod-Validate + 1x Re-Prompt (V7.5)
- Status: accepted
- Reason: NL-Sculptor muss zwischen 3 Optionen waehlen: Single-Shot (1 Bedrock-Call), Single-Shot mit Re-Prompt-Loop (max 2 Calls), oder Multi-Turn (Trigger → Conditions → Actions getrennt). Multi-Turn verdreifacht Cost + Latenz ohne Qualitaets-Mehrwert bei Strict-Schema (V6.2-Whitelist gibt scharfen Mapping-Zielraum vor). Single-Shot ohne Loop ist fragil gegen LLM-JSON-Drift. **Gewaehlt:** Single-Shot mit zod-Validate; bei Validation-Fail 1x Re-Prompt mit Korrektur-Hint, sonst structured Reject. Median-Cost <$0.005. Bedrock-Tool-Use-Function-Calling-API verworfen fuer V7.5 wegen Provider-Lock-in.
- Consequence: `cockpit/src/lib/automation/sculptor.ts` implementiert Re-Prompt-Loop mit `attempt <= 2`. System-Prompt + 8 Few-Shot-Examples in `sculptor-prompts.ts` (4 success, 2 reject, 2 edge). zod-Schema in `sculptor-schema.ts` importiert `FIELD_WHITELIST` aus bestehender `automation/field-whitelist.ts` als Single-Source-of-Truth. Bei 2nd-Fail: structured Reject-Payload mit explanation. /qa-Slice misst Sculpt-Accuracy auf 10 Real-World-Prompts; falls <70% PASS, Multi-Turn als V7.6-Polish nachziehen. healJsonEscapes-Reuse aus IS-SLC-109 verhindert LLM-JSON-Drift.

## DEC-206 — V7.5 NL-History-Storage: audit_log JSONB-Reuse, kein neues Schema (V7.5)
- Status: accepted
- Reason: NL-Sculpt-Versuche brauchen Persistierung fuer Inspection-Log + Cost-Audit. Optionen: (A) neue Tabelle `nl_sculpt_history` mit dedizierten Spalten + RLS + Migration + Backup, (B) audit_log-Reuse mit JSONB-metadata, (C) Bedrock-Cloudwatch-Provider-Tracking. (C) hat keinen App-spezifischen Edit-Status, separate Quelle. (A) ist Schema-Overhead fuer eine Listing-Only-Verwendung. **Gewaehlt:** (B) audit_log mit `action='automation_rule.sculpt_attempt'` + JSONB metadata `{nl_input, transcript_source, sculptor_model_id, sculptor_cost_usd, attempt_count, result_status, result_payload}`. Plus `automation_rule.create_via_nl`-Action beim Apply mit Verlinkung zu sculpt_attempt-audit-id.
- Consequence: Keine MIG-Eintrag noetig. Listing-Query `cockpit/src/lib/automation/nl-history.ts` selektiert `audit_log WHERE action='automation_rule.sculpt_attempt' ORDER BY created_at DESC LIMIT 50`. Bei >100k audit_log-Rows kann Filter-Performance ein Risiko werden; heute <10k Rows, V7.5 nimmt das Risiko. Spaetere Migration zu eigener Tabelle bleibt moeglich (V8+-Item falls noetig).

## DEC-207 — V7.5 Apply-Confirmation-UI: Confirm-Modal nach Trockenlauf mit Pflicht-Checkbox (V7.5)
- Status: accepted
- Reason: Trockenlauf-Karte (V6.2 DEC-132-Reuse) zeigt Wirkung. Apply-Klick muss zwischen 2 Patterns waehlen: (A) direkter INSERT mit `status='active'` nach Trockenlauf-Klick, (B) zusaetzliches Confirm-Modal mit Klarsprache-Echo + Pflicht-Checkbox vor INSERT. (A) ist friction-arm aber Klick-Drift-anfaellig (Trockenlauf-Karte hat mehrere Klick-Optionen nahe beieinander). (B) ist konsistent mit User-Pattern `feedback_qa_mandatory` (Guardrails-strong). **Gewaehlt:** (B) Confirm-Modal nach Trockenlauf, Pflicht-Checkbox "Ich bestaetige: Diese Regel wird ab jetzt auf alle neuen <trigger_event>-Events angewandt", Apply-Button disabled bis Checkbox aktiv.
- Consequence: `NLRuleBuilderCard.tsx` zeigt nach Trockenlauf-Anzeige einen "Regel aktivieren"-Button, der das Confirm-Modal oeffnet. Modal-Body: Klarsprache-Echo + Trigger-Event-Label + Action-Liste-Label + Pflicht-Checkbox + "Aktivieren"-Submit. `applyNlRule()`-Server-Action wird erst nach Modal-Confirm aufgerufen. Toast "Regel aktiviert" + Karten-State-Reset nach Erfolg.

## DEC-208 — V7.5 Sculptor-Cost-Display: Real-Cost nach Bedrock-Call, kumulativ bei Reject-Loop (V7.5)
- Status: accepted
- Reason: Cost-Sichtbarkeit ist Mandate aus `feedback_bedrock_cost_control` (on-click-Pattern). Optionen: (A) Pre-Estimate via Client-side-Tokenizer (Lib wie `tiktoken` als Bundle-Erweiterung), (B) Post-Bedrock-Real-Cost aus `usage.input_tokens` + `output_tokens` der Bedrock-Response. (A) erfordert Tokenizer-Bundle (~80kB) + Client-Side-Token-Estimation, kein User-Mehrwert da Cost-Range $0.003-$0.006 niedrig. **Gewaehlt:** (B) Real-Cost-Calc nach Bedrock-Call, additiv kumulativ bei Re-Prompt-Loop. UI zeigt `"~$0.003 fuer 1 Versuch"` oder `"~$0.006 fuer 2 Versuche"`.
- Consequence: `cockpit/src/lib/automation/sculptor-cost.ts` mit PRICING-Tabelle (`anthropic.claude-3-5-sonnet-20241022-v2:0`: input $0.003/1k, output $0.015/1k). `calculateSculptCost(usage, modelId)`-Pure-Function. Cost wird im audit_log-metadata persistiert + in NLRuleBuilderCard-UI angezeigt. Vitest-Test mit Mock-Bedrock-Usage. Vorab-Estimate als BL-spaeter notiert (falls Cost-Range steigt durch hoehere Trefferraten oder groessere Few-Shot-Pools).

## DEC-209 — V7.5 Sculptor-File-Layout: 6 Files unter cockpit/src/lib/automation/ (V7.5)
- Status: accepted
- Reason: Sculptor-Code wird in mehrere Verantwortlichkeiten getrennt fuer Testbarkeit + zukuenftige Erweiterung. Single-File-Skript-Pattern (`sculptor.ts` mit allem) waere bei Schema-Updates oder Prompt-Tuning unhandlich. **Gewaehlt:** 6-File-Split:
  - `sculptor.ts` Core sculptRule() + Re-Prompt-Loop + audit-log-Insert
  - `sculptor-prompts.ts` System-Prompt + 8 Few-Shot-Examples
  - `sculptor-schema.ts` zod-Schemas, importiert FIELD_WHITELIST aus automation/field-whitelist.ts
  - `sculptor-cost.ts` PRICING + calculateSculptCost()
  - `sculptor-dedup.ts` assertNotDuplicateRule()
  - `nl-history.ts` Listing-Query
- Consequence: Test-Setup pro File: `cockpit/src/lib/automation/__tests__/sculptor-*.test.ts` (Unit, vi.mock fuer Bedrock). Plus Live-DB-Tests `cockpit/__tests__/automation/sculptor-history.test.ts`. Pattern-Konsistenz zu V6.2-Automation-File-Split. Single-Source-of-Truth fuer FIELD_WHITELIST verhindert Drift zwischen Click-Wizard und NL-Sculptor.

## DEC-210 — V7.5 FEAT-752 Middleware-Pfad-Regex: /^\/team\/[^/]+\// (V7.5)
- Status: accepted
- Reason: ISSUE-066-Closure braucht Middleware-Pfad-Match fuer V7-Drilldown-Routes. Regex-Optionen: (A) `/^\/team\//` (matched auch `/team` und `/team/` ohne Sub-Pfad), (B) `/^\/team\/[^/]+\//` (matched nur `/team/<id>/<sub>`-Form), (C) `/^\/team\/[a-f0-9-]+\//` (UUID-strict). (A) fuegt Header zu Team-Liste (zu breit). (C) verhindert kuenftige nicht-UUID-Slugs. **Gewaehlt:** (B) als Balance-Punkt. Drilldown ist immer `/team/<uuid>/<sub-page>`-Form.
- Consequence: `cockpit/src/middleware.ts` erweitert um Regex-Check `if (/^\/team\/[^/]+\//.test(pathname)) response.headers.set("X-Read-Only-Mode", "1")`. `assertNotReadOnlyContext()` in `cockpit/src/lib/auth/read-only-context.ts` erweitert um zweiten Layer (`headers().get("X-Read-Only-Mode") === "1"` via `next/headers`). Vitest-Mock-Tests fuer 9 Pfad-Variationen (siehe Architecture V7.5 Match-Tabelle). Playwright-Live-Smoke verifiziert Direct-Server-Action-Call wirft ReadOnlyContextError. audit_log-Eintrag `read_only_context_blocked` bei jedem Hit fuer Forensik. ISSUE-066 nach Live-Smoke `resolved`.

## DEC-211 — V7.5 Bedrock-Region-Pin: Startup-Assertion eu-central-1, drift wirft Exception (V7.5)
- Status: accepted
- Reason: data-residency.md verlangt strict EU-Region fuer LLM-Provider. V3 verwendet `eu-central-1`, aber kein Code-Pfad pruefte das aktiv. Region-Drift durch Mis-Config oder Provider-Wechsel waere stiller Compliance-Bruch. **Gewaehlt:** Startup-Assertion in `cockpit/src/lib/llm/bedrock-client.ts:createBedrockClient()`: wirft Exception wenn `BEDROCK_REGION !== "eu-central-1"`. Gilt fuer alle Aufrufer (V3 LLM-Layer, V4.2 RAG-Embeddings, V7.5 Sculptor) — Single Choke-Point.
- Consequence: `ALLOWED_REGION` Konstante in bedrock-client.ts. ENV-Variable `BEDROCK_REGION=eu-central-1` zwingend in Coolify-Resource gesetzt (heute vermutlich bereits). Vitest-Test: Mock `process.env.BEDROCK_REGION='us-east-1'` → `createBedrockClient()` throws. data-residency.md-Compliance-Check via 1 Assertion-Test gedeckt. Bei Bedarf einer anderen EU-Region (z.B. eu-west-1 fuer DR) kann ALLOWED_REGION zu `Set(["eu-central-1","eu-west-1"])` erweitert werden — nicht in V7.5-Scope.

## DEC-212 — V7.6 NL-Builder Button-Label "Workflow bauen" (V7.6)
- Status: accepted
- Reason: FEAT-761 macht den NL-Rule-Builder zum 6. Berichts-Button im KI-Workspace. Label-Optionen: (A) "Workflow per Klartext" (V7.5-Card-Naming, expliziter, aber lang), (B) "Workflow bauen" (kurz, verbnah, konsistent mit Standard-Button-Labels wie "Tagesanalyse"/"Pipeline-Risiko"), (C) "Neue Regel" (generisch, semantisch identisch mit V6.2 Click-Wizard — verwechslungsgefaehrlich), (D) "Automatisierung" (substantivisch, Stil-Bruch). **Gewaehlt:** (B) "Workflow bauen" — kurz, verbnah, kein Stil-Bruch zu bestehenden Workspace-Buttons, klare Verb-Aktion.
- Consequence: `MEIN_TAG_REPORTS` in `cockpit/src/components/ki-workspace/reports/registry.ts` bekommt zusaetzlichen Eintrag `{ id: "nl-builder", label: "Workflow bauen", serverActionPath: "", cacheable: false }`. `serverActionPath` ist leerer String, da der Click den `reportRun.run()`-Pfad short-circuited (handleReportClick erkennt `report.id === "nl-builder"` und ruft KEINEN Bedrock-Call). data-testid `ki-workspace-report-nl-builder` etabliert. Falls spaeter andere Pages (Deal-Detail, Cockpit) den NL-Builder bekommen, wird dort der gleiche Label-Eintrag wiederverwendet — Single-Naming-Source.

## DEC-213 — V7.6 NL-Builder-Inline File-Location: cockpit/src/components/ki-workspace/nl-builder-inline.tsx (V7.6)
- Status: accepted
- Reason: FEAT-761 portiert den V7.5-`NLRuleBuilderCard`-Code zur Inline-Form ohne Card-Wrapper. Location-Optionen: (A) `cockpit/src/components/ki-workspace/nl-builder-inline.tsx` (semantisch korrekt — Workspace-Mode-Variation, future-proof fuer Re-Use auf Deal-Detail oder Cockpit), (B) `cockpit/src/components/mein-tag/nl-rule-builder-inline.tsx` (mein-tag-scoped, heute nur dort genutzt). Heute lebt der NL-Builder unter `components/mein-tag/`, aber konzeptionell ist er ein Workspace-Bauteil. **Gewaehlt:** (A) — konsistent mit den geplanten `meine-berichte-dropdown.tsx` + `save-custom-report-modal.tsx` (V7.6 FEAT-762, beide unter `ki-workspace/`).
- Consequence: Neue Datei `cockpit/src/components/ki-workspace/nl-builder-inline.tsx` mit 4-Karten-Sequenz (NL-Eingabe + Klarsprache + Schema-Editor + Trockenlauf+Apply) OHNE Cost-Display + OHNE Modell-Hint + OHNE Card-Wrapper-Box. **Cleanup-Pflicht:** `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` + `nl-rule-builder-card.test.tsx` werden komplett geloescht (CLAUDE.md "Surgical changes"). Sub-Komponenten `apply-confirm-modal.tsx` + `preview-result-card.tsx` bleiben unter `components/mein-tag/` (V7.5-Reuse), werden vom neuen Inline-Component importiert. Falls /slice-planning erkennt dass sie auch nur einmal genutzt werden, koennen sie im selben Slice mit-umziehen.

## DEC-214 — V7.6 NL-Builder-Mode: Workspace-Input-Bar disabled mit Hint (V7.6)
- Status: accepted
- Reason: Im NL-Builder-Mode hat der KI-Workspace eine zweite Eingabe-Surface (NL-Builder-eigene Text-Area + Mikro-Button). Die existierende Workspace-Free-Form-Inputzeile "Frage stellen ..." sollte NICHT parallel funktionieren — sonst Doppel-Bedrock-Call-Risiko + verwirrender UX. Optionen: (A) Input-Bar hidden im NL-Builder-Mode (radikal, User sieht nicht wie er zurueck-wechselt), (B) Input-Bar disabled mit Hint "Workflow-Modus aktiv — verwende die NL-Eingabe unten" + Klick auf Standard-Berichts-Button wechselt zurueck in Free-Form-Mode (User sieht den Zustand, hat klaren Rueck-Pfad), (C) Input-Bar bleibt aktiv und triggert separaten Free-Form-Pfad (komplex, Multi-Mode-State). **Gewaehlt:** (B) — analog zum "Aktualisieren"-Button-Pattern (nur sichtbar wenn result), klare Mode-Sichtbarkeit, kein versteckter State.
- Consequence: `KIWorkspace.tsx` mappt `mode === "nl-builder"` auf `<input disabled={true} placeholder="Workflow-Modus aktiv — verwende die NL-Eingabe unten">`. Send-Button + Voice-Button daneben sind ebenfalls disabled. Klick auf einen Standard-Berichts-Button (5 Eintraege) wechselt `mode` zurueck auf `"report"` und triggert dann `reportRun.run()` wie bisher. data-testid `ki-workspace-input` hat `disabled`-Attribut im NL-Builder-Mode. Vitest deckt: Mode-Switch hin + zurueck, disabled-State-Check.

## DEC-215 — V7.6 Custom-Reports Bedrock-Context-Loader: Context-Type-Default (V7.6)
- Status: accepted
- Reason: `runCustomReport({ id })` braucht einen Daten-Kontext fuer den Bedrock-Call. Optionen: (A) Context-Type-spezifischer Default-Loader (`mein-tag` laedt Activities+Tasks+Deals analog `tagesanalyse.ts`, `cockpit` laedt Pipeline-Aggregate analog `pipeline-snapshot.ts`) — einfach, ein Bedrock-Call, Reuse bestehender Loader-Logik, (B) NL-Sculpt-Daten-Selektion (2 Bedrock-Calls: erst LLM bestimmt benoetigte Daten, dann LLM antwortet mit Daten) — maechtig aber 2x Cost+Latenz, V7.6-Scope-Inflation, (C) Free-Form-Frage-Loader wiederverwenden (gleicher Pfad wie heute die "freie-frage" im Workspace) — aequivalent zu A, A bevorzugt wegen Explicit-Naming. **Gewaehlt:** (A) Context-Type-Default in V7.6, (B) als V7.7+-Erweiterung wenn echter Bedarf entsteht.
- Consequence: Neue Datei `cockpit/src/lib/ki-workspace/custom-report-runner.ts` mit `runCustomReportCore({ promptTemplate, contextType, scope }) → ReportResult`. Switch auf `contextType`: `mein-tag` ruft `loadMeinTagContext(scope)` (Activities heute + offene Tasks fuer scope.userId + aktive Deals last 30d), `cockpit` ruft `loadCockpitContext(scope)` (Pipeline-Aggregate pro Phase + Top-10-stagnierende-Deals + Win/Loss last 30d). Loader sind in /slice-planning ausgegliedert — falls die heutigen Reports-Module sie inlinen (z.B. `tagesanalyse.ts` macht alles in einer Funktion), wird in SLC-762 MT-3 refactoriert auf wiederverwendbaren Loader-Export. System-Prompt fuer Custom-Reports in `cockpit/src/lib/ki-workspace/custom-report-prompt.ts` (kurz, generisch, fuegt `prompt_template` als Free-Form-Frage-Body ein). Bedrock-Call via existierender `invokeBedrock()` — gleicher Region-Assertion-Pfad wie V7.5.

## DEC-216 — V7.6 Custom-Reports Save-Trigger: nach Bedrock-Result, nur bei Free-Form-Frage (V7.6)
- Status: accepted
- Reason: "Als Bericht speichern"-Button braucht klare Render-Bedingungen. Sonst Button-Spam in jedem Workspace-State. Optionen Save-Position: (A) nach Bedrock-Result (User sieht Ergebnis, entscheidet bewusst), (B) vor Bedrock-Call (User speichert Prompt-Template ohne Test, spart Bedrock-Cost wenn User nur speichern will, aber risikoreicher — Schrott-Prompts landen ungetestet). Optionen Sichtbarkeit: nur Free-Form-Frage (NICHT Standard-Berichte, NICHT NL-Builder-Mode, NICHT Custom-Report-Ausfuehrung). **Gewaehlt:** (A) + Free-Form-Only — User-Flow ist "Frage stellen → probieren → speichern wenn gut", konsistent mit V6.6-Workspace-Pattern.
- Consequence: `AnswerPane.tsx` bekommt zusaetzlichen optionalen Prop `onSaveAsReport?: () => void`. Wird vom Parent (`KIWorkspace.tsx`) nur dann gesetzt wenn `selectedReport?.id === FREE_QUESTION_REPORT_ID && reportRun.result`. AnswerPane rendert `<button data-testid="answer-pane-save-as-report">` nur wenn `onSaveAsReport` definiert UND `result` vorhanden. Klick oeffnet `<SaveCustomReportModal>` (neue Komponente `cockpit/src/components/ki-workspace/save-custom-report-modal.tsx`) mit Native-Form-Pattern (Pflicht laut `feedback_native_html_form_pattern`): Name-Pflichtfeld (2-80 chars) + Description-Optional (Textarea) + Submit → `saveCustomReport` Server-Action. Bei UNIQUE-Violation 409 zeigt Modal Fehler "Name bereits vergeben". Bei Success Modal schliesst + Dropdown refreshet (`router.refresh()` oder lokaler State-Update).

## DEC-217 — V7.6 AnswerPane Discriminator: Mode-Switch im KIWorkspace, kein RenderRegistry-Refactor (V7.6)
- Status: accepted
- Reason: AnswerPane hat heute 1 Discriminator (`reportId === "top-chancen"` → PipelineTabsRenderer). V7.6 fuegt 2 weitere konzeptionelle Render-Wuensche hinzu: NL-Builder-Mode + Custom-Report-Save-Button. Optionen: (A) Mode-Switch im KIWorkspace, AnswerPane unveraendert (nur kleine `onSaveAsReport`-Prop ergaenzt) — NL-Builder ist eigener Render-Pfad ausserhalb AnswerPane, Custom-Reports nutzen den `<MarkdownView>`-Standard-Pfad ohne neuen Discriminator-Case, (B) AnswerPane bekommt `renderMode`-Prop mit children-Slot — AnswerPane wird zur Wundertuete (Render+Mode), (C) RenderRegistry-Refactor (`Map<id, Component>`) — premature abstraction bei 3 Cases. **Gewaehlt:** (A) — klarste Trennung, AnswerPane bleibt single-purpose Result-Renderer. RenderRegistry-Refactor wird V7.7+-Item wenn 4+ Discriminator-Cases UND tatsaechliche Plugin-Use-Case auftaucht (z.B. User-Plugin-Berichts-Renderer).
- Consequence: `KIWorkspace.tsx` bekommt zusaetzlichen State `const [mode, setMode] = useState<"report" | "nl-builder">("report")`. `handleReportClick` short-circuited bei `report.id === "nl-builder"`: `setMode("nl-builder")` + `setSelectedReport(report)` ohne `reportRun.run()`. Render: `mode === "nl-builder" ? <NLBuilderInline onClose={() => setMode("report")} /> : <AnswerPane ... onSaveAsReport={...} />`. AnswerPane bekommt nur die `onSaveAsReport`-Prop neu — der `reportId === "top-chancen"`-Discriminator bleibt unveraendert (Pipeline-Tabs-Renderer-Pfad). RenderRegistry-Refactor als V7.7+-Backlog-Item notiert.

## DEC-218 — V7.6 Slice-Cut: 3 Slices SLC-761 + SLC-762 + SLC-763 (V7.6)
- Status: accepted
- Reason: V7.6 hat 2 Features mit unterschiedlichen Risiko-Profilen: FEAT-761 ist reines Frontend-Refactor (kein Schema, kein neuer Bedrock-Pfad), FEAT-762 ist Backend+Frontend mit MIG-037. Optionen: (A) 2 Slices (FEAT-761 alleine + FEAT-762 backend+frontend kombiniert) — FEAT-762-Slice wird gross (~7h), schwer commit-rhythmus-faehig, (B) 3 Slices (SLC-761 FEAT-761, SLC-762 FEAT-762-Backend, SLC-763 FEAT-762-Frontend) — saubere Phasen-Trennung, jeder Slice einzeln QA-bar + commitfaehig, (C) 4 Slices (zusaetzlicher SLC-764 NL-Builder-Voice-Cleanup) — kein klarer Mehrwert, V7.6-Scope wird breit. **Gewaehlt:** (B) — Foundation-First (SLC-761 raeumt auf), Backend-vor-Frontend (SLC-762 ohne UI testbar via Vitest+Live-DB), Frontend zum Schluss (SLC-763 setzt auf bereits-funktionierende Server-Actions auf).
- Consequence: 3 Slice-Files werden in /slice-planning angelegt:
  - `slices/SLC-761-nl-builder-in-workspace.md` — FEAT-761, ~2-3h, 4 MTs (KIWorkspace-mode + nl-builder-inline.tsx + mein-tag-client-cleanup + F-2 Doc-Hygiene). Acceptance: Live-Smoke 6-Button-Workspace.
  - `slices/SLC-762-custom-reports-backend.md` — FEAT-762, ~3-5h, 5 MTs (MIG-037 + 5 Server-Actions + custom-report-runner + audit_log-Actions + Doc-Hygiene). Acceptance: Vitest CRUD + RLS-Owner-Isolation + Bedrock-Cost-Tracking + UNIQUE-409.
  - `slices/SLC-763-custom-reports-frontend.md` — FEAT-762, ~2-4h, 4 MTs (Save-Button + Save-Modal + Meine-Berichte-Dropdown + Rename/Delete-Sub-Menu). Acceptance: Live-Smoke Create + Run + Rename + Delete.
  Sequenz strict: 761 → 762 → 763. Jeder Slice mit Pflicht-/qa-Schritt nach /frontend bzw /backend (CLAUDE.md mandatory). Master-Merge erst am Slice-Ende nach Gesamt-/qa (`feedback_slice_merge_at_end`). Backlog-Items BL-479 + BL-442 werden in /slice-planning auf die 3 SLCs gemappt.

## DEC-219 — V8 Settings-Page-Struktur: 3 Sections (Persoenlich / Vertrieb / System) statt flacher Tile-Liste (V8)
- Status: accepted
- Reason: V8 /discovery + /requirements zeigten: aktuelle `/settings`-Landing rendert 10 Tiles flach ohne Gruppierung. Mit der 3-Rollen-Permission-Matrix (DEC-196) und ~14 Subpage-Verzeichnissen sinkt Auffindbarkeit, speziell die Rollen-Verwaltung wird visuell uebersehen. Optionen: (A) Flacher Liste belassen + Rollen-Tile prominenter — Halbloesung, Settings bleibt unorganisiert, (B) 3 thematische Sections (Persoenlich / Vertrieb / System) — bestehende Tiles bleiben + zwei neue Tile-Kategorien (Rollen-Verwaltung sichtbar, Produkte sichtbar) + Goals-Tile nach Move, klarere mentale Karte, (C) Tab-basierter Settings mit URL-Routing — Overkill fuer Internal-Tool, mehrere Navigation-Schichten. **Gewaehlt:** (B) — pragmatischer Refactor ohne neue Routes.
- Consequence: `SETTINGS_TILES` wird zu `SETTINGS_SECTIONS: SettingsSection[]` mit 3 Eintraegen. Rendering rendert Section-Header + Tile-Liste. Bei 0 sichtbaren Tiles in einer Section (z.B. Member sieht keine System-Tiles): Section wird ausgeblendet. Mobile-Layout: 1 Spalte mit Section-Headern als h2 (sticky optional). 4 neue Tile-Eintraege: Produkte (`/settings/products`, System, ADMIN_ONLY), NL-Regel-Historie (`/settings/workflow-automation/nl-history`, Vertrieb, ADMIN_ONLY), Rollen-Verwaltung (Link zu `/settings/team`, System, ADMIN_ONLY), Ziele (`/settings/goals` nach Move, System, ADMIN_TEAMLEAD).

## DEC-220 — V8 Bedrock-Prompt-Template fuer KI-Verlustgrund-Vorschlag in suggestLossReason (V8 FEAT-804)
- Status: accepted
- Reason: FEAT-804 BL-456 wuenscht KI-Pre-Fill fuer `won_lost_reason`-Feld im Stage-Move-Modal. Prompt-Template muss: deutsch antworten, strikt JSON liefern, Activity-History + E-Mail-Threads als Context nutzen, Source-Angabe pro Vorschlag enthalten, 1-3 Vorschlaege liefern, bei Empty-Context graceful Fallback. Optionen: (A) Free-Form-Prompt, Parse-Heuristik — fragil, Parse-Errors haeufig, (B) Strict-JSON-Prompt mit Schema-Beispiel + Fallback-Empty-Suggestion — Bedrock Claude Sonnet 4.6 ist sehr stabil mit strikten JSON-Prompts, (C) Tool-Use-API mit Function-Schema — Overkill fuer Single-Field-Suggestion, Tool-Use ist hier Hammer/Schraube. **Gewaehlt:** (B). Token-Budget ~500 Input + ~300 Output, Cost ~$0.005-0.01 pro Call, vergleichbar mit V7.6 custom_report.executed (RPT-477 zeigte $0.006 pro Call).
- Consequence: Prompt-Template in `lib/automation/loss-reason-prompt.ts` (NEU) als Pure-Function `buildLossReasonPrompt(deal, activities, emails)`. JSON-Schema-Validation auf Response in `lib/automation/loss-reason-parser.ts`. Bei Parse-Error: audit_log persistiert `status: "parse_error"`, suggestLossReason returnt null. Modal oeffnet trotzdem mit leerem Feld + Info-Hint. Heuristik: wenn 0 Activities UND 0 E-Mails → skip Bedrock-Call, return null sofort (Cost-Sparen).

## DEC-221 — V8 KI-Provider-Naming im User-UI: "KI" statt "Strategaize KI" oder "Assistent" (V8 FEAT-802)
- Status: accepted
- Reason: User-Direktive 2026-05-19 BL-480: vendor-neutrale Anzeige im UI. Optionen: (A) "KI" — kurz, neutral, matched bereits etabliertes Naming "KI-Workspace" / "KI-Analyse" / "KI-Briefing", (B) "Strategaize KI" — Brand-Bindung, etwas pompoes, fuegt Wort hinzu, (C) "Assistent" — Konsumenten-Sprech, kollidiert mit "KI-Workspace"-Naming, klingt nach Chatbot. **Gewaehlt:** (A). User-Bestaetigung 2026-05-20 in /architecture-User-Decisions.
- Consequence: User-sichtbare Strings "Bedrock" / "Claude Sonnet" / "Anthropic" / "AWS" werden auf "KI" reduziert. Beispiel: "Bedrock arbeitet ..." → "KI arbeitet ...". `BedrockSection`-Component-Display-Label wird "KI-Zusammenfassung" o.ae. Code-Identifier (`bedrockClient`, `lib/bedrock-client.ts`) bleiben — kein Mass-Rename. `formatModelDisplayName()`-Wrapper aus FEAT-802 fuer Audit-Log-Display-Views.

## DEC-222 — V8 Modal-Scope: StageRequirementsModal fuer ALLE 5 STAGE_REQUIRED_FIELDS-Stages, KI-Suggest nur fuer "Verloren" (V8 FEAT-804)
- Status: accepted
- Reason: Code-Inspektion in /architecture 2026-05-20 zeigte: STAGE_REQUIRED_FIELDS enthaelt 5 Stages mit Pflichtfeldern ("Angebot vorbereitet", "Angebot offen", "Verhandlung / Einwände", "Gewonnen", "Verloren"), nicht nur "Verloren" wie im FEAT-804-Spec-Wording. Optionen: (A) Modal nur fuer "Verloren" in V8 — UX-Bug bleibt fuer 4 weitere Stages, User muss Edit-Pencil-Umweg gehen, (B) Modal generisch fuer alle 5 Stages, KI-Suggest nur fuer "Verloren" weil Activity-History dort Quelle ist — kein Mehraufwand auf Modal-Seite (Component ist parametrisiert), KI-Suggest bleibt fokussiert, (C) Modal + KI-Suggest fuer alle 5 — KI-Suggest fuer Deal-Wert/Kontakt hat keine klare Quelle, scope-creep. **Gewaehlt:** (B). User-Bestaetigung 2026-05-20 in /architecture-User-Decisions.
- Consequence: `StageRequirementsModal` ist generic Component (Props: requirements-Schema + currentValues + onConfirm). KI-Suggest-Pfad in `suggestLossReason` nur fuer "Verloren". UI-Hint im Modal "KI-Vorschlag nur fuer Verlustgrund verfuegbar" wenn Modal fuer Won/Verhandlung/Angebot oeffnet (statt Verloren). `moveDealToStage`-Server-Action wird um `requirementValues?: Record<string, string|number|null>`-Parameter erweitert (backward-compatible).

## DEC-223 — V8 PRD-Konflikt-Resolution: /settings/products + /settings/workflow-automation/nl-history sind funktional (keine Ghosts), beide als Tiles ergaenzen (V8 FEAT-801)
- Status: accepted
- Reason: V8-Requirements-PRD-Section bezeichnete `/settings/products/` und `/settings/workflow-automation/` als "Ghost-Subpages" mit Vorschlag "loeschen oder als Tile sichtbar machen". Code-Inspektion in /architecture 2026-05-20 zeigte: `settings/products/page.tsx` ist voll funktionale Admin-Produkt-Verwaltung (ProductList + ProductForm), `settings/workflow-automation/nl-history/page.tsx` ist Admin-Inspection-Log fuer V7.6 SLC-756 NL-Sculpt-History. Beide sind aktive Features ohne Tile, kein Code-Cruft. Optionen: (A) Beide als Tiles ergaenzen — Sichtbarkeit fuer Admin, kein Feature-Verlust, (B) products als Tile, nl-history URL-only — nl-history ist Power-User-Tool, (C) Beide URL-only lassen — Features bleiben versteckt. **Gewaehlt:** (A). User-Bestaetigung 2026-05-20 in /architecture-User-Decisions.
- Consequence: `SETTINGS_TILES` bekommt 2 zusaetzliche Eintraege: Produkte (System, ADMIN_ONLY, Icon `Package`), NL-Regel-Historie (Vertrieb, ADMIN_ONLY, Icon `History` oder `ScrollText`). Keine Code-Loeschung im Folder-Layer.

## DEC-224 — V8 /performance/goals/ wird nach /settings/goals/ verschoben statt geloescht (V8 FEAT-803)
- Status: accepted
- Reason: V8-Requirements PRD wuenschte "performance/goals/ pruefen + ggf. mitloeschen". Code-Inspektion 2026-05-20 zeigte: `performance/goals/page.tsx` ist voll funktional (listGoals + GoalForm + CsvImportDialog + ActivityKpiSettings), aktive Vertriebsziele- und KPI-Konfiguration. Loeschung wuerde Feature-Verlust bedeuten. Optionen: (A) Nach `/settings/goals/` verschieben + Tile in System-Section — Goals sind Konfiguration (Vertriebsziele + KPI-Targets pro Produkt), passen ins Settings-Konzept, (B) Nach `/goals/` als Top-Level-Page — Top-Level-Slot ist fuer haeufig genutzte Pages, Goals werden quartalsweise editiert, (C) Unter `/performance/goals/` lassen, nur `/performance/page.tsx` loeschen — URL-Inkonsistenz, verwirrend nach /performance-Cleanup. **Gewaehlt:** (A). User-Bestaetigung 2026-05-20 in /architecture-User-Decisions.
- Consequence: Datei-Move `cockpit/src/app/(app)/performance/goals/page.tsx` → `cockpit/src/app/(app)/settings/goals/page.tsx`. Goals-Components (`@/components/goals/*`) und Actions (`@/app/actions/goals` + `products` + `activity-kpis`) bleiben wo sie sind. Sidebar- und Inline-Link-Audit in Slice-Planning (grep auf `/performance/goals`). Settings-Tile fuer Ziele in System-Section (ADMIN_TEAMLEAD). `/performance/page.tsx` separat geloescht (FEAT-803 Hauptanteil).

## DEC-225 — V8 keine neue Schema-Migration, keine neue Cron-Action (V8)
- Status: accepted
- Reason: V8 Constraints (PRD): "Keine neue Stack-Komponente — kein neuer Container, kein neuer Cron, kein neues npm-Package". Architektonisch erfuellt durch: FEAT-804 nutzt bestehende Tabellen (deals/audit_log/activities/email_messages) + bestehenden Bedrock-Client + bestehende audit_log.context (TEXT)-Spalte. KI-Suggest-Audit wird im selben audit_log mit neuer action `ki_loss_reason_suggested` persistiert ohne Schema-Aenderung. Optionen: (A) Reuse audit_log mit neuer action — kein MIG, schmaler Scope, (B) Neue Tabelle `ki_suggestions` fuer detailliertes Tracking (Accepted/Edited/Rejected) — Schema-MIG + RLS-Policy + Cleanup-Cron, Overkill fuer Hygiene-Sprint, (C) Audit-Log-Spalten-Erweiterung (`status TEXT`-Spalte) — additive MIG, aber bisher genuegt context-Field-Pattern. **Gewaehlt:** (A) — strikt schmaler V8.
- Consequence: KEIN `MIG-038`-Eintrag wird erstellt. audit_log bleibt unveraendert. Falls Accepted/Edited/Rejected-Tracking spaeter gewuenscht: V8.x oder V9 mit eigenem `ki_loss_reason_decision`-Audit-Eintrag nach Modal-Confirm.

## DEC-226 — V8 Slice-Cut: 3 Slices SLC-811 + SLC-812 + SLC-813 (V8)
- Status: accepted
- Reason: V8 hat 4 Features mit unterschiedlichen Risiko-Profilen und Pfaden. Optionen: (A) 1 Slice fuer alle 4 — zu gross (~10h), keine Commit-Rhythmik, kein QA-Gate zwischen Features, (B) 4 Slices (1 pro Feature) — overhead durch /qa nach jedem Mini-Slice, FEAT-802 ist 1-2h, (C) 3 Slices: UI-Hygiene-Bundle (FEAT-801 + FEAT-803) + Provider-Naming (FEAT-802) + Pflichtfelder-Modal (FEAT-804) — natuerliche Gruppierung nach Risiko + Pfad, jeder Slice einzeln QA-bar. **Gewaehlt:** (C). Reihenfolge-Empfehlung: SLC-812 zuerst (rein UI-Strings, Risiko minimal, schnelle V8-Sichtbarkeit), dann SLC-811 (UI-Refactor + Goals-Move + Sidebar-Audit), dann SLC-813 (groesster Block mit KI-Integration). Alternativ: 811 + 812 als parallele Worktrees, 813 separat.
- Consequence: 3 Slice-Files werden in /slice-planning angelegt:
  - `slices/SLC-811-settings-refactor-hygiene.md` — FEAT-801 + FEAT-803, ~3-4h, 5-6 MTs (Settings-3-Section-Refactor + 4 neue Tiles + Drilldown-Button-Activate + /performance-Delete + /performance/goals → /settings/goals Move + "Task"→"Aufgabe").
  - `slices/SLC-812-ki-provider-abstrahierung.md` — FEAT-802, ~1-2h, 3-4 MTs (String-Substitutions + Component-Display-Labels + ARIA-Walkthrough + formatModelDisplayName-Wrapper).
  - `slices/SLC-813-stage-requirements-modal.md` — FEAT-804, ~3-5h, 5-7 MTs (StageRequirementsModal-Component + suggestLossReason-Server-Action + Bedrock-Prompt-Template + moveDealToStage-Extension + Drop-Event-Wiring + audit_log-Insertions + Vitest+Live-Smoke).
  Jeder Slice mit Pflicht-/qa-Schritt nach /frontend bzw /backend (CLAUDE.md mandatory). Master-Merge erst am Slice-Ende nach Gesamt-/qa (`feedback_slice_merge_at_end`).

## DEC-227 — V8.1 Solopreneur-Detection via `profiles.team_id`-Count, kein neues `team_size`-Feld (V8.1 SLC-821)
- Status: accepted
- Reason: Optionen fuer team_size-Detection: (A) Neue denormalisierte Spalte `profiles.team_size` (Migration + Trigger fuer INSERT/DELETE) — zu schwer fuer Detection-Zweck, (B) Server-Side-Aggregat `COUNT(*) FROM profiles WHERE team_id = X` pro Layout-Render — leichtgewichtig, kein Schema-Touch, (C) Client-Side-Detection via Profile-Liste — Sicherheitsrisiko + Flash. **Gewaehlt:** (B). Helper `getTeamSize` in `cockpit/src/lib/team/team-size.ts`, React `cache()`-memoized analog `get-profile.ts`. Edge-Case `profile.team_id IS NULL` (Solo-Admin ohne explizite Team-Zuordnung) → return 1, weil semantisch Solo.
- Consequence: Keine Schema-Migration. Ein zusaetzlicher DB-Roundtrip pro Layout-Render (~1ms COUNT auf indexed-Column), per-Request gecached. Wenn V8.1 spaeter Teamsize-Anzeige im UI braucht, wird derselbe Helper wiederverwendet.

## DEC-228 — V8.1 Sidebar-Section-Refactor `VERWALTUNG_SETUP` → `WERKZEUGE` mit Item-Reduktion 12 → 3 (V8.1 SLC-822)
- Status: accepted
- Reason: User-Direktive Discovery 2026-05-20: "Sidebar Option A komplett zusammenklappen — nur 'Einstellungen' in Sidebar". Code-Audit zeigt: `/settings`-Sidebar-Eintrag existiert bereits in `VERWALTUNG_MEIN` (Z.219-225). Die 12 `VERWALTUNG_SETUP`-Eintraege sind eine Duplikation zur V8-`/settings`-Tile-Page. Die 3 operativen Tools (`/handoffs`, `/referrals`, `/audit-log`) sind aber semantisch keine Config, sondern operative Hilfsmittel — sie brauchen eine Sidebar-Heimat. Optionen: (A) `VERWALTUNG_SETUP` komplett loeschen + 3 Tools in `VERWALTUNG_MEIN` einsortieren — bricht Section-Semantik, (B) `VERWALTUNG_SETUP` umbenennen zu `WERKZEUGE` + 9 Config-Items entfernen, 3 Tools bleiben — minimaler Type-Refactor + saubere Semantik, (C) Tools komplett aus Sidebar entfernen (nur via `/audit-log`-URL erreichbar) — verschlechtert UX. **Gewaehlt:** (B). `WERKZEUGE` als eigene Top-Section (kein Parent "VERWALTUNG"), `VERWALTUNG_MEIN` bleibt unter "VERWALTUNG"-Parent. Reihenfolge: ANALYSE → TEAM → OPERATIV → ARBEITSBEREICHE → VERWALTUNG_MEIN → WERKZEUGE.
- Consequence: `lib/navigation/sidebar-config.ts` Type + Konstanten + 12 Items aendern (9 entfernt, 3 Section-Wechsel). `SECTION_PARENT.WERKZEUGE` entfaellt (eigene Top-Section). Bestehender `/settings`-Sidebar-Eintrag bleibt unveraendert. Direkt-Links auf `/settings/templates` etc. aus anderen Komponenten bleiben funktional (URLs aendern sich nicht). Final-Schreibweise "WERKZEUGE" vs "TOOLS" vs "HILFSMITTEL" in /slice-planning festgelegt.

## DEC-229 — V8.1 Teamlead-Tile-Sichtbarkeit ADMIN_ONLY → ADMIN_TEAMLEAD (V8.1 SLC-823)
- Status: accepted
- Reason: User-Discovery 2026-05-20: "Tile sichtbar fuer Admin+Teamlead". Code-Befund: `/settings/team`-Page hat schon `assertRole(["admin", "teamlead"])`-Gate, Teamlead darf die Seite oeffnen. Aber das Tile in `/settings/page.tsx:187` ist `ADMIN_ONLY` — Inkonsistenz zu Sidebar-Eintrag `ADMIN_TEAMLEAD`. SLC-823 schliesst genau diese Inkonsistenz, **ohne** Page-Edit-Verhalten zu aendern. Die Edit-Verhaltens-Anpassung wird in SLC-824 (DEC-230) gemacht — bewusster Cut zwischen "Tile sichtbar machen" (SLC-823, ~10 Min) und "Permission-Matrix anpassen" (SLC-824, ~2-2.5h).
- Consequence: `app/(app)/settings/page.tsx:187` `visibleFor: ADMIN_ONLY` → `ADMIN_TEAMLEAD`. Description Z.183 neutralisiert auf "Team-Mitglieder einsehen und verwalten" (passt fuer Admin und Teamlead-V8.1). Keine Aenderung an `/settings/team/page.tsx`, `team-members-table.tsx`, `invite-dialog.tsx`, `bulk-reassign-dialog.tsx` in diesem Slice. Diese Code-Bereiche werden in SLC-824 angepasst.

## DEC-230 — V8.1 Teamlead-Permission-Matrix erweitert: Invite-Restriction + Member-Delete-Allow mit V7-Hard-Lock-Reuse (V8.1 SLC-824)
- Status: accepted
- Reason: User-Klaerung 2026-05-20 nach Diskrepanz-Befund (Discovery-Wording "Read-Only" vs V7-Code-Realitaet "Limited-Edit"). Neue Permission-Matrix-Direktive: Teamlead soll **operatives Team aufbauen** koennen — Mitglieder einladen, Mitglieder loeschen mit Reassign — aber **keine Org-Struktur-Aenderungen** (Teamlead-Invite, Role-Wechsel, Admin-Promote). V7-Design (DEC-194 + DEC-193) war fuer Single-Admin-Phase gedacht und ist mit Multi-Team-Use-Case nicht konsistent — Teamlead war zu eingeschraenkt (kein Loeschen) UND zu unbeschraenkt (Teamlead-Einladen). Optionen-Auswahl per User-Bestaetigung 2026-05-20: A2 (kein Co-Teamlead-Invite), B1 (kein Rolle-Toggle, V8.x+ optional), C1 (Pflicht-Reassign-Vorbedingung beim Delete — V7-Hard-Lock-Pattern wiederverwenden). Daten-Schutz: bestehende `countOwnerRecords`-Pre-Check bleibt unveraendert — wenn open_records > 0 → reject mit Re-Assign-Pflicht. Daten gehen niemals verloren.
- Consequence:
  - **`lib/team/actions.ts` `inviteMember`**: zusaetzlicher Guard. Wenn `caller.role === "teamlead"` AND `payload.role !== "member"` → reject mit `INVALID_ROLE_FOR_TEAMLEAD_INVITER`. Admin-Pfad unveraendert.
  - **`lib/team/actions.ts` `deleteProfile`**: Permission-Layer von `assertRole(["admin"])` zu `assertRole(["admin", "teamlead"])`. Bei Teamlead-Caller zusaetzliche Guards: `target.role === "member"` AND `target.team_id === caller.team_id` AND `target.user_id !== caller.user_id`. Hard-Lock-Pattern (DEC-193 Mechanik) bleibt unveraendert — bei `open_records > 0` throws Error mit Re-Assign-Pflicht.
  - **`app/(app)/settings/team/team-members-table.tsx`**: Delete-Button-Sichtbarkeit von `callerIsAdmin && !isSelf` → `(callerIsAdmin || (callerIsTeamlead && target.role === "member")) && !isSelf`. Neue Prop `callerIsTeamlead: boolean`. Role-Select bleibt admin-only (Z.159).
  - **`app/(app)/settings/team/invite-dialog.tsx`**: Rollen-Dropdown fuer Teamlead-Caller auf `["member"]` reduziert. Heute zeigt es `["member", "teamlead"]` fuer Teamlead, `["member", "teamlead", "admin"]` fuer Admin. Admin-Pfad unveraendert.
  - **audit_log-Trail**: `team.member_deleted`-Eintrag erhaelt zusaetzliches Context-Feld `caller_role` fuer forensische Nachvollziehbarkeit. Keine Schema-Aenderung — `audit_log.context` ist JSONB.
  - **DEC-193 superseded** (Hard-Lock-Mechanik bleibt, aber Caller-Permission wird breiter). **DEC-194 superseded** (Teamlead-Invite-Role auf `member` verengt). Beide Pattern werden in DEC-230 zusammengefasst.
  - **Vitest**: 6-8 neue Cases fuer Permission-Matrix (Teamlead-Invite-Member-OK, Teamlead-Invite-Teamlead-REJECT, Teamlead-Delete-Member-OK, Teamlead-Delete-Teamlead-REJECT, Cross-Team-REJECT, Self-Delete-REJECT, Hard-Lock-Pre-Check, Audit-Log-caller_role).


