import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderLegalMarkdown } from "@/lib/legal/markdown";
import { isReservedSlug } from "@/lib/team/reserved-slugs";
import { CustomerDsePageShell } from "@/components/layout/customer-dse-page-shell";

export const metadata: Metadata = {
  title: "Datenschutzerklaerung",
  description:
    "Datenschutzerklaerung des Tenants — Strategaize Business Development System",
};

interface PageProps {
  params: Promise<{ "tenant-slug": string }>;
}

export default async function CustomerDsePublicPage({ params }: PageProps) {
  const { "tenant-slug": tenantSlug } = await params;

  if (!tenantSlug || isReservedSlug(tenantSlug)) {
    notFound();
  }

  const admin = createAdminClient();

  const { data: team } = await admin
    .from("teams")
    .select("id, name")
    .ilike("slug", tenantSlug)
    .maybeSingle();

  if (!team) {
    notFound();
  }

  const { data: doc } = await admin
    .from("legal_documents")
    .select("content_md")
    .eq("tenant_team_id", team.id)
    .eq("kind", "customer-dse")
    .maybeSingle();

  if (!doc) {
    notFound();
  }

  const html = await renderLegalMarkdown(doc.content_md);

  return <CustomerDsePageShell html={html} tenantName={team.name} />;
}
