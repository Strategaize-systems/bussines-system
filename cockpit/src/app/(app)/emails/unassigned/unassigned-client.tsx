"use client";

import { useState } from "react";
import { assignEmailToContact, dismissUnassignedEmail } from "./actions";
import type { InboxEmail } from "../imap-actions";

type ContactOption = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
};

export function UnassignedQueueClient({
  emails,
  contacts,
}: {
  emails: InboxEmail[];
  contacts: ContactOption[];
}) {
  const [search, setSearch] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.company?.toLowerCase().includes(q) ?? false)
    );
  });

  const filteredEmails = emails.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.from_address?.toLowerCase().includes(q) ?? false) ||
      (e.from_name?.toLowerCase().includes(q) ?? false) ||
      (e.subject?.toLowerCase().includes(q) ?? false)
    );
  });

  async function handleAssign(emailId: string, contactId: string) {
    const result = await assignEmailToContact(emailId, contactId);
    if (result.error) {
      alert(`Fehler: ${result.error}`);
    }
    setAssigningId(null);
    setContactSearch("");
  }

  async function handleDismiss(emailId: string, classification: "spam" | "newsletter") {
    const result = await dismissUnassignedEmail(emailId, classification);
    if (result.error) {
      alert(`Fehler: ${result.error}`);
    }
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">Keine nicht-zugeordneten E-Mails</p>
        <p className="text-sm mt-1">Alle relevanten E-Mails sind einem Kontakt zugeordnet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="E-Mails durchsuchen..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm"
      />

      <div className="border rounded-lg divide-y">
        {filteredEmails.map((email) => (
          <div key={email.id} className="p-4 hover:bg-muted/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {email.from_name || email.from_address}
                  </span>
                  {email.from_name && (
                    <span className="text-xs text-muted-foreground truncate">
                      &lt;{email.from_address}&gt;
                    </span>
                  )}
                </div>
                <p className="text-sm mt-0.5 truncate">{email.subject || "(kein Betreff)"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(email.received_at).toLocaleString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {email.classification && email.classification !== "unclassified" && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-xs">
                      {email.classification}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {assigningId === email.id ? (
                  <div className="w-64 space-y-1">
                    <input
                      type="text"
                      placeholder="Kontakt suchen..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-xs"
                      autoFocus
                    />
                    <div className="max-h-40 overflow-y-auto border rounded bg-background">
                      {filteredContacts.slice(0, 10).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleAssign(email.id, c.id)}
                          className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted truncate"
                        >
                          {c.name}
                          {c.company && <span className="text-muted-foreground"> — {c.company}</span>}
                          {c.email && <span className="text-muted-foreground"> ({c.email})</span>}
                        </button>
                      ))}
                      {filteredContacts.length === 0 && (
                        <p className="px-2 py-1.5 text-xs text-muted-foreground">Kein Kontakt gefunden</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setAssigningId(null); setContactSearch(""); }}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setAssigningId(email.id)}
                      className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      Zuordnen
                    </button>
                    <button
                      onClick={() => handleDismiss(email.id, "spam")}
                      className="px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                      title="Als Spam markieren"
                    >
                      Spam
                    </button>
                    <button
                      onClick={() => handleDismiss(email.id, "newsletter")}
                      className="px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                      title="Als Newsletter markieren"
                    >
                      Newsletter
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
