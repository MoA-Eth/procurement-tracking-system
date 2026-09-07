import { describe, expect, it } from "vitest";
import type { UserRole } from "@/types";
import { DASHBOARD_HEADINGS, getDashboardHeading } from "./dashboard.config";

describe("dashboard configuration", () => {
  it("provides dashboard copy for every supported role", () => {
    const roles: UserRole[] = [
      "OFFICER",
      "DIRECTOR",
      "ENDORSING_COMMITTEE",
      "MANAGEMENT",
      "ADMIN",
    ];

    expect(Object.keys(DASHBOARD_HEADINGS)).toHaveLength(roles.length);
    for (const role of roles) {
      expect(getDashboardHeading(role).eyebrow).not.toBe("");
      expect(getDashboardHeading(role).description).not.toBe("");
    }
  });
});
