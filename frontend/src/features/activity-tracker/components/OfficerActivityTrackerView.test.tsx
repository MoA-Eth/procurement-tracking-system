import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  ProcurementActivityFormValues,
  ProcurementActivitySummary,
} from "../../projects/data/officerActivityDrafts";
import type {
  OfficerProject,
  ProcurementPlanSummary,
} from "../../projects/data/officerProjects";
import {
  collectTrackableActivities,
  OfficerActivityTrackerView,
  trackerCurrentStage,
  trackerDisplayStatus,
  trackerIsDueSoon,
  trackerStageProgress,
  type OfficerTrackedActivityItem,
} from "./OfficerActivityTrackerView";

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

const mockSavedActivity: ProcurementActivitySummary = {
  category: "Goods",
  currentStage: "Bid Opening",
  description: "Supply of veterinary cold-chain equipment",
  estimatedAmount: 2_500_000,
  method: "RFQ / Shopping",
  reference: "ET-MoA-000001-GO-RFQ",
  status: "Not Started",
};

describe("OfficerActivityTrackerView", () => {
  it("renders the officer tracking workspace and filters", () => {
    const markup = renderToStaticMarkup(<OfficerActivityTrackerView />);
    expect(markup).toContain("Activity Tracker");
    expect(markup).toContain(
      "Monitor approved procurement activities, milestones, and delays.",
    );
    expect(markup).toContain("All Activities");
    expect(markup).not.toContain("Requires Attention");
    expect(markup).toContain("Search reference, activity title, officer r...");
    expect(markup).toContain("More Filters");
    expect(markup).toContain("Reference No.");
    expect(markup).toContain("Effective Target");
    expect(markup).toContain("Overall Status");
  });

  it("includes activities from approved plans only", () => {
    const savedRecord = {
      activity: mockSavedActivity,
      planReference: mockPlan.reference,
      projectCode: mockProject.code,
    };
    const items = collectTrackableActivities([mockProject], [savedRecord], []);
    expect(items).toHaveLength(1);
    expect(items.every((item) => item.plan.status === "Approved")).toBe(true);
  });

  it("uses the latest revised target and derives due-soon stage progress", () => {
    const item = makeTrackedItem();
    const snapshot = trackerCurrentStage(item, "2026-08-22");

    expect(snapshot.name).toBe("Bid Opening");
    expect(snapshot.targetDate.gregorian).toBe("2026-08-25");
    expect(snapshot.delayDays).toBe(0);
    expect(trackerIsDueSoon(item, "2026-08-22")).toBe(true);
    expect(trackerStageProgress(item)).toEqual({
      completed: 1,
      percent: 33,
      total: 3,
    });
  });

  it("derives delayed and contracted activity statuses from roadmap progress", () => {
    const delayedItem = makeTrackedItem({
      revisedTarget: "2026-08-20",
    });
    expect(trackerDisplayStatus(delayedItem, "2026-08-22")).toBe("Delayed");

    const contractedItem = makeTrackedItem({
      processStatus: "Signed",
      signedContractCompleted: true,
    });
    expect(trackerDisplayStatus(contractedItem, "2026-08-22")).toBe(
      "Contracted",
    );
  });
});

function makeTrackedItem({
  processStatus = "Under Implementation",
  revisedTarget = "2026-08-25",
  signedContractCompleted = false,
}: {
  processStatus?: OfficerTrackedActivityItem["tracking"]["processStatus"];
  revisedTarget?: string;
  signedContractCompleted?: boolean;
} = {}): OfficerTrackedActivityItem {
  return {
    activity: {
      category: "Goods",
      currentStage: "Bid Opening",
      description: "Supply of cold-chain equipment",
      details: {
        componentAllocations: [],
        financingAllocations: [],
        form: {} as ProcurementActivityFormValues,
        lots: [],
        roadmap: [
          {
            allowNotApplicable: false,
            days: "0",
            ethiopianDate: "01-Hamle-2018",
            gregorianDate: "2026-07-08",
            name: "Preparation of Specification",
            notApplicable: false,
            remarks: "",
          },
          {
            allowNotApplicable: false,
            days: "20",
            ethiopianDate: "15-Nehase-2018",
            gregorianDate: "2026-08-01",
            name: "Bid Opening",
            notApplicable: false,
            remarks: "",
          },
          {
            allowNotApplicable: false,
            days: "45",
            ethiopianDate: "01-Tahsas-2019",
            gregorianDate: "2026-10-01",
            name: "Signed Contract",
            notApplicable: false,
            remarks: "",
          },
        ],
      },
      estimatedAmount: 2_500_000,
      method: "RFQ / Shopping",
      reference: "ET-MoA-000001-GO-RFQ",
      status: "In Progress",
    },
    plan: mockPlan,
    project: mockProject,
    tracking: {
      activityReference: "ET-MoA-000001-GO-RFQ",
      activityStatus: "Cleared",
      generalRemarks: "",
      planReference: mockPlan.reference,
      processStatus,
      progressPercent: 50,
      projectCode: mockProject.code,
      stages: [
        {
          actualDate: {
            ethiopian: "01-Hamle-2018",
            gregorian: "2026-07-08",
          },
          remarks: "",
          revisions: [],
          stageName: "Preparation of Specification",
          status: "Completed",
        },
        {
          remarks: "",
          revisions: [
            {
              createdAt: "2026-08-18T08:00:00.000Z",
              reason: "Approved evaluation schedule adjustment.",
              revisionNumber: 1,
              targetDate: {
                ethiopian: "19-Nehase-2018",
                gregorian: revisedTarget,
              },
            },
          ],
          stageName: "Bid Opening",
          status: "In Progress",
        },
        {
          ...(signedContractCompleted
            ? {
                actualDate: {
                  ethiopian: "01-Tahsas-2019",
                  gregorian: "2026-08-21",
                },
              }
            : {}),
          remarks: "",
          revisions: [],
          stageName: "Signed Contract",
          status: signedContractCompleted ? "Completed" : "Not Started",
        },
      ],
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  };
}
