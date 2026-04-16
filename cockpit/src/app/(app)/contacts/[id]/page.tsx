import { getContact, deleteContact, getDealsByContact } from "../actions";
import type { ContactDeal } from "../actions";
import { getCompaniesForSelect } from "../../companies/actions";
import { ContactSheet } from "../contact-sheet";
import { EmailSheet } from "../../emails/email-sheet";
import { getActivities } from "@/lib/actions/activity-actions";
import { getDocuments } from "@/lib/actions/document-actions";
import { getFitAssessment } from "../../fit-assessment/actions";
import { getSignals } from "../../fit-assessment/signal-actions";
import { FitAssessmentForm } from "../../fit-assessment/fit-assessment-form";
import { SignalList } from "../../fit-assessment/signal-list";
import { UnifiedTimeline } from "@/components/timeline/unified-timeline";
import { getEmailsForContact } from "../../emails/actions";
import { getInboxEmailsForContact } from "../../emails/imap-actions";
import { getMeetingsForContact } from "@/app/(app)/meetings/actions";
import { getProposalsForContact } from "../../proposals/actions";
import { DocumentList } from "@/components/documents/document-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsentBadge } from "@/components/contacts/consent-badge";
import { ConsentActions } from "@/components/contacts/consent-actions";
import { OptOutToggle } from "@/components/contacts/opt-out-toggle";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  LinkIcon,
  Pencil,
  Trash2,
  Users,
  Shield,
  Star,
  Globe,
  MapPin,
  CalendarDays,
  Kanban,
  Sparkles,
  Clock,
  CalendarPlus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function getContactAbsenceInfo(contactId: string) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { extractAbsenceInfo } = await import("@/lib/ai/classifiers/auto-reply-analyzer");

  const supabase = createAdminClient();

  // Find the most recent auto-reply email from this contact's email address
  // First get the contact's email
  const { data: contact } = await supabase
    .from("contacts")
    .select("email")
    .eq("id", contactId)
    .single();

  if (!contact?.email) return null;

  // Find recent auto-reply from this address (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: autoReply } = await supabase
    .from("email_messages")
    .select("body_text, received_at, from_name")
    .eq("from_address", contact.email)
    .eq("classification", "auto_reply")
    .gte("received_at", thirtyDaysAgo.toISOString())
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!autoReply) return null;

  const absenceInfo = extractAbsenceInfo(autoReply.body_text);

  // Only show if return date is in the future
  if (absenceInfo.returnDate) {
    const returnDate = new Date(absenceInfo.returnDate);
    if (returnDate > new Date()) {
      return {
        returnDate: absenceInfo.returnDate,
        extracted: absenceInfo.extracted,
        receivedAt: autoReply.received_at,
        fromName: autoReply.from_name,
      };
    }
  }

  return null;
}

function buildCalcomBookingUrl(contact: { email?: string | null; first_name?: string; last_name?: string }): string | null {
  const publicUrl = process.env.CALCOM_PUBLIC_URL;
  const bookingPath = process.env.CALCOM_BOOKING_PATH;
  if (!publicUrl || !bookingPath) return null;

  const url = new URL(bookingPath, publicUrl);
  if (contact.email) url.searchParams.set("email", contact.email);
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  if (name) url.searchParams.set("name", name);
  return url.toString();
}

const relationshipLabels: Record<string, string> = {
  multiplikator: "Multiplikator",
  kunde: "Kunde",
  partner: "Partner",
  interessent: "Interessent",
  netzwerk: "Netzwerk",
  empfehler: "Empfehler",
};

const roleLabels: Record<string, string> = {
  entscheider: "Entscheider",
  beeinflusser: "Beeinflusser",
  umsetzer: "Umsetzer",
  champion: "Champion",
  gatekeeper: "Gatekeeper",
};

const trustColors: Record<string, string> = {
  hoch: "bg-green-100 text-green-800",
  mittel: "bg-yellow-100 text-yellow-800",
  niedrig: "bg-red-100 text-red-800",
  unbekannt: "bg-gray-100 text-gray-800",
};

