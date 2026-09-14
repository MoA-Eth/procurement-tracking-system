"use client";

import { type ReportType, REPORT_LIST } from "../types";
import {
  type AnnualPlanReportRow,
  type PlanVsActualReportRow,
  type StepReportRow,
  type DelayedProcurementRow,
  type MonthlySummaryRow,
  type ContractPaymentReportRow,
  type DetailedProcurementRow,
  type ProjectOfficerSummaryRow,
} from "../reportsData";
import { Inbox } from "lucide-react";

export interface ReportTablesProps {
  activeReport: ReportType;
  annualPlanRows: AnnualPlanReportRow[];
  planVsActualRows: PlanVsActualReportRow[];
  stepReportRows: StepReportRow[];
  delayedProcurementRows: DelayedProcurementRow[];
  monthlySummaryRows: MonthlySummaryRow[];
  contractPaymentRows: ContractPaymentReportRow[];
  detailedProcurementRows: DetailedProcurementRow[];
  projectOfficerRows: ProjectOfficerSummaryRow[];
}

export function ReportTables({
  activeReport,
  annualPlanRows,
  planVsActualRows,
  stepReportRows,
  delayedProcurementRows,
  monthlySummaryRows,
  contractPaymentRows,
  detailedProcurementRows,
  projectOfficerRows,
}: ReportTablesProps) {
  const currentReportTitle = REPORT_LIST.find(
    (r) => r.id === activeReport,
  )?.label;

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
      case "monthly-summary":
        return monthlySummaryRows.length;
      case "contract-payment":
        return contractPaymentRows.length;
      case "detailed-procurement":
        return detailedProcurementRows.length;
      case "project-officer":
        return projectOfficerRows.length;
      default:
        return 0;
    }
  };

  const rowCount = getRowCount();

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden max-w-full">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900">
          {currentReportTitle} Output
        </h4>
        <span className="text-xs font-semibold text-slate-500">
          Displaying {rowCount} filtered result{rowCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto w-full max-w-full">
        {/* 1. Annual Procurement Plan Table */}
        {activeReport === "annual-plan" && (
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3">Plan Name</th>
                <th className="py-3 px-3">Activity Ref</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3 font-mono">Est Amount</th>
                <th className="py-3 px-3">Funding Source</th>
                <th className="py-3 px-3">Officer</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {annualPlanRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">
                    {row.projectCode}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 max-w-xs wrap-break-word">
                    <p className="wrap-break-word line-clamp-2">
                      {row.planName}
                    </p>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{row.refNo}</td>
                  <td className="py-2.5 px-3 max-w-xs wrap-break-word">
                    <p className="wrap-break-word line-clamp-2">
                      {row.description}
                    </p>
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{row.category}</td>
                  <td className="py-2.5 px-3 font-bold text-[#0A3C2F]">
                    {row.method}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {row.currency} {row.estimatedAmount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">{row.fundingSource}</td>
                  <td className="py-2.5 px-3 font-medium">{row.officer}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 2. Plan vs Actual Table */}
        {activeReport === "plan-vs-actual" && (
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Activity Ref</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3 font-mono">Plan Advert</th>
                <th className="py-3 px-3 font-mono">Actual Advert</th>
                <th className="py-3 px-3 font-mono">Plan Award</th>
                <th className="py-3 px-3 font-mono">Actual Award</th>
                <th className="py-3 px-3 font-mono">Plan Signed</th>
                <th className="py-3 px-3 font-mono">Actual Signed</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {planVsActualRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">
                    {row.refNo}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 max-w-xs wrap-break-word">
                    <p className="wrap-break-word line-clamp-2">
                      {row.description}
                    </p>
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{row.method}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {row.plannedAdvertisingDate}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                    {row.actualAdvertisingDate}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {row.plannedAwardDate}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                    {row.actualAwardDate}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {row.plannedSignatureDate}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                    {row.actualSignatureDate}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 3. Procurement STEP Report Table */}
        {activeReport === "procurement-step" && (
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Activity Ref</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Market Approach</th>
                <th className="py-3 px-3">Review Type</th>
                <th className="py-3 px-3 font-mono">Estimated Amount</th>
                <th className="py-3 px-3">Process / Stage</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stepReportRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">
                    {row.refNo}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 max-w-xs wrap-break-word">
                    <p className="wrap-break-word line-clamp-2">
                      {row.description}
                    </p>
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{row.category}</td>
                  <td className="py-2.5 px-3 font-bold text-[#0A3C2F]">
                    {row.method}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-700">
                    {row.marketApproach}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {row.reviewType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    ETB {row.estimatedAmount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-600">
                    {row.processStatus}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">
                    {row.activityStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 4. Delayed Procurement Table */}
        {activeReport === "delayed-procurement" && (
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Activity Ref</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Current Overdue Stage</th>
                <th className="py-3 px-3 font-mono">Target Date</th>
                <th className="py-3 px-3 font-mono">Delay Days</th>
                <th className="py-3 px-3">Replanning Reason</th>
                <th className="py-3 px-3">Officer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {delayedProcurementRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">
                    {row.refNo}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 max-w-xs wrap-break-word">
                    <p className="wrap-break-word line-clamp-2">
                      {row.description}
                    </p>
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{row.method}</td>
                  <td className="py-2.5 px-3 font-semibold text-rose-800">
                    {row.currentOverdueStage}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {row.effectiveTargetDate}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-extrabold text-rose-700">
                    {row.delayDays} Days
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 italic max-w-xs wrap-break-word">
                    <p className="wrap-break-word line-clamp-2">
                      &quot;{row.replanningReason}&quot;
                    </p>
                  </td>
                  <td className="py-2.5 px-3 font-medium">{row.officer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 5. Monthly Summary Table */}
        {activeReport === "monthly-summary" && (
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Month / Period</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Primary Method</th>
                <th className="py-3 px-3">Funding Type</th>
                <th className="py-3 px-3 font-mono">Packages Count</th>
                <th className="py-3 px-3 font-mono">
                  Total Value ({monthlySummaryRows[0]?.currency || "ETB"})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {monthlySummaryRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    {row.monthYear}
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{row.category}</td>
                  <td className="py-2.5 px-3 font-bold text-[#0A3C2F]">
                    {row.method}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {row.fundingType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                    {row.packageCount} item{row.packageCount === 1 ? "" : "s"}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-extrabold text-slate-950">
                    {row.currency || "ETB"} {row.totalAmountETB.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 6. Contract & Payment Table */}
        {activeReport === "contract-payment" && (
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Contract No</th>
                <th className="py-3 px-3">Activity Ref</th>
                <th className="py-3 px-3">Supplier / Contractor</th>
                <th className="py-3 px-3">Region</th>
                <th className="py-3 px-3 font-mono">Original Amount</th>
                <th className="py-3 px-3 font-mono">VAT (15%)</th>
                <th className="py-3 px-3 font-mono">Final Amount</th>
                <th className="py-3 px-3 font-mono">Total Paid</th>
                <th className="py-3 px-3 font-mono">Remaining Balance</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {contractPaymentRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {row.contractNo}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#0A3C2F]">
                    {row.refNo}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 max-w-xs wrap-break-word">
                    <p className="wrap-break-word line-clamp-2">
                      {row.supplierName}
                    </p>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-600">
                    {row.region}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {row.originalContractAmount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {row.vatAmount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {row.finalContractAmount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-extrabold text-emerald-700">
                    {row.totalPaidAmount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-extrabold text-slate-950">
                    {row.remainingBalance.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">
                    {row.contractStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 7. Detailed Procurement Table */}
        {activeReport === "detailed-procurement" && (
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                <th className="py-3 px-3">Activity Ref</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Awarded Supplier</th>
                <th className="py-3 px-3 font-mono">Awarded Amount</th>
                <th className="py-3 px-3">Funding Source</th>
                <th className="py-3 px-3 font-mono">Target Completion</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {detailedProcurementRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F]">
                    {row.refNo}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 max-w-xs wrap-break-word">
                    <p className="wrap-break-word line-clamp-2">
                      {row.description}
                    </p>
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{row.category}</td>
                  <td className="py-2.5 px-3 font-bold text-[#0A3C2F]">
                    {row.method}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    {row.winnerSupplier}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {row.currency} {row.awardedAmount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">{row.fundingSource}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {row.completionDate}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 8. Project & Officer Summary Table */}
        {activeReport === "project-officer" && (
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
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
              {projectOfficerRows.map((row) => (
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
                    ETB {row.totalBudgetETB.toLocaleString()}
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
