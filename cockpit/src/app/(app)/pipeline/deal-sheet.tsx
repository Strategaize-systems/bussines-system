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
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DealSheet({
  deal,
  stages,
  pipelineId,
  contacts,
  companies,
  referrals,
  trigger,
  defaultOpen,
  onOpenChange: externalOnOpenChange,
}: DealSheetProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setError("");
    externalOnOpenChange?.(v);
  };

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = deal
        ? await updateDeal(deal.id, formData)
        : await createDeal(formData);
      if (result.error) {
        setError(result.error);
      } else {
        handleOpenChange(false);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {trigger !== undefined && (
        <SheetTrigger>
          {trigger ?? (
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Deal erstellen
            </Button>
          )}
        </SheetTrigger>
      )}
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
