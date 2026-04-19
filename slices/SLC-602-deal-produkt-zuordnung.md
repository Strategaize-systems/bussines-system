# SLC-602 — Deal-Produkt-Zuordnung

## Slice Info
- Feature: FEAT-601
- Priority: High
- Estimated Effort: 1 Tag
- Dependencies: SLC-601

## Goal

Produkte auf Deals zuordnen (n:m ueber deal_products-Tabelle). Deal-Wert kann optional auf Produkte aufgeteilt werden. Integration in bestehenden Deal-Workspace.

## Scope

- Server Actions: assignProduct, removeProduct, updateDealProduct, listDealProducts
- Deal-Workspace: Produkt-Section im Bearbeiten-Tab (Dropdown + Preis + Menge)
- Inaktive Produkte nicht mehr fuer neue Zuordnungen waehlbar
- Bestehende Zuordnungen mit inaktiven Produkten bleiben erhalten

## Out of Scope

- Automatische Wert-Berechnung (Deal-Wert = Summe Produkt-Preise) — bewusst nicht, weil Deal-Wert auch ohne Produkte existieren kann
- Produkt-Zuordnung auf Altdaten (manueller Schritt, nicht automatisiert)

## Acceptance Criteria

1. Produkte koennen im Deal-Workspace zugeordnet werden
2. Preis und Menge pro Zuordnung editierbar
3. Mehrere Produkte pro Deal moeglich
4. Inaktive Produkte nicht im Dropdown fuer neue Zuordnungen
5. Bestehende Zuordnungen mit inaktiven Produkten sichtbar (nicht loeschbar versteckt)
6. Entfernen einer Zuordnung funktioniert
7. `npm run build` gruen

## QA-Fokus

- CRUD: Zuordnen, Preis aendern, Entfernen
- Edge Case: Deal ohne Produkte → weiterhin funktional
- Edge Case: Produkt archivieren mit bestehenden Deal-Zuordnungen → Zuordnung bleibt, Produkt nicht mehr waehlbar

### Micro-Tasks

#### MT-1: Deal-Produkt Server Actions
- Goal: CRUD fuer deal_products-Tabelle
- Files: `app/actions/deal-products.ts`
- Expected behavior: assignProduct, removeProduct, updateDealProduct, listDealProducts funktionieren
- Verification: `npm run build` gruen
- Dependencies: none

#### MT-2: Deal-Workspace Produkt-Section
- Goal: Produkt-Zuordnung im Deal-Workspace einbauen
- Files: `components/deals/deal-products-section.tsx`, Deal-Workspace-Page (bestehend, erweitern)
- Expected behavior: Section "Produkte" im Deal zeigt zugeordnete Produkte, Dropdown zum Hinzufuegen, Inline-Edit fuer Preis/Menge, Remove-Button
- Verification: Browser-Test: Produkt zuordnen, Preis aendern, entfernen
- Dependencies: MT-1

#### MT-3: Produkt-Dropdown mit Aktiv-Filter
- Goal: Dropdown zeigt nur aktive Produkte, inaktive werden ausgefiltert
- Files: `components/products/product-select.tsx`
- Expected behavior: Reusable Dropdown-Komponente, filtert nach status='active', zeigt Standardpreis als Hint
- Verification: Browser-Test: Nur aktive Produkte sichtbar, inaktive nicht
- Dependencies: MT-1
