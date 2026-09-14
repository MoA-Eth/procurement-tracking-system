"use client";

import { StatusText } from "../../../components/dashboard/StatusText";
import {
  calculateDelayDays,
  createInitialActivityTrackingRecord,
  effectiveTargetDate,
  findActivityTrackingRecord,
  OFFICER_ACTIVITY_TRACKING_STORAGE_KEY,
  parseActivityTrackingRecords,
  upsertActivityTrackingRecord,
  type ActivityStageTracking,
  type OfficerActivityTrackingRecord,
  type TrackingDateValue,
} from "../data/officerActivityTracking";
import { ActivityTrackingDetailView } from "./ActivityTrackingDetailView";
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
  isProjectAssignedToOfficer,
  mapBackendProjectToOfficerProject,
} from "@/lib/projectsApi";
import { fetchPlans, mapBackendPlanToOfficerPlanSummary } from "@/lib/plansApi";
import { fetchActivities, type BackendActivity } from "@/lib/activitiesApi";
import { getCurrentUser } from "@/lib/authApi";
import type { AuthUser } from "@/lib/authTypes";
import {
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  House,
  RotateCcw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export interface OfficerTrackedActivityItem {
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

export function OfficerActivityTrackerView({
  currentUser,
  selectedActivityReference,
  selectedPlanReference,
  selectedProjectCode,
}: {
  currentUser?: AuthUser;
  selectedActivityReference?: string;
  selectedPlanReference?: string;
  selectedProjectCode?: string;
}) {
  const effectiveUser = currentUser || getCurrentUser();
  const [savedPlanRecords, setSavedPlanRecords] = useState<
    SavedOfficerPlanRecord[]
  >([]);
  const [savedActivityRecords, setSavedActivityRecords] = useState<
    SavedOfficerActivityRecord[]
  >([]);
  const [trackingRecords, setTrackingRecords] = useState<
    OfficerActivityTrackingRecord[]
  >([]);
  const [backendProjects, setBackendProjects] = useState<OfficerProject[]>([]);

  const [backendActivities, setBackendActivities] = useState<
    SavedOfficerActivityRecord[]
  >([]);

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
          const assignedRawProjects = effectiveUser
            ? rawProjects.filter((p) =>
                isProjectAssignedToOfficer(p, effectiveUser),
              )
            : rawProjects;
          const assignedIds = new Set(
            assignedRawProjects.map((p) => p.id).filter(Boolean),
          );
          const assignedCodes = new Set(
            assignedRawProjects.map((p) => p.code.toLowerCase()),
          );

          const mapped = assignedRawProjects.map((p) => {
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

          if (rawActivities && rawActivities.length > 0) {
            const dbRecords: SavedOfficerActivityRecord[] = rawActivities
              .filter((ba: BackendActivity) => {
                if (!effectiveUser || assignedRawProjects.length === 0)
                  return true;
                const parentPlan = (rawPlans || []).find(
                  (p) => p.id === ba.planId,
                );
                const projCode =
                  parentPlan?.project?.code || ba.plan?.project?.code || "";
                const projId =
                  (parentPlan as any)?.projectId ||
                  parentPlan?.project?.id ||
                  (ba.plan as any)?.projectId ||
                  ba.plan?.project?.id ||
                  "";
                return (
                  (projCode && assignedCodes.has(projCode.toLowerCase())) ||
                  (projId && assignedIds.has(projId))
                );
              })
              .map((ba: BackendActivity) => {
                const summary =
                  mapBackendActivityToProcurementActivitySummary(ba);
                const parentPlan = (rawPlans || []).find(
                  (p) => p.id === ba.planId,
                );
                const planRef =
                  parentPlan?.title || ba.plan?.title || ba.planId;
                const projCode =
                  parentPlan?.project?.code ||
                  ba.plan?.project?.code ||
                  "PRJ-24-001";
                return {
                  activity: summary,
                  planReference: planRef,
                  projectCode: projCode,
                };
              });
            setBackendActivities(dbRecords);
          }
        }
      } catch (err) {
        console.warn("fetchProjects tracker note:", err);
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
  const selectedItem = items.find(
    (item) =>
      item.activity.reference === selectedActivityReference &&
      (!selectedProjectCode || item.project.code === selectedProjectCode) &&
      (!selectedPlanReference || item.plan.reference === selectedPlanReference),
  );

  function saveTracking(record: OfficerActivityTrackingRecord) {
    const nextRecords = upsertActivityTrackingRecord(trackingRecords, record);
    setTrackingRecords(nextRecords);
    window.localStorage.setItem(
      OFFICER_ACTIVITY_TRACKING_STORAGE_KEY,
      JSON.stringify(nextRecords),
    );
  }

  if (selectedItem) {
    return (
      <ActivityTrackingDetailView item={selectedItem} onSave={saveTracking} />
    );
  }

  return <ActivityTrackerList items={items} />;
}

export function collectTrackableActivities(
  projects: readonly OfficerProject[],
  savedActivityRecords: readonly SavedOfficerActivityRecord[],
  trackingRecords: readonly OfficerActivityTrackingRecord[],
) {
  const itemsByIdentity = new Map<string, OfficerTrackedActivityItem>();

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

        const key =
          `${project.code}-${plan.reference}-${activity.reference}`.toLowerCase();
        itemsByIdentity.set(key, { activity, plan, project, tracking });
      }
    }
  }

  return Array.from(itemsByIdentity.values());
}

