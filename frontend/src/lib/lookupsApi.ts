export interface LookupItem {
  id: string;
  type: string;
  code: string;
  label: string;
  isActive: boolean;
}

export interface SupplierItem {
  id: string;
  name: string;
  tinNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status: string;
}

export interface OfficerUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  status?: string;
}

import { apiClient } from "./apiClient";

const FALLBACK_LOOKUPS: LookupItem[] = [
  {
    id: "sec-1",
    type: "SECTOR",
    code: "SEC_AGRI",
    label: "Agriculture & Livestock",
    isActive: true,
  },
  {
    id: "sec-2",
    type: "SECTOR",
    code: "SEC_HORT",
    label: "Horticulture & Seed Development",
    isActive: true,
  },
  {
    id: "sec-3",
    type: "SECTOR",
    code: "SEC_NAT",
    label: "Natural Resources & Irrigation",
    isActive: true,
  },
  {
    id: "fs-1",
    type: "FUNDING_SOURCE",
    code: "FS_WB",
    label: "World Bank (IDA)",
    isActive: true,
  },
  {
    id: "fs-2",
    type: "FUNDING_SOURCE",
    code: "FS_AFDB",
    label: "African Development Bank (AfDB)",
    isActive: true,
  },
  {
    id: "fs-3",
    type: "FUNDING_SOURCE",
    code: "FS_GOV",
    label: "Government of Ethiopia (Treasury)",
    isActive: true,
  },
  {
    id: "fs-4",
    type: "FUNDING_SOURCE",
    code: "FS_UNOPS",
    label: "UNOPS",
    isActive: true,
  },
  {
    id: "fs-5",
    type: "FUNDING_SOURCE",
    code: "FS_IFAD",
    label: "IFAD (International Fund for Agricultural Development)",
    isActive: true,
  },
  {
    id: "fs-6",
    type: "FUNDING_SOURCE",
    code: "FS_EU",
    label: "EU Grant / European Union",
    isActive: true,
  },
  {
    id: "fs-7",
    type: "FUNDING_SOURCE",
    code: "FS_GEN",
    label: "General Funding Source",
    isActive: true,
  },
  {
    id: "ft-1",
    type: "FUNDING_TYPE",
    code: "FT_TREASURY",
    label: "Treasury",
    isActive: true,
  },
  {
    id: "ft-2",
    type: "FUNDING_TYPE",
    code: "FT_LOAN",
    label: "Loan",
    isActive: true,
  },
  {
    id: "ft-3",
    type: "FUNDING_TYPE",
    code: "FT_GRANT",
    label: "Grant",
    isActive: true,
  },
  {
    id: "ft-4",
    type: "FUNDING_TYPE",
    code: "FT_MIXED",
    label: "Mixed (Loan & Grant)",
    isActive: true,
  },
  {
    id: "pm-1",
    type: "PROCUREMENT_METHOD",
    code: "PM_RFQ",
    label: "Request for Quotations (RFQ)",
    isActive: true,
  },
  {
    id: "pm-2",
    type: "PROCUREMENT_METHOD",
    code: "PM_QCBS",
    label: "Quality and Cost-Based Selection (QCBS)",
    isActive: true,
  },
  {
    id: "pm-3",
    type: "PROCUREMENT_METHOD",
    code: "PM_NCB",
    label: "National Competitive Bidding (NCB)",
    isActive: true,
  },
  {
    id: "proj-code-1",
    type: "PROJECT_CODE",
    code: "DRIVE",
    label: "De-risking, Inclusion and Value Enhancement Project (DRIVE)",
    isActive: true,
  },
  {
    id: "proj-code-2",
    type: "PROJECT_CODE",
    code: "BREFONS",
    label:
      "Building Resilience for Food and Nutrition Security in the Horn of Africa (BREFONS)",
    isActive: true,
  },
  {
    id: "proj-code-3",
    type: "PROJECT_CODE",
    code: "CALM",
    label: "Climate Action through Landscape Management Program (CALM)",
    isActive: true,
  },
  {
    id: "proj-code-4",
    type: "PROJECT_CODE",
    code: "RLLP",
    label: "Resilient Landscapes and Livelihoods Project (RLLP)",
    isActive: true,
  },
  {
    id: "proj-code-5",
    type: "PROJECT_CODE",
    code: "AGP-II",
    label: "Agricultural Growth Program II (AGP-II)",
    isActive: true,
  },
];

