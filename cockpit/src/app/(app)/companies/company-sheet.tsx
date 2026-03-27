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
}

export function CompanySheet({ company, trigger }: CompanySheetProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = company
        ? await updateCompany(company.id, formData)
        : await createCompany(formData);
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
            Firma erstellen
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {company ? "Firma bearbeiten" : "Neue Firma"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
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
