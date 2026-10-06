"use client";

import {
  OFFICER_ACTIVITY_TRACKING_STORAGE_KEY,
  parseActivityTrackingRecords,
  type OfficerActivityTrackingRecord,
} from "@/features/activity-tracker/data/officerActivityTracking";
import {
  OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
  parseSavedActivityRecords,
  type SavedOfficerActivityRecord,
} from "@/features/projects/data/officerActivityDrafts";
import {
  OFFICER_PLAN_DRAFTS_STORAGE_KEY,
  parseSavedPlanRecords,
  type SavedOfficerPlanRecord,
} from "@/features/projects/data/officerPlanDrafts";
import { fetchActivities, type BackendActivity } from "@/lib/activitiesApi";
import { fetchNotifications, type SystemNotification } from "@/lib/alertsApi";
import type { AuthUser } from "@/lib/authTypes";
import { fetchPlans, getCachedPlans, type BackendPlan } from "@/lib/plansApi";
import {
  fetchProjects,
  getCachedProjects,
  type BackendProject,
} from "@/lib/projectsApi";
import { useEffect, useMemo, useState } from "react";
import {
  calculateOverviewStatusItems,
  extractLiveDelayedActivities,
  filterAssignedPlans,
  filterAssignedProjects,
  generateDynamicAlerts,
  mapOfficerProjectsList,
} from "./officerCalculations";
import type { OfficerAlert } from "./officerData";

const DEFAULT_FALLBACK_START_DATE = "2026-01-01T00:00:00.000Z";
const DEFAULT_FALLBACK_END_DATE = "2026-12-31T23:59:59.000Z";

