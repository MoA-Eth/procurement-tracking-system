export interface DirectorPlan {
  id: string;
  title: string;
  directorate: string;
  submittedBy: string;
  submissionDate: string;
  status: "Awaiting Review" | "Approved" | "Returned for Revision" | "Rejected";
  totalActivitiesCount: number;
  estimatedBudgetETB: number;
  signedCommitmentETB?: number;
  actualDisbursedETB?: number;
  remainingBalanceETB?: number;
  description: string;
  activities: {
    id: string;
    activityName: string;
    estimatedCostETB: number;
    procurementMethod: string;
    plannedStartDate: string;
    plannedEndDate: string;
    status: string;
  }[];
}

export interface CriticalDelay {
  id: string;
  activityTitle: string;
  fullTitle: string;
  directorate: string;
  projectName?: string;
  delayDetail: string;
  stageName: string;
  daysOverdue: number;
  status: "Delayed" | "Expedited" | "Resolved";
  assignedOfficer: string;
  plannedCompletionDate: string;
  currentBottleneck: string;
}

export interface PipelineStageVolume {
  id: number;
  code: string;
  title: string;
  sublabel: string;
  count: number;
  accent: "default" | "amber" | "purple" | "teal" | "emerald";
}

export interface DirectorateHealthMetrics {
  contractExecutionRate: number;
  disbursementPace: number;
  scheduleAdherence: number;
  nextAuditDate: string;
  bottleneckStage: string;
  standardDaysPerStage: number;
}

export interface FinancialCapitalSummary {
  planEstimatedValueETB: number;
  signedContractsCommittedETB: number;
  actualDisbursedETB: number;
  remainingUncommittedETB: number;
  contractExecutionRatePct: number;
  disbursedOfContractedPct: number;
  availableCapacityPct: number;
  committedPendingPayETB: number;
  uncontractedETB: number;
}

export const INITIAL_PIPELINE_STAGES: PipelineStageVolume[] = [
  {
    id: 1,
    code: "1. PLAN",
    title: "1. PLAN",
    sublabel: "Created",
    count: 0,
    accent: "default",
  },
  {
    id: 2,
    code: "2. REVIEW",
    title: "2. REVIEW",
    sublabel: "Director",
    count: 0,
    accent: "amber",
  },
  {
    id: 3,
    code: "3. COMM",
    title: "3. COMM",
    sublabel: "Voting",
    count: 0,
    accent: "purple",
  },
  {
    id: 4,
    code: "4. TENDER",
    title: "4. TENDER",
    sublabel: "Published",
    count: 0,
    accent: "default",
  },
  {
    id: 5,
    code: "5. EVAL",
    title: "5. EVAL",
    sublabel: "Technical",
    count: 0,
    accent: "default",
  },
  {
    id: 6,
    code: "6. AWARD",
    title: "6. AWARD",
    sublabel: "Intention",
    count: 0,
    accent: "default",
  },
  {
    id: 7,
    code: "7. CONT",
    title: "7. CONT",
    sublabel: "Signed",
    count: 0,
    accent: "teal",
  },
  {
    id: 8,
    code: "8. EXEC",
    title: "8. EXEC",
    sublabel: "Delivery",
    count: 0,
    accent: "default",
  },
  {
    id: 9,
    code: "9. DONE",
    title: "9. DONE",
    sublabel: "Completed",
    count: 0,
    accent: "emerald",
  },
];

export const INITIAL_HEALTH_METRICS: DirectorateHealthMetrics = {
  contractExecutionRate: 0,
  disbursementPace: 0,
  scheduleAdherence: 0,
  nextAuditDate: "Not scheduled",
  bottleneckStage: "None detected",
  standardDaysPerStage: 14,
};

export const INITIAL_FINANCIAL_SUMMARY: FinancialCapitalSummary = {
  planEstimatedValueETB: 0,
  signedContractsCommittedETB: 0,
  actualDisbursedETB: 0,
  remainingUncommittedETB: 0,
  contractExecutionRatePct: 0,
  disbursedOfContractedPct: 0,
  availableCapacityPct: 0,
  committedPendingPayETB: 0,
  uncontractedETB: 0,
};

export const INITIAL_DIRECTOR_PLANS: DirectorPlan[] = [];

export const INITIAL_CRITICAL_DELAYS: CriticalDelay[] = [];
