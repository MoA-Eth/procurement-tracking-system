"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Home,
  ChevronRight,
  ArrowLeft,
  FileText,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Eye,
  ListChecks,
  Clock,
  Building2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchPlans, mapBackendPlanToFrontend } from "../../../lib/plansApi";
import { fetchActivities } from "../../../lib/activitiesApi";
import {
  parseSavedActivityRecords,
  OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
} from "@/features/projects/data/officerActivityDrafts";
import type { AuthUser } from "../../../lib/authTypes";
import { parseRejectionDetails, type ProcurementPlan } from "../plansData";
import { DirectorActivitiesListView } from "../../activities/components/DirectorActivitiesListView";

interface MyDecisionsViewProps {
  user: AuthUser;
  initialSelectedPlan?: ProcurementPlan;
  initialFullPlanTracker?: boolean;
}

export function MyDecisionsView({
  user,
  initialSelectedPlan,
  initialFullPlanTracker,
}: MyDecisionsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdFromUrl = searchParams
    ? searchParams.get("planId") || searchParams.get("plan")
    : null;

  // Track if user explicitly closed the plan view so auto-open doesn't immediately re-open it
  const dismissedPlanIdRef = useRef<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [plans, setPlans] = useState<ProcurementPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected plan for detailed decision view
  const [selectedPlan, setSelectedPlan] = useState<ProcurementPlan | null>(
    initialSelectedPlan || null,
  );
  // Full activities tracker inspection modal/view state
  const [isFullPlanTrackerOpen, setIsFullPlanTrackerOpen] = useState(
    initialFullPlanTracker || false,
  );
  const [targetActivityForTracker, setTargetActivityForTracker] = useState<
    string | null
  >(() => {
    if (
      initialFullPlanTracker &&
      initialSelectedPlan?.rejectedActivityRefs?.length
    ) {
      return initialSelectedPlan.rejectedActivityRefs[0];
    }
    return null;
  });
  const [autoOpenTrackerDetail, setAutoOpenTrackerDetail] = useState(false);
  const [planActivities, setPlanActivities] = useState<any[]>(() => {
    if (
      initialSelectedPlan?.activities &&
      initialSelectedPlan.activities.length > 0
    ) {
      return initialSelectedPlan.activities;
    }
    return [];
  });
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Load plans
  useEffect(() => {
    async function loadPlans() {
      setLoading(true);
      try {
        const rawPlans = await fetchPlans();
        const mapped = rawPlans.map((p) =>
          mapBackendPlanToFrontend(p, user.id, user.email),
        );
        setPlans(mapped);
      } catch (err) {
        console.error("Failed to load decisions:", err);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, [user.id, user.email]);

  // Handle URL planId param synchronization
  useEffect(() => {
    if (
      planIdFromUrl &&
      plans.length > 0 &&
      !selectedPlan &&
      dismissedPlanIdRef.current !== planIdFromUrl
    ) {
      const match = plans.find(
        (p) =>
          p.id === planIdFromUrl ||
          p.reference?.toLowerCase() === planIdFromUrl.toLowerCase() ||
          p.planName?.toLowerCase().includes(planIdFromUrl.toLowerCase()),
      );
      if (match) {
        setSelectedPlan(match);
      }
    }
  }, [planIdFromUrl, plans, selectedPlan]);

  // Listen to browser popstate (browser back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const planParam = urlParams.get("planId") || urlParams.get("plan");
      if (!planParam) {
        dismissedPlanIdRef.current = "dismissed";
        setSelectedPlan(null);
        setIsFullPlanTrackerOpen(false);
        setTargetActivityForTracker(null);
        setAutoOpenTrackerDetail(false);
      } else if (plans.length > 0) {
        const match = plans.find(
          (p) =>
            p.id === planParam ||
            p.reference?.toLowerCase() === planParam.toLowerCase() ||
            p.planName?.toLowerCase().includes(planParam.toLowerCase()),
        );
        if (match) {
          dismissedPlanIdRef.current = null;
          setSelectedPlan(match);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [plans]);

  // Listen to sidebar reset event
  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ href?: string }>;
      if (
        !customEvent.detail?.href ||
        customEvent.detail.href === "/workspace/my-decisions"
      ) {
        dismissedPlanIdRef.current = "dismissed";
        setSelectedPlan(null);
        setIsFullPlanTrackerOpen(false);
        setTargetActivityForTracker(null);
        setAutoOpenTrackerDetail(false);
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", "/workspace/my-decisions");
        }
        router.replace("/workspace/my-decisions", { scroll: false });
      }
    };

    window.addEventListener("pts:sidebar-reset", handleReset);
    return () => window.removeEventListener("pts:sidebar-reset", handleReset);
  }, [router]);

  // Filter plans to only those the current user has made a decision on
  const votedPlans = useMemo(() => {
    return plans.filter((p) => p.committeeDecision !== undefined);
  }, [plans]);

  // Load full activities for the selected plan
  useEffect(() => {
    if (!selectedPlan) {
      setPlanActivities([]);
      return;
    }

    let isMounted = true;
    async function loadActivitiesForSelectedPlan() {
      setLoadingActivities(true);
      try {
        const cleanPlanId = selectedPlan?.id || "";
        const [planBackendActs, allBackendActs] = await Promise.all([
          fetchActivities(cleanPlanId).catch(() => []),
          fetchActivities().catch(() => []),
        ]);

        const isDuplicateAct = (a: any, b: any) => {
          const norm = (s?: string) => (s || "").trim().toLowerCase();
          const aId = norm(a.id);
          const bId = norm(b.id);
          const aRef = norm(a.reference || a.activityRefNo);
          const bRef = norm(b.reference || b.activityRefNo);
          if (aId && bId && aId === bId) return true;
          if (aRef && bRef && aRef === bRef) return true;

          const aDesc = norm(a.description);
          const bDesc = norm(b.description);
          if (aDesc && bDesc && aDesc === bDesc) {
            const aAmt = Number(a.estimatedBudget || a.estimatedAmount) || 0;
            const bAmt = Number(b.estimatedBudget || b.estimatedAmount) || 0;
            if (aAmt === bAmt || Math.abs(aAmt - bAmt) < 1) return true;
          }
          return false;
        };

        const combined = [...planBackendActs];
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
          if (
            (baPlanId &&
              (baPlanId === cleanPlanId.toLowerCase().trim() ||
                cleanPlanId.includes(baPlanId))) ||
            (baPlanTitle &&
              selectedPlan?.planName &&
              selectedPlan.planName.toLowerCase().includes(baPlanTitle))
          ) {
            const existingIdx = combined.findIndex((x) =>
              isDuplicateAct(x, ba),
            );
            if (existingIdx === -1) {
              combined.push(ba);
            } else {
              combined[existingIdx] = { ...combined[existingIdx], ...ba };
            }
          }
        }

        // Also merge local storage draft activities
        if (typeof window !== "undefined" && selectedPlan) {
          try {
            const rawDrafts = localStorage.getItem(
              OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
            );
            if (rawDrafts) {
              const drafts = parseSavedActivityRecords(rawDrafts);
              for (const d of drafts) {
                const draftPlanRef = (d.planReference || "")
                  .toLowerCase()
                  .trim();
                const planRef = (
                  selectedPlan.reference ||
                  selectedPlan.planName ||
                  ""
                )
                  .toLowerCase()
                  .trim();
                const planId = (selectedPlan.id || "").toLowerCase().trim();
                if (
                  draftPlanRef &&
                  (draftPlanRef === planRef ||
                    draftPlanRef === planId ||
                    (selectedPlan.planName &&
                      draftPlanRef ===
                        selectedPlan.planName.toLowerCase().trim()) ||
                    (selectedPlan.reference &&
                      draftPlanRef ===
                        selectedPlan.reference.toLowerCase().trim()))
                ) {
                  const act = d.activity;
                  if (act) {
                    const newAct = {
                      id: act.id || `draft-${Date.now()}`,
                      reference: act.reference,
                      description: act.description,
                      estimatedBudget: act.estimatedAmount || 0,
                      currency:
                        act.details?.form?.currency ||
                        selectedPlan.currency ||
                        "ETB",
                      procurementMethod: {
                        label: act.method || "National Competitive Bidding",
                        code: (act as any).methodCode || "NCB",
                      },
                      reviewType: act.details?.form?.reviewType || "Post",
                      stages: act.details?.roadmap || [],
                    } as any;

                    const existingIdx = combined.findIndex((x) =>
                      isDuplicateAct(x, newAct),
                    );
                    if (existingIdx === -1) {
                      combined.push(newAct);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Error reading drafts for my decisions:", e);
          }
        }

        // If backend acts found, use them
        if (combined.length > 0) {
          const normalized = combined.map((act) => ({
            id: act.id,
            activityRefNo:
              act.reference ||
              (act as any).activityRefNo ||
              `ACT-${act.id.slice(0, 4)}`,
            description: act.description || "Procurement activity",
            method:
              act.procurementMethod?.label ||
              act.procurementMethod?.code ||
              (act as any).method ||
              "NCB",
            marketApproach: (act as any).marketApproach || "Open - National",
            reviewType: act.reviewType || (act as any).reviewType || "Post",
            currency: act.currency || selectedPlan?.currency || "ETB",
            estimatedAmount:
              act.estimatedBudget || (act as any).estimatedAmount || 0,
            roadmap: act.stages || (act as any).roadmap || [],
          }));
          if (isMounted) setPlanActivities(normalized);
        } else if (
          selectedPlan &&
          selectedPlan.activities &&
          selectedPlan.activities.length > 0
        ) {
          const normalized = selectedPlan.activities.map((act) => ({
            id: act.id,
            activityRefNo:
              act.activityRefNo || act.reference || `ACT-${act.id.slice(0, 4)}`,
            description: act.description || "Procurement activity",
            method: act.method || act.procurementMethod?.label || "NCB",
            marketApproach: act.marketApproach || "Open - National",
            reviewType: act.reviewType || "Post",
            currency: act.currency || selectedPlan.currency || "ETB",
            estimatedAmount: act.estimatedAmount || act.estimatedBudget || 0,
            roadmap: act.roadmap || act.stages || [],
          }));
          if (isMounted) setPlanActivities(normalized);
        } else {
          if (isMounted) setPlanActivities([]);
        }
      } catch (err) {
        console.warn("Could not load full activities in MyDecisionsView:", err);
        if (isMounted && selectedPlan?.activities) {
          setPlanActivities(selectedPlan.activities);
        }
      } finally {
        if (isMounted) setLoadingActivities(false);
      }
    }

    loadActivitiesForSelectedPlan();
    return () => {
      isMounted = false;
    };
  }, [selectedPlan]);

  const handleSelectPlan = useCallback(
    (plan: ProcurementPlan) => {
      dismissedPlanIdRef.current = null;
      setSelectedPlan(plan);
      setIsFullPlanTrackerOpen(false);
      setTargetActivityForTracker(null);
      setAutoOpenTrackerDetail(false);
      const url = `/workspace/my-decisions?planId=${encodeURIComponent(plan.id)}`;
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", url);
      }
      router.push(url, { scroll: false });
    },
    [router],
  );

  const handleBackToList = useCallback(() => {
    const currentId = selectedPlan?.id || planIdFromUrl || "dismissed";
    dismissedPlanIdRef.current = currentId;
    setSelectedPlan(null);
    setIsFullPlanTrackerOpen(false);
    setTargetActivityForTracker(null);
    setAutoOpenTrackerDetail(false);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/workspace/my-decisions");
    }
    router.replace("/workspace/my-decisions", { scroll: false });
  }, [selectedPlan, planIdFromUrl, router]);

  // Filtered decisions for the table
  const filteredDecisions = useMemo(() => {
    return votedPlans.filter((p) => {
      const matchesSearch =
        p.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.reference &&
          p.reference.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDecision =
        decisionFilter === "ALL" ||
        (p.committeeDecision &&
          p.committeeDecision.toUpperCase() === decisionFilter);

      const matchesProject =
        projectFilter === "ALL" ||
        p.projectCode.toUpperCase().includes(projectFilter.toUpperCase());

      return matchesSearch && matchesDecision && matchesProject;
    });
  }, [votedPlans, searchQuery, decisionFilter, projectFilter]);

  const parsedRejection = useMemo(() => {
    if (!selectedPlan)
      return {
        scope: "ALL" as const,
        rejectedActivityRefs: [],
        cleanRemarks: "",
      };
    const fromReason = parseRejectionDetails(selectedPlan.rejectionReason);
    const scope =
      selectedPlan.rejectionScope ||
      (selectedPlan.rejectedActivityRefs &&
      selectedPlan.rejectedActivityRefs.length > 0
        ? "SPECIFIC"
        : fromReason.scope);
    const rejectedActivityRefs = Array.from(
      new Set([
        ...fromReason.rejectedActivityRefs,
        ...(selectedPlan.rejectedActivityRefs || []),
      ]),
    );
    return {
      scope,
      rejectedActivityRefs,
      cleanRemarks:
        fromReason.cleanRemarks || selectedPlan.rejectionReason || "",
    };
  }, [selectedPlan]);

  const handleOpenFullActivitiesTracker = useCallback(() => {
    // If specific activities were flagged during rejection, target the first flagged activity (shows 'Targeted' badge like in user screenshot)
    const firstFlaggedRef =
      parsedRejection.scope === "SPECIFIC" &&
      parsedRejection.rejectedActivityRefs &&
      parsedRejection.rejectedActivityRefs.length > 0
        ? parsedRejection.rejectedActivityRefs[0]
        : null;

    setTargetActivityForTracker(firstFlaggedRef);
    setAutoOpenTrackerDetail(false); // Render full plan activities table directory!
    setIsFullPlanTrackerOpen(true);
  }, [parsedRejection]);

  const handleOpenFlaggedActivityInTracker = useCallback((ref: string) => {
    setTargetActivityForTracker(ref);
    setAutoOpenTrackerDetail(false); // Target and scroll to that flagged activity in the full plan table!
    setIsFullPlanTrackerOpen(true);
  }, []);

  const handleInspectSpecificActivity = useCallback((actRef: string) => {
    setTargetActivityForTracker(actRef);
    setAutoOpenTrackerDetail(true); // Open directly into that activity's 4-step stepper view!
    setIsFullPlanTrackerOpen(true);
  }, []);

  const isActivityFlagged = useCallback(
    (act: any) => {
      if (parsedRejection.scope === "ALL") return true;
      if (parsedRejection.scope !== "SPECIFIC") return false;
      const actRef = (act.activityRefNo || "").toLowerCase().trim();
      const actId = (act.id || "").toLowerCase().trim();
      const actRawRef = ((act as any).reference || "").toLowerCase().trim();
      return (
        parsedRejection.rejectedActivityRefs.some((r: string) => {
          const cleanR = r.toLowerCase().trim();
          return (
            (cleanR &&
              (cleanR === actRef ||
                cleanR === actId ||
                (actRawRef && cleanR === actRawRef))) ||
            (actRef && actRef.includes(cleanR))
          );
        }) ||
        (selectedPlan?.rejectedActivityIds &&
          selectedPlan.rejectedActivityIds.some((id: string) => {
            const cleanId = id.toLowerCase().trim();
            return (
              cleanId === actId ||
              cleanId === actRef ||
              (actRawRef && cleanId === actRawRef)
            );
          }))
      );
    },
    [parsedRejection, selectedPlan?.rejectedActivityIds],
  );

  // In the decision inspection view, only display the flagged activities for rejections, and nothing for accepted plans
  const displayedActivities = useMemo(() => {
    if (selectedPlan?.committeeDecision !== "Rejected") return [];
    if (parsedRejection.scope === "SPECIFIC") {
      return planActivities.filter((act) => isActivityFlagged(act));
    }
    return planActivities;
  }, [
    selectedPlan?.committeeDecision,
    parsedRejection.scope,
    planActivities,
    isActivityFlagged,
  ]);

  // Compute status badge style
  const getOverallStatusStyle = (status: string) => {
    if (status === "Finally Approved" || status === "Approved") {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    if (
      status === "Returned" ||
      status === "Returned for Revision" ||
      status === "Committee Rejected" ||
      status === "Management Rejected"
    ) {
      return "bg-rose-50 text-rose-800 border-rose-200";
    }
    if (
      status === "Awaiting Management Approval" ||
      status === "Committee Endorsed"
    ) {
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    }
    return "bg-amber-50 text-amber-800 border-amber-200";
  };

  const activeProject = useMemo(() => {
    if (!selectedPlan) return undefined;
    return {
      id: selectedPlan.projectCode,
      code: selectedPlan.projectCode,
      name: selectedPlan.projectName,
      shortName: selectedPlan.projectCode,
      activePlans: 1,
      assignedOfficers: [],
      availableOrganizationRegions: [],
      baseCurrency: selectedPlan.currency || "ETB",
      countryOrganisation: "Ethiopia",
      executingAgency: "Ministry of Agriculture",
      fundingSource: "World Bank",
      fundingType: "Loan / Grant",
      organizationRegion: "Federal",
      plans: [],
      status: "Active" as const,
    };
  }, [selectedPlan]);

  // CANONICAL FULL PLAN & ACTIVITY TRACKER VIEW
  if (isFullPlanTrackerOpen && selectedPlan && activeProject) {
    return (
      <DirectorActivitiesListView
        plan={{
          ...selectedPlan,
          activities:
            planActivities.length > 0
              ? planActivities
              : selectedPlan.activities,
        }}
        project={activeProject}
        parentSection="my-decisions"
        from="my-decisions"
        userRole={user.role}
        targetActivityRef={targetActivityForTracker || undefined}
        autoOpenDetail={autoOpenTrackerDetail}
        onBackClick={() => {
          setIsFullPlanTrackerOpen(false);
          setTargetActivityForTracker(null);
          setAutoOpenTrackerDetail(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* BREADCRUMB NAVIGATION */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <button
          onClick={handleBackToList}
          className={`transition-colors cursor-pointer ${
            selectedPlan
              ? "text-slate-500 hover:text-slate-900"
              : "font-bold text-[#0A3C2F]"
          }`}
        >
          My Decisions
        </button>
        {selectedPlan && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-[#0A3C2F] truncate max-w-xs sm:max-w-md">
              Decision: {selectedPlan.planName}
            </span>
          </>
        )}
      </nav>

      {/* VIEW 1: DETAILED DECISION INSPECTION VIEW */}
      {selectedPlan ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Context Card */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-2">
                <button
                  onClick={handleBackToList}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A3C2F] hover:underline cursor-pointer mb-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to My Decisions List
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedPlan.reference || selectedPlan.planName}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-[#0A3C2F] border border-emerald-200">
                    {selectedPlan.category}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
                  {selectedPlan.planName}
                </h1>
              </div>

              {/* Badges: My Vote & Overall Status */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full border shadow-3xs ${
                    selectedPlan.committeeDecision === "Approved"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {selectedPlan.committeeDecision === "Approved" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600" />
                  )}
                  My Vote:{" "}
                  {selectedPlan.committeeDecision === "Approved"
                    ? "Endorsed & Approved"
                    : "Rejected / Returned"}
                </span>

                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getOverallStatusStyle(
                    selectedPlan.status,
                  )}`}
                >
                  Plan Status: {selectedPlan.status}
                </span>

                <button
                  type="button"
                  onClick={handleOpenFullActivitiesTracker}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-2xs transition-colors cursor-pointer mt-0.5"
                  title="Inspect Full Activities Tracker"
                >
                  <ListChecks className="h-3.5 w-3.5 text-[#A3E635]" />
                  <span>Inspect Full Activities Tracker</span>
                </button>
              </div>
            </div>

            {/* Plan Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-600 pt-1">
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">
                  Project:
                </span>
                <strong className="text-slate-900 font-bold mt-0.5 block">
                  {selectedPlan.projectName} ({selectedPlan.projectCode})
                </strong>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">
                  Budget Year:
                </span>
                <strong className="text-slate-900 font-bold mt-0.5 block">
                  {selectedPlan.budgetYear}
                </strong>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">
                  Total Estimated Value:
                </span>
                <strong className="text-[#0A3C2F] font-mono font-extrabold text-sm mt-0.5 block">
                  {selectedPlan.currency || "ETB"}{" "}
                  {(selectedPlan.estimatedValue || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">
                  Date My Vote Recorded:
                </span>
                <strong className="text-slate-900 font-bold mt-0.5 block">
                  {selectedPlan.decisionRecordedDate || "Recent"}
                </strong>
              </div>
            </div>

            {/* Directorate Justification / Plan Description */}
            {selectedPlan.description && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Directorate Justification &amp; Overview
                </span>
                <p className="text-xs text-slate-700 italic leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                  &ldquo;{selectedPlan.description}&rdquo;
                </p>
              </div>
            )}
          </section>

          {/* TWO-CARD DECISION & QUORUM GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: My Deliberation & Voting Record */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="h-5 w-5 text-[#0A3C2F]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    My Deliberation &amp; Voting Record
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Official feedback submitted during Endorsement Committee
                    review.
                  </p>
                </div>
              </div>

              {selectedPlan.committeeDecision === "Rejected" ? (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      Rejection Scope:
                    </span>
                    {parsedRejection.scope === "SPECIFIC" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-50 text-amber-900 border border-amber-300">
                        <AlertTriangle className="h-3 w-3 text-amber-700" />
                        Specific Defective Activities Flagged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-50 text-rose-800 border border-rose-300">
                        <AlertCircle className="h-3 w-3 text-rose-600" />
                        Entire Plan Package Rejection
                      </span>
                    )}
                  </div>

                  {/* Flagged Activities List Pills */}
                  {parsedRejection.scope === "SPECIFIC" &&
                    parsedRejection.rejectedActivityRefs.length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-900 block">
                          Flagged Activities (
                          {parsedRejection.rejectedActivityRefs.length}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {parsedRejection.rejectedActivityRefs.map((ref) => (
                            <button
                              key={ref}
                              type="button"
                              onClick={() =>
                                handleOpenFlaggedActivityInTracker(ref)
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200 transition-colors cursor-pointer shadow-3xs"
                              title="Inspect this flagged activity in full tracker"
                            >
                              <AlertTriangle className="h-3 w-3 text-rose-700" />
                              <span>{ref}</span>
                              <span className="text-[10px] text-rose-600 underline font-sans ml-1">
                                Open ↗
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Deliberation Notes / Feedback Text */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      Deliberation Feedback &amp; Directives:
                    </span>
                    <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 text-xs text-slate-800 font-medium leading-relaxed italic break-words break-all [overflow-wrap:anywhere]">
                      &ldquo;
                      {parsedRejection.cleanRemarks ||
                        selectedPlan.rejectionReason ||
                        "No specific feedback text recorded."}
                      &rdquo;
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2 text-xs text-emerald-950">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Plan Endorsed &amp; Approved</span>
                  </div>
                  <p className="leading-relaxed">
                    You recorded an affirmative vote to endorse this procurement
                    plan without reservation.
                  </p>
                  {selectedPlan.rejectionReason && (
                    <div className="pt-2 border-t border-emerald-200/60">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-0.5">
                        Approval Remarks:
                      </span>
                      <p className="italic text-slate-700 break-words break-all [overflow-wrap:anywhere]">
                        &ldquo;{selectedPlan.rejectionReason}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Card 2: Consensus & Quorum Status */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Users className="h-5 w-5 text-[#0A3C2F]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Consensus &amp; Quorum Status
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Requires at least 3 of 5 approvals to endorse to Executive
                    Management.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Committee Voting Progress</span>
                  <span>
                    {selectedPlan.progressText || "Voting in progress"}
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#0A3C2F] h-full rounded-full transition-all duration-500"
                    style={{ width: `${selectedPlan.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Executive Management Status (if reached) */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-700" />
                  <span className="text-xs font-bold text-slate-900">
                    Executive Management Stage:
                  </span>
                </div>

                {selectedPlan.managementDecision ? (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      selectedPlan.managementDecision === "Approved"
                        ? "bg-indigo-50/70 border-indigo-200 text-indigo-950"
                        : "bg-rose-50/70 border-rose-200 text-rose-950"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="font-extrabold">
                        Management Decision: {selectedPlan.managementDecision}
                      </strong>
                      {selectedPlan.managementAt && (
                        <span className="text-[10px] text-slate-500">
                          {selectedPlan.managementAt}
                        </span>
                      )}
                    </div>
                    {selectedPlan.managementComment && (
                      <p className="italic text-slate-700">
                        &ldquo;{selectedPlan.managementComment}&rdquo;
                      </p>
                    )}
                    {selectedPlan.managementByName && (
                      <span className="text-[10px] text-slate-500 block">
                        Decided by: {selectedPlan.managementByName}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {selectedPlan.status === "Finally Approved"
                        ? "Executive Management authorization completed."
                        : "Awaiting final authorization review from Executive Management."}
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* PACKAGE ACTIVITIES DIRECTORY / TRACKER */}
          {selectedPlan.committeeDecision === "Rejected" ? (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Package Activities Directory
                    </h3>
                    <span className="text-xs font-semibold text-slate-500">
                      ({displayedActivities.length}{" "}
                      {displayedActivities.length === 1
                        ? "Activities"
                        : "Activities"}
                      )
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Review procurement activities and click inspect to see
                    milestones, roadmap, and deliberation comments.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenFullActivitiesTracker}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <ListChecks className="h-4 w-4 text-[#A3E635]" />
                  <span>Inspect Full Activities Tracker</span>
                </button>
              </div>

              {/* Activities Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left border-collapse text-xs min-w-200">
                  <thead>
                    <tr className="bg-[#0A3C2F] text-white text-[10px] font-extrabold uppercase tracking-wider">
                      <th className="py-3 px-3.5 w-10 text-center">#</th>
                      <th className="py-3 px-3.5 min-w-36">Activity Ref</th>
                      <th className="py-3 px-3.5 min-w-64">Description</th>
                      <th className="py-3 px-3.5 min-w-36">
                        Method &amp; Approach
                      </th>
                      <th className="py-3 px-3.5 min-w-24">Review Type</th>
                      <th className="py-3 px-3.5 min-w-32">Est. Budget</th>
                      <th className="py-3 px-3.5 text-center min-w-20">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loadingActivities ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-8 text-center text-slate-400 font-medium"
                        >
                          Loading package activities...
                        </td>
                      </tr>
                    ) : displayedActivities.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-8 text-center text-slate-400 font-medium"
                        >
                          No flagged activities found for this plan package.
                        </td>
                      </tr>
                    ) : (
                      displayedActivities.map((act, index) => {
                        return (
                          <tr
                            key={act.id}
                            onClick={() =>
                              handleInspectSpecificActivity(
                                act.activityRefNo || act.id,
                              )
                            }
                            className="bg-rose-50/80 hover:bg-rose-100/70 border-l-4 border-l-rose-600 transition-all duration-200 cursor-pointer"
                          >
                            <td className="py-3 px-3.5 text-center font-mono text-slate-400 font-semibold">
                              {index + 1}
                            </td>

                            <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                              <div>{act.activityRefNo}</div>
                              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                <AlertTriangle className="h-2.5 w-2.5 text-rose-600" />
                                Flagged for Rejection
                              </span>
                            </td>

                            <td className="py-3 px-3.5 max-w-xs">
                              <p className="font-semibold text-slate-900 text-xs line-clamp-2 leading-snug">
                                {act.description}
                              </p>
                            </td>

                            <td className="py-3 px-3.5 text-xs">
                              <div className="font-bold text-[#0A3C2F]">
                                {act.method}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {act.marketApproach}
                              </div>
                            </td>

                            <td className="py-3 px-3.5">
                              <span
                                className={`text-xs font-bold ${
                                  act.reviewType === "Prior"
                                    ? "text-amber-800"
                                    : "text-slate-700"
                                }`}
                              >
                                {act.reviewType}
                              </span>
                            </td>

                            <td className="py-3 px-3.5 font-mono font-bold text-slate-900 text-xs">
                              {act.currency}{" "}
                              {(act.estimatedAmount || 0).toLocaleString()}
                            </td>

                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInspectSpecificActivity(
                                    act.activityRefNo || act.id,
                                  );
                                }}
                                title="Inspect Activity Details"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#0A3C2F] hover:text-white transition-colors cursor-pointer text-[11px] font-bold"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Package Activities Directory
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Plan Endorsed &amp; Approved
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-2xl">
                    All procurement activities have been endorsed without
                    objections. Inspect the full activity tracker to view all
                    procurement packages, milestone roadmap, and tender stages.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenFullActivitiesTracker}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
                >
                  <ListChecks className="h-4 w-4 text-[#A3E635]" />
                  <span>Inspect Full Activities Tracker</span>
                </button>
              </div>
            </section>
          )}
        </div>
      ) : (
        /* VIEW 2: SEARCH & FILTER + DECISIONS DIRECTORY LIST */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 min-w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search decisions by plan name or project..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#0A3C2F] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={decisionFilter}
                  onChange={(e) => setDecisionFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Decisions</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Projects</option>
                  <option value="DRIVE">DRIVE</option>
                  <option value="BREFONS">BREFONS</option>
                  <option value="NATIONAL AG">National Ag</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabular Decisions Directory */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-200 text-xs">
                <thead>
                  <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Date Voted</th>
                    <th className="py-3 px-4">My Vote</th>
                    <th className="py-3 px-4">Overall Plan Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-slate-500 font-medium"
                      >
                        Loading decisions...
                      </td>
                    </tr>
                  ) : filteredDecisions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-slate-500"
                      >
                        <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">
                          No decisions recorded matching search filters
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredDecisions.map((plan) => (
                      <tr
                        key={plan.id}
                        onClick={() => handleSelectPlan(plan)}
                        className="hover:bg-emerald-50/50 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs wrap-break-word">
                          <span className="wrap-break-word line-clamp-2">
                            {plan.planName}
                          </span>
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5 wrap-break-word line-clamp-2">
                            {plan.budgetYear} • {plan.activitiesCount}{" "}
                            Activities
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-800 wrap-break-word max-w-44">
                          {plan.projectCode}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                              plan.category === "Goods"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : plan.category === "Consultancy Services"
                                  ? "bg-purple-50 text-purple-700 border-purple-100"
                                  : "bg-amber-50 text-amber-700 border-amber-100"
                            }`}
                          >
                            {plan.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                          {plan.decisionRecordedDate || "Recent"}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                              plan.committeeDecision === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-rose-50 text-rose-700 border-rose-100"
                            }`}
                          >
                            {plan.committeeDecision === "Approved" ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <XCircle className="h-3 w-3 text-rose-600" />
                            )}
                            {plan.committeeDecision === "Approved"
                              ? "Approved"
                              : "Rejected"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border ${getOverallStatusStyle(
                              plan.status,
                            )}`}
                          >
                            {plan.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPlan(plan);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A3C2F] text-white hover:bg-[#072b22] transition-colors cursor-pointer text-[10px] font-bold shadow-3xs"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Inspect details</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
