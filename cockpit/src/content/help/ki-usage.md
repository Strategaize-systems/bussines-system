# KI optimal nutzen — Master-Guide fuer alle KI-Features

> Guide 7 von 12. **Wer:** Alle Rollen. **Dauer:** ~12 Min.

## Ziel

Sie verstehen, wo im System KI eingesetzt wird, wie Sie gute Ergebnisse bekommen und welche Grenzen die KI hat. Dieser Guide ist die zentrale Quelle fuer alle KI-Themen.

## Voraussetzungen

Keine. Dieser Guide ist Lese-Material — kein Hands-on noetig.

## Wie die KI in diesem System funktioniert

### Was sie ist

Die KI ist ein **Sprachmodell** (Anthropic Claude Sonnet, gehostet auf AWS Bedrock in Frankfurt). Sie kann:

- **Lesen** — alle Texte verstehen (E-Mails, Notizen, Transkripte)
- **Schreiben** — Texte erzeugen (Mail-Vorlagen, Berichte, Antworten)
- **Analysieren** — Muster erkennen (Stagnation, Risiko, Win/Loss-Gruende)
- **Klassifizieren** — Inhalte einordnen (relevant/irrelevant, Kategorie)

Sie **kann nicht**:
- Externe Webseiten oder Datenbanken abrufen
- Echtzeit-Daten holen (Boersenkurse, Wetter)
- Rechnen wie ein Taschenrechner (sie schaetzt)
- Garantieren, dass jede Antwort richtig ist

### Wo KI im System eingesetzt wird

| Wo | Was tut sie | Wann |
|---|---|---|
| **Mein Tag** | Tagesanalyse, Wiedervorlagen-Priorisierung | on-click |
| **Deal-Detail** | Deal-Briefing, Naechste-Schritte-Vorschlag, Einwand-Analyse | on-click |
| **Pipeline** | KI-Verlustgrund-Vorschlag beim "Verloren"-Drag | automatisch beim Modal |
| **Compose-Studio** | E-Mail-Vorlagen-Generator, Inline-Edit-Diktat | on-click |
| **KI-Workspace** | Custom-Reports, Pipeline-Risiko, Top-Chancen | on-click |
| **Workflow-Automation** | NL-Sculptor (Klartext → Regel) | on-click |
| **Custom-Reports** | User-gespeicherte Berichts-Vorlagen | on-click |
| **Hintergrund-Cron** | E-Mail-Klassifikation, Signal-Extraktion | automatisch (5 Min Cron) |
| **Meeting/Call-Pipeline** | Audio → Whisper-Transkript → KI-Summary | nach Recording |

### Region + Datenschutz

- **Bedrock Claude Sonnet** in `eu-central-1` (Frankfurt) — Code-Pin enforced
- **Whisper Speech-to-Text** aktuell openai-US (Internal-Test-Mode), Pre-Customer-Live Switch auf Azure-OpenAI-EU (Code-fertig)
- **Embeddings** (Titan V2) in `eu-central-1`
- **DPA mit AWS** abgeschlossen, kein Training auf Ihren Daten

Details siehe `/docs/COMPLIANCE.md` und [Datenschutz-Erklaerung](../DATENSCHUTZ_DRAFT.md).

## So bekommen Sie gute Ergebnisse

### Prinzip 1: Geben Sie Kontext

Statt:
> "Erstelle einen Bericht."

Sagen Sie:
> "Erstelle eine Tagesanalyse fokussiert auf meine Top-3-Pipeline-Risiken — Deals die seit 14+ Tagen keinen Activity-Eintrag haben."

Die KI funktioniert besser, wenn Sie **kontextuell konkret** sind.

### Prinzip 2: Seien Sie spezifisch ueber das, was Sie wollen

Statt:
> "Schreibe eine E-Mail."

Sagen Sie:
> "Erstansprache fuer einen Steuerberater im Mittelstand mit Schwerpunkt strategisches Praxiswachstum. Tonart freundlich-vorsichtig, kurz (max 4 Saetze), Ziel ist ein 30-Min-Discovery-Call."

### Prinzip 3: Nutzen Sie die KI als Gespraechs-Partner

