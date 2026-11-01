import { AmendmentRequestStatus } from '../../generated/prisma/index.js';

export const AMENDMENT_COMMITTEE_QUORUM = 3;

export function getAmendmentCommitteeNextStatus(
  approvalCount: number,
  rejectionCount: number,
): AmendmentRequestStatus {
  if (approvalCount >= AMENDMENT_COMMITTEE_QUORUM) {
    return AmendmentRequestStatus.PENDING_MANAGEMENT;
  }
  if (rejectionCount >= AMENDMENT_COMMITTEE_QUORUM) {
    return AmendmentRequestStatus.REJECTED;
  }
  return AmendmentRequestStatus.PENDING_COMMITTEE;
}
