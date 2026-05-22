# Compose-Studio — E-Mails schreiben mit KI

> Guide 4 von 12. **Wer:** Alle Rollen. **Dauer:** ~10 Min.

## Ziel

Sie wissen, wie Sie professionelle E-Mails mit KI-Vorlagen-Generator + Inline-Edit-Diktat + Branding + Anhaenge versenden — alles aus dem Compose-Studio.

## Voraussetzungen

- Aktive Branding-Settings (Logo, Farben, Absender — siehe [Settings](settings.md))
- Ein Empfaenger-Kontakt im System

## Aufbau der Seite

Bei Klick auf "Mailbox" / "Neue E-Mail" oder via Deal-Detail-Seite oeffnet sich `/emails/compose`:

```
┌────────────────────────────────────────────┐
│  Empfaenger + Betreff + Sprache + Kategorie│
├────────────────────────────────────────────┤
│  KI-Vorlagen-Bereich (5 Berichts-Buttons)  │
│  + Free-Form-Frage / Diktat                │
├────────────────────────────────────────────┤
│  Body-Editor (Plain-Text + Variablen)      │
│  + Inline-Edit-Diktat-Button               │
├────────────────────────────────────────────┤
│  Live-Vorschau (iframe-Sandbox, gebrandet) │
├────────────────────────────────────────────┤
│  Anhaenge-Picker + Proposal-Anhang         │
├────────────────────────────────────────────┤
│  Senden / Speichern als Entwurf            │
└────────────────────────────────────────────┘
```

## Schritte: E-Mail vom Konzept zum Versand

### Schritt 1: Empfaenger waehlen

1. Tippen Sie im Empfaenger-Feld einen Namen oder eine E-Mail. Auto-Suggest aus Kontakten.
2. Sprache + Kategorie auto-vorausgefuellt aus Kontakt-Stammdaten.

### Schritt 2: KI-Vorlagen-Generator

1. Klicken Sie z.B. **"Erstkontakt-Vorlage"** oder **"Nachfass-Vorlage"** oder **"Angebot-Vorlage"**.
2. Diktieren oder tippen Sie eine kurze Anweisung in die Vorlage-Eingabe:
   - "Erstansprache fuer Steuerberater im Mittelstand, Schwerpunkt strategisches Praxiswachstum"
3. KI generiert binnen 5-10 Sek: Title + Subject + Body + Sprache + Kategorie.
4. Klick **"Vorlage uebernehmen"** → Body wird in Editor uebernommen.

### Schritt 3: Inline-Edit-Diktat (Voice-Befehl)

Wenn der Body schon steht und Sie eine Aenderung wollen:

1. Klick **"Inline-Edit-Diktat"** (Mikro-Symbol unten im Editor).
2. Sprechen Sie eine Anweisung: "Nach Satz 3 folgendes einbauen: Sie sind 2026-05-25 in Amsterdam erreichbar."
3. Audio wird per Whisper transkribiert + per Claude Sonnet eu-central-1 in den Body eingebaut.
4. Diff-View zeigt **was sich aendert** (rot/gruen).
5. Akzeptieren oder Verwerfen.

**Wichtig:** Audio wird NICHT persistiert (nur live-stream zum Server). Transkript wird NICHT geloggt. Body-Inhalt ist NICHT in Logs.

### Schritt 4: Live-Vorschau pruefen

Vorschau-iframe rendert die finale gebrandete E-Mail mit Logo + Farben + Footer. Mit Sub-Sekunden-Debounce-Refresh waehrend Sie tippen.

### Schritt 5: Anhaenge hinzufuegen

#### Variante A: PC-Datei (Drag&Drop)

1. Ziehen Sie eine Datei vom Desktop in das Anhaenge-Feld.
2. Whitelist: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, PNG, JPG, GIF, TXT, CSV, ZIP. Max 10 MB pro Datei, 25 MB Total.
3. Datei landet in `email-attachments`-Storage.

#### Variante B: Angebot-Anhang

1. Wenn der Empfaenger einen verknuepften Deal hat → ProposalAttachmentPicker rechts → waehlen Sie ein Proposal aus.
2. PDF wird automatisch beim Versand als Multipart-Anhang mitgeschickt.
3. Lifecycle: Proposal wird beim Versand auto-`status=sent` markiert.

### Schritt 6: Senden

1. Klick **"Senden"**.
2. Mail geht via SMTP-Provider raus.
3. Tracking-Pixel + Link-Wrapping aktiv (fuer Open/Click-Tracking).
4. Activity wird im Deal-Detail angelegt (wenn verknuepft).

## Erwartetes Ergebnis

- E-Mail ist versendet
- Branding (Logo + Farben + Footer) korrekt gerendert beim Empfaenger
- Anhaenge sind Multipart-eingebettet
- Tracking-Events laufen ein (Open/Click) — sichtbar in Kampagnen-Sicht

## Tipps

- **Variablen-Tokens** im Body — z.B. `{user_name}`, `{company_name}` — werden beim Versand substituiert mit Empfaenger-Stammdaten
- **Body wird NIE in Logs gespeichert** (Datenschutz)
- **KI-Diktat ist im Internal-Test-Mode noch OpenAI-US** (Whisper) — vor Customer-Live wird auf Azure-OpenAI-EU umgeschaltet (per ISSUE-042 Code-fertig)
- **Branding einmalig einstellen** in `/settings/branding` — siehe [Settings](settings.md)

## Haeufige Probleme

### "Vorschau zeigt kein Logo"
Pruefen Sie `/settings/branding` ob Logo hochgeladen + aktiviert ist. Logo wird via Server-Proxy ausgeliefert (Mixed-Content-Schutz).

### "KI-Inline-Edit hallunizieren"
Hartes System-Prompt-Constraint verhindert wilde Aenderungen. Bei Bedarf: Diff-View laesst Sie genau kontrollieren was reingeht. Bei wiederholter Halluzination: Bedrock-Provider-Bug — Admin kontaktieren.

### "Anhang zu gross"
Max 10 MB pro Datei, 25 MB Total. Bei groesseren Files: Link zu Cloud-Storage statt direkter Anhang.

### "E-Mail nicht angekommen"
1. Pruefen Sie Spam-Folder beim Empfaenger.
2. Pruefen Sie SMTP-Logs (Admin: Coolify-Container-Logs).
3. Pruefen Sie SPF/DKIM-DNS-Records fuer Ihre Versand-Domain.

## Siehe auch

- [Settings — Branding](settings.md) — Logo + Farben + Footer einstellen
- [KI optimal nutzen](ki-usage.md) — Tipps fuer KI-Vorlagen-Generator
- [Deal-Detail](deal-detail.md) — Angebot-Erstellung
