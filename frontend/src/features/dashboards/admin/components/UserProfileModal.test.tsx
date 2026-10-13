import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UserProfileModal } from "./UserProfileModal";
import type { ApiUser } from "@/lib/adminApi";
import { updateUser } from "@/lib/adminApi";
import { apiClient } from "@/lib/apiClient";

describe("UserProfileModal - Role Display & Management", () => {
  const managementUser: ApiUser = {
    id: "u-mgmt-1",
    name: "Abel Tantu",
    displayName: "Abel",
    email: "tantuyeabsira@gmail.com",
    username: "abel",
    role: "ManagementTeam",
    authRole: "MANAGEMENT",
    status: "ACTIVE",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-10-03T16:37:04Z",
    lastLoginAt: "2026-10-03T16:37:04Z",
  };

  it("renders user account details with Management current role", () => {
    const markup = renderToStaticMarkup(
      <UserProfileModal
        user={managementUser}
        isOpen={true}
        onClose={() => {}}
        onUserUpdated={() => {}}
      />,
    );

    expect(markup).toContain("User Account Details");
    expect(markup).toContain("Abel");
    expect(markup).toContain("tantuyeabsira@gmail.com");
    expect(markup).toContain("Management");
    expect(markup).toContain("Active &amp; Verified");
  });

  it("does not render when closed or user is null", () => {
    const markupClosed = renderToStaticMarkup(
      <UserProfileModal
        user={managementUser}
        isOpen={false}
        onClose={() => {}}
        onUserUpdated={() => {}}
      />,
    );
    expect(markupClosed).toBe("");

    const markupNull = renderToStaticMarkup(
      <UserProfileModal
        user={null}
        isOpen={true}
        onClose={() => {}}
        onUserUpdated={() => {}}
      />,
    );
    expect(markupNull).toBe("");
  });
});

describe("adminApi updateUser - Role Payload", () => {
  it("sends MANAGEMENT directly without converting to MANAGEMENT_TEAM", async () => {
    const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValueOnce({
      data: {
        id: "u-mgmt-1",
        role: "MANAGEMENT",
        authRole: "MANAGEMENT",
      },
    } as any);

    await updateUser("u-mgmt-1", {
      role: "MANAGEMENT",
      isActive: true,
    });

    expect(patchSpy).toHaveBeenCalledWith("/users/u-mgmt-1", {
      role: "MANAGEMENT",
      isActive: true,
    });
  });
});
