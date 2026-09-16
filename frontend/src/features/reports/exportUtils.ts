import * as XLSX from "xlsx";
import { type ReportType, REPORT_LIST } from "./types";
import {
  type AnnualPlanReportRow,
  type PlanVsActualReportRow,
  type StepReportRow,
  type DelayedProcurementRow,
  type MonthlyProcurementRow,
  type QuarterlySummaryRow,
  type QuarterlyDetailedRow,
  type ContractRegisterRow,
  type ContractPaymentReportRow,
  type RegionalSectorSummaryRow,
  type ProjectSummaryRow,
  type OfficerSummaryRow,
  type CommitteeApprovalRow,
  type SupplierPerformanceRow,
} from "./reportsData";

export function exportReportToExcel({
  reportType,
  annualPlanRows = [],
  planVsActualRows = [],
  stepReportRows = [],
  delayedProcurementRows = [],
  monthlyProcurementRows = [],
  quarterlySummaryRows = [],
  quarterlyDetailedRows = [],
  contractRegisterRows = [],
  contractPaymentRows = [],
  regionalSectorRows = [],
  projectSummaryRows = [],
  officerSummaryRows = [],
  committeeApprovalRows = [],
  supplierPerformanceRows = [],
  otherRows = [],
}: {
  reportType: ReportType;
  annualPlanRows?: AnnualPlanReportRow[];
  planVsActualRows?: PlanVsActualReportRow[];
  stepReportRows?: StepReportRow[];
  delayedProcurementRows?: DelayedProcurementRow[];
  monthlyProcurementRows?: MonthlyProcurementRow[];
  quarterlySummaryRows?: QuarterlySummaryRow[];
  quarterlyDetailedRows?: QuarterlyDetailedRow[];
  contractRegisterRows?: ContractRegisterRow[];
  contractPaymentRows?: ContractPaymentReportRow[];
  regionalSectorRows?: RegionalSectorSummaryRow[];
  projectSummaryRows?: ProjectSummaryRow[];
  officerSummaryRows?: OfficerSummaryRow[];
  committeeApprovalRows?: CommitteeApprovalRow[];
  supplierPerformanceRows?: SupplierPerformanceRow[];
  otherRows?: any[];
}) {
  const reportInfo = REPORT_LIST.find((r) => r.id === reportType);
  const sheetName = (reportInfo?.label || "Report").slice(0, 31);
  let dataForSheet: Record<string, any>[] = [];

  switch (reportType) {
    case "annual-plan":
      dataForSheet = annualPlanRows.map((r) => ({
        "Project Code": r.projectCode,
        "Plan Name": r.planName,
        "Activity Ref": r.refNo,
        Description: r.description,
        Category: r.category,
        "Procurement Method": r.method,
        "Financing Source": r.fundingSource,
        "Estimated Amount": r.estimatedAmount,
        Currency: r.currency,
        "Responsible Officer": r.officer,
        "Planned Start": r.plannedStartDate,
        "Planned Completion": r.plannedCompletionDate,
        Status: r.status,
      }));
      break;

    case "plan-vs-actual":
      dataForSheet = planVsActualRows.map((r) => ({
        "Activity Ref": r.refNo,
        Description: r.description,
        Project: r.project,
        Officer: r.officer,
        Category: r.category,
        Method: r.method,
        Stage: r.stage,
        "Baseline Target": r.baselineDate,
        "Revised Target": r.revisedDate,
        "Actual Date": r.actualDate,
        "Variance (Days)": r.varianceDays,
        "Delay (Days)": r.delayDays,
        "Stage Status": r.stageStatus,
        Remarks: r.remarks,
      }));
      break;

    case "procurement-step":
      dataForSheet = stepReportRows.map((r) => ({
        "Activity Ref": r.refNo,
        Description: r.description,
        Project: r.project,
        Category: r.category,
        Method: r.method,
        "Review Type": r.reviewType,
        "Market Approach": r.marketApproach,
        "Estimated Amount": r.estimatedAmount,
        Currency: r.currency,
        Stage: r.stage,
        "Planned Date": r.plannedDate,
        "Revised Date": r.revisedDate,
        "Actual Date": r.actualDate,
        "Stage Status": r.stageStatus,
        "Delay Days": r.delayDays,
      }));
      break;

    case "delayed-procurement":
      dataForSheet = delayedProcurementRows.map((r) => ({
        "Activity Ref": r.refNo,
        Description: r.description,
        Project: r.project,
        Category: r.category,
        Method: r.method,
        Officer: r.officer,
        "Delayed Stage": r.delayedStage,
        "Effective Target Date": r.effectiveTargetDate,
        "Delay (Days)": r.delayDays,
        "Funding Source": r.fundingSource,
        Status: r.status,
        Remarks: r.remarks,
      }));
      break;

    case "monthly-procurement":
    case "monthly-summary":
      dataForSheet = monthlyProcurementRows.map((r) => ({
        "Reporting Month": r.reportingMonth,
        "Activity Ref": r.refNo,
        Description: r.description,
        Project: r.project,
        Category: r.category,
        Method: r.method,
        Officer: r.officer,
        Status: r.status,
        "Completed Achievement": r.achievement,
        Value: r.value,
        Delay: r.delay,
        "Next Activity": r.nextActivity,
      }));
      break;

    case "quarterly-summary":
      dataForSheet = quarterlySummaryRows.map((r) => ({
        "Procurement Method": r.method,
        Category: r.category,
        "Funding Type": r.fundingType,
        "Package Count": r.packageCount,
        "Total Value": r.totalValue,
        Currency: r.currency,
        "Reporting Period": r.reportingPeriod,
      }));
      break;

    case "quarterly-detailed":
    case "detailed-procurement":
      dataForSheet = quarterlyDetailedRows.map((r) => ({
        "No.": r.rowNo,
        Description: r.description,
        Method: r.method,
        "Winning Supplier": r.winnerSupplier,
        "Award Amount": r.awardedAmount,
        Currency: r.currency,
        "Budget Type": r.budgetType,
        "Funding Source": r.fundingSource,
        "PO / PV Number": r.poPvNumber,
        "Receipt / Delivery Status": r.receiptStatus,
        "Completion Date": r.completionDate,
        Project: r.project,
        Region: r.region,
        Officer: r.officer,
      }));
      break;

    case "contract-register":
      dataForSheet = contractRegisterRows.map((r) => ({
        "Contract No": r.contractNo,
        "Activity Ref": r.refNo,
        Description: r.description,
        Project: r.project,
        "Supplier / Contractor": r.supplierName,
        Region: r.region,
        Method: r.method,
        "Funding Source": r.fundingSource,
        Currency: r.currency,
        "Original Contract Amount": r.originalAmount,
        "Amendment Amount": r.amendmentAmount,
        "Price Adjustment": r.priceAdjustment,
        "Current Contract Amount": r.currentAmount,
        "Award Date": r.awardDate,
        "Signature Date": r.signatureDate,
        "Start Date": r.startDate,
        "Original Target Completion": r.plannedCompletionDate,
        "Revised Target Completion": r.revisedCompletionDate,
        "Actual Completion Date": r.actualCompletionDate,
        Status: r.contractStatus,
        "Total Paid": r.totalPaid,
        "Remaining Balance": r.remainingBalance,
        Remarks: r.remarks,
      }));
      break;

    case "contract-payment":
      dataForSheet = contractPaymentRows.map((r) => ({
        "Contract No": r.contractNo,
        Activity: r.refNo,
        Project: r.project,
        "Supplier / Contractor": r.supplierName,
        Region: r.region,
        Currency: r.currency,
        "Original Amount": r.originalAmount,
        "Amendment Amount": r.amendmentAmount,
        "Current Contract Amount": r.currentAmount,
        Advance: r.advance,
        "1st Interim": r.interim1,
        "2nd Interim": r.interim2,
        "Final Payment": r.finalPayment,
        "Retention Payment": r.retentionPayment,
        "Retention Withholding": r.retentionWithholding,
        "Total Paid": r.totalPaid,
        "Remaining Balance": r.remainingBalance,
        "Payment %": r.paymentPct,
        Status: r.contractStatus,
      }));
      break;

    case "regional-sector-summary":
      dataForSheet = regionalSectorRows.map((r) => ({
        "Organization / Sector / Region": r.organizationUnit,
        "Total Activities": r.totalActivities,
        Completed: r.completed,
        Ongoing: r.ongoing,
        Delayed: r.delayed,
        Cancelled: r.cancelled,
        "Estimated Amount": r.estimatedAmount,
        "Contracted Amount": r.contractedAmount,
        "Paid Amount": r.paidAmount,
        "Remaining Balance": r.remainingBalance,
        "Progress %": r.progressPct,
        "Delay Measure": r.delayMeasure,
      }));
      break;

    case "project-summary":
      dataForSheet = projectSummaryRows.map((r) => ({
        "Project Code & Name": r.projectCodeAndName,
        "Total Activities": r.totalActivities,
        Completed: r.completed,
        Ongoing: r.ongoing,
        Delayed: r.delayed,
        "Estimated Amount (ETB)": r.estimatedAmount,
        "Contracted Amount (ETB)": r.contractedAmount,
        "Final Contract Amount (ETB)": r.finalContractAmount,
        "Paid Amount (ETB)": r.paidAmount,
        "Remaining Balance (ETB)": r.remainingBalance,
        "Current Progress %": r.currentProgress,
      }));
      break;

    case "officer-summary":
    case "project-officer":
      dataForSheet = officerSummaryRows.map((r) => ({
        "Responsible Officer": r.officerName,
        "Assigned Activities": r.assignedActivities,
        Completed: r.completed,
        Ongoing: r.ongoing,
        Delayed: r.delayed,
        "Active Stage Distribution": r.currentStages,
        "Estimated Amount (ETB)": r.estimatedAmount,
        "Contracted Amount (ETB)": r.contractedAmount,
        "Paid Amount (ETB)": r.paidAmount,
        "Remaining Balance (ETB)": r.remainingBalance,
        "Delay Measure": r.delayMeasure,
      }));
      break;

    case "committee-approval":
      dataForSheet = committeeApprovalRows.map((r) => ({
        "Plan Title": r.planTitle,
        Project: r.project,
        Officer: r.officer,
        "Submitted Date": r.submittedDate,
        "Director Decision": r.directorDecision,
        "Director Comment": r.directorComment,
        "Committee Approvals (0-5)": r.committeeApprovals,
        "Committee Rejections (0-5)": r.committeeRejections,
        "Pending Votes": r.pendingVotes,
        "Committee Result": r.committeeResult,
        "Management Decision": r.managementDecision,
        "Management Comment": r.managementComment,
        "Plan Status": r.currentPlanStatus,
      }));
      break;

    case "supplier-performance":
      dataForSheet = supplierPerformanceRows.map((r) => ({
        "Supplier / Contractor": r.supplierName,
        "TIN Number": r.tinNumber,
        "Total Contracts": r.totalContracts,
        "Active Contracts": r.activeContracts,
        "On-Time Deliveries": r.completedOnTime,
        "Delayed Deliveries": r.completedDelayed,
        "Total Award Value (ETB)": r.totalAwardValue,
        "Total Paid (ETB)": r.totalPaidAmount,
        "Remaining Balance (ETB)": r.remainingBalance,
        "Compliance %": r.compliancePct,
        Status: r.status,
      }));
      break;

    default:
      dataForSheet = (otherRows.length > 0 ? otherRows : annualPlanRows).map(
        (r) => ({
          "Item Ref": r.refNo,
          Description: r.description,
          Category: r.category,
          Method: r.method,
          "Amount (ETB)": r.estimatedAmount,
          Status: r.status,
        }),
      );
      break;
  }

  if (dataForSheet.length === 0) {
    dataForSheet = [{ Notice: "No matching records for selected filter criteria" }];
  }

  const worksheet = XLSX.utils.json_to_sheet(dataForSheet);

  // Auto-fit column widths based on maximum content length and header
  const colWidths = Object.keys(dataForSheet[0] || {}).map((key) => {
    const kLower = key.toLowerCase();
    const maxContentLen = dataForSheet.reduce((max, row) => {
      const val = row[key];
      const len = val != null ? String(val).length : 0;
      return Math.max(max, len);
    }, key.length);

    if (kLower.includes("project") || kLower.includes("plan")) {
      return { wch: Math.max(36, Math.min(maxContentLen + 4, 80)) };
    }
    if (
      kLower.includes("description") ||
      kLower.includes("remarks") ||
      kLower.includes("comment")
    ) {
      return { wch: Math.max(45, Math.min(maxContentLen + 4, 65)) };
    }
    return { wch: Math.max(16, Math.min(maxContentLen + 4, 50)) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${reportType}_report_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
