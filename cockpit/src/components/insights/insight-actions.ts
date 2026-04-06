"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

interface InsightData {
  category: string;
  comment: string;
  sourceType: "deal" | "activity";
  sourceId: string;
  sourceTitle: string;
  sourceContent: string;
}

export async function saveInsight(data: InsightData) {
  const supabase = await createClient();

  // Build insight object
  const insight = {
    id: `INS-${Date.now()}`,
    timestamp: new Date().toISOString(),
    category: data.category,
    comment: data.comment || null,
    source: {
      type: data.sourceType,
      id: data.sourceId,
      title: data.sourceTitle,
      content: data.sourceContent,
    },
    system: "strategaize-business-system",
    version: "V2.1",
  };

  try {
    // Save as JSON file in /exports/insights/
    const exportDir = join(process.cwd(), "exports", "insights");
    await mkdir(exportDir, { recursive: true });
    const filename = `${insight.id}.json`;
    await writeFile(
      join(exportDir, filename),
      JSON.stringify(insight, null, 2),
      "utf-8"
    );

    // Log as activity if we have context
    if (data.sourceType === "deal") {
      const { data: deal } = await supabase
        .from("deals")
        .select("contact_id, company_id")
        .eq("id", data.sourceId)
        .single();

      if (deal) {
        await supabase.from("activities").insert({
          contact_id: deal.contact_id,
          company_id: deal.company_id,
          deal_id: data.sourceId,
          type: "note",
          title: `Insight gesendet: "${data.sourceTitle}" → ${data.category}`,
        });
      }
    }

    revalidatePath("/pipeline");
    return { error: "" };
  } catch (err) {
    return { error: "Insight konnte nicht gespeichert werden" };
  }
}
