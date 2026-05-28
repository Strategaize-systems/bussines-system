import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import {
  HotspotSchema,
  HotspotPageSchema,
  parseHotspotPageJson,
} from "@/lib/help/hotspot-schema";

const validHotspot = {
  id: "ki-workspace",
  x: 10,
  y: 10,
  w: 30,
  h: 20,
  title: "KI-Workspace",
  body_md: "Hier finden Sie die KI-Berichts-Buttons.",
};

const validPage = {
  slug: "mein-tag",
  imageUrl: "/help/screenshots/mein-tag.webp",
  imageWidth: 2560,
  imageHeight: 1800,
  imageAlt: "Screenshot der Seite Mein Tag mit Hotspots.",
  hotspots: [validHotspot],
};

describe("HotspotSchema", () => {
  it("accepts a valid hotspot (happy path)", () => {
    expect(() => HotspotSchema.parse(validHotspot)).not.toThrow();
  });

  it("rejects id that is not kebab-case", () => {
    expect(() =>
      HotspotSchema.parse({ ...validHotspot, id: "KI_Workspace" }),
    ).toThrow(ZodError);
  });

  it("rejects coordinates above 100", () => {
    expect(() =>
      HotspotSchema.parse({ ...validHotspot, x: 150 }),
    ).toThrow(ZodError);
  });

  it("rejects body_md longer than 2000 chars", () => {
    const tooLong = "x".repeat(2001);
    expect(() =>
      HotspotSchema.parse({ ...validHotspot, body_md: tooLong }),
    ).toThrow(ZodError);
  });

  it("rejects horizontal clip (x + w > 100)", () => {
    expect(() =>
      HotspotSchema.parse({ ...validHotspot, x: 80, w: 30 }),
    ).toThrow(/x \+ w must be <= 100/);
  });

  it("rejects vertical clip (y + h > 100)", () => {
    expect(() =>
      HotspotSchema.parse({ ...validHotspot, y: 90, h: 20 }),
    ).toThrow(/y \+ h must be <= 100/);
  });

  it("accepts optional video_url when it is a valid URL", () => {
    expect(() =>
      HotspotSchema.parse({
        ...validHotspot,
        video_url: "https://videos.example.com/mein-tag.mp4",
      }),
    ).not.toThrow();
  });
});

describe("HotspotPageSchema", () => {
  it("rejects imageUrl that does not match the screenshot path pattern", () => {
    expect(() =>
      HotspotPageSchema.parse({
        ...validPage,
        imageUrl: "/uploads/mein-tag.png",
      }),
    ).toThrow(/imageUrl/);
  });

  it("rejects empty hotspots array", () => {
    expect(() =>
      HotspotPageSchema.parse({ ...validPage, hotspots: [] }),
    ).toThrow(ZodError);
  });
});

describe("parseHotspotPageJson", () => {
  it("returns a typed page on happy path", () => {
    const result = parseHotspotPageJson(validPage, "mein-tag");
    expect(result.slug).toBe("mein-tag");
    expect(result.hotspots).toHaveLength(1);
  });

  it("throws on slug mismatch between file path and JSON content", () => {
    expect(() =>
      parseHotspotPageJson(validPage, "pipeline"),
    ).toThrow(/slug mismatch/);
  });

  it("throws on duplicate hotspot ids within one page", () => {
    const dupePage = {
      ...validPage,
      hotspots: [validHotspot, { ...validHotspot, x: 50, y: 50 }],
    };
    expect(() =>
      parseHotspotPageJson(dupePage, "mein-tag"),
    ).toThrow(/duplicate hotspot ids/);
  });
});
