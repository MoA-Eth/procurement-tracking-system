import { roadmapForMethod } from "./procurementActivityConfig";
import {
  gregorianToEthiopian,
  formatEthiopianDate,
} from "../utils/ethiopianCalendar";

export const OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY =
  "moa-pts:officer-activity-drafts:v2";

export type ProcurementActivityStatus =
  | "Completed"
  | "Delayed"
  | "In Progress"
  | "Not Started"
  | "Returned"
  | "Submitted to Director"
  | "Draft";

export interface ProcurementActivityAllocation {
  id: string;
  percent: string;
  selected: boolean;
  name?: string;
  code?: string;
  source?: string;
  loanNumber?: string;
  share?: number;
}

export interface ProcurementActivityLot {
  amount: string;
  description: string;
  id: number;
  number: string;
}

export interface ProcurementActivityRoadmapStage {
  id?: string;
  stageTypeId?: string;
  sequence?: number;
  allowNotApplicable: boolean;
  days: string;
  ethiopianDate: string;
  gregorianDate: string;
  name: string;
  notApplicable: boolean;
  remarks: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  currentTargetStartDate?: string;
  currentTargetEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  actualDate?: string;
  status?: string;
  revisions?: {
    revisionNo: number;
    revisedStartDate: string;
    revisedEndDate?: string;
    reason: string;
    createdAt?: string;
  }[];
}

export interface FundingContribution {
  id: string;
  fundingSource: string;
  amount: string;
  currency: string;
  exchangeRate?: string;
}

export interface ProcurementActivityFormValues {
  activityDescription: string;
  classificationCode: string;
  comments: string;
  contractType: string;
  currency: string;
  exchangeRate?: string;
  domesticPreference: string;
  estimatedAmount: string;
  evaluationOptionCode: string;
  fundingSource: string;
  highRiskCode: string;
  inProcess: boolean;
  invitationReference: string;
  latitude: string;
  location: string;
  longitude: string;
  lotRequired: boolean;
  marketApproach: string;
  method: string;
  oversightClassification: string;
  pricingBasis: string;
  procurementDocumentType: string;
  procurementProcess: string;
  qualificationApproach: string;
  requiresUnAgency: boolean;
  reviewType: string;
  scopeNotes: string;
  specificMethod: string;
  subcomponent: string;
  additionalReferences?: AdditionalReference[];
  stepReference?: string;
  hasMultiFunding?: boolean;
  fundingContributions?: FundingContribution[];
}

export interface AdditionalReference {
  id: string;
  type: string;
  value: string;
}

export interface ProcurementActivityDetails {
  additionalReferences?: AdditionalReference[];
  componentAllocations: ProcurementActivityAllocation[];
  financingAllocations: ProcurementActivityAllocation[];
  form: ProcurementActivityFormValues;
  fundingContributions?: FundingContribution[];
  lots: ProcurementActivityLot[];
  roadmap: ProcurementActivityRoadmapStage[];
}

