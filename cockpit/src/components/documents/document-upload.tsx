"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { uploadDocument } from "@/lib/actions/document-actions";

interface DocumentUploadProps {
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

export function DocumentUpload({ contactId, companyId, dealId }: DocumentUploadProps) {
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    if (contactId) formData.set("contact_id", contactId);
    if (companyId) formData.set("company_id", companyId);
    if (dealId) formData.set("deal_id", dealId);

    startTransition(async () => {
      await uploadDocument(formData);
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={isPending}
      >
        <Upload className="mr-2 h-4 w-4" />
        {isPending ? "Hochladen..." : "Datei hochladen"}
      </Button>
    </>
  );
}
