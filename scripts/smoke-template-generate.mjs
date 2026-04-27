// Smoke-Test SLC-532 / MT-7 — generateEmailTemplate gegen Live-Bedrock
// Nimmt env aus Coolify-Container, ruft 3 Prompts, validiert JSON-Output.

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const SYSTEM_PROMPT = `Du bist ein erfahrener B2B-Vertriebs-Texter und erzeugst wiederverwendbare E-Mail-Vorlagen.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach. Keine Markdown-Codeblock-Begrenzer.

Das JSON muss exakt dieses Schema haben:
{
  "title": "Kurzer, beschreibender Vorlagen-Titel (max 80 Zeichen)",
  "subject": "Aussagekraeftige Betreffzeile",
  "body": "Vollstaendiger E-Mail-Body inkl. Anrede und Grussformel",
  "suggestedCategory": "erstansprache|follow-up|nach-termin|angebot|danke|reaktivierung|sonstige"
}

Regeln:
- Antworte in der Sprache, die im User-Prompt explizit genannt ist (de, en oder nl). Falls nicht genannt: Deutsch.
- Verwende Variablen {{vorname}}, {{nachname}}, {{firma}}, {{position}}, {{deal}} dort, wo sie inhaltlich sinnvoll sind. Nicht erzwungen, aber moeglichst eine Variable im Body.
- Erfinde keine Fakten, Namen, Preise, Termine oder Zahlen. Wenn etwas konkret werden muesste, lass es bewusst neutral oder verwende eine Variable.
- Ton: professionell, klar, B2B-tauglich. Keine Phrasen wie "Hoffentlich geht es Ihnen gut". Kein Smalltalk.
- Body-Laenge: 60-180 Woerter. Kurz halten — wir wollen Antworten provozieren, nicht den Empfaenger ermueden.
- title soll fuer Vertriebsteams sofort erkennbar machen, wofuer die Vorlage gedacht ist (z.B. "Erstansprache Multiplikator", "Follow-up nach 3 Wochen ohne Antwort").
- suggestedCategory waehlst du basierend auf dem Vorlagen-Zweck. Wenn keine der sechs spezifischen Kategorien passt, "sonstige".
- Subject soll ohne Generika auskommen ("Kurz auf den Schirm: ...", "Frage zu ...", konkreter Bezug zum Inhalt).
- Keine HTML-Tags im Body, nur Plaintext mit Zeilenumbruechen.`;

const CATEGORIES = [
  "erstansprache",
  "follow-up",
  "nach-termin",
  "angebot",
  "danke",
  "reaktivierung",
  "sonstige",
];

const PROMPTS = [
  {
    label: "1) Erstansprache Steuerberater Co-Innovation",
    userPrompt:
      "Erstansprache fuer Steuerberater im Mittelstand mit Verweis auf Co-Innovation",
    language: "de",
  },
  {
    label: "2) Follow-up Angebot 3 Wochen ohne Antwort",
    userPrompt: "Follow-up nach 3 Wochen ohne Antwort auf ein Angebot",
    language: "de",
  },
  {
    label: "3) Danke nach Erstgespraech",
    userPrompt: "Danke nach erfolgreichem Erstgespraech mit naechstem Schritt",
    language: "de",
  },
];

function buildPrompt(userPrompt, language) {
  const langLabel = { de: "Deutsch", en: "English", nl: "Nederlands" }[language];
  return `=== SPRACHE ===
${langLabel} (Sprach-Code: ${language})

=== ANWEISUNG DES USERS ===
${userPrompt}

=== AUFGABE ===
Erzeuge eine wiederverwendbare E-Mail-Vorlage gemaess Anweisung. Antworte ausschliesslich mit dem JSON-Objekt nach dem oben definierten Schema.`;
}

function tryExtractJSON(raw) {
  if (!raw) return null;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function validate(data) {
  if (!data || typeof data !== "object") return null;
  if (typeof data.title !== "string" || !data.title.trim()) return null;
  if (typeof data.subject !== "string" || !data.subject.trim()) return null;
  if (typeof data.body !== "string" || !data.body.trim()) return null;
  if (typeof data.suggestedCategory !== "string") return null;
  const category = CATEGORIES.includes(data.suggestedCategory)
    ? data.suggestedCategory
    : "sonstige";
  return {
    title: data.title.trim().slice(0, 120),
    subject: data.subject.trim(),
    body: data.body.trim(),
    suggestedCategory: category,
  };
}

async function callBedrock(prompt) {
  const region = process.env.AWS_REGION || "eu-central-1";
  const modelId = process.env.LLM_MODEL || "eu.anthropic.claude-sonnet-4-6-20250514-v1:0";

  const client = new BedrockRuntimeClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });

  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2048,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  };

  const cmd = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  });

  const t0 = Date.now();
  const response = await client.send(cmd);
  const ms = Date.now() - t0;
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const text = responseBody.content?.[0]?.text ?? responseBody.completion ?? "";
  return { text, ms, modelId, region };
}

async function main() {
  console.log("=== SLC-532 MT-7 Smoke ===");
  console.log(
    "AWS_REGION=" +
      (process.env.AWS_REGION || "eu-central-1") +
      " LLM_MODEL=" +
      (process.env.LLM_MODEL || "eu.anthropic.claude-sonnet-4-6-20250514-v1:0")
  );

  let pass = 0;
  let fail = 0;

  for (const p of PROMPTS) {
    console.log("\n--- " + p.label + " ---");
    const built = buildPrompt(p.userPrompt, p.language);
    try {
      const { text, ms, modelId, region } = await callBedrock(built);
      console.log(`bedrock=${region}/${modelId} latency=${ms}ms`);

      const json = tryExtractJSON(text);
      const validated = validate(json);
      if (!validated) {
        console.log("FAIL: Output not valid JSON or schema");
        console.log("--- raw ---");
        console.log(text);
        console.log("--- end raw ---");
        fail++;
        continue;
      }

      console.log("title:           " + validated.title);
      console.log("subject:         " + validated.subject);
      console.log("suggestedCategory: " + validated.suggestedCategory);
      console.log("body (preview):  " + validated.body.slice(0, 240).replace(/\n/g, " | "));
      console.log("body length:     " + validated.body.length + " chars");
      const variableMatches = (validated.body.match(/\{\{[a-z]+\}\}/gi) || []).length;
      console.log("variable count:  " + variableMatches);
      const wordCount = validated.body.split(/\s+/).filter(Boolean).length;
      console.log("word count:      " + wordCount);

      const checks = [];
      if (validated.title.length > 0 && validated.title.length <= 120) checks.push("title-ok");
      if (validated.subject.length > 0) checks.push("subject-ok");
      if (variableMatches >= 1) checks.push("min-1-var");
      if (wordCount >= 40 && wordCount <= 220) checks.push("word-range");
      if (CATEGORIES.includes(validated.suggestedCategory)) checks.push("category-valid");
      console.log("checks:          " + checks.join(", "));

      const allOk =
        checks.includes("title-ok") &&
        checks.includes("subject-ok") &&
        checks.includes("category-valid");
      if (allOk) {
        console.log("PASS");
        pass++;
      } else {
        console.log("FAIL: missing core checks");
        fail++;
      }
    } catch (e) {
      console.log("FAIL: exception " + (e?.message || e));
      fail++;
    }
  }

  console.log(`\n=== Summary: ${pass} pass / ${fail} fail ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal: " + e?.stack || e);
  process.exit(2);
});
