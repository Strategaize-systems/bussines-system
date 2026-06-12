// V8.7-B SLC-355 — Geteilte Typen fuer die Verdichtungs-Pipeline (DEC-289).
//
// WICHTIG: KEINE company.name / contact / deal.title in diesen Shapes — nur
// `branche` (= companies.industry oder "unknown"), Bucket-Dimensionen und
// Freitext-Bodies (die durch MT-3 Anonymisierung + MT-5 Redact laufen).

import type { SizeBucket } from "./config";

export type TargetStatus = "won" | "lost";

export interface WinLossBucket {
  /** Rohe Branche (companies.industry) oder "unknown". Slug-Normalisierung in MT-4. */
  branche: string;
  sizeBucket: SizeBucket;
  targetStatus: TargetStatus;
  dealCount: number;
  /** Roh-Markdowns der Win/Loss-Analysen (bedrock_output), Input fuer MT-3. */
  runMarkdowns: string[];
}

export interface ObjectionGroup {
  branche: string;
  noteCount: number;
  /** Freitext-Activity-Notizen (activities.description), Input fuer MT-3. */
  notes: string[];
}
