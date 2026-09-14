import type { ProcurementActivitySummary } from "@/features/projects/data/officerActivityDrafts";

export const OFFICER_ACTIVITY_TRACKING_STORAGE_KEY =
  "moa-pts:officer-activity-tracking:v2";

export type ActivityProcessStatus =
  | "Bid Opened / Under Evaluation"
  | "Canceled"
  | "Completed"
  | "Draft Contract / Negotiation"
  | "Pending Implementation"
  | "Signed"
  | "Supplier Shortlisted"
  | "Under Implementation";

export type ActivityWorkflowStatus =
  "Cleared" | "Modified / Cleared" | "New" | "Submitted" | "Under Review";

export type ActivityStageStatus =
  "Completed" | "In Progress" | "Not Applicable" | "Not Started";

export interface TrackingDateValue {
  ethiopian: string;
  gregorian: string;
}

export interface ActivityStageRevision {
  createdAt: string;
  reason: string;
  revisionNumber: number;
  targetDate: TrackingDateValue;
}

export interface ActivityStageTracking {
  actualDate?: TrackingDateValue;
  remarks: string;
  revisions: ActivityStageRevision[];
  stageName: string;
  status: ActivityStageStatus;
}

export interface OfficerActivityTrackingRecord {
  activityReference: string;
  activityStatus: ActivityWorkflowStatus;
  generalRemarks: string;
  planReference: string;
  processStatus: ActivityProcessStatus;
  progressPercent: number;
  projectCode: string;
  stages: ActivityStageTracking[];
  updatedAt: string;
}

export function createInitialActivityTrackingRecord(
  projectCode: string,
  planReference: string,
  activity: ProcurementActivitySummary,
): OfficerActivityTrackingRecord {
  const roadmap = activity.details?.roadmap ?? [];

  // Activities created before roadmap capture remain summary-only.  New and
  // fixture activities use their approved roadmap as the single source of truth.
  if (roadmap.length === 0) {
    return summaryTrackingRecord(projectCode, planReference, activity);
  }

  const currentStageIndex = Math.max(
    0,
    roadmap.findIndex((stage) => stage.name === activity.currentStage),
  );
  const stages = roadmap.map((stage, index): ActivityStageTracking => {
    const isNA = Boolean(
      stage.notApplicable || stage.status === "Not Applicable",
    );
    const revisions: ActivityStageRevision[] = (stage.revisions || []).map(
      (r: any) => ({
        revisionNumber: r.revisionNo ?? 1,
        createdAt: r.createdAt || "",
        reason: r.reason || "",
        targetDate: {
          ethiopian: r.revisedStartDate || "",
          gregorian: r.revisedStartDate || "",
        },
      }),
    );

    if (isNA) {
      return {
        remarks: stage.remarks || "",
        revisions,
        stageName: stage.name,
        status: "Not Applicable",
      };
    }

    const explicitCompleted =
      stage.status === "Completed" ||
      Boolean(
        stage.actualEndDate ||
        (stage.actualDate && stage.status !== "In Progress"),
      );
    const explicitInProgress =
      stage.status === "In Progress" ||
      (Boolean(stage.actualStartDate) && !explicitCompleted);

    const completed =
      explicitCompleted ||
      activity.status === "Completed" ||
      (index < currentStageIndex && stage.status !== "Not Started");
    const inProgress =
      explicitInProgress ||
      (!completed &&
        (stage.status === "In Progress" || index === currentStageIndex));

    const actualDateVal =
      stage.actualEndDate ||
      stage.actualDate ||
      stage.actualStartDate ||
      (completed ? stage.gregorianDate || stage.ethiopianDate : undefined);

    return {
      ...(actualDateVal
        ? {
            actualDate: {
              ethiopian: stage.ethiopianDate || actualDateVal,
              gregorian: actualDateVal,
            },
          }
        : {}),
      remarks: stage.remarks || "",
      revisions,
      stageName: stage.name,
      status: completed
        ? "Completed"
        : inProgress
          ? "In Progress"
          : "Not Started",
    };
  });
  const applicableStages = stages.filter(
    (stage) => stage.status !== "Not Applicable",
  );
  const completedStages = applicableStages.filter(
    (stage) => stage.status === "Completed",
  ).length;
  const currentStage = stages[currentStageIndex];
  const hasSignedContract =
    currentStage?.stageName === "Signed Contract" ||
    stages.some(
      (stage, idx) =>
        stage.stageName === "Signed Contract" &&
        (stage.status === "Completed" || idx <= currentStageIndex),
    );

  return {
    activityReference: activity.reference,
    activityStatus:
      activity.status === "Completed" || hasSignedContract ? "Cleared" : "New",
    generalRemarks:
      activity.status === "Completed"
        ? "Procurement and contract completion have been recorded."
        : hasSignedContract
          ? "Contract signature has been recorded; implementation is under way."
          : "",
    planReference,
    processStatus:
      activity.status === "Completed"
        ? "Completed"
        : hasSignedContract
          ? "Signed"
          : currentStage?.stageName.toLowerCase().includes("evaluation") ||
              currentStage?.stageName.toLowerCase().includes("bid submission")
            ? "Bid Opened / Under Evaluation"
            : "Under Implementation",
    progressPercent:
      applicableStages.length === 0
        ? 0
        : Math.round((completedStages / applicableStages.length) * 100),
    projectCode,
    stages,
    updatedAt: "",
  };
}

