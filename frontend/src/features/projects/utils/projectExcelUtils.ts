import * as XLSX from "xlsx";
import type {
  ProcurementActivityStatus,
  ProcurementActivitySummary,
} from "../data/officerActivityDrafts";
import type {
  OfficerProject,
  ProcurementCategory,
  ProcurementPlanSummary,
} from "../data/officerProjects";
import { formatEthiopianDate, gregorianToEthiopian } from "./ethiopianCalendar";
import { roadmapForMethod } from "../data/procurementActivityConfig";

export interface ParsedActivityRow {
  reference: string;
  planId?: string;
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
  projectCode?: string;
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
 * Safely parses any date value from Excel, strings, or numbers into an ISO YYYY-MM-DD string.
 */
export function parseExcelDateToIso(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? "" : val.toISOString().slice(0, 10);
  }
  if (typeof val === "number") {
    if (isNaN(val) || val <= 0) return "";
    // Excel date serial number to Gregorian date (days since 1899-12-30)
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (!str) return "";

  // 1. Numeric string (Excel serial date stored as string, e.g. "45846" or "45846.125")
  if (/^\d{4,6}(?:\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  // 2. ISO date format YYYY-MM-DD (with optional timestamp or space)
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(str);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(str);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 4. Named month format (e.g. 04-Oct-2025, 4 October 2025)
  const namedMatch = /^(\d{1,2})[-/ ]([A-Za-z]+)[-/ ](\d{4})/.exec(str);
  if (namedMatch) {
    const d = namedMatch[1].padStart(2, "0");
    const mStr = namedMatch[2].toLowerCase();
    const y = namedMatch[3];
    const months = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    const mIndex = months.findIndex((m) => mStr.startsWith(m));
    if (mIndex !== -1) {
      const m = String(mIndex + 1).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // 5. Fallback native Date parse
  const d = new Date(str);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/**
 * Normalizes string keys by trimming, removing parenthetical qualifiers, special characters, and converting to lowercase.
 */
function normalizeHeader(header: string): string {
  return String(header || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Flexible column matching against known aliases.
 */
function getColumnValue(row: Record<string, any>, aliases: string[]): any {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const rawNormalizedAlias = String(alias || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const cleanNormalizedAlias = normalizeHeader(alias);
    const foundKey = keys.find((k) => {
      const rawK = String(k || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const cleanK = normalizeHeader(k);
      return (
        rawK === rawNormalizedAlias ||
        cleanK === cleanNormalizedAlias ||
        cleanK === rawNormalizedAlias ||
        rawK === cleanNormalizedAlias
      );
    });
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      return row[foundKey];
    }
  }

  // Substring fallback match for robust tolerance
  for (const alias of aliases) {
    const cleanNormalizedAlias = normalizeHeader(alias);
    if (cleanNormalizedAlias.length >= 4) {
      const foundKey = keys.find((k) => {
        const cleanK = normalizeHeader(k);
        return (
          cleanK.includes(cleanNormalizedAlias) ||
          cleanNormalizedAlias.includes(cleanK)
        );
      });
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
        return row[foundKey];
      }
    }
  }

  return undefined;
}

/**
 * Downloads a pre-formatted Excel template for importing Procurement Activities.
 */
export function downloadActivityExcelTemplate(
  _planRef: string = "PLAN-2018-01",
) {
  const headers = [
    "Plan ID or Title (Required)",
    "Activity Reference (Required)",
    "Activity Description (Required)",
    "Category (Required - Dropdown)",
    "Method ID (Required - Dropdown)",
    "Estimated Budget (ETB) (Required)",
    "Currency (Optional - Dropdown)",
    "Market Approach (Optional - Dropdown)",
    "Review Type (Optional - Dropdown)",
    "Contract Type (Optional - Dropdown)",
    "Domestic Preference (Optional - Dropdown)",
    "Location (Optional)",
    "Lot Required (Optional - Dropdown)",
    "Planned Start Date (Optional - YYYY-MM-DD)",
    "Planned End Date (Optional - YYYY-MM-DD)",
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  worksheet["!cols"] = [
    { wch: 28 }, // Plan ID or Title
    { wch: 28 }, // Activity Reference
    { wch: 55 }, // Activity Description
    { wch: 25 }, // Category
    { wch: 25 }, // Method ID
    { wch: 28 }, // Estimated Budget
    { wch: 22 }, // Currency
    { wch: 28 }, // Market Approach
    { wch: 24 }, // Review Type
    { wch: 24 }, // Contract Type
    { wch: 28 }, // Domestic Preference
    { wch: 26 }, // Location
    { wch: 22 }, // Lot Required
    { wch: 28 }, // Planned Start Date
    { wch: 28 }, // Planned End Date
  ];

  const guideRows = [
    {
      "Field Name": "Plan ID or Title (Required)",
      Requirement: "Mandatory",
      "Data Type": "Text",
      "Allowed Values / Options": "Plan Reference, UUID, or exact Plan Title",
      "Description & Business Rules":
        "Identifies the parent procurement plan. Pre-filled with active plan reference.",
    },
    {
      "Field Name": "Activity Reference (Required)",
      Requirement: "Mandatory",
      "Data Type": "Text",
      "Allowed Values / Options": "e.g. ET-MoA-001-GO-RFQ",
      "Description & Business Rules":
        "Must be unique across all activities in the procurement tracking system.",
    },
    {
      "Field Name": "Activity Description (Required)",
      Requirement: "Mandatory",
      "Data Type": "Text",
      "Allowed Values / Options": "Free text (clear procurement description)",
      "Description & Business Rules":
        "Detailed specification of the goods, works, or consulting assignment.",
    },
    {
      "Field Name": "Category (Required - Dropdown)",
      Requirement: "Mandatory",
      "Data Type": "Dropdown",
      "Allowed Values / Options":
        "Goods, Works, Consultancy Services, Non-Consulting Services",
      "Description & Business Rules":
        "High-level procurement classification standard.",
    },
    {
      "Field Name": "Method ID (Required - Dropdown)",
      Requirement: "Mandatory",
      "Data Type": "Dropdown",
      "Allowed Values / Options":
        "RFQ, RFB National, RFB International, QCBS, FBS, LCS, QBS, CQS, Direct Contracting",
      "Description & Business Rules":
        "Procurement method code governing competition and evaluation procedures.",
    },
    {
      "Field Name": "Estimated Budget (ETB) (Required)",
      Requirement: "Mandatory",
      "Data Type": "Decimal / Number",
      "Allowed Values / Options": "Non-negative numeric amount (>= 0)",
      "Description & Business Rules":
        "Planned financial allocation for this specific activity.",
    },
    {
      "Field Name": "Currency (Optional - Dropdown)",
      Requirement: "Optional",
      "Data Type": "Dropdown",
      "Allowed Values / Options": "ETB, USD, EUR (Default: ETB)",
      "Description & Business Rules":
        "Currency used for budgeting and financial monitoring.",
    },
    {
      "Field Name": "Market Approach (Optional - Dropdown)",
      Requirement: "Optional",
      "Data Type": "Dropdown",
      "Allowed Values / Options":
        "Open National, Open International, Limited, Direct",
      "Description & Business Rules":
        "Geographic scope and market openness for bidding.",
    },
    {
      "Field Name": "Review Type (Optional - Dropdown)",
      Requirement: "Optional",
      "Data Type": "Dropdown",
      "Allowed Values / Options": "Post Review, Prior Review",
      "Description & Business Rules":
        "Determines if oversight approval is needed prior to contract award.",
    },
    {
      "Field Name": "Contract Type (Optional - Dropdown)",
      Requirement: "Optional",
      "Data Type": "Dropdown",
      "Allowed Values / Options": "Lump Sum, Time Based",
      "Description & Business Rules":
        "Remuneration structure for the resulting contract.",
    },
    {
      "Field Name": "Domestic Preference (Optional - Dropdown)",
      Requirement: "Optional",
      "Data Type": "Dropdown",
      "Allowed Values / Options": "No, Yes",
      "Description & Business Rules":
        "Applies domestic preference evaluation margin where eligible.",
    },
    {
      "Field Name": "Location (Optional)",
      Requirement: "Optional",
      "Data Type": "Text",
      "Allowed Values / Options":
        "e.g. Addis Ababa, Oromia, Amhara, Tigray, Somali, Sidama",
      "Description & Business Rules":
        "Physical project implementation site or delivery destination.",
    },
    {
      "Field Name": "Lot Required (Optional - Dropdown)",
      Requirement: "Optional",
      "Data Type": "Dropdown",
      "Allowed Values / Options": "No, Yes",
      "Description & Business Rules":
        "Indicates if procurement will be split into multiple lots.",
    },
    {
      "Field Name": "Planned Start Date (Optional - YYYY-MM-DD)",
      Requirement: "Optional",
      "Data Type": "Date (ISO)",
      "Allowed Values / Options": "YYYY-MM-DD (e.g. 2025-08-01)",
      "Description & Business Rules":
        "Target date to begin bidding document preparation.",
    },
    {
      "Field Name": "Planned End Date (Optional - YYYY-MM-DD)",
      Requirement: "Optional",
      "Data Type": "Date (ISO)",
      "Allowed Values / Options": "YYYY-MM-DD (e.g. 2026-06-30)",
      "Description & Business Rules":
        "Target completion or goods delivery date.",
    },
  ];

  const guideWorksheet = XLSX.utils.json_to_sheet(guideRows);
  guideWorksheet["!cols"] = [
    { wch: 32 },
    { wch: 16 },
    { wch: 20 },
    { wch: 38 },
    { wch: 65 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Activities Upload");
  XLSX.utils.book_append_sheet(
    workbook,
    guideWorksheet,
    "Instructions & Field Guide",
  );
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
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
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
      "Market Approach (Optional - Dropdown)",
      "Market Approach (Dropdown)",
      "Market Approach",
      "Approach",
    ]);
    const rawReview = getColumnValue(row, [
      "Review Type (Optional - Dropdown)",
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
    const rawFunding = getColumnValue(row, [
      "Funding Source",
      "Funding",
      "Funding Source (Optional)",
    ]);
    const rawSpecificMethod = getColumnValue(row, [
      "Specific Method",
      "Specific Procurement Method",
      "Method Detail",
    ]);
    const rawContractType = getColumnValue(row, [
      "Contract Type (Optional - Dropdown)",
      "Contract Type (Dropdown)",
      "Contract Type",
    ]);
    const rawDomesticPref = getColumnValue(row, [
      "Domestic Preference (Optional - Dropdown)",
      "Domestic Preference (Dropdown)",
      "Domestic Preference",
    ]);
    const rawLocation = getColumnValue(row, [
      "Location (Optional)",
      "Location",
      "Location / Region",
      "Region",
    ]);
    const rawLotRequired = getColumnValue(row, [
      "Lot Required (Optional - Dropdown)",
      "Lot Required (Dropdown)",
      "Lot Required",
    ]);
    const rawPlannedStart = getColumnValue(row, [
      "Planned Start Date (Optional - YYYY-MM-DD)",
      "Planned Start Date",
      "Planned Start",
      "Start Date",
    ]);
    const rawPlannedEnd = getColumnValue(row, [
      "Planned End Date (Optional - YYYY-MM-DD)",
      "Planned End Date",
      "Planned End",
      "End Date",
    ]);
    const plannedStart = parseExcelDateToIso(rawPlannedStart);
    const plannedEnd = parseExcelDateToIso(rawPlannedEnd);

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
    const contractType =
      rawContractType && String(rawContractType).toLowerCase().includes("time")
        ? "Time Based"
        : "Lump Sum";
    const domesticPreference =
      rawDomesticPref && String(rawDomesticPref).toLowerCase().includes("yes")
        ? "Yes"
        : "No";
    const location = rawLocation ? String(rawLocation).trim() : "";
    const lotRequired = Boolean(
      rawLotRequired &&
      (String(rawLotRequired).toLowerCase().includes("yes") ||
        String(rawLotRequired).toLowerCase() === "true"),
    );

    const parsedRow: ParsedActivityRow = {
      reference,
      planId: rawPlanId ? String(rawPlanId).trim() : defaultPlanId,
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
      const methodStages = roadmapForMethod(method, category);
      const roadmapStages: any[] = methodStages.map((stage, sIdx) => {
        let greg = "";
        let eth = "";
        if (sIdx === 0 && plannedStart) {
          greg = plannedStart;
          const e = gregorianToEthiopian(plannedStart);
          if (e) eth = formatEthiopianDate(e);
        } else if (
          (sIdx === methodStages.length - 1 ||
            stage.name.toLowerCase().includes("award") ||
            stage.name.toLowerCase().includes("completion") ||
            stage.name.toLowerCase().includes("signature")) &&
          plannedEnd &&
          sIdx > 0
        ) {
          greg = plannedEnd;
          const e = gregorianToEthiopian(plannedEnd);
          if (e) eth = formatEthiopianDate(e);
        }

        return {
          name: stage.name,
          days: "14",
          gregorianDate: greg,
          plannedStartDate: greg || undefined,
          plannedEndDate: undefined,
          status: status === "Completed" ? "Completed" : "Not Started",
          notApplicable: false,
          allowNotApplicable: stage.allowNotApplicable ?? true,
          remarks: "",
          ethiopianDate: eth,
        };
      });

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
            contractType,
            currency,
            domesticPreference,
            estimatedAmount: String(estimatedAmount),
            evaluationOptionCode: "",
            fundingSource: fundingSource || "",
            highRiskCode: "",
            inProcess: false,
            invitationReference: "",
            latitude: "",
            location,
            longitude: "",
            lotRequired,
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
            specificMethod: String(rawSpecificMethod || "").trim(),
            subcomponent: "",
          },
          lots: [],
          roadmap: roadmapStages,
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
 * Formats multiple funding sources or single funding sources with allocation percentages if available.
 */
export function formatActivityFundingSources(
  activity: any,
  fallback: string = "",
): string {
  // 1. Check financingAllocations array
  const allocations =
    activity?.details?.financingAllocations ||
    activity?.financingAllocations ||
    activity?.details?.form?.financingAllocations;

  if (Array.isArray(allocations) && allocations.length > 0) {
    const valid = allocations.filter(
      (item: any) =>
        item &&
        item.selected !== false &&
        (item.source || item.label || item.id),
    );
    if (valid.length > 0) {
      return valid
        .map((item: any) => {
          const name = item.source || item.label || item.id;
          const pct = item.percent ? ` (${item.percent}%)` : "";
          return `${name}${pct}`;
        })
        .join(", ");
    }
  }

  // 2. Check fundings array (backend ActivityFunding structure)
  const fundings = activity?.fundings || activity?.details?.fundings;
  if (Array.isArray(fundings) && fundings.length > 0) {
    return fundings
      .map((f: any) => {
        const name = f.fundingSource || f.label || f.name || "Financing";
        const pct = f.allocationPct != null ? ` (${f.allocationPct}%)` : "";
        return `${name}${pct}`;
      })
      .join(", ");
  }

  // 3. Check scalar fundingSource field
  if (activity?.details?.form?.fundingSource) {
    return String(activity.details.form.fundingSource).trim();
  }
  if (activity?.fundingSource) {
    return String(activity.fundingSource).trim();
  }

  return fallback;
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
  const rows = activities.map((a) => {
    const roadmap = a.details?.roadmap || [];
    const firstStage = roadmap.find(
      (s) => s.plannedStartDate || s.gregorianDate,
    );
    const lastStage = [...roadmap]
      .reverse()
      .find((s) => s.plannedEndDate || s.gregorianDate);
    const completedStage = [...roadmap]
      .reverse()
      .find((s) => s.actualEndDate || s.actualDate);

    return {
      "Plan ID": plan.id || plan.reference,
      "Plan Reference": plan.reference,
      "Plan Title": plan.name,
      "Project Code": projectCode,
      Reference: a.reference,
      Description: a.description,
      Category: a.category || plan.category || "",
      "Method ID": a.method || "",
      "Specific Method": a.details?.form?.specificMethod || "",
      "Estimated Budget": Number(a.estimatedAmount || 0),
      Currency: a.details?.form?.currency || a.currency || plan.currency || "",
      "Market Approach":
        a.details?.form?.marketApproach || (a as any).marketApproach || "",
      "Review Type": a.details?.form?.reviewType || (a as any).reviewType || "",
      "Contract Type":
        a.details?.form?.contractType || (a as any).contractType || "",
      "Procurement Process": a.details?.form?.procurementProcess || "",
      "Domestic Preference":
        a.details?.form?.domesticPreference ||
        (a as any).domesticPreference ||
        "",
      "Current Stage": a.currentStage || "",
      Status: a.status || "",
      "Funding Source": formatActivityFundingSources(
        a,
        plan.organizationRegion || "",
      ),
      Location: a.details?.form?.location || (a as any).location || "",
      "Lot Required": a.details?.form?.lotRequired ? "Yes" : "No",
      "Planned Start Date":
        firstStage?.plannedStartDate || firstStage?.gregorianDate || "",
      "Planned End Date":
        lastStage?.plannedEndDate || lastStage?.gregorianDate || "",
      "Actual Completion Date":
        completedStage?.actualEndDate || completedStage?.actualDate || "",
      "Remarks / Notes":
        a.details?.form?.comments || a.details?.form?.scopeNotes || "",
    };
  });

  const activityExportHeaders = [
    "Plan ID",
    "Plan Reference",
    "Plan Title",
    "Project Code",
    "Reference",
    "Description",
    "Category",
    "Method ID",
    "Specific Method",
    "Estimated Budget",
    "Currency",
    "Market Approach",
    "Review Type",
    "Contract Type",
    "Procurement Process",
    "Domestic Preference",
    "Current Stage",
    "Status",
    "Funding Source",
    "Location",
    "Lot Required",
    "Planned Start Date",
    "Planned End Date",
    "Actual Completion Date",
    "Remarks / Notes",
  ];

  const worksheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([activityExportHeaders]);

  worksheet["!cols"] = [
    { wch: 36 }, // Plan ID
    { wch: 22 }, // Plan Reference
    { wch: 40 }, // Plan Title
    { wch: 18 }, // Project Code
    { wch: 25 }, // Reference
    { wch: 45 }, // Description
    { wch: 20 }, // Category
    { wch: 20 }, // Method ID
    { wch: 22 }, // Specific Method
    { wch: 18 }, // Estimated Budget
    { wch: 10 }, // Currency
    { wch: 20 }, // Market Approach
    { wch: 16 }, // Review Type
    { wch: 16 }, // Contract Type
    { wch: 22 }, // Procurement Process
    { wch: 20 }, // Domestic Preference
    { wch: 30 }, // Current Stage
    { wch: 18 }, // Status
    { wch: 32 }, // Funding Source
    { wch: 20 }, // Location
    { wch: 14 }, // Lot Required
    { wch: 18 }, // Planned Start Date
    { wch: 18 }, // Planned End Date
    { wch: 22 }, // Actual Completion Date
    { wch: 35 }, // Remarks / Notes
  ];

  const planInfoData = [
    { Field: "Plan Title", Value: plan.name || "" },
    { Field: "Plan Reference", Value: plan.reference || "" },
    { Field: "Plan ID", Value: plan.id || plan.reference || "" },
    { Field: "Project Code", Value: projectCode || "" },
    { Field: "Budget Year / Fiscal Period", Value: plan.budgetYear || "" },
    { Field: "Procurement Category", Value: plan.category || "" },
    {
      Field: "Funding Sources Involved",
      Value:
        Array.from(
          new Set(
            activities
              .map((act) => formatActivityFundingSources(act))
              .filter(Boolean),
          ),
        ).join("; ") ||
        plan.organizationRegion ||
        "",
    },
    { Field: "Plan Status", Value: plan.status || "" },
    { Field: "Total Activities in Export", Value: activities.length },
    {
      Field: "Total Estimated Budget",
      Value: activities.reduce(
        (sum, a) => sum + (Number(a.estimatedAmount) || 0),
        0,
      ),
    },
    { Field: "Base Currency", Value: plan.currency || "" },
    {
      Field: "Organization / Region",
      Value: plan.organizationRegion || "",
    },
    {
      Field: "Period Start Date",
      Value: plan.planPeriod?.from?.gregorian || "",
    },
    {
      Field: "Period End Date",
      Value: plan.planPeriod?.to?.gregorian || "",
    },
    { Field: "Export Date", Value: new Date().toISOString().slice(0, 10) },
  ];
  const infoWorksheet = XLSX.utils.json_to_sheet(planInfoData);
  infoWorksheet["!cols"] = [{ wch: 28 }, { wch: 55 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.utils.book_append_sheet(workbook, infoWorksheet, "Plan Information");

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

  const plansSheetData = project.plans.map((p) => {
    const calculatedBudget =
      p.planActivities && p.planActivities.length > 0
        ? p.planActivities.reduce(
            (sum, a) => sum + (Number(a.estimatedAmount) || 0),
            0,
          )
        : p.estimatedValue || 0;

    return {
      "Plan Reference": p.reference,
      "Plan Name": p.name,
      "Fiscal Year": p.budgetYear,
      Category: p.category,
      "Total Activities":
        p.planActivities && p.planActivities.length > 0
          ? p.planActivities.length
          : p.activities,
      Status: p.status,
      "Estimated Value": calculatedBudget,
      Currency: p.currency || project.baseCurrency,
      "Organization / Region": p.organizationRegion || "",
    };
  });

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

  // Collect all activities across all plans in the project if available
  const allActivities: any[] = [];
  project.plans.forEach((p) => {
    if (p.planActivities && p.planActivities.length > 0) {
      p.planActivities.forEach((a) => {
        allActivities.push({
          "Project Code": project.code,
          "Plan Reference": p.reference || p.id || "",
          "Plan Title": p.name || "",
          Reference: a.reference || a.id || "",
          Description: a.description || "",
          Category: a.category || p.category || "",
          "Method ID": a.method || "",
          "Estimated Budget": Number(a.estimatedAmount || 0),
          Currency:
            a.details?.form?.currency ||
            a.currency ||
            p.currency ||
            project.baseCurrency ||
            "",
          "Market Approach":
            a.details?.form?.marketApproach || (a as any).marketApproach || "",
          "Review Type":
            a.details?.form?.reviewType || (a as any).reviewType || "",
          "Contract Type":
            a.details?.form?.contractType || (a as any).contractType || "",
          "Current Stage": a.currentStage || "",
          Status: a.status || "",
          Location: a.details?.form?.location || (a as any).location || "",
          "Funding Source": formatActivityFundingSources(
            a,
            project.fundingSource || p.organizationRegion || "",
          ),
        });
      });
    }
  });

  if (allActivities.length > 0) {
    const actWorksheet = XLSX.utils.json_to_sheet(allActivities);
    actWorksheet["!cols"] = [
      { wch: 16 },
      { wch: 20 },
      { wch: 35 },
      { wch: 22 },
      { wch: 40 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 10 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 28 },
      { wch: 16 },
      { wch: 20 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      actWorksheet,
      "Procurement Activities",
    );
  }

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
export function downloadPlanExcelTemplate(_projectCode: string = "PRJ-24-001") {
  const headers = [
    "Project Code (Required)",
    "Plan Title (Required)",
    "Budget Year (Required)",
    "Category (Required - Dropdown)",
    "Organization (Optional)",
    "Description (Optional)",
    "Period Start (Required - YYYY-MM-DD)",
    "Period End (Required - YYYY-MM-DD)",
    "Status (Optional - Dropdown)",
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  worksheet["!cols"] = [
    { wch: 24 }, // Project Code
    { wch: 50 }, // Plan Title
    { wch: 20 }, // Budget Year
    { wch: 26 }, // Category
    { wch: 32 }, // Organization
    { wch: 60 }, // Description
    { wch: 28 }, // Period Start
    { wch: 28 }, // Period End
    { wch: 24 }, // Status
  ];

  const guideRows = [
    {
      "Field Name": "Project Code (Required)",
      Requirement: "Mandatory",
      "Data Type": "Text",
      "Allowed Values / Options":
        "Valid Project Code (e.g. PRJ-24-001, MOA-AGP2)",
      "Description & Business Rules":
        "Must match an active, registered project in the procurement database.",
    },
    {
      "Field Name": "Plan Title (Required)",
      Requirement: "Mandatory",
      "Data Type": "Text",
      "Allowed Values / Options": "Free text (minimum 5 characters)",
      "Description & Business Rules":
        "The official title representing this annual or multi-year procurement plan.",
    },
    {
      "Field Name": "Budget Year (Required)",
      Requirement: "Mandatory",
      "Data Type": "Text",
      "Allowed Values / Options": "e.g. 2018 EFY, 2025/2026, 2017 EFY",
      "Description & Business Rules":
        "Fiscal budget year for government and donor accounting.",
    },
    {
      "Field Name": "Category (Required - Dropdown)",
      Requirement: "Mandatory",
      "Data Type": "Dropdown",
      "Allowed Values / Options":
        "Goods, Works, Consultancy Services, Non-Consulting Services",
      "Description & Business Rules":
        "Primary category of procurements contained within this plan.",
    },
    {
      "Field Name": "Organization (Optional)",
      Requirement: "Optional",
      "Data Type": "Text",
      "Allowed Values / Options":
        "e.g. Federal / MoA, Oromia Bureau, Amhara Bureau",
      "Description & Business Rules":
        "Implementing unit, regional bureau, or federal directorate.",
    },
    {
      "Field Name": "Description (Optional)",
      Requirement: "Optional",
      "Data Type": "Text",
      "Allowed Values / Options": "Free text",
      "Description & Business Rules":
        "High-level strategic narrative and objectives of this procurement plan.",
    },
    {
      "Field Name": "Period Start (Required - YYYY-MM-DD)",
      Requirement: "Mandatory",
      "Data Type": "Date (ISO)",
      "Allowed Values / Options": "YYYY-MM-DD (e.g. 2025-07-08)",
      "Description & Business Rules":
        "Fiscal period start date. Must not precede project start date.",
    },
    {
      "Field Name": "Period End (Required - YYYY-MM-DD)",
      Requirement: "Mandatory",
      "Data Type": "Date (ISO)",
      "Allowed Values / Options": "YYYY-MM-DD (e.g. 2026-07-07)",
      "Description & Business Rules":
        "Fiscal period end date. Must be after start date and not exceed project closing.",
    },
    {
      "Field Name": "Status (Optional - Dropdown)",
      Requirement: "Optional",
      "Data Type": "Dropdown",
      "Allowed Values / Options": "Draft, Submitted, Approved (Default: Draft)",
      "Description & Business Rules":
        "Initial status assigned to the plan upon importation.",
    },
  ];

  const guideWorksheet = XLSX.utils.json_to_sheet(guideRows);
  guideWorksheet["!cols"] = [
    { wch: 32 },
    { wch: 16 },
    { wch: 20 },
    { wch: 40 },
    { wch: 65 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Plans Upload");
  XLSX.utils.book_append_sheet(
    workbook,
    guideWorksheet,
    "Instructions & Field Guide",
  );
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
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
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
    const rawAwardDate = getColumnValue(row, [
      "Contract Award Date (Optional)",
      "Contract Award Date",
      "Award Date",
    ]);
    const rawGpnDate = getColumnValue(row, [
      "General Procurement Notice Date (Optional)",
      "General Procurement Notice Date",
      "GPN Date",
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

    const parsedStart = parseExcelDateToIso(rawPeriodStart);
    const parsedEnd = parseExcelDateToIso(rawPeriodEnd);
    const periodStart = parsedStart || "2025-07-08";
    const periodEnd = parsedEnd || "2026-07-07";
    const contractAwardDateGreg = parseExcelDateToIso(rawAwardDate);
    const gpnDateGreg = parseExcelDateToIso(rawGpnDate);

    if (periodStart && periodEnd && periodEnd < periodStart) {
      isValid = false;
      validationError = "Period End cannot be before Period Start";
    }

    const parsedRow: ParsedPlanRow = {
      name,
      reference,
      projectCode: rawProjectCode
        ? String(rawProjectCode).trim()
        : defaultProjectCode,
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
    const ethAward = contractAwardDateGreg
      ? gregorianToEthiopian(contractAwardDateGreg)
      : null;
    const ethGpn = gpnDateGreg ? gregorianToEthiopian(gpnDateGreg) : null;

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
        contractAwardDate: contractAwardDateGreg
          ? {
              gregorian: contractAwardDateGreg,
              ethiopian: ethAward ? formatEthiopianDate(ethAward) : "",
            }
          : undefined,
        generalProcurementNoticeDate: gpnDateGreg
          ? {
              gregorian: gpnDateGreg,
              ethiopian: ethGpn ? formatEthiopianDate(ethGpn) : "",
            }
          : undefined,
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
  const rows = project.plans.map((p) => {
    const calculatedBudget =
      p.planActivities && p.planActivities.length > 0
        ? p.planActivities.reduce(
            (sum, a) => sum + (Number(a.estimatedAmount) || 0),
            0,
          )
        : p.estimatedValue || 0;

    const fromGreg =
      p.planPeriod?.from?.gregorian ||
      (p as any).planPeriodFrom ||
      (p as any).periodStart ||
      "";
    const fromEthObj = fromGreg ? gregorianToEthiopian(fromGreg) : null;
    const fromEth =
      p.planPeriod?.from?.ethiopian ||
      (fromEthObj ? formatEthiopianDate(fromEthObj) : "") ||
      "";
    const toGreg =
      p.planPeriod?.to?.gregorian ||
      (p as any).planPeriodTo ||
      (p as any).periodEnd ||
      "";
    const toEthObj = toGreg ? gregorianToEthiopian(toGreg) : null;
    const toEth =
      p.planPeriod?.to?.ethiopian ||
      (toEthObj ? formatEthiopianDate(toEthObj) : "") ||
      "";

    return {
      "Project Code": project.code,
      "Project Name": project.name,
      "Plan Reference": p.reference || p.id || "",
      "Plan Title": p.name || (p as any).title || "",
      "Budget Year": p.budgetYear || "",
      Category: p.category || (p as any).procurementCategory || "",
      "Plan Type":
        p.planType ||
        (p.parentPlanId || p.parentPlanReference
          ? "Additional Plan"
          : "Annual Plan"),
      "Parent Plan Reference": p.parentPlanReference || p.parentPlanName || "",
      "Additional Plan Reason": p.additionalPlanReason || "",
      "Funding Source": project.fundingSource || "",
      "Funding Type": project.fundingType || "",
      Organization: p.organizationRegion || project.organizationRegion || "",
      Description: p.description || "",
      "Period Start (Gregorian)": fromGreg,
      "Period Start (Ethiopian)": fromEth,
      "Period End (Gregorian)": toGreg,
      "Period End (Ethiopian)": toEth,
      Status: p.status || "",
      "Total Activities":
        p.planActivities && p.planActivities.length > 0
          ? p.planActivities.length
          : (p.activities ?? 0),
      "Completed Activities": p.completedActivities ?? 0,
      "In Progress Activities": p.inProgressActivities ?? 0,
      "Delayed Activities": p.delayedActivities ?? 0,
      "Estimated Value": calculatedBudget,
      Currency: p.currency || project.baseCurrency || "",
      "Responsible Officer": p.createdByName || "",
      "Decision / Revision Notes":
        p.rejectionReason ||
        p.directorRevisionComment ||
        p.managementComment ||
        "",
    };
  });

  const planHeaders = [
    "Project Code",
    "Project Name",
    "Plan Reference",
    "Plan Title",
    "Budget Year",
    "Category",
    "Plan Type",
    "Parent Plan Reference",
    "Additional Plan Reason",
    "Funding Source",
    "Funding Type",
    "Organization",
    "Description",
    "Period Start (Gregorian)",
    "Period Start (Ethiopian)",
    "Period End (Gregorian)",
    "Period End (Ethiopian)",
    "Status",
    "Total Activities",
    "Completed Activities",
    "In Progress Activities",
    "Delayed Activities",
    "Estimated Value",
    "Currency",
    "Responsible Officer",
    "Decision / Revision Notes",
  ];

  const worksheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([planHeaders]);

  worksheet["!cols"] = [
    { wch: 18 }, // Project Code
    { wch: 35 }, // Project Name
    { wch: 22 }, // Plan Reference
    { wch: 40 }, // Plan Title
    { wch: 16 }, // Budget Year
    { wch: 22 }, // Category
    { wch: 18 }, // Plan Type
    { wch: 22 }, // Parent Plan Reference
    { wch: 30 }, // Additional Plan Reason
    { wch: 25 }, // Funding Source
    { wch: 20 }, // Funding Type
    { wch: 25 }, // Organization
    { wch: 45 }, // Description
    { wch: 24 }, // Period Start (Gregorian)
    { wch: 24 }, // Period Start (Ethiopian)
    { wch: 24 }, // Period End (Gregorian)
    { wch: 24 }, // Period End (Ethiopian)
    { wch: 18 }, // Status
    { wch: 16 }, // Total Activities
    { wch: 20 }, // Completed Activities
    { wch: 20 }, // In Progress Activities
    { wch: 18 }, // Delayed Activities
    { wch: 18 }, // Estimated Value
    { wch: 12 }, // Currency
    { wch: 24 }, // Responsible Officer
    { wch: 40 }, // Decision / Revision Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Procurement Plans");

  // Collect all activities across all plans in the project
  const allActivities: any[] = [];
  project.plans.forEach((p) => {
    const actList =
      p.planActivities && p.planActivities.length > 0
        ? p.planActivities
        : (p as any).activitiesList || [];

    actList.forEach((a: any) => {
      const roadmap = a.details?.roadmap || [];
      const firstStage = roadmap.find(
        (s: any) => s.plannedStartDate || s.gregorianDate,
      );
      const lastStage = [...roadmap]
        .reverse()
        .find((s: any) => s.plannedEndDate || s.gregorianDate);
      const completedStage = [...roadmap]
        .reverse()
        .find((s: any) => s.actualEndDate || s.actualDate);

      allActivities.push({
        "Project Code": project.code,
        "Project Name": project.name,
        "Plan Reference": p.reference || p.id || "",
        "Plan Title": p.name || (p as any).title || "",
        Reference: a.reference || a.id || "",
        Description: a.description || "",
        Category: a.category || p.category || "",
        "Method ID": a.method || "",
        "Specific Method": a.details?.form?.specificMethod || "",
        "Estimated Budget": Number(a.estimatedAmount || a.estimatedBudget || 0),
        Currency:
          a.details?.form?.currency ||
          a.currency ||
          p.currency ||
          project.baseCurrency ||
          "",
        "Market Approach":
          a.details?.form?.marketApproach || a.marketApproach || "",
        "Review Type": a.details?.form?.reviewType || a.reviewType || "",
        "Contract Type": a.details?.form?.contractType || a.contractType || "",
        "Current Stage": a.currentStage || "",
        Status: a.status || "",
        Location: a.details?.form?.location || a.location || "",
        "Lot Required": a.details?.form?.lotRequired ? "Yes" : "No",
        "Planned Start Date":
          firstStage?.plannedStartDate || firstStage?.gregorianDate || "",
        "Planned End Date":
          lastStage?.plannedEndDate || lastStage?.gregorianDate || "",
        "Actual Completion Date":
          completedStage?.actualEndDate || completedStage?.actualDate || "",
        "Funding Source": formatActivityFundingSources(
          a,
          p.organizationRegion || project.fundingSource || "",
        ),
      });
    });
  });

  if (allActivities.length > 0) {
    const actWorksheet = XLSX.utils.json_to_sheet(allActivities);
    actWorksheet["!cols"] = [
      { wch: 16 }, // Project Code
      { wch: 30 }, // Project Name
      { wch: 20 }, // Plan Reference
      { wch: 35 }, // Plan Title
      { wch: 22 }, // Reference
      { wch: 40 }, // Description
      { wch: 20 }, // Category
      { wch: 20 }, // Method ID
      { wch: 20 }, // Specific Method
      { wch: 18 }, // Estimated Budget
      { wch: 10 }, // Currency
      { wch: 18 }, // Market Approach
      { wch: 14 }, // Review Type
      { wch: 16 }, // Contract Type
      { wch: 28 }, // Current Stage
      { wch: 16 }, // Status
      { wch: 20 }, // Location
      { wch: 14 }, // Lot Required
      { wch: 20 }, // Planned Start Date
      { wch: 20 }, // Planned End Date
      { wch: 22 }, // Actual Completion Date
      { wch: 25 }, // Funding Source
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      actWorksheet,
      "Procurement Activities",
    );
  }

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
    const headers = [
      "Project Code (Required)",
      "Project Name (Required)",
      "SAP Identification No",
      "Country",
      "Executing Agency",
      "Organization",
      "Funding Source ID (Dropdown)",
      "Funding Type",
      "Sector ID (Dropdown)",
      "Status (Dropdown)",
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
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

    const guideRows = [
      {
        "Field Name": "Project Code (Required)",
        Requirement: "Mandatory",
        "Data Type": "Text",
        "Allowed Values / Options": "Unique Code (e.g. MOA-AGP2)",
        "Description & Business Rules":
          "Unique official project reference code.",
      },
      {
        "Field Name": "Project Name (Required)",
        Requirement: "Mandatory",
        "Data Type": "Text",
        "Allowed Values / Options": "Project title (minimum 5 characters)",
        "Description & Business Rules":
          "Full official name of the development project or program.",
      },
      {
        "Field Name": "Funding Source ID (Dropdown)",
        Requirement: "Mandatory",
        "Data Type": "Dropdown",
        "Allowed Values / Options":
          "World Bank (WB), African Development Bank (AfDB), Government of Ethiopia (GoE), IFAD, EU",
        "Description & Business Rules":
          "Financing partner or development institution.",
      },
      {
        "Field Name": "Sector ID (Dropdown)",
        Requirement: "Mandatory",
        "Data Type": "Dropdown",
        "Allowed Values / Options":
          "Agriculture & Crop Production, Livestock & Fishery, Natural Resources, Irrigation",
        "Description & Business Rules": "Primary agricultural economic sector.",
      },
      {
        "Field Name": "Status (Dropdown)",
        Requirement: "Optional",
        "Data Type": "Dropdown",
        "Allowed Values / Options": "Draft, ACTIVE, CLOSED, SUSPENDED",
        "Description & Business Rules": "Lifecycle operational status.",
      },
    ];

    const guideWorksheet = XLSX.utils.json_to_sheet(guideRows);
    guideWorksheet["!cols"] = [
      { wch: 30 },
      { wch: 16 },
      { wch: 18 },
      { wch: 35 },
      { wch: 60 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Projects Upload");
    XLSX.utils.book_append_sheet(
      workbook,
      guideWorksheet,
      "Instructions & Field Guide",
    );
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
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
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
