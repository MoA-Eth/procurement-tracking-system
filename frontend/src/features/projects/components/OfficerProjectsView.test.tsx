import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OfficerProjectsView } from "./OfficerProjectsView";
import type { AuthUser } from "@/lib/authTypes";

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

describe("OfficerProjectsView - Assigned Projects Scoping", () => {
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
