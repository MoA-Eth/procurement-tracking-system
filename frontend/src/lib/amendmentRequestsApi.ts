import { apiClient } from "./apiClient";

export type AmendmentEntityType = "PLAN" | "ACTIVITY";
export type AmendmentDecision = "APPROVE" | "REJECT" | "RETURN";

export interface AmendmentPlanDetails {
  id: string;
  title: string;
  status?: string;
  budgetYear?: string | null;
  procurementCategory?: string | null;
  organization?: string | null;
  description?: string | null;
  periodStart?: string;
  periodEnd?: string;
  gpnDate?: string | null;
  contractAwardDate?: string | null;
  project?: { code: string; name: string };
  activities?: AmendmentActivityDetails[];
  [field: string]: unknown;
}

export interface AmendmentActivityDetails {
  id: string;
  reference: string;
  description: string | null;
  procurementMethod?: { code: string; label: string } | null;
  plan?: AmendmentPlanDetails;
  [field: string]: unknown;
}

export interface AmendmentRequest {
  id: string;
  entityType: AmendmentEntityType;
  status:
    | "PENDING_DIRECTOR"
    | "PENDING_COMMITTEE"
    | "PENDING_MANAGEMENT"
    | "RETURNED"
    | "REJECTED"
    | "APPROVED"
    | "COMPLETED";
  reason: string;
  createdAt: string;
  directorComment?: string | null;
  committeeComment?: string | null;
  managementComment?: string | null;
  committeeVotes?: {
    memberId: string;
    decision: "APPROVE" | "REJECT";
    comment?: string | null;
    createdAt: string;
  }[];
  requestedBy: { id: string; name: string; displayName: string };
  plan?: AmendmentPlanDetails | null;
  activity?: AmendmentActivityDetails | null;
}

export async function createAmendmentRequest(input: {
  entityType: AmendmentEntityType;
  entityId: string;
  reason: string;
}): Promise<AmendmentRequest> {
  return apiClient.post<AmendmentRequest>("/amendment-requests", input);
}

export async function fetchAmendmentRequests(): Promise<AmendmentRequest[]> {
  return apiClient.get<AmendmentRequest[]>("/amendment-requests");
}

export async function decideAmendmentRequest(
  id: string,
  decision: AmendmentDecision,
  comment: string,
): Promise<AmendmentRequest> {
  return apiClient.post<AmendmentRequest>(
    `/amendment-requests/${encodeURIComponent(id)}/decision`,
    { decision, comment },
  );
}
