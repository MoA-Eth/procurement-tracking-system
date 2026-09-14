import type { ProcurementPlan } from "@/features/plans/plansData";

export function filterAwaitingPlans(
  plans: ProcurementPlan[],
): ProcurementPlan[] {
  return plans.filter(
    (p) => p.status === "Committee Review" && p.committeeDecision === undefined,
  );
}

export function filterDelayedPlans(
  awaitingPlans: ProcurementPlan[],
): ProcurementPlan[] {
  const now = Date.now();
  return awaitingPlans.filter((p) => {
    if (!p.deadlineDate) return false;
    return new Date(p.deadlineDate).getTime() < now;
  });
}

export function filterReviewedPlans(
  plans: ProcurementPlan[],
): ProcurementPlan[] {
  return plans.filter((p) => p.committeeDecision !== undefined);
}

export function calculateVoteStats(reviewedPlans: ProcurementPlan[]) {
  const totalReviewedCount = reviewedPlans.length;
  const approvedCount = reviewedPlans.filter(
    (p) => p.committeeDecision === "Approved",
  ).length;
  const rejectedCount = reviewedPlans.filter(
    (p) => p.committeeDecision === "Rejected",
  ).length;

  const approvedPercent =
    totalReviewedCount > 0
      ? Math.round((approvedCount / totalReviewedCount) * 100)
      : 0;
  const rejectedPercent = totalReviewedCount > 0 ? 100 - approvedPercent : 0;

  return {
    totalReviewedCount,
    approvedCount,
    rejectedCount,
    approvedPercent,
    rejectedPercent,
  };
}

export function sortAwaitingPlans(
  awaitingPlans: ProcurementPlan[],
): ProcurementPlan[] {
  return [...awaitingPlans].sort((a, b) => {
    if (!a.deadlineDate) return 1;
    if (!b.deadlineDate) return -1;
    return (
      new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime()
    );
  });
}

export function filterAwaitingPlansByQuery(
  awaitingPlans: ProcurementPlan[],
  filter: "all" | "delayed",
  searchQuery: string,
): ProcurementPlan[] {
  const now = Date.now();
  const displayed = awaitingPlans.filter((plan) => {
    if (filter === "delayed") {
      if (!plan.deadlineDate) return false;
      return new Date(plan.deadlineDate).getTime() < now;
    }
    return true;
  });

  if (!searchQuery.trim()) return displayed;

  const q = searchQuery.toLowerCase();
  return displayed.filter(
    (plan) =>
      plan.planName.toLowerCase().includes(q) ||
      plan.projectCode.toLowerCase().includes(q) ||
      plan.category.toLowerCase().includes(q),
  );
}

export function extractRecentDecisions(
  reviewedPlans: ProcurementPlan[],
  count = 2,
): ProcurementPlan[] {
  return [...reviewedPlans]
    .sort((a, b) => {
      const dateA = a.decisionRecordedDate
        ? new Date(a.decisionRecordedDate).getTime()
        : 0;
      const dateB = b.decisionRecordedDate
        ? new Date(b.decisionRecordedDate).getTime()
        : 0;
      return dateB - dateA;
    })
    .slice(0, count);
}
