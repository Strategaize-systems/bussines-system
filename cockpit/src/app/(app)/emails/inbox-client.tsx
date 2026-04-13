"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Inbox, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { InboxList } from "./inbox-list";
import { EmailDetail } from "./email-detail";
import { getInboxEmails, type InboxEmail } from "./imap-actions";

// ------------------------------------------------------------------
// Tab-based wrapper: Empfangen (IMAP) | Gesendet (legacy)
// ------------------------------------------------------------------

interface InboxClientProps {
  sentContent: React.ReactNode;
}

export function InboxClient({ sentContent }: InboxClientProps) {
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState<InboxEmail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [isLoading, startTransition] = useTransition();

  const loadEmails = useCallback(() => {
    startTransition(async () => {
      const result = await getInboxEmails({
        search: searchQuery || undefined,
        unassignedOnly: showUnassigned,
        limit: 50,
      });
      setEmails(result.emails);
      setTotal(result.total);
    });
  }, [searchQuery, showUnassigned]);

  // Load on mount and when filters change
  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  // Reload after assignment
  const handleSelect = (email: InboxEmail) => {
    setSelectedEmail(email);
  };

  const handleBack = () => {
    setSelectedEmail(null);
    // Reload to reflect read status & assignments
    loadEmails();
  };

  const unreadCount = emails.filter((e) => !e.is_read).length;

  return (
    <div className="min-h-screen">
      {/* Tab bar */}
      <div className="border-b border-slate-200 bg-white px-8">
        <div className="max-w-[1800px] mx-auto flex items-center gap-0">
          <TabButton
            active={activeTab === "inbox"}
            onClick={() => { setActiveTab("inbox"); setSelectedEmail(null); }}
            icon={<Inbox size={15} />}
            label="Empfangen"
            badge={unreadCount > 0 ? unreadCount : undefined}
          />
          <TabButton
            active={activeTab === "sent"}
            onClick={() => { setActiveTab("sent"); setSelectedEmail(null); }}
            icon={<Send size={15} />}
            label="Gesendet"
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === "sent" ? (
        sentContent
      ) : (
        <main className="px-8 py-6">
          <div className="max-w-[1800px] mx-auto">
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
              {selectedEmail ? (
                <EmailDetail email={selectedEmail} onBack={handleBack} />
              ) : (
                <InboxList
                  emails={emails}
                  total={total}
                  selectedId={undefined}
                  onSelect={handleSelect}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  showUnassignedOnly={showUnassigned}
                  onToggleUnassigned={() => setShowUnassigned(!showUnassigned)}
                />
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Tab button
// ------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 -mb-px",
        active
          ? "text-[#4454b8] border-[#4454b8]"
          : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300"
      )}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}
