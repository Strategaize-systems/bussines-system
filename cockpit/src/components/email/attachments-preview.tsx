"use client";

// =============================================================
// AttachmentsPreview (SLC-542 MT-6)
// =============================================================
// Read-only Anhang-Indikator-Sektion fuer das Live-Preview-Panel.
// Kein Inhalts-Render — nur Filename + Size + Mime-Icon.
// Zeigt was beim Empfaenger als Anhang ankommen wird.

import { Paperclip } from "lucide-react";

import {
  formatSize,
  type AttachmentMeta,
} from "@/lib/email/attachments-whitelist";

type Props = {
  attachments: AttachmentMeta[];
};

function iconForMime(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return "IMG";
  if (mime.includes("zip")) return "ZIP";
  if (mime.includes("word") || mime.includes("doc")) return "DOC";
  if (mime.includes("excel") || mime.includes("sheet") || mime === "text/csv" || mime === "application/csv") return "XLS";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "PPT";
  if (mime === "text/plain") return "TXT";
  return "FILE";
}

export function AttachmentsPreview({ attachments }: Props) {
  if (attachments.length === 0) return null;

  const totalSize = attachments.reduce((sum, a) => sum + a.sizeBytes, 0);

  return (
    <div className="space-y-2 rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <Paperclip className="h-3 w-3 text-[#4454b8]" strokeWidth={2.5} />
          Anhaenge ({attachments.length})
        </span>
        <span className="text-[10px] font-medium text-slate-400">
          {formatSize(totalSize)}
        </span>
      </div>
      <ul className="space-y-1">
        {attachments.map((att) => (
          <li
            key={att.storagePath}
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
              {iconForMime(att.mimeType)}
            </span>
            <span className="flex-1 truncate font-semibold text-slate-700">
              {att.filename}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              {formatSize(att.sizeBytes)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
