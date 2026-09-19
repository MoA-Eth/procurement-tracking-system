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

// 1. Annual Procurement Plan
export interface AnnualPlanReportRow {
  id: string;
  projectCode: string;
  planName: string;
  refNo: string;
  description: string;
  category: string;
  method: string;
  fundingSource: string;
  estimatedAmount: number;
  currency: string;
  officer: string;
  plannedStartDate: string;
  plannedCompletionDate: string;
  status: string;
}

// 2. Plan vs Actual Progress
export interface PlanVsActualReportRow {
  id: string;
  refNo: string;
  description: string;
  project: string;
  officer: string;
  category: string;
  method: string;
  stage: string;
  baselineDate: string;
  revisedDate: string;
  actualDate: string;
  varianceDays: string;
  delayDays: string;
  stageStatus: string;
  remarks: string;
}

// 3. Procurement Step Report
export interface StepReportRow {
  id: string;
  refNo: string;
  description: string;
  project: string;
  category: string;
  method: string;
  reviewType: string;
  marketApproach: string;
  estimatedAmount: number;
  currency: string;
  stage: string;
  plannedDate: string;
  revisedDate: string;
  actualDate: string;
  stageStatus: string;
  delayDays: string;
}

// 4. Delayed Procurement
export interface DelayedProcurementRow {
  id: string;
  refNo: string;
  description: string;
  project: string;
  category: string;
  method: string;
  officer: string;
  delayedStage: string;
  effectiveTargetDate: string;
  delayDays: number;
  fundingSource: string;
  status: string;
  remarks: string;
}

// 5. Monthly Procurement Report
export interface MonthlyProcurementRow {
  id: string;
  reportingMonth: string;
  refNo: string;
  description: string;
  project: string;
  category: string;
  method: string;
  officer: string;
  status: string;
  achievement: string;
  value: string;
  delay: string;
  nextActivity: string;
}

// 6. Quarterly Procurement Summary
export interface QuarterlySummaryRow {
  id: string;
  method: string;
  category: string;
  fundingType: string;
  packageCount: number;
  totalValue: number;
  currency: string;
  reportingPeriod: string;
}

// 7. Quarterly Detailed Procurement
export interface QuarterlyDetailedRow {
  id: string;
  rowNo: number;
  description: string;
  method: string;
  winnerSupplier: string;
  awardedAmount: number;
  currency: string;
  budgetType: string;
  fundingSource: string;
  poPvNumber: string;
  receiptStatus: string;
  completionDate: string;
  project: string;
  region: string;
  officer: string;
}

// 8. Contract Register
export interface ContractRegisterRow {
  id: string;
  contractNo: string;
  refNo: string;
  description: string;
  project: string;
  supplierName: string;
  region: string;
  method: string;
  fundingSource: string;
  currency: string;
  originalAmount: number;
  amendmentAmount: number;
  priceAdjustment: number;
  currentAmount: number;
  finalAmount: number;
  awardDate: string;
  signatureDate: string;
  startDate: string;
  plannedCompletionDate: string;
  revisedCompletionDate: string;
  actualCompletionDate: string;
  contractStatus: string;
  totalPaid: number;
  remainingBalance: number;
  remarks: string;
}

// 9. Contract & Payment Status
export interface ContractPaymentReportRow {
  id: string;
  contractNo: string;
  refNo: string;
  project: string;
  supplierName: string;
  region: string;
  currency: string;
  originalAmount: number;
  amendmentAmount: number;
  currentAmount: number;
  advance: number;
  interim1: number;
  interim2: number;
  finalPayment: number;
  retentionPayment: number;
  retentionWithholding: number;
  otherPayments: number;
  totalPaid: number;
  remainingBalance: number;
  paymentPct: string;
  contractStatus: string;
}

// 10. Regional / Sector Summary
export interface RegionalSectorSummaryRow {
  id: string;
  organizationUnit: string;
  totalActivities: number;
  completed: number;
  ongoing: number;
  delayed: number;
  cancelled: number;
  estimatedAmount: number;
  contractedAmount: number;
  paidAmount: number;
  remainingBalance: number;
  progressPct: string;
  delayMeasure: string;
}

// 11. Project Summary
export interface ProjectSummaryRow {
  id: string;
  projectCodeAndName: string;
  totalActivities: number;
  completed: number;
  ongoing: number;
  delayed: number;
  estimatedAmount: number;
  contractedAmount: number;
  finalContractAmount: number;
  paidAmount: number;
  remainingBalance: number;
  currentProgress: string;
}

// 12. Officer Summary
export interface OfficerSummaryRow {
  id: string;
  officerName: string;
  assignedActivities: number;
  completed: number;
  ongoing: number;
  delayed: number;
  currentStages: string;
  estimatedAmount: number;
  contractedAmount: number;
  paidAmount: number;
  remainingBalance: number;
  delayMeasure: string;
}

// 13. Committee / Approval Progress
export interface CommitteeApprovalRow {
  id: string;
  planTitle: string;
  project: string;
  officer: string;
  submittedDate: string;
  directorDecision: string;
  directorComment: string;
  committeeApprovals: number;
  committeeRejections: number;
  pendingVotes: number;
  committeeResult: string;
  managementDecision: string;
  managementComment: string;
  currentPlanStatus: string;
}

// 14. Supplier Performance
export interface SupplierPerformanceRow {
  id: string;
  supplierName: string;
  tinNumber: string;
  totalContracts: number;
  activeContracts: number;
  completedOnTime: number;
  completedDelayed: number;
  totalAwardValue: number;
  totalPaidAmount: number;
  remainingBalance: number;
  compliancePct: string;
  status: string;
}

// Legacy aliases
export type MonthlySummaryRow = QuarterlySummaryRow;
export type DetailedProcurementRow = QuarterlyDetailedRow;
export type ProjectOfficerSummaryRow = OfficerSummaryRow;

export function exportToExcelCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const csvContent = [
    headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","),
    ...rows.map((row) =>
      row.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","),
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
