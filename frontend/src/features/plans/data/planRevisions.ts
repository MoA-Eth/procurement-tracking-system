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
  | "COMMITTEE_ENDORSED"
  | "MANAGEMENT_DECISION"
  | "FINALLY_APPROVED"
  | "CANCELLATION_REQUESTED"
  | "PLAN_CANCELLED"
  | "CANCELLATION_REJECTED";

export interface PlanActivitySnapshot {
  id?: string;
  activityRefNo: string;
  description: string;
  method: string;
  marketApproach?: string;
  reviewType?: string;
  estimatedAmount: number;
  currency?: string;
  status?: string;
  currentStage?: string;
}

export interface ProjectSnapshot {
  code: string;
  name?: string;
  organizationRegion?: string;
  fundingSource?: string;
  financingNumbers?: string[];
}

export interface PlanSnapshot {
  planName: string;
  planReference?: string;
  budgetYear?: string;
  category?: string;
  periodFrom?: string;
  periodTo?: string;
  status: string;
  estimatedTotal: string | number;
  currency?: string;
  activitiesCount: number;
  activities?: PlanActivitySnapshot[];
}

export interface OfficerSubmissionDetails {
  officerName: string;
  officerRole?: string;
  officerEmail?: string;
  submittedAt: string;
  submissionNotes?: string;
}

export interface DirectorReviewDetails {
  directorName: string;
  directorRole?: string;
  reviewedAt: string;
  decision: "APPROVED" | "RETURNED";
  feedback?: string;
  committeeDeadline?: string;
  daysAllotted?: number;
}

export interface CommitteeReviewDetails {
  committeeMembers?: string[];
  endorsedAt?: string;
  quorumReached?: boolean;
  approvedVotes?: number;
  totalVotes?: number;
  decision?: "ENDORSED" | "REJECTED" | "OBJECTION";
  comments?: string;
  flaggedActivityRefs?: string[];
}

export interface ManagementDecisionDetails {
  managementName?: string;
  decision: "APPROVE" | "REJECT";
  decidedAt: string;
  comment?: string;
}

export interface PlanVersionRecord {
  id: string;
  planId: string;
  planReference: string;
  planName?: string;
  projectCode: string;
  projectName?: string;
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
  activityDetails?: PlanActivitySnapshot;
  projectDetails?: ProjectSnapshot;
  planDetails?: PlanSnapshot;
  activities?: PlanActivitySnapshot[];
  officerSubmission?: OfficerSubmissionDetails;
  directorReview?: DirectorReviewDetails;
  committeeReview?: CommitteeReviewDetails;
  managementDecision?: ManagementDecisionDetails;
  snapshot?: PlanSnapshot;
}

export const PLAN_VERSIONS_STORAGE_KEY = "moa-pts:plan-versions:v1";

export interface PlanVersionHistoryOptions {
  planName?: string;
  projectCode?: string;
  currentStatus?: string;
  planData?: any;
  projectData?: any;
  activitiesData?: any[];
}

/**
 * Get all version records for a specific plan by ID, reference, or title,
 * and synthesize/backfill missing lifecycle events (e.g. officer submission,
 * director approval, committee votes) from plan metadata if not already recorded.
 */
