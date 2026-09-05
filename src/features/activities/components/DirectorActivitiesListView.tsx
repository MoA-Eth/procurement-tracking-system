"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Home,
  FileText,
  Clock,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  ShieldCheck,
  RotateCcw,
  Send,
  Loader2,
  History,
  Building2,
  MessageSquare,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ProcurementPlan } from "../../plans/plansData";
import type { ProjectItem } from "@/features/projects/management/projectsData";
import { fetchPlanComments, type BackendComment } from "@/lib/plansApi";
import {
  INITIAL_ACTIVITIES,
  generateRoadmapForMethod,
  type ProcurementActivity,
  type ProcurementMethod,
  type MarketApproach,
  type ReviewType,
  type StageStatus,
  type ActivityStage,
} from "../activitiesData";
import { fetchActivities, type BackendActivity } from "@/lib/activitiesApi";
import {
  parseSavedActivityRecords,
  OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
} from "@/features/projects/data/officerActivityDrafts";
import type { ProcurementPlanSummary } from "@/features/projects/data/officerProjects";
import { VersionHistoryModal } from "@/features/plans/components/VersionHistoryModal";
import { getCurrentPlanVersionNumber } from "@/features/plans/data/planRevisions";

function mapBackendActivityToProcurementActivity(
  bAct: BackendActivity | any,
  plan: ProcurementPlan,
): ProcurementActivity {
  const methodLabel =
    bAct.procurementMethod?.label || bAct.method || "RFB - National";
  const mappedMethod: ProcurementMethod = (
    methodLabel.includes("RFB - International")
      ? "RFB - International"
      : methodLabel.includes("RFB - National") || methodLabel.includes("NCB")
        ? "RFB - National"
        : methodLabel.includes("RFQ") || methodLabel.includes("Shopping")
          ? "RFQ / Shopping"
          : methodLabel.includes("Direct")
            ? "Direct Procurement"
            : methodLabel.includes("QCBS")
              ? "QCBS"
              : methodLabel.includes("FBS")
                ? "FBS"
                : methodLabel.includes("LCS")
                  ? "LCS"
                  : methodLabel.includes("CQS")
                    ? "CQS"
                    : methodLabel.includes("INDV")
                      ? "INDV"
                      : "RFB - National"
  ) as ProcurementMethod;

  const defaultRoadmap = generateRoadmapForMethod(
    plan.category,
    mappedMethod,
    bAct.fundings?.[0]?.fundingSource || "African Development Bank (AfDB)",
  );

  const roadmap: ActivityStage[] =
    bAct.details?.roadmap && bAct.details.roadmap.length > 0
      ? bAct.details.roadmap.map((st: any, idx: number) => {
          const isNA = Boolean(
            st.notApplicable ||
            st.isNA ||
            st.gregorianDate === "Not applicable" ||
            st.originalPlannedDate === "Not applicable" ||
            st.status === "Not Applicable",
          );
          return {
            id: `stage-${idx + 1}`,
            stageName: st.name || st.stageName,
            originalPlannedDate: isNA
              ? "Not applicable"
              : st.gregorianDate || st.originalPlannedDate || "",
            revisedTargetDate: isNA
              ? "Not applicable"
              : st.gregorianDate ||
                st.revisedTargetDate ||
                st.originalPlannedDate ||
                "",
            actualDate: st.actualDate || "",
            stageStatus: (isNA
              ? "Not Applicable"
              : st.status === "Completed" || st.stageStatus === "Completed"
                ? "Completed"
                : st.status === "In Progress" ||
                    st.stageStatus === "In Progress"
                  ? "In Progress"
                  : "Not Started") as StageStatus,
            remarks: st.remarks,
            notApplicable: isNA,
          };
        })
      : bAct.stages && bAct.stages.length > 0
        ? bAct.stages.map((st: any, idx: number) => {
            const fallback = defaultRoadmap[idx] || defaultRoadmap[0];
            const isNA = Boolean(
              st.notApplicable ||
              st.isNotApplicable ||
              st.status === "NOT_APPLICABLE" ||
              st.status === "Not Applicable" ||
              fallback?.notApplicable,
            );
            return {
              id: st.id || `stage-${idx + 1}`,
              stageName:
                st.stageType?.label ||
                st.name ||
                fallback?.stageName ||
                `Stage ${st.sequence || idx + 1}`,
              originalPlannedDate: isNA
                ? "Not applicable"
                : st.plannedStartDate ||
                  st.originalPlannedDate ||
                  fallback?.originalPlannedDate,
              revisedTargetDate: isNA
                ? "Not applicable"
                : st.currentTargetStartDate ||
                  st.plannedStartDate ||
                  st.revisedTargetDate ||
                  fallback?.revisedTargetDate,
              actualDate: st.actualStartDate || st.actualDate,
              stageStatus: (isNA
                ? "Not Applicable"
                : st.status === "COMPLETED" || st.stageStatus === "Completed"
                  ? "Completed"
                  : st.status === "IN_PROGRESS" ||
                      st.stageStatus === "In Progress"
                    ? "In Progress"
                    : "Not Started") as StageStatus,
              remarks: st.remarks,
              notApplicable: isNA,
            };
          })
        : bAct.roadmap && bAct.roadmap.length > 0
          ? bAct.roadmap.map((st: any, idx: number) => {
              const isNA = Boolean(
                st.notApplicable ||
                st.isNA ||
                st.gregorianDate === "Not applicable" ||
                st.originalPlannedDate === "Not applicable" ||
                st.status === "Not Applicable" ||
                st.stageStatus === "Not Applicable",
              );
              return {
                id: st.id || `stage-${idx + 1}`,
                stageName: st.name || st.stageName,
                originalPlannedDate: isNA
                  ? "Not applicable"
                  : st.gregorianDate || st.originalPlannedDate || "",
                revisedTargetDate: isNA
                  ? "Not applicable"
                  : st.gregorianDate ||
                    st.revisedTargetDate ||
                    st.originalPlannedDate ||
                    "",
                actualDate: st.actualDate || "",
                stageStatus: (isNA
                  ? "Not Applicable"
                  : st.status === "Completed" || st.stageStatus === "Completed"
                    ? "Completed"
                    : st.status === "In Progress" ||
                        st.stageStatus === "In Progress"
                      ? "In Progress"
                      : "Not Started") as StageStatus,
                remarks: st.remarks,
                notApplicable: isNA,
              };
            })
          : defaultRoadmap;

  return {
    id:
      bAct.id || `act-${bAct.reference || bAct.activityRefNo || Math.random()}`,
    planId: plan.id,
    planName: plan.planName,
    projectCode: plan.projectCode,
    category: plan.category,
    method: mappedMethod,
    specificMethod: bAct.procurementMethod?.label || bAct.specificMethod,
    marketApproach: (bAct.marketApproach === "OPEN_INTERNATIONAL"
      ? "Open - International"
      : bAct.marketApproach === "OPEN_NATIONAL"
        ? "Open - National"
        : bAct.marketApproach === "LIMITED"
          ? "Limited"
          : bAct.marketApproach === "DIRECT"
            ? "Direct"
            : "Open - National") as MarketApproach,
    qualificationApproach: "Post-qualification",
    domesticPreference: Boolean(bAct.domesticPreference),
    reviewType: (bAct.reviewType === "POST" ? "Post" : "Prior") as ReviewType,
    requiresUnAgency: Boolean(bAct.requiresUnAgency),
    isInProcess:
      bAct.status === "IN_PROGRESS" || bAct.status === "IN_EXECUTION",
    activityRefNo: bAct.reference || bAct.activityRefNo || "ET-MoA-REF",
    description: bAct.description || "Procurement activity package",
    estimatedAmount: bAct.estimatedBudget || bAct.estimatedAmount || 0,
    currency: (bAct.currency as any) || "ETB",
    fundingSource:
      bAct.fundings?.[0]?.fundingSource ||
      bAct.fundingSource ||
      bAct.details?.form?.fundingSource ||
      "African Development Bank (AfDB)",
    loanGrantNo:
      bAct.fundings?.[0]?.loanGrantNumber ||
      bAct.loanGrantNo ||
      bAct.details?.form?.loanGrantNumber,
    fundingAllocationPercent:
      bAct.fundings?.[0]?.allocationPct || bAct.fundingAllocationPercent || 100,
    component:
      bAct.components?.[0]?.component ||
      bAct.component ||
      bAct.details?.componentAllocations?.[0]?.id ||
      "Component 1",
    subcomponent: bAct.subcomponent || "1.1 Subcomponent",
    componentAllocationPercent: bAct.components?.[0]?.allocationPct || 100,
    isLotRequired: Boolean(bAct.lotRequired || bAct.isLotRequired),
    lots: bAct.lots,
    classificationCode:
      bAct.classificationCode ||
      bAct.details?.form?.classificationCode ||
      "42100000",
    classificationDescription:
      bAct.classificationDescription || "Procurement Package",
    locationRegion: bAct.locationRegion || plan.organizationRegion,
    roadmap,
    status: (bAct.status === "APPROVED" || bAct.status === "Approved"
      ? "Approved"
      : bAct.status === "IN_PROGRESS" || bAct.status === "In Execution"
        ? "In Execution"
        : "Submitted to Director") as any,
    createdAt: bAct.createdAt || new Date().toISOString(),
  };
}

