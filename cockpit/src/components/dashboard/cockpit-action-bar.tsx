"use client";

// SLC-666 MT-4 — Kontextlose Action-Bar fuer /dashboard.
// 5 Buttons (Task / Mail / Meeting / Anruf / Notiz) ohne Deal-Kontext.
// Anruf-Button oeffnet ContactPickerDialog.

import { useState } from "react";
import Link from "next/link";
import { ListTodo, Mail, Calendar, Phone, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskSheet } from "@/app/(app)/aufgaben/task-sheet";
import { MeetingSheet } from "@/components/meetings/meeting-sheet";
import { ActivityForm } from "@/components/activities/activity-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ContactPickerDialog } from "./contact-picker-dialog";

interface CockpitActionBarProps {
  contacts: Array<{
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    email?: string | null;
    company_id?: string | null;
  }>;
  companies: Array<{ id: string; name: string }>;
  deals: Array<{ id: string; title: string }>;
}

interface QuickButtonProps {
  icon: typeof ListTodo;
  label: string;
  gradient: string;
  onClick?: () => void;
  href?: string;
  testId: string;
}

function QuickButton({ icon: Icon, label, gradient, onClick, href, testId }: QuickButtonProps) {
  const inner = (
    <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
      <div
        className={cn(
          "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow group-hover:scale-105 transition-transform",
          gradient,
        )}
      >
        <Icon size={18} strokeWidth={2} />
      </div>
      <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">
        {label}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        data-testid={testId}
        aria-label={label}
        className="outline-none focus-visible:ring-2 focus-visible:ring-[#4454b8]/40 rounded-xl"
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-label={label}
      className="outline-none focus-visible:ring-2 focus-visible:ring-[#4454b8]/40 rounded-xl"
    >
      {inner}
    </button>
  );
}

export function CockpitActionBar({ contacts, companies, deals }: CockpitActionBarProps) {
  const [showTaskSheet, setShowTaskSheet] = useState(false);
  const [showMeetingSheet, setShowMeetingSheet] = useState(false);
  const [showCallPicker, setShowCallPicker] = useState(false);
  const [showNoteSheet, setShowNoteSheet] = useState(false);

  return (
    <div
      data-testid="cockpit-action-bar"
      className="flex flex-wrap items-start gap-4 sm:gap-6 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm"
    >
      <QuickButton
        icon={ListTodo}
        label="Aufgabe"
        gradient="from-[#4454b8] to-[#6470d4]"
        testId="cockpit-action-task"
        onClick={() => setShowTaskSheet(true)}
      />
      <QuickButton
        icon={Mail}
        label="E-Mail"
        gradient="from-[#0ea5e9] to-[#38bdf8]"
        testId="cockpit-action-email"
        href="/emails/compose"
      />
      <QuickButton
        icon={Calendar}
        label="Meeting"
        gradient="from-[#a855f7] to-[#c084fc]"
        testId="cockpit-action-meeting"
        onClick={() => setShowMeetingSheet(true)}
      />
      <QuickButton
        icon={Phone}
        label="Anruf"
        gradient="from-[#00a84f] to-[#4dcb8b]"
        testId="cockpit-action-call"
        onClick={() => setShowCallPicker(true)}
      />
      <QuickButton
        icon={FileText}
        label="Notiz"
        gradient="from-[#f59e0b] to-[#fbbf24]"
        testId="cockpit-action-note"
        onClick={() => setShowNoteSheet(true)}
      />

      <TaskSheet
        contacts={contacts}
        companies={companies}
        deals={deals}
        defaultOpen={showTaskSheet}
        onOpenChange={setShowTaskSheet}
      />

      <MeetingSheet
        contacts={contacts}
        companies={companies}
        deals={deals}
        defaultOpen={showMeetingSheet}
        onOpenChange={setShowMeetingSheet}
      />

      <ContactPickerDialog
        contacts={contacts}
        open={showCallPicker}
        onOpenChange={setShowCallPicker}
      />

      <Sheet open={showNoteSheet} onOpenChange={setShowNoteSheet}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Notiz erstellen</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ActivityForm />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
