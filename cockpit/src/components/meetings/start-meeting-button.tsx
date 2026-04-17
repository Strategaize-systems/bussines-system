"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StartMeetingModal } from "./start-meeting-modal";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  consent_status?: string | null;
}

interface StartMeetingButtonProps {
  dealId: string;
  dealTitle: string;
  contacts: Contact[];
}

export function StartMeetingButton({
  dealId,
  dealTitle,
  contacts,
}: StartMeetingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={() => setIsOpen(true)}
      >
        <Video className="mr-1.5 h-3.5 w-3.5" />
        Meeting starten
      </Button>

      {isOpen && (
        <StartMeetingModal
          dealId={dealId}
          dealTitle={dealTitle}
          contacts={contacts}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
