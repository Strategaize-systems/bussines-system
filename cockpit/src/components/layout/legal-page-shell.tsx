import { LegalFooter } from "./legal-footer";

/**
 * Shared shell for legal public pages (/datenschutz, /impressum).
 * Renders the rendered Markdown HTML inside a Style-Guide-V2 container
 * with LegalFooter at the bottom for consistency.
 */
export function LegalPageShell({ html }: { html: string }) {
  return (
    <main className="min-h-screen bg-background">
      <article className="legal-content max-w-3xl mx-auto px-4 py-12 md:py-16">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>
      <LegalFooter />
    </main>
  );
}
