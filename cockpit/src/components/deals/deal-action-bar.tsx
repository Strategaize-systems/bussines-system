"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListTodo, Mail, Calendar, Phone, FileText, MoreHorizontal, FileEdit, Loader2, Video, Zap, Workflow, ClipboardList, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TaskSheet } from "@/app/(app)/aufgaben/task-sheet";
import { MeetingSheet } from "@/components/meetings/meeting-sheet";
import { StartMeetingModal } from "@/components/meetings/start-meeting-modal";
import { CallWidget } from "@/components/calls/call-widget";
import { EnrollButton } from "@/components/cadences/enroll-button";
import { ActivityForm } from "@/components/activities/activity-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { createProposal } from "@/app/(app)/proposals/actions";
import { createActivity } from "@/lib/actions/activity-actions";
import { getContextPrefill } from "@/lib/context-prefill";

interface DealActionBarProps {
  deal: any;
  contacts: { id: string; first_name: string; last_name: string; phone?: string | null; email?: string | null; consent_status?: string | null }[];
  companies: { id: string; name: string }[];
  dealsForSelect: { id: string; title: string }[];
}

type ButtonGradient = string;

interface QuickButtonProps {
  icon: typeof ListTodo;
  label: string;
  color: ButtonGradient;
  onClick?: () => void;
  href?: string;
  loading?: boolean;
  disabled?: boolean;
  badge?: React.ReactNode;
  ariaLabel?: string;
}

