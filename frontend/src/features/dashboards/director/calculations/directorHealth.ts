import type { BackendPlan } from "@/lib/plansApi";
import type {
  CriticalDelay,
  DirectorateHealthMetrics,
  FinancialCapitalSummary,
} from "../directorData";

// Only plans in execution can have delayed activities; draft, submitted and
// under-review plans have not started their schedules.
const EXECUTION_PLAN_STATUSES = new Set([
  "APPROVED",
  "MANAGEMENT_APPROVED",
  "UPDATE_REQUESTED",
]);
const FINISHED_ACTIVITY_STATUSES = new Set(["COMPLETED", "CANCELLED"]);
const CRITICAL_DELAY_DAYS = 7;

/**
 * Identify critical delays (>7 days past scheduled end date)
 */
export function computeCriticalDelays(
  filteredPlans: BackendPlan[],
  currentTime: number,
): CriticalDelay[] {
  const delays: CriticalDelay[] = [];
  const now = currentTime;

  for (const plan of filteredPlans) {
    if (!EXECUTION_PLAN_STATUSES.has(String(plan.status))) continue;
    for (const act of plan.activities || []) {
      if (FINISHED_ACTIVITY_STATUSES.has(String(act.status))) continue;
      const delayedStage = (act.stages || []).find((s: any) => {
        if (s.isNotApplicable || s.status === "COMPLETED") return false;
        if (s.status === "DELAYED") return true;
        const deadline = s.currentTargetEndDate || s.plannedEndDate;
        if (deadline && now && new Date(deadline).getTime() < now) {
          return true;
        }
        return false;
      });

      if (act.status === "DELAYED" || delayedStage) {
        const deadline =
          delayedStage?.currentTargetEndDate ||
          delayedStage?.plannedEndDate ||
          plan.createdAt;
        const daysOverdue =
          deadline && now
            ? Math.max(
                1,
                Math.round(
                  (now - new Date(deadline).getTime()) / (1000 * 60 * 60 * 24),
                ),
              )
            : 0;
        const stageDeadline =
          delayedStage?.currentTargetEndDate || delayedStage?.plannedEndDate;
        // Only delays beyond the threshold are critical (when the stage
        // deadline is known; an explicit DELAYED status without dates counts).
        if (stageDeadline && daysOverdue <= CRITICAL_DELAY_DAYS) continue;

        const stageLabel =
          delayedStage?.stageType?.label ||
          (delayedStage as any)?.name ||
          "Delayed Stage";

        delays.push({
          id: act.id,
          activityTitle: act.description || "Procurement Activity",
          fullTitle: act.description || "Procurement Activity",
          projectName: plan.project?.name || plan.title || "Project",
          directorate: plan.project?.name || plan.organization || "—",
          delayDetail: stageLabel,
          stageName: stageLabel,
          daysOverdue,
          status: "Delayed",
          assignedOfficer:
            plan.creator?.displayName ||
            plan.creator?.name ||
            "Assigned Officer",
          plannedCompletionDate: deadline ? deadline.slice(0, 10) : "",
          currentBottleneck:
            delayedStage?.remarks || "Pending stage completion",
        });
      }
    }
  }

  return delays;
}

/**
 * Health & bottleneck metrics
 */
export function computeDirectorHealthMetrics(
  financialSummary: FinancialCapitalSummary,
  criticalDelays: CriticalDelay[],
): DirectorateHealthMetrics {
  let bottleneckStage = "None detected";
  if (criticalDelays.length > 0) {
    const stageDelayCounts: Record<string, number> = {};
    criticalDelays.forEach((d) => {
      const stage = d.stageName || d.delayDetail || "Unknown Stage";
      stageDelayCounts[stage] = (stageDelayCounts[stage] || 0) + 1;
    });
    const sorted = Object.entries(stageDelayCounts).sort((a, b) => b[1] - a[1]);
    if (sorted[0] && sorted[0][0]) {
      bottleneckStage = `${sorted[0][0]} (${sorted[0][1]} active delays)`;
    }
  }

  return {
    contractExecutionRate: financialSummary.contractExecutionRatePct,
    disbursementPace: financialSummary.disbursedOfContractedPct,
    scheduleAdherence:
      criticalDelays.length === 0
        ? 100
        : Math.max(0, 100 - criticalDelays.length * 5),
    nextAuditDate: "Not scheduled",
    bottleneckStage,
    standardDaysPerStage: 14,
  };
}
