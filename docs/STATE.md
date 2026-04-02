# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Internes, KI-gestütztes Revenue- und Relationship-System für beratungsintensives B2B-Geschäft. Steuert Multiplikatoren, Leads, Gespräche, Angebote und Übergaben datenfundiert. KEIN generisches CRM, KEINE Marketing-Suite — ein fokussiertes Vertriebs- und Akquise-System.

## Current State
- High-Level State: implementing
- Current Focus: SLC-106 done (Aufgaben-Modul). 6 von 13 V2 Slices done. Nächster: SLC-107 E-Mail-Management.
- Current Phase: V2 Implementation

## Immediate Next Steps
1. SLC-107: E-Mail-Management (SMTP)
2. SLC-108: Angebots-/Proposal-Steuerung
3. SLC-109: Fit-Gates + Signale

## Active Scope
V2 Scope (Neuausrichtung — 11 Module):
- Modul 1: Kontakte & Organisationen (erweitert — Beziehungstypen, Rollen, Qualität)
- Modul 2: Firmen/Accounts (erweitert — Eignungssicht, Fit-Kriterien)
- Modul 3: Multiplikator-Management (NEU — Kern-Modul)
- Modul 4: Opportunity/Deal Engine (umgebaut — geschäftsspezifische Stufen)
- Modul 5: Gesprächsmanagement (erweitert — strukturierte Notizen, V2: Call Intelligence)
- Modul 6: E-Mail-Management (NEU — SMTP-Versand, Logging, Follow-ups)
- Modul 7: Angebots-/Proposal-Steuerung (NEU)
- Modul 8: Qualifizierung/Fit-Gates (NEU)
- Modul 9: Aufgaben/Follow-ups (erweitert)
- Modul 10: Übergabe an System 1 (NEU)
- Modul 11: Kalender/Meeting-Buchung (NEU — Cal.com Integration)
- Sonderfunktionen: Relationship Timeline, Referral Tracking, Deal Loss Analysis
- ENTFERNT: Content-Kalender, Marketing-Skills, Brand System (→ System 4)
- Tech: Next.js + Supabase (bestehende Infrastruktur wiederverwendbar)
- Hosting: Hetzner CPX32, Coolify, business.strategaizetransition.com

## Blockers
- aktuell keine

## Last Stable Version
- V1 — 2026-03-31 — deployed auf Hetzner (Marketing+CRM Version, wird durch V2 ersetzt)

## Notes
V1 war als Marketing+CRM-Plattform deployed. Fundamentale Neuausrichtung nach User-Review (2026-04-01): System ist ein Revenue & Relationship System, NICHT eine Marketing-Suite. Content-Produktion gehört zu System 4 (Intelligence Studio). Discovery mit 10-Modul-Blueprint abgeschlossen. 4-System-Landschaft: System 1 (Blueprint/Onboarding), System 2 (Operating System), System 3 (Business Development = dieses System), System 4 (Intelligence Studio).
