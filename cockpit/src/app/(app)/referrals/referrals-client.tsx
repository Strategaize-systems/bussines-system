"use client";

import { useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Trash2, User, Building2, Calendar, ArrowRight } from "lucide-react";
import { ReferralSheet } from "./referral-sheet";
import { deleteReferral, type Referral } from "./actions";
import Link from "next/link";

const qualityColors: Record<string, string> = {
  hoch: "bg-green-100 text-green-800",
  mittel: "bg-yellow-100 text-yellow-800",
  niedrig: "bg-red-100 text-red-800",
};

const outcomeColors: Record<string, string> = {
  offen: "bg-blue-100 text-blue-800",
  gewonnen: "bg-green-100 text-green-800",
  verloren: "bg-red-100 text-red-800",
  nicht_qualifiziert: "bg-gray-100 text-gray-800",
};

const outcomeLabels: Record<string, string> = {
  offen: "Offen",
  gewonnen: "Gewonnen",
  verloren: "Verloren",
  nicht_qualifiziert: "Nicht qualifiziert",
};

interface ReferralsClientProps {
  referrals: Referral[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
}

export function ReferralsClient({ referrals, contacts, companies, deals }: ReferralsClientProps) {
  const wonCount = referrals.filter((r) => r.outcome === "gewonnen").length;
  const openCount = referrals.filter((r) => r.outcome === "offen" || !r.outcome).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empfehlungen</h1>
          <p className="text-sm text-muted-foreground">
            {referrals.length} Empfehlungen · {wonCount} gewonnen · {openCount} offen
          </p>
        </div>
        <ReferralSheet contacts={contacts} companies={companies} deals={deals} />
      </div>

      <div className="space-y-2">
        {referrals.length > 0 ? (
          referrals.map((ref) => (
            <ReferralItem key={ref.id} referral={ref} />
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Keine Empfehlungen erfasst.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReferralItem({ referral }: { referral: Referral }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteReferral(referral.id);
    });
  };

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-3">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            {referral.referrer && (
              <Link href={`/contacts/${referral.referrer.id}`} className="font-medium hover:underline">
                {referral.referrer.first_name} {referral.referrer.last_name}
              </Link>
            )}
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            {referral.referred_contact && (
              <Link href={`/contacts/${referral.referred_contact.id}`} className="hover:underline">
                {referral.referred_contact.first_name} {referral.referred_contact.last_name}
              </Link>
            )}
            {referral.referred_company && (
              <Link href={`/companies/${referral.referred_company.id}`} className="hover:underline">
                {referral.referred_company.name}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
            {referral.quality && (
              <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${qualityColors[referral.quality] ?? ""}`}>
                {referral.quality.charAt(0).toUpperCase() + referral.quality.slice(1)}
              </span>
            )}
            {referral.outcome && (
              <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${outcomeColors[referral.outcome] ?? ""}`}>
                {outcomeLabels[referral.outcome] ?? referral.outcome}
              </span>
            )}
            {referral.referral_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(referral.referral_date).toLocaleDateString("de-DE")}
              </span>
            )}
            {referral.deals && (
              <span>Deal: {referral.deals.title}</span>
            )}
          </div>
          {referral.notes && (
            <p className="text-xs text-muted-foreground mt-1">{referral.notes}</p>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </CardContent>
    </Card>
  );
}
