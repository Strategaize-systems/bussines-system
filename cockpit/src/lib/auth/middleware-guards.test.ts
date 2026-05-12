import { describe, it, expect } from "vitest";
import {
  evaluateRouteGuard,
  ROUTE_GUARDS,
  ROLE_REDIRECT_TARGET,
} from "./middleware-guards";

describe("evaluateRouteGuard — route patterns", () => {
  it("/dashboard blocks member", () => {
    expect(evaluateRouteGuard("/dashboard", "member")).toBe(ROLE_REDIRECT_TARGET);
  });

  it("/dashboard allows admin + teamlead", () => {
    expect(evaluateRouteGuard("/dashboard", "admin")).toBeNull();
    expect(evaluateRouteGuard("/dashboard", "teamlead")).toBeNull();
  });

  it("/team blocks member but allows admin + teamlead", () => {
    expect(evaluateRouteGuard("/team", "member")).toBe(ROLE_REDIRECT_TARGET);
    expect(evaluateRouteGuard("/team", "admin")).toBeNull();
    expect(evaluateRouteGuard("/team", "teamlead")).toBeNull();
  });

  it("/team/[user_id]/mein-tag blocks member (sub-path match)", () => {
    expect(evaluateRouteGuard("/team/user-123/mein-tag", "member")).toBe(
      ROLE_REDIRECT_TARGET,
    );
    expect(evaluateRouteGuard("/team/user-123/mein-tag", "teamlead")).toBeNull();
  });

  it("/settings/team blocks member", () => {
    expect(evaluateRouteGuard("/settings/team", "member")).toBe(
      ROLE_REDIRECT_TARGET,
    );
    expect(evaluateRouteGuard("/settings/team/invite", "member")).toBe(
      ROLE_REDIRECT_TARGET,
    );
    expect(evaluateRouteGuard("/settings/team", "admin")).toBeNull();
  });

  it("/settings/products is admin-only (teamlead blocked)", () => {
    expect(evaluateRouteGuard("/settings/products", "teamlead")).toBe(
      ROLE_REDIRECT_TARGET,
    );
    expect(evaluateRouteGuard("/settings/products", "member")).toBe(
      ROLE_REDIRECT_TARGET,
    );
    expect(evaluateRouteGuard("/settings/products", "admin")).toBeNull();
  });

  it("/audit-log is admin-only", () => {
    expect(evaluateRouteGuard("/audit-log", "teamlead")).toBe(
      ROLE_REDIRECT_TARGET,
    );
    expect(evaluateRouteGuard("/audit-log", "member")).toBe(
      ROLE_REDIRECT_TARGET,
    );
    expect(evaluateRouteGuard("/audit-log", "admin")).toBeNull();
  });

  it("/campaigns blocks member", () => {
    expect(evaluateRouteGuard("/campaigns", "member")).toBe(
      ROLE_REDIRECT_TARGET,
    );
    expect(evaluateRouteGuard("/campaigns/c-123", "member")).toBe(
      ROLE_REDIRECT_TARGET,
    );
    expect(evaluateRouteGuard("/campaigns", "teamlead")).toBeNull();
  });

  it("/handoffs blocks member", () => {
    expect(evaluateRouteGuard("/handoffs", "member")).toBe(
      ROLE_REDIRECT_TARGET,
    );
  });

  it("/cadences blocks member but allows teamlead", () => {
    expect(evaluateRouteGuard("/cadences", "member")).toBe(
      ROLE_REDIRECT_TARGET,
    );
    expect(evaluateRouteGuard("/cadences", "teamlead")).toBeNull();
  });

  it("/performance/goals blocks member", () => {
    expect(evaluateRouteGuard("/performance/goals", "member")).toBe(
      ROLE_REDIRECT_TARGET,
    );
  });

  it("/mein-tag is open to all roles", () => {
    expect(evaluateRouteGuard("/mein-tag", "admin")).toBeNull();
    expect(evaluateRouteGuard("/mein-tag", "teamlead")).toBeNull();
    expect(evaluateRouteGuard("/mein-tag", "member")).toBeNull();
  });

  it("/deals is open to all roles", () => {
    expect(evaluateRouteGuard("/deals", "member")).toBeNull();
    expect(evaluateRouteGuard("/deals/123", "member")).toBeNull();
  });

  it("/settings (base) is open to all roles", () => {
    // Nur Sub-Routen wie /settings/team, /settings/products, /settings/workflow
    // sind geguardet.
    expect(evaluateRouteGuard("/settings", "member")).toBeNull();
    expect(evaluateRouteGuard("/settings/branding", "member")).toBeNull();
  });

  it("ROUTE_GUARDS contains at least 6 patterns per AC7", () => {
    expect(ROUTE_GUARDS.length).toBeGreaterThanOrEqual(6);
  });
});
