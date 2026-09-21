import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { parseRejectionDetails, isAdditionalPlan } from "./plansData";

describe("parseRejectionDetails", () => {
  it("defaults to ALL when rejectionReason is undefined or empty", () => {
    expect(parseRejectionDetails(undefined)).toEqual({
      scope: "ALL",
      rejectedActivityRefs: [],
      cleanRemarks: "",
    });

    expect(parseRejectionDetails("")).toEqual({
      scope: "ALL",
      rejectedActivityRefs: [],
      cleanRemarks: "",
    });
  });

  it("parses plain unstructured rejection remarks as ALL scope", () => {
    const result = parseRejectionDetails(
      "The entire procurement plan budget exceeds annual ceiling.",
    );
    expect(result).toEqual({
      scope: "ALL",
      rejectedActivityRefs: [],
      cleanRemarks:
        "The entire procurement plan budget exceeds annual ceiling.",
    });
  });

  it("extracts SPECIFIC scope and activity references from structured tagged remarks", () => {
    const raw =
      "[Flagged Activities: BREFONS-G-001, BREFONS-W-002] Equipment specifications are outdated and delivery timeline is not feasible.";
    const result = parseRejectionDetails(raw);
    expect(result.scope).toBe("SPECIFIC");
    expect(result.rejectedActivityRefs).toEqual([
      "BREFONS-G-001",
      "BREFONS-W-002",
    ]);
    expect(result.cleanRemarks).toBe(
      "Equipment specifications are outdated and delivery timeline is not feasible.",
    );
  });
});

describe("mapBackendPlanToFrontend for Director Role with flagged activities", () => {
  it("harvests rejectedActivityRefs and SPECIFIC scope from committee votes even when viewed by Director", async () => {
    const { mapBackendPlanToFrontend } = await import("../../lib/plansApi");

    const mockBackendPlan: any = {
      id: "plan-test-123",
      title: "Crop Multiplication Plan",
      budgetYear: "2018 EFY",
      periodStart: "2026-07-08",
      periodEnd: "2027-07-07",
      status: "WITH_COMMITTEE",
      committeeVotes: [
        {
          id: "vote-1",
          memberId: "committee-member-1",
          decision: "REJECT",
          comment:
            "[Flagged Activities: MOA-RFB_NAT-000001] Price estimate is inflated.",
          createdAt: "2026-09-08T10:00:00Z",
        },
        {
          id: "vote-2",
          memberId: "committee-member-2",
          decision: "APPROVE",
          comment: "Looks acceptable to me.",
          createdAt: "2026-09-08T10:30:00Z",
        },
      ],
      activities: [
        {
          id: "act-1",
          reference: "MOA-RFB_NAT-000001",
          description: "test test test",
          estimatedBudget: 90000000,
          currency: "ETB",
        },
      ],
    };

    // User is the Director, NOT committee-member-1
    const frontendPlan = mapBackendPlanToFrontend(
      mockBackendPlan,
      "director-user-id",
      "director@moa.gov.et",
    );

    expect(frontendPlan.rejectionScope).toBe("SPECIFIC");
    expect(frontendPlan.rejectedActivityRefs).toEqual(["MOA-RFB_NAT-000001"]);
    expect(frontendPlan.rejectionReason).toContain(
      "[Flagged Activities: MOA-RFB_NAT-000001]",
    );
  });

  it("renders DirectorActivitiesListView with flagged activities and objection banner", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { DirectorActivitiesListView } =
      await import("../activities/components/DirectorActivitiesListView");

    const testPlan: any = {
      id: "plan-test-123",
      planName: "Crop Multiplication Plan",
      budgetYear: "2018 EFY",
      category: "Goods",
      status: "Returned for Revision",
      projectCode: "BREFONS",
      projectName: "BREFONS Project",
      organizationRegion: "Federal",
      rejectionReason:
        "[Flagged Activities: MOA-RFB_NAT-000001] Excessive pricing needs recalculation.",
      rejectionScope: "SPECIFIC",
      rejectedActivityRefs: ["MOA-RFB_NAT-000001"],
      activities: [
        {
          id: "act-1",
          activityRefNo: "MOA-RFB_NAT-000001",
          description: "Supply of high-yield wheat seeds",
          estimatedAmount: 90000000,
          currency: "ETB",
          method: "RFB - National",
          marketApproach: "Open - National",
          reviewType: "Prior",
          stages: [],
          roadmap: [],
        },
        {
          id: "act-2",
          activityRefNo: "MOA-RFB_NAT-000002",
          description: "Supply of fertilizers",
          estimatedAmount: 30000000,
          currency: "ETB",
          method: "RFB - National",
          marketApproach: "Open - National",
          reviewType: "Prior",
          stages: [],
          roadmap: [],
        },
      ],
    };

    const React = await import("react");
    const markup = renderToStaticMarkup(
      React.createElement(DirectorActivitiesListView, {
        plan: testPlan,
        from: "vote-progress",
        parentSection: "plan-for-review",
        userRole: "DIRECTOR",
        onBackClick: () => {},
      }),
    );

    expect(markup).toContain("Back to Vote Progress");
    expect(markup).toContain(
      "Committee Objection: Specific Activities Flagged",
    );
    expect(markup).toContain("MOA-RFB_NAT-000001");
    expect(markup).toContain("Flagged by Committee");
    expect(markup).toContain("Supply of high-yield wheat seeds");
    expect(markup).toContain("Supply of fertilizers");
  });
});

