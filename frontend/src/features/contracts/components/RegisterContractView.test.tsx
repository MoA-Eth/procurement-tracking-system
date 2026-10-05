import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OfficerProject } from "../../projects/data/officerProjects";
import {
  buildEligibleActivities,
  RegisterContractView,
} from "./RegisterContractView";

const mockProject: OfficerProject = {
  activePlans: 1,
  assignedOfficers: ["Yeabsira Fikre"],
  availableOrganizationRegions: ["FPCU / Federal"],
  baseCurrency: "ETB",
  code: "PRJ-24-001",
  countryOrganisation: "Ethiopia",
  executingAgency: "Ministry of Agriculture",
  fundingSource: "World Bank",
  fundingType: "Loan / Grant",
  name: "DRIVE - De-Risking, Inclusion and Value Enhancement",
  organizationRegion: "FPCU / Federal",
  plans: [
    {
      activities: 1,
      budgetYear: "2016 EFY",
      category: "Goods",
      completedActivities: 0,
      currency: "ETB",
      delayedActivities: 0,
      estimatedValue: 2_500_000,
      inProgressActivities: 1,
      name: "2016 EFY Annual Procurement Plan",
      reference: "PP-DRIVE-2016-01",
      status: "Approved",
    },
  ],
  shortName: "DRIVE",
  status: "Active",
};

describe("RegisterContractView", () => {
  it("uses only approved, contract-ready procurement activities", () => {
    const mockContractReadyActivity = {
      activity: {
        category: "Goods" as const,
        currentStage: "Signed Contract",
        description: "Supply of Veterinary Vaccines",
        estimatedAmount: 2_500_000,
        method: "RFQ / Shopping",
        reference: "ET-MoA-000001-GO-RFQ",
        status: "Completed" as const,
      },
      planReference: "PP-DRIVE-2016-01",
      projectCode: "PRJ-24-001",
    };
    const activities = buildEligibleActivities(
      [mockProject],
      [mockContractReadyActivity],
    );

    expect(activities.length).toBeGreaterThan(0);
    expect(activities.every(({ plan }) => plan.status === "Approved")).toBe(
      true,
    );
    expect(
      activities.every(({ activity }) => {
        const stage = activity.currentStage.toLowerCase();
        return (
          activity.status === "Completed" ||
          stage.includes("contract") ||
          stage.includes("site handover") ||
          stage.includes("final report")
        );
      }),
    ).toBe(true);
  });

  it("renders the mapping-specification contract fields without payment entry", () => {
    const markup = renderToStaticMarkup(
      <RegisterContractView existingContracts={[]} onSave={vi.fn()} />,
    );

    expect(markup).toContain("Contract &amp; Procurement Activity");
    expect(markup).toContain("Supplier / Contractor / Consultant");
    expect(markup).toContain("Organization / Region");
    expect(markup).toContain("Original Contract Amount");
    expect(markup).toContain("VAT Rate");
    expect(markup).toContain("Final Contract Amount");
    expect(markup).toContain("Award Date");
    expect(markup).toContain("Signature Date");
    expect(markup).toContain("Actual Completion Date");
    expect(markup).toContain("Contract Status");
    expect(markup).toContain("Planned Completion / End Date");
    expect(markup).toContain("Inherited from Plan");
    expect(markup).not.toContain("Payment Amount");
    expect(markup).not.toContain("Payment Date");
  });

  it("renders all required currencies in the currency selection dropdown", () => {
    const markup = renderToStaticMarkup(
      <RegisterContractView existingContracts={[]} onSave={vi.fn()} />,
    );

    expect(markup).toContain("ETB - Ethiopian Birr");
    expect(markup).toContain("USD - US Dollar");
    expect(markup).toContain("EUR - Euro");
    expect(markup).toContain("GBP - British Pound Sterling");
    expect(markup).toContain("JPY - Japanese Yen");
    expect(markup).toContain("UA - Unit of Account");
  });

  it("renders Back to Plan and Procurement Plan breadcrumb when fromProjects is true", () => {
    const markup = renderToStaticMarkup(
      <RegisterContractView
        existingContracts={[]}
        fromProjects={true}
        onSave={vi.fn()}
      />,
    );

    expect(markup).toContain("Procurement Plan");
    expect(markup).toContain("Back to Plan");
  });

  it("includes draft plan activity when requestedActivityReference matches", () => {
    const draftPlanProject: OfficerProject = {
      ...mockProject,
      plans: [
        {
          activities: 1,
          budgetYear: "2016 EFY",
          category: "Goods",
          completedActivities: 0,
          currency: "ETB",
          delayedActivities: 0,
          estimatedValue: 1_000_000,
          inProgressActivities: 1,
          name: "Draft Plan",
          planActivities: [
            {
              category: "Goods" as const,
              currentStage: "Draft RFQ",
              description: "Special Draft Activity",
              estimatedAmount: 1_000_000,
              method: "RFQ",
              reference: "ACT-DRAFT-001",
              status: "Draft" as const,
            },
          ],
          reference: "PP-DRAFT-01",
          status: "Draft",
        },
      ],
    };

    const eligible = buildEligibleActivities(
      [draftPlanProject],
      [],
      "ACT-DRAFT-001",
    );

    expect(eligible.some((e) => e.activity.reference === "ACT-DRAFT-001")).toBe(
      true,
    );
  });
});
