import { Eye, EyeOff, Headphones, Lock, User } from "lucide-react";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import {
  REMEMBERED_EMAIL_STORAGE_KEY,
  useAuth,
} from "../../context/AuthContext";
import { MoALogo } from "../MoALogo";

interface LoginCardProps {
  onOpenTechSupport: () => void;
}

function subscribeToRememberedEmail(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === REMEMBERED_EMAIL_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

const rememberedEmailSnapshot = () =>
  localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY) ?? "";

export function LoginCard({ onOpenTechSupport }: LoginCardProps) {
  const { login, loginError, isLoading, setViewState } = useAuth();
  const rememberedEmail = useSyncExternalStore(
    subscribeToRememberedEmail,
    rememberedEmailSnapshot,
    () => "",
  );
  const [identifierInput, setIdentifierInput] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberChoice, setRememberChoice] = useState<boolean | null>(null);
  const identifier = identifierInput ?? rememberedEmail;
  const rememberMe = rememberChoice ?? Boolean(rememberedEmail);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password) return;

    await login(identifier, password, rememberMe);
  };

  return (
    <main className="auth-shell">
      <section
        className="auth-card auth-card-login"
        aria-labelledby="sign-in-title"
      >
        <div className="flex justify-center">
          <MoALogo size="md" />
        </div>

        <div className="mt-3 text-center">
          <h1
            id="sign-in-title"
            className="auth-page-title font-extrabold tracking-tight text-[#064e3b]"
          >
            MoA Procurement Tracking System
          </h1>
          <p className="auth-page-subtitle mt-1.5 font-medium text-[#58709a]">
            Internal Procurement Planning, Tracking and Reporting
          </p>
        </div>

        {loginError && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {loginError}
          </div>
        )}

        <form className="auth-form space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="identifier" className="auth-label">
              Username or Email
            </label>
            <div className="auth-input-wrap">
              <User aria-hidden="true" className="auth-input-icon" />
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={identifier}
                onChange={(event) => setIdentifierInput(event.target.value)}
                placeholder="Enter your username or email"
                className="auth-input pl-12"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="auth-label">
              Password
            </label>
            <div className="auth-input-wrap">
              <Lock aria-hidden="true" className="auth-input-icon" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="auth-input auth-input-with-trailing-action"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#8da3c4] hover:text-[#064e3b]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberChoice(event.target.checked)}
                className="h-5 w-5 accent-blue-600"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setViewState("FORGOT_PASSWORD")}
              className="font-semibold text-[#064e3b] hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !identifier.trim() || !password}
            className="auth-primary-button"
          >
            {isLoading ? "Signing In…" : "Sign In"}
          </button>
        </form>

        <button
          type="button"
          onClick={onOpenTechSupport}
          className="auth-support-link mx-auto flex items-center gap-2 font-medium text-[#58709a] hover:text-[#064e3b]"
        >
          <Headphones size={20} className="text-emerald-700" />
          Technical Support
        </button>
      </section>
      <footer className="auth-footer">
        © 2026 Ministry of Agriculture (MoA) Procurement Tracking System
        <span aria-hidden="true"> • </span>
        SRS MVP v1.1
      </footer>
    </main>
  );
}
