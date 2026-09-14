import { describe, expect, it } from "vitest";
import type { OfficerContract } from "./officerContracts";
import {
  addSavedPayment,
  applyPaymentsToContract,
  parseSavedPayments,
  type OfficerContractPayment,
} from "./officerPayments";

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

const payment: OfficerContractPayment = {
  amount: 2_000_000,
  contractNumber: mockContract.contractNumber,
  date: { ethiopian: "01-Hamle-2018", gregorian: "2026-07-08" },
  id: "payment-1",
  paymentType: "1st / Interim",
  reference: "PV-2026-001",
  remarks: "Certified interim payment",
};

describe("officer payment storage", () => {
  it("round-trips valid payment transactions", () => {
    expect(parseSavedPayments(JSON.stringify([payment]))).toEqual([payment]);
  });

  it("adds payments as separate transactions", () => {
    const second = {
      ...payment,
      id: "payment-2",
      paymentType: "Final" as const,
    };
    expect(addSavedPayment([payment], second)).toEqual([payment, second]);
  });

  it("calculates total paid and remaining balance", () => {
    const contract = applyPaymentsToContract(mockContract, [payment]);
    expect(contract.totalPaid).toBe(mockContract.totalPaid + payment.amount);
    expect(contract.remainingBalance).toBe(
      mockContract.remainingBalance - payment.amount,
    );
  });

  it("ignores malformed or negative payment records", () => {
    expect(parseSavedPayments("not-json")).toEqual([]);
    expect(
      parseSavedPayments(JSON.stringify([{ ...payment, amount: -1 }])),
    ).toEqual([]);
  });
});
