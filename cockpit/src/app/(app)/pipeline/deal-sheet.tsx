"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DealForm } from "./deal-form";
import { createDeal, updateDeal, type Deal, type PipelineStage } from "./actions";
import { useState, useTransition } from "react";

interface DealSheetProps {
  deal?: Deal;
  stages: PipelineStage[];
  pipelineId: string;
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  trigger?: React.ReactNode;
}

export function DealSheet({
  deal,
  stages,
  pipelineId,
  contacts,
  companies,
  trigger,
}: DealSheetProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = deal
        ? await updateDeal(deal.id, formData)
        : await createDeal(formData);
      if (!result.error) {
        setOpen(false);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Deal erstellen
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {deal ? "Deal bearbeiten" : "Neuer Deal"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <DealForm
            deal={deal}
            stages={stages}
            pipelineId={pipelineId}
            contacts={contacts}
            companies={companies}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
