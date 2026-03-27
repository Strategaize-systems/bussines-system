"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Trash2 } from "lucide-react";
import { deleteDocument, getDocumentUrl } from "@/lib/actions/document-actions";
import type { Document } from "@/lib/actions/document-actions";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentRow({ document }: { document: Document }) {
  const [isPending, startTransition] = useTransition();

  const handleDownload = () => {
    startTransition(async () => {
      const url = await getDocumentUrl(document.file_path);
      if (url) window.open(url, "_blank");
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteDocument(document.id, document.file_path);
    });
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{document.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(document.file_size)}
          {document.file_type && ` · ${document.file_type}`}
          {" · "}
          {new Date(document.created_at).toLocaleDateString("de-DE")}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={handleDownload}
        disabled={isPending}
        title="Herunterladen"
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={handleDelete}
        disabled={isPending}
        title="Löschen"
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}
