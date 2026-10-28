import { describe, expect, it } from 'vitest';
import {
  createActivityStep2Schema,
  updateActivitySchema,
} from './activity.schema.js';

describe('activity contract award date', () => {
  it('accepts an optional award date and supports clearing it', () => {
    expect(
      createActivityStep2Schema.safeParse({
        description: 'Supply of field equipment',
        estimatedBudget: 1_000_000,
        currency: 'ETB',
        contractAwardDate: '2026-08-15',
        fundings: [{ fundingSource: 'World Bank' }],
        lotRequired: false,
      }).success,
    ).toBe(true);

    expect(
      updateActivitySchema.safeParse({ contractAwardDate: '' }).success,
    ).toBe(true);
  });
});
