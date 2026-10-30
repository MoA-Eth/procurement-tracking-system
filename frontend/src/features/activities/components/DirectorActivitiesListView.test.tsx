import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DirectorActivitiesListView,
  mapBackendActivityToProcurementActivity,
  upsertActivityIntoList,
} from "./DirectorActivitiesListView";
import type { ProcurementActivity } from "../activitiesData";

describe("DirectorActivitiesListView - Plan Activity Isolation and Deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a saved date for an optional roadmap stage", () => {
    const activity = mapBackendActivityToProcurementActivity(
      {
        reference: "MOA-RFB-000001",
        description: "Supply of Agricultural Harvesters",
        procurementMethod: { label: "RFB - National" },
        details: {
          roadmap: [
            {
              name: "Draft Pre-qualification Documents",
              gregorianDate: "",
              notApplicable: false,
            },
          ],
        },
        stages: [
          {
            id: "stage-1",
            sequence: 1,
            stageType: { label: "Draft Pre-qualification Documents" },
            plannedStartDate: "2026-03-08T00:00:00.000Z",
            currentTargetStartDate: "2026-03-08T00:00:00.000Z",
            status: "NOT_STARTED",
          },
        ],
      } as any,
      {
        category: "Goods",
        planName: "Annual Procurement Plan",
        planId: "plan-1",
        projectCode: "PRJ-1",
      } as any,
    );

    expect(activity.roadmap[0].originalPlannedDate).toBe(
      "2026-03-08T00:00:00.000Z",
    );
    expect(activity.roadmap[0].notApplicable).toBe(false);
    expect(activity.roadmap[0].stageStatus).toBe("Not Started");
  });

  it("keeps an undated optional roadmap stage marked not applicable", () => {
    const activity = mapBackendActivityToProcurementActivity(
      {
        reference: "MOA-RFB-000001",
        description: "Supply of Agricultural Harvesters",
        procurementMethod: { label: "RFB - National" },
        stages: [
          {
            id: "stage-1",
            sequence: 1,
            stageType: { label: "Draft Pre-qualification Documents" },
            status: "NOT_STARTED",
          },
        ],
      } as any,
      {
        category: "Goods",
        planName: "Annual Procurement Plan",
        planId: "plan-1",
        projectCode: "PRJ-1",
      } as any,
    );

    expect(activity.roadmap[0].originalPlannedDate).toBe("Not applicable");
    expect(activity.roadmap[0].notApplicable).toBe(true);
  });

  it("shows a saved target date when the baseline date is null", () => {
    const activity = mapBackendActivityToProcurementActivity(
      {
        reference: "MOA-RFB-000002",
        description: "Supply of Agricultural Harvesters",
        procurementMethod: { label: "RFB - National" },
        stages: [
          {
            id: "stage-2",
            sequence: 1,
            stageType: { label: "Preparation of Specification" },
            plannedStartDate: null,
            currentTargetStartDate: "2026-08-03T00:00:00.000Z",
            status: "NOT_STARTED",
          },
        ],
      } as any,
      {
        category: "Goods",
        planName: "Annual Procurement Plan",
        planId: "plan-1",
        projectCode: "PRJ-1",
      } as any,
    );

    expect(activity.roadmap[0].originalPlannedDate).toBe(
      "2026-08-03T00:00:00.000Z",
    );
    expect(activity.roadmap[0].revisedTargetDate).toBe(
      "2026-08-03T00:00:00.000Z",
    );
  });

  it("upsertActivityIntoList correctly deduplicates by content and prefers backend activity", () => {
    const list: ProcurementActivity[] = [
      {
        id: "local-draft-1",
        activityRefNo: "ET-MoA-000001-CW-DIR",
        description: "Supply of Agricultural Harvesters",
        estimatedAmount: 99000000,
        currency: "ETB",
        method: "Direct Procurement",
        marketApproach: "Open - National",
        reviewType: "Prior",
        status: "Submitted to Director",
        roadmap: [],
      } as any,
    ];

    // Incoming backend activity with official ref MOA-DIR-000008 and UUID id
    const backendActivity: ProcurementActivity = {
      id: "04db70b9-a8c0-41b4-8921-a2a3f05582e5",
      activityRefNo: "MOA-DIR-000008",
      description: "Supply of Agricultural Harvesters",
      estimatedAmount: 99000000,
      currency: "ETB",
      method: "Direct Procurement",
      marketApproach: "Open - National",
      reviewType: "Prior",
      status: "In Execution",
      roadmap: [],
    } as any;

    upsertActivityIntoList(list, backendActivity);

    // Should not double: list length must still be 1
    expect(list.length).toBe(1);
    // Should prefer the backend activity's ref and id
    expect(list[0].activityRefNo).toBe("MOA-DIR-000008");
    expect(list[0].id).toBe("04db70b9-a8c0-41b4-8921-a2a3f05582e5");
  });

  it("upsertActivityIntoList does not overwrite backend activity if incoming is a local draft", () => {
    const list: ProcurementActivity[] = [
      {
        id: "04db70b9-a8c0-41b4-8921-a2a3f05582e5",
        activityRefNo: "MOA-DIR-000008",
        description: "Supply of Agricultural Harvesters",
        estimatedAmount: 99000000,
        currency: "ETB",
        method: "Direct Procurement",
        marketApproach: "Open - National",
        reviewType: "Prior",
        status: "In Execution",
        roadmap: [],
      } as any,
    ];

    const draftActivity: ProcurementActivity = {
      id: "local-draft-1",
      activityRefNo: "ET-MoA-000001-CW-DIR",
      description: "Supply of Agricultural Harvesters",
      estimatedAmount: 99000000,
      currency: "ETB",
      method: "Direct Procurement",
      marketApproach: "Open - National",
      reviewType: "Prior",
      status: "Submitted to Director",
      roadmap: [],
    } as any;

    upsertActivityIntoList(list, draftActivity);

    expect(list.length).toBe(1);
    expect(list[0].activityRefNo).toBe("MOA-DIR-000008");
  });

  it("renders only the activities belonging to the plan, not other activities in the same project", () => {
    const plan: any = {
      id: "plan-isolated-1",
      planName: "New Special Irrigation Plan",
      projectCode: "ETH-HORT-2024",
      activities: [
        {
          id: "act-target-1",
          activityRefNo: "MOA-DIR-000008",
          description: "Special Irrigation Equipment",
          estimatedAmount: 99000000,
          currency: "ETB",
          method: "Direct Procurement",
          marketApproach: "Open - National",
          reviewType: "Prior",
          stages: [],
          roadmap: [],
        },
      ],
    };

    const markup = renderToStaticMarkup(
      React.createElement(DirectorActivitiesListView, {
        plan,
        parentSection: "plan-for-review",
        userRole: "DIRECTOR",
        onBackClick: () => {},
      }),
    );

    // The single activity of this plan must be present
    expect(markup).toContain("MOA-DIR-000008");
    expect(markup).toContain("Special Irrigation Equipment");

    // Other project activities must NOT be present
    expect(markup).not.toContain("MOA/HORT/DIR/G-05/2024");
    expect(markup).not.toContain("MOA/HORT/RFQ/G-04/2024");
    expect(markup).not.toContain("ET-MoA-000001-CW-DIR");
  });
});
