"use client";

import { useState } from "react";
import { Video } from "lucide-react";
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
      <button
        className="flex items-center gap-2.5 h-10 px-4 rounded-lg border-2 border-slate-200 bg-white text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md transition-all cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00a84f] to-[#4dcb8b] flex items-center justify-center shadow-sm">
          <Video className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </span>
        Starten
      </button>

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
