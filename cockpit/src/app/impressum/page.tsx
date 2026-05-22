import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { renderLegalMarkdown } from "@/lib/legal/markdown";
import { LegalPageShell } from "@/components/layout/legal-page-shell";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum — Strategaize Transition B.V.",
};

export default async function ImpressumPage() {
  const filePath = path.join(process.cwd(), "src", "content", "legal", "impressum.md");
  const markdown = await readFile(filePath, "utf-8");
  const html = await renderLegalMarkdown(markdown);

  return <LegalPageShell html={html} />;
}
