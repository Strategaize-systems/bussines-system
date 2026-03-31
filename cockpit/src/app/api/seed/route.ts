import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// TEMPORARY: Seed data — remove after data is created
export async function GET() {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: string[] = [];

  // Pipelines
  const { error: e1 } = await supabase.from("pipelines").upsert([
    { id: "a0000000-0000-0000-0000-000000000001", name: "Endkunden", description: "Direkte Kundenakquise", sort_order: 1 },
    { id: "a0000000-0000-0000-0000-000000000002", name: "Multiplikatoren", description: "Steuerberater, Verbände, Partner", sort_order: 2 },
  ], { onConflict: "id" });
  results.push(e1 ? `Pipelines: ${e1.message}` : "Pipelines: OK");

  // Stages Endkunden
  const ekStages = [
    { pipeline_id: "a0000000-0000-0000-0000-000000000001", name: "Neu", color: "#6366f1", sort_order: 1, probability: 10 },
    { pipeline_id: "a0000000-0000-0000-0000-000000000001", name: "Kontaktiert", color: "#8b5cf6", sort_order: 2, probability: 20 },
    { pipeline_id: "a0000000-0000-0000-0000-000000000001", name: "Qualifiziert", color: "#a855f7", sort_order: 3, probability: 40 },
    { pipeline_id: "a0000000-0000-0000-0000-000000000001", name: "Proposal", color: "#f59e0b", sort_order: 4, probability: 60 },
    { pipeline_id: "a0000000-0000-0000-0000-000000000001", name: "Verhandlung", color: "#f97316", sort_order: 5, probability: 80 },
    { pipeline_id: "a0000000-0000-0000-0000-000000000001", name: "Gewonnen", color: "#22c55e", sort_order: 6, probability: 100 },
    { pipeline_id: "a0000000-0000-0000-0000-000000000001", name: "Verloren", color: "#ef4444", sort_order: 7, probability: 0 },
  ];
  const { error: e2 } = await supabase.from("pipeline_stages").insert(ekStages);
  results.push(e2 ? `EK Stages: ${e2.message}` : "EK Stages: OK");

  // Stages Multiplikatoren
  const mpStages = [
    { pipeline_id: "a0000000-0000-0000-0000-000000000002", name: "Identifiziert", color: "#6366f1", sort_order: 1, probability: 10 },
    { pipeline_id: "a0000000-0000-0000-0000-000000000002", name: "Erstkontakt", color: "#8b5cf6", sort_order: 2, probability: 20 },
    { pipeline_id: "a0000000-0000-0000-0000-000000000002", name: "Im Gespräch", color: "#a855f7", sort_order: 3, probability: 40 },
    { pipeline_id: "a0000000-0000-0000-0000-000000000002", name: "Kooperation aktiv", color: "#22c55e", sort_order: 4, probability: 80 },
    { pipeline_id: "a0000000-0000-0000-0000-000000000002", name: "Inaktiv", color: "#94a3b8", sort_order: 5, probability: 0 },
  ];
  const { error: e3 } = await supabase.from("pipeline_stages").insert(mpStages);
  results.push(e3 ? `MP Stages: ${e3.message}` : "MP Stages: OK");

  // Companies
  const { error: e4 } = await supabase.from("companies").insert([
    { name: "Mustermann GmbH", industry: "Beratung", website: "https://mustermann.de", email: "info@mustermann.de", tags: ["prospect", "kmu"] },
    { name: "Schmidt & Partner", industry: "Steuerberatung", website: "https://schmidt-partner.de", email: "kontakt@schmidt-partner.de", tags: ["multiplikator", "steuerberater"] },
    { name: "TechStart AG", industry: "IT / Software", website: "https://techstart.de", email: "hello@techstart.de", tags: ["prospect", "tech"] },
  ]);
  results.push(e4 ? `Companies: ${e4.message}` : "Companies: OK");

  // Contacts (need company IDs)
  const { data: companies } = await supabase.from("companies").select("id, name");
  if (companies && companies.length > 0) {
    const getCompanyId = (name: string) => companies.find(c => c.name === name)?.id || null;
    const { error: e5 } = await supabase.from("contacts").insert([
      { first_name: "Max", last_name: "Mustermann", email: "max@mustermann.de", position: "Geschäftsführer", company_id: getCompanyId("Mustermann GmbH"), tags: ["entscheider"] },
      { first_name: "Anna", last_name: "Schmidt", email: "anna@schmidt-partner.de", position: "Partnerin", company_id: getCompanyId("Schmidt & Partner"), tags: ["multiplikator", "steuerberater"] },
      { first_name: "Lukas", last_name: "Weber", email: "lukas@techstart.de", position: "CTO", company_id: getCompanyId("TechStart AG"), tags: ["tech", "entscheider"] },
    ]);
    results.push(e5 ? `Contacts: ${e5.message}` : "Contacts: OK");
  }

  return NextResponse.json({ results });
}
