# FEAT-554 — Status-Lifecycle + Versionierung

## Status
planned

## Version
V5.5

## Purpose
Status-Uebergaenge und Versionierung als operativer Verhandlungs-Workflow. Ohne diese Schicht bleibt das Angebot reine Doku — mit ihr ist es ein gefuehrter Prozess.

## Context
- `proposals.status` existiert seit V2, aber ohne Server-Action-Guards und ohne Cron.
- `audit_log` (V3 FEAT-307 Governance-Basis) ist die zentrale Audit-Tabelle.

## Scope
**Status-Uebergaenge:**
- `draft` → `sent` (durch FEAT-555 Anhang-Send oder manueller "Sent markieren")
- `sent` → `accepted | rejected | expired`
- Server-Action `transitionProposalStatus(proposalId, newStatus)` mit Whitelist-Check
- Audit-Eintrag in `audit_log` bei jedem Uebergang
- UI-Buttons: "Sent markieren", "Accepted", "Rejected" (mit Confirm-Modal)

**Versionierung:**
- Server-Action `createProposalVersion(parentProposalId)`
- Dupliziert Angebot inkl. aller `proposal_items`
- Setzt `parent_proposal_id`, `version = parent.version + 1`, `status = 'draft'`
- Snapshot-Felder werden mit-kopiert (snapshot_name, snapshot_description bleiben)
- UI: "Neue Version erstellen"-Button im Workspace + Versions-Liste

**Auto-Expire-Cron:**
- Neuer Cron `expire-proposals` (Coolify, taeglich 02:00 Berlin Time)
- Setzt `status = 'expired'` + `expired_at = now()` fuer alle `sent`-Angebote mit `valid_until < CURRENT_DATE`
- Audit-Eintrag pro betroffenem Angebot
- Logging: count + IDs der gewechselten Angebote

## Out of Scope
- Auto-Stage-Wechsel im Deal bei Acceptance (V6.x-Kandidat)
- E-Mail-Notifications bei Expire-Naehe
- Status-Reverse (kein "Un-accept" — Audit-Wahrheit)
- Branch-Versionierung (nur lineare Kette)

## Acceptance Criteria
1. Status-Uebergaenge nur ueber Server-Action moeglich (kein direkter DB-Update)
2. Whitelist verhindert ungueltige Uebergaenge (z.B. accepted → draft)
3. `audit_log` enthaelt Entry pro Uebergang mit User, Timestamp, alter+neuer Status
4. "Neue Version erstellen" dupliziert sauber inkl. aller Items
5. parent_proposal_id ist gesetzt und verlinkt im UI ("V2 von V1")
6. Cron `expire-proposals` ist als Coolify-Cron registriert (analog `imap-sync`-Pattern)
7. Cron schreibt Audit-Eintrag pro expirtem Angebot

## Dependencies
- FEAT-551 (Schema)
- V3 FEAT-307 (audit_log)
- Coolify-Cron-Infrastruktur (vorhanden)

## Open Questions
- Versionierung-Lifecycle: Was passiert mit V1 wenn V2 erstellt wird (siehe PRD)
- Status-Sent-Trigger: automatisch oder manuell oder beides (siehe PRD)
- Expire-Cron-Lauf-Zeit (siehe PRD)

## Related
- BL-405
- FEAT-307 (Audit-Log)
