"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Mail, Send, Clock, AlertCircle, CheckCircle2, Trash2, Plus, Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { EmailSheet } from "./email-sheet";
import type { EmailTemplateOption } from "./email-compose";
import { updateFollowUpStatus, deleteEmail, type Email } from "./actions";
import Link from "next/link";

const followUpConfig: Record<string, { label: string; variant: string }> = {
  none: { label: "Kein Follow-up", variant: "bg-slate-100 text-slate-600 border-slate-200" },
  pending: { label: "Offen", variant: "bg-amber-100 text-amber-700 border-amber-200" },
  replied: { label: "Beantwortet", variant: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  overdue: { label: "Überfällig", variant: "bg-red-100 text-red-700 border-red-200" },
};

interface EmailsClientProps { emails: Email[]; templates?: EmailTemplateOption[]; }

export function EmailsClient({ emails, templates }: EmailsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState("");
  const [showNewEmail, setShowNewEmail] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const emailsWithOverdue = useMemo(() => emails.map((e) => ({
    ...e,
    follow_up_status: e.follow_up_status === "pending" && e.follow_up_date && e.follow_up_date < today ? "overdue" : e.follow_up_status,
  })), [emails, today]);

  const filtered = useMemo(() => {
    let result = emailsWithOverdue;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => (e.subject || "").toLowerCase().includes(q) || (e.to_address || "").toLowerCase().includes(q));
    }
    if (followUpFilter) result = result.filter((e) => e.follow_up_status === followUpFilter);
    return result;
  }, [emailsWithOverdue, searchQuery, followUpFilter]);

  return (
    <div className="min-h-screen">
      <PageHeader title="E-Mails" subtitle={`${emails.length} E-Mails gesamt`}>
        <button onClick={() => setShowNewEmail(true)} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00a84f] to-[#4dcb8b] text-white text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2">
          <Plus size={16} strokeWidth={2.5} /> Neue E-Mail
        </button>
      </PageHeader>
      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          <KPIGrid columns={3}>
            <KPICard label="Gesendet" value={emails.filter((e) => e.status === "sent").length} icon={Send} gradient="blue" />
            <KPICard label="Follow-ups offen" value={emailsWithOverdue.filter((e) => e.follow_up_status === "pending").length} icon={Clock} gradient="yellow" />
            <KPICard label="Überfällig" value={emailsWithOverdue.filter((e) => e.follow_up_status === "overdue").length} icon={AlertCircle} gradient="red" />
          </KPIGrid>
          <FilterBar searchPlaceholder="E-Mail suchen..." searchValue={searchQuery} onSearchChange={setSearchQuery}>
            <FilterSelect value={followUpFilter} onChange={setFollowUpFilter} options={[
              { value: "", label: "Alle E-Mails" }, { value: "pending", label: "Follow-up offen" },
              { value: "overdue", label: "Überfällig" }, { value: "replied", label: "Beantwortet" },
            ]} />
          </FilterBar>
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
            {filtered.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filtered.map((email) => <EmailRow key={email.id} email={email} />)}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Mail size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">Keine E-Mails gefunden</p>
              </div>
            )}
          </div>
        </div>
      </main>
      {showNewEmail && <EmailSheet defaultOpen onOpenChange={(open: boolean) => { if (!open) setShowNewEmail(false); }} templates={templates} />}
    </div>
  );
}

function EmailRow({ email }: { email: Email }) {
  const [isPending, startTransition] = useTransition();
  const fu = followUpConfig[email.follow_up_status] ?? followUpConfig.none;
  return (
    <div className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group ${email.follow_up_status === "overdue" ? "bg-red-50/30" : ""}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${email.status === "sent" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
        <Mail size={18} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-900 truncate">{email.subject || "(Kein Betreff)"}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-slate-500 truncate">An: {email.to_address}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${fu.variant}`}>{fu.label}</span>
        </div>
      </div>
      {email.sent_at && (
        <div className="text-right shrink-0 w-24">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Gesendet</div>
          <div className="text-xs font-semibold text-slate-600">{new Date(email.sent_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</div>
        </div>
      )}
      {email.contacts && (
        <Link href={`/contacts/${email.contacts.id}`} className="text-xs font-medium text-slate-600 shrink-0 hover:text-[#4454b8]" onClick={(e) => e.stopPropagation()}>
          {email.contacts.first_name} {email.contacts.last_name}
        </Link>
      )}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {(email.follow_up_status === "pending" || email.follow_up_status === "overdue") && (
          <button onClick={() => startTransition(async () => { await updateFollowUpStatus(email.id, "replied"); })} disabled={isPending} className="p-1.5 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
            <CheckCircle2 size={14} />
          </button>
        )}
        <button onClick={() => startTransition(async () => { await deleteEmail(email.id); })} disabled={isPending} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
