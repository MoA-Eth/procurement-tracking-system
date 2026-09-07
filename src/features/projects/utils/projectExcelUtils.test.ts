import { describe, expect, it, vi } from "vitest";
import {
  downloadActivityExcelTemplate,
  exportPlanActivitiesToExcel,
  exportProjectDetailsToExcel,
  exportOfficerProjectsToExcel,
  parseActivitiesFromExcel,
} from "./projectExcelUtils";
import type { OfficerProject, ProcurementPlanSummary } from "../data/officerProjects";
import type { ProcurementActivitySummary } from "../data/officerActivityDrafts";
import * as XLSX from "xlsx";

vi.mock("xlsx", async () => {
  const actual = await vi.importActual<typeof import("xlsx")>("xlsx");
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

describe("projectExcelUtils", () => {
  const mockPlan: ProcurementPlanSummary = {
    activities: 2,
    budgetYear: "2016 EFY",
    category: "Goods",
    completedActivities: 0,
    currency: "ETB",
    delayedActivities: 0,
    estimatedValue: 5000000,
    inProgressActivities: 0,
    name: "2016 Annual Plan",
    reference: "PLAN-2016-01",
    status: "Draft",
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
    fundingType: "Loan",
    name: "DRIVE Project",
    organizationRegion: "FPCU / Federal",
    plans: [mockPlan],
    shortName: "DRIVE",
    status: "Active",
  };

  const mockActivities: ProcurementActivitySummary[] = [
    {
      category: "Goods",
      currentStage: "Draft RFQ",
      description: "Supply of Lab Equipment",
      estimatedAmount: 2500000,
      method: "RFQ",
      reference: "ACT-001",
      status: "Not Started",
    },
    {
      category: "Works",
      currentStage: "Bidding Open",
      description: "Office Renovation",
      estimatedAmount: 8000000,
      method: "RFB National",
      reference: "ACT-002",
      status: "In Progress",
    },
  ];

  it("triggers Excel download for activity template", () => {
    downloadActivityExcelTemplate();
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it("exports plan activities to Excel without error", () => {
    exportPlanActivitiesToExcel(mockPlan, mockActivities, mockProject.code);
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it("exports project details to Excel without error", () => {
    exportProjectDetailsToExcel(mockProject);
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it("exports officer assigned projects list to Excel without error", () => {
    exportOfficerProjectsToExcel([mockProject]);
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it("parses activities from a generated Excel buffer", async () => {
    const data = [
      {
        "Activity Reference": "ET-TEST-001",
        Description: "Test Equipment Supply",
        Category: "Goods",
        Method: "RFQ",
        "Estimated Amount": 500000,
        Status: "Not Started",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const outBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const file = new File([outBuffer], "test_import.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseActivitiesFromExcel(file);

    expect(result.totalRows).toBe(1);
    expect(result.validCount).toBe(1);
    expect(result.activities[0].reference).toBe("ET-TEST-001");
    expect(result.activities[0].description).toBe("Test Equipment Supply");
    expect(result.activities[0].estimatedAmount).toBe(500000);
  });
});
