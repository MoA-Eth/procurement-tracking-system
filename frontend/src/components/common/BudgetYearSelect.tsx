"use client";

import { useEffect, useState } from "react";
import { budgetYearApi } from "@/lib/budgetYearApi";

interface Props {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
}

export function BudgetYearSelect({ value, onChange, disabled, className }: Props) {
  const [years, setYears] = useState<Array<{ code: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await budgetYearApi.getBudgetYears();
        if (!cancelled) {
          setYears(data);
          if (!value && data.length) onChange(data[0].code);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center text-xs text-slate-500 py-2.5 px-3 border border-slate-200 rounded-xl bg-slate-50">
        Loading budget years...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-rose-600 py-2 px-3 border border-rose-200 rounded-xl bg-rose-50">
        Error loading years: {error}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={
        className ||
        `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
          disabled
            ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-medium"
            : "bg-white text-slate-900 border-slate-300 focus:border-[#00843D] focus:ring-1 focus:ring-[#00843D]"
        }`
      }
    >
      {years.map((y) => (
        <option key={y.code} value={y.code}>
          {y.label}
        </option>
      ))}
    </select>
  );
}