const FALLBACK_OFFICERS: OfficerUserItem[] = [
  {
    id: "off-1",
    name: "Abebe Bikila",
    email: "officer@moa.gov.et",
    role: "ProcurementOfficer",
    isActive: true,
  },
  {
    id: "off-2",
    name: "Almaz Ayana",
    email: "almaz.officer@moa.gov.et",
    role: "ProcurementOfficer",
    isActive: true,
  },
];

const CUSTOM_LOOKUPS_STORAGE_KEY = "pts_custom_lookups";

function getStoredCustomLookups(): LookupItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_LOOKUPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomLookupToStorage(item: LookupItem) {
  if (typeof window === "undefined") return;
  try {
    const list = getStoredCustomLookups();
    const existingIdx = list.findIndex(
      (l) =>
        l.id === item.id ||
        (l.type.toUpperCase() === item.type.toUpperCase() &&
          l.code.toUpperCase() === item.code.toUpperCase()),
    );
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...item };
    } else {
      list.unshift(item);
    }
    window.localStorage.setItem(
      CUSTOM_LOOKUPS_STORAGE_KEY,
      JSON.stringify(list),
    );
  } catch (e) {
    console.warn("Storage write error for custom lookup:", e);
  }
}

function removeCustomLookupFromStorage(id: string) {
  if (typeof window === "undefined") return;
  try {
    const list = getStoredCustomLookups().filter((l) => l.id !== id);
    window.localStorage.setItem(
      CUSTOM_LOOKUPS_STORAGE_KEY,
      JSON.stringify(list),
    );
  } catch (e) {
    console.warn("Storage remove error for custom lookup:", e);
  }
}

export function getInitialLookups(type?: string): LookupItem[] {
  const normType = type ? type.trim().toUpperCase() : undefined;
  const customItems = getStoredCustomLookups();
  const baseline = normType
    ? FALLBACK_LOOKUPS.filter((l) => l.type.toUpperCase() === normType)
    : FALLBACK_LOOKUPS;

  const combinedMap = new Map<string, LookupItem>();
  const makeKey = (t: string, c: string) =>
    `${t.trim().toUpperCase()}:${c.trim().toUpperCase()}`;

  baseline.forEach((item) => {
    combinedMap.set(makeKey(item.type, item.code), {
      ...item,
      type: item.type.toUpperCase(),
      code: item.code.toUpperCase(),
    });
  });

  customItems.forEach((item) => {
    if (!normType || item.type.toUpperCase() === normType) {
      combinedMap.set(makeKey(item.type, item.code), {
        ...item,
        type: item.type.toUpperCase(),
        code: item.code.toUpperCase(),
      });
    }
  });

  return Array.from(combinedMap.values()).filter((l) => l.isActive);
}

export async function fetchLookups(type?: string): Promise<LookupItem[]> {
  const normType = type ? type.trim().toUpperCase() : undefined;
  const customItems = getStoredCustomLookups();
  let serverItems: LookupItem[] = [];

  try {
    const payload = await apiClient.get<any>("/lookups", {
      params: normType ? { type: normType } : undefined,
    });
    serverItems = Array.isArray(payload) ? payload : payload?.data || [];
  } catch {
    // Graceful fallback
  }

  const baseline = normType
    ? FALLBACK_LOOKUPS.filter((l) => l.type.toUpperCase() === normType)
    : FALLBACK_LOOKUPS;

  const combinedMap = new Map<string, LookupItem>();
  const makeKey = (t: string, c: string) =>
    `${t.trim().toUpperCase()}:${c.trim().toUpperCase()}`;

  // 1. Baseline
  baseline.forEach((item) => {
    combinedMap.set(makeKey(item.type, item.code), {
      ...item,
      type: item.type.toUpperCase(),
      code: item.code.toUpperCase(),
    });
  });

  // 2. Server items (priority over baseline)
  serverItems.forEach((item) => {
    if (!normType || item.type.toUpperCase() === normType) {
      combinedMap.set(makeKey(item.type, item.code), {
        ...item,
        type: item.type.toUpperCase(),
        code: item.code.toUpperCase(),
      });
    }
  });

  // 3. Custom stored items (preserve newly created user custom lookups even before/if offline)
  customItems.forEach((item) => {
    if (!normType || item.type.toUpperCase() === normType) {
      const k = makeKey(item.type, item.code);
      const existing = combinedMap.get(k);
      if (
        !existing ||
        !existing.id ||
        existing.id.startsWith("custom-") ||
        existing.id.startsWith("sec-") ||
        existing.id.startsWith("fs-") ||
        existing.id.startsWith("proj-code-") ||
        existing.id.startsWith("pm-")
      ) {
        combinedMap.set(k, {
          ...item,
          type: item.type.toUpperCase(),
          code: item.code.toUpperCase(),
        });
      }
    }
  });

  const all = Array.from(combinedMap.values());
  return all.filter((l) => l.isActive);
}

