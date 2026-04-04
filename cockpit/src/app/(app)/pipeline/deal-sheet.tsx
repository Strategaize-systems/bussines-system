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
  referrals?: { id: string; label: string }[];
  trigger?: React.ReactNode;
}

export function DealSheet({
  deal,
  stages,
  pipelineId,
  contacts,
  companies,
  referrals,
  trigger,
}: DealSheetProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = deal
        ? await updateDeal(deal.id, formData)
        : await createDeal(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(""); }}>
      <SheetTrigger>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Deal erstellen
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {deal ? "Deal bearbeiten" : "Neuer Deal"}
          </SheetTitle>
        </SheetHeader>
        <div className="px-8 pb-8">
          {error && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}
          <DealForm
            deal={deal}
            stages={stages}
            pipelineId={pipelineId}
            contacts={contacts}
            companies={companies}
            referrals={referrals}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
