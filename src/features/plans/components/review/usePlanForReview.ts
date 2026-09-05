"use client";

import { useState, useEffect, useCallback } from "react";
import { type ProcurementPlan, parseRejectionDetails } from "../../plansData";
import {
  fetchPlans,
  sendPlanToCommittee,
  rejectPlan,
  submitVote,
  mapBackendPlanToFrontend,
} from "../../../../lib/plansApi";
import type { AuthUser } from "../../../../lib/authTypes";
import {
  INITIAL_PROJECTS,
  type ProjectItem,
} from "@/features/projects/management/projectsData";
import {
  getCurrentPlanVersionNumber,
  recordPlanVersionEvent,
} from "../../data/planRevisions";
import type { ProcurementActivity } from "../../../activities/activitiesData";
import {
  OFFICER_PLAN_DRAFTS_STORAGE_KEY,
  parseSavedPlanRecords,
} from "@/features/projects/data/officerPlanDrafts";
import { OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY } from "@/features/projects/data/officerActivityDrafts";

export interface UsePlanForReviewProps {
  user: AuthUser;
  selectedPlanId?: string;
  selectedActivityRef?: string;
}

export function usePlanForReview({
  user,
  selectedPlanId,
  selectedActivityRef,
}: UsePlanForReviewProps) {
  const [plans, setPlans] = useState<ProcurementPlan[]>([]);
  const [projects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [historyModalPlan, setHistoryModalPlan] =
    useState<ProcurementPlan | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const rawPlans = await fetchPlans();
      const mapped = rawPlans.map((p) =>
        mapBackendPlanToFrontend(p, user.id, user.email),
      );

      const planMap = new Map<string, ProcurementPlan>();

      // Merge saved officer plans from localStorage
      const draftList: ProcurementPlan[] = [];
      try {
        if (typeof window !== "undefined") {
          const rawSaved = window.localStorage.getItem(
            OFFICER_PLAN_DRAFTS_STORAGE_KEY,
          );
          if (rawSaved) {
            const parsed = parseSavedPlanRecords(rawSaved);
            parsed.forEach((rec) => {
              const p = rec.plan;
              if (!p) return;
              const planId =
                p.id || `officer-${rec.projectCode}-${p.reference}`;
              const mappedDraft: ProcurementPlan = {
                id: planId,
                projectId: rec.projectCode,
                projectName: `${rec.projectCode} Project`,
                planName: p.name || p.reference,
                projectCode: rec.projectCode,
                category: p.category || "Goods",
                budgetYear: p.budgetYear || "2018 EFY",
                planPeriodFrom: p.planPeriod?.from?.gregorian || "2026-07-08",
                planPeriodTo: p.planPeriod?.to?.gregorian || "2027-07-07",
                generalNoticeDate:
                  p.generalProcurementNoticeDate?.gregorian || "2026-07-08",
                organizationRegion: p.organizationRegion || "Federal / FPCU",
                status: (p.status as any) || "Submitted to Director",
                description: p.description || "",
                reference: p.reference,
                rejectionReason: p.rejectionReason,
                rejectionScope:
                  p.rejectionScope ||
                  parseRejectionDetails(p.rejectionReason).scope,
                rejectedActivityIds: p.rejectedActivityIds,
                rejectedActivityRefs:
                  p.rejectedActivityRefs ||
                  (parseRejectionDetails(p.rejectionReason).scope === "SPECIFIC"
                    ? parseRejectionDetails(p.rejectionReason)
                        .rejectedActivityRefs
                    : undefined),
                activities: (p.planActivities as any) || [],
                activitiesCount:
                  (p.planActivities as any)?.length || p.activities || 0,
                assignedOfficer: "Procurement Officer",
                createdBy: "Procurement Officer",
                createdAt: new Date().toISOString(),
                currency: p.currency || "ETB",
                estimatedValue: p.estimatedValue || 0,
              };
              draftList.push(mappedDraft);
            });
          }
        }
      } catch (storageErr) {
        console.warn("Storage read error in loadPlans:", storageErr);
      }

      for (const d of draftList) {
        if (d.status !== "Draft") {
          planMap.set(d.id, d);
        }
      }

      mapped.forEach((p) => {
        const matchingDraft = draftList.find(
          (d) =>
            d.id === p.id ||
            (d.reference &&
              (p as any).reference &&
              d.reference.toLowerCase().trim() ===
                (p as any).reference.toLowerCase().trim()) ||
            (d.planName &&
              p.planName &&
              d.planName.toLowerCase().trim() ===
                p.planName.toLowerCase().trim()) ||
            (d.reference &&
              p.planName &&
              d.reference.toLowerCase().trim() ===
                p.planName.toLowerCase().trim()),
        );

        if (matchingDraft) {
          planMap.delete(matchingDraft.id);
          const effectiveReason =
            p.rejectionReason || matchingDraft.rejectionReason;
          const parsedEff = parseRejectionDetails(effectiveReason);

          const merged: ProcurementPlan = {
            ...p,
            projectCode:
              matchingDraft.projectCode &&
              matchingDraft.projectCode !== "BREFONS"
                ? matchingDraft.projectCode
                : p.projectCode,
            reference: matchingDraft.reference || (p as any).reference,
            rejectionReason: effectiveReason,
            rejectionScope:
              p.rejectionScope ||
              matchingDraft.rejectionScope ||
              parsedEff.scope,
            rejectedActivityIds:
              p.rejectedActivityIds || matchingDraft.rejectedActivityIds,
            rejectedActivityRefs:
              p.rejectedActivityRefs ||
              matchingDraft.rejectedActivityRefs ||
              (parsedEff.scope === "SPECIFIC"
                ? parsedEff.rejectedActivityRefs
                : undefined),
            activities:
              p.activities && p.activities.length > 0
                ? p.activities
                : matchingDraft.activities || [],
            activitiesCount:
              p.activities && p.activities.length > 0
                ? p.activities.length
                : matchingDraft.activities?.length || 0,
          };
          planMap.set(p.id, merged);
        } else {
          planMap.set(p.id, p);
        }
      });

      setPlans(Array.from(planMap.values()));
    } catch (err) {
      console.error(err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [user.id, user.email]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPlans();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPlans]);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [budgetYearFilter, setBudgetYearFilter] = useState<string>("ALL");
  const [regionFilter, setRegionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selection states
  const [selectedPlanForReview, setSelectedPlanForReview] =
    useState<ProcurementPlan | null>(null);
  const [reviewActivities, setReviewActivities] = useState<
    ProcurementActivity[]
  >([]);
  const [editingPlan, setEditingPlan] = useState<ProcurementPlan | null>(null);
  const [activitiesPlan, setActivitiesPlan] = useState<ProcurementPlan | null>(
    null,
  );
  const [editingActivity, setEditingActivity] =
    useState<ProcurementActivity | null>(null);
  const [isCommitteeRejectionModalOpen, setIsCommitteeRejectionModalOpen] =
    useState(false);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ href?: string }>;
      if (
        !customEvent.detail?.href ||
        customEvent.detail.href === "/workspace/plan-for-review"
      ) {
        setSelectedPlanForReview(null);
        setEditingPlan(null);
        setActivitiesPlan(null);
        setEditingActivity(null);
      }
    };

    window.addEventListener("pts:sidebar-reset", handleReset);
    return () => window.removeEventListener("pts:sidebar-reset", handleReset);
  }, []);

  useEffect(() => {
    if (selectedPlanId && plans.length > 0 && !activitiesPlan) {
      const match = plans.find(
        (p) =>
          p.id === selectedPlanId ||
          p.reference?.toLowerCase() === selectedPlanId.toLowerCase() ||
          p.planName?.toLowerCase() === selectedPlanId.toLowerCase() ||
          p.projectCode?.toLowerCase() === selectedPlanId.toLowerCase(),
      );
      if (match) {
        const timer = setTimeout(() => {
          setActivitiesPlan(match);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedPlanId, plans, activitiesPlan]);

  // Auto-save feedback state
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const handleActivityUpdate = (
    id: string,
    updates: Partial<ProcurementActivity>,
  ) => {
    setIsSaving(true);
    setShowSavedFeedback(true);
    setReviewActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    );
    setTimeout(() => {
      setIsSaving(false);
    }, 350);
  };

  const [returnRemarks, setReturnRemarks] = useState("");
  const [committeeDeadlineDate, setCommitteeDeadlineDate] = useState<string>(
    () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split("T")[0];
    },
  );
  const [pendingApprovePlan, setPendingApprovePlan] =
    useState<ProcurementPlan | null>(null);

  // Filter plans awaiting review only
  const filteredPlans = plans.filter((p) => {
    let isAwaitingReview = false;
    if (user?.role === "ENDORSING_COMMITTEE") {
      const alreadyVoted = p.committeeDecision !== undefined;
      isAwaitingReview =
        (p.status === "Committee Review" ||
          (p as any).status === "WITH_COMMITTEE") &&
        !alreadyVoted;
    } else {
      isAwaitingReview =
        p.status === "Submitted to Director" || p.status === "Returned";
    }
    const matchesSearch =
      p.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "ALL" || p.category === categoryFilter;
    const matchesBudgetYear =
      budgetYearFilter === "ALL" || p.budgetYear.includes(budgetYearFilter);
    const matchesRegion =
      regionFilter === "ALL" || p.organizationRegion === regionFilter;
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;

    return (
      isAwaitingReview &&
      matchesSearch &&
      matchesCategory &&
      matchesBudgetYear &&
      matchesRegion &&
      matchesStatus
    );
  });

  const getProjectForPlan = (projectCode: string): ProjectItem => {
    return (
      projects.find((pr) => pr.code === projectCode) || {
        id: "p-fallback",
        code: projectCode,
        name: `${projectCode} Project`,
        countryOrg: "Ethiopia",
        executingAgency: "Ministry of Agriculture (MoA)",
        region: "Federal",
        budgetYear: "2018 EFY",
        fundingSource: "African Development Bank (AfDB)",
        fundingType: "Loan & Grant",
        loanGrantNumbers: ["P-Z1-C00-080"],
        components: ["Component 1"],
        subcomponents: [],
        currency: "USD",
        sector: "Agriculture",
        assignedOfficers: [],
        description: "Sector project",
        status: "Active",
        createdAt: "2025-01-01",
      }
    );
  };

  const updateLocalStoragePlanAndActivities = (
    plan: ProcurementPlan,
    newPlanStatus: string,
    newActivityStatus?: string,
    rejectionReason?: string,
    rejectionScope?: "ALL" | "SPECIFIC",
    rejectedActivityIds?: string[],
    rejectedActivityRefs?: string[],
  ) => {
    if (typeof window === "undefined") return;
    try {
      const isSpecific = rejectionScope === "SPECIFIC";
      const isActivityFlagged = (actId?: string, actRef?: string) => {
        if (!isSpecific) return true;
        const cleanId = (actId || "").toLowerCase().trim();
        const cleanRef = (actRef || "").toLowerCase().trim();
        return (
          (rejectedActivityIds &&
            rejectedActivityIds.some((id) => {
              const c = id.toLowerCase().trim();
              return c === cleanId || c === cleanRef;
            })) ||
          (rejectedActivityRefs &&
            rejectedActivityRefs.some((ref) => {
              const c = ref.toLowerCase().trim();
              return c === cleanRef || c === cleanId;
            }))
        );
      };

      const rawPlanDrafts = window.localStorage.getItem(
        OFFICER_PLAN_DRAFTS_STORAGE_KEY,
      );
      if (rawPlanDrafts) {
        const parsed = JSON.parse(rawPlanDrafts);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((item: any) => {
            const itemRef = item.plan?.reference?.toLowerCase()?.trim();
            const itemName = item.plan?.name?.toLowerCase()?.trim();
            const itemId = item.plan?.id?.toLowerCase()?.trim();
            const planRef = plan.reference?.toLowerCase()?.trim();
            const planName = plan.planName?.toLowerCase()?.trim();
            const planId = plan.id?.toLowerCase()?.trim();

            const matches =
              (itemId && (itemId === planId || itemId === planRef)) ||
              (itemRef &&
                (itemRef === planRef ||
                  itemRef === planName ||
                  itemRef === planId)) ||
              (itemName &&
                (itemName === planName ||
                  itemName === planRef ||
                  itemName === planId));

            if (matches) {
              const updatedPlanActivities =
                newActivityStatus && item.plan?.planActivities
                  ? item.plan.planActivities.map((act: any) => {
                      const flagged = isActivityFlagged(
                        act.id,
                        act.activityRefNo || act.reference,
                      );
                      return {
                        ...act,
                        status: isSpecific
                          ? flagged
                            ? newActivityStatus
                            : act.status || "Approved"
                          : newActivityStatus,
                        isFlaggedByCommittee: flagged,
                      };
                    })
                  : item.plan?.planActivities;

              return {
                ...item,
                plan: {
                  ...item.plan,
                  status: newPlanStatus,
                  rejectionReason:
                    rejectionReason !== undefined
                      ? rejectionReason
                      : item.plan.rejectionReason,
                  rejectionScope: rejectionScope || item.plan.rejectionScope,
                  rejectedActivityIds:
                    rejectedActivityIds || item.plan.rejectedActivityIds,
                  rejectedActivityRefs:
                    rejectedActivityRefs || item.plan.rejectedActivityRefs,
                  planActivities: updatedPlanActivities,
                },
              };
            }
            return item;
          });
          window.localStorage.setItem(
            OFFICER_PLAN_DRAFTS_STORAGE_KEY,
            JSON.stringify(updated),
          );
        }
      }

      if (newActivityStatus) {
        const rawActDrafts = window.localStorage.getItem(
          OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
        );
        if (rawActDrafts) {
          const parsedActs = JSON.parse(rawActDrafts);
          if (Array.isArray(parsedActs)) {
            const updatedActs = parsedActs.map((item: any) => {
              const pRef = item.planReference?.toLowerCase()?.trim();
              const planRef = plan.reference?.toLowerCase()?.trim();
              const planName = plan.planName?.toLowerCase()?.trim();
              const planId = plan.id?.toLowerCase()?.trim();

              const matchesPlan =
                (pRef &&
                  (pRef === planId || pRef === planRef || pRef === planName)) ||
                item.projectCode?.toLowerCase()?.trim() ===
                  plan.projectCode?.toLowerCase()?.trim();

              if (matchesPlan) {
                const flagged = isActivityFlagged(
                  item.activity?.id,
                  item.activity?.activityRefNo || item.activity?.reference,
                );
                return {
                  ...item,
                  activity: {
                    ...item.activity,
                    status: isSpecific
                      ? flagged
                        ? newActivityStatus
                        : item.activity?.status || "Approved"
                      : newActivityStatus,
                    isFlaggedByCommittee: flagged,
                  },
                };
              }
              return item;
            });
            window.localStorage.setItem(
              OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
              JSON.stringify(updatedActs),
            );
          }
        }
      }
    } catch (err) {
      console.warn("Storage sync error:", err);
    }
  };

  // Director Decision 1: Approve & Send to Endorsement Committee
  const handleApprovePlan = async (
    plan: ProcurementPlan,
    deadlineDate?: string,
  ) => {
    try {
      const targetDate = deadlineDate || committeeDeadlineDate;
      const days = targetDate
        ? Math.max(
            1,
            Math.round(
              (new Date(targetDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 7;
      await sendPlanToCommittee(plan.id, targetDate, days);
    } catch (err) {
      console.warn("Backend sendPlanToCommittee note:", err);
    }

    updateLocalStoragePlanAndActivities(
      plan,
      "Committee Review",
      "Under Review",
    );

    recordPlanVersionEvent({
      planId: plan.id,
      planReference: plan.reference || plan.planName,
      projectCode: plan.projectCode,
      versionNumber: getCurrentPlanVersionNumber(plan.id),
      action: "SENT_TO_COMMITTEE",
      actionLabel: "Plan Endorsed & Sent to Committee",
      changedBy: user.displayName || user.email || "Director",
      changedByRole: "Director",
      reason: "Approved and submitted for Endorsement Committee review.",
    });

    await loadPlans();
    setSelectedPlanForReview(null);
    setReturnRemarks("");
    setPendingApprovePlan(null);
    showToast(
      `Plan "${plan.planName}" approved and forwarded to Endorsement Committee (Deadline: ${committeeDeadlineDate})!`,
    );
  };

  // Director Decision 2: Return to Officer for Revision
  const handleReturnPlan = async (
    plan: ProcurementPlan,
    customRemarks?: string,
  ) => {
    const reasonText =
      (customRemarks !== undefined ? customRemarks : returnRemarks).trim() ||
      "Returned by Director for revisions.";
    try {
      await rejectPlan(plan.id, reasonText);
    } catch (err) {
      console.warn("Backend rejectPlan note:", err);
    }

    updateLocalStoragePlanAndActivities(
      plan,
      "Returned",
      "Returned",
      reasonText,
    );

    recordPlanVersionEvent({
      planId: plan.id,
      planReference: plan.reference || plan.planName,
      projectCode: plan.projectCode,
      versionNumber: getCurrentPlanVersionNumber(plan.id),
      action: "RETURNED",
      actionLabel: "Plan Returned by Director for Revision",
      changedBy: user.displayName || user.email || "Director",
      changedByRole: "Director",
      reason: reasonText,
    });

    await loadPlans();
    setSelectedPlanForReview(null);
    setReturnRemarks("");
    showToast(
      `Plan "${plan.planName}" returned to Procurement Officer for revision.`,
    );
  };

  // Committee Decision: Vote Approve or Reject
  const handleCommitteeVote = async (
    plan: ProcurementPlan,
    decision: "APPROVE" | "REJECT",
    customRemarks?: string,
    rejectionDetails?: {
      scope: "ALL" | "SPECIFIC";
      rejectedActivityIds: string[];
      rejectedActivityRefs: string[];
    },
  ) => {
    let commentText =
      (customRemarks !== undefined ? customRemarks : returnRemarks).trim() ||
      undefined;

    if (
      decision === "REJECT" &&
      rejectionDetails?.scope === "SPECIFIC" &&
      rejectionDetails.rejectedActivityRefs.length > 0
    ) {
      const prefix = `[Flagged Activities: ${rejectionDetails.rejectedActivityRefs.join(", ")}]`;
      commentText = commentText ? `${prefix} ${commentText}` : prefix;
    }

    try {
      await submitVote(plan.id, decision, commentText, user.id, user.email);
    } catch (err) {
      console.warn("Backend submitVote note:", err);
    }

    const nextStatus = decision === "APPROVE" ? "Finally Approved" : "Returned";
    const nextActStatus = decision === "APPROVE" ? "In Progress" : undefined;

    updateLocalStoragePlanAndActivities(
      plan,
      nextStatus,
      nextActStatus,
      decision === "REJECT" ? commentText : undefined,
      rejectionDetails?.scope || "ALL",
      rejectionDetails?.rejectedActivityIds,
      rejectionDetails?.rejectedActivityRefs,
    );

    recordPlanVersionEvent({
      planId: plan.id,
      planReference: plan.reference || plan.planName,
      projectCode: plan.projectCode,
      versionNumber: getCurrentPlanVersionNumber(plan.id),
      action: decision === "APPROVE" ? "FINALLY_APPROVED" : "RETURNED",
      actionLabel:
        decision === "APPROVE"
          ? "Plan Endorsed & Finally Approved"
          : rejectionDetails?.scope === "SPECIFIC"
            ? `Plan Returned (${rejectionDetails.rejectedActivityRefs.length} Specific Activities Flagged)`
            : "Plan Rejected by Committee",
      changedBy: user.displayName || user.email || "Endorsement Committee",
      changedByRole: "Endorsement Committee",
      reason:
        commentText ||
        (decision === "APPROVE"
          ? "Endorsement vote recorded"
          : "Rejected by committee"),
    });

    await loadPlans();
    setSelectedPlanForReview(null);
    setReturnRemarks("");
    showToast(
      decision === "APPROVE"
        ? `Vote "Approved" recorded for plan "${plan.planName}".`
        : rejectionDetails?.scope === "SPECIFIC"
          ? `Vote "Rejected" recorded: flagged ${rejectionDetails.rejectedActivityRefs.length} specific activities.`
          : `Vote "Rejected" recorded for plan "${plan.planName}".`,
    );
  };

  const handleSavePlanEdits = (savedPlan: ProcurementPlan) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === savedPlan.id ? savedPlan : p)),
    );
    setEditingPlan(null);
    showToast(`Restricted plan edits saved for "${savedPlan.planName}".`);
  };

  return {
    plans,
    setPlans,
    projects,
    loading,
    toastMessage,
    showToast,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    budgetYearFilter,
    setBudgetYearFilter,
    regionFilter,
    setRegionFilter,
    statusFilter,
    setStatusFilter,
    selectedPlanForReview,
    setSelectedPlanForReview,
    reviewActivities,
    setReviewActivities,
    editingPlan,
    setEditingPlan,
    activitiesPlan,
    setActivitiesPlan,
    editingActivity,
    setEditingActivity,
    isCommitteeRejectionModalOpen,
    setIsCommitteeRejectionModalOpen,
    committeeDeadlineDate,
    setCommitteeDeadlineDate,
    pendingApprovePlan,
    setPendingApprovePlan,
    returnRemarks,
    setReturnRemarks,
    historyModalPlan,
    setHistoryModalPlan,
    isSaving,
    showSavedFeedback,
    handleActivityUpdate,
    handleApprovePlan,
    handleReturnPlan,
    handleCommitteeVote,
    handleSavePlanEdits,
    loadPlans,
    filteredPlans,
    getProjectForPlan,
    selectedActivityRef,
  };
}
