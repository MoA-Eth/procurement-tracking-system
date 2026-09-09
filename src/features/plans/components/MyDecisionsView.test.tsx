import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MyDecisionsView } from "./MyDecisionsView";
import type { AuthUser } from "../../../lib/authTypes";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../../../lib/plansApi", () => ({
  fetchPlans: vi.fn().mockResolvedValue([
    {
      id: "plan-1",
      title: "National Wheat Supply Procurement Plan",
      budgetYear: "2018 EFY",
      procurementCategory: "GOODS",
      status: "APPROVED",
      project: { code: "BREFONS", name: "BREFONS Project" },
      committeeVotes: [
        {
          id: "vote-1",
          memberId: "committee-user-1",
          decision: "REJECT",
          comment:
            "[Flagged Activities: BREFONS-G-01] Excessive pricing needs recalculation.",
          createdAt: new Date().toISOString(),
        },
      ],
      activities: [
        {
          id: "act-1",
          reference: "BREFONS-G-01",
          description: "Supply of high-yield drought resistant wheat seeds",
          estimatedBudget: 15000000,
          currency: "ETB",
          procurementMethod: {
            label: "National Competitive Bidding",
            code: "NCB",
          },
          reviewType: "Prior",
        },
        {
          id: "act-2",
          reference: "BREFONS-G-02",
          description: "Supply of organic fertilizer bags",
          estimatedBudget: 8000000,
          currency: "ETB",
          procurementMethod: { label: "Request for Quotations", code: "RFQ" },
          reviewType: "Post",
        },
      ],
    },
  ]),
  mapBackendPlanToFrontend: (bp: any, memberId?: string) => ({
    id: bp.id,
    projectId: bp.project?.code || "BREFONS",
    projectCode: bp.project?.code || "BREFONS",
    projectName: bp.project?.name || "BREFONS Project",
    planName: bp.title,
    reference: bp.title,
    budgetYear: bp.budgetYear,
    category: "Goods" as const,
    planPeriodFrom: "2026-07-08",
    planPeriodTo: "2027-07-07",
    organizationRegion: "Federal",
    description:
      "Crucial strategic seed reserve procurement for food resilience.",
    status: "Finally Approved" as const,
    createdBy: "Procurement Officer",
    createdAt: new Date().toISOString(),
    activitiesCount: bp.activities?.length || 2,
    currency: "ETB",
    estimatedValue: 23000000,
    progress: 80,
    progressText: "4 of 5 approved",
    committeeDecision: "Rejected" as const,
    decisionRecordedDate: "8 Sep 2026",
    rejectionReason:
      "[Flagged Activities: BREFONS-G-01] Excessive pricing needs recalculation.",
    rejectionScope: "SPECIFIC" as const,
    rejectedActivityRefs: ["BREFONS-G-01"],
    activities: bp.activities || [],
  }),
}));

vi.mock("../../../lib/activitiesApi", () => ({
  fetchActivities: vi.fn().mockResolvedValue([]),
}));

