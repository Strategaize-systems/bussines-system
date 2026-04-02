# SLC-104 — Multiplikator-Management

## Meta
- Feature: FEAT-103
- Priority: High
- Status: done
- Dependencies: SLC-102

## Goal
Eigene Multiplikatoren-Ansicht mit gefilterten Kontakten (is_multiplier=true), Multiplikator-spezifischen Spalten und Sidebar-Navigation. Verknüpfung zur bestehenden Multiplikatoren-Pipeline.

## Scope
- Neue Seite `/multiplikatoren` mit gefilterter Kontaktliste
- Server Action: getMultipliers() — Kontakte mit is_multiplier=true
- Multiplikator-spezifische Tabellenspalten (Typ, Vertrauen, Empfehlungsfähigkeit)
- Filter nach Multiplikator-Typ und Vertrauenslevel
- Sidebar-Eintrag "Multiplikatoren"
- Quick-Link zur Multiplikatoren-Pipeline

## Out of Scope
- Referral-Statistiken UI (FEAT-113, SLC-110)
- Fit-Assessment UI (FEAT-108, SLC-109)
- Relationship Timeline (FEAT-112, SLC-112)