export interface ProcurementActivitySummary {
  id?: string;
  activityId?: string;
  planId?: string;
  projectId?: string;
  category: string;
  currentStage: string;
  description: string;
  details?: ProcurementActivityDetails;
  estimatedAmount: number;
  method: string;
  reference: string;
  status: ProcurementActivityStatus;
  currency?: string;
  fundingSource?: string;
  fundingContributions?: FundingContribution[];
  hasMultiFunding?: boolean;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavedOfficerActivityRecord {
  activity: ProcurementActivitySummary;
  planReference: string;
  projectCode: string;
}

export function isTestOrJunkActivity(
  reference?: string,
  description?: string,
): boolean {
  const ref = (reference || "").trim().toLowerCase();
  const desc = (description || "").trim().toLowerCase();

  if (!ref && !desc) return false;
  if (
    ref.startsWith("act-test") ||
    ref.includes("act-test") ||
    ref.startsWith("test-") ||
    ref.includes("test verification")
  ) {
    return true;
  }
  if (
    desc.includes("vermy culture center") ||
    desc.includes("vermy") ||
    desc.includes("consultancy consultancy")
  ) {
    return true;
  }
  if (
    desc.includes("test verification activity") ||
    desc.includes("automated persistence verification")
  ) {
    return true;
  }
  if (desc === "test" || desc === "test test" || desc === "test test test") {
    return true;
  }
  if (/^test(\s+test)+$/i.test(desc)) {
    return true;
  }
  if (/^g{5,}$/i.test(desc) || /^m{5,}$/i.test(desc) || /^hbhb/i.test(desc)) {
    return true;
  }

  return false;
}

export function parseSavedActivityRecords(
  serializedRecords: string | null,
): SavedOfficerActivityRecord[] {
  if (!serializedRecords) return [];

  try {
    const parsed: unknown = JSON.parse(serializedRecords);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed
      .filter(isSavedOfficerActivityRecord)
      .filter((record) => !record.activity.reference.startsWith("MOA/"))
      .filter(
        (record) =>
          !isTestOrJunkActivity(
            record.activity.reference,
            record.activity.description,
          ),
      );

    if (typeof window !== "undefined" && valid.length < parsed.length) {
      try {
        window.localStorage.setItem(
          OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
          JSON.stringify(valid),
        );
      } catch {}
    }

    return valid;
  } catch {
    return [];
  }
}

export function purgeLocalTestAndJunkRecords(): void {
  if (typeof window === "undefined") return;
  try {
    const rawActs = window.localStorage.getItem(
      OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
    );
    if (rawActs) {
      parseSavedActivityRecords(rawActs);
    }
  } catch {}
}

if (typeof window !== "undefined") {
  setTimeout(() => {
    purgeLocalTestAndJunkRecords();
  }, 0);
}

export function addSavedActivityRecord(
  records: readonly SavedOfficerActivityRecord[],
  record: SavedOfficerActivityRecord,
) {
  const norm = (s?: string) => (s || "").trim().toLowerCase();
  const recProj = norm(record.projectCode);
  const recPlan = norm(record.planReference);
  const recRef = norm(record.activity.reference);
  const recId = norm(record.activity.id || (record.activity as any).activityId);

  const withoutExisting = records.filter((existing) => {
    const exProj = norm(existing.projectCode);
    const exPlan = norm(existing.planReference);
    const exRef = norm(existing.activity.reference);
    const exId = norm(
      existing.activity.id || (existing.activity as any).activityId,
    );

    const matchesProj = !exProj || !recProj || exProj === recProj;
    const matchesPlan = !exPlan || !recPlan || exPlan === recPlan;
    const matchesAct =
      (Boolean(recId) && Boolean(exId) && recId === exId) ||
      (Boolean(recRef) && Boolean(exRef) && recRef === exRef);

    if (matchesProj && matchesPlan && matchesAct) {
      return false;
    }
    if (matchesProj && matchesAct) {
      return false;
    }

    return true;
  });

  return [...withoutExisting, record];
}

function isSavedOfficerActivityRecord(
  value: unknown,
): value is SavedOfficerActivityRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<SavedOfficerActivityRecord>;
  return (
    typeof record.projectCode === "string" &&
    typeof record.planReference === "string" &&
    record.activity !== undefined &&
    typeof record.activity === "object" &&
    typeof (record.activity as any).description === "string"
  );
}

function isProcurementActivitySummary(
  value: unknown,
): value is ProcurementActivitySummary {
  if (!value || typeof value !== "object") return false;

  const activity = value as Partial<ProcurementActivitySummary>;
  return (
    typeof activity.reference === "string" &&
    typeof activity.description === "string"
  );
}

const activityFormStringFields: readonly (keyof ProcurementActivityFormValues)[] =
  [
    "activityDescription",
    "classificationCode",
    "comments",
    "contractType",
    "currency",
    "domesticPreference",
    "estimatedAmount",
    "evaluationOptionCode",
    "fundingSource",
    "highRiskCode",
    "invitationReference",
    "latitude",
    "location",
    "longitude",
    "marketApproach",
    "method",
    "oversightClassification",
    "pricingBasis",
    "procurementDocumentType",
    "procurementProcess",
    "qualificationApproach",
    "reviewType",
    "scopeNotes",
    "specificMethod",
    "subcomponent",
  ];

function isProcurementActivityDetails(
  value: unknown,
): value is ProcurementActivityDetails {
  if (!value || typeof value !== "object") return false;

  const details = value as Partial<ProcurementActivityDetails>;
  return (
    isProcurementActivityFormValues(details.form) &&
    Array.isArray(details.componentAllocations) &&
    details.componentAllocations.every(isActivityAllocation) &&
    Array.isArray(details.financingAllocations) &&
    details.financingAllocations.every(isActivityAllocation) &&
    (details.fundingContributions === undefined ||
      (Array.isArray(details.fundingContributions) &&
        details.fundingContributions.every(isFundingContribution))) &&
    Array.isArray(details.lots) &&
    details.lots.every(isActivityLot) &&
    Array.isArray(details.roadmap) &&
    details.roadmap.every(isActivityRoadmapStage)
  );
}

