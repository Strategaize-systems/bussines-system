"use server";

// SLC-663 MT-5 — Server-Action für "Mehr anzeigen" auf Won/Lost-Sektionen.

import { getClosedDeals, type DealCardData } from "@/lib/deals/queries";

export async function loadMoreClosedDeals(
  pipelineId: string,
  status: "won" | "lost",
  offsetBatches: number,
): Promise<DealCardData[]> {
  return getClosedDeals({
    pipelineId,
    status,
    windowDays: 90,
    offsetBatches,
  });
}
