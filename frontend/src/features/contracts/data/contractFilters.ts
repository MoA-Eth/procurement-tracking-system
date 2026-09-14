import type {
  ContractCurrency,
  ContractStatus,
  OfficerContract,
} from "./officerContracts";

export interface OfficerContractFilterValues {
  currency: "all" | ContractCurrency;
  fiscalYear: string;
  organization: string;
  project: string;
  searchQuery: string;
  status: "all" | ContractStatus;
}

export function contractFiscalYear(contract: OfficerContract) {
  const match = contract.signingDate.gregorian.match(/\b(\d{4})\b/);
  return match?.[1] ?? "";
}

export function filterOfficerContracts(
  contracts: readonly OfficerContract[],
  filters: OfficerContractFilterValues,
) {
  const normalizedSearch = filters.searchQuery.trim().toLowerCase();

  return contracts.filter((contract) => {
    const searchableText = [
      contract.contractNumber,
      contract.details?.activityReference,
      contract.procurementActivity,
      contract.supplier,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!normalizedSearch || searchableText.includes(normalizedSearch)) &&
      (filters.fiscalYear === "all" ||
        contractFiscalYear(contract) === filters.fiscalYear) &&
      (filters.organization === "all" ||
        contract.details?.organizationRegion === filters.organization) &&
      (filters.project === "all" || contract.project === filters.project) &&
      (filters.currency === "all" || contract.currency === filters.currency) &&
      (filters.status === "all" || contract.status === filters.status)
    );
  });
}
