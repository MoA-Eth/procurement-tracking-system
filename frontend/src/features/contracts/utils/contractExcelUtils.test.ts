import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import {
  downloadContractExcelTemplate,
  exportContractsToExcel,
  parseContractsFromExcel,
} from "./contractExcelUtils";

vi.mock("xlsx", async () => {
  const actual = await vi.importActual<typeof import("xlsx")>("xlsx");
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

vi.mock("@/lib/contractsApi", () => ({
  downloadContractsTemplate: vi.fn().mockResolvedValue(undefined),
  importContracts: vi.fn().mockResolvedValue({ created: 2, updated: 0 }),
}));

describe("contractExcelUtils", () => {
  it("triggers contract template download", async () => {
    await expect(downloadContractExcelTemplate()).resolves.toBeUndefined();
  });

  it("parses valid contracts from generated Excel buffer", async () => {
    const data = [
      {
        Project: "AGP-II",
        Activity: "ET-MoA-001-GO-RFQ",
        Supplier: "Afro Implements PLC",
        Region: "Oromia",
        "Contract Number": "CON-2024-001",
        "Contract Award Date": "2025-08-10",
        "Contract Signature Date": "2025-08-15",
        "Start Date": "2025-09-01",
        "End Date": "2026-06-30",
        "Original Contract Amount": 2500000,
        Amendment: 0,
        "Final Contract Amount": 2500000,
        "Total Paid": 500000,
        "Remaining Balance": 2000000,
        "Contract Status": "Active",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const outBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const file = new File([outBuffer], "test_contracts.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseContractsFromExcel(file);

    expect(result.totalRows).toBe(1);
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(0);
    expect(result.rows[0].contractNumber).toBe("CON-2024-001");
    expect(result.rows[0].supplier).toBe("Afro Implements PLC");
    expect(result.rows[0].originalAmount).toBe(2500000);
    expect(result.rows[0].status).toBe("Active");
  });

  it("rejects file when template structure is missing required contract headers", async () => {
    const wrongData = [
      {
        "Random Header": "Value 1",
        Description: "Some activity",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(wrongData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const outBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const file = new File([outBuffer], "wrong_contract_template.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await expect(parseContractsFromExcel(file)).rejects.toThrow(
      /Invalid template structure: The uploaded file does not follow the Contract template structure/,
    );
  });

  it("flags row errors for missing supplier, negative amounts, or invalid date ranges", async () => {
    const data = [
      {
        "Contract Number": "CON-VALID-01",
        Supplier: "Valid Supplier",
        "Original Contract Amount": 100000,
      },
      {
        "Contract Number": "",
        Supplier: "Valid Supplier",
        "Original Contract Amount": 100000,
      },
      {
        "Contract Number": "CON-NEG-01",
        Supplier: "Valid Supplier",
        "Original Contract Amount": -500,
      },
      {
        "Contract Number": "CON-DATE-ERR",
        Supplier: "Valid Supplier",
        "Start Date": "2026-06-01",
        "End Date": "2025-01-01",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const outBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const file = new File([outBuffer], "contracts_with_errors.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseContractsFromExcel(file);

    expect(result.totalRows).toBe(4);
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(3);
    expect(result.rows[1].validationError).toContain("Missing Contract Number");
    expect(result.rows[2].validationError).toContain(
      "Original Contract Amount cannot be negative",
    );
    expect(result.rows[3].validationError).toContain(
      "End Date cannot be before Start Date",
    );
  });

  it("exports contracts to Excel file matching canonical structure", () => {
    const mockContracts: any[] = [
      {
        id: "c-1",
        contractNumber: "MOA/AGP2/WB/CS-06/2024",
        procurementActivity: "Irrigation Feasibility Study",
        project: "AGP-II",
        supplier: "Consulting Engineers PLC",
        originalAmount: 5000000,
        currentAmount: 5200000,
        currency: "ETB",
        status: "Active",
        totalPaid: 1500000,
        remainingBalance: 3700000,
        signingDate: { ethiopian: "01/01/2017", gregorian: "2024-09-11" },
        completionDate: { ethiopian: "30/10/2017", gregorian: "2025-07-07" },
        details: {
          organizationRegion: "Oromia",
          awardDate: { ethiopian: "25/12/2016", gregorian: "2024-09-01" },
          startDate: { ethiopian: "01/01/2017", gregorian: "2024-09-11" },
          amendments: [{ id: 1, amount: 200000 }],
        },
      },
    ];

    const mockPayments: any[] = [
      {
        id: "pay-1",
        contractNumber: "MOA/AGP2/WB/CS-06/2024",
        amount: 1000000,
        paymentType: "Advance",
        date: { ethiopian: "10/01/2017", gregorian: "2024-09-20" },
      },
      {
        id: "pay-2",
        contractNumber: "MOA/AGP2/WB/CS-06/2024",
        amount: 500000,
        paymentType: "1st / Interim",
        date: { ethiopian: "20/02/2017", gregorian: "2024-10-30" },
      },
    ];

    exportContractsToExcel(mockContracts, mockPayments, "test_export.xlsx");

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "test_export.xlsx",
    );
  });
});
