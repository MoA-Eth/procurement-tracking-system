import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../../generated/prisma/index.js';
import { ActivityStatus, PlanStatus } from '../../generated/prisma/index.js';
import {
  activityStatusForPlanStatus,
  syncPlanActivityStatuses,
} from './plan-activity-status.js';

describe('activity status inherited from plan', () => {
  it.each([
    [PlanStatus.DRAFT, ActivityStatus.DRAFT],
    [PlanStatus.SUBMITTED, ActivityStatus.PLANNED],
    [PlanStatus.WITH_COMMITTEE, ActivityStatus.PLANNED],
    [PlanStatus.COMMITTEE_ENDORSED, ActivityStatus.PLANNED],
    [PlanStatus.COMMITTEE_REJECTED, ActivityStatus.PLANNED],
    [PlanStatus.AWAITING_MANAGEMENT_APPROVAL, ActivityStatus.PLANNED],
    [PlanStatus.MANAGEMENT_APPROVED, ActivityStatus.APPROVED],
    [PlanStatus.MANAGEMENT_REJECTED, ActivityStatus.PLANNED],
    [PlanStatus.RETURNED_FOR_REVISION, ActivityStatus.PLANNED],
    [PlanStatus.APPROVED, ActivityStatus.APPROVED],
    [PlanStatus.REJECTED, ActivityStatus.PLANNED],
    [PlanStatus.UPDATE_REQUESTED, ActivityStatus.PLANNED],
    [PlanStatus.CANCELLATION_REQUESTED, ActivityStatus.PLANNED],
    [PlanStatus.CANCELLED, ActivityStatus.CANCELLED],
  ])('maps plan status %s to activity status %s', (plan, activity) => {
    expect(activityStatusForPlanStatus(plan)).toBe(activity);
  });

  it('updates all activities belonging to the plan in the transaction', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const tx = {
      activity: { updateMany },
    } as unknown as Prisma.TransactionClient;

    await syncPlanActivityStatuses(tx, 'plan-1', PlanStatus.SUBMITTED);

    expect(updateMany).toHaveBeenCalledWith({
      where: { planId: 'plan-1' },
      data: { status: ActivityStatus.PLANNED },
    });
  });
});
