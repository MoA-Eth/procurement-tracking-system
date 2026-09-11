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
      (l) => l.id === item.id || (l.type === item.type && l.code === item.code),
    );
    if (existingIdx >= 0) {
      list[existingIdx] = item;
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

export async function fetchLookups(type?: string): Promise<LookupItem[]> {
  const customItems = getStoredCustomLookups();
  let serverItems: LookupItem[] = [];

  try {
    const payload = await apiClient.get<any>("/lookups", {
      params: type ? { type } : undefined,
    });
    serverItems = Array.isArray(payload) ? payload : payload?.data || [];
  } catch {
    // Graceful fallback
  }

  const baseline = type
    ? FALLBACK_LOOKUPS.filter((l) => l.type === type)
    : FALLBACK_LOOKUPS;

  const combinedMap = new Map<string, LookupItem>();

  // 1. Baseline
  baseline.forEach((item) => {
    combinedMap.set(`${item.type}:${item.code}`, item);
  });

  // 2. Server items
  serverItems.forEach((item) => {
    combinedMap.set(`${item.type}:${item.code}`, item);
  });

  // 3. Custom stored items
  customItems.forEach((item) => {
    if (!type || item.type === type) {
      combinedMap.set(`${item.type}:${item.code}`, item);
    }
  });

  const all = Array.from(combinedMap.values());
  return all.filter((l) => l.isActive);
}

export async function createLookup(data: {
  type: string;
  code: string;
  label: string;
}): Promise<LookupItem> {
  const cleanCode = data.code.trim().toUpperCase();
  const cleanLabel = data.label.trim();
  const newItem: LookupItem = {
    id: `custom-${data.type.toLowerCase()}-${Date.now()}`,
    type: data.type,
    code: cleanCode,
    label: cleanLabel,
    isActive: true,
  };

  try {
    const res = await apiClient.post<any>("/lookups", {
      type: data.type,
      code: cleanCode,
      label: cleanLabel,
    });
    if (res?.data?.id) {
      newItem.id = res.data.id;
    }
  } catch (err) {
    console.warn("Backend createLookup note (saved locally):", err);
  }

  saveCustomLookupToStorage(newItem);
  return newItem;
}

export async function updateLookup(
  id: string,
  data: { label?: string; isActive?: boolean },
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
    if (data.label !== undefined) target.label = data.label;
    if (data.isActive !== undefined) target.isActive = data.isActive;
    saveCustomLookupToStorage(target);
    if (!updatedItem) updatedItem = target;
  }

  return updatedItem;
}

export async function deleteLookup(id: string): Promise<boolean> {
  removeCustomLookupFromStorage(id);
  try {
    await apiClient.delete<any>(`/lookups/${id}`);
  } catch (err) {
    console.warn("Backend deleteLookup note:", err);
  }
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
    const payload = await apiClient.get<any>("/users", {
      params: { role: "ProcurementOfficer", isActive: true, pageSize: 100 },
    });
    const list = Array.isArray(payload) ? payload : payload?.data || [];
    if (list.length > 0) {
      return list
        .filter((u: any) => {
          const activeFlag = u.isActive !== false;
          const activeStatus = !u.status || u.status === "ACTIVE";
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
