"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { EmailCompose, type EmailTemplateOption } from "./email-compose";
import { sendEmail } from "./actions";
import { useState, useTransition } from "react";

interface EmailSheetProps {
  defaultTo?: string;
  defaultSubject?: string;
  defaultFollowUpDate?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  templates?: EmailTemplateOption[];
  placeholderValues?: {
    vorname?: string;
    nachname?: string;
    firma?: string;
    position?: string;
    deal?: string;
  };
  contactLanguage?: string;
}

export function EmailSheet({
  defaultTo,
  defaultSubject,
  defaultFollowUpDate,
  contactId,
  companyId,
  dealId,
  trigger,
  defaultOpen,
  onOpenChange: externalOnOpenChange,
  templates,
  placeholderValues,
  contactLanguage,
}: EmailSheetProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setError("");
      setWarning("");
    }
    externalOnOpenChange?.(v);
  };

  const handleSubmit = (formData: FormData) => {
    setError("");
    setWarning("");
    startTransition(async () => {
      const result = await sendEmail(formData);
      if (result.error) {
        setError(result.error);
      } else if ("warning" in result && result.warning) {
        setWarning(result.warning as string);
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
            <Button size="sm" variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              E-Mail senden
            </Button>
          )}
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>E-Mail verfassen</SheetTitle>
        </SheetHeader>
        <div className="px-8 pb-8">
          {error && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}
          {warning && (
            <p className="mb-3 text-sm text-yellow-600">{warning}</p>
          )}
          <EmailCompose
            defaultTo={defaultTo}
            defaultSubject={defaultSubject}
            defaultFollowUpDate={defaultFollowUpDate}
            contactId={contactId}
            companyId={companyId}
            dealId={dealId}
            onSubmit={handleSubmit}
            isPending={isPending}
            templates={templates}
            placeholderValues={placeholderValues}
            contactLanguage={contactLanguage}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
