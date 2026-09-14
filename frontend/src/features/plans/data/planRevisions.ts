/**
 * Plan & Activity Versioning and Audit History System
 *
 * Tracks full audit trail of procurement plans and activities:
 * - Version progression (e.g. v1 -> Returned -> v2 -> Returned -> v3 -> Approved)
 * - Field-level diffs (What changed, Previous value, New value)
 * - Actor information (Who changed it, Role)
 * - Timestamps and revision comments/reasons
 * - Persisted in browser storage and synced across sessions
 */

export interface FieldChange {
  field: string;
  fieldName: string;
  previousValue: string | number | boolean | null | undefined;
  newValue: string | number | boolean | null | undefined;
}

export type VersionActionType =
  | "INITIAL_DRAFT"
  | "SUBMITTED"
  | "RETURNED"
  | "PLAN_REVISED"
  | "ACTIVITY_ADDED"
  | "ACTIVITY_REVISED"
  | "ACTIVITY_DELETED"
  | "RESUBMITTED"
  | "APPROVED_DIRECTOR"
  | "SENT_TO_COMMITTEE"
  | "COMMITTEE_VOTE"
  | "FINALLY_APPROVED";

export interface PlanVersionRecord {
  id: string;
  planId: string;
  planReference: string;
  projectCode: string;
  versionNumber: number;
  action: VersionActionType;
  actionLabel: string;
  changedBy: string;
  changedByRole: string;
  changedAt: string;
  reason?: string;
  changes?: FieldChange[];
  activityReference?: string;
  activityDescription?: string;
  snapshot?: {
    planName: string;
    budgetYear: string;
    category: string;
    status: string;
    estimatedTotal: string | number;
    activitiesCount: number;
  };
}

export const PLAN_VERSIONS_STORAGE_KEY = "moa-pts:plan-versions:v1";

/**
 * Get all version records for a specific plan by ID, reference, or title
 */
export function getPlanVersionHistory(
  planIdentifier: string,
): PlanVersionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PLAN_VERSIONS_STORAGE_KEY);
    if (!raw) return [];
    const allRecords: PlanVersionRecord[] = JSON.parse(raw);
    if (!Array.isArray(allRecords)) return [];

    const cleanTarget = (planIdentifier || "").toLowerCase().trim();
    if (!cleanTarget) return [];

    return allRecords
      .filter(
        (r) =>
          (r.planId && r.planId.toLowerCase().trim() === cleanTarget) ||
          (r.planReference &&
            r.planReference.toLowerCase().trim() === cleanTarget) ||
          (r.planId && cleanTarget.includes(r.planId.toLowerCase().trim())) ||
          (r.planReference &&
            cleanTarget.includes(r.planReference.toLowerCase().trim())) ||
          (r.planId && r.planId.toLowerCase().includes(cleanTarget)) ||
          (r.planReference &&
            r.planReference.toLowerCase().includes(cleanTarget)),
      )
      .sort(
        (a, b) =>
          new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
      );
  } catch (err) {
    console.warn("getPlanVersionHistory error:", err);
    return [];
  }
}

/**
 * Get current effective version number for a plan
 */
export function getCurrentPlanVersionNumber(planIdentifier: string): number {
  const history = getPlanVersionHistory(planIdentifier);
  if (history.length === 0) return 1;
  const maxVersion = Math.max(...history.map((h) => h.versionNumber || 1));
  return maxVersion || 1;
}

/**
 * Save a new version or audit event record for a plan
 */
export function recordPlanVersionEvent(
  record: Omit<PlanVersionRecord, "id" | "changedAt"> & {
    id?: string;
    changedAt?: string;
  },
): PlanVersionRecord {
  const newRecord: PlanVersionRecord = {
    ...record,
    id:
      record.id ||
      `ver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    changedAt: record.changedAt || new Date().toISOString(),
  };

  if (typeof window === "undefined") return newRecord;

  try {
    const raw = window.localStorage.getItem(PLAN_VERSIONS_STORAGE_KEY);
    const allRecords: PlanVersionRecord[] = raw ? JSON.parse(raw) : [];
    const updated = [newRecord, ...allRecords];
    window.localStorage.setItem(
      PLAN_VERSIONS_STORAGE_KEY,
      JSON.stringify(updated),
    );
  } catch (err) {
    console.warn("recordPlanVersionEvent error:", err);
  }

  return newRecord;
}

/**
 * Compare two objects and extract field-level changes
 */
export function calculateFieldDiffs(
  before: Record<string, any>,
  after: Record<string, any>,
  fieldLabels: Record<string, string>,
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const [key, label] of Object.entries(fieldLabels)) {
    const prevVal = before?.[key];
    const newVal = after?.[key];

    // Normalize comparison
    const normPrev =
      prevVal === undefined || prevVal === null ? "" : String(prevVal).trim();
    const normNew =
      newVal === undefined || newVal === null ? "" : String(newVal).trim();

    if (normPrev !== normNew) {
      changes.push({
        field: key,
        fieldName: label,
        previousValue: prevVal ?? "—",
        newValue: newVal ?? "—",
      });
    }
  }

  return changes;
}

/**
 * Common field label dictionaries
 */
export const PLAN_FIELD_LABELS: Record<string, string> = {
  name: "Plan Name",
  planName: "Plan Name",
  budgetYear: "Budget Year",
  category: "Procurement Category",
  periodFrom: "Coverage Period Start",
  planPeriodFrom: "Coverage Period Start",
  periodTo: "Coverage Period End",
  planPeriodTo: "Coverage Period End",
  organizationRegion: "Organization / Region",
  description: "Description / Objectives",
  estimatedValue: "Estimated Total Value",
};

export const ACTIVITY_FIELD_LABELS: Record<string, string> = {
  description: "Activity Description",
  activityDescription: "Activity Description",
  method: "Procurement Method",
  estimatedAmount: "Estimated Budget",
  currency: "Currency",
  fundingSource: "Funding Source",
  pricingBasis: "Pricing Basis",
  marketApproach: "Market Approach",
  reviewType: "Review Type",
  contractType: "Contract Type",
  lotRequired: "Lot Required",
  currentStage: "Current Stage",
};
