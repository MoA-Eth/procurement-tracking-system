import { describe, expect, it } from "vitest";
import {
  addSavedPlanRecord,
  createDraftPlan,
  mergeSavedPlans,
  parseSavedPlanRecords,
  type ProcurementPlanDraftInput,
} from "./officerPlanDrafts";
import type { OfficerProject } from "./officerProjects";

// Minimal inline mock that gives the tests a stable project with two plans.
const mockProject: OfficerProject = {
  activePlans: 2,
  assignedOfficers: ["Yeabsira Fikre"],
  availableOrganizationRegions: ["FPCU / Federal"],
  baseCurrency: "USD",
  code: "PRJ-24-001",
  countryOrganisation: "Ethiopia",
  executingAgency: "Ministry of Agriculture",
  financingNumbers: ["IDA-E0380"],
  fundingSource: "World Bank",
  fundingType: "Loan / Grant",
  name: "DRIVE - De-Risking, Inclusion and Value Enhancement",
  organizationRegion: "FPCU / Federal",
  plans: [
    {
      activities: 12,
      budgetYear: "2016 EFY",
      category: "Goods",
      completedActivities: 8,
      currency: "ETB",
      delayedActivities: 1,
      estimatedValue: 125_500_000,
      inProgressActivities: 3,
      name: "2016 EFY Annual Procurement Plan",
      reference: "PP-DRIVE-2016-01",
      status: "Approved",
    },
    {
      activities: 4,
      budgetYear: "2016 EFY",
      category: "Consultancy Services",
      completedActivities: 1,
      currency: "USD",
      delayedActivities: 1,
      estimatedValue: 14_000_000,
      inProgressActivities: 2,
      name: "Q2 Consultancy Requirements",
      reference: "PP-DRIVE-2016-02",
      status: "Draft",
    },
    {
      activities: 7,
      budgetYear: "2017 EFY",
      category: "Goods",
      completedActivities: 3,
      currency: "ETB",
      delayedActivities: 1,
      estimatedValue: 68_750_000,
      inProgressActivities: 3,
      name: "2017 EFY Procurement Pipeline",
      reference: "PP-DRIVE-2017-01",
      status: "Submitted to Director",
    },
  ],
  shortName: "DRIVE",
  status: "Active",
  supportsGeneralProcurementNotice: true,
};

const mockProjects: readonly OfficerProject[] = [mockProject];

const draftInput: ProcurementPlanDraftInput = {
  budgetYear: "2017",
  category: "Goods",
  generalProcurementNoticeDate: "2026-08-28",
  generalProcurementNoticeDateEthiopian: "22-Nehase-2018",
  organizationRegion: "FPCU / Federal",
  periodFrom: "2026-07-08",
  periodFromEthiopian: "01-Hamle-2018",
  periodTo: "2027-07-07",
  periodToEthiopian: "30-Sene-2019",
  planName: "DRIVE - Goods Procurement Plan - 2017 EFY",
  remarks: "Annual goods plan.",
};

describe("officer plan draft persistence", () => {
  it("creates a Draft summary containing the entered plan data", () => {
    const plan = createDraftPlan(mockProject, draftInput);

    expect(plan.reference).toBe("PP-DRIVE-2017-02");
    expect(plan.status).toBe("Draft");
    expect(plan.category).toBe("Goods");
    expect(plan.activities).toBe(0);
    expect(plan.organizationRegion).toBe("FPCU / Federal");
    expect(plan.planPeriod?.from.gregorian).toBe("2026-07-08");
    expect(plan.generalProcurementNoticeDate?.ethiopian).toBe("22-Nehase-2018");
  });

  it("merges a saved plan into its project and updates the plan count", () => {
    const plan = createDraftPlan(mockProject, draftInput);
    const projects = mergeSavedPlans(mockProjects, [
      { plan, projectCode: mockProject.code },
    ]);

    expect(projects[0].plans.at(-1)?.reference).toBe(plan.reference);
    expect(projects[0].activePlans).toBe(mockProject.activePlans + 1);
    expect(projects[1]).toBeUndefined();
  });

  it("round-trips valid saved records and ignores duplicate additions", () => {
    const plan = createDraftPlan(mockProject, draftInput);
    const record = { plan, projectCode: mockProject.code };
    const records = addSavedPlanRecord(addSavedPlanRecord([], record), record);

    expect(records).toHaveLength(1);
    expect(parseSavedPlanRecords(JSON.stringify(records))).toEqual(records);
    expect(parseSavedPlanRecords("not-json")).toEqual([]);
  });

  it("migrates legacy saved plans to their first valid plan category", () => {
    const plan = createDraftPlan(mockProject, draftInput);
    const legacyPlan = {
      ...plan,
      categories: ["Consultancy", "Goods"],
      category: undefined,
    };

    const [record] = parseSavedPlanRecords(
      JSON.stringify([{ plan: legacyPlan, projectCode: mockProject.code }]),
    );

    expect(record.plan.category).toBe("Consultancy Services");
    expect(record.plan).not.toHaveProperty("categories");
  });

  it("merges status updates on existing plans when submitted to director", () => {
    const project = mockProject;
    const initialPlan = project.plans[0];
    const submittedPlan = {
      ...initialPlan,
      status: "Submitted to Director" as const,
    };

    const projects = mergeSavedPlans(mockProjects, [
      { plan: submittedPlan, projectCode: project.code },
    ]);

    const updated = projects[0].plans.find(
      (p) => p.reference === initialPlan.reference,
    );
    expect(updated?.status).toBe("Submitted to Director");
  });

  it("preserves advanced backend status when a stale draft record exists in storage", () => {
    const project = {
      ...mockProject,
      plans: [
        {
          ...mockProject.plans[0],
          status: "Committee Review" as const,
        },
      ],
    };

    const staleDraft = {
      ...mockProject.plans[0],
      status: "Draft" as const,
    };

    const projects = mergeSavedPlans(
      [project],
      [{ plan: staleDraft, projectCode: project.code }],
    );

    const updated = projects[0].plans.find(
      (p) => p.reference === mockProject.plans[0].reference,
    );
    expect(updated?.status).toBe("Committee Review");
  });

  it("correctly preserves Returned status and rejection remarks", () => {
    const project = {
      ...mockProject,
      plans: [
        {
          ...mockProject.plans[0],
          status: "Returned" as const,
          rejectionReason: "Director requested updated bill of quantities.",
        },
      ],
    };

    const staleDraft = {
      ...mockProject.plans[0],
      status: "Draft" as const,
    };

    const projects = mergeSavedPlans(
      [project],
      [{ plan: staleDraft, projectCode: project.code }],
    );

    const updated = projects[0].plans.find(
      (p) => p.reference === mockProject.plans[0].reference,
    );
    expect(updated?.status).toBe("Returned");
    expect(updated?.rejectionReason).toBe(
      "Director requested updated bill of quantities.",
    );
  });
});
