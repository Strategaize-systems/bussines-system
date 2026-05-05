import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { CampaignForm } from "../_components/campaign-form";
import type { SaveCampaignInput } from "@/types/campaign";

export const dynamic = "force-dynamic";

const TODAY = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function NewCampaignPage() {
  const initial: SaveCampaignInput = {
    name: "",
    type: "linkedin",
    channel: null,
    start_date: TODAY(),
    end_date: null,
    status: "draft",
    external_ref: null,
    notes: null,
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
          Neue Kampagne
        </h1>
        <p className="text-sm text-muted-foreground">
          Lege eine neue Kampagne an. Tracking-Links + Click-Logs werden in
          V6.2 SLC-625 ergaenzt.
        </p>
      </div>

      <CampaignForm initial={initial} mode="create" />
    </main>
  );
}
