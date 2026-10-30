import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../../generated/prisma/index.js';
import { StageStatus } from '../../generated/prisma/index.js';
import { generateStagesForActivity } from './stage-generator.js';

function createTransactionMock(templateStages: unknown[] = []) {
  const tx = {
    stageTemplate: {
      findMany: vi.fn().mockResolvedValue(templateStages),
    },
    lookupValue: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(({ create }: { create: { label: string } }) =>
        Promise.resolve({ id: 'stage-type-1', ...create }),
      ),
    },
    stage: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  return tx as unknown as Prisma.TransactionClient;
}

describe('generateStagesForActivity', () => {
  it('persists submitted roadmap stages when no templates exist', async () => {
    const tx = createTransactionMock();

    const stages = await generateStagesForActivity(
      tx,
      'activity-1',
      'method-1',
      [
        {
          name: 'Bid Invitation',
          sequence: 1,
          plannedStartDate: '2026-03-10',
          plannedEndDate: '2026-03-20',
          plannedDays: 10,
          remarks: 'Officer roadmap date',
        },
      ],
    );

    expect(stages).toHaveLength(1);
    expect(stages[0]).toMatchObject({
      activityId: 'activity-1',
      stageTypeId: 'stage-type-1',
      sequence: 1,
      status: StageStatus.NOT_STARTED,
      plannedStartDate: new Date('2026-03-10'),
      plannedEndDate: new Date('2026-03-20'),
      currentTargetStartDate: new Date('2026-03-10'),
      currentTargetEndDate: new Date('2026-03-20'),
      remarks: 'Officer roadmap date',
    });
    expect(tx.lookupValue.upsert).toHaveBeenCalledWith({
      where: {
        type_code: { type: 'STAGE_TYPE', code: 'STAGE_BID_INVITATION' },
      },
      create: {
        type: 'STAGE_TYPE',
        code: 'STAGE_BID_INVITATION',
        label: 'Bid Invitation',
      },
      update: { label: 'Bid Invitation', isActive: true },
    });
    expect(tx.stage.createMany).toHaveBeenCalledOnce();
  });

  it('does not create stages when there are no templates or custom stages', async () => {
    const tx = createTransactionMock();

    await expect(
      generateStagesForActivity(tx, 'activity-1', 'method-1'),
    ).resolves.toEqual([]);

    expect(tx.stage.createMany).not.toHaveBeenCalled();
    expect(tx.lookupValue.upsert).not.toHaveBeenCalled();
  });

  it('uses the saved target dates when planned dates are absent', async () => {
    const tx = createTransactionMock();

    const stages = await generateStagesForActivity(
      tx,
      'activity-1',
      'method-1',
      [
        {
          name: 'Bid Evaluation',
          sequence: 1,
          currentTargetStartDate: '2026-08-03',
          currentTargetEndDate: '2026-08-17',
        },
      ],
    );

    expect(stages[0]).toMatchObject({
      plannedStartDate: new Date('2026-08-03'),
      plannedEndDate: new Date('2026-08-17'),
      currentTargetStartDate: new Date('2026-08-03'),
      currentTargetEndDate: new Date('2026-08-17'),
    });
  });
});
