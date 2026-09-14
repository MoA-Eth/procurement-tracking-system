import * as XLSX from "xlsx";
import type {
  OfficerProject,
  ProcurementPlanSummary,
  ProcurementCategory,
} from "../data/officerProjects";
import { gregorianToEthiopian, formatEthiopianDate } from "./ethiopianCalendar";
import type {
  ProcurementActivityStatus,
  ProcurementActivitySummary,
} from "../data/officerActivityDrafts";

export interface ParsedActivityRow {
  reference: string;
  description: string;
  category: string;
  method: string;
  estimatedAmount: number;
  currency: string;
  currentStage: string;
  status: ProcurementActivityStatus;
  fundingSource?: string;
  marketApproach?: string;
  reviewType?: string;
  isValid: boolean;
  validationError?: string;
}

export interface ParsedActivitiesResult {
  activities: ProcurementActivitySummary[];
  rows: ParsedActivityRow[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  fileName: string;
}

export interface ParsedPlanRow {
  name: string;
  reference: string;
  budgetYear: string;
  category: string;
  organizationRegion: string;
  description?: string;
  isValid: boolean;
  validationError?: string;
}

export interface ParsedPlansResult {
  plans: ProcurementPlanSummary[];
  rows: ParsedPlanRow[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  fileName: string;
}

/**
 * Normalizes string keys by trimming, removing special characters, and converting to lowercase.
 */
function normalizeHeader(header: string): string {
  return String(header || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Flexible column matching against known aliases.
 */
function getColumnValue(row: Record<string, any>, aliases: string[]): any {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const foundKey = keys.find((k) => normalizeHeader(k) === normalizedAlias);
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      return row[foundKey];
    }
  }
  return undefined;
}

/**
 * Downloads a pre-formatted Excel template for importing Procurement Activities.
 */
export function downloadActivityExcelTemplate(
  planRef: string = "PLAN-2018-01",
) {
  const templateData = [
    {
      "Plan ID (Required)": planRef,
      "Reference (Required)": "ET-MoA-001-GO-RFQ",
      Description: "Procurement of Agricultural Laboratory Equipment",
      "Category (Dropdown)": "Goods",
      "Method ID (Dropdown)": "RFQ",
      "Estimated Budget": 1500000,
      "Currency (Dropdown)": "ETB",
      "Market Approach (Dropdown)": "Open National",
      "Review Type (Dropdown)": "Post Review",
    },
    {
      "Plan ID (Required)": planRef,
      "Reference (Required)": "ET-MoA-002-CW-RFB",
      Description: "Construction of Regional Seed Testing Center",
      "Category (Dropdown)": "Works",
      "Method ID (Dropdown)": "RFB National",
      "Estimated Budget": 12000000,
      "Currency (Dropdown)": "ETB",
      "Market Approach (Dropdown)": "Open National",
      "Review Type (Dropdown)": "Prior Review",
    },
    {
      "Plan ID (Required)": planRef,
      "Reference (Required)": "ET-MoA-003-CS-QCBS",
      Description: "Consultancy Services for Environmental Impact Assessment",
      "Category (Dropdown)": "Consultancy Services",
      "Method ID (Dropdown)": "QCBS",
      "Estimated Budget": 3500000,
      "Currency (Dropdown)": "ETB",
      "Market Approach (Dropdown)": "Open International",
      "Review Type (Dropdown)": "Prior Review",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const colWidths = [
    { wch: 22 }, // Plan ID
    { wch: 25 }, // Reference
    { wch: 45 }, // Description
    { wch: 22 }, // Category
    { wch: 22 }, // Method ID
    { wch: 18 }, // Estimated Budget
    { wch: 14 }, // Currency
    { wch: 22 }, // Market Approach
    { wch: 18 }, // Review Type
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Activities Upload");
  XLSX.writeFile(workbook, "Procurement_Activity_Import_Template.xlsx");
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV file containing Procurement Activities.
 */
export async function parseActivitiesFromExcel(
  file: File,
  defaultPlanId?: string,
): Promise<ParsedActivitiesResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Excel file contains no worksheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  });

  if (rawRows.length === 0) {
    throw new Error("No data rows found in the selected Excel sheet.");
  }

  // Validate template header structure
  const headerKeys = Object.keys(rawRows[0] || {});
  const normalizedHeaders = headerKeys.map((h) => normalizeHeader(h));
  const hasRef = normalizedHeaders.some(
    (h) => h.includes("reference") || h === "ref" || h.includes("activityref"),
  );
  const hasDesc = normalizedHeaders.some(
    (h) =>
      h.includes("description") ||
      h.includes("activitydesc") ||
      h === "activity",
  );

  if (!hasRef || !hasDesc) {
    const missingCols: string[] = [];
    if (!hasRef) missingCols.push("Reference (Required)");
    if (!hasDesc) missingCols.push("Description");
    throw new Error(
      `Invalid template structure: The uploaded file does not follow the Procurement Activities template structure. Missing required columns: [${missingCols.join(
        ", ",
      )}]. Found columns: [${headerKeys.join(
        ", ",
      )}]. Please download and use the official template.`,
    );
  }

  const parsedRows: ParsedActivityRow[] = [];
  const validActivities: ProcurementActivitySummary[] = [];

  rawRows.forEach((row, idx) => {
    const rawPlanId =
      getColumnValue(row, [
        "Plan ID (Required)",
        "Plan ID",
        "Plan Reference",
        "Plan",
      ]) || defaultPlanId;

    const rawRef = getColumnValue(row, [
      "Reference (Required)",
      "Reference",
      "Activity Reference",
      "Ref",
      "Ref No",
      "Activity Ref",
      "Code",
      "Activity Code",
    ]);
    const rawDesc = getColumnValue(row, [
      "Description",
      "Activity Description",
      "Title",
      "Name",
      "Activity Name",
    ]);
    const rawCategory = getColumnValue(row, [
      "Category (Dropdown)",
      "Category",
      "Procurement Category",
      "Type",
    ]);
    const rawMethod = getColumnValue(row, [
      "Method ID (Dropdown)",
      "Method ID",
      "Method",
      "Procurement Method",
      "Specific Method",
    ]);
    const rawAmount = getColumnValue(row, [
      "Estimated Budget",
      "Estimated Amount",
      "Amount",
      "Budget",
      "Cost",
    ]);
    const rawCurrency = getColumnValue(row, [
      "Currency (Dropdown)",
      "Currency",
      "Base Currency",
    ]);
    const rawMarket = getColumnValue(row, [
      "Market Approach (Dropdown)",
      "Market Approach",
      "Approach",
    ]);
    const rawReview = getColumnValue(row, [
      "Review Type (Dropdown)",
      "Review Type",
      "Review",
    ]);
    const rawStage = getColumnValue(row, [
      "Current Stage",
      "Stage",
      "Procurement Stage",
      "Active Stage",
    ]);
    const rawStatus = getColumnValue(row, [
      "Status (Dropdown)",
      "Status",
      "Activity Status",
      "State",
    ]);
    const rawFunding = getColumnValue(row, ["Funding Source", "Funding"]);

    const description = String(rawDesc || "").trim();
    const rawRefStr = String(rawRef || "").trim();
    const reference =
      rawRefStr || `IMP-${Date.now().toString(36).toUpperCase()}-${idx + 1}`;

    let isValid = true;
    let validationError = "";

    if (!description) {
      isValid = false;
      validationError = "Missing activity description";
    } else if (!rawRefStr) {
      isValid = false;
      validationError = "Missing activity reference";
    }

    // Normalize category
    let category = "Goods";
    const catStr = String(rawCategory || "").toLowerCase();
    if (catStr.includes("work")) category = "Works";
    else if (catStr.includes("non-consult") || catStr.includes("non consult"))
      category = "Non-Consulting Services";
    else if (catStr.includes("consult")) category = "Consultancy Services";
    else if (catStr.includes("good")) category = "Goods";

    // Normalize method
    const method = String(rawMethod || "RFB / Open Tender").trim();

    // Parse amount
    let estimatedAmount = 0;
    if (typeof rawAmount === "number") {
      estimatedAmount = rawAmount;
    } else if (rawAmount) {
      const cleaned = String(rawAmount).replace(/[^0-9.-]+/g, "");
      estimatedAmount = parseFloat(cleaned) || 0;
    }

    if (estimatedAmount < 0) {
      isValid = false;
      validationError = "Estimated budget cannot be negative";
    }

    // Normalize status
    let status: ProcurementActivityStatus = "Not Started";
    const statusStr = String(rawStatus || "").toLowerCase();
    if (statusStr.includes("complete")) status = "Completed";
    else if (statusStr.includes("delay")) status = "Delayed";
    else if (statusStr.includes("progress")) status = "In Progress";
    else if (statusStr.includes("return")) status = "Returned";
    else if (statusStr.includes("submit") || statusStr.includes("director"))
      status = "Submitted to Director";
    else if (statusStr.includes("draft")) status = "Draft";

    const currentStage = String(rawStage || "Draft Bidding Documents").trim();
    const currency = String(rawCurrency || "ETB").trim();
    const fundingSource = rawFunding ? String(rawFunding).trim() : undefined;
    const marketApproach = rawMarket ? String(rawMarket).trim() : undefined;
    const reviewType = rawReview ? String(rawReview).trim() : undefined;

    const parsedRow: ParsedActivityRow = {
      reference,
      description,
      category,
      method,
      estimatedAmount,
      currency,
      currentStage,
      status,
      fundingSource,
      marketApproach,
      reviewType,
      isValid,
      validationError: validationError || undefined,
    };

    parsedRows.push(parsedRow);

    if (isValid) {
      validActivities.push({
        reference,
        description,
        category,
        method,
        estimatedAmount,
        currentStage,
        status,
        details: {
          componentAllocations: [],
          financingAllocations: [],
          form: {
            activityDescription: description,
            classificationCode: "",
            comments: "",
            contractType: "Lump Sum",
            currency,
            domesticPreference: "No",
            estimatedAmount: String(estimatedAmount),
            evaluationOptionCode: "",
            fundingSource: fundingSource || "",
            highRiskCode: "",
            inProcess: false,
            invitationReference: "",
            latitude: "",
            location: "",
            longitude: "",
            lotRequired: false,
            marketApproach: marketApproach || "OPEN_NATIONAL",
            method,
            oversightClassification: "",
            pricingBasis: "",
            procurementDocumentType: "",
            procurementProcess: "",
            qualificationApproach: "",
            requiresUnAgency: false,
            reviewType: reviewType || "POST",
            scopeNotes: "",
            specificMethod: "",
            subcomponent: "",
          },
          lots: [],
          roadmap: [],
        },
      });
    }
  });

  return {
    activities: validActivities,
    rows: parsedRows,
    totalRows: parsedRows.length,
    validCount: validActivities.length,
    invalidCount: parsedRows.length - validActivities.length,
    fileName: file.name,
  };
}

/**
 * Exports plan activities to a formatted Excel file matching canonical standards.
 */
export function exportPlanActivitiesToExcel(
  plan: ProcurementPlanSummary,
  activities: ProcurementActivitySummary[],
  projectCode: string,
) {
  const sheetName = (plan.name || "Activities").slice(0, 31);
  const rows = activities.map((a) => ({
    "Plan ID": plan.reference,
    Reference: a.reference,
    Description: a.description,
    Category: a.category,
    "Method ID": a.method,
    "Estimated Budget": a.estimatedAmount,
    Currency: a.details?.form?.currency || plan.currency || "ETB",
    "Market Approach": a.details?.form?.marketApproach || "Open National",
    "Review Type": a.details?.form?.reviewType || "Post Review",
    "Current Stage": a.currentStage,
    Status: a.status,
    "Funding Source": a.details?.form?.fundingSource || "",
    "Project Code": projectCode,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const colWidths = [
    { wch: 22 }, // Plan ID
    { wch: 24 }, // Reference
    { wch: 45 }, // Description
    { wch: 20 }, // Category
    { wch: 20 }, // Method ID
    { wch: 18 }, // Estimated Budget
    { wch: 10 }, // Currency
    { wch: 18 }, // Market Approach
    { wch: 14 }, // Review Type
    { wch: 30 }, // Current Stage
    { wch: 16 }, // Status
    { wch: 18 }, // Funding Source
    { wch: 16 }, // Project Code
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Plan_${plan.reference}_Activities_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports single project details and its plans to Excel.
 */
export function exportProjectDetailsToExcel(project: OfficerProject) {
  const overviewSheetData = [
    { Field: "Project Name", Value: project.name },
    { Field: "Project Code", Value: project.code },
    { Field: "Short Name", Value: project.shortName || "" },
    { Field: "Status", Value: project.status },
    {
      Field: "Country / Organization",
      Value: project.countryOrganisation || "",
    },
    { Field: "Executing Agency", Value: project.executingAgency || "" },
    { Field: "Funding Source", Value: project.fundingSource || "" },
    { Field: "Funding Type", Value: project.fundingType || "" },
    { Field: "Organization / Region", Value: project.organizationRegion || "" },
    { Field: "Base Currency", Value: project.baseCurrency || "" },
    {
      Field: "Assigned Officers",
      Value: project.assignedOfficers?.filter(Boolean).join(", ") || "",
    },
    {
      Field: "SAP Identification",
      Value: project.sapIdentificationNumber || "",
    },
    { Field: "Total Active Plans", Value: project.activePlans },
  ];

  const plansSheetData = project.plans.map((p) => ({
    "Plan Reference": p.reference,
    "Plan Name": p.name,
    "Fiscal Year": p.budgetYear,
    Category: p.category,
    "Total Activities": p.activities,
    Status: p.status,
    "Estimated Value": p.estimatedValue || 0,
    Currency: p.currency || project.baseCurrency,
    "Organization / Region": p.organizationRegion || "",
  }));

  const workbook = XLSX.utils.book_new();

  const overviewWorksheet = XLSX.utils.json_to_sheet(overviewSheetData);
  overviewWorksheet["!cols"] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, overviewWorksheet, "Project Overview");

  const plansWorksheet = XLSX.utils.json_to_sheet(plansSheetData);
  plansWorksheet["!cols"] = [
    { wch: 22 },
    { wch: 40 },
    { wch: 14 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 10 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(workbook, plansWorksheet, "Procurement Plans");

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Project_${project.code}_Details_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports all assigned projects and their plans for an officer.
 */
export function exportOfficerProjectsToExcel(projects: OfficerProject[]) {
  const projectsSheetData = projects.map((p) => ({
    "Project Code": p.code,
    "Project Name": p.name,
    "Short Name": p.shortName || "",
    Status: p.status,
    "Executing Agency": p.executingAgency || "",
    "Funding Source": p.fundingSource || "",
    "Funding Type": p.fundingType || "",
    "Organization / Region": p.organizationRegion || "",
    "Active Plans Count": p.activePlans,
    "Assigned Officers": p.assignedOfficers?.filter(Boolean).join(", ") || "",
  }));

  const plansSheetData: any[] = [];
  projects.forEach((p) => {
    p.plans.forEach((plan) => {
      plansSheetData.push({
        "Project Code": p.code,
        "Project Name": p.name,
        "Plan Reference": plan.reference,
        "Plan Name": plan.name,
        "Fiscal Year": plan.budgetYear,
        Category: plan.category,
        Activities: plan.activities,
        Status: plan.status,
        "Estimated Value": plan.estimatedValue || 0,
      });
    });
  });

  const workbook = XLSX.utils.book_new();

  const projWorksheet = XLSX.utils.json_to_sheet(projectsSheetData);
  projWorksheet["!cols"] = [
    { wch: 16 },
    { wch: 45 },
    { wch: 15 },
    { wch: 12 },
    { wch: 30 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(workbook, projWorksheet, "Assigned Projects");

  if (plansSheetData.length > 0) {
    const plansWorksheet = XLSX.utils.json_to_sheet(plansSheetData);
    plansWorksheet["!cols"] = [
      { wch: 16 },
      { wch: 35 },
      { wch: 22 },
      { wch: 35 },
      { wch: 14 },
      { wch: 22 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      plansWorksheet,
      "All Procurement Plans",
    );
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Officer_Assigned_Projects_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Downloads a pre-formatted Excel template for importing Procurement Plans.
 */
export function downloadPlanExcelTemplate(projectCode: string = "PRJ-24-001") {
  const templateData = [
    {
      "Project Code (Required)": projectCode,
      "Plan Title (Required)": "Annual Agricultural Inputs Procurement Plan",
      "Budget Year (Required)": "2018 EFY",
      "Category (Dropdown)": "Goods",
      Organization: "Federal / MoA",
      Description: "Procurement plan for agricultural supplies and machinery",
      "Period Start (Required)": "2025-07-08",
      "Period End (Required)": "2026-07-07",
      "Status (Dropdown)": "Draft",
    },
    {
      "Project Code (Required)": projectCode,
      "Plan Title (Required)":
        "Regional Irrigation Infrastructure Development Plan",
      "Budget Year (Required)": "2018 EFY",
      "Category (Dropdown)": "Works",
      Organization: "Oromia Regional Bureau",
      Description: "Civil works and canal construction for smallholder farmers",
      "Period Start (Required)": "2025-07-08",
      "Period End (Required)": "2026-07-07",
      "Status (Dropdown)": "Draft",
    },
    {
      "Project Code (Required)": projectCode,
      "Plan Title (Required)": "Advisory and Technical Capacity Building Plan",
      "Budget Year (Required)": "2018 EFY",
      "Category (Dropdown)": "Consultancy Services",
      Organization: "Federal / FPCU",
      Description: "Technical consultancy for project baseline evaluation",
      "Period Start (Required)": "2025-07-08",
      "Period End (Required)": "2026-07-07",
      "Status (Dropdown)": "Draft",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const colWidths = [
    { wch: 22 }, // Project Code
    { wch: 45 }, // Plan Title
    { wch: 18 }, // Budget Year
    { wch: 22 }, // Category
    { wch: 25 }, // Organization
    { wch: 50 }, // Description
    { wch: 18 }, // Period Start
    { wch: 18 }, // Period End
    { wch: 16 }, // Status
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Plan Template");
  XLSX.writeFile(workbook, "Procurement_Plan_Import_Template.xlsx");
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV file containing Procurement Plans.
 */
export async function parsePlansFromExcel(
  file: File,
  defaultProjectCode?: string,
): Promise<ParsedPlansResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Excel file contains no worksheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  });

  if (rawRows.length === 0) {
    throw new Error("No data rows found in the selected Excel sheet.");
  }

  // Validate template header structure
  const headerKeys = Object.keys(rawRows[0] || {});
  const normalizedHeaders = headerKeys.map((h) => normalizeHeader(h));
  const hasPlanTitle = normalizedHeaders.some(
    (h) => h.includes("plantitle") || h === "title" || h.includes("planname"),
  );
  const hasBudgetYear = normalizedHeaders.some(
    (h) => h.includes("budgetyear") || h.includes("fiscalyear") || h === "year",
  );

  if (!hasPlanTitle || !hasBudgetYear) {
    const missingCols: string[] = [];
    if (!hasPlanTitle) missingCols.push("Plan Title");
    if (!hasBudgetYear) missingCols.push("Budget Year");
    throw new Error(
      `Invalid template structure: The uploaded file does not follow the Procurement Plan template structure. Missing required columns: [${missingCols.join(
        ", ",
      )}]. Found columns: [${headerKeys.join(
        ", ",
      )}]. Please download and use the official template.`,
    );
  }

  const parsedRows: ParsedPlanRow[] = [];
  const validPlans: ProcurementPlanSummary[] = [];

  rawRows.forEach((row, idx) => {
    const rawProjectCode = getColumnValue(row, [
      "Project Code (Required)",
      "Project Code",
      "Project",
      "Code",
    ]);
    const rawTitle = getColumnValue(row, [
      "Plan Title (Required)",
      "Plan Title",
      "Title",
      "Plan Name",
      "Name",
    ]);
    const rawBudgetYear = getColumnValue(row, [
      "Budget Year (Required)",
      "Budget Year",
      "Fiscal Year",
      "Year",
    ]);
    const rawCategory = getColumnValue(row, [
      "Category (Dropdown)",
      "Category",
      "Procurement Category",
      "Type",
    ]);
    const rawOrg = getColumnValue(row, [
      "Organization",
      "Organization / Region",
      "Region",
      "Executing Unit",
    ]);
    const rawDesc = getColumnValue(row, [
      "Description",
      "Plan Description",
      "Scope",
      "Remarks",
    ]);
    const rawPeriodStart = getColumnValue(row, [
      "Period Start (Required)",
      "Period Start",
      "Start Date",
      "From",
    ]);
    const rawPeriodEnd = getColumnValue(row, [
      "Period End (Required)",
      "Period End",
      "End Date",
      "To",
    ]);
    const rawStatus = getColumnValue(row, [
      "Status (Dropdown)",
      "Status",
      "Plan Status",
      "State",
    ]);

    const name = String(rawTitle || "").trim();
    let budgetYear = String(rawBudgetYear || "").trim();
    if (
      budgetYear &&
      !budgetYear.toUpperCase().includes("EFY") &&
      !budgetYear.toUpperCase().includes("FY")
    ) {
      budgetYear = `${budgetYear} EFY`;
    }

    let isValid = true;
    let validationError = "";

    if (!name) {
      isValid = false;
      validationError = "Missing plan title";
    } else if (!budgetYear) {
      isValid = false;
      validationError = "Missing budget year";
    }

    // Normalize category
    let category: ProcurementCategory = "Goods";
    const catStr = String(rawCategory || "").toLowerCase();
    if (catStr.includes("work")) category = "Works";
    else if (catStr.includes("non-consult") || catStr.includes("non consult"))
      category = "Non-Consulting Services";
    else if (catStr.includes("consult")) category = "Consultancy Services";
    else if (catStr.includes("good")) category = "Goods";

    // Normalize status
    let status: any = "Draft";
    const statusStr = String(rawStatus || "").toLowerCase();
    if (statusStr.includes("approve")) status = "Finally Approved";
    else if (statusStr.includes("committee")) status = "Committee Review";
    else if (statusStr.includes("submit") || statusStr.includes("director"))
      status = "Submitted to Director";
    else if (statusStr.includes("reject") || statusStr.includes("return"))
      status = "Returned";
    else if (statusStr.includes("draft")) status = "Draft";

    const organizationRegion = String(rawOrg || "Federal / FPCU").trim();
    const description = rawDesc ? String(rawDesc).trim() : undefined;
    const reference = `PLAN-${Date.now().toString(36).toUpperCase()}-${idx + 1}`;

    const periodStart = rawPeriodStart
      ? String(rawPeriodStart).trim()
      : "2025-07-08";
    const periodEnd = rawPeriodEnd ? String(rawPeriodEnd).trim() : "2026-07-07";

    if (periodStart && periodEnd && periodEnd < periodStart) {
      isValid = false;
      validationError = "Period End cannot be before Period Start";
    }

    const parsedRow: ParsedPlanRow = {
      name,
      reference,
      budgetYear: budgetYear || "2018 EFY",
      category,
      organizationRegion,
      description,
      isValid,
      validationError: validationError || undefined,
    };

    parsedRows.push(parsedRow);

    const ethStart = gregorianToEthiopian(periodStart);
    const ethEnd = gregorianToEthiopian(periodEnd);
    const fromEth = ethStart ? formatEthiopianDate(ethStart) : "";
    const toEth = ethEnd ? formatEthiopianDate(ethEnd) : "";

    if (isValid) {
      validPlans.push({
        reference,
        name,
        budgetYear: budgetYear || "2018 EFY",
        category,
        activities: 0,
        completedActivities: 0,
        inProgressActivities: 0,
        delayedActivities: 0,
        status,
        estimatedValue: 0,
        currency: "ETB",
        organizationRegion,
        description,
        planPeriod: {
          from: { gregorian: periodStart, ethiopian: fromEth },
          to: { gregorian: periodEnd, ethiopian: toEth },
        },
        planActivities: [],
      });
    }
  });

  return {
    plans: validPlans,
    rows: parsedRows,
    totalRows: parsedRows.length,
    validCount: validPlans.length,
    invalidCount: parsedRows.length - validPlans.length,
    fileName: file.name,
  };
}

/**
 * Exports procurement plans for a single project.
 */
export function exportProjectPlansToExcel(project: OfficerProject) {
  const rows = project.plans.map((p) => ({
    "Project Code": project.code,
    "Plan Title": p.name,
    "Budget Year": p.budgetYear,
    Category: p.category,
    Organization:
      p.organizationRegion || project.organizationRegion || "Federal / FPCU",
    Description: p.description || "",
    "Period Start": p.planPeriod?.from?.gregorian || "2025-07-08",
    "Period End": p.planPeriod?.to?.gregorian || "2026-07-07",
    Status: p.status,
    "Plan Reference": p.reference,
    "Total Activities": p.activities,
    "Estimated Value": p.estimatedValue || 0,
    Currency: p.currency || project.baseCurrency || "ETB",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 18 }, // Project Code
    { wch: 40 }, // Plan Title
    { wch: 16 }, // Budget Year
    { wch: 22 }, // Category
    { wch: 25 }, // Organization
    { wch: 45 }, // Description
    { wch: 16 }, // Period Start
    { wch: 16 }, // Period End
    { wch: 16 }, // Status
    { wch: 22 }, // Plan Reference
    { wch: 16 }, // Total Activities
    { wch: 18 }, // Estimated Value
    { wch: 10 }, // Currency
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Procurement Plans");

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Project_${project.code}_Plans_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export interface ParsedProjectRow {
  rowNumber: number;
  code: string;
  name: string;
  sapNumber?: string;
  country?: string;
  executingAgency?: string;
  organization?: string;
  fundingSourceCode: string;
  fundingType?: string;
  sectorCode: string;
  status: string;
  isValid: boolean;
  validationError?: string;
}

export interface ParsedProjectsResult {
  rows: ParsedProjectRow[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  fileName: string;
}

export const CANONICAL_PROJECT_HEADERS = [
  "Project Code",
  "Project Name",
  "SAP Identification No",
  "Country",
  "Executing Agency",
  "Organization",
  "Funding Source ID",
  "Funding Type",
  "Sector ID",
  "Status",
] as const;

/**
 * Downloads a pre-formatted Excel template for importing Projects.
 */
export async function downloadProjectExcelTemplate(): Promise<void> {
  try {
    const { downloadProjectsTemplate } = await import("@/lib/projectsApi");
    await downloadProjectsTemplate();
  } catch {
    // Client-side fallback generation
    const sampleData = [
      {
        "Project Code (Required)": "MOA-AGP2",
        "Project Name (Required)":
          "Second Agricultural Growth Program (AGP-II)",
        "SAP Identification No": "SAP-100245",
        Country: "Ethiopia",
        "Executing Agency": "Ministry of Agriculture (MoA)",
        Organization: "Federal / FPCU",
        "Funding Source ID (Dropdown)": "World Bank (WB)",
        "Funding Type": "Loan / Grant",
        "Sector ID (Dropdown)": "Agriculture & Crop Production",
        "Status (Dropdown)": "Draft",
      },
      {
        "Project Code (Required)": "MOA-LLRP",
        "Project Name (Required)":
          "Lowlands Livelihood Resilience Project (LLRP)",
        "SAP Identification No": "SAP-100246",
        Country: "Ethiopia",
        "Executing Agency": "Ministry of Agriculture (MoA)",
        Organization: "Somali",
        "Funding Source ID (Dropdown)": "World Bank (WB)",
        "Funding Type": "Credit",
        "Sector ID (Dropdown)": "Livestock & Fishery",
        "Status (Dropdown)": "Draft",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet["!cols"] = [
      { wch: 24 }, // Project Code
      { wch: 45 }, // Project Name
      { wch: 22 }, // SAP ID
      { wch: 16 }, // Country
      { wch: 30 }, // Executing Agency
      { wch: 20 }, // Organization
      { wch: 26 }, // Funding Source ID
      { wch: 18 }, // Funding Type
      { wch: 22 }, // Sector ID
      { wch: 18 }, // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Projects Upload");
    XLSX.writeFile(workbook, "Projects_Import_Template.xlsx");
  }
}

/**
 * Parses and validates an Excel or CSV file containing Projects against official template structure and data rules.
 */
export async function parseProjectsFromExcel(
  file: File,
): Promise<ParsedProjectsResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Excel file contains no worksheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  });

  if (rawRows.length === 0) {
    throw new Error("No data rows found in the selected Excel sheet.");
  }

  // Validate template header structure
  const headerKeys = Object.keys(rawRows[0] || {});
  const normalizedHeaders = headerKeys.map((h) => normalizeHeader(h));

  const hasCode = normalizedHeaders.some(
    (h) => h.includes("projectcode") || h === "code",
  );
  const hasName = normalizedHeaders.some(
    (h) => h.includes("projectname") || h === "name",
  );
  const hasFundingSource = normalizedHeaders.some(
    (h) =>
      h.includes("fundingsource") ||
      h.includes("fundingsourceid") ||
      h.includes("donor"),
  );
  const hasSector = normalizedHeaders.some(
    (h) => h.includes("sector") || h.includes("sectorid"),
  );

  if (!hasCode || !hasName || !hasFundingSource || !hasSector) {
    const missingCols: string[] = [];
    if (!hasCode) missingCols.push("Project Code (Required)");
    if (!hasName) missingCols.push("Project Name (Required)");
    if (!hasFundingSource) missingCols.push("Funding Source ID (Dropdown)");
    if (!hasSector) missingCols.push("Sector ID (Dropdown)");
    throw new Error(
      `Invalid template structure: The uploaded file does not follow the Project template structure. Missing required columns: [${missingCols.join(
        ", ",
      )}]. Found columns: [${headerKeys.join(
        ", ",
      )}]. Please download and use the official template.`,
    );
  }

  const parsedRows: ParsedProjectRow[] = [];

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const code = String(
      getColumnValue(row, [
        "Project Code (Required)",
        "Project Code",
        "ProjectCode",
        "Code",
      ]) || "",
    ).trim();

    const name = String(
      getColumnValue(row, [
        "Project Name (Required)",
        "Project Name",
        "ProjectName",
        "Name",
      ]) || "",
    ).trim();

    const sapNumber = String(
      getColumnValue(row, [
        "SAP Identification No",
        "SAP Identification No.",
        "SAP ID",
        "SAP",
      ]) || "",
    ).trim();

    const country = String(
      getColumnValue(row, ["Country", "Country / Org", "CountryOrg"]) || "",
    ).trim();

    const executingAgency = String(
      getColumnValue(row, ["Executing Agency", "Agency"]) || "",
    ).trim();

    const organization = String(
      getColumnValue(row, ["Organization", "Region", "Org"]) || "",
    ).trim();

    const fundingSourceCode = String(
      getColumnValue(row, [
        "Funding Source ID (Dropdown)",
        "Funding Source ID",
        "Funding Source",
        "Donor",
      ]) || "",
    ).trim();

    const fundingType = String(
      getColumnValue(row, ["Funding Type", "Type"]) || "",
    ).trim();

    const sectorCode = String(
      getColumnValue(row, ["Sector ID (Dropdown)", "Sector ID", "Sector"]) ||
        "",
    ).trim();

    const status = String(
      getColumnValue(row, ["Status (Dropdown)", "Status"]) || "ACTIVE",
    ).trim();

    let isValid = true;
    let validationError: string | undefined;

    if (!code) {
      isValid = false;
      validationError = "Missing Project Code";
    } else if (!name) {
      isValid = false;
      validationError = "Missing Project Name";
    } else if (!fundingSourceCode) {
      isValid = false;
      validationError = "Missing Funding Source ID";
    } else if (!sectorCode) {
      isValid = false;
      validationError = "Missing Sector ID";
    }

    parsedRows.push({
      rowNumber,
      code,
      name,
      sapNumber: sapNumber || undefined,
      country: country || undefined,
      executingAgency: executingAgency || undefined,
      organization: organization || undefined,
      fundingSourceCode,
      fundingType: fundingType || undefined,
      sectorCode,
      status: status || "ACTIVE",
      isValid,
      validationError,
    });
  });

  const validCount = parsedRows.filter((r) => r.isValid).length;

  return {
    rows: parsedRows,
    totalRows: parsedRows.length,
    validCount,
    invalidCount: parsedRows.length - validCount,
    fileName: file.name,
  };
}
