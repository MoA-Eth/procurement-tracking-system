import type { ContractDateValue, OfficerContract } from "./officerContracts";

export const OFFICER_PAYMENTS_STORAGE_KEY = "moa-pts:officer-payments:v2";

export type ContractPaymentType =
  | "Advance"
  | "1st / Interim"
  | "2nd / Interim"
  | "Final"
  | "Retention Payment"
  | "Retention Withholding"
  | "Other";

export interface OfficerContractPayment {
  amount: number;
  contractNumber: string;
  date: ContractDateValue;
  id: string;
  paymentType: ContractPaymentType;
  reference?: string;
  remarks?: string;
}

export function addSavedPayment(
  payments: readonly OfficerContractPayment[],
  payment: OfficerContractPayment,
) {
  return [
    ...payments.filter((existing) => existing.id !== payment.id),
    payment,
  ];
}

export function parseSavedPayments(serialized: string | null) {
  if (!serialized) return [] as OfficerContractPayment[];

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isOfficerContractPayment);
  } catch {
    return [];
  }
}

export function paymentsForContract(
  payments: readonly OfficerContractPayment[],
  contractNumber: string,
) {
  return payments.filter(
    (payment) =>
      payment.contractNumber.toLowerCase() === contractNumber.toLowerCase(),
  );
}

export function applyPaymentsToContract(
  contract: OfficerContract,
  payments: readonly OfficerContractPayment[],
): OfficerContract {
  const additionalPaid = paymentsForContract(
    payments,
    contract.contractNumber,
  ).reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
  const contractTotalPaid = Number(contract.totalPaid) || 0;
  const contractCurrentAmount = Number(contract.currentAmount) || 0;
  const totalPaid = contractTotalPaid + additionalPaid;

  return {
    ...contract,
    currentAmount: contractCurrentAmount,
    originalAmount: Number(contract.originalAmount) || contractCurrentAmount,
    remainingBalance: Math.max(0, contractCurrentAmount - totalPaid),
    totalPaid,
  };
}

function isOfficerContractPayment(
  value: unknown,
): value is OfficerContractPayment {
  if (!value || typeof value !== "object") return false;
  const payment = value as Partial<OfficerContractPayment>;

  return (
    typeof payment.id === "string" &&
    typeof payment.contractNumber === "string" &&
    isPaymentType(payment.paymentType) &&
    typeof payment.amount === "number" &&
    Number.isFinite(payment.amount) &&
    payment.amount >= 0 &&
    isPaymentDate(payment.date) &&
    (payment.reference === undefined ||
      typeof payment.reference === "string") &&
    (payment.remarks === undefined || typeof payment.remarks === "string")
  );
}

function isPaymentType(value: unknown): value is ContractPaymentType {
  return (
    value === "Advance" ||
    value === "1st / Interim" ||
    value === "2nd / Interim" ||
    value === "Final" ||
    value === "Retention Payment" ||
    value === "Retention Withholding" ||
    value === "Other"
  );
}

function isPaymentDate(value: unknown): value is ContractDateValue {
  if (!value || typeof value !== "object") return false;
  const date = value as Partial<ContractDateValue>;
  return (
    typeof date.gregorian === "string" && typeof date.ethiopian === "string"
  );
}
