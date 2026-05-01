"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { listPaymentTermsTemplates } from "@/app/(app)/settings/payment-terms/actions";
import type { PaymentTermsTemplate } from "@/types/proposal-payment";

const CUSTOM_VALUE = "__custom__";

type Props = {
  onSelectTemplate: (body: string) => void;
  disabled?: boolean;
};

// V5.6 SLC-562 — Bedingungs-Dropdown ueber dem payment_terms-Textfeld.
// Ladet alle Templates aus payment_terms_templates (SLC-561). User waehlt
// eine Vorlage aus -> der Body wird an den Parent gemeldet, der das Textfeld
// vorbefuellt. "(eigene Eingabe)" ist die Default-Anzeige (kein Override).
export function PaymentTermsDropdown({ onSelectTemplate, disabled }: Props) {
  const [templates, setTemplates] = useState<PaymentTermsTemplate[] | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string>(CUSTOM_VALUE);

  useEffect(() => {
    let cancelled = false;
    void listPaymentTermsTemplates().then((rows) => {
      if (!cancelled) setTemplates(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(value: string | null) {
    if (value === null) return;
    setSelectedId(value);
    if (value === CUSTOM_VALUE) return;
    const template = templates?.find((t) => t.id === value);
    if (template) onSelectTemplate(template.body);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="payment-terms-template">Vorlage waehlen</Label>
      <Select
        value={selectedId}
        onValueChange={handleChange}
        disabled={disabled || templates === null}
      >
        <SelectTrigger id="payment-terms-template">
          <SelectValue placeholder="(eigene Eingabe)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CUSTOM_VALUE}>(eigene Eingabe)</SelectItem>
          {(templates ?? []).map((tpl) => (
            <SelectItem key={tpl.id} value={tpl.id}>
              {tpl.label}
              {tpl.is_default ? " (Default)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
