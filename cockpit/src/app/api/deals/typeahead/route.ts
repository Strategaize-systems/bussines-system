// SLC-663 MT-2 — Type-Ahead-API für /deals-Suche
//
// GET /api/deals/typeahead?q=...
// ILIKE auf deals.title, companies.name, contacts.first_name+' '+last_name.
// Max 10 Treffer. q.length < 2 ⇒ leere Liste.
// Auth via Supabase-Cookie (Anon-Client).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sanitizeTypeaheadQuery,
  mergeTypeaheadResults,
  type TypeaheadDealResult,
} from "@/lib/deals/typeahead";

export const runtime = "nodejs";

type DealRow = {
  id: string;
  title: string;
  pipeline_id: string | null;
  companies: { name: string } | { name: string }[] | null;
  contacts: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null;
};

function flatten<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

function rowToResult(row: DealRow): TypeaheadDealResult {
  const company = flatten(row.companies);
  const contact = flatten(row.contacts);
  const contactName =
    contact && (contact.first_name || contact.last_name)
      ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()
      : null;
  return {
    id: row.id,
    title: row.title,
    company_name: company?.name ?? null,
    contact_name: contactName,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawQ = url.searchParams.get("q") ?? "";
  const q = sanitizeTypeaheadQuery(rawQ);
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const pattern = `%${q}%`;
  const SELECT_COLS = "id, title, pipeline_id, companies(name), contacts(first_name, last_name)";

  const [byTitle, companiesRes, contactsRes] = await Promise.all([
    supabase.from("deals").select(SELECT_COLS).ilike("title", pattern).limit(10),
    supabase.from("companies").select("id").ilike("name", pattern).limit(20),
    supabase
      .from("contacts")
      .select("id")
      .or(`first_name.ilike.${pattern},last_name.ilike.${pattern}`)
      .limit(20),
  ]);

  const titleErr = byTitle.error;
  const companyIds = (companiesRes.data ?? []).map((r) => r.id);
  const contactIds = (contactsRes.data ?? []).map((r) => r.id);

  let byCompany: DealRow[] = [];
  if (companyIds.length > 0) {
    const res = await supabase
      .from("deals")
      .select(SELECT_COLS)
      .in("company_id", companyIds)
      .limit(10);
    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    }
    byCompany = (res.data ?? []) as DealRow[];
  }

  let byContact: DealRow[] = [];
  if (contactIds.length > 0) {
    const res = await supabase
      .from("deals")
      .select(SELECT_COLS)
      .in("contact_id", contactIds)
      .limit(10);
    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    }
    byContact = (res.data ?? []) as DealRow[];
  }

  if (titleErr) {
    return NextResponse.json({ error: titleErr.message }, { status: 500 });
  }

  const merged = mergeTypeaheadResults(
    ((byTitle.data ?? []) as DealRow[]).map(rowToResult),
    byCompany.map(rowToResult),
    byContact.map(rowToResult),
    10,
  );

  return NextResponse.json({ results: merged });
}