describe("isPlanAwaitingManagementReview", () => {
  it("returns false for null or undefined plan", async () => {
    const { isPlanAwaitingManagementReview } = await import("./plansData");
    expect(isPlanAwaitingManagementReview(null)).toBe(false);
    expect(isPlanAwaitingManagementReview(undefined)).toBe(false);
  });

  it("returns false for plans that already have a managementDecision", async () => {
    const { isPlanAwaitingManagementReview } = await import("./plansData");
    expect(
      isPlanAwaitingManagementReview({
        id: "p1",
        planName: "Test",
        budgetYear: "2018 EFY",
        category: "Goods",
        status: "Approved",
        projectCode: "BREFONS",
        organizationRegion: "Federal",
        managementDecision: "Approved",
      }),
    ).toBe(false);

    expect(
      isPlanAwaitingManagementReview({
        id: "p2",
        planName: "Test",
        budgetYear: "2018 EFY",
        category: "Goods",
        status: "Rejected",
        projectCode: "BREFONS",
        organizationRegion: "Federal",
        managementDecision: "Rejected",
      }),
    ).toBe(false);
  });

  it("returns false for plans that are already Approved or Finally Approved", async () => {
    const { isPlanAwaitingManagementReview } = await import("./plansData");
    expect(
      isPlanAwaitingManagementReview({
        id: "p3",
        planName: "Test",
        budgetYear: "2018 EFY",
        category: "Goods",
        status: "Approved",
        projectCode: "BREFONS",
        organizationRegion: "Federal",
      }),
    ).toBe(false);

    expect(
      isPlanAwaitingManagementReview({
        id: "p4",
        planName: "Test",
        budgetYear: "2018 EFY",
        category: "Goods",
        status: "Finally Approved",
        rawStatus: "FINALLY APPROVED",
        projectCode: "BREFONS",
        organizationRegion: "Federal",
      }),
    ).toBe(false);
  });

  it("returns true for plans actively awaiting management review without recorded decision", async () => {
    const { isPlanAwaitingManagementReview } = await import("./plansData");
    expect(
      isPlanAwaitingManagementReview({
        id: "p5",
        planName: "Test Awaiting",
        budgetYear: "2018 EFY",
        category: "Goods",
        status: "Awaiting Management Approval",
        rawStatus: "AWAITING_MANAGEMENT_APPROVAL",
        projectCode: "BREFONS",
        organizationRegion: "Federal",
      }),
    ).toBe(true);

    expect(
      isPlanAwaitingManagementReview({
        id: "p6",
        planName: "Test Endorsed",
        budgetYear: "2018 EFY",
        category: "Goods",
        status: "Committee Endorsed",
        committeeStatus: "Endorsed",
        projectCode: "BREFONS",
        organizationRegion: "Federal",
      }),
    ).toBe(true);
  });
});

