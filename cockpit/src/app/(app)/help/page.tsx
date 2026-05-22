import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  groupBySection,
  rolesBadgeLabel,
  type HelpGuide,
} from "@/lib/help/catalog";

export const metadata: Metadata = {
  title: "Hilfe & Anleitungen",
  description:
    "Bedienungsanleitung fuer das Strategaize Business Development System.",
};

export default function HelpIndexPage() {
  const groups = groupBySection();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Hilfe & Anleitungen"
        subtitle="Anleitungen zu allen Funktionen. Gegliedert nach User-Flows, nicht nach Features."
      />

      <main className="px-8 py-8">
        <div className="max-w-[1200px] mx-auto space-y-10">
          {groups.map((group) => (
            <section key={group.meta.id} aria-labelledby={`help-section-${group.meta.id}`}>
              <div className="mb-4">
                <h2
                  id={`help-section-${group.meta.id}`}
                  className="text-xl font-semibold text-slate-900 tracking-tight"
                >
                  {group.meta.label}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {group.meta.description}
                </p>
              </div>
              <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {group.guides.map((guide) => (
                  <li key={guide.slug}>
                    <HelpTile guide={guide} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

function HelpTile({ guide }: { guide: HelpGuide }) {
  return (
    <Link
      href={`/help/${guide.slug}`}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
    >
      <h3 className="text-base font-semibold text-slate-900 leading-snug mb-3">
        {guide.title}
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Clock aria-hidden="true" />
          {guide.durationMinutes} Min
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Users aria-hidden="true" />
          {rolesBadgeLabel(guide.roles)}
        </Badge>
      </div>
    </Link>
  );
}
