import type {
  ProjectItem,
  ProjectOfficer,
} from "@/features/projects/management/projectsData";
import type { OfficerProject } from "@/features/projects/data/officerProjects";
import type { AuthUser } from "./authTypes";
import { apiClient, directApiFetch, ApiClientError } from "./apiClient";
import { downloadReportFile, saveReportFile } from "./reportsApi";

export interface ImportProjectsResult {
  message?: string;
  created: number;
  updated: number;
}

export async function importProjects(
  file: File,
): Promise<ImportProjectsResult> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    return await directApiFetch<ImportProjectsResult>(
      "/excel/import/projects",
      {
        method: "POST",
        body: formData,
      },
    );
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      return await directApiFetch<ImportProjectsResult>("/projects/import", {
        method: "POST",
        body: formData,
      });
    }
    throw err;
  }
}

export async function downloadProjectsTemplate(): Promise<void> {
  const report = await downloadReportFile(
    "/excel/templates/projects",
    {},
    "Projects_Import_Template.xlsx",
  );
  saveReportFile(report);
}

export interface BackendProject {
  id: string;
  code: string;
  name: string;
  sapIdentificationNo?: string | null;
  country?: string | null;
  executingAgency?: string | null;
  organization?: string | null;
  fundingSourceId: string;
  fundingSource?: { id: string; type: string; code: string; label: string };
  fundingType?: string | null;
  loanGrantNumbers?: string[];
  components?: string[];
  subcomponents?: string[];
  baseCurrency?: string | null;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  sectorId: string;
  sector?: { id: string; type: string; code: string; label: string };
  status: "ACTIVE" | "CLOSED" | "SUSPENDED";
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  members?: {
    id: string;
    userId: string;
    projectId: string;
    user?: { id: string; name: string; email: string; role: string };
  }[];
  plans?: any[];
}

export interface CreateProjectInput {
  code: string;
  name: string;
  fundingSourceId: string;
  sectorId: string;
  sapIdentificationNo?: string;
  country?: string;
  executingAgency?: string;
  organization?: string;
  fundingType?: string;
  loanGrantNumbers?: string[];
  components?: string[];
  subcomponents?: string[];
  baseCurrency?: string;
  projectStartDate?: string;
  projectEndDate?: string;
}

export interface UpdateProjectInput {
  name?: string;
  status?: "ACTIVE" | "CLOSED" | "SUSPENDED";
  sapIdentificationNo?: string;
  country?: string;
  executingAgency?: string;
  organization?: string;
  fundingType?: string;
  loanGrantNumbers?: string[];
  components?: string[];
  subcomponents?: string[];
  baseCurrency?: string;
  projectStartDate?: string;
  projectEndDate?: string;
}

export async function fetchProjects(): Promise<BackendProject[]> {
  try {
    const res = await apiClient.get<any>("/projects");
    return Array.isArray(res) ? res : res.data || [];
  } catch (err) {
    console.warn("fetchProjects notice:", err);
    return [];
  }
}

export async function fetchProjectById(id: string): Promise<BackendProject> {
  const res = await apiClient.get<any>(`/projects/${encodeURIComponent(id)}`);
  return res.data || res;
}

export async function createProject(
  data: CreateProjectInput,
): Promise<BackendProject> {
  const res = await apiClient.post<any>("/projects", data);
  return res.data || res;
}

export async function updateProject(
  id: string,
  data: UpdateProjectInput,
): Promise<BackendProject> {
  const res = await apiClient.patch<any>(
    `/projects/${encodeURIComponent(id)}`,
    data,
  );
  return res.data || res;
}

export async function assignOfficerToProject(
  projectId: string,
  officerId: string,
): Promise<void> {
  await apiClient.post(`/projects/${encodeURIComponent(projectId)}/officers`, {
    officerId,
  });
}

export async function removeOfficerFromProject(
  projectId: string,
  officerId: string,
): Promise<void> {
  await apiClient.delete(
    `/projects/${encodeURIComponent(projectId)}/officers/${encodeURIComponent(officerId)}`,
  );
}

