import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderLegalMarkdown } from "@/lib/legal/markdown";
import { HelpPageShell } from "@/components/help/help-page-shell";
import { getHelpGuideBySlug, listHelpSlugs } from "@/lib/help/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getHelpGuideBySlug(slug);
  if (!guide) {
    return { title: "Hilfe" };
  }
  return {
    title: guide.title,
    description: `Hilfe-Guide: ${guide.title}`,
  };
}

export async function generateStaticParams() {
  return listHelpSlugs().map((slug) => ({ slug }));
}

export default async function HelpGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getHelpGuideBySlug(slug);
  if (!guide) notFound();

  const filePath = path.join(
    process.cwd(),
    "src",
    "content",
    "help",
    `${slug}.md`,
  );

  let markdown: string;
  try {
    markdown = await readFile(filePath, "utf-8");
  } catch {
    notFound();
  }

  const html = await renderLegalMarkdown(markdown);
  return <HelpPageShell html={html} />;
}