const multiplierTypeLabels: Record<string, string> = {
  berater: "Berater",
  banker: "Banker",
  anwalt: "Anwalt",
  steuerberater: "Steuerberater",
  makler: "Makler",
  branchenexperte: "Branchenexperte",
};

function consentSourceLabel(source: string): string {
  switch (source) {
    case "email_link":
      return "per Mail-Link";
    case "manual":
      return "manuell erfasst";
    case "imported":
      return "Import";
    case "ad_hoc":
      return "ad-hoc";
    default:
      return source;
  }
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact, companies, activities, documents, fitAssessment, signals, deals, emails, meetings, proposals, inboxEmails] = await Promise.all([
    getContact(id),
    getCompaniesForSelect(),
    getActivities({ contactId: id }),
    getDocuments({ contactId: id }),
    getFitAssessment("multiplier", id),
    getSignals({ contactId: id }),
    getDealsByContact(id),
    getEmailsForContact(id),
    getMeetingsForContact(id),
    getProposalsForContact(id),
    getInboxEmailsForContact(id),
  ]);

  const absenceInfo = await getContactAbsenceInfo(id);

  async function handleDelete() {
    "use server";
    await deleteContact(id);
    redirect("/contacts");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {contact.first_name} {contact.last_name}
            </h1>
            {contact.relationship_type && (
              <Badge variant="secondary">
                {relationshipLabels[contact.relationship_type] ?? contact.relationship_type}
              </Badge>
            )}
            {contact.is_multiplier && (
              <Badge className="bg-purple-100 text-purple-800">
                Multiplikator
              </Badge>
            )}
          </div>
          {contact.position && (
            <p className="text-muted-foreground">{contact.position}</p>
          )}
        </div>
        {(() => {
          const calcomUrl = buildCalcomBookingUrl(contact);
          return calcomUrl ? (
            <a href={calcomUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Meeting buchen
              </Button>
            </a>
          ) : null;
        })()}
        {contact.email && (
          <EmailSheet
            defaultTo={contact.email}
            contactId={contact.id}
            companyId={contact.company_id ?? undefined}
          />
        )}
        <ContactSheet
          companies={companies}
          contact={contact}
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

      {absenceInfo && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              Abwesend bis {new Date(absenceInfo.returnDate).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
            <p className="text-xs text-amber-600">
              Auto-Reply erhalten am {new Date(absenceInfo.receivedAt).toLocaleDateString("de-DE")}
              {!absenceInfo.extracted && " · Datum geschätzt (kein Datum im Text gefunden)"}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info */}
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#120774] to-[#4454b8]" />
          <CardHeader>
            <CardTitle className="text-base">Kontaktdaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.companies && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Link
                  href={`/companies/${contact.companies.id}`}
                  className="hover:underline"
                >
                  {contact.companies.name}
                </Link>
              </div>
            )}
            {contact.linkedin_url && (
              <div className="flex items-center gap-2 text-sm">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  LinkedIn Profil
                </a>
              </div>
            )}
            {contact.meeting_link && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <a
                  href={contact.meeting_link.startsWith("http") ? contact.meeting_link : `https://${contact.meeting_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-primary"
                >
                  Meeting buchen
                </a>
              </div>
            )}
            {contact.region && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{contact.region}</span>
              </div>
            )}
            {contact.language && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>{contact.language === "de" ? "Deutsch" : contact.language === "nl" ? "Niederländisch" : contact.language === "en" ? "Englisch" : contact.language}</span>
              </div>
            )}
            {contact.last_interaction_date && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>Letzte Interaktion: {new Date(contact.last_interaction_date).toLocaleDateString("de-DE")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relationship & Assessment */}
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#00a84f] to-[#4dcb8b]" />
          <CardHeader>
            <CardTitle className="text-base">Beziehung & Einschätzung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.role_in_process && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Rolle: {roleLabels[contact.role_in_process] ?? contact.role_in_process}</span>
              </div>
            )}
            {contact.source && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span>Quelle: {contact.source}</span>
              </div>
            )}
            {contact.trust_level && (
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>Vertrauen:</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${trustColors[contact.trust_level] ?? "bg-gray-100 text-gray-800"}`}>
                  {contact.trust_level.charAt(0).toUpperCase() + contact.trust_level.slice(1)}
                </span>
              </div>
            )}
            {contact.referral_capability && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Empfehlungsfähigkeit: {contact.referral_capability.charAt(0).toUpperCase() + contact.referral_capability.slice(1)}</span>
              </div>
            )}
            {contact.is_multiplier && contact.multiplier_type && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span>Multiplikator-Typ: {multiplierTypeLabels[contact.multiplier_type] ?? contact.multiplier_type}</span>
              </div>
            )}
            {!contact.role_in_process && !contact.trust_level && !contact.referral_capability && !contact.source && (
              <p className="text-sm text-muted-foreground">
                Keine Beziehungsdaten hinterlegt.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Einwilligung & Kommunikation (FEAT-411) */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#4454b8] to-[#2a9d8f]" />
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#4454b8]" />
            Einwilligung & Kommunikation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <ConsentBadge status={contact.consent_status} />
            {contact.consent_date && (
              <span className="text-muted-foreground">
                Stand: {new Date(contact.consent_date).toLocaleDateString("de-DE")}
              </span>
            )}
            {contact.consent_source && (
              <span className="text-muted-foreground">
                Quelle: {consentSourceLabel(contact.consent_source)}
              </span>
            )}
          </div>
          <ConsentActions
            contactId={contact.id}
            status={contact.consent_status}
            hasEmail={Boolean(contact.email)}
            requestedAt={contact.consent_requested_at}
          />
          <div className="pt-2 border-t">
            <OptOutToggle
              contactId={contact.id}
              initial={contact.opt_out_communication}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tags + Notes */}
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-slate-400 to-slate-300" />
          <CardHeader>
            <CardTitle className="text-base">Tags & Notizen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {contact.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {contact.notes && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {contact.notes}
              </p>
            )}
            {!contact.tags?.length && !contact.notes && (
              <p className="text-sm text-muted-foreground">
                Keine Tags oder Notizen.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fit Assessment (only for multipliers) */}
      {contact.is_multiplier && (
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#f2b705] to-[#ffd54f]" />
          <CardHeader>
            <CardTitle className="text-base">Multiplikator Fit-Bewertung</CardTitle>
          </CardHeader>
          <CardContent>
            <FitAssessmentForm
              entityType="multiplier"
              entityId={id}
              assessment={fitAssessment}
            />
          </CardContent>
        </Card>
      )}

      {/* Signals */}
      <SignalList signals={signals} contactId={id} />

      {/* Deals */}
      <ContactDealSection deals={deals} />

      {/* KI-Summary Placeholder */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#120774] to-[#4454b8]" />
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#4454b8]" />
            KI-Kontakt-Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Automatische KI-Zusammenfassung dieses Kontakts — verfügbar ab V3.1.
          </p>
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
      <DocumentList documents={documents} contactId={id} />
    </div>
  );
}

const dealStatusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Aktiv", color: "bg-blue-100 text-blue-800" },
  won: { label: "Gewonnen", color: "bg-green-100 text-green-800" },
  lost: { label: "Verloren", color: "bg-red-100 text-red-800" },
};

function ContactDealSection({ deals }: { deals: ContactDeal[] }) {
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
                    <ContactDealCard key={deal.id} deal={deal} />
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
                    <ContactDealCard key={deal.id} deal={deal} />
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

function ContactDealCard({ deal }: { deal: ContactDeal }) {
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
          {deal.companies && <span>· {deal.companies.name}</span>}
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