function isFundingContribution(value: unknown): value is FundingContribution {
  if (!value || typeof value !== "object") return false;
  const contrib = value as Partial<FundingContribution>;
  return (
    typeof contrib.id === "string" &&
    typeof contrib.fundingSource === "string" &&
    typeof contrib.amount === "string" &&
    typeof contrib.currency === "string" &&
    (contrib.exchangeRate === undefined ||
      typeof contrib.exchangeRate === "string")
  );
}

function isProcurementActivityFormValues(
  value: unknown,
): value is ProcurementActivityFormValues {
  if (!value || typeof value !== "object") return false;

  const form = value as Partial<ProcurementActivityFormValues>;
  return (
    activityFormStringFields.every(
      (field) => typeof form[field] === "string",
    ) &&
    (form.exchangeRate === undefined ||
      typeof form.exchangeRate === "string") &&
    (form.hasMultiFunding === undefined ||
      typeof form.hasMultiFunding === "boolean") &&
    (form.fundingContributions === undefined ||
      (Array.isArray(form.fundingContributions) &&
        form.fundingContributions.every(isFundingContribution))) &&
    typeof form.inProcess === "boolean" &&
    typeof form.lotRequired === "boolean" &&
    typeof form.requiresUnAgency === "boolean"
  );
}

function isActivityAllocation(
  value: unknown,
): value is ProcurementActivityAllocation {
  if (!value || typeof value !== "object") return false;
  const allocation = value as Partial<ProcurementActivityAllocation>;
  return (
    typeof allocation.id === "string" &&
    typeof allocation.percent === "string" &&
    typeof allocation.selected === "boolean"
  );
}

function isActivityLot(value: unknown): value is ProcurementActivityLot {
  if (!value || typeof value !== "object") return false;
  const lot = value as Partial<ProcurementActivityLot>;
  return (
    typeof lot.id === "number" &&
    typeof lot.number === "string" &&
    typeof lot.description === "string" &&
    typeof lot.amount === "string"
  );
}

function isActivityRoadmapStage(
  value: unknown,
): value is ProcurementActivityRoadmapStage {
  if (!value || typeof value !== "object") return false;
  const stage = value as Partial<ProcurementActivityRoadmapStage>;
  return typeof stage.name === "string";
}

function toEthiopianDateString(isoDate?: string | null): string {
  if (!isoDate) return "";
  const cleanIso = isoDate.slice(0, 10);
  const ethiopianObj = gregorianToEthiopian(cleanIso);
  return ethiopianObj ? formatEthiopianDate(ethiopianObj) : "";
}

