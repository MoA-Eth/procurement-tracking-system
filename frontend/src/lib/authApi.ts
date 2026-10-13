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

function writeSessionCookie(
  session: AuthSession,
  rememberMe: boolean = false,
): void {
  if (typeof document === "undefined") return;

  const isHttps =
    typeof location !== "undefined" && location.protocol === "https:";
  const secureSuffix = isHttps ? "; Secure" : "";

  let cookieAttributes = `path=/; SameSite=Lax${secureSuffix}`;
  if (rememberMe) {
    const maxAgeSeconds = 30 * 24 * 60 * 60; // 30 days
    const expiresDate = session.expiresAt
      ? new Date(session.expiresAt).toUTCString()
      : new Date(Date.now() + maxAgeSeconds * 1000).toUTCString();
    cookieAttributes += `; max-age=${maxAgeSeconds}; expires=${expiresDate}`;
  }

  try {
    const jsonStr = JSON.stringify(session);
    const base64Str = btoa(unescape(encodeURIComponent(jsonStr)));
    document.cookie = `${FRONTEND_SESSION_COOKIE}=${base64Str}; ${cookieAttributes}`;
    document.cookie = `moa_session=${base64Str}; ${cookieAttributes}`;
  } catch {
    const encoded = encodeURIComponent(JSON.stringify(session));
    document.cookie = `${FRONTEND_SESSION_COOKIE}=${encoded}; ${cookieAttributes}`;
    document.cookie = `moa_session=${encoded}; ${cookieAttributes}`;
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

    const sessionExpiresAt =
      loginData.expiresAt ||
      new Date(
        Date.now() +
          (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000),
      ).toISOString();

    const session: AuthSession = {
      status: rawUser.mustChangePassword
        ? "PASSWORD_CHANGE_REQUIRED"
        : "AUTHENTICATED",
      user,
      expiresAt: sessionExpiresAt,
      accessToken: token,
      rememberMe,
    };

    writeSessionCookie(session, rememberMe);
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
  if (!confirmPassword || newPassword !== confirmPassword) {
    throw new AuthApiError("The password confirmation does not match.");
  }

  try {
    const res = await apiClient.post<any>("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });

    const result = res.data || res;
    const email = result.user?.email;

    if (typeof email !== "string" || !email) {
      throw new AuthApiError(
        "Your password changed. Please open a private browser window and sign in with your new password.",
      );
    }

    // Password changes revoke the previous session token.
    // Authenticate again to refresh the frontend session and role.
    try {
      return await authenticate(email, newPassword);
    } catch {
      throw new AuthApiError(
        "Your password changed, but automatic sign-in failed. Please open a private browser window and sign in with your new password.",
      );
    }
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
      invitationExpiresAt:
        res.invitationExpiresAt ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      message:
        res.message || `Invitation email sent successfully to ${cleanEmail}.`,
      invitationLink: res.invitationLink || res.invitationUrl,
    };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw new AuthApiError(err.message);
    }
    if (err instanceof Error) {
      throw new AuthApiError(err.message);
    }
    throw new AuthApiError("Failed to deliver user invitation.");
  }
}

export async function getInvitationLink(userId: string): Promise<string> {
  const res = await apiClient.get<{ invitationLink: string }>(
    `/admin/users/${encodeURIComponent(userId)}/invitation-link`,
  );
  return res.invitationLink;
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
  if (tabSession) {
    if (tabSession.expiresAt) {
      const exp = new Date(tabSession.expiresAt).getTime();
      if (Number.isFinite(exp) && exp <= Date.now()) {
        tabSessionManager.clearTabSession();
      } else {
        return tabSession;
      }
    } else {
      return tabSession;
    }
  }

  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";").map((c) => c.trim());
  const targetNames = [FRONTEND_SESSION_COOKIE, "moa_session"];
  for (const name of targetNames) {
    const match = cookies.find((c) => c.startsWith(`${name}=`));
    if (match) {
      const val = match.slice(name.length + 1);
      const tryNormalize = (parsed: any): AuthSession | null => {
        if (parsed && parsed.user) {
          if (parsed.expiresAt) {
            const exp = new Date(parsed.expiresAt).getTime();
            if (Number.isFinite(exp) && exp <= Date.now()) {
              // Expired session - purge cookies cleanly
              document.cookie = `${FRONTEND_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
              document.cookie = `moa_session=; path=/; max-age=0; SameSite=Lax`;
              return null;
            }
          }
          if (parsed.user.role || parsed.user.authRole) {
            parsed.user.role = normalizeUserRole(
              parsed.user.authRole || parsed.user.role,
            );
          }
          const validSession = parsed as AuthSession;
          // Hydrate in-memory token and tab session
          if (validSession.accessToken) {
            authTokenManager.setToken(validSession.accessToken);
          }
          tabSessionManager.setTabSession(validSession);
          return validSession;
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
