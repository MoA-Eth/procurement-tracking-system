import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  activityReferenceFor,
  methodsForCategory,
  roadmapForMethod,
} from "../data/procurementActivityConfig";
import type {
  OfficerProject,
  ProcurementPlanSummary,
} from "../data/officerProjects";
import type { ProcurementActivitySummary } from "../data/officerActivityDrafts";
import { CreateProcurementActivityView } from "./CreateProcurementActivityView";

const plan: ProcurementPlanSummary = {
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

const project: OfficerProject = {
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
  plans: [plan],
  shortName: "DRIVE",
  status: "Active",
};

describe("CreateProcurementActivityView", () => {
  it("starts with the document-defined four-step structure and locked context", () => {
    const markup = renderToStaticMarkup(
      <CreateProcurementActivityView plan={plan} project={project} />,
    );

    expect(markup).toContain("Add Procurement Activity");
    expect(markup).toContain("Key Details");
    expect(markup).toContain("Related Information");
    expect(markup).toContain("Additional Details");
    expect(markup).toContain("Roadmap");
    expect(markup).toContain(plan.name);
    expect(markup).toContain("Inherited from the procurement plan");
    expect(markup).toContain(plan.category);
    expect(markup).not.toContain("legacy multi-category plan");
  });

  it("filters procurement methods by the inherited plan category", () => {
    const goodsMethods = methodsForCategory("Goods").map(
      (method) => method.key,
    );
    const consultancyMethods = methodsForCategory("Consultancy Services").map(
      (method) => method.key,
    );

    expect(goodsMethods).toContain("rfb-international");
    expect(goodsMethods).toContain("rfq-shopping");
    expect(goodsMethods).not.toContain("qcbs");
    expect(consultancyMethods).toContain("qcbs");
    expect(consultancyMethods).toContain("indv");
    expect(consultancyMethods).not.toContain("rfb-national");
  });

  it("generates method-specific roadmap stages and an activity reference", () => {
    const rfbRoadmap = roadmapForMethod("rfb-international");
    const consultancyRoadmap = roadmapForMethod("qcbs");

    expect(rfbRoadmap[0]?.name).toBe("Draft Pre-qualification Documents");
    expect(rfbRoadmap.at(-1)?.name).toBe("Contract Termination");
    expect(consultancyRoadmap).toHaveLength(15);
    expect(
      activityReferenceFor(project, plan, "Works", "rfb-international", 123456),
    ).toBe("ET-MoA-123457-CW-RFB");
  });

  it("maintains previously entered data and displays edit mode controls when initialActivity is provided", () => {
    const existingActivity = {
      category: "Goods" as const,
      currentStage: "Bidding Documents Preparation",
      description: "Supply of 50 Hybrid Field Vehicles",
      estimatedAmount: 4_500_000,
      method: "RFB - National",
      reference: "ET-MOA-100200-GO-RFB",
      status: "Draft" as const,
      details: {
        form: {
          description: "Supply of 50 Hybrid Field Vehicles",
          estimatedAmount: "4500000",
          marketApproach: "Open - National",
          method: "RFB - National",
          procurementMethodKey: "rfb-national",
          reviewType: "Post Review",
        },
      },
    };

    const markup = renderToStaticMarkup(
      <CreateProcurementActivityView
        initialActivity={
          existingActivity as unknown as ProcurementActivitySummary
        }
        plan={plan}
        project={project}
      />,
    );

    // Header and banner indicate edit mode
    expect(markup).toContain("Revise Procurement Activity");
    expect(markup).toContain("Editing Activity");
    expect(markup).toContain("ET-MOA-100200-GO-RFB");
    expect(markup).toContain("Save Changes");

    // Pre-selected method controls are displayed in Step 1
    expect(markup).toContain("Market Approach");
    expect(markup).toContain("Review Type");
    expect(markup).toContain("Procurement Document Type");

    // All steps are interactive clickable buttons in edit mode
    expect(markup).toContain('data-step="1"');
    expect(markup).toContain('data-step="2"');
    expect(markup).toContain('data-step="3"');
    expect(markup).toContain('data-step="4"');
  });

  it("resolves roadmap stages even when method is provided as display label", () => {
    const roadmapFromKey = roadmapForMethod("rfb-national");
    const roadmapFromLabel = roadmapForMethod("RFB - National");

    expect(roadmapFromLabel.length).toBeGreaterThan(0);
    expect(roadmapFromLabel.length).toBe(roadmapFromKey.length);
    expect(roadmapFromLabel[0]?.name).toBe(roadmapFromKey[0]?.name);
  });
});
