export type ProjectStatus = "Active" | "Inactive";
export type ProcurementPlanStatus =
  | "Approved"
  | "Committee Review"
  | "Draft"
  | "Finally Approved"
  | "Returned"
  | "Submitted to Director";
export type ProcurementCategory =
  "Goods" | "Works" | "Non-Consulting Services" | "Consultancy Services";

export interface DualCalendarDateValue {
  ethiopian: string;
  gregorian: string;
}

export interface ProcurementPlanSummary {
  activities: number;
  budgetYear: string;
  category: ProcurementCategory;
  completedActivities: number;
  currency: "ETB" | "USD" | "UA";
  delayedActivities: number;
  description?: string;
  estimatedValue: number;
  generalProcurementNoticeDate?: DualCalendarDateValue;
  inProgressActivities: number;
  name: string;
  organizationRegion?: string;
  planPeriod?: {
    from: DualCalendarDateValue;
    to: DualCalendarDateValue;
  };
  id?: string;
  reference: string;
  status: ProcurementPlanStatus;
  rejectionReason?: string;
  rejectionScope?: "ALL" | "SPECIFIC";
  rejectedActivityIds?: string[];
  rejectedActivityRefs?: string[];
  version?: number;
  planActivities?: readonly import("./officerActivityDrafts").ProcurementActivitySummary[];
}

export interface OfficerProject {
  id?: string;
  activePlans: number;
  assignedOfficers: readonly string[];
  assignedOfficerIds?: readonly string[];
  assignedOfficerEmails?: readonly string[];
  assignmentStart?: {
    ethiopian: string;
    gregorian: string;
  };
  availableOrganizationRegions?: readonly string[];
  baseCurrency: "ETB" | "USD" | "UA";
  code: string;
  components?: readonly string[];
  countryOrganisation: string;
  executingAgency: string;
  financingNumbers?: readonly string[];
  fundingSource: string;
  fundingType: string;
  name: string;
  organizationRegion?: string;
  plans: readonly ProcurementPlanSummary[];
  projectPeriod?: {
    from?: string;
    to?: string;
  };
  sapIdentificationNumber?: string;
  shortName: string;
  status: ProjectStatus;
  subcomponents?: readonly string[];
  supportsGeneralProcurementNotice?: boolean;
}

// Projects are now loaded exclusively from the backend database via projectsApi.
export const officerProjects: readonly OfficerProject[] = [];
