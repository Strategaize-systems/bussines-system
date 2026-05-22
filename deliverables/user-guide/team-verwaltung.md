# Team-Verwaltung — Mitglieder einladen und verwalten

> Guide 6 von 12. **Wer:** Admin, Teamlead. **Dauer:** ~8 Min.

## Ziel

Sie wissen, wie Sie Mitglieder einladen, Rollen verwalten, Owner-Records umverteilen und Mitglieder DSGVO-konform loeschen.

## Voraussetzungen

- Rolle Admin oder Teamlead

## Rollen-Modell

| Rolle | Rechte |
|---|---|
| **admin** | Voller Zugriff: kann jede Rolle einladen, jeden loeschen, alle Daten sehen, alle Settings konfigurieren |
| **teamlead** | Kann **Member** einladen + Member im **eigenen Team** loeschen. Sieht Team-Aggregat-Cockpit + Read-Only-Drilldown auf Member-Pages. Kann KEINE Teamleads oder Admins anlegen / aendern. |
| **member** | Sieht nur eigene Daten (RLS-Owner-isoliert). Keine Verwaltungs-Rechte. |

Plus **Solopreneur-Mode**: Wenn nur 1 Person im System ist (team_size=1), wird die TEAM-Sidebar-Section ausgeblendet. Tile-Page-Sichtbarkeit ist unveraendert.

## Schritte: Mitglied einladen

1. Sidebar → "Rollen-Verwaltung" oder Settings-Tile → "Team-Verwaltung" → oeffnet `/settings/team`.
2. Klick **"+ Mitglied einladen"**.
3. Eingabe: E-Mail, Anzeigename, Rolle, Team (falls multiple Teams).
4. Bei **Teamlead-Caller** ist die Rollen-Dropdown auf **nur "Member"** beschraenkt (V8.1 DEC-230).
5. Klick **"Einladung senden"**.
6. GoTrue verschickt Set-Password-Magic-Link an die angegebene E-Mail.
7. Empfaenger klickt Link → wird auf `/auth/set-password` geleitet → setzt Passwort → ist eingeloggt.

## Schritte: Rolle aendern (nur Admin)

1. In der Team-Members-Tabelle klicken Sie auf den Rolle-Select neben einem Mitglied.
2. Waehlen Sie neue Rolle.
3. Audit-Log-Eintrag wird erstellt: `actor_id` + `action=role_changed` + before/after.

**Teamleads koennen Rollen NICHT aendern** (DEC-230 — keine Org-Struktur-Aenderungen).

## Schritte: Mitglied loeschen (DSGVO-konform)

### Schritt 1: Hard-Lock-Pre-Check

Vor Loeschung pruefen, ob das Mitglied noch Owner von Records ist:
1. Klick auf das Mitglied in der Tabelle.
2. System zeigt **`countOwnerRecords > 0`-Warnung** wenn vorhanden.

Loeschung ist **blockiert** wenn der Member noch Owner ist von:
- Kontakten
- Firmen
- Deals
- Activities
- Meetings
- Proposals
- E-Mail-Messages
- Calls

### Schritt 2: Bulk-Reassign

Wenn Records vorhanden:
1. Klick **"Bulk-Reassign"**.
2. Waehlen Sie neuen Owner-User-Id (typisch: Admin oder anderes Team-Mitglied).
3. Confirm: "Alle 174 Records von [Member] auf [Neuer Owner] umverteilen?"
4. Server-Action laeuft (transactional, SET LOCAL ROLE postgres fuer RLS-Bypass).
5. Audit-Log-Eintrag pro Tabelle.

### Schritt 3: Loeschen

Wenn `countOwnerRecords === 0`:
1. Klick **"Loeschen"** auf der Member-Row.
2. Confirm-Modal (typed Confirmation).
3. Server-Action:
   - `supabase.auth.admin.deleteUser()` loescht Auth-Account (Login unmoeglich)
   - DELETE FROM profiles
   - Audit-Log mit Backup-Feldern: `display_name_backup`, `role_backup`, `team_id_backup`, `caller_role` (V8.1 DEC-230)
