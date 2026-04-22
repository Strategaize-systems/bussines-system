"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Mail,
  CheckSquare,
  Clock,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Users,
  Zap,
  Play,
  Pause,
  Square,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import type {
  CadenceWithSteps,
  CadenceStep,
  CadenceStepType,
  CadenceEnrollmentWithContext,
} from "@/types/cadence";
import {
  updateCadence,
  addStep,
  updateStep,
  removeStep,
  reorderSteps,
} from "../actions";
import {
  pauseEnrollment,
  resumeEnrollment,
  stopEnrollment,
} from "../enrollment-actions";

const stepTypeConfig: Record<
  CadenceStepType,
  { label: string; icon: typeof Mail; color: string; gradient: string }
> = {
  email: {
    label: "E-Mail",
    icon: Mail,
    color: "text-blue-600",
    gradient: "from-blue-500 to-blue-600",
  },
  task: {
    label: "Aufgabe",
    icon: CheckSquare,
    color: "text-emerald-600",
    gradient: "from-emerald-500 to-emerald-600",
  },
  wait: {
    label: "Wartezeit",
    icon: Clock,
    color: "text-amber-600",
    gradient: "from-amber-500 to-amber-600",
  },
};

const enrollmentStatusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Aktiv", color: "bg-emerald-100 text-emerald-700" },
  paused: { label: "Pausiert", color: "bg-amber-100 text-amber-700" },
  completed: { label: "Abgeschlossen", color: "bg-blue-100 text-blue-700" },
  stopped: { label: "Gestoppt", color: "bg-red-100 text-red-700" },
};

export function CadenceDetailClient({
  cadence,
  enrollments,
}: {
  cadence: CadenceWithSteps;
  enrollments: CadenceEnrollmentWithContext[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"builder" | "enrollments">("builder");
  const [name, setName] = useState(cadence.name);
  const [description, setDescription] = useState(cadence.description || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSaveInfo() {
    setError("");
    setSuccess("");
    const result = await updateCadence(cadence.id, { name, description });
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess("Gespeichert");
    setTimeout(() => setSuccess(""), 2000);
    startTransition(() => router.refresh());
  }

  async function handleAddStep(type: CadenceStepType) {
    setError("");
    const params: Parameters<typeof addStep>[1] = {
      step_type: type,
      delay_days: type === "wait" ? 3 : 0,
    };
    if (type === "email") {
      params.email_subject = "";
      params.email_body = "";
    }
    if (type === "task") {
      params.task_title = "";
    }
    await addStep(cadence.id, params);
    startTransition(() => router.refresh());
  }

  async function handleRemoveStep(stepId: string) {
    setError("");
    await removeStep(stepId);
    startTransition(() => router.refresh());
  }

  async function handleMoveStep(stepId: string, direction: "up" | "down") {
    const currentIds = cadence.steps.map((s) => s.id);
    const idx = currentIds.indexOf(stepId);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= currentIds.length) return;

    const newIds = [...currentIds];
    [newIds[idx], newIds[newIdx]] = [newIds[newIdx], newIds[idx]];
    await reorderSteps(cadence.id, newIds);
    startTransition(() => router.refresh());
  }

  const tabs = [
    { key: "builder" as const, label: "Builder", icon: Zap, count: cadence.steps.length },
    { key: "enrollments" as const, label: "Enrollments", icon: Users, count: enrollments.length },
  ];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/cadences"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </Link>
        <PageHeader title={cadence.name} subtitle="Cadence bearbeiten" />
      </div>

      {/* Name / Description */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#120774]/20 focus:border-[#120774]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Beschreibung</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#120774]/20 focus:border-[#120774]"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveInfo}
            disabled={isPending || name === cadence.name && description === (cadence.description || "")}
            className="bg-[#120774] hover:bg-[#1a0f9e] text-white"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Speichern
          </Button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-emerald-600">{success}</p>}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[#120774] text-[#120774]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "builder" && (
        <BuilderTab
          cadence={cadence}
          onAddStep={handleAddStep}
          onRemoveStep={handleRemoveStep}
          onMoveStep={handleMoveStep}
          onRefresh={() => startTransition(() => router.refresh())}
        />
      )}

      {activeTab === "enrollments" && (
        <EnrollmentsTab
          enrollments={enrollments}
          onRefresh={() => startTransition(() => router.refresh())}
        />
      )}
    </div>
  );
}

// =============================================================
// Builder Tab
// =============================================================

