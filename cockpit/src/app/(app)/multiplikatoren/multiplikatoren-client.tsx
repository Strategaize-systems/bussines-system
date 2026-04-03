"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ContactSheet } from "../contacts/contact-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Kanban, Users, Shield, Star } from "lucide-react";
import { columns } from "./columns";
import type { Contact } from "../contacts/actions";
import Link from "next/link";

const selectClass = "select-premium";

const typeOptions = [
  { value: "", label: "Alle Typen" },
  { value: "berater", label: "Berater" },
  { value: "banker", label: "Banker" },
  { value: "anwalt", label: "Anwalt" },
  { value: "steuerberater", label: "Steuerberater" },
  { value: "makler", label: "Makler" },
  { value: "branchenexperte", label: "Branchenexperte" },
];

const trustOptions = [
  { value: "", label: "Alle Vertrauen" },
  { value: "hoch", label: "Hoch" },
  { value: "mittel", label: "Mittel" },
  { value: "niedrig", label: "Niedrig" },
  { value: "unbekannt", label: "Unbekannt" },
];

interface MultiplikatorenClientProps {
  multipliers: Contact[];
  companies: { id: string; name: string }[];
}

export function MultiplikatorenClient({
  multipliers,
  companies,
}: MultiplikatorenClientProps) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState("");
  const [trustFilter, setTrustFilter] = useState("");

  const filtered = useMemo(() => {
    let result = multipliers;
    if (typeFilter) result = result.filter((m) => m.multiplier_type === typeFilter);
    if (trustFilter) result = result.filter((m) => m.trust_level === trustFilter);
    return result;
  }, [multipliers, typeFilter, trustFilter]);

  const highTrust = multipliers.filter((m) => m.trust_level === "hoch").length;
  const highReferral = multipliers.filter((m) => m.referral_capability === "hoch").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Multiplikatoren</h1>
          <p className="text-sm font-medium text-slate-500">
            {multipliers.length} Multiplikatoren im System
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/pipeline/multiplikatoren">
            <Button variant="outline" size="sm">
              <Kanban className="mr-2 h-4 w-4" />
              Pipeline
            </Button>
          </Link>
          <ContactSheet companies={companies} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">{multipliers.length}</div>
              <div className="text-xs text-muted-foreground">Gesamt</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{highTrust}</div>
              <div className="text-xs text-muted-foreground">Hohes Vertrauen</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Star className="h-5 w-5 text-yellow-500" />
            <div>
              <div className="text-2xl font-bold">{highReferral}</div>
              <div className="text-xs text-muted-foreground">Hohe Empfehlungsfähigkeit</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={selectClass}
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={trustFilter}
          onChange={(e) => setTrustFilter(e.target.value)}
          className={selectClass}
        >
          {trustOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {(typeFilter || trustFilter) && (
          <span className="text-sm font-medium text-slate-500">
            {filtered.length} von {multipliers.length}
          </span>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Multiplikatoren suchen..."
        onRowClick={(contact) => router.push(`/contacts/${contact.id}`)}
      />
    </div>
  );
}
