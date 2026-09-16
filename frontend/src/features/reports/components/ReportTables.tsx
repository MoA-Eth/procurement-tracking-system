"use client";

import { type ReportType, REPORT_LIST } from "../types";
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
} from "../reportsData";
import { Inbox } from "lucide-react";

export interface ReportTablesProps {
  activeReport: ReportType;
  annualPlanRows: AnnualPlanReportRow[];
  planVsActualRows: PlanVsActualReportRow[] | any[];
  stepReportRows: StepReportRow[];
  delayedProcurementRows: DelayedProcurementRow[] | any[];
  monthlyProcurementRows?: MonthlyProcurementRow[];
  monthlySummaryRows?: any[]; // legacy
  quarterlySummaryRows?: QuarterlySummaryRow[];
  quarterlyDetailedRows?: QuarterlyDetailedRow[];
  detailedProcurementRows?: any[]; // legacy
  contractRegisterRows?: ContractRegisterRow[];
  contractPaymentRows: ContractPaymentReportRow[];
  regionalSectorRows?: RegionalSectorSummaryRow[];
  projectSummaryRows?: ProjectSummaryRow[];
  officerSummaryRows?: OfficerSummaryRow[];
  projectOfficerRows?: any[]; // legacy
  committeeApprovalRows?: CommitteeApprovalRow[];
  supplierPerformanceRows?: SupplierPerformanceRow[];
}

