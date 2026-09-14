import { describe, expect, it } from "vitest";
import {
  contractFiscalYear,
  filterOfficerContracts,
  type OfficerContractFilterValues,
} from "./contractFilters";
import type { OfficerContract } from "./officerContracts";

const mockContract: OfficerContract = {
  completionDate: { ethiopian: "30-Sene-2018", gregorian: "2026-07-07" },
  contractNumber: "MOA-CON-001-01-000001",
  currency: "ETB",
  currentAmount: 45_000_000,
  details: {
    activityReference: "ET-MoA-000001-GO-RFB",
    amendments: [],
    amountWithVat: 45_000_000,
    netOfVat: 39_130_434.78,
    organizationRegion: "FPCU / Federal",
    planReference: "PP-DRIVE-2016-01",
    projectCode: "PRJ-24-001",
    startDate: { ethiopian: "12-Nehase-2018", gregorian: "2026-08-18" },
    vatRate: 15,
  },
  id: "contract-1",
  originalAmount: 45_000_000,
  procurementActivity: "Supply of Veterinary Vaccines",
  project: "DRIVE",
  remainingBalance: 24_750_000,
  signingDate: { ethiopian: "12-Nehase-2018", gregorian: "2026-08-18" },
  status: "Active / Under Implementation",
  supplier: "Agricultural Supply Enterprise",
  totalPaid: 20_250_000,
};

const defaultFilters: OfficerContractFilterValues = {
  currency: "all",
  fiscalYear: "all",
  organization: "all",
  project: "all",
  searchQuery: "",
  status: "all",
};

describe("officer contract filters", () => {
  it("extracts the fiscal year from display and ISO Gregorian dates", () => {
    expect(contractFiscalYear(mockContract)).toBe("2026");
    expect(
      contractFiscalYear({
        ...mockContract,
        signingDate: { ethiopian: "22-Nehase-2018", gregorian: "2026-08-28" },
      }),
    ).toBe("2026");
  });

  it("searches contract number, activity reference, activity, and supplier", () => {
    for (const searchQuery of [
      "001-01-000001",
      "000001-go-rfb",
      "veterinary vaccines",
      "agricultural supply",
    ]) {
      expect(
        filterOfficerContracts([mockContract], {
          ...defaultFilters,
          searchQuery,
        }),
      ).toEqual([mockContract]);
    }
  });

  it("combines fiscal year, organization, project, currency, and status", () => {
    expect(
      filterOfficerContracts([mockContract], {
        ...defaultFilters,
        currency: "ETB",
        fiscalYear: "2026",
        organization: "FPCU / Federal",
        project: "DRIVE",
        status: "Active / Under Implementation",
      }),
    ).toEqual([mockContract]);
  });
});
