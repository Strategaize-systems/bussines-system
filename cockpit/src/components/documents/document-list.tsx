import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentRow } from "./document-row";
import { DocumentUpload } from "./document-upload";
import type { Document } from "@/lib/actions/document-actions";

interface DocumentListProps {
  documents: Document[];
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

export function DocumentList({
  documents,
  contactId,
  companyId,
  dealId,
}: DocumentListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Dokumente ({documents.length})
          </CardTitle>
          <DocumentUpload
            contactId={contactId}
            companyId={companyId}
            dealId={dealId}
          />
        </div>
      </CardHeader>
      <CardContent>
        {documents.length > 0 ? (
          <div className="divide-y">
            {documents.map((doc) => (
              <DocumentRow key={doc.id} document={doc} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Noch keine Dokumente.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
