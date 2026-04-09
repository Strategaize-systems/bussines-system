# FEAT-306 — Navigation-Umbau

## Summary
Sidebar von flacher Feature-Liste zu hierarchischer 5-Schichten-Struktur umbauen. Operative Bereiche prominent, Verwaltung zurueckgenommen.

## Version
V3

## Neue Sidebar-Struktur

```
OPERATIV
  Mein Tag
  Pipeline (→ Multiplikatoren / Chancen / Leads als Unterseiten)

WORKSPACES
  Alle Deals
  Alle Firmen
  Alle Kontakte
  Multiplikatoren

ANALYSE (vorbereitet)
  Dashboard

VERWALTUNG (collapsible)
  Aufgaben
  Termine
  E-Mails
  Proposals
  Handoffs
  Referrals
  Settings
```

## Acceptance Criteria
1. Sidebar zeigt neue Schicht-Gruppierung mit Ueberschriften
2. Operativ-Bereich ist visuell prominent (oben)
3. Verwaltung ist collapsible und visuell zurueckgenommen
4. Alle bestehenden Routen bleiben funktional
5. Klick auf Pipeline zeigt Unternavigation (Multiplikatoren/Chancen/Leads)
6. Responsive Verhalten bleibt intakt

## Technical Notes
- Aenderung nur in sidebar.tsx + ggf. Layout-Component
- Keine neuen Routen noetig — nur Sidebar-Gruppierung
- Bestehende Routen duerfen nicht brechen (Bookmarks, Direct-Links)