4. Member kann sich nicht mehr einloggen, hinterlassene Owner-Records sind via Bulk-Reassign verschoben.

**caller_role**: Audit-Log persistiert ob Admin oder Teamlead die Loeschung durchgefuehrt hat — forensische DSGVO-Auskunfts- und Loeschungs-Nachweis-Pflicht (Art. 15 + 30 DSGVO).

### Schritt 4: Teamlead-spezifisches Loeschen

Teamleads koennen **nur Member im eigenen Team** loeschen:
- `target.role === 'member'`
- `target.team_id === caller.team_id`
- `target.user_id !== caller.user_id` (kein Self-Delete)
- Hard-Lock-Pattern gilt weiterhin

Teamleads koennen KEINE anderen Teamleads oder Admins loeschen.

## Drilldown: Read-Only-Sicht auf Member (Teamlead)

1. Sidebar TEAM-Section → Member auswaehlen.
2. Sie landen auf `/team/[user_id]/mein-tag` (read-only Drilldown).
3. URL-Pattern: `/team/<uuid>/mein-tag`, `/team/<uuid>/pipeline`, `/team/<uuid>/aufgaben`, etc.
4. **Mutationen sind blockiert** — jede Server-Action prueft `assertNotReadOnlyContext()` und wirft Error.
5. Filter-State im Drilldown ist getrennt von Ihrem eigenen Filter-State (V7.1 DEC-200).

Mit X oben rechts oder durch Klick auf eigenen Namen kehren Sie aus dem Drilldown zurueck.

## Erwartetes Ergebnis

- Mitglied ist eingeladen, hat Account, kann sich einloggen
- Bei Loeschung sind Owner-Records sauber umverteilt
- Audit-Trail dokumentiert wer mit welcher Rolle was geaendert hat

## Tipps

- **Onboarding-Checklist** fuer neue Member:
  1. Einladung erhalten
  2. Magic-Link klicken
  3. Passwort setzen
  4. "Mein Tag" oeffnen
  5. Erstes Briefing-Video schauen
  6. Erste Aufgabe anlegen
- **Bulk-Reassign vor Member-Wechsel** (Kuendigung, Mutterschutz, etc.) — Records werden vorab umverteilt, dann ist Loeschen problemlos
- **Drilldown-Audit** — `audit_log` mit `action=view_as` + `view_as_target_user_id` zeigt wer wann wessen Page angesehen hat

## Haeufige Probleme

### "Invite-Mail kommt nicht an"
GoTrue-Mailer hat manchmal Spam-Reputation-Issues. Pruefen Sie:
1. Spam-Folder beim Empfaenger
2. SMTP-Config (Admin)
3. Manual-Backup: `auth.users.recovery_token` aus DB ziehen + URL manuell konstruieren (Notfall-Pfad)

### "INVALID_ROLE_FOR_TEAMLEAD_INVITER"
Teamlead hat versucht, einen Teamlead oder Admin einzuladen. V8.1-Restriction (DEC-230). Falls Sie wirklich einen Teamlead anlegen wollen, muss Admin einladen.

### "Hard-Lock blockiert Loeschung, aber Bulk-Reassign hat schon gelaufen"
Pruefen Sie ob noch andere Tabellen Owner-Records haben (audit_log, custom_reports, etc.). Bei verbleibenden Owner-Records: zweiter Bulk-Reassign-Run oder Admin kontaktieren.

### "Drilldown-Mutation wirft Error 'Mutation blocked: read-only context active'"
Erwartetes Verhalten. Drilldown ist Read-Only per Design. Wenn Sie wirklich mutieren wollen: aus Drilldown aussteigen, eigene Identitaet annehmen.

## Siehe auch

- [Settings — Rollen-Verwaltung](settings.md)
- [Mein Tag — Drilldown-Sicht](mein-tag.md)
- `/docs/COMPLIANCE.md` — DSGVO-Profile-Lifecycle Details (V7 + V8.1)
