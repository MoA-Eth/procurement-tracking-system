export type ReportType =
  | "annual-plan"
  | "plan-vs-actual"
  | "procurement-step"
  | "delayed-procurement"
  | "monthly-summary"
  | "contract-payment"
  | "detailed-procurement"
  | "project-officer";

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
};

export const REPORT_LIST: { id: ReportType; label: string }[] = [
  { id: "annual-plan", label: "Annual Procurement Plan" },
  { id: "plan-vs-actual", label: "Plan vs Actual" },
  { id: "procurement-step", label: "Procurement Step" },
  { id: "delayed-procurement", label: "Delayed Procurement" },
  { id: "monthly-summary", label: "Monthly Summary" },
  { id: "contract-payment", label: "Contract & Payment" },
  { id: "detailed-procurement", label: "Detailed Procurement" },
  { id: "project-officer", label: "Project & Officer Summary" },
];
