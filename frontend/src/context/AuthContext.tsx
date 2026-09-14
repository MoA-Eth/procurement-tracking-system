"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authenticate, requestPasswordReset } from "../lib/authApi";
import { dashboardPath } from "../lib/authTypes";

export const REMEMBERED_EMAIL_STORAGE_KEY = "moa_remembered_email";
type AuthView = "LOGIN" | "FORGOT_PASSWORD";

interface AuthContextValue {
  loginError: string | null;
  isLoading: boolean;
  viewState: AuthView;
  setViewState: (view: AuthView) => void;
  login: (
    identifier: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<void>;
  sendPasswordResetLink: (
    email: string,
  ) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [viewState, setViewStateValue] = useState<AuthView>("LOGIN");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (
    identifier: string,
    password: string,
    rememberMe: boolean,
  ) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const normalized = identifier.trim().toLowerCase();
      const session = await authenticate(normalized, password, rememberMe);
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, normalized);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
      }
      router.replace(
        session.status === "PASSWORD_CHANGE_REQUIRED"
          ? "/change-password"
          : dashboardPath(session.user.role),
      );
      router.refresh();
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const sendPasswordResetLink = async (email: string) => {
    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      return { success: true, message: "" };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to process the password reset request.",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const setViewState = (view: AuthView) => {
    setLoginError(null);
    setViewStateValue(view);
  };

  return (
    <AuthContext.Provider
      value={{
        loginError,
        isLoading,
        viewState,
        setViewState,
        login,
        sendPasswordResetLink,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
