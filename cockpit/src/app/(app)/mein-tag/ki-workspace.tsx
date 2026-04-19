"use client";

import { useState } from "react";
import {
  Sparkles,
  History,
  Eye,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  Mail,
  Phone,
  ListTodo,
  Kanban,
  ArrowRightLeft,
  StickyNote,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiLoadButton } from "@/components/ai/ai-load-button";
import { AiResultPanel } from "@/components/ai/ai-result-panel";
import { MeinTagSearchBar } from "@/components/mein-tag/mein-tag-search-bar";
import { TaskSheet } from "../aufgaben/task-sheet";
import { EmailSheet } from "../emails/email-sheet";
import { MeetingSheet } from "@/components/meetings/meeting-sheet";
import { FollowupSuggestions } from "./followup-suggestions";
import { InsightSuggestions } from "./insight-suggestions";
import { getYesterdayReview, getUnseenEvents, updateLastLogin } from "./actions";
import type { TodayData, CalendarSlot, ExceptionData, YesterdayReview, UnseenEvents } from "./actions";
import type { DailySummary, ClassifiedEvent } from "@/lib/ai/types";
import type { AIActionQueueItem } from "@/types/ai-queue";

type WorkspaceTab = "tagesanalyse" | "gestern" | "seit-login" | "wiedervorlagen";

type ClassifiedItem = {
  id: string;
  title: string;
  type: string;
  detail?: string;
  contactName?: string | null;
  companyName?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  classification?: "informativ" | "aktion";
  suggestedAction?: "email" | "anruf" | "task" | "meeting" | null;
  reason?: string;
};

const actionOptions = [
  { value: "email", label: "E-Mail" },
  { value: "anruf", label: "Anruf" },
  { value: "task", label: "Aufgabe" },
  { value: "meeting", label: "Meeting" },
];

interface SearchContext {
  todaysTasks: Array<{ title: string; priority?: string; dueDate?: string; contactName?: string; companyName?: string }>;
  topDeals: Array<{ title: string; value?: number; stage?: string; companyName?: string; nextAction?: string }>;
  calendarSlots: Array<{ time: string; title: string; type: string }>;
  stagnantDeals: Array<{ title: string; daysSinceUpdate: number; value?: number; stage?: string }>;
  overdueTasks: Array<{ title: string; dueDate: string }>;
}

interface KIWorkspaceProps {
  data: TodayData;
  calendarSlots: CalendarSlot[];
  exceptions: ExceptionData;
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  searchContext: SearchContext;
  followupSuggestions: AIActionQueueItem[];
  insightSuggestions: AIActionQueueItem[];
}

