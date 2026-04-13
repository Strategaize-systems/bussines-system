# Cal.com Self-Hosted — Deploy-Anleitung

Stand: 2026-04-13 | SLC-407 | FEAT-406

---

## Voraussetzungen

- Hetzner Server (91.98.20.191) laeuft mit Coolify
- Business System Docker Stack laeuft
- IONOS DNS-Zugang vorhanden
- SSH-Zugang zum Server vorhanden

---

## Schritt 1: DNS bei IONOS einrichten

Login: IONOS Control Panel → Domains → strategaizetransition.com → DNS

| Typ | Name | Ziel | TTL |
|-----|------|------|-----|
| A | cal | 91.98.20.191 | 3600 |

Nach dem Speichern kann es bis zu 30 Minuten dauern, bis der Record propagiert ist.

**Pruefen:**
```bash
nslookup cal.strategaizetransition.com
# Erwartet: 91.98.20.191
```

---

## Schritt 2: Env-Variablen in Coolify setzen

Coolify UI → Business System Resource → Environment Variables

Folgende Variablen hinzufuegen:

| Variable | Wert | Hinweis |
|----------|------|---------|
| `CALCOM_DB_PASSWORD` | sicheres Passwort generieren | z.B. `openssl rand -base64 32` |
| `CALCOM_NEXTAUTH_SECRET` | sicheres Secret generieren | z.B. `openssl rand -base64 32` |
| `CALCOM_ENCRYPTION_KEY` | sicheres Secret generieren | z.B. `openssl rand -hex 32` |
| `CALCOM_PUBLIC_URL` | `https://cal.strategaizetransition.com` | Oeffentliche URL |
| `CALCOM_API_KEY` | *leer lassen — kommt in Schritt 6* | |
| `CALCOM_WEBHOOK_SECRET` | sicheres Secret generieren | z.B. `openssl rand -hex 32` |
| `CALCOM_BOOKING_PATH` | *leer lassen — kommt in Schritt 5* | |
| `CALCOM_INTERNAL_URL` | `http://calcom:3000` | Interner Docker-Zugriff |

**Secrets generieren (auf dem Server oder lokal):**
```bash
# Alle 3 auf einmal generieren:
echo "CALCOM_DB_PASSWORD=$(openssl rand -base64 32)"
echo "CALCOM_NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "CALCOM_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "CALCOM_WEBHOOK_SECRET=$(openssl rand -hex 32)"
```

---

## Schritt 3: Domain-Routing in Coolify konfigurieren

Das Cal.com braucht ein eigenes Domain-Routing in Coolify, damit `cal.strategaizetransition.com` zum calcom-Container geroutet wird.

**Option A: Eigener Coolify-Service (empfohlen)**

Falls Coolify das Routing pro Container im selben Stack erlaubt:
- Coolify UI → Business System → calcom Service
- Domain: `cal.strategaizetransition.com`
- Port: `3000`
- SSL: Let's Encrypt (automatisch)

**Option B: Caddy-Config manuell erweitern**

Falls Coolify kein Per-Container-Routing im gleichen Stack unterstuetzt, muss die Caddy-Config manuell erweitert werden. Das haengt von der Coolify-Version ab.

---

## Schritt 4: Redeploy ausloesen

Coolify UI → Business System → **Redeploy**

Was passiert:
1. `calcom-db` startet (PostgreSQL 15, eigene Instanz)
2. Healthcheck laeuft (pg_isready)
3. `calcom` startet nach Healthcheck
4. Cal.com fuehrt Prisma-Migrations automatisch aus (Erststart dauert 2-5 Minuten)
5. Cal.com ist erreichbar unter `cal.strategaizetransition.com`

**Pruefen nach Deploy:**
```bash
# SSH auf Server
ssh root@91.98.20.191

# Container pruefen
docker ps | grep calcom
# Erwartet: 2 Container (calcom + calcom-db), beide "Up"

# Logs pruefen
docker logs <calcom-container-name> --tail 50
# Erwartet: "Ready on port 3000" oder aehnlich
```

---

## Schritt 5: Cal.com Setup-Wizard

1. Browser oeffnen: `https://cal.strategaizetransition.com`
2. Setup-Wizard erscheint beim ersten Aufruf
3. **Admin-Account anlegen:**
   - Name: dein Name
   - E-Mail: deine E-Mail
   - Username: z.B. `rbellaerts` (wird Teil der Booking-URL)
   - Passwort: sicheres Passwort
4. **Zeitzone:** Europe/Berlin
5. **Verfuegbarkeit einstellen:**
   - Standard-Arbeitszeiten (z.B. Mo–Fr, 9:00–17:00)
   - Puffer zwischen Terminen (z.B. 15 Min)
