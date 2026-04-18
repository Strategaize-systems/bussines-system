"use client";

interface KnowledgeAnswerProps {
  answer: string;
}

/**
 * Renders the RAG answer text. Source references like [1], [2] are
 * rendered as styled inline badges.
 */
export function KnowledgeAnswer({ answer }: KnowledgeAnswerProps) {
  // Split text at [N] references and render them as badges
  const parts = answer.split(/(\[\d+\])/g);

  return (
    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          return (
            <span
              key={i}
              className="inline-flex items-center justify-center mx-0.5 h-4 min-w-[1rem] rounded bg-[#4454b8]/10 px-1 text-[10px] font-bold text-[#4454b8] align-text-top"
            >
              {match[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