describe("MyDecisionsView", () => {
  const mockUser: AuthUser = {
    id: "committee-user-1",
    email: "committee@moa.gov.et",
    displayName: "Committee Member",
    username: "committeemember",
    role: "ENDORSING_COMMITTEE",
  };

  it("renders My Decisions directory table with search, filters, and action columns", () => {
    const markup = renderToStaticMarkup(<MyDecisionsView user={mockUser} />);

    expect(markup).toContain("My Decisions");
    expect(markup).toContain("Search decisions by plan name or project...");
    expect(markup).toContain("All Decisions");
    expect(markup).toContain("All Projects");
    expect(markup).toContain("Overall Plan Status");
    expect(markup).toContain("Action");
  });

  it("renders Inspect Full Activities Tracker button in decision details", () => {
    const mockPlan = {
      id: "plan-1",
      planName: "National Wheat Supply Procurement Plan",
      budgetYear: "2018 EFY",
      category: "Goods" as const,
      status: "Returned" as const,
      projectCode: "BREFONS",
      projectName: "BREFONS Project",
      committeeDecision: "Rejected" as const,
      rejectionReason:
        "[Flagged Activities: BREFONS-G-01] Excessive pricing needs recalculation.",
      rejectionScope: "SPECIFIC" as const,
      rejectedActivityRefs: ["BREFONS-G-01"],
      activities: [
        {
          id: "act-1",
          activityRefNo: "BREFONS-G-01",
          description: "Supply of high-yield drought resistant wheat seeds",
          estimatedAmount: 15000000,
          currency: "ETB",
          method: "RFB - National",
          reviewType: "Prior",
          stages: [],
        },
      ],
    };

    const markup = renderToStaticMarkup(
      <MyDecisionsView user={mockUser} initialSelectedPlan={mockPlan as any} />,
    );
    expect(markup).toContain("Package Activities Directory");
    expect(markup).toContain("Inspect Full Activities Tracker");
    expect(markup).toContain("BREFONS-G-01");
    expect(markup).toContain("Flagged for Rejection");
  });

  it("opens full plan activities directory tracker with flagged activities when full tracker is active", () => {
    const mockPlan = {
      id: "plan-1",
      planName: "National Wheat Supply Procurement Plan",
      budgetYear: "2018 EFY",
      category: "Goods" as const,
      status: "Returned" as const,
      projectCode: "BREFONS",
      projectName: "BREFONS Project",
      organizationRegion: "Federal",
      committeeDecision: "Rejected" as const,
      rejectionReason:
        "[Flagged Activities: BREFONS-G-01] Excessive pricing needs recalculation.",
      rejectionScope: "SPECIFIC" as const,
      rejectedActivityRefs: ["BREFONS-G-01"],
      activities: [
        {
          id: "act-1",
          activityRefNo: "BREFONS-G-01",
          description: "Supply of high-yield drought resistant wheat seeds",
          estimatedAmount: 15000000,
          currency: "ETB",
          method: "RFB - National",
          marketApproach: "Open - National",
          reviewType: "Prior",
          stages: [],
          roadmap: [],
        },
        {
          id: "act-2",
          activityRefNo: "BREFONS-G-02",
          description: "Delivery of agricultural fertilizers",
          estimatedAmount: 5000000,
          currency: "ETB",
          method: "RFB - National",
          marketApproach: "Open - National",
          reviewType: "Prior",
          stages: [],
          roadmap: [],
        },
      ],
    };

    const markup = renderToStaticMarkup(
      <MyDecisionsView
        user={mockUser}
        initialSelectedPlan={mockPlan as any}
        initialFullPlanTracker={true}
      />,
    );
    // Verifies full plan tracker components
    expect(markup).toContain("Back to My Decisions");
    expect(markup).toContain(
      "Search package activities by Ref No or Description...",
    );
    expect(markup).toContain("All Methods");
    expect(markup).toContain("All Reviews");
    expect(markup).toContain("All Statuses");
    expect(markup).toContain("Flagged by Committee");
    expect(markup).toContain("Targeted");
    expect(markup).not.toContain("No Objections");
  });

  it("renders Inspect Full Activities Tracker for accepted plans without flagged activity rows", () => {
    const mockApprovedPlan = {
      id: "plan-approved",
      planName: "Irrigation Infrastructure Expansion",
      budgetYear: "2018 EFY",
      category: "Works" as const,
      status: "Finally Approved" as const,
      projectCode: "PASIDP-II",
      projectName: "PASIDP Project",
      committeeDecision: "Approved" as const,
      activities: [
        {
          id: "act-1",
          activityRefNo: "PASIDP-W-01",
          description: "Construction of small-scale irrigation canal",
          estimatedAmount: 25000000,
          currency: "ETB",
          method: "RFB - National",
          reviewType: "Prior",
        },
      ],
    };

    const markup = renderToStaticMarkup(
      <MyDecisionsView
        user={mockUser}
        initialSelectedPlan={mockApprovedPlan as any}
      />,
    );

    // Verifies Inspect Full Activities Tracker is present
    expect(markup).toContain("Inspect Full Activities Tracker");
    expect(markup).toContain("Plan Endorsed &amp; Approved");
    // Verifies flagged table is not shown for accepted plans
    expect(markup).not.toContain("Flagged for Rejection");
  });
});
