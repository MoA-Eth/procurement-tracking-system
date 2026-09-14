import type { PlanCategory } from "../plans/plansData";

export type ProcurementMethod =
  | "RFB - International"
  | "RFB - National"
  | "RFQ / Shopping"
  | "Direct Procurement"
  | "UN Agency / UNOPS Direct"
  | "QCBS"
  | "FBS"
  | "LCS"
  | "CQS"
  | "INDV"
  | "Restricted / Limited";

export type MarketApproach =
  | "Open - International"
  | "Open - National"
  | "Limited"
  | "Direct"
  | "Shopping";

export type QualificationApproach =
  "Prequalification" | "Post-qualification" | "Not Applicable";

export type ReviewType = "Prior" | "Post" | "Audit";

export type ContractType = "Lump Sum" | "Time Based";

export type StageStatus =
  "Not Started" | "In Progress" | "Completed" | "Not Applicable";

export interface LotItem {
  id: string;
  lotNumber: string;
  lotDescription: string;
  estimatedAmount: number;
}

export interface ActivityStage {
  id: string;
  stageName: string;
  originalPlannedDate?: string;
  plannedDurationDays?: number;
  revisionNo?: string;
  revisedTargetDate?: string;
  actualDate?: string;
  stageStatus: StageStatus;
  delayDays?: number;
  replanningReason?: string;
  remarks?: string;
  notApplicable?: boolean;
}

export interface ProcurementActivity {
  id: string;
  planId: string;
  planName: string;
  projectCode: string;

  // 4.1 Step 1 - Key Details
  category: PlanCategory; // Inherited from Plan
  method: ProcurementMethod;
  specificMethod?: string;
  marketApproach: MarketApproach;
  qualificationApproach: QualificationApproach;
  domesticPreference: boolean;
  reviewType: ReviewType;
  procurementProcess?: string;
  evaluationOptions?: string;
  highRiskSeaSh?: boolean;
  procurementDocumentType?: string;
  contractType?: ContractType; // Consultancy only
  requiresUnAgency: boolean;
  isInProcess: boolean;

  // 4.2 Step 2 - Related Information
  activityRefNo: string;
  description: string;
  estimatedAmount: number;
  currency: "ETB" | "USD" | "UA";
  fundingSource: string;
  loanGrantNo?: string;
  fundingAllocationPercent: number;
  component?: string;
  subcomponent?: string;
  componentAllocationPercent: number;
  isLotRequired: boolean;
  lots?: LotItem[];
  invitationRefNo?: string;
  pricingBasis?: "Lump Sum" | "Bill of Quantities (BOQ)";
  scopeNotes?: string;
  comments?: string;
  remarks?: string;

  // 4.3 Step 3 - Additional Details
  classificationCode?: string;
  classificationDescription?: string;
  locationRegion?: string;
  latitude?: number;
  longitude?: number;
  additionalRemarks?: string;

  // 4.4 Step 4 - Roadmap
  roadmap: ActivityStage[];

  // Metadata
  status: "Draft" | "Submitted to Director" | "Approved" | "In Execution";
  createdAt: string;
}

import { roadmapForMethod } from "../projects/data/procurementActivityConfig";

function methodToConfigKey(method: ProcurementMethod): string {
  if (method === "RFB - International") return "rfb-international";
  if (method === "RFB - National") return "rfb-national";
  if (method === "RFQ / Shopping") return "rfq";
  if (method === "Direct Procurement") return "direct-goods";
  if (method === "UN Agency / UNOPS Direct") return "un-agency";
  if (method === "QCBS") return "qcbs";
  if (method === "FBS") return "fbs";
  if (method === "LCS") return "lcs";
  if (method === "CQS") return "cqs";
  if (method === "INDV") return "individual-consultant";
  return "rfb-national";
}

// Method Roadmap Generators (6.1 - 6.9)
export function generateRoadmapForMethod(
  category: PlanCategory,
  method: ProcurementMethod,
  _fundingSource: string = "World Bank",
): ActivityStage[] {
  const methodKey = methodToConfigKey(method);
  const templateStages = roadmapForMethod(methodKey);

  const baseDate = new Date("2026-09-05");
  let activeIndex = 0;

  return templateStages.map((stageTpl, idx) => {
    const isNA = Boolean(stageTpl.allowNotApplicable);
    let dateStr = "Not applicable";

    if (!isNA) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + activeIndex * 24);
      dateStr = d.toISOString().slice(0, 10);
      activeIndex++;
    }

    return {
      id: `stage-${idx + 1}`,
      stageName: stageTpl.name,
      originalPlannedDate: isNA ? "Not applicable" : dateStr,
      revisedTargetDate: isNA ? "Not applicable" : dateStr,
      stageStatus: isNA ? "Not Applicable" : "Not Started",
      notApplicable: isNA,
    };
  });
}

// Initial Procurement Activities
export const INITIAL_ACTIVITIES: ProcurementActivity[] = [];
