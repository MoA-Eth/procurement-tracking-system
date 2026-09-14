import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fetchProjects,
  createProject,
  assignOfficerToProject,
  isProjectAssignedToOfficer,
  mapBackendProjectToProjectItem,
  mapBackendProjectToOfficerProject,
  type BackendProject,
} from "./projectsApi";

describe("projectsApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches projects list via GET /api/projects", async () => {
    const mockProjects: BackendProject[] = [
      {
        id: "p1",
        code: "PRJ-01",
        name: "Test Project",
        fundingSourceId: "fs1",
        sectorId: "sec1",
        status: "ACTIVE",
        loanGrantNumbers: ["IDA-123"],
        components: ["Comp 1"],
        subcomponents: ["Sub 1"],
      },
    ];

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockProjects), { status: 200 }),
    );

    const result = await fetchProjects();
    expect(result).toEqual(mockProjects);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects"),
      expect.any(Object),
    );
  });

  it("creates a new project via POST /api/projects", async () => {
    const createdProject: BackendProject = {
      id: "p-new",
      code: "PRJ-NEW",
      name: "New Project",
      fundingSourceId: "fs1",
      sectorId: "sec1",
      status: "ACTIVE",
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(createdProject), { status: 201 }),
    );

    const result = await createProject({
      code: "PRJ-NEW",
      name: "New Project",
      fundingSourceId: "fs1",
      sectorId: "sec1",
    });

    expect(result.id).toBe("p-new");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("assigns officer to project via POST /api/projects/:id/officers", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 201 }),
    );

    await assignOfficerToProject("p1", "off-1");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects/p1/officers"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ officerId: "off-1" }),
      }),
    );
  });

  it("maps backend project to Director ProjectItem and OfficerProject correctly", () => {
    const bp: BackendProject = {
      id: "p100",
      code: "DRIVE",
      name: "De-Risking Project",
      sectorId: "sec-agri",
      sector: {
        id: "sec-agri",
        type: "SECTOR",
        code: "SEC1",
        label: "Agriculture",
      },
      fundingSourceId: "fs-wb",
      fundingSource: {
        id: "fs-wb",
        type: "FUNDING_SOURCE",
        code: "FS1",
        label: "World Bank",
      },
      status: "ACTIVE",
      loanGrantNumbers: ["IDA-999"],
      components: ["Component 1"],
      subcomponents: ["Subcomponent 1.1"],
      members: [
        {
          id: "m1",
          userId: "u1",
          projectId: "p100",
          user: {
            id: "u1",
            name: "Abebe Officer",
            email: "abebe@moa.gov.et",
            role: "ProcurementOfficer",
          },
        },
      ],
    };

    const projectItem = mapBackendProjectToProjectItem(bp);
    expect(projectItem.code).toBe("DRIVE");
    expect(projectItem.sector).toBe("Agriculture");
    expect(projectItem.assignedOfficers).toEqual([
      {
        id: "u1",
        name: "Abebe Officer",
        email: "abebe@moa.gov.et",
        roleTag: "OFFICER",
      },
    ]);

    const officerProject = mapBackendProjectToOfficerProject(bp);
    expect(officerProject.code).toBe("DRIVE");
    expect(officerProject.status).toBe("Active");
    expect(officerProject.assignedOfficers).toEqual(["Abebe Officer"]);
    expect(officerProject.assignedOfficerIds).toEqual(["u1"]);
    expect(officerProject.assignedOfficerEmails).toEqual(["abebe@moa.gov.et"]);
  });

  it("handles projects with no assigned members without injecting fake officers", () => {
    const unassignedBp: BackendProject = {
      id: "p-empty",
      code: "EMPTY-01",
      name: "Empty Project",
      fundingSourceId: "fs1",
      sectorId: "sec1",
      status: "ACTIVE",
      members: [],
    };

    const officerProject = mapBackendProjectToOfficerProject(unassignedBp);
    expect(officerProject.assignedOfficers).toEqual([]);
    expect(officerProject.assignedOfficerIds).toEqual([]);
    expect(officerProject.assignedOfficerEmails).toEqual([]);
  });

  it("correctly evaluates isProjectAssignedToOfficer", () => {
    const bp: BackendProject = {
      id: "p1",
      code: "PRJ-01",
      name: "Test Project",
      fundingSourceId: "fs1",
      sectorId: "sec1",
      status: "ACTIVE",
      members: [
        {
          id: "m1",
          userId: "off-user-1",
          projectId: "p1",
          user: {
            id: "off-user-1",
            name: "Yeabsira Fikre",
            email: "yeabsira@moa.gov.et",
            role: "ProcurementOfficer",
          },
        },
      ],
    };

    const matchingUser = {
      id: "off-user-1",
      email: "yeabsira@moa.gov.et",
      displayName: "Yeabsira Fikre",
      role: "OFFICER" as const,
      username: "yeabsira",
    };

    const otherUser = {
      id: "off-user-2",
      email: "someoneelse@moa.gov.et",
      displayName: "Other Officer",
      role: "OFFICER" as const,
      username: "other",
    };

    expect(isProjectAssignedToOfficer(bp, matchingUser)).toBe(true);
    expect(isProjectAssignedToOfficer(bp, otherUser)).toBe(false);
    expect(isProjectAssignedToOfficer(bp, undefined)).toBe(true);

    const officerProj = mapBackendProjectToOfficerProject(bp);
    expect(isProjectAssignedToOfficer(officerProj, matchingUser)).toBe(true);
    expect(isProjectAssignedToOfficer(officerProj, otherUser)).toBe(false);
  });
});
