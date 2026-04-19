# FEAT-601 — Produkt-Stammdaten

## Purpose

Einfaches Verwaltungsmodul fuer fertige Produkte. Kein Produktentwicklungs-Feature — Produktentwicklung, Marktrecherche und Pricing-Analyse gehoeren ins Intelligence Studio (System 4).

## Scope

- Produkte anlegen, bearbeiten, archivieren
- Felder: Name, Beschreibung, Kategorie, Standardpreis, Status
- Produktliste mit Filter (Status, Kategorie)
- Produkt auf Deal zuordnen (1:n — ein Deal kann mehrere Produkte haben)
- Deal-Wert kann pro Produkt aufgeteilt werden
- Settings-Bereich "Verwaltung > Produkte"

## Dependencies

- Bestehende Deals-Tabelle (seit V2)
- Bestehende Pipeline-Infrastruktur

## Out of Scope

- Produktentwicklung / Marktrecherche (Intelligence Studio)
- Pricing-Analyse / Preishistorie
- Produktkatalog-Export an System 1
- Komplexe Produktstrukturen (Bundles, Varianten)

## Schnittstellendefinition (Intelligence Studio)

Folgende Felder muessen spaeter aus System 4 exportierbar sein:
- name (string, Pflicht)
- description (text, optional)
- category (string, optional)
- standard_price (decimal, optional)
- status (enum: active/inactive)

## Acceptance Criteria

1. Produkte koennen angelegt und bearbeitet werden
2. Produkte koennen auf Deals zugeordnet werden (einzeln oder mehrere)
3. Deal-Wert kann optional auf Produkte aufgeteilt werden
4. Produkt-Filter nach Status und Kategorie funktioniert
5. Inaktive Produkte sind nicht mehr fuer neue Deal-Zuordnungen waehlbar
6. Bestehende Deals mit inaktiven Produkten behalten ihre Zuordnung
