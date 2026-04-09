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
import { MeetingForm } from "./meeting-form";
import {
  createMeeting,
  updateMeeting,
  type Meeting,
} from "@/app/(app)/meetings/actions";
import { useState, useTransition } from "react";

interface MeetingSheetProps {
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  meeting?: Meeting;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDealId?: string;
  defaultContactId?: string;
  defaultCompanyId?: string;
}

export function MeetingSheet({
  contacts,
  companies,
  deals,
  meeting,
  trigger,
  defaultOpen,
  onOpenChange: externalOnOpenChange,
  defaultDealId,
  defaultContactId,
  defaultCompanyId,
}: MeetingSheetProps) {
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
      const result = meeting
        ? await updateMeeting(meeting.id, formData)
        : await createMeeting(formData);
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
              Neues Meeting
            </Button>
          )}
        </SheetTrigger>
      )}
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {meeting ? "Meeting bearbeiten" : "Neues Meeting"}
          </SheetTitle>
        </SheetHeader>
        <div className="px-8 pb-8">
          {error && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}
          <MeetingForm
            meeting={meeting}
            contacts={contacts}
            companies={companies}
            deals={deals}
            onSubmit={handleSubmit}
            isPending={isPending}
            defaultDealId={defaultDealId}
            defaultContactId={defaultContactId}
            defaultCompanyId={defaultCompanyId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
