# FEAT-551 — Angebot-Schema-Erweiterung + Position-Items

## Status
planned

## Version
V5.5

## Purpose
SQL-Migration MIG-026 erweitert die bestehende `proposals`-Tabelle um angebotsoperative Spalten und legt eine neue Tabelle `proposal_items` fuer Position-Items an. Damit wird die seit V2 als reines Skeleton existierende Tabelle erstmals operativ.

## Context
- `proposals` existiert seit `sql/04_v2_migration.sql` Z.85+ als Stub mit `title`, `version`, `status`, `scope_notes`, `price_range`, `objections`, `negotiation_notes`, `won_lost_reason`, `won_lost_details`. Keine Position-Items, keine Berechnungs-Spalten, keine PDF-Anbindung.
- V6 `products` (MIG-017) und `deal_products` sind die Stammdaten — `proposal_items` ist Snapshot daraus zum Angebotszeitpunkt.

## Scope
**Schema-Erweiterung `proposals`:**
- `subtotal_net NUMERIC(12,2)` — berechnete Netto-Summe
- `tax_rate NUMERIC(5,2) DEFAULT 19.00` — Steuersatz in % (Snapshot)
- `tax_amount NUMERIC(12,2)` — berechnete Steuersumme
- `total_gross NUMERIC(12,2)` — berechnete Brutto-Summe
- `valid_until DATE` — Gueltigkeitszeitraum
- `payment_terms TEXT` — Zahlungsfrist (Free-Text, default aus Branding)
- `parent_proposal_id UUID REFERENCES proposals(id)` — fuer Versionierung
- `accepted_at TIMESTAMPTZ`, `rejected_at TIMESTAMPTZ`, `expired_at TIMESTAMPTZ`
- `pdf_storage_path TEXT` — Pfad im `proposal-pdfs` Bucket
- Index auf `parent_proposal_id`, `status`, `valid_until`

**Neue Tabelle `proposal_items`:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE`
- `product_id UUID REFERENCES products(id) ON DELETE SET NULL`
- `position_order INT NOT NULL`
- `quantity NUMERIC(10,2) NOT NULL DEFAULT 1`
- `unit_price_net NUMERIC(12,2) NOT NULL`
- `discount_pct NUMERIC(5,2) DEFAULT 0`
- `snapshot_name TEXT NOT NULL` — Produkt-Name beim Angebotszeitpunkt
- `snapshot_description TEXT` — Produkt-Beschreibung beim Angebotszeitpunkt
- `snapshot_unit_price_at_creation NUMERIC(12,2)` — Audit-Snapshot
- `created_at TIMESTAMPTZ DEFAULT now()`
- RLS + Grants analog `deal_products`

**Storage-Bucket:**
- Neuer privater Bucket `proposal-pdfs` mit RLS-Policy auf `auth.uid()`
- Pfad-Schema: `{user_id}/{proposal_id}/v{version}.pdf`

## Out of Scope
- Multi-Currency
- Multi-Tax-Rate per Position
- Discount-Stacking
- Inline-Produktanlage aus dem Angebot heraus

## Acceptance Criteria
1. `proposals` hat die neuen Spalten, alle nullable mit sinnvollen Defaults
2. `proposal_items` existiert mit allen genannten Spalten + RLS-Policy `authenticated_full_access`
3. `proposal-pdfs` Bucket existiert (privat) mit Storage-Policy
4. Bestehende V2-Stub-Daten in `proposals` sind unveraendert lesbar
5. FKs auf `products` haben `ON DELETE SET NULL` (nicht CASCADE — Snapshot bleibt)
6. Migration laeuft idempotent (`IF NOT EXISTS` pattern)

## Dependencies
- V6 `products`-Tabelle (vorhanden)
- V5.3 `branding_settings` (vorhanden, fuer Default-Footer)

## Open Questions
- Snapshot-Tiefe (siehe PRD V5.5 Open Questions)

## Related
- BL-405 (high, version=V5.5)
- MIG-026 (anzulegen)
