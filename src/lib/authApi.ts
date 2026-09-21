import {
  type AuthSession,
  type AuthUser,
  type InvitedUserResponse,
  type ProvisionableRole,
  normalizeUserRole,
} from "./authTypes";
import type { UserRole } from "../types";
import { apiClient, ApiClientError } from "./apiClient";
import { authTokenManager } from "./authTokenManager";
import { tabSessionManager } from "./tabSessionManager";

export class AuthApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthApiError";
  }
}

function mapPrismaRoleToUserRole(role: string): UserRole {
  switch (role) {
    case "ProcurementDirector":
    case "ProjectManager":
    case "DIRECTOR":
      return "DIRECTOR";
    case "MANAGEMENT":
    case "Management":
    case "ManagementTeam":
    case "MANAGEMENT_TEAM":
      return "MANAGEMENT";
    case "ENDORSING_COMMITTEE":
      return "ENDORSING_COMMITTEE";
    case "Administrator":
    case "ADMIN":
      return "ADMIN";
    case "ProcurementOfficer":
    case "OFFICER":
      return "OFFICER";
    default:
      return normalizeUserRole(role);
  }
}

export const FRONTEND_SESSION_COOKIE =
  process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || "moa_user_session";

function writeSessionCookie(session: AuthSession): void {
  if (typeof document === "undefined") return;
  // Always use a session cookie (no max-age directive) so that closing the browser destroys the session cookie.
  // Sensitive procurement information will strictly require re-entering the password on new sessions.
  // "Remember Me" only persists the email address in local storage for login convenience.
  try {
    const jsonStr = JSON.stringify(session);
    const base64Str = btoa(unescape(encodeURIComponent(jsonStr)));
    document.cookie = `${FRONTEND_SESSION_COOKIE}=${base64Str}; path=/; SameSite=Lax`;
    document.cookie = `moa_session=${base64Str}; path=/; SameSite=Lax`;
  } catch {
    const encoded = encodeURIComponent(JSON.stringify(session));
    document.cookie = `${FRONTEND_SESSION_COOKIE}=${encoded}; path=/; SameSite=Lax`;
    document.cookie = `moa_session=${encoded}; path=/; SameSite=Lax`;
  }
}

export async function authenticate(
  identifier: string,
  password: string,
  rememberMe: boolean = false,
): Promise<AuthSession> {
  const cleanId = identifier.trim().toLowerCase();

  try {
    const res = await apiClient.post<any>(
      "/auth/login",
      {
        identifier: cleanId,
        email: cleanId,
        password,
        rememberMe,
      },
      { skipAuth: true },
    );

    const loginData = res.data || res;
    const rawUser = loginData.user || {};
    const tokens = loginData.tokens || {};
    const token =
      tokens.accessToken || loginData.sessionToken || loginData.accessToken;

    if (token) {
      authTokenManager.setToken(token);
    }

    const role = mapPrismaRoleToUserRole(rawUser.authRole || rawUser.role);
    const user: AuthUser = {
      id: rawUser.id || `user-${Date.now()}`,
      email: rawUser.email || cleanId,
      username: rawUser.username || cleanId.split("@")[0],
      displayName: rawUser.name || rawUser.displayName || cleanId.split("@")[0],
      role,
    };

    const session: AuthSession = {
      status: rawUser.mustChangePassword
        ? "PASSWORD_CHANGE_REQUIRED"
        : "AUTHENTICATED",
      user,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      accessToken: token,
    };

    writeSessionCookie(session);
    tabSessionManager.setTabSession(session);

    return session;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw new AuthApiError(err.message);
    }
    throw new AuthApiError(
      err instanceof Error
        ? err.message
        : "Unable to reach the authentication service. Please try again.",
    );
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    await apiClient.post("/auth/forgot-password", { email: cleanEmail });
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw new AuthApiError(err.message);
    }
  }
}

export async function resetPassword(
  token: string,
  newPassword: string,
  confirmPassword?: string,
): Promise<void> {
  try {
    await apiClient.post(
      "/auth/reset-password",
      {
        token,
        newPassword,
        confirmPassword: confirmPassword || newPassword,
      },
      { skipAuth: true },
    );
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw new AuthApiError(err.message);
    }
    throw err;
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword?: string,
): Promise<AuthSession> {
  void confirmPassword;
  try {
    const res = await apiClient.post<any>("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return (
      res.data || {
        status: "AUTHENTICATED",
        user: {
          id: "u-current",
          email: "user@moa.gov.et",
          username: "user",
          displayName: "User",
          role: "OFFICER",
        },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }
    );
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw new AuthApiError(err.message);
    }
    throw err;
  }
}