interface DirectorActivitiesListViewProps {
  plan: ProcurementPlan;
  project: ProjectItem;
  parentSection?: "projects" | "plan-for-review";
  userRole?: string;
  onBackClick: () => void;
  onApprovePlan?: (plan: ProcurementPlan) => void;
  onReturnPlan?: (plan: ProcurementPlan, remarks: string) => void;
  onCommitteeVote?: (
    plan: ProcurementPlan,
    decision: "APPROVE" | "REJECT",
    remarks?: string,
  ) => void;
  onManagementDecision?: (
    plan: ProcurementPlan,
    decision: "APPROVE" | "REJECT",
    comment?: string,
  ) => void;
  onAddActivityComment?: (activityId: string, comment: string) => Promise<void>;
}

export function DirectorActivitiesListView({
  plan,
  project,
  parentSection = "plan-for-review",
  userRole,
  onBackClick,
  onApprovePlan,
  onReturnPlan,
  onCommitteeVote,
  onManagementDecision,
  onAddActivityComment,
}: DirectorActivitiesListViewProps) {
  const isCommittee = userRole === "ENDORSING_COMMITTEE";
  const isManagement = userRole === "MANAGEMENT";
  const isEditable = parentSection === "plan-for-review" && !isCommittee && !isManagement;
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activityComments, setActivityComments] = useState<BackendComment[]>([]);
  const [newActivityCommentText, setNewActivityCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (plan?.id) {
      fetchPlanComments(plan.id)
        .then((cmts) => setActivityComments(cmts || []))
        .catch(() => {});
    }
  }, [plan?.id]);
  const planVersion = getCurrentPlanVersionNumber(
    plan.id || (plan as any).reference || "",
  );

  const [activities, setActivities] = useState<ProcurementActivity[]>(() => {
    if (plan.activities && plan.activities.length > 0) {
      return plan.activities.map((a) =>
        mapBackendActivityToProcurementActivity(a, plan),
      );
    }
    return INITIAL_ACTIVITIES.filter(
      (a) =>
        a.planId === plan.id ||
        a.planName === plan.planName ||
        a.projectCode === plan.projectCode,
    );
  });

  const [loading, setLoading] = useState(false);

  const loadActivitiesData = useCallback(async () => {
    setLoading(true);
    try {
      let loadedActs: ProcurementActivity[] = [];

      // Collect target identifiers for matching
      const targetPlanIds = new Set<string>();
      if (plan.id) targetPlanIds.add(plan.id.toLowerCase().trim());
      if ((plan as any).reference)
        targetPlanIds.add((plan as any).reference.toLowerCase().trim());
      if (plan.planName) targetPlanIds.add(plan.planName.toLowerCase().trim());

      const targetProjectCodes = new Set<string>();
      if (plan.projectCode)
        targetProjectCodes.add(plan.projectCode.toLowerCase().trim());
      if (project?.code)
        targetProjectCodes.add(project.code.toLowerCase().trim());
      if (project?.id) targetProjectCodes.add(project.id.toLowerCase().trim());
      if ((project as any)?.shortName)
        targetProjectCodes.add((project as any).shortName.toLowerCase().trim());
      if (plan.projectId)
        targetProjectCodes.add(plan.projectId.toLowerCase().trim());

      // 0. Directly passed plan.activities
      if (plan.activities && plan.activities.length > 0) {
        for (const act of plan.activities) {
          const mapped = mapBackendActivityToProcurementActivity(act, plan);
          if (
            !loadedActs.some(
              (x) =>
                x.id === mapped.id ||
                x.activityRefNo?.toLowerCase() ===
                  mapped.activityRefNo?.toLowerCase(),
            )
          ) {
            loadedActs.push(mapped);
          }
        }
      }

      // 1. Saved Plan Drafts in localStorage (moa-pts:officer-plan-drafts:v2)
      try {
        if (typeof window !== "undefined") {
          const rawPlanDrafts = window.localStorage.getItem(
            "moa-pts:officer-plan-drafts:v2",
          );
          if (rawPlanDrafts) {
            const parsedPlans = JSON.parse(rawPlanDrafts);
            if (Array.isArray(parsedPlans)) {
              for (const item of parsedPlans) {
                const p = item.plan;
                if (!p) continue;
                const pRef = (p.reference || "").toLowerCase().trim();
                const pName = (p.name || "").toLowerCase().trim();
                const pId = (p.id || "").toLowerCase().trim();
                const pProj = (item.projectCode || p.projectCode || "")
                  .toLowerCase()
                  .trim();

                const isPlanMatch =
                  (pRef &&
                    Array.from(targetPlanIds).some(
                      (t) => t === pRef || t.includes(pRef) || pRef.includes(t),
                    )) ||
                  (pName &&
                    Array.from(targetPlanIds).some(
                      (t) =>
                        t === pName || t.includes(pName) || pName.includes(t),
                    )) ||
                  (pId &&
                    Array.from(targetPlanIds).some(
                      (t) => t === pId || t.includes(pId) || pId.includes(t),
                    ));

                const isProjMatch =
                  targetProjectCodes.size === 0 ||
                  Array.from(targetProjectCodes).some(
                    (tc) =>
                      tc === pProj || tc.includes(pProj) || pProj.includes(tc),
                  );

                if (isPlanMatch || isProjMatch) {
                  if (pRef) targetPlanIds.add(pRef);
                  if (pName) targetPlanIds.add(pName);
                  if (pProj) targetProjectCodes.add(pProj);

                  if (
                    p.planActivities &&
                    Array.isArray(p.planActivities) &&
                    p.planActivities.length > 0
                  ) {
                    for (const act of p.planActivities) {
                      const mapped = mapBackendActivityToProcurementActivity(
                        act,
                        plan,
                      );
                      if (
                        !loadedActs.some(
                          (x) =>
                            x.id === mapped.id ||
                            x.activityRefNo?.toLowerCase() ===
                              mapped.activityRefNo?.toLowerCase(),
                        )
                      ) {
                        loadedActs.push(mapped);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (planStorageErr) {
        console.warn("localStorage plan drafts note:", planStorageErr);
      }

      // 2. Saved Activity Drafts in localStorage (OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY)
      try {
        if (typeof window !== "undefined") {
          const rawDrafts = window.localStorage.getItem(
            OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
          );
          if (rawDrafts) {
            const parsed = parseSavedActivityRecords(rawDrafts);
            for (const draft of parsed) {
              const draftPlanRef = (draft.planReference || "")
                .toLowerCase()
                .trim();
              const draftProjCode = (draft.projectCode || "")
                .toLowerCase()
                .trim();

              const matches =
                (draftPlanRef &&
                  Array.from(targetPlanIds).some(
                    (t) =>
                      t === draftPlanRef ||
                      t.includes(draftPlanRef) ||
                      draftPlanRef.includes(t),
                  )) ||
                (draftProjCode &&
                  Array.from(targetProjectCodes).some(
                    (tc) =>
                      tc === draftProjCode ||
                      tc.includes(draftProjCode) ||
                      draftProjCode.includes(tc),
                  ));

              if (matches) {
                const mapped = mapBackendActivityToProcurementActivity(
                  draft.activity,
                  plan,
                );
                if (
                  !loadedActs.some(
                    (x) =>
                      x.id === mapped.id ||
                      x.activityRefNo?.toLowerCase() ===
                        mapped.activityRefNo?.toLowerCase(),
                  )
                ) {
                  loadedActs.push(mapped);
                }
              }
            }
          }
        }
      } catch (storageErr) {
        console.warn("localStorage activity drafts note:", storageErr);
      }

      // 3. Live backend activities
      try {
        const cleanPlanId = plan.id.startsWith("officer-")
          ? plan.id.replace(`officer-${plan.projectCode}-`, "")
          : plan.id;

        const [planBackendActs, allBackendActs] = await Promise.all([
          fetchActivities(cleanPlanId).catch(() => []),
          fetchActivities().catch(() => []),
        ]);

        const combinedBackend = [...planBackendActs];
        for (const ba of allBackendActs) {
          const baPlanId = (ba.planId || ba.plan?.id || "")
            .toLowerCase()
            .trim();
          const baPlanTitle = (
            ba.plan?.title ||
            (ba as any).planReference ||
            ""
          )
            .toLowerCase()
            .trim();
          const baProjCode = (ba.plan?.project?.code || "")
            .toLowerCase()
            .trim();

          const matchesPlan =
            (baPlanId &&
              Array.from(targetPlanIds).some(
                (t) =>
                  t === baPlanId ||
                  t.includes(baPlanId) ||
                  baPlanId.includes(t),
              )) ||
            (baPlanTitle &&
              Array.from(targetPlanIds).some(
                (t) =>
                  t === baPlanTitle ||
                  t.includes(baPlanTitle) ||
                  baPlanTitle.includes(t),
              )) ||
            (baProjCode &&
              Array.from(targetProjectCodes).some(
                (tc) =>
                  tc === baProjCode ||
                  tc.includes(baProjCode) ||
                  baProjCode.includes(tc),
              ));

          if (matchesPlan && !combinedBackend.some((x) => x.id === ba.id)) {
            combinedBackend.push(ba);
          }
        }

        if (combinedBackend.length > 0) {
          for (const ba of combinedBackend) {
            const mapped = mapBackendActivityToProcurementActivity(ba, plan);
            if (
              !loadedActs.some(
                (x) =>
                  x.id === mapped.id ||
                  x.activityRefNo?.toLowerCase() ===
                    mapped.activityRefNo?.toLowerCase(),
              )
            ) {
              loadedActs.push(mapped);
            }
          }
        }
      } catch (backendErr) {
        console.warn("Backend fetchActivities note:", backendErr);
      }

      // 4. Fallback to INITIAL_ACTIVITIES if still empty
      if (loadedActs.length === 0) {
        const fallback = INITIAL_ACTIVITIES.filter(
          (a) =>
            Array.from(targetPlanIds).some(
              (t) =>
                t === a.planId?.toLowerCase() ||
                t === a.planName?.toLowerCase(),
            ) ||
            Array.from(targetProjectCodes).some(
              (tc) => tc === a.projectCode?.toLowerCase(),
            ),
        );
        if (fallback.length > 0) {
          loadedActs = fallback;
        }
      }

      setActivities(loadedActs);
    } catch (err) {
      console.warn("loadActivitiesData error:", err);
    } finally {
      setLoading(false);
    }
  }, [plan, project]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadActivitiesData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadActivitiesData]);

  const [currentPlanName, setCurrentPlanName] = useState(plan.planName);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [reviewFilter, setReviewFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selected Activity for Detailed 4-Step Stepper View
  const [selectedActivity, setSelectedActivity] =
    useState<ProcurementActivity | null>(null);
  const [directorReturnRemarks, setDirectorReturnRemarks] = useState("");

  // Active Detail Tab state (1: Key Details, 2: Related Info, 3: Additional Details, 4: Roadmap)
  const [activeDetailTab, setActiveDetailTab] = useState<1 | 2 | 3 | 4>(1);

  const handleUpdateActivityField = <K extends keyof ProcurementActivity>(
    actId: string,
    field: K,
    value: ProcurementActivity[K],
  ) => {
    if (!isEditable) return;
    setActivities((prev) =>
      prev.map((a) => (a.id === actId ? { ...a, [field]: value } : a)),
    );
    if (selectedActivity && selectedActivity.id === actId) {
      setSelectedActivity((prev) =>
        prev ? { ...prev, [field]: value } : null,
      );
    }
  };

  const handleUpdateRoadmapDate = (
    actId: string,
    stageId: string,
    newDate: string,
  ) => {
    if (!isEditable) return;
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== actId) return a;
        const newRoadmap = a.roadmap.map((s) =>
          s.id === stageId
            ? {
                ...s,
                revisedTargetDate: newDate,
                originalPlannedDate: s.originalPlannedDate || newDate,
              }
            : s,
        );
        return { ...a, roadmap: newRoadmap };
      }),
    );
    if (selectedActivity && selectedActivity.id === actId) {
      setSelectedActivity((prev) => {
        if (!prev) return null;
        const newRoadmap = prev.roadmap.map((s) =>
          s.id === stageId
            ? {
                ...s,
                revisedTargetDate: newDate,
                originalPlannedDate: s.originalPlannedDate || newDate,
              }
            : s,
        );
        return { ...prev, roadmap: newRoadmap };
      });
    }
  };

  const getActivityStatus = (
    act: ProcurementActivity,
  ): "Not Started" | "In Progress" | "Completed" | "Delayed" => {
    const completedStages = act.roadmap.filter(
      (s) => s.stageStatus === "Completed",
    ).length;
    const totalStages = act.roadmap.length;
    const hasDelay = act.roadmap.some(
      (s) =>
        (s.delayDays && s.delayDays > 0) ||
        s.remarks?.toLowerCase().includes("delay"),
    );

    if (hasDelay) return "Delayed";
    if (completedStages === totalStages && totalStages > 0) return "Completed";
    if (
      completedStages === 0 &&
      act.roadmap.every(
        (s) => s.stageStatus === "Not Started" || !s.stageStatus,
      )
    )
      return "Not Started";
    return "In Progress";
  };

  const filteredActivities = activities.filter((act) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      act.activityRefNo.toLowerCase().includes(q) ||
      act.description.toLowerCase().includes(q);
    const matchesMethod = methodFilter === "ALL" || act.method === methodFilter;
    const matchesReview =
      reviewFilter === "ALL" || act.reviewType === reviewFilter;
    const matchesStatus =
      statusFilter === "ALL" || getActivityStatus(act) === statusFilter;
    return matchesSearch && matchesMethod && matchesReview && matchesStatus;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-8">
      {/* 1. CLEAN BREADCRUMB NAVIGATION */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs"
      >
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 shrink-0"
        >
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
        <button
          onClick={onBackClick}
          className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
        >
          {parentSection === "plan-for-review" ? "Plan for Review" : "Projects"}
        </button>
        <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
        <button
          onClick={() => setSelectedActivity(null)}
          className={`transition-colors cursor-pointer truncate max-w-[260px] ${
            selectedActivity
              ? "text-slate-500 hover:text-slate-900"
              : "font-bold text-[#0A3C2F]"
          }`}
        >
          {currentPlanName}
        </button>
        {selectedActivity && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="font-bold text-[#0A3C2F] font-mono truncate max-w-[180px]">
              {selectedActivity.activityRefNo}
            </span>
          </>
        )}
      </nav>

      {/* 2. COMPREHENSIVE 4-STEP ACTIVITY INSPECTION & EDIT VIEW */}
      {selectedActivity ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header Card */}
          <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedActivity(null)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0A3C2F] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Activities
                    Table
                  </button>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-xs font-extrabold text-[#0A3C2F] bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {selectedActivity.activityRefNo}
                  </span>
                </div>

                <h1 className="text-base sm:text-lg font-extrabold text-slate-950 tracking-tight leading-snug">
                  {selectedActivity.description}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span>
                    Category:{" "}
                    <strong className="text-slate-900">
                      {selectedActivity.category}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Method:{" "}
                    <strong className="text-slate-900">
                      {selectedActivity.method}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Estimated Amount:{" "}
                    <strong className="text-slate-900 font-mono">
                      {selectedActivity.currency}{" "}
                      {selectedActivity.estimatedAmount.toLocaleString()}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Review Type:{" "}
                    <strong className="text-slate-900">
                      {selectedActivity.reviewType}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* CONNECTED HORIZONTAL STEPPER WIZARD */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <div className="relative flex items-center justify-between max-w-2xl mx-auto px-4">
              {/* Connecting Line */}
              <div className="absolute top-4 left-10 right-10 h-0.5 bg-slate-200 -z-0" />
              <div
                className="absolute top-4 left-10 h-0.5 bg-[#0A3C2F] transition-all duration-300 -z-0"
                style={{
                  width:
                    activeDetailTab === 1
                      ? "0%"
                      : activeDetailTab === 2
                        ? "33.33%"
                        : activeDetailTab === 3
                          ? "66.66%"
                          : "100%",
                }}
              />

              {[
                { step: 1, label: "1. Key Details" },
                { step: 2, label: "2. Related Information" },
                { step: 3, label: "3. Additional Details" },
                { step: 4, label: "4. Roadmap" },
              ].map((tab) => {
                const isActive = activeDetailTab === tab.step;
                const isCompleted = activeDetailTab > tab.step;

                return (
                  <button
                    key={tab.step}
                    type="button"
                    onClick={() =>
                      setActiveDetailTab(tab.step as 1 | 2 | 3 | 4)
                    }
                    className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    {/* Stepper Circle */}
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold transition-all ${
                        isActive
                          ? "border-2 border-[#0A3C2F] bg-white text-[#0A3C2F] ring-4 ring-[#0A3C2F]/10 shadow-xs"
                          : isCompleted
                            ? "bg-[#0A3C2F] text-white"
                            : "border border-slate-300 bg-[#F0F4F8] text-slate-400"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-[#A3E635]" />
                      ) : (
                        tab.step
                      )}
                    </div>

                    {/* Stepper Title Label */}
                    <span
                      className={`mt-2 text-[11px] whitespace-nowrap transition-colors ${
                        isActive
                          ? "font-extrabold text-[#0A3C2F]"
                          : isCompleted
                            ? "font-bold text-slate-800"
                            : "font-medium text-slate-400"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 1: KEY DETAILS */}
          {activeDetailTab === 1 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-2xs p-6 sm:p-7 space-y-1">
              {/* Header */}
              <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
                <FileText className="h-4 w-4 text-[#0B5C43]" />
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  4.1 Step 1 — Key Details & Procurement Framework
                </h2>
              </div>

              {/* Rows matching inspiration horizontal key-value rows */}
              <div className="divide-y divide-slate-100 text-xs">
                {/* Row 1: Category */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Procurement Category
                  </span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedActivity.category}</span>
                    <span className="text-slate-400 font-medium">
                      (Inherited from Plan)
                    </span>
                  </span>
                </div>

                {/* Row 2: Method */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Procurement Method
                  </span>
                  <span className="font-extrabold text-[#0B5C43]">
                    {selectedActivity.method} (National Competitive Bidding
                    (NCB))
                  </span>
                </div>

                {/* Row 3: Market Approach */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Market Approach
                  </span>
                  <span className="font-extrabold text-slate-900">
                    Open - {selectedActivity.marketApproach}
                  </span>
                </div>

                {/* Row 4: Qualification Approach */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Qualification Approach
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedActivity.qualificationApproach}
                  </span>
                </div>

                {/* Row 5: Review Type / Oversight */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Review Type / Oversight
                  </span>
                  <span className="font-extrabold text-[#C25E00]">
                    {selectedActivity.reviewType} Review
                  </span>
                </div>

                {/* Row 6: Domestic / Regional Preference */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Domestic / Regional Preference
                  </span>
                  <span className="font-bold text-slate-900">No</span>
                </div>

                {/* Row 7: Procurement Process */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Procurement Process
                  </span>
                  <span className="font-bold text-slate-900">
                    Single Stage One Envelope
                  </span>
                </div>

                {/* Row 8: Procurement Document Type */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Procurement Document Type
                  </span>
                  <span className="font-bold text-slate-900">
                    Request for Bids SPD ({selectedActivity.category}) - 1
                    envelope
                  </span>
                </div>

                {/* Row 9: Framework Flags */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Framework Flags
                  </span>
                  <div className="flex items-center gap-4 text-slate-600 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" /> UN
                      Contracting:{" "}
                      <strong className="text-slate-900 font-bold ml-1">
                        No
                      </strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />{" "}
                      In-Process (Migrated):{" "}
                      <strong className="text-slate-900 font-bold ml-1">
                        No
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* STEP 2: RELATED INFORMATION */}
          {activeDetailTab === 2 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-2xs p-6 sm:p-7 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
                <FileText className="h-4 w-4 text-[#0B5C43]" />
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  4.2 Step 2 — Related Information & Activity Details
                </h2>
              </div>

              {/* Inherited Project & Plan Context Banner (Unfragmented Horizontal Rows - Image 1 Style) */}
              <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0B5C43]">
                    INHERITED PROJECT & PLAN CONTEXT
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Read-only metadata
                  </span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
                    <span className="w-full sm:w-60 font-bold text-slate-500 shrink-0 uppercase text-[10px]">
                      PROJECT
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {project?.name ||
                        "DRIVE - De-Risking, Inclusion and Value Enhancement"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
                    <span className="w-full sm:w-60 font-bold text-slate-500 shrink-0 uppercase text-[10px]">
                      PROJECT CODE
                    </span>
                    <span className="font-extrabold text-[#0B5C43]">
                      {project?.code || "PRJ-24-001"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
                    <span className="w-full sm:w-60 font-bold text-slate-500 shrink-0 uppercase text-[10px]">
                      PROCUREMENT PLAN
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {plan?.planName || "2018 EFY Annual Procurement Plan"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
                    <span className="w-full sm:w-60 font-bold text-slate-500 shrink-0 uppercase text-[10px]">
                      PLAN REFERENCE
                    </span>
                    <span className="font-bold text-slate-800">
                      {plan?.id ||
                        (plan?.projectCode
                          ? `PP-${plan.projectCode}`
                          : "PP-PLAN")}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
                    <span className="w-full sm:w-60 font-bold text-slate-500 shrink-0 uppercase text-[10px]">
                      FISCAL YEAR
                    </span>
                    <span className="font-bold text-slate-800">
                      {plan?.budgetYear || "2018 EFY"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
                    <span className="w-full sm:w-60 font-bold text-slate-500 shrink-0 uppercase text-[10px]">
                      RESPONSIBLE OFFICER
                    </span>
                    <span className="font-bold text-slate-800">
                      {typeof project?.assignedOfficers?.[0] === "string"
                        ? project.assignedOfficers[0]
                        : (project?.assignedOfficers?.[0] as any)?.name ||
                          "Assigned Officer"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Baseline Fields matching inspiration rows */}
              <div className="divide-y divide-slate-100 text-xs">
                {/* Activity Reference */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Activity Reference
                  </span>
                  <span className="font-extrabold text-[#0B5C43]">
                    {selectedActivity.activityRefNo}
                  </span>
                </div>

                {/* Estimated Amount (Now Editable with Neutral Attention Border) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Estimated Amount (ETB)
                  </span>
                  {isEditable ? (
                    <div className="flex items-center gap-2 max-w-xs w-full">
                      <input
                        type="number"
                        value={selectedActivity.estimatedAmount}
                        onChange={(e) =>
                          handleUpdateActivityField(
                            selectedActivity.id,
                            "estimatedAmount",
                            Number(e.target.value) || 0,
                          )
                        }
                        className="w-full rounded-xl border-2 border-slate-400 hover:border-slate-600 bg-white px-3 py-2 text-xs font-bold font-mono text-[#0B5C43] shadow-2xs outline-none transition-all focus:border-[#0B5C43] focus:ring-2 focus:ring-[#0B5C43]/10"
                      />
                      <span className="text-xs font-bold text-slate-600 font-mono">
                        ({selectedActivity.currency})
                      </span>
                    </div>
                  ) : (
                    <span className="font-extrabold text-slate-900 font-mono">
                      ETB {selectedActivity.estimatedAmount.toLocaleString()}.00
                      ({selectedActivity.currency})
                    </span>
                  )}
                </div>

                {/* Primary Funding Source */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Primary Funding Source
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedActivity.fundingSource ||
                      project?.fundingSource ||
                      "African Development Bank (AfDB)"}
                  </span>
                </div>

                {/* Pricing Basis */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Pricing Basis
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedActivity.category === "Works"
                      ? "Bill of Quantities (BOQ)"
                      : "Lump Sum"}
                  </span>
                </div>

                {/* Subcomponent */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Subcomponent
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedActivity.subcomponent ||
                      selectedActivity.component ||
                      "Not Specified"}
                  </span>
                </div>

                {/* Lot Required */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-1.5">
                  <span className="w-full sm:w-72 font-bold text-slate-500 shrink-0">
                    Lot Required
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedActivity.isLotRequired ? "Yes" : "No"}
                  </span>
                </div>

                {/* Activity Description (Editable Input with Neutral Attention Border) */}
                <div className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-xs uppercase tracking-wide">
                      Activity Description
                    </label>
                  </div>
                  {isEditable ? (
                    <textarea
                      rows={3}
                      value={selectedActivity.description}
                      onChange={(e) =>
                        handleUpdateActivityField(
                          selectedActivity.id,
                          "description",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-xl border-2 border-slate-400 hover:border-slate-600 bg-white p-3.5 text-xs font-semibold text-slate-900 shadow-2xs outline-none transition-all focus:border-[#0A3C2F] focus:ring-2 focus:ring-[#0A3C2F]/10"
                      placeholder="Enter activity description..."
                    />
                  ) : (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 leading-relaxed">
                      {selectedActivity.description}
                    </div>
                  )}
                </div>

                {/* Comments / Remarks (Editable Input with Neutral Attention Border) */}
                <div className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-xs uppercase tracking-wide">
                      Comments / Remarks
                    </label>
                  </div>
                  {isEditable ? (
                    <textarea
                      rows={2}
                      value={
                        selectedActivity.remarks ||
                        "Approved procurement activity baseline."
                      }
                      onChange={(e) =>
                        handleUpdateActivityField(
                          selectedActivity.id,
                          "remarks",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-xl border-2 border-slate-400 hover:border-slate-600 bg-white p-3.5 text-xs font-semibold text-slate-900 shadow-2xs outline-none transition-all focus:border-[#0A3C2F] focus:ring-2 focus:ring-[#0A3C2F]/10"
                      placeholder="Enter remarks or approval notes..."
                    />
                  ) : (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 leading-relaxed">
                      {selectedActivity.remarks ||
                        "Approved procurement activity baseline."}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* STEP 3: ADDITIONAL DETAILS (Matching Image 2 Screenshot) */}
          {activeDetailTab === 3 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-2xs p-6 sm:p-7 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
                <FileText className="h-4 w-4 text-[#0B5C43]" />
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  4.3 Step 3 — Additional Details & Allocations
                </h2>
              </div>

              {/* Allocations (Image 2 style: rounded inputs with green % pill) */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Project Component Allocation
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between shadow-2xs">
                    <span className="text-xs font-bold text-slate-800">
                      Livestock Value Chains and Trade Facilitation
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                      100%
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Financing Allocation
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between shadow-2xs">
                    <span className="text-xs font-bold text-slate-800">
                      IDA-E0380
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                      100%
                    </span>
                  </div>
                </div>
              </div>

              {/* Administrative Classification Codes (Image 2 grid layout) */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="grid gap-4 sm:grid-cols-3 text-xs">
                  <div>
                    <span className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                      CLASSIFICATION CODE
                    </span>
                    <span className="font-extrabold text-slate-900 font-mono text-sm">
                      23181500
                    </span>
                  </div>

                  <div>
                    <span className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                      EVALUATION OPTION CODE
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      Most Advantageous Bid
                    </span>
                  </div>

                  <div>
                    <span className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                      HIGH-RISK CODE
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      No
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-xs">
                  <span className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                    LOCATION / REGION
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    FPCU / Federal
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* STEP 4: ROADMAP MILESTONES */}
          {activeDetailTab === 4 && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A3C2F] flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#0A3C2F]" />
                  4.1 Activity Roadmap & Stage Milestones
                </h3>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Method: {selectedActivity.method}
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">#</th>
                      <th className="py-2.5 px-3">Stage Name</th>
                      <th className="py-2.5 px-3 font-mono">
                        Original Baseline
                      </th>
                      <th className="py-2.5 px-3 font-mono">
                        Target Date {isEditable ? "(Editable)" : ""}
                      </th>
                      <th className="py-2.5 px-3 font-mono">Actual Date</th>
                      <th className="py-2.5 px-3 text-center">Stage Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 text-slate-700 bg-white">
                    {selectedActivity.roadmap.map((stage, idx) => (
                      <tr key={stage.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {stage.stageName}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {stage.notApplicable ||
                          stage.originalPlannedDate === "Not applicable"
                            ? "Not applicable"
                            : stage.originalPlannedDate || "—"}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {stage.notApplicable ||
                          stage.revisedTargetDate === "Not applicable" ? (
                            <span className="text-slate-400 font-medium italic">
                              Not applicable
                            </span>
                          ) : isEditable ? (
                            <input
                              type="date"
                              value={
                                stage.revisedTargetDate ||
                                stage.originalPlannedDate ||
                                ""
                              }
                              onChange={(e) =>
                                handleUpdateRoadmapDate(
                                  selectedActivity.id,
                                  stage.id,
                                  e.target.value,
                                )
                              }
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold font-mono text-slate-900 outline-none transition-all focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] cursor-pointer"
                            />
                          ) : (
                            <span className="font-semibold text-slate-800">
                              {stage.revisedTargetDate ||
                                stage.originalPlannedDate ||
                                "—"}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                          {stage.actualDate || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded ${
                              stage.notApplicable ||
                              stage.stageStatus === "Not Applicable"
                                ? "bg-slate-100 text-slate-500 border border-slate-200"
                                : stage.stageStatus === "Completed"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : stage.stageStatus === "In Progress"
                                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {stage.notApplicable ||
                            stage.stageStatus === "Not Applicable"
                              ? "Not Applicable"
                              : stage.stageStatus || "Not Started"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ACTIVITY COMMENTS & EXECUTIVE ANNOTATIONS SECTION */}
          <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#0A3C2F]" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Activity Comments &amp; Review Annotations
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {activityComments.filter((c) => c.entityId === selectedActivity.id).length} Comments
              </span>
            </div>

            {/* List of comments on this activity */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activityComments.filter((c) => c.entityId === selectedActivity.id).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No review comments recorded for this activity yet.
                </p>
              ) : (
                activityComments
                  .filter((c) => c.entityId === selectedActivity.id)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-slate-800">
                          {c.author?.displayName || c.author?.name || "Reviewer"}
                        </span>
                        <span className="font-mono text-[10px]">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-800 italic leading-relaxed pl-1">
                        &quot;{c.body}&quot;
                      </p>
                    </div>
                  ))
              )}
            </div>

            {/* Add Comment Input */}
            {onAddActivityComment && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-[11px] font-bold text-slate-800">
                  {isManagement ? "Executive Management Comment on this Activity" : "Add Activity Note / Comment"}
                </label>
                <div className="flex items-start gap-2">
                  <textarea
                    rows={2}
                    value={newActivityCommentText}
                    onChange={(e) => setNewActivityCommentText(e.target.value)}
                    placeholder={
                      isManagement
                        ? "Enter executive comment, reservation, or clarification required on this activity..."
                        : "Enter note or feedback..."
                    }
                    className="flex-1 p-2.5 text-xs rounded-xl border border-slate-300 focus:border-[#0A3C2F] outline-none"
                  />
                  <button
                    type="button"
                    disabled={!newActivityCommentText.trim() || isSubmittingComment}
                    onClick={async () => {
                      if (!newActivityCommentText.trim()) return;
                      setIsSubmittingComment(true);
                      try {
                        await onAddActivityComment(selectedActivity.id, newActivityCommentText.trim());
                        setActivityComments((prev) => [
                          ...prev,
                          {
                            id: `temp-${Date.now()}`,
                            entityType: "ACTIVITY",
                            entityId: selectedActivity.id,
                            authorId: "current-user",
                            body: newActivityCommentText.trim(),
                            createdAt: new Date().toISOString(),
                            author: {
                              id: "current-user",
                              name: isManagement ? "Executive Management" : "Director",
                            },
                          },
                        ]);
                        setNewActivityCommentText("");
                      } finally {
                        setIsSubmittingComment(false);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072a21] text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer shrink-0 mt-0.5"
                  >
                    {isSubmittingComment ? "Saving..." : "Add Comment"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* MAIN TABULAR ACTIVITY DIRECTORY (DIRECTOR VIEW) */
        <div className="space-y-4">
          {/* Context Header Card */}
          <section className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-2xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={onBackClick}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0A3C2F] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-xs font-extrabold text-[#0A3C2F] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {project.code}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-300">
                  v{planVersion}
                </span>
              </div>

              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[#0A3C2F] hover:bg-[#edf5f1] hover:text-[#0A3C2F] transition cursor-pointer"
                onClick={() => setIsHistoryModalOpen(true)}
                type="button"
              >
                <History className="h-3.5 w-3.5 text-[#0A3C2F]" />
                Version History (v{planVersion})
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Plan Name
              </label>
              {isManagement ? (
                <p className="text-base sm:text-lg font-extrabold text-slate-950 py-1">
                  {currentPlanName}
                </p>
              ) : (
                <input
                  type="text"
                  value={currentPlanName}
                  onChange={(e) => setCurrentPlanName(e.target.value)}
                  placeholder="Enter plan name..."
                  className="w-full text-base sm:text-lg font-extrabold text-slate-950 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 focus:border-[#0A3C2F] focus:ring-2 focus:ring-[#0A3C2F]/10 outline-none transition-all"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span>
                Category:{" "}
                <strong className="text-slate-900 font-bold">
                  {plan.category}
                </strong>
              </span>
              <span>•</span>
              <span>
                Fiscal Year:{" "}
                <strong className="text-slate-900 font-bold">
                  {plan.budgetYear}
                </strong>
              </span>
              <span>•</span>
              <span>
                Region:{" "}
                <strong className="text-slate-900 font-bold">
                  {plan.organizationRegion}
                </strong>
              </span>
            </div>
          </section>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search package activities by Ref No or Description..."
                className="w-full pl-10 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-[#0A3C2F] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Methods</option>
                  <option value="RFB - National">RFB - National</option>
                  <option value="RFB - International">
                    RFB - International
                  </option>
                  <option value="RFQ / Shopping">RFQ / Shopping</option>
                  <option value="QCBS">QCBS</option>
                  <option value="Direct Procurement">Direct Procurement</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                <select
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Reviews</option>
                  <option value="Prior">Prior Review</option>
                  <option value="Post">Post Review</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Not Started">Not Started</option>
                </select>
              </div>
            </div>
          </div>

          {/* PACKAGE ACTIVITIES DIRECTORY TABLE (SCREENSHOT 1) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[170px]">
                      Activity Ref No
                    </th>
                    <th className="py-2.5 px-3 min-w-[240px]">
                      Description & Scope
                    </th>
                    <th className="py-2.5 px-3 min-w-[150px]">
                      Method / Market
                    </th>
                    <th className="py-2.5 px-3 min-w-[90px]">Review</th>
                    <th className="py-2.5 px-3 min-w-[120px]">
                      Estimated Amount
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[110px]">
                      Status
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[80px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {loading && activities.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-500"
                      >
                        <Loader2 className="mx-auto h-6 w-6 text-[#0A3C2F] animate-spin mb-1" />
                        <p className="font-semibold text-slate-700 text-xs">
                          Loading procurement activities...
                        </p>
                      </td>
                    </tr>
                  ) : filteredActivities.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-500"
                      >
                        <FileText className="mx-auto h-7 w-7 text-slate-300 mb-1" />
                        <p className="font-semibold text-slate-700 text-xs">
                          No procurement activities found
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((act, index) => {
                      const completedStages = act.roadmap.filter(
                        (s) => s.stageStatus === "Completed",
                      ).length;
                      const totalStages = act.roadmap.length;
                      const computedStatus = getActivityStatus(act);

                      const statusColorStyle =
                        computedStatus === "Completed"
                          ? "text-[#166534] font-bold"
                          : computedStatus === "Delayed"
                            ? "text-[#b91c1c] font-extrabold"
                            : computedStatus === "In Progress"
                              ? "text-blue-700 font-bold"
                              : "text-slate-500 font-semibold";

                      return (
                        <tr
                          key={act.id}
                          onClick={() => setSelectedActivity(act)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        >
                          <td className="py-2 px-3 font-mono text-slate-400 font-semibold text-center">
                            {index + 1}
                          </td>

                          <td className="py-2 px-3 font-mono font-bold text-slate-900 text-xs">
                            {act.activityRefNo}
                          </td>

                          <td className="py-2 px-3 max-w-xs wrap-break-word">
                            <p className="font-bold text-slate-900 text-xs leading-snug wrap-break-word line-clamp-2">
                              {act.description}
                            </p>
                          </td>

                          <td className="py-2 px-3 text-xs">
                            <div className="font-bold text-[#0A3C2F]">
                              {act.method}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {act.marketApproach}
                            </div>
                          </td>

                          <td className="py-2 px-3">
                            <span
                              className={`text-xs font-extrabold ${
                                act.reviewType === "Prior"
                                  ? "text-amber-800"
                                  : "text-slate-700"
                              }`}
                            >
                              {act.reviewType}
                            </span>
                          </td>

                          <td className="py-2 px-3 font-mono font-bold text-slate-900 text-xs">
                            {act.currency}{" "}
                            {act.estimatedAmount.toLocaleString()}
                          </td>

                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block text-xs ${statusColorStyle}`}
                            >
                              {computedStatus}
                            </span>
                          </td>

                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedActivity(act);
                              }}
                              title="View Activity Details"
                              className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer mx-auto"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Decision & Workflow Actions Card */}
          {isCommittee && onCommitteeVote ? (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5 mt-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="h-5 w-5 text-[#0A3C2F]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Endorsement Committee Decision & Voting
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Committee Feedback / Deliberation Notes
                  <span className="ml-1 text-rose-500 text-[10px] font-semibold">
                    (Required to reject)
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={directorReturnRemarks}
                  onChange={(e) => setDirectorReturnRemarks(e.target.value)}
                  placeholder="Enter committee voting remarks or feedback..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#0A3C2F]"
                />
                {!directorReturnRemarks.trim() && (
                  <p className="text-[10px] text-slate-400 font-medium">
                    A comment is required before rejecting a plan.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    onCommitteeVote(plan, "APPROVE", directorReturnRemarks)
                  }
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#A3E635]" />
                  <span>Vote: Endorse &amp; Approve Plan</span>
                </button>

                <button
                  type="button"
                  disabled={!directorReturnRemarks.trim()}
                  onClick={() =>
                    onCommitteeVote(plan, "REJECT", directorReturnRemarks)
                  }
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${
                    directorReturnRemarks.trim()
                      ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                  }`}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Vote: Reject / Return Plan</span>
                </button>
              </div>
            </section>
          ) : isManagement && onManagementDecision ? (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5 mt-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building2 className="h-5 w-5 text-indigo-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Executive Management Decision &amp; Authorization
                  </h3>
                  <p className="text-xs text-slate-500">
                    Final executive approval gate. Review plan and activities, enter remarks or comments, and authorize or reject.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Executive Remarks / Rejection Rationale
                  <span className="ml-1 text-rose-500 text-[10px] font-semibold">
                    (Required to reject)
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={directorReturnRemarks}
                  onChange={(e) => setDirectorReturnRemarks(e.target.value)}
                  placeholder="Enter executive authorization remarks or rejection reasons..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#0A3C2F]"
                />
                {!directorReturnRemarks.trim() && (
                  <p className="text-[10px] text-slate-400 font-medium">
                    A comment is required before rejecting a plan.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    onManagementDecision(plan, "APPROVE", directorReturnRemarks)
                  }
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#A3E635]" />
                  <span>Authorize &amp; Approve Plan</span>
                </button>

                <button
                  type="button"
                  disabled={!directorReturnRemarks.trim()}
                  onClick={() =>
                    onManagementDecision(plan, "REJECT", directorReturnRemarks)
                  }
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${
                    directorReturnRemarks.trim()
                      ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  <span>Reject Plan</span>
                </button>
              </div>
            </section>
          ) : onApprovePlan && onReturnPlan ? (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5 mt-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="h-5 w-5 text-[#0A3C2F]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Director Decision & Workflow Actions
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Revision Notes
                  <span className="ml-1 text-rose-500 text-[10px] font-semibold">
                    (Required to return to Officer)
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={directorReturnRemarks}
                  onChange={(e) => setDirectorReturnRemarks(e.target.value)}
                  placeholder="Specify required corrections, missing documents or revision notes for the Procurement Officer..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#0A3C2F]"
                />
                {!directorReturnRemarks.trim() && (
                  <p className="text-[10px] text-slate-400 font-medium">
                    Revision notes are required before returning a plan to the
                    Procurement Officer.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onApprovePlan(plan)}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="h-4 w-4 text-[#A3E635]" />
                  <span>Approve &amp; Send to Committee</span>
                </button>

                <button
                  type="button"
                  disabled={!directorReturnRemarks.trim()}
                  onClick={() => onReturnPlan(plan, directorReturnRemarks)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${
                    directorReturnRemarks.trim()
                      ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                  }`}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Return to Officer for Revision</span>
                </button>
              </div>
            </section>
          ) : null}
        </div>
      )}

      <VersionHistoryModal
        currentStatus={plan.status}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        planId={plan.id}
        planName={plan.planName}
        projectCode={project.code}
      />
    </div>
  );
}
