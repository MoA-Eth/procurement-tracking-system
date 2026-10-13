import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OfficerContractsView } from "./OfficerContractsView";
import { filterOfficerContracts } from "../data/contractFilters";
import type { OfficerContract } from "../data/officerContracts";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

const mockContracts: OfficerContract[] = Array.from({ length: 25 }, (_, i) => ({
  completionDate: { ethiopian: "30-Sene-2018", gregorian: "2026-07-07" },
  contractNumber: `MOA-CON-2026-${String(i + 1).padStart(3, "0")}`,
  currency: "ETB",
  currentAmount: 1_000_000 * (i + 1),
  details: {
    activityReference: `ET-MoA-${String(i + 1).padStart(4, "0")}-GO-RFB`,
    amendments: [],
    amountWithVat: 1_000_000 * (i + 1),
    netOfVat: 869_565 * (i + 1),
    organizationRegion: "FPCU / Federal",
    planReference: "PP-DRIVE-2016-01",
    projectCode: "PRJ-24-001",
    vatRate: 15,
  },
  id: `contract-${i + 1}`,
  originalAmount: 1_000_000 * (i + 1),
  procurementActivity: `Procurement Activity Item ${i + 1}`,
  project: i % 2 === 0 ? "DRIVE" : "LLRP",
  remainingBalance: 500_000 * (i + 1),
  signingDate: { ethiopian: "12-Nehase-2018", gregorian: "2026-08-18" },
  status:
    i % 3 === 0
      ? "Active / Under Implementation"
      : i % 3 === 1
        ? "Active"
        : "Completed",
  supplier: `Supplier Company ${i + 1}`,
  totalPaid: 500_000 * (i + 1),
}));

describe("OfficerContractsView and Filters", () => {
  it("renders functional pagination controls including Rows per page and page indicators", () => {
    const html = renderToStaticMarkup(<OfficerContractsView />);
    expect(html).toContain("Rows per page:");
    expect(html).toContain('aria-label="Rows per page"');
    expect(html).toContain('value="10"');
    expect(html).toContain('value="25"');
    expect(html).toContain('value="50"');
    expect(html).toContain('value="100"');
    expect(html).toContain('aria-label="Previous page"');
    expect(html).toContain('aria-label="Next page"');
    expect(html).toContain("Page 1 of");
  });

  it("filters contracts by status, matching Active variants properly", () => {
    const activeFiltered = filterOfficerContracts(mockContracts, {
      currency: "all",
      fiscalYear: "all",
      organization: "all",
      project: "all",
      searchQuery: "",
      status: "Active",
    });

    // Should include both "Active" and "Active / Under Implementation"
    expect(activeFiltered.length).toBeGreaterThan(0);
    const hasUnderImplementation = activeFiltered.some(
      (c) => c.status === "Active / Under Implementation",
    );
    const hasActive = activeFiltered.some((c) => c.status === "Active");
    expect(hasUnderImplementation).toBe(true);
    expect(hasActive).toBe(true);
  });

  it("filters contracts by project name in search query", () => {
    const llrpFiltered = filterOfficerContracts(mockContracts, {
      currency: "all",
      fiscalYear: "all",
      organization: "all",
      project: "all",
      searchQuery: "LLRP",
      status: "all",
    });

    expect(llrpFiltered.length).toBeGreaterThan(0);
    expect(llrpFiltered.every((c) => c.project === "LLRP")).toBe(true);
  });
});
