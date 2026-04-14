# Meeting-Workflow — Praxis-Uebersicht

Stand: 2026-04-14 | V4 | FEAT-406 (Cal.com-Sync)

Dieses Dokument beschreibt den **Alltags-Workflow** fuer Meetings im Business System.
Fuer das einmalige **Cal.com Setup** siehe [DEPLOY-CALCOM.md](./DEPLOY-CALCOM.md).

---

## 1. Zwei Wege ein Meeting anzulegen

### A. Extern via Cal.com (empfohlen fuer Kunden/Leads)

Der Kontakt bucht selbststaendig ueber deine Cal.com-Seite.

**Ablauf:**
1. Du schickst dem Kontakt den Booking-Link (siehe Abschnitt 2)
2. Kontakt waehlt auf Cal.com einen freien Slot und bucht
3. Cal.com feuert Webhook an Business System → `calendar_events` (mit `source='calcom'`)
4. Termin erscheint automatisch in Mein Tag, /kalender, /termine und auf der Kontakt-Detail-Seite

### B. Manuell im Business System (fuer interne Termine/Blocks)

Direkt im Business System unter **/termine** oder **/kalender** eintragen.

Nutze das fuer:
- Interne Blocks (Fokuszeit, Admin)
- Termine die nicht ueber Cal.com liefen (Telefon-Rueckruf, Ad-hoc-Meeting)
- Rueckdatierte Eintraege

Diese Termine haben `source='manual'`.

---

## 2. Booking-Link an Kontakt senden

Auf der **Kontakt-Detail-Seite** (`/contacts/[id]`) erscheint automatisch ein Cal.com Booking-Button, sobald:
- `CALCOM_PUBLIC_URL` gesetzt ist (Coolify)
- `CALCOM_BOOKING_PATH` gesetzt ist (z.B. `/rbellaerts/erstgespraech`)
- Der Kontakt eine E-Mail-Adresse hat

**Was der Link macht:**
- Fuehrt zu `cal.strategaizetransition.com/<pfad>`
- Haengt `?email=...&name=...` an → Cal.com fuellt das Buchungsformular vor

**Empfohlene Nutzung:**
- Button kopieren und in E-Mail / Messenger an Kontakt senden
- Oder: Link-Vorlage in einer E-Mail-Signatur / Wiedervorlage einbauen

**Mehrere Event-Types:** Wenn du in Cal.com mehrere Event-Types hast (z.B. "Erstgespraech" 30min, "Beratung" 60min), waehlst du fuer das Business System einen **Default-Pfad** via `CALCOM_BOOKING_PATH`. Andere Event-Types kannst du manuell als Links verschicken.

---

## 3. Was nach der Buchung passiert

```
Kontakt bucht auf Cal.com
         │
         ▼
Cal.com Webhook  ──────▶  /api/webhooks/calcom
         │                        │
         │                        ▼
         │               upsertCalendarEvent()
         │                        │
         │                        ▼
         │               calendar_events
         │               - source: 'calcom'
         │               - external_id: booking.uid
         │               - contact_id (via email-Match)
         │               - company_id
         │                        │
         ▼                        ▼
Sichtbar in:
- /mein-tag (Kalender-Panel, heute)
- /kalender (Tag/Woche/Monat)
- /termine (Liste)
- /contacts/[id] (Kontakt-Detail)
```

**Auto-Matching:**
- Attendee-E-Mail wird mit `contacts.email` abgeglichen
- Falls Match: `contact_id` + `company_id` werden gesetzt
- Falls kein Match: Event wird trotzdem angelegt (ohne Verknuepfung), sichtbar in /kalender und /termine

**Reschedule / Cancel:**
- Cal.com feuert `BOOKING_RESCHEDULED` → Event wird per `external_id` aktualisiert
- Cal.com feuert `BOOKING_CANCELLED` → Event wird geloescht

---

## 4. Fallback: Cron-Sync

Webhooks koennen verloren gehen (Cal.com offline, App-Restart, Netz). Dafuer gibt es einen Cron-Sync:

- Endpoint: `POST /api/cron/calcom-sync`
- Empfohlen: taeglich 4:00 (Coolify Scheduled Task)
- Holt alle Bookings der letzten 30 Tage + naechsten 60 Tage via API
- Fuehrt gleiche Upsert-Logik wie Webhook aus → keine Duplikate (external_id-Check)

---

## 5. Wo finde ich was?

| Ort | Zweck |
|-----|-------|
| **/mein-tag** Kalender-Panel | Heutige Termine kompakt, mit Deal/Kontakt-Kontext |
| **/kalender** | Gesamtkalender Tag/Woche/Monat, alle Quellen zusammen |
| **/termine** | Listen-Ansicht mit Filtern (Typ, Datum) |
| **/contacts/[id]** | Alle Termine zu diesem Kontakt + Booking-Button |
| **/deals/[id]** | Termine zum Deal (via `deal_id`) |

---

## 6. Meeting-Aufnahme & Transkription — V4.1 (noch nicht gebaut)

**Aktueller V4-Stand:** Kein Meeting-Recording. Cal.com-Meetings laufen standardmaessig ueber **externe Tools** (Zoom/Google Meet/Telefon), die in Cal.com als Location konfiguriert sind.

**Geplant fuer V4.1** (siehe Memory `project_meeting_infrastructure_shared`):
- **Jitsi** als Video-Raum (self-hosted)
- **Jibri** als Recording-Bot (nimmt Meeting auf)
- **Whisper** fuer Transkription
- Verknuepfung mit `meetings`-Tabelle + Deal/Kontakt-Kontext

Bis V4.1 existiert: Externe Aufnahme-Tools nutzen und Notizen manuell in Business System eintragen.

---

## 7. Typische Edge-Cases

### Termin erscheint nicht in Business System
1. Webhook-Logs pruefen: `docker logs <app-container> | grep calcom-webhook`
2. Kontrolle `CALCOM_WEBHOOK_SECRET` identisch in Cal.com + Coolify
3. Manueller Sync: `docker exec <app-container> node -e "fetch(...)"` (siehe DEPLOY-CALCOM.md Schritt 8C)

### Kontakt wurde nicht verknuepft
- Attendee-E-Mail weicht von `contacts.email` ab (z.B. privat vs. geschaeftlich)
- Workaround: Termin manuell in /termine oeffnen und Kontakt zuweisen

### Booking-Button fehlt auf Kontakt-Seite
- `CALCOM_PUBLIC_URL` oder `CALCOM_BOOKING_PATH` nicht gesetzt
- Nach Setzen: Redeploy noetig (Next.js braucht Env-Vars beim Build)

### Cal.com selbst down
- Business System bleibt voll funktionsfaehig, nur keine neuen Buchungen
- Bestehende Termine in `calendar_events` sind unabhaengig von Cal.com-Verfuegbarkeit
- Nach Recovery: Cron-Sync holt verpasste Bookings nach

---

## 8. Was du im Alltag machst

**Wochen-Rhythmus:**
1. Montags: /mein-tag oeffnen → Wochentermine sehen
2. Leads anschreiben → Booking-Link mitschicken
3. Nach Buchung: Termin erscheint automatisch
4. Vor Meeting: /contacts/[id] oder /deals/[id] → Kontext checken
5. Nach Meeting: Notizen in Business System eintragen (Deal-Update, Aktivitaet, ggf. Wiedervorlage)

**Wiedervorlagen:**
- KI-Wiedervorlagen (FEAT-407): Werden von der KI basierend auf Meeting-Kontext vorgeschlagen
- Sichtbar auf /mein-tag → KI Workspace → Tab "KI-Wiedervorlagen"