function QuickButton({ icon: Icon, label, color, onClick, href, loading, disabled, badge, ariaLabel }: QuickButtonProps) {
  const inner = (
    <div className={cn("flex flex-col items-center gap-1.5 group", disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer")}>
      <div
        className={cn(
          "relative w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow transition-transform",
          color,
          !disabled && "group-hover:scale-105",
        )}
      >
        {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Icon size={18} strokeWidth={2} />}
        {badge}
      </div>
      <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">{label}</span>
    </div>
  );

  if (href && !disabled) {
    return (
      <Link href={href} aria-label={ariaLabel ?? label} className="outline-none focus-visible:ring-2 focus-visible:ring-[#4454b8]/40 rounded-xl">
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel ?? label}
      className="outline-none focus-visible:ring-2 focus-visible:ring-[#4454b8]/40 rounded-xl disabled:cursor-not-allowed"
    >
      {inner}
    </button>
  );
}

export function DealActionBar({ deal, contacts, companies, dealsForSelect }: DealActionBarProps) {
  const router = useRouter();
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [showStartMeeting, setShowStartMeeting] = useState(false);
  const [showMeetingSheet, setShowMeetingSheet] = useState(false);
  const [showCallWidget, setShowCallWidget] = useState(false);
  const [showNoteSheet, setShowNoteSheet] = useState(false);
  const [showActivityFullSheet, setShowActivityFullSheet] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);

  const prefill = getContextPrefill({
    deal: {
      title: deal.title,
      next_action: deal.next_action,
      contact_id: deal.contact_id,
      company_id: deal.company_id,
    },
    contact: deal.contacts
      ? {
          first_name: deal.contacts.first_name,
          last_name: deal.contacts.last_name,
          email: deal.contacts.email ?? null,
          priority: deal.contacts.priority ?? null,
        }
      : null,
    company: deal.companies ? { name: deal.companies.name } : null,
  });

  const composeHref = (() => {
    const params = new URLSearchParams({ dealId: deal.id });
    if (deal.contact_id) params.set("contactId", deal.contact_id);
    if (deal.company_id) params.set("companyId", deal.company_id);
    return `/emails/compose?${params.toString()}`;
  })();

  const phone = deal.contacts?.phone ?? null;
  const contactName = deal.contacts
    ? `${deal.contacts.first_name ?? ""} ${deal.contacts.last_name ?? ""}`.trim() || null
    : null;

  const meetingContacts = deal.contact_id
    ? contacts.filter((c) => c.id === deal.contact_id)
    : [];

  async function handleCreateProposal() {
    setProposalError(null);
    setIsCreatingProposal(true);
    try {
      const res = await createProposal({
        deal_id: deal.id,
        contact_id: deal.contact_id ?? null,
        company_id: deal.company_id ?? null,
      });
      if (res.ok) {
        router.push(`/proposals/${res.proposalId}/edit`);
      } else {
        setProposalError(res.error);
        setTimeout(() => setProposalError(null), 4000);
      }
    } catch (e) {
      setProposalError(e instanceof Error ? e.message : "Fehler");
      setTimeout(() => setProposalError(null), 4000);
    } finally {
      setIsCreatingProposal(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg p-3 sm:p-4">
      <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 flex-wrap">
        {/* 1. Task */}
        <TaskSheet
          contacts={contacts}
          companies={companies}
          deals={dealsForSelect}
          defaultDealId={deal.id}
          defaultTitle={prefill.suggestedTaskTitle}
          trigger={<QuickButton icon={ListTodo} label="Task" color="from-orange-500 to-amber-400" />}
        />

        {/* 2. E-Mail */}
        <QuickButton icon={Mail} label="E-Mail" color="from-blue-500 to-cyan-400" href={composeHref} ariaLabel="E-Mail verfassen" />

        {/* 3. Meeting (Dropdown: Plan + Sofort starten) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button type="button" aria-label="Meeting" className="outline-none focus-visible:ring-2 focus-visible:ring-[#4454b8]/40 rounded-xl">
                <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
                  <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-violet-400 flex items-center justify-center text-white shadow group-hover:scale-105 transition-transform">
                    <Calendar size={18} strokeWidth={2} />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white text-[8px] flex items-center justify-center text-purple-600 font-bold border border-purple-300">▾</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">Meeting</span>
                </div>
              </button>
            }
          />
          <DropdownMenuContent side="bottom" align="center" sideOffset={6} className="min-w-48">
            <DropdownMenuLabel>Meeting</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setShowMeetingSheet(true)}>
              <Calendar className="h-4 w-4 text-purple-500" />
              Termin planen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowStartMeeting(true)}>
              <Video className="h-4 w-4 text-emerald-500" />
              Sofort starten
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 4. Anruf */}
        <QuickButton
          icon={Phone}
          label="Anruf"
          color="from-green-500 to-emerald-400"
          onClick={() => setShowCallWidget(true)}
          disabled={!phone}
          ariaLabel={phone ? `Anrufen ${contactName ?? ""}` : "Anrufen (kein Telefon hinterlegt)"}
        />

        {/* 5. Notiz */}
        <QuickButton icon={ClipboardList} label="Notiz" color="from-slate-500 to-slate-400" onClick={() => setShowNoteSheet(true)} />

        {/* 6. Angebot — Desktop sichtbar, Mobile ins Mehr-Menue */}
        <div className="hidden md:block">
          <div className="relative">
            <QuickButton
              icon={FileText}
              label="Angebot"
              color="from-emerald-500 to-teal-400"
              onClick={handleCreateProposal}
              loading={isCreatingProposal}
            />
            {proposalError && (
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white shadow-lg z-10">
                {proposalError}
              </span>
            )}
          </div>
        </div>

        {/* 7. Mehr-Menue (Three-Dots) — enthaelt Cadence + Workflow + Aktivitaet (+ Angebot auf Mobile) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button type="button" aria-label="Mehr Aktionen" className="outline-none focus-visible:ring-2 focus-visible:ring-[#4454b8]/40 rounded-xl">
                <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center text-white shadow group-hover:scale-105 transition-transform">
                    <MoreHorizontal size={18} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">Mehr</span>
                </div>
              </button>
            }
          />
          <DropdownMenuContent side="bottom" align="end" sideOffset={6} className="min-w-56">
            <DropdownMenuLabel>Mehr Aktionen</DropdownMenuLabel>

            {/* Mobile: Angebot zusaetzlich hier */}
            <DropdownMenuItem className="md:hidden" onClick={handleCreateProposal} disabled={isCreatingProposal}>
              <FileText className="h-4 w-4 text-emerald-500" />
              Angebot erstellen
            </DropdownMenuItem>
            <DropdownMenuSeparator className="md:hidden" />

            <DropdownMenuItem onClick={() => setShowEnrollDialog(true)}>
              <Zap className="h-4 w-4 text-amber-500" />
              In Cadence einbuchen
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setShowActivityFullSheet(true)}>
              <FileEdit className="h-4 w-4 text-purple-500" />
              Activity-Vollformular
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => router.push("/settings/automation")}>
              <Workflow className="h-4 w-4 text-slate-500" />
              Workflow-Regeln
            </DropdownMenuItem>

            {deal.contact_id && (
              <DropdownMenuItem onClick={() => router.push(`/contacts/${deal.contact_id}`)}>
                <Users className="h-4 w-4 text-slate-500" />
                Kontakt oeffnen
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modals (controlled, ausserhalb der Buttons-Reihe) */}
      {showMeetingSheet && (
        <MeetingSheet
          contacts={contacts}
          companies={companies}
          deals={dealsForSelect}
          defaultDealId={deal.id}
          defaultContactId={deal.contact_id ?? undefined}
          defaultCompanyId={deal.company_id ?? undefined}
          defaultParticipants={prefill.suggestedParticipants}
          defaultAgenda={prefill.suggestedAgenda}
          defaultOpen={true}
          onOpenChange={(v) => { if (!v) setShowMeetingSheet(false); }}
        />
      )}

      <EnrollButton
        dealId={deal.id}
        contactId={deal.contact_id ?? undefined}
        open={showEnrollDialog}
        onOpenChange={setShowEnrollDialog}
      />

      {showStartMeeting && (
        <StartMeetingModal
          dealId={deal.id}
          dealTitle={deal.title}
          contacts={meetingContacts}
          onClose={() => setShowStartMeeting(false)}
        />
      )}

      {showCallWidget && phone && (
        <CallWidget
          phoneNumber={phone}
          contactName={contactName}
          dealId={deal.id}
          contactId={deal.contact_id ?? undefined}
          onClose={() => setShowCallWidget(false)}
        />
      )}

      <DealNoteSheet
        open={showNoteSheet}
        onOpenChange={setShowNoteSheet}
        dealId={deal.id}
        contactId={deal.contact_id ?? null}
        companyId={deal.company_id ?? null}
        onSaved={() => router.refresh()}
      />

      <Sheet open={showActivityFullSheet} onOpenChange={setShowActivityFullSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Activity erfassen</SheetTitle>
            <SheetDescription>
              Vollformular fuer Notiz, Anruf, E-Mail, Meeting oder Aufgabe mit Konversations-Details.
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 py-4">
            <ActivityForm
              dealId={deal.id}
              contactId={deal.contact_id ?? undefined}
              companyId={deal.company_id ?? undefined}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface DealNoteSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dealId: string;
  contactId: string | null;
  companyId: string | null;
  onSaved?: () => void;
}

function DealNoteSheet({ open, onOpenChange, dealId, contactId, companyId, onSaved }: DealNoteSheetProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    if (!text.trim()) {
      setError("Bitte einen Notiz-Text eintragen.");
      return;
    }
    const fd = new FormData();
    fd.set("type", "note");
    fd.set("title", text.trim().slice(0, 80));
    fd.set("description", text.trim());
    fd.set("deal_id", dealId);
    if (contactId) fd.set("contact_id", contactId);
    if (companyId) fd.set("company_id", companyId);

    startTransition(async () => {
      const res = await createActivity(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      setText("");
      onOpenChange(false);
      onSaved?.();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notiz hinzufuegen</SheetTitle>
          <SheetDescription>
            Schnelle Freitext-Notiz fuer diesen Deal. Wird in der Timeline + Wissensbasis indexiert.
          </SheetDescription>
        </SheetHeader>
        <div className="px-6 py-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            autoFocus
            placeholder="Was ist passiert? Stichworte reichen — die KI nutzt das spaeter."
            className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20"
          />
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-[#120774] to-[#4454b8] text-sm font-bold text-white hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Notiz speichern"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
