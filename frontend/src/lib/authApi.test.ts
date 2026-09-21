import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthApiError,
  authenticate,
  changePassword,
  createInvitedUser,
  createPassword,
  requestPasswordReset,
  signOut,
} from "./authApi";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("auth API", () => {
  it("normalizes the identifier and sends login directly to the backend", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            user: {
              id: "1",
              email: "custom-officer@moa.gov.et",
              name: "Procurement Officer",
              role: "ProcurementOfficer",
            },
            tokens: {
              accessToken: "sample-token",
            },
          },
        }),
        { status: 200 },
      ),
    );

    const session = await authenticate(
      " custom-officer@moa.gov.et ",
      "secret",
      true,
    );

    expect(session.user.role).toBe("OFFICER");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          identifier: "custom-officer@moa.gov.et",
          email: "custom-officer@moa.gov.et",
          password: "secret",
          rememberMe: true,
        }),
      }),
    );
  });

  it("authenticates as MANAGEMENT correctly when backend returns authRole MANAGEMENT", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            user: {
              id: "mgt-1",
              email: "abel@moa.gov.et",
              name: "Abel",
              role: "ManagementTeam",
              authRole: "MANAGEMENT",
            },
            tokens: {
              accessToken: "sample-mgt-token",
            },
          },
        }),
        { status: 200 },
      ),
    );

    const session = await authenticate("abel@moa.gov.et", "secret", false);

    expect(session.user.role).toBe("MANAGEMENT");
    expect(session.user.displayName).toBe("Abel");
  });

  it("surfaces the backend sign-in error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Unable to sign in with those credentials.",
        }),
        { status: 401 },
      ),
    );

    await expect(
      authenticate("unknown@domain.com", "wrong", false),
    ).rejects.toEqual(
      new AuthApiError("Unable to sign in with those credentials."),
    );
  });

  it("uses the password lifecycle endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    await requestPasswordReset(" custom-user@moa.gov.et ");
    await signOut();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/auth/forgot-password"),
      expect.objectContaining({
        body: JSON.stringify({ email: "custom-user@moa.gov.et" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/auth/logout"),
      expect.any(Object),
    );
  });

  it("submits password reset and change fields", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            user: {
              id: "1",
              email: "director@moa.gov.et",
              name: "Director",
              role: "ProcurementDirector",
            },
          },
        }),
        { status: 200 },
      ),
    );

    await changePassword("Temporary1!", "New-Password2!", "New-Password2!");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/change-password"),
      expect.objectContaining({
        body: JSON.stringify({
          currentPassword: "Temporary1!",
          newPassword: "New-Password2!",
        }),
      }),
    );
  });

  it("creates an invited user's password", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Password created." }), {
        status: 200,
      }),
    );

    await createPassword(
      "invitation-token",
      "New-Password2!",
      "New-Password2!",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/create-password"),
      expect.objectContaining({
        body: JSON.stringify({
          token: "invitation-token",
          newPassword: "New-Password2!",
          confirmPassword: "New-Password2!",
        }),
      }),
    );
  });

  it("provisions a non-admin user with displayName, email and role", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "2",
            email: "officer-new@moa.gov.et",
            displayName: "Procurement Officer",
            role: "OFFICER",
          },
          invitationExpiresAt: new Date().toISOString(),
          message: "Invitation sent successfully",
        }),
        { status: 201 },
      ),
    );

    await createInvitedUser(
      " Procurement Officer ",
      " Officer-New@MOA.GOV.ET ",
      "OFFICER",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/users"),
      expect.objectContaining({
        body: JSON.stringify({
          displayName: "Procurement Officer",
          email: "officer-new@moa.gov.et",
          role: "OFFICER",
        }),
      }),
    );
  });

  it("uses the backend enum when provisioning an endorsing committee user", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "3",
            email: "committee@moa.gov.et",
            displayName: "Committee Member",
            role: "ENDORSING_COMMITTEE",
          },
          invitationExpiresAt: new Date().toISOString(),
          message: "Invitation sent successfully",
        }),
        { status: 201 },
      ),
    );

    await createInvitedUser(
      "Committee Member",
      "committee@moa.gov.et",
      "ENDORSING_COMMITTEE",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/users"),
      expect.objectContaining({
        body: JSON.stringify({
          displayName: "Committee Member",
          email: "committee@moa.gov.et",
          role: "ENDORSING_COMMITTEE",
        }),
      }),
    );
  });

  it("maps canonical MANAGEMENT role to backend Prisma enum MANAGEMENT_TEAM", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "4",
            email: "management@moa.gov.et",
            displayName: "Executive Manager",
            role: "MANAGEMENT_TEAM",
          },
          invitationExpiresAt: new Date().toISOString(),
          message: "Invitation sent successfully",
        }),
        { status: 201 },
      ),
    );

    await createInvitedUser(
      "Executive Manager",
      "management@moa.gov.et",
      "MANAGEMENT",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/users"),
      expect.objectContaining({
        body: JSON.stringify({
          displayName: "Executive Manager",
          email: "management@moa.gov.et",
          role: "MANAGEMENT_TEAM",
        }),
      }),
    );
  });
});
