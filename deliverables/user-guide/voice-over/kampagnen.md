# Lektion 10 — Kampagnen + UTM

**Dauer:** 2:15 | **Wer:** Admin | **Lernziel:** Sie wissen, wie Sie Kampagnen anlegen und Performance auswerten.

---

## Szene 1: Kampagne anlegen (0:00–0:30)
**Bildschirm:** /settings/campaigns, "+ Neue Kampagne", Modal mit Name, External-Ref, Datum
**Sprecher:** "Kampagnen sind Marketing-Initiativen — zum Beispiel 'LinkedIn-Outreach Steuerberater Q3'. Klicken Sie 'Neue Kampagne'. Felder: Name, External-Ref — letztere ist die kanonische ID fuer UTM-Mapping. Speichern."

## Szene 2: Tracking-Link erzeugen (0:30–1:00)
**Bildschirm:** Klick "+ Tracking-Link", Target-URL, Kurz-URL erscheint
**Sprecher:** "Klicken Sie 'Tracking-Link'. Tragen Sie die Ziel-URL ein — zum Beispiel ein Whitepaper-Download. System erzeugt automatisch UTM-Parameter und eine Kurz-URL unter /r/<token>. Die Kurz-URL kopieren Sie und teilen Sie in Ihrem Newsletter oder LinkedIn-Post."

## Szene 3: Lead-Intake (1:00–1:30)
**Bildschirm:** Diagram: Klick → /r/<token> → Target-URL → POST /api/leads/intake → Kontakt mit campaign_id
**Sprecher:** "Wenn jemand klickt, wird das Click-Event geloggt — mit gehashter IP fuer DSGVO. Wenn der Empfaenger ein Lead-Formular ausfuellt, kommt POST /api/leads/intake mit den UTM-Parametern. System mappt auf Kampagne. Der Kontakt bekommt automatisch campaign_id."

## Szene 4: Performance + Filter (1:30–2:00)
**Bildschirm:** Kampagnen-Detail mit KPI-Cards + Tabs + Tabs-Tabelle
**Sprecher:** "Performance-Dashboard zeigt Click-Count, Lead-Count, Conversion-Rate, Pipeline-Wert und Won-Wert. Tabs zeigen alle Leads + Performance-Trend. CSV-Export downloadbar."

## Szene 5: Funnel-Filter in Pipeline (2:00–2:15)
**Bildschirm:** Pipeline-Seite, Kampagnen-Filter im Filter-Dropdown
**Sprecher:** "In der Pipeline gibt es ein Kampagnen-Filter-Dropdown. Auswahl filtert die Pipeline auf Deals dieser Kampagne. URL-state — bookmarkbar. In der naechsten Lektion: Zahlungsbedingungen."

---

**Production-Notes:** Diagram in Szene 3 als Animation Lead-Flow.
