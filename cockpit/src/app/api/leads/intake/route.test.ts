import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

// V8.15 SLC-913 MT-5 (ISSUE-118): Lead-Intake mit eigenem write-scoped Key
// (LEAD_INTAKE_API_KEY statt EXPORT_API_KEY), Rate-Limit + Laengen-Caps.

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/campaigns/mapper", () => ({
  resolveCampaignFromUtm: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/export/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
}));

const { POST } = await import("./route");
const { createAdminClient } = await import("@/lib/supabase/admin");
const { checkRateLimit } = await import("@/lib/export/rate-limit");

// Table-gerouteter Admin-Mock (IMP-1240-Pattern): contacts-Lookup leer,
// contacts-Insert liefert id, audit_log-Insert resolved.
function makeRoutedAdminMock() {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const contacts = {
    select: vi.fn(() => ({
      ilike: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: "contact-1" }, error: null }),
      })),
    })),
  };
  const from = vi.fn((table: string) => {
    if (table === "contacts") return contacts;
    if (table === "audit_log") return { insert: auditInsert };
    throw new Error(`unexpected table: ${table}`);
  });
  return { client: { from }, contacts, auditInsert };
}

function intakeRequest(
  body: Record<string, unknown>,
  authToken?: string,
): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  return new Request("http://localhost/api/leads/intake", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  first_name: "Max",
  last_name: "Mustermann",
  email: "max@example.com",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkRateLimit).mockReturnValue(null);
  vi.stubEnv("LEAD_INTAKE_API_KEY", "intake-key-123");
  vi.stubEnv("EXPORT_API_KEY", "export-key-456");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/leads/intake — Key-Separation (ISSUE-118)", () => {
  it("401 ohne Authorization-Header", async () => {
    const res = await POST(intakeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("401 mit EXPORT_API_KEY — der read-scoped Key traegt keine Schreibrechte mehr", async () => {
    const res = await POST(intakeRequest(VALID_BODY, "export-key-456"));
    expect(res.status).toBe(401);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("500 wenn LEAD_INTAKE_API_KEY nicht konfiguriert ist (fail-closed)", async () => {
    vi.stubEnv("LEAD_INTAKE_API_KEY", "");
    const res = await POST(intakeRequest(VALID_BODY, "intake-key-123"));
    expect(res.status).toBe(500);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("201 mit korrektem LEAD_INTAKE_API_KEY (Happy Path, neuer Contact)", async () => {
    const mock = makeRoutedAdminMock();
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const res = await POST(intakeRequest(VALID_BODY, "intake-key-123"));
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.contact_id).toBe("contact-1");
    expect(mock.contacts.insert).toHaveBeenCalledTimes(1);
    expect(mock.auditInsert).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/leads/intake — Rate-Limit (ISSUE-118)", () => {
  it("429-Response des Rate-Limiters wird durchgereicht, kein DB-Zugriff", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(
      NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 }),
    );

    const res = await POST(intakeRequest(VALID_BODY, "intake-key-123"));
    expect(res.status).toBe(429);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});

describe("POST /api/leads/intake — Laengen-Caps (ISSUE-118)", () => {
  it.each([
    ["first_name", "x".repeat(101)],
    ["last_name", "x".repeat(101)],
    ["email", `${"x".repeat(250)}@example.com`],
    ["phone", "1".repeat(51)],
    ["company_name", "x".repeat(201)],
    ["notes", "x".repeat(5001)],
    ["utm_source", "x".repeat(201)],
  ])("400 bei ueberlangem %s", async (field, value) => {
    const res = await POST(
      intakeRequest({ ...VALID_BODY, [field]: value }, "intake-key-123"),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(String(body.error)).toContain(field);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("400 bei ueberlanger company_website", async () => {
    const res = await POST(
      intakeRequest(
        { ...VALID_BODY, company_website: `https://example.com/${"x".repeat(2050)}` },
        "intake-key-123",
      ),
    );
    expect(res.status).toBe(400);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("Werte exakt am Cap passieren die Validierung", async () => {
    const mock = makeRoutedAdminMock();
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const res = await POST(
      intakeRequest(
        { ...VALID_BODY, first_name: "x".repeat(100), notes: "n".repeat(5000) },
        "intake-key-123",
      ),
    );
    expect(res.status).toBe(201);
  });
});
