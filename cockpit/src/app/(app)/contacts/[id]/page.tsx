import { getContact, deleteContact } from "../actions";
import { getCompaniesForSelect } from "../../companies/actions";
import { ContactSheet } from "../contact-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Mail, Phone, LinkIcon, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact, companies] = await Promise.all([
    getContact(id),
    getCompaniesForSelect(),
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
          <h1 className="text-2xl font-semibold tracking-tight">
            {contact.first_name} {contact.last_name}
          </h1>
          {contact.position && (
            <p className="text-muted-foreground">{contact.position}</p>
          )}
        </div>
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
          </CardContent>
        </Card>

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

      {/* Placeholder for Activities (SLC-005) and Documents (SLC-005) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktivitäten</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aktivitäten-Timeline wird in SLC-005 implementiert.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
