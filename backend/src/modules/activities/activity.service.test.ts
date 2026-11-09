import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, txMock } = vi.hoisted(() => {
  const tx = {
    plan: { findFirst: vi.fn() },
    lookupValue: { findFirst: vi.fn() },
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

import { createActivityService } from './activity.service.js';

describe('createActivityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      (operation: (tx: typeof txMock) => Promise<unknown>) => operation(txMock),
    );
    txMock.plan.findFirst.mockResolvedValue({ id: 'plan-id' });
    txMock.lookupValue.findFirst.mockResolvedValue({ id: 'method-id' });
    txMock.activity.findUnique.mockResolvedValue({ id: 'existing-activity' });
  });

  it('rejects a repeated activity reference instead of creating another record', async () => {
    await expect(
      createActivityService(
        {
          planId: 'plan-id',
          reference: 'ACT-100',
          procurementMethodId: 'method-id',
          description: 'Activity description',
          estimatedBudget: 10,
          currency: 'ETB',
          fundings: [{ fundingSource: 'Government', allocationPct: 100 }],
        },
        'user-id',
      ),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
    });

    expect(txMock.activity.create).not.toHaveBeenCalled();
  });
});
