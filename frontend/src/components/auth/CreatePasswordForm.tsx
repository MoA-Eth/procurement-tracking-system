"use client";

import { Check, Circle, Eye, EyeOff, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createPassword } from "../../lib/authApi";
import { MoALogo } from "../MoALogo";

export function CreatePasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    {
      label: "At least 12 characters",
      isSatisfied: newPassword.length >= 12,
    },
    {
      label: "Upper and lowercase letters",
      isSatisfied: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword),
    },
    {
      label: "At least one number",
      isSatisfied: /[0-9]/.test(newPassword),
    },
    {
      label: "At least one symbol",
      isSatisfied: /[^A-Za-z0-9]/.test(newPassword),
    },
  ];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setIsLoading(true);
    try {
      await createPassword(token, newPassword, confirmPassword);
      setIsError(false);
      setMessage("Your password has been created. Redirecting to sign in…");
      window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 1200);
    } catch (caught) {
      setIsError(true);
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Your password could not be created.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section
        className="auth-card auth-card-flow"
        aria-labelledby="create-password-title"
      >
        <div className="flex justify-center">
          <MoALogo size="md" />
        </div>
        <div className="mt-3 text-center">
          <h1
            id="create-password-title"
            className="auth-flow-title text-3xl font-extrabold text-[#064e3b]"
          >
            Create Your Password
          </h1>
          <p className="auth-flow-subtitle text-[#58709a]">
            Set the password you will use to sign in to your new account.
          </p>
        </div>

        {message && (
          <div
            role={isError ? "alert" : "status"}
            className={`mt-5 rounded-xl border p-3 text-sm ${
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
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-describedby="create-password-requirements"
                className="auth-input auth-input-with-trailing-action"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((visible) => !visible)}
                aria-label={
                  showNewPassword ? "Hide new password" : "Show new password"
                }
                aria-pressed={showNewPassword}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#8da3c4] hover:text-[#064e3b]"
              >
                {showNewPassword ? (
                  <EyeOff size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="auth-label">
              Confirm password
            </label>
            <div className="auth-input-wrap">
              <Lock className="auth-input-icon" aria-hidden="true" />
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="auth-input auth-input-with-trailing-action"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirmation password"
                    : "Show confirmation password"
                }
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#8da3c4] hover:text-[#064e3b]"
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div
            id="create-password-requirements"
            className="auth-password-policy rounded-xl border border-emerald-100 bg-white text-emerald-950"
          >
            <p className="font-semibold">Your password must include:</p>
            <ul
              aria-label="Password requirements"
              aria-live="polite"
              className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2"
            >
              {passwordRequirements.map((requirement) => (
                <li
                  key={requirement.label}
                  data-satisfied={requirement.isSatisfied}
                  className={`flex items-center gap-2 transition-colors ${
                    requirement.isSatisfied
                      ? "font-medium text-emerald-800"
                      : "text-slate-500"
                  }`}
                >
                  {requirement.isSatisfied ? (
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    <Circle size={15} strokeWidth={1.75} aria-hidden="true" />
                  )}
                  <span>{requirement.label}</span>
                  <span className="sr-only">
                    {requirement.isSatisfied
                      ? " — requirement satisfied"
                      : " — requirement not yet satisfied"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="auth-primary-button"
          >
            {isLoading ? "Creating Password…" : "Create Password"}
          </button>
        </form>
      </section>
    </main>
  );
}
