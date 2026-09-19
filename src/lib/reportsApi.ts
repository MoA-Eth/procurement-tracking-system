/**
 * Reports API Client
 *
 * Every /api/reports/* endpoint streams back an .xlsx file, secured
 * by cookie session (loadSession/requireAuthenticated) with Bearer fallback.
 */

import { authTokenManager } from "./authTokenManager";
import { ApiClientError, BACKEND_API_URL } from "./apiClient";

// ─── Shared types ────────────────────────────────────────────────────────────

export interface ReportPagination {
  page?: number;
  limit?: number;
}

export interface DownloadedReport {
  blob: Blob;
  filename: string;
}

// ─── Query Interfaces ────────────────────────────────────────────────────────

export interface AnnualPlanQuery extends ReportPagination {
  budgetYear?: string;
  fiscalYear?: string;
  projectId?: string;
  planId?: string;
  category?: string;
  methodId?: string;
  fundingSourceId?: string;
  region?: string;
  sector?: string;
  officerId?: string;
  status?: string;
  currency?: string;
}

export interface PlanVsActualQuery extends ReportPagination {
  projectId?: string;
  planId?: string;
  budgetYear?: string;
  category?: string;
  methodId?: string;
  officerId?: string;
  region?: string;
  sector?: string;
  fundingSourceId?: string;
  stageTypeId?: string;
  stageStatus?: string;
  performanceStatus?: "ON_TIME" | "DELAYED";
  dateFrom?: string;
  dateTo?: string;
}

