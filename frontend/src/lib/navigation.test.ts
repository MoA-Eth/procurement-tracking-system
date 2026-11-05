import { describe, expect, it } from "vitest";
import { canAccessWorkspaceSection, getNavigationForRole } from "./navigation";

describe("role navigation permission matrix", () => {
  it.each([
    [
      "OFFICER",
      [
        "Dashboard",
        "Projects",
        "Contracts",
        "Amendment Requests",
        "Activity Tracker",
        "Reports",
      ],
    ],
    [
      "DIRECTOR",
      [
        "Executive Dashboard",
        "Dashboard",
        "Projects",
        "Plan for Review",
        "Amendment Requests",
        "Vote Progress",
        "Activity Tracker",
        "Reports",
      ],
    ],
    [
      "MANAGEMENT",
      [
        "Executive Dashboard",
        "Dashboard",
        "Projects",
        "Plan for Review",
        "Amendment Requests",
        "Vote Progress",
        "Activity Tracker",
        "Reports",
      ],
    ],
    ["EXECUTIVE", ["Executive Dashboard", "Reports"]],
    [
      "ENDORSING_COMMITTEE",
      ["Dashboard", "Plan for Review", "Amendment Requests", "My Decisions"],
    ],
    ["ADMIN", ["Dashboard", "User Management", "System Logs (Timestamp)"]],
  ] as const)("shows only %s menu items", (role, labels) => {
    expect(getNavigationForRole(role).map((item) => item.label)).toEqual(
      labels,
    );
  });

  it("enforces shared and role-only workspace access", () => {
    expect(canAccessWorkspaceSection("ADMIN", "executive-dashboard")).toBe(
      false,
    );
    expect(canAccessWorkspaceSection("DIRECTOR", "executive-dashboard")).toBe(
      true,
    );
    expect(canAccessWorkspaceSection("MANAGEMENT", "executive-dashboard")).toBe(
      true,
    );
    expect(canAccessWorkspaceSection("EXECUTIVE", "executive-dashboard")).toBe(
      true,
    );
    expect(canAccessWorkspaceSection("EXECUTIVE", "reports")).toBe(true);
    expect(canAccessWorkspaceSection("OFFICER", "executive-dashboard")).toBe(
      false,
    );
    expect(
      canAccessWorkspaceSection("ENDORSING_COMMITTEE", "executive-dashboard"),
    ).toBe(false);
    expect(canAccessWorkspaceSection("OFFICER", "projects")).toBe(true);
    expect(canAccessWorkspaceSection("EXECUTIVE", "projects")).toBe(false);
    expect(canAccessWorkspaceSection("EXECUTIVE", "plan-for-review")).toBe(
      false,
    );
    expect(canAccessWorkspaceSection("EXECUTIVE", "vote-progress")).toBe(false);
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
