import { describe, it, expect, beforeEach, vi } from "vitest";

const { readFileMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: { readFile: readFileMock },
  readFile: readFileMock,
}));

import { loadHotspotPage } from "@/lib/help/hotspot-loader";

const validPageJson = {
  slug: "mein-tag",
  imageUrl: "/help/screenshots/mein-tag.webp",
  imageWidth: 2560,
  imageHeight: 1800,
  imageAlt: "Screenshot der Seite Mein Tag.",
  hotspots: [
    {
      id: "ki-workspace",
      x: 5,
      y: 5,
      w: 30,
      h: 20,
      title: "KI-Workspace",
      body_md: "Hier finden Sie die **KI-Berichts-Buttons**.",
    },
    {
      id: "aufgaben-heute",
      x: 5,
      y: 35,
      w: 30,
      h: 20,
      title: "Aufgaben heute",
      body_md: "Liste der offenen Aufgaben.",
    },
  ],
};

describe("loadHotspotPage", () => {
  beforeEach(() => {
    readFileMock.mockReset();
  });

  it("returns null when the JSON file does not exist (ENOENT)", async () => {
    const err = Object.assign(new Error("no such file"), { code: "ENOENT" });
    readFileMock.mockRejectedValueOnce(err);

    const result = await loadHotspotPage("pipeline");
    expect(result).toBeNull();
  });

  it("returns pre-rendered HotspotPageData on happy path", async () => {
    readFileMock.mockResolvedValueOnce(JSON.stringify(validPageJson));

    const result = await loadHotspotPage("mein-tag");

    expect(result).not.toBeNull();
    expect(result?.slug).toBe("mein-tag");
    expect(result?.imageUrl).toBe("/help/screenshots/mein-tag.webp");
    expect(result?.hotspots).toHaveLength(2);

    const first = result?.hotspots[0];
    expect(first?.id).toBe("ki-workspace");
    expect(first?.bodyHtml).toContain("<strong>KI-Berichts-Buttons</strong>");
    expect(first).not.toHaveProperty("body_md");
  });

  it("throws when JSON slug does not match the requested slug", async () => {
    readFileMock.mockResolvedValueOnce(JSON.stringify(validPageJson));

    await expect(loadHotspotPage("pipeline")).rejects.toThrow(/slug mismatch/);
  });

  it("throws on duplicate hotspot ids within one page", async () => {
    const dupe = {
      ...validPageJson,
      hotspots: [
        validPageJson.hotspots[0],
        { ...validPageJson.hotspots[0], x: 50, y: 50 },
      ],
    };
    readFileMock.mockResolvedValueOnce(JSON.stringify(dupe));

    await expect(loadHotspotPage("mein-tag")).rejects.toThrow(
      /duplicate hotspot ids/,
    );
  });

  it("re-throws non-ENOENT I/O errors instead of returning null", async () => {
    const err = Object.assign(new Error("permission denied"), {
      code: "EACCES",
    });
    readFileMock.mockRejectedValueOnce(err);

    await expect(loadHotspotPage("mein-tag")).rejects.toThrow(
      /permission denied/,
    );
  });
});
