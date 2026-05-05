import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { CampaignForm } from "../../_components/campaign-form";
import { getCampaign } from "../../actions";
import type { SaveCampaignInput } from "@/types/campaign";

export const dynamic = "force-dynamic";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const initial: SaveCampaignInput = {
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    channel: campaign.channel,
    start_date: campaign.start_date,
    end_date: campaign.end_date,
    status: campaign.status,
    external_ref: campaign.external_ref,
    notes: campaign.notes,
  };

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <Link
          href="/settings/campaigns"
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-2 inline-flex gap-1`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurueck zur Liste
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Kampagne bearbeiten
        </h1>
        <p className="text-sm text-muted-foreground">
          {campaign.name}
        </p>
      </div>

      <CampaignForm initial={initial} mode="edit" />
    </main>
  );
}
