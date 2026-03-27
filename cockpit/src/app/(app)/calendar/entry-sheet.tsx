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
import { EntryForm } from "./entry-form";
import { createEntry, updateEntry, type CalendarEntry } from "./actions";
import { useState, useTransition } from "react";

interface EntrySheetProps {
  entry?: CalendarEntry;
  trigger?: React.ReactNode;
}

export function EntrySheet({ entry, trigger }: EntrySheetProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = entry
        ? await updateEntry(entry.id, formData)
        : await createEntry(formData);
      if (!result.error) setOpen(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Eintrag erstellen
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {entry ? "Eintrag bearbeiten" : "Neuer Eintrag"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <EntryForm
            entry={entry}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
