import { describe, expect, it } from 'vitest';
import { createPlanSchema, updatePlanSchema } from './plan.schema.js';

describe('plan contract award date', () => {
  it('accepts an optional award date on creation and clearing it on update', () => {
    expect(
      createPlanSchema.safeParse({
        projectId: 'project-id',
        title: 'Annual Plan',
        periodStart: '2026-07-08',
        periodEnd: '2027-07-07',
        contractAwardDate: '2026-08-15',
      }).success,
    ).toBe(true);

    expect(
      updatePlanSchema.safeParse({ contractAwardDate: null }).success,
    ).toBe(true);
  });
});
