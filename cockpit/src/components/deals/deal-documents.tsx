import { FileText, Download } from "lucide-react";

interface DealDocumentsProps {
  documents: any[];
  dealId: string;
}

export function DealDocuments({ documents }: DealDocumentsProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Keine Dokumente für diesen Deal.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc: any) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"
        >
          <div className="rounded-lg bg-slate-50 p-2">
            <FileText className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700">
              {doc.name || doc.file_name}
            </p>
            <p className="text-xs text-slate-400">
              {new Date(doc.created_at).toLocaleDateString("de-DE")}
            </p>
          </div>
          {doc.url && (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
