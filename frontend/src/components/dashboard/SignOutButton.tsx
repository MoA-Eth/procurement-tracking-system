"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "../../lib/authApi";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      aria-label={compact ? "Sign out" : undefined}
      className={
        compact
          ? "flex h-10 w-10 items-center justify-center rounded-xl text-emerald-200 hover:bg-white/10 hover:text-white disabled:opacity-60"
          : "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-red-200 hover:text-red-700 disabled:opacity-60"
      }
    >
      <LogOut size={compact ? 20 : 17} />
      {!compact && (isLoading ? "Signing out\u2026" : "Sign Out")}
    </button>
  );
}
