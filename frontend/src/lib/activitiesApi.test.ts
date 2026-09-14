import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fetchActivities,
  createActivity,
  updateStageDates,
  recordActualStageDates,
  replanStage,
  type BackendActivity,
} from "./activitiesApi";

describe("activitiesApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches activities list via GET /api/activities", async () => {
    const mockActivities: BackendActivity[] = [
      {
        id: "act-1",
        reference: "ACT-001",
        planId: "plan-1",
        procurementMethodId: "pm-1",
        description: "Supply of tractors",
        estimatedBudget: 2500000,
        currency: "ETB",
        status: "IN_PROGRESS",
      },
    ];

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockActivities), { status: 200 }),
    );

    const result = await fetchActivities("plan-1");
    expect(result).toEqual(mockActivities);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/activities?planId=plan-1"),
      expect.any(Object),
    );
  });

  it("creates a new activity via POST /api/activities", async () => {
    const created: BackendActivity = {
      id: "act-new",
      reference: "ACT-NEW",
      planId: "plan-1",
      procurementMethodId: "pm-1",
      description: "Lab Equipment",
      estimatedBudget: 1500000,
      currency: "ETB",
      status: "DRAFT",
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(created), { status: 201 }),
    );

    const result = await createActivity({
      planId: "plan-1",
      procurementMethodId: "pm-1",
      description: "Lab Equipment",
      estimatedBudget: 1500000,
      currency: "ETB",
      fundings: [
        {
          fundingSource: "World Bank",
          allocationPct: 100,
        },
      ],
    });

    expect(result.id).toBe("act-new");
  });

  it("updates stage planning dates, actual dates, and replans stage", async () => {
    vi.spyOn(global, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    await updateStageDates("act-1", "stg-1", {
      plannedStartDate: "2026-09-01",
      plannedEndDate: "2026-09-15",
    });

    await recordActualStageDates("act-1", "stg-1", {
      actualStartDate: "2026-09-02",
      actualEndDate: "2026-09-14",
    });

    await replanStage("act-1", "stg-1", {
      revisedStartDate: "2026-09-20",
      reason: "Supplier delay in preparation",
    });

    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
