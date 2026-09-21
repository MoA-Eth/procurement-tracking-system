"use client";

import Link from "next/link";

interface StatusItem {
  label: string;
  value: number;
  href: string;
}

interface OfficerOverviewStatusBarChartProps {
  items: StatusItem[];
  loading?: boolean;
}

export function OfficerOverviewStatusBarChart({
  items,
  loading = false,
}: OfficerOverviewStatusBarChartProps) {
  const maxValue = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((sum, i) => sum + i.value, 0);

  return (
    <section
      aria-label="Procurement overview"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#006837]" />
          <h2 className="text-lg font-semibold text-[#16253d]">
            Procurement Overview
          </h2>
        </div>
        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
          {loading ? "Loading..." : `Total: ${total.toLocaleString()}`}
        </span>
      </div>

      <div className="p-5 sm:p-6 space-y-3.5 sm:space-y-4">
        {items.map((item) => {
          const percent =
            !loading && maxValue > 0 ? (item.value / maxValue) * 100 : 0;

          return (
            <Link
              key={item.label}
              href={item.href}
              className="group flex items-center gap-3 sm:gap-4 -mx-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-slate-50"
            >
              {/* Status Label (Right aligned towards bar) */}
              <div className="w-36 sm:w-44 text-right shrink-0">
                <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight block group-hover:text-[#006837] transition-colors truncate">
                  {item.label}
                </span>
              </div>

              {/* Horizontal Green Bar or Loading Pulse */}
              <div className="flex-1 flex items-center min-w-0 pr-3">
                {loading ? (
                  <div className="h-4 sm:h-5 w-24 bg-slate-200/80 rounded-xs animate-pulse" />
                ) : (
                  <div
                    className="h-4 sm:h-5 bg-[#006837] rounded-xs transition-all duration-500 ease-out group-hover:bg-[#0A3C2F] shadow-2xs"
                    style={{
                      width: `${Math.max(percent, item.value > 0 ? 1.5 : 0)}%`,
                    }}
                  />
                )}
              </div>

              {/* Value (Bold green text or loading placeholder) */}
              <div className="w-12 sm:w-16 text-right shrink-0">
                {loading ? (
                  <span className="text-sm font-medium text-slate-400">
                    ...
                  </span>
                ) : (
                  <span className="text-sm sm:text-base font-semibold text-[#006837] tabular-nums">
                    {item.value}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
