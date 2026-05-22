# Deal-Detail — Alle Infos zu einem Lead an einem Ort

> Guide 3 von 12. **Wer:** Alle Rollen. **Dauer:** ~10 Min.

## Ziel

Sie wissen, wie Sie eine Deal-Detail-Seite navigieren, wie Sie Activities/Calls/Meetings/E-Mails erfassen, wie der KI-Workspace pro Deal funktioniert, und wie Sie Angebote direkt aus dem Deal heraus erstellen.

## Voraussetzungen

- Mindestens ein angelegter Deal

## Aufbau der Seite

Bei Klick auf eine Deal-Karte (z.B. von der Pipeline) oeffnet sich `/deals/[id]` mit folgendem Layout:

```
┌──────────────────────────────────────────────────┐
│  Header — Deal-Titel + Stage + Wert + Owner      │
├──────────────────────────────────────────────────┤
│  KI-Workspace (Berichts-Buttons + Frage-Eingabe) │
├──────────────────────────────────────────────────┤
│  Activities-Timeline (Chronologisch)             │
│  + Inline-Add (Notiz, Call, Meeting, Mail)       │
├──────────────────────────────────────────────────┤
│  Sidebar rechts: Kontakte + Firma + Angebote     │
└──────────────────────────────────────────────────┘
```

## Schritte: Den Deal pflegen

### Schritt 1: Notiz / Activity hinzufuegen

1. Im Timeline-Bereich klicken Sie **"+ Notiz"** (oder Call/Meeting/Mail).
2. Tippen oder diktieren Sie den Inhalt.
3. Speichern.

Activity-Typen:
- **Notiz** — Freitext (Verhandlungsstand, Einwand, Gespraechsergebnis)
- **Anruf** — mit Zeit/Richtung/Dauer/Outcome
- **Meeting** — mit Zeit/Teilnehmern/Agenda
- **E-Mail** — verlinkt zu Kommunikation aus dem Compose-Studio

### Schritt 2: KI-Workspace nutzen

Berichts-Buttons im Workspace-Header:
- **Deal-Briefing** — alles, was Sie vor einem Call ueber diesen Deal wissen sollten
- **Naechste-Schritte-Vorschlag** — was sollten Sie als Naechstes tun
- **Einwand-Analyse** — wenn Sie einen Einwand erkennen, KI hilft Antworten
- **Win/Loss-Pre-Mortem** — was koennte schief gehen
- **Workflow bauen** — Regel anlegen "wenn dieser Deal X, dann tu Y"

Free-Form-Frage: "Was sagt die Activity-Historie ueber die Entscheidungs-Reife?"

### Schritt 3: Angebot direkt aus dem Deal erstellen

1. Sidebar rechts → **Angebote** → "+ Neues Angebot"
2. Sie landen im **Angebot-Workspace** (`/proposals/[id]/edit`) mit 3 Panels:
   - **Position-Editor** — Produkte/Posten + Mengen + Preise
   - **Live-Vorschau** — wie das PDF aussehen wird
   - **Status-Sidebar** — draft / sent / accepted / rejected / expired
3. Steuersatz wird automatisch aus `business_country` (NL/DE) gesetzt.
4. Bei NL→EU-B2B-Empfaenger mit VAT-ID: **Reverse-Charge-Toggle** verfuegbar (siehe [VAT-Guide](vat-reverse-charge.md)).
5. Speichern → PDF wird generiert → in Storage abgelegt.

### Schritt 4: Stage-Wechsel direkt aus Deal-Detail

Header zeigt aktuelle Stage als Badge. Klick auf die Badge → Stage-Wechsel-Modal (mit Pflichtfeldern, siehe [Pipeline](pipeline.md)).

### Schritt 5: Bei "Verloren" — KI-Verlustgrund-Vorschlag

Beim Wechsel auf "Verloren" schlaegt die KI bis zu 3 Gruende vor. Siehe [Pipeline-Guide](pipeline.md) Schritt 4.

## Activity-Inserts ueber externe Quellen

Die folgenden Pfade fuegen automatisch Activities zum Deal hinzu:

- **Eingehende E-Mail** (IMAP-Sync) — wenn Absender mit Deal-Kontakt verknuepft ist, wird E-Mail als Activity angehaengt
- **Asterisk-Anruf** — wenn Anrufer-Nummer mit Deal-Kontakt verknuepft ist, Call-Metadaten + Audio + Whisper-Transkript + KI-Summary werden angehaengt
- **Jitsi-Meeting** — Recording + Transkript + KI-Summary kommen automatisch an

## Erwartetes Ergebnis

- Sie haben alle Informationen zu einem Deal auf einer Seite
- Sie koennen direkt Activities/Calls/Meetings/E-Mails erfassen
- KI-Workspace liefert kontextuelle Analyse pro Deal
- Angebote werden im selben Flow erstellt

## Tipps

- **Tippen oder Diktieren** in Activity-Notizen — Mikro-Icon nutzt Whisper (Voice-to-Text). Erspart Tippen langer Gespraechsnotizen.
- **Deal-Briefing vor jedem Call** — KI-Bericht in 5 Sekunden, hilft Punkte zu erinnern aus letzten Activities.
- **Angebot-Versionierung** — bei Anpassungen wird automatisch eine neue Version angelegt (V1 bleibt erhalten als Snapshot). Lifecycle ist `draft → sent → accepted | rejected | expired`.

## Haeufige Probleme

### "E-Mail nicht angehaengt obwohl Absender im Deal"
IMAP-Sync laeuft alle 5 Min. Pruefen Sie ob E-Mail-Adresse im Kontakt korrekt eingetragen ist (case-insensitive).

### "Whisper-Transkript hat Fehler im Text"
Whisper hat 90-95% Genauigkeit. Sie koennen das Transkript editieren (Klick auf Edit-Pencil).

### "KI-Bericht braucht lange"
Berichte dauern typisch 5-15 Sek (Bedrock Claude Sonnet eu-central-1). Bei >30 Sek pruefen Sie die Bedrock-Region-Konfiguration mit Admin.

## Siehe auch

- [Pipeline](pipeline.md) — Stage-Wechsel + Modal
- [Compose-Studio](compose.md) — E-Mail-Versand mit KI
- [KI optimal nutzen](ki-usage.md)
