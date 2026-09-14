"use client";

import { Clock, Inbox } from "lucide-react";

export interface CommitteeStatsCardsProps {
  delayedCount: number;
  awaitingCount: number;
  totalReviewedCount: number;
  approvedCount: number;
  rejectedCount: number;
  approvedPercent: number;
  rejectedPercent: number;
  approvedPercentAnim: number;
  rejectedPercentAnim: number;
  filter: "all" | "delayed";
  onToggleDelayedFilter: () => void;
  onSelectAllFilter: () => void;
}

export function CommitteeStatsCards({
  delayedCount,
  awaitingCount,
  totalReviewedCount,
  approvedCount,
  rejectedCount,
  approvedPercent,
  rejectedPercent,
  approvedPercentAnim,
  rejectedPercentAnim,
  filter,
  onToggleDelayedFilter,
  onSelectAllFilter,
}: CommitteeStatsCardsProps) {
  return (
    <section
      aria-label="Committee statistics summary"
      className="grid grid-cols-1 gap-4 md:grid-cols-3 max-w-5xl"
    >
      {/* Card 1: Delayed Votes */}
      <div
        onClick={onToggleDelayedFilter}
        className={`relative overflow-hidden bg-gradient-to-br from-rose-50/70 to-red-50/40 rounded-[20px] p-5 border shadow-3xs flex flex-col justify-between min-h-[140px] border-l-[5px] border-l-red-500 hover:shadow-xs transition-all cursor-pointer select-none ${
          filter === "delayed"
            ? "border-red-400 ring-2 ring-red-500/20 scale-[1.01] shadow-xs"
            : "border-rose-200 hover:scale-[1.01]"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              {delayedCount > 0 && (
                <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              )}
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-rose-900 leading-tight">
                Delayed Votes
              </h3>
            </div>
            <p className="text-3xl font-black text-red-950 mt-2 font-mono leading-none">
              {delayedCount}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-rose-200 text-rose-600 shadow-3xs">
            <Clock size={20} strokeWidth={2.2} />
          </div>
        </div>
        <div className="text-[11px] font-semibold text-rose-800 mt-2 flex items-center gap-1">
          <span>
            {delayedCount > 0
              ? `${delayedCount} votes are past deadline`
              : "No votes are delayed"}
          </span>
        </div>
      </div>

      {/* Card 2: Awaiting My Vote */}
      <div
        onClick={onSelectAllFilter}
        className="relative overflow-hidden bg-gradient-to-br from-amber-50/70 to-orange-50/40 rounded-[20px] p-5 border border-amber-200 shadow-3xs flex flex-col justify-between min-h-[140px] border-l-[5px] border-l-orange-500 hover:shadow-xs transition-all cursor-pointer select-none hover:scale-[1.01]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-600 animate-pulse" />
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 leading-tight">
                Awaiting My Vote
              </h3>
            </div>
            <p className="text-3xl font-black text-amber-950 mt-2 font-mono leading-none">
              {awaitingCount}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-amber-200 text-amber-600 shadow-3xs">
            <Inbox size={20} strokeWidth={2.2} />
          </div>
        </div>
        <div className="text-[11px] font-semibold text-amber-800 mt-2 flex items-center gap-1">
          <span>Action required on {awaitingCount} pending plans</span>
        </div>
      </div>

      {/* Card 3: Total Reviewed */}
      <div className="bg-white rounded-[20px] p-5 border border-slate-200/80 shadow-3xs flex flex-row items-center justify-between min-h-[140px] hover:shadow-xs transition-shadow gap-4">
        <div className="flex flex-col justify-between h-full">
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 leading-tight">
              Total Reviewed
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Reviewed This Year
            </p>
          </div>

          <div className="flex flex-col gap-1.5 mt-4 select-none">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full bg-[#15803d]" />
              <span>
                {approvedCount} Approved ({approvedPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
              <span className="text-[#dc2626]">
                {rejectedCount} Rejected ({rejectedPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Donut Chart with Premium Styling */}
        <div className="relative flex items-center justify-center h-24 w-24 shrink-0 hover:scale-105 transition-all duration-300 select-none">
          <svg viewBox="0 0 36 36" className="w-full h-full drop-shadow-xs">
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth="4.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke="#15803d"
              strokeWidth="4.5"
              strokeDasharray={`${approvedPercentAnim} 100`}
              strokeDashoffset="0"
              className="-rotate-90 origin-center transition-all duration-1000 ease-out"
            />
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke="#dc2626"
              strokeWidth="4.5"
              strokeDasharray={`${rejectedPercentAnim} 100`}
              strokeDashoffset={-approvedPercentAnim}
              className="-rotate-90 origin-center transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center bg-white rounded-full h-[58px] w-[58px] shadow-3xs border border-slate-100/50">
            <span className="text-lg font-black text-slate-900 font-mono leading-none">
              {totalReviewedCount}
            </span>
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">
              Total
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
