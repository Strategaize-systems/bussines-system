# Source-to-Campaign Mapping (V6.5 SLC-657 / MIG-031)

## Status

**Aktuell: leer (`[]`).**

Pre-Audit am 2026-05-08 zeigte 0 Legacy-Source-Daten in Production-DB
(0 contacts mit `source` oder `source_detail`, 0 companies mit `source_type`
oder `source_detail`, 0 Kampagnen). MIG-031 ist als **ready-when-needed**
markiert: Skripte existieren, Mapping-File ist leer, Bulk-UPDATE wurde
nicht ausgefuehrt.

## Wann wieder ausfuehren

Sobald produktiv Daten anfallen, die Legacy-Source-Werte enthalten
(z.B. Lead-Imports vor Pre-Production-Compliance-Gate-Switch), folgenden
Workflow erneut durchlaufen:

1. **Re-Audit**: `031_v65_pre_audit.sql` gegen Production-DB ausfuehren
   (siehe Apply-Anweisung im SQL-Header).
2. **Mapping pflegen**: Diese JSON-Datei mit einem Eintrag pro distinct
   `(entity, source_value, source_detail_value)` Tupel pflegen.
3. **Bulk-UPDATE applyen**: `031_v65_bulk_update.sql` mit JSON als
   `\set mapping_json` parameter ausfuehren.

## JSON-Schema

```json
[
  {
    "entity": "contact",
    "source_value": "linkedin",
    "source_detail_value": "April 2026",
    "campaign_id": "00000000-0000-0000-0000-000000000000"
  },
  {
    "entity": "company",
    "source_value": "event",
    "source_detail_value": null,
    "campaign_id": null
  }
]
```

### Feld-Definitionen

| Feld | Typ | Beschreibung |
|---|---|---|
| `entity` | `"contact"` \| `"company"` | Welche Tabelle: `contacts` oder `companies` |
| `source_value` | `string \| null` | Wert von `contacts.source` bzw. `companies.source_type` |
| `source_detail_value` | `string \| null` | Wert von `<table>.source_detail` |
| `campaign_id` | `uuid \| null` | Ziel-Campaign. Bei `null` wird der Tupel uebersprungen (kein Mapping definiert). |

### Matching-Regeln

- Bulk-UPDATE matched mit `IS NOT DISTINCT FROM`-Semantik fuer `source_detail`
  (NULL = NULL-Match, Strings strikt gleich).
- Eintraege mit `campaign_id: null` werden im UPDATE skipped (User-Vorbehalt:
  "kein Mapping verfuegbar — Row bleibt mit campaign_id = NULL erhalten").
- Idempotent durch `WHERE campaign_id IS NULL`-Filter im UPDATE.

## Querverweise

- DEC-159 — SQL-Skript mit Mapping-File statt UI-Tool
- DEC-160 — Source-Felder bleiben als read-only-Backup in DB (kein DROP COLUMN)
- MIG-031 — vollstaendige Migration-Doku in `docs/MIGRATIONS.md`
