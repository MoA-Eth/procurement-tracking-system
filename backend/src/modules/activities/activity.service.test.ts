import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ActivityStatus,
  PlanStatus,
  UserRole,
} from '../../generated/prisma/index.js';

const { prismaMock, txMock } = vi.hoisted(() => {
  const tx = {
    plan: { findFirst: vi.fn() },
    lookupValue: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    activity: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    txMock: tx,
    prismaMock: {
      $transaction: vi.fn(),
    },
  };
});

vi.mock('../../config/database.js', () => ({ prisma: prismaMock }));
vi.mock('../../shared/audit/revision.service.js', () => ({
  logRevision: vi.fn(),
}));
vi.mock('../../shared/audit/audit-logger.js', () => ({
  createAuditLog: vi.fn(),
}));
vi.mock('./stage-generator.js', () => ({
  generateStagesForActivity: vi.fn(),
}));

import {
  createActivityService,
  deleteDraftActivityService,
} from './activity.service.js';

describe('createActivityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      (operation: (tx: typeof txMock) => Promise<unknown>) => operation(txMock),
    );
    txMock.plan.findFirst.mockResolvedValue({ id: 'plan-id' });
    txMock.lookupValue.findFirst.mockResolvedValue({ id: 'method-id' });
    txMock.user.findUnique.mockResolvedValue({ id: 'user-id' });
    txMock.activity.findUnique.mockResolvedValue({
      id: 'existing-activity',
      reference: 'ACT-100',
      planId: 'plan-id',
      createdById: 'user-id',
    });
  });

  describe('deleteDraftActivityService', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      prismaMock.$transaction.mockImplementation(
        (operation: (tx: typeof txMock) => Promise<unknown>) =>
          operation(txMock),
      );
      txMock.user.findUnique.mockResolvedValue({
        id: 'officer-id',
        authRole: UserRole.OFFICER,
      });
      txMock.activity.findFirst.mockResolvedValue({
        id: 'activity-id',
        reference: 'ACT-100',
        isActive: true,
        createdById: 'officer-id',
        status: ActivityStatus.DRAFT,
        planId: 'plan-id',
        plan: {
          id: 'plan-id',
          projectId: 'project-id',
          title: 'Draft plan',
          status: PlanStatus.DRAFT,
        },
      });
      txMock.activity.update.mockResolvedValue({
        id: 'activity-id',
        isActive: false,
      });
    });

    it('allows an authenticated officer to delete an editable draft activity', async () => {
      txMock.activity.findFirst.mockResolvedValue({
        id: 'activity-id',
        reference: 'ACT-100',
        isActive: true,
        createdById: 'officer-id',
        status: ActivityStatus.DRAFT,
        planId: 'plan-id',
        plan: {
          id: 'plan-id',
          projectId: 'project-id',
          title: 'Draft plan',
          status: PlanStatus.DRAFT,
        },
      });

      await expect(
        deleteDraftActivityService('activity-id', 'officer-id'),
      ).resolves.toMatchObject({
        id: 'activity-id',
        isActive: false,
      });

      expect(txMock.activity.update).toHaveBeenCalledWith({
        where: { id: 'activity-id' },
        data: { isActive: false },
      });
    });

    it('rejects deleting an activity created by another officer', async () => {
      txMock.activity.findFirst.mockResolvedValue({
        id: 'activity-id',
        reference: 'ACT-100',
        isActive: true,
        createdById: 'another-officer-id',
        status: ActivityStatus.DRAFT,
        planId: 'plan-id',
        plan: {
          id: 'plan-id',
          title: 'Draft plan',
          status: PlanStatus.DRAFT,
        },
      });

      await expect(
        deleteDraftActivityService('activity-id', 'officer-id'),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });

      expect(txMock.activity.update).not.toHaveBeenCalled();
    });

    it('rejects deleting a draft activity linked to a plan under review', async () => {
      txMock.activity.findFirst.mockResolvedValue({
        id: 'activity-id',
        reference: 'ACT-100',
        isActive: true,
        createdById: 'officer-id',
        status: ActivityStatus.DRAFT,
        planId: 'plan-id',
        plan: {
          id: 'plan-id',
          title: 'Plan awaiting management approval',
          status: PlanStatus.AWAITING_MANAGEMENT_APPROVAL,
        },
      });

      await expect(
        deleteDraftActivityService('activity-id', 'officer-id'),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        status: 409,
        message: expect.stringContaining(
          'Activities can only be deleted while the linked plan is editable.',
        ),
      });

      expect(txMock.activity.update).not.toHaveBeenCalled();
    });
  });

  const input = {
    planId: 'plan-id',
    reference: 'ACT-100',
    procurementMethodId: 'method-id',
    description: 'Activity description',
    estimatedBudget: 10,
    currency: 'ETB',
    fundings: [{ fundingSource: 'Government', allocationPct: 100 }],
  };

  it('moves a colliding generated reference to the next available sequence', async () => {
    txMock.activity.findUnique
      .mockResolvedValueOnce({
        id: 'other-activity',
        reference: 'ET-MoA-000002-GO-RFQ',
        planId: 'another-plan',
        createdById: 'another-user',
      })
      .mockResolvedValueOnce(null);
    txMock.activity.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'new-activity', ...data }),
    );

    await expect(
      createActivityService(
        {
          ...input,
          reference: 'ET-MoA-000001-GO-RFQ',
        },
        'user-id',
      ),
    ).resolves.toMatchObject({
      id: 'new-activity',
      reference: 'ET-MoA-000002-GO-RFQ',
    });

    expect(txMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reference: 'ET-MoA-000002-GO-RFQ',
        }),
      }),
    );
  });

  it('creates new activities as the current returned plan version and draft status', async () => {
    txMock.plan.findFirst.mockResolvedValue({
      id: 'plan-id',
      status: PlanStatus.RETURNED_FOR_REVISION,
      version: 2,
    });
    txMock.activity.findUnique.mockResolvedValue(null);
    txMock.activity.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'new-activity', ...data }),
    );

    await createActivityService(input, 'user-id');

    expect(txMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ActivityStatus.DRAFT,
          version: 2,
        }),
      }),
    );
  });

  it('rejects a reused non-generated reference instead of returning the existing activity', async () => {
    await expect(createActivityService(input, 'user-id')).rejects.toMatchObject(
      {
        code: 'CONFLICT',
        status: 409,
      },
    );

    expect(txMock.activity.create).not.toHaveBeenCalled();
  });

  it('creates a new activity with a fresh reference when a same-owner activity was already stored', async () => {
    txMock.activity.findUnique
      .mockResolvedValueOnce({
        id: 'existing-activity',
        reference: 'ET-MoA(-000003-GO-RFB',
        planId: 'plan-id',
        createdById: 'user-id',
        isActive: false,
      })
      .mockResolvedValueOnce(null);
    txMock.activity.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'new-activity', isActive: true, ...data }),
    );

    await expect(
      createActivityService(
        {
          ...input,
          reference: 'ET-MoA(-000003-GO-RFB',
        },
        'user-id',
      ),
    ).resolves.toMatchObject({
      id: 'new-activity',
      reference: 'ET-MoA(-000004-GO-RFB',
      isActive: true,
    });

    expect(txMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reference: 'ET-MoA(-000004-GO-RFB',
        }),
      }),
    );
  });

  it('rejects a reference used by another plan or officer', async () => {
    txMock.activity.findUnique.mockResolvedValue({
      id: 'existing-activity',
      reference: 'ACT-100',
      planId: 'another-plan',
      createdById: 'another-user',
    });

    await expect(createActivityService(input, 'user-id')).rejects.toMatchObject(
      {
        code: 'CONFLICT',
        status: 409,
      },
    );
    expect(txMock.activity.create).not.toHaveBeenCalled();
  });
});
