import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fetchContracts,
  createContract,
  recordContractPayment,
  type BackendContract,
  type BackendPayment,
} from "./contractsApi";

describe("contractsApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches contracts list via GET /api/contracts", async () => {
    const mockContracts: BackendContract[] = [
      {
        id: "con-1",
        contractNo: "CON-2026-001",
        totalValue: 500000,
        currency: "ETB",
        status: "ACTIVE",
      },
    ];

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockContracts), { status: 200 }),
    );

    const result = await fetchContracts({ status: "ACTIVE" });
    expect(result).toEqual(mockContracts);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/contracts?status=ACTIVE"),
      expect.any(Object),
    );
  });

  it("creates contract and records payments", async () => {
    const createdContract: BackendContract = {
      id: "con-2",
      contractNo: "CON-2026-002",
      totalValue: 1200000,
      currency: "ETB",
      status: "ACTIVE",
    };

    const payment: BackendPayment = {
      id: "pay-1",
      contractId: "con-2",
      amount: 300000,
      referenceNo: "VOU-001",
      paymentType: "ADVANCE",
      status: "PAID",
    };

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(createdContract), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payment), { status: 200 }),
      );

    const resContract = await createContract({
      contractNo: "CON-2026-002",
      totalValue: 1200000,
    });
    expect(resContract.id).toBe("con-2");

    const resPayment = await recordContractPayment("con-2", {
      amount: 300000,
      referenceNo: "VOU-001",
      idempotencyKey: "idemp-1",
    });
    expect(resPayment.amount).toBe(300000);
  });

  it("imports contracts via POST /api/contracts/import", async () => {
    const { importContracts } = await import("./contractsApi");
    const mockResponse = {
      message: "Contracts imported successfully.",
      created: 5,
      updated: 2,
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const testFile = new File(["dummy content"], "contracts.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await importContracts(testFile);
    expect(result.created).toBe(5);
    expect(result.updated).toBe(2);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/contracts/import"),
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );
  });

  it("falls back to /api/excel/import/contracts if /contracts/import returns 404", async () => {
    const { importContracts } = await import("./contractsApi");
    const mockResponse = {
      message: "Contracts imported successfully.",
      created: 3,
      updated: 1,
    };

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          statusText: "Not Found",
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

    const testFile = new File(["dummy content"], "contracts.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await importContracts(testFile);
    expect(result.created).toBe(3);
    expect(result.updated).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("maps signatureDate and plannedEndDate in mapBackendContractToOfficerContract", async () => {
    const { mapBackendContractToOfficerContract } =
      await import("./contractsApi");
    const backendContract: BackendContract = {
      id: "con-3",
      contractNo: "CON-AGP2-003",
      totalValue: 900000,
      paidAmount: 300000,
      remainingValue: 600000,
      status: "ACTIVE",
      signatureDate: "2026-03-15T00:00:00.000Z",
      plannedEndDate: "2026-12-31T00:00:00.000Z",
      supplier: {
        id: "sup-1",
        name: "Acme Supplies Ltd",
      },
      activity: {
        id: "act-1",
        reference: "ACT-001",
        description: "Supply of Agricultural Machinery",
      },
    };

    const mapped = mapBackendContractToOfficerContract(backendContract);
    expect(mapped.contractNumber).toBe("CON-AGP2-003");
    expect(mapped.project).toBe("AGP-II");
    expect(mapped.supplier).toBe("Acme Supplies Ltd");
    expect(mapped.procurementActivity).toBe("Supply of Agricultural Machinery");
    expect(mapped.signingDate.gregorian).toBe(
      new Date("2026-03-15T00:00:00.000Z").toLocaleDateString("en-GB"),
    );
    expect(mapped.completionDate.gregorian).toBe(
      new Date("2026-12-31T00:00:00.000Z").toLocaleDateString("en-GB"),
    );
    expect(mapped.status).toBe("Active");
  });
});
