"use client";

import type { FinancialCapitalSummary } from "../directorData";

interface DirectorFinancialSummaryCardProps {
  financialSummary: FinancialCapitalSummary;
  spendPercentages: {
    disbursed: string;
    committedPending: string;
    uncontracted: string;
  };
  selectedFiscalYear: string;
  currency?: string;
}

export function DirectorFinancialSummaryCard({
  financialSummary,
  spendPercentages,
  selectedFiscalYear,
  currency = "ETB",
}: DirectorFinancialSummaryCardProps) {
  const isDollar =
    currency?.toUpperCase() === "USD" ||
    currency?.toLowerCase() === "dollar" ||
    currency === "$";

  // Extract number and unit cleanly for display
  const formatMValue = (val: number) => {
    const numInM = (val / 1_000_000).toFixed(1);
    return numInM;
  };

  return (
    <section className="rounded-2xl bg-white p-4 sm:p-6 border border-slate-200/80 shadow-2xs w-full max-w-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight leading-tight">
              Financial Capital &amp; Contracts
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {selectedFiscalYear} Allocation · Currency:{" "}
              <span className="font-semibold text-slate-700">
                {isDollar ? "USD ($)" : "Birr (ETB)"}
              </span>
            </p>
          </div>
          <div className="self-start sm:self-auto shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] font-semibold text-xs tracking-wide">
              {financialSummary.disbursedOfContractedPct}% disbursed
              <span className="sr-only">Executed Disbursed</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4 Financial Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 py-5">
        {/* Col 1: Planned Value */}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 truncate">
            Planned Value
          </p>
          <div className="my-1.5 flex items-baseline gap-1">
            {isDollar && (
              <span className="text-2xl sm:text-3xl font-medium text-slate-700">
                $
              </span>
            )}
            <span className="text-3xl sm:text-4xl font-sans font-semibold tabular-nums text-slate-900 tracking-tight leading-none">
              {formatMValue(financialSummary.planEstimatedValueETB)}
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-500">
              M
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
            {!isDollar && (
              <>
                <span className="font-semibold text-slate-600">Birr</span>
                <span className="text-slate-300">·</span>
              </>
            )}
            <span className="text-slate-400 font-medium">Approved budget</span>
          </div>
        </div>

        {/* Col 2: Signed Contracts */}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 truncate">
            Signed Contracts
          </p>
          <div className="my-1.5 flex items-baseline gap-1">
            {isDollar && (
              <span className="text-2xl sm:text-3xl font-medium text-slate-700">
                $
              </span>
            )}
            <span className="text-3xl sm:text-4xl font-sans font-semibold tabular-nums text-slate-900 tracking-tight leading-none">
              {formatMValue(financialSummary.signedContractsCommittedETB)}
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-500">
              M
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#006837] truncate">
            {!isDollar && (
              <>
                <span className="font-semibold text-slate-600">Birr</span>
                <span className="text-slate-300">·</span>
              </>
            )}
            <span className="font-semibold">
              {financialSummary.contractExecutionRatePct}% execution rate
            </span>
          </div>
        </div>

        {/* Col 3: Actual Disbursed */}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 truncate">
            Actual Disbursed
          </p>
          <div className="my-1.5 flex items-baseline gap-1">
            {isDollar && (
              <span className="text-2xl sm:text-3xl font-medium text-slate-700">
                $
              </span>
            )}
            <span className="text-3xl sm:text-4xl font-sans font-semibold tabular-nums text-slate-900 tracking-tight leading-none">
              {formatMValue(financialSummary.actualDisbursedETB)}
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-500">
              M
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#006837] truncate">
            {!isDollar && (
              <>
                <span className="font-semibold text-slate-600">Birr</span>
                <span className="text-slate-300">·</span>
              </>
            )}
            <span className="font-semibold">
              {financialSummary.disbursedOfContractedPct}% of contracts
            </span>
          </div>
        </div>

        {/* Col 4: Remaining Balance */}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 truncate">
            Remaining Balance
          </p>
          <div className="my-1.5 flex items-baseline gap-1">
            {isDollar && (
              <span className="text-2xl sm:text-3xl font-medium text-slate-700">
                $
              </span>
            )}
            <span className="text-3xl sm:text-4xl font-sans font-semibold tabular-nums text-slate-900 tracking-tight leading-none">
              {formatMValue(financialSummary.remainingUncommittedETB)}
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-500">
              M
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
            {!isDollar && (
              <>
                <span className="font-semibold text-slate-600">Birr</span>
                <span className="text-slate-300">·</span>
              </>
            )}
            <span className="font-medium">
              {financialSummary.availableCapacityPct}% available
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar and Legend */}
      <div className="pt-3 border-t border-slate-100">
        <span className="sr-only">Portfolio Spend Composition</span>
        {/* Legend Row */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-2.5 text-xs">
          <div
            className="flex items-center gap-1.5"
            title="Actual cash paid out to contractors/suppliers against verified deliverables"
          >
            <span className="h-2.5 w-2.5 rounded-xs bg-[#0A3C2F] inline-block shrink-0" />
            <span className="text-slate-700 font-semibold">Disbursed</span>
            <span className="text-slate-500">
              ({isDollar ? "$" : ""}
              {formatMValue(financialSummary.actualDisbursedETB)}M{" "}
              {!isDollar ? "Birr " : ""}· Paid)
            </span>
          </div>
          <div
            className="flex items-center gap-1.5"
            title="Signed contract obligations awaiting milestone completion and payment"
          >
            <span className="h-2.5 w-2.5 rounded-xs bg-[#B7892B] inline-block shrink-0" />
            <span className="text-slate-700 font-semibold">Committed</span>
            <span className="text-slate-500">
              ({isDollar ? "$" : ""}
              {formatMValue(financialSummary.committedPendingPayETB)}M{" "}
              {!isDollar ? "Birr " : ""}· Under Contract)
            </span>
          </div>
          <div
            className="flex items-center gap-1.5"
            title="Allocated annual budget not yet awarded or contracted"
          >
            <span className="h-2.5 w-2.5 rounded-xs bg-[#CBD5E1] inline-block shrink-0" />
            <span className="text-slate-700 font-semibold">Uncommitted</span>
            <span className="text-slate-500">
              ({isDollar ? "$" : ""}
              {formatMValue(financialSummary.uncontractedETB)}M{" "}
              {!isDollar ? "Birr " : ""}· Available Budget)
            </span>
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200/60">
          <div
            style={{ width: `${spendPercentages.disbursed}%` }}
            className="bg-[#0A3C2F] h-full transition-all duration-500 border-r border-white/60 last:border-r-0"
            title={`Disbursed (Paid): ${spendPercentages.disbursed}% (${isDollar ? "$" : ""}${formatMValue(financialSummary.actualDisbursedETB)}M)`}
          />
          <div
            style={{ width: `${spendPercentages.committedPending}%` }}
            className="bg-[#B7892B] h-full transition-all duration-500 border-r border-white/60 last:border-r-0"
            title={`Committed (Under Contract): ${spendPercentages.committedPending}% (${isDollar ? "$" : ""}${formatMValue(financialSummary.committedPendingPayETB)}M)`}
          />
          <div
            style={{ width: `${spendPercentages.uncontracted}%` }}
            className="bg-[#CBD5E1] h-full transition-all duration-500"
            title={`Uncommitted (Available): ${spendPercentages.uncontracted}% (${isDollar ? "$" : ""}${formatMValue(financialSummary.uncontractedETB)}M)`}
          />
        </div>
      </div>
    </section>
  );
}
