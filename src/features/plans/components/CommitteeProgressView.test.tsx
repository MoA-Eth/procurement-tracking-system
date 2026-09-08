import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CommitteeProgressView } from "./CommitteeProgressView";
import { parseRejectionDetails } from "../plansData";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../../../lib/plansApi", () => ({
  fetchPlans: vi.fn().mockResolvedValue([]),
  returnPlanForRevision: vi.fn().mockResolvedValue({}),
  fetchPlanComments: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../../lib/lookupsApi", () => ({
  fetchCommitteeMembers: vi.fn().mockResolvedValue([]),
}));

describe("CommitteeProgressView", () => {
  it("renders Vote Progress header, metric tiles, and section tables for DIRECTOR", () => {
    const markup = renderToStaticMarkup(
      <CommitteeProgressView
        currentUser={{ role: "DIRECTOR", name: "Director Abebe" }}
      />,
    );

    expect(markup).toContain("Vote Progress");
    expect(markup).toContain("In Committee");
    expect(markup).toContain("Endorsed");
    expect(markup).toContain("Awaiting Mgmt");
    expect(markup).toContain("Mgmt Approved");
    expect(markup).toContain("Section A: Endorsement Committee Progress");
    expect(markup).toContain("Section B: Executive Management Progress");
  });

  it("renders Vote Progress correctly for MANAGEMENT", () => {
    const markup = renderToStaticMarkup(
      <CommitteeProgressView
        currentUser={{ role: "MANAGEMENT", name: "Executive Manager" }}
      />,
    );

    expect(markup).toContain("Vote Progress");
    expect(markup).toContain("In Committee");
    expect(markup).toContain("Section A: Endorsement Committee Progress");
    expect(markup).toContain("Section B: Executive Management Progress");
  });

  it("identifies and highlights specific flagged activities in committee deliberation and activity table", () => {
    const sampleFlaggedComment =
      "[Flagged Activities: BREFONS-G-01] The unit cost estimate exceeds the budget cap by 30%.";
    const parsed = parseRejectionDetails(sampleFlaggedComment);

    expect(parsed.scope).toBe("SPECIFIC");
    expect(parsed.rejectedActivityRefs).toEqual(["BREFONS-G-01"]);
    expect(parsed.cleanRemarks).toBe(
      "The unit cost estimate exceeds the budget cap by 30%.",
    );
  });

  it("renders Package Activities Directory banner with Plan Endorsed & Approved badge for approved plans in Director role", () => {
    const mockApprovedPlan: any = {
      id: "plan-approved-1",
      planNumber: "MoA/BREFONS/2018/PLAN-001",
      planTitle: "BREFONS Annual Procurement Plan",
      projectCode: "BREFONS",
      projectName: "Building Resilience Food Security",
      budgetYear: "2018 EFY",
      currency: "ETB",
      totalBudget: 45000000,
      description: "Approved procurement plan",
      rawStatus: "APPROVED",
      overallStatus: "Approved",
      committeeStatus: "Approved",
      managementStatus: "Approved",
      approvedCount: 5,
      rejectedCount: 0,
      memberVotes: [],
      hasAdvancedToManagement: true,
      activities: [
        {
          id: "act-1",
          reference: "BREFONS-G-01",
          description: "Procurement of Agricultural Tractors",
          procurementMethod: { label: "RFB - National", code: "RFB" },
          estimatedBudget: 25000000,
        },
      ],
      rejectedActivityRefs: [],
    };

    const markup = renderToStaticMarkup(
      <CommitteeProgressView
        currentUser={{ role: "DIRECTOR", name: "Director Abebe" }}
        initialSelectedPlan={mockApprovedPlan}
      />,
    );

    expect(markup).toContain("Package Activities Directory");
    expect(markup).toContain("Plan Endorsed &amp; Approved");
    expect(markup).toContain(
      "All procurement activities have been endorsed without objections.",
    );
    expect(markup).toContain("Inspect Full Activities Tracker");
    // Verifies the regular table headers are NOT shown in the approved state
    expect(markup).not.toContain("Package Activities in this Plan");
  });

  it("renders Package Activities table with flagged badges for rejected plans with objections", () => {
    const mockRejectedPlan: any = {
      id: "plan-rejected-1",
      planNumber: "MoA/BREFONS/2018/PLAN-002",
      planTitle: "BREFONS Rejected Procurement Plan",
      projectCode: "BREFONS",
      projectName: "Building Resilience Food Security",
      budgetYear: "2018 EFY",
      currency: "ETB",
      totalBudget: 45000000,
      description: "Rejected procurement plan",
      rawStatus: "COMMITTEE_REJECTED",
      overallStatus: "Rejected",
      committeeStatus: "Rejected",
      managementStatus: "Not Reached",
      approvedCount: 1,
      rejectedCount: 3,
      memberVotes: [
        {
          id: "mem-1",
          name: "Reviewer One",
          roleTitle: "Endorsement Committee",
          voteStatus: "Rejected",
          feedback: "[Flagged Activities: BREFONS-G-01] Price is too high.",
        },
      ],
      hasAdvancedToManagement: false,
      activities: [
        {
          id: "act-1",
          reference: "BREFONS-G-01",
          description: "Procurement of Tractors",
          procurementMethod: { label: "RFB - National", code: "RFB" },
          estimatedBudget: 25000000,
        },
      ],
      rejectionReason: "[Flagged Activities: BREFONS-G-01] Price is too high.",
      rejectionScope: "SPECIFIC",
      rejectedActivityRefs: ["BREFONS-G-01"],
    };

    const markup = renderToStaticMarkup(
      <CommitteeProgressView
        currentUser={{ role: "DIRECTOR", name: "Director Abebe" }}
        initialSelectedPlan={mockRejectedPlan}
      />,
    );

    expect(markup).toContain("Package Activities in this Plan");
    expect(markup).toContain("Open Full Plan Review");
    expect(markup).toContain("Flagged");
    expect(markup).not.toContain("Plan Endorsed &amp; Approved");
  });
});
