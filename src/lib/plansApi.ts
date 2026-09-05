import {
  type ProcurementPlan,
  type PlanCategory,
  type PlanStatus,
  parseRejectionDetails,
} from "@/features/plans/plansData";
import { roadmapForMethod } from "@/features/projects/data/procurementActivityConfig";
import {
  gregorianToEthiopian,
  formatEthiopianDate,
} from "@/features/projects/utils/ethiopianCalendar";

function toEthiopianDateString(isoDate?: string | null): string {
  if (!isoDate) return "";
  const cleanIso = isoDate.slice(0, 10);
  const ethiopianObj = gregorianToEthiopian(cleanIso);
  return ethiopianObj ? formatEthiopianDate(ethiopianObj) : "";
}

export interface BackendCommitteeVote {
  id: string;
  planId: string;
  round: number;
  memberId: string;
  decision: "APPROVE" | "REJECT";
  comment: string | null;
  createdAt: string;
  memberName?: string;
  memberRole?: string;
  memberEmail?: string;
}

export interface BackendPlanActivity {
  id: string;
  reference?: string;
  description?: string;
  estimatedBudget: number;
  currency?: string;
  category?: string;
  procurementMethodId?: string;
  procurementMethod?: {
    id: string;
    type?: string;
    code: string;
    label: string;
  };
  fundings?: {
    id?: string;
    fundingSource: string;
    loanGrantNumber?: string | null;
    allocationPct: number;
  }[];
  components?: {
    id?: string;
    component: string;
    allocationPct: number;
  }[];
  stages?: {
    id: string;
    activityId?: string;
    stageTypeId?: string;
    stageType?: {
      id: string;
      code: string;
      label: string;
    };
    sequence?: number;
    status: string;
    plannedStartDate?: string | null;
    plannedEndDate?: string | null;
    currentTargetStartDate?: string | null;
    currentTargetEndDate?: string | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    isNotApplicable?: boolean;
    remarks?: string | null;
    revisions?: {
      revisionNo: number;
      revisedStartDate: string;
      revisedEndDate?: string;
      reason: string;
      createdAt?: string;
    }[];
  }[];
  status?: string;
}

export interface BackendPlan {
  id: string;
  projectId: string;
  status:
    "DRAFT" | "SUBMITTED" | "WITH_COMMITTEE" | "APPROVED" | "REJECTED" | string;
  committeeRound?: number;
  committeeVoteDeadline?: string | null;
  title: string;
  budgetYear?: string | null;
  procurementCategory?:
    "GOODS" | "WORKS" | "CONSULTANCY" | "NON_CONSULTING" | null;
  periodStart: string;
  periodEnd: string;
  organization?: string | null;
  description?: string | null;
  gpnDate?: string | null;
  approvalDate?: string | null;
  rejectionReason?: string | null;
  createdBy?: string;
  creator?: { id: string; name: string; displayName?: string; email?: string };
  createdAt: string;
  updatedAt?: string;
  activities?: BackendPlanActivity[];
  project?: { id: string; code: string; name: string };
  committeeVotes?: BackendCommitteeVote[];
  committeeMembers?: {
    id: string;
    name: string;
    displayName?: string;
    email?: string;
    role?: string;
    authRole?: string;
  }[];
}

export interface CreatePlanInput {
  projectId: string;
  title: string;
  budgetYear?: string;
  procurementCategory?: "GOODS" | "WORKS" | "CONSULTANCY" | "NON_CONSULTING";
  organization?: string;
  description?: string;
  periodStart: string;
  periodEnd: string;
  gpnDate?: string;
}

export interface UpdatePlanInput {
  title?: string;
  budgetYear?: string;
  procurementCategory?: "GOODS" | "WORKS" | "CONSULTANCY" | "NON_CONSULTING";
  organization?: string;
  description?: string;
  periodStart?: string;
  periodEnd?: string;
  gpnDate?: string;
  status?: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
}

import { apiClient } from "./apiClient";

export async function fetchPlans(): Promise<BackendPlan[]> {
  try {
    const res = await apiClient.get<any>("/plans");
    return Array.isArray(res) ? res : res.data || [];
  } catch (err) {
    console.error("fetchPlans error:", err);
    return [];
  }
}

export async function fetchPlanById(id: string): Promise<BackendPlan> {
  const res = await apiClient.get<any>(`/plans/${encodeURIComponent(id)}`);
  return res.data || res;
}

export async function createPlan(data: CreatePlanInput): Promise<BackendPlan> {
  const res = await apiClient.post<any>("/plans", data);
  return res.data || res;
}

