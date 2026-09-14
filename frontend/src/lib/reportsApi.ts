/**
 * Reports API Client
 *
 * Every /api/reports/* endpoint streams back an .xlsx file (not JSON), secured
 * by cookie session (loadSession/requireAuthenticated) rather than plain JSON
 * GETs. Because of that this client can't reuse `apiClient` as-is (it always
 * does response.text() -> JSON.parse), so `downloadReportFile` below is a
 * sibling to `directApiFetch` that:
 *   - builds the URL + query string the same way apiClient does
 *   - attaches the in-memory Bearer token (if present) AND credentials:
 *     "include" for the cookie session, matching what the backend expects
 *   - reads the response as a Blob instead of text/JSON
 *   - pulls the filename out of the Content-Disposition header
 *   - triggers a browser download
 *
 * Each report function below just supplies the path + typed query params.
 */

import { authTokenManager } from "./authTokenManager";
import { ApiClientError, BACKEND_API_URL } from "./apiClient";

// ─── Shared types ────────────────────────────────────────────────────────────

/** Every report endpoint supports pagination on its Excel export. */
export interface ReportPagination {
  page?: number;
  limit?: number;
}

export interface DownloadedReport {
  blob: Blob;
  filename: string;
}

// ─── Per-report query param types (from reports.routes.ts) ────────────────────

/** Report #1 — Annual Procurement Plan */
export interface AnnualPlanQuery extends ReportPagination {
  budgetYear: string; // required
  projectId?: string;
  planId?: string;
  category?: string;
  methodId?: string;
  fundingSourceId?: string;
  region?: string;
  officerId?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
}

/** Report #2 — Plan vs Actual */
export interface PlanVsActualQuery extends ReportPagination {
  projectId?: string;
  planId?: string;
  budgetYear?: string;
  category?: string;
  methodId?: string;
  officerId?: string;
  region?: string;
  fundingSourceId?: string;
  stageTypeId?: string;
  stageStatus?: string;
  performanceStatus?: "ON_TIME" | "DELAYED";
  dateFrom?: string;
  dateTo?: string;
}

/** Report #3 — Procurement STEP Report */
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
  dateFrom?: string;
  dateTo?: string;
}

/** Report #4 — Delayed Procurement */
export interface DelayedProcurementQuery extends ReportPagination {
  projectId?: string;
  planId?: string;
  category?: string;
  methodId?: string;
  officerId?: string;
  region?: string;
  fundingSourceId?: string;
  activityStatus?: string;
  stageTypeId?: string;
  minDelayDays?: number;
  delayBucket?: "1-7" | "8-30" | "31-60" | "60+";
  dateFrom?: string;
  dateTo?: string;
}

/** Report #5 — Monthly Summary (Director only) */
export interface MonthlySummaryQuery extends ReportPagination {
  year: number; // required
  quarter?: 1 | 2 | 3 | 4;
  projectId?: string;
  category?: string;
  methodId?: string;
  fundingSourceId?: string;
  region?: string;
  officerId?: string;
}

/** Report #6 — Contract & Payment (Director only) */
export interface ContractPaymentQuery extends ReportPagination {
  projectId?: string;
  planId?: string;
  activityId?: string;
  supplierId?: string;
  region?: string;
  officerId?: string;
  contractStatus?: string;
  paymentStatus?: string;
  fundingSourceId?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
}

