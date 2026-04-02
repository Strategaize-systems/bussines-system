"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface EmailComposeProps {
  defaultTo?: string;
  contactId?: string;
  companyId?: string;
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}

export function EmailCompose({
  defaultTo,
  contactId,
  companyId,
  onSubmit,
  isPending,
}: EmailComposeProps) {
  return (
    <form action={onSubmit} className="space-y-4">
      {contactId && <input type="hidden" name="contact_id" value={contactId} />}
      {companyId && <input type="hidden" name="company_id" value={companyId} />}

      <div className="space-y-2">
        <Label htmlFor="to_address">An *</Label>
        <Input
          id="to_address"
          name="to_address"
          type="email"
          defaultValue={defaultTo ?? ""}
          placeholder="empfaenger@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Betreff *</Label>
        <Input
          id="subject"
          name="subject"
          placeholder="Betreff der E-Mail"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Nachricht *</Label>
        <Textarea
          id="body"
          name="body"
          rows={8}
          placeholder="Ihre Nachricht..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="follow_up_date">Follow-up am</Label>
        <Input
          id="follow_up_date"
          name="follow_up_date"
          type="date"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Senden..." : "E-Mail senden"}
      </Button>
    </form>
  );
}
