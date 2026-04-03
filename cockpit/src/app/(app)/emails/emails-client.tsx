"use client";

import { useState, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  User,
  Building2,
  Calendar,
} from "lucide-react";
import { EmailSheet } from "./email-sheet";
import { updateFollowUpStatus, deleteEmail, type Email } from "./actions";
import Link from "next/link";

const selectClass = "select-premium";

const followUpConfig: Record<string, { label: string; color: string }> = {
  none: { label: "Kein Follow-up", color: "" },
  pending: { label: "Offen", color: "bg-yellow-100 text-yellow-800" },
  replied: { label: "Beantwortet", color: "bg-green-100 text-green-800" },
  overdue: { label: "Überfällig", color: "bg-red-100 text-red-800" },
};

interface EmailsClientProps {
  emails: Email[];
}

export function EmailsClient({ emails }: EmailsClientProps) {
  const [followUpFilter, setFollowUpFilter] = useState("");

  const today = new Date().toISOString().split("T")[0];

  // Mark overdue follow-ups client-side
  const emailsWithOverdue = useMemo(() => {
    return emails.map((e) => ({
      ...e,
      follow_up_status:
        e.follow_up_status === "pending" && e.follow_up_date && e.follow_up_date < today
          ? "overdue"
          : e.follow_up_status,
    }));
  }, [emails, today]);

  const filtered = useMemo(() => {
    if (!followUpFilter) return emailsWithOverdue;
    return emailsWithOverdue.filter((e) => e.follow_up_status === followUpFilter);
  }, [emailsWithOverdue, followUpFilter]);

  const sentCount = emails.filter((e) => e.status === "sent").length;
  const pendingFollowUps = emailsWithOverdue.filter((e) => e.follow_up_status === "pending").length;
  const overdueFollowUps = emailsWithOverdue.filter((e) => e.follow_up_status === "overdue").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">E-Mails</h1>
          <p className="text-sm font-medium text-slate-500">
            {emails.length} E-Mails gesamt
          </p>
        </div>
        <EmailSheet />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card stat-card-primary">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-50 p-2">
              <Send className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">{sentCount}</div>
              <div className="text-[11px] font-medium text-slate-500">Gesendet</div>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-50 p-2">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">{pendingFollowUps}</div>
              <div className="text-[11px] font-medium text-slate-500">Follow-ups offen</div>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-danger">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-50 p-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">{overdueFollowUps}</div>
              <div className="text-[11px] font-medium text-slate-500">Überfällig</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={followUpFilter}
          onChange={(e) => setFollowUpFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">Alle E-Mails</option>
          <option value="pending">Follow-up offen</option>
          <option value="overdue">Überfällig</option>
          <option value="replied">Beantwortet</option>
          <option value="none">Kein Follow-up</option>
        </select>
        {followUpFilter && (
          <span className="text-sm font-medium text-slate-500">
            {filtered.length} von {emails.length}
          </span>
        )}
      </div>

      {/* Email List */}
      <div className="space-y-2">
        {filtered.length > 0 ? (
          filtered.map((email) => (
            <EmailItem key={email.id} email={email} />
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Keine E-Mails gefunden.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function EmailItem({ email }: { email: Email }) {
  const [isPending, startTransition] = useTransition();
  const fu = followUpConfig[email.follow_up_status] ?? followUpConfig.none;

  const handleMarkReplied = () => {
    startTransition(async () => {
      await updateFollowUpStatus(email.id, "replied");
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteEmail(email.id);
    });
  };

  return (
    <Card className={email.follow_up_status === "overdue" ? "border-red-300 bg-red-50/50" : ""}>
      <CardContent className="flex items-start gap-3 p-3">
        <Mail className={`mt-0.5 h-4 w-4 shrink-0 ${email.status === "sent" ? "text-blue-500" : "text-muted-foreground"}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{email.subject || "(Kein Betreff)"}</span>
            {email.status === "draft" && (
              <Badge variant="outline" className="text-[10px]">Entwurf</Badge>
            )}
            {fu.color && (
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${fu.color}`}>
                {fu.label}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            An: {email.to_address}
          </p>

          {email.body && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {email.body}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
            {email.sent_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(email.sent_at).toLocaleDateString("de-DE", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            )}
            {email.contacts && (
              <Link href={`/contacts/${email.contacts.id}`} className="flex items-center gap-1 hover:underline">
                <User className="h-3 w-3" />
                {email.contacts.first_name} {email.contacts.last_name}
              </Link>
            )}
            {email.companies && (
              <Link href={`/companies/${email.companies.id}`} className="flex items-center gap-1 hover:underline">
                <Building2 className="h-3 w-3" />
                {email.companies.name}
              </Link>
            )}
            {email.follow_up_date && (
              <span className={`flex items-center gap-1 ${email.follow_up_status === "overdue" ? "text-red-600 font-medium" : ""}`}>
                <Clock className="h-3 w-3" />
                Follow-up: {new Date(email.follow_up_date).toLocaleDateString("de-DE")}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-start gap-1 shrink-0">
          {(email.follow_up_status === "pending" || email.follow_up_status === "overdue") && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={handleMarkReplied}
              disabled={isPending}
              title="Als beantwortet markieren"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleDelete}
            disabled={isPending}
            title="Löschen"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
