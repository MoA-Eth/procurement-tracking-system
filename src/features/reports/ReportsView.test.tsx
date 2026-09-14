import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReportsView } from "./components/ReportsView";
import { ReportFiltersPanel } from "./components/ReportFiltersPanel";
import { ReportTables } from "./components/ReportTables";
import { DEFAULT_FILTERS } from "./types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("ReportsView Component", () => {
  it("renders report type selector and active annual-plan filters by default", () => {
    const html = renderToStaticMarkup(<ReportsView />);

    // Breadcrumb and header
    expect(html).toContain("Reports");
    expect(html).toContain("Home");

    // Check all 8 report options exist in the selector
    expect(html).toContain("Annual Procurement Plan");
    expect(html).toContain("Plan vs Actual");
    expect(html).toContain("Procurement Step");
    expect(html).toContain("Delayed Procurement");
    expect(html).toContain("Monthly Summary");
    expect(html).toContain("Contract &amp; Payment");
    expect(html).toContain("Detailed Procurement");
    expect(html).toContain("Project &amp; Officer Summary");

    // Action controls
    expect(html).toContain("Filters");
    expect(html).toContain("+ More Filters");
    expect(html).toContain("Export to Excel");
  });
});

describe("ReportFiltersPanel - Dynamic Filter Sets per Report Type", () => {
  const dummyProps = {
    filters: DEFAULT_FILTERS,
    onUpdateFilter: vi.fn(),
    onApply: vi.fn(),
    onReset: vi.fn(),
    onExport: vi.fn(),
    isExporting: false,
    exportError: null,
    isApplying: false,
    appliedFeedback: false,
    activeFilterCount: 0,
    projectOptions: [{ value: "ALL", label: "All Projects" }],
    fundingSourceOptions: [{ value: "ALL", label: "All Sources" }],
    methodOptions: [{ value: "ALL", label: "All Methods" }],
    officerOptions: [{ value: "ALL", label: "All Officers" }],
    categoryOptions: [{ value: "ALL", label: "All Categories" }],
  };

  it("renders Annual Plan filters (EFY, Project, Category, Method, Source, Status)", () => {
    const html = renderToStaticMarkup(
      <ReportFiltersPanel {...dummyProps} activeReport="annual-plan" />,
    );
    expect(html).toContain("EFY");
    expect(html).toContain("Project");
    expect(html).toContain("Category");
    expect(html).toContain("Procurement Method");
    expect(html).toContain("Funding Source");
  });

  it("renders Plan vs Actual filters (EFY, Project, Date Range)", () => {
    const html = renderToStaticMarkup(
      <ReportFiltersPanel {...dummyProps} activeReport="plan-vs-actual" />,
    );
    expect(html).toContain("EFY");
    expect(html).toContain("Project");
    expect(html).toContain("Date Range");
  });

  it("renders Procurement Step filters (Project, Market Approach, Review Type)", () => {
    const html = renderToStaticMarkup(
      <ReportFiltersPanel {...dummyProps} activeReport="procurement-step" />,
    );
    expect(html).toContain("Project");
    expect(html).toContain("Market Approach");
    expect(html).toContain("Review Type");
  });

  it("renders Delayed Procurement filters (Project, Delay Threshold, Assigned Officer)", () => {
    const html = renderToStaticMarkup(
      <ReportFiltersPanel {...dummyProps} activeReport="delayed-procurement" />,
    );
    expect(html).toContain("Project");
    expect(html).toContain("Delay Threshold");
    expect(html).toContain("Assigned Officer");
  });

  it("renders Monthly Summary filters (EFY, Funding Type, Currency Output)", () => {
    const html = renderToStaticMarkup(
      <ReportFiltersPanel {...dummyProps} activeReport="monthly-summary" />,
    );
    expect(html).toContain("EFY");
    expect(html).toContain("Funding Type");
    expect(html).toContain("Currency Output");
  });

  it("renders Contract & Payment filters (Project, Contract Status, Region)", () => {
    const html = renderToStaticMarkup(
      <ReportFiltersPanel {...dummyProps} activeReport="contract-payment" />,
    );
    expect(html).toContain("Project");
    expect(html).toContain("Contract Status");
    expect(html).toContain("Region");
  });

  it("renders Detailed Procurement filters (Project, Category)", () => {
    const html = renderToStaticMarkup(
      <ReportFiltersPanel {...dummyProps} activeReport="detailed-procurement" />,
    );
    expect(html).toContain("Project");
    expect(html).toContain("Category");
  });

  it("renders Project Officer Summary filters (Project, Assigned Officer)", () => {
    const html = renderToStaticMarkup(
      <ReportFiltersPanel {...dummyProps} activeReport="project-officer" />,
    );
    expect(html).toContain("Project");
    expect(html).toContain("Assigned Officer");
  });
});

