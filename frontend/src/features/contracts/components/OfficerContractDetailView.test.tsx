import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OfficerContract } from "../data/officerContracts";
import type { OfficerContractPayment } from "../data/officerPayments";
import { OfficerContractDetailView } from "./OfficerContractDetailView";

vi.mock("@/lib/contractsApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/contractsApi")>();
  return {
    ...actual,
    fetchContractPayments: vi.fn().mockResolvedValue([]),
  };
});

const mockContract: OfficerContract = {
  completionDate: { ethiopian: "30-Sene-2018", gregorian: "2026-07-07" },
  contractNumber: "MOA-CON-001-2016-01",
  currency: "ETB",
  currentAmount: 10_000_000,
  details: {
    activityReference: "ET-MoA-000001-GO-RFB",
    amendments: [
      {
        amount: 500_000,
        id: 1,
      },
    ],
    amountWithVat: 11_500_000,
    netOfVat: 10_000_000,
    planReference: "PP-DRIVE-2016-01",
    projectCode: "PRJ-24-001",
    remarks: "Initial high-priority procurement",
    startDate: { ethiopian: "01-Hamle-2017", gregorian: "2025-07-08" },
    subcomponent: "Component 1.1",
    vatRate: 15,
  },
  id: "contract-1",
  originalAmount: 9_500_000,
  procurementActivity: "Supply of Veterinary Vaccines",
  project: "DRIVE",
  remainingBalance: 4_500_000,
  signingDate: { ethiopian: "01-Hamle-2017", gregorian: "2025-07-08" },
  status: "Active",
  supplier: "Agricultural Supply Enterprise",
  totalPaid: 5_500_000,
};

const mockPayments: OfficerContractPayment[] = [
  {
    amount: 2_000_000,
    contractNumber: "MOA-CON-001-2016-01",
    currency: "ETB",
    date: {
      ethiopian: "15-Hamle-2017",
      gregorian: "2025-07-22",
    },
    id: "payment-1",
    paymentType: "Advance",
    reference: "VCH-2025-001",
    remarks: "Initial mobilization advance",
  },
  {
    amount: 3_500_000,
    contractNumber: "MOA-CON-001-2016-01",
    currency: "ETB",
    date: {
      ethiopian: "20-Nehase-2017",
      gregorian: "2025-08-26",
    },
    id: "payment-2",
    paymentType: "1st / Interim",
    reference: "VCH-2025-042",
    remarks: "First delivery milestone",
  },
];

describe("OfficerContractDetailView", () => {
  it("renders contract details accurately", () => {
    const markup = renderToStaticMarkup(
      <OfficerContractDetailView
        contract={mockContract}
        payments={mockPayments}
      />,
    );

    expect(markup).toContain("MOA-CON-001-2016-01");
    expect(markup).toContain("Supply of Veterinary Vaccines");
    expect(markup).toContain("Agricultural Supply Enterprise");
    expect(markup).toContain("DRIVE");
    expect(markup).toContain("Active");
    expect(markup).toContain("ET-MoA-000001-GO-RFB");
    expect(markup).toContain("PP-DRIVE-2016-01");
    expect(markup).toContain("Component 1.1");
    expect(markup).toContain("Initial high-priority procurement");
    expect(markup).toContain("2025-07-08");
    expect(markup).toContain("2026-07-07");
    expect(markup).toContain("10,000,000.00");
  });

  it("renders each registered payment type with its amount, currency, and date", () => {
    const markup = renderToStaticMarkup(
      <OfficerContractDetailView
        contract={mockContract}
        payments={mockPayments}
      />,
    );

    // Section title
    expect(markup).toContain("Registered Payments &amp; Disbursements");
    expect(markup).toContain("2 Payments");

    // First payment: Advance
    expect(markup).toContain("Advance");
    expect(markup).toContain("2,000,000.00");
    expect(markup).toContain("2025-07-22");
    expect(markup).toContain("15-Hamle-2017");
    expect(markup).toContain("VCH-2025-001");
    expect(markup).toContain("Initial mobilization advance");

    // Second payment: 1st / Interim
    expect(markup).toContain("1st / Interim");
    expect(markup).toContain("3,500,000.00");
    expect(markup).toContain("2025-08-26");
    expect(markup).toContain("20-Nehase-2017");
    expect(markup).toContain("VCH-2025-042");
    expect(markup).toContain("First delivery milestone");

    // Currency
    expect(markup).toContain("ETB");

    // Total registered sum
    expect(markup).toContain("5,500,000.00");
  });

  it("renders empty state notice when no payments are registered", () => {
    const markup = renderToStaticMarkup(
      <OfficerContractDetailView contract={mockContract} payments={[]} />,
    );

    expect(markup).toContain("No payments registered yet");
    expect(markup).toContain("Add Payment");
  });

  it("renders custom specified payment name when payment type is Other with otherPaymentType", () => {
    const paymentWithOther: OfficerContractPayment = {
      amount: 1_200_000,
      contractNumber: "MOA-CON-001-2016-01",
      currency: "ETB",
      date: { ethiopian: "10-Tikimt-2017", gregorian: "2025-10-20" },
      id: "payment-other-1",
      otherPaymentType: "Custom Mobilization Grant",
      paymentType: "Other",
      reference: "VCH-2025-999",
      remarks: "Special upfront grant",
    };

    const markup = renderToStaticMarkup(
      <OfficerContractDetailView
        contract={mockContract}
        payments={[paymentWithOther]}
      />,
    );

    expect(markup).toContain("Custom Mobilization Grant");
    expect(markup).toContain("1,200,000.00");
  });

  it("renders amendment justification reasons, variation type, effective dates, and entered details", () => {
    const contractWithDetailedAmendment: OfficerContract = {
      ...mockContract,
      details: {
        ...mockContract.details!,
        amendments: [
          {
            id: 1,
            amount: -1_000_000,
            reason:
              "De-scoping due to site inaccessibility and vendor revised quote",
            effectiveDate: "2026-10-14",
            ethiopianDate: "04-Tikimt-2019",
            approvalRef: "MOA/AGP2/WB/AMD-01",
            notes: "Reduced 2 refrigeration units from contract scope",
          },
        ],
      },
    };

    const markup = renderToStaticMarkup(
      <OfficerContractDetailView
        contract={contractWithDetailedAmendment}
        payments={[]}
      />,
    );

    expect(markup).toContain("Contract Amendments");
    expect(markup).toContain("1 Amendment");
    expect(markup).toContain("Reduction");
    expect(markup).toContain("-1,000,000.00");
    expect(markup).toContain("2026-10-14");
    expect(markup).toContain("04-Tikimt-2019");
    expect(markup).toContain("MOA/AGP2/WB/AMD-01");
    expect(markup).toContain(
      "De-scoping due to site inaccessibility and vendor revised quote",
    );
    expect(markup).toContain(
      "Reduced 2 refrigeration units from contract scope",
    );
  });
});
