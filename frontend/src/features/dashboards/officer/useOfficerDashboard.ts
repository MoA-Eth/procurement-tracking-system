"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/authTypes";
import { fetchProjects, type BackendProject } from "@/lib/projectsApi";
import { fetchPlans, type BackendPlan } from "@/lib/plansApi";
import {
  filterAssignedProjects,
  mapOfficerProjectsList,
  filterAssignedPlans,
  extractLiveDelayedActivities,
  calculateOverviewStatusItems,
  generateDynamicAlerts,
} from "./officerCalculations";
import type { OfficerAlert } from "./officerData";

export function useOfficerDashboard(user: AuthUser) {
  const [backendProjects, setBackendProjects] = useState<BackendProject[]>([]);
  const [backendPlans, setBackendPlans] = useState<BackendPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [projects, plans] = await Promise.all([
          fetchProjects(),
          fetchPlans(),
        ]);
        if (isMounted) {
          setBackendProjects(projects || []);
          setBackendPlans(plans || []);
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
  }, []);

  const assignedProjects = useMemo(() => {
    if (loading || backendProjects.length === 0) return [];
    return filterAssignedProjects(backendProjects, user);
  }, [backendProjects, loading, user]);

  const officerProjectsList = useMemo(() => {
    return mapOfficerProjectsList(assignedProjects);
  }, [assignedProjects]);

  const assignedPlans = useMemo(() => {
    return filterAssignedPlans(backendPlans, assignedProjects);
  }, [backendPlans, assignedProjects]);

  const liveDelayedActivities = useMemo(() => {
    return extractLiveDelayedActivities(assignedPlans, currentTime);
  }, [assignedPlans, currentTime]);

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
    );
  }, [assignedPlans, liveDelayedActivities, currentTime]);

  return {
    loading,
    officerProjectsList,
    overviewStatusItems,
    dynamicAlerts,
  };
}