export function mapBackendActivityToProcurementActivitySummary(
  ba: any,
): ProcurementActivitySummary {
  const methodCodeStr = (
    ba.procurementMethod?.code ||
    ba.procurementMethod?.label ||
    ""
  ).toLowerCase();
  const methodKey = methodCodeStr.includes("rfb_int")
    ? "rfb-international"
    : methodCodeStr.includes("rfb")
      ? "rfb-national"
      : methodCodeStr.includes("rfq")
        ? "rfq"
        : methodCodeStr.includes("dir")
          ? "direct-goods"
          : methodCodeStr.includes("qcbs")
            ? "qcbs"
            : methodCodeStr.includes("fbs")
              ? "fbs"
              : methodCodeStr.includes("lcs")
                ? "lcs"
                : methodCodeStr.includes("cqs")
                  ? "cqs"
                  : methodCodeStr.includes("indv")
                    ? "individual-consultant"
                    : "rfb-national";

  const templateRoadmap = roadmapForMethod(methodKey);
  const baseDate = new Date("2026-09-05");
  let activeOffset = 0;

  const hasExplicitDates = (ba.stages || []).some((st: any) =>
    Boolean(
      st.plannedStartDate || st.currentTargetStartDate || st.actualStartDate,
    ),
  );

  const roadmap: ProcurementActivityRoadmapStage[] =
    ba.stages && ba.stages.length > 0
      ? ba.stages.map((s: any, idx: number) => {
          const template =
            templateRoadmap[idx] ||
            templateRoadmap.find(
              (t) =>
                t.name.toLowerCase() ===
                (s.stageType?.label || s.name || "").toLowerCase(),
            );
          const isTemplateOptional = template
            ? Boolean(template.allowNotApplicable)
            : false;

          const isNA = Boolean(
            s.isNotApplicable ||
            s.notApplicable ||
            s.status === "NOT_APPLICABLE" ||
            s.status === "Not Applicable" ||
            (!hasExplicitDates && isTemplateOptional),
          );

          let rawPlannedDate = s.plannedStartDate
            ? new Date(s.plannedStartDate).toISOString().slice(0, 10)
            : "";
          let rawTargetDate = s.currentTargetStartDate
            ? new Date(s.currentTargetStartDate).toISOString().slice(0, 10)
            : rawPlannedDate;

          if (!isNA && !rawPlannedDate) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + activeOffset * 24);
            rawPlannedDate = d.toISOString().slice(0, 10);
            rawTargetDate = rawPlannedDate;
            activeOffset++;
          }

          const greg = isNA ? "" : rawTargetDate || rawPlannedDate;
          const eth = isNA ? "" : toEthiopianDateString(greg);

          return {
            id: s.id,
            stageTypeId: s.stageTypeId,
            sequence: s.sequence,
            allowNotApplicable: true,
            days: String(s.plannedDays || 14),
            ethiopianDate: eth,
            gregorianDate: greg,
            name:
              s.stageType?.label ||
              s.name ||
              template?.name ||
              `Stage ${s.sequence || idx + 1}`,
            notApplicable: isNA,
            remarks: s.remarks || "",
            status: isNA ? "Not Applicable" : s.status || "Not Started",
            actualStartDate: s.actualStartDate
              ? new Date(s.actualStartDate).toISOString().slice(0, 10)
              : undefined,
            actualEndDate: s.actualEndDate
              ? new Date(s.actualEndDate).toISOString().slice(0, 10)
              : undefined,
            currentTargetStartDate: s.currentTargetStartDate
              ? new Date(s.currentTargetStartDate).toISOString().slice(0, 10)
              : undefined,
            currentTargetEndDate: s.currentTargetEndDate
              ? new Date(s.currentTargetEndDate).toISOString().slice(0, 10)
              : undefined,
          };
        })
      : templateRoadmap.map((tpl, idx) => {
          const isNA = Boolean(tpl.allowNotApplicable);
          let greg = "";
          if (!isNA) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + activeOffset * 24);
            greg = d.toISOString().slice(0, 10);
            activeOffset++;
          }
          const eth = isNA ? "" : toEthiopianDateString(greg);
          return {
            name: tpl.name,
            allowNotApplicable: Boolean(tpl.allowNotApplicable),
            days: "14",
            ethiopianDate: eth,
            gregorianDate: greg,
            notApplicable: isNA,
            remarks: "",
            status: isNA ? "Not Applicable" : "Not Started",
          };
        });

  const activeStage =
    ba.stages?.find((s: any) => s.status === "IN_PROGRESS")?.stageType?.label ||
    ba.stages?.find((s: any) => s.status === "NOT_STARTED")?.stageType?.label ||
    ba.stages?.at(-1)?.stageType?.label ||
    "Draft";

  let status: ProcurementActivityStatus = "Not Started";
  if (ba.status === "COMPLETED") status = "Completed";
  else if (ba.status === "IN_PROGRESS") status = "In Progress";
  else if (ba.stages?.some((s: any) => s.status === "DELAYED"))
    status = "Delayed";
  else if (ba.status === "APPROVED") status = "Not Started";

  const rawCat = (
    ba.procurementCategory ||
    ba.category ||
    ba.plan?.procurementCategory ||
    ba.plan?.category ||
    ""
  ).toUpperCase();

  let categoryName: string = "Goods";
  if (rawCat.includes("WORK")) {
    categoryName = "Works";
  } else if (rawCat.includes("NON_CONSULT") || rawCat.includes("NON CONSULT")) {
    categoryName = "Non-Consulting Services";
  } else if (rawCat.includes("CONSULT")) {
    categoryName = "Consultancy Services";
  } else if (rawCat.includes("GOOD")) {
    categoryName = "Goods";
  } else {
    const desc = (ba.description || "").toLowerCase();
    const methodStr = (
      ba.procurementMethod?.label ||
      ba.procurementMethod?.code ||
      ""
    ).toLowerCase();
    if (
      desc.includes("pond") ||
      desc.includes("construction") ||
      desc.includes("civil work") ||
      methodStr.includes("work")
    ) {
      categoryName = "Works";
    } else if (
      desc.includes("consultant") ||
      desc.includes("supervision") ||
      methodStr.includes("qcbs") ||
      methodStr.includes("cqs")
    ) {
      categoryName = "Consultancy Services";
    } else {
      categoryName = "Goods";
    }
  }

  const createdByName =
    ba.creator?.displayName ||
    ba.creator?.name ||
    ba.createdByName ||
    undefined;
  const updatedByName =
    ba.updatedByUser?.displayName ||
    ba.updatedByUser?.name ||
    ba.updatedByName ||
    undefined;

  return {
    id: ba.id,
    activityId: ba.id,
    planId: ba.planId,
    category: categoryName,
    currentStage: activeStage,
    description: ba.description || "Procurement Activity",
    estimatedAmount: ba.estimatedBudget || 0,
    method: ba.procurementMethod?.label || ba.procurementMethod?.code || "RFB",
    reference: ba.reference || ba.id,
    status,
    currency: ba.currency || "ETB",
    fundingSource:
      ba.fundings?.[0]?.fundingSource || ba.fundingSource || undefined,
    createdById: ba.createdById || ba.creator?.id,
    createdByName,
    updatedById: ba.updatedById || ba.updatedByUser?.id,
    updatedByName,
    createdAt: ba.createdAt,
    updatedAt: ba.updatedAt,
    details: {
      additionalReferences:
        Array.isArray(ba.additionalReferences) &&
        ba.additionalReferences.length > 0
          ? ba.additionalReferences.map((r: any, idx: number) => ({
              id: String(r.id || idx + 1),
              type: r.type || "STEP Reference",
              value: r.value || "",
            }))
          : ba.bidReferenceNo
            ? [{ id: "1", type: "STEP Reference", value: ba.bidReferenceNo }]
            : [],
      componentAllocations: (ba.components || []).map((c: any) => ({
        id: c.component || "comp-1",
        name: c.component || "",
        code: c.subcomponent || "",
        share: Number(c.allocationPct || 100),
        percent: String(c.allocationPct || 100),
        selected: true,
      })),
      financingAllocations: (ba.fundings || []).map((f: any) => ({
        id: f.fundingSource || "fs-1",
        source: f.fundingSource || "",
        loanNumber: f.loanGrantNumber || "",
        share: Number(f.allocationPct || 100),
        percent: String(f.allocationPct || 100),
        selected: true,
      })),
      form: {
        activityDescription: ba.description || "",
        additionalReferences:
          Array.isArray(ba.additionalReferences) &&
          ba.additionalReferences.length > 0
            ? ba.additionalReferences.map((r: any, idx: number) => ({
                id: String(r.id || idx + 1),
                type: r.type || "STEP Reference",
                value: r.value || "",
              }))
            : ba.bidReferenceNo
              ? [{ id: "1", type: "STEP Reference", value: ba.bidReferenceNo }]
              : [],
        stepReference: ba.bidReferenceNo || "",
        classificationCode: ba.procurementClassificationCode || "",
        comments: ba.remarks || "",
        contractType: ba.contractType || "Lump Sum",
        currency: ba.currency || "ETB",
        domesticPreference:
          ba.domesticPreference === "Yes" ||
          ba.domesticPreference === true ||
          ba.domesticPreference === "true"
            ? "Yes"
            : "No",
        estimatedAmount: String(ba.estimatedBudget || 0),
        evaluationOptionCode:
          (Array.isArray(ba.evaluationOptions) && ba.evaluationOptions[0]) ||
          "",
        fundingSource:
          ba.fundings?.[0]?.fundingSource || ba.fundingSource || "",
        highRiskCode: ba.highSeaShRisk ? "High" : "",
        inProcess: ba.status === "IN_PROGRESS",
        invitationReference: ba.bidReferenceNo || "",
        latitude: ba.latitude ? String(ba.latitude) : "",
        location: ba.location || "",
        longitude: ba.longitude ? String(ba.longitude) : "",
        lotRequired: Boolean(ba.lotRequired),
        marketApproach: ba.marketApproach || "Open - National",
        method: ba.procurementMethod?.code || "",
        oversightClassification: ba.oversightClassification || "",
        pricingBasis: ba.pricingBasis || "",
        procurementDocumentType: ba.procurementDocumentType || "",
        procurementProcess: ba.procurementProcess || "",
        qualificationApproach: ba.qualificationApproach || "",
        requiresUnAgency: Boolean(ba.requiresUnAgencyContracting),
        reviewType: ba.reviewType || "Post Review",
        scopeNotes: ba.scopeNotes || "",
        specificMethod: ba.specificMethod || "",
        subcomponent: ba.components?.[0]?.subcomponent || "",
      },
      lots: (ba.lots || []).map((l: any, idx: number) => ({
        id: l.id || idx + 1,
        number: String(l.lotNumber || idx + 1),
        description: l.description || "",
        amount: String(l.estimatedAmount || ""),
      })),
      roadmap,
    },
  };
}
