"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchProjects, type BackendProject } from "@/lib/projectsApi";
import { fetchPlans, type BackendPlan } from "@/lib/plansApi";
import { fetchContracts, type BackendContract } from "@/lib/contractsApi";
import {
  filterPlans,
  filterProjects,
  extractAvailableSectors,
  extractAvailableFiscalYears,
  getCurrentEthiopianYear,
  computePendingPlans,
  computeCommitteePlansCount,
  computeCriticalDelays,
  computeFinancialSummary,
  computePipelineStages,
  computeDirectorHealthMetrics,
  computeSpendPercentages,
} from "./directorCalculations";
import type { UserRole } from "@/types";

import { fetchActivities } from "@/lib/activitiesApi";

// Module-level cache to avoid redundant API calls on sidebar navigation
interface DashboardCache {
  projects: BackendProject[];
  plans: BackendPlan[];
  contracts: BackendContract[];
  timestamp: number;
}
let _dashboardCache: DashboardCache | null = null;
const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function useDirectorDashboard(userRole: UserRole = "DIRECTOR") {
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [plans, setPlans] = useState<BackendPlan[]>([]);
  const [contracts, setContracts] = useState<BackendContract[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic default Ethiopian Fiscal Year based on current date
  const defaultFiscalYear = useMemo(
    () => `${getCurrentEthiopianYear()} EFY`,
    [],
  );

  // Filter States matching mockup
  const [selectedFiscalYear, setSelectedFiscalYear] =
    useState<string>(defaultFiscalYear);
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [selectedProject, setSelectedProject] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Use cached data if still fresh to avoid redundant API calls
    if (
      _dashboardCache &&
      Date.now() - _dashboardCache.timestamp < DASHBOARD_CACHE_TTL_MS
    ) {
      setProjects(_dashboardCache.projects);
      setPlans(_dashboardCache.plans);
      setContracts(_dashboardCache.contracts);
      setLoading(false);
      return;
    }

    async function loadDashboardData() {
      try {
        const [projRes, planRes, contractRes, actRes] = await Promise.all([
          fetchProjects(),
          fetchPlans(),
          fetchContracts(),
          fetchActivities(),
        ]);
        if (isMounted) {
          const plansList = planRes || [];
          const activitiesList = actRes || [];
          const enrichedPlans = plansList.map((plan) => {
            if (plan.activities && plan.activities.length > 0) return plan;
            const planActs = activitiesList.filter(
              (a) => a.planId === plan.id || (a as any).plan?.id === plan.id,
            );
            return {
              ...plan,
              activities: planActs as any,
            };
          });

          let finalPlans = enrichedPlans;
          if (finalPlans.length === 0 && (projRes || []).length > 0) {
            const projectPlans = (projRes || []).flatMap((p) => p.plans || []);
            if (projectPlans.length > 0) {
              finalPlans = projectPlans.map((p) => {
                const planActs = activitiesList.filter(
                  (a) => a.planId === p.id,
                );
                return { ...p, activities: p.activities || planActs };
              });
            }
          }

          const cachedProjects = projRes || [];
          const cachedContracts = contractRes || [];

          // Cache the results
          _dashboardCache = {
            projects: cachedProjects,
            plans: finalPlans,
            contracts: cachedContracts,
            timestamp: Date.now(),
          };

          setProjects(cachedProjects);
          setPlans(finalPlans);
          setContracts(cachedContracts);
        }
      } catch (err) {
        console.warn("DirectorDashboard load error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Available sectors from live projects
  const availableSectors = useMemo(
    () => extractAvailableSectors(projects),
    [projects],
  );

  // Project options list
  const availableProjects = useMemo(() => {
    if (projects.length > 0) {
      return projects.map((p) => ({
        id: p.id,
        name: p.name || (p as any).title || "Project",
      }));
    }
    return [];
  }, [projects]);

  // Filter projects based on sector
  const filteredProjects = useMemo(
    () => filterProjects(projects, selectedSector),
    [projects, selectedSector],
  );

  const totalProjectsCount = filteredProjects.length;

  // Filter plans based on selected fiscal year, sector, project, and status
  const filteredPlans = useMemo(
    () =>
      filterPlans(plans, {
        fiscalYear: selectedFiscalYear,
        sector: selectedSector,
        project: selectedProject,
        status: selectedStatus,
        availableProjects,
      }),
    [
      plans,
      selectedFiscalYear,
      selectedSector,
      selectedProject,
      selectedStatus,
      availableProjects,
    ],
  );

  // Top KPI Metric: Awaiting Review Plans
  const pendingPlansLive = useMemo(
    () => computePendingPlans(filteredPlans, userRole),
    [filteredPlans, userRole],
  );
  const awaitingReviewCount = pendingPlansLive.length;

  // Top KPI Metric: Committee Progress Plans
  const committeePlansCount = useMemo(
    () => computeCommitteePlansCount(filteredPlans, userRole),
    [filteredPlans, userRole],
  );

  // Critical Delays
  const criticalDelaysLive = useMemo(
    () => computeCriticalDelays(filteredPlans, currentTime),
    [filteredPlans, currentTime],
  );
  const criticalDelaysCount = criticalDelaysLive.length;

  // Displayed pending plans and critical delays
  const displayedPendingPlans = pendingPlansLive;
  const displayedCriticalDelays = criticalDelaysLive;

  // Procurement Financial Capital & Contract Summary Calculation
  const financialSummary = useMemo(
    () =>
      computeFinancialSummary(
        filteredPlans,
        contracts,
        selectedProject,
        selectedSector,
      ),
    [filteredPlans, contracts, selectedProject, selectedSector],
  );

  // Pipeline Stages
  const pipelineStages = useMemo(
    () =>
      computePipelineStages(
        filteredPlans,
        contracts,
        selectedProject,
        selectedSector,
        awaitingReviewCount,
        committeePlansCount,
      ),
    [
      filteredPlans,
      contracts,
      selectedProject,
      selectedSector,
      awaitingReviewCount,
      committeePlansCount,
    ],
  );

  // Health Metrics
  const healthMetrics = useMemo(
    () => computeDirectorHealthMetrics(financialSummary, criticalDelaysLive),
    [financialSummary, criticalDelaysLive],
  );

  // Spend composition bar percentages
  const spendPercentages = useMemo(
    () => computeSpendPercentages(financialSummary),
    [financialSummary],
  );

  // Available fiscal years dynamically computed from plans & current date
  const availableFiscalYears = useMemo(
    () => extractAvailableFiscalYears(plans),
    [plans],
  );

  const isFiltered = useMemo(() => {
    return (
      selectedFiscalYear !== defaultFiscalYear ||
      selectedSector !== "All Sectors" ||
      selectedProject !== "ALL" ||
      selectedStatus !== "ALL"
    );
  }, [
    selectedFiscalYear,
    defaultFiscalYear,
    selectedSector,
    selectedProject,
    selectedStatus,
  ]);

  const resetFilters = () => {
    setSelectedFiscalYear(defaultFiscalYear);
    setSelectedSector("All Sectors");
    setSelectedProject("ALL");
    setSelectedStatus("ALL");
  };

  const activeCurrency = useMemo(() => {
    if (selectedProject !== "ALL") {
      const proj = projects.find(
        (p) => p.id === selectedProject || p.code === selectedProject,
      );
      if (proj?.baseCurrency) return proj.baseCurrency.toUpperCase();
    }
    const planWithCurrency = filteredPlans.find(
      (p) => (p as any).project?.baseCurrency,
    );
    if (planWithCurrency && (planWithCurrency as any).project?.baseCurrency) {
      return (planWithCurrency as any).project.baseCurrency.toUpperCase();
    }
    return "ETB";
  }, [selectedProject, projects, filteredPlans]);

  return {
    loading,
    selectedFiscalYear,
    setSelectedFiscalYear,
    defaultFiscalYear,
    availableFiscalYears,
    selectedSector,
    setSelectedSector,
    availableSectors,
    selectedProject,
    setSelectedProject,
    availableProjects,
    totalProjectsCount,
    selectedStatus,
    setSelectedStatus,
    isFiltered,
    resetFilters,
    awaitingReviewCount,
    committeePlansCount,
    criticalDelaysCount,
    financialSummary,
    spendPercentages,
    pipelineStages,
    healthMetrics,
    displayedPendingPlans,
    displayedCriticalDelays,
    currency: activeCurrency,
  };
}
