import { directApiFetch } from "@/lib/apiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DisbursementCategory =
  | "PROCUREMENT_GOODS"
  | "CONTRACTOR_WORKS"
  | "PROJECT_GRANT"
  | "OPERATIONAL_ADMIN"
  | "OTHER_GENERAL";

export type PaymentMethod = "BANK_TRANSFER" | "CHEQUE_CPO" | "CASH";

export type ContractPaymentType =
  | "ADVANCE"
  | "INTERIM_1"
  | "INTERIM_2"
  | "FINAL"
  | "RETENTION_WITHHOLDING"
  | "RETENTION_PAYMENT"
  | "OTHER";

export const CONTRACT_PAYMENT_TYPE_LABELS: Record<ContractPaymentType, string> = {
  ADVANCE: "Advance Payment",
  INTERIM_1: "1st Interim Payment",
  INTERIM_2: "2nd Interim Payment",
  FINAL: "Final Payment",
  RETENTION_PAYMENT: "Retention Release",
  RETENTION_WITHHOLDING: "Retention Withholding",
  OTHER: "Other Milestone / General",
};

export const CONTRACT_PAYMENT_TYPE_LABELS_AM: Record<ContractPaymentType, string> = {
  ADVANCE: "ቅድመ ክፍያ",
  INTERIM_1: "የመጀመሪያ ምዕራፍ ክፍያ",
  INTERIM_2: "ሁለተኛ ምዕራፍ ክፍያ",
  FINAL: "የመጨረሻ ክፍያ",
  RETENTION_PAYMENT: "የተያዘ ገንዘብ ክፍያ",
  RETENTION_WITHHOLDING: "የዋስትና ገንዘብ ተቀናሽ",
  OTHER: "ሌላ ክፍያ",
};

export const CATEGORY_LABELS: Record<DisbursementCategory, string> = {
  PROCUREMENT_GOODS: "Procurement / Goods & Supplies",
  CONTRACTOR_WORKS: "Contractor & Construction Works",
  PROJECT_GRANT: "Project / Grant Disbursement",
  OPERATIONAL_ADMIN: "Operational & Administrative",
  OTHER_GENERAL: "Other General Ministry Payment",
};

export const CATEGORY_LABELS_AM: Record<DisbursementCategory, string> = {
  PROCUREMENT_GOODS: "የዕቃዎችና አቅርቦቶች ግዥ",
  CONTRACTOR_WORKS: "የኮንትራክተርና ግንባታ ሥራዎች",
  PROJECT_GRANT: "የፕሮጀክት / እርዳታ ክፍያ",
  OPERATIONAL_ADMIN: "አስተዳደራዊና የሥራ ማስኬጃ",
  OTHER_GENERAL: "ሌሎች አጠቃላይ የሚኒስቴር ክፍያዎች",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE_CPO: "Cheque (CPO)",
  CASH: "Cash",
};

export const PAYMENT_METHOD_LABELS_AM: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "የባንክ ዝውውር",
  CHEQUE_CPO: "ቼክ (ሲፒኦ)",
  CASH: "ጥሬ ገንዘብ",
};

export interface SmsLogEntry {
  id: string;
  recipientPhone: string;
  recipientName: string | null;
  message: string;
  status: "SENT" | "FAILED" | "PENDING";
  gatewayResponse: string | null;
  errorMessage: string | null;
  sentAt: string;
}

export interface Disbursement {
  id: string;
  referenceNo: string;
  payeeName: string | null;
  amount: string; // Decimal serialised as string
  category: string | null;
  paymentMethod: string | null;
  paymentDate: string;
  remarks: string | null;
  contractId: string | null;
  createdById: string | null;
  smsTriggered: boolean;
  smsStatus: string | null;
  createdAt: string;
  status: string;
  paymentType?: ContractPaymentType | null;
  creator?: { id: string; displayName: string; email: string } | null;
  contract?: {
    id: string;
    contractNo?: string;
    contractNumber?: string;
    supplier?: { id: string; name: string } | null;
  } | null;
  smsLogs?: SmsLogEntry[];
}

export interface DisbursementListResponse {
  items: Disbursement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContractLookupItem {
  id: string;
  contractNo: string;
  purchaseOrderNo?: string | null;
  totalValue: number;
  paidAmount: number;
  remainingValue: number;
  currency: string;
  sector?: string | null;
  status: string;
  supplierName: string;
  supplierPhone?: string | null;
  supplierTin?: string | null;
  paymentsCount?: number;
}

export interface DisbursementFormData {
  referenceNo: string;
  payeeName: string;
  amount: number;
  category: DisbursementCategory;
  paymentMethod: PaymentMethod;
  paymentType?: ContractPaymentType | null;
  paymentDate: string; // ISO date string
  remarks?: string;
  contractId?: string | null;
}

export interface SmsRecipient {
  name: string;
  phone: string;
}

export interface SmsSettings {
  smsEnabled: boolean;
  gatewayUrl: string;
  gatewayApiKey: string;
  thresholdEtb: number;
  recipients: SmsRecipient[];
  mockMode: boolean;
}

// ─── API functions ─────────────────────────────────────────────────────────────

export async function fetchContractsLookup(
  search?: string,
): Promise<{ data: ContractLookupItem[] }> {
  return directApiFetch("/finance/contracts-lookup", {
    params: search ? { search } : undefined,
  });
}

export async function createDisbursement(
  data: DisbursementFormData,
): Promise<{ data: Disbursement; message: string }> {
  return directApiFetch("/finance/disbursements", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}

export async function fetchDisbursements(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  smsStatus?: string;
  minAmount?: number;
  maxAmount?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<DisbursementListResponse> {
  return directApiFetch("/finance/disbursements", {
    params: params as Record<string, string | number | boolean | undefined | null>,
  });
}

export async function fetchDisbursementById(
  id: string,
): Promise<{ data: Disbursement }> {
  return directApiFetch(`/finance/disbursements/${id}`);
}

export async function retrySms(
  id: string,
): Promise<{ message: string }> {
  return directApiFetch(`/finance/disbursements/${id}/retry-sms`, {
    method: "POST",
  });
}

export async function fetchSmsSettings(): Promise<{ data: SmsSettings }> {
  return directApiFetch("/finance/settings");
}

export async function updateSmsSettings(
  settings: Omit<SmsSettings, "gatewayApiKey"> & { gatewayApiKey?: string },
): Promise<{ message: string }> {
  return directApiFetch("/finance/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
    headers: { "Content-Type": "application/json" },
  });
}

export async function sendTestSms(
  phone: string,
): Promise<{ success: boolean; message: string }> {
  return directApiFetch("/finance/settings/test-sms", {
    method: "POST",
    body: JSON.stringify({ phone }),
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatEtb(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function buildSmsPreview(
  amount: number,
  payeeName: string,
  referenceNo: string,
  category: DisbursementCategory,
  contractNo?: string | null,
): string {
  const amountFormatted = new Intl.NumberFormat("en-US").format(amount);
  const catLabel = CATEGORY_LABELS[category] || category;
  const contractPart = contractNo ? ` Contract: ${contractNo}.` : "";
  return `[MoA Alert] High-Value Disbursement: ETB ${amountFormatted} paid to ${payeeName} (${catLabel}).${contractPart} Ref: ${referenceNo}. Approve via Finance Portal.`;
}

