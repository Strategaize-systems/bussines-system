import { describe, it, expect } from "vitest";
import {
  buildDocumentStoragePath,
  isUserScopedPath,
  classifyBackfillCandidate,
} from "../document-path";

const USER = "550e8400-e29b-41d4-a716-446655440000";
const CONTACT = "00000000-0000-4000-8000-000000000001";
const COMPANY = "00000000-0000-4000-8000-000000000002";
const DEAL = "00000000-0000-4000-8000-000000000003";

describe("buildDocumentStoragePath", () => {
  it("misc-Folder wenn keine entity-Verknuepfung gesetzt ist", () => {
    const path = buildDocumentStoragePath({
      userId: USER,
      filename: "notes.txt",
      timestamp: 1717322400000,
    });
    expect(path).toBe(`${USER}/misc/1717322400000_notes.txt`);
  });

  it("contacts-Folder wenn contactId gesetzt", () => {
    const path = buildDocumentStoragePath({
      userId: USER,
      filename: "invoice.pdf",
      contactId: CONTACT,
      timestamp: 1717322400000,
    });
    expect(path).toBe(
      `${USER}/contacts/${CONTACT}/1717322400000_invoice.pdf`
    );
  });

  it("companies-Folder wenn companyId gesetzt", () => {
    const path = buildDocumentStoragePath({
      userId: USER,
      filename: "kvk.pdf",
      companyId: COMPANY,
      timestamp: 1717322400000,
    });
    expect(path).toBe(`${USER}/companies/${COMPANY}/1717322400000_kvk.pdf`);
  });

  it("deals-Folder wenn dealId gesetzt", () => {
    const path = buildDocumentStoragePath({
      userId: USER,
      filename: "proposal.pdf",
      dealId: DEAL,
      timestamp: 1717322400000,
    });
    expect(path).toBe(`${USER}/deals/${DEAL}/1717322400000_proposal.pdf`);
  });

  it("Prio bei Mehrfach-Verknuepfung: contact > company > deal", () => {
    const path = buildDocumentStoragePath({
      userId: USER,
      filename: "a.pdf",
      contactId: CONTACT,
      companyId: COMPANY,
      dealId: DEAL,
      timestamp: 1717322400000,
    });
    expect(path).toBe(`${USER}/contacts/${CONTACT}/1717322400000_a.pdf`);
  });

  it("Prio: companyId vor dealId wenn kein contactId", () => {
    const path = buildDocumentStoragePath({
      userId: USER,
      filename: "a.pdf",
      companyId: COMPANY,
      dealId: DEAL,
      timestamp: 1717322400000,
    });
    expect(path).toBe(`${USER}/companies/${COMPANY}/1717322400000_a.pdf`);
  });

  it("erstes Path-Segment ist immer die userId", () => {
    const path = buildDocumentStoragePath({
      userId: USER,
      filename: "anything.pdf",
      contactId: CONTACT,
    });
    expect(path.split("/")[0]).toBe(USER);
  });

  it("kein 'documents/'-Praefix mehr (DEC-264 Aenderung gegenueber V8.9)", () => {
    const path = buildDocumentStoragePath({
      userId: USER,
      filename: "a.pdf",
    });
    expect(path.startsWith("documents/")).toBe(false);
  });

  it("default-Timestamp wenn nicht uebergeben", () => {
    const before = Date.now();
    const path = buildDocumentStoragePath({
      userId: USER,
      filename: "a.pdf",
    });
    const after = Date.now();

    const tsMatch = path.match(/\/(\d+)_a\.pdf$/);
    expect(tsMatch).not.toBeNull();
    const ts = Number(tsMatch![1]);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("throw bei invalider userId", () => {
    expect(() =>
      buildDocumentStoragePath({
        userId: "not-a-uuid",
        filename: "a.pdf",
      })
    ).toThrow(/userId muss UUID/);
  });

  it("throw bei leerem filename", () => {
    expect(() =>
      buildDocumentStoragePath({
        userId: USER,
        filename: "",
      })
    ).toThrow(/filename darf nicht leer/);
  });

  it("filename mit Sonderzeichen wird durchgereicht (nicht sanitized)", () => {
    const path = buildDocumentStoragePath({
      userId: USER,
      filename: "Konzept Übersicht 2026-Q2.pdf",
      timestamp: 1717322400000,
    });
    expect(path).toBe(`${USER}/misc/1717322400000_Konzept Übersicht 2026-Q2.pdf`);
  });
});

describe("isUserScopedPath", () => {
  it("true wenn erstes Segment eine UUID v4 ist", () => {
    expect(isUserScopedPath(`${USER}/misc/123_a.pdf`)).toBe(true);
    expect(isUserScopedPath(`${USER}/contacts/abc/123_a.pdf`)).toBe(true);
  });

  it("false bei altem documents/-Praefix", () => {
    expect(isUserScopedPath("documents/contacts/abc/123_a.pdf")).toBe(false);
    expect(isUserScopedPath("documents/misc/123_a.pdf")).toBe(false);
  });

  it("false bei leerem Pfad", () => {
    expect(isUserScopedPath("")).toBe(false);
  });

  it("false bei Pfad ohne /", () => {
    expect(isUserScopedPath("just-a-filename.pdf")).toBe(false);
  });

  it("false bei nicht-UUID erstem Segment", () => {
    expect(isUserScopedPath("misc/123_a.pdf")).toBe(false);
    expect(isUserScopedPath("contacts/abc/123_a.pdf")).toBe(false);
  });
});

describe("classifyBackfillCandidate", () => {
  const FALLBACK = "11111111-2222-4333-8444-555555555555";

  it("skip wenn Pfad bereits user-scoped", () => {
    const d = classifyBackfillCandidate(
      `${USER}/misc/123_a.pdf`,
      USER,
      FALLBACK
    );
    expect(d.action).toBe("skip-already-migrated");
  });

  it("move mit created_by-Owner wenn created_by gesetzt", () => {
    const d = classifyBackfillCandidate(
      "documents/contacts/abc/123_a.pdf",
      USER,
      FALLBACK
    );
    expect(d).toEqual({
      action: "move",
      newPath: `${USER}/contacts/abc/123_a.pdf`,
      ownerId: USER,
      ownerSource: "created_by",
    });
  });

  it("move mit fallback wenn created_by NULL und FALLBACK gesetzt", () => {
    const d = classifyBackfillCandidate(
      "documents/misc/123_a.pdf",
      null,
      FALLBACK
    );
    expect(d).toEqual({
      action: "move",
      newPath: `${FALLBACK}/misc/123_a.pdf`,
      ownerId: FALLBACK,
      ownerSource: "fallback",
    });
  });

  it("orphan wenn created_by NULL und FALLBACK NULL", () => {
    const d = classifyBackfillCandidate(
      "documents/misc/123_a.pdf",
      null,
      null
    );
    expect(d.action).toBe("orphan");
  });

  it("orphan wenn created_by invalid UUID und FALLBACK NULL", () => {
    const d = classifyBackfillCandidate(
      "documents/misc/123_a.pdf",
      "not-a-uuid",
      null
    );
    expect(d.action).toBe("orphan");
  });

  it("strip documents/-Praefix bei move", () => {
    const d = classifyBackfillCandidate(
      "documents/contacts/abc/123_a.pdf",
      USER,
      null
    );
    if (d.action !== "move") throw new Error("expected move");
    expect(d.newPath.startsWith(`${USER}/`)).toBe(true);
    expect(d.newPath.includes("documents/")).toBe(false);
  });

  it("Pfad ohne documents/-Praefix wird auch korrekt geprefixt", () => {
    // Edge: storage.objects.name koennte ohne documents/ existieren (z.B.
    // wenn schon ein Teil-Backfill lief). Behandelt wie strip-no-op.
    const d = classifyBackfillCandidate("misc/123_a.pdf", USER, null);
    if (d.action !== "move") throw new Error("expected move");
    expect(d.newPath).toBe(`${USER}/misc/123_a.pdf`);
  });

  it("created_by Prio vor FALLBACK", () => {
    const d = classifyBackfillCandidate(
      "documents/misc/123_a.pdf",
      USER,
      FALLBACK
    );
    if (d.action !== "move") throw new Error("expected move");
    expect(d.ownerId).toBe(USER);
    expect(d.ownerSource).toBe("created_by");
  });
});