Die KI hat keine Probleme, wenn Sie nachfragen. Sie koennen iterieren:

```
Sie: "Erstelle ein Briefing fuer Deal X."
KI: [Briefing]
Sie: "Kuerze auf 5 Bulletpoints."
KI: [Kompakter]
Sie: "Wirkt zu allgemein. Hebe konkrete Anker aus der Activity-Historie hervor."
KI: [Konkreter]
```

### Prinzip 4: Lassen Sie die KI Rueckfragen stellen

Sehr wirksam: Wenn Sie nicht sicher sind, ob die KI genug Kontext hat, fragen Sie sie:

> "Ich habe Ihnen jetzt viel erzaehlt. Welche Informationen brauchen Sie noch, um eine gute Antwort zu geben?"

Oder:
> "Welche Fragen haben Sie an mich?"

Die KI wird gezielt nachfragen — meist nach Punkten, an die Sie selbst nicht gedacht haben.

### Prinzip 5: Voice-Diktat ist OK

Alle Eingabezeilen mit Mikro-Symbol unterstuetzen Voice-to-Text (Whisper). Das ist oft schneller als Tippen.

## Beispiel-Konversationen

### Beispiel 1: Tagesanalyse mit Rueckfrage

```
Sie (klick Tagesanalyse-Button)
KI: "Heute haben Sie 8 offene Aufgaben + 3 ueberfaellige. Top-Risiken:
1. Deal Mueller GmbH (47k EUR) — seit 18 Tagen keine Activity
2. Multiplikator Schneider — Auto-Reply seit 12 Tagen
3. Lead Steuerkanzlei XYZ — Stage-Aging 21 Tage"

Sie: "Was sind die naechsten konkreten Schritte fuer Mueller GmbH?"

KI: "Aus den letzten Activities sehe ich:
- 04.05.: Discovery-Call, Frau Mueller will Q3-Entscheidung
- 12.05.: E-Mail an Mueller ohne Antwort
- 18.05.: Notiz 'CFO will Wettbewerbsangebot vergleichen'
Empfehlung: Nachfass-Mail mit kurzem Vergleichs-Argumentations-Sheet. 
Soll ich eine Vorlage entwerfen?"

Sie: "Ja, kurze freundliche Mail."

KI: [Mail-Entwurf]
```

### Beispiel 2: KI-Workspace fuer freie Frage

```
Sie (tippt in Eingabe): "Welche Multiplikatoren haben in den letzten 60 Tagen Empfehlungen geliefert?"

KI: "Drei Multiplikatoren:
1. Schmidt (Steuerberater, Berlin) — 4 Empfehlungen, 2 davon zu Deals
2. Wagner (Bank, Hamburg) — 2 Empfehlungen, 1 zu Deal
3. Mueller (UNI-Berater, Muenchen) — 1 Empfehlung
Beziehungsstaerke je Multiplikator + letzter Kontakt:
- Schmidt: hoch, 10 Tage
- Wagner: mittel, 32 Tage (Aufmerksamkeit empfohlen)
- Mueller: mittel, 18 Tage"

Sie: "Erstelle einen Wiedervorlage-Vorschlag fuer Wagner."

KI: [Vorschlag mit Quellen-Angabe]
```

### Beispiel 3: NL-Workflow-Builder (Klartext → Regel)

```
Sie (klick "Workflow bauen" im KI-Workspace)
Sie (tippt): "Wenn ein Deal in Stage 'Verhandlung' eintritt, lege eine Aufgabe an: 'Termin fuer Demo planen' faellig in 3 Tagen, zugewiesen an den Deal-Owner."

KI: [Trockenlauf-Anzeige]
- Trigger: deal.stage_changed → 'Verhandlung / Einwände'
- Action: create_task
  - title: 'Termin fuer Demo planen'
  - due_at: NOW() + 3 days
  - assignee_user_id: triggerSource.owner_user_id

Sie: [Klick "Regel aktivieren" + Confirm-Checkbox]
KI: "Regel aktiviert. Cost: ~$0.004"
```

## Was die KI **kann** + was sie **nicht** kann