interface TrackerStageSnapshot {
  delayDays: number | null;
  name: string;
  originalDate: TrackingDateValue;
  status: ActivityStageTracking["status"];
  targetDate: TrackingDateValue;
}

export function trackerCurrentStage(
  item: OfficerTrackedActivityItem,
  todayIso = new Date().toISOString().slice(0, 10),
): TrackerStageSnapshot {
  const roadmap = item.activity.details?.roadmap ?? [];

  if (roadmap.length === 0) {
    return {
      delayDays: null,
      name: item.activity.currentStage,
      originalDate: emptyTrackingDate(),
      status:
        item.activity.status === "Completed"
          ? "Completed"
          : item.activity.status === "Not Started"
            ? "Not Started"
            : "In Progress",
      targetDate: emptyTrackingDate(),
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
  const originalDate = dateFromStage(selectedStage);

  return {
    delayDays: calculateDelayDays(originalDate, tracking, todayIso),
    name: selectedStage.name,
    originalDate,
    status: tracking.status,
    targetDate: effectiveTargetDate(originalDate, tracking),
  };
}

export function trackerDisplayStatus(
  item: OfficerTrackedActivityItem,
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

export function trackerIsDueSoon(
  item: OfficerTrackedActivityItem,
  todayIso = new Date().toISOString().slice(0, 10),
) {
  const status = trackerDisplayStatus(item, todayIso);
  if (status !== "In Progress" && status !== "Not Started") return false;

  const target = trackerCurrentStage(item, todayIso).targetDate.gregorian;
  if (!target) return false;
  const remainingDays = differenceInIsoDays(todayIso, target);
  return remainingDays >= 0 && remainingDays <= DUE_SOON_DAYS;
}

export function trackerStageProgress(item: OfficerTrackedActivityItem) {
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
  item: OfficerTrackedActivityItem,
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
  item: OfficerTrackedActivityItem,
  todayIso: string,
) {
  const delays = (item.activity.details?.roadmap ?? [])
    .map((stage) => {
      const tracking = resolvedStageTracking(item, stage);
      if (["Completed", "Not Applicable"].includes(tracking.status)) {
        return 0;
      }
      return calculateDelayDays(dateFromStage(stage), tracking, todayIso) ?? 0;
    })
    .filter((delay) => delay > 0);

  return delays.length > 0 ? Math.max(...delays) : null;
}

function hasCompletedRoadmapStage(
  item: OfficerTrackedActivityItem,
  stageName: string,
) {
  return (item.activity.details?.roadmap ?? []).some(
    (stage) =>
      stage.name.toLowerCase().includes(stageName) &&
      resolvedStageTracking(item, stage).status === "Completed",
  );
}

function dateFromStage(
  stage: NonNullable<ProcurementActivitySummary["details"]>["roadmap"][number],
): TrackingDateValue {
  return {
    ethiopian: stage.ethiopianDate || "",
    gregorian: stage.gregorianDate || "",
  };
}

function emptyTrackingDate(): TrackingDateValue {
  return { ethiopian: "", gregorian: "" };
}

function differenceInIsoDays(fromIso: string, toIso: string) {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.POSITIVE_INFINITY;
  return Math.floor((to - from) / 86_400_000);
}

function organizationForTrackerItem(item: OfficerTrackedActivityItem) {
  return (
    item.plan.organizationRegion?.trim() ||
    item.project.organizationRegion?.trim() ||
    item.project.countryOrganisation
  );
}

function matchesQuickFilter(
  item: OfficerTrackedActivityItem,
  filter: TrackerQuickFilter,
  todayIso: string,
) {
  const status = trackerDisplayStatus(item, todayIso);
  if (filter === "all") return true;
  if (filter === "delayed") return status === "Delayed";
  if (filter === "due-soon") return trackerIsDueSoon(item, todayIso);
  if (filter === "in-progress") return status === "In Progress";
  if (filter === "completed") return status === "Completed";
  return false;
}

function compareTrackerItems(
  left: OfficerTrackedActivityItem,
  right: OfficerTrackedActivityItem,
  sortBy: TrackerSort,
  todayIso: string,
) {
  const leftStatus = trackerDisplayStatus(left, todayIso);
  const rightStatus = trackerDisplayStatus(right, todayIso);
  const leftStage = trackerCurrentStage(left, todayIso);
  const rightStage = trackerCurrentStage(right, todayIso);

  if (sortBy === "attention") {
    const difference =
      attentionPriority(leftStatus, trackerIsDueSoon(left, todayIso)) -
      attentionPriority(rightStatus, trackerIsDueSoon(right, todayIso));
    if (difference !== 0) return difference;
  }

  if (sortBy === "delay-desc") {
    const difference =
      (trackerMaximumActiveDelay(right, todayIso) ?? 0) -
      (trackerMaximumActiveDelay(left, todayIso) ?? 0);
    if (difference !== 0) return difference;
  }

  if (sortBy === "target-asc" || sortBy === "attention") {
    const leftTarget = leftStage.targetDate.gregorian || "9999-12-31";
    const rightTarget = rightStage.targetDate.gregorian || "9999-12-31";
    const difference = leftTarget.localeCompare(rightTarget);
    if (difference !== 0) return difference;
  }

  if (sortBy === "stage") {
    const difference = leftStage.name.localeCompare(rightStage.name);
    if (difference !== 0) return difference;
  }

  if (sortBy === "status") {
    const difference = leftStatus.localeCompare(rightStatus);
    if (difference !== 0) return difference;
  }

  return left.activity.reference.localeCompare(right.activity.reference);
}

function attentionPriority(status: TrackerDisplayStatus, dueSoon: boolean) {
  if (status === "Delayed") return 0;
  if (dueSoon) return 1;
  if (status === "In Progress") return 2;
  if (status === "Contracted") return 3;
  if (status === "Not Started") return 4;
  if (status === "Completed") return 5;
  return 6;
}
function ActivityTrackerList({
  items,
}: {
  items: readonly OfficerTrackedActivityItem[];
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [category, setCategory] = useState("all");
  const [currentStage, setCurrentStage] = useState("all");
  const [delayStatus, setDelayStatus] = useState("all");
  const [displayStatus, setDisplayStatus] = useState("all");
  const [fiscalYear, setFiscalYear] = useState("all");
  const [method, setMethod] = useState("all");
  const [organization, setOrganization] = useState("all");
  const [page, setPage] = useState(1);
  const [planReference, setPlanReference] = useState("all");
  const [projectCode, setProjectCode] = useState("all");
  const [quickFilter, setQuickFilter] = useState<TrackerQuickFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [sortBy, setSortBy] = useState<TrackerSort>("attention");
  const [targetDateFrom, setTargetDateFrom] = useState("");
  const [targetDateTo, setTargetDateTo] = useState("");

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
        new Set(items.map((item) => organizationForTrackerItem(item))),
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
        organizationForTrackerItem(item),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!search || searchable.includes(search)) &&
        (projectCode === "all" || item.project.code === projectCode) &&
        (planReference === "all" || item.plan.reference === planReference) &&
        (category === "all" || item.activity.category === category) &&
        (method === "all" || item.activity.method === method) &&
        (!targetDateFrom ||
          (stage.targetDate.gregorian &&
            stage.targetDate.gregorian >= targetDateFrom)) &&
        (!targetDateTo ||
          (stage.targetDate.gregorian &&
            stage.targetDate.gregorian <= targetDateTo)) &&
        (fiscalYear === "all" || item.plan.budgetYear === fiscalYear) &&
        (organization === "all" ||
          organizationForTrackerItem(item) === organization) &&
        (currentStage === "all" || stage.name === currentStage) &&
        (displayStatus === "all" || status === displayStatus) &&
        (delayStatus === "all" ||
          (delayStatus === "delayed" && delayed) ||
          (delayStatus === "due-soon" && dueSoon) ||
          (delayStatus === "on-schedule" && !delayed && !dueSoon)) &&
        matchesQuickFilter(item, quickFilter, todayIso)
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

  const orderedItems = useMemo(
    () =>
      [...filteredItems].sort((left, right) =>
        compareTrackerItems(left, right, sortBy, todayIso),
      ),
    [filteredItems, sortBy, todayIso],
  );
  const totalPages = Math.max(1, Math.ceil(orderedItems.length / PAGE_SIZE));
  const currentPageNumber = Math.min(page, totalPages);
  const firstVisibleIndex = (currentPageNumber - 1) * PAGE_SIZE;
  const visibleItems = orderedItems.slice(
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
  const additionalFilterCount =
    Number(planReference !== "all") +
    Number(fiscalYear !== "all") +
    Number(displayStatus !== "all") +
    Number(delayStatus !== "all") +
    Number(currentStage !== "all") +
    Number(organization !== "all") +
    Number(Boolean(targetDateFrom)) +
    Number(Boolean(targetDateTo)) +
    Number(sortBy !== "attention");

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
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden pb-6">
      <header>
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                className="inline-flex items-center gap-1 hover:text-[#176c55] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
                href="/dashboard/officer"
              >
                <House aria-hidden="true" className="h-3.5 w-3.5" />
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li aria-current="page" className="font-bold text-[#176c55]">
              Activity Tracker
            </li>
          </ol>
        </nav>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#10243f]">
          Activity Tracker
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Monitor approved procurement activities, milestones, and delays.
        </p>
      </header>

      <nav
        aria-label="Activity tracker views"
        className="flex gap-6 overflow-x-auto border-b border-slate-200"
      >
        <QuickFilterButton
          active={quickFilter === "all"}
          count={items.length}
          label="All Activities"
          onClick={() => setQuickFilter("all")}
        />
        <QuickFilterButton
          active={quickFilter === "delayed"}
          count={delayedCount}
          label="Delayed"
          onClick={() => setQuickFilter("delayed")}
        />
        <QuickFilterButton
          active={quickFilter === "due-soon"}
          count={dueSoonCount}
          label="Due Soon"
          onClick={() => setQuickFilter("due-soon")}
        />
        <QuickFilterButton
          active={quickFilter === "in-progress"}
          count={inProgressCount}
          label="In Progress"
          onClick={() => setQuickFilter("in-progress")}
        />
        <QuickFilterButton
          active={quickFilter === "completed"}
          count={completedCount}
          label="Completed"
          onClick={() => setQuickFilter("completed")}
        />
      </nav>

      {/* Filters Panel matching Screenshot */}
      <section
        aria-label="Activity tracker filters"
        className="w-full rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4"
      >
        {/* Row 1: Search, Project, Category, Method, More Filters */}
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
              showMoreFilters || additionalFilterCount > 0
                ? "bg-[#E6F4EA] text-[#0D6E53] border-[#A8E6CF]"
                : "bg-[#E6F4EA]/80 hover:bg-[#E6F4EA] border-[#A8E6CF] text-[#0D6E53]"
            }`}
          >
            <Filter className="h-4 w-4 text-[#0D6E53]" />
            <span>More Filters</span>
            {additionalFilterCount > 0 ? (
              <span className="bg-[#0D6E53] text-white px-1.5 py-0.5 rounded-full text-[10px] font-extrabold">
                {additionalFilterCount}
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
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Contracted">Contracted</option>
                    <option value="Completed">Completed</option>
                    <option value="Terminated">Terminated</option>
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

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <div
          aria-label="Tracked procurement activities"
          className="max-w-full overflow-x-auto"
          role="region"
          tabIndex={0}
        >
          <table className="w-full min-w-[1240px] border-collapse text-left">
            <thead className="bg-[#0A3C2F]">
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th
                  className="min-w-[140px] px-4 py-3.5 whitespace-nowrap"
                  scope="col"
                >
                  Reference No.
                </th>
                <th className="min-w-[220px] px-4 py-3.5" scope="col">
                  Activity
                </th>
                <th className="min-w-[160px] px-4 py-3.5" scope="col">
                  Project
                </th>
                <th
                  className="min-w-[100px] px-4 py-3.5 whitespace-nowrap"
                  scope="col"
                >
                  Category
                </th>
                <th
                  className="min-w-[130px] px-4 py-3.5 whitespace-nowrap"
                  scope="col"
                >
                  Method
                </th>
                <th className="min-w-[160px] px-4 py-3.5" scope="col">
                  Current Stage
                </th>
                <th
                  className="min-w-[130px] px-4 py-3.5 whitespace-nowrap"
                  scope="col"
                >
                  Effective Target
                </th>
                <th
                  className="min-w-[125px] px-4 py-3.5 text-center whitespace-nowrap"
                  scope="col"
                >
                  Delay
                </th>
                <th
                  className="min-w-[125px] px-4 py-3.5 whitespace-nowrap"
                  scope="col"
                >
                  Overall Status
                </th>
                <th
                  className="min-w-[130px] pr-6 pl-4 py-3.5 text-right whitespace-nowrap"
                  scope="col"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleItems.length > 0 ? (
                visibleItems.map((item) => (
                  <TrackerRow
                    item={item}
                    key={trackerItemKey(item)}
                    todayIso={todayIso}
                  />
                ))
              ) : (
                <tr>
                  <td className="px-4 py-14 text-center" colSpan={10}>
                    <Search className="mx-auto h-6 w-6 text-slate-300" />
                    <p className="mt-2 text-sm font-bold text-slate-700">
                      No activities match these filters
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Reset a filter or search using another reference.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-[#fafbfc] px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {orderedItems.length === 0
              ? "Showing 0 activities"
              : `Showing ${firstVisibleIndex + 1} to ${Math.min(
                  firstVisibleIndex + PAGE_SIZE,
                  orderedItems.length,
                )} of ${orderedItems.length} matching activities`}
          </span>
          <div className="flex items-center gap-3">
            <span>
              Page {currentPageNumber} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                aria-label="Previous page"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-[#8db7a6] hover:text-[#176c55] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPageNumber === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                aria-label="Next page"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-[#8db7a6] hover:text-[#176c55] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPageNumber === totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                type="button"
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}

function TrackerRow({
  item,
  todayIso,
}: {
  item: OfficerTrackedActivityItem;
  todayIso: string;
}) {
  const status = trackerDisplayStatus(item, todayIso);
  const stage = trackerCurrentStage(item, todayIso);
  const dueSoon = trackerIsDueSoon(item, todayIso);
  const remainingDays = stage.targetDate.gregorian
    ? differenceInIsoDays(todayIso, stage.targetDate.gregorian)
    : null;
  const progress = trackerStageProgress(item);
  const delay = stage.delayDays;
  const href =
    "/workspace/activity-tracker?project=" +
    encodeURIComponent(item.project.code) +
    "&plan=" +
    encodeURIComponent(item.plan.reference) +
    "&activity=" +
    encodeURIComponent(item.activity.reference);

  return (
    <tr className="align-middle text-xs text-slate-700 transition hover:bg-slate-50/70">
      <td className="px-4 py-3.5 whitespace-nowrap">
        <Link
          title={item.activity.reference}
          className="font-mono text-[10px] font-bold text-[#1261a8] hover:text-[#07523f] hover:underline truncate block"
          href={href}
        >
          {item.activity.reference}
        </Link>
      </td>
      <td className="px-4 py-3.5">
        <Link
          title={item.activity.description}
          className="font-bold leading-5 text-[#10243f] hover:text-[#07523f] hover:underline line-clamp-2 break-words [overflow-wrap:anywhere] block"
          href={href}
        >
          {item.activity.description}
        </Link>
        {item.activity.details?.roadmap.length ? (
          <p className="mt-1 text-[10px] text-slate-500 font-medium">
            {progress.completed} of {progress.total} stages completed
          </p>
        ) : null}
      </td>
      <td className="px-4 py-3.5">
        <p
          title={item.project.shortName}
          className="font-bold text-slate-700 leading-snug line-clamp-2 break-words [overflow-wrap:anywhere]"
        >
          {item.project.shortName}
        </p>
        <p className="mt-1 text-[10px] text-slate-500 font-medium">
          {item.plan.budgetYear}
        </p>
      </td>
      <td className="px-4 py-3.5 font-semibold text-slate-700 leading-snug break-words">
        {item.activity.category}
      </td>
      <td
        className="px-4 py-3.5 font-semibold text-slate-700 leading-snug line-clamp-2 break-words [overflow-wrap:anywhere]"
        title={item.activity.method}
      >
        {item.activity.method}
      </td>
      <td className="px-4 py-3.5">
        <p
          title={stage.name}
          className="font-semibold leading-5 text-slate-700 line-clamp-2 break-words [overflow-wrap:anywhere]"
        >
          {stage.name}
        </p>
        <p className="mt-1 text-[10px] text-slate-500 font-medium">
          {stage.status}
        </p>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <DateValue date={stage.targetDate} />
      </td>
      <td className="px-4 py-3.5 text-center whitespace-nowrap">
        {dueSoon && remainingDays !== null ? (
          <span className="font-bold text-[#b45309]">
            {remainingDays === 0 ? "Due today" : `${remainingDays} days left`}
          </span>
        ) : delay === null ? (
          <span className="text-slate-400">—</span>
        ) : delay > 0 ? (
          <span className="font-bold text-[#b91c1c]">{delay} days delayed</span>
        ) : (
          <span className="font-semibold text-[#166534]">On schedule</span>
        )}
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <StatusText className="text-[10px]" label={status} />
      </td>
      <td className="pr-6 pl-4 py-3.5 text-right whitespace-nowrap">
        <Link
          className="font-bold text-[#1261a8] hover:text-[#07523f] hover:underline"
          href={href}
        >
          View / Update
        </Link>
      </td>
    </tr>
  );
}

function QuickFilterButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`shrink-0 border-b-2 px-0.5 pt-1 pb-3 text-xs font-bold transition ${
        active
          ? "border-[#176c55] text-[#07523f]"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
      onClick={onClick}
      type="button"
    >
      {label} <span className="font-semibold text-slate-400">{count}</span>
    </button>
  );
}

function DateValue({ date }: { date: TrackingDateValue }) {
  if (!date.gregorian) return <span className="text-slate-400">—</span>;
  return (
    <div>
      <p className="font-semibold text-slate-700">
        {formatGregorianDate(date.gregorian)}
      </p>
      {date.ethiopian ? (
        <p className="mt-1 text-[10px] text-slate-500">{date.ethiopian}</p>
      ) : null}
    </div>
  );
}

function trackerItemKey(item: OfficerTrackedActivityItem) {
  return [item.project.code, item.plan.reference, item.activity.reference].join(
    "::",
  );
}

function formatGregorianDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}
