"use client";

import type { FinancialCapitalSummary } from "../directorData";

interface DirectorSpendCompositionChartProps {
  financialSummary: FinancialCapitalSummary;
  spendPercentages: {
    disbursed: string;
    committedPending: string;
    uncontracted: string;
  };
}

export function DirectorSpendCompositionChart({
  financialSummary,
  spendPercentages,
}: DirectorSpendCompositionChartProps) {
  const planValM = (financialSummary.planEstimatedValueETB / 1_000_000).toFixed(
    1,
  );
  const disbursedM = (financialSummary.actualDisbursedETB / 1_000_000).toFixed(
    1,
  );
  const committedM = (
    financialSummary.committedPendingPayETB / 1_000_000
  ).toFixed(1);
  const uncontractedM = (financialSummary.uncontractedETB / 1_000_000).toFixed(
    1,
  );

  // SVG Donut Calculations
  const radius = 68;
  const circumference = 2 * Math.PI * radius;

  const disbursedPctNum = Math.max(0, Number(spendPercentages.disbursed) || 0);
  const committedPctNum = Math.max(
    0,
    Number(spendPercentages.committedPending) || 0,
  );
  const uncontractedPctNum = Math.max(
    0,
    100 - disbursedPctNum - committedPctNum,
  );

  const strokeWidth = 22;

  // Segment stroke lengths
  const disbursedStroke = (disbursedPctNum / 100) * circumference;
  const committedStroke = (committedPctNum / 100) * circumference;
  const uncontractedStroke = (uncontractedPctNum / 100) * circumference;

  return (
    <div className="rounded-2xl bg-white p-4 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-lg sm:text-xl font-serif font-bold text-slate-900 tracking-tight">
            Spend Composition
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {planValM}M ETB Annual Plan
          </p>
        </div>

        {/* Donut Chart */}
        <div className="py-6 flex items-center justify-center">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg
              className="w-full h-full -rotate-90"
              viewBox="0 0 180 180"
              aria-label={`Donut chart showing ${disbursedPctNum}% disbursed`}
            >
              {/* Background circle */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke="#E2E8F0"
                strokeWidth={strokeWidth}
              />

              {/* Uncontracted segment */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke="#D5E5DC"
                strokeWidth={strokeWidth}
                strokeDasharray={`${uncontractedStroke} ${circumference}`}
                strokeDashoffset={0}
                strokeLinecap="butt"
              />

              {/* Committed pending pay segment */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke="#144233"
                strokeWidth={strokeWidth}
                strokeDasharray={`${committedStroke} ${circumference}`}
                strokeDashoffset={`-${uncontractedStroke}`}
                strokeLinecap="butt"
              />

              {/* Disbursed segment */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke="#0A3C2F"
                strokeWidth={strokeWidth}
                strokeDasharray={`${disbursedStroke} ${circumference}`}
                strokeDashoffset={`-${uncontractedStroke + committedStroke}`}
                strokeLinecap="butt"
              />
            </svg>

            {/* Centered Donut Value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-2xl sm:text-3xl font-sans font-bold tabular-nums text-slate-900 tracking-tight leading-none">
                {spendPercentages.disbursed}%
              </span>
              <span className="text-xs text-slate-500 font-medium mt-0.5">
                disbursed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend below donut */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-[#0A3C2F] inline-block shrink-0" />
          <span>Disbursed {disbursedM}M</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-[#144233] inline-block shrink-0" />
          <span>Committed {committedM}M</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-[#D5E5DC] inline-block shrink-0" />
          <span>Uncontracted {uncontractedM}M</span>
        </div>
      </div>
    </div>
  );
}
