"use client";

import { useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarClock,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { createFollowUpTask } from "@/app/(app)/aufgaben/actions";
import { calculateFollowUpDate, getFollowUpDays } from "@/lib/follow-up";

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: {
    title: string;
    contact_id: string | null;
    company_id: string | null;
    deal_id: string | null;
    contacts?: { id: string; first_name: string; last_name: string } | null;
    companies?: { id: string; name: string } | null;
    deals?: { id: string; title: string } | null;
  };
  contactPriority?: string | null;
}

type SuggestionType = "follow_up" | "proposal" | "custom" | "none";

export function FollowUpDialog({
  open,
  onOpenChange,
  meeting,
  contactPriority,
}: FollowUpDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<SuggestionType | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customDate, setCustomDate] = useState(
    calculateFollowUpDate(contactPriority)
  );

  const followUpDays = getFollowUpDays(contactPriority);
  const followUpDate = calculateFollowUpDate(contactPriority);

  const dealTitle = meeting.deals?.title ?? meeting.title;
  const contactName = meeting.contacts
    ? `${meeting.contacts.first_name} ${meeting.contacts.last_name}`
    : null;

  const suggestions: {
    type: SuggestionType;
    label: string;
    description: string;
    icon: typeof CalendarClock;
  }[] = [
    {
      type: "follow_up",
      label: `Follow-up in ${followUpDays} Tagen`,
      description: contactName
        ? `Nachfassen bei ${contactName} (${dealTitle})`
        : `Nachfassen: ${dealTitle}`,
      icon: CalendarClock,
    },
    {
      type: "proposal",
      label: "Angebot senden",
      description: `Angebot vorbereiten fuer ${dealTitle}`,
      icon: FileText,
    },
    {
      type: "none",
      label: "Keine Aktion",
      description: "Kein Follow-up noetig",
      icon: X,
    },
  ];

  const handleSelect = (type: SuggestionType) => {
    if (type === "none") {
      onOpenChange(false);
      return;
    }
    setSelected(type);
  };

  const handleCreate = () => {
    startTransition(async () => {
      let title: string;
      let dueDate: string;
      let description: string | undefined;

      if (selected === "follow_up") {
        title = contactName
          ? `Follow-up: ${contactName} (${dealTitle})`
          : `Follow-up: ${dealTitle}`;
        dueDate = followUpDate;
        description = `Automatische Wiedervorlage nach Meeting "${meeting.title}"`;
      } else if (selected === "proposal") {
        title = `Angebot senden: ${dealTitle}`;
        dueDate = calculateFollowUpDate("high"); // Proposals are urgent: 2 days
        description = `Angebot vorbereiten nach Meeting "${meeting.title}"`;
      } else {
        // custom
        title = customTitle || `Follow-up: ${dealTitle}`;
        dueDate = customDate;
      }

      await createFollowUpTask({
        title,
        description,
        due_date: dueDate,
        priority: contactPriority === "high" ? "high" : "medium",
        contact_id: meeting.contact_id,
        company_id: meeting.company_id,
        deal_id: meeting.deal_id,
      });

      onOpenChange(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Naechster Schritt?</SheetTitle>
        </SheetHeader>
        <div className="px-8 pb-8 space-y-4">
          <p className="text-sm text-muted-foreground">
            Meeting &quot;{meeting.title}&quot; wurde abgeschlossen.
            Was ist der naechste Schritt?
          </p>

          {!selected && (
            <div className="space-y-2">
              {suggestions.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.type}
                    onClick={() => handleSelect(s.type)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-[#4454b8] hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="mt-0.5 p-1.5 rounded-md bg-slate-100">
                      <Icon size={16} className="text-slate-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.description}
                      </div>
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => setSelected("custom")}
                className="w-full text-center text-xs text-muted-foreground hover:text-[#4454b8] transition-colors py-2"
              >
                Eigene Aufgabe definieren...
              </button>
            </div>
          )}

          {selected === "custom" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="custom_title">Aufgabe</Label>
                <Input
                  id="custom_title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={`Follow-up: ${dealTitle}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom_date">Faellig am</Label>
                <Input
                  id="custom_date"
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {selected && selected !== "none" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelected(null)}
                disabled={isPending}
                className="flex-1"
              >
                Zurueck
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isPending || (selected === "custom" && !customTitle && !customDate)}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Erstelle...
                  </>
                ) : (
                  "Aufgabe erstellen"
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
