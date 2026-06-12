import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

// V8.15 SLC-913 MT-5 (ISSUE-119): Push-Subscription-Endpoint validiert die
// endpoint-URL gegen die Push-Service-Allowlist — SSRF-Schutz, weil web-push
// server-seitig an diese URL POSTet.

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const { POST } = await import("./route");
const { createClient } = await import("@/lib/supabase/server");

function makeServerClientMock(user: { id: string } | null) {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn(() => ({ update })),
  };
  vi.mocked(createClient).mockResolvedValue(client as never);
  return { update };
}

function subscribeRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const VALID_SUBSCRIPTION = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: { p256dh: "key", auth: "auth" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/push/subscribe (ISSUE-119: Endpoint-Allowlist)", () => {
  it("401 ohne authentifizierten User", async () => {
    makeServerClientMock(null);
    const res = await POST(subscribeRequest(VALID_SUBSCRIPTION));
    expect(res.status).toBe(401);
  });

  it("400 fuer internen Metadata-Endpoint — kein DB-Write", async () => {
    const { update } = makeServerClientMock({ id: "u1" });
    const res = await POST(
      subscribeRequest({
        ...VALID_SUBSCRIPTION,
        endpoint: "https://169.254.169.254/latest/meta-data/",
      }),
    );
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400 fuer http-Endpoint auf erlaubtem Host", async () => {
    const { update } = makeServerClientMock({ id: "u1" });
    const res = await POST(
      subscribeRequest({
        ...VALID_SUBSCRIPTION,
        endpoint: "http://fcm.googleapis.com/fcm/send/abc",
      }),
    );
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400 fuer Host-Lookalike (fcm.googleapis.com.evil.com)", async () => {
    const { update } = makeServerClientMock({ id: "u1" });
    const res = await POST(
      subscribeRequest({
        ...VALID_SUBSCRIPTION,
        endpoint: "https://fcm.googleapis.com.evil.com/fcm/send/abc",
      }),
    );
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("200 fuer legitimen FCM-Endpoint — Subscription wird gespeichert", async () => {
    const { update } = makeServerClientMock({ id: "u1" });
    const res = await POST(subscribeRequest(VALID_SUBSCRIPTION));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("200 fuer legitimen Mozilla-Endpoint", async () => {
    const { update } = makeServerClientMock({ id: "u1" });
    const res = await POST(
      subscribeRequest({
        ...VALID_SUBSCRIPTION,
        endpoint: "https://updates.push.services.mozilla.com/wpush/v2/token",
      }),
    );
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
