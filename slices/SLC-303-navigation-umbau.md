# SLC-303 — Navigation-Umbau (4-Gruppen-Sidebar)

## Slice Info
- Feature: FEAT-306
- Version: V3
- Priority: High
- Dependencies: keine (frontend-only)
- Type: Frontend

## Goal
Sidebar von flacher Feature-Liste zu hierarchischer 4-Gruppen-Struktur umbauen. Operative Bereiche prominent, Verwaltung collapsible.

## Scope

### Included
1. Sidebar-Restrukturierung in 4 Gruppen:
   - OPERATIV: Mein Tag, Pipeline (mit Unternavigation: Multiplikatoren, Chancen, Leads)
   - WORKSPACES: Alle Deals (neu), Alle Firmen, Alle Kontakte, Multiplikatoren
   - ANALYSE: Dashboard
   - VERWALTUNG (collapsible): Aufgaben, Termine, E-Mails, Proposals, Handoffs, Referrals, Settings, Audit-Log (Admin)
2. Gruppen-Ueberschriften mit visueller Hierarchie
3. Pipeline Sub-Navigation (3 Pipelines als Unter-Items)
4. Collapsible Verwaltungs-Sektion
5. "Alle Deals" Link (Stub oder Liste — /deals Route)

### Excluded
- Neue Seiten/Routen erstellen (nur Navigation-Links aendern)
- Responsive Mobile-Nav Redesign (bestehend beibehalten)
- Route-Logik-Aenderungen

## Backlog Items
- BL-311: Navigation-Umbau 5-Schichten-Sidebar

## Acceptance Criteria
1. Sidebar zeigt 4 Gruppen mit Ueberschriften
2. OPERATIV-Bereich ist visuell oben und prominent
3. VERWALTUNG ist collapsible (Default: collapsed)
4. Pipeline zeigt Unternavigation bei Klick/Hover
5. Alle bestehenden Routen bleiben erreichbar
6. "Alle Deals" Link existiert
7. Responsive Verhalten nicht gebrochen

## Micro-Tasks

### MT-1: Sidebar-Komponente umstrukturieren
- Goal: sidebar.tsx auf 4-Gruppen-Layout umbauen
- Files: `components/sidebar.tsx` (oder wo Sidebar lebt)
- Expected behavior: 4 Gruppen sichtbar, korrekte Links
- Verification: Browser-Check — alle Gruppen, alle Links funktional
- Dependencies: keine

### MT-2: Collapsible Verwaltung + Pipeline Sub-Nav
- Goal: Verwaltung collapsible, Pipeline mit 3 Sub-Items
- Files: `components/sidebar.tsx`
- Expected behavior: Verwaltung klappt auf/zu, Pipeline zeigt 3 Pipeline-Links
- Verification: Browser-Check — Klick-Verhalten
- Dependencies: MT-1

## Technical Notes
- Nur Sidebar-Aenderung, keine neuen Pages
- "Alle Deals" verlinkt auf /deals (Route existiert evtl. noch nicht — Link trotzdem setzen)
- Audit-Log Link nur sichtbar wenn Admin (role check, kann spaeter mit SLC-302 aktiviert werden)