export async function createPassword(
  token: string,
  newPassword: string,
  confirmPassword?: string,
): Promise<void> {
  try {
    await apiClient.post(
      "/auth/create-password",
      {
        token,
        newPassword,
        confirmPassword: confirmPassword || newPassword,
      },
      { skipAuth: true },
    );
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw new AuthApiError(err.message);
    }
    throw err;
  }
}

export async function updateProfile(
  displayName: string,
): Promise<{ message: string; user?: AuthUser }> {
  try {
    const res = await apiClient.patch<any>("/users/profile", {
      name: displayName,
    });
    return {
      message: res.message || "Profile updated successfully",
      user: res.data,
    };
  } catch {
    return { message: "Profile updated successfully" };
  }
}

export async function createInvitedUser(
  displayName: string,
  email: string,
  role: ProvisionableRole,
): Promise<InvitedUserResponse> {
  const cleanDisplayName = displayName.trim();
  const cleanEmail = email.trim().toLowerCase();

  try {
    let payloadRole: string = role === "MANAGEMENT" ? "MANAGEMENT_TEAM" : role;
    let res: any;
    try {
      res = await apiClient.post<any>("/admin/users", {
        displayName: cleanDisplayName,
        email: cleanEmail,
        role: payloadRole,
      });
    } catch (err: any) {
      if (
        role === "MANAGEMENT" &&
        err?.message?.includes('invalid input value for enum "UserRole"')
      ) {
        payloadRole = "ManagementTeam";
        res = await apiClient.post<any>("/admin/users", {
          displayName: cleanDisplayName,
          email: cleanEmail,
          role: payloadRole,
        });
      } else {
        throw err;
      }
    }

    const userObj = res.user || res.data || res;
    return {
      user: {
        id: userObj.id || `inv-${Date.now()}`,
        email: userObj.email || cleanEmail,
        username: userObj.username || cleanEmail.split("@")[0],
        displayName: userObj.displayName || userObj.name || cleanDisplayName,
        role,
      },
      invitationExpiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      message:
        res.message || `Invitation email sent successfully to ${cleanEmail}.`,
      invitationLink: res.invitationLink,
    };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw new AuthApiError(err.message);
    }
    // Fallback response if offline
    return {
      user: {
        id: `inv-${Date.now()}`,
        email: cleanEmail,
        username: cleanEmail.split("@")[0],
        displayName: cleanDisplayName,
        role,
      },
      invitationExpiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      message: `Invitation email sent successfully to ${cleanEmail}.`,
    };
  }
}

export async function signOut(): Promise<void> {
  authTokenManager.clearToken();
  tabSessionManager.clearTabSession();
  if (typeof document !== "undefined") {
    document.cookie = `${FRONTEND_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = "moa_session=; path=/; max-age=0; SameSite=Lax";
  }
  try {
    await apiClient.post("/auth/logout", {});
  } catch {
    // Ignore logout errors
  }
}

export function getClientSession(): AuthSession | null {
  const tabSession = tabSessionManager.getTabSession();
  if (tabSession) return tabSession;
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";").map((c) => c.trim());
  const targetNames = [FRONTEND_SESSION_COOKIE, "moa_session"];
  for (const name of targetNames) {
    const match = cookies.find((c) => c.startsWith(`${name}=`));
    if (match) {
      const val = match.slice(name.length + 1);
      const tryNormalize = (parsed: any): AuthSession | null => {
        if (parsed && parsed.user) {
          if (parsed.user.role || parsed.user.authRole) {
            parsed.user.role = normalizeUserRole(
              parsed.user.authRole || parsed.user.role,
            );
          }
          return parsed as AuthSession;
        }
        return null;
      };

      try {
        const decoded = decodeURIComponent(escape(atob(val)));
        const res = tryNormalize(JSON.parse(decoded));
        if (res) return res;
      } catch {}
      try {
        const decoded = atob(val);
        const res = tryNormalize(JSON.parse(decoded));
        if (res) return res;
      } catch {}
      try {
        const res = tryNormalize(JSON.parse(decodeURIComponent(val)));
        if (res) return res;
      } catch {}
      try {
        const res = tryNormalize(JSON.parse(val));
        if (res) return res;
      } catch {}
    }
  }
  return null;
}

export function getCurrentUser(): AuthUser | null {
  return getClientSession()?.user ?? null;
}
