"use client";

import Link from "next/link";
import { FileText, AlertCircle, ChevronRight } from "lucide-react";
import type { DirectorPlan, CriticalDelay } from "../directorData";
import { formatETB } from "../directorFormatters";
import type { UserRole } from "@/types";

interface DirectorActionPanelsProps {
  pendingPlans: DirectorPlan[];
  criticalDelays: CriticalDelay[];
  userRole?: UserRole;
}

export function DirectorActionPanels({
  pendingPlans,
  criticalDelays,
  userRole = "DIRECTOR",
}: DirectorActionPanelsProps) {
  const isManagement = userRole === "MANAGEMENT";

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
      {/* LEFT PANEL: Plans Awaiting Review */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-xs sm:text-sm leading-tight">
                {isManagement
                  ? `Plans Awaiting Executive Authorization (${pendingPlans.length})`
                  : `Plans Awaiting Director Review (${pendingPlans.length})`}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isManagement
                  ? "Requires executive authorization or rejection"
                  : "Requires approval or revision"}
              </p>
            </div>
          </div>
          <Link
            href="/workspace/plan-for-review"
            className="text-[#0A3C2F] hover:text-[#083025] font-semibold text-xs flex items-center gap-0.5 shrink-0 hover:underline cursor-pointer"
          >
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Plan Cards List */}
        <div className="p-3 sm:p-4 space-y-2.5">
          {pendingPlans.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No plans matching current filter criteria.
            </div>
          ) : (
            pendingPlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-xl border border-slate-200/80 p-3 hover:border-slate-300 hover:shadow-xs transition-all bg-white"
              >
                {/* Top row: Badge and Budget */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md border text-xs font-medium tracking-wide ${
                      isManagement
                        ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                        : plan.status === "Returned for Revision" ||
                            plan.status === "Rejected"
                          ? "border-rose-200/80 bg-rose-50 text-rose-800"
                          : "border-slate-200 bg-slate-100 text-slate-800"
                    }`}
                  >
                    {isManagement
                      ? "Awaiting Executive Review"
                      : plan.status === "Returned for Revision"
                        ? "Returned for Revision"
                        : plan.status === "Rejected"
                          ? "Returned / Rejected"
                          : "Awaiting Review"}
                  </span>
                  <div className="text-right">
                    <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                      {formatETB(plan.estimatedBudgetETB)} ETB
                    </span>
                    <p className="text-[10px] text-slate-500">
                      {plan.totalActivitiesCount} Activities
                    </p>
                  </div>
                </div>

                {/* Middle: Plan title and Sector */}
                <div>
                  <h4 className="font-semibold text-slate-900 text-xs leading-snug">
                    {plan.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sector: {plan.directorate} • Officer:{" "}
                    <span className="font-medium text-slate-700">
                      {plan.submittedBy}
                    </span>
                  </p>
                </div>

                {/* Bottom: Submission timestamp and Review Button */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Submitted: {plan.submissionDate}
                  </span>
                  <Link
                    href={`/workspace/plan-for-review?plan=${encodeURIComponent(plan.id)}`}
                    className="inline-flex items-center gap-1 bg-[#0A3C2F] hover:bg-[#083025] text-white text-xs font-semibold px-3 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    Review Plan <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Critical Delays */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-xs sm:text-sm leading-tight">
                Critical Delays ({criticalDelays.length})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Activities delayed &gt;7 days
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-medium text-[10px] tracking-wider shrink-0">
            ALERT ACTIVE
          </span>
        </div>

        {/* Delays Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A3C2F] text-white text-[10px] uppercase font-semibold tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5">Activity &amp; Project</th>
                <th className="px-2.5 py-2.5">Owner</th>
                <th className="px-2.5 py-2.5">Delay</th>
                <th className="px-3.5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {criticalDelays.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-xs text-slate-400"
                  >
                    No critical delays found.
                  </td>
                </tr>
              ) : (
                criticalDelays.map((delay) => (
                  <tr
                    key={delay.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-3.5 py-2.5">
                      <p className="font-semibold text-slate-900 text-xs leading-tight">
                        {delay.activityTitle}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {delay.projectName || delay.directorate} •{" "}
                        <span className="text-slate-600">
                          {delay.stageName}
                        </span>
                      </p>
                    </td>
                    <td className="px-2.5 py-2.5 font-medium text-slate-700 text-xs">
                      {delay.assignedOfficer}
                    </td>
                    <td className="px-2.5 py-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/70 font-medium text-[11px]">
                        +{delay.daysOverdue} Days
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <Link
                        href={`/workspace/activity-tracker?activity=${encodeURIComponent(delay.id)}`}
                        className="text-[#0A3C2F] hover:text-[#083025] font-semibold text-xs hover:underline cursor-pointer"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