describe("Management Role Authorization Card Visibility", () => {
  it("does NOT render Executive Management Decision card when opened from vote-progress or for an approved plan", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { DirectorActivitiesListView } =
      await import("../activities/components/DirectorActivitiesListView");
    const React = await import("react");

    const approvedPlan: any = {
      id: "plan-approved-1",
      planName: "Approved Seeds Plan",
      budgetYear: "2018 EFY",
      category: "Goods",
      status: "Approved",
      rawStatus: "APPROVED",
      managementDecision: "Approved",
      projectCode: "BREFONS",
      organizationRegion: "Federal",
      activities: [],
    };

    const markup = renderToStaticMarkup(
      React.createElement(DirectorActivitiesListView, {
        plan: approvedPlan,
        from: "vote-progress",
        parentSection: "vote-progress",
        userRole: "MANAGEMENT",
        onBackClick: () => {},
        onManagementDecision: () => {},
      }),
    );

    expect(markup).not.toContain(
      "Executive Management Decision &amp; Authorization",
    );
    expect(markup).not.toContain("Authorize &amp; Approve Plan");
  });

  it("renders Executive Management Decision card in plan-for-review for eligible awaiting plans", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { DirectorActivitiesListView } =
      await import("../activities/components/DirectorActivitiesListView");
    const React = await import("react");

    const awaitingPlan: any = {
      id: "plan-awaiting-1",
      planName: "Awaiting Plan",
      budgetYear: "2018 EFY",
      category: "Goods",
      status: "Awaiting Management Approval",
      rawStatus: "AWAITING_MANAGEMENT_APPROVAL",
      projectCode: "BREFONS",
      organizationRegion: "Federal",
      activities: [],
    };

    const markup = renderToStaticMarkup(
      React.createElement(DirectorActivitiesListView, {
        plan: awaitingPlan,
        parentSection: "plan-for-review",
        userRole: "MANAGEMENT",
        onBackClick: () => {},
        onManagementDecision: () => {},
      }),
    );

    expect(markup).toContain(
      "Executive Management Decision &amp; Authorization",
    );
    expect(markup).toContain("Authorize &amp; Approve Plan");
    expect(markup).toContain("Reject Plan");
  });

  it("identifies additional plans via isAdditionalPlan helper", () => {
    expect(isAdditionalPlan({ planType: "ADDITIONAL" } as any)).toBe(true);
    expect(isAdditionalPlan({ parentPlanId: "plan-parent-123" } as any)).toBe(
      true,
    );
    expect(isAdditionalPlan({ planType: "ANNUAL" } as any)).toBe(false);
    expect(isAdditionalPlan(null as any)).toBe(false);
    expect(isAdditionalPlan(undefined as any)).toBe(false);
  });

  it("renders Additional Plan Justification Callout Banner and badges in DirectorActivitiesListView", async () => {
    const { DirectorActivitiesListView } =
      await import("../activities/components/DirectorActivitiesListView");
    const React = await import("react");

    const additionalPlan: any = {
      id: "plan-additional-1",
      planName: "BREFONS Supplementary Tractors Plan",
      budgetYear: "2018 EFY",
      category: "Goods",
      status: "Submitted to Director",
      projectCode: "BREFONS",
      organizationRegion: "Federal",
      planType: "ADDITIONAL",
      parentPlanId: "plan-original-1",
      parentPlanReference: "MoA/BREFONS/2018/PLAN-001",
      additionalPlanReason:
        "Emergency drought intervention funding secured after annual plan approval.",
      activities: [
        {
          id: "act-new-1",
          activityRefNo: "BREFONS-G-NEW-01",
          description: "Procurement of 10 Additional Water Delivery Trucks",
          method: "RFB",
          marketApproach: "National",
          reviewType: "Prior",
          currency: "ETB",
          estimatedAmount: 15000000,
          stages: [],
          roadmap: [],
        },
      ],
      parentActivities: [
        {
          id: "act-orig-1",
          activityRefNo: "BREFONS-G-01",
          description: "Procurement of Agricultural Tractors",
          method: "RFB",
          marketApproach: "National",
          reviewType: "Prior",
          currency: "ETB",
          estimatedAmount: 25000000,
          stages: [],
          roadmap: [],
        },
      ],
    };

    const markup = renderToStaticMarkup(
      React.createElement(DirectorActivitiesListView, {
        plan: additionalPlan,
        parentSection: "plan-for-review",
        userRole: "DIRECTOR",
        onBackClick: () => {},
      }),
    );

    // 1. Banner with officer's justification
    expect(markup).toContain("Additional Plan Package");
    expect(markup).toContain("Officer Justification for Late Addition");
    expect(markup).toContain("Supplement to Approved Plan");
    expect(markup).toContain("MoA/BREFONS/2018/PLAN-001");
    expect(markup).toContain(
      "Emergency drought intervention funding secured after annual plan approval.",
    );

    // 2. Activity badges: New Activity vs Already Approved
    expect(markup).toContain("BREFONS-G-NEW-01");
    expect(markup).toContain("★ New Activity");
    expect(markup).toContain("BREFONS-G-01");
    expect(markup).toContain("✓ Already Approved");
  });
});
