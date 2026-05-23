import { LegalFooter } from "./legal-footer";

/**
 * Public-Page-Shell fuer `/p/[tenant-slug]/datenschutz`.
 *
 * Analog `LegalPageShell` (Plattform-DSE) aber mit Tenant-Name-Header oben,
 * damit der Besucher sofort sieht, wessen DSE er liest. CSS-Schicht
 * `.customer-dse-content` ist eigene Layer (parallel zu `.legal-content` /
 * `.help-content`, User-Direktive: keine Reuse damit unabhaengig polierbar).
 */
export function CustomerDsePageShell({
  html,
  tenantName,
}: {
  html: string;
  tenantName: string;
}) {
  return (
    <main className="min-h-screen bg-background">
      <header className="max-w-3xl mx-auto px-4 pt-12 md:pt-16">
        <h1 className="text-3xl font-bold leading-tight">
          Datenschutzerklaerung — {tenantName}
        </h1>
      </header>
      <article className="customer-dse-content max-w-3xl mx-auto px-4 pb-12 md:pb-16">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>
      <LegalFooter />
    </main>
  );
}