export async function updatePlan(
  id: string,
  data: UpdatePlanInput,
): Promise<BackendPlan> {
  const res = await apiClient.patch<any>(
    `/plans/${encodeURIComponent(id)}`,
    data,
  );
  return res.data || res;
}

/** Officer submits draft plan to Director */
export async function submitPlanForReview(id: string): Promise<BackendPlan> {
  const res = await apiClient.post<any>(
    `/plans/${encodeURIComponent(id)}/submit`,
  );
  return res.data || res;
}

/** Director approves plan and forwards to Endorsing Committee */
export async function sendPlanToCommittee(
  id: string,
  deadlineDate?: string,
  deadlineDays?: number,
): Promise<BackendPlan> {
  const res = await apiClient.post<any>(
    `/plans/${encodeURIComponent(id)}/send-to-committee`,
    {
      deadlineDate,
      committeeVoteDeadline: deadlineDate,
      deadlineDays,
    },
  );
  return res.data || res;
}

/** Director rejects/returns plan to Officer with feedback */
export async function rejectPlan(
  id: string,
  reason: string,
): Promise<BackendPlan> {
  const res = await apiClient.post<any>(
    `/plans/${encodeURIComponent(id)}/reject`,
    { reason },
  );
  return res.data || res;
}

/** Committee member votes on plan */
export async function submitVote(
  planId: string,
  decision: "APPROVE" | "REJECT",
  comment?: string,
  voterUserId?: string,
  voterEmail?: string,
): Promise<void> {
  await apiClient.post(`/plans/${encodeURIComponent(planId)}/vote`, {
    decision,
    comment,
    voterUserId,
    voterEmail,
  });
}

export function mapBackendPlanToFrontend(
  backendPlan: BackendPlan,
  currentMemberId?: string,
  currentMemberEmail?: string,
): ProcurementPlan {
  // Map category
  let category: PlanCategory = "Goods";
  const rawCat = backendPlan.procurementCategory || "";
  if (rawCat === "WORKS") category = "Works";
  else if (rawCat === "CONSULTANCY") category = "Consultancy Services";
  else if (rawCat === "NON_CONSULTING") category = "Non-Consulting Services";

  // Map status
  let status: PlanStatus = "Draft";
  if (backendPlan.status === "WITH_COMMITTEE") status = "Committee Review";
  else if (backendPlan.status === "APPROVED") status = "Finally Approved";
  else if (backendPlan.status === "REJECTED") status = "Returned";
  else if (backendPlan.status === "SUBMITTED") status = "Submitted to Director";
  else if (backendPlan.status === "DRAFT") status = "Draft";

  // Calculate estimated total from activities if included
  let estimatedTotalNum = 0;
  if (backendPlan.activities && backendPlan.activities.length > 0) {
    estimatedTotalNum = backendPlan.activities.reduce(
      (sum, act) => sum + (act.estimatedBudget || 0),
      0,
    );
  }

  // Format estimatedTotal as string
  const estimatedTotal =
    estimatedTotalNum > 0
      ? `${(estimatedTotalNum / 1000000).toFixed(1)}M ETB`
      : "0.0M ETB";

  // Calculate progress details from committeeVotes relation
  const votes = backendPlan.committeeVotes || [];
  const approvalsCount = votes.filter((v) => v.decision === "APPROVE").length;
  const progress = Math.min(100, Math.round((approvalsCount / 5) * 100)); // 5 members total
  const progressText = `${approvalsCount} of 5 approved`;

  // Look for current member's decision in this plan (if provided)
  let committeeDecision: "Approved" | "Rejected" | undefined = undefined;
  let decisionRecordedDate: string | undefined = undefined;
  let rejectionReason: string | undefined =
    backendPlan.rejectionReason || undefined;

  if (currentMemberId || currentMemberEmail) {
    const cleanId = (currentMemberId || "").toLowerCase();
    const cleanEmail = (currentMemberEmail || "").toLowerCase();
    const myVote = votes.find(
      (v) =>
        (cleanId &&
          (v.memberId?.toLowerCase() === cleanId ||
            (v.memberEmail && v.memberEmail.toLowerCase() === cleanId))) ||
        (cleanEmail &&
          ((v.memberEmail && v.memberEmail.toLowerCase() === cleanEmail) ||
            v.memberId?.toLowerCase() === cleanEmail)),
    );
    if (myVote) {
      committeeDecision =
        myVote.decision === "APPROVE" ? "Approved" : "Rejected";
      decisionRecordedDate = new Date(myVote.createdAt).toLocaleDateString(
        "en-GB",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
      );
      rejectionReason = myVote.comment || undefined;
    }
  }

  const parsedRejection = parseRejectionDetails(rejectionReason);

  return {
    id: backendPlan.id,
    projectId: backendPlan.projectId || backendPlan.project?.id || "proj-id",
    projectCode: backendPlan.project?.code || "BREFONS",
    projectName: backendPlan.project?.name || "MoA Project",
    planName: backendPlan.title || "Untitled Plan",
    budgetYear: backendPlan.budgetYear || "2018 EFY",
    category,
    planPeriodFrom: backendPlan.periodStart
      ? new Date(backendPlan.periodStart).toISOString().split("T")[0]
      : "",
    planPeriodTo: backendPlan.periodEnd
      ? new Date(backendPlan.periodEnd).toISOString().split("T")[0]
      : "",
    organizationRegion: backendPlan.organization || "Federal",
    description: backendPlan.description || undefined,
    status,
    createdBy:
      (backendPlan as any).creator?.name ||
      backendPlan.createdBy ||
      "Assigned Officer",
    assignedOfficer:
      (backendPlan.project as any)?.members
        ?.map((m: any) => m.user?.name)
        .filter(Boolean)
        .join(", ") ||
      (backendPlan as any).creator?.name ||
      "Assigned Officer",
    createdAt: backendPlan.createdAt,
    activitiesCount: backendPlan.activities ? backendPlan.activities.length : 0,
    estimatedTotal,
    isPriority: backendPlan.committeeVoteDeadline
      ? new Date(backendPlan.committeeVoteDeadline).getTime() -
          new Date().getTime() <
        7 * 24 * 60 * 60 * 1000
      : false,
    progress,
    progressText,
    deadlineDate: backendPlan.committeeVoteDeadline || undefined,
    deadlineText: backendPlan.committeeVoteDeadline
      ? new Date(backendPlan.committeeVoteDeadline).toLocaleDateString(
          "en-GB",
          {
            day: "numeric",
            month: "short",
            year: "numeric",
          },
        )
      : undefined,
    decisionRecordedDate,
    committeeDecision,
    rejectionReason,
    rejectionScope: parsedRejection.scope,
    rejectedActivityRefs: parsedRejection.rejectedActivityRefs,
    activities: backendPlan.activities || [],
  };
}

