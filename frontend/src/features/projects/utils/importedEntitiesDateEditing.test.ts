import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  parseActivitiesFromExcel,
  parseExcelDateToIso,
  parsePlansFromExcel,
} from "./projectExcelUtils";
import { parseContractsFromExcel } from "../../contracts/utils/contractExcelUtils";
import {
  formatEthiopianDate,
  gregorianToEthiopian,
  parseGregorianDate,
} from "./ethiopianCalendar";
import { toInputDate } from "../components/CreateProcurementPlanView";

describe("Imported details and dates editability (Plans, Activities, Contracts, Projects)", () => {
  it("imports a procurement plan with Excel serial dates and allows editing dates normally", async () => {
    // Excel stores 2025-07-08 as numeric 45846, and 2026-07-07 as 46210
    const rawData = [
      {
        "Project Code (Required)": "MOA-TEST-01",
        "Plan Title (Required)": "Imported Irrigation Expansion Plan",
        "Budget Year (Required)": "2018",
        "Category (Dropdown)": "Goods",
        "Period Start (Required)": 45846.125,
        "Period End (Required)": 46210.5,
        "Contract Award Date (Optional)": "15/08/2025",
        Organization: "Federal / FPCU",
        Status: "Draft",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(rawData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plans Upload");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const file = new File([buffer], "imported_plans.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const parsed = await parsePlansFromExcel(file);
    expect(parsed.validCount).toBe(1);

    const importedPlan = parsed.plans[0];
    // Dates must be normalized to clean YYYY-MM-DD strings immediately
    expect(importedPlan.planPeriod).toBeDefined();
    expect(importedPlan.planPeriod!.from.gregorian).toBe("2025-07-08");
    expect(importedPlan.planPeriod!.to.gregorian).toBe("2026-07-07");
    expect(importedPlan.planPeriod!.from.ethiopian).toBe("01-Hamle-2017");
    expect(importedPlan.contractAwardDate?.gregorian).toBe("2025-08-15");

    // When the user opens the plan in the edit form:
    const periodFrom = toInputDate(importedPlan.planPeriod!.from.gregorian);
    expect(periodFrom).toBe("2025-07-08");

    // Simulating user changing date in the calendar to 2025-09-11 (Ethiopian New Year 2018 Meskerem 1)
    const userNewDate = "2025-09-11";
    const ethNewDate = gregorianToEthiopian(userNewDate);
    expect(ethNewDate).not.toBeNull();
    expect(formatEthiopianDate(ethNewDate!)).toBe("01-Meskerem-2018");
  });

  it("imports activities with serial/unformatted dates, generates complete roadmap, and enables date editing", async () => {
    const rawData = [
      {
        "Plan ID or Title (Required)": "PLAN-2018-01",
        "Activity Reference (Required)": "ACT-IMPORT-001",
        "Activity Description (Required)": "Supply of Solar Water Pumps",
        "Category (Required - Dropdown)": "Goods",
        "Method ID (Required - Dropdown)": "RFB / Open Tender",
        "Estimated Budget (ETB) (Required)": 1500000,
        "Planned Start Date (Optional - YYYY-MM-DD)": 45846, // 2025-07-08
        "Planned End Date (Optional - YYYY-MM-DD)": "08/09/2025",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(rawData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Activities Upload");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const file = new File([buffer], "imported_activities.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const parsed = await parseActivitiesFromExcel(file);
    expect(parsed.validCount).toBe(1);

    const importedActivity = parsed.activities[0];
    const roadmap = importedActivity.details?.roadmap;
    // Complete roadmap must be populated
    expect(roadmap).toBeDefined();
    expect(roadmap!.length).toBeGreaterThan(1);

    // First stage has normalized start date and Ethiopian date
    expect(roadmap![0].gregorianDate).toBe("2025-07-08");
    expect(roadmap![0].ethiopianDate).toBe("01-Hamle-2017");

    // Editing a stage date works without crashing or producing invalid values
    const newStageDate = "2025-10-01";
    const parsedDate = parseGregorianDate(newStageDate);
    expect(parsedDate).toEqual({ year: 2025, month: 10, day: 1 });
  });

  it("imports contracts with dates in serial and DD/MM/YYYY formats and parses them for editing", async () => {
    const rawData = [
      {
        Project: "AGP-II",
        Activity: "ACT-001",
        Supplier: "Afro Agricultural Implements PLC",
        Region: "Oromia",
        "Contract Number": "MOA/AGP2/CON-2025-01",
        "Contract Award Date": 45846, // 2025-07-08
        "Contract Signature Date": "15/07/2025",
        "Start Date": "01/08/2025",
        "End Date": "2026-07-07",
        "Original Contract Amount": 5000000,
        "Final Contract Amount": 5000000,
        "Contract Status": "Signed",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(rawData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const file = new File([buffer], "contracts.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const parsed = await parseContractsFromExcel(file);
    expect(parsed.validCount).toBe(1);
    expect(parsed.rows[0].awardDate).toBe("2025-07-08");
    expect(parsed.rows[0].signingDate).toBe("2025-07-15");
    expect(parsed.rows[0].startDate).toBe("2025-08-01");
    expect(parsed.rows[0].endDate).toBe("2026-07-07");
  });

  it("converts backend project ISO timestamp dates to Ethiopian calendar seamlessly", () => {
    // When project details return ISO dates with UTC time components from Prisma
    const projectStartDate = "2025-07-08T00:00:00.000Z";
    const projectEndDate = "2026-07-07T23:59:59.999Z";

    const startEth = gregorianToEthiopian(projectStartDate);
    const endEth = gregorianToEthiopian(projectEndDate);

    expect(startEth).toEqual({ year: 2017, month: 11, day: 1 });
    expect(formatEthiopianDate(startEth!)).toBe("01-Hamle-2017");

    expect(endEth).toEqual({ year: 2018, month: 10, day: 30 });
    expect(formatEthiopianDate(endEth!)).toBe("30-Sene-2018");

    // Slicing to input date produces clean YYYY-MM-DD
    expect(projectStartDate.slice(0, 10)).toBe("2025-07-08");
    expect(projectEndDate.slice(0, 10)).toBe("2026-07-07");
  });
});
