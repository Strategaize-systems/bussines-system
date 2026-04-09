# FEAT-307 — Governance-Basis

## Summary
Minimale Rollen-, Sichtbarkeits- und Audit-Infrastruktur. Profiles erweitern, Basis-RLS implementieren, dedizierte audit_log Tabelle.

## Version
V3

## Related Decisions
- DEC-024: Dedizierte audit_log-Tabelle

## Components
1. **Profiles-Erweiterung:** role (operator/admin), team (nullable)
2. **Basis-RLS:** Operator sieht created_by = auth.uid(), Admin sieht alles
3. **audit_log Tabelle:** actor_id, action, entity_type, entity_id, changes (JSONB), created_at
4. **Audit-Triggers:** Stage-Wechsel, Deal-Status, kritische Mutations
5. **Audit-Viewer:** Einfache Listen-Ansicht fuer Admin

## Acceptance Criteria
1. profiles.role existiert (operator/admin, Default: admin)
2. profiles.team existiert (nullable, fuer spaetere Team-Zuordnung)
3. RLS-Policies unterscheiden Operator (eigene Daten) vs Admin (alle Daten)
4. audit_log Tabelle existiert mit definiertem Schema
5. Stage-Wechsel und Deal-Status-Aenderungen erzeugen Audit-Eintraege
6. Admin kann Audit-Log einsehen (einfache Liste mit Filter)
7. Operator kann eigenes Audit-Log sehen

## Technical Notes
- RLS auf allen 15+ Tabellen anpassen (aktuell: authenticated_full_access)
- Admin-Check: profiles.role = 'admin' OR created_by = auth.uid()
- Audit-Log Insert in Server Actions (nicht als DB-Trigger, weil actor_id benoetigt wird)
- Migration: Alle bestehenden Rows bekommen created_by des aktuellen Owners

## Out of Scope
- Freigabe-Rechte fuer Wissen/Insights (V4)
- Team-basierte Sichtbarkeit (V5)
- Fine-grained Permissions (V5)
