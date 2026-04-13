"use client";

import { useState, useTransition } from "react";
import {
  Mail, MailOpen, Paperclip, User, Building2, Briefcase, Search,
  ChevronRight, Inbox, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InboxEmail } from "./imap-actions";
import { markEmailRead, reclassifyEmail } from "./imap-actions";

// ------------------------------------------------------------------
// Classification & priority badges
// ------------------------------------------------------------------

const classificationConfig: Record<string, { label: string; color: string }> = {
  unclassified: { label: "Neu", color: "bg-slate-100 text-slate-600" },
  anfrage: { label: "Anfrage", color: "bg-blue-100 text-blue-700" },
  antwort: { label: "Antwort", color: "bg-green-100 text-green-700" },
  auto_reply: { label: "Auto-Reply", color: "bg-gray-100 text-gray-500" },
  newsletter: { label: "Newsletter", color: "bg-purple-100 text-purple-600" },
  intern: { label: "Intern", color: "bg-teal-100 text-teal-600" },
  spam: { label: "Spam", color: "bg-red-100 text-red-600" },
};

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  dringend: { label: "Dringend", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-700", dot: "bg-blue-400" },
  niedrig: { label: "Niedrig", color: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
  irrelevant: { label: "Irrelevant", color: "bg-slate-50 text-slate-400", dot: "bg-slate-300" },
};

// ------------------------------------------------------------------
// Props
// ------------------------------------------------------------------

interface InboxListProps {
  emails: InboxEmail[];
  total: number;
  selectedId?: string;
  onSelect: (email: InboxEmail) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  showUnassignedOnly: boolean;
  onToggleUnassigned: () => void;
}

export function InboxList({
  emails,
  total,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  showUnassignedOnly,
  onToggleUnassigned,
}: InboxListProps) {
  const [, startTransition] = useTransition();
  const unreadCount = emails.filter((e) => !e.is_read).length;

  const handleSelect = (email: InboxEmail) => {
    onSelect(email);
    if (!email.is_read) {
      startTransition(async () => {
        await markEmailRead(email.id, true);
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filter bar */}
      <div className="p-3 border-b border-slate-200 space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="E-Mail suchen..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4454b8]/20 focus:border-[#4454b8]"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {total} E-Mails{unreadCount > 0 ? ` · ${unreadCount} ungelesen` : ""}
          </span>
          <button
            onClick={onToggleUnassigned}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
              showUnassignedOnly
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            <Filter size={10} />
            Unzugeordnet
          </button>
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Inbox size={32} className="mb-2" />
            <p className="text-sm font-medium">Keine E-Mails</p>
            <p className="text-xs mt-1">
              {showUnassignedOnly ? "Keine unzugeordneten E-Mails" : "Posteingang ist leer"}
            </p>
          </div>
        ) : (
          emails.map((email) => (
            <InboxRow
              key={email.id}
              email={email}
              isSelected={email.id === selectedId}
              onClick={() => handleSelect(email)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Single email row
// ------------------------------------------------------------------

function InboxRow({
  email,
  isSelected,
  onClick,
}: {
  email: InboxEmail;
  isSelected: boolean;
  onClick: () => void;
}) {
  const cls = classificationConfig[email.classification] ?? classificationConfig.unclassified;
  const hasAttachments = email.attachments && email.attachments.length > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer",
        isSelected && "bg-[#4454b8]/5 border-l-2 border-[#4454b8]",
        !email.is_read && "bg-blue-50/30"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Read indicator */}
        <div className="pt-1 shrink-0">
          {email.is_read ? (
            <MailOpen size={16} className="text-slate-300" />
          ) : (
            <Mail size={16} className="text-blue-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* From + date */}
          <div className="flex items-center justify-between gap-2">
            <span className={cn("text-sm truncate", !email.is_read ? "font-bold text-slate-900" : "font-medium text-slate-700")}>
              {email.from_name || email.from_address}
            </span>
            <span className="text-[10px] text-slate-400 shrink-0">
              {formatRelativeDate(email.received_at)}
            </span>
          </div>

          {/* Subject */}
          <p className={cn("text-[13px] truncate mt-0.5", !email.is_read ? "font-semibold text-slate-800" : "text-slate-600")}>
            {email.subject || "(Kein Betreff)"}
          </p>

          {/* Preview */}
          {email.body_text && (
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {email.body_text.substring(0, 120)}
            </p>
          )}

          {/* Gatekeeper summary */}
          {email.gatekeeper_summary && (
            <p className="text-[10px] text-violet-500 truncate mt-0.5 italic">
              KI: {email.gatekeeper_summary}
            </p>
          )}

          {/* Bottom row: badges */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold", cls.color)}>
              {cls.label}
            </span>

            {email.classification !== "unclassified" && email.priority && email.priority !== "normal" && (
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold",
                priorityConfig[email.priority]?.color ?? "bg-slate-100 text-slate-500"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", priorityConfig[email.priority]?.dot ?? "bg-slate-400")} />
                {priorityConfig[email.priority]?.label ?? email.priority}
              </span>
            )}

            {email.contact && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600">
                <User size={9} />
                {email.contact.first_name} {email.contact.last_name}
              </span>
            )}

            {email.company && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600">
                <Building2 size={9} />
                {email.company.name}
              </span>
            )}

            {email.deal && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600">
                <Briefcase size={9} />
                {email.deal.title}
              </span>
            )}

            {hasAttachments && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                <Paperclip size={9} />
                {email.attachments.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0 mt-1">
          <ChevronRight size={14} className="text-slate-300" />
          {email.classification !== "unclassified" && (
            <ReclassifyButton emailId={email.id} currentClassification={email.classification} currentPriority={email.priority} />
          )}
        </div>
      </div>
    </button>
  );
}

// ------------------------------------------------------------------
// Date formatting
// ------------------------------------------------------------------

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min`;
  if (diffHours < 24) return `vor ${diffHours} Std`;
  if (diffDays === 1) return "gestern";
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

// ------------------------------------------------------------------
// Reclassify button
// ------------------------------------------------------------------

function ReclassifyButton({
  emailId,
  currentClassification,
  currentPriority,
}: {
  emailId: string;
  currentClassification: string;
  currentPriority: string;
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const classifications = ["anfrage", "antwort", "auto_reply", "newsletter", "intern", "spam"] as const;
  const priorities = ["dringend", "normal", "niedrig", "irrelevant"] as const;

  const handleReclassify = (cls: string, prio: string) => {
    startTransition(async () => {
      await reclassifyEmail(emailId, cls as any, prio as any);
      setOpen(false);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-[9px] text-slate-400 hover:text-violet-600 transition-colors"
        title="Umklassifizieren"
      >
        Korr.
      </button>
      {open && (
        <div
          className="absolute right-0 top-5 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 min-w-[200px]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Kategorie</p>
          <div className="flex flex-wrap gap-1 mb-3">
            {classifications.map((cls) => {
              const cfg = classificationConfig[cls];
              return (
                <button
                  key={cls}
                  onClick={() => handleReclassify(cls, currentPriority)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold transition-colors",
                    cls === currentClassification
                      ? "ring-2 ring-violet-400 " + (cfg?.color ?? "bg-slate-100")
                      : (cfg?.color ?? "bg-slate-100") + " hover:ring-1 hover:ring-slate-300"
                  )}
                >
                  {cfg?.label ?? cls}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Prioritaet</p>
          <div className="flex flex-wrap gap-1">
            {priorities.map((prio) => {
              const cfg = priorityConfig[prio];
              return (
                <button
                  key={prio}
                  onClick={() => handleReclassify(currentClassification, prio)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold transition-colors",
                    prio === currentPriority
                      ? "ring-2 ring-violet-400 " + (cfg?.color ?? "bg-slate-100")
                      : (cfg?.color ?? "bg-slate-100") + " hover:ring-1 hover:ring-slate-300"
                  )}
                >
                  {cfg?.label ?? prio}
                </button>
              );
            })}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            className="mt-2 w-full text-center text-[10px] text-slate-400 hover:text-slate-600"
          >
            Schliessen
          </button>
        </div>
      )}
    </div>
  );
}
