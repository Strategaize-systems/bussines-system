# FEAT-411 — DSGVO-Einwilligungsflow fuer Meeting-Aufzeichnung

## Summary

Einmalige, widerrufbare Einwilligung des Kontakts beim Onboarding — nicht vor jedem Meeting. Einwilligungs-E-Mail erklaert transparent die KI-gestuetzte Verarbeitung (Transkription, Summary, EU-Datenhaltung), Kontakt stimmt ueber tokenisierten Link zu oder lehnt ab. Status wird am Kontakt gespeichert, Widerruf ist jederzeit moeglich. FEAT-404 prueft Consent vor Recording-Start.

## Version

V4.1

## Related Decisions

- DEC-038: DSGVO-Einwilligung einmalig beim Kontakt-Onboarding, widerrufbar
- DEC-024: Dedizierte audit_log-Tabelle
- DEC-031: V4 Self-Hosted Everything (EU-Datenhaltung)

## Dependencies

- FEAT-101 (Kontakte) — `contacts` Tabelle existiert
- FEAT-106 (E-Mail SMTP) — fuer Einwilligungs-Mail-Versand
- FEAT-307 (Governance-Basis) — RLS + Audit
- FEAT-404 (Call Intelligence) — Consumer des Consent-Status

## User Stories

**Eigentuemer:** Als Eigentuemer will ich bei neuen Kontakten einen einmaligen, transparenten Einwilligungsprozess anstossen koennen — damit ich spaeter Meetings DSGVO-konform aufzeichnen kann, ohne vor jedem Meeting fragen zu muessen.

**Kontakt:** Als externer Kontakt will ich klar verstehen, welche Daten wie verarbeitet werden, und ich will meine Einwilligung jederzeit widerrufen koennen.

## Acceptance Criteria

1. **Consent-Felder am Kontakt:** `contacts` Tabelle erweitert um `consent_status` (pending / granted / declined / revoked — Default: `pending`), `consent_date`, `consent_source` (email_link / manual / imported), `consent_token` (einmal-Token fuer Public-Page).
2. **Consent-Mail-Template:** System-Template mit DSGVO-konformem Text: Art der Verarbeitung, Zweck (Meeting-Summary, Wissensbasis), Speicherort (EU), Rechte (Auskunft, Widerruf, Loeschung), Widerruf-Link. Deutsch in V4.1, Template-Hook fuer spaetere Uebersetzungen.
3. **Consent-Mail-Versand:** User kann auf Kontakt-Detail-Seite "Einwilligung anfragen" klicken → Mail mit personalisiertem Link geht raus → `consent_status = pending`.
4. **Public-Consent-Page:** `/consent/{token}` zeigt oeffentliche Seite mit: Kontakt-Name (zur Bestaetigung), Erklaerung, Zwei Buttons "Ich stimme zu" / "Ich lehne ab", Link zu Datenschutzerklaerung (Platzhalter, echte Version in Compliance-Skill).
5. **Zustimmung:** Klick auf "Ich stimme zu" setzt `consent_status = granted`, `consent_date = now`, `consent_source = email_link`. Bestaetigungsseite wird angezeigt. Audit-Log-Eintrag.
6. **Ablehnung:** Klick auf "Ich lehne ab" setzt `consent_status = declined`, `consent_date = now`. Bestaetigungsseite. Audit-Log.
7. **Widerruf per Link:** Jede Consent-Mail enthaelt Widerruf-Link `/consent/{token}/revoke`. Klick setzt `consent_status = revoked`, Audit-Log. Bestaetigungsseite.
8. **Manueller Widerruf durch User:** Auf Kontakt-Detail-Seite Button "Einwilligung widerrufen" (setzt Status auf `revoked`, Audit-Log mit `consent_source = manual`).
9. **FEAT-404 Integration:** Jibri-Recording startet nur wenn ALLE Meeting-Teilnehmer `consent_status = granted` haben. Sonst: Meeting laeuft, aber keine Aufzeichnung, UI-Hinweis am Meeting listet Kontakte ohne granted.
10. **Status-Anzeige im Kontakt:** Kontakt-Detail-Seite zeigt Consent-Status prominent: Badge + Datum + Quelle. Bei `pending` >7 Tage: Reminder-Hinweis. Bei `revoked` oder `declined`: klarer visueller Hinweis in Deal-Workspace.
11. **Audit-Log:** `audit_log` Tabelle bekommt Eintraege fuer jede Consent-Aenderung mit user_id oder 'public' (Public-Page), IP-Hash, User-Agent-Hash, Zeitpunkt.
12. **Token-Sicherheit:** `consent_token` ist kryptografisch zufaellig (UUID v4 oder 32-byte hex), einmalig pro Consent-Request erzeugt, Ablauf nach 30 Tagen (fuer Pending → dann erneuter Versand noetig).

