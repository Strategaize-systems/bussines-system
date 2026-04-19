# SLC-601 — Schema-Migration + Produkt-CRUD

## Slice Info
- Feature: FEAT-601
- Priority: Blocker
- Estimated Effort: 1-1.5 Tage
- Dependencies: keine (Basis-Slice)

## Goal

MIG-017 ausfuehren (4 neue Tabellen: products, deal_products, goals, kpi_snapshots) und Produkt-Verwaltungsseite erstellen (/settings/products). Basis-Slice fuer alle folgenden V6-Slices.

## Scope

- SQL-Migration mit 4 Tabellen + Indexes + RLS + Grants
- TypeScript-Types fuer products, deal_products, goals, kpi_snapshots
- Server Actions: createProduct, updateProduct, archiveProduct, listProducts
- UI: Produkt-Verwaltungsseite unter /settings/products (Tabelle + Modal fuer Anlegen/Bearbeiten)
- Navigation: "Produkte" Link unter Verwaltung in Sidebar

## Out of Scope

- Deal-Produkt-Zuordnung (SLC-602)
- Ziel-CRUD (SLC-603)
- KPI-Snapshot-Cron (SLC-605)

## Acceptance Criteria

1. Migration laeuft fehlerfrei auf Hetzner (4 Tabellen, alle Indexes, RLS-Policies)
2. Produkte koennen angelegt werden (Name Pflicht, Rest optional)
3. Produkte koennen bearbeitet werden
4. Produkte koennen archiviert werden (Status-Wechsel, kein DELETE)
5. Produktliste zeigt alle Produkte mit Status-Filter
6. Kategorie-Feld bietet Autocomplete basierend auf bestehenden Werten
7. Navigation "Produkte" ist in Sidebar unter Verwaltung sichtbar
8. `npm run build` gruen

## QA-Fokus

- Migration-Verifikation: Alle 4 Tabellen existieren, Constraints pruefen
- CRUD: Anlegen, Bearbeiten, Archivieren, Status-Filter
- Edge Case: Leerer Name → Fehler, Doppelter Name → erlaubt (kein Unique auf Name)

### Micro-Tasks

#### MT-1: SQL-Migration erstellen und ausfuehren
- Goal: MIG-017 als sql/17_v6_migration.sql erstellen und auf Hetzner ausfuehren
- Files: `sql/17_v6_migration.sql`
- Expected behavior: 4 Tabellen (products, deal_products, goals, kpi_snapshots) existieren mit allen Indexes, Unique Constraints und RLS-Policies
- Verification: `\dt` zeigt alle 4 Tabellen, `\d products` zeigt korrekte Spalten
- Dependencies: none

#### MT-2: TypeScript-Types definieren
- Goal: Types fuer alle 4 neuen Tabellen + Server-Action-Inputs definieren
- Files: `types/products.ts`, `types/goals.ts`, `types/kpi-snapshots.ts`
- Expected behavior: Product, DealProduct, Goal, KpiSnapshot Types exportiert, CreateProductInput, UpdateProductInput definiert
- Verification: `npm run build` gruen
- Dependencies: none

#### MT-3: Produkt Server Actions
- Goal: CRUD-Server-Actions fuer Produkte
- Files: `app/actions/products.ts`
- Expected behavior: createProduct, updateProduct, archiveProduct, listProducts funktionieren gegen Supabase
- Verification: `npm run build` gruen
- Dependencies: MT-2

#### MT-4: Produkt-Verwaltungsseite
- Goal: /settings/products mit Produktliste + Anlegen/Bearbeiten-Modal
- Files: `app/(app)/settings/products/page.tsx`, `components/products/product-form.tsx`, `components/products/product-list.tsx`
- Expected behavior: Tabelle mit Produkten, Status-Filter (aktiv/inaktiv/archiviert), Modal fuer Anlegen und Bearbeiten, Kategorie-Autocomplete
- Verification: Browser-Test: Produkt anlegen, bearbeiten, archivieren, Filter testen
- Dependencies: MT-3

#### MT-5: Navigation erweitern
- Goal: "Produkte" Link in Sidebar unter Verwaltung
- Files: Sidebar-Komponente (bestehend)
- Expected behavior: Menuepunkt "Produkte" sichtbar, navigiert zu /settings/products
- Verification: Browser-Test: Link sichtbar und funktioniert
- Dependencies: MT-4
