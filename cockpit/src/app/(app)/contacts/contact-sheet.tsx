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
import { ContactForm } from "./contact-form";
import { createContact, updateContact, type Contact } from "./actions";
import { useState, useTransition } from "react";

interface ContactSheetProps {
  companies: { id: string; name: string }[];
  contact?: Contact;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ContactSheet({ companies, contact, trigger, defaultOpen, onOpenChange: externalOnOpenChange }: ContactSheetProps) {
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
      const result = contact
        ? await updateContact(contact.id, formData)
        : await createContact(formData);
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
              Kontakt erstellen
            </Button>
          )}
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {contact ? "Kontakt bearbeiten" : "Neuer Kontakt"}
          </SheetTitle>
        </SheetHeader>
        <div className="px-8 pb-8">
          {error && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}
          <ContactForm
            contact={contact}
            companies={companies}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
