import { describe, it, expect } from "vitest";
import {
  computePendingPlans,
  computeCommitteePlansCount,
} from "./directorPipeline";
import type { BackendPlan } from "@/lib/plansApi";

describe("directorPipeline role isolation", () => {
  const samplePlans: BackendPlan[] = [
    {
      id: "plan-1",
      title: "Director Queue Plan",
      status: "SUBMITTED",
      projectId: "proj-1",
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      createdAt: "2026-01-01T00:00:00Z",
      activities: [],
    } as unknown as BackendPlan,
    {
      id: "plan-2",
      title: "Management Queue Plan",
      status: "AWAITING_MANAGEMENT_APPROVAL",
      projectId: "proj-2",
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      createdAt: "2026-01-02T00:00:00Z",
      activities: [],
    } as unknown as BackendPlan,
    {
      id: "plan-3",
      title: "Committee Review Plan",
      status: "WITH_COMMITTEE",
      projectId: "proj-3",
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      createdAt: "2026-01-03T00:00:00Z",
      activities: [],
    } as unknown as BackendPlan,
    {
      id: "plan-4",
      title: "Committee Endorsed Plan",
      status: "COMMITTEE_ENDORSED",
      projectId: "proj-4",
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      createdAt: "2026-01-04T00:00:00Z",
      activities: [],
    } as unknown as BackendPlan,
  ];

  it("filters Director pending plans correctly including returned and rejected plans", () => {
    const plansWithReturned: BackendPlan[] = [
      ...samplePlans,
      {
        id: "plan-5",
        title: "Returned Plan",
        status: "RETURNED_FOR_REVISION",
        projectId: "proj-1",
        createdAt: "2026-01-05T00:00:00Z",
        activities: [],
      } as unknown as BackendPlan,
      {
        id: "plan-6",
        title: "Committee Rejected Plan",
        status: "COMMITTEE_REJECTED",
        projectId: "proj-1",
        createdAt: "2026-01-06T00:00:00Z",
        activities: [],
      } as unknown as BackendPlan,
    ];

    const directorPending = computePendingPlans(plansWithReturned, "DIRECTOR");
    expect(directorPending.map((p) => p.id)).toEqual(["plan-1", "plan-5", "plan-6"]);
    expect(directorPending.find((p) => p.id === "plan-5")?.status).toBe("Returned for Revision");
    expect(directorPending.find((p) => p.id === "plan-6")?.status).toBe("Rejected");
  });

  it("filters Management pending plans correctly without leaking Director plans", () => {
    const managementPending = computePendingPlans(samplePlans, "MANAGEMENT");
    expect(managementPending.map((p) => p.id)).toEqual(["plan-2", "plan-4"]);
  });

  it("computes committee counts based on role", () => {
    const directorCommitteeCount = computeCommitteePlansCount(
      samplePlans,
      "DIRECTOR",
    );
    expect(directorCommitteeCount).toBe(1); // plan-3 is under Committee Review

    const managementCommitteeCount = computeCommitteePlansCount(
      samplePlans,
      "MANAGEMENT",
    );
    expect(managementCommitteeCount).toBe(1); // plan-3 is under Committee Review
  });
});
