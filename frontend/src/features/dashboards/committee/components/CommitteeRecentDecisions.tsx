"use client";

import Link from "next/link";
import { History } from "lucide-react";
import type { ProcurementPlan } from "@/features/plans/plansData";

export interface CommitteeRecentDecisionsProps {
  recentDecisions: ProcurementPlan[];
  loading: boolean;
}

export function CommitteeRecentDecisions({
  recentDecisions,
  loading,
}: CommitteeRecentDecisionsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 select-none">
        <History className="h-4 w-4 text-slate-400" /> My Recent Decisions
      </h3>

      <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-2xs overflow-hidden divide-y divide-slate-100">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate-400 font-medium select-none">
            Loading decisions...
          </div>
        ) : recentDecisions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 font-medium select-none">
            No past decisions recorded yet.
          </div>
        ) : (
          recentDecisions.map((plan) => (
            <div
              key={plan.id}
              className="p-4.5 space-y-3 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/workspace/committee-progress?planId=${plan.id}`}
                  className="font-bold text-slate-900 text-xs leading-tight hover:text-[#0A3C2F] transition-colors"
                >
                  {plan.planName}
                </Link>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                    plan.committeeDecision === "Approved"
                      ? " text-emerald-700 "
                      : " text-rose-700 "
                  }`}
                >
                  {plan.committeeDecision === "Approved"
                    ? "Approved"
                    : "Rejected"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                My Vote recorded on {plan.decisionRecordedDate || "Recent"}
              </p>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>Plan Status</span>
                <span
                  className={`font-bold ${
                    plan.status === "Finally Approved"
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {plan.status === "Finally Approved"
                    ? "Finally Approved"
                    : "Pending Committee Review"}
                </span>
              </div>

              {plan.committeeDecision === "Rejected" &&
                plan.rejectionReason && (
                  <div className="bg-slate-50 border border-slate-100/80 rounded-xl p-3 text-[10px] text-slate-600 italic font-semibold leading-relaxed">
                    &quot;{plan.rejectionReason}&quot;
                  </div>
                )}

              <Link
                href={`/workspace/my-decisions?planId=${plan.id}`}
                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                View Read-only Details ↗
              </Link>
            </div>
          ))
        )}

        {/* Box Footer Button */}
        <div className="p-3.5 bg-slate-50/50 border-t border-slate-100 text-center">
          <Link
            href="/workspace/my-decisions"
            className="inline-flex items-center justify-center w-full py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-3xs transition-colors cursor-pointer"
          >
            View All Past Decisions
          </Link>
        </div>
      </div>
    </div>
  );
}
