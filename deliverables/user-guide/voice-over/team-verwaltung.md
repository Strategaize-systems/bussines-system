# Lektion 6 — Team einladen

**Dauer:** 2:15 | **Wer:** Admin | **Lernziel:** Sie wissen, wie Sie Mitglieder einladen, Rollen verwalten und DSGVO-konform loeschen.

---

## Szene 1: Rollen-Modell (0:00–0:25)
**Bildschirm:** /settings/team-Page, Members-Tabelle mit Rollen-Spalte
**Sprecher:** "Das System hat drei Rollen. Admin hat vollen Zugriff. Teamlead kann Mitglieder im eigenen Team einladen und loeschen, aber nur als Member-Rolle. Member sieht nur eigene Daten. Plus Solopreneur-Mode bei team_size gleich eins."

## Szene 2: Mitglied einladen (0:25–0:55)
**Bildschirm:** "+ Mitglied einladen", Modal, E-Mail, Rolle, Senden, Magic-Link-Hinweis
**Sprecher:** "Klicken Sie 'Mitglied einladen'. Tragen Sie E-Mail, Anzeigename und Rolle ein. Als Teamlead-Caller ist die Rolle auf Member beschraenkt. Senden. GoTrue verschickt einen Magic-Link an die E-Mail. Der Empfaenger klickt, setzt sein Passwort und ist eingeloggt."

## Szene 3: Drilldown-Sicht (Teamlead) (0:55–1:25)
**Bildschirm:** Sidebar TEAM, Klick auf Member, Drilldown-Page mit Read-Only-Banner
**Sprecher:** "Als Teamlead koennen Sie die Mein-Tag-Page eines Members read-only oeffnen. Nutzen Sie die TEAM-Sidebar und klicken Sie auf einen Namen. Sie landen unter /team/<id>/mein-tag und sehen alles wie der Member. Aber Mutationen sind blockiert — Sie koennen nicht editieren. Audit-Log dokumentiert, wer wann wessen Page angesehen hat."

## Szene 4: Mitglied loeschen mit Hard-Lock (1:25–2:00)
**Bildschirm:** Klick Loeschen, Warnung "Owner-Records vorhanden", Bulk-Reassign-Button
**Sprecher:** "Loeschen ist DSGVO-konform. Wenn der Member noch Owner von Records ist — Kontakte, Deals, Activities — blockiert das System mit Hard-Lock. Klicken Sie 'Bulk-Reassign' und waehlen Sie einen neuen Owner. System verschiebt alle Records in einer Transaktion. Audit-Log pro Tabelle."

## Szene 5: Endgueltig loeschen (2:00–2:15)
**Bildschirm:** Klick Loeschen ohne Owner-Records, Confirm, Loeschung
**Sprecher:** "Wenn keine Owner-Records mehr da sind, koennen Sie loeschen. GoTrue-Account weg, Profile-Row weg. Audit-Log behaelt Backup-Felder fuer die DSGVO-Auskunftspflicht. In der naechsten Lektion: das KI-Optimal-Nutzen-Master."

---

**Production-Notes:** Hard-Lock-Modal mit roter Border hervorheben.
