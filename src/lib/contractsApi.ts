export interface BackendPayment {
  id: string;
  contractId: string;
  amount: number;
  paymentDate?: string | null;
  referenceNo: string;
  paymentType?:
    "ADVANCE" | "INTERIM_1" | "INTERIM_2" | "FINAL" | "RETENTION" | string;
  status: "PAID" | "PENDING" | "FAILED";
  createdAt?: string;
}

export interface BackendContract {
  id: string;
  contractNo: string;
  activityId?: string | null;
  activity?: {
    id: string;
    reference: string;
    description: string;
  };
  supplierId?: string | null;
  supplier?: {
    id: string;
    name: string;
    tinNumber?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  totalValue: number;
  vatRate?: number | null;
  contractAmountWithVat?: number | null;
  contractNetOfVat?: number | null;
  paidAmount?: number | null;
  remainingValue?: number | null;
  remarks?: string | null;
  currency?: string | null;
  region?: string | null;
  sector?: string | null;
  subcomponent?: string | null;
  status:
    "ACTIVE" | "COMPLETED" | "CANCELLED" | "PENDING" | "DRAFT" | "TERMINATED";
  awardDate?: string | null;
  signatureDate?: string | null;
  startDate?: string | null;
  plannedEndDate?: string | null;
  actualEndDate?: string | null;
  payments?: BackendPayment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateContractInput {
  contractNo: string;
  supplierId?: string;
  activityId?: string;
  totalValue: number;
  currency?: string;
  region?: string;
  sector?: string;
}

export interface RecordPaymentInput {
  amount: number;
  referenceNo: string;
  idempotencyKey: string;
}

import { apiClient, directApiFetch, ApiClientError } from "./apiClient";
import { downloadReportFile, saveReportFile } from "./reportsApi";

export interface ImportContractsResult {
  message?: string;
  created: number;
  updated: number;
}

export async function importContracts(
  file: File,
): Promise<ImportContractsResult> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    return await directApiFetch<ImportContractsResult>("/contracts/import", {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      return await directApiFetch<ImportContractsResult>(
        "/excel/import/contracts",
        {
          method: "POST",
          body: formData,
        },
      );
    }
    throw err;
  }
}

export async function downloadContractsTemplate(): Promise<void> {
  const report = await downloadReportFile(
    "/excel/templates/contracts",
    {},
    "Contracts_Import_Template.xlsx",
  );
  saveReportFile(report);
}

export async function fetchContracts(params?: {
  search?: string;
  status?: string;
}): Promise<BackendContract[]> {
  try {
    const res = await apiClient.get<any>("/contracts", {
      params: {
        search: params?.search,
        status: params?.status,
      },
    });
    return Array.isArray(res) ? res : res.data || [];
  } catch (err) {
    console.warn("fetchContracts notice:", err);
    return [];
  }
}

export async function fetchContractById(id: string): Promise<BackendContract> {
  const res = await apiClient.get<any>(`/contracts/${encodeURIComponent(id)}`);
  return res.data || res;
}

export async function createContract(
  data: CreateContractInput,
): Promise<BackendContract> {
  const res = await apiClient.post<any>("/contracts", data);
  return res.data || res;
}

export async function updateContract(
  id: string,
  data: Partial<CreateContractInput>,
): Promise<BackendContract> {
  const res = await apiClient.patch<any>(
    `/contracts/${encodeURIComponent(id)}`,
    data,
  );
  return res.data || res;
}

export async function fetchContractPayments(
  contractId: string,
  status?: "PAID" | "PENDING" | "FAILED",
): Promise<BackendPayment[]> {
  try {
    const res = await apiClient.get<any>(
      `/contracts/${encodeURIComponent(contractId)}/payments`,
      {
        params: status ? { "filter[status]": status } : undefined,
      },
    );
    return Array.isArray(res) ? res : res.data || [];
  } catch (err) {
    console.error("fetchContractPayments error:", err);
    return [];
  }
}

export async function recordContractPayment(
  contractId: string,
  data: RecordPaymentInput,
): Promise<BackendPayment> {
  const res = await apiClient.post<any>(
    `/contracts/${encodeURIComponent(contractId)}/payments`,
    data,
  );
  return res.data || res;
}

export function mapBackendContractToOfficerContract(bc: BackendContract): any {
  const totalValue = Number(bc.totalValue) || 0;
  const paidAmount = Number(bc.paidAmount) || 0;
  const remainingValue =
    bc.remainingValue !== null && bc.remainingValue !== undefined
      ? Number(bc.remainingValue)
      : Math.max(0, totalValue - paidAmount);

  let supplierName = bc.supplier?.name;
  let activityDesc = bc.activity?.description || bc.activity?.reference;

  if ((!supplierName || !activityDesc) && bc.remarks) {
    const match = bc.remarks.match(/with\s+(.+?)\s+for\s+(.+)$/i);
    if (match) {
      if (!supplierName) supplierName = match[1].trim();
      if (!activityDesc) activityDesc = match[2].trim();
    }
  }

  let projectName = "MoA Project";
  if (bc.contractNo.includes("AGP2")) projectName = "AGP-II";
  else if (bc.contractNo.includes("LLRP")) projectName = "LLRP";
  else if (bc.contractNo.includes("RPSNP")) projectName = "RPSNP";
  else if (bc.contractNo.includes("SSIDP")) projectName = "SSIDP";
  else if (bc.contractNo.includes("HORT")) projectName = "HORT";

  return {
    id: bc.id,
    contractNumber: bc.contractNo,
    procurementActivity: activityDesc || "Procurement Activity",
    project: projectName,
    supplier: supplierName || "Contractor",
    originalAmount: totalValue,
    currentAmount: totalValue,
    currency: bc.currency || "ETB",
    status:
      bc.status === "ACTIVE"
        ? "Active"
        : bc.status === "COMPLETED"
          ? "Completed"
          : "Planned / Prepared",
    totalPaid: paidAmount,
    remainingBalance: remainingValue,
    signingDate: {
      ethiopian: "01 Meskerem 2017",
      gregorian: bc.signatureDate
        ? new Date(bc.signatureDate).toLocaleDateString("en-GB")
        : bc.createdAt
          ? new Date(bc.createdAt).toLocaleDateString("en-GB")
          : "Recent",
    },
    completionDate: {
      ethiopian: "30 Sene 2017",
      gregorian: bc.plannedEndDate
        ? new Date(bc.plannedEndDate).toLocaleDateString("en-GB")
        : "Pending",
    },
  };
}
