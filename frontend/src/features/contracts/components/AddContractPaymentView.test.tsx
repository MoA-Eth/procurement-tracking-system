import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OfficerContract } from "../data/officerContracts";
import { AddContractPaymentView } from "./AddContractPaymentView";

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

describe("AddContractPaymentView", () => {
  it("renders only the payment transaction fields from the mapping specification", () => {
    const markup = renderToStaticMarkup(
      <AddContractPaymentView contract={mockContract} onSave={vi.fn()} />,
    );

    expect(markup).toContain("Inherited Contract Context");
    expect(markup).toContain("Payment Type");
    expect(markup).toContain("1st / Interim");
    expect(markup).toContain("Retention Withholding");
    expect(markup).toContain("Payment Date");
    expect(markup).toContain("Payment Reference / Voucher No.");
    expect(markup).toContain("Calculated Contract Balance");
    expect(markup).toContain("Updated Total Paid");
    expect(markup).toContain("Remaining Balance");
    expect(markup).not.toContain("Project Name</label>");
    expect(markup).not.toContain("Supplier / Contractor</label>");
  });

  it("calculates numeric balances properly without string concatenation even if contract properties are string formatted", () => {
    const stringContract = {
      ...mockContract,
      currentAmount: "70000000.00" as unknown as number,
      totalPaid: "60000000.00" as unknown as number,
      remainingBalance: "10000000.00" as unknown as number,
    };

    const markup = renderToStaticMarkup(
      <AddContractPaymentView contract={stringContract} onSave={vi.fn()} />,
    );

    expect(markup).toContain("60,000,000.00");
    expect(markup).not.toContain("6,000,000,010,000,000.00");
  });
});
