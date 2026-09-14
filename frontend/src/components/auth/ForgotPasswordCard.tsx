import { ArrowLeft, CheckCircle, Headphones } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { MoALogo } from "../MoALogo";

interface ForgotPasswordCardProps {
  onOpenTechSupport: () => void;
}

export function ForgotPasswordCard({
  onOpenTechSupport,
}: ForgotPasswordCardProps) {
  const { sendPasswordResetLink, isLoading, setViewState } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    const result = await sendPasswordResetLink(email);
    setIsError(!result.success);
    setMessage(
      result.success
        ? "If an active account matches that address, password reset instructions will be sent."
        : result.message,
    );
  };

  return (
    <main className="auth-shell">
      <section
        className="auth-card auth-card-flow"
        aria-labelledby="reset-title"
      >
        <div className="flex justify-center">
          <MoALogo size="md" />
        </div>
        <div className="mt-3 text-center">
          <h1
            id="reset-title"
            className="auth-flow-title text-3xl font-extrabold tracking-tight text-[#064e3b]"
          >
            Reset Your Password
          </h1>
          <p className="auth-flow-subtitle mt-3 font-medium text-[#58709a]">
            Enter the email linked to your account and we&apos;ll send a reset
            link.
          </p>
        </div>

        {message && (
          <div
            role={isError ? "alert" : "status"}
            className={`mt-6 flex gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
              isError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {!isError && <CheckCircle size={18} className="shrink-0" />}
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-flow-form space-y-4">
          <div>
            <label htmlFor="reset-email" className="auth-label">
              Email Address
            </label>
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setMessage(null);
              }}
              placeholder="name@moa.gov.et"
              className="auth-input"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="auth-primary-button"
          >
            {isLoading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>

        <div className="auth-flow-actions flex items-center justify-between border-t border-slate-200 text-sm">
          <button
            type="button"
            onClick={() => setViewState("LOGIN")}
            className="flex items-center gap-2 font-medium text-[#58709a] hover:text-[#064e3b]"
          >
            <ArrowLeft size={18} /> Back to Sign In
          </button>
          <button
            type="button"
            onClick={onOpenTechSupport}
            className="flex items-center gap-2 font-medium text-[#58709a] hover:text-[#064e3b]"
          >
            <Headphones size={18} /> Technical Support
          </button>
        </div>
      </section>
    </main>
  );
}
