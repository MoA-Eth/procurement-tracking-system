export const OFFICER_CONTRACTS_STORAGE_KEY = "moa-pts:officer-contracts:v2";

export type ContractCurrency = "ETB" | "UA" | "USD";
export type ContractStatus =
  | "Active"
  | "Active / Under Implementation"
  | "Completed"
  | "Delayed"
  | "Partially Terminated"
  | "Planned / Prepared"
  | "Signed"
  | "Terminated";

export interface ContractDateValue {
  ethiopian: string;
  gregorian: string;
}

export interface ContractAmendment {
  amount: number;
  id: number;
}

export interface OfficerContractDetails {
  activityReference: string;
  actualCompletionDate?: ContractDateValue;
  amendments: ContractAmendment[];
  amountWithVat: number;
  awardDate?: ContractDateValue;
  netOfVat: number;
  organizationRegion?: string;
  planReference: string;
  projectCode: string;
  remarks?: string;
  startDate?: ContractDateValue;
  subcomponent?: string;
  vatRate?: number;
}

export interface OfficerContract {
  completionDate: ContractDateValue;
  contractNumber: string;
  currency: ContractCurrency;
  currentAmount: number;
  details?: OfficerContractDetails;
  id: string;
  originalAmount: number;
  procurementActivity: string;
  project: string;
  remainingBalance: number;
  signingDate: ContractDateValue;
  status: ContractStatus;
  supplier: string;
  totalPaid: number;
}

// Contracts are now loaded exclusively from the backend API via contractsApi.
export const officerContracts: readonly OfficerContract[] = [];

export function addSavedContract(
  contracts: readonly OfficerContract[],
  contract: OfficerContract,
) {
  return [
    ...contracts.filter(
      (existing) =>
        existing.contractNumber.toLowerCase() !==
        contract.contractNumber.toLowerCase(),
    ),
    contract,
  ];
}

export function parseSavedContracts(raw: string | null): OfficerContract[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((c: any) => ({
        ...c,
        originalAmount: Number(c.originalAmount) || 0,
        currentAmount: Number(c.currentAmount) || 0,
        totalPaid: Number(c.totalPaid) || 0,
        remainingBalance: Number(c.remainingBalance) || 0,
      }))
      .filter(isOfficerContract)
      .filter(
        (contract) => !contract.details?.activityReference?.startsWith("MOA/"),
      );
  } catch {
    return [];
  }
}

function isOfficerContract(value: unknown): value is OfficerContract {
  if (!value || typeof value !== "object") return false;
  const contract = value as Partial<OfficerContract>;
  return (
    typeof contract.id === "string" &&
    typeof contract.contractNumber === "string" &&
    typeof contract.procurementActivity === "string" &&
    typeof contract.project === "string" &&
    typeof contract.supplier === "string" &&
    typeof contract.originalAmount === "number" &&
    typeof contract.currentAmount === "number" &&
    (contract.currency === "ETB" ||
      contract.currency === "USD" ||
      contract.currency === "UA") &&
    typeof contract.totalPaid === "number" &&
    typeof contract.remainingBalance === "number" &&
    isContractDate(contract.signingDate) &&
    isContractDate(contract.completionDate) &&
    isContractStatus(contract.status)
  );
}

function isContractDate(value: unknown): value is ContractDateValue {
  if (!value || typeof value !== "object") return false;
  const date = value as Partial<ContractDateValue>;
  return (
    typeof date.gregorian === "string" && typeof date.ethiopian === "string"
  );
}

function isContractStatus(value: unknown): value is ContractStatus {
  return (
    value === "Active" ||
    value === "Active / Under Implementation" ||
    value === "Completed" ||
    value === "Delayed" ||
    value === "Partially Terminated" ||
    value === "Planned / Prepared" ||
    value === "Signed" ||
    value === "Terminated"
  );
}
