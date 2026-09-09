import type { BackendPlan } from "@/lib/plansApi";
import type { BackendContract } from "@/lib/contractsApi";
import type { DirectorPlan, PipelineStageVolume } from "../directorData";
import { formatRelativeTime } from "../directorFormatters";

import type { UserRole } from "@/types";

/**
 * Compute plans awaiting review (Director review for DIRECTOR, Executive authorization for MANAGEMENT)
 */
export function computePendingPlans(
  filteredPlans: BackendPlan[],
  userRole: UserRole = "DIRECTOR",
): DirectorPlan[] {
  if (userRole === "MANAGEMENT") {
    return filteredPlans
      .filter((p) => {
        const rawStatus = (p.status || "").toUpperCase();
        const hasDecision = (p as any).managementDecision != null;
        return (
          !hasDecision &&
          (rawStatus === "AWAITING_MANAGEMENT_APPROVAL" ||
            rawStatus === "COMMITTEE_ENDORSED" ||
            p.status === "Awaiting Management Approval" ||
            p.status === "Committee Endorsed" ||
            (p as any).committeeStatus === "Endorsed")
        );
      })
      .map((p) => ({
        id: p.id,
        title: p.title || "Procurement Plan",
        directorate: p.project?.name || p.organization || "—",
        submittedBy:
          p.creator?.displayName || p.creator?.name || "Procurement Officer",
        submissionDate: formatRelativeTime(p.createdAt),
        status: "Awaiting Review" as const,
        totalActivitiesCount: p.activities?.length || 0,
        estimatedBudgetETB: (p.activities || []).reduce((sum, a) => {
          const budget = Number(a.estimatedBudget) || 0;
          const rate = a.currency === "USD" ? 125 : 1;
          return sum + budget * rate;
        }, 0),
        description: p.description || "",
        activities: [],
      }));
  }

  return filteredPlans
    .filter(
      (p) =>
        p.status === "SUBMITTED" ||
        p.status === "PENDING_REVIEW" ||
        p.status === "UPDATE_REQUESTED" ||
        (p as any).status === "Submitted to Director",
    )
    .map((p) => ({
      id: p.id,
      title: p.title || "Procurement Plan",
      directorate: p.project?.name || p.organization || "—",
      submittedBy:
        p.creator?.displayName || p.creator?.name || "Assigned Officer",
      submissionDate: formatRelativeTime(p.createdAt),
      status: "Awaiting Review" as const,
      totalActivitiesCount: p.activities?.length || 0,
      estimatedBudgetETB: (p.activities || []).reduce((sum, a) => {
        const budget = Number(a.estimatedBudget) || 0;
        const rate = a.currency === "USD" ? 125 : 1;
        return sum + budget * rate;
      }, 0),
      description: p.description || "",
      activities: [],
    }));
}

/**
 * Compute count of plans under committee review or awaiting review
 */
export function computeCommitteePlansCount(
  filteredPlans: BackendPlan[],
  _userRole: UserRole = "DIRECTOR",
): number {
  return filteredPlans.filter(
    (p) =>
      p.status === "WITH_COMMITTEE" ||
      p.status === "UNDER_COMMITTEE_REVIEW" ||
      (p as any).status === "Committee Review",
  ).length;
}

/**
 * 9-Stage Macro Workflow Pipeline Stage Volume
 */