export async function deleteProject(projectId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/projects/${encodeURIComponent(projectId)}`);
    return true;
  } catch (err) {
    console.warn(`deleteProject notice for ${projectId}:`, err);
    return false;
  }
}

export function mapBackendProjectToProjectItem(
  bp: BackendProject,
): ProjectItem {
  const assignedOfficers: ProjectOfficer[] = (bp.members || []).map((m) => ({
    id: m.userId,
    name: m.user?.name || "Assigned Officer",
    email: m.user?.email || "officer@moa.gov.et",
    roleTag: "OFFICER",
  }));

  return {
    id: bp.id,
    code: bp.code,
    name: bp.name,
    sapNumber: bp.sapIdentificationNo || undefined,
    countryOrg: bp.country || "Ethiopia",
    executingAgency: bp.executingAgency || "Ministry of Agriculture",
    region: bp.organization || "FPCU / Federal",
    budgetYear: "2018 EFY",
    fundingSource: bp.fundingSource?.label || "World Bank",
    fundingType: bp.fundingType || "Loan / Grant",
    loanGrantNumbers: bp.loanGrantNumbers || [],
    components: bp.components || [],
    subcomponents: bp.subcomponents || [],
    currency: bp.baseCurrency || "ETB",
    startDate: bp.projectStartDate
      ? new Date(bp.projectStartDate).toISOString().split("T")[0]
      : "2024-01-01",
    endDate: bp.projectEndDate
      ? new Date(bp.projectEndDate).toISOString().split("T")[0]
      : "2029-12-31",
    sector: bp.sector?.label || "Agriculture",
    assignedOfficers,
    description: "Sector project",
    status:
      bp.status?.toUpperCase() === "ACTIVE" ||
      bp.isActive === true ||
      (!bp.status && bp.isActive !== false)
        ? assignedOfficers.length > 0
          ? "Active"
          : "Draft"
        : "Inactive",
    createdAt: bp.createdAt || "2026-01-01",
  };
}

export function isProjectAssignedToOfficer(
  project: BackendProject | OfficerProject,
  user?: AuthUser | null,
): boolean {
  if (!user) return true;

  // Check BackendProject with members array
  if ("members" in project && Array.isArray(project.members)) {
    return project.members.some((m) => {
      if (!m) return false;
      if (m.userId && user.id && m.userId === user.id) return true;
      if (m.user?.id && user.id && m.user.id === user.id) return true;
      if (
        m.user?.email &&
        user.email &&
        m.user.email.trim().toLowerCase() === user.email.trim().toLowerCase()
      ) {
        return true;
      }
      if (
        m.user?.name &&
        user.displayName &&
        m.user.name.trim().toLowerCase() ===
          user.displayName.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });
  }

  // Check OfficerProject
  if ("assignedOfficers" in project) {
    const userIds = project.assignedOfficerIds || [];
    const userEmails = project.assignedOfficerEmails || [];
    const userNames = project.assignedOfficers || [];

    if (user.id && userIds.includes(user.id)) return true;
    if (
      user.email &&
      userEmails.some(
        (e) => e.trim().toLowerCase() === user.email.trim().toLowerCase(),
      )
    ) {
      return true;
    }
    if (
      user.displayName &&
      userNames.some(
        (n) => n.trim().toLowerCase() === user.displayName.trim().toLowerCase(),
      )
    ) {
      return true;
    }
    return false;
  }

  return false;
}

export function mapBackendProjectToOfficerProject(
  bp: BackendProject,
): OfficerProject {
  const assignedOfficers = (bp.members || [])
    .map((m) => m.user?.name || "")
    .filter(Boolean);
  const assignedOfficerIds = (bp.members || [])
    .map((m) => m.userId || m.user?.id || "")
    .filter(Boolean);
  const assignedOfficerEmails = (bp.members || [])
    .map((m) => m.user?.email || "")
    .filter(Boolean);

  return {
    id: bp.id,
    code: bp.code,
    name: bp.name,
    shortName: bp.code,
    status: bp.status === "ACTIVE" ? "Active" : "Inactive",
    fundingSource: bp.fundingSource?.label || "World Bank",
    fundingType: bp.fundingType || "Loan / Grant",
    executingAgency: bp.executingAgency || "Ministry of Agriculture",
    countryOrganisation: bp.country || "Ethiopia",
    organizationRegion: bp.organization || "FPCU / Federal",
    baseCurrency: (bp.baseCurrency as "ETB" | "USD" | "UA") || "ETB",
    sapIdentificationNumber: bp.sapIdentificationNo || undefined,
    financingNumbers: bp.loanGrantNumbers || [],
    components: bp.components || [],
    subcomponents: bp.subcomponents || [],
    activePlans: bp.plans ? bp.plans.length : 0,
    assignedOfficers,
    assignedOfficerIds,
    assignedOfficerEmails,
    assignmentStart: {
      ethiopian: "01 Meskerem 2016",
      gregorian: bp.projectStartDate
        ? new Date(bp.projectStartDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "11 Sep 2023",
    },
    projectPeriod: {
      from: bp.projectStartDate
        ? new Date(bp.projectStartDate).toISOString().split("T")[0]
        : undefined,
      to: bp.projectEndDate
        ? new Date(bp.projectEndDate).toISOString().split("T")[0]
        : undefined,
    },
    plans: [],
  };
}
