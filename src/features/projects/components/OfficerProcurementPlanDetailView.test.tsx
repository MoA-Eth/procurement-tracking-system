import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OfficerProcurementPlanDetailView } from "./OfficerProcurementPlanDetailView";
import type {
  OfficerProject,
  ProcurementPlanSummary,
} from "../data/officerProjects";

const mockPlan: ProcurementPlanSummary = {
  activities: 1,
  budgetYear: "2016 EFY",
  category: "Goods",
  completedActivities: 0,
  currency: "ETB",
  delayedActivities: 0,
  estimatedValue: 2_500_000,
  inProgressActivities: 0,
  name: "2016 EFY Annual Procurement Plan",
  reference: "PP-DRIVE-2016-01",
  status: "Approved",
};

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
  plans: [mockPlan],
  shortName: "DRIVE",
  status: "Active",
};

const sampleActivity = {
  category: "Goods",
  currentStage: "Draft Request for Quotations",
  description: "Supply of veterinary cold-chain equipment",
  estimatedAmount: 2_500_000,
  method: "RFQ / Shopping",
  reference: "ET-MoA-000001-GO-RFQ",
  status: "Not Started" as const,
};

describe("OfficerProcurementPlanDetailView", () => {
  it("renders the selected plan and activity page without summary cards", () => {
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={mockPlan}
        project={mockProject}
        savedActivities={[sampleActivity]}
      />,
    );

    expect(markup).toContain("2016 EFY Annual Procurement Plan");
    expect(markup).toContain("Reference:");
    expect(markup).toContain(mockPlan.reference);
    expect(markup).not.toContain("Category:");
    expect(markup).not.toContain("Total Estimated Value");
    expect(markup).not.toContain("Progress Summary");
    expect(markup).not.toContain("Approval");
    expect(markup).not.toContain("Reports");
    expect(markup).toContain("ET-MoA-000001-GO-RFQ");
  });

  it("shows a browser-saved activity in its plan table", () => {
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={mockPlan}
        project={mockProject}
        savedActivities={[sampleActivity]}
      />,
    );

    expect(markup).toContain("1 Activities");
    expect(markup).toContain("2,500,000.00");
    expect(markup).toContain("Supply of veterinary cold-chain equipment");
    expect(markup).toContain("Not Started");
  });

  it("displays the Plan is ready for review banner and Submit to Director action for draft plans", () => {
    const draftPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Draft",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={draftPlan}
        project={mockProject}
      />,
    );

    expect(markup).toContain("Plan is ready for review");
    expect(markup).toContain(
      "All activities have been drafted. Submit to the Director for final approval.",
    );
    expect(markup).toContain("Submit to Director");
  });

  it("displays submitted status banner when plan is submitted to director", () => {
    const submittedPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Submitted to Director",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={submittedPlan}
        project={mockProject}
      />,
    );

    expect(markup).toContain("Submitted to Director for Review");
    expect(markup).not.toContain("Plan is ready for review");
  });

  it("does not show Version History button for an unrevised baseline plan", () => {
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={mockPlan}
        project={mockProject}
      />,
    );

    expect(markup).not.toContain("Version History (v1)");
  });

  it("shows Version History button when a plan is returned for revision", () => {
    const returnedPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Returned for Revision",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={returnedPlan}
        project={mockProject}
      />,
    );

    expect(markup).toContain("Version History");
  });
});
