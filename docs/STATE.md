# STATE

## Project
- Name: Strategaize Business Development System
- Repository: strategaize-business-system
- Delivery Mode: internal-tool

## Purpose
Internes, KI-gestütztes Revenue- und Relationship-System für beratungsintensives B2B-Geschäft. Steuert Multiplikatoren, Leads, Gespräche, Angebote und Übergaben datenfundiert. KEIN generisches CRM, KEINE Marketing-Suite — ein fokussiertes Vertriebs- und Akquise-System.

## Current State
- High-Level State: released
- Current Focus: V2.1 Slice-Planning done. 8 Slices geplant (SLC-201 bis SLC-208). Nächster: SLC-201 implementieren.
- Current Phase: V2.1 Implementation

## Immediate Next Steps
1. SSH-Zugang zum Server wiederherstellen + MIG-002 ausführen
2. SLC-201: Deal-Status-Workflow + Activity-Logging
3. SLC-202: Deal-Detail-Popup
4. SLC-205: "Mein Tag" Tagesplanungs-Übersicht

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
- V2 — 2026-04-03 — deployed auf Hetzner (Revenue & Relationship System)

## Notes
V1 war als Marketing+CRM-Plattform deployed. Fundamentale Neuausrichtung nach User-Review (2026-04-01): System ist ein Revenue & Relationship System, NICHT eine Marketing-Suite. Content-Produktion gehört zu System 4 (Intelligence Studio). Discovery mit 10-Modul-Blueprint abgeschlossen. 4-System-Landschaft: System 1 (Blueprint/Onboarding), System 2 (Operating System), System 3 (Business Development = dieses System), System 4 (Intelligence Studio).
