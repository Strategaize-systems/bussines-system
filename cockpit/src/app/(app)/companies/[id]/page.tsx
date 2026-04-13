import { getCompany, getCompanyContacts, deleteCompany, getDealsByCompany } from "../actions";
import type { CompanyDeal } from "../actions";
import { CompanySheet } from "../company-sheet";
import { getActivities } from "@/lib/actions/activity-actions";
import { getDocuments } from "@/lib/actions/document-actions";
import { getFitAssessment } from "../../fit-assessment/actions";
import { getSignals } from "../../fit-assessment/signal-actions";
import { FitAssessmentForm } from "../../fit-assessment/fit-assessment-form";
import { SignalList } from "../../fit-assessment/signal-list";
import { UnifiedTimeline } from "@/components/timeline/unified-timeline";
import { getEmailsForCompany } from "../../emails/actions";
import { getInboxEmailsForCompany } from "../../emails/imap-actions";
import { getMeetingsForCompany } from "@/app/(app)/meetings/actions";
import { getProposalsForCompany } from "../../proposals/actions";
import { DocumentList } from "@/components/documents/document-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Globe,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Trash2,
  User,
  Building,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Kanban,
  Sparkles,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const blueprintFitColors: Record<string, string> = {
  ideal: "bg-green-500",
  gut: "bg-green-400",
  "möglich": "bg-yellow-400",
  ungeeignet: "bg-red-500",
};

const blueprintFitLabels: Record<string, string> = {
  ideal: "Ideal",
  gut: "Gut",
  "möglich": "Möglich",
  ungeeignet: "Ungeeignet",
};

const levelColors: Record<string, string> = {
  hoch: "bg-green-100 text-green-800",
  mittel: "bg-yellow-100 text-yellow-800",
  niedrig: "bg-red-100 text-red-800",
  unbekannt: "bg-gray-100 text-gray-800",
};

function LevelBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const colors = levelColors[value] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  );
}

