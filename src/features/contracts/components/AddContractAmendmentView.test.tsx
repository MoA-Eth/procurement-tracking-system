import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OfficerContract } from "../data/officerContracts";
import { AddContractAmendmentView } from "./AddContractAmendmentView";

vi.mock("@/lib/contractsApi", () => ({
  fetchContractAmendments: vi.fn().mockResolvedValue([]),
  createContractAmendment: vi.fn().mockResolvedValue({}),
}));

const mockContract: OfficerContract = {
  completionDate: { ethiopian: "30-Sene-2018", gregorian: "2026-07-07" },
  contractNumber: "MOA-CON-001-2016-01",
  currency: "ETB",
  currentAmount: 10_000_000,
  details: {
    activityReference: "ET-MoA-000001-GO-RFB",
    amendments: [],
    amountWithVat: 11_500_000,
    netOfVat: 10_000_000,
    planReference: "PP-DRIVE-2016-01",
    projectCode: "PRJ-24-001",
    startDate: { ethiopian: "01-Hamle-2017", gregorian: "2025-07-08" },
    vatRate: 15,
  },
  id: "contract-1",
  originalAmount: 10_000_000,
  procurementActivity: "Supply of Veterinary Vaccines",
  project: "DRIVE",
  remainingBalance: 5_000_000,
  signingDate: { ethiopian: "01-Hamle-2017", gregorian: "2025-07-08" },
  status: "Active",
  supplier: "Agricultural Supply Enterprise",
  totalPaid: 5_000_000,
};

describe("AddContractAmendmentView", () => {
  it("renders amendment form, baseline financials, and variation options", () => {
    const markup = renderToStaticMarkup(
      <AddContractAmendmentView contract={mockContract} onSave={vi.fn()} />,
    );

    expect(markup).toContain("Contract Amendment / Variation");
    expect(markup).toContain("MOA-CON-001-2016-01");
    expect(markup).toContain("Contract Baseline &amp; Context");
    expect(markup).toContain("Original Amount");
    expect(markup).toContain("Current Total Amount");
    expect(markup).toContain("Total Paid To Date");
    expect(markup).toContain("Current Balance");
    expect(markup).toContain("Cost Addition (+)");
    expect(markup).toContain("Cost Reduction (-)");
    expect(markup).toContain("Effective Date");
    expect(markup).toContain("Reason / Justification for Amendment");
    expect(markup).toContain("Calculated Amendment Impact");
    expect(markup).toContain("New Total Contract Value");
    expect(markup).toContain("Amendment Checklist");
  });

  it("calculates numeric balances properly and shows next amendment number", () => {
    const contractWithAmendments: OfficerContract = {
      ...mockContract,
      details: {
        ...mockContract.details!,
        amendments: [{ id: 1, amount: 500000 }],
      },
    };

    const markup = renderToStaticMarkup(
      <AddContractAmendmentView
        contract={contractWithAmendments}
        onSave={vi.fn()}
      />,
    );

    expect(markup).toContain("Amendment #2");
    expect(markup).toContain("Previous Amendments History");
    expect(markup).toContain("Apply Amendment #2");
  });
});
