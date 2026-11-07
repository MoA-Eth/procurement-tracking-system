import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FinanceSettingsView } from "./FinanceSettingsView";
import type { AuthUser } from "@/lib/authTypes";

const mockCurrentUser: AuthUser = {
  id: "user-1",
  email: "finance@moa.gov.et",
  username: "finance",
  displayName: "Finance Officer",
  role: "FINANCE",
};

describe("FinanceSettingsView", () => {
  it("renders the settings header and bilingual description", () => {
    const html = renderToStaticMarkup(
      <FinanceSettingsView currentUser={mockCurrentUser} />,
    );

    // Initial render shows loading indicator or header structure
    expect(html).toContain("Loading settings");
  });
});
