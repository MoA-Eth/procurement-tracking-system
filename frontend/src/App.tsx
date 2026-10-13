"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginCard } from "./components/auth/LoginCard";
import { ForgotPasswordCard } from "./components/auth/ForgotPasswordCard";
import { TechnicalSupportModal } from "./components/TechnicalSupportModal";
import { getClientSession } from "./lib/authApi";
import { authTokenManager } from "./lib/authTokenManager";
import { tabSessionManager } from "./lib/tabSessionManager";
import { dashboardPath } from "./lib/authTypes";

const MainAppRouter: React.FC = () => {
  const router = useRouter();
  const { viewState } = useAuth();
  const [isTechSupportOpen, setIsTechSupportOpen] = useState(false);

  useEffect(() => {
    const session = tabSessionManager.getTabSession() || getClientSession();
    if (session?.user && session.status === "AUTHENTICATED") {
      if (!tabSessionManager.hasTabSession()) {
        tabSessionManager.setTabSession(session);
        if (session.accessToken) {
          authTokenManager.setToken(session.accessToken);
        }
      }
      router.replace(dashboardPath(session.user.role));
    }
  }, [router]);

  const openSupport = () => setIsTechSupportOpen(true);
  const closeSupport = () => setIsTechSupportOpen(false);

  return (
    <>
      {viewState === "LOGIN" && <LoginCard onOpenTechSupport={openSupport} />}

      {viewState === "FORGOT_PASSWORD" && (
        <ForgotPasswordCard onOpenTechSupport={openSupport} />
      )}

      <TechnicalSupportModal
        isOpen={isTechSupportOpen}
        onClose={closeSupport}
      />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppRouter />
    </AuthProvider>
  );
}