export function KIWorkspace({ data, calendarSlots, exceptions, contacts, companies, deals, searchContext, followupSuggestions, insightSuggestions }: KIWorkspaceProps) {
  const [wsTab, setWsTab] = useState<WorkspaceTab>("tagesanalyse");

  // Tagesanalyse state
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Gestern state
  const [yesterdayData, setYesterdayData] = useState<YesterdayReview | null>(null);
  const [yesterdayClassified, setYesterdayClassified] = useState<ClassifiedItem[]>([]);
  const [yesterdayLoading, setYesterdayLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Seit Login state
  const [unseenData, setUnseenData] = useState<UnseenEvents | null>(null);
  const [unseenClassified, setUnseenClassified] = useState<ClassifiedItem[]>([]);
  const [unseenLoading, setUnseenLoading] = useState(false);

  // ── Tagesanalyse loader ─────────────────────
  const loadSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);

    const [yesterdayReview, unseenEvts] = await Promise.all([
      getYesterdayReview(),
      getUnseenEvents(),
    ]);

    const allItems = [...data.overdue, ...data.today, ...data.upcoming];
    const context = {
      todaysTasks: allItems.map((item) => ({
        title: item.title,
        priority: item.priority ?? undefined,
        dueDate: item.dueDate ?? undefined,
      })),
      upcomingMeetings: calendarSlots
        .filter((s) => s.type === "Meeting" || s.type === "Call")
        .map((s) => ({ title: s.title, time: s.time, attendees: s.sub ? [s.sub] : undefined })),
      stagnantDeals: exceptions.stagnantDeals.map((d) => ({
        name: d.title, daysSinceLastActivity: d.daysSinceUpdate, value: d.value ?? undefined, stage: d.stage ?? undefined,
      })),
      overdueItems: [
        ...exceptions.overdueTasks.map((t) => ({ title: t.title, dueDate: t.dueDate, type: "task" as const })),
        ...exceptions.overdueDeals.map((d) => ({ title: `${d.nextAction} (${d.title})`, dueDate: d.nextActionDate, type: "deal_action" as const })),
      ],
      yesterdayCompleted: yesterdayReview.completed.map((i) => ({ title: i.title, type: i.type })),
      yesterdayMissed: yesterdayReview.missed.map((i) => ({ title: i.title })),
      unseenEvents: [
        ...unseenEvts.newDeals.map((e) => ({ description: e.context || "Neuer Deal", type: "Neuer Deal" })),
        ...unseenEvts.stageChanges.map((e) => ({ description: e.context || "Stage-Wechsel", type: "Stage-Wechsel" })),
      ],
    };

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "daily-summary", context }),
      });
      if (res.status === 429) { setSummaryError("Rate Limit erreicht."); return; }
      if (!res.ok) { setSummaryError("KI-Service nicht verfuegbar."); return; }
      const json = await res.json();
      if (json.success && json.data) { setSummary(json.data); }
      else { setSummaryError(json.error || "Unbekannter Fehler."); }
    } catch { setSummaryError("Verbindungsfehler."); }
    finally { setSummaryLoading(false); }
  };

  // ── Gestern loader ─────────────────────
  const loadYesterday = async () => {
    setYesterdayLoading(true);
    try {
      const review = await getYesterdayReview();
      setYesterdayData(review);

      // Build items for KI classification
      const items = [
        ...review.missed.map((m) => ({
          id: `missed-${m.id}`, type: "Verpasste Aufgabe", title: m.title,
          detail: "Gestern faellig, nicht erledigt",
          contactName: m.contactName, companyName: m.companyName,
        })),
        ...review.completed.map((c) => ({
          id: `done-${c.id}`, type: `Erledigte ${c.type === "task" ? "Aufgabe" : c.type === "meeting" ? "Meeting" : "E-Mail"}`,
          title: c.title, detail: "Gestern erledigt",
          contactName: c.contactName, companyName: c.companyName,
        })),
      ];

      if (items.length > 0) {
        // Classify via KI
        try {
          const res = await fetch("/api/ai/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "event-classify", context: { items: items.map((i) => ({ id: i.id, type: i.type, title: i.title, detail: i.detail, contactContext: i.contactName || undefined })) } }),
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data?.items) {
              const classMap = new Map<string, ClassifiedEvent>();
              for (const c of json.data.items) classMap.set(c.id, c);
              setYesterdayClassified(items.map((i) => {
                const c = classMap.get(i.id);
                return { ...i, classification: c?.classification ?? "informativ", suggestedAction: c?.suggestedAction ?? null, reason: c?.reason ?? "" };
              }));
              return;
            }
          }
        } catch { /* fallback to unclassified */ }
        // Fallback: missed = aktion, completed = informativ
        setYesterdayClassified(items.map((i) => ({
          ...i,
          classification: i.id.startsWith("missed-") ? "aktion" as const : "informativ" as const,
          suggestedAction: i.id.startsWith("missed-") ? "task" as const : null,
          reason: i.id.startsWith("missed-") ? "Liegengeblieben von gestern" : "Bereits erledigt",
        })));
      }
    } finally { setYesterdayLoading(false); }
  };

  // ── Seit Login loader ─────────────────────
  const loadUnseen = async () => {
    setUnseenLoading(true);
    try {
      const events = await getUnseenEvents();
      setUnseenData(events);
      await updateLastLogin();

      const items = [
        ...events.newDeals.map((e) => ({ id: `deal-${e.id}`, type: "Neuer Deal", title: e.context || "Neuer Deal", detail: undefined as string | undefined, contactName: null as string | null, companyName: null as string | null })),
        ...events.stageChanges.map((e) => ({ id: `stage-${e.id}`, type: "Stage-Wechsel", title: e.context || "Stage verschoben", detail: undefined as string | undefined, contactName: null as string | null, companyName: null as string | null })),
        ...events.otherChanges.slice(0, 5).map((e) => ({ id: `other-${e.id}`, type: `${e.entityType}: ${e.action}`, title: e.context || `${e.entityType} ${e.action}`, detail: undefined as string | undefined, contactName: null as string | null, companyName: null as string | null })),
      ];

      if (items.length > 0) {
        try {
          const res = await fetch("/api/ai/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "event-classify", context: { items: items.map((i) => ({ id: i.id, type: i.type, title: i.title })) } }),
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data?.items) {
              const classMap = new Map<string, ClassifiedEvent>();
              for (const c of json.data.items) classMap.set(c.id, c);
              setUnseenClassified(items.map((i) => {
                const c = classMap.get(i.id);
                return { ...i, classification: c?.classification ?? "informativ", suggestedAction: c?.suggestedAction ?? null, reason: c?.reason ?? "" };
              }));
              return;
            }
          }
        } catch { /* fallback */ }
        setUnseenClassified(items.map((i) => ({
          ...i, classification: "informativ" as const, suggestedAction: null, reason: "",
        })));
      }
    } finally { setUnseenLoading(false); }
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const visibleYesterday = yesterdayClassified.filter((i) => !dismissedIds.has(i.id));
  const visibleUnseen = unseenClassified.filter((i) => !dismissedIds.has(i.id));

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden min-h-[340px]">
      {/* Header: Title + Search Bar inline */}
      <div className="px-6 py-4 border-b border-slate-200 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide shrink-0">
            KI-Workspace
          </h3>
          {/* Inline Search + Voice */}
          <div className="flex-1 min-w-0">
            <MeinTagSearchBar
              todaysTasks={searchContext.todaysTasks}
              topDeals={searchContext.topDeals}
              calendarSlots={searchContext.calendarSlots}
              stagnantDeals={searchContext.stagnantDeals}
              overdueTasks={searchContext.overdueTasks}
            />
          </div>
        </div>
        {/* Shortcut Tabs */}
        <div className="flex items-center gap-1">
          {([
            { key: "tagesanalyse" as const, label: "Tagesanalyse", icon: Sparkles, badge: 0 },
            { key: "gestern" as const, label: "Gestern", icon: History, badge: 0 },
            { key: "seit-login" as const, label: "Seit Login", icon: Eye, badge: 0 },
            { key: "wiedervorlagen" as const, label: "Wiedervorlagen", icon: Lightbulb, badge: followupSuggestions.length + insightSuggestions.length },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setWsTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                wsTab === tab.key
                  ? "bg-[#4454b8] text-white"
                  : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <tab.icon size={12} />
              {tab.label}
              {tab.badge > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* ── TAB: Tagesanalyse ────────────────── */}
        {wsTab === "tagesanalyse" && (
          <>
            {!summary && !summaryLoading && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 mb-3">
                  Prioritaeten, Meeting-Vorbereitung und Warnungen auf einen Blick.
                </p>
                <AiLoadButton onClick={loadSummary} loading={false} loaded={false} label="Tagesanalyse starten" />
              </div>
            )}
            <AiResultPanel loading={summaryLoading} error={summaryError} onRetry={loadSummary} loadingMessage="Analysiere deinen Tag...">
              {summary && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed">{summary.greeting}</p>
                  {summary.priorities.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-[#4454b8] uppercase tracking-wide mb-2">Prioritaeten</p>
                      <ul className="space-y-1.5">
                        {summary.priorities.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="w-5 h-5 rounded-full bg-[#4454b8] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {summary.meetingPrep.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-2">Meeting-Vorbereitung</p>
                      <ul className="space-y-1">
                        {summary.meetingPrep.map((m, i) => (
                          <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                            <Calendar size={12} className="text-blue-400 shrink-0 mt-1" />{m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {summary.warnings.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-2">Warnungen</p>
                      <ul className="space-y-1">
                        {summary.warnings.map((w, i) => (
                          <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                            <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-1" />{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {summary.suggestedFocus && (
                    <div className="bg-gradient-to-r from-[#120774]/5 to-[#4454b8]/5 rounded-lg p-3 border border-[#4454b8]/10">
                      <p className="text-[10px] font-bold text-[#4454b8] uppercase tracking-wide mb-1">Empfohlener Fokus</p>
                      <p className="text-sm font-medium text-slate-800">{summary.suggestedFocus}</p>
                    </div>
                  )}
                </div>
              )}
            </AiResultPanel>
          </>
        )}

        {/* ── TAB: Gestern ────────────────── */}
        {wsTab === "gestern" && (
          <>
            {!yesterdayData && !yesterdayLoading && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 mb-3">
                  Was ist gestern passiert? Verpasste Aufgaben und erledigte Arbeit.
                </p>
                <AiLoadButton onClick={loadYesterday} loading={false} loaded={false} label="Analyse gestern starten" />
              </div>
            )}
            {yesterdayLoading && (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Lade und klassifiziere...</span>
              </div>
            )}
            {!yesterdayLoading && visibleYesterday.length === 0 && yesterdayData && (
              <p className="text-sm text-slate-400 py-4 text-center">Nichts Relevantes von gestern.</p>
            )}
            {!yesterdayLoading && visibleYesterday.length > 0 && (
              <div className="space-y-2">
                {visibleYesterday.map((item) => (
                  <ClassifiedEventRow
                    key={item.id}
                    item={item}
                    onDismiss={() => handleDismiss(item.id)}
                    contacts={contacts}
                    companies={companies}
                    deals={deals}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB: Seit Login ────────────────── */}
        {wsTab === "seit-login" && (
          <>
            {!unseenData && !unseenLoading && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 mb-3">
                  Was hat sich seit deinem letzten Login geaendert?
                </p>
                <AiLoadButton onClick={loadUnseen} loading={false} loaded={false} label="Analyse seit letztes Login starten" />
              </div>
            )}
            {unseenLoading && (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Lade und klassifiziere...</span>
              </div>
            )}
            {!unseenLoading && visibleUnseen.length === 0 && unseenData && (
              <p className="text-sm text-slate-400 py-4 text-center">
                Nichts Neues {unseenData.cutoffLabel}.
              </p>
            )}
            {!unseenLoading && visibleUnseen.length > 0 && (
              <div className="space-y-2">
                {visibleUnseen.map((item) => (
                  <ClassifiedEventRow
                    key={item.id}
                    item={item}
                    onDismiss={() => handleDismiss(item.id)}
                    contacts={contacts}
                    companies={companies}
                    deals={deals}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB: Wiedervorlagen ────────────────── */}
        {wsTab === "wiedervorlagen" && (
          <>
            {followupSuggestions.length === 0 && insightSuggestions.length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Keine offenen Wiedervorlagen-Vorschlaege.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* KI-Vorschlaege (Insight Signals) */}
                {insightSuggestions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide mb-2">
                      KI-Vorschlaege ({insightSuggestions.length})
                    </p>
                    <InsightSuggestions suggestions={insightSuggestions} embedded />
                  </div>
                )}
                {/* Wiedervorlagen (Followup Engine) */}
                {followupSuggestions.length > 0 && (
                  <div>
                    {insightSuggestions.length > 0 && (
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-2">
                        Wiedervorlagen ({followupSuggestions.length})
                      </p>
                    )}
                    <FollowupSuggestions suggestions={followupSuggestions} embedded />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Classified Event Row ─────────────────────
function ClassifiedEventRow({ item, onDismiss, contacts, companies, deals }: {
  item: ClassifiedItem;
  onDismiss: () => void;
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
}) {
  const [selectedAction, setSelectedAction] = useState(item.suggestedAction ?? "task");
  const isAktion = item.classification === "aktion";

  return (
    <div className={cn(
      "rounded-lg border p-3",
      isAktion ? "border-amber-200 bg-amber-50/50" : "border-slate-100 bg-slate-50/50"
    )}>
      <div className="flex items-start gap-2">
        {/* Icon */}
        <div className={cn(
          "w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5",
          isAktion ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-400"
        )}>
          {isAktion ? <AlertTriangle size={12} /> : <Check size={12} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{item.title}</p>
          {item.reason && (
            <p className="text-[11px] text-slate-500 mt-0.5">{item.reason}</p>
          )}
          {(item.contactName || item.companyName) && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              {[item.contactName, item.companyName].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isAktion ? (
            <>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value as any)}
                className="text-[11px] font-medium border border-amber-200 rounded px-1.5 py-1 bg-white text-amber-700"
              >
                {actionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {selectedAction === "email" && (
                <EmailSheet
                  contactId={item.contactId ?? undefined}
                  companyId={item.companyId ?? undefined}
                  dealId={item.dealId ?? undefined}
                  defaultSubject={item.title}
                  trigger={
                    <button className="px-2 py-1 rounded text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                      Erstellen
                    </button>
                  }
                />
              )}
              {selectedAction === "meeting" && (
                <MeetingSheet
                  contacts={contacts}
                  companies={companies}
                  deals={deals}
                  defaultContactId={item.contactId ?? undefined}
                  defaultCompanyId={item.companyId ?? undefined}
                  defaultDealId={item.dealId ?? undefined}
                  trigger={
                    <button className="px-2 py-1 rounded text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                      Erstellen
                    </button>
                  }
                />
              )}
              {(selectedAction === "task" || selectedAction === "anruf") && (
                <TaskSheet
                  contacts={contacts}
                  companies={companies}
                  deals={deals}
                  defaultTitle={selectedAction === "anruf" ? `Anruf: ${item.title}` : item.title}
                  defaultDealId={item.dealId ?? undefined}
                  trigger={
                    <button className="px-2 py-1 rounded text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                      Erstellen
                    </button>
                  }
                />
              )}
            </>
          ) : (
            <button
              onClick={onDismiss}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <Check size={10} /> Gesehen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
