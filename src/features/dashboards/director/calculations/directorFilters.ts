import type { BackendPlan } from "@/lib/plansApi";
import type { BackendProject } from "@/lib/projectsApi";
import { matchesFiscalYear } from "@/features/projects/utils/fiscalYear";

export interface FilterParams {
  fiscalYear: string;
  sector: string;
  project: string;
  status: string;
  availableProjects: { id: string; name: string }[];
}

/**
 * Filter plans by fiscal year, sector, project, and review/execution status
 */
export function filterPlans(
  plans: BackendPlan[],
  filters: FilterParams,
): BackendPlan[] {
  const { fiscalYear, sector, project, status, availableProjects } = filters;

  return plans.filter((p) => {
    // 1. Fiscal Year Filter (Dynamic for any year)
    if (!matchesFiscalYear(p.budgetYear, fiscalYear)) {
      return false;
    }

    // 2. Sector Filter
    if (sector !== "All Sectors") {
      const planSector = (
        (p.project as any)?.sector?.label || ""
      ).toLowerCase();
      const projName = (p.project?.name || p.organization || "").toLowerCase();
      const targetSector = sector.toLowerCase();
      if (
        !planSector.includes(targetSector) &&
        !targetSector.includes(planSector) &&
        !projName.includes(targetSector)
      ) {
        return false;
      }
    }

    // 3. Project Filter
    if (project !== "ALL") {
      const selectedProj = availableProjects.find(
        (proj) => proj.id === project,
      );
      const projName = selectedProj
        ? selectedProj.name.toLowerCase()
        : project.toLowerCase();
      const planProjName = (
        p.project?.name ||
        p.organization ||
        ""
      ).toLowerCase();
      if (
        p.project?.id !== project &&
        p.projectId !== project &&
        !planProjName.includes(projName) &&
        !projName.includes(planProjName)
      ) {
        return false;
      }
    }

    // 4. Status Filter
    if (status !== "ALL") {
      if (status === "Awaiting Review") {
        const isAwaiting =
          p.status === "SUBMITTED" ||
          p.status === "PENDING_REVIEW" ||
          p.status === "UPDATE_REQUESTED" ||
          p.status === "RETURNED_FOR_REVISION" ||
          p.status === "REJECTED" ||
          p.status === "COMMITTEE_REJECTED" ||
          (p as any).status === "Submitted to Director" ||
          (p as any).status === "Returned for Revision" ||
          (p as any).status === "Returned" ||
          (p as any).status === "Committee Rejected";
        if (!isAwaiting) return false;
      } else if (status === "In Progress") {
        const isInProgress =
          p.status === "IN_PROGRESS" ||
          p.status === "DRAFT" ||
          p.status === "WITH_COMMITTEE";
        if (!isInProgress) return false;
      } else if (status === "Delayed") {
        if (p.status !== "DELAYED") return false;
      } else if (status === "Approved") {
        if (p.status !== "APPROVED") return false;
      }
    }

    return true;
  });
}

/**
 * Filter projects by sector
 */
export function filterProjects(
  projects: BackendProject[],
  sector: string,
): BackendProject[] {
  return projects.filter((p) => {
    if (
      sector !== "All Sectors" &&
      p.sector?.label !== sector &&
      p.name !== sector
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Extract distinct sector labels
 */
export function extractAvailableSectors(projects: BackendProject[]): string[] {
  const sectorSet = new Set<string>();
  projects.forEach((p) => {
    if (p.sector?.label) sectorSet.add(p.sector.label);
  });
  const standardSectors = [
    "Agriculture Development",
    "Livestock & Pastoral",
    "Natural Resources",
    "Institutional Support",
    "Irrigation & Drainage",
  ];
  standardSectors.forEach((s) => sectorSet.add(s));
  return Array.from(sectorSet);
}