/** Report #7 — Detailed Procurement */
export interface DetailedProcurementQuery extends ReportPagination {
  projectId?: string;
  planId?: string;
  activityId?: string;
  category?: string;
  methodId?: string;
  marketApproach?: string;
  reviewType?: string;
  fundingSourceId?: string;
  region?: string;
  officerId?: string;
  supplierId?: string;
  contractStatus?: string;
  activityStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Report #8 — Project & Officer Summary (Director only) */
export interface ProjectOfficerSummaryQuery extends ReportPagination {
  projectId?: string;
  officerId?: string;
  region?: string;
  budgetYear?: string;
  category?: string;
  methodId?: string;
  fundingSourceId?: string;
  status?: string;
}

/** Report #9 — Activity Milestone Report */
export interface ActivityMilestoneQuery extends ReportPagination {
  projectId?: string;
  planId?: string;
  budgetYear?: string;
  category?: string;
  methodId?: string;
  marketApproach?: string;
  reviewType?: string;
  fundingSourceId?: string;
  officerId?: string;
  activityStatus?: string;
  contractStatus?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Core download helper ──────────────────────────────────────────────────

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
  // Handles both filename="x.xlsx" and filename*=UTF-8''x.xlsx
  const starMatch = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);
  if (starMatch?.[1]) {
    try {
      return decodeURIComponent(starMatch[1].replace(/["']/g, "").trim());
    } catch {
      // fall through to plain match
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(disposition);
  return plainMatch?.[1]?.trim() || fallback;
}

/**
 * Downloads a report file as a Blob. Mirrors apiClient's URL-building, auth
 * (Bearer + cookie), and error handling, but reads the body as a Blob instead
 * of JSON, since every /reports/* route streams an .xlsx file.
 */
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
    // Errors (403 director-only, 400 validation, etc.) come back as JSON.
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
      // response body wasn't JSON; keep default message
    }
    throw new ApiClientError(message, response.status, data);
  }

  const blob = await response.blob();
  const filename = extractFilename(response, fallbackFilename);
  return { blob, filename };
}

/** Triggers a browser "Save As" for an already-downloaded report blob. */
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

/** Convenience: download + immediately trigger the browser save prompt. */
async function downloadAndSave(
  path: string,
  query: object,
  fallbackFilename: string,
): Promise<DownloadedReport> {
  const report = await downloadReportFile(path, query, fallbackFilename);
  saveReportFile(report);
  return report;
}

// ─── Per-report exports ─────────────────────────────────────────────────────

/** Report #1 — Annual Procurement Plan */
export function downloadAnnualProcurementPlanReport(
  query: AnnualPlanQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/annual-procurement-plan",
    query,
    `annual_procurement_plan_${query.budgetYear}.xlsx`,
  );
}

/** Report #2 — Plan vs Actual */
export function downloadPlanVsActualReport(
  query: PlanVsActualQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/plan-vs-actual",
    query,
    "plan_vs_actual.xlsx",
  );
}

/** Report #3 — Procurement STEP Report */
export function downloadProcurementStepsReport(
  query: ProcurementStepsQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/procurement-steps",
    query,
    "procurement_steps.xlsx",
  );
}

/** Report #4 — Delayed Procurement */
export function downloadDelayedProcurementReport(
  query: DelayedProcurementQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/delayed-procurement",
    query,
    "delayed_procurement.xlsx",
  );
}

/** Report #5 — Monthly Summary (Director only) */
export function downloadMonthlySummaryReport(
  query: MonthlySummaryQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/monthly-summary",
    query,
    `monthly_summary_${query.year}.xlsx`,
  );
}

/** Report #6 — Contract & Payment (Director only) */
export function downloadContractPaymentReport(
  query: ContractPaymentQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/contract-payment",
    query,
    "contract_payment.xlsx",
  );
}

/** Report #7 — Detailed Procurement */
export function downloadDetailedProcurementReport(
  query: DetailedProcurementQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/detailed-procurement",
    query,
    "detailed_procurement.xlsx",
  );
}

/** Report #8 — Project & Officer Summary (Director only) */
export function downloadProjectOfficerSummaryReport(
  query: ProjectOfficerSummaryQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/project-officer-summary",
    query,
    "project_officer_summary.xlsx",
  );
}

/** Report #9 — Activity Milestone Report */
export function downloadActivityMilestoneReport(
  query: ActivityMilestoneQuery,
): Promise<DownloadedReport> {
  return downloadAndSave(
    "/reports/activity-milestone",
    query,
    "activity_milestone.xlsx",
  );
}