export function computePipelineStages(
  filteredPlans: BackendPlan[],
  contracts: BackendContract[],
  selectedProject: string,
  selectedSector: string,
  awaitingReviewCount: number,
  committeePlansCount: number,
): PipelineStageVolume[] {
  let draftPlans = 0;
  let tenderCount = 0;
  let evalCount = 0;
  let awardCount = 0;
  let contractCount = 0;
  let execCount = 0;
  let doneCount = 0;

  for (const plan of filteredPlans) {
    if (plan.status === "DRAFT") draftPlans++;
    if (plan.status === "APPROVED" || plan.status === "COMPLETED") {
      doneCount++;
    }

    for (const act of plan.activities || []) {
      const activeStage =
        (act.stages || []).find((s) => s.status === "IN_PROGRESS") ||
        (act.stages || [])[0];
      const stageName = (
        activeStage?.stageType?.label ||
        (activeStage as any)?.name ||
        ""
      ).toLowerCase();

      if (
        stageName.includes("draft") ||
        stageName.includes("initiation") ||
        stageName.includes("plan")
      ) {
        draftPlans++;
      } else if (
        stageName.includes("tender") ||
        stageName.includes("bid") ||
        stageName.includes("advert") ||
        stageName.includes("rfp")
      ) {
        tenderCount++;
      } else if (
        stageName.includes("eval") ||
        stageName.includes("opening") ||
        stageName.includes("technical") ||
        stageName.includes("financial")
      ) {
        evalCount++;
      } else if (
        stageName.includes("award") ||
        stageName.includes("intention") ||
        stageName.includes("recommendation")
      ) {
        awardCount++;
      } else if (stageName.includes("contract") || stageName.includes("sign")) {
        contractCount++;
      } else if (
        stageName.includes("delivery") ||
        stageName.includes("exec") ||
        stageName.includes("implementation") ||
        stageName.includes("work")
      ) {
        execCount++;
      } else {
        tenderCount++;
      }
    }
  }

  const allowedActivityIds = new Set(
    filteredPlans.flatMap((p) => (p.activities || []).map((a) => a.id)),
  );
  const relevantContracts = contracts.filter((c) => {
    if (selectedProject !== "ALL" || selectedSector !== "All Sectors") {
      return c.activityId && allowedActivityIds.has(c.activityId);
    }
    return true;
  });

  const activeContracts = relevantContracts.filter(
    (c) => c.status === "ACTIVE" || c.status === "PENDING",
  );
  const completedContracts = relevantContracts.filter(
    (c) => c.status === "COMPLETED",
  );
  if (activeContracts.length > 0) {
    contractCount = Math.max(contractCount, activeContracts.length);
    execCount = Math.max(
      execCount,
      activeContracts.filter((c) => Number(c.paidAmount || 0) > 0).length,
    );
  }
  if (completedContracts.length > 0) {
    doneCount += completedContracts.length;
  }

  return [
    {
      id: 1,
      code: "1. PLAN",
      title: "1. PLAN",
      sublabel: "Created",
      count: draftPlans,
      accent: "default",
    },
    {
      id: 2,
      code: "2. REVIEW",
      title: "2. REVIEW",
      sublabel: "Director",
      count: awaitingReviewCount,
      accent: "amber",
    },
    {
      id: 3,
      code: "3. COMM",
      title: "3. COMM",
      sublabel: "Voting",
      count: committeePlansCount,
      accent: "purple",
    },
    {
      id: 4,
      code: "4. TENDER",
      title: "4. TENDER",
      sublabel: "Published",
      count: tenderCount,
      accent: "default",
    },
    {
      id: 5,
      code: "5. EVAL",
      title: "5. EVAL",
      sublabel: "Technical",
      count: evalCount,
      accent: "default",
    },
    {
      id: 6,
      code: "6. AWARD",
      title: "6. AWARD",
      sublabel: "Intention",
      count: awardCount,
      accent: "default",
    },
    {
      id: 7,
      code: "7. CONT",
      title: "7. CONT",
      sublabel: "Signed",
      count: contractCount,
      accent: "teal",
    },
    {
      id: 8,
      code: "8. EXEC",
      title: "8. EXEC",
      sublabel: "Delivery",
      count: execCount,
      accent: "default",
    },
    {
      id: 9,
      code: "9. DONE",
      title: "9. DONE",
      sublabel: "Completed",
      count: doneCount,
      accent: "emerald",
    },
  ];
}
