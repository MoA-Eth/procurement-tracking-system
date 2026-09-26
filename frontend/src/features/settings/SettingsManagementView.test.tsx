import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsManagementView } from "./SettingsManagementView";
import type { AuthUser } from "@/lib/authTypes";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/workspace/settings",
}));

const mockDirectorUser: AuthUser = {
  id: "director-1",
  email: "director@moa.gov.et",
  username: "director",
  displayName: "Director Mohammed",
  role: "DIRECTOR",
};

describe("SettingsManagementView", () => {
  it("renders the settings header and lookup classification description", () => {
    const html = renderToStaticMarkup(
      <SettingsManagementView currentUser={mockDirectorUser} />,
    );

    expect(html).toContain("Settings &amp; Lookup Configurations");
    expect(html).toContain(
      "Manage project short codes, acronyms, and global procurement classifications.",
    );
  });

  it("renders all category tabs including Funding Types and Base Currencies with counter badges", () => {
    const html = renderToStaticMarkup(
      <SettingsManagementView currentUser={mockDirectorUser} />,
    );

    expect(html).toContain("Project Short Codes");
    expect(html).toContain("Sectors");
    expect(html).toContain("Funding Sources");
    expect(html).toContain("Funding Types");
    expect(html).toContain("Procurement Methods");
    expect(html).toContain("Base Currencies");
  });

  it("renders the Add action button and table structure", () => {
    const html = renderToStaticMarkup(
      <SettingsManagementView currentUser={mockDirectorUser} />,
    );

    expect(html).toContain("Add Project Short Code");
    expect(html).toContain("Status");
    expect(html).toContain("Actions");
  });
});
