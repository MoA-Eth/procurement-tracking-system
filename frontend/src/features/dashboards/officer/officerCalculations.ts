import type { BackendPlan } from "@/lib/plansApi";
import type { BackendProject } from "@/lib/projectsApi";
import { isProjectAssignedToOfficer } from "@/lib/projectsApi";
import type { AuthUser } from "@/lib/authTypes";
import type { OfficerAlert } from "./officerData";

export function formatTimeAgo(
  dateInput?: string | number | Date | null,
  currentTime: number | null = null,
): string {
  if (!dateInput || currentTime === null) return "";
  const timestamp = new Date(dateInput).getTime();
  if (isNaN(timestamp)) return "";
  const diffMs = currentTime - timestamp;
  if (diffMs < 0) return "just now";

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

export function formatDirectorNote(
  reason?: string | null,
  activityCount?: number,
): string {
  if (!reason) {
    return activityCount && activityCount > 0
      ? `Review ${activityCount} ${activityCount === 1 ? "activity" : "activities"} and resubmit for approval.`
      : "Review comments and resubmit for approval.";
  }

  // Clean out repetitive boilerplate prefixes
  const cleaned = reason
    .replace(/^returned\s+by\s+director\s*[:.-]?\s*/i, "")
    .replace(/^returned\s+for\s+revisions?\s*(by\s+director)?\s*[:.-]?\s*/i, "")
    .replace(/^director\s*(note|comment|feedback)?\s*[:.-]?\s*/i, "")
    .trim();

  // If the remark is just the default placeholder (e.g. "Returned by Director for revisions.")
  if (
    !cleaned ||
    /^for\s+revisions?\.?$/i.test(cleaned) ||
    /^revisions?\.?$/i.test(cleaned) ||
    /^returned\s*(by\s*director)?\.?$/i.test(cleaned)
  ) {
    return activityCount && activityCount > 0
      ? `Review ${activityCount} ${activityCount === 1 ? "activity" : "activities"} and resubmit for approval.`
      : "Review comments and resubmit for approval.";
  }

  return cleaned;
}

export function formatPlanReference(
  projectCode?: string | null,
  planTitle?: string | null,
): string {
  const title = (planTitle || "Annual Procurement Plan").trim();
  if (!projectCode) return title;
  const code = projectCode.trim();

  // If title already includes the project code or code includes title, avoid duplicate prefix
  if (
    title.toLowerCase().includes(code.toLowerCase()) ||
    code.toLowerCase().includes(title.toLowerCase())
  ) {
    return title;
  }

  return `${code} • ${title}`;
}

export function formatReturnedPlanDetail(
  reason?: string | null,
  activityCount?: number,
): string {
  if (!reason) {
    return activityCount && activityCount > 0
      ? `${activityCount} ${activityCount === 1 ? "activity" : "activities"} to review & resubmit`
      : "Review comments and resubmit for approval";
  }

  const cleaned = reason
    .replace(/^returned\s+by\s+director\s*[:.-]?\s*/i, "")
    .replace(/^returned\s+for\s+revisions?\s*(by\s+director)?\s*[:.-]?\s*/i, "")
    .replace(/^director\s*[:.-]?\s*/i, "")
    .trim();

  if (
    !cleaned ||
    /^for\s+revisions?\.?$/i.test(cleaned) ||
    /^revisions?\.?$/i.test(cleaned) ||
    /^returned\s*(by\s*director)?\.?$/i.test(cleaned)
  ) {
    return activityCount && activityCount > 0
      ? `${activityCount} ${activityCount === 1 ? "activity" : "activities"} to review & resubmit`
      : "Review comments and resubmit for approval";
  }

  return `Feedback: ${cleaned}`;
}

export function formatDelayedActivityAlert(
  act: {
    id: string;
    reference?: string | null;
    code?: string | null;
    description?: string | null;
    currentStage?: string | null;
    stages?: any[];
    daysOverdue?: number | null;
    delayDays?: number | null;
    periodEnd?: string | null;
    updatedAt?: string | null;
  },
  projectCode?: string | null,
  currentTime: number | null = null,
): OfficerAlert {
  const delayedStage = (act.stages || []).find(
    (st: any) =>
      st.status === "DELAYED" ||
      (currentTime !== null &&
        !st.isNotApplicable &&
        st.status !== "COMPLETED" &&
        ((st.currentTargetStartDate &&
          new Date(st.currentTargetStartDate).getTime() < currentTime) ||
          (st.currentTargetEndDate &&
            new Date(st.currentTargetEndDate).getTime() < currentTime) ||
          (st.plannedEndDate &&
            new Date(st.plannedEndDate).getTime() < currentTime) ||
          (st.plannedStartDate &&
            new Date(st.plannedStartDate).getTime() < currentTime))),
  );

  const stageLabel =
    delayedStage?.stageType?.label ||
    delayedStage?.name ||
    delayedStage?.stageName ||
    act.currentStage ||
    act.description ||
    "Procurement Stage Overdue";

  const targetDate =
    delayedStage?.currentTargetEndDate ||
    delayedStage?.currentTargetStartDate ||
    delayedStage?.plannedEndDate ||
    delayedStage?.plannedStartDate ||
    act.periodEnd ||
    act.updatedAt;

  let delayDays = Number(act.daysOverdue || act.delayDays) || 0;
  if (targetDate && currentTime !== null) {
    const diffMs = currentTime - new Date(targetDate).getTime();
    if (diffMs > 0) {
      delayDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  const statusLine =
    delayDays > 0 ? `${delayDays} Day(s) Overdue` : "Delayed Activity";

  const reference = (
    act.reference ||
    act.code ||
    (projectCode ? `${projectCode}-${act.id.slice(0, 6)}` : act.id)
  ).trim();

  return {
    id: `delayed-${act.id || act.reference}`,
    statusLine,
    referenceLine: reference,
    detailLine: stageLabel,
    actionLabel: "Track",
    href: `/workspace/activity-tracker?activity=${encodeURIComponent(act.reference || act.id)}`,
    tone: "delayed",
    dateTime: targetDate || new Date().toISOString(),
  };
}

export function filterAssignedProjects(
  projects: BackendProject[],
  user: AuthUser,
): BackendProject[] {
  return projects.filter((p) => isProjectAssignedToOfficer(p, user));
}

export function mapOfficerProjectsList(assignedProjects: BackendProject[]) {
  return assignedProjects.map((p) => ({
    code: p.code,
    name: p.name,
    fundingSource: p.fundingSource?.label || p.fundingSource?.code || "—",
    activePlans: p.plans ? p.plans.length : 0,
  }));
}

export function filterAssignedPlans(
  plans: BackendPlan[],
  assignedProjects: BackendProject[],
): BackendPlan[] {
  if (plans.length === 0 || assignedProjects.length === 0) return [];
  const assignedIds = new Set(
    assignedProjects.map((p) => p.id).filter(Boolean),
  );
  const assignedCodes = new Set(
    assignedProjects.map((p) => p.code.toLowerCase()),
  );
  return plans.filter(
    (p) =>
      (p.projectId && assignedIds.has(p.projectId)) ||
      (p.project?.id && assignedIds.has(p.project.id)) ||
      (p.project?.code && assignedCodes.has(p.project.code.toLowerCase())),
  );
}

export function extractLiveDelayedActivities(
  assignedPlans: BackendPlan[],
  currentTime: number | null,
): { act: any; plan: BackendPlan }[] {
  const list: { act: any; plan: BackendPlan }[] = [];
  for (const p of assignedPlans) {
    for (const a of p.activities || []) {
      const hasDelayedStage = (a.stages || []).some(
        (st: any) =>
          st.status === "DELAYED" ||
          (currentTime !== null &&
            !st.isNotApplicable &&
            st.status !== "COMPLETED" &&
            ((st.currentTargetStartDate &&
              new Date(st.currentTargetStartDate).getTime() < currentTime) ||
              (st.currentTargetEndDate &&
                new Date(st.currentTargetEndDate).getTime() < currentTime) ||
              (st.plannedEndDate &&
                new Date(st.plannedEndDate).getTime() < currentTime) ||
              (st.plannedStartDate &&
                new Date(st.plannedStartDate).getTime() < currentTime))),
      );
      if (
        a.status === "DELAYED" ||
        (a as any).performanceStatus === "DELAYED" ||
        hasDelayedStage
      ) {
        list.push({ act: a, plan: p });
      }
    }
  }
  return list;
}

export function calculateOverviewStatusItems(
  assignedProjectsCount: number,
  assignedPlans: BackendPlan[],
  delayedActivitiesCount: number,
) {
  const draftCount = assignedPlans.filter(
    (p) => p.status === "DRAFT" || (p as any).status === "Draft",
  ).length;
  const returnedCount = assignedPlans.filter(
    (p) => p.status === "REJECTED" || (p as any).status === "Returned",
  ).length;
  const submittedCount = assignedPlans.filter(
    (p) =>
      p.status === "SUBMITTED" || (p as any).status === "Submitted to Director",
  ).length;
  const approvedCount = assignedPlans.filter(
    (p) => p.status === "APPROVED" || (p as any).status === "Finally Approved",
  ).length;

  return [
    {
      label: "Assigned projects",
      value: assignedProjectsCount,
      href: "/workspace/projects",
    },
    {
      label: "Returned plans",
      value: returnedCount,
      href: "/workspace/projects",
    },
    {
      label: "Submitted plans",
      value: submittedCount,
      href: "/workspace/projects",
    },
    {
      label: "Draft plans",
      value: draftCount,
      href: "/workspace/projects",
    },
    {
      label: "Finally approved",
      value: approvedCount,
      href: "/workspace/projects",
    },
    {
      label: "Delayed activities",
      value: delayedActivitiesCount,
      href: "/workspace/activity-tracker",
    },
  ];
}

export function generateDynamicAlerts(
  assignedPlans: BackendPlan[],
  liveDelayedActivities: { act: any; plan: BackendPlan }[],
  currentTime: number | null,
): OfficerAlert[] {
  const list: OfficerAlert[] = [];

  // Returned plan alerts
  const returnedPlans = assignedPlans.filter(
    (p) => p.status === "REJECTED" || (p as any).status === "Returned",
  );
  for (const returned of returnedPlans) {
    const refLine = formatPlanReference(returned.project?.code, returned.title);
    const directorNote = formatDirectorNote(
      returned.rejectionReason,
      returned.activities?.length,
    );
    const timeAgo = formatTimeAgo(returned.updatedAt, currentTime);

    list.push({
      id: `returned-${returned.id}`,
      statusLine: "Returned for Revision",
      referenceLine: refLine,
      detailLine: `Director note: ${directorNote}`,
      directorNote,
      timeAgo,
      actionLabel: "Review",
      href: `/workspace/projects?project=${encodeURIComponent(returned.project?.code || "")}&plan=${encodeURIComponent(returned.id)}`,
      tone: "returned",
      dateTime: returned.updatedAt || new Date().toISOString(),
    });
  }

  // Delayed activity alerts
  for (const { act, plan } of liveDelayedActivities) {
    list.push(formatDelayedActivityAlert(act, plan.project?.code, currentTime));
  }

  // Approved plan alerts
  const approvedPlans = assignedPlans.filter(
    (p) => p.status === "APPROVED" || (p as any).status === "Finally Approved",
  );
  for (const approved of approvedPlans) {
    const refLine = formatPlanReference(approved.project?.code, approved.title);

    list.push({
      id: `approved-${approved.id}`,
      statusLine: "Finally Approved",
      referenceLine: refLine,
      detailLine: "Ready for procurement activity execution",
      actionLabel: "View plan",
      href: `/workspace/projects?project=${encodeURIComponent(approved.project?.code || "")}&plan=${encodeURIComponent(approved.id)}`,
      tone: "approved",
      dateTime: approved.updatedAt || new Date().toISOString(),
    });
  }

  return list;
}
