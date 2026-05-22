import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { renderLegalMarkdown } from "@/lib/legal/markdown";
import { LegalPageShell } from "@/components/layout/legal-page-shell";

export const metadata: Metadata = {
  title: "Datenschutz",
  description:
    "Datenschutzerklaerung — Strategaize Business Development System",
};

export default async function DatenschutzPage() {
  const filePath = path.join(process.cwd(), "src", "content", "legal", "datenschutz.md");
  const markdown = await readFile(filePath, "utf-8");
  const html = await renderLegalMarkdown(markdown);

  return <LegalPageShell html={html} />;
}
