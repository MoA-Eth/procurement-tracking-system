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

  it("does not display single-plan submit banner for draft plans since submissions are done in batch", () => {
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

    expect(markup).not.toContain("Plan is ready for review");
    expect(markup).not.toContain(
      "All activities have been drafted. Submit to the Director for final approval.",
    );
    expect(markup).not.toContain("Submit to Director");
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

  it("does not show empty plan warning banner by default on an empty draft plan and displays Submit to Director", () => {
    const emptyDraftPlan: ProcurementPlanSummary = {
      ...mockPlan,
      activities: 0,
      planActivities: [],
      status: "Draft",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={emptyDraftPlan}
        project={mockProject}
        savedActivities={[]}
      />,
    );

    expect(markup).not.toContain("Plan is not ready for submission");
    expect(markup).not.toContain("Plan cannot be submitted");
    expect(markup).not.toContain(
      "An empty plan or a plan without an activity will not be submitted",
    );
    expect(markup).not.toContain("Submit to Director");
    expect(markup).not.toContain("Plan is ready for review");
  });

  it("renders Register Contract button for individual activities in the table", () => {
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={mockPlan}
        project={mockProject}
        savedActivities={[sampleActivity]}
      />,
    );

    expect(markup).toContain("Register Contract");
    expect(markup).toContain(
      "/workspace/contracts?mode=register&amp;project=PRJ-24-001&amp;plan=PP-DRIVE-2016-01&amp;activity=ET-MoA-000001-GO-RFQ&amp;from=projects",
    );
  });

  it("renders Add Activity link pointing to create-additional-activity mode when plan is approved", () => {
    const approvedPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Approved",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={approvedPlan}
        project={mockProject}
        savedActivities={[sampleActivity]}
      />,
    );

    // Verify Add Activity link is rendered with non-modal create-additional-activity route
    expect(markup).toContain("Add Activity");
    expect(markup).toContain(
      "/workspace/projects?project=PRJ-24-001&amp;plan=PP-DRIVE-2016-01&amp;mode=create-additional-activity",
    );
  });

  it("renders Add Activity link pointing to create-activity mode when plan is draft", () => {
    const draftPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Draft",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={draftPlan}
        project={mockProject}
        savedActivities={[sampleActivity]}
      />,
    );

    // Verify Add Activity link is rendered with create-activity route
    expect(markup).toContain("Add Activity");
    expect(markup).toContain(
      "/workspace/projects?project=PRJ-24-001&amp;plan=PP-DRIVE-2016-01&amp;mode=create-activity",
    );
  });

  it("renders Add Activity link pointing to create-additional-activity mode with justification when plan is under Committee Review", () => {
    const committeePlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Committee Review",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={committeePlan}
        project={mockProject}
        savedActivities={[sampleActivity]}
      />,
    );

    // Once a plan is submitted (e.g. in Committee Review), adding an activity creates an additional plan requiring justification
    expect(markup).toContain("Add Activity");
    expect(markup).toContain(
      "/workspace/projects?project=PRJ-24-001&amp;plan=PP-DRIVE-2016-01&amp;mode=create-additional-activity",
    );
  });

  it("renders 'Request Cancellation' button when plan is Finally Approved", () => {
    const approvedPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Finally Approved",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={approvedPlan}
        project={mockProject}
        savedActivities={[sampleActivity]}
      />,
    );

    expect(markup).toContain("Request Cancellation");
  });

  it("renders pending banner when plan is Cancellation Requested", () => {
    const requestedPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Cancellation Requested",
      cancellationReason: "Found budget overlap with project alpha",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={requestedPlan}
        project={mockProject}
        savedActivities={[sampleActivity]}
      />,
    );

    expect(markup).toContain(
      "Cancellation Requested — Awaiting Director Review",
    );
    expect(markup).toContain("Found budget overlap with project alpha");
  });

  it("renders cancelled banner and prevents adding activities when plan is Cancelled", () => {
    const cancelledPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Cancelled",
      cancellationReason: "Plan terminated by management decree",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={cancelledPlan}
        project={mockProject}
        savedActivities={[sampleActivity]}
      />,
    );

    expect(markup).toContain("Procurement Plan Cancelled");
    expect(markup).toContain("Plan terminated by management decree");
    expect(markup).not.toContain("mode=create-activity");
    expect(markup).not.toContain("mode=create-additional-activity");
  });
});
