"use client";

import { Check, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { changePassword } from "../../lib/authApi";
import { dashboardPath } from "../../lib/authTypes";
import { MoALogo } from "../MoALogo";

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const session = await changePassword(
        currentPassword,
        newPassword,
        confirmPassword,
      );
      router.replace(dashboardPath(session.user.role));
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The password could not be changed.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section
        className="auth-card auth-card-flow"
        aria-labelledby="change-password-title"
      >
        <div className="flex justify-center">
          <MoALogo size="md" />
        </div>
        <div className="mt-3 text-center">
          <h1
            id="change-password-title"
            className="auth-flow-title text-3xl font-extrabold text-[#064e3b]"
          >
            Create a New Password
          </h1>
          <p className="auth-flow-subtitle mt-3 text-[#58709a]">
            Your temporary password must be changed before you can enter the
            system.
          </p>
        </div>

        <div className="auth-password-policy mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Your new password must include:</p>
          <ul className="mt-2 grid grid-cols-2 gap-1">
            {[
              "At least 12 characters",
              "Upper and lowercase letters",
              "At least one number",
              "At least one symbol",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check size={15} /> {item}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-flow-form space-y-4">
          {[
            {
              id: "current-password",
              label: "Current temporary password",
              value: currentPassword,
              setter: setCurrentPassword,
              autoComplete: "current-password",
            },
            {
              id: "new-password",
              label: "New password",
              value: newPassword,
              setter: setNewPassword,
              autoComplete: "new-password",
            },
            {
              id: "confirm-password",
              label: "Confirm new password",
              value: confirmPassword,
              setter: setConfirmPassword,
              autoComplete: "new-password",
            },
          ].map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className="auth-label">
                {field.label}
              </label>
              <div className="auth-input-wrap">
                <Lock className="auth-input-icon" aria-hidden="true" />
                <input
                  id={field.id}
                  type="password"
                  autoComplete={field.autoComplete}
                  required
                  value={field.value}
                  onChange={(event) => field.setter(event.target.value)}
                  className="auth-input pl-12"
                />
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={isLoading}
            className="auth-primary-button"
          >
            {isLoading ? "Changing Password…" : "Change Password and Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}
