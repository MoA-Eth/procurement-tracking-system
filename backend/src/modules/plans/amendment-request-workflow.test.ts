import { describe, expect, it } from 'vitest';
import { AmendmentRequestStatus } from '../../generated/prisma/index.js';
import { getAmendmentCommitteeNextStatus } from './amendment-request-workflow.js';

describe('amendment committee quorum', () => {
  it('keeps requests with the committee until three approvals are recorded', () => {
    expect(getAmendmentCommitteeNextStatus(1, 0)).toBe(
      AmendmentRequestStatus.PENDING_COMMITTEE,
    );
    expect(getAmendmentCommitteeNextStatus(2, 1)).toBe(
      AmendmentRequestStatus.PENDING_COMMITTEE,
    );
  });

  it('forwards a request to management after three approvals', () => {
    expect(getAmendmentCommitteeNextStatus(3, 0)).toBe(
      AmendmentRequestStatus.PENDING_MANAGEMENT,
    );
  });

  it('rejects a request after three committee rejections without three approvals', () => {
    expect(getAmendmentCommitteeNextStatus(1, 3)).toBe(
      AmendmentRequestStatus.REJECTED,
    );
  });
});
