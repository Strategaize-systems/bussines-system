"use client";

import {
  Loader2,
  RefreshCw,
  AlertCircle,
  BookmarkPlus,
  Sparkles,
} from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import type { ReportResult } from "./types";
import { cn } from "@/lib/utils";
import {
  parsePipelineSections,
  extractTrailingBlock,
} from "./pipeline-tabs-view";
import {
  classifyIsBlockState,
  formatSimilarityPercent,
  pickIsFooterText,
} from "./answer-pane-is-state";

interface AnswerPaneProps {
  result?: ReportResult | null;
  isLoading: boolean;
  error?: string | null;
  onRefresh?: () => void;
  className?: string;
  /**
   * SLC-666 MT-7: wenn reportId === "top-chancen" UND der Markdown
   * "## Pipeline: ..."-Header enthaelt, rendert AnswerPane Tabs statt
   * MarkdownView. Tab-Wechsel ist clientseitig, kein neuer Bedrock-Call.
   */
  reportId?: string;
  // V7.6 SLC-763 MT-1 (DEC-216): Parent (KIWorkspace) setzt den Callback nur
  // bei `selectedReport.id === "freie-frage" && reportRun.result`. Button
  // erscheint NIE bei Standard-Berichten oder Custom-Report-Reruns.
  onSaveAsReport?: () => void;
}

export function AnswerPane({
  result,
  isLoading,
  error,
  onRefresh,
  className,
  reportId,
  onSaveAsReport,
}: AnswerPaneProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5 min-h-[140px]",
        className,
      )}
      data-testid="ki-workspace-answer-pane"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Antwort
        </span>
        <div className="flex items-center gap-3">
          {result && onSaveAsReport && (
            <button
              type="button"
              onClick={onSaveAsReport}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand-primary transition-colors"
              data-testid="answer-pane-save-as-report"
            >
              <BookmarkPlus className="h-3 w-3" />
              Als Bericht speichern
            </button>
          )}
          {result && onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand-primary transition-colors"
              data-testid="ki-workspace-refresh-button"
            >
              <RefreshCw className="h-3 w-3" />
              Aktualisieren
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div
          className="flex items-center gap-2 text-sm text-brand-primary"
          data-testid="ki-workspace-loading"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>KI arbeitet ...</span>
        </div>
      )}

      {!isLoading && error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          data-testid="ki-workspace-error"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && result && (
        <div
          className="text-sm leading-relaxed text-foreground overflow-x-auto"
          data-testid="ki-workspace-result"
        >
          {reportId === "top-chancen" ? (
            <PipelineTabsRenderer markdown={result.markdown} />
          ) : (
            <MarkdownView source={result.markdown} />
          )}
        </div>
      )}

      {/* V8.7-A SLC-871 MT-5 — IS-Knowledge-Block + Footer (DEC-255/256). */}
      {!isLoading && !error && result && (
        <IsKnowledgeSection result={result} />
      )}

      {!isLoading && !error && !result && (
        <p className="text-sm text-muted-foreground">
          Berichts-Button waehlen oder Frage stellen.
        </p>
      )}
    </div>
  );
}

function IsKnowledgeSection({ result }: { result: ReportResult }) {
  const blockState = classifyIsBlockState(result);
  const footerText = pickIsFooterText(result, blockState);
  if (blockState.kind === "none" && !footerText) return null;

  return (
    <div
      className="mt-4 space-y-2"
      data-testid="answer-pane-is-knowledge-section"
    >
      {blockState.kind === "hits" && (
        <div
          className="rounded-md border border-brand-primary/20 bg-brand-primary/5 p-3"
          data-testid="answer-pane-is-knowledge-hits"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-brand-primary mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Aus Strategaize-Wissens-Basis</span>
          </div>
          <ul
            className="list-disc pl-5 text-xs text-foreground space-y-0.5"
            data-testid="answer-pane-is-knowledge-hits-list"
          >
            {blockState.sorted.map((hit) => (
              <li key={hit.id}>
                {hit.title} ({formatSimilarityPercent(hit.similarity)})
              </li>
            ))}
          </ul>
        </div>
      )}

      {blockState.kind === "error" && (
        <p
          className="text-xs text-muted-foreground italic"
          data-testid="answer-pane-is-knowledge-error"
        >
          {blockState.message}
        </p>
      )}

      {footerText && (
        <p
          className="text-xs text-muted-foreground"
          data-testid="answer-pane-is-knowledge-footer"
        >
          {footerText}
        </p>
      )}
    </div>
  );
}

