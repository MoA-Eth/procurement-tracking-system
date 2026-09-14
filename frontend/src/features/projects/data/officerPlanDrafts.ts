import type {
  OfficerProject,
  ProcurementCategory,
  ProcurementPlanSummary,
} from "./officerProjects";

export const OFFICER_PLAN_DRAFTS_STORAGE_KEY = "moa-pts:officer-plan-drafts:v2";

export interface ProcurementPlanDraftInput {
  budgetYear: string;
  category: ProcurementCategory;
  generalProcurementNoticeDate: string;
  generalProcurementNoticeDateEthiopian: string;
  organizationRegion: string;
  periodFrom: string;
  periodFromEthiopian: string;
  periodTo: string;
  periodToEthiopian: string;
  planName: string;
  remarks: string;
}

export interface SavedOfficerPlanRecord {
  plan: ProcurementPlanSummary;
  projectCode: string;
}

export function createDraftPlan(
  project: OfficerProject,
  input: ProcurementPlanDraftInput,
): ProcurementPlanSummary {
  return {
    activities: 0,
    budgetYear: `${input.budgetYear} EFY`,
    category: input.category,
    completedActivities: 0,
    currency: project.baseCurrency,
    delayedActivities: 0,
    description: input.remarks.trim() || undefined,
    estimatedValue: 0,
    generalProcurementNoticeDate: input.generalProcurementNoticeDate
      ? {
          ethiopian: input.generalProcurementNoticeDateEthiopian,
          gregorian: input.generalProcurementNoticeDate,
        }
      : undefined,
    inProgressActivities: 0,
    name: input.planName.trim(),
    organizationRegion: input.organizationRegion || undefined,
    planPeriod: {
      from: {
        ethiopian: input.periodFromEthiopian,
        gregorian: input.periodFrom,
      },
      to: {
        ethiopian: input.periodToEthiopian,
        gregorian: input.periodTo,
      },
    },
    reference: nextPlanReference(project, input.budgetYear),
    status: "Draft",
  };
}

export function mergeSavedPlans(
  projects: readonly OfficerProject[],
  records: readonly SavedOfficerPlanRecord[],
): readonly OfficerProject[] {
  return projects.map((project) => {
    const projectRecords = records.filter(
      (record) =>
        record.projectCode === project.code ||
        record.projectCode?.toLowerCase() === project.code.toLowerCase() ||
        record.projectCode?.toLowerCase() ===
          project.shortName?.toLowerCase() ||
        (Boolean((project as any).id) &&
          record.projectCode?.toLowerCase() ===
            String((project as any).id).toLowerCase()),
    );
    if (projectRecords.length === 0) return project;

    const recordByRef = new Map<string, ProcurementPlanSummary>();
    const recordByName = new Map<string, ProcurementPlanSummary>();
    projectRecords.forEach((record) => {
      recordByRef.set(record.plan.reference.toLowerCase(), record.plan);
      recordByName.set(record.plan.name.toLowerCase(), record.plan);
    });

    const mergedPlans = project.plans.map((plan) => {
      const saved =
        recordByRef.get(plan.reference.toLowerCase()) ??
        recordByName.get(plan.name.toLowerCase());

      if (!saved) return plan;

      // Backend status is authoritative if plan is not in local Draft state,
      // or if the backend returned a new workflow status like Returned / Committee Review / Finally Approved
      const isBackendAuthoritative =
        plan.status === "Returned" ||
        plan.status === "Committee Review" ||
        plan.status === "Finally Approved" ||
        (saved.status === "Draft" && plan.status !== "Draft");

      const resolvedStatus = isBackendAuthoritative
        ? plan.status
        : saved.status || plan.status;
      const resolvedReason = plan.rejectionReason || saved.rejectionReason;

      const rawActivities =
        plan.planActivities && plan.planActivities.length > 0
          ? plan.planActivities
          : saved.planActivities || [];

      const resolvedActivities = rawActivities.map((act: any) => ({
        ...act,
        status:
          resolvedStatus === "Returned" &&
          (act.status === "Submitted to Director" ||
            act.status === "Under Review")
            ? "Returned"
            : act.status,
      }));

      return {
        ...saved,
        ...plan,
        status: resolvedStatus,
        rejectionReason: resolvedReason,
        activities: Math.max(
          saved.activities || 0,
          plan.activities || 0,
          resolvedActivities.length,
        ),
        planActivities: resolvedActivities,
      };
    });

    const existingRefs = new Set(
      mergedPlans.map((plan) => plan.reference.toLowerCase()),
    );
    const existingNames = new Set(
      mergedPlans.map((plan) => plan.name.toLowerCase()),
    );

    const newPlans = projectRecords
      .map((record) => record.plan)
      .filter(
        (plan) =>
          !existingRefs.has(plan.reference.toLowerCase()) &&
          !existingNames.has(plan.name.toLowerCase()),
      );

    return {
      ...project,
      activePlans: project.activePlans + newPlans.length,
      plans: [...mergedPlans, ...newPlans],
    };
  });
}

