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
    expect(markup).toContain("Plan Rejected by Committee Majority");
  });

  it("shows immediate visibility to Director when 1 committee member rejects, while requiring 3 rejections to fully reject", () => {
    const mockObjectionPlan: any = {
      id: "plan-objection-1",
      planNumber: "MoA/BREFONS/2018/PLAN-003",
      planTitle: "BREFONS Pending Deliberation Plan",
      projectCode: "BREFONS",
      projectName: "Building Resilience Food Security",
      budgetYear: "2018 EFY",
      currency: "ETB",
      totalBudget: 45000000,
      description: "Procurement plan in committee deliberation",
      rawStatus: "WITH_COMMITTEE",
      overallStatus: "Pending Approval",
      committeeStatus: "Pending Approval",
      managementStatus: "Not Reached",
      approvedCount: 1,
      rejectedCount: 1,
      memberVotes: [
        {
          id: "mem-1",
          name: "Committee Reviewer Sarah",
          email: "sarah.reviewer@moa.gov.et",
          roleTitle: "Endorsement Committee",
          voteStatus: "Rejected",
          feedback:
            "[Flagged Activities: BREFONS-G-01] The specifications are obsolete and need revision.",
        },
        {
          id: "mem-2",
          name: "Committee Reviewer Dawit",
          email: "dawit.reviewer@moa.gov.et",
          roleTitle: "Endorsement Committee",
          voteStatus: "Approved",
          feedback: "Approved technical aspects.",
        },
      ],
      hasAdvancedToManagement: false,
      activities: [
        {
          id: "act-1",
          reference: "BREFONS-G-01",
          description: "Procurement of Agricultural Tractors",
          procurementMethod: { label: "RFB - National", code: "RFB" },
          estimatedBudget: 25000000,
        },
      ],
      rejectionReason:
        "[Flagged Activities: BREFONS-G-01] The specifications are obsolete and need revision.",
      rejectionScope: "SPECIFIC",
      rejectedActivityRefs: ["BREFONS-G-01"],
    };

    const markup = renderToStaticMarkup(
      <CommitteeProgressView
        currentUser={{ role: "DIRECTOR", name: "Director Abebe" }}
        initialSelectedPlan={mockObjectionPlan}
      />,
    );

    // 1. Deliberation status is visible and requires 3 rejections to fully reject
    expect(markup).toContain(
      "Committee Objection In Progress (1 of 3 Rejections Required to Fully Reject Plan)",
    );
    expect(markup).toContain(
      "Requires at least 3 approvals to endorse, or at least 3 rejections to completely reject.",
    );

    // 2. The committee member's rejection feedback & comment is immediately visible to the Director
    expect(markup).toContain("Committee Reviewer Sarah");
    expect(markup).toContain(
      "The specifications are obsolete and need revision.",
    );

    // 3. The flagged activity reference and button is visible to the Director
    expect(markup).toContain("Flagged Activities (Click to Open)");
    expect(markup).toContain("BREFONS-G-01");
    expect(markup).toContain("Flagged");
  });

  it("distinguishes Committee Endorsed (awaiting management) from Finally Approved by Executive Management", () => {
    // Case 1: 3 Committee Approvals -> Awaiting Management Approval (not Finally Approved)
    const mockEndorsedPlan: any = {
      id: "plan-endorsed-1",
      planNumber: "MoA/BREFONS/2018/PLAN-004",
      planTitle: "BREFONS Endorsed Procurement Plan",
      projectCode: "BREFONS",
      projectName: "Building Resilience Food Security",
      budgetYear: "2018 EFY",
      currency: "ETB",
      totalBudget: 45000000,
      description: "Committee endorsed plan awaiting management",
      rawStatus: "AWAITING_MANAGEMENT_APPROVAL",
      overallStatus: "Pending Approval",
      committeeStatus: "Approved",
      managementStatus: "Awaiting Review",
      approvedCount: 3,
      rejectedCount: 0,
      memberVotes: [],
      hasAdvancedToManagement: true,
      activities: [],
      rejectedActivityRefs: [],
    };

    const endorsedMarkup = renderToStaticMarkup(
      <CommitteeProgressView
        currentUser={{ role: "DIRECTOR", name: "Director Abebe" }}
        initialSelectedPlan={mockEndorsedPlan}
      />,
    );

    expect(endorsedMarkup).toContain(
      "Endorsed by Committee - Awaiting Executive Management Decision",
    );
    expect(endorsedMarkup).toContain(
      "The plan has achieved committee quorum (&gt;=3 approvals) and is pending Management review and comments.",
    );
    expect(endorsedMarkup).not.toContain("Authorized by Executive Management");

    // Case 2: Management Approved -> Finally Approved
    const mockManagementApprovedPlan: any = {
      ...mockEndorsedPlan,
      id: "plan-mgmt-approved-1",
      rawStatus: "APPROVED",
      overallStatus: "Approved",
      managementStatus: "Approved",
      managementDecision: "APPROVE",
    };

    const approvedMarkup = renderToStaticMarkup(
      <CommitteeProgressView
        currentUser={{ role: "DIRECTOR", name: "Director Abebe" }}
        initialSelectedPlan={mockManagementApprovedPlan}
      />,
    );

    expect(approvedMarkup).toContain("Authorized by Executive Management");
    expect(approvedMarkup).toContain(
      "This procurement plan and its activities have received final executive authorization.",
    );
  });
});
