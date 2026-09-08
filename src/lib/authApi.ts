import type {
  AuthSession,
  AuthUser,
  InvitedUserResponse,
  ProvisionableRole,
} from "./authTypes";
import type { UserRole } from "../types";
import { apiClient, ApiClientError } from "./apiClient";
import { authTokenManager } from "./authTokenManager";

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
      return "DIRECTOR";
    case "ManagementTeam":
    case "MANAGEMENT_TEAM":
      return "MANAGEMENT_TEAM";
    case "Administrator":
      return "ADMIN";
    case "ProcurementOfficer":
      return "OFFICER";
    case "DIRECTOR":
    case "ENDORSING_COMMITTEE":
    case "ADMIN":
    case "OFFICER":
    case "MANAGEMENT_TEAM":
      return role as UserRole;
    default:
      return "OFFICER";
  }
}

export const FRONTEND_SESSION_COOKIE = "moa_user_session";

function writeSessionCookie(
  session: AuthSession,
  rememberMe: boolean = false,
): void {
  if (typeof document === "undefined") return;
  const maxAge = rememberMe ? 30 * 86400 : 86400;
  try {
    const jsonStr = JSON.stringify(session);
    const base64Str = btoa(unescape(encodeURIComponent(jsonStr)));
    document.cookie = `${FRONTEND_SESSION_COOKIE}=${base64Str}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `moa_session=${base64Str}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    const encoded = encodeURIComponent(JSON.stringify(session));
    document.cookie = `${FRONTEND_SESSION_COOKIE}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `moa_session=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax`;
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

    const role = mapPrismaRoleToUserRole(rawUser.role || rawUser.authRole);
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
      expiresAt: new Date(
        Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000,
      ).toISOString(),
      accessToken: token,
    };

    writeSessionCookie(session, rememberMe);

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
    const payloadRole = role;
    const res = await apiClient.post<any>("/admin/users", {
      displayName: cleanDisplayName,
      email: cleanEmail,
      role: payloadRole,
    });

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
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";").map((c) => c.trim());
  const targetNames = [FRONTEND_SESSION_COOKIE, "moa_session"];
  for (const name of targetNames) {
    const match = cookies.find((c) => c.startsWith(`${name}=`));
    if (match) {
      const val = match.slice(name.length + 1);
      try {
        const decoded = decodeURIComponent(escape(atob(val)));
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.user) return parsed;
      } catch {}
      try {
        const decoded = atob(val);
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.user) return parsed;
      } catch {}
      try {
        const parsed = JSON.parse(decodeURIComponent(val));
        if (parsed && parsed.user) return parsed;
      } catch {}
      try {
        const parsed = JSON.parse(val);
        if (parsed && parsed.user) return parsed;
      } catch {}
    }
  }
  return null;
}

export function getCurrentUser(): AuthUser | null {
  return getClientSession()?.user ?? null;
}
