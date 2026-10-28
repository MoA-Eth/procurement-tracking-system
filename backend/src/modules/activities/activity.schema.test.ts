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

describe('activity lots', () => {
  const step2 = {
    description: 'Supply of field equipment',
    estimatedBudget: 1_000_000,
    currency: 'ETB',
    fundings: [{ fundingSource: 'World Bank' }],
  };

  it('allows lots to be defined later when Lot Required is enabled', () => {
    expect(
      createActivityStep2Schema.safeParse({ ...step2, lotRequired: true })
        .success,
    ).toBe(true);
    expect(
      createActivityStep2Schema.safeParse({
        ...step2,
        lotRequired: true,
        lots: [],
      }).success,
    ).toBe(true);
  });

  it('requires only the lot number for each lot', () => {
    expect(
      createActivityStep2Schema.safeParse({
        ...step2,
        lotRequired: true,
        lots: [{ lotNumber: 'Lot A' }],
      }).success,
    ).toBe(true);
    expect(
      createActivityStep2Schema.safeParse({
        ...step2,
        lotRequired: true,
        lots: [{ lotNumber: ' ' }],
      }).success,
    ).toBe(false);
  });

  it('accepts an empty lot list on update so removed lots are cleared', () => {
    expect(updateActivitySchema.safeParse({ lots: [] }).success).toBe(true);
  });
});
