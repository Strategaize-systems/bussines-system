"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { DealEdit } from "./deal-edit";
import type { PipelineStage, Pipeline } from "@/app/(app)/pipeline/actions";
import type { DealProductWithName } from "@/app/actions/deal-products";
import type { Product } from "@/types/products";

interface DealEditDrawerProps {
  deal: any;
  stages: PipelineStage[];
  pipelines: Pipeline[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  referrals: { id: string; label: string }[];
  dealProducts: DealProductWithName[];
  activeProducts: Product[];
}

export function DealEditDrawer({
  deal,
  stages,
  pipelines,
  contacts,
  companies,
  referrals,
  dealProducts,
  activeProducts,
}: DealEditDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Deal bearbeiten"
        title="Deal bearbeiten"
        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Deal bearbeiten</SheetTitle>
          <SheetDescription>
            Stammdaten, Produkte und Pipeline-Wechsel fuer diesen Deal.
          </SheetDescription>
        </SheetHeader>
        <div className="px-6 py-4">
          <DealEdit
            deal={deal}
            stages={stages}
            pipelines={pipelines}
            contacts={contacts}
            companies={companies}
            referrals={referrals}
            dealProducts={dealProducts}
            activeProducts={activeProducts}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
