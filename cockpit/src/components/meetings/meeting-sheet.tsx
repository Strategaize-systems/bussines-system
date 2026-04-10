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
import { FollowUpDialog } from "./follow-up-dialog";
import {
  createMeeting,
  updateMeeting,
  type Meeting,
} from "@/app/(app)/meetings/actions";
import { useState, useTransition } from "react";

interface MeetingSheetProps {
  contacts: { id: string; first_name: string; last_name: string; priority?: string | null }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  meeting?: Meeting;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDealId?: string;
  defaultContactId?: string;
  defaultCompanyId?: string;
  defaultParticipants?: string;
  defaultAgenda?: string;
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
  defaultParticipants,
  defaultAgenda,
}: MeetingSheetProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [completedMeeting, setCompletedMeeting] = useState<Meeting | null>(null);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setError("");
    externalOnOpenChange?.(v);
  };

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const newStatus = formData.get("status") as string;
      const wasCompleted = meeting && meeting.status !== "completed" && newStatus === "completed";

      const result = meeting
        ? await updateMeeting(meeting.id, formData)
        : await createMeeting(formData);
      if (result.error) {
        setError(result.error);
      } else {
        handleOpenChange(false);
        // Show follow-up dialog when meeting is marked as completed
        if (wasCompleted && meeting) {
          setCompletedMeeting(meeting);
          setFollowUpOpen(true);
        }
      }
    });
  };

  // Find contact priority for follow-up date calculation
  const contactPriority = completedMeeting?.contact_id
    ? contacts.find((c) => c.id === completedMeeting.contact_id)?.priority
    : null;

  return (
    <>
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
              defaultParticipants={defaultParticipants}
              defaultAgenda={defaultAgenda}
            />
          </div>
        </SheetContent>
      </Sheet>

      {completedMeeting && (
        <FollowUpDialog
          open={followUpOpen}
          onOpenChange={setFollowUpOpen}
          meeting={completedMeeting}
          contactPriority={contactPriority}
        />
      )}
    </>
  );
}
