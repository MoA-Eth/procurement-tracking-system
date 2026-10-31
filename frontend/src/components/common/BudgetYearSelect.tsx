"use client";

import { useEffect, useState } from "react";
import { budgetYearApi } from "@/lib/budgetYearApi";

interface Props {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function BudgetYearSelect({ value, onChange, disabled }: Props) {
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
  }, [value, onChange]);

  if (loading) return <p>Loading budget years…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded border p-2"
    >
      {years.map((y) => (
        <option key={y.code} value={y.code}>
          {y.label}
        </option>
      ))}
    </select>
  );
}
