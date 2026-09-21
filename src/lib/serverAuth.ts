import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { type AuthSession, normalizeUserRole } from "./authTypes";

const backendUrl = () => {
  let url = (
    process.env.BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_BACKEND_API_URL ??
    "https://procurement-tracking-system-backend-3g8n.onrender.com"
  )
    .trim()
    .replace(/\/+$/, "");
  if (url.endsWith("/api")) {
    url = url.slice(0, -4);
  }
  return url;
};

function parseSessionPayload(val: string): AuthSession | null {
  if (!val || typeof val !== "string") return null;

  const tryValidate = (parsed: any): AuthSession | null => {
    if (parsed && parsed.user && parsed.status) {
      if (parsed.user.role || parsed.user.authRole) {
        parsed.user.role = normalizeUserRole(
          parsed.user.authRole || parsed.user.role,
        );
      }
      return parsed as AuthSession;
    }
    return null;
  };

  // 1. Try base64 decoding first
  try {
    const decoded = Buffer.from(val, "base64").toString("utf-8");
    const res = tryValidate(JSON.parse(decoded));
    if (res) return res;
  } catch {}

  // 2. Try direct JSON parsing
  try {
    const res = tryValidate(JSON.parse(val));
    if (res) return res;
  } catch {}

  // 3. Try URI-decoded JSON parsing
  try {
    const res = tryValidate(JSON.parse(decodeURIComponent(val)));
    if (res) return res;
  } catch {}

  return null;
}

export const getServerSession = cache(async (): Promise<AuthSession | null> => {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    // 1. Check primary isolated frontend session cookie
    const primaryCookieName =
      process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || "moa_user_session";
    const primary = cookieStore.get(primaryCookieName)?.value;
    const primaryParsed = primary ? parseSessionPayload(primary) : null;

    // 2. Fetch authoritative live session from backend /api/auth/session
    // This guarantees that any role changes or invitations (like Management)
    // are retrieved directly from the database rather than stale cached cookies.
    if (cookieHeader) {
      try {
        const headers: Record<string, string> = { cookie: cookieHeader };
        if (primaryParsed?.accessToken) {
          headers["authorization"] = `Bearer ${primaryParsed.accessToken}`;
        }
        const response = await fetch(`${backendUrl()}/api/auth/session`, {
          headers,
          cache: "no-store",
        });
        if (response.ok) {
          const remoteSession = (await response.json()) as AuthSession;
          if (remoteSession && remoteSession.user) {
            remoteSession.user.role = normalizeUserRole(
              (remoteSession.user as any).authRole || remoteSession.user.role,
            );
            return remoteSession;
          }
        } else if (response.status === 401 || response.status === 403) {
          // Backend explicitly rejected the session (token expired or invalidated)
          return null;
        }
      } catch {
        // Fall back to local cookie parsing if backend is unreachable
      }
    }

    if (primaryParsed) return primaryParsed;

    // 3. Check moa_session cookie
    const secondary = cookieStore.get("moa_session")?.value;
    if (secondary) {
      const parsed = parseSessionPayload(secondary);
      if (parsed) return parsed;
    }

    // 4. Inspect all cookies in store for a valid session payload
    for (const c of cookieStore.getAll()) {
      if (
        c.name.includes("session") ||
        c.name.includes("moa") ||
        c.name.includes("auth")
      ) {
        const parsed = parseSessionPayload(c.value);
        if (parsed) return parsed;
      }
    }

    return null;
  } catch {
    return null;
  }
});

export const requireAuthenticatedSession = cache(async () => {
  const session = await getServerSession();
  if (!session) redirect("/");
  if (session.status === "PASSWORD_CHANGE_REQUIRED") {
    redirect("/change-password");
  }
  return session;
});
