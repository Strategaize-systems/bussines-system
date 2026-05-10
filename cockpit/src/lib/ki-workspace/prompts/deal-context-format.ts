import type { DealContext } from "@/lib/ki-workspace/deal-context";

const eurFmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return dateFmt.format(d);
}

function formatEur(value: number | null | undefined): string {
  if (value == null) return "kein Wert";
  return eurFmt.format(value);
}

export interface FormatOptions {
  includeActivities?: boolean;
  includeTasks?: boolean;
  includeMeetings?: boolean;
  includeProposals?: boolean;
  includeSignals?: boolean;
  includeEmails?: boolean;
  includeCalls?: boolean;
  maxActivities?: number;
  maxEmails?: number;
}

const DEFAULT_OPTIONS: Required<FormatOptions> = {
  includeActivities: true,
  includeTasks: true,
  includeMeetings: true,
  includeProposals: true,
  includeSignals: true,
  includeEmails: true,
  includeCalls: true,
  maxActivities: 15,
  maxEmails: 8,
};

export function formatDealContext(ctx: DealContext, options: FormatOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];

  lines.push("=== DEAL ===");
  lines.push(`Titel: ${ctx.deal.title}`);
  lines.push(`Status: ${ctx.deal.status}`);
  if (ctx.deal.pipelineName) lines.push(`Pipeline: ${ctx.deal.pipelineName}`);
  if (ctx.deal.stageName) {
    const probStr = ctx.deal.probability != null ? ` (${ctx.deal.probability}%)` : "";
    lines.push(`Phase: ${ctx.deal.stageName}${probStr}`);
  }
  lines.push(`Wert: ${formatEur(ctx.deal.value)}`);
  if (ctx.deal.expectedCloseDate) {
    lines.push(`Erwarteter Abschluss: ${formatDate(ctx.deal.expectedCloseDate)}`);
  }
  if (ctx.deal.nextAction) {
    const dateStr = ctx.deal.nextActionDate ? ` (faellig ${formatDate(ctx.deal.nextActionDate)})` : "";
    lines.push(`Naechster Schritt (gespeichert): ${ctx.deal.nextAction}${dateStr}`);
  }
  if (ctx.deal.tags.length > 0) {
    lines.push(`Tags: ${ctx.deal.tags.join(", ")}`);
  }
  if (ctx.deal.status === "won" || ctx.deal.status === "lost") {
    lines.push(`Abgeschlossen: ${formatDate(ctx.deal.closedAt)}`);
    if (ctx.deal.wonLostReason) lines.push(`Grund: ${ctx.deal.wonLostReason}`);
    if (ctx.deal.wonLostDetails) lines.push(`Details: ${ctx.deal.wonLostDetails}`);
  }

  lines.push("\n=== KONTAKT ===");
  if (ctx.contact) {
    const parts = [ctx.contact.name];
    if (ctx.contact.position) parts.push(`(${ctx.contact.position})`);
    lines.push(parts.join(" "));
    if (ctx.contact.email) lines.push(`E-Mail: ${ctx.contact.email}`);
    if (ctx.contact.phone) lines.push(`Telefon: ${ctx.contact.phone}`);
  } else {
    lines.push("Kein Kontakt zugeordnet.");
  }

  lines.push("\n=== FIRMA ===");
  if (ctx.company) {
    lines.push(ctx.company.name);
    if (ctx.company.industry) lines.push(`Branche: ${ctx.company.industry}`);
  } else {
    lines.push("Keine Firma zugeordnet.");
  }

  if (opts.includeActivities) {
    lines.push("\n=== AKTIVITAETEN (neueste zuerst) ===");
    if (ctx.activities.length === 0) {
      lines.push("Keine Aktivitaeten erfasst.");
    } else {
      const slice = ctx.activities.slice(0, opts.maxActivities);
      for (const a of slice) {
        const date = formatDate(a.createdAt);
        const summary = a.summary ? ` — ${a.summary}` : "";
        lines.push(`- [${date}] ${a.type}: ${a.title}${summary}`);
      }
    }
  }

  if (opts.includeTasks) {
    lines.push("\n=== AUFGABEN (offen + faellig) ===");
    if (ctx.tasks.length === 0) {
      lines.push("Keine Aufgaben.");
    } else {
      for (const t of ctx.tasks) {
        const due = t.dueDate ? `faellig ${formatDate(t.dueDate)}` : "kein Datum";
        const prio = t.priority ? `, Prio ${t.priority}` : "";
        lines.push(`- [${t.status}] ${t.title} (${due}${prio})`);
      }
    }
  }

  if (opts.includeMeetings) {
    lines.push("\n=== MEETINGS ===");
    if (ctx.meetings.length === 0) {
      lines.push("Keine Meetings erfasst.");
    } else {
      for (const m of ctx.meetings) {
        const when = m.startsAt ? formatDate(m.startsAt) : "ohne Datum";
        const summary = m.summary ? ` — ${m.summary}` : "";
        lines.push(`- [${when}] ${m.title}${summary}`);
      }
    }
  }

  if (opts.includeProposals) {
    lines.push("\n=== ANGEBOTE ===");
    if (ctx.proposals.length === 0) {
      lines.push("Keine Angebote.");
    } else {
      for (const p of ctx.proposals) {
        const status = p.status ?? "—";
        const total = formatEur(p.totalGross);
        lines.push(`- [${formatDate(p.createdAt)}] ${p.title} (Status ${status}, ${total})`);
      }
    }
  }

  if (opts.includeSignals) {
    lines.push("\n=== ERKANNTE SIGNALE (DB) ===");
    if (ctx.signals.length === 0) {
      lines.push("Keine bisher erkannten Signale.");
    } else {
      for (const s of ctx.signals) {
        const conf = s.confidence != null ? ` (Konfidenz ${s.confidence})` : "";
        const src = s.source ? `, Quelle ${s.source}` : "";
        const text = s.extractedText ? ` — "${s.extractedText}"` : "";
        lines.push(`- [${formatDate(s.createdAt)}] ${s.signalType}${conf}${src}${text}`);
      }
    }
  }

  if (opts.includeEmails) {
    lines.push("\n=== E-MAILS (neueste zuerst, gekuerzt) ===");
    if (ctx.emails.length === 0) {
      lines.push("Keine E-Mails.");
    } else {
      const slice = ctx.emails.slice(0, opts.maxEmails);
      for (const e of slice) {
        const dir = e.direction === "inbound" ? "EIN" : e.direction === "outbound" ? "AUS" : "?";
        const date = e.receivedAt ? formatDate(e.receivedAt) : "ohne Datum";
        const subj = e.subject ?? "(ohne Betreff)";
        lines.push(`- [${date}|${dir}] ${subj}`);
        if (e.bodyExcerpt) lines.push(`  ${e.bodyExcerpt}`);
      }
    }
  }

  if (opts.includeCalls) {
    lines.push("\n=== TELEFONATE ===");
    if (ctx.calls.length === 0) {
      lines.push("Keine Telefonate.");
    } else {
      for (const c of ctx.calls) {
        const dir = c.direction ?? "?";
        const dur = c.durationSeconds != null ? `${Math.round(c.durationSeconds / 60)}min` : "—";
        const summary = c.summary ? ` — ${c.summary}` : "";
        lines.push(`- [${formatDate(c.createdAt)}|${dir}|${dur}]${summary}`);
      }
    }
  }

  return lines.join("\n");
}