export function getPlanVersionHistory(
  planIdentifier: string,
  options?: PlanVersionHistoryOptions,
): PlanVersionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PLAN_VERSIONS_STORAGE_KEY);
    const allRecords: PlanVersionRecord[] = raw ? JSON.parse(raw) : [];

    const targetList = [
      planIdentifier,
      options?.planName,
      options?.planData?.title,
      options?.planData?.planName,
      options?.planData?.name,
      options?.planData?.reference,
      options?.planData?.id,
    ]
      .filter(Boolean)
      .map((t) => String(t).toLowerCase().trim());

    const isMatch = (r: PlanVersionRecord) => {
      const rId = (r.planId || "").toLowerCase().trim();
      const rRef = (r.planReference || "").toLowerCase().trim();
      const rName = (r.planName || r.snapshot?.planName || "")
        .toLowerCase()
        .trim();

      return targetList.some(
        (target) =>
          target === rId ||
          target === rRef ||
          target === rName ||
          (rId && (rId.includes(target) || target.includes(rId))) ||
          (rRef && (rRef.includes(target) || target.includes(rRef))) ||
          (rName && (rName.includes(target) || target.includes(rName))),
      );
    };

    const matchingRecords = allRecords.filter(isMatch);

    // Resolve plan & project metadata from options or first record
    const resolvedPlanName =
      options?.planName ||
      options?.planData?.planName ||
      options?.planData?.title ||
      options?.planData?.name ||
      matchingRecords.find((r) => r.planName || r.snapshot?.planName)
        ?.planName ||
      matchingRecords.find((r) => r.planName || r.snapshot?.planName)?.snapshot
        ?.planName ||
      planIdentifier;

    const resolvedProjectCode =
      options?.projectCode ||
      options?.projectData?.code ||
      options?.planData?.projectCode ||
      options?.planData?.project?.code ||
      matchingRecords[0]?.projectCode ||
      "PROJECT";

    const resolvedProjectName =
      options?.projectData?.name ||
      options?.planData?.project?.name ||
      matchingRecords[0]?.projectName ||
      resolvedProjectCode;

    const resolvedStatus =
      options?.currentStatus ||
      options?.planData?.status ||
      options?.planData?.rawStatus ||
      matchingRecords[0]?.planDetails?.status ||
      "Draft";

    const resolvedCategory =
      options?.planData?.category ||
      options?.planData?.procurementCategory ||
      matchingRecords[0]?.planDetails?.category ||
      "Goods";

    const resolvedBudgetYear =
      options?.planData?.budgetYear ||
      matchingRecords[0]?.planDetails?.budgetYear ||
      "2017 EFY";

    const resolvedAmount =
      options?.planData?.estimatedTotalValue ||
      options?.planData?.estimatedBudget ||
      matchingRecords[0]?.planDetails?.estimatedTotal ||
      0;

    const rawActs =
      options?.activitiesData ||
      options?.planData?.planActivities ||
      options?.planData?.activities ||
      matchingRecords[0]?.activities ||
      [];

    const mappedActivities: PlanActivitySnapshot[] = Array.isArray(rawActs)
      ? rawActs.map((act: any) => ({
          id: act.id,
          activityRefNo:
            act.activityRefNo || act.reference || act.id || "ACT-REF",
          description: act.description || "Activity description",
          method:
            act.method || act.procurementMethod?.label || "Procurement Method",
          marketApproach: act.marketApproach || "Open - National",
          reviewType: act.reviewType || "Prior",
          estimatedAmount:
            Number(act.estimatedAmount || act.estimatedBudget) || 0,
          currency: act.currency || "ETB",
          status: act.status || "In Progress",
          currentStage: act.currentStage,
        }))
      : [];

    const defaultProjectDetails: ProjectSnapshot = {
      code: resolvedProjectCode,
      name: resolvedProjectName,
      organizationRegion:
        options?.projectData?.organizationRegion ||
        options?.planData?.organization ||
        "Federal / FPCU",
      fundingSource:
        options?.projectData?.fundingSource ||
        options?.planData?.fundingSource ||
        "African Development Bank (AfDB)",
    };

    const defaultPlanDetails: PlanSnapshot = {
      planName: resolvedPlanName,
      planReference: options?.planData?.reference || planIdentifier,
      budgetYear: resolvedBudgetYear,
      category: resolvedCategory,
      status: resolvedStatus,
      estimatedTotal: resolvedAmount,
      currency: "ETB",
      activitiesCount: mappedActivities.length,
      activities: mappedActivities,
    };

    // Synthesize missing lifecycle milestones if the plan has progressed
    const hasSubmitEvent = matchingRecords.some(
      (r) => r.action === "SUBMITTED" || r.action === "INITIAL_DRAFT",
    );
    const hasReturnEvent = matchingRecords.some((r) => r.action === "RETURNED");
    const hasDirectorApproval = matchingRecords.some(
      (r) =>
        r.action === "APPROVED_DIRECTOR" || r.action === "SENT_TO_COMMITTEE",
    );
    const hasCommitteeEndorsement = matchingRecords.some(
      (r) =>
        r.action === "COMMITTEE_ENDORSED" || r.action === "FINALLY_APPROVED",
    );

    const normStatus = resolvedStatus.toLowerCase();
    const isBeyondDraft =
      normStatus.includes("submit") ||
      normStatus.includes("review") ||
      normStatus.includes("return") ||
      normStatus.includes("endorse") ||
      normStatus.includes("approve");

    const synthesizedRecords: PlanVersionRecord[] = [];

    // 1. Synthesize Officer Submission if missing
    if (!hasSubmitEvent && isBeyondDraft) {
      const earliestExistingTime = matchingRecords.reduce((earliest, r) => {
        const t = new Date(r.changedAt).getTime();
        return t < earliest ? t : earliest;
      }, Date.now());

      const submitTime =
        options?.planData?.createdAt ||
        new Date(earliestExistingTime - 1000 * 60 * 30).toISOString();

      const officerName =
        options?.planData?.creator?.name ||
        options?.planData?.creator?.displayName ||
        options?.planData?.officer ||
        "Abebe (Procurement Officer)";

      const subRecord: PlanVersionRecord = {
        id: `synth-sub-${planIdentifier}`,
        planId: planIdentifier,
        planReference: options?.planData?.reference || planIdentifier,
        planName: resolvedPlanName,
        projectCode: resolvedProjectCode,
        projectName: resolvedProjectName,
        versionNumber: 1,
        action: "SUBMITTED",
        actionLabel: "Plan Submitted for Director Review",
        changedBy: officerName,
        changedByRole: "Procurement Officer",
        changedAt: submitTime,
        reason:
          "Procurement plan and proposed activities officially submitted to Director for initial review.",
        officerSubmission: {
          officerName,
          officerRole: "Procurement Officer",
          submittedAt: submitTime,
          submissionNotes: "Submitted for director review.",
        },
        projectDetails: defaultProjectDetails,
        planDetails: defaultPlanDetails,
        activities: mappedActivities,
        snapshot: defaultPlanDetails,
      };

      synthesizedRecords.push(subRecord);
    }

    // 2. Synthesize Director Return if status is Returned and missing
    if (
      !hasReturnEvent &&
      (normStatus.includes("return") ||
        options?.planData?.directorRevisionComment)
    ) {
      const returnTime =
        options?.planData?.rejectedAt ||
        options?.planData?.updatedAt ||
        new Date().toISOString();

      const feedback =
        options?.planData?.directorRevisionComment ||
        options?.planData?.rejectionReason ||
        "Please revise estimated budgets and procurement scope according to departmental guidelines.";

      const retRecord: PlanVersionRecord = {
        id: `synth-ret-${planIdentifier}`,
        planId: planIdentifier,
        planReference: options?.planData?.reference || planIdentifier,
        planName: resolvedPlanName,
        projectCode: resolvedProjectCode,
        projectName: resolvedProjectName,
        versionNumber: 1,
        action: "RETURNED",
        actionLabel: "Plan Returned by Director for Revision",
        changedBy:
          options?.planData?.rejectedByUser?.name ||
          options?.planData?.rejectedByUser?.displayName ||
          "Mekonen (Director)",
        changedByRole: "Director",
        changedAt: returnTime,
        reason: feedback,
        directorReview: {
          directorName:
            options?.planData?.rejectedByUser?.name || "Mekonen (Director)",
          directorRole: "Director",
          reviewedAt: returnTime,
          decision: "RETURNED",
          feedback,
        },
        projectDetails: defaultProjectDetails,
        planDetails: {
          ...defaultPlanDetails,
          status: "Returned for Revision",
        },
        activities: mappedActivities,
        snapshot: defaultPlanDetails,
      };

      synthesizedRecords.push(retRecord);
    }

    // 3. Synthesize Director Approval if status is Committee Review or Endorsed
    if (
      !hasDirectorApproval &&
      (normStatus.includes("committee") ||
        normStatus.includes("endorse") ||
        options?.planData?.approvedAt)
    ) {
      const approveTime =
        options?.planData?.approvedAt ||
        options?.planData?.updatedAt ||
        new Date().toISOString();

      const appRecord: PlanVersionRecord = {
        id: `synth-app-${planIdentifier}`,
        planId: planIdentifier,
        planReference: options?.planData?.reference || planIdentifier,
        planName: resolvedPlanName,
        projectCode: resolvedProjectCode,
        projectName: resolvedProjectName,
        versionNumber: 1,
        action: "APPROVED_DIRECTOR",
        actionLabel: "Plan Approved by Director & Sent to Committee",
        changedBy:
          options?.planData?.approvedByUser?.name || "Mekonen (Director)",
        changedByRole: "Director",
        changedAt: approveTime,
        reason:
          "Plan approved by Director and forwarded to Endorsement Committee with 7-day review window.",
        directorReview: {
          directorName:
            options?.planData?.approvedByUser?.name || "Mekonen (Director)",
          directorRole: "Director",
          reviewedAt: approveTime,
          decision: "APPROVED",
          feedback: "Approved and submitted for Endorsement Committee review.",
          committeeDeadline:
            options?.planData?.committeeVoteDeadline || undefined,
        },
        projectDetails: defaultProjectDetails,
        planDetails: {
          ...defaultPlanDetails,
          status: "Committee Review",
        },
        activities: mappedActivities,
        snapshot: defaultPlanDetails,
      };

      synthesizedRecords.push(appRecord);
    }

    // 4. Synthesize Committee Endorsement if status is Endorsed or Approved
    if (
      !hasCommitteeEndorsement &&
      (normStatus.includes("endorse") ||
        normStatus.includes("finally approved"))
    ) {
      const endorseTime =
        options?.planData?.updatedAt || new Date().toISOString();

      const endRecord: PlanVersionRecord = {
        id: `synth-end-${planIdentifier}`,
        planId: planIdentifier,
        planReference: options?.planData?.reference || planIdentifier,
        planName: resolvedPlanName,
        projectCode: resolvedProjectCode,
        projectName: resolvedProjectName,
        versionNumber: 1,
        action: "COMMITTEE_ENDORSED",
        actionLabel: "Plan Endorsed by Endorsement Committee (Quorum Reached)",
        changedBy: "Endorsement Committee (3/5 Quorum)",
        changedByRole: "Endorsement Committee",
        changedAt: endorseTime,
        reason:
          "Plan reviewed by 5-member Endorsement Committee; reached required quorum of approvals.",
        committeeReview: {
          committeeMembers: ["Chairperson", "Lead Evaluator", "Finance Member"],
          endorsedAt: endorseTime,
          quorumReached: true,
          approvedVotes: 3,
          totalVotes: 5,
          decision: "ENDORSED",
          comments:
            "Activities and budgets verified against procurement guidelines.",
        },
        projectDetails: defaultProjectDetails,
        planDetails: {
          ...defaultPlanDetails,
          status: "Endorsed by Committee",
        },
        activities: mappedActivities,
        snapshot: defaultPlanDetails,
      };

      synthesizedRecords.push(endRecord);
    }

    // Merge and enrich existing records with missing details
    const combined = [...synthesizedRecords, ...matchingRecords].map((rec) => {
      return {
        ...rec,
        planName: rec.planName || resolvedPlanName,
        projectName: rec.projectName || resolvedProjectName,
        projectCode: rec.projectCode || resolvedProjectCode,
        projectDetails: rec.projectDetails || defaultProjectDetails,
        planDetails: rec.planDetails || defaultPlanDetails,
        activities:
          rec.activities && rec.activities.length > 0
            ? rec.activities
            : mappedActivities,
      };
    });

    // Deduplicate by ID
    const uniqueMap = new Map<string, PlanVersionRecord>();
    for (const r of combined) {
      if (!uniqueMap.has(r.id)) {
        uniqueMap.set(r.id, r);
      }
    }

    return Array.from(uniqueMap.values()).sort(
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
export function getCurrentPlanVersionNumber(
  planIdentifier: string,
  options?: PlanVersionHistoryOptions,
): number {
  const history = getPlanVersionHistory(planIdentifier, options);
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

    // Avoid duplicate rapid saves for the exact same event on the same plan
    const isDuplicate = allRecords.some(
      (r) =>
        r.planId === newRecord.planId &&
        r.action === newRecord.action &&
        r.changedBy === newRecord.changedBy &&
        Math.abs(
          new Date(r.changedAt).getTime() -
            new Date(newRecord.changedAt).getTime(),
        ) < 3000,
    );

    if (!isDuplicate) {
      const updated = [newRecord, ...allRecords];
      window.localStorage.setItem(
        PLAN_VERSIONS_STORAGE_KEY,
        JSON.stringify(updated),
      );
    }
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
