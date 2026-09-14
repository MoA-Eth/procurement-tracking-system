import { describe, expect, it } from "vitest";
import {
  addSavedContract,
  officerContracts,
  parseSavedContracts,
  type OfficerContract,
} from "./officerContracts";

const contract: OfficerContract = {
  completionDate: {
    ethiopian: "30-Sene-2019",
    gregorian: "2027-07-07",
  },
  contractNumber: "MOA-CON-2026-004",
  currency: "ETB",
  currentAmount: 11_500_000,
  details: {
    activityReference: "ET-MoA-000002-CW-RFB",
    amendments: [{ amount: 1_500_000, id: 1 }],
    amountWithVat: 10_000_000,
    netOfVat: 8_695_652.17,
    organizationRegion: "FPCU / Federal",
    planReference: "PP-DRIVE-2016-01",
    projectCode: "PRJ-24-001",
    vatRate: 15,
  },
  id: "contract-saved-1",
  originalAmount: 10_000_000,
  procurementActivity: "Construction of Irrigation Canal Extension",
  project: "DRIVE",
  remainingBalance: 11_500_000,
  signingDate: {
    ethiopian: "01-Hamle-2018",
    gregorian: "2026-07-08",
  },
  status: "Signed",
  supplier: "Example Construction PLC",
  totalPaid: 0,
};

describe("officer contract storage", () => {
  it("round-trips a document-complete contract record", () => {
    expect(parseSavedContracts(JSON.stringify([contract]))).toEqual([contract]);
  });

  it("replaces a contract with the same contract number", () => {
    const updated = { ...contract, status: "Completed" as const };
    expect(addSavedContract([contract], updated)).toEqual([updated]);
  });

  it("ignores malformed browser data", () => {
    expect(parseSavedContracts("not-json")).toEqual([]);
    expect(parseSavedContracts(JSON.stringify([{ bad: true }]))).toEqual([]);
  });
});
