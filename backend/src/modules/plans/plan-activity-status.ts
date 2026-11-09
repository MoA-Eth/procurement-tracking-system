import {
  ActivityStatus,
  PlanStatus,
  Prisma,
} from '../../generated/prisma/index.js';

export function activityStatusForPlanStatus(
  status: PlanStatus,
): ActivityStatus {
  const statusMap: Record<PlanStatus, ActivityStatus> = {
    [PlanStatus.DRAFT]: ActivityStatus.DRAFT,
    [PlanStatus.SUBMITTED]: ActivityStatus.PLANNED,
    [PlanStatus.WITH_COMMITTEE]: ActivityStatus.PLANNED,
    [PlanStatus.COMMITTEE_ENDORSED]: ActivityStatus.PLANNED,
    [PlanStatus.COMMITTEE_REJECTED]: ActivityStatus.PLANNED,
    [PlanStatus.AWAITING_MANAGEMENT_APPROVAL]: ActivityStatus.PLANNED,
    [PlanStatus.MANAGEMENT_APPROVED]: ActivityStatus.APPROVED,
    [PlanStatus.MANAGEMENT_REJECTED]: ActivityStatus.PLANNED,
    [PlanStatus.RETURNED_FOR_REVISION]: ActivityStatus.PLANNED,
    [PlanStatus.APPROVED]: ActivityStatus.APPROVED,
    [PlanStatus.REJECTED]: ActivityStatus.PLANNED,
    [PlanStatus.UPDATE_REQUESTED]: ActivityStatus.PLANNED,
    [PlanStatus.CANCELLATION_REQUESTED]: ActivityStatus.PLANNED,
    [PlanStatus.CANCELLED]: ActivityStatus.CANCELLED,
  };
  return statusMap[status];
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
