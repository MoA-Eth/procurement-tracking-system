import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { OfficerProject } from "../data/officerProjects";
import {
  CreateProcurementPlanView,
  suggestedPlanName,
} from "./CreateProcurementPlanView";

const mockProject1: OfficerProject = {
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
  plans: [],
  shortName: "DRIVE",
  status: "Active",
};

const mockProject2: OfficerProject = {
  ...mockProject1,
  availableOrganizationRegions: [
    "FPCU / Federal",
    "Oromia",
    "Somali",
    "Afar",
    "Southwest Ethiopia",
    "South Ethiopia",
  ],
  code: "PRJ-24-042",
  shortName: "BREFONS",
};

describe("CreateProcurementPlanView", () => {
  it("starts with the specification-defined procurement category dropdown", () => {
    const markup = renderToStaticMarkup(
      <CreateProcurementPlanView
        onSavePlan={() => undefined}
        project={mockProject1}
      />,
    );

    expect(markup).toContain("Procurement Category");
    expect(markup).toContain("Select category...");
    expect(markup).toContain("Goods");
    expect(markup).toContain("Works");
    expect(markup).toContain("Non-Consulting Services");
    expect(markup).toContain("Consultancy Services");
  });

  it("builds the editable suggested name from project, category, and fiscal year", () => {
    expect(suggestedPlanName(mockProject1, "Goods", "2018")).toBe(
      "DRIVE - Goods Procurement Plan - 2018 EFY",
    );
  });

  it("provides organization choices only from the assigned project scope", () => {
    expect(mockProject1.availableOrganizationRegions).toEqual([
      "FPCU / Federal",
    ]);
    expect(mockProject2.availableOrganizationRegions).toEqual([
      "FPCU / Federal",
      "Oromia",
      "Somali",
      "Afar",
      "Southwest Ethiopia",
      "South Ethiopia",
    ]);
  });

  it("renders the complete single-page form with inherited project info, timeline, and direct save actions", () => {
    const markup = renderToStaticMarkup(
      <CreateProcurementPlanView
        onSavePlan={() => undefined}
        project={mockProject1}
      />,
    );

    expect(markup).toContain("Inherited Project Information");
    expect(markup).toContain("Plan Identification &amp; Classification");
    expect(markup).toContain("Plan Schedule &amp; Coverage Period");
    expect(markup).toContain("Save Draft");
    expect(markup).toContain("Save &amp; Add Procurement Activity");
  });

  it("maintains previously entered plan data when initialPlan is provided", () => {
    const existingPlan = {
      activities: 0,
      budgetYear: "2017 EFY",
      category: "Works" as const,
      completedActivities: 0,
      currency: "ETB" as const,
      delayedActivities: 0,
      description: "Construction of regional irrigation canals",
      estimatedValue: 12_000_000,
      inProgressActivities: 0,
      name: "DRIVE - Regional Irrigation Works - 2017 EFY",
      organizationRegion: "Oromia",
      planPeriod: {
        from: { ethiopian: "01/11/2016", gregorian: "2024-07-08" },
        to: { ethiopian: "30/10/2017", gregorian: "2025-07-07" },
      },
      reference: "PLN-OROMIA-2017-WORKS",
      status: "Draft" as const,
      version: 2,
    };

    const markup = renderToStaticMarkup(
      <CreateProcurementPlanView
        initialPlan={existingPlan}
        onSavePlan={() => undefined}
        project={mockProject2}
      />,
    );

    expect(markup).toContain("Edit Procurement Plan");
    expect(markup).toContain("v2");
    expect(markup).toContain("DRIVE - Regional Irrigation Works - 2017 EFY");
    expect(markup).toContain("Construction of regional irrigation canals");
    expect(markup).toContain("2017");
  });
});

