import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DirectorActivitiesListView,
  upsertActivityIntoList,
} from "./DirectorActivitiesListView";
import type { ProcurementActivity } from "../activitiesData";

describe("DirectorActivitiesListView - Plan Activity Isolation and Deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