function summaryTrackingRecord(
  projectCode: string,
  planReference: string,
  activity: ProcurementActivitySummary,
): OfficerActivityTrackingRecord {
  return {
    activityReference: activity.reference,
    activityStatus: activity.status === "Completed" ? "Cleared" : "New",
    generalRemarks: "",
    planReference,
    processStatus:
      activity.status === "Completed"
        ? "Completed"
        : activity.status === "Not Started"
          ? "Pending Implementation"
          : "Under Implementation",
    progressPercent:
      activity.status === "Completed"
        ? 100
        : activity.status === "Not Started"
          ? 0
          : 50,
    projectCode,
    stages: [],
    updatedAt: "",
  };
}

export function effectiveTargetDate(
  originalDate: TrackingDateValue,
  tracking: ActivityStageTracking | undefined,
) {
  return tracking?.revisions.at(-1)?.targetDate ?? originalDate;
}

export function calculateDelayDays(
  originalDate: TrackingDateValue,
  tracking: ActivityStageTracking | undefined,
  todayIso = new Date().toISOString().slice(0, 10),
) {
  if (tracking?.status === "Not Applicable") return 0;

  const target = effectiveTargetDate(originalDate, tracking).gregorian;
  if (!isIsoDate(target)) return null;

  const comparisonDate = tracking?.actualDate?.gregorian || todayIso;
  if (!isIsoDate(comparisonDate)) return null;

  return Math.max(0, differenceInCalendarDays(target, comparisonDate));
}

export function findActivityTrackingRecord(
  records: readonly OfficerActivityTrackingRecord[],
  projectCode: string,
  planReference: string,
  activityReference: string,
) {
  return records.find(
    (record) =>
      record.projectCode === projectCode &&
      record.planReference === planReference &&
      record.activityReference === activityReference,
  );
}

export function upsertActivityTrackingRecord(
  records: readonly OfficerActivityTrackingRecord[],
  nextRecord: OfficerActivityTrackingRecord,
) {
  return [
    ...records.filter(
      (record) =>
        record.projectCode !== nextRecord.projectCode ||
        record.planReference !== nextRecord.planReference ||
        record.activityReference !== nextRecord.activityReference,
    ),
    nextRecord,
  ];
}

export function parseActivityTrackingRecords(serialized: string | null) {
  if (!serialized) return [] as OfficerActivityTrackingRecord[];

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isOfficerActivityTrackingRecord)
      .filter((record) => !record.activityReference.startsWith("MOA/"));
  } catch {
    return [];
  }
}

function differenceInCalendarDays(fromIso: string, toIso: string) {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.floor((to - from) / 86_400_000);
}

function isIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3])
  );
}

function isOfficerActivityTrackingRecord(
  value: unknown,
): value is OfficerActivityTrackingRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<OfficerActivityTrackingRecord>;
  return (
    typeof record.activityReference === "string" &&
    isActivityWorkflowStatus(record.activityStatus) &&
    typeof record.generalRemarks === "string" &&
    typeof record.planReference === "string" &&
    isActivityProcessStatus(record.processStatus) &&
    typeof record.progressPercent === "number" &&
    record.progressPercent >= 0 &&
    record.progressPercent <= 100 &&
    typeof record.projectCode === "string" &&
    Array.isArray(record.stages) &&
    record.stages.every(isActivityStageTracking) &&
    typeof record.updatedAt === "string"
  );
}

function isActivityStageTracking(
  value: unknown,
): value is ActivityStageTracking {
  if (!value || typeof value !== "object") return false;
  const stage = value as Partial<ActivityStageTracking>;
  return (
    (stage.actualDate === undefined || isTrackingDate(stage.actualDate)) &&
    typeof stage.remarks === "string" &&
    Array.isArray(stage.revisions) &&
    stage.revisions.every(isActivityStageRevision) &&
    typeof stage.stageName === "string" &&
    isActivityStageStatus(stage.status)
  );
}

function isActivityStageRevision(
  value: unknown,
): value is ActivityStageRevision {
  if (!value || typeof value !== "object") return false;
  const revision = value as Partial<ActivityStageRevision>;
  return (
    typeof revision.createdAt === "string" &&
    typeof revision.reason === "string" &&
    revision.reason.trim().length > 0 &&
    typeof revision.revisionNumber === "number" &&
    Number.isInteger(revision.revisionNumber) &&
    revision.revisionNumber > 0 &&
    isTrackingDate(revision.targetDate)
  );
}

function isTrackingDate(value: unknown): value is TrackingDateValue {
  if (!value || typeof value !== "object") return false;
  const date = value as Partial<TrackingDateValue>;
  return (
    typeof date.ethiopian === "string" && typeof date.gregorian === "string"
  );
}

function isActivityProcessStatus(
  value: unknown,
): value is ActivityProcessStatus {
  return (
    value === "Bid Opened / Under Evaluation" ||
    value === "Canceled" ||
    value === "Completed" ||
    value === "Draft Contract / Negotiation" ||
    value === "Pending Implementation" ||
    value === "Signed" ||
    value === "Supplier Shortlisted" ||
    value === "Under Implementation"
  );
}

function isActivityWorkflowStatus(
  value: unknown,
): value is ActivityWorkflowStatus {
  return (
    value === "Cleared" ||
    value === "Modified / Cleared" ||
    value === "New" ||
    value === "Submitted" ||
    value === "Under Review"
  );
}

function isActivityStageStatus(value: unknown): value is ActivityStageStatus {
  return (
    value === "Completed" ||
    value === "In Progress" ||
    value === "Not Applicable" ||
    value === "Not Started"
  );
}