export function useOfficerDashboard(user: AuthUser) {
  const initialProjects = getCachedProjects() || [];
  const initialPlans = getCachedPlans() || [];

  const [backendProjects, setBackendProjects] =
    useState<BackendProject[]>(initialProjects);
  const [backendPlans, setBackendPlans] = useState<BackendPlan[]>(initialPlans);
  const [backendActivities, setBackendActivities] = useState<BackendActivity[]>(
    [],
  );
  const [systemNotifications, setSystemNotifications] = useState<
    SystemNotification[]
  >([]);

  const [savedPlanRecords, setSavedPlanRecords] = useState<
    SavedOfficerPlanRecord[]
  >([]);
  const [savedActivityRecords, setSavedActivityRecords] = useState<
    SavedOfficerActivityRecord[]
  >([]);
  const [trackingRecords, setTrackingRecords] = useState<
    OfficerActivityTrackingRecord[]
  >([]);

  const [loading, setLoading] = useState(
    () => initialProjects.length === 0 && initialPlans.length === 0,
  );
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // SSR-safe load of client drafts and stage tracking records
  useEffect(() => {
    const loadLocalDrafts = () => {
      try {
        if (typeof window !== "undefined") {
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
              window.localStorage.getItem(
                OFFICER_ACTIVITY_TRACKING_STORAGE_KEY,
              ),
            ),
          );
        }
      } catch (err) {
        console.warn("OfficerDashboard local storage parse note:", err);
      }
    };

    const timer = window.setTimeout(loadLocalDrafts, 0);

    const handleStorageChange = () => {
      loadLocalDrafts();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("pts:new-alert", handleStorageChange);
    window.addEventListener("pts:notification-read", handleStorageChange);
    window.addEventListener("pts:notifications-read-all", handleStorageChange);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pts:new-alert", handleStorageChange);
      window.removeEventListener("pts:notification-read", handleStorageChange);
      window.removeEventListener(
        "pts:notifications-read-all",
        handleStorageChange,
      );
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading((prev) => (initialProjects.length === 0 ? true : prev));
        const [projects, plans, activities, notifications] = await Promise.all([
          fetchProjects(),
          fetchPlans(),
          fetchActivities(),
          fetchNotifications(user.role),
        ]);
        if (isMounted) {
          setBackendProjects(projects || []);
          setBackendPlans(plans || []);
          setBackendActivities(activities || []);
          setSystemNotifications(notifications || []);
        }
      } catch (err) {
        console.warn("OfficerDashboard loadData note:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user.role, initialProjects.length]);

  const assignedProjects = useMemo(() => {
    if (backendProjects.length === 0) return [];
    return filterAssignedProjects(backendProjects, user);
  }, [backendProjects, user]);

  const assignedPlans = useMemo(() => {
    const backendAssigned = filterAssignedPlans(backendPlans, assignedProjects);
    if (savedPlanRecords.length === 0) return backendAssigned;

    const assignedCodes = new Set(
      assignedProjects.map((p) => (p.code || "").toLowerCase()),
    );
    const assignedIds = new Set(
      assignedProjects.map((p) => (p.id || "").toLowerCase()),
    );

    const localPlans: BackendPlan[] = savedPlanRecords
      .filter((sp) => {
        const pCode = (sp.projectCode || "").toLowerCase();
        return assignedCodes.has(pCode) || assignedIds.has(pCode);
      })
      .filter((sp) => {
        const planObj = sp.plan || (sp as any);
        const planId = planObj.id || planObj.reference || "";
        const planTitle = (planObj.name || (planObj as any).title || "")
          .toLowerCase()
          .trim();
        return !backendAssigned.some(
          (bp) =>
            (Boolean(bp.id && planId) && bp.id === planId) ||
            (Boolean(bp.title && planTitle) &&
              (bp.title || "").toLowerCase().trim() === planTitle),
        );
      })
      .map((sp, idx) => {
        const planObj = sp.plan || (sp as any);
        const planId =
          planObj.id ||
          planObj.reference ||
          `local-plan-${sp.projectCode || "draft"}-${idx}`;
        const planTitle =
          planObj.name || (planObj as any).title || "Untitled Plan";
        const matchingProject = assignedProjects.find(
          (p) =>
            (p.code &&
              p.code.toLowerCase() === (sp.projectCode || "").toLowerCase()) ||
            (p.id &&
              p.id.toLowerCase() === (sp.projectCode || "").toLowerCase()),
        );

        const periodStart =
          planObj.planPeriod?.from?.gregorian ||
          planObj.createdAt ||
          DEFAULT_FALLBACK_START_DATE;
        const periodEnd =
          planObj.planPeriod?.to?.gregorian || DEFAULT_FALLBACK_END_DATE;

        const rawStatus = (planObj.status || "Draft")
          .toUpperCase()
          .replace(/\s+/g, "_");
        const mappedStatus =
          rawStatus === "SUBMITTED_TO_DIRECTOR" || rawStatus === "SUBMITTED"
            ? "SUBMITTED"
            : rawStatus === "COMMITTEE_REVIEW" || rawStatus === "WITH_COMMITTEE"
              ? "WITH_COMMITTEE"
              : rawStatus === "RETURNED" ||
                  rawStatus === "RETURNED_FOR_REVISION"
                ? "RETURNED_FOR_REVISION"
                : rawStatus === "APPROVED" || rawStatus === "FINALLY_APPROVED"
                  ? "APPROVED"
                  : "DRAFT";

        return {
          id: planId,
          title: planTitle,
          description: planObj.description || null,
          budgetYear: planObj.budgetYear || "2026",
          periodStart,
          periodEnd,
          status: mappedStatus,
          project: matchingProject
            ? {
                id: matchingProject.id,
                code: matchingProject.code,
                name: matchingProject.name,
              }
            : undefined,
          projectId: matchingProject?.id || sp.projectCode || "",
          activities: (planObj.planActivities || []) as any,
          createdAt: planObj.createdAt || DEFAULT_FALLBACK_START_DATE,
          updatedAt: planObj.updatedAt || DEFAULT_FALLBACK_START_DATE,
        };
      });

    return [...backendAssigned, ...localPlans];
  }, [backendPlans, assignedProjects, savedPlanRecords]);

  const officerProjectsList = useMemo(() => {
    return mapOfficerProjectsList(assignedProjects, assignedPlans);
  }, [assignedProjects, assignedPlans]);

  const liveDelayedActivities = useMemo(() => {
    const extraActs = [
      ...backendActivities,
      ...savedActivityRecords.map((r) => ({
        ...r.activity,
        planReference: r.planReference,
        projectCode: r.projectCode,
        stages: r.activity.details?.roadmap || [],
      })),
    ];
    return extractLiveDelayedActivities(
      assignedPlans,
      currentTime,
      extraActs,
      trackingRecords,
    );
  }, [
    assignedPlans,
    currentTime,
    backendActivities,
    savedActivityRecords,
    trackingRecords,
  ]);

  const overviewStatusItems = useMemo(() => {
    return calculateOverviewStatusItems(
      officerProjectsList.length,
      assignedPlans,
      liveDelayedActivities.length,
    );
  }, [officerProjectsList.length, assignedPlans, liveDelayedActivities.length]);

  const dynamicAlerts: readonly OfficerAlert[] = useMemo(() => {
    return generateDynamicAlerts(
      assignedPlans,
      liveDelayedActivities,
      currentTime,
      systemNotifications,
    );
  }, [assignedPlans, liveDelayedActivities, currentTime, systemNotifications]);

  return {
    loading,
    officerProjectsList,
    overviewStatusItems,
    dynamicAlerts,
  };
}
