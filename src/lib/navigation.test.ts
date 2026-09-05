import { describe, expect, it } from "vitest";
import { canAccessWorkspaceSection, getNavigationForRole } from "./navigation";

describe("role navigation permission matrix", () => {
  it.each([
    ["OFFICER", ["Dashboard", "Projects", "Contracts", "Activity Tracker"]],
    [
      "DIRECTOR",
      [
        "Dashboard",
        "Projects",
        "Plan for Review",
        "Vote Progress",
        "Reports",
      ],
    ],
    [
      "MANAGEMENT",
      [
        "Dashboard",
        "Projects",
        "Plan for Review",
        "Vote Progress",
        "Reports",
      ],
    ],
    ["ENDORSING_COMMITTEE", ["Dashboard", "Plan for Review", "My Decisions"]],
    ["ADMIN", ["Dashboard", "User Management", "System Logs (Timestamp)"]],
  ] as const)("shows only %s menu items", (role, labels) => {
    expect(getNavigationForRole(role).map((item) => item.label)).toEqual(
      labels,
    );
  });

  it("enforces shared and role-only workspace access", () => {
    expect(canAccessWorkspaceSection("OFFICER", "projects")).toBe(true);
    expect(canAccessWorkspaceSection("DIRECTOR", "projects")).toBe(true);
    expect(canAccessWorkspaceSection("ADMIN", "projects")).toBe(false);

    expect(
      canAccessWorkspaceSection("ENDORSING_COMMITTEE", "plan-for-review"),
    ).toBe(true);
    expect(canAccessWorkspaceSection("DIRECTOR", "plan-for-review")).toBe(true);
    expect(canAccessWorkspaceSection("OFFICER", "plan-for-review")).toBe(false);

    expect(canAccessWorkspaceSection("ADMIN", "user-management")).toBe(true);
    expect(canAccessWorkspaceSection("OFFICER", "user-management")).toBe(false);
    expect(canAccessWorkspaceSection("DIRECTOR", "unknown")).toBe(false);
  });
});
