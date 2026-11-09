import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, txMock } = vi.hoisted(() => {
  const tx = {
    plan: { findFirst: vi.fn() },
    lookupValue: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    activity: {
      findUnique: vi.fn(),
      create: vi.fn(),
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

import { createActivityService } from './activity.service.js';

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

  it('returns an existing activity when the same officer retries its creation', async () => {
    await expect(
      createActivityService(input, 'user-id'),
    ).resolves.toMatchObject({
      id: 'existing-activity',
      reference: 'ACT-100',
    });

    expect(txMock.activity.create).not.toHaveBeenCalled();
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
