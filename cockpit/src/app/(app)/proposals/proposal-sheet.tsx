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
import { ProposalForm } from "./proposal-form";
import { createProposalLegacy, updateProposalLegacy, type Proposal } from "./actions";
import { useState, useTransition } from "react";

interface ProposalSheetProps {
  deals: { id: string; title: string }[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  proposal?: Proposal;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProposalSheet({ deals, contacts, companies, proposal, trigger, defaultOpen, onOpenChange: externalOnOpenChange }: ProposalSheetProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (v: boolean) => { setOpen(v); if (!v) setError(""); externalOnOpenChange?.(v); };

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = proposal
        ? await updateProposalLegacy(proposal.id, formData)
        : await createProposalLegacy(formData);
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
              Angebot erstellen
            </Button>
          )}
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {proposal ? "Angebot bearbeiten" : "Neues Angebot"}
          </SheetTitle>
        </SheetHeader>
        <div className="px-8 pb-8">
          {error && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}
          <ProposalForm
            proposal={proposal}
            deals={deals}
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
