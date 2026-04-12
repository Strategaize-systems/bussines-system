"use client";

import { Mail, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import type { EmailSyncState } from "@/types/email";

interface ImapStatusProps {
  syncState: EmailSyncState | null;
}

export function ImapStatus({ syncState }: ImapStatusProps) {
  if (!syncState) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
            <Mail className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">IMAP-Sync</p>
            <p className="text-sm text-slate-500">
              Noch nicht konfiguriert — Env Vars IMAP_HOST, IMAP_USER,
              IMAP_PASSWORD setzen
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isError = syncState.status === "error";
  const isSyncing = syncState.status === "syncing";
  const lastSync = syncState.last_sync_at
    ? new Date(syncState.last_sync_at).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "nie";

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm ${
        isError ? "border-red-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            isError
              ? "bg-red-100"
              : isSyncing
                ? "bg-blue-100"
                : "bg-green-100"
          }`}
        >
          {isError ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : isSyncing ? (
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">IMAP-Sync</p>
          <p className="text-sm text-slate-500">
            {isSyncing ? "Synchronisiert..." : `Letzter Sync: ${lastSync}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">
            {syncState.emails_synced_total}
          </p>
          <p className="text-xs text-slate-500">E-Mails synchronisiert</p>
        </div>
      </div>
      {isError && syncState.error_message && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2">
          <p className="text-xs text-red-700">{syncState.error_message}</p>
        </div>
      )}
    </div>
  );
}
