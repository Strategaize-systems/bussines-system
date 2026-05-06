// V6.2 SLC-625 — CSV-Export fuer Campaign-Leads + Campaign-Deals
//
// GET /api/campaigns/[id]/export?type=leads|deals
// Auth: Server-side Session (kein Bearer — User-getriggert via Detail-Page-Button).

import { createClient } from "@/lib/supabase/server";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(r.map(csvEscape).join(","));
  }
  return lines.join("\n");
}

interface ContactExportRow {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  source: string | null;
  source_detail: string | null;
  created_at: string;
  companies: { name: string } | null;
}

interface DealExportRow {
  title: string;
  status: string;
  value: number | null;
  expected_close_date: string | null;
  created_at: string;
  contacts: { first_name: string; last_name: string } | null;
  companies: { name: string } | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  if (type !== "leads" && type !== "deals") {
    return new Response("Invalid type — must be leads or deals", { status: 400 });
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  const campaignName = (campaign as { name: string } | null)?.name ?? "campaign";
  const safeName = campaignName.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40);

  let csv: string;
  let filename: string;

  if (type === "leads") {
    const { data, error } = await supabase
      .from("contacts")
      .select("first_name, last_name, email, phone, position, source, source_detail, created_at, companies(name)")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false });
    if (error) return new Response(error.message, { status: 500 });

    const rows = (data ?? []) as unknown as ContactExportRow[];
    csv = toCsv(
      [
        "first_name",
        "last_name",
        "email",
        "phone",
        "position",
        "company",
        "source",
        "source_detail",
        "created_at",
      ],
      rows.map((r) => [
        r.first_name,
        r.last_name,
        r.email,
        r.phone,
        r.position,
        r.companies?.name ?? "",
        r.source,
        r.source_detail,
        r.created_at,
      ])
    );
    filename = `campaign-${safeName}-leads.csv`;
  } else {
    const { data, error } = await supabase
      .from("deals")
      .select("title, status, value, expected_close_date, created_at, contacts(first_name, last_name), companies(name)")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false });
    if (error) return new Response(error.message, { status: 500 });

    const rows = (data ?? []) as unknown as DealExportRow[];
    csv = toCsv(
      [
        "title",
        "status",
        "value",
        "expected_close_date",
        "primary_contact",
        "company",
        "created_at",
      ],
      rows.map((r) => [
        r.title,
        r.status,
        r.value,
        r.expected_close_date,
        r.contacts ? `${r.contacts.first_name} ${r.contacts.last_name}` : "",
        r.companies?.name ?? "",
        r.created_at,
      ])
    );
    filename = `campaign-${safeName}-deals.csv`;
  }

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