export function ReportTables({
  activeReport,
  annualPlanRows,
  planVsActualRows,
  stepReportRows,
  delayedProcurementRows,
  monthlyProcurementRows = [],
  monthlySummaryRows = [],
  quarterlySummaryRows = [],
  quarterlyDetailedRows = [],
  detailedProcurementRows = [],
  contractRegisterRows = [],
  contractPaymentRows,
  regionalSectorRows = [],
  projectSummaryRows = [],
  officerSummaryRows = [],
  projectOfficerRows = [],
  committeeApprovalRows = [],
  supplierPerformanceRows = [],
}: ReportTablesProps) {
  const currentReport = REPORT_LIST.find((r) => r.id === activeReport);
  const currentReportTitle =
    activeReport === "plan-vs-actual"
      ? "Plan vs Actual"
      : activeReport === "monthly-summary"
        ? "Monthly Summary"
        : activeReport === "detailed-procurement"
          ? "Detailed Procurement"
          : activeReport === "project-officer"
            ? "Project & Officer Summary"
            : currentReport?.label || "Report";

  // Normalize rows
  const effectiveMonthlyRows =
    monthlySummaryRows.length > 0
      ? monthlySummaryRows
      : monthlyProcurementRows.length > 0
        ? monthlyProcurementRows
        : [];
  const effectiveQuarterlyDetailed =
    quarterlyDetailedRows.length > 0
      ? quarterlyDetailedRows
      : detailedProcurementRows.length > 0
        ? detailedProcurementRows
        : [];
  const effectiveOfficerRows =
    officerSummaryRows.length > 0
      ? officerSummaryRows
      : projectOfficerRows.length > 0
        ? projectOfficerRows
        : [];

  const getRowCount = () => {
    switch (activeReport) {
      case "annual-plan":
        return annualPlanRows.length;
      case "plan-vs-actual":
        return planVsActualRows.length;
      case "procurement-step":
        return stepReportRows.length;
      case "delayed-procurement":
        return delayedProcurementRows.length;
      case "monthly-procurement":
      case "monthly-summary":
        return effectiveMonthlyRows.length;
      case "quarterly-summary":
        return quarterlySummaryRows.length;
      case "quarterly-detailed":
      case "detailed-procurement":
        return effectiveQuarterlyDetailed.length;
      case "contract-register":
        return contractRegisterRows.length;
      case "contract-payment":
        return contractPaymentRows.length;
      case "regional-sector-summary":
        return regionalSectorRows.length;
      case "project-summary":
        return projectSummaryRows.length;
      case "officer-summary":
      case "project-officer":
        return effectiveOfficerRows.length;
      case "committee-approval":
        return committeeApprovalRows.length;
      case "supplier-performance":
        return supplierPerformanceRows.length;
      default:
        return 0;
    }
  };

  const rowCount = getRowCount();

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden max-w-full">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900">
              {currentReportTitle} Output
            </h4>
            {currentReport?.priority && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                  currentReport.priority === "P0"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {currentReport.priority}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {currentReport?.description}
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500 shrink-0">
          Displaying {rowCount} filtered result{rowCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto w-full max-w-full">
        {/* 1. Annual Procurement Plan */}
        {activeReport === "annual-plan" && (
          <table className="w-full text-left border-collapse text-xs min-w-[900px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3">Activity Ref</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Funding Source</th>
                <th className="py-3 px-3 font-mono text-right">Est Amount</th>
                <th className="py-3 px-3">Currency</th>
                <th className="py-3 px-3">Officer</th>
                <th className="py-3 px-3">Planned Start</th>
                <th className="py-3 px-3">Planned End</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {annualPlanRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">
                    {row.projectCode}
                  </td>
                  <td className="py-2.5 px-3 font-medium">{row.planName}</td>
                  <td className="py-2.5 px-3 font-mono font-bold">{row.refNo}</td>
                  <td className="py-2.5 px-3 max-w-[200px] truncate" title={row.description}>
                    {row.description}
                  </td>
                  <td className="py-2.5 px-3">{row.category}</td>
                  <td className="py-2.5 px-3">{row.method}</td>
                  <td className="py-2.5 px-3">{row.fundingSource}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right">
                    {row.estimatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{row.currency}</td>
                  <td className="py-2.5 px-3">{row.officer}</td>
                  <td className="py-2.5 px-3">{row.plannedStartDate || "—"}</td>
                  <td className="py-2.5 px-3">{row.plannedCompletionDate || "—"}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 2. Plan vs Actual Progress */}
        {activeReport === "plan-vs-actual" && (
          <table className="w-full text-left border-collapse text-xs min-w-[950px]">
            {/* Check if rows are milestone-based (legacy test format) or stage-based */}
            {planVsActualRows[0]?.plannedAdvertisingDate !== undefined ? (
              <>
                <thead>
                  <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                    <th className="py-3 px-3">Activity Ref</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">Plan Advert</th>
                    <th className="py-3 px-3">Actual Advert</th>
                    <th className="py-3 px-3">Plan Open</th>
                    <th className="py-3 px-3">Actual Open</th>
                    <th className="py-3 px-3">Plan Award</th>
                    <th className="py-3 px-3">Actual Award</th>
                    <th className="py-3 px-3">Plan Sign</th>
                    <th className="py-3 px-3">Actual Signed</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {planVsActualRows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">{row.refNo}</td>
                      <td className="py-2.5 px-3 max-w-[160px] truncate" title={row.description}>
                        {row.description}
                      </td>
                      <td className="py-2.5 px-3">{row.method}</td>
                      <td className="py-2.5 px-3">{row.plannedAdvertisingDate || "—"}</td>
                      <td className="py-2.5 px-3">{row.actualAdvertisingDate || "—"}</td>
                      <td className="py-2.5 px-3">{row.plannedOpeningDate || "—"}</td>
                      <td className="py-2.5 px-3">{row.actualOpeningDate || "—"}</td>
                      <td className="py-2.5 px-3">{row.plannedAwardDate || "—"}</td>
                      <td className="py-2.5 px-3">{row.actualAwardDate || "—"}</td>
                      <td className="py-2.5 px-3">{row.plannedSignatureDate || "—"}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-800">{row.actualSignatureDate || "—"}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                    <th className="py-3 px-3">Activity Ref</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Project</th>
                    <th className="py-3 px-3">Officer</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">Stage</th>
                    <th className="py-3 px-3">Baseline Target</th>
                    <th className="py-3 px-3">Revised Target</th>
                    <th className="py-3 px-3">Actual Date</th>
                    <th className="py-3 px-3 font-mono text-right">Variance Days</th>
                    <th className="py-3 px-3 font-mono text-right">Delay Days</th>
                    <th className="py-3 px-3">Stage Status</th>
                    <th className="py-3 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {planVsActualRows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">{row.refNo}</td>
                      <td className="py-2.5 px-3 max-w-[160px] truncate" title={row.description}>
                        {row.description}
                      </td>
                      <td className="py-2.5 px-3 font-medium">{row.project}</td>
                      <td className="py-2.5 px-3">{row.officer}</td>
                      <td className="py-2.5 px-3">{row.category}</td>
                      <td className="py-2.5 px-3">{row.method}</td>
                      <td className="py-2.5 px-3 font-semibold">{row.stage}</td>
                      <td className="py-2.5 px-3">{row.baselineDate || "—"}</td>
                      <td className="py-2.5 px-3">{row.revisedDate || "—"}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-800">{row.actualDate || "—"}</td>
                      <td className="py-2.5 px-3 font-mono text-right">{row.varianceDays || "0"}</td>
                      <td className="py-2.5 px-3 font-mono text-right font-bold text-rose-600">
                        {row.delayDays ? `${row.delayDays}d` : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {row.stageStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-[140px] truncate text-slate-500" title={row.remarks}>
                        {row.remarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        )}

        {/* 3. Procurement Step Report */}
        {activeReport === "procurement-step" && (
          <table className="w-full text-left border-collapse text-xs min-w-[900px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Activity Ref</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Review Type</th>
                <th className="py-3 px-3">Market Approach</th>
                <th className="py-3 px-3 font-mono text-right">Est Amount</th>
                <th className="py-3 px-3">Stage</th>
                <th className="py-3 px-3">Planned Date</th>
                <th className="py-3 px-3">Revised Date</th>
                <th className="py-3 px-3">Actual Date</th>
                <th className="py-3 px-3">Stage Status</th>
                <th className="py-3 px-3 font-mono text-right">Delay Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stepReportRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">{row.refNo}</td>
                  <td className="py-2.5 px-3 max-w-[160px] truncate" title={row.description}>
                    {row.description}
                  </td>
                  <td className="py-2.5 px-3 font-medium">{row.project}</td>
                  <td className="py-2.5 px-3">{row.category}</td>
                  <td className="py-2.5 px-3">{row.method}</td>
                  <td className="py-2.5 px-3">{row.reviewType || "Post"}</td>
                  <td className="py-2.5 px-3">{row.marketApproach || "Open"}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right">
                    {row.currency} {row.estimatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{row.stage}</td>
                  <td className="py-2.5 px-3">{row.plannedDate || "—"}</td>
                  <td className="py-2.5 px-3">{row.revisedDate || "—"}</td>
                  <td className="py-2.5 px-3">{row.actualDate || "—"}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {row.stageStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right font-bold text-rose-600">
                    {row.delayDays ? `${row.delayDays}d` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 4. Delayed Procurement */}
        {activeReport === "delayed-procurement" && (
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Activity Ref</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Officer</th>
                <th className="py-3 px-3">Delayed Stage</th>
                <th className="py-3 px-3">Effective Target</th>
                <th className="py-3 px-3 font-mono text-right">Delay (Days)</th>
                <th className="py-3 px-3">Funding Source</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {delayedProcurementRows.map((row: any) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">{row.refNo}</td>
                  <td className="py-2.5 px-3 max-w-[180px] truncate" title={row.description}>
                    {row.description}
                  </td>
                  <td className="py-2.5 px-3 font-medium">{row.project}</td>
                  <td className="py-2.5 px-3">{row.method}</td>
                  <td className="py-2.5 px-3">{row.officer}</td>
                  <td className="py-2.5 px-3 font-bold text-rose-700">
                    {row.delayedStage || row.currentOverdueStage || "Overdue Stage"}
                  </td>
                  <td className="py-2.5 px-3 font-mono">{row.effectiveTargetDate}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-rose-600 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {row.delayDays} Days
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{row.fundingSource}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {row.status || "Delayed"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 max-w-[150px] truncate text-slate-500" title={row.remarks || row.replanningReason}>
                    {row.remarks || row.replanningReason || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 5. Monthly Summary or Monthly Procurement */}
        {(activeReport === "monthly-procurement" || activeReport === "monthly-summary") && (
          <table className="w-full text-left border-collapse text-xs min-w-[900px]">
            {/* If rows are in aggregated format with monthYear and packageCount */}
            {effectiveMonthlyRows[0]?.packageCount !== undefined ? (
              <>
                <thead>
                  <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                    <th className="py-3 px-3">Month</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Procurement Method</th>
                    <th className="py-3 px-3">Funding Type</th>
                    <th className="py-3 px-3 font-mono">Package Count</th>
                    <th className="py-3 px-3 font-mono">
                      Total Value ({effectiveMonthlyRows[0]?.currency || "USD"})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {effectiveMonthlyRows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{row.monthYear}</td>
                      <td className="py-2.5 px-3">{row.category}</td>
                      <td className="py-2.5 px-3 font-medium">{row.method}</td>
                      <td className="py-2.5 px-3">{row.fundingType}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">{row.packageCount} items</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {row.currency} {Number(row.totalAmountETB || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                    <th className="py-3 px-3">Reporting Month</th>
                    <th className="py-3 px-3">Activity Ref</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Project</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">Officer</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Completed Achievement</th>
                    <th className="py-3 px-3 font-mono text-right">Value</th>
                    <th className="py-3 px-3">Delay</th>
                    <th className="py-3 px-3">Next Scheduled Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {effectiveMonthlyRows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{row.reportingMonth || row.monthYear}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">{row.refNo || row.id}</td>
                      <td className="py-2.5 px-3 max-w-[180px] truncate" title={row.description}>
                        {row.description || "Package details"}
                      </td>
                      <td className="py-2.5 px-3">{row.project || "MoA"}</td>
                      <td className="py-2.5 px-3">{row.category}</td>
                      <td className="py-2.5 px-3">{row.method}</td>
                      <td className="py-2.5 px-3">{row.officer || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {row.status || "Ongoing"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-emerald-800">{row.achievement || "In progress"}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-right">
                        {row.value || (row.totalAmountETB ? `ETB ${row.totalAmountETB.toLocaleString()}` : "—")}
                      </td>
                      <td className="py-2.5 px-3 text-rose-600 font-semibold">{row.delay || "On Track"}</td>
                      <td className="py-2.5 px-3 max-w-[180px] truncate text-slate-600">{row.nextActivity || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        )}

        {/* 6. Quarterly Procurement Summary */}
        {activeReport === "quarterly-summary" && (
          <table className="w-full text-left border-collapse text-xs min-w-[750px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Procurement Method</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Funding Type</th>
                <th className="py-3 px-3 font-mono text-center">Package / Order Count</th>
                <th className="py-3 px-3 font-mono text-right">Total Value</th>
                <th className="py-3 px-3">Currency</th>
                <th className="py-3 px-3">Reporting Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {quarterlySummaryRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-800">{row.method}</td>
                  <td className="py-2.5 px-3">{row.category}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800">
                      {row.fundingType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-center">{row.packageCount}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right">
                    {row.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{row.currency}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-600">{row.reportingPeriod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 7. Quarterly Detailed Procurement or Detailed Procurement */}
        {(activeReport === "quarterly-detailed" || activeReport === "detailed-procurement") && (
          <table className="w-full text-left border-collapse text-xs min-w-[900px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">No.</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Winning Supplier</th>
                <th className="py-3 px-3 font-mono text-right">Award Amount</th>
                <th className="py-3 px-3">Budget Type</th>
                <th className="py-3 px-3">Funding Source</th>
                <th className="py-3 px-3 font-mono">PO / PV Number</th>
                <th className="py-3 px-3">Receipt / Delivery Status</th>
                <th className="py-3 px-3">Completion Date</th>
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3">Officer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {effectiveQuarterlyDetailed.map((row: any, idx) => (
                <tr key={row.id || idx} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono">{row.rowNo || idx + 1}</td>
                  <td className="py-2.5 px-3 max-w-[200px] truncate font-medium" title={row.description}>
                    {row.description}
                  </td>
                  <td className="py-2.5 px-3">{row.method}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{row.winnerSupplier}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-emerald-800">
                    {row.currency || "ETB"} {Number(row.awardedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3">{row.budgetType || "Capital"}</td>
                  <td className="py-2.5 px-3">{row.fundingSource}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold">{row.poPvNumber || "—"}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {row.receiptStatus || row.status || "Completed"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{row.completionDate || "—"}</td>
                  <td className="py-2.5 px-3">{row.project}</td>
                  <td className="py-2.5 px-3">{row.officer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 8. Contract Register */}
        {activeReport === "contract-register" && (
          <table className="w-full text-left border-collapse text-xs min-w-[1000px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Contract No</th>
                <th className="py-3 px-3">Activity Ref</th>
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3">Supplier / Contractor</th>
                <th className="py-3 px-3">Region</th>
                <th className="py-3 px-3">Currency</th>
                <th className="py-3 px-3 font-mono text-right">Original Amount</th>
                <th className="py-3 px-3 font-mono text-right">Amendments</th>
                <th className="py-3 px-3 font-mono text-right">Current Amount</th>
                <th className="py-3 px-3 font-mono text-right">Total Paid</th>
                <th className="py-3 px-3 font-mono text-right">Balance</th>
                <th className="py-3 px-3">Signature Date</th>
                <th className="py-3 px-3">Target Completion</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {contractRegisterRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">{row.contractNo}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold">{row.refNo}</td>
                  <td className="py-2.5 px-3">{row.project}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{row.supplierName}</td>
                  <td className="py-2.5 px-3">{row.region}</td>
                  <td className="py-2.5 px-3 font-semibold">{row.currency}</td>
                  <td className="py-2.5 px-3 font-mono text-right">
                    {row.originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right text-blue-700">
                    {row.amendmentAmount !== 0
                      ? row.amendmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : "0.00"}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900">
                    {row.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-emerald-700">
                    {row.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-amber-700">
                    {row.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3">{row.signatureDate || "—"}</td>
                  <td className="py-2.5 px-3">{row.revisedCompletionDate || row.plannedCompletionDate || "—"}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {row.contractStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 9. Contract & Payment Status */}
        {activeReport === "contract-payment" && (
          <table className="w-full text-left border-collapse text-xs min-w-[1050px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Contract No</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3">Currency</th>
                <th className="py-3 px-3 font-mono text-right">Current Amount</th>
                <th className="py-3 px-3 font-mono text-right">Advance</th>
                <th className="py-3 px-3 font-mono text-right">1st Interim</th>
                <th className="py-3 px-3 font-mono text-right">2nd Interim</th>
                <th className="py-3 px-3 font-mono text-right">Final</th>
                <th className="py-3 px-3 font-mono text-right">Retention</th>
                <th className="py-3 px-3 font-mono text-right">Total Paid</th>
                <th className="py-3 px-3 font-mono text-right">Balance</th>
                <th className="py-3 px-3 font-mono text-center">Payment %</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {contractPaymentRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">{row.contractNo}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{row.supplierName}</td>
                  <td className="py-2.5 px-3 font-semibold">{row.currency}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900">
                    {row.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right">{row.advance > 0 ? row.advance.toLocaleString() : "—"}</td>
                  <td className="py-2.5 px-3 font-mono text-right">{row.interim1 > 0 ? row.interim1.toLocaleString() : "—"}</td>
                  <td className="py-2.5 px-3 font-mono text-right">{row.interim2 > 0 ? row.interim2.toLocaleString() : "—"}</td>
                  <td className="py-2.5 px-3 font-mono text-right">{row.finalPayment > 0 ? row.finalPayment.toLocaleString() : "—"}</td>
                  <td className="py-2.5 px-3 font-mono text-right">{row.retentionPayment > 0 ? row.retentionPayment.toLocaleString() : "—"}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-emerald-700">
                    {row.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-amber-700">
                    {row.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-center text-[#0A3C2F]">
                    {row.paymentPct}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {row.contractStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 10. Regional / Sector Summary */}
        {activeReport === "regional-sector-summary" && (
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Organization / Sector / Region</th>
                <th className="py-3 px-3 font-mono text-center">Total Activities</th>
                <th className="py-3 px-3 font-mono text-center">Completed</th>
                <th className="py-3 px-3 font-mono text-center">Ongoing</th>
                <th className="py-3 px-3 font-mono text-center">Delayed</th>
                <th className="py-3 px-3 font-mono text-right">Estimated Amount (ETB)</th>
                <th className="py-3 px-3 font-mono text-right">Contracted (ETB)</th>
                <th className="py-3 px-3 font-mono text-right">Paid (ETB)</th>
                <th className="py-3 px-3 font-mono text-right">Balance (ETB)</th>
                <th className="py-3 px-3 font-mono text-center">Progress %</th>
                <th className="py-3 px-3">Delay Measure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {regionalSectorRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-800">{row.organizationUnit}</td>
                  <td className="py-2.5 px-3 font-mono text-center font-bold">{row.totalActivities}</td>
                  <td className="py-2.5 px-3 font-mono text-center text-emerald-700">{row.completed}</td>
                  <td className="py-2.5 px-3 font-mono text-center text-blue-700">{row.ongoing}</td>
                  <td className="py-2.5 px-3 font-mono text-center text-rose-700 font-bold">{row.delayed}</td>
                  <td className="py-2.5 px-3 font-mono text-right">{row.estimatedAmount.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-mono text-right">{row.contractedAmount.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-mono text-right text-emerald-800">{row.paidAmount.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-mono text-right font-bold text-amber-700">{row.remainingBalance.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-mono text-center font-bold text-[#0A3C2F]">{row.progressPct}</td>
                  <td className="py-2.5 px-3 font-medium text-rose-600">{row.delayMeasure}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 11. Project Summary */}
        {activeReport === "project-summary" && (
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Project Code & Name</th>
                <th className="py-3 px-3 font-mono text-center">Packages</th>
                <th className="py-3 px-3 font-mono text-center">Completed</th>
                <th className="py-3 px-3 font-mono text-center">Ongoing</th>
                <th className="py-3 px-3 font-mono text-center">Delayed</th>
                <th className="py-3 px-3 font-mono text-right">Estimated Amount (ETB)</th>
                <th className="py-3 px-3 font-mono text-right">Contracted Amount (ETB)</th>
                <th className="py-3 px-3 font-mono text-right">Paid Amount (ETB)</th>
                <th className="py-3 px-3 font-mono text-right">Remaining Balance (ETB)</th>
                <th className="py-3 px-3 font-mono text-center">Progress %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {projectSummaryRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-800">{row.projectCodeAndName}</td>
                  <td className="py-2.5 px-3 font-mono text-center font-bold">{row.totalActivities}</td>
                  <td className="py-2.5 px-3 font-mono text-center text-emerald-700">{row.completed}</td>
                  <td className="py-2.5 px-3 font-mono text-center text-blue-700">{row.ongoing}</td>
                  <td className="py-2.5 px-3 font-mono text-center text-rose-700 font-bold">{row.delayed}</td>
                  <td className="py-2.5 px-3 font-mono text-right">{row.estimatedAmount.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-900">{row.contractedAmount.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-mono text-right font-bold text-emerald-800">{row.paidAmount.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-mono text-right font-bold text-amber-700">{row.remainingBalance.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-mono text-center font-bold text-[#0A3C2F]">{row.currentProgress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 12. Officer Summary or Project & Officer Summary */}
        {(activeReport === "officer-summary" || activeReport === "project-officer") && (
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            {/* If rows are in ProjectOfficerSummaryRow format */}
            {effectiveOfficerRows[0]?.projectCode !== undefined ? (
              <>
                <thead>
                  <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                    <th className="py-3 px-3">Project Code</th>
                    <th className="py-3 px-3">Assigned Officer</th>
                    <th className="py-3 px-3 font-mono">Total Plans</th>
                    <th className="py-3 px-3 font-mono">Total Activities</th>
                    <th className="py-3 px-3 font-mono">Total Budget (ETB)</th>
                    <th className="py-3 px-3 font-mono">Approved Plans</th>
                    <th className="py-3 px-3 font-mono">Delayed Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {effectiveOfficerRows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">
                        {row.projectCode}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {row.officerName}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold">
                        {row.totalPlans}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold">
                        {row.totalActivities}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        ETB {Number(row.totalBudgetETB || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                        {row.approvedCount}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-700">
                        {row.delayedCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                    <th className="py-3 px-3">Responsible Officer</th>
                    <th className="py-3 px-3 font-mono text-center">Assigned Activities</th>
                    <th className="py-3 px-3 font-mono text-center">Completed</th>
                    <th className="py-3 px-3 font-mono text-center">Ongoing</th>
                    <th className="py-3 px-3 font-mono text-center">Delayed</th>
                    <th className="py-3 px-3">Active Stage Distribution</th>
                    <th className="py-3 px-3 font-mono text-right">Estimated (ETB)</th>
                    <th className="py-3 px-3 font-mono text-right">Contracted (ETB)</th>
                    <th className="py-3 px-3 font-mono text-right">Paid (ETB)</th>
                    <th className="py-3 px-3 font-mono text-right">Balance (ETB)</th>
                    <th className="py-3 px-3 font-mono text-right">Delay Measure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {effectiveOfficerRows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{row.officerName}</td>
                      <td className="py-2.5 px-3 font-mono text-center font-bold">{row.assignedActivities || row.totalActivities}</td>
                      <td className="py-2.5 px-3 font-mono text-center text-emerald-700">{row.completed || row.approvedCount || 0}</td>
                      <td className="py-2.5 px-3 font-mono text-center text-blue-700">{row.ongoing || 0}</td>
                      <td className="py-2.5 px-3 font-mono text-center text-rose-700 font-bold">{row.delayed || row.delayedCount || 0}</td>
                      <td className="py-2.5 px-3 text-slate-600">{row.currentStages || "General"}</td>
                      <td className="py-2.5 px-3 font-mono text-right">{Number(row.estimatedAmount || row.totalBudgetETB || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono text-right">{Number(row.contractedAmount || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono text-right text-emerald-800">{Number(row.paidAmount || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono text-right font-bold text-amber-700">{Number(row.remainingBalance || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-medium text-rose-600 text-right">{row.delayMeasure || `${row.delayed || 0} overdue`}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        )}

        {/* 13. Committee / Approval Progress */}
        {activeReport === "committee-approval" && (
          <table className="w-full text-left border-collapse text-xs min-w-[900px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Plan Title</th>
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3">Responsible Officer</th>
                <th className="py-3 px-3">Submitted Date</th>
                <th className="py-3 px-3">Director Decision</th>
                <th className="py-3 px-3">Director Comment</th>
                <th className="py-3 px-3 font-mono text-center text-emerald-700">Approvals</th>
                <th className="py-3 px-3 font-mono text-center text-rose-700">Rejections</th>
                <th className="py-3 px-3 font-mono text-center text-slate-500">Pending</th>
                <th className="py-3 px-3">Committee Result</th>
                <th className="py-3 px-3">Management Decision</th>
                <th className="py-3 px-3">Current Plan Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {committeeApprovalRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{row.planTitle}</td>
                  <td className="py-2.5 px-3">{row.project}</td>
                  <td className="py-2.5 px-3">{row.officer}</td>
                  <td className="py-2.5 px-3 font-mono">{row.submittedDate}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.directorDecision === "FORWARDED_TO_COMMITTEE"
                          ? "bg-emerald-100 text-emerald-800"
                          : row.directorDecision === "RETURNED_FOR_REVISION"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.directorDecision}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 max-w-[150px] truncate text-slate-500" title={row.directorComment}>
                    {row.directorComment || "—"}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-center text-emerald-700 bg-emerald-50/50">
                    {row.committeeApprovals}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-center text-rose-700 bg-rose-50/50">
                    {row.committeeRejections}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-center text-slate-500">
                    {row.pendingVotes}
                  </td>
                  <td className="py-2.5 px-3 font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.committeeResult === "ENDORSED"
                          ? "bg-emerald-100 text-emerald-800"
                          : row.committeeResult === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {row.committeeResult}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.managementDecision === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : row.managementDecision === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.managementDecision}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{row.currentPlanStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 14. Supplier Performance */}
        {activeReport === "supplier-performance" && (
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Supplier / Contractor Name</th>
                <th className="py-3 px-3 font-mono">TIN Number</th>
                <th className="py-3 px-3 font-mono text-center">Total Contracts</th>
                <th className="py-3 px-3 font-mono text-center">Active Contracts</th>
                <th className="py-3 px-3 font-mono text-center text-emerald-700">On-Time Deliveries</th>
                <th className="py-3 px-3 font-mono text-center text-rose-700">Delayed Deliveries</th>
                <th className="py-3 px-3 font-mono text-right">Total Award (ETB)</th>
                <th className="py-3 px-3 font-mono text-right">Total Paid (ETB)</th>
                <th className="py-3 px-3 font-mono text-right">Balance (ETB)</th>
                <th className="py-3 px-3 font-mono text-center">Compliance %</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {supplierPerformanceRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{row.supplierName}</td>
                  <td className="py-2.5 px-3 font-mono">{row.tinNumber}</td>
                  <td className="py-2.5 px-3 font-mono text-center font-bold">{row.totalContracts}</td>
                  <td className="py-2.5 px-3 font-mono text-center text-blue-700">{row.activeContracts}</td>
                  <td className="py-2.5 px-3 font-mono text-center font-bold text-emerald-700">{row.completedOnTime}</td>
                  <td className="py-2.5 px-3 font-mono text-center font-bold text-rose-700">{row.completedDelayed}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900">
                    {row.totalAwardValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-emerald-800">
                    {row.totalPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-amber-700">
                    {row.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-center text-[#0A3C2F]">
                    {row.compliancePct}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Empty State when 0 rows match filters */}
        {rowCount === 0 && (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
              <Inbox className="h-6 w-6" />
            </div>
            <h5 className="text-sm font-bold text-slate-800">
              No matching records
            </h5>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              No data matches your active filter selection for {currentReportTitle}. Try adjusting or clearing your filters to see more results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
