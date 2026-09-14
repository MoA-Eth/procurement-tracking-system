"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Search, XCircle } from "lucide-react";
import type { ProcurementPlan } from "@/features/plans/plansData";

export interface CommitteeAwaitingTableProps {
  filteredAwaitingPlans: ProcurementPlan[];
  totalAwaitingCount: number;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: "all" | "delayed";
  onClearFilter: () => void;
}

export function CommitteeAwaitingTable({
  filteredAwaitingPlans,
  totalAwaitingCount,
  loading,
  searchQuery,
  onSearchChange,
  filter,
  onClearFilter,
}: CommitteeAwaitingTableProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Card Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <ClipboardCheck className="h-5 w-5 text-emerald-700 shrink-0" />
          <h2 className="text-sm font-bold text-slate-900">
            Plans Awaiting My Vote
          </h2>
          {filter === "delayed" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-150 animate-fade-in select-none">
              <span>Delayed Only</span>
              <button
                type="button"
                onClick={onClearFilter}
                className="hover:bg-red-100 rounded-full p-0.5 transition-colors cursor-pointer"
              >
                <XCircle size={10} className="shrink-0" />
              </button>
            </span>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search plans..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-[#0A3C2F] outline-none transition-all shadow-3xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[600px]">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">Project</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Dir. Approval Date</th>
              <th className="py-3 px-4 text-right">Estimated Totals</th>
              <th className="py-3 px-4">Voting Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-slate-400 font-medium animate-pulse"
                >
                  Loading awaiting plans...
                </td>
              </tr>
            ) : filteredAwaitingPlans.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-slate-400 font-medium"
                >
                  No plans awaiting review
                </td>
              </tr>
            ) : (
              filteredAwaitingPlans.map((plan) => (
                <tr
                  key={plan.id}
                  onClick={() =>
                    router.push(`/workspace/plan-for-review?planId=${plan.id}`)
                  }
                  className={`hover:bg-emerald-50/50 transition-colors cursor-pointer ${
                    plan.isPriority ? "bg-rose-50/10" : ""
                  }`}
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <Link
                      href={`/workspace/plan-for-review?planId=${plan.id}`}
                      className="hover:underline hover:text-emerald-800 transition-colors"
                    >
                      {plan.planName}
                    </Link>
                    <div className="flex items-center flex-wrap gap-1.5 text-[10px] mt-0.5">
                      <span
                        className={
                          plan.isPriority
                            ? "text-rose-600 font-bold"
                            : "text-slate-400 font-medium"
                        }
                      >
                        {plan.isPriority
                          ? "▲ Priority Review"
                          : `${plan.budgetYear} • ${plan.activitiesCount} Activities`}
                      </span>
                      {plan.deadlineText && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-150 font-bold select-none whitespace-nowrap">
                            Deadline: {plan.deadlineText}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {plan.projectCode}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                        plan.category === "Goods"
                          ? "bg-blue-50 text-blue-700 border-blue-100"
                          : plan.category === "Works"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-purple-50 text-purple-700 border-purple-100"
                      }`}
                    >
                      {plan.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-medium">
                    {new Date(plan.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                    {plan.estimatedTotal}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (plan.progress ?? 0) > 0
                              ? "bg-emerald-500"
                              : "bg-slate-200"
                          }`}
                          style={{ width: `${plan.progress ?? 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                        {plan.progressText}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium select-none">
        <span>
          Showing {filteredAwaitingPlans.length} of {totalAwaitingCount} plans
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-3xs cursor-pointer"
            disabled
          >
            &lt;
          </button>
          <button
            type="button"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-3xs cursor-pointer"
            disabled
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
