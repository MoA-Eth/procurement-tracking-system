import * as XLSX from "xlsx";
import type { OfficerContract } from "../data/officerContracts";
import type { OfficerContractPayment } from "../data/officerPayments";

/**
 * Utility functions for downloading contract Excel templates, exporting contracts, and parsing/validating uploaded contract spreadsheets.
 */

export interface ParsedContractRow {
  rowNumber: number;
  contractNumber: string;
  project: string;
  activity: string;
  supplier: string;
  region?: string;
  awardDate?: string;
  signingDate?: string;
  startDate?: string;
  endDate?: string;
  originalAmount: number;
  amendment?: number;
  finalAmount: number;
  totalPaid: number;
  remainingBalance: number;
  status: string;
  advance?: number;
  firstPayment?: number;
  secondPayment?: number;
  finalPayment?: number;
  retentionPayment?: number;
  retentionWithholding?: number;
  isValid: boolean;
  validationError?: string;
}

export interface ParsedContractsResult {
  rows: ParsedContractRow[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  fileName: string;
}

export const CANONICAL_CONTRACT_HEADERS = [
  "Project",
  "Activity",
  "Supplier",
  "Region",
  "Contract Number",
  "Contract Award Date",
  "Contract Signature Date",
  "Start Date",
  "End Date",
  "Original Contract Amount",
  "Amendment",
  "Final Contract Amount",
  "Total Paid",
  "Remaining Balance",
  "Contract Status",
  "Advance",
  "1st Payment",
  "2nd Payment",
  "Final Payment",
  "Retention Payment",
  "Retention Withholding",
] as const;

function normalizeHeader(h: string): string {
  return String(h || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getColumnValue(
  row: Record<string, any>,
  aliases: string[],
): any | undefined {
  const normAliases = aliases.map((a) => normalizeHeader(a));
  for (const [key, val] of Object.entries(row)) {
    const normKey = normalizeHeader(key);
    if (normAliases.includes(normKey)) {
      return val;
    }
  }
  return undefined;
}

function parseExcelNumber(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseExcelDate(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? undefined : val.toISOString().slice(0, 10);
  }
  if (typeof val === "number") {
    // Excel date serial number to Gregorian
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (!str) return undefined;
  const d = new Date(str);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/**
 * Downloads a pre-formatted Excel template for importing Contracts with sample data.
 */
export async function downloadContractExcelTemplate(): Promise<void> {
  try {
    const { downloadContractsTemplate } = await import("@/lib/contractsApi");
    await downloadContractsTemplate();
  } catch {
    // Client-side fallback generation
    const XLSX = await import("xlsx");
    const sampleData = [
      {
        Project: "Second Agricultural Growth Program (AGP-II)",
        Activity: "ET-MoA-001-GO-RFQ",
        Supplier: "Afro Agricultural Implements PLC",
        Region: "Oromia",
        "Contract Number": "MOA-CON-2024-001",
        "Contract Award Date": "2025-08-10",
        "Contract Signature Date": "2025-08-15",
        "Start Date": "2025-09-01",
        "End Date": "2026-06-30",
        "Original Contract Amount": 2500000,
        Amendment: 0,
        "Final Contract Amount": 2500000,
        "Total Paid": 500000,
        "Remaining Balance": 2000000,
        "Contract Status": "Active",
        Advance: 500000,
        "1st Payment": 0,
        "2nd Payment": 0,
        "Final Payment": 0,
        "Retention Payment": 0,
        "Retention Withholding": 125000,
      },
      {
        Project: "Lowlands Livelihood Resilience Project (LLRP)",
        Activity: "ET-MoA-002-CW-RFB",
        Supplier: "National Water Works Construction Enterprise",
        Region: "Somali",
        "Contract Number": "MOA-CON-2024-002",
        "Contract Award Date": "2025-09-05",
        "Contract Signature Date": "2025-09-12",
        "Start Date": "2025-10-01",
        "End Date": "2026-09-30",
        "Original Contract Amount": 12000000,
        Amendment: 500000,
        "Final Contract Amount": 12500000,
        "Total Paid": 3750000,
        "Remaining Balance": 8750000,
        "Contract Status": "Active",
        Advance: 2500000,
        "1st Payment": 1250000,
        "2nd Payment": 0,
        "Final Payment": 0,
        "Retention Payment": 0,
        "Retention Withholding": 625000,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws["!cols"] = [
      { wch: 35 }, // Project
      { wch: 22 }, // Activity
      { wch: 35 }, // Supplier
      { wch: 16 }, // Region
      { wch: 22 }, // Contract Number
      { wch: 18 }, // Award Date
      { wch: 20 }, // Signature Date
      { wch: 14 }, // Start Date
      { wch: 14 }, // End Date
      { wch: 22 }, // Original Contract Amount
      { wch: 14 }, // Amendment
      { wch: 20 }, // Final Contract Amount
      { wch: 16 }, // Total Paid
      { wch: 18 }, // Remaining Balance
      { wch: 16 }, // Contract Status
      { wch: 14 }, // Advance
      { wch: 14 }, // 1st Payment
      { wch: 14 }, // 2nd Payment
      { wch: 14 }, // Final Payment
      { wch: 16 }, // Retention Payment
      { wch: 20 }, // Retention Withholding
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contracts Upload");
    XLSX.writeFile(wb, "Contracts_Import_Template.xlsx");
  }
}

/**
 * Parses and validates an Excel or CSV file containing Contracts against official template structure and data rules.
 */
export async function parseContractsFromExcel(
  file: File,
): Promise<ParsedContractsResult> {
  const XLSX = await import("xlsx");
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

  const hasContractNo = normalizedHeaders.some(
    (h) => h.includes("contractnumber") || h.includes("contractno"),
  );
  const hasSupplier = normalizedHeaders.some((h) => h.includes("supplier"));

  if (!hasContractNo || !hasSupplier) {
    const missingCols: string[] = [];
    if (!hasContractNo) missingCols.push("Contract Number");
    if (!hasSupplier) missingCols.push("Supplier");
    throw new Error(
      `Invalid template structure: The uploaded file does not follow the Contract template structure. Missing required columns: [${missingCols.join(
        ", ",
      )}]. Found columns: [${headerKeys.join(
        ", ",
      )}]. Please download and use the official Contract template.`,
    );
  }

  const parsedRows: ParsedContractRow[] = [];

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const project = String(
      getColumnValue(row, ["Project", "Project Name", "Project Code"]) || "",
    ).trim();
    const activity = String(
      getColumnValue(row, [
        "Activity",
        "Activity Reference",
        "Activity Code",
        "Procurement Activity",
      ]) || "",
    ).trim();
    const supplier = String(
      getColumnValue(row, ["Supplier", "Supplier Name", "Vendor"]) || "",
    ).trim();
    const region = String(
      getColumnValue(row, [
        "Region",
        "Organization / Region",
        "Organization",
        "Location",
      ]) || "",
    ).trim();
    const contractNumber = String(
      getColumnValue(row, ["Contract Number", "Contract No", "Contract #"]) ||
        "",
    ).trim();

    const rawAwardDate = getColumnValue(row, [
      "Contract Award Date",
      "Award Date",
    ]);
    const rawSignatureDate = getColumnValue(row, [
      "Contract Signature Date",
      "Signature Date",
      "Signing Date",
    ]);
    const rawStartDate = getColumnValue(row, [
      "Start Date",
      "Commencement Date",
    ]);
    const rawEndDate = getColumnValue(row, [
      "End Date",
      "Completion Date",
      "Planned End Date",
    ]);

    const awardDate = parseExcelDate(rawAwardDate);
    const signingDate = parseExcelDate(rawSignatureDate);
    const startDate = parseExcelDate(rawStartDate);
    const endDate = parseExcelDate(rawEndDate);

    const originalAmount = parseExcelNumber(
      getColumnValue(row, [
        "Original Contract Amount",
        "Original Amount",
        "Initial Amount",
      ]),
    );
    const amendment = parseExcelNumber(
      getColumnValue(row, ["Amendment", "Amendments"]),
    );
    const finalAmount = parseExcelNumber(
      getColumnValue(row, [
        "Final Contract Amount",
        "Final Amount",
        "Current Amount",
      ]),
    );
    const totalPaid = parseExcelNumber(
      getColumnValue(row, ["Total Paid", "Paid Amount", "Paid"]),
    );
    const remainingBalance = parseExcelNumber(
      getColumnValue(row, ["Remaining Balance", "Remaining", "Balance"]),
    );

    const rawStatus = String(
      getColumnValue(row, ["Contract Status", "Status"]) || "Active",
    ).trim();
    let status = "Active";
    const stLower = rawStatus.toLowerCase();
    if (stLower.includes("complete")) status = "Completed";
    else if (stLower.includes("terminat")) status = "Terminated";
    else if (stLower.includes("draft") || stLower.includes("plan"))
      status = "Planned / Prepared";
    else if (stLower.includes("delay")) status = "Delayed";
    else if (stLower.includes("sign")) status = "Signed";

    const advance = parseExcelNumber(
      getColumnValue(row, ["Advance", "Advance Payment"]),
    );
    const firstPayment = parseExcelNumber(
      getColumnValue(row, ["1st Payment", "First Payment"]),
    );
    const secondPayment = parseExcelNumber(
      getColumnValue(row, ["2nd Payment", "Second Payment"]),
    );
    const finalPayment = parseExcelNumber(
      getColumnValue(row, ["Final Payment"]),
    );
    const retentionPayment = parseExcelNumber(
      getColumnValue(row, ["Retention Payment"]),
    );
    const retentionWithholding = parseExcelNumber(
      getColumnValue(row, ["Retention Withholding"]),
    );

    let isValid = true;
    let validationError = "";

    if (!contractNumber) {
      isValid = false;
      validationError = "Missing Contract Number";
    } else if (!supplier) {
      isValid = false;
      validationError = "Missing Supplier";
    } else if (originalAmount < 0) {
      isValid = false;
      validationError = "Original Contract Amount cannot be negative";
    } else if (finalAmount < 0) {
      isValid = false;
      validationError = "Final Contract Amount cannot be negative";
    } else if (startDate && endDate && endDate < startDate) {
      isValid = false;
      validationError = "End Date cannot be before Start Date";
    }

    parsedRows.push({
      rowNumber,
      contractNumber,
      project,
      activity,
      supplier,
      region,
      awardDate,
      signingDate,
      startDate,
      endDate,
      originalAmount: originalAmount || finalAmount || 0,
      amendment,
      finalAmount: finalAmount || originalAmount || 0,
      totalPaid,
      remainingBalance:
        remainingBalance ||
        Math.max(0, (finalAmount || originalAmount || 0) - totalPaid),
      status,
      advance,
      firstPayment,
      secondPayment,
      finalPayment,
      retentionPayment,
      retentionWithholding,
      isValid,
      validationError: validationError || undefined,
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

/**
 * Exports contracts to a formatted Excel file matching the official canonical template structure.
 */
export function exportContractsToExcel(
  contracts: readonly OfficerContract[],
  payments?: readonly OfficerContractPayment[],
  customFilename?: string,
): void {
  const rows = contracts.map((c) => {
    const contractPayments = (payments || []).filter(
      (p) =>
        p.contractNumber &&
        c.contractNumber &&
        p.contractNumber.toLowerCase() === c.contractNumber.toLowerCase(),
    );

    const sumPayments = (types: string[]): number => {
      let total = 0;
      for (const p of contractPayments) {
        if (
          types.some((t) =>
            p.paymentType?.toLowerCase().includes(t.toLowerCase()),
          )
        ) {
          total += Number(p.amount) || 0;
        }
      }
      const bpList = (c as any).backendPayments;
      if (Array.isArray(bpList)) {
        for (const bp of bpList) {
          if (
            types.some((t) =>
              bp.paymentType?.toLowerCase().includes(t.toLowerCase()),
            )
          ) {
            total += Number(bp.amount) || 0;
          }
        }
      }
      return total;
    };

    const advance = sumPayments(["advance"]);
    const firstPayment = sumPayments(["1st", "interim_1"]);
    const secondPayment = sumPayments(["2nd", "interim_2"]);
    const finalPayment = sumPayments(["final"]);
    const retentionPayment = sumPayments(["retention payment"]);
    const retentionWithholding = sumPayments([
      "retention withholding",
      "withholding",
    ]);

    const totalAmendments =
      c.details?.amendments?.reduce(
        (acc, curr) => acc + (Number(curr.amount) || 0),
        0,
      ) ??
      Math.max(
        0,
        (Number(c.currentAmount) || 0) - (Number(c.originalAmount) || 0),
      );

    return {
      Project: c.project || "",
      Activity: c.procurementActivity || "",
      Supplier: c.supplier || "",
      Region: c.details?.organizationRegion || "Federal",
      "Contract Number": c.contractNumber || "",
      "Contract Award Date":
        c.details?.awardDate?.gregorian ||
        c.details?.awardDate?.ethiopian ||
        "",
      "Contract Signature Date":
        c.signingDate?.gregorian || c.signingDate?.ethiopian || "",
      "Start Date":
        c.details?.startDate?.gregorian ||
        c.details?.startDate?.ethiopian ||
        "",
      "End Date":
        c.completionDate?.gregorian || c.completionDate?.ethiopian || "",
      "Original Contract Amount": Number(c.originalAmount) || 0,
      Amendment: totalAmendments,
      "Final Contract Amount":
        Number(c.currentAmount) || Number(c.originalAmount) || 0,
      "Total Paid": Number(c.totalPaid) || 0,
      "Remaining Balance": Number(c.remainingBalance) || 0,
      "Contract Status": c.status || "Active",
      Advance: advance,
      "1st Payment": firstPayment,
      "2nd Payment": secondPayment,
      "Final Payment": finalPayment,
      "Retention Payment": retentionPayment,
      "Retention Withholding": retentionWithholding,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const colWidths = [
    { wch: 35 }, // Project
    { wch: 25 }, // Activity
    { wch: 35 }, // Supplier
    { wch: 18 }, // Region
    { wch: 24 }, // Contract Number
    { wch: 20 }, // Contract Award Date
    { wch: 22 }, // Contract Signature Date
    { wch: 16 }, // Start Date
    { wch: 16 }, // End Date
    { wch: 24 }, // Original Contract Amount
    { wch: 16 }, // Amendment
    { wch: 22 }, // Final Contract Amount
    { wch: 18 }, // Total Paid
    { wch: 20 }, // Remaining Balance
    { wch: 18 }, // Contract Status
    { wch: 16 }, // Advance
    { wch: 16 }, // 1st Payment
    { wch: 16 }, // 2nd Payment
    { wch: 16 }, // Final Payment
    { wch: 18 }, // Retention Payment
    { wch: 22 }, // Retention Withholding
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contracts");

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `Contracts_Export_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
