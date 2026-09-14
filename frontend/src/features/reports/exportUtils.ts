import * as XLSX from "xlsx";
import { type ReportType, REPORT_LIST } from "./types";
import {
  type AnnualPlanReportRow,
  type PlanVsActualReportRow,
  type DelayedProcurementRow,
  type ContractPaymentReportRow,
} from "./reportsData";

export function exportReportToExcel({
  reportType,
  annualPlanRows = [],
  planVsActualRows = [],
  delayedProcurementRows = [],
  contractPaymentRows = [],
  otherRows = [],
}: {
  reportType: ReportType;
  annualPlanRows?: AnnualPlanReportRow[];
  planVsActualRows?: PlanVsActualReportRow[];
  delayedProcurementRows?: DelayedProcurementRow[];
  contractPaymentRows?: ContractPaymentReportRow[];
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
        "Estimated Amount": r.estimatedAmount,
        Currency: r.currency,
        "Funding Source": r.fundingSource,
        Region: r.region,
        "Assigned Officer": r.officer,
        Status: r.status,
      }));
      break;

    case "plan-vs-actual":
      dataForSheet = planVsActualRows.map((r) => ({
        "Activity Ref": r.refNo,
        Description: r.description,
        "Procurement Method": r.method,
        "Planned Advert Date": r.plannedAdvertisingDate,
        "Actual Advert Date": r.actualAdvertisingDate,
        "Planned Opening Date": r.plannedOpeningDate,
        "Actual Opening Date": r.actualOpeningDate,
        "Planned Award Date": r.plannedAwardDate,
        "Actual Award Date": r.actualAwardDate,
        "Planned Signature Date": r.plannedSignatureDate,
        "Actual Signature Date": r.actualSignatureDate,
        Status: r.status,
      }));
      break;

    case "delayed-procurement":
      dataForSheet = delayedProcurementRows.map((r) => ({
        "Activity Ref": r.refNo,
        Description: r.description,
        "Procurement Method": r.method,
        "Current Overdue Stage": r.currentOverdueStage,
        "Effective Target Date": r.effectiveTargetDate,
        "Actual/Current Date": r.actualOrCurrentDate,
        "Delay (Days)": r.delayDays,
        "Replanning Reason": r.replanningReason,
        "Assigned Officer": r.officer,
      }));
      break;

    case "contract-payment":
      dataForSheet = contractPaymentRows.map((r) => ({
        "Contract No": r.contractNo,
        "Activity Ref": r.refNo,
        "Supplier / Contractor": r.supplierName,
        "Original Amount": r.originalContractAmount,
        "VAT (15%)": r.vatAmount,
        "Final Contract Amount": r.finalContractAmount,
        "Total Paid": r.totalPaidAmount,
        "Remaining Balance": r.remainingBalance,
      }));
      break;

    default:
      dataForSheet = (otherRows.length > 0 ? otherRows : annualPlanRows).map(
        (r) => ({
          "Item Ref / Code": r.refNo,
          Description: r.description,
          Category: r.category,
          Method: r.method,
          "Amount (ETB)": r.estimatedAmount,
          Status: r.status,
        }),
      );
      break;
  }

  const worksheet = XLSX.utils.json_to_sheet(dataForSheet);

  // Auto-fit column widths
  const colWidths = Object.keys(dataForSheet[0] || {}).map((key) => ({
    wch: Math.max(key.length + 4, 14),
  }));
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${reportType}_report_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