export function parseSavedPlanRecords(
  serializedRecords: string | null,
): SavedOfficerPlanRecord[] {
  if (!serializedRecords) return [];

  try {
    const parsed: unknown = JSON.parse(serializedRecords);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeSavedOfficerPlanRecord)
      .filter(
        (record): record is SavedOfficerPlanRecord => record !== undefined,
      );
  } catch {
    return [];
  }
}

export function upsertSavedPlanRecord(
  records: readonly SavedOfficerPlanRecord[],
  record: SavedOfficerPlanRecord,
): SavedOfficerPlanRecord[] {
  const withoutExisting = records.filter(
    (existing) =>
      !(
        (existing.projectCode?.toLowerCase() ===
          record.projectCode?.toLowerCase() ||
          existing.projectCode?.toLowerCase() ===
            String((record.plan as any).projectId || "").toLowerCase()) &&
        (existing.plan.reference.toLowerCase() ===
          record.plan.reference.toLowerCase() ||
          existing.plan.name.toLowerCase() === record.plan.name.toLowerCase())
      ),
  );
  return [...withoutExisting, record];
}

export function addSavedPlanRecord(
  records: readonly SavedOfficerPlanRecord[],
  record: SavedOfficerPlanRecord,
): SavedOfficerPlanRecord[] {
  return upsertSavedPlanRecord(records, record);
}

function nextPlanReference(project: OfficerProject, budgetYear: string) {
  const prefix = `PP-${project.shortName}-${budgetYear}-`;
  const highestSequence = project.plans.reduce((highest, plan) => {
    if (!plan.reference.startsWith(prefix)) return highest;

    const sequence = Number(plan.reference.slice(prefix.length));
    return Number.isInteger(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);

  return `${prefix}${String(highestSequence + 1).padStart(2, "0")}`;
}

function normalizeSavedOfficerPlanRecord(
  value: unknown,
): SavedOfficerPlanRecord | undefined {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Partial<SavedOfficerPlanRecord>;
  if (typeof record.projectCode !== "string") return undefined;

  const plan = normalizeProcurementPlanSummary(record.plan);
  return plan ? { plan, projectCode: record.projectCode } : undefined;
}

function normalizeProcurementPlanSummary(
  value: unknown,
): ProcurementPlanSummary | undefined {
  if (!value || typeof value !== "object") return undefined;

  const plan = value as Partial<ProcurementPlanSummary> & {
    categories?: unknown;
  };
  const legacyCategory =
    Array.isArray(plan.categories) && plan.categories.length > 0
      ? plan.categories[0]
      : undefined;
  const category =
    normalizeStoredCategory(plan.category) ??
    normalizeStoredCategory(legacyCategory);

  const isValidStatus =
    plan.status === "Draft" ||
    plan.status === "Submitted to Director" ||
    plan.status === "Committee Review" ||
    plan.status === "Finally Approved" ||
    plan.status === "Approved" ||
    plan.status === "Returned";

  if (
    !category ||
    !(
      typeof plan.name === "string" &&
      typeof plan.reference === "string" &&
      typeof plan.budgetYear === "string" &&
      isValidStatus &&
      (plan.currency === "ETB" ||
        plan.currency === "USD" ||
        plan.currency === "UA") &&
      typeof plan.activities === "number" &&
      typeof plan.completedActivities === "number" &&
      typeof plan.delayedActivities === "number" &&
      typeof plan.inProgressActivities === "number" &&
      typeof plan.estimatedValue === "number"
    )
  ) {
    return undefined;
  }

  const normalizedPlan = { ...plan, category };
  delete normalizedPlan.categories;
  return normalizedPlan as ProcurementPlanSummary;
}

function normalizeStoredCategory(
  value: unknown,
): ProcurementCategory | undefined {
  if (value === "Goods" || value === "Works") return value;
  if (value === "Non-Consulting" || value === "Non-Consulting Services") {
    return "Non-Consulting Services";
  }
  if (value === "Consultancy" || value === "Consultancy Services") {
    return "Consultancy Services";
  }
  return undefined;
}