function BoolIndicator({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {value ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={value ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [company, contacts, activities, documents, fitAssessment, signals, deals, emails, meetings, proposals, inboxEmails] = await Promise.all([
    getCompany(id),
    getCompanyContacts(id),
    getActivities({ companyId: id }),
    getDocuments({ companyId: id }),
    getFitAssessment("company", id),
    getSignals({ companyId: id }),
    getDealsByCompany(id),
    getEmailsForCompany(id),
    getMeetingsForCompany(id),
    getProposalsForCompany(id),
    getInboxEmailsForCompany(id),
  ]);

  async function handleDelete() {
    "use server";
    await deleteCompany(id);
    redirect("/companies");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/companies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {company.name}
            </h1>
            {company.blueprint_fit && (
              <div className="flex items-center gap-1.5">
                <span className={`inline-block h-3 w-3 rounded-full ${blueprintFitColors[company.blueprint_fit] ?? "bg-gray-400"}`} />
                <span className="text-sm font-medium">
                  {blueprintFitLabels[company.blueprint_fit] ?? company.blueprint_fit}
                </span>
              </div>
            )}
          </div>
          {company.industry && (
            <p className="text-muted-foreground">{company.industry}</p>
          )}
        </div>
        <CompanySheet
          company={company}
          trigger={
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
          }
        />
        <form action={handleDelete}>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Info */}
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#120774] to-[#4454b8]" />
          <CardHeader>
            <CardTitle className="text-base">Firmendaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${company.email}`} className="hover:underline">
                  {company.email}
                </a>
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{company.phone}</span>
              </div>
            )}
            {company.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {company.website}
                </a>
              </div>
            )}
            {(company.address_street || company.address_city) && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  {company.address_street && <div>{company.address_street}</div>}
                  {(company.address_zip || company.address_city) && (
                    <div>
                      {company.address_zip} {company.address_city}
                    </div>
                  )}
                  {company.address_country && (
                    <div>{company.address_country}</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags + Notes */}
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-slate-400 to-slate-300" />
          <CardHeader>
            <CardTitle className="text-base">Tags & Notizen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {company.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {company.notes && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {company.notes}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suitability Assessment */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#00a84f] to-[#4dcb8b]" />
          <CardHeader>
            <CardTitle className="text-base">Eignungsbewertung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-muted-foreground">Blueprint-Fit</span>
              {company.blueprint_fit ? (
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${blueprintFitColors[company.blueprint_fit] ?? "bg-gray-400"}`} />
                  <span className="font-medium">{blueprintFitLabels[company.blueprint_fit] ?? company.blueprint_fit}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}

              <span className="text-muted-foreground">Exit-Relevanz</span>
              <LevelBadge value={company.exit_relevance} />

              <span className="text-muted-foreground">KI-Reife</span>
              <LevelBadge value={company.ai_readiness} />

              <span className="text-muted-foreground">Budget-Potential</span>
              <LevelBadge value={company.budget_potential} />

              <span className="text-muted-foreground">Strategische Relevanz</span>
              <LevelBadge value={company.strategic_relevance} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#00a84f] to-[#4dcb8b]" />
          <CardHeader>
            <CardTitle className="text-base">Firmendetails & Bereitschaft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(company.employee_count || company.revenue_range || company.ownership_structure) && (
              <div className="space-y-2 text-sm">
                {company.employee_count && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{company.employee_count} Mitarbeiter</span>
                  </div>
                )}
                {company.revenue_range && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>Umsatz: {company.revenue_range}</span>
                  </div>
                )}
                {company.ownership_structure && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{company.ownership_structure}</span>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2 pt-1">
              <BoolIndicator value={company.decision_maker_access} label="Zugang zum Entscheider" />
              <BoolIndicator value={company.complexity_fit} label="Komplexitäts-Fit" />
              <BoolIndicator value={company.willingness} label="Veränderungsbereitschaft" />
              <BoolIndicator value={company.champion_potential} label="Champion-Potential" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fit Assessment */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#f2b705] to-[#ffd54f]" />
        <CardHeader>
          <CardTitle className="text-base">Fit-Bewertung</CardTitle>
        </CardHeader>
        <CardContent>
          <FitAssessmentForm
            entityType="company"
            entityId={id}
            assessment={fitAssessment}
          />
        </CardContent>
      </Card>

      {/* Signals */}
      <SignalList signals={signals} companyId={id} />

      {/* Deals */}
      <DealSection deals={deals} label="Kontakt" />

      {/* KI-Summary Placeholder */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#120774] to-[#4454b8]" />
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#4454b8]" />
            KI-Firmen-Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Automatische KI-Zusammenfassung dieser Firma — verfügbar ab V3.1.
          </p>
        </CardContent>
      </Card>

      {/* Assigned Contacts */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#120774] to-[#4454b8]" />
        <CardHeader>
          <CardTitle className="text-base">
            Kontakte ({contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length > 0 ? (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">
                      {contact.first_name} {contact.last_name}
                    </span>
                    {contact.position && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        — {contact.position}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Keine Kontakte zugeordnet.
            </p>
          )}
        </CardContent>
      </Card>
      {/* Unified Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#4454b8]" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UnifiedTimeline
            activities={activities}
            emails={emails}
            meetings={meetings}
            signals={signals}
            proposals={proposals}
            inboxEmails={inboxEmails}
          />
        </CardContent>
      </Card>

      {/* Documents */}
      <DocumentList documents={documents} companyId={id} />
    </div>
  );
}

const dealStatusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Aktiv", color: "bg-blue-100 text-blue-800" },
  won: { label: "Gewonnen", color: "bg-green-100 text-green-800" },
  lost: { label: "Verloren", color: "bg-red-100 text-red-800" },
};

function DealSection({ deals, label }: { deals: CompanyDeal[]; label: string }) {
  const activeDeals = deals.filter((d) => d.status === "active");
  const pastDeals = deals.filter((d) => d.status === "won" || d.status === "lost");

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#00a84f] to-[#4dcb8b]" />
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Kanban className="h-4 w-4 text-[#00a84f]" />
          Deals ({deals.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Deals zugeordnet.</p>
        ) : (
          <>
            {activeDeals.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Aktive Deals ({activeDeals.length})
                </p>
                <div className="space-y-2">
                  {activeDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              </div>
            )}
            {pastDeals.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Abgeschlossene Deals ({pastDeals.length})
                </p>
                <div className="space-y-2">
                  {pastDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DealCard({ deal }: { deal: CompanyDeal }) {
  const status = dealStatusConfig[deal.status] ?? dealStatusConfig.active;
  return (
    <Link
      href={`/deals/${deal.id}`}
      className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted transition-colors border border-slate-100"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{deal.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          {deal.pipeline_stages?.name && <span>{deal.pipeline_stages.name}</span>}
          {deal.contacts && (
            <span>· {deal.contacts.first_name} {deal.contacts.last_name}</span>
          )}
        </div>
      </div>
      {deal.value != null && (
        <span className="text-sm font-bold text-slate-700 shrink-0">
          {deal.value.toLocaleString("de-DE")} €
        </span>
      )}
      <Badge className={`${status.color} shrink-0`}>{status.label}</Badge>
    </Link>
  );
}
