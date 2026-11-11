import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, txMock, logRevisionMock } = vi.hoisted(() => {
  const tx = {
    plan: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    userProject: { findUnique: vi.fn() },
    activity: { updateMany: vi.fn() },
  };
  return {
    txMock: tx,
    prismaMock: {
      $transaction: vi.fn(),
    },
    logRevisionMock: vi.fn(),
  };
});

vi.mock('../../config/database.js', () => ({ prisma: prismaMock }));
vi.mock('../../shared/audit/revision.service.js', () => ({
  logRevision: logRevisionMock,
}));

import {
  PlanStatus,
  RevisionChangeType,
  RevisionEntityType,
  UserRole,
} from '../../generated/prisma/index.js';
import { deleteDraftPlanService } from './plan.service.js';

describe('deleteDraftPlanService', () => {
  const plan = {
    id: 'plan-id',
    projectId: 'project-id',
    status: PlanStatus.DRAFT,
    isActive: true,
  };
  const officer = {
    id: 'officer-id',
    authRole: UserRole.OFFICER,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      (operation: (tx: typeof txMock) => Promise<unknown>) => operation(txMock),
    );
    txMock.plan.findFirst.mockResolvedValue(plan);
    txMock.plan.update.mockResolvedValue({ ...plan, isActive: false });
    txMock.user.findUnique.mockResolvedValue(officer);
    txMock.userProject.findUnique.mockResolvedValue({ userId: officer.id });
    txMock.activity.updateMany.mockResolvedValue({ count: 2 });
    logRevisionMock.mockResolvedValue(undefined);
  });

  it('soft-deletes the draft plan and all its active activities in one transaction', async () => {
    await expect(deleteDraftPlanService(plan.id, officer.id)).resolves.toEqual({
      ...plan,
      isActive: false,
    });

    expect(txMock.activity.updateMany).toHaveBeenCalledWith({
      where: { planId: plan.id, isActive: true },
      data: { isActive: false },
    });
    expect(txMock.plan.update).toHaveBeenCalledWith({
      where: { id: plan.id },
      data: { isActive: false },
    });
    expect(logRevisionMock).toHaveBeenCalledWith(
      txMock,
      RevisionEntityType.PLAN,
      RevisionChangeType.SOFT_DELETE,
      plan.id,
      officer.id,
      plan,
      { ...plan, isActive: false },
    );
  });

  it('rejects non-draft plans without deactivating the plan or its activities', async () => {
    txMock.plan.findFirst.mockResolvedValue({
      ...plan,
      status: PlanStatus.APPROVED,
    });

    await expect(
      deleteDraftPlanService(plan.id, officer.id),
    ).rejects.toMatchObject({
      status: 409,
    });
    expect(txMock.activity.updateMany).not.toHaveBeenCalled();
    expect(txMock.plan.update).not.toHaveBeenCalled();
  });

  it('requires an officer to be assigned to the plan project', async () => {
    txMock.userProject.findUnique.mockResolvedValue(null);

    await expect(
      deleteDraftPlanService(plan.id, officer.id),
    ).rejects.toMatchObject({
      status: 403,
    });
    expect(txMock.activity.updateMany).not.toHaveBeenCalled();
    expect(txMock.plan.update).not.toHaveBeenCalled();
  });
});
