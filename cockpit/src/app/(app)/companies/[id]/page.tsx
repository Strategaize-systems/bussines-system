import { getCompany, getCompanyContacts, deleteCompany } from "../actions";
import { CompanySheet } from "../company-sheet";
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
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [company, contacts] = await Promise.all([
    getCompany(id),
    getCompanyContacts(id),
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
          <h1 className="text-2xl font-semibold tracking-tight">
            {company.name}
          </h1>
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
        <Card>
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
        <Card>
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

      {/* Assigned Contacts */}
      <Card>
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
    </div>
  );
}
