/**
 * SLC-705 MT-1 — Aggregate-Query-Layer Unit-Tests mit vi.mock Supabase-Client.
 *
 * Ergaenzend zu __tests__/team/aggregate-queries.test.ts (RLS/SQL-Replikation
 * gegen Coolify-DB) decken diese Tests die TypeScript-Code-Logik direkt ab.
 * Ruft `getTeamMembers()` mit gemocktem Supabase-Client auf — faengt
 * Code-Logik-Bugs wie ISSUE-065 (`.single()` ohne explizit `.eq("id", auth.uid())`).
 *
 * Test-Design:
 *   - vi.fn() basierter Mock-Builder fuer das Supabase-Query-Chain-API
 *   - Pro Test: spezifische auth.getUser() + table-Resolver
 *   - Assert auf: korrekte Filter-Aufrufe + zurueckgegebene Aggregate
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTeamMembers } from "./aggregate-queries";

const TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEAM_ID = "00000000-0000-0000-0000-000000000077";
const MEMBER_IDS = [
  "00000000-0000-0000-0000-000000000081",
  "00000000-0000-0000-0000-000000000082",
];

type Captured = {
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
};

function buildQueryBuilder(captured: Captured, finalResult: { data: unknown[] }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.eq = captured.eq.mockImplementation(chain);
  builder.neq = captured.neq.mockImplementation(chain);
  builder.is = captured.is.mockImplementation(chain);
  builder.in = captured.in.mockImplementation(chain);
  builder.lt = captured.lt.mockImplementation(chain);
  builder.select = vi.fn().mockImplementation(chain);
  builder.then = (resolve: (v: { data: unknown[] }) => void) =>
    resolve(finalResult);
  return builder;
}

describe("getTeamMembers — ISSUE-065 Regression-Suite", () => {
  let captured: Record<string, Captured>;

  beforeEach(() => {
    captured = {
      profilesCaller: {
        eq: vi.fn(),
        neq: vi.fn(),
        is: vi.fn(),
        in: vi.fn(),
        lt: vi.fn(),
      },
      profilesMembers: {
        eq: vi.fn(),
        neq: vi.fn(),
        is: vi.fn(),
        in: vi.fn(),
        lt: vi.fn(),
      },
      deals: {
        eq: vi.fn(),
        neq: vi.fn(),
        is: vi.fn(),
        in: vi.fn(),
        lt: vi.fn(),
      },
      activitiesOpen: {
        eq: vi.fn(),
        neq: vi.fn(),
        is: vi.fn(),
        in: vi.fn(),
        lt: vi.fn(),
      },
      activitiesOverdue: {
        eq: vi.fn(),
        neq: vi.fn(),
        is: vi.fn(),
        in: vi.fn(),
        lt: vi.fn(),
      },
    };
  });

  function makeSupabase(opts: {
    user: { id: string } | null;
    callerProfile: { id: string; team_id: string | null } | null;
    memberProfiles: Array<{
      id: string;
      display_name: string;
      role: string;
      last_login_at: string | null;
      team_id: string;
    }>;
    deals?: Array<{ owner_user_id: string; value: number }>;
    activitiesOpen?: Array<{ owner_user_id: string }>;
    activitiesOverdue?: Array<{ owner_user_id: string }>;
  }) {
    let profilesCallCount = 0;
    let activitiesCallCount = 0;

    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: opts.user } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "profiles") {
          profilesCallCount += 1;
          if (profilesCallCount === 1) {
            // Caller-Profile-Lookup (Schritt 1): liefert single() Row
            const builder: Record<string, unknown> = {};
            builder.select = vi.fn().mockReturnValue(builder);
            builder.eq = captured.profilesCaller.eq.mockReturnValue(builder);
            builder.single = vi
              .fn()
              .mockResolvedValue({ data: opts.callerProfile });
            return builder;
          }
          // Profiles-Member-List (Schritt 1b): liefert Array
          return buildQueryBuilder(captured.profilesMembers, {
            data: opts.memberProfiles,
          });
        }
        if (table === "deals") {
          return buildQueryBuilder(captured.deals, {
            data: opts.deals ?? [],
          });
        }
        if (table === "activities") {
          activitiesCallCount += 1;
          if (activitiesCallCount === 1) {
            return buildQueryBuilder(captured.activitiesOpen, {
              data: opts.activitiesOpen ?? [],
            });
          }
          return buildQueryBuilder(captured.activitiesOverdue, {
            data: opts.activitiesOverdue ?? [],
          });
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };
  }

  it("ruft auth.getUser() auf BEVOR profiles.single() (ISSUE-065-Regression)", async () => {
    const supabase = makeSupabase({
      user: { id: TEAMLEAD_ID },
      callerProfile: { id: TEAMLEAD_ID, team_id: TEAM_ID },
      memberProfiles: [],
    });

    await getTeamMembers(supabase as never);

    expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
  });

  it("filtert profiles.single() explizit auf user.id (ISSUE-065-Regression)", async () => {
    const supabase = makeSupabase({
      user: { id: TEAMLEAD_ID },
      callerProfile: { id: TEAMLEAD_ID, team_id: TEAM_ID },
      memberProfiles: [],
    });

    await getTeamMembers(supabase as never);

    expect(captured.profilesCaller.eq).toHaveBeenCalledWith("id", TEAMLEAD_ID);
  });

  it("returnt leeres Array wenn auth.getUser keinen User liefert", async () => {
    const supabase = makeSupabase({
      user: null,
      callerProfile: null,
      memberProfiles: [],
    });

    const result = await getTeamMembers(supabase as never);

    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("filtert Member-Liste auf team_id der callerProfile-Row", async () => {
    const supabase = makeSupabase({
      user: { id: TEAMLEAD_ID },
      callerProfile: { id: TEAMLEAD_ID, team_id: TEAM_ID },
      memberProfiles: [
        {
          id: MEMBER_IDS[0],
          display_name: "Member 1",
          role: "member",
          last_login_at: null,
          team_id: TEAM_ID,
        },
      ],
    });

    await getTeamMembers(supabase as never);

    expect(captured.profilesMembers.eq).toHaveBeenCalledWith(
      "team_id",
      TEAM_ID,
    );
    expect(captured.profilesMembers.neq).toHaveBeenCalledWith(
      "id",
      TEAMLEAD_ID,
    );
  });

  it("filtert Member-Liste NUR via neq wenn callerTeamId null (Admin-Use-Case)", async () => {
    const supabase = makeSupabase({
      user: { id: TEAMLEAD_ID },
      callerProfile: { id: TEAMLEAD_ID, team_id: null },
      memberProfiles: [],
    });

    await getTeamMembers(supabase as never);

    expect(captured.profilesMembers.eq).not.toHaveBeenCalledWith(
      "team_id",
      expect.anything(),
    );
    expect(captured.profilesMembers.neq).toHaveBeenCalledWith(
      "id",
      TEAMLEAD_ID,
    );
  });

  it("nutzt user.id als Self-Filter wenn callerProfile-Lookup null returnt", async () => {
    // Edge-Case: auth.getUser liefert User, aber profiles-Lookup returnt null
    // (z.B. wenn das Profile noch nicht angelegt ist). Self-Filter muss
    // trotzdem auf user.id zuruecken (Defensive-Default).
    const supabase = makeSupabase({
      user: { id: TEAMLEAD_ID },
      callerProfile: null,
      memberProfiles: [],
    });

    await getTeamMembers(supabase as never);

    expect(captured.profilesMembers.neq).toHaveBeenCalledWith(
      "id",
      TEAMLEAD_ID,
    );
  });

  it("aggregiert pipeline_sum + open_deals + open_activities + overdue korrekt", async () => {
    const supabase = makeSupabase({
      user: { id: TEAMLEAD_ID },
      callerProfile: { id: TEAMLEAD_ID, team_id: TEAM_ID },
      memberProfiles: [
        {
          id: MEMBER_IDS[0],
          display_name: "Member 1",
          role: "member",
          last_login_at: "2026-05-13T10:00:00.000Z",
          team_id: TEAM_ID,
        },
        {
          id: MEMBER_IDS[1],
          display_name: "Member 2",
          role: "member",
          last_login_at: null,
          team_id: TEAM_ID,
        },
      ],
      deals: [
        { owner_user_id: MEMBER_IDS[0], value: 1000 },
        { owner_user_id: MEMBER_IDS[0], value: 2500 },
        { owner_user_id: MEMBER_IDS[1], value: 500 },
      ],
      activitiesOpen: [
        { owner_user_id: MEMBER_IDS[0] },
        { owner_user_id: MEMBER_IDS[0] },
        { owner_user_id: MEMBER_IDS[1] },
      ],
      activitiesOverdue: [{ owner_user_id: MEMBER_IDS[0] }],
    });

    const result = await getTeamMembers(supabase as never);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      user_id: MEMBER_IDS[0],
      display_name: "Member 1",
      pipeline_sum: 3500,
      open_deals: 2,
      open_activities: 2,
      overdue_count: 1,
      last_login_at: "2026-05-13T10:00:00.000Z",
    });
    expect(result[1]).toMatchObject({
      user_id: MEMBER_IDS[1],
      display_name: "Member 2",
      pipeline_sum: 500,
      open_deals: 1,
      open_activities: 1,
      overdue_count: 0,
      last_login_at: null,
    });
  });

  it("returnt leeres Array wenn keine Member-Profiles existieren", async () => {
    const supabase = makeSupabase({
      user: { id: TEAMLEAD_ID },
      callerProfile: { id: TEAMLEAD_ID, team_id: TEAM_ID },
      memberProfiles: [],
    });

    const result = await getTeamMembers(supabase as never);

    expect(result).toEqual([]);
    // deals + activities-Queries duerfen bei leerer Memberliste nicht gestartet werden
    expect(captured.deals.eq).not.toHaveBeenCalled();
    expect(captured.activitiesOpen.is).not.toHaveBeenCalled();
  });
});
