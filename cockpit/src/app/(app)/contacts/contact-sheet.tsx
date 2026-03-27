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
}

export function ContactSheet({ companies, contact, trigger }: ContactSheetProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = contact
        ? await updateContact(contact.id, formData)
        : await createContact(formData);
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
            Kontakt erstellen
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {contact ? "Kontakt bearbeiten" : "Neuer Kontakt"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
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
