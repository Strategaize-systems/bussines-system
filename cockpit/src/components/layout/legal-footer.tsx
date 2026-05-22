import Link from "next/link";

/**
 * Footer with links to Datenschutz + Impressum.
 * Server-Component, rendered in (app)/layout, (auth) pages, and the two
 * legal public pages themselves for consistency (SLC-825 V8.2).
 */
export function LegalFooter() {
  return (
    <footer className="border-t mt-12 py-6 text-sm text-muted-foreground">
      <nav className="flex gap-6 max-w-3xl mx-auto px-4 justify-center md:justify-start">
        <Link href="/datenschutz" className="hover:text-foreground transition-colors">
          Datenschutz
        </Link>
        <Link href="/impressum" className="hover:text-foreground transition-colors">
          Impressum
        </Link>
      </nav>
    </footer>
  );
}
