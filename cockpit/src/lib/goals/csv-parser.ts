import type { GoalType, GoalPeriod } from "@/types/goals";
import type { Product } from "@/types/products";

export type GoalImportRow = {
  type: GoalType;
  period: GoalPeriod;
  period_start: string;
  target_value: number;
  product_id: string | null;
  product_name: string;
};

export type CsvParseError = {
  line: number;
  message: string;
};

export type CsvParseResult = {
  valid: GoalImportRow[];
  errors: CsvParseError[];
};

const VALID_TYPES: GoalType[] = ["revenue", "deal_count", "win_rate"];
const VALID_PERIODS: GoalPeriod[] = ["month", "quarter", "year"];

function isValidDate(dateStr: string): boolean {
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

export function parseGoalsCsv(
  csvString: string,
  products: Product[],
): CsvParseResult {
  const valid: GoalImportRow[] = [];
  const errors: CsvParseError[] = [];

  const lines = csvString
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    errors.push({ line: 0, message: "CSV ist leer" });
    return { valid, errors };
  }

  // Skip header if it looks like one
  const header = lines[0].toLowerCase();
  const startLine = header.includes("type") && header.includes("period") ? 1 : 0;

  if (startLine >= lines.length) {
    errors.push({ line: 1, message: "Keine Datenzeilen nach Header" });
    return { valid, errors };
  }

  for (let i = startLine; i < lines.length; i++) {
    const lineNum = i + 1;
    const cols = lines[i].split(",").map((c) => c.trim());

    if (cols.length < 4) {
      errors.push({
        line: lineNum,
        message: `Zu wenig Spalten (${cols.length}, erwartet mindestens 4)`,
      });
      continue;
    }

    const [typeStr, periodStr, periodStartStr, targetStr, productNameStr] = cols;

    // Validate type
    if (!VALID_TYPES.includes(typeStr as GoalType)) {
      errors.push({
        line: lineNum,
        message: `Ungueltiger Typ "${typeStr}" (erlaubt: ${VALID_TYPES.join(", ")})`,
      });
      continue;
    }

    // Validate period
    if (!VALID_PERIODS.includes(periodStr as GoalPeriod)) {
      errors.push({
        line: lineNum,
        message: `Ungueltiger Zeitraum "${periodStr}" (erlaubt: ${VALID_PERIODS.join(", ")})`,
      });
      continue;
    }

    // Validate date
    if (!isValidDate(periodStartStr)) {
      errors.push({
        line: lineNum,
        message: `Ungueltiges Datum "${periodStartStr}" (Format: YYYY-MM-DD)`,
      });
      continue;
    }

    // Validate target value
    const targetValue = parseFloat(targetStr);
    if (isNaN(targetValue) || targetValue <= 0) {
      errors.push({
        line: lineNum,
        message: `Ungueltiger Sollwert "${targetStr}" (muss positive Zahl sein)`,
      });
      continue;
    }

    // Resolve product name
    let productId: string | null = null;
    const productName = productNameStr?.trim() || "";

    if (productName) {
      const product = products.find(
        (p) => p.name.toLowerCase() === productName.toLowerCase(),
      );
      if (!product) {
        errors.push({
          line: lineNum,
          message: `Produkt "${productName}" nicht gefunden`,
        });
        continue;
      }
      productId = product.id;
    }

    valid.push({
      type: typeStr as GoalType,
      period: periodStr as GoalPeriod,
      period_start: periodStartStr,
      target_value: targetValue,
      product_id: productId,
      product_name: productName || "Gesamt",
    });
  }

  return { valid, errors };
}

export const CSV_TEMPLATE = `type,period,period_start,target_value,product_name
revenue,year,2026-01-01,500000,
revenue,year,2026-01-01,200000,Blueprint Classic
deal_count,quarter,2026-04-01,15,
win_rate,year,2026-01-01,30,`;
