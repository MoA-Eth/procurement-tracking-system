"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginCard } from "./components/auth/LoginCard";
import { ForgotPasswordCard } from "./components/auth/ForgotPasswordCard";
import { TechnicalSupportModal } from "./components/TechnicalSupportModal";
import { tabSessionManager } from "./lib/tabSessionManager";
import { dashboardPath } from "./lib/authTypes";

const MainAppRouter: React.FC = () => {
  const router = useRouter();
  const { viewState } = useAuth();
  const [isTechSupportOpen, setIsTechSupportOpen] = useState(false);

  useEffect(() => {
    if (tabSessionManager.hasTabSession()) {
      const session = tabSessionManager.getTabSession();
      if (session?.user) {
        router.replace(dashboardPath(session.user.role));
      }
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
