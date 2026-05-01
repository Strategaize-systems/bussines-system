"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PaymentTermsTemplate } from "@/types/proposal-payment";
import {
  createPaymentTermsTemplate,
  updatePaymentTermsTemplate,
  deletePaymentTermsTemplate,
  setDefaultPaymentTermsTemplate,
  listPaymentTermsTemplates,
} from "./actions";

type Mode =
  | { kind: "idle" }
  | { kind: "create" }
  | { kind: "edit"; template: PaymentTermsTemplate }
  | { kind: "delete"; template: PaymentTermsTemplate };

export function PaymentTermsManager({
  initialTemplates,
}: {
  initialTemplates: PaymentTermsTemplate[];
}) {
  const [templates, setTemplates] =
    useState<PaymentTermsTemplate[]>(initialTemplates);
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function refresh() {
    void listPaymentTermsTemplates().then((rows) => setTemplates(rows));
  }

  function close() {
    setMode({ kind: "idle" });
    setErrorMessage(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          onClick={() => setMode({ kind: "create" })}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Neue Vorlage
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Noch keine Vorlagen angelegt.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900">{tpl.label}</h3>
                    {tpl.is_default ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Default
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2 whitespace-pre-wrap">
                    {tpl.body}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!tpl.is_default ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        setErrorMessage(null);
                        startTransition(async () => {
                          const result = await setDefaultPaymentTermsTemplate({
                            id: tpl.id,
                          });
                          if (!result.ok) {
                            setErrorMessage(result.error);
                            return;
                          }
                          refresh();
                        });
                      }}
                      className="gap-1 text-xs"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Default setzen
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMode({ kind: "edit", template: tpl })}
                    title="Bearbeiten"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMode({ kind: "delete", template: tpl })}
                    title="Loeschen"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {errorMessage ? (
        <p className="text-sm text-red-600">{errorMessage}</p>
      ) : null}

      <UpsertDialog
        mode={mode}
        isPending={isPending}
        onClose={close}
        onSubmit={(label, body) => {
          setErrorMessage(null);
          startTransition(async () => {
            const result =
              mode.kind === "edit"
                ? await updatePaymentTermsTemplate({
                    id: mode.template.id,
                    label,
                    body,
                  })
                : await createPaymentTermsTemplate({ label, body });
            if (!result.ok) {
              setErrorMessage(result.error);
              return;
            }
            close();
            refresh();
          });
        }}
      />

      <DeleteDialog
        mode={mode}
        isPending={isPending}
        onClose={close}
        onConfirm={() => {
          if (mode.kind !== "delete") return;
          setErrorMessage(null);
          startTransition(async () => {
            const result = await deletePaymentTermsTemplate({
              id: mode.template.id,
            });
            if (!result.ok) {
              // Dialog schliessen, Error sichtbar lassen (close() wuerde Error reset).
              setErrorMessage(result.error);
              setMode({ kind: "idle" });
              return;
            }
            close();
            refresh();
          });
        }}
      />
    </div>
  );
}

function UpsertDialog({
  mode,
  isPending,
  onClose,
  onSubmit,
}: {
  mode: Mode;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (label: string, body: string) => void;
}) {
  const open = mode.kind === "create" || mode.kind === "edit";
  const initialLabel = mode.kind === "edit" ? mode.template.label : "";
  const initialBody = mode.kind === "edit" ? mode.template.body : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        // base-ui Dialog: form-state via uncontrolled inputs + key reset
      >
        <DialogHeader>
          <DialogTitle>
            {mode.kind === "edit" ? "Vorlage bearbeiten" : "Neue Vorlage"}
          </DialogTitle>
          <DialogDescription>
            Bezeichnung und Text fuer die Zahlungsbedingung. Wird im
            Angebot-Editor per Dropdown angeboten.
          </DialogDescription>
        </DialogHeader>
        <form
          key={mode.kind === "edit" ? mode.template.id : "create"}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const label = String(formData.get("label") ?? "");
            const body = String(formData.get("body") ?? "");
            onSubmit(label, body);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="payment-terms-label">Bezeichnung</Label>
            <Input
              id="payment-terms-label"
              name="label"
              defaultValue={initialLabel}
              maxLength={100}
              required
              autoFocus
              placeholder="z.B. 14 Tage netto"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-terms-body">Text</Label>
            <Textarea
              id="payment-terms-body"
              name="body"
              defaultValue={initialBody}
              required
              rows={3}
              placeholder="z.B. Zahlbar innerhalb von 14 Tagen netto."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  mode,
  isPending,
  onClose,
  onConfirm,
}: {
  mode: Mode;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const open = mode.kind === "delete";
  const label = mode.kind === "delete" ? mode.template.label : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vorlage loeschen?</DialogTitle>
          <DialogDescription>
            {`Vorlage "${label}" wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isPending ? "Loesche…" : "Loeschen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
