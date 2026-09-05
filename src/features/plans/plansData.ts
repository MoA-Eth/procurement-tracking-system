export type PlanCategory =
  "Goods" | "Works" | "Non-Consulting Services" | "Consultancy Services";

export type PlanStatus =
  | "Draft"
  | "Submitted to Director"
  | "Returned"
  | "Committee Review"
  | "Finally Approved"
  | "Awaiting Management Approval"
  | "Committee Endorsed"
  | "Committee Rejected"
  | "Management Approved"
  | "Management Rejected"
  | "Returned for Revision";

export interface ProcurementPlan {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  planName: string;
  budgetYear: string;
  category: PlanCategory;
  planPeriodFrom: string;
  planPeriodTo: string;
  organizationRegion: string;
  description?: string;
  approvalDate?: string;
  generalNoticeDate?: string;
  status: PlanStatus;
  createdBy: string;
  assignedOfficer?: string;
  createdAt: string;
  activitiesCount: number;
  reference?: string;
  currency?: string;
  estimatedValue?: number;
  // Extended fields for Committee Dashboards & decisions integration
  estimatedTotal?: string;
  isPriority?: boolean;
  progress?: number;
  progressText?: string;
  deadlineDate?: string;
  deadlineText?: string;
  decisionRecordedDate?: string;
  committeeDecision?: "Approved" | "Rejected";
  rejectionReason?: string;
  managementDecision?: "Approved" | "Rejected";
  managementComment?: string;
  managementById?: string;
  managementByName?: string;
  managementAt?: string;
  directorRevisionComment?: string;
  comments?: any[];
  activities?: any[];
}

export const PLAN_CATEGORY_CHOICES: {
  category: PlanCategory;
  description: string;
  examples: string;
}[] = [
  {
    category: "Goods",
    description: "Physical items and supplies",
    examples:
      "Uniform, stationery, toners, vehicles, ICT equipment, laboratory equipment",
  },
  {
    category: "Works",
    description: "Construction/rehabilitation infrastructure",
    examples:
      "Water supply, laboratories, collection centers, workshop/calibration center",
  },
  {
    category: "Non-Consulting Services",
    description: "Services not primarily intellectual/advisory consultancy",
    examples: "Printing, event management, operational services",
  },
  {
    category: "Consultancy Services",
    description: "Firm or individual professional/advisory services",
    examples:
      "Baseline survey, audit, value-chain studies, supervision, training/design consultancy",
  },
];

export const INITIAL_PLANS: ProcurementPlan[] = [];
