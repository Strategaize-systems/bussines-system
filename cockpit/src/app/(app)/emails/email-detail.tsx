"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  ArrowLeft, Mail, User, Building2, Briefcase, Paperclip,
  Clock, ChevronDown, ChevronUp, Link2, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InboxEmail } from "./imap-actions";
import { getEmailThread, assignEmailToContact, assignEmailToCompany, assignEmailToDeal, searchContacts, searchDeals } from "./imap-actions";
import Link from "next/link";

// ------------------------------------------------------------------
// Props
// ------------------------------------------------------------------

interface EmailDetailProps {
  email: InboxEmail;
  onBack: () => void;
}

export function EmailDetail({ email, onBack }: EmailDetailProps) {
  const [threadMessages, setThreadMessages] = useState<InboxEmail[]>([]);
  const [showThread, setShowThread] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [, startTransition] = useTransition();

  // Load thread if exists
  useEffect(() => {
    if (email.thread_id) {
      getEmailThread(email.thread_id).then((result) => {
        setThreadMessages(result.messages);
        setShowThread(result.messages.length > 1);
      });
    } else {
      setThreadMessages([email]);
      setShowThread(false);
    }
  }, [email]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={onBack} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <ArrowLeft size={16} className="text-slate-500" />
          </button>
          <h2 className="text-base font-bold text-slate-900 truncate flex-1">
            {email.subject || "(Kein Betreff)"}
          </h2>
        </div>

        {/* Metadata */}
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 w-10 shrink-0">Von:</span>
            <span className="font-medium text-slate-800">
              {email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 w-10 shrink-0">An:</span>
            <span className="text-slate-700">{email.to_addresses?.join(", ")}</span>
          </div>
          {email.cc_addresses && email.cc_addresses.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-10 shrink-0">CC:</span>
              <span className="text-slate-700">{email.cc_addresses.join(", ")}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-slate-400" />
            <span className="text-xs text-slate-500">
              {new Date(email.received_at).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Assignment badges */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {email.contact ? (
            <Link
              href={`/contacts/${email.contact.id}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              <User size={11} />
              {email.contact.first_name} {email.contact.last_name}
              <ExternalLink size={9} />
            </Link>
          ) : null}

          {email.company ? (
            <Link
              href={`/companies/${email.company.id}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium hover:bg-purple-100 transition-colors"
            >
              <Building2 size={11} />
              {email.company.name}
              <ExternalLink size={9} />
            </Link>
          ) : null}

          {email.deal ? (
            <Link
              href={`/deals/${email.deal.id}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
            >
              <Briefcase size={11} />
              {email.deal.title}
              <ExternalLink size={9} />
            </Link>
          ) : null}

          <button
            onClick={() => setShowAssign(!showAssign)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
          >
            <Link2 size={11} />
            Zuordnen
          </button>
        </div>

        {/* Assignment panel */}
        {showAssign && (
          <AssignmentPanel
            emailId={email.id}
            onDone={() => setShowAssign(false)}
          />
        )}
      </div>

      {/* Attachments */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Paperclip size={11} />
            <span className="font-medium">{email.attachments.length} Anhang/Anhänge</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {email.attachments.map((att, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] text-slate-600">
                {att.filename} ({formatBytes(att.size_bytes)})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Thread toggle */}
      {threadMessages.length > 1 && (
        <button
          onClick={() => setShowThread(!showThread)}
          className="flex items-center gap-1 px-4 py-2 text-xs text-[#4454b8] font-medium border-b border-slate-100 hover:bg-slate-50 transition-colors"
        >
          {showThread ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {threadMessages.length} Nachrichten in diesem Thread
        </button>
      )}

      {/* Body / Thread */}
      <div className="flex-1 overflow-y-auto">
        {showThread && threadMessages.length > 1 ? (
          <div className="divide-y divide-slate-100">
            {threadMessages.map((msg) => (
              <ThreadMessage key={msg.id} message={msg} isActive={msg.id === email.id} />
            ))}
          </div>
        ) : (
          <div className="p-4">
            <EmailBody email={email} />
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Thread message
// ------------------------------------------------------------------

function ThreadMessage({ message, isActive }: { message: InboxEmail; isActive: boolean }) {
  const [expanded, setExpanded] = useState(isActive);

  return (
    <div className={cn("transition-colors", isActive && "bg-blue-50/20")}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
      >
        <Mail size={14} className={cn(isActive ? "text-blue-500" : "text-slate-300")} />
        <div className="flex-1 min-w-0">
          <span className={cn("text-sm truncate", isActive ? "font-bold" : "font-medium text-slate-600")}>
            {message.from_name || message.from_address}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 shrink-0">
          {new Date(message.received_at).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {expanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pl-10">
          <EmailBody email={message} />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Email body renderer
// ------------------------------------------------------------------

function EmailBody({ email }: { email: InboxEmail }) {
  if (email.body_html) {
    return (
      <div
        className="prose prose-sm max-w-none text-slate-700 [&_a]:text-blue-600 [&_img]:max-w-full"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.body_html) }}
      />
    );
  }

  return (
    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
      {email.body_text || "(Kein Inhalt)"}
    </pre>
  );
}

// ------------------------------------------------------------------
// Assignment panel
// ------------------------------------------------------------------

function AssignmentPanel({ emailId, onDone }: { emailId: string; onDone: () => void }) {
  const [type, setType] = useState<"contact" | "deal">("contact");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; label: string }[]>([]);
  const [isPending, startTransition] = useTransition();

  const doSearch = useCallback((q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      if (type === "contact") {
        const contacts = await searchContacts(q);
        setResults(contacts.map((c) => ({ id: c.id, label: `${c.first_name} ${c.last_name}${c.email ? ` (${c.email})` : ""}` })));
      } else {
        const deals = await searchDeals(q);
        setResults(deals.map((d) => ({ id: d.id, label: d.title })));
      }
    });
  }, [type]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const handleAssign = (targetId: string) => {
    startTransition(async () => {
      if (type === "contact") {
        await assignEmailToContact(emailId, targetId);
      } else {
        await assignEmailToDeal(emailId, targetId);
      }
      onDone();
    });
  };

  return (
    <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
      <div className="flex items-center gap-1">
        <button
          onClick={() => { setType("contact"); setResults([]); setQuery(""); }}
          className={cn("px-2 py-0.5 rounded text-[11px] font-bold transition-colors", type === "contact" ? "bg-[#4454b8] text-white" : "bg-white text-slate-600")}
        >
          Kontakt
        </button>
        <button
          onClick={() => { setType("deal"); setResults([]); setQuery(""); }}
          className={cn("px-2 py-0.5 rounded text-[11px] font-bold transition-colors", type === "deal" ? "bg-[#4454b8] text-white" : "bg-white text-slate-600")}
        >
          Deal
        </button>
      </div>
      <input
        type="text"
        placeholder={type === "contact" ? "Kontakt suchen..." : "Deal suchen..."}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-2.5 py-1.5 text-sm rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4454b8]/20"
      />
      {results.length > 0 && (
        <div className="max-h-32 overflow-y-auto divide-y divide-slate-100 rounded border border-slate-200 bg-white">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleAssign(r.id)}
              disabled={isPending}
              className="w-full text-left px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers for security
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
