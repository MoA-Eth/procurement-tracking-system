export type PlanCategory =
  "Goods" | "Works" | "Non-Consulting Services" | "Consultancy Services";

export type PlanStatus =
  | "Draft"
  | "Submitted to Director"
  | "Returned"
  | "Committee Review"
  | "Finally Approved";

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
  rejectionScope?: "ALL" | "SPECIFIC";
  rejectedActivityIds?: string[];
  rejectedActivityRefs?: string[];
  activities?: any[];
}

export interface ParsedRejectionDetails {
  scope: "ALL" | "SPECIFIC";
  rejectedActivityRefs: string[];
  cleanRemarks: string;
}

export function parseRejectionDetails(
  rejectionReason?: string | null,
): ParsedRejectionDetails {
  if (!rejectionReason) {
    return {
      scope: "ALL",
      rejectedActivityRefs: [],
      cleanRemarks: "",
    };
  }

  // Check pattern: [Flagged Activities: REF1, REF2] Remarks text...
  const match = rejectionReason.match(
    /^\[Flagged Activities:\s*([^\]]+)\]\s*([\s\S]*)$/i,
  );
  if (match) {
    const refs = match[1]
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    return {
      scope: "SPECIFIC",
      rejectedActivityRefs: refs,
      cleanRemarks: match[2]?.trim() || "",
    };
  }

  return {
    scope: "ALL",
    rejectedActivityRefs: [],
    cleanRemarks: rejectionReason.trim(),
  };
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
