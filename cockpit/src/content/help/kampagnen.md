# Kampagnen + UTM-Tracking

> Guide 10 von 12. **Wer:** Admin. **Dauer:** ~8 Min.

## Ziel

Sie wissen, wie Sie Kampagnen anlegen, Tracking-Links erzeugen, Leads via UTM-Parameter zuordnen und Performance auswerten.

## Voraussetzungen

- Rolle Admin

## Was Kampagnen sind

Kampagnen sind **Marketing-Initiativen** — z.B. "Newsletter Q3", "LinkedIn-Outreach Steuerberater", "Konferenz Vortrag Berlin". Jede Kampagne hat:
- Externe Quelle (Newsletter, LinkedIn, Konferenz)
- Tracking-Links mit UTM-Parametern
- Auto-Zuordnung von eingehenden Leads
- Performance-Dashboard (Clicks, Conversions, ROI)

## Schritte: Kampagne anlegen

1. Sidebar → "Kampagnen" oder `/settings/campaigns` oeffnen.
2. Klick **"+ Neue Kampagne"**.
3. Felder:
   - **Name** (Pflicht, intern)
   - **External-Ref** (optional, z.B. "linkedin-q3-steuerberater")
   - **Beschreibung**
   - **Start-/End-Datum** (optional, fuer Auswertung)
4. Speichern.

## Schritte: Tracking-Link erzeugen

1. Im Kampagnen-Detail klicken Sie **"+ Tracking-Link"**.
2. Target-URL eintragen: z.B. `https://strategaize.io/whitepaper-steuerberater`.
3. UTM-Parameter werden automatisch generiert:
   - `utm_source` = External-Ref der Kampagne
   - `utm_medium` = `link`
   - `utm_campaign` = Kampagne-ID
4. System erzeugt eine **Kurz-URL** unter `/r/<token>` z.B. `https://business.strategaizetransition.com/r/abc123`.
5. Sie kopieren die Kurz-URL und teilen sie in der externen Kommunikation (Newsletter, LinkedIn-Post, etc.).

## Schritte: Wie ein Lead in die Kampagne kommt

### Variante A: Klick auf Tracking-Link

1. Empfaenger klickt die Kurz-URL.
2. `/r/<token>`-Redirector logged Click-Event (mit gehashter IP + UA).
3. User wird auf Target-URL weitergeleitet mit UTM-Parametern.
4. Bei Lead-Intake-Formular auf der Target-Page: UTM-Werte werden in den Lead-POST mitgeschickt.

### Variante B: Lead-Intake-API

POST auf `/api/leads/intake` mit:
- Bearer `EXPORT_API_KEY`
- JSON-Body mit `email`, `first_name`, `last_name`, optional `utm_source`/`utm_medium`/`utm_campaign`
- System mappt UTM-Parameter ueber UTM→Campaign-Mapper:
  - Primary: External-Ref-Match (z.B. `utm_source = "linkedin-q3-steuerberater"`)
  - Fallback: case-insensitive `LOWER(name)`-ilike-Match

### First-Touch-Lock

Sobald ein Lead einmal einer Kampagne zugeordnet wurde, ist die Zuordnung **gelocked** (COALESCE-Pattern, DEC-138) — auch wenn der Lead spaeter via einer anderen Kampagne wieder reinkommt.

## Schritte: Performance auswerten

Im Kampagnen-Detail sehen Sie:

- **KPI-Cards oben:**
  - Click-Count
  - Lead-Count (Conversions)
  - Conversion-Rate
  - Pipeline-Wert der zugeordneten Deals
  - Won-Wert

- **Tabs:**
  - **Leads** — alle Kontakte/Companies/Deals mit `campaign_id = this`
  - **Performance-Trend** — Click + Conversion ueber Zeit
  - **CSV-Export** — Leads + Deals als CSV downloaden

API: `GET /api/campaigns/[id]/performance` liefert 12-Felder-JSON (DEC-140) fuer eigene Auswertungen.

## Schritte: Funnel-Filter in Pipeline

Auf der Pipeline-Seite gibts oben einen **Kampagne-Dropdown-Filter**. Auswahl → nur Deals mit dieser Kampagne werden angezeigt. Bookmarken via URL fuer Wiederverwendung.

## Erwartetes Ergebnis

- Tracking-Links sind im Umlauf
- Click-Events laufen ein
- Leads aus diesen Klicks landen mit Kampagne-Zuordnung im System
- Performance-Dashboard zeigt Zahlen

## Tipps

- **External-Ref konsistent halten** — `utm_source`-Wert in der externen Quelle muss exakt mit External-Ref der Kampagne uebereinstimmen (case-sensitive), sonst greift nur der LOWER-Fallback
- **Tracking-Links VS Roh-URLs** — Roh-URLs zaehlen NICHT als Click. Immer ueber `/r/`-Link gehen, wenn Sie Click-Tracking wollen
- **First-Touch-Lock im Hinterkopf** — wenn Sie absichtlich einen Lead von Kampagne A nach Kampagne B umtaggen wollen, mussen Sie das manuell in der DB tun (Admin)
- **DSGVO-Hinweis** — Click-Log enthaelt nur gehashte IP/UA (SHA-256, kein Klartext). DSGVO-Retention 90 Tage (`click-log-cleanup`-Cron, FEAT-641)

## Haeufige Probleme

### "Tracking-Link wirft 404"
Token ungueltig oder abgelaufen. Pruefen Sie `/r/<token>` in der DB (`campaign_links.expired_at`).

### "Lead kommt rein, aber keine Kampagne-Zuordnung"
UTM-Parameter fehlten oder UTM-Mapper hat keinen Match gefunden. Pruefen Sie `utm_source` im Lead-Intake-Body gegen External-Ref der Kampagne.

### "Click-Count steigt, aber Conversions bleiben 0"
Lead-Intake POST kommt nicht durch. Pruefen Sie Bearer-Token + JSON-Format der externen Quelle.

### "Performance-Dashboard zeigt 0 Pipeline-Wert"
Deal-`campaign_id`-Spalte ist NULL. Pruefen Sie Lead-zu-Deal-Pfad — die Kampagne propagiert ueber Contact → Deal-Create.

## Siehe auch

- [Pipeline](pipeline.md) — Kampagne-Filter in der Pipeline
- [Settings — Kampagnen](settings.md) — Setup-Details
- `/docs/COMPLIANCE.md` — DSGVO-Doku zu Tracking-Log + Retention
