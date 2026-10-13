import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthApiError,
  authenticate,
  changePassword,
  createInvitedUser,
  createPassword,
  getClientSession,
  FRONTEND_SESSION_COOKIE,
  requestPasswordReset,
  signOut,
} from "./authApi";
import { authTokenManager } from "./authTokenManager";
import { tabSessionManager } from "./tabSessionManager";

const cookieStore = new Map<string, string>();
const sessionStorageStore = new Map<string, string>();

const mockSessionStorage = {
  getItem: (k: string) => sessionStorageStore.get(k) ?? null,
  setItem: (k: string, v: string) => {
    sessionStorageStore.set(k, String(v));
  },
  removeItem: (k: string) => {
    sessionStorageStore.delete(k);
  },
  clear: () => {
    sessionStorageStore.clear();
  },
};

const mockWindow = {
  sessionStorage: mockSessionStorage,
};

const mockDocument = {
  get cookie() {
    return Array.from(cookieStore.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  },
  set cookie(val: string) {
    const parts = val.split(";");
    const [nameVal] = parts;
    const eqIdx = nameVal.indexOf("=");
    if (eqIdx !== -1) {
      const name = nameVal.slice(0, eqIdx).trim();
      const value = nameVal.slice(eqIdx + 1).trim();
      const isMaxAgeZero = parts.some(
        (p) => p.trim().toLowerCase() === "max-age=0",
      );
      if (isMaxAgeZero || value === "") {
        cookieStore.delete(name);
      } else {
        cookieStore.set(name, value);
      }
    }
  },
};

beforeEach(() => {
  cookieStore.clear();
  sessionStorageStore.clear();
  vi.stubGlobal("window", mockWindow);
  vi.stubGlobal("document", mockDocument);
  tabSessionManager.clearTabSession();
  authTokenManager.clearToken();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  cookieStore.clear();
  sessionStorageStore.clear();
  tabSessionManager.clearTabSession();
  authTokenManager.clearToken();
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
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
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
      ),
    );

    await changePassword("Temporary1!", "New-Password2!", "New-Password2!");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/auth/change-password"),
      expect.objectContaining({
        body: JSON.stringify({
          currentPassword: "Temporary1!",
          newPassword: "New-Password2!",
          confirmPassword: "New-Password2!",
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

  it("rehydrates session and authTokenManager from remembered cookie when tab session is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            user: {
              id: "u-123",
              email: "remembered@moa.gov.et",
              name: "Officer",
              role: "ProcurementOfficer",
            },
            tokens: {
              accessToken: "persistent-jwt-token",
            },
            expiresAt: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        }),
        { status: 200 },
      ),
    );

    const session = await authenticate("remembered@moa.gov.et", "pass", true);
    expect(session.rememberMe).toBe(true);
    expect(authTokenManager.getToken()).toBe("persistent-jwt-token");

    // Simulate opening a new tab / reopening browser: tab session wiped
    tabSessionManager.clearTabSession();
    expect(tabSessionManager.hasTabSession()).toBe(false);

    // getClientSession should detect persistent cookie and rehydrate
    const restored = getClientSession();
    expect(restored).not.toBeNull();
    expect(restored?.user.email).toBe("remembered@moa.gov.et");
    expect(restored?.user.role).toBe("OFFICER");
    expect(authTokenManager.getToken()).toBe("persistent-jwt-token");
    expect(tabSessionManager.hasTabSession()).toBe(true);
  });

  it("rejects and purges expired remembered cookie sessions", () => {
    const expiredSession = {
      status: "AUTHENTICATED",
      user: {
        id: "u-expired",
        email: "expired@moa.gov.et",
        username: "expired",
        displayName: "Expired Officer",
        role: "OFFICER",
      },
      expiresAt: new Date(Date.now() - 60_000).toISOString(), // 1 minute ago
      accessToken: "expired-token",
      rememberMe: true,
    };

    const b64 = btoa(JSON.stringify(expiredSession));
    document.cookie = `${FRONTEND_SESSION_COOKIE}=${b64}; path=/`;

    const result = getClientSession();
    expect(result).toBeNull();
    expect(authTokenManager.getToken()).toBeNull();
    expect(tabSessionManager.hasTabSession()).toBe(false);
  });

  it("signOut clears token manager, tab session, cookies, and invokes backend logout", async () => {
    const logoutMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    authTokenManager.setToken("active-token");
    tabSessionManager.setTabSession({
      status: "AUTHENTICATED",
      user: {
        id: "u-out",
        email: "out@moa.gov.et",
        username: "out",
        displayName: "Logout User",
        role: "OFFICER",
      },
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      accessToken: "active-token",
    });

    await signOut();

    expect(authTokenManager.getToken()).toBeNull();
    expect(tabSessionManager.hasTabSession()).toBe(false);
    expect(logoutMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/logout"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
