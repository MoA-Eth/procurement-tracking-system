"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getClientSession, signOut } from "@/lib/authApi";
import { authTokenManager } from "@/lib/authTokenManager";
import { tabSessionManager } from "@/lib/tabSessionManager";

interface TabSessionGuardProps {
  children: ReactNode;
}

export function TabSessionGuard({ children }: TabSessionGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return true;
    const clientSession = getClientSession();
    return clientSession &&
      clientSession.status === "AUTHENTICATED" &&
      clientSession.user
      ? true
      : null;
  });

  useEffect(() => {
    const clientSession = getClientSession();
    if (
      clientSession &&
      clientSession.status === "AUTHENTICATED" &&
      clientSession.user
    ) {
      tabSessionManager.setTabSession(clientSession);
      if (clientSession.accessToken) {
        authTokenManager.setToken(clientSession.accessToken);
      }
      setIsAuthorized(true);
      const expiresAt = new Date(clientSession.expiresAt).getTime();
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
    }

    setIsAuthorized(false);
    router.replace("/");
  }, [router]);
  if (isAuthorized === null || isAuthorized === false) {
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
