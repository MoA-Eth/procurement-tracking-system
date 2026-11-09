import { describe, expect, it } from "vitest";
import {
  mapBackendPlanToOfficerPlanSummary,
  type BackendPlan,
} from "./plansApi";

describe("mapBackendPlanToOfficerPlanSummary", () => {
  it("maps a returned plan and its activities to editable draft version", () => {
    const plan = mapBackendPlanToOfficerPlanSummary({
      id: "plan-1",
      projectId: "project-1",
      status: "RETURNED_FOR_REVISION",
      version: 2,
      title: "Annual Procurement Plan",
      periodStart: "2026-01-01T00:00:00.000Z",
      periodEnd: "2026-12-31T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      directorRevisionComment: "Please correct the budget estimate.",
      activities: [
        {
          id: "activity-1",
          reference: "ACT-001",
          status: "DRAFT",
          version: 2,
          estimatedBudget: 100,
        },
      ],
    } as BackendPlan);

    expect(plan.status).toBe("Draft");
    expect(plan.returnedForRevision).toBe(true);
    expect(plan.version).toBe(2);
    expect(plan.directorRevisionComment).toBe(
      "Please correct the budget estimate.",
    );
    expect(plan.planActivities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reference: "ACT-001",
          status: "Draft",
          returnedForRevision: true,
          version: 2,
        }),
      ]),
    );
  });
});
