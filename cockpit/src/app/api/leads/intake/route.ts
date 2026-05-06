// V6.2 SLC-625 — Lead-Intake API (DEC-138 First-Touch-Lock)
//
// POST /api/leads/intake mit Bearer-Auth (FEAT-504-Pattern, EXPORT_API_KEY).
// System 4 oder andere externe Quellen pushen Leads + UTM-Params.
// First-Touch-Lock via COALESCE auf bestehender contacts.campaign_id.

import { NextResponse } from "next/server";
import { verifyExportApiKey } from "@/lib/export/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveCampaignFromUtm } from "@/lib/campaigns/mapper";
import type { LeadIntakeInput, LeadIntakeResponse } from "@/types/campaign";

interface ContactRow {
  id: string;
  campaign_id: string | null;
  source: string | null;
}

interface CompanyRow {
  id: string;
  campaign_id: string | null;
}

function validateInput(body: unknown): { ok: true; input: LeadIntakeInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be JSON object" };
  const b = body as Record<string, unknown>;

  const first_name = (b.first_name as string | undefined)?.trim();
  const last_name = (b.last_name as string | undefined)?.trim();
  const email = (b.email as string | undefined)?.trim();

  if (!first_name) return { ok: false, error: "first_name is required" };
  if (!last_name) return { ok: false, error: "last_name is required" };
  if (!email) return { ok: false, error: "email is required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "email is not a valid address" };
  }

  return {
    ok: true,
    input: {
      first_name,
      last_name,
      email,
      phone: (b.phone as string | undefined)?.trim() || null,
      company_name: (b.company_name as string | undefined)?.trim() || null,
      company_website: (b.company_website as string | undefined)?.trim() || null,
      notes: (b.notes as string | undefined)?.trim() || null,
      utm_source: (b.utm_source as string | undefined)?.trim() || null,
      utm_medium: (b.utm_medium as string | undefined)?.trim() || null,
      utm_campaign: (b.utm_campaign as string | undefined)?.trim() || null,
      utm_content: (b.utm_content as string | undefined)?.trim() || null,
      utm_term: (b.utm_term as string | undefined)?.trim() || null,
    },
  };
}

export async function POST(request: Request) {
  const authResp = verifyExportApiKey(request);
  if (authResp) return authResp;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const v = validateInput(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const input = v.input;

  const supabase = createAdminClient();

  // 1) Resolve campaign_id from UTM (DEC-135)
  const resolvedCampaignId = await resolveCampaignFromUtm({
    utm_source: input.utm_source,
    utm_medium: input.utm_medium,
    utm_campaign: input.utm_campaign,
    utm_content: input.utm_content,
    utm_term: input.utm_term,
  });

  // 2) Lookup existing contact via email (case-insensitive)
  const { data: existingRow } = await supabase
    .from("contacts")
    .select("id, campaign_id, source")
    .ilike("email", input.email)
    .maybeSingle();
  const existing = existingRow as ContactRow | null;

  // 3) Optional: lookup or create company by name
  let companyId: string | null = null;
  if (input.company_name) {
    const { data: companyRow } = await supabase
      .from("companies")
      .select("id, campaign_id")
      .ilike("name", input.company_name)
      .maybeSingle();
    const company = companyRow as CompanyRow | null;

    if (company) {
      companyId = company.id;
      if (resolvedCampaignId && !company.campaign_id) {
        await supabase
          .from("companies")
          .update({ campaign_id: resolvedCampaignId })
          .eq("id", company.id);
      }
    } else {
      const { data: newCompany } = await supabase
        .from("companies")
        .insert({
          name: input.company_name,
          website: input.company_website,
          campaign_id: resolvedCampaignId,
        })
        .select("id")
        .single();
      if (newCompany) companyId = (newCompany as { id: string }).id;
    }
  }

  // 4) Insert or update contact (First-Touch-Lock via COALESCE)
  let contactId: string;
  let wasNew: boolean;

  if (existing) {
    contactId = existing.id;
    wasNew = false;
    const updates: Record<string, unknown> = {};
    if (resolvedCampaignId && !existing.campaign_id) {
      updates.campaign_id = resolvedCampaignId;
    }
    if (input.utm_source && !existing.source) {
      updates.source = input.utm_source;
    }
    if (companyId) updates.company_id = companyId;
    if (Object.keys(updates).length > 0) {
      await supabase.from("contacts").update(updates).eq("id", contactId);
    }
  } else {
    const { data: newContact, error } = await supabase
      .from("contacts")
      .insert({
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        phone: input.phone,
        company_id: companyId,
        notes: input.notes,
        source: input.utm_source,
        source_detail: input.utm_campaign,
        campaign_id: resolvedCampaignId,
      })
      .select("id")
      .single();

    if (error || !newContact) {
      return NextResponse.json(
        { error: error?.message ?? "Insert failed" },
        { status: 500 }
      );
    }
    contactId = (newContact as { id: string }).id;
    wasNew = true;
  }

  // 5) Audit log (system insert, actor_id = NULL).
  // Await ist Pflicht: ohne await wird der Insert in Serverless-/Container-
  // Lifetimes nach dem Response nicht garantiert vollendet → Audit-Trail
  // verloren. ~5-10ms Latency-Kosten sind akzeptabel.
  await supabase
    .from("audit_log")
    .insert({
      actor_id: null,
      action: "create",
      entity_type: "contact",
      entity_id: contactId,
      changes: {
        after: {
          campaign_id: resolvedCampaignId,
          utm_source: input.utm_source,
          utm_campaign: input.utm_campaign,
        },
      },
      context: "Lead-Intake API (system)",
    });

  const response: LeadIntakeResponse = {
    contact_id: contactId,
    was_new: wasNew,
    campaign_id: resolvedCampaignId,
  };
  return NextResponse.json(response, { status: wasNew ? 201 : 200 });
}
