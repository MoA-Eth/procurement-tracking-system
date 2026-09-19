"use client";

import Link from "next/link";
import type { UserRole } from "@/types";

interface DirectorSummaryCardsProps {
  totalProjectsCount: number;
  awaitingReviewCount: number;
  committeePlansCount: number;
  criticalDelaysCount: number;
  selectedFiscalYear: string;
  selectedSector: string;
  userRole?: UserRole;
}

export function DirectorSummaryCards({
  totalProjectsCount,
  awaitingReviewCount,
  committeePlansCount,
  criticalDelaysCount,
  selectedFiscalYear,
  selectedSector,
  userRole = "DIRECTOR",
}: DirectorSummaryCardsProps) {
  return (
    <section
      aria-label="Director metrics summary"
      className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-[1.28fr_1fr_1fr_1fr]"
    >
      {/* CARD 1: TOTAL PROJECTS */}
      <article className="flex flex-col justify-between rounded-2xl bg-[#ecfdf5] p-4 border border-[#a7f3d0] border-t-4 border-t-[#006837] shadow-2xs transition-all duration-200 hover:shadow-md min-h-[136px]">
        <div>
          <div className="flex items-start justify-between">
            <h3 className="text-xs font-bold text-[#064e3b] tracking-tight">
              Total Projects
            </h3>
          </div>
          <div className="pt-2.5 pb-4 flex items-baseline gap-2">
            <p className="text-3xl sm:text-4xl lg:text-[40px] font-sans font-bold tabular-nums tracking-tight text-[#0A3C2F] leading-none">
              {totalProjectsCount}
            </p>
            <span className="text-xs font-semibold text-[#047857]">active</span>
          </div>
        </div>
        <div className="pt-2 border-t border-[#a7f3d0]/70 flex items-center justify-end text-xs">
          <Link
            href="/workspace/projects"
            className="text-[#006837] hover:text-[#004f29] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <span>View All</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </article>

      {/* CARD 2: AWAITING REVIEW (Amber Dot & Amber Link) */}
      <article className="flex flex-col justify-between rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:shadow-md min-h-[136px]">
        <div>
          <div className="flex items-start justify-between">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight">
              {userRole === "MANAGEMENT"
                ? "Executive Authorization"
                : "Awaiting Review"}
            </h3>
          </div>
          <div className="pt-2.5 pb-4 flex items-baseline gap-2">
            <p className="text-3xl sm:text-4xl lg:text-[40px] font-sans font-bold tabular-nums tracking-tight text-black leading-none">
              {awaitingReviewCount}
            </p>
            <span className="text-xs font-semibold text-slate-500">plans</span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-xs">
          <Link
            href="/workspace/plan-for-review"
            className="text-amber-700 hover:text-amber-800 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <span>Review Now</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </article>

      {/* CARD 3: COMMITTEE PROGRESS (Blue Dot & Blue Link) */}
      <article className="flex flex-col justify-between rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:shadow-md min-h-[136px]">
        <div>
          <div className="flex items-start justify-between">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight">
              {userRole === "MANAGEMENT"
                ? "Committee Endorsed"
                : "Committee Progress"}
            </h3>
          </div>
          <div className="pt-2.5 pb-4 flex items-baseline gap-2">
            <p className="text-3xl sm:text-4xl lg:text-[40px] font-sans font-bold tabular-nums tracking-tight text-black leading-none">
              {committeePlansCount}
            </p>
            <span className="text-xs font-semibold text-slate-500">plans</span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-xs">
          <Link
            href="/workspace/vote-progress"
            className="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <span>Check Votes</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </article>

      {/* CARD 4: CRITICAL DELAYS (Red Dot & Red Link) */}
      <article className="flex flex-col justify-between rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs transition-all duration-200 hover:shadow-md min-h-[136px]">
        <div>
          <div className="flex items-start justify-between">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight">
              Critical Delays
            </h3>
          </div>
          <div className="pt-2.5 pb-4 flex items-baseline gap-2">
            <p className="text-3xl sm:text-4xl lg:text-[40px] font-sans font-bold tabular-nums tracking-tight text-black leading-none">
              {criticalDelaysCount}
            </p>
            <span className="text-xs font-semibold text-slate-600">
              &gt;7d overdue
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-xs">
          <Link
            href="/workspace/activity-tracker"
            className="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <span>Needs Action</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </article>
    </section>
  );
}
