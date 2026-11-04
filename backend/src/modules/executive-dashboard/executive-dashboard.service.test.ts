import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    activity: { findMany: vi.fn() },
    contract: { findMany: vi.fn() },
    project: { findMany: vi.fn() },
    plan: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../config/database.js', () => ({ prisma: prismaMock }));

import { getExecutiveSnapshot } from './executive-dashboard.service.js';

describe('executive dashboard activity source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.activity.findMany.mockResolvedValue([]);
    prismaMock.contract.findMany.mockResolvedValue([]);
    prismaMock.project.findMany.mockResolvedValue([]);
    prismaMock.plan.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockResolvedValue([[], [], [], []]);
  });

  it('uses the same active-activity scope as the Activity Tracker', async () => {
    await getExecutiveSnapshot();

    expect(prismaMock.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
  });
});
