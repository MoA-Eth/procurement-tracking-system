export interface BackendStageRevision {
  id: string;
  revisionNo: number;
  revisedStartDate: string;
  revisedEndDate: string;
  reason: string;
  createdAt: string;
}

export interface BackendStage {
  id: string;
  activityId: string;
  stageTypeId: string;
  stageType?: {
    id: string;
    type: string;
    code: string;
    label: string;
  };
  sequence: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  currentTargetStartDate?: string | null;
  currentTargetEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  revisions?: BackendStageRevision[];
}

export interface BackendActivityFunding {
  id?: string;
  fundingSource: string;
  loanGrantNumber?: string | null;
  allocationPct: number;
}

export interface BackendActivityComponent {
  id?: string;
  component: string;
  allocationPct: number;
}

export interface BackendActivity {
  id: string;
  reference: string;
  planId: string;
  procurementMethodId: string;
  procurementMethod?: {
    id: string;
    type: string;
    code: string;
    label: string;
  };
  description: string;
  estimatedBudget: number;
  currency: string;
  marketApproach?:
    "OPEN_INTERNATIONAL" | "OPEN_NATIONAL" | "LIMITED" | "DIRECT" | null;
  reviewType?: "PRIOR" | "POST" | null;
  contractType?: "LUMP_SUM" | "TIME_BASED" | null;
  lotRequired?: boolean;
  status:
    | "DRAFT"
    | "PENDING_REVIEW"
    | "APPROVED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";
  fundings?: BackendActivityFunding[];
  components?: BackendActivityComponent[];
  stages?: BackendStage[];
  plan?: {
    id: string;
    title: string;
    project?: { id: string; code: string; name: string };
  };
  createdById?: string;
  creator?: { id: string; name: string; displayName?: string; email?: string };
  updatedById?: string;
  updatedByUser?: {
    id: string;
    name: string;
    displayName?: string;
    email?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateActivityInput {
  planId: string;
  procurementMethodId: string;
  description: string;
  estimatedBudget: number;
  currency: string;
  marketApproach?:
    "OPEN_INTERNATIONAL" | "OPEN_NATIONAL" | "LIMITED" | "DIRECT";
  reviewType?: "PRIOR" | "POST";
  contractType?: "LUMP_SUM" | "TIME_BASED";
  lotRequired?: boolean;
  fundings: {
    fundingSource: string;
    loanGrantNumber?: string;
    allocationPct: number;
  }[];
  stages?: any[];
  roadmap?: any[];
}

export interface UpdateStageDatesInput {
  plannedStartDate?: string;
  plannedEndDate?: string;
  remarks?: string;
}

export interface RecordActualStageDatesInput {
  actualStartDate?: string;
  actualEndDate?: string;
  remarks?: string;
}

export interface ReplanStageInput {
  revisedStartDate: string;
  revisedEndDate?: string;
  reason: string;
}

import { apiClient } from "./apiClient";

// ── Procurement Method Lookup Cache ────────────────────────────────
export interface ProcurementMethodLookup {
  id: string;
  type: string;
  code: string;
  label: string;
}

let _methodsCache: ProcurementMethodLookup[] | null = null;

export async function fetchProcurementMethods(): Promise<
  ProcurementMethodLookup[]
> {
  if (_methodsCache) return _methodsCache;
  try {
    const res = await apiClient.get<any>("/lookups", {
      params: { type: "PROCUREMENT_METHOD" },
    });
    const list = res?.data || (Array.isArray(res) ? res : []);
    _methodsCache = Array.isArray(list) ? list : [];
    return _methodsCache;
  } catch (err) {
    console.warn("fetchProcurementMethods error:", err);
    return [];
  }
}

/**
 * Resolve a method code or label (e.g. "RFB_NAT", "RFB - National")
 * to its backend UUID. Returns the original string if no match found.
 */
export async function resolveProcurementMethodId(
  codeOrLabel: string,
): Promise<string> {
  const methods = await fetchProcurementMethods();
  if (methods.length === 0) return codeOrLabel;

  const needle = codeOrLabel.toLowerCase().trim();

  // 1. Exact match by id (already a UUID)
  const byId = methods.find((m) => m.id.toLowerCase() === needle);
  if (byId) return byId.id;

  // 2. Exact match by code
  const byCode = methods.find((m) => m.code.toLowerCase() === needle);
  if (byCode) return byCode.id;

  // 3. Exact match by label
  const byLabel = methods.find((m) => m.label.toLowerCase() === needle);
  if (byLabel) return byLabel.id;

  // 4. Partial match by code or label
  const byPartial = methods.find(
    (m) =>
      m.code.toLowerCase().includes(needle) ||
      needle.includes(m.code.toLowerCase()) ||
      m.label.toLowerCase().includes(needle) ||
      needle.includes(m.label.toLowerCase()),
  );
  if (byPartial) return byPartial.id;

  // 5. Fallback: return first method as a safe default
  return methods[0]?.id || codeOrLabel;
}

export async function fetchActivities(
  planId?: string,
): Promise<BackendActivity[]> {
  try {
    const res = await apiClient.get<any>("/activities", {
      params: planId ? { planId } : undefined,
    });
    return Array.isArray(res) ? res : res.data || [];
  } catch (err) {
    console.warn("fetchActivities notice:", err);
    return [];
  }
}

export async function fetchActivityById(id: string): Promise<BackendActivity> {
  const res = await apiClient.get<any>(`/activities/${encodeURIComponent(id)}`);
  return res.data || res;
}

export async function createActivity(
  data: CreateActivityInput,
): Promise<BackendActivity> {
  const res = await apiClient.post<any>("/activities", data);
  return res.data || res;
}

export async function updateActivity(
  id: string,
  data: Partial<CreateActivityInput>,
): Promise<BackendActivity> {
  const res = await apiClient.patch<any>(
    `/activities/${encodeURIComponent(id)}`,
    data,
  );
  return res.data || res;
}

export async function deleteActivity(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/activities/${encodeURIComponent(id)}`);
    return true;
  } catch (err) {
    console.warn(`deleteActivity notice for ${id}:`, err);
    return false;
  }
}

export async function updateStageDates(
  activityId: string,
  stageId: string,
  data: UpdateStageDatesInput,
): Promise<void> {
  await apiClient.patch(
    `/activities/${encodeURIComponent(activityId)}/stages/${encodeURIComponent(stageId)}`,
    data,
  );
}

export async function recordActualStageDates(
  activityId: string,
  stageId: string,
  data: RecordActualStageDatesInput,
): Promise<void> {
  await apiClient.patch(
    `/activities/${encodeURIComponent(activityId)}/stages/${encodeURIComponent(stageId)}/actual`,
    data,
  );
}

export async function replanStage(
  activityId: string,
  stageId: string,
  data: ReplanStageInput,
): Promise<void> {
  await apiClient.post(
    `/activities/${encodeURIComponent(activityId)}/stages/${encodeURIComponent(stageId)}/replan`,
    data,
  );
}
