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
  const sectorSubtitle =
    selectedSector === "All Sectors"
      ? "all sectors"
      : selectedSector.toLowerCase();

  return (
    <section
      aria-label="Director metrics summary"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <article className="flex min-w-0 flex-col border-t-[7px] border-violet-600 bg-white px-5 pb-5 pt-7 shadow-sm">
        <p className="font-serif text-xl leading-none font-semibold tabular-nums text-violet-600">
          {totalProjectsCount}
        </p>
        <p className="mt-3 text-sm font-medium text-slate-600">active</p>
        <h3 className="mt-6 text-base sm:text-lg font-sans font-medium text-slate-900 tracking-tight leading-tight">
          Total Projects
        </h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="min-w-0 truncate text-slate-500">
            {selectedFiscalYear}, {sectorSubtitle}
          </span>
          <Link
            href="/workspace/projects"
            className="flex shrink-0 items-center gap-1 font-semibold text-[#00843D] transition-colors hover:text-[#0B6B3A]"
          >
            <span>View All</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </article>

      <article className="flex min-w-0 flex-col border-t-[7px] border-[#d99b08] bg-white px-5 pb-5 pt-7 shadow-sm">
        <p className="font-serif text-xl leading-none font-semibold tabular-nums text-[#d99b08]">
          {awaitingReviewCount}
        </p>
        <p className="mt-3 text-sm font-medium text-slate-600">plans</p>
        <h3 className="mt-6 text-base sm:text-lg font-sans font-medium text-slate-900 tracking-tight leading-tight">
          {userRole === "MANAGEMENT"
            ? "Executive Authorization"
            : "Awaiting Review"}
        </h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500">
            {userRole === "MANAGEMENT"
              ? "Pending Decision"
              : "Pending Director"}
          </span>
          <Link
            href="/workspace/plan-for-review"
            className="flex shrink-0 items-center gap-1 font-semibold text-amber-700 transition-colors hover:text-amber-800"
          >
            <span>Review Now</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </article>

      <article className="flex min-w-0 flex-col border-t-[7px] border-[#238b55] bg-white px-5 pb-5 pt-7 shadow-sm">
        <p className="font-serif text-xl leading-none font-semibold tabular-nums text-[#238b55]">
          {committeePlansCount}
        </p>
        <p className="mt-3 text-sm font-medium text-slate-600">plans</p>
        <h3 className="mt-6 text-base sm:text-lg font-sans font-medium text-slate-900 tracking-tight leading-tight">
          {userRole === "MANAGEMENT"
            ? "Committee Endorsed"
            : "Committee Progress"}
        </h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500">
            {userRole === "MANAGEMENT" ? "Deliberations" : "Voting"}
          </span>
          <Link
            href="/workspace/vote-progress"
            className="flex shrink-0 items-center gap-1 font-semibold text-blue-600 transition-colors hover:text-blue-700"
          >
            <span>Check Votes</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </article>

      <article className="flex min-w-0 flex-col border-t-[7px] border-rose-600 bg-white px-5 pb-5 pt-7 shadow-sm">
        <p className="font-serif text-xl leading-none font-semibold tabular-nums text-rose-600">
          {criticalDelaysCount}
        </p>
        <p className="mt-3 text-sm font-medium text-slate-600">&gt;7d overdue</p>
        <h3 className="mt-6 text-base sm:text-lg font-sans font-medium text-slate-900 tracking-tight leading-tight">
          Critical Delays
        </h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500">Requires action</span>
          <Link
            href="/workspace/activity-tracker"
            className="flex shrink-0 items-center gap-1 font-semibold text-rose-600 transition-colors hover:text-rose-700"
          >
            <span>Needs Action</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </article>
    </section>
  );
}
