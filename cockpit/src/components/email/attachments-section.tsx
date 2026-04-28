"use client";

// =============================================================
// AttachmentsSection (SLC-542 MT-4, DEC-101)
// =============================================================
// Drag&Drop-Zone + File-Picker-Button + Anhang-Liste mit Loeschen.
// Browser-side Validation via validateAttachment, dann Upload via
// uploadEmailAttachment Server Action.
//
// Optimistic UI: temporary Pending-Item mit Spinner, ersetzt durch echtes
// Item nach Server-Response. Bei Server-Fehler wird das Pending-Item entfernt
// und der Fehler in der UI angezeigt.

import { useCallback, useRef, useState, useTransition } from "react";
import { Loader2, Paperclip, Plus, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  EXTENSION_WHITELIST,
  formatSize,
  validateAttachment,
  type AttachmentMeta,
} from "@/lib/email/attachments-whitelist";
import {
  deleteEmailAttachment,
  uploadEmailAttachment,
} from "@/app/(app)/emails/compose/attachment-actions";

type Props = {
  composeSessionId: string;
  attachments: AttachmentMeta[];
  onAdd: (attachment: AttachmentMeta) => void;
  onRemove: (storagePath: string) => void;
};

type PendingItem = {
  // Lokale ID — verhindert React-Key-Kollisionen bei doppeltem Filename
  localId: string;
  filename: string;
  sizeBytes: number;
};

// MIME → Icon (Emoji statt Lucide um keine zusaetzlichen Imports zu brauchen)
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

export function AttachmentsSection({
  composeSessionId,
  attachments,
  onAdd,
  onRemove,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadPending, startUpload] = useTransition();
  const [removingPath, setRemovingPath] = useState<string | null>(null);

  const totalSize = attachments.reduce((sum, a) => sum + a.sizeBytes, 0);
  const pendingTotalSize = pending.reduce((sum, p) => sum + p.sizeBytes, 0);

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const list = Array.from(files);
      // Validation pro File mit kumulativer Total-Size
      let runningTotal = totalSize + pendingTotalSize;
      const accepted: File[] = [];
      for (const f of list) {
        const result = validateAttachment(f, runningTotal);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        runningTotal += f.size;
        accepted.push(f);
      }
      if (accepted.length === 0) return;

      // Pending-Items hinzufuegen
      const newPending: PendingItem[] = accepted.map((f) => ({
        localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        filename: f.name,
        sizeBytes: f.size,
      }));
      setPending((prev) => [...prev, ...newPending]);

      // Sequentiell uploaden — verhindert Server-Action-Stampede
      startUpload(async () => {
        for (let i = 0; i < accepted.length; i++) {
          const file = accepted[i];
          const localId = newPending[i].localId;
          const fd = new FormData();
          fd.append("file", file);
          fd.append("composeSessionId", composeSessionId);

          const res = await uploadEmailAttachment(fd);
          // Pending-Item entfernen unabhaengig vom Ergebnis
          setPending((prev) => prev.filter((p) => p.localId !== localId));

          if (!res.ok) {
            setError(res.error);
            // Restliche Pending-Items dieser Batch verwerfen
            const remainingIds = newPending.slice(i).map((p) => p.localId);
            setPending((prev) =>
              prev.filter((p) => !remainingIds.includes(p.localId)),
            );
            return;
          }
          onAdd(res.attachment);
        }
      });

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [composeSessionId, onAdd, pendingTotalSize, totalSize],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) processFiles(files);
    },
    [processFiles],
  );

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) processFiles(files);
    },
    [processFiles],
  );

  const handleRemove = useCallback(
    async (storagePath: string) => {
      setError(null);
      setRemovingPath(storagePath);
      const res = await deleteEmailAttachment(storagePath);
      setRemovingPath(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onRemove(storagePath);
    },
    [onRemove],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
          <Paperclip className="h-3 w-3 text-[#4454b8]" strokeWidth={2.5} />
          Anhaenge
        </span>
        <span className="text-[10px] font-semibold text-slate-400">
          {attachments.length + pending.length === 0
            ? "keine"
            : `${attachments.length + pending.length} Datei(en) · ${formatSize(totalSize + pendingTotalSize)}`}
        </span>
      </div>

      {/* Drag&Drop-Zone + Picker */}
      <div
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        className={
          "flex items-center justify-between gap-3 rounded-lg border-2 border-dashed px-3 py-2.5 transition-all " +
          (dragActive
            ? "border-[#4454b8] bg-[#4454b8]/5"
            : "border-slate-200 bg-slate-50 hover:border-slate-300")
        }
      >
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Upload className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span>
            Datei hierher ziehen oder
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={EXTENSION_WHITELIST.join(",")}
          className="hidden"
          onChange={handleFileInputChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploadPending}
          onClick={() => fileInputRef.current?.click()}
          className="border-2"
        >
          {uploadPending ? (
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" strokeWidth={2.5} />
          ) : (
            <Plus className="mr-1.5 h-3 w-3" strokeWidth={2.5} />
          )}
          Datei anhaengen
        </Button>
      </div>

      {/* Anhang-Liste */}
      {(attachments.length > 0 || pending.length > 0) && (
        <ul className="space-y-1.5">
          {attachments.map((att) => (
            <li
              key={att.storagePath}
              className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-2.5 py-1.5 text-xs"
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
              <button
                type="button"
                onClick={() => handleRemove(att.storagePath)}
                disabled={removingPath === att.storagePath}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                title="Anhang entfernen"
                aria-label={`Anhang ${att.filename} entfernen`}
              >
                {removingPath === att.storagePath ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
                ) : (
                  <X className="h-3 w-3" strokeWidth={2.5} />
                )}
              </button>
            </li>
          ))}
          {pending.map((p) => (
            <li
              key={p.localId}
              className="flex items-center gap-2 rounded-lg border-2 border-dashed border-[#4454b8]/30 bg-[#4454b8]/5 px-2.5 py-1.5 text-xs"
            >
              <Loader2 className="h-3 w-3 animate-spin text-[#4454b8]" strokeWidth={2.5} />
              <span className="flex-1 truncate font-semibold text-slate-600">
                {p.filename}
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                {formatSize(p.sizeBytes)} · Lade hoch...
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