6. **Event-Types erstellen:**
   - z.B. "Erstgespraech" (30 Min)
   - z.B. "Beratungstermin" (60 Min)
   - Location: Telefon, Video (spaeter Jitsi), oder vor Ort

**Ergebnis:** Booking-Seite live unter z.B. `cal.strategaizetransition.com/rbellaerts/erstgespraech`

**Jetzt CALCOM_BOOKING_PATH in Coolify setzen:**
- Variable: `CALCOM_BOOKING_PATH`
- Wert: `/rbellaerts/erstgespraech` (oder dein gewaehlter Pfad)
- Redeploy des Business Systems (nur app-Container) ausloesen

---

## Schritt 6: API-Key generieren

1. Cal.com einloggen: `cal.strategaizetransition.com`
2. Settings → Developer → API Keys
3. Neuen API-Key erstellen (Name: "Business System", kein Ablaufdatum)
4. Key kopieren
5. In **Coolify** die Variable `CALCOM_API_KEY` mit dem Key befuellen
6. Redeploy des Business Systems (nur app-Container) ausloesen

---

## Schritt 7: Webhook einrichten

1. Cal.com einloggen: `cal.strategaizetransition.com`
2. Settings → Developer → Webhooks
3. Neuen Webhook erstellen:

| Feld | Wert |
|------|------|
| URL | `https://business.strategaizetransition.com/api/webhooks/calcom` |
| Secret | Der gleiche Wert wie `CALCOM_WEBHOOK_SECRET` in Coolify |
| Events | `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED` |
| Active | Ja |

4. Speichern

**Testen:** Einen Test-Termin buchen → in Business System unter Termine pruefen, ob ein neuer Eintrag mit source="calcom" erscheint.

---

## Schritt 8: Verifizierung

### A. Cal.com selbst

- [ ] `cal.strategaizetransition.com` ist erreichbar (HTTPS, SSL-Zertifikat)
- [ ] Login funktioniert
- [ ] Booking-Seite ist oeffentlich erreichbar (z.B. `/rbellaerts/erstgespraech`)
- [ ] Testbuchung funktioniert

### B. Business System Integration

- [ ] Booking-Button erscheint auf Kontakt-Detail-Seite
- [ ] Booking-Link enthaelt vorausgefuellte E-Mail + Name
- [ ] Nach Testbuchung: neuer Eintrag in `calendar_events` mit `source='calcom'`
- [ ] Webhook-Log: `docker logs <app-container> | grep calcom-webhook`

### C. Cron-Sync (optional)

Falls gewuenscht, Coolify Scheduled Task einrichten:

| Name | Command | Frequency | Container |
|------|---------|-----------|-----------|
| calcom-sync | `node -e "fetch('http://localhost:3000/api/cron/calcom-sync', {method:'POST', headers:{'x-cron-secret':'DEIN_CRON_SECRET'}}).then(r=>r.json()).then(console.log)"` | 0 4 * * * (taeglich 4 Uhr) | app |

Der Webhook-basierte Sync ist der primaere Mechanismus. Der Cron-Sync ist ein Fallback fuer verpasste Webhooks.

---

## Spaeter: Image-Version pinnen

Nach erfolgreichem Setup die laufende Cal.com Version pruefen und in `docker-compose.yml` pinnen:

```bash
docker inspect <calcom-container> | grep -i image
# z.B. calcom/cal.com:v4.7.8
```

Dann in `docker-compose.yml` aendern:
```yaml
calcom:
  image: calcom/cal.com:v4.7.8  # statt :latest
```

---

## Troubleshooting

### Cal.com startet nicht
```bash
docker logs <calcom-container> --tail 100
```
Haeufige Ursache: Prisma-Migration braucht laenger beim Erststart. 2-5 Minuten warten.

### Webhook kommt nicht an
- Pruefen ob `CALCOM_WEBHOOK_SECRET` in Coolify und Cal.com identisch ist
- Pruefen ob `/api/webhooks` in Middleware als public path konfiguriert ist (ist es)
- App-Container Logs pruefen: `docker logs <app-container> | grep webhook`

### Booking-Button erscheint nicht
- `CALCOM_PUBLIC_URL` und `CALCOM_BOOKING_PATH` muessen beide gesetzt sein
- Nach Setzen: Redeploy ausloesen (Next.js braucht Env-Vars beim Build/Start)

### calendar_events zeigt keine Cal.com-Eintraege
- Webhook pruefen (siehe oben)
- Manuellen Sync testen:
```bash
# Auf dem Server
docker exec <app-container> node -e "fetch('http://localhost:3000/api/cron/calcom-sync', {method:'POST', headers:{'x-cron-secret':'DEIN_CRON_SECRET'}}).then(r=>r.json()).then(console.log)"
```
