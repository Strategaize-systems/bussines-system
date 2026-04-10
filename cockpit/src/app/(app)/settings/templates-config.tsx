"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Pencil, Trash2, Mail, Loader2 } from "lucide-react";
import {
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  type EmailTemplate,
} from "./template-actions";

interface TemplatesConfigProps {
  templates: EmailTemplate[];
}

const LANG_TABS = [
  { key: "de", label: "Deutsch" },
  { key: "nl", label: "Nederlands" },
  { key: "en", label: "English" },
] as const;

type LangKey = (typeof LANG_TABS)[number]["key"];

export function TemplatesConfig({ templates }: TemplatesConfigProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<EmailTemplate | null>(null);
  const [activeLang, setActiveLang] = useState<LangKey>("de");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const openNew = () => {
    setCurrent(null);
    setActiveLang("de");
    setError("");
    setEditOpen(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setCurrent(t);
    setActiveLang("de");
    setError("");
    setEditOpen(true);
  };

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = current
        ? await updateEmailTemplate(current.id, formData)
        : await createEmailTemplate(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setEditOpen(false);
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteEmailTemplate(id);
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100">
            <Mail className="h-4 w-4 text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">E-Mail-Templates</p>
            <p className="text-xs text-slate-500">{templates.length} Template{templates.length !== 1 ? "s" : ""} in DE/NL/EN</p>
          </div>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" />
          Neues Template
        </Button>
      </div>

      <div className="divide-y divide-slate-100">
        {templates.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            Noch keine Templates. Erstelle dein erstes Template.
          </div>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{t.title}</p>
                <p className="text-xs text-slate-400">
                  {[
                    t.subject_de ? "DE" : null,
                    t.subject_nl ? "NL" : null,
                    t.subject_en ? "EN" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Kein Betreff"}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(t)}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit/Create Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {current ? "Template bearbeiten" : "Neues Template"}
            </SheetTitle>
          </SheetHeader>
          <div className="px-8 pb-8">
            {error && (
              <p className="mb-3 text-sm text-destructive">{error}</p>
            )}
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Name *</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={current?.title ?? ""}
                  placeholder="z.B. Erstansprache Multiplikator"
                  required
                />
              </div>

              {/* Language Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-200">
                {LANG_TABS.map((lang) => (
                  <button
                    key={lang.key}
                    type="button"
                    onClick={() => setActiveLang(lang.key)}
                    className={`px-3 py-2 text-xs font-bold transition-colors ${
                      activeLang === lang.key
                        ? "text-[#4454b8] border-b-2 border-[#4454b8]"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {/* DE Fields */}
              <div className={activeLang === "de" ? "space-y-3" : "hidden"}>
                <div className="space-y-2">
                  <Label htmlFor="subject_de">Betreff (DE)</Label>
                  <Input
                    id="subject_de"
                    name="subject_de"
                    defaultValue={current?.subject_de ?? ""}
                    placeholder="Betr.: {{firma}} — Erstgespraech"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body_de">Text (DE)</Label>
                  <Textarea
                    id="body_de"
                    name="body_de"
                    rows={8}
                    defaultValue={current?.body_de ?? ""}
                    placeholder="Sehr geehrte(r) {{vorname}} {{nachname}},&#10;&#10;..."
                  />
                </div>
              </div>

              {/* NL Fields */}
              <div className={activeLang === "nl" ? "space-y-3" : "hidden"}>
                <div className="space-y-2">
                  <Label htmlFor="subject_nl">Onderwerp (NL)</Label>
                  <Input
                    id="subject_nl"
                    name="subject_nl"
                    defaultValue={current?.subject_nl ?? ""}
                    placeholder="Betr.: {{firma}} — Eerste gesprek"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body_nl">Tekst (NL)</Label>
                  <Textarea
                    id="body_nl"
                    name="body_nl"
                    rows={8}
                    defaultValue={current?.body_nl ?? ""}
                    placeholder="Beste {{vorname}} {{nachname}},&#10;&#10;..."
                  />
                </div>
              </div>

              {/* EN Fields */}
              <div className={activeLang === "en" ? "space-y-3" : "hidden"}>
                <div className="space-y-2">
                  <Label htmlFor="subject_en">Subject (EN)</Label>
                  <Input
                    id="subject_en"
                    name="subject_en"
                    defaultValue={current?.subject_en ?? ""}
                    placeholder="Re: {{firma}} — Initial Meeting"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body_en">Body (EN)</Label>
                  <Textarea
                    id="body_en"
                    name="body_en"
                    rows={8}
                    defaultValue={current?.body_en ?? ""}
                    placeholder="Dear {{vorname}} {{nachname}},&#10;&#10;..."
                  />
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Verfuegbare Platzhalter</p>
                <p className="text-xs text-slate-500">
                  {"{{vorname}}"} {"{{nachname}}"} {"{{firma}}"} {"{{position}}"} {"{{deal}}"}
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : current ? (
                  "Aktualisieren"
                ) : (
                  "Template erstellen"
                )}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
