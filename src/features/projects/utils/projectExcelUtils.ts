import * as XLSX from "xlsx";
import type {
  OfficerProject,
  ProcurementPlanSummary,
} from "../data/officerProjects";
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
export function downloadActivityExcelTemplate() {
  const templateData = [
    {
      "Activity Reference": "ET-MoA-001-GO-RFQ",
      Description: "Procurement of Agricultural Laboratory Equipment",
      Category: "Goods",
      Method: "RFQ / Shopping",
      "Estimated Amount": 1500000,
      Currency: "ETB",
      "Current Stage": "Draft Request for Quotations",
      Status: "Not Started",
      "Funding Source": "World Bank",
      "Market Approach": "Open National",
      "Review Type": "Post Review",
    },
    {
      "Activity Reference": "ET-MoA-002-CW-RFB",
      Description: "Construction of Regional Seed Testing Center",
      Category: "Works",
      Method: "RFB National",
      "Estimated Amount": 12000000,
      Currency: "ETB",
      "Current Stage": "Preparation of Bidding Documents",
      Status: "Not Started",
      "Funding Source": "Government",
      "Market Approach": "Open National",
      "Review Type": "Prior Review",
    },
    {
      "Activity Reference": "ET-MoA-003-CS-QCBS",
      Description: "Consultancy Services for Environmental Impact Assessment",
      Category: "Consultancy Services",
      Method: "QCBS",
      "Estimated Amount": 3500000,
      Currency: "ETB",
      "Current Stage": "Draft Terms of Reference",
      Status: "In Progress",
      "Funding Source": "World Bank",
      "Market Approach": "Open International",
      "Review Type": "Prior Review",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const colWidths = [
    { wch: 22 }, // Reference
    { wch: 45 }, // Description
    { wch: 22 }, // Category
    { wch: 20 }, // Method
    { wch: 18 }, // Amount
    { wch: 10 }, // Currency
    { wch: 32 }, // Stage
    { wch: 15 }, // Status
    { wch: 18 }, // Funding Source
    { wch: 20 }, // Market Approach
    { wch: 15 }, // Review Type
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Template");
  XLSX.writeFile(workbook, "Procurement_Activity_Import_Template.xlsx");
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV file containing Procurement Activities.
 */
export async function parseActivitiesFromExcel(
  file: File,
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

  const parsedRows: ParsedActivityRow[] = [];
  const validActivities: ProcurementActivitySummary[] = [];

  rawRows.forEach((row, idx) => {
    const rawRef = getColumnValue(row, [
      "Activity Reference",
      "Reference",
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
      "Category",
      "Procurement Category",
      "Type",
    ]);
    const rawMethod = getColumnValue(row, [
      "Method",
      "Procurement Method",
      "Specific Method",
    ]);
    const rawAmount = getColumnValue(row, [
      "Estimated Amount",
      "Amount",
      "Budget",
      "Estimated Budget",
      "Cost",
    ]);
    const rawCurrency = getColumnValue(row, ["Currency", "Base Currency"]);
    const rawStage = getColumnValue(row, [
      "Current Stage",
      "Stage",
      "Procurement Stage",
      "Active Stage",
    ]);
    const rawStatus = getColumnValue(row, [
      "Status",
      "Activity Status",
      "State",
    ]);
    const rawFunding = getColumnValue(row, ["Funding Source", "Funding"]);
    const rawMarket = getColumnValue(row, ["Market Approach", "Approach"]);
    const rawReview = getColumnValue(row, ["Review Type", "Review"]);

    const description = String(rawDesc || "").trim();
    const reference = String(
      rawRef || `IMP-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
    ).trim();

    let isValid = true;
    let validationError = "";

    if (!description) {
      isValid = false;
      validationError = "Missing activity description";
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
 * Exports plan activities to a formatted Excel file.
 */
export function exportPlanActivitiesToExcel(
  plan: ProcurementPlanSummary,
  activities: ProcurementActivitySummary[],
  projectCode: string,
) {
  const sheetName = (plan.name || "Activities").slice(0, 31);
  const rows = activities.map((a) => ({
    "Project Code": projectCode,
    "Plan Reference": plan.reference,
    "Activity Reference": a.reference,
    Description: a.description,
    Category: a.category,
    Method: a.method,
    "Estimated Amount": a.estimatedAmount,
    Currency: a.details?.form?.currency || plan.currency || "ETB",
    "Current Stage": a.currentStage,
    Status: a.status,
    "Funding Source": a.details?.form?.fundingSource || "",
    "Market Approach": a.details?.form?.marketApproach || "",
    "Review Type": a.details?.form?.reviewType || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const colWidths = [
    { wch: 16 }, // Project Code
    { wch: 22 }, // Plan Reference
    { wch: 24 }, // Activity Reference
    { wch: 45 }, // Description
    { wch: 22 }, // Category
    { wch: 20 }, // Method
    { wch: 18 }, // Estimated Amount
    { wch: 10 }, // Currency
    { wch: 30 }, // Current Stage
    { wch: 16 }, // Status
    { wch: 18 }, // Funding Source
    { wch: 18 }, // Market Approach
    { wch: 14 }, // Review Type
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
