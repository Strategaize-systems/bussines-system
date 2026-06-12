import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Profile } from "@/lib/auth/types";

// V8.14 SLC-912 MT-4 (ISSUE-101 + ISSUE-102) — uploadLogo Role-Check + SVG-MIME-Block.

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/auth/read-only-context", () => ({
  assertNotReadOnlyContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/assert-role", () => ({ assertRole: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const { uploadLogo } = await import("../actions");
const { assertRole } = await import("@/lib/auth/assert-role");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");

const ADMIN_PROFILE: Profile = {
  user_id: "55555555-5555-5555-5555-555555555555",
  role: "admin",
  team_id: "11111111-1111-1111-1111-111111111111",
  display_name: "Admin",
};

function makeFileFormData(type: string): FormData {
  const fd = new FormData();
  fd.set("file", new File([new Uint8Array([1, 2, 3])], "logo", { type }));
  return fd;
}

// User-Client (requireUser + getBranding). branding_settings select chain -> null.
function makeUserClient() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u-1" } } }) },
    from: vi.fn(() => ({
      select: () => ({
        order: () => ({
          limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
      }),
    })),
  };
}

// Admin-Client: storage upload ok + branding_settings select->null + insert ok.
function makeAdminClient() {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const insert = vi.fn().mockResolvedValue({ error: null });
  return {
    storage: {
      from: () => ({
        upload,
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
    from: vi.fn(() => ({
      select: () => ({
        order: () => ({
          limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
      }),
      insert,
    })),
    _upload: upload,
    _insert: insert,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "https://bs.example.com";
});

describe("uploadLogo — role check + SVG block (V8.14 SLC-912 MT-4)", () => {
  it("throws for a non-admin (assertRole redirect)", async () => {
    (assertRole as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT:/mein-tag");
    });
    const admin = makeAdminClient();
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    await expect(uploadLogo(makeFileFormData("image/png"))).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    // Admin client (BYPASSRLS) must never be reached for a non-admin.
    expect(admin._upload).not.toHaveBeenCalled();
  });

  it("rejects an SVG upload (image/svg+xml not in whitelist) without touching storage", async () => {
    (assertRole as ReturnType<typeof vi.fn>).mockResolvedValue(ADMIN_PROFILE);
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeUserClient());
    const admin = makeAdminClient();
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    const result = await uploadLogo(makeFileFormData("image/svg+xml"));

    expect(result.error).toMatch(/MIME/i);
    expect(admin._upload).not.toHaveBeenCalled();
  });

  it("accepts a PNG from an admin (reaches storage upload)", async () => {
    (assertRole as ReturnType<typeof vi.fn>).mockResolvedValue(ADMIN_PROFILE);
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeUserClient());
    const admin = makeAdminClient();
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    const result = await uploadLogo(makeFileFormData("image/png"));

    expect(result.error).toBe("");
    expect(result.logoUrl).toMatch(/^https:\/\/bs\.example\.com\/api\/branding\/logo/);
    expect(admin._upload).toHaveBeenCalledTimes(1);
  });
});
