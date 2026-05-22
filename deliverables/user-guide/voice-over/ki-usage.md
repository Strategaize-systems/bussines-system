# Lektion 7 — KI optimal nutzen (Master)

**Dauer:** 3:00 | **Wer:** Alle Rollen | **Lernziel:** Sie verstehen die KI-Prinzipien und holen das Beste raus.

---

## Szene 1: Wo ist KI im System (0:00–0:30)
**Bildschirm:** Schneller Cut durch alle KI-Stellen — Tagesanalyse, KI-Verlustgrund, Compose, NL-Builder, Custom-Reports
**Sprecher:** "Die KI begegnet Ihnen an vielen Stellen. Tagesanalyse, KI-Verlustgrund-Vorschlag, Mail-Vorlagen-Generator, Inline-Edit-Diktat, Workflow-Builder, Custom-Reports. Plus im Hintergrund — E-Mail-Klassifikation und Audio-Transkripte mit Summary."

## Szene 2: Datenschutz + Region (0:30–0:55)
**Bildschirm:** Compliance-Doku-Auszug mit Bedrock eu-central-1
**Sprecher:** "Wichtig: alle KI-Calls laufen ueber Bedrock Claude Sonnet in Frankfurt — EU-gehosted, mit DPA. Region ist im Code festgepinnt — drift wirft Exception. Aktuell ist Whisper noch openai-US im Internal-Test-Mode, vor Customer-Live wird auf Azure-EU umgeschaltet."

## Szene 3: Prinzip 1 — Kontext geben (0:55–1:25)
**Bildschirm:** Vergleich: schlechte vs. gute Frage
**Sprecher:** "Erstes Prinzip: geben Sie der KI Kontext. Statt 'erstelle einen Bericht' sagen Sie 'erstelle eine Tagesanalyse fokussiert auf Pipeline-Risiken — Deals seit vierzehn Tagen ohne Activity'. Je konkreter der Kontext, desto besser die Antwort."

## Szene 4: Prinzip 2 — Iterieren (1:25–1:50)
**Bildschirm:** Chat-artige Iteration: Briefing → Kuerzer → Konkreter
**Sprecher:** "Zweites Prinzip: nutzen Sie die KI als Gespraechs-Partner. Erste Antwort zu generisch? Sagen Sie 'kuerzer' oder 'mit konkreten Ankern aus der Activity-Historie'. Sie iterieren, bis die Antwort passt."

## Szene 5: Prinzip 3 — Rueckfragen einfordern (1:50–2:20)
**Bildschirm:** Eingabe "Welche Fragen haben Sie an mich?", KI antwortet mit gezielten Rueckfragen
**Sprecher:** "Drittes Prinzip — sehr wirksam. Wenn Sie nicht sicher sind, ob die KI genug Kontext hat, fragen Sie sie aktiv. 'Welche Fragen haben Sie an mich?' oder 'Welche Informationen brauchen Sie noch?'. Die KI fragt dann gezielt nach — meist nach Punkten, an die Sie selbst nicht gedacht haben."

## Szene 6: Voice-Diktat (2:20–2:40)
**Bildschirm:** Mikro-Klick, Sprechen, Transkript erscheint
**Sprecher:** "Alle Eingabezeilen mit Mikro-Symbol unterstuetzen Voice-Diktat. Whisper transkribiert in Echtzeit. Oft schneller als Tippen — vor allem in Mobile."

## Szene 7: Cost-Bewusstsein (2:40–3:00)
**Bildschirm:** Audit-Log-Snippet mit cost_usd-Spalte
**Sprecher:** "Jeder Bedrock-Call kostet ein paar Cent — typisch null Komma null null fuenf bis null Komma null fuenfzehn Dollar. Pro Tag bei aktiver Nutzung etwa fuenfzig Cent bis zwei Dollar. Audit-Log zeigt Ihnen exakt was wann gekostet hat. Kein Hintergrund-KI ausser den geplanten Crons. In der naechsten Lektion bauen wir Workflows."

---

**Production-Notes:** Bei Prinzip 3 die KI-Antwort mit Rueckfragen besonders hervorheben.
