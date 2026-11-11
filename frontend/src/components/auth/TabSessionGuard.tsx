"use client";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/authApi";
import { authTokenManager } from "@/lib/authTokenManager";
import { tabSessionManager } from "@/lib/tabSessionManager";
import type { AuthSession } from "@/lib/authTypes";

interface TabSessionGuardProps {
  children: ReactNode;
  session: AuthSession;
}

export function TabSessionGuard({
  children,
  session,
}: TabSessionGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(true);

  useLayoutEffect(() => {
    tabSessionManager.setTabSession(session);
    authTokenManager.setToken(session.accessToken ?? null);

    const expiresAt = new Date(session.expiresAt).getTime();
    let timeoutId: number | undefined;
    const redirectToLogin = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      tabSessionManager.clearTabSession();
      authTokenManager.clearToken();
      void signOut();
      setIsAuthorized(false);
      router.replace("/");
    };

    if (!Number.isFinite(expiresAt)) {
      redirectToLogin();
      return;
    }

    const checkExpiration = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        redirectToLogin();
        return;
      }
      timeoutId = window.setTimeout(
        checkExpiration,
        Math.min(remaining, 2_147_000_000),
      );
    };
    const checkWhenActive = () => {
      if (document.visibilityState === "visible") checkExpiration();
    };

    checkExpiration();
    window.addEventListener("focus", checkWhenActive);
    document.addEventListener("visibilitychange", checkWhenActive);
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      window.removeEventListener("focus", checkWhenActive);
      document.removeEventListener("visibilitychange", checkWhenActive);
    };
  }, [router, session]);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00843D] border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500"> Checking... </p>
        </div>
      </div>
    );
  }
  return <> {children} </>;
}
