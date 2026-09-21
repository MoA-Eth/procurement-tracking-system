"use client";

import { Send, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { createInvitedUser } from "../../lib/authApi";
import { ROLE_LABELS, type ProvisionableRole } from "../../lib/authTypes";

const roles: ProvisionableRole[] = [
  "OFFICER",
  "DIRECTOR",
  "ENDORSING_COMMITTEE",
  "MANAGEMENT",
  "ADMIN",
];

export function CreateUserForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProvisionableRole>("OFFICER");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setIsLoading(true);
    try {
      const result = await createInvitedUser(displayName, email, role);
      setIsError(false);
      setMessage(result.message);
      setDisplayName("");
      setEmail("");
      setRole("OFFICER");
    } catch (caught) {
      setIsError(true);
      setMessage(
        caught instanceof Error
          ? caught.message
          : "The user could not be created.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
          <UserPlus aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Create a user
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter the user’s details. We will email them a one-time link to
            create their password.
          </p>
        </div>
      </div>

      {message && (
        <div
          role={isError ? "alert" : "status"}
          className={`mt-6 rounded-xl border p-4 text-sm ${
            isError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
        <div>
          <label htmlFor="display-name" className="auth-label">
            Full name
          </label>
          <input
            id="display-name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="auth-input"
            placeholder="Enter the user’s full name"
          />
        </div>
        <div>
          <label htmlFor="email" className="auth-label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="auth-input"
            placeholder="name@moa.gov.et"
          />
        </div>
        <div>
          <label htmlFor="role" className="auth-label">
            Role
          </label>
          <select
            id="role"
            required
            value={role}
            onChange={(event) =>
              setRole(event.target.value as ProvisionableRole)
            }
            className="auth-input"
          >
            {roles.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="auth-primary-button mt-1 flex items-center justify-center gap-2"
        >
          <Send size={18} aria-hidden="true" />
          {isLoading ? "Creating User…" : "Create User and Send Invitation"}
        </button>
      </form>
    </section>
  );
}
