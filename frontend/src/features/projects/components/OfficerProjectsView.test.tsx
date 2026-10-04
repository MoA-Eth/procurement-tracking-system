import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OfficerProjectsView } from "./OfficerProjectsView";
import type { AuthUser } from "@/lib/authTypes";
import {
  setCachedProjects,
  invalidateProjectsCache,
  type BackendProject,
} from "@/lib/projectsApi";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockOfficerUser: AuthUser = {
  id: "officer-abebe",
  email: "abebe@moa.gov.et",
  username: "abebe",
  displayName: "Abebe Officer",
  role: "OFFICER",
};

const unassignedProject: BackendProject = {
  id: "prj-unassigned-1",
  code: "PRJ-UNASSIGNED",
  name: "Director Only Project",
  fundingSourceId: "fs-1",
  sectorId: "sec-1",
  status: "ACTIVE",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  members: [
    {
      id: "m-1",
      userId: "other-officer-id",
      projectId: "prj-unassigned-1",
      user: {
        id: "other-officer-id",
        email: "other@moa.gov.et",
        name: "Other Officer",
        role: "OFFICER",
      },
    },
  ],
};

const assignedProject: BackendProject = {
  id: "prj-assigned-1",
  code: "PRJ-ASSIGNED",
  name: "Assigned Project for Abebe",
  fundingSourceId: "fs-2",
  sectorId: "sec-2",
  status: "ACTIVE",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  members: [
    {
      id: "m-2",
      userId: "officer-abebe",
      projectId: "prj-assigned-1",
      user: {
        id: "officer-abebe",
        email: "abebe@moa.gov.et",
        name: "Abebe Officer",
        role: "OFFICER",
      },
    },
  ],
};

describe("OfficerProjectsView - Assigned Projects Scoping", () => {
  beforeEach(() => {
    invalidateProjectsCache();
  });

  it("renders No Projects Assigned empty state when officer has zero assigned projects", () => {
    const html = renderToStaticMarkup(
      <OfficerProjectsView currentUser={mockOfficerUser} />,
    );

    expect(html).toContain("No Projects Assigned");
    expect(html).toContain(
      "A Procurement Director must assign projects to your account before they will appear here",
    );
    expect(html).toContain("Return to Dashboard");
  });

  it("does not fall back to displaying unassigned projects when unassigned projects exist in cache", () => {
    setCachedProjects([unassignedProject]);

    const html = renderToStaticMarkup(
      <OfficerProjectsView currentUser={mockOfficerUser} />,
    );

    expect(html).toContain("No Projects Assigned");
    expect(html).not.toContain("Director Only Project");
    expect(html).not.toContain("PRJ-UNASSIGNED");
  });

  it("only displays assigned project when both assigned and unassigned projects exist in cache", () => {
    setCachedProjects([unassignedProject, assignedProject]);

    const html = renderToStaticMarkup(
      <OfficerProjectsView currentUser={mockOfficerUser} />,
    );

    expect(html).not.toContain("No Projects Assigned");
    expect(html).toContain("Assigned Project for Abebe");
    expect(html).toContain("PRJ-ASSIGNED");
    expect(html).not.toContain("Director Only Project");
    expect(html).not.toContain("PRJ-UNASSIGNED");
  });

  it("renders access restricted screen when attempting to view an unassigned project code", () => {
    const html = renderToStaticMarkup(
      <OfficerProjectsView
        currentUser={mockOfficerUser}
        selectedProjectCode="UNASSIGNED-PRJ"
      />,
    );

    expect(html).toContain("Project Not Assigned");
    expect(html).toContain("UNASSIGNED-PRJ");
    expect(html).toContain("Access Restricted");
    expect(html).toContain(
      "Only projects specifically assigned to you by the Procurement Director can be accessed",
    );
    expect(html).toContain("View My Assigned Projects");
  });
});