describe("ReportTables - Dedicated Tables & Empty State", () => {
  it("renders empty state when rows are empty", () => {
    const html = renderToStaticMarkup(
      <ReportTables
        activeReport="annual-plan"
        annualPlanRows={[]}
        planVsActualRows={[]}
        stepReportRows={[]}
        delayedProcurementRows={[]}
        monthlySummaryRows={[]}
        contractPaymentRows={[]}
        detailedProcurementRows={[]}
        projectOfficerRows={[]}
      />,
    );
    expect(html).toContain("No matching records");
    expect(html).toContain("Annual Procurement Plan Output");
    expect(html).toContain(
      "No data matches your active filter selection for Annual Procurement Plan.",
    );
  });

  it("renders dedicated table headers and rows for Plan vs Actual report", () => {
    const mockRows = [
      {
        id: "act-1",
        refNo: "MOA/G-01",
        description: "Fertilizer procurement",
        method: "RFB - National",
        plannedAdvertisingDate: "2025-08-01",
        actualAdvertisingDate: "2025-08-10",
        plannedOpeningDate: "2025-09-01",
        actualOpeningDate: "2025-09-05",
        plannedAwardDate: "2025-10-01",
        actualAwardDate: "2025-10-15",
        plannedSignatureDate: "2025-11-01",
        actualSignatureDate: "2025-11-05",
        status: "Signed",
      },
    ];

    const html = renderToStaticMarkup(
      <ReportTables
        activeReport="plan-vs-actual"
        annualPlanRows={[]}
        planVsActualRows={mockRows}
        stepReportRows={[]}
        delayedProcurementRows={[]}
        monthlySummaryRows={[]}
        contractPaymentRows={[]}
        detailedProcurementRows={[]}
        projectOfficerRows={[]}
      />,
    );

    expect(html).toContain("Plan vs Actual Output");
    expect(html).toContain("MOA/G-01");
    expect(html).toContain("Fertilizer procurement");
    expect(html).toContain("Plan Advert");
    expect(html).toContain("Actual Signed");
  });

  it("renders dedicated table headers and rows for Delayed Procurement report", () => {
    const mockRows = [
      {
        id: "act-del-1",
        refNo: "MOA/W-09",
        description: "Irrigation canal rehabilitation",
        method: "RFB - International",
        currentOverdueStage: "Bid Evaluation",
        effectiveTargetDate: "2026-08-01",
        actualOrCurrentDate: "2026-08-25",
        delayDays: 24,
        replanningReason: "Clarifications requested from bidders",
        officer: "Tigist Haile",
      },
    ];

    const html = renderToStaticMarkup(
      <ReportTables
        activeReport="delayed-procurement"
        annualPlanRows={[]}
        planVsActualRows={[]}
        stepReportRows={[]}
        delayedProcurementRows={mockRows}
        monthlySummaryRows={[]}
        contractPaymentRows={[]}
        detailedProcurementRows={[]}
        projectOfficerRows={[]}
      />,
    );

    expect(html).toContain("Delayed Procurement Output");
    expect(html).toContain("MOA/W-09");
    expect(html).toContain("Irrigation canal rehabilitation");
    expect(html).toContain("Bid Evaluation");
    expect(html).toContain("24 Days");
    expect(html).toContain("Tigist Haile");
  });

  it("renders dedicated table headers and rows for Monthly Summary report with dynamic currency", () => {
    const mockRows = [
      {
        id: "month-1",
        monthYear: "Hamle (July 2024)",
        category: "Goods",
        method: "Direct Procurement",
        fundingType: "Loan" as const,
        packageCount: 38,
        currency: "USD",
        totalAmountETB: 4500000,
      },
      {
        id: "month-2",
        monthYear: "Tikimt (October 2024)",
        category: "Goods",
        method: "Request for Quotations",
        fundingType: "Loan" as const,
        packageCount: 5,
        currency: "USD",
        totalAmountETB: 560000,
      },
    ];

    const html = renderToStaticMarkup(
      <ReportTables
        activeReport="monthly-summary"
        annualPlanRows={[]}
        planVsActualRows={[]}
        stepReportRows={[]}
        delayedProcurementRows={[]}
        monthlySummaryRows={mockRows}
        contractPaymentRows={[]}
        detailedProcurementRows={[]}
        projectOfficerRows={[]}
      />,
    );

    expect(html).toContain("Monthly Summary Output");
    expect(html).toContain("Total Value (USD)");
    expect(html).toContain("Hamle (July 2024)");
    expect(html).toContain("Tikimt (October 2024)");
    expect(html).toContain("38 items");
    expect(html).toContain("USD 4,500,000");
  });
});