// Broadcast & cross-tab synchronization channel
const LOOKUP_CHANNEL_NAME = "pts_lookups_channel";

export function notifyLookupsChanged(): void {
  if (typeof window === "undefined") return;

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(LOOKUP_CHANNEL_NAME);
      channel.postMessage({ event: "lookups_changed", timestamp: Date.now() });
      channel.close();
    }
  } catch {
    // BroadcastChannel unsupported or blocked
  }

  try {
    window.dispatchEvent(new CustomEvent("pts_lookups_changed"));
    localStorage.setItem("pts_lookups_last_updated", String(Date.now()));
  } catch {
    // Storage event fallback
  }
}

export function subscribeToLookups(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(LOOKUP_CHANNEL_NAME);
      bc.onmessage = () => callback();
    }
  } catch {
    // Graceful fallback
  }

  const handleCustomEvent = () => callback();
  const handleStorageEvent = (e: StorageEvent) => {
    if (
      e.key === "pts_lookups_last_updated" ||
      e.key === "pts_custom_lookups"
    ) {
      callback();
    }
  };

  window.addEventListener("pts_lookups_changed", handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    if (bc) {
      try {
        bc.close();
      } catch {}
    }
    window.removeEventListener("pts_lookups_changed", handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

export async function createLookup(data: {
  type: string;
  code: string;
  label: string;
}): Promise<LookupItem> {
  const cleanType = data.type.trim().toUpperCase();
  const cleanCode = data.code.trim().toUpperCase();
  const cleanLabel = data.label.trim();
  const newItem: LookupItem = {
    id: `custom-${cleanType.toLowerCase()}-${Date.now()}`,
    type: cleanType,
    code: cleanCode,
    label: cleanLabel,
    isActive: true,
  };

  try {
    const res = await apiClient.post<any>("/lookups", {
      type: cleanType,
      code: cleanCode,
      label: cleanLabel,
    });
    const resultData = res?.data || res;
    if (resultData?.id) {
      newItem.id = resultData.id;
      if (resultData.code) newItem.code = resultData.code;
      if (resultData.label) newItem.label = resultData.label;
    }
  } catch (err) {
    console.warn("Backend createLookup note (saved locally):", err);
  }

  saveCustomLookupToStorage(newItem);
  notifyLookupsChanged();
  return newItem;
}

export async function updateLookup(
  id: string,
  data: { code?: string; label?: string; isActive?: boolean },
): Promise<LookupItem | null> {
  let updatedItem: LookupItem | null = null;

  try {
    const res = await apiClient.patch<any>(`/lookups/${id}`, data);
    if (res?.data) {
      updatedItem = res.data;
    }
  } catch (err) {
    console.warn("Backend updateLookup note (applied locally):", err);
  }

  const list = getStoredCustomLookups();
  const target = list.find((l) => l.id === id);
  if (target) {
    if (data.code !== undefined) target.code = data.code.trim().toUpperCase();
    if (data.label !== undefined) target.label = data.label.trim();
    if (data.isActive !== undefined) target.isActive = data.isActive;
    saveCustomLookupToStorage(target);
    if (!updatedItem) updatedItem = target;
  }

  notifyLookupsChanged();
  return updatedItem;
}

export async function deleteLookup(id: string): Promise<boolean> {
  removeCustomLookupFromStorage(id);
  try {
    await apiClient.delete<any>(`/lookups/${id}`);
  } catch (err) {
    console.warn("Backend deleteLookup note:", err);
  }
  notifyLookupsChanged();
  return true;
}

export async function fetchSuppliers(): Promise<SupplierItem[]> {
  try {
    const payload = await apiClient.get<any>("/suppliers");
    const items = Array.isArray(payload) ? payload : payload?.data || [];
    if (items.length > 0) return items;
  } catch {
    // Graceful fallback
  }
  return [
    {
      id: "sup-1",
      name: "Ethiopian Agricultural Equipment Enterprise",
      tinNumber: "TIN-00293847",
      email: "sales@eaee.gov.et",
      phone: "+251115512345",
      status: "ACTIVE",
    },
  ];
}

export async function fetchOfficers(): Promise<OfficerUserItem[]> {
  try {
    let payload = await apiClient.get<any>("/users", {
      params: { role: "ProcurementOfficer", isActive: true, pageSize: 100 },
    });
    let list = Array.isArray(payload) ? payload : payload?.data || [];
    if (!list || list.length === 0) {
      payload = await apiClient.get<any>("/users", {
        params: { role: "OFFICER", isActive: true, pageSize: 100 },
      });
      list = Array.isArray(payload) ? payload : payload?.data || [];
    }
    if (list.length > 0) {
      const filtered = list
        .filter((u: any) => {
          const activeFlag = u.isActive !== false;
          const activeStatus =
            !u.status ||
            u.status === "ACTIVE" ||
            u.status === "PENDING_INVITATION";
          const isOfficerRole =
            !u.role ||
            u.role === "ProcurementOfficer" ||
            u.role === "OFFICER" ||
            u.authRole === "OFFICER" ||
            u.authRole === "ProcurementOfficer";
          return activeFlag && activeStatus && isOfficerRole;
        })
        .map((u: any) => ({
          id: u.id,
          name: u.name || u.displayName || u.email,
          email: u.email,
          role: u.role || u.authRole || "ProcurementOfficer",
          isActive: true,
          status: u.status || "ACTIVE",
        }));
      if (filtered.length > 0) {
        return filtered;
      }
    }
  } catch {
    // Graceful fallback
  }
  return FALLBACK_OFFICERS.filter((o) => o.isActive);
}

export interface CommitteeUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

const FALLBACK_COMMITTEE_MEMBERS: CommitteeUserItem[] = [
  {
    id: "dcb48490-bf61-4982-89b0-3556da376ea3",
    name: "Workneh Tsionawit",
    email: "tsionawit.ugr-4989-16@aau.edu.et",
    role: "ENDORSING_COMMITTEE",
  },
  {
    id: "46258fbe-9684-41cf-b814-77788d30bca1",
    name: "Edna Asmamaw",
    email: "edna@gmail.com",
    role: "ENDORSING_COMMITTEE",
  },
  {
    id: "265f711e-adf1-406a-b965-185a96496bce",
    name: "Alula Girma",
    email: "alula@gmail.com",
    role: "ENDORSING_COMMITTEE",
  },
  {
    id: "d129e293-d9d6-4759-9705-1077c5a288ad",
    name: "Worku Bekele",
    email: "worku@gmail.com",
    role: "ENDORSING_COMMITTEE",
  },
  {
    id: "0e02469a-39df-4af4-9400-c08c383dd903",
    name: "Dawit Haile",
    email: "dawit@gmail.com",
    role: "ENDORSING_COMMITTEE",
  },
];

export async function fetchCommitteeMembers(): Promise<CommitteeUserItem[]> {
  try {
    const payload = await apiClient.get<any>("/users", {
      params: { role: "ENDORSING_COMMITTEE", isActive: true, pageSize: 100 },
    });
    const list = Array.isArray(payload) ? payload : payload?.data || [];
    if (list.length > 0) {
      const filtered = list.filter((u: any) => {
        const activeFlag = u.isActive !== false;
        const activeStatus = !u.status || u.status === "ACTIVE";
        const isCommitteeRole =
          !u.role ||
          u.role === "ENDORSING_COMMITTEE" ||
          u.role === "CommitteeMember" ||
          u.role === "EndorsingCommitteeMember" ||
          u.authRole === "ENDORSING_COMMITTEE" ||
          u.authRole === "CommitteeMember";
        return activeFlag && activeStatus && isCommitteeRole;
      });
      if (filtered.length > 0) {
        return filtered.map((u: any) => ({
          id: u.id,
          name: u.name || u.displayName || u.email,
          email: u.email,
          role: u.role || u.authRole || "ENDORSING_COMMITTEE",
        }));
      }
    }
  } catch {
    // Graceful fallback
  }
  return FALLBACK_COMMITTEE_MEMBERS;
}