export interface ProcurementStepsQuery extends ReportPagination {
  projectId?: string;
  planId?: string;
  category?: string;
  methodId?: string;
  marketApproach?: string;
  reviewType?: string;
  fundingSourceId?: string;
  officerId?: string;
  activityStatus?: string;
  stageTypeId?: string;
  stageStatus?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DelayedProcurementQuery extends ReportPagination {
  budgetYear?: string;
  fiscalYear?: string;
  projectId?: string;
  planId?: string;
  category?: string;
  methodId?: string;
  officerId?: string;
  region?: string;
  sector?: string;
  fundingSourceId?: string;
  activityStatus?: string;
  stageTypeId?: string;
  minDelayDays?: number;
  delayBucket?: "1-7" | "8-30" | "31-60" | "60+";
  dateFrom?: string;
  dateTo?: string;
}

export interface MonthlyProcurementQuery extends ReportPagination {
  year?: number;
  month?: number;
  budgetYear?: string;
  fiscalYear?: string;
  projectId?: string;
  sector?: string;
  region?: string;
  category?: string;
  methodId?: string;
  fundingSourceId?: string;
  officerId?: string;
  status?: string;
}

export interface QuarterlySummaryQuery extends ReportPagination {
  quarter?: number;
  periodType?: "QUARTER" | "SIX_MONTH" | "SEVEN_MONTH" | "ANNUAL";
  year?: number;
  fiscalYear?: string;
  budgetYear?: string;
  projectId?: string;
  sector?: string;
  region?: string;
  fundingSourceId?: string;
  fundingType?: string;
  category?: string;
  methodId?: string;
}

export interface QuarterlyDetailedQuery extends ReportPagination {
  quarter?: number;
  year?: number;
  fiscalYear?: string;
  projectId?: string;
  planId?: string;
  region?: string;
  category?: string;
  methodId?: string;
  fundingSourceId?: string;
  officerId?: string;
  supplierId?: string;
  contractStatus?: string;
  activityStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ContractRegisterQuery extends ReportPagination {
  projectId?: string;
  sector?: string;
  region?: string;
  supplierId?: string;
  officerId?: string;
  currency?: string;
  contractStatus?: string;
  methodId?: string;
  fundingSourceId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ContractPaymentQuery extends ReportPagination {
  projectId?: string;
  planId?: string;
  activityId?: string;
  supplierId?: string;
  region?: string;
  sector?: string;
  officerId?: string;
  contractStatus?: string;
  paymentStatus?: string;
  fundingSourceId?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface RegionalSectorSummaryQuery extends ReportPagination {
  fiscalYear?: string;
  budgetYear?: string;
  groupBy?: "REGION" | "SECTOR" | "ORGANIZATION";
  projectId?: string;
  fundingSourceId?: string;
  status?: string;
  category?: string;
  methodId?: string;
  currency?: string;
}

export interface ProjectSummaryQuery extends ReportPagination {
  fiscalYear?: string;
  budgetYear?: string;
  projectId?: string;
  region?: string;
  sector?: string;
  fundingSourceId?: string;
  category?: string;
  methodId?: string;
  status?: string;
  currency?: string;
}

export interface OfficerSummaryQuery extends ReportPagination {
  fiscalYear?: string;
  budgetYear?: string;
  officerId?: string;
  projectId?: string;
  sector?: string;
  region?: string;
  status?: string;
  category?: string;
  methodId?: string;
  currency?: string;
}

export interface CommitteeApprovalQuery extends ReportPagination {
  fiscalYear?: string;
  budgetYear?: string;
  projectId?: string;
  officerId?: string;
  planStatus?: string;
  directorDecision?: string;
  committeeResult?: string;
  managementDecision?: string;
}

export interface SupplierPerformanceQuery extends ReportPagination {
  supplierId?: string;
  region?: string;
  sector?: string;
  contractStatus?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Query builder & download helper ─────────────────────────────────────────

type QueryValue = string | number | boolean | undefined | null;

function buildQueryString(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, QueryValue>).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.append(key, String(value));
      }
    },
  );
  const qs = search.toString().replace(/\+/g, "%20");
  return qs ? `?${qs}` : "";
}

function extractFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get("Content-Disposition");
  if (!disposition) return fallback;
  const starMatch = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);
  if (starMatch?.[1]) {
    try {
      return decodeURIComponent(starMatch[1].replace(/["']/g, "").trim());
    } catch {
      // fallback
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(disposition);
  return plainMatch?.[1]?.trim() || fallback;
}

export async function downloadReportFile(
  path: string,
  query: object,
  fallbackFilename: string,
): Promise<DownloadedReport> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BACKEND_API_URL}${cleanPath}${buildQueryString(query)}`;

  const headers = new Headers({
    Accept:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json",
  });

  const token = authTokenManager.getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    let message =
      response.statusText || `Request failed with status ${response.status}`;
    let data: unknown;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : undefined;
      if (data && typeof data === "object") {
        const anyData = data as Record<string, unknown>;
        if (anyData.message) {
          message = Array.isArray(anyData.message)
            ? anyData.message.join(", ")
            : String(anyData.message);
        } else if (anyData.error) {
          message = String(anyData.error);
        }
      }
    } catch {
      // ignore
    }
    throw new ApiClientError(message, response.status, data);
  }

  const blob = await response.blob();
  const filename = extractFilename(response, fallbackFilename);
  return { blob, filename };
}

export function saveReportFile(report: DownloadedReport): void {
  const objectUrl = URL.createObjectURL(report.blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = report.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

async function downloadAndSave(
  path: string,
  query: object,
  fallbackFilename: string,
): Promise<DownloadedReport> {
  const report = await downloadReportFile(path, query, fallbackFilename);
  saveReportFile(report);
  return report;
}

// ─── Individual Download Methods for all 14 Reports ──────────────────────────

// 1. Annual Procurement Plan (P0)
export function downloadAnnualProcurementPlanReport(
  query: AnnualPlanQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/annual-procurement-plan",
    query,
    `annual_procurement_plan_${query.budgetYear || "all"}.xlsx`,
  );
}

// 2. Plan vs Actual Progress (P0)
export function downloadPlanVsActualReport(
  query: PlanVsActualQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/plan-vs-actual",
    query,
    "plan_vs_actual.xlsx",
  );
}

// 3. Procurement Step Report (P0)
export function downloadProcurementStepsReport(
  query: ProcurementStepsQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/procurement-steps",
    query,
    "procurement_steps.xlsx",
  );
}

// 4. Delayed Procurement Report (P0)
export function downloadDelayedProcurementReport(
  query: DelayedProcurementQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/delayed-procurement",
    query,
    "delayed_procurement.xlsx",
  );
}

// 5. Monthly Procurement Report (P0)
export function downloadMonthlyProcurementReport(
  query: MonthlyProcurementQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/monthly-procurement",
    query,
    `monthly_procurement_report_${query.year || new Date().getFullYear()}.xlsx`,
  );
}
export const downloadMonthlySummaryReport = downloadMonthlyProcurementReport;

// 6. Quarterly Procurement Summary (P0)
export function downloadQuarterlySummaryReport(
  query: QuarterlySummaryQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/quarterly-summary",
    query,
    `quarterly_procurement_summary_${query.year || new Date().getFullYear()}.xlsx`,
  );
}

// 7. Quarterly Detailed Procurement Report (P1)
export function downloadQuarterlyDetailedReport(
  query: QuarterlyDetailedQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/quarterly-detailed",
    query,
    "quarterly_detailed_procurement.xlsx",
  );
}
export const downloadDetailedProcurementReport =
  downloadQuarterlyDetailedReport;

// 8. Contract Register (P0)
export function downloadContractRegisterReport(
  query: ContractRegisterQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/contract-register",
    query,
    "contract_register.xlsx",
  );
}

// 9. Contract & Payment Status Report (P0)
export function downloadContractPaymentReport(
  query: ContractPaymentQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/contract-payment",
    query,
    "contract_payment_status.xlsx",
  );
}

// 10. Regional / Sector Summary (P0)
export function downloadRegionalSectorSummaryReport(
  query: RegionalSectorSummaryQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/regional-sector-summary",
    query,
    `regional_sector_summary_${query.groupBy?.toLowerCase() || "region"}.xlsx`,
  );
}

// 11. Project Summary (P0)
export function downloadProjectSummaryReport(
  query: ProjectSummaryQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/project-summary",
    query,
    "project_summary.xlsx",
  );
}

// 12. Officer Summary (P0)
export function downloadOfficerSummaryReport(
  query: OfficerSummaryQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/officer-summary",
    query,
    "officer_summary.xlsx",
  );
}
export const downloadProjectOfficerSummaryReport = downloadOfficerSummaryReport;

// 13. Committee / Approval Progress Report (P0)
export function downloadCommitteeApprovalReport(
  query: CommitteeApprovalQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/committee-approval",
    query,
    "committee_approval_progress.xlsx",
  );
}

// 14. Supplier Performance (P1)
export function downloadSupplierPerformanceReport(
  query: SupplierPerformanceQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/supplier-performance",
    query,
    "supplier_performance.xlsx",
  );
}