## Schema-Erweiterungen

### contacts (erweitert)

| Feld | Typ | Beschreibung |
|---|---|---|
| consent_status | TEXT | pending / granted / declined / revoked — Default 'pending' |
| consent_date | TIMESTAMPTZ | Zeitpunkt letzter Consent-Aenderung |
| consent_source | TEXT | email_link / manual / imported |
| consent_token | TEXT | Aktueller Token fuer Public-Page (null wenn abgelaufen) |
| consent_token_expires_at | TIMESTAMPTZ | Token-Ablauf |
| consent_requested_at | TIMESTAMPTZ | Wann wurde Anfrage gestellt |

### audit_log (erweitert oder Kategorie)

- Neue Event-Typen: `consent_requested`, `consent_granted`, `consent_declined`, `consent_revoked`

## Technical Notes

- **Public-Page Security:** Kein Login noetig, aber Token in URL. Token einmalig nutzbar fuer granted/declined. Widerruf-Token bleibt gueltig (sonst kann Kontakt nicht widerrufen).
- **Rate-Limiting:** Public-Page `/consent/*` mit Rate-Limit gegen Brute-Force (100 Requests/IP/Stunde).
- **IP-Hash:** IP wird SHA256-gehashed gespeichert (DSGVO-Minimierung), nicht plain.
- **E-Mail-Versand:** Via bestehende SMTP-Infrastruktur (FEAT-106). Kein separater ESP noetig.
- **Template-Hinweis:** Der Mustertext ist DSGVO-orientiert, aber RECHTLICH NICHT GEPRUEFT — Juristische Pruefung ist separater Schritt (Teil von /compliance-Skill).
- **Bestand-Kontakte:** Bestandskontakte haben `consent_status = pending` nach Migration. User kann pro Kontakt Consent anfragen. Bulk-Tooling kommt in spaeterem Slice.

## Out of Scope (V4.2+)

- Mehrere Consent-Kategorien (V4.1 kennt nur "Meeting-Aufzeichnung")
- Dedizierte DPA-Verwaltung (Data Processing Agreements)
- Automatische Datenloeschung bei Widerruf (nur Flag-Setting, Loeschung manuell oder separater Retention-Slice)
- Mehrsprachige Consent-Mails (Deutsch in V4.1)
- Consent-Erneuerung nach X Jahren (unbegrenzt gueltig bis Widerruf)
- Bulk-Import + Bulk-Consent-Anfrage (einzeln pro Kontakt in V4.1)

## Open Questions (fuer /architecture)

- Public-Page URL-Struktur: `/consent/{token}` oder `/p/consent/{token}` (eigener Public-Namespace)?
- Token-Format: UUID v4 oder 32-byte hex (Laenge + Leserlichkeit)?
- Datenschutzerklaerung: Platzhalter-Link in V4.1 oder echte Version aus `/compliance`?
- Bei Meetings mit Teilnehmern, die noch keine Kontakte sind (ad-hoc aus E-Mail-Faden): automatisch Kontakt anlegen mit `consent_status = pending` oder erst bei Bestaetigung?
- Bulk-Tooling spaeter: CSV-Export "Kontakte ohne Consent" fuer manuelles Follow-up?
