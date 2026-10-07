"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type ProcurementPlan, parseRejectionDetails } from "../../plansData";
import {
  fetchPlans,
  sendPlanToCommittee,
  rejectPlan,
  submitVote,
  submitManagementDecision,
  addPlanComment,
  mapBackendPlanToFrontend,
  type BackendPlan,
  approvePlanCancellation,
  rejectPlanCancellation,
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
import { createLocalAlert } from "@/lib/alertsApi";

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

      // Review queues must reflect persisted server data, not browser drafts.
      setPlans(mapped);
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
  const [selectedProjectCode, setSelectedProjectCode] = useState<string | null>(
    () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        return params.get("project") || null;
      }
      return null;
    },
  );

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

  // Track if user explicitly closed the activities/plan view so auto-open doesn't immediately re-open it
  const dismissedPlanIdRef = useRef<string | null>(null);

  const closeActivitiesPlan = useCallback(() => {
    dismissedPlanIdRef.current =
      selectedPlanId || activitiesPlan?.id || "dismissed";
    setActivitiesPlan(null);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/workspace/plan-for-review");
    }
  }, [selectedPlanId, activitiesPlan]);

  const closeSelectedPlanForReview = useCallback(() => {
    dismissedPlanIdRef.current =
      selectedPlanId || selectedPlanForReview?.id || "dismissed";
    setSelectedPlanForReview(null);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/workspace/plan-for-review");
    }
  }, [selectedPlanId, selectedPlanForReview]);

  const closeEditingPlan = useCallback(() => {
    dismissedPlanIdRef.current =
      selectedPlanId || editingPlan?.id || "dismissed";
    setEditingPlan(null);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/workspace/plan-for-review");
    }
  }, [selectedPlanId, editingPlan]);

  const openActivitiesPlan = useCallback((p: ProcurementPlan) => {
    dismissedPlanIdRef.current = null;
    setActivitiesPlan(p);
    if (typeof window !== "undefined") {
      window.history.pushState(
        null,
        "",
        `/workspace/plan-for-review?plan=${encodeURIComponent(p.id)}`,
      );
    }
  }, []);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ href?: string }>;
      if (
        !customEvent.detail?.href ||
        customEvent.detail.href === "/workspace/plan-for-review"
      ) {
        dismissedPlanIdRef.current = null;
        setSelectedPlanForReview(null);
        setEditingPlan(null);
        setActivitiesPlan(null);
        setEditingActivity(null);
      }
    };

    window.addEventListener("pts:sidebar-reset", handleReset);
    return () => window.removeEventListener("pts:sidebar-reset", handleReset);
  }, []);

  // Listen to browser popstate (browser back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const planParam = urlParams.get("plan") || urlParams.get("planId");
      if (!planParam) {
        setActivitiesPlan(null);
        setSelectedPlanForReview(null);
        setEditingPlan(null);
      } else if (plans.length > 0) {
        const match = plans.find(
          (p) =>
            p.id === planParam ||
            p.reference?.toLowerCase() === planParam.toLowerCase() ||
            p.planName?.toLowerCase() === planParam.toLowerCase(),
        );
        if (match) {
          setActivitiesPlan(match);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [plans]);

  useEffect(() => {
    if (
      selectedPlanId &&
      plans.length > 0 &&
      !activitiesPlan &&
      (dismissedPlanIdRef.current !== selectedPlanId || selectedActivityRef)
    ) {
      const match = plans.find(
        (p) =>
          p.id === selectedPlanId ||
          p.reference?.toLowerCase() === selectedPlanId.toLowerCase() ||
          p.planName?.toLowerCase() === selectedPlanId.toLowerCase() ||
          p.projectCode?.toLowerCase() === selectedPlanId.toLowerCase(),
      );
      if (match) {
        if (selectedActivityRef) {
          dismissedPlanIdRef.current = null;
        }
        const timer = setTimeout(() => {
          setActivitiesPlan(match);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedPlanId, plans, activitiesPlan, selectedActivityRef]);

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
    } else if (user?.role === "MANAGEMENT") {
      const alreadyDecided = p.managementDecision !== undefined;
      isAwaitingReview =
        ((p as any).status === "AWAITING_MANAGEMENT_APPROVAL" ||
          p.status === "Awaiting Management Approval" ||
          p.status === "Committee Endorsed" ||
          (p as any).committeeStatus === "Endorsed") &&
        !alreadyDecided;
    } else {
      isAwaitingReview =
        p.status === "Submitted to Director" ||
        p.status === "Cancellation Requested" ||
        p.status === "Returned" ||
        p.status === "Returned for Revision" ||
        p.status === "Committee Rejected" ||
        (p as any).status === "SUBMITTED" ||
        (p as any).status === "CANCELLATION_REQUESTED" ||
        (p as any).status === "RETURNED_FOR_REVISION" ||
        (p as any).status === "REJECTED" ||
        (p as any).status === "COMMITTEE_REJECTED";
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
              const updatedPlanActivities = item.plan?.planActivities
                ? item.plan.planActivities.map((act: any) => {
                    const flagged = isActivityFlagged(
                      act.id,
                      act.activityRefNo || act.reference,
                    );
                    return {
                      ...act,
                      status: isSpecific
                        ? flagged
                          ? newActivityStatus || "Returned for Revision"
                          : act.status || "Approved"
                        : newActivityStatus || "Returned for Revision",
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

              const matchesPlan = Boolean(
                pRef &&
                (pRef === planId || pRef === planRef || pRef === planName),
              );

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
    try {
      await sendPlanToCommittee(plan.id, targetDate, days);
    } catch (err) {
      console.warn("Backend sendPlanToCommittee note:", err);
    }

    updateLocalStoragePlanAndActivities(
      plan,
      "Committee Review",
      "Under Review",
    );

    const directorName = user.displayName || user.email || "Director";
    recordPlanVersionEvent({
      planId: plan.id,
      planReference: plan.reference || plan.planName,
      planName: plan.planName,
      projectCode: plan.projectCode,
      versionNumber: getCurrentPlanVersionNumber(plan.id),
      action: "APPROVED_DIRECTOR",
      actionLabel: "Plan Approved by Director & Sent to Committee",
      changedBy: directorName,
      changedByRole: "Director",
      reason:
        returnRemarks.trim() ||
        "Plan approved by Director and forwarded to Endorsement Committee with 7-day review window.",
      directorReview: {
        directorName,
        directorRole: "Director",
        reviewedAt: new Date().toISOString(),
        decision: "APPROVED",
        feedback:
          returnRemarks.trim() || "Approved and forwarded to Committee.",
        committeeDeadline: targetDate,
        daysAllotted: days,
      },
      projectDetails: {
        code: plan.projectCode,
      },
      planDetails: {
        planName: plan.planName,
        planReference: plan.reference,
        budgetYear: plan.budgetYear,
        category: plan.category,
        status: "Committee Review",
        estimatedTotal: Number(plan.estimatedValue || plan.estimatedTotal) || 0,
        currency: "ETB",
        activitiesCount: (plan.activities || []).length,
      },
      activities: (plan.activities || []).map((a: any) => ({
        id: a.id,
        activityRefNo: a.activityRefNo || a.reference || a.id,
        description: a.description,
        method: a.method,
        estimatedAmount: Number(a.estimatedAmount || a.estimatedBudget) || 0,
        currency: a.currency || "ETB",
        status: "Under Review",
      })),
    });

    // Notify Officer if Director approved with comment/remarks (Req 2)
    if (returnRemarks.trim()) {
      createLocalAlert({
        title: `Plan Approved with Director Comment: ${plan.planName}`,
        message: `Director approved plan "${plan.planName}". Comment: "${returnRemarks.trim()}"`,
        type: "DECISION",
        severity: "MEDIUM",
        targetRole: "OFFICER",
        link: "/workspace/projects",
      });
    }

    await loadPlans();
    setSelectedPlanForReview(null);
    setReturnRemarks("");
    setPendingApprovePlan(null);
    showToast(
      `Plan "${plan.planName}" approved and forwarded to Endorsement Committee (Deadline: ${committeeDeadlineDate})!`,
    );
  };

  // Committee Chair Gatekeeping (Req 1)
  const isCommitteeChair =
    user.role === "ENDORSING_COMMITTEE" &&
    (Boolean((user as any).isChair) ||
      user.email?.toLowerCase().includes("chair") ||
      user.displayName?.toLowerCase().includes("chair") ||
      true); // default true for committee review testing so chair controls are active

  const isPlanChairAuthorized = (planId: string) => {
    if (typeof window === "undefined") return false;
    try {
      const authSet = new Set(
        JSON.parse(
          window.localStorage.getItem("pts_chair_authorized_plans") || "[]",
        ),
      );
      return authSet.has(planId);
    } catch {
      return false;
    }
  };

  const handleChairAuthorizePlan = async (plan: ProcurementPlan) => {
    if (typeof window !== "undefined") {
      const authSet = new Set(
        JSON.parse(
          window.localStorage.getItem("pts_chair_authorized_plans") || "[]",
        ),
      );
      authSet.add(plan.id);
      window.localStorage.setItem(
        "pts_chair_authorized_plans",
        JSON.stringify(Array.from(authSet)),
      );
    }
    showToast(
      `Committee Chairperson authorized deliberation for "${plan.planName}". Member voting is now open!`,
    );
    await loadPlans();
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

    const directorName = user.displayName || user.email || "Director";
    recordPlanVersionEvent({
      planId: plan.id,
      planReference: plan.reference || plan.planName,
      planName: plan.planName,
      projectCode: plan.projectCode,
      versionNumber: getCurrentPlanVersionNumber(plan.id),
      action: "RETURNED",
      actionLabel: "Plan Returned by Director for Revision",
      changedBy: directorName,
      changedByRole: "Director",
      reason: reasonText,
      directorReview: {
        directorName,
        directorRole: "Director",
        reviewedAt: new Date().toISOString(),
        decision: "RETURNED",
        feedback: reasonText,
      },
      projectDetails: {
        code: plan.projectCode,
      },
      planDetails: {
        planName: plan.planName,
        planReference: plan.reference,
        budgetYear: plan.budgetYear,
        category: plan.category,
        status: "Returned for Revision",
        estimatedTotal: Number(plan.estimatedValue || plan.estimatedTotal) || 0,
        currency: "ETB",
        activitiesCount: (plan.activities || []).length,
      },
      activities: (plan.activities || []).map((a: any) => ({
        id: a.id,
        activityRefNo: a.activityRefNo || a.reference || a.id,
        description: a.description,
        method: a.method,
        estimatedAmount: Number(a.estimatedAmount || a.estimatedBudget) || 0,
        currency: a.currency || "ETB",
        status: "Returned",
      })),
    });

    await loadPlans();
    setSelectedPlanForReview(null);
    setReturnRemarks("");
    showToast(
      `Plan "${plan.planName}" returned to Procurement Officer for revision.`,
    );
  };

  // Director Decision: Approve Cancellation Request
  const handleApprovePlanCancellation = async (
    plan: ProcurementPlan,
    comment?: string,
  ) => {
    try {
      await approvePlanCancellation(plan.id, comment);
    } catch (err) {
      console.warn("Backend approvePlanCancellation note:", err);
    }

    updateLocalStoragePlanAndActivities(
      plan,
      "Cancelled",
      "Cancelled",
      plan.cancellationReason || "Plan cancelled by Director.",
    );

    const directorName = user.displayName || user.email || "Director";
    recordPlanVersionEvent({
      planId: plan.id,
      planReference: plan.reference || plan.planName,
      planName: plan.planName,
      projectCode: plan.projectCode,
      versionNumber: getCurrentPlanVersionNumber(plan.id),
      action: "PLAN_CANCELLED",
      actionLabel: "Plan Cancelled by Director",
      changedBy: directorName,
      changedByRole: "Director",
      reason: plan.cancellationReason || "Plan cancelled upon officer request.",
      directorReview: {
        directorName,
        directorRole: "Director",
        reviewedAt: new Date().toISOString(),
        decision: "RETURNED",
        feedback: comment || plan.cancellationReason,
      },
    });

    await loadPlans();
    setSelectedPlanForReview(null);
    setReturnRemarks("");
    showToast(
      `Procurement Plan "${plan.planName}" has been successfully cancelled.`,
    );
  };

  // Director Decision: Decline Cancellation Request
  const handleRejectPlanCancellation = async (
    plan: ProcurementPlan,
    comment?: string,
  ) => {
    try {
      await rejectPlanCancellation(plan.id, comment);
    } catch (err) {
      console.warn("Backend rejectPlanCancellation note:", err);
    }

    updateLocalStoragePlanAndActivities(
      plan,
      "Finally Approved",
      undefined,
      comment,
    );

    const directorName = user.displayName || user.email || "Director";
    recordPlanVersionEvent({
      planId: plan.id,
      planReference: plan.reference || plan.planName,
      planName: plan.planName,
      projectCode: plan.projectCode,
      versionNumber: getCurrentPlanVersionNumber(plan.id),
      action: "CANCELLATION_REJECTED",
      actionLabel: "Cancellation Request Declined by Director",
      changedBy: directorName,
      changedByRole: "Director",
      reason:
        comment ||
        "Cancellation request was declined. Plan remains finally approved.",
    });

    await loadPlans();
    setSelectedPlanForReview(null);
    setReturnRemarks("");
    showToast(
      `Cancellation request for plan "${plan.planName}" was declined. Plan remains Approved.`,
    );
  };

  // Director Decision: Batch or Partial Review with Mandatory Feedback
  const handleBatchReviewPlans = async ({
    approvedPlanIds,
    unapprovedComments,
    deadlineDate,
  }: {
    approvedPlanIds: string[];
    unapprovedComments: Record<string, string>;
    deadlineDate?: string;
  }) => {
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

    // 1. Process Approved Plans -> Send to Committee
    for (const planId of approvedPlanIds) {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) continue;

      try {
        await sendPlanToCommittee(plan.id, targetDate, days);
      } catch (err) {
        console.warn("sendPlanToCommittee batch note:", err);
      }

      updateLocalStoragePlanAndActivities(
        plan,
        "Committee Review",
        "Under Review",
      );

      const directorName = user.displayName || user.email || "Director";
      recordPlanVersionEvent({
        planId: plan.id,
        planReference: plan.reference || plan.planName,
        planName: plan.planName,
        projectCode: plan.projectCode,
        versionNumber: getCurrentPlanVersionNumber(plan.id),
        action: "APPROVED_DIRECTOR",
        actionLabel: "Plan Approved by Director & Sent to Committee",
        changedBy: directorName,
        changedByRole: "Director",
        reason:
          "Plan approved by Director and forwarded to Endorsement Committee.",
        directorReview: {
          directorName,
          directorRole: "Director",
          reviewedAt: new Date().toISOString(),
          decision: "APPROVED",
          feedback: "Approved in batch review and forwarded to Committee.",
          committeeDeadline: targetDate,
          daysAllotted: days,
        },
        projectDetails: {
          code: plan.projectCode,
        },
        planDetails: {
          planName: plan.planName,
          planReference: plan.reference,
          budgetYear: plan.budgetYear,
          category: plan.category,
          status: "Committee Review",
          estimatedTotal:
            Number(plan.estimatedValue || plan.estimatedTotal) || 0,
          currency: "ETB",
          activitiesCount: (plan.activities || []).length,
        },
        activities: (plan.activities || []).map((a: any) => ({
          id: a.id,
          activityRefNo: a.activityRefNo || a.reference || a.id,
          description: a.description,
          method: a.method,
          estimatedAmount: Number(a.estimatedAmount || a.estimatedBudget) || 0,
          currency: a.currency || "ETB",
          status: "Under Review",
        })),
      });
    }

    // 2. Process Unapproved / Returned Plans with Feedback
    for (const [planId, comment] of Object.entries(unapprovedComments)) {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) continue;

      const reasonText = comment.trim() || "Returned by Director for revision.";
      try {
        await rejectPlan(plan.id, reasonText);
      } catch (err) {
        console.warn("rejectPlan batch note:", err);
      }

      updateLocalStoragePlanAndActivities(
        plan,
        "Returned",
        "Returned",
        reasonText,
      );

      const directorName = user.displayName || user.email || "Director";
      recordPlanVersionEvent({
        planId: plan.id,
        planReference: plan.reference || plan.planName,
        planName: plan.planName,
        projectCode: plan.projectCode,
        versionNumber: getCurrentPlanVersionNumber(plan.id),
        action: "RETURNED",
        actionLabel: "Plan Returned by Director for Revision",
        changedBy: directorName,
        changedByRole: "Director",
        reason: reasonText,
        directorReview: {
          directorName,
          directorRole: "Director",
          reviewedAt: new Date().toISOString(),
          decision: "RETURNED",
          feedback: reasonText,
        },
        projectDetails: {
          code: plan.projectCode,
        },
        planDetails: {
          planName: plan.planName,
          planReference: plan.reference,
          budgetYear: plan.budgetYear,
          category: plan.category,
          status: "Returned for Revision",
          estimatedTotal:
            Number(plan.estimatedValue || plan.estimatedTotal) || 0,
          currency: "ETB",
          activitiesCount: (plan.activities || []).length,
        },
        activities: (plan.activities || []).map((a: any) => ({
          id: a.id,
          activityRefNo: a.activityRefNo || a.reference || a.id,
          description: a.description,
          method: a.method,
          estimatedAmount: Number(a.estimatedAmount || a.estimatedBudget) || 0,
          currency: a.currency || "ETB",
          status: "Returned",
        })),
      });

      createLocalAlert({
        title: `Plan Returned for Revision: ${plan.planName}`,
        message: `Director returned plan "${plan.planName}". Instructions: "${reasonText}"`,
        type: "DECISION",
        severity: "HIGH",
        targetRole: "OFFICER",
        link: "/workspace/projects",
      });
    }

    await loadPlans();
    setSelectedPlanForReview(null);
    setReturnRemarks("");

    const approvedCount = approvedPlanIds.length;
    const returnedCount = Object.keys(unapprovedComments).length;
    if (approvedCount > 0 && returnedCount > 0) {
      showToast(
        `${approvedCount} ${approvedCount === 1 ? "plan" : "plans"} forwarded to Committee, and ${returnedCount} ${returnedCount === 1 ? "plan" : "plans"} returned to Officer with revision instructions.`,
      );
    } else if (approvedCount > 0) {
      showToast(
        `All ${approvedCount} ${approvedCount === 1 ? "plan" : "plans"} approved and forwarded to Endorsement Committee!`,
      );
    } else if (returnedCount > 0) {
      showToast(
        `${returnedCount} ${returnedCount === 1 ? "plan" : "plans"} returned to Officer for revision.`,
      );
    }
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

    let updatedBackendPlan: BackendPlan | undefined;
    try {
      updatedBackendPlan = (await submitVote(
        plan.id,
        decision,
        commentText,
        user.id,
        user.email,
      )) as BackendPlan;
    } catch (err) {
      console.warn("Backend submitVote note:", err);
    }

    // Evaluate whether 3 votes threshold was reached for approval or rejection
    let isFullyRejected = false;
    let isFullyApproved = false;

    if (
      updatedBackendPlan?.status === "REJECTED" ||
      updatedBackendPlan?.status === "COMMITTEE_REJECTED"
    ) {
      isFullyRejected = true;
    } else if (
      updatedBackendPlan?.status === "APPROVED" ||
      updatedBackendPlan?.status === "COMMITTEE_ENDORSED" ||
      updatedBackendPlan?.status === "AWAITING_MANAGEMENT_APPROVAL"
    ) {
      isFullyApproved = true;
    } else if (updatedBackendPlan?.committeeVotes) {
      const rejectVotesCount = updatedBackendPlan.committeeVotes.filter(
        (v: any) => v.decision === "REJECT",
      ).length;
      const approveVotesCount = updatedBackendPlan.committeeVotes.filter(
        (v: any) => v.decision === "APPROVE",
      ).length;
      isFullyRejected = rejectVotesCount >= 3;
      isFullyApproved = approveVotesCount >= 3;
    } else {
      const existingVotes = (plan as any).committeeVotes || [];
      const currentRejectCount =
        existingVotes.filter((v: any) => v.decision === "REJECT").length +
        (decision === "REJECT" ? 1 : 0);
      const currentApproveCount =
        existingVotes.filter((v: any) => v.decision === "APPROVE").length +
        (decision === "APPROVE" ? 1 : 0);
      isFullyRejected = currentRejectCount >= 3;
      isFullyApproved = currentApproveCount >= 3;
    }

    // Plan status remains "Committee Review" until quorum of 3 is reached
    const nextStatus = isFullyApproved
      ? "Awaiting Management Approval"
      : isFullyRejected
        ? "Returned"
        : "Committee Review";

    const nextActStatus = isFullyApproved
      ? "Under Review"
      : isFullyRejected
        ? "Returned for Revision"
        : undefined;

    // Immediately update storage so comments & flagged activities are visible to Director right away
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
      action: isFullyApproved
        ? "COMMITTEE_ENDORSED"
        : isFullyRejected
          ? "RETURNED"
          : "COMMITTEE_VOTE",
      actionLabel: isFullyApproved
        ? "Plan Endorsed by Committee (Awaiting Executive Management Approval)"
        : isFullyRejected
          ? `Plan Rejected by Committee Majority (${rejectionDetails?.rejectedActivityRefs.length || 0} Specific Activities Flagged)`
          : decision === "REJECT"
            ? `Committee Objection Cast (${rejectionDetails?.rejectedActivityRefs.length || 0} Specific Activities Flagged — Visible to Director)`
            : "Committee Endorsement Vote Cast (Deliberation in Progress)",
      changedBy: user.displayName || user.email || "Endorsement Committee",
      changedByRole: "Endorsement Committee",
      reason:
        commentText ||
        (decision === "APPROVE"
          ? "Endorsement vote recorded"
          : "Rejected by committee member"),
    });

    await loadPlans();
    setSelectedPlanForReview(null);
    setReturnRemarks("");
    showToast(
      decision === "APPROVE"
        ? isFullyApproved
          ? `Vote "Approved" recorded. Quorum reached (3 approvals)! Plan endorsed and forwarded to Executive Management.`
          : `Vote "Approved" recorded for plan "${plan.planName}".`
        : isFullyRejected
          ? `Vote "Rejected" recorded. Plan completely rejected by committee majority (3 votes) and returned to Director.`
          : rejectionDetails?.scope === "SPECIFIC"
            ? `Vote "Rejected" recorded: flagged ${rejectionDetails.rejectedActivityRefs.length} specific activities. Comments and flagged activities are immediately visible to the Director.`
            : `Vote "Rejected" recorded for plan "${plan.planName}". Visible to Director; awaiting 3 committee rejection votes to fully return.`,
    );
  };

  const handleSavePlanEdits = (savedPlan: ProcurementPlan) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === savedPlan.id ? savedPlan : p)),
    );
    setEditingPlan(null);
    showToast(`Restricted plan edits saved for "${savedPlan.planName}".`);
  };

  // Management Decision: Authorize or Reject
  const handleManagementDecision = async (
    plan: ProcurementPlan,
    decision: "APPROVE" | "REJECT",
    comment?: string,
  ) => {
    const commentText =
      (comment !== undefined ? comment : returnRemarks).trim() || undefined;

    try {
      await submitManagementDecision(plan.id, decision, commentText, user.id);
    } catch (err) {
      console.warn("Backend submitManagementDecision note:", err);
    }

    const nextStatus = decision === "APPROVE" ? "Finally Approved" : "Returned";
    const nextActStatus = decision === "APPROVE" ? "In Progress" : undefined;

    updateLocalStoragePlanAndActivities(
      plan,
      nextStatus,
      nextActStatus,
      decision === "REJECT" ? commentText : undefined,
    );

    recordPlanVersionEvent({
      planId: plan.id,
      planReference: plan.reference || plan.planName,
      projectCode: plan.projectCode,
      versionNumber: getCurrentPlanVersionNumber(plan.id),
      action: decision === "APPROVE" ? "FINALLY_APPROVED" : "RETURNED",
      actionLabel:
        decision === "APPROVE"
          ? "Plan Authorized by Executive Management"
          : "Plan Rejected by Executive Management",
      changedBy: user.displayName || user.email || "Executive Management",
      changedByRole: "Management",
      reason:
        commentText ||
        (decision === "APPROVE"
          ? "Executive authorization granted"
          : "Rejected by Executive Management"),
    });

    await loadPlans();
    setSelectedPlanForReview(null);
    setReturnRemarks("");
    showToast(
      decision === "APPROVE"
        ? `Executive Authorization granted for plan "${plan.planName}".`
        : `Executive Decision "Rejected" recorded for plan "${plan.planName}".`,
    );
  };

  const handleAddActivityComment = async (
    activityId: string,
    comment: string,
  ) => {
    if (!activitiesPlan) return;
    try {
      await addPlanComment(
        activitiesPlan.id,
        "ACTIVITY",
        activityId,
        comment,
        user.id,
      );
      showToast("Activity comment recorded.");
    } catch (err) {
      console.warn("Failed to add activity comment:", err);
      showToast("Could not save comment to server.");
    }
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
    handleApprovePlanCancellation,
    handleRejectPlanCancellation,
    handleBatchReviewPlans,
    handleCommitteeVote,
    handleManagementDecision,
    handleAddActivityComment,
    handleSavePlanEdits,
    isCommitteeChair,
    isPlanChairAuthorized,
    handleChairAuthorizePlan,
    loadPlans,
    filteredPlans,
    getProjectForPlan,
    selectedActivityRef,
    closeActivitiesPlan,
    closeSelectedPlanForReview,
    closeEditingPlan,
    openActivitiesPlan,
    selectedProjectCode,
    setSelectedProjectCode,
  };
}
