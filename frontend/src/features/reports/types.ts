export type ReportType =
  | "annual-plan"
  | "plan-vs-actual"
  | "procurement-step"
  | "delayed-procurement"
  | "monthly-procurement"
  | "monthly-summary" // legacy alias for monthly-procurement
  | "quarterly-summary"
  | "quarterly-detailed"
  | "detailed-procurement" // legacy alias for quarterly-detailed
  | "contract-register"
  | "contract-payment"
  | "regional-sector-summary"
  | "project-summary"
  | "officer-summary"
  | "project-officer" // legacy alias for officer-summary
  | "committee-approval"
  | "supplier-performance";

export type ReportCategory =
  | "planning"
  | "periodic"
  | "contracts"
  | "organization";

export interface ReportItem {
  id: ReportType;
  label: string;
  priority: "P0" | "P1";
  category: ReportCategory;
  description: string;
}

export interface ReportFilterState {
  efy: string;
  fromDate: string;
  toDate: string;
  project: string;
  category: string;
  fundingSource: string;
  fundingType: string;
  procurementMethod: string;
  marketApproach: string;
  reviewType: string;
  planStatus: string;
  contractStatus: string;
  officer: string;
  delayRange: string;
  currency: string;
  region: string;
  sector: string;
  quarter: string;
  month: string;
  supplier: string;
  directorDecision: string;
  committeeResult: string;
  managementDecision: string;
  orgGrouping: "REGION" | "SECTOR" | "ORGANIZATION";
}

export const DEFAULT_FILTERS: ReportFilterState = {
  efy: "ALL",
  fromDate: "2024-07-08",
  toDate: "2027-07-07",
  project: "ALL",
  category: "ALL",
  fundingSource: "ALL",
  fundingType: "ALL",
  procurementMethod: "ALL",
  marketApproach: "ALL",
  reviewType: "ALL",
  planStatus: "ALL",
  contractStatus: "ALL",
  officer: "ALL",
  delayRange: "ALL",
  currency: "ETB",
  region: "ALL",
  sector: "ALL",
  quarter: "ALL",
  month: "ALL",
  supplier: "ALL",
  directorDecision: "ALL",
  committeeResult: "ALL",
  managementDecision: "ALL",
  orgGrouping: "REGION",
};

export const REPORT_LIST: ReportItem[] = [
  // P0 - Planning & Roadmaps
  {
    id: "annual-plan",
    label: "Annual Procurement Plan",
    priority: "P0",
    category: "planning",
    description: "Annual planning view with packages, methods, currencies and targets.",
  },
  {
    id: "plan-vs-actual",
    label: "Plan vs Actual Progress",
    priority: "P0",
    category: "planning",
    description: "Compares baseline dates, revised targets, and actual stage dates.",
  },
  {
    id: "procurement-step",
    label: "Procurement Step Report",
    priority: "P0",
    category: "planning",
    description: "Method-specific stage roadmap tracking with delay days.",
  },
  {
    id: "delayed-procurement",
    label: "Delayed Procurement",
    priority: "P0",
    category: "planning",
    description: "Overdue procurement stages prioritized by longest delays.",
  },
  {
    id: "committee-approval",
    label: "Committee / Approval Progress",
    priority: "P0",
    category: "planning",
    description: "Director review, 5-member committee endorsement votes, and Management decision.",
  },

  // P0 & P1 - Periodic Management
  {
    id: "monthly-procurement",
    label: "Monthly Procurement Report (Monthly Summary)",
    priority: "P0",
    category: "periodic",
    description: "Monthly progress, completed stage achievements, delays and next activities.",
  },
  {
    id: "quarterly-summary",
    label: "Quarterly Procurement Summary",
    priority: "P0",
    category: "periodic",
    description: "Management matrix grouped by Method → Category → Funding Type.",
  },
  {
    id: "quarterly-detailed",
    label: "Quarterly Detailed Procurement",
    priority: "P1",
    category: "periodic",
    description: "Granular procurement records: winner, award value, PO/PV, delivery status.",
  },

  // P0 & P1 - Contracts & Finance
  {
    id: "contract-register",
    label: "Contract Register",
    priority: "P0",
    category: "contracts",
    description: "Searchable register preserving original amounts, amendments, dates, paid and balance.",
  },
  {
    id: "contract-payment",
    label: "Contract & Payment Status",
    priority: "P0",
    category: "contracts",
    description: "Payment progress breakdown: Advance, Interims, Final, Retentions, and % Paid.",
  },
  {
    id: "supplier-performance",
    label: "Supplier Performance",
    priority: "P1",
    category: "contracts",
    description: "Supplier delivery timeliness, award totals, paid amounts, and outstanding balance.",
  },

  // P0 - Organizational & Workload
  {
    id: "regional-sector-summary",
    label: "Regional / Sector Summary",
    priority: "P0",
    category: "organization",
    description: "Workload, completion rates, financial values and delays across regions or sectors.",
  },
  {
    id: "project-summary",
    label: "Project Summary",
    priority: "P0",
    category: "organization",
    description: "Consolidated project progress and financial position for Directorate view.",
  },
  {
    id: "officer-summary",
    label: "Officer Summary (Project & Officer Summary)",
    priority: "P0",
    category: "organization",
    description: "Assigned activities, active stages, delayed packages, and financial values per officer.",
  },
];
