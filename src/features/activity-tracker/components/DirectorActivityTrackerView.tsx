"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { StatusText } from "../../../components/dashboard/StatusText";
import {
  Home,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Eye,
  RotateCcw,
  ArrowLeft,
  UserCheck,
  LockKeyhole,
  BriefcaseBusiness,
  Route,
  CalendarDays,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import {
  calculateDelayDays,
  createInitialActivityTrackingRecord,
  effectiveTargetDate,
  findActivityTrackingRecord,
  OFFICER_ACTIVITY_TRACKING_STORAGE_KEY,
  parseActivityTrackingRecords,
  type ActivityStageTracking,
  type OfficerActivityTrackingRecord,
} from "../data/officerActivityTracking";
import {
  mapBackendActivityToProcurementActivitySummary,
  OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
  parseSavedActivityRecords,
  type ProcurementActivitySummary,
  type SavedOfficerActivityRecord,
} from "../../projects/data/officerActivityDrafts";
import {
  mergeSavedPlans,
  OFFICER_PLAN_DRAFTS_STORAGE_KEY,
  parseSavedPlanRecords,
  type SavedOfficerPlanRecord,
} from "../../projects/data/officerPlanDrafts";
import {
  type OfficerProject,
  type ProcurementPlanSummary,
} from "../../projects/data/officerProjects";
import {
  fetchProjects,
  mapBackendProjectToOfficerProject,
} from "@/lib/projectsApi";
import { fetchPlans, mapBackendPlanToOfficerPlanSummary } from "@/lib/plansApi";
import { fetchActivities, type BackendActivity } from "@/lib/activitiesApi";
import type { UserRole } from "@/types";

export interface DirectorTrackedActivityItem {
  activity: ProcurementActivitySummary;
  plan: ProcurementPlanSummary;
  project: OfficerProject;
  tracking: OfficerActivityTrackingRecord;
}

export type TrackerDisplayStatus =
  | "Completed"
  | "Contracted"
  | "Delayed"
  | "In Progress"
  | "Not Started"
  | "Terminated";

type TrackerQuickFilter =
  "all" | "completed" | "delayed" | "due-soon" | "in-progress";

type TrackerSort =
  "attention" | "delay-desc" | "reference" | "stage" | "status" | "target-asc";

const DUE_SOON_DAYS = 7;
const PAGE_SIZE = 10;

export interface DirectorActivityTrackerViewProps {
  selectedActivityReference?: string;
  selectedPlanReference?: string;
  selectedProjectCode?: string;
  userRole?: UserRole;
}

export function DirectorActivityTrackerView({
  selectedActivityReference,
  selectedPlanReference,
  selectedProjectCode,
  userRole,
}: DirectorActivityTrackerViewProps = {}) {
  const [backendProjects, setBackendProjects] = useState<OfficerProject[]>([]);
  const [savedPlanRecords, setSavedPlanRecords] = useState<
    SavedOfficerPlanRecord[]
  >([]);
  const [savedActivityRecords, setSavedActivityRecords] = useState<
    SavedOfficerActivityRecord[]
  >([]);
  const [backendActivities, setBackendActivities] = useState<
    SavedOfficerActivityRecord[]
  >([]);
  const [trackingRecords, setTrackingRecords] = useState<
    OfficerActivityTrackingRecord[]
  >([]);

  const [selectedActivity, setSelectedActivity] =
    useState<DirectorTrackedActivityItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [rawProjects, rawPlans, rawActivities] = await Promise.all([
          fetchProjects(),
          fetchPlans(),
          fetchActivities(),
        ]);
        if (isMounted && rawProjects && rawProjects.length > 0) {
          const mapped = rawProjects.map((p) => {
            const officerProj = mapBackendProjectToOfficerProject(p);
            const projPlans = (rawPlans || [])
              .filter(
                (pl) => pl.projectId === p.id || pl.project?.code === p.code,
              )
              .map(mapBackendPlanToOfficerPlanSummary);
            return {
              ...officerProj,
              plans: projPlans.length > 0 ? projPlans : officerProj.plans,
            };
          });
          setBackendProjects(mapped);
        }

        if (isMounted && rawActivities && rawActivities.length > 0) {
          const dbRecords: SavedOfficerActivityRecord[] = rawActivities.map(
            (ba: BackendActivity) => {
              const summary =
                mapBackendActivityToProcurementActivitySummary(ba);
              const parentPlan = (rawPlans || []).find(
                (p) => p.id === ba.planId,
              );
              const planRef = parentPlan?.title || ba.plan?.title || ba.planId;
              const projCode =
                parentPlan?.project?.code ||
                ba.plan?.project?.code ||
                "PRJ-24-001";
              return {
                activity: summary,
                planReference: planRef,
                projectCode: projCode,
              };
            },
          );
          setBackendActivities(dbRecords);
        }
      } catch (err) {
        console.warn("DirectorActivityTrackerView loadData note:", err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const loadRecords = window.setTimeout(() => {
      setSavedPlanRecords(
        parseSavedPlanRecords(
          window.localStorage.getItem(OFFICER_PLAN_DRAFTS_STORAGE_KEY),
        ),
      );
      setSavedActivityRecords(
        parseSavedActivityRecords(
          window.localStorage.getItem(OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY),
        ),
      );
      setTrackingRecords(
        parseActivityTrackingRecords(
          window.localStorage.getItem(OFFICER_ACTIVITY_TRACKING_STORAGE_KEY),
        ),
      );
    }, 0);

    return () => window.clearTimeout(loadRecords);
  }, []);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ href?: string }>;
      if (
        !customEvent.detail?.href ||
        customEvent.detail.href === "/workspace/activity-tracker"
      ) {
        setSelectedActivity(null);
      }
    };

    window.addEventListener("pts:sidebar-reset", handleReset);
    return () => window.removeEventListener("pts:sidebar-reset", handleReset);
  }, []);

  const effectiveActivityRecords = useMemo(() => {
    const map = new Map<string, SavedOfficerActivityRecord>();
    backendActivities.forEach((rec) => {
      const key =
        `${rec.projectCode}-${rec.planReference}-${rec.activity.reference}`.toLowerCase();
      map.set(key, rec);
    });
    savedActivityRecords.forEach((rec) => {
      const key =
        `${rec.projectCode}-${rec.planReference}-${rec.activity.reference}`.toLowerCase();
      if (!map.has(key)) {
        map.set(key, rec);
      }
    });
    return Array.from(map.values());
  }, [backendActivities, savedActivityRecords]);

  const allProjects = useMemo(() => backendProjects, [backendProjects]);

  const projects = useMemo(
    () => mergeSavedPlans(allProjects, savedPlanRecords),
    [allProjects, savedPlanRecords],
  );

  const items = useMemo(
    () =>
      collectTrackableActivities(
        projects,
        effectiveActivityRecords,
        trackingRecords,
      ),
    [projects, effectiveActivityRecords, trackingRecords],
  );

  const dismissedActivityRef = useRef<string | null>(null);

  const handleSelectActivity = (item: DirectorTrackedActivityItem) => {
    dismissedActivityRef.current = null;
    setSelectedActivity(item);
    if (typeof window !== "undefined") {
      window.history.pushState(
        {},
        "",
        `/workspace/activity-tracker?activity=${encodeURIComponent(item.activity.reference)}`,
      );
    }
  };

  const handleBackFromDetail = () => {
    dismissedActivityRef.current =
      selectedActivity?.activity?.reference ||
      selectedActivityReference ||
      "dismissed";
    setSelectedActivity(null);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/workspace/activity-tracker");
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const actRef = params.get("activity");
      if (actRef && items.length > 0) {
        const match = items.find(
          (it) =>
            it.activity.reference.toLowerCase() === actRef.toLowerCase() ||
            it.activity.description
              .toLowerCase()
              .includes(actRef.toLowerCase()) ||
            it.tracking.activityReference.toLowerCase() ===
              actRef.toLowerCase() ||
            (it.activity as any).id === actRef ||
            (it as any).id === actRef,
        );
        if (match) {
          dismissedActivityRef.current = null;
          setSelectedActivity(match);
          return;
        }
      }
      setSelectedActivity(null);
      dismissedActivityRef.current = null;
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [items]);

  useEffect(() => {
    if (
      selectedActivityReference &&
      selectedActivityReference !== dismissedActivityRef.current
    ) {
      dismissedActivityRef.current = null;
    }
  }, [selectedActivityReference]);

  useEffect(() => {
    if (
      selectedActivityReference &&
      items.length > 0 &&
      !selectedActivity &&
      dismissedActivityRef.current !== selectedActivityReference
    ) {
      const match = items.find(
        (it) =>
          it.activity.reference.toLowerCase() ===
            selectedActivityReference.toLowerCase() ||
          it.activity.description
            .toLowerCase()
            .includes(selectedActivityReference.toLowerCase()) ||
          it.tracking.activityReference.toLowerCase() ===
            selectedActivityReference.toLowerCase() ||
          (it.activity as any).id === selectedActivityReference ||
          (it as any).id === selectedActivityReference,
      );
      if (match) {
        const timer = setTimeout(() => {
          setSelectedActivity(match);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedActivityReference, items, selectedActivity]);

  if (selectedActivity) {
    return (
      <DirectorActivityDetailView
        item={selectedActivity}
        onBack={handleBackFromDetail}
        userRole={userRole}
      />
    );
  }

  return (
    <DirectorActivityTrackerList
      items={items}
      onViewActivity={handleSelectActivity}
      userRole={userRole}
    />
  );
}

function collectTrackableActivities(
  projects: readonly OfficerProject[],
  savedActivityRecords: readonly SavedOfficerActivityRecord[],
  trackingRecords: readonly OfficerActivityTrackingRecord[],
): DirectorTrackedActivityItem[] {
  const itemsByIdentity = new Map<string, DirectorTrackedActivityItem>();

  for (const project of projects) {
    for (const plan of project.plans) {
      const planDirectActivities = plan.planActivities || [];

      const savedActivities = savedActivityRecords
        .filter(
          (record) =>
            (record.projectCode?.toLowerCase() ===
              project.code?.toLowerCase() ||
              record.projectCode?.toLowerCase() ===
                project.shortName?.toLowerCase()) &&
            (record.planReference?.toLowerCase() ===
              plan.reference?.toLowerCase() ||
              record.planReference?.toLowerCase() === plan.name?.toLowerCase()),
        )
        .map((record) => record.activity);

      const combinedMap = new Map<string, ProcurementActivitySummary>();
      planDirectActivities.forEach((act) =>
        combinedMap.set(act.reference.toLowerCase(), act),
      );
      savedActivities.forEach((act) =>
        combinedMap.set(act.reference.toLowerCase(), act),
      );

      const allActivitiesForPlan = Array.from(combinedMap.values());

      for (const activity of allActivitiesForPlan) {
        const tracking =
          findActivityTrackingRecord(
            trackingRecords,
            project.code,
            plan.reference,
            activity.reference,
          ) ??
          createInitialActivityTrackingRecord(
            project.code,
            plan.reference,
            activity,
          );

        const item = { activity, plan, project, tracking };
        itemsByIdentity.set(trackedActivityIdentity(item), item);
      }
    }
  }

  return Array.from(itemsByIdentity.values());
}

function trackedActivityIdentity(item: DirectorTrackedActivityItem) {
  return [
    item.project.code,
    item.plan.reference,
    item.activity.id ?? item.activity.activityId ?? item.activity.reference,
  ].join("::");
}

function trackerCurrentStage(
  item: DirectorTrackedActivityItem,
  todayIso = new Date().toISOString().slice(0, 10),
) {
  const roadmap = item.activity.details?.roadmap ?? [];

  if (roadmap.length === 0) {
    return {
      delayDays: null,
      name: item.activity.currentStage,
      originalDate: { ethiopian: "", gregorian: "" },
      status:
        item.activity.status === "Completed"
          ? "Completed"
          : item.activity.status === "Not Started"
            ? "Not Started"
            : "In Progress",
      targetDate: { ethiopian: "", gregorian: "" },
    };
  }

  const inProgressStage = roadmap.find(
    (stage) => resolvedStageTracking(item, stage).status === "In Progress",
  );
  const declaredStage = roadmap.find(
    (stage) => stage.name === item.activity.currentStage,
  );
  const usableDeclaredStage =
    declaredStage &&
    !["Completed", "Not Applicable"].includes(
      resolvedStageTracking(item, declaredStage).status,
    )
      ? declaredStage
      : undefined;
  const firstIncompleteStage = roadmap.find(
    (stage) =>
      !["Completed", "Not Applicable"].includes(
        resolvedStageTracking(item, stage).status,
      ),
  );
  const selectedStage =
    inProgressStage ??
    usableDeclaredStage ??
    firstIncompleteStage ??
    [...roadmap].reverse().find((stage) => !stage.notApplicable) ??
    roadmap[roadmap.length - 1];

  const tracking = resolvedStageTracking(item, selectedStage);
  const originalDate = {
    ethiopian: selectedStage.ethiopianDate || "",
    gregorian: selectedStage.gregorianDate || "",
  };

  return {
    delayDays: calculateDelayDays(originalDate, tracking, todayIso),
    name: selectedStage.name,
    originalDate,
    status: tracking.status,
    targetDate: effectiveTargetDate(originalDate, tracking),
  };
}

function trackerDisplayStatus(
  item: DirectorTrackedActivityItem,
  todayIso = new Date().toISOString().slice(0, 10),
): TrackerDisplayStatus {
  if (
    item.tracking.processStatus === "Canceled" ||
    hasCompletedRoadmapStage(item, "contract termination")
  ) {
    return "Terminated";
  }

  if (
    item.tracking.processStatus === "Completed" ||
    item.tracking.progressPercent === 100 ||
    item.activity.status === "Completed" ||
    hasCompletedRoadmapStage(item, "contract completion")
  ) {
    return "Completed";
  }

  if (
    item.tracking.processStatus === "Signed" ||
    hasCompletedRoadmapStage(item, "signed contract")
  ) {
    return "Contracted";
  }

  if (
    (trackerMaximumActiveDelay(item, todayIso) ?? 0) > 0 ||
    item.activity.status === "Delayed"
  ) {
    return "Delayed";
  }

  if (
    item.tracking.progressPercent > 0 ||
    item.tracking.processStatus !== "Pending Implementation" ||
    item.activity.status === "In Progress"
  ) {
    return "In Progress";
  }

  return "Not Started";
}

function trackerIsDueSoon(
  item: DirectorTrackedActivityItem,
  todayIso = new Date().toISOString().slice(0, 10),
) {
  const status = trackerDisplayStatus(item, todayIso);
  if (status !== "In Progress" && status !== "Not Started") return false;

  const target = trackerCurrentStage(item, todayIso).targetDate.gregorian;
  if (!target) return false;
  const remainingDays = differenceInIsoDays(todayIso, target);
  return remainingDays >= 0 && remainingDays <= DUE_SOON_DAYS;
}

function trackerStageProgress(item: DirectorTrackedActivityItem) {
  const roadmap = item.activity.details?.roadmap ?? [];
  if (roadmap.length === 0) {
    return {
      completed: Math.round(item.tracking.progressPercent / 100),
      percent: item.tracking.progressPercent,
      total: 1,
    };
  }

  const applicableStages = roadmap.filter(
    (stage) => resolvedStageTracking(item, stage).status !== "Not Applicable",
  );
  const completed = applicableStages.filter(
    (stage) => resolvedStageTracking(item, stage).status === "Completed",
  ).length;

  return {
    completed,
    percent:
      applicableStages.length === 0
        ? 0
        : Math.round((completed / applicableStages.length) * 100),
    total: applicableStages.length,
  };
}

function resolvedStageTracking(
  item: DirectorTrackedActivityItem,
  stage: NonNullable<ProcurementActivitySummary["details"]>["roadmap"][number],
): ActivityStageTracking {
  return (
    item.tracking.stages.find(
      (tracking) => tracking.stageName === stage.name,
    ) ?? {
      remarks: stage.remarks || "",
      revisions: [],
      stageName: stage.name,
      status: stage.notApplicable
        ? "Not Applicable"
        : item.activity.status === "Completed"
          ? "Completed"
          : stage.name === item.activity.currentStage &&
              item.activity.status !== "Not Started"
            ? "In Progress"
            : "Not Started",
    }
  );
}

function trackerMaximumActiveDelay(
  item: DirectorTrackedActivityItem,
  todayIso: string,
) {
  const delays = (item.activity.details?.roadmap ?? [])
    .map((stage) => {
      const tracking = resolvedStageTracking(item, stage);
      if (["Completed", "Not Applicable"].includes(tracking.status)) {
        return 0;
      }
      return (
        calculateDelayDays(
          {
            ethiopian: stage.ethiopianDate || "",
            gregorian: stage.gregorianDate || "",
          },
          tracking,
          todayIso,
        ) ?? 0
      );
    })
    .filter((delay) => delay > 0);

  return delays.length > 0 ? Math.max(...delays) : null;
}

function hasCompletedRoadmapStage(
  item: DirectorTrackedActivityItem,
  stageName: string,
) {
  return (item.activity.details?.roadmap ?? []).some(
    (stage) =>
      stage.name.toLowerCase().includes(stageName) &&
      resolvedStageTracking(item, stage).status === "Completed",
  );
}

function differenceInIsoDays(fromIso: string, toIso: string) {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.POSITIVE_INFINITY;
  return Math.floor((to - from) / 86_400_000);
}

function DirectorActivityTrackerList({
  items,
  onViewActivity,
  userRole,
}: {
  items: readonly DirectorTrackedActivityItem[];
  onViewActivity: (item: DirectorTrackedActivityItem) => void;
  userRole?: UserRole;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectCode, setProjectCode] = useState("all");
  const [category, setCategory] = useState("all");
  const [method, setMethod] = useState("all");
  const [quickFilter, setQuickFilter] = useState<TrackerQuickFilter>("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [planReference, setPlanReference] = useState("all");
  const [fiscalYear, setFiscalYear] = useState("all");
  const [displayStatus, setDisplayStatus] = useState("all");
  const [delayStatus, setDelayStatus] = useState("all");
  const [currentStage, setCurrentStage] = useState("all");
  const [targetDateFrom, setTargetDateFrom] = useState("");
  const [targetDateTo, setTargetDateTo] = useState("");
  const [organization, setOrganization] = useState("all");
  const [sortBy, setSortBy] = useState<TrackerSort>("attention");
  const [page, setPage] = useState(1);

  const projectOptions = useMemo(
    () =>
      Array.from(
        new Map(
          items.map((item) => [item.project.code, item.project.shortName]),
        ),
      ),
    [items],
  );

  const planOptions = useMemo(
    () =>
      Array.from(
        new Map(
          items.map((item) => [
            item.plan.reference,
            `${item.plan.name} (${item.plan.reference})`,
          ]),
        ),
      ),
    [items],
  );

  const categoryOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.activity.category))),
    [items],
  );

  const methodOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.activity.method))),
    [items],
  );

  const fiscalYearOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.plan.budgetYear))),
    [items],
  );

  const organizationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items.map(
            (item) =>
              item.plan.organizationRegion?.trim() ||
              item.project.organizationRegion?.trim() ||
              item.project.countryOrganisation,
          ),
        ),
      ).filter(Boolean),
    [items],
  );

  const currentStageOptions = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => trackerCurrentStage(item, todayIso).name)),
      ).filter(Boolean),
    [items, todayIso],
  );

  const filteredItems = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const status = trackerDisplayStatus(item, todayIso);
      const stage = trackerCurrentStage(item, todayIso);
      const dueSoon = trackerIsDueSoon(item, todayIso);
      const delayed = status === "Delayed";
      const officers = item.project.assignedOfficers ?? [];
      const org =
        item.plan.organizationRegion?.trim() ||
        item.project.organizationRegion?.trim() ||
        item.project.countryOrganisation;

      const searchable = [
        item.activity.reference,
        item.activity.description,
        item.activity.category,
        item.activity.method,
        stage.name,
        item.plan.budgetYear,
        item.plan.name,
        item.plan.reference,
        item.project.name,
        item.project.code,
        item.project.shortName,
        officers.join(" "),
        org,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!search || searchable.includes(search)) &&
        (projectCode === "all" || item.project.code === projectCode) &&
        (planReference === "all" || item.plan.reference === planReference) &&
        (category === "all" || item.activity.category === category) &&
        (method === "all" || item.activity.method === method) &&
        (fiscalYear === "all" || item.plan.budgetYear === fiscalYear) &&
        (organization === "all" || org === organization) &&
        (currentStage === "all" || stage.name === currentStage) &&
        (displayStatus === "all" || status === displayStatus) &&
        (!targetDateFrom ||
          (stage.targetDate.gregorian &&
            stage.targetDate.gregorian >= targetDateFrom)) &&
        (!targetDateTo ||
          (stage.targetDate.gregorian &&
            stage.targetDate.gregorian <= targetDateTo)) &&
        (delayStatus === "all" ||
          (delayStatus === "delayed" && delayed) ||
          (delayStatus === "due-soon" && dueSoon) ||
          (delayStatus === "on-schedule" && !delayed && !dueSoon)) &&
        (quickFilter === "all" ||
          (quickFilter === "delayed" && status === "Delayed") ||
          (quickFilter === "due-soon" && dueSoon) ||
          (quickFilter === "in-progress" && status === "In Progress") ||
          (quickFilter === "completed" && status === "Completed"))
      );
    });
  }, [
    category,
    currentStage,
    delayStatus,
    displayStatus,
    fiscalYear,
    items,
    method,
    organization,
    planReference,
    projectCode,
    quickFilter,
    searchQuery,
    targetDateFrom,
    targetDateTo,
    todayIso,
  ]);

  const activeFilterCount =
    Number(planReference !== "all") +
    Number(fiscalYear !== "all") +
    Number(displayStatus !== "all") +
    Number(delayStatus !== "all") +
    Number(currentStage !== "all") +
    Number(organization !== "all") +
    Number(Boolean(targetDateFrom)) +
    Number(Boolean(targetDateTo)) +
    Number(sortBy !== "attention");

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPageNumber = Math.min(page, totalPages);
  const firstVisibleIndex = (currentPageNumber - 1) * PAGE_SIZE;
  const visibleItems = filteredItems.slice(
    firstVisibleIndex,
    firstVisibleIndex + PAGE_SIZE,
  );

  const completedCount = items.filter(
    (item) => trackerDisplayStatus(item, todayIso) === "Completed",
  ).length;
  const delayedCount = items.filter(
    (item) => trackerDisplayStatus(item, todayIso) === "Delayed",
  ).length;
  const inProgressCount = items.filter(
    (item) => trackerDisplayStatus(item, todayIso) === "In Progress",
  ).length;
  const dueSoonCount = items.filter((item) =>
    trackerIsDueSoon(item, todayIso),
  ).length;

  function resetFilters() {
    setCategory("all");
    setCurrentStage("all");
    setDelayStatus("all");
    setDisplayStatus("all");
    setFiscalYear("all");
    setMethod("all");
    setOrganization("all");
    setPlanReference("all");
    setProjectCode("all");
    setQuickFilter("all");
    setSearchQuery("");
    setSortBy("attention");
    setTargetDateFrom("");
    setTargetDateTo("");
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-10">
      {/* 1. Standard Project Breadcrumbs Header */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <Link
          href="/dashboard"
          title="Go to Dashboard"
          className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-bold text-[#0A3C2F]">Activity Tracker</span>
      </nav>

      {/* 2. Page Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              {userRole === "MANAGEMENT"
                ? "Management Activity Tracker"
                : "Director Activity Tracker"}
            </h1>
            {userRole === "MANAGEMENT" && (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                View-Only Oversight
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-3xl">
            {userRole === "MANAGEMENT"
              ? "Executive view-only oversight of active officer progress, procurement milestones, stage completion, and critical project delays."
              : "Track active officer progress, procurement milestones, stage completion, and critical project delays across the directorate."}
          </p>
        </div>
      </div>

      {/* 3. Quick Stats Filter Bar */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <QuickTabButton
          active={quickFilter === "all"}
          count={items.length}
          label="All Activities"
          onClick={() => setQuickFilter("all")}
        />
        <QuickTabButton
          active={quickFilter === "delayed"}
          count={delayedCount}
          label="Delayed"
          onClick={() => setQuickFilter("delayed")}
          badgeColor="text-rose-800"
        />
        <QuickTabButton
          active={quickFilter === "due-soon"}
          count={dueSoonCount}
          label="Due Soon"
          onClick={() => setQuickFilter("due-soon")}
          badgeColor="text-amber-800"
        />
        <QuickTabButton
          active={quickFilter === "in-progress"}
          count={inProgressCount}
          label="In Progress"
          onClick={() => setQuickFilter("in-progress")}
        />
        <QuickTabButton
          active={quickFilter === "completed"}
          count={completedCount}
          label="Completed"
          onClick={() => setQuickFilter("completed")}
        />
      </div>

      {/* 4. Filters Panel matching Screenshot */}
      <section className="w-full rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
        {/* Row 1: Search, Project, Category, Method, Officer, More Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-65">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, activity title, officer r..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] transition-all shadow-2xs placeholder:text-slate-400 hover:border-slate-300"
            />
          </div>

          {/* Project Dropdown */}
          <div className="relative flex-1 min-w-35">
            <select
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              className="w-full appearance-none px-4 py-2.5 pr-9 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-[#1E293B] outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] transition-all cursor-pointer shadow-2xs hover:border-slate-300"
            >
              <option value="all">All Projects</option>
              {projectOptions.map(([val, name]) => (
                <option key={val} value={val}>
                  {name} ({val})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Category Dropdown */}
          <div className="relative flex-1 min-w-35">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full appearance-none px-4 py-2.5 pr-9 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-[#1E293B] outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] transition-all cursor-pointer shadow-2xs hover:border-slate-300"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Method Dropdown */}
          <div className="relative flex-1 min-w-35">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full appearance-none px-4 py-2.5 pr-9 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-[#1E293B] outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] transition-all cursor-pointer shadow-2xs hover:border-slate-300"
            >
              <option value="all">All Methods</option>
              {methodOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* More Filters Toggle */}
          <button
            type="button"
            onClick={() => setShowMoreFilters((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 ${
              showMoreFilters || activeFilterCount > 0
                ? "bg-[#E6F4EA] text-[#0D6E53] border-[#A8E6CF]"
                : "bg-[#E6F4EA]/80 hover:bg-[#E6F4EA] border-[#A8E6CF] text-[#0D6E53]"
            }`}
          >
            <Filter className="h-4 w-4 text-[#0D6E53]" />
            <span>More Filters</span>
            {activeFilterCount > 0 ? (
              <span className="bg-[#0D6E53] text-white px-1.5 py-0.5 rounded-full text-[10px] font-extrabold">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        {/* Expanded 3-Column Grid matching Screenshot */}
        {showMoreFilters && (
          <div className="pt-4 border-t border-slate-200/80 space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Column 1 */}
              <div className="space-y-3.5">
                {/* All Procurement Plans */}
                <div className="relative">
                  <select
                    value={planReference}
                    onChange={(e) => setPlanReference(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 pr-9 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-[#1E293B] outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] cursor-pointer shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <option value="all">All Procurement Plans</option>
                    {planOptions.map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* All Delay Statuses */}
                <div className="relative">
                  <select
                    value={delayStatus}
                    onChange={(e) => setDelayStatus(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 pr-9 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-[#1E293B] outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] cursor-pointer shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <option value="all">All Delay Statuses</option>
                    <option value="delayed">Delayed</option>
                    <option value="due-soon">Due Soon</option>
                    <option value="on-schedule">On Schedule</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* All Organizations */}
                <div className="relative">
                  <select
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 pr-9 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-[#1E293B] outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] cursor-pointer shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <option value="all">All Organizations</option>
                    {organizationOptions.map((org) => (
                      <option key={org} value={org}>
                        {org}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Column 2 */}
              <div className="space-y-3.5">
                {/* All Fiscal Years */}
                <div className="relative">
                  <select
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 pr-9 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-[#1E293B] outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] cursor-pointer shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <option value="all">All Fiscal Years</option>
                    {fiscalYearOptions.map((fy) => (
                      <option key={fy} value={fy}>
                        {fy}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* All Current Stages */}
                <div className="relative">
                  <select
                    value={currentStage}
                    onChange={(e) => setCurrentStage(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 pr-9 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-[#1E293B] outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] cursor-pointer shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <option value="all">All Current Stages</option>
                    {currentStageOptions.map((stg) => (
                      <option key={stg} value={stg}>
                        {stg}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Attention Priority / Sort By */}
                <div className="relative">
                  <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as TrackerSort)}
                    className="w-full appearance-none pl-10 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-[#1E293B] outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] cursor-pointer shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <option value="attention">Attention Priority</option>
                    <option value="target-asc">Target Date</option>
                    <option value="delay-desc">Delay Days</option>
                    <option value="stage">Current Stage</option>
                    <option value="reference">Reference</option>
                    <option value="status">Overall Status</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Column 3 */}
              <div className="space-y-3.5">
                {/* All Statuses */}
                <div className="relative">
                  <select
                    value={displayStatus}
                    onChange={(e) => setDisplayStatus(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 pr-9 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-[#1E293B] outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] cursor-pointer shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <option value="all">All Statuses</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Contracted">Contracted</option>
                    <option value="Completed">Completed</option>
                    <option value="Not Started">Not Started</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Target Date From */}
                <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-500 shadow-2xs focus-within:border-[#0A3C2F] focus-within:ring-1 focus-within:ring-[#0A3C2F] hover:border-slate-300 transition-all">
                  <CalendarDays className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
                  <span className="text-slate-500 font-bold text-xs mr-2 shrink-0">
                    Target From:
                  </span>
                  <input
                    type="date"
                    value={targetDateFrom}
                    onChange={(e) => setTargetDateFrom(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 font-semibold outline-none cursor-pointer placeholder:text-slate-400"
                  />
                </div>

                {/* Target Date To */}
                <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-500 shadow-2xs focus-within:border-[#0A3C2F] focus-within:ring-1 focus-within:ring-[#0A3C2F] hover:border-slate-300 transition-all">
                  <CalendarDays className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
                  <span className="text-slate-500 font-bold text-xs mr-2 shrink-0">
                    Target To:
                  </span>
                  <input
                    type="date"
                    value={targetDateTo}
                    onChange={(e) => setTargetDateTo(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-800 font-semibold outline-none cursor-pointer placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Right: Reset Filters */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 5. Main Standard Table Container (Matching Projects Directory & Other Views) */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1240px]">
            <thead className="bg-[#0A3C2F]">
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4 min-w-[130px] whitespace-nowrap">
                  Reference No
                </th>
                <th className="py-3.5 px-4 min-w-[220px]">
                  Activity Name &amp; Milestone
                </th>
                <th className="py-3.5 px-4 min-w-[160px]">Project / FY</th>
                <th className="py-3.5 px-4 min-w-[140px]">
                  Category &amp; Method
                </th>
                <th className="py-3.5 px-4 min-w-[160px]">Current Stage</th>
                <th className="py-3.5 px-4 min-w-[120px] whitespace-nowrap">
                  Target Date
                </th>
                <th className="py-3.5 px-4 text-center min-w-[120px] whitespace-nowrap">
                  Delay Status
                </th>
                <th className="py-3.5 px-4 min-w-[140px]">Assigned Officer</th>
                <th className="py-3.5 pr-6 pl-4 text-center min-w-[90px] whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {visibleItems.length > 0 ? (
                visibleItems.map((item, idx) => {
                  const stage = trackerCurrentStage(item, todayIso);
                  const progress = trackerStageProgress(item);
                  const officerName =
                    item.project.assignedOfficers?.[0] || "Unassigned";

                  return (
                    <tr
                      key={trackedActivityIdentity(item)}
                      onClick={() => onViewActivity(item)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {firstVisibleIndex + idx + 1}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="font-mono font-bold text-[#0A3C2F] px-2 py-1 rounded inline-block truncate max-w-[130px]"
                          title={item.activity.reference}
                        >
                          {item.activity.reference}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewActivity(item);
                          }}
                          className="font-bold text-slate-900 hover:text-[#0A3C2F] text-left transition-colors cursor-pointer line-clamp-2 leading-snug break-words [overflow-wrap:anywhere]"
                          title={item.activity.description}
                        >
                          {item.activity.description}
                        </button>
                        <p className="mt-1 text-[11px] text-slate-500 font-medium">
                          {progress.completed} of {progress.total} stages
                          completed ({progress.percent}%)
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p
                          title={item.project.shortName}
                          className="font-bold text-slate-800 leading-snug line-clamp-2 break-words [overflow-wrap:anywhere]"
                        >
                          {item.project.shortName}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {item.plan.budgetYear}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-700 leading-snug break-words">
                          {item.activity.category}
                        </p>
                        <p
                          className="text-[11px] text-slate-500 font-medium leading-snug line-clamp-2 break-words [overflow-wrap:anywhere]"
                          title={item.activity.method}
                        >
                          {item.activity.method}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p
                          className="font-bold text-slate-900 leading-snug line-clamp-2 break-words [overflow-wrap:anywhere]"
                          title={stage.name}
                        >
                          {stage.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Status: {stage.status}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-bold text-slate-800">
                          {stage.targetDate.gregorian || "—"}
                        </p>
                        {stage.targetDate.ethiopian && (
                          <p className="text-[10px] text-slate-500 font-medium">
                            {stage.targetDate.ethiopian}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {stage.delayDays && stage.delayDays > 0 ? (
                          <span className="font-bold text-[#b91c1c] text-xs">
                            {stage.delayDays} days delayed
                          </span>
                        ) : (
                          <span className="font-semibold text-[#166534] text-xs">
                            On schedule
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 text-[11px] truncate">
                          {officerName}
                        </span>
                      </td>
                      <td className="py-3.5 pr-6 pl-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewActivity(item);
                          }}
                          title="View Activity Details"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#0A3C2F] text-slate-700 hover:text-white transition-all cursor-pointer inline-flex items-center justify-center"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <Search className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700">
                      No tracked activities found
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Try clearing search queries or selecting different
                      filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <span>
            Showing {filteredItems.length === 0 ? 0 : firstVisibleIndex + 1} to{" "}
            {Math.min(firstVisibleIndex + PAGE_SIZE, filteredItems.length)} of{" "}
            {filteredItems.length} matching activities
          </span>
          <div className="flex items-center gap-3">
            <span>
              Page {currentPageNumber} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPageNumber === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next page"
                disabled={currentPageNumber === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickTabButton({
  active,
  badgeColor = "bg-slate-100 text-slate-700",
  count,
  label,
  onClick,
}: {
  active: boolean;
  badgeColor?: string;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 font-bold text-xs transition-all flex items-center gap-2 border-b-2 cursor-pointer shrink-0 ${
        active
          ? "border-[#0A3C2F] text-[#0A3C2F]"
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      <span>{label}</span>
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${badgeColor}`}
      >
        {count}
      </span>
    </button>
  );
}

function formatAmount(value: number | undefined | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function DirectorActivityDetailView({
  item,
  onBack,
  userRole,
}: {
  item: DirectorTrackedActivityItem;
  onBack: () => void;
  userRole?: UserRole;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "roadmap" | "contract"
  >("overview");
  const todayIso = new Date().toISOString().slice(0, 10);
  const stage = trackerCurrentStage(item, todayIso);
  const progress = trackerStageProgress(item);
  const roadmap = item.activity.details?.roadmap ?? [];
  const form = item.activity.details?.form;
  const officerNames =
    (item.project.assignedOfficers ?? []).join(", ") || "Unassigned";

  const displayStatus = trackerDisplayStatus(item, todayIso);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          Activity Tracker
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-bold text-[#0A3C2F]">
          Activity: {item.activity.reference}
        </span>
      </nav>

      {/* Header Banner */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A3C2F] hover:underline cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Activity Tracker List
          </button>
          <div className="flex items-center gap-2">
            {userRole === "MANAGEMENT" && (
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                View-Only
              </span>
            )}
            <span className="font-mono text-xs font-bold text-[#0A3C2F] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {item.project.code}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
            {item.activity.description}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="font-mono font-bold text-[#0A3C2F] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
              {item.activity.reference}
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-800">
              {item.project.shortName}
            </span>
            <span>•</span>
            <span>
              {item.plan.name} ({item.plan.reference})
            </span>
          </div>
        </div>

        {/* Segmented Tab Bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "overview"
                ? "border-[#0A3C2F] text-[#0A3C2F] bg-emerald-50/50 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roadmap")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "roadmap"
                ? "border-[#0A3C2F] text-[#0A3C2F] bg-emerald-50/50 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Roadmap ({roadmap.length} Stages)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contract")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "contract"
                ? "border-[#0A3C2F] text-[#0A3C2F] bg-emerald-50/50 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Contract</span>
          </button>
        </div>
      </section>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden animate-in fade-in duration-150">
          {/* Main Grid: Approved Overview Details */}
          <div className="p-6 sm:p-7 space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-950 text-base flex items-center gap-2">
                <UserCheck className="h-4.5 w-4.5 text-[#0A3C2F]" />
                Approved Activity & Baseline Information
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete approved procurement baseline data, target tracking
                summary, and assigned officer log.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5 text-xs border-t border-slate-100 pt-5">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Reference No.
                </p>
                <p className="font-mono font-bold text-[#0A3C2F] text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-block">
                  {item.activity.reference}
                </p>
              </div>

              <div className="space-y-1 sm:col-span-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Activity Description
                </p>
                <p className="font-extrabold text-slate-900 text-sm leading-snug">
                  {item.activity.description}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Project
                </p>
                <p className="font-bold text-slate-800 text-xs">
                  {item.project.shortName} ({item.project.code})
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Procurement Plan
                </p>
                <p className="font-bold text-slate-800 text-xs">
                  {item.plan.name}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Fiscal Year
                </p>
                <p className="font-bold text-slate-800 text-xs">
                  {item.plan.budgetYear}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Category & Method
                </p>
                <p className="font-bold text-slate-800 text-xs">
                  {item.activity.category} • {item.activity.method}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Estimated Amount
                </p>
                <p className="font-extrabold text-slate-900 text-xs">
                  {formatAmount(item.activity.estimatedAmount)}{" "}
                  {form?.currency || item.plan.currency}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Funding Source
                </p>
                <p className="font-bold text-slate-800 text-xs">
                  {form?.fundingSource || item.project.fundingSource}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Market Approach & Review
                </p>
                <p className="font-semibold text-slate-700 text-xs">
                  {form?.marketApproach || "Open"} •{" "}
                  {form?.reviewType || "Prior Review"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Assigned Officer(s)
                </p>
                <p className="font-extrabold text-[#0A3C2F] text-xs">
                  {officerNames}
                </p>
              </div>
            </div>
          </div>

          {/* Integrated Execution Status Bar */}
          <div className="bg-slate-50 border-t border-slate-200/80 p-6 sm:p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Overall Status
              </p>
              <div className="pt-1">
                <StatusText className="text-xs" label={displayStatus} />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Current Stage
              </p>
              <p className="font-extrabold text-slate-900 text-xs pt-0.5">
                {stage.name}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Roadmap Progress
              </p>
              <div className="pt-0.5 space-y-1.5">
                <p className="font-extrabold text-slate-900 text-xs">
                  {progress.completed} of {progress.total} Stages (
                  {progress.percent}%)
                </p>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0A3C2F] rounded-full transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                General Execution Note
              </p>
              <p className="font-medium text-slate-700 text-xs leading-relaxed pt-0.5">
                {item.tracking.generalRemarks ||
                  "No officer execution notes recorded."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROADMAP */}
      {activeTab === "roadmap" && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden space-y-4 p-5 sm:p-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-950 text-base flex items-center gap-2">
                <Route className="h-4.5 w-4.5 text-[#0A3C2F]" />
                Stage Lifecycle & Milestone Tracking Roadmap
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Read-only view of original planned dates, revised targets,
                actual completion dates, and officer stage logs.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-12">#</th>
                  <th className="py-3.5 px-4 min-w-55">Stage Name</th>
                  <th className="py-3.5 px-4 min-w-35">
                    Original Planned Target
                  </th>
                  <th className="py-3.5 px-4 min-w-35">Effective Target</th>
                  <th className="py-3.5 px-4 min-w-32.5">Actual Date</th>
                  <th className="py-3.5 px-4 min-w-30">Status</th>
                  <th className="py-3.5 px-4 text-center min-w-25">Delay</th>
                  <th className="py-3.5 px-4 min-w-50">Officer Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {roadmap.map((stg, i) => {
                  const tracking = resolvedStageTracking(item, stg);
                  const isNotApp = tracking.status === "Not Applicable";
                  const isComp = tracking.status === "Completed";
                  const delay = calculateDelayDays(
                    {
                      ethiopian: stg.ethiopianDate || "",
                      gregorian: stg.gregorianDate || "",
                    },
                    tracking,
                    todayIso,
                  );

                  return (
                    <tr key={stg.name} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {i + 1}
                      </td>
                      <td className="py-3.5 px-4 min-w-44 max-w-xs break-words">
                        <p className="font-bold text-slate-900 break-words">
                          {stg.name}
                        </p>
                        {tracking.revisions.length > 0 && (
                          <span className="mt-0.5 inline-block text-[10px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            R{tracking.revisions.length} Revised
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isNotApp ? (
                          <span className="text-slate-400 font-medium">
                            N/A
                          </span>
                        ) : (
                          <>
                            <p className="font-semibold text-slate-800">
                              {stg.gregorianDate || "—"}
                            </p>
                            {stg.ethiopianDate && (
                              <p className="text-[10px] text-slate-500">
                                {stg.ethiopianDate}
                              </p>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isNotApp ? (
                          <span className="text-slate-400 font-medium">
                            N/A
                          </span>
                        ) : (
                          <p className="font-bold text-slate-900">
                            {effectiveTargetDate(
                              {
                                ethiopian: stg.ethiopianDate || "",
                                gregorian: stg.gregorianDate || "",
                              },
                              tracking,
                            ).gregorian || "—"}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {isNotApp
                          ? "—"
                          : tracking.actualDate?.gregorian ||
                            tracking.actualDate?.ethiopian ||
                            stg.actualDate ||
                            "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusText
                          className="text-[10px]"
                          label={tracking.status}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {delay === null || isComp || isNotApp ? (
                          <span className="text-slate-400">—</span>
                        ) : delay > 0 ? (
                          <span className="font-bold text-[#b91c1c]">
                            {delay}d delayed
                          </span>
                        ) : (
                          <span className="font-semibold text-[#166534]">
                            0d
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs break-words">
                        <p className="break-words line-clamp-2">
                          {tracking.remarks || "No officer notes recorded."}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONTRACT */}
      {activeTab === "contract" && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs p-6 space-y-6 animate-in fade-in duration-150">
          <h3 className="font-extrabold text-slate-950 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
            <BriefcaseBusiness className="h-4.5 w-4.5 text-[#0A3C2F]" />
            Contract & Award Oversight Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Contract Process Status
              </p>
              <div className="pt-1">
                <StatusText
                  className="text-xs"
                  label={item.tracking.processStatus}
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Activity Reference
              </p>
              <p className="font-mono font-bold text-[#0A3C2F] text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-block">
                {item.activity.reference}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Base Currency
              </p>
              <p className="font-extrabold text-slate-900 text-xs pt-0.5">
                {form?.currency || item.plan.currency}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Executing Agency
              </p>
              <p className="font-extrabold text-slate-900 text-xs pt-0.5">
                {item.project.executingAgency} (
                {item.project.countryOrganisation})
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Funding Source
              </p>
              <p className="font-extrabold text-slate-900 text-xs pt-0.5">
                {form?.fundingSource || item.project.fundingSource}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Record Updated
              </p>
              <p className="font-semibold text-slate-700 text-xs pt-0.5">
                {new Date(item.tracking.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500 font-medium">
            <LockKeyhole className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              Activity Tracker execution handoff details are read-only for{" "}
              {userRole === "MANAGEMENT" ? "Executive Management" : "Director"}{" "}
              oversight.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
