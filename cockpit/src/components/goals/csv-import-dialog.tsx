"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseGoalsCsv, CSV_TEMPLATE } from "@/lib/goals/csv-parser";
import { importGoalsFromCSV } from "@/app/actions/goals";
import type { GoalImportRow, CsvParseError } from "@/lib/goals/csv-parser";
import type { Product } from "@/types/products";

interface CsvImportDialogProps {
  products: Product[];
  trigger: React.ReactNode;
}

type Step = "upload" | "preview" | "result";

export function CsvImportDialog({ products, trigger }: CsvImportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("upload");
  const [validRows, setValidRows] = useState<GoalImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<CsvParseError[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);

  function reset() {
    setStep("upload");
    setValidRows([]);
    setParseErrors([]);
    setImportResult(null);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen) reset();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const csv = evt.target?.result as string;
      const result = parseGoalsCsv(csv, products);
      setValidRows(result.valid);
      setParseErrors(result.errors);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  function handleImport() {
    startTransition(async () => {
      const rows = validRows.map((r) => ({
        type: r.type,
        period: r.period,
        period_start: r.period_start,
        target_value: r.target_value,
        product_id: r.product_id,
      }));
      const result = await importGoalsFromCSV(rows);
      setImportResult(result);
      setStep("result");
      router.refresh();
    });
  }

  function handleDownloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ziele-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ziele aus CSV importieren</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              CSV-Datei mit Spalten: type, period, period_start, target_value, product_name
            </p>
            <div className="flex gap-3">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                Template herunterladen
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Errors */}
            {parseErrors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-700 mb-1">
                  {parseErrors.length} Fehler gefunden:
                </p>
                {parseErrors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600">
                    Zeile {err.line}: {err.message}
                  </p>
                ))}
              </div>
            )}

            {/* Valid rows preview */}
            {validRows.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  {validRows.length} Ziele bereit zum Import:
                </p>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Typ</TableHead>
                        <TableHead>Zeitraum</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead className="text-right">Sollwert</TableHead>
                        <TableHead>Produkt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{row.type}</TableCell>
                          <TableCell className="text-sm">{row.period}</TableCell>
                          <TableCell className="text-sm">{row.period_start}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums">
                            {row.target_value.toLocaleString("de-DE")}
                          </TableCell>
                          <TableCell className="text-sm">{row.product_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {validRows.length === 0 && parseErrors.length > 0 && (
              <p className="text-sm text-slate-400">Keine gultigen Zeilen zum Import</p>
            )}
          </div>
        )}

        {step === "result" && importResult && (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-700">
                {importResult.imported} Ziele erfolgreich importiert
              </p>
            </div>
            {importResult.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-700 mb-1">
                  {importResult.errors.length} Fehler beim Import:
                </p>
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600">{err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "preview" && validRows.length > 0 && (
            <Button onClick={handleImport} disabled={isPending}>
              {isPending ? "Importiere..." : `${validRows.length} Ziele importieren`}
            </Button>
          )}
          {step === "preview" && (
            <Button variant="outline" onClick={reset}>
              Zurueck
            </Button>
          )}
          {step === "result" && (
            <Button onClick={() => setOpen(false)}>Schliessen</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
