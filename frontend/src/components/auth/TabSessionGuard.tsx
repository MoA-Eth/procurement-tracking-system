"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getClientSession } from "@/lib/authApi";
import { authTokenManager } from "@/lib/authTokenManager";
import { tabSessionManager } from "@/lib/tabSessionManager";

interface TabSessionGuardProps {
  children: ReactNode;
}

export function TabSessionGuard({ children }: TabSessionGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (tabSessionManager.hasTabSession()) {
      setIsAuthorized(true);
      return;
    }

    // Check if a valid remembered session exists from cookie
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
      return;
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
