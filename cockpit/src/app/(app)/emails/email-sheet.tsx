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
import { EmailCompose } from "./email-compose";
import { sendEmail } from "./actions";
import { useState, useTransition } from "react";

interface EmailSheetProps {
  defaultTo?: string;
  contactId?: string;
  companyId?: string;
  trigger?: React.ReactNode;
}

export function EmailSheet({ defaultTo, contactId, companyId, trigger }: EmailSheetProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError("");
    setWarning("");
    startTransition(async () => {
      const result = await sendEmail(formData);
      if (result.error) {
        setError(result.error);
      } else {
        if ("warning" in result && result.warning) {
          setWarning(result.warning as string);
        }
        setOpen(false);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(""); setWarning(""); } }}>
      <SheetTrigger>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            E-Mail senden
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>E-Mail verfassen</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {error && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}
          {warning && (
            <p className="mb-3 text-sm text-yellow-600">{warning}</p>
          )}
          <EmailCompose
            defaultTo={defaultTo}
            contactId={contactId}
            companyId={companyId}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
