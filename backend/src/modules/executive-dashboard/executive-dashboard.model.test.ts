import { describe, expect, it } from 'vitest';
import {
  classifyItemType,
  milestoneDate,
  reportedProgress,
} from './executive-dashboard.model.js';

describe('executive dashboard source mapping', () => {
  it.each([
    ['Works', 'WORKS'],
    ['Goods', 'GOODS'],
    ['Consultancy Services', 'SERVICES'],
    ['Non-Consulting Services', 'SERVICES'],
    ['Non- Consulting Services', 'SERVICES'],
    ['CONSULTING_SERVICES', 'SERVICES'],
    [null, 'UNCLASSIFIED'],
    ['Other', 'UNCLASSIFIED'],
  ])('classifies %s explicitly', (source, expected) => {
    expect(classifyItemType(source)).toBe(expected);
  });
  it('uses actual milestones and excludes not-applicable stages', () => {
    const actual = new Date('2026-09-05T00:00:00Z');
    expect(
      milestoneDate(
        [
          {
            label: 'Invitation to Bidders',
            actualStartDate: null,
            actualEndDate: null,
            isNotApplicable: false,
          },
          {
            label: 'Invitation to Consultant',
            actualStartDate: actual,
            actualEndDate: null,
            isNotApplicable: true,
          },
        ],
        'invitation',
      ),
    ).toBeNull();
    expect(
      milestoneDate(
        [
          {
            label: 'Bid Submission / Opening / Dates',
            actualStartDate: actual,
            actualEndDate: null,
            isNotApplicable: false,
          },
        ],
        'opening',
      ),
    ).toBe(actual.toISOString());
  });
  it('preserves missing and invalid progress instead of treating it as zero', () => {
    expect(reportedProgress(null)).toBeNull();
    expect(reportedProgress(101)).toBeNull();
    expect(reportedProgress(-1)).toBeNull();
    expect(reportedProgress(0)).toBe(0);
    expect(reportedProgress(67.5)).toBe(67.5);
  });
});
