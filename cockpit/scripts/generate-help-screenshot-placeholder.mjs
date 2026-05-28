#!/usr/bin/env node
// V8.8 SLC-881 MT-6 — generates a 2560x1800 WebP placeholder for
// /help/screenshots/mein-tag.webp so the page renders end-to-end while the
// real Mein-Tag capture is being produced. Hotspot regions from
// src/content/help/hotspots/mein-tag.json are drawn as outlined boxes so a
// reviewer can sanity-check the coordinates visually before the real
// screenshot lands.
//
// Replace produced file with a real Playwright/Chrome-DevTools capture
// (viewport 1280x900, deviceScaleFactor=2, WebP quality 82-85%) before /qa.

import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const JSON_PATH = path.join(
  REPO_ROOT,
  "src",
  "content",
  "help",
  "hotspots",
  "mein-tag.json",
);
const OUT_DIR = path.join(REPO_ROOT, "public", "help", "screenshots");
const OUT_PATH = path.join(OUT_DIR, "mein-tag.webp");

const W = 2560;
const H = 1800;

const page = JSON.parse(await readFile(JSON_PATH, "utf-8"));

const boxes = page.hotspots
  .map((h, i) => {
    const x = Math.round((h.x / 100) * W);
    const y = Math.round((h.y / 100) * H);
    const w = Math.round((h.w / 100) * W);
    const h2 = Math.round((h.h / 100) * H);
    const labelY = y + 60;
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h2}" fill="#fef3c7" stroke="#d97706" stroke-width="6" rx="12" />
      <text x="${x + 24}" y="${labelY}" font-family="sans-serif" font-size="44" fill="#78350f" font-weight="700">${i + 1}. ${h.title}</text>
    `;
  })
  .join("\n");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f8fafc" />
  <rect x="0" y="0" width="480" height="${H}" fill="#1e293b" />
  <text x="60" y="120" font-family="sans-serif" font-size="40" fill="#f1f5f9" font-weight="700">Strategaize</text>
  <text x="60" y="200" font-family="sans-serif" font-size="32" fill="#94a3b8">(Sidebar)</text>
  <text x="640" y="120" font-family="sans-serif" font-size="56" fill="#0f172a" font-weight="700">Mein Tag</text>
  <text x="640" y="180" font-family="sans-serif" font-size="32" fill="#475569">PILOT-PLACEHOLDER — ersetzen durch echten Capture vor /qa</text>
  ${boxes}
  <text x="${W / 2}" y="${H - 60}" font-family="sans-serif" font-size="36" fill="#94a3b8" text-anchor="middle">scripts/generate-help-screenshot-placeholder.mjs</text>
</svg>`;

await mkdir(OUT_DIR, { recursive: true });
const buf = await sharp(Buffer.from(svg))
  .webp({ quality: 85 })
  .toBuffer();
await writeFile(OUT_PATH, buf);

console.log(`wrote placeholder: ${OUT_PATH} (${buf.length} bytes, ${W}x${H})`);
