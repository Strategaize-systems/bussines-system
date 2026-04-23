"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { CallWidget } from "./call-widget";

interface CallButtonProps {
  phoneNumber: string;
  contactName?: string | null;
  dealId?: string;
  contactId?: string;
}

export function CallButton({
  phoneNumber,
  contactName,
  dealId,
  contactId,
}: CallButtonProps) {
  const [active, setActive] = useState(false);

  return (
    <>
      <button
        onClick={() => setActive(true)}
        className="flex items-center gap-2.5 h-10 px-4 rounded-lg border-2 border-slate-200 bg-white text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md transition-all cursor-pointer"
      >
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center shadow-sm">
          <Phone className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </span>
        Anrufen
      </button>
      {active && (
        <CallWidget
          phoneNumber={phoneNumber}
          contactName={contactName}
          dealId={dealId}
          contactId={contactId}
          onClose={() => setActive(false)}
        />
      )}
    </>
  );
}
