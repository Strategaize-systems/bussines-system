import { getContact, deleteContact } from "../actions";
import { getCompaniesForSelect } from "../../companies/actions";
import { ContactSheet } from "../contact-sheet";
import { EmailSheet } from "../../emails/email-sheet";
import { getActivities } from "@/lib/actions/activity-actions";
import { getDocuments } from "@/lib/actions/document-actions";
import { getFitAssessment } from "../../fit-assessment/actions";
import { getSignals } from "../../fit-assessment/signal-actions";
import { FitAssessmentForm } from "../../fit-assessment/fit-assessment-form";
import { SignalList } from "../../fit-assessment/signal-list";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { DocumentList } from "@/components/documents/document-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

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

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact, companies, activities, documents, fitAssessment, signals] = await Promise.all([
    getContact(id),
    getCompaniesForSelect(),
    getActivities({ contactId: id }),
    getDocuments({ contactId: id }),
    getFitAssessment("multiplier", id),
    getSignals({ contactId: id }),
  ]);

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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info */}
        <Card>
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
        <Card>
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tags + Notes */}
        <Card>
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
        <Card>
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

      {/* Activities */}
      <ActivityTimeline activities={activities} contactId={id} />

      {/* Documents */}
      <DocumentList documents={documents} contactId={id} />
    </div>
  );
}