function BuilderTab({
  cadence,
  onAddStep,
  onRemoveStep,
  onMoveStep,
  onRefresh,
}: {
  cadence: CadenceWithSteps;
  onAddStep: (type: CadenceStepType) => void;
  onRemoveStep: (stepId: string) => void;
  onMoveStep: (stepId: string, direction: "up" | "down") => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Steps */}
      {cadence.steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 rounded-xl border-2 border-dashed border-slate-200">
          <Zap className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm font-medium">Keine Schritte definiert</p>
          <p className="text-xs mt-1">Fuege den ersten Schritt hinzu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cadence.steps.map((step, idx) => (
            <StepCard
              key={step.id}
              step={step}
              index={idx}
              total={cadence.steps.length}
              onRemove={() => onRemoveStep(step.id)}
              onMoveUp={() => onMoveStep(step.id, "up")}
              onMoveDown={() => onMoveStep(step.id, "down")}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Add Step Buttons */}
      <div className="flex gap-2 pt-2">
        {(Object.keys(stepTypeConfig) as CadenceStepType[]).map((type) => {
          const cfg = stepTypeConfig[type];
          return (
            <button
              key={type}
              onClick={() => onAddStep(type)}
              className="flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================
// Step Card
// =============================================================

function StepCard({
  step,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
  onRefresh,
}: {
  step: CadenceStep;
  index: number;
  total: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRefresh: () => void;
}) {
  const cfg = stepTypeConfig[step.step_type] ?? stepTypeConfig.email;
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local edit state
  const [delayDays, setDelayDays] = useState(step.delay_days);
  const [emailSubject, setEmailSubject] = useState(step.email_subject || "");
  const [emailBody, setEmailBody] = useState(step.email_body || "");
  const [taskTitle, setTaskTitle] = useState(step.task_title || "");
  const [taskDescription, setTaskDescription] = useState(step.task_description || "");

  async function handleSave() {
    setSaving(true);
    await updateStep(step.id, {
      delay_days: delayDays,
      email_subject: emailSubject || undefined,
      email_body: emailBody || undefined,
      task_title: taskTitle || undefined,
      task_description: taskDescription || undefined,
    });
    setSaving(false);
    onRefresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Step number + icon */}
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${cfg.gradient} shadow-sm`}>
          <cfg.icon className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
            <span className="text-sm font-medium text-slate-900">{cfg.label}</span>
            {step.step_type === "wait" && (
              <span className="text-xs text-slate-500">{step.delay_days} Tag{step.delay_days !== 1 ? "e" : ""} warten</span>
            )}
            {step.step_type === "email" && step.email_subject && (
              <span className="text-xs text-slate-500 truncate">{step.email_subject}</span>
            )}
            {step.step_type === "task" && step.task_title && (
              <span className="text-xs text-slate-500 truncate">{step.task_title}</span>
            )}
          </div>
        </div>

        {/* Reorder + Delete */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-red-50 ml-1"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Expanded Editor */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-3 bg-slate-50/50">
          {/* Delay Days (all types) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Verzoegerung (Tage)
            </label>
            <input
              type="number"
              min={0}
              value={delayDays}
              onChange={(e) => setDelayDays(Number(e.target.value))}
              className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#120774]/20"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Wartezeit vor Ausfuehrung dieses Schritts
            </p>
          </div>

          {/* Email fields */}
          {step.step_type === "email" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Betreff</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="z.B. Follow-up: {{deal.name}}"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#120774]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Inhalt</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={5}
                  placeholder={"Hallo {{kontakt.vorname}},\n\nich wollte kurz nachfragen..."}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#120774]/20 resize-y"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Variablen: {"{{kontakt.vorname}}"}, {"{{kontakt.nachname}}"}, {"{{firma.name}}"}, {"{{deal.name}}"}, {"{{deal.phase}}"}
                </p>
              </div>
            </>
          )}

          {/* Task fields */}
          {step.step_type === "task" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Aufgaben-Titel</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="z.B. Follow-up Anruf: {{kontakt.vorname}} {{kontakt.nachname}}"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#120774]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Beschreibung (optional)</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                  placeholder="Optionale Details zur Aufgabe..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#120774]/20 resize-y"
                />
              </div>
            </>
          )}

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#120774] hover:bg-[#1a0f9e] text-white"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? "Speichert..." : "Schritt speichern"}
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================
// Enrollments Tab
// =============================================================

function EnrollmentsTab({
  enrollments,
  onRefresh,
}: {
  enrollments: CadenceEnrollmentWithContext[];
  onRefresh: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = enrollments.filter((e) => {
    if (statusFilter === "all") return true;
    return e.status === statusFilter;
  });

  async function handlePause(id: string) {
    await pauseEnrollment(id);
    onRefresh();
  }

  async function handleResume(id: string) {
    await resumeEnrollment(id);
    onRefresh();
  }

  async function handleStop(id: string) {
    await stopEnrollment(id);
    onRefresh();
  }

  if (enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 rounded-xl border-2 border-dashed border-slate-200">
        <Users className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm font-medium">Keine Enrollments</p>
        <p className="text-xs mt-1">Buche Deals oder Kontakte in diese Cadence ein</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {["all", "active", "paused", "completed", "stopped"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-[#120774] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s === "all" ? "Alle" : enrollmentStatusConfig[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
        {filtered.map((enrollment) => {
          const statusCfg = enrollmentStatusConfig[enrollment.status] ?? enrollmentStatusConfig.active;
          const dealOrContact = enrollment.deal
            ? enrollment.deal
            : enrollment.contact;
          const label = enrollment.deal
            ? (enrollment.deal as { id: string; name?: string; title?: string }).title ?? (enrollment.deal as { id: string; name?: string }).name ?? "Deal"
            : enrollment.contact
            ? `${enrollment.contact.first_name} ${enrollment.contact.last_name}`
            : "—";

          return (
            <div key={enrollment.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900 truncate">{label}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                  <span>Schritt {enrollment.current_step_order}</span>
                  {enrollment.stop_reason && (
                    <span className="text-red-500">Grund: {enrollment.stop_reason}</span>
                  )}
                  {enrollment.next_execute_at && enrollment.status === "active" && (
                    <span>Naechste: {new Date(enrollment.next_execute_at).toLocaleDateString("de-DE")}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {enrollment.status === "active" && (
                  <>
                    <button
                      onClick={() => handlePause(enrollment.id)}
                      className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                      title="Pausieren"
                    >
                      <Pause className="h-3.5 w-3.5 text-amber-500" />
                    </button>
                    <button
                      onClick={() => handleStop(enrollment.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Stoppen"
                    >
                      <Square className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </>
                )}
                {enrollment.status === "paused" && (
                  <>
                    <button
                      onClick={() => handleResume(enrollment.id)}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                      title="Fortsetzen"
                    >
                      <Play className="h-3.5 w-3.5 text-emerald-500" />
                    </button>
                    <button
                      onClick={() => handleStop(enrollment.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Stoppen"
                    >
                      <Square className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