### Kann
- Tagesanalyse + Pipeline-Risiko-Bewertung
- Mail-Vorlagen + Anpassungen
- Inline-Edit-Diktate fuer bestehende Texte
- Verlustgrund-Vorschlaege (3 Optionen mit Quellen)
- NL-Workflow-Bauen (mit Trockenlauf-Bestaetigung)
- Custom-Reports (User-gespeicherte Vorlagen)
- Win/Loss-Analyse auf historische Deals
- Audio-Transkripte (Whisper) + KI-Summary

### Kann **nicht**
- Externe Daten holen (Boersenkurse, Wikipedia, andere Websites)
- Rechtsberatung geben
- Vertrauliche Daten leaken (alles ist EU-gehostet, DPA mit AWS)
- Garantieren, dass jede Antwort richtig ist — **bitte ueberpruefen Sie kritische Inhalte**

### Macht **nicht**
- **Kein Profiling** im Sinne automatisierter Einzelfallentscheidungen
- **Kein Training** auf Ihren Daten (Bedrock-DPA enthaelt No-Training-Klausel)
- **Keine Hintergrund-KI-Kosten** — alle Berichte sind on-click + Cost pro Klick wird im audit_log dokumentiert

## Cost-Transparenz

Jeder Bedrock-Call wird im `audit_log` mit `cost_usd` dokumentiert. Typische Kosten:

| Aktion | Cost pro Call |
|---|---|
| Tagesanalyse | $0.005-0.010 |
| Pipeline-Risiko | $0.008-0.012 |
| Mail-Vorlage | $0.005-0.008 |
| Inline-Edit-Diktat | $0.003-0.005 |
| KI-Verlustgrund-Vorschlag | $0.005-0.010 |
| NL-Workflow-Sculpt | $0.003-0.006 |
| Custom-Report-Run | $0.005-0.015 |

Bei sehr aktiver Nutzung typisch $0.50-$2.00 / Tag.

## Tipps

- **Voice-Diktat fuer schnelle Inputs** — vor allem in mobile-Setup
- **KI-Berichte vor Calls** — 5-Sek-Briefing kann Gespraechsqualitaet messbar verbessern
- **NL-Sculptor mit Trockenlauf** — bauen Sie Workflows iterativ. Trockenlauf zeigt was die KI verstanden hat, bevor die Regel scharf geschaltet wird.
- **Cost-Audit pruefen** — `/settings/workflow-automation/nl-history` zeigt die Sculpt-Versuche mit cost_usd. Hilft, ungewollte Loops zu erkennen.

## Haeufige Probleme

### "KI antwortet zu generisch"
Geben Sie mehr Kontext. Oder: "Welche Fragen haben Sie an mich?" — laesst die KI gezielt nachfragen.

### "KI versteht Fachjargon nicht"
Erklaeren Sie das Akronym beim ersten Erwaehnen. Oder: speichern Sie eine Custom-Report-Vorlage, die Akronym-Glossar einbaut.

### "KI-Bericht widerspricht meinem Eindruck"
KI sieht nur, was im System steht. Wenn ein wichtiger Kontext aus dem Bauchgefuehl kommt: tippen Sie ihn als Notiz in die Activity-Historie ein, dann fliesst er in spaetere KI-Berichte ein.

### "KI-Inline-Edit halluziniert"
Hartes System-Prompt-Constraint verhindert wilde Aenderungen. Diff-View zeigt was reingeht. Bei Bedarf: ablehnen + erneut diktieren mit klarem Befehl ("Ersetze Satz 3 durch X").

### "Cost zu hoch"
Pruefen Sie audit_log auf wiederholte Calls (z.B. KI-Workspace-Reports im Loop). Pre-Customer-Live wird Per-User-Cost-Cap eingefuehrt (Backlog).

## Siehe auch

- [Mein Tag](mein-tag.md) — KI-Tagesanalyse
- [Pipeline](pipeline.md) — KI-Verlustgrund-Vorschlag
- [Compose-Studio](compose.md) — KI-Vorlagen-Generator + Inline-Edit-Diktat
- [Workflow-Automation](workflow-automation.md) — NL-Sculptor
- [Custom-Reports](custom-reports.md) — eigene Berichts-Vorlagen
- `/docs/COMPLIANCE.md` — vollstaendige DSGVO-Doku zu KI-Datenfluessen
