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
        className="h-10 px-4 rounded-lg border-0 bg-gradient-to-r from-[#00a84f] to-[#4dcb8b] text-white text-sm font-bold hover:shadow-lg transition-all"
        onClick={() => setIsOpen(true)}
      >
        <Video className="mr-2 h-4 w-4" />
        Starten
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
