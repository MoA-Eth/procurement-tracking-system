import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { OfficerProject } from "../data/officerProjects";
import { OfficerProjectDetailView } from "./OfficerProjectDetailView";

const mockProject: OfficerProject = {
  activePlans: 2,
  assignedOfficers: ["Yeabsira Fikre"],
  assignmentStart: { ethiopian: "02 Hamle 2016", gregorian: "10 Jan 2024" },
  availableOrganizationRegions: ["FPCU / Federal"],
  baseCurrency: "USD",
  code: "PRJ-24-001",
  components: ["Livestock Value Chains and Trade Facilitation"],
  countryOrganisation: "Ethiopia",
  executingAgency: "Ministry of Agriculture",
  financingNumbers: ["IDA-E0380", "IDA-61650"],
  fundingSource: "World Bank",
  fundingType: "Loan / Grant",
  name: "DRIVE - De-Risking, Inclusion and Value Enhancement",
  organizationRegion: "FPCU / Federal",
  plans: [],
  projectPeriod: { from: "01 Jul 2023", to: "30 Jun 2028" },
  shortName: "DRIVE",
  status: "Active",
  supportsGeneralProcurementNotice: true,
};

describe("OfficerProjectDetailView", () => {
  it("shows entered Create Project fields and excludes non-project fields", () => {
    const markup = renderToStaticMarkup(
      <OfficerProjectDetailView project={mockProject} />,
    );

    expect(markup).toContain("Country / organisation");
    expect(markup).toContain("Executing agency");
    expect(markup).toContain("Organization / region");
    expect(markup).toContain("Assigned officers");
    expect(markup).toContain("Financing no.");
    expect(markup).toContain("Components");
    expect(markup).toContain("Category");
    expect(markup).not.toContain("Categories");
    expect(markup).not.toContain("Objective");
    expect(markup).not.toContain("Total budget");
    expect(markup).not.toContain("Sector");
  });

  it("omits optional project fields that were not entered", () => {
    const project = {
      ...mockProject,
      components: undefined,
      financingNumbers: undefined,
      organizationRegion: undefined,
      projectPeriod: undefined,
      sapIdentificationNumber: undefined,
      subcomponents: undefined,
    };
    const markup = renderToStaticMarkup(
      <OfficerProjectDetailView project={project} />,
    );

    expect(markup).not.toContain("Organization / region");
    expect(markup).not.toContain("Project period");
    expect(markup).not.toContain("SAP / identification no.");
    expect(markup).not.toContain("Financing no.");
    expect(markup).not.toContain("Components");
    expect(markup).not.toContain("Subcomponents");
    expect(markup).not.toContain("Not provided");
  });

  it("renders Export Excel and Import Excel buttons for project plans", () => {
    const markup = renderToStaticMarkup(
      <OfficerProjectDetailView project={mockProject} />,
    );

    expect(markup).toContain("Export Excel");
    expect(markup).toContain("Import Excel");
    expect(markup).toContain("Create Plan");
  });
});
