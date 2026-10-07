import type { BackendPlan } from "@/lib/plansApi";
import type { BackendProject } from "@/lib/projectsApi";
import { isProjectAssignedToOfficer } from "@/lib/projectsApi";
import type { AuthUser } from "@/lib/authTypes";
import type { SystemNotification } from "@/lib/alertsApi";
import { calculateRealActivityDelay } from "@/features/projects/components/PhaseDelayBreakdownModal";
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
    remarks?: string | null;
  },
  projectCode?: string | null,
  currentTime: number | null = null,
): OfficerAlert {
  const actStages =
    act.stages || (act as any).details?.roadmap || (act as any).roadmap || [];

  const delayedStage = actStages.find(
    (st: any) =>
      st.status === "DELAYED" ||
      st.status === "Delayed" ||
      (currentTime !== null &&
        !st.isNotApplicable &&
        !st.notApplicable &&
        st.status !== "COMPLETED" &&
        st.status !== "Completed" &&
        st.status !== "Not Applicable" &&
        ((st.currentTargetEndDate &&
          new Date(st.currentTargetEndDate).getTime() < currentTime) ||
          (st.plannedEndDate &&
            new Date(st.plannedEndDate).getTime() < currentTime) ||
          (st.currentTargetStartDate &&
            new Date(st.currentTargetStartDate).getTime() < currentTime) ||
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

  // Factor in real phase delay across stages if available
  if (actStages.length > 0) {
    const realStageDelay = calculateRealActivityDelay(actStages);
    if (realStageDelay > delayDays) {
      delayDays = realStageDelay;
    }
  }

  const delayReason =
    delayedStage?.remarks ||
    delayedStage?.reason ||
    act.remarks ||
    "Pending milestone completion / supplier responsiveness";

  const statusLine =
    delayDays > 0 ? `${delayDays} Day(s) Overdue` : `Delayed Activity`;

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
    stages: actStages,
    delayDays,
    activityDescription: act.description || stageLabel,
    delayedStage: stageLabel,
    delayReason,
    category: (act as any).category || (act as any).plan?.category || undefined,
    method:
      (act as any).method ||
      (act as any).procurementMethod?.label ||
      (act as any).procurementMethod ||
      undefined,
  };
}

export function filterAssignedProjects(
  projects: BackendProject[],
  user: AuthUser,
): BackendProject[] {
  const filtered = projects.filter((p) => isProjectAssignedToOfficer(p, user));
  const seen = new Set<string>();
  return filtered.filter((p) => {
    const key = (p.code || p.id || "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mapOfficerProjectsList(
  assignedProjects: BackendProject[],
  assignedPlans: BackendPlan[] = [],
) {
  return assignedProjects.map((p) => {
    const pId = (p.id || "").toLowerCase().trim();
    const pCode = (p.code || "").toLowerCase().trim();
    const matchingPlans = assignedPlans.filter((plan) => {
      const planProjId = (plan.projectId || plan.project?.id || "")
        .toLowerCase()
        .trim();
      const planProjCode = (plan.project?.code || "").toLowerCase().trim();
      return (pId && planProjId === pId) || (pCode && planProjCode === pCode);
    });
    const activePlans =
      matchingPlans.length > 0
        ? matchingPlans.length
        : p.plans
          ? p.plans.length
          : 0;

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      fundingSource: p.fundingSource?.label || p.fundingSource?.code || "—",
      activePlans,
    };
  });
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
    assignedProjects.map((p) => (p.code || "").toLowerCase()).filter(Boolean),
  );
  return plans.filter(
    (p) =>
      (p.projectId && assignedIds.has(p.projectId)) ||
      (p.project?.id && assignedIds.has(p.project.id)) ||
      (p.project?.code &&
        assignedCodes.has((p.project.code || "").toLowerCase())),
  );
}

export function extractLiveDelayedActivities(
  assignedPlans: BackendPlan[],
  currentTime: number | null,
  extraActivities: any[] = [],
  trackingRecords: any[] = [],
): { act: any; plan: BackendPlan }[] {
  const list: { act: any; plan: BackendPlan }[] = [];
  const seenRefs = new Set<string>();

  const processActivity = (a: any, p: BackendPlan) => {
    const refKey = (a.reference || a.code || a.id || "").toLowerCase().trim();
    if (!refKey || seenRefs.has(refKey)) return;

    // Check if tracking record exists for this activity
    const tracking = trackingRecords.find(
      (tr: any) =>
        (tr.activityReference || "").toLowerCase().trim() === refKey ||
        (a.id &&
          (tr.activityReference || "").toLowerCase().trim() ===
            a.id.toLowerCase().trim()),
    );

    // Merge stages from a.stages, a.details.roadmap, a.roadmap
    let actStages: any[] = [
      ...(a.stages || (a as any).details?.roadmap || (a as any).roadmap || []),
    ];

    // If tracking record has stage details, merge actual dates and revisions
    if (
      tracking &&
      Array.isArray(tracking.stages) &&
      tracking.stages.length > 0
    ) {
      actStages = actStages.map((st: any) => {
        const trStage = tracking.stages.find(
          (ts: any) =>
            (ts.stageName || "").toLowerCase().trim() ===
            (st.stageType?.label || st.name || st.stageName || "")
              .toLowerCase()
              .trim(),
        );
        if (trStage) {
          return {
            ...st,
            status:
              trStage.status === "Completed"
                ? "COMPLETED"
                : trStage.status === "In Progress"
                  ? "IN_PROGRESS"
                  : st.status,
            actualEndDate: trStage.actualDate?.gregorian || st.actualEndDate,
            remarks: trStage.remarks || st.remarks,
            revisions: trStage.revisions || st.revisions,
          };
        }
        return st;
      });
    }

    const realDelay = calculateRealActivityDelay(actStages);

    const hasDelayedStage = actStages.some(
      (st: any) =>
        st.status === "DELAYED" ||
        st.status === "Delayed" ||
        (currentTime !== null &&
          !st.isNotApplicable &&
          !st.notApplicable &&
          st.status !== "COMPLETED" &&
          st.status !== "Completed" &&
          st.status !== "Not Applicable" &&
          ((st.currentTargetStartDate &&
            new Date(st.currentTargetStartDate).getTime() < currentTime) ||
            (st.currentTargetEndDate &&
              new Date(st.currentTargetEndDate).getTime() < currentTime) ||
            (st.plannedEndDate &&
              new Date(st.plannedEndDate).getTime() < currentTime) ||
            (st.plannedStartDate &&
              new Date(st.plannedStartDate).getTime() < currentTime))),
    );

    const isDelayed =
      a.status === "DELAYED" ||
      a.status === "Delayed" ||
      (a as any).performanceStatus === "DELAYED" ||
      Number((a as any).daysOverdue || (a as any).delayDays) > 0 ||
      realDelay > 0 ||
      hasDelayedStage;

    if (isDelayed) {
      seenRefs.add(refKey);
      list.push({
        act: {
          ...a,
          stages: actStages,
          delayDays:
            realDelay > 0
              ? realDelay
              : Number((a as any).delayDays || (a as any).daysOverdue) || 0,
        },
        plan: p,
      });
    }
  };

  // 1. Process activities directly inside assigned plans
  for (const p of assignedPlans) {
    for (const a of p.activities || []) {
      processActivity(a, p);
    }
  }

  // 2. Process extra activities (from /api/activities and local activity drafts)
  for (const extra of extraActivities) {
    const matchingPlan = assignedPlans.find((p) => {
      const pId = (p.id || "").toLowerCase().trim();
      const pTitle = (p.title || "").toLowerCase().trim();
      const pCode = (p.project?.code || p.projectId || "").toLowerCase().trim();

      const extraPlanId = (
        extra.planId ||
        extra.plan?.id ||
        extra.planReference ||
        ""
      )
        .toLowerCase()
        .trim();
      const extraPlanTitle = (extra.plan?.title || extra.planReference || "")
        .toLowerCase()
        .trim();
      const extraProjCode = (
        extra.plan?.project?.code ||
        extra.projectCode ||
        ""
      )
        .toLowerCase()
        .trim();

      return (
        (pId && extraPlanId === pId) ||
        (pTitle && extraPlanTitle === pTitle) ||
        (pCode && extraProjCode === pCode)
      );
    });

    if (matchingPlan) {
      processActivity(extra, matchingPlan);
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
      p.status === "SUBMITTED" ||
      (p as any).status === "Submitted to Director" ||
      (p as any).status === "WITH_COMMITTEE" ||
      (p as any).status === "Under Committee Review",
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
  systemNotifications: SystemNotification[] = [],
): OfficerAlert[] {
  const list: OfficerAlert[] = [];
  const seenAlertIds = new Set<string>();

  // 1. Returned plan alerts
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
    const alertId = `returned-${returned.id}`;

    seenAlertIds.add(alertId);
    list.push({
      id: alertId,
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

  // 2. Delayed activity alerts
  for (const { act, plan } of liveDelayedActivities) {
    const alert = formatDelayedActivityAlert(
      act,
      plan.project?.code,
      currentTime,
    );
    if (!seenAlertIds.has(alert.id)) {
      seenAlertIds.add(alert.id);
      list.push(alert);
    }
  }

  // 3. Approved plan alerts
  const approvedPlans = assignedPlans.filter(
    (p) => p.status === "APPROVED" || (p as any).status === "Finally Approved",
  );
  for (const approved of approvedPlans) {
    const refLine = formatPlanReference(approved.project?.code, approved.title);
    const alertId = `approved-${approved.id}`;

    if (!seenAlertIds.has(alertId)) {
      seenAlertIds.add(alertId);
      list.push({
        id: alertId,
        statusLine: "Finally Approved",
        referenceLine: refLine,
        detailLine: "Ready for procurement activity execution",
        actionLabel: "View plan",
        href: `/workspace/projects?project=${encodeURIComponent(approved.project?.code || "")}&plan=${encodeURIComponent(approved.id)}`,
        tone: "approved",
        dateTime: approved.updatedAt || new Date().toISOString(),
      });
    }
  }

  // 4. Live System / Backend Notifications from /api/alerts
  for (const notif of systemNotifications) {
    const notifAlertId = `notif-${notif.id}`;
    if (seenAlertIds.has(notifAlertId)) continue;

    // Don't duplicate plan alerts if we already have them
    const notifTitle = (notif.title || "").toLowerCase();
    const isPlanAlert =
      notif.type === "plan" ||
      notifTitle.includes("plan") ||
      (notif.link && notif.link.includes("plan"));
    if (
      isPlanAlert &&
      Array.from(seenAlertIds).some((id) =>
        id.includes(notif.id.replace("alert-", "")),
      )
    ) {
      continue;
    }

    seenAlertIds.add(notifAlertId);
    const isUrgent = notif.priority === "urgent";
    const isApproved =
      notif.type === "approval" || notifTitle.includes("approved");

    list.push({
      id: notifAlertId,
      statusLine: isUrgent
        ? "Action Required"
        : isApproved
          ? "Approved"
          : notif.title,
      referenceLine: notif.title,
      detailLine: notif.message,
      actionLabel: notif.actionLabel || "View",
      href: notif.link || "/workspace",
      tone: isApproved ? "approved" : isUrgent ? "returned" : "upcoming",
      timeAgo: notif.timestamp,
      dateTime: notif.readAt || new Date().toISOString(),
    });
  }

  return list;
}