export function mapBackendPlanToOfficerPlanSummary(
  backendPlan: BackendPlan,
): import("@/features/projects/data/officerProjects").ProcurementPlanSummary {
  let category: import("@/features/projects/data/officerProjects").ProcurementCategory =
    "Goods";
  const rawCat = backendPlan.procurementCategory || "";
  if (rawCat === "WORKS") category = "Works";
  else if (rawCat === "CONSULTANCY") category = "Consultancy Services";
  else if (rawCat === "NON_CONSULTING") category = "Non-Consulting Services";

  let status: import("@/features/projects/data/officerProjects").ProcurementPlanStatus =
    "Draft";
  if (backendPlan.status === "WITH_COMMITTEE") status = "Committee Review";
  else if (backendPlan.status === "APPROVED") status = "Finally Approved";
  else if (backendPlan.status === "REJECTED") status = "Returned";
  else if (backendPlan.status === "SUBMITTED") status = "Submitted to Director";
  else if (backendPlan.status === "DRAFT") status = "Draft";

  const activities = backendPlan.activities || [];
  const estimatedValue = activities.reduce(
    (sum, a) => sum + (a.estimatedBudget || 0),
    0,
  );

  const planActivities: import("@/features/projects/data/officerActivityDrafts").ProcurementActivitySummary[] =
    activities.map((a: any) => {
      const methodCodeStr = (
        a.procurementMethod?.code ||
        a.procurementMethod?.label ||
        ""
      ).toLowerCase();
      const methodKey = methodCodeStr.includes("rfb_int")
        ? "rfb-international"
        : methodCodeStr.includes("rfb")
          ? "rfb-national"
          : methodCodeStr.includes("rfq")
            ? "rfq"
            : methodCodeStr.includes("dir")
              ? "direct-goods"
              : methodCodeStr.includes("qcbs")
                ? "qcbs"
                : methodCodeStr.includes("fbs")
                  ? "fbs"
                  : methodCodeStr.includes("lcs")
                    ? "lcs"
                    : methodCodeStr.includes("cqs")
                      ? "cqs"
                      : methodCodeStr.includes("indv")
                        ? "individual-consultant"
                        : "rfb-national";

      const templateRoadmap = roadmapForMethod(methodKey);
      const hasExplicitDates = (a.stages || []).some((st: any) =>
        Boolean(
          st.plannedStartDate ||
          st.currentTargetStartDate ||
          st.actualStartDate,
        ),
      );

      const baseDate = new Date("2026-09-05");
      let activeOffset = 0;

      const roadmap =
        a.stages && a.stages.length > 0
          ? a.stages.map((st: any, idx: number) => {
              const template =
                templateRoadmap[idx] ||
                templateRoadmap.find(
                  (t) =>
                    t.name.toLowerCase() ===
                    (st.stageType?.label || st.name || "").toLowerCase(),
                );
              const isTemplateOptional = template
                ? Boolean(template.allowNotApplicable)
                : false;

              const isNA = Boolean(
                st.isNotApplicable ||
                st.notApplicable ||
                st.status === "NOT_APPLICABLE" ||
                st.status === "Not Applicable" ||
                (!hasExplicitDates && isTemplateOptional),
              );

              let rawPlannedDate = st.plannedStartDate
                ? new Date(st.plannedStartDate).toISOString().slice(0, 10)
                : "";
              let rawTargetDate = st.currentTargetStartDate
                ? new Date(st.currentTargetStartDate).toISOString().slice(0, 10)
                : rawPlannedDate;

              if (!isNA && !rawPlannedDate) {
                const d = new Date(baseDate);
                d.setDate(baseDate.getDate() + activeOffset * 24);
                rawPlannedDate = d.toISOString().slice(0, 10);
                rawTargetDate = rawPlannedDate;
                activeOffset++;
              }

              const rawActualDate =
                st.actualEndDate || st.actualStartDate
                  ? new Date(st.actualEndDate || st.actualStartDate)
                      .toISOString()
                      .slice(0, 10)
                  : "";
              const isCompleted =
                st.status === "COMPLETED" || Boolean(st.actualEndDate);
              const isInProgress =
                st.status === "IN_PROGRESS" ||
                (Boolean(st.actualStartDate) && !isCompleted);

              return {
                id: st.id,
                stageTypeId: st.stageTypeId,
                sequence: st.sequence,
                name:
                  st.stageType?.label ||
                  st.name ||
                  template?.name ||
                  `Stage ${st.sequence || idx + 1}`,
                allowNotApplicable: true,
                days: String(st.plannedDays || 14),
                ethiopianDate: isNA
                  ? ""
                  : toEthiopianDateString(rawTargetDate || rawPlannedDate),
                gregorianDate: isNA ? "" : rawTargetDate || rawPlannedDate,
                plannedStartDate: isNA ? "" : rawPlannedDate,
                plannedEndDate: isNA
                  ? ""
                  : st.plannedEndDate
                    ? new Date(st.plannedEndDate).toISOString().slice(0, 10)
                    : "",
                currentTargetStartDate: isNA ? "" : rawTargetDate,
                currentTargetEndDate: isNA
                  ? ""
                  : st.currentTargetEndDate
                    ? new Date(st.currentTargetEndDate)
                        .toISOString()
                        .slice(0, 10)
                    : "",
                actualStartDate: isNA
                  ? ""
                  : st.actualStartDate
                    ? new Date(st.actualStartDate).toISOString().slice(0, 10)
                    : "",
                actualEndDate: isNA
                  ? ""
                  : st.actualEndDate
                    ? new Date(st.actualEndDate).toISOString().slice(0, 10)
                    : "",
                actualDate: isNA ? "" : rawActualDate,
                status: isNA
                  ? "Not Applicable"
                  : isCompleted
                    ? "Completed"
                    : isInProgress
                      ? "In Progress"
                      : st.status === "DELAYED"
                        ? "Delayed"
                        : "Not Started",
                notApplicable: isNA,
                remarks: st.remarks || "",
                revisions: (st.revisions || []).map((r: any) => ({
                  revisionNo: r.revisionNo,
                  revisedStartDate: r.revisedStartDate
                    ? new Date(r.revisedStartDate).toISOString().slice(0, 10)
                    : "",
                  revisedEndDate: r.revisedEndDate
                    ? new Date(r.revisedEndDate).toISOString().slice(0, 10)
                    : "",
                  reason: r.reason,
                  createdAt: r.createdAt
                    ? new Date(r.createdAt).toISOString()
                    : "",
                })),
              };
            })
          : templateRoadmap.map((tpl, idx) => {
              const isNA = Boolean(tpl.allowNotApplicable);
              let dateStr = "";
              if (!isNA) {
                const d = new Date(baseDate);
                d.setDate(baseDate.getDate() + activeOffset * 24);
                dateStr = d.toISOString().slice(0, 10);
                activeOffset++;
              }
              return {
                id: `tpl-stage-${idx + 1}`,
                sequence: idx + 1,
                name: tpl.name,
                allowNotApplicable: true,
                days: "14",
                ethiopianDate: isNA ? "" : toEthiopianDateString(dateStr),
                gregorianDate: isNA ? "" : dateStr,
                plannedStartDate: isNA ? "" : dateStr,
                plannedEndDate: isNA ? "" : dateStr,
                currentTargetStartDate: isNA ? "" : dateStr,
                currentTargetEndDate: isNA ? "" : dateStr,
                actualStartDate: "",
                actualEndDate: "",
                actualDate: "",
                status: isNA ? "Not Applicable" : "Not Started",
                notApplicable: isNA,
                remarks: "",
                revisions: [],
              };
            });

      const currentStageObj =
        roadmap.find(
          (st: any) => st.status === "In Progress" || st.status === "Delayed",
        ) ||
        roadmap.find((st: any) => st.status === "Not Started") ||
        roadmap[0];

      return {
        id: a.id,
        activityId: a.id,
        planId: backendPlan.id,
        projectId: backendPlan.projectId || backendPlan.project?.id,
        reference: a.reference || a.id,
        description: a.description || "Procurement activity package",
        category,
        method:
          a.procurementMethod?.label ||
          a.procurementMethod?.code ||
          "RFB - National",
        estimatedAmount: Number(a.estimatedBudget || 0),
        currentStage: currentStageObj?.name || "Not Started",
        status:
          a.status === "COMPLETED"
            ? "Completed"
            : a.status === "IN_PROGRESS" || a.status === "IN_EXECUTION"
              ? "In Progress"
              : a.status === "DELAYED"
                ? "Delayed"
                : "Not Started",
        details: {
          lots: a.lots || [],
          componentAllocations: (a.components || []).map((c: any) => ({
            id: c.component || "Component 1",
            label: c.component || "Component 1",
            percentage: c.allocationPct || 100,
          })),
          financingAllocations: (a.fundings || []).map((f: any) => ({
            id: f.loanGrantNumber || "Financing 1",
            label: f.fundingSource || "Financing 1",
            percentage: f.allocationPct || 100,
          })),
          form: {
            category,
            method:
              a.procurementMethod?.label ||
              a.procurementMethod?.code ||
              "RFB - National",
            activityDescription: a.description || "",
            estimatedAmount: String(a.estimatedBudget || 0),
            currency: a.currency || "ETB",
            fundingSource:
              a.fundings?.[0]?.fundingSource ||
              "African Development Bank (AfDB)",
            loanGrantNumber: a.fundings?.[0]?.loanGrantNumber || "",
            fundingAllocationPercent: a.fundings?.[0]?.allocationPct || 100,
            component: a.components?.[0]?.component || "",
            classificationCode: a.classificationCode || "42100000",
            classificationDescription: a.classificationDescription || "",
            locationRegion: a.locationRegion || "",
            inProcess: a.status === "IN_PROGRESS",
          },
          roadmap,
        } as any,
      };
    });

  return {
    reference: backendPlan.id,
    id: backendPlan.id,
    name: backendPlan.title || "Untitled Plan",
    budgetYear: backendPlan.budgetYear || "2018 EFY",
    category,
    status,
    rejectionReason: backendPlan.rejectionReason || undefined,
    activities: activities.length,
    completedActivities: activities.filter((a) => a.status === "COMPLETED")
      .length,
    inProgressActivities: activities.filter((a) => a.status === "IN_PROGRESS")
      .length,
    delayedActivities: activities.filter((a) => a.status === "DELAYED").length,
    currency: "ETB",
    estimatedValue,
    organizationRegion: backendPlan.organization || "Federal",
    description: backendPlan.description || undefined,
    planActivities,
    planPeriod: backendPlan.periodStart
      ? {
          from: {
            ethiopian: "01 Meskerem 2018",
            gregorian: new Date(backendPlan.periodStart).toLocaleDateString(
              "en-GB",
              { day: "numeric", month: "short", year: "numeric" },
            ),
          },
          to: {
            ethiopian: "30 Sene 2018",
            gregorian: new Date(backendPlan.periodEnd).toLocaleDateString(
              "en-GB",
              { day: "numeric", month: "short", year: "numeric" },
            ),
          },
        }
      : undefined,
  };
}
