import { describe, expect, it } from 'vitest';
import { operationalSummary } from './operational-summary.js';
describe('operational dashboard summary', () => {
  it('counts decision queues and excludes resolved and inapplicable stage delays', () => {
    const stage = { status: 'NOT_STARTED', isNotApplicable: false, plannedEndDate: new Date('2026-01-01'), currentTargetEndDate: null };
    const result = operationalSummary(3, [
      { status: 'SUBMITTED', managementDecision: null },
      { status: 'WITH_COMMITTEE', managementDecision: null },
      { status: 'COMMITTEE_ENDORSED', managementDecision: null },
      { status: 'COMMITTEE_ENDORSED', managementDecision: 'APPROVED' },
    ], [
      { status: 'ACTIVE', stages: [stage, stage] },
      { status: 'ACTIVE', stages: [{ ...stage, status: 'COMPLETED' }] },
      { status: 'ACTIVE', stages: [{ ...stage, isNotApplicable: true }] },
      { status: 'ACTIVE', stages: [{ ...stage, currentTargetEndDate: new Date('2027-01-01') }] },
      { status: 'ACTIVE', stages: [] },
    ], new Date('2026-10-15'));
    expect(result).toMatchObject({projects:3, plans:4, directorReview:1, committeeReview:1, executiveApproval:1, delayedActivities:1, activities:5, activitiesWithStages:3});
  });
});
