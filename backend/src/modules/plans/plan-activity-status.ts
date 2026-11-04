import {
  ActivityStatus,
  PlanStatus,
  Prisma,
} from '../../generated/prisma/index.js';

export function activityStatusForPlanStatus(
  status: PlanStatus,
): ActivityStatus {
  if (status === PlanStatus.DRAFT) return ActivityStatus.DRAFT;
  if (
    status === PlanStatus.APPROVED ||
    status === PlanStatus.MANAGEMENT_APPROVED
  ) {
    return ActivityStatus.APPROVED;
  }
  if (status === PlanStatus.CANCELLED) return ActivityStatus.CANCELLED;
  return ActivityStatus.PLANNED;
}

export async function syncPlanActivityStatuses(
  tx: Prisma.TransactionClient,
  planId: string,
  planStatus: PlanStatus,
): Promise<void> {
  await tx.activity.updateMany({
    where: { planId },
    data: { status: activityStatusForPlanStatus(planStatus) },
  });
}
