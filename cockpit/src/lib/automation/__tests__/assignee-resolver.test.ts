import { describe, it, expect } from "vitest";
import {
  resolveAssignee,
  AssigneeResolutionError,
} from "../assignee-resolver";

describe("assignee-resolver", () => {
  it("resolved deal_owner aus entityOwnerId", () => {
    const id = resolveAssignee("deal_owner", {
      entityOwnerId: "owner-1",
      entityCreatedBy: "creator-1",
    });
    expect(id).toBe("owner-1");
  });

  it("faellt fuer deal_owner auf entityCreatedBy zurueck", () => {
    const id = resolveAssignee("deal_owner", {
      entityOwnerId: null,
      entityCreatedBy: "creator-1",
    });
    expect(id).toBe("creator-1");
  });

  it("wirft fuer deal_owner ohne owner und ohne creator", () => {
    expect(() => resolveAssignee("deal_owner", {})).toThrow(
      AssigneeResolutionError
    );
  });

  it("resolved trigger_user aus triggerUserId", () => {
    const id = resolveAssignee("trigger_user", {
      triggerUserId: "trigger-1",
    });
    expect(id).toBe("trigger-1");
  });

  it("wirft fuer trigger_user ohne triggerUserId", () => {
    expect(() => resolveAssignee("trigger_user", {})).toThrow(
      AssigneeResolutionError
    );
  });

  it("resolved {uuid}-Source direkt", () => {
    const id = resolveAssignee({ uuid: "fixed-1" }, {});
    expect(id).toBe("fixed-1");
  });

  it("wirft fuer {uuid}-Source ohne uuid", () => {
    expect(() =>
      resolveAssignee({ uuid: "" } as { uuid: string }, {})
    ).toThrow(AssigneeResolutionError);
  });

  it("default ist deal_owner wenn source undefined", () => {
    const id = resolveAssignee(undefined, { entityOwnerId: "x" });
    expect(id).toBe("x");
  });
});