interface Block {
  kind: "h1" | "h2" | "h3" | "ul" | "p";
  lines: string[];
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let buffer: Block | null = null;

  const flush = () => {
    if (buffer) {
      blocks.push(buffer);
      buffer = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === "") {
      flush();
      continue;
    }
    const h1 = /^#\s+(.*)$/.exec(line);
    const h2 = /^##\s+(.*)$/.exec(line);
    const h3 = /^###\s+(.*)$/.exec(line);
    const li = /^[-*]\s+(.*)$/.exec(line);

    if (h3) {
      flush();
      blocks.push({ kind: "h3", lines: [h3[1]] });
    } else if (h2) {
      flush();
      blocks.push({ kind: "h2", lines: [h2[1]] });
    } else if (h1) {
      flush();
      blocks.push({ kind: "h1", lines: [h1[1]] });
    } else if (li) {
      if (!buffer || buffer.kind !== "ul") {
        flush();
        buffer = { kind: "ul", lines: [] };
      }
      buffer.lines.push(li[1]);
    } else {
      if (!buffer || buffer.kind !== "p") {
        flush();
        buffer = { kind: "p", lines: [] };
      }
      buffer.lines.push(line);
    }
  }
  flush();
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/;

  while (rest.length > 0) {
    const match = pattern.exec(rest);
    if (!match) {
      nodes.push(rest);
      break;
    }
    if (match.index > 0) {
      nodes.push(rest.slice(0, match.index));
    }
    const [, bold, italic, code, linkText, linkHref] = match;
    if (bold) {
      nodes.push(<strong key={key++}>{bold}</strong>);
    } else if (italic) {
      nodes.push(<em key={key++}>{italic}</em>);
    } else if (code) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
        >
          {code}
        </code>,
      );
    } else if (linkText && linkHref) {
      const safeHref = /^(https?:|mailto:|\/)/.test(linkHref) ? linkHref : "#";
      nodes.push(
        <a
          key={key++}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-primary underline hover:no-underline"
        >
          {linkText}
        </a>,
      );
    }
    rest = rest.slice(match.index + match[0].length);
  }
  return nodes;
}

function PipelineTabsRenderer({ markdown }: { markdown: string }) {
  const sections = parsePipelineSections(markdown);
  const trailing = extractTrailingBlock(markdown);
  const [activeIdx, setActiveIdx] = useState(0);

  // Fallback: keine Pipeline-Sektionen erkannt → normaler Markdown-Render.
  if (sections.length === 0) {
    return <MarkdownView source={markdown} />;
  }

  const active = sections[Math.min(activeIdx, sections.length - 1)];

  return (
    <div data-testid="pipeline-tabs-renderer">
      <div
        className="flex gap-1 border-b border-border mb-3 overflow-x-auto"
        role="tablist"
      >
        {sections.map((section, idx) => {
          const isActive = idx === activeIdx;
          return (
            <button
              key={section.name}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveIdx(idx)}
              data-testid={`pipeline-tab-${idx}`}
              className={cn(
                "shrink-0 px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px",
                isActive
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {section.name}
            </button>
          );
        })}
      </div>

      <div data-testid="pipeline-tab-content">
        <MarkdownView source={active.body} />
      </div>

      {trailing && (
        <div className="mt-4 pt-3 border-t border-border" data-testid="pipeline-tabs-trailing">
          <MarkdownView source={trailing} />
        </div>
      )}
    </div>
  );
}

function MarkdownView({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return (
    <>
      {blocks.map((block, idx) => {
        if (block.kind === "h1") {
          return (
            <h1 key={idx} className="text-base font-semibold text-foreground mt-3 first:mt-0">
              {renderInline(block.lines[0])}
            </h1>
          );
        }
        if (block.kind === "h2") {
          return (
            <h2 key={idx} className="text-sm font-semibold text-foreground mt-3 first:mt-0">
              {renderInline(block.lines[0])}
            </h2>
          );
        }
        if (block.kind === "h3") {
          return (
            <h3 key={idx} className="text-sm font-medium text-foreground mt-2 first:mt-0">
              {renderInline(block.lines[0])}
            </h3>
          );
        }
        if (block.kind === "ul") {
          return (
            <ul key={idx} className="list-disc pl-5 my-2 space-y-1">
              {block.lines.map((item, i) => (
                <li key={i}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="my-2 first:mt-0 last:mb-0">
            {block.lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
