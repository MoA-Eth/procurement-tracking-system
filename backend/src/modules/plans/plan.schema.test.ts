import { describe, expect, it } from 'vitest';
import {
  createAmendmentRequestSchema,
  createPlanSchema,
  decideAmendmentRequestSchema,
  updatePlanSchema,
} from './plan.schema.js';
import { AmendmentEntityType } from '../../generated/prisma/index.js';

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

  describe('amendment request validation', () => {
    it('requires an entity and a meaningful reason', () => {
      expect(
        createAmendmentRequestSchema.safeParse({
          entityType: AmendmentEntityType.PLAN,
          entityId: 'plan-id',
          reason: 'Change dates',
        }).success,
      ).toBe(true);

      expect(
        createAmendmentRequestSchema.safeParse({
          entityType: AmendmentEntityType.ACTIVITY,
          entityId: '',
          reason: 'Needs amendment',
        }).success,
      ).toBe(false);
    });

    it('requires a comment when a request is returned or rejected', () => {
      expect(
        decideAmendmentRequestSchema.safeParse({ decision: 'APPROVE' }).success,
      ).toBe(true);
      expect(
        decideAmendmentRequestSchema.safeParse({
          decision: 'RETURN',
          comment: '',
        }).success,
      ).toBe(false);
      expect(
        decideAmendmentRequestSchema.safeParse({
          decision: 'REJECT',
          comment: 'Insufficient reason',
        }).success,
      ).toBe(true);
    });
  });
});
