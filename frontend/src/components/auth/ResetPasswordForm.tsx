"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { resetPassword } from "../../lib/authApi";
import { MoALogo } from "../MoALogo";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setIsLoading(true);
    try {
      await resetPassword(token, newPassword, confirmPassword);
      setIsError(false);
      setMessage("Password reset. Redirecting you to sign in…");
      window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 1200);
    } catch (caught) {
      setIsError(true);
      setMessage(
        caught instanceof Error
          ? caught.message
          : "The password could not be reset.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section
        className="auth-card auth-card-flow"
        aria-labelledby="new-password-title"
      >
        <div className="flex justify-center">
          <MoALogo size="md" />
        </div>
        <div className="mt-3 text-center">
          <h1
            id="new-password-title"
            className="auth-flow-title text-3xl font-extrabold text-[#064e3b]"
          >
            Choose a New Password
          </h1>
          <p className="auth-flow-subtitle mt-3 text-[#58709a]">
            Use at least 12 characters with upper and lowercase letters, a
            number and a symbol.
          </p>
        </div>

        {message && (
          <div
            role={isError ? "alert" : "status"}
            className={`mt-6 rounded-xl border p-3 text-sm ${
              isError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-flow-form space-y-4">
          <div>
            <label htmlFor="new-password" className="auth-label">
              New password
            </label>
            <div className="auth-input-wrap">
              <Lock className="auth-input-icon" aria-hidden="true" />
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="auth-input pl-12"
              />
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="auth-label">
              Confirm new password
            </label>
            <div className="auth-input-wrap">
              <Lock className="auth-input-icon" aria-hidden="true" />
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="auth-input pl-12"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="auth-primary-button"
          >
            {isLoading ? "Resetting Password…" : "Reset Password"}
          </button>
        </form>
      </section>
    </main>
  );
}
