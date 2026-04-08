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
import { CompanyForm } from "./company-form";
import { createCompany, updateCompany, type Company } from "./actions";
import { useState, useTransition } from "react";

interface CompanySheetProps {
  company?: Company;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CompanySheet({ company, trigger, defaultOpen, onOpenChange: externalOnOpenChange }: CompanySheetProps) {
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
      const result = company
        ? await updateCompany(company.id, formData)
        : await createCompany(formData);
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
              Firma erstellen
            </Button>
          )}
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {company ? "Firma bearbeiten" : "Neue Firma"}
          </SheetTitle>
        </SheetHeader>
        <div className="px-8 pb-8">
          {error && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}
          <CompanyForm
            company={company}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
