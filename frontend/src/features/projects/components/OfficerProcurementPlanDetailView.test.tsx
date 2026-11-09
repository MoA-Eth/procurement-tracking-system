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
  it("keeps the plan title and reference on one line", () => {
    const longName = "Long procurement plan name for an annual budget";
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={{ ...mockPlan, name: longName }}
        project={mockProject}
      />,
    );

    expect(markup).toContain(`title="${longName}"`);
    expect(markup).toContain(
      "truncate whitespace-nowrap text-2xl font-semibold tracking-tight",
    );
    expect(markup).toContain(
      "inline-flex max-w-full shrink-0 whitespace-nowrap",
    );
  });

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
        onDeleteDraftActivity={async () => {}}
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

  it("shows Delete Plan only for a draft plan when a delete handler is available", () => {
    const draftPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Draft",
    };
    const draftMarkup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        onDeleteDraftPlan={async () => {}}
        plan={draftPlan}
        project={mockProject}
      />,
    );
    const approvedMarkup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        onDeleteDraftPlan={async () => {}}
        plan={mockPlan}
        project={mockProject}
      />,
    );

    expect(draftMarkup).toContain("Delete Plan");
    expect(draftMarkup).not.toContain("delete-plan-dialog-title");
    expect(approvedMarkup).not.toContain("Delete Plan");
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

  it("shows the reached roadmap stage as activity status on finally approved plans", () => {
    const approvedPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Finally Approved",
    };
    const activityAtReachedStage = {
      ...sampleActivity,
      currentStage: "Receiving Quotation",
      status: "Not Started" as const,
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={approvedPlan}
        project={mockProject}
        savedActivities={[activityAtReachedStage]}
      />,
    );

    expect(markup).toContain("Receiving Quotation");
    expect(markup).not.toContain(">Not Started</span>");
  });

  it("offers a delete action for draft activities", () => {
    const draftPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Draft",
    };
    const draftActivity = {
      ...sampleActivity,
      createdById: "officer-1",
      status: "Draft" as const,
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        currentUser={{
          id: "officer-1",
          email: "officer@example.com",
          username: "officer",
          displayName: "Officer One",
          role: "OFFICER",
        }}
        onDeleteDraftActivity={async () => {}}
        plan={draftPlan}
        project={mockProject}
        savedActivities={[draftActivity]}
      />,
    );

    expect(markup).toContain(
      `aria-label="Delete draft activity ${draftActivity.reference}"`,
    );
    expect(markup).not.toContain('role="dialog"');
  });

  it("matches the activity creator when their name includes the officer role", () => {
    const draftPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Draft",
    };
    const draftActivity = {
      ...sampleActivity,
      createdByName: "Officer One (Procurement Officer)",
      status: "Draft" as const,
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        currentUser={{
          id: "officer-1",
          email: "officer@example.com",
          username: "officer",
          displayName: "Officer One",
          role: "OFFICER",
        }}
        onDeleteDraftActivity={async () => {}}
        plan={draftPlan}
        project={mockProject}
        savedActivities={[draftActivity]}
      />,
    );

    expect(markup).toContain(
      `aria-label="Edit activity ${draftActivity.reference}"`,
    );
    expect(markup).toContain(
      `aria-label="Delete draft activity ${draftActivity.reference}"`,
    );
  });

  it("shows owner actions when draft statuses use backend enum values", () => {
    const draftPlan = {
      ...mockPlan,
      status: "DRAFT",
    } as unknown as ProcurementPlanSummary;
    const draftActivity = {
      ...sampleActivity,
      createdById: "officer-1",
      status: "Draft" as const,
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        currentUser={{
          id: "officer-1",
          email: "officer@example.com",
          username: "officer",
          displayName: "Officer One",
          role: "OFFICER",
        }}
        onDeleteDraftActivity={async () => {}}
        plan={draftPlan}
        project={mockProject}
        savedActivities={[draftActivity]}
      />,
    );

    expect(markup).toContain(
      `aria-label="Edit activity ${draftActivity.reference}"`,
    );
    expect(markup).toContain(
      `aria-label="Delete draft activity ${draftActivity.reference}"`,
    );
  });

  it("hides activity edit and delete actions from an officer who did not create it", () => {
    const draftPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Draft",
    };
    const draftActivity = {
      ...sampleActivity,
      createdById: "officer-1",
      status: "Draft" as const,
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        currentUser={{
          id: "officer-2",
          email: "other@example.com",
          username: "other",
          displayName: "Officer Two",
          role: "OFFICER",
        }}
        onDeleteDraftActivity={async () => {}}
        plan={draftPlan}
        project={mockProject}
        savedActivities={[draftActivity]}
      />,
    );

    expect(markup).not.toContain(
      `aria-label="Edit activity ${draftActivity.reference}"`,
    );
    expect(markup).not.toContain(
      `aria-label="Delete draft activity ${draftActivity.reference}"`,
    );
  });

  it("does not render Register Contract while the plan is under review", () => {
    const submittedPlan: ProcurementPlanSummary = {
      ...mockPlan,
      status: "Submitted to Director",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={submittedPlan}
        project={mockProject}
        savedActivities={[sampleActivity]}
      />,
    );

    expect(markup).not.toContain("Register Contract");
  });

  it("hides Add Activity when the plan is approved", () => {
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

    expect(markup).not.toContain("mode=create-activity");
    expect(markup).not.toContain("mode=create-additional-activity");
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

  it("hides Add Activity when the plan is under Committee Review", () => {
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

    expect(markup).not.toContain("mode=create-activity");
    expect(markup).not.toContain("mode=create-additional-activity");
  });

  it("does not render a Request Cancellation button when plan is Finally Approved", () => {
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

    expect(markup).not.toContain("Request Cancellation");
    expect(markup).toContain("Request Amendment");
  });

  it("hides Request Amendment when any approved-plan activity is at another stage", () => {
    const approvedPlan: ProcurementPlanSummary = {
      ...mockPlan,
      activities: 2,
      status: "Finally Approved",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={approvedPlan}
        project={mockProject}
        savedActivities={[
          sampleActivity,
          {
            ...sampleActivity,
            currentStage: "Invitation to Bidders",
            reference: "ET-MoA-000002-GO-RFQ",
          },
        ]}
      />,
    );

    expect(markup).not.toContain("Request Amendment");
  });

  it("hides Request Amendment when approved-plan activities are unavailable", () => {
    const approvedPlan: ProcurementPlanSummary = {
      ...mockPlan,
      activities: 1,
      status: "Finally Approved",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementPlanDetailView
        plan={approvedPlan}
        project={mockProject}
      />,
    );

    expect(markup).not.toContain("Request Amendment");
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
