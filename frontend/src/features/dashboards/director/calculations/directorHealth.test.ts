import { describe, expect, it } from "vitest";
import type { BackendPlan } from "@/lib/plansApi";
import { computeCriticalDelays } from "./directorHealth";

const now = new Date("2026-10-28T08:00:00Z").getTime();

function plan(status: string, activities: any[]): BackendPlan {
  return {
    id: `plan-${status}`,
    projectId: "project-1",
    status,
    title: "Plan",
    activities,
  } as unknown as BackendPlan;
}

function activity(id: string, endDate: string, extra: any = {}) {
  return {
    id,
    description: id,
    status: "IN_PROGRESS",
    stages: [
      {
        status: "IN_PROGRESS",
        currentTargetEndDate: endDate,
        stageType: { label: "Bid Evaluation" },
      },
    ],
    ...extra,
  };
}

describe("computeCriticalDelays", () => {
  it("only counts activities in plans that are being executed", () => {
    const overdue = "2026-09-01T00:00:00Z";
    const delays = computeCriticalDelays(
      [
        plan("APPROVED", [activity("approved", overdue)]),
        plan("MANAGEMENT_APPROVED", [activity("mgmt", overdue)]),
        plan("DRAFT", [activity("draft", overdue)]),
        plan("SUBMITTED", [activity("submitted", overdue)]),
        plan("WITH_COMMITTEE", [activity("committee", overdue)]),
      ],
      now,
    );

    expect(delays.map((d) => d.id).sort()).toEqual(["approved", "mgmt"]);
  });

  it("only reports delays of more than seven days", () => {
    const delays = computeCriticalDelays(
      [
        plan("APPROVED", [
          activity("five-days", "2026-10-23T00:00:00Z"),
          activity("ten-days", "2026-10-18T00:00:00Z"),
        ]),
      ],
      now,
    );

    expect(delays.map((d) => d.id)).toEqual(["ten-days"]);
  });

  it("skips completed and cancelled activities", () => {
    const overdue = "2026-09-01T00:00:00Z";
    const delays = computeCriticalDelays(
      [
        plan("APPROVED", [
          activity("done", overdue, { status: "COMPLETED" }),
          activity("cancelled", overdue, { status: "CANCELLED" }),
          activity("open", overdue),
        ]),
      ],
      now,
    );

    expect(delays.map((d) => d.id)).toEqual(["open"]);
  });
});
