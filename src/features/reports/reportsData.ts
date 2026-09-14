export interface ReportFilterOptions {
  efy: string;
  fromDate: string;
  toDate: string;
  project: string;
  category: string;
  fundingSource: string;
  procurementMethod: string;
  reviewType: string;
  currency: string;
}

export interface AnnualPlanReportRow {
  id: string;
  projectCode: string;
  planName: string;
  refNo: string;
  description: string;
  category: string;
  method: string;
  estimatedAmount: number;
  currency: string;
  fundingSource: string;
  region: string;
  officer: string;
  status: string;
}

export interface PlanVsActualReportRow {
  id: string;
  refNo: string;
  description: string;
  method: string;
  plannedAdvertisingDate: string;
  actualAdvertisingDate: string;
  plannedOpeningDate: string;
  actualOpeningDate: string;
  plannedAwardDate: string;
  actualAwardDate: string;
  plannedSignatureDate: string;
  actualSignatureDate: string;
  status: string;
}

export interface StepReportRow {
  id: string;
  refNo: string;
  description: string;
  category: string;
  method: string;
  marketApproach: string;
  reviewType: string;
  processStatus: string;
  activityStatus: string;
  estimatedAmount: number;
  signedContractAmount: number;
}

export interface DelayedProcurementRow {
  id: string;
  refNo: string;
  description: string;
  method: string;
  currentOverdueStage: string;
  effectiveTargetDate: string;
  actualOrCurrentDate: string;
  delayDays: number;
  replanningReason: string;
  officer: string;
}

export interface MonthlySummaryRow {
  id: string;
  monthYear: string;
  category: string;
  method: string;
  fundingType: "Treasury" | "Loan" | "Grant";
  packageCount: number;
  totalAmountETB: number;
  currency?: string;
}

export interface ContractPaymentReportRow {
  id: string;
  contractNo: string;
  refNo: string;
  supplierName: string;
  region: string;
  originalContractAmount: number;
  vatAmount: number;
  finalContractAmount: number;
  totalPaidAmount: number;
  remainingBalance: number;
  contractStatus: string;
}

export interface DetailedProcurementRow {
  id: string;
  refNo: string;
  description: string;
  category: string;
  method: string;
  winnerSupplier: string;
  awardedAmount: number;
  currency: string;
  fundingSource: string;
  completionDate: string;
  status: string;
}

export interface ProjectOfficerSummaryRow {
  id: string;
  projectCode: string;
  officerName: string;
  totalPlans: number;
  totalActivities: number;
  totalBudgetETB: number;
  approvedCount: number;
  delayedCount: number;
}

export function exportToExcelCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows.map((row) =>
      row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
