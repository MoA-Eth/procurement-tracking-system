"use client";

import Link from "next/link";
import { ArrowRight, Bell, CheckCircle2 } from "lucide-react";
import { alertToneClasses, type OfficerAlert } from "../officerData";

interface OfficerAlertsCenterProps {
  alerts: readonly OfficerAlert[];
  loading?: boolean;
}

export function OfficerAlertsCenter({
  alerts,
  loading = false,
}: OfficerAlertsCenterProps) {
  return (
    <div className="min-h-[380px] xl:min-h-[415px] max-h-[640px] xl:max-h-none xl:h-full xl:relative">
      <aside
        aria-labelledby="alerts-center-title"
        className="flex flex-col min-w-0 w-full h-full xl:absolute xl:inset-0 overflow-hidden rounded-xl border border-[#bdd0c8] bg-white shadow-sm"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#c7d7d0] bg-[#edf5f1] px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Bell
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-[#48675d]"
            />
            <h2
              id="alerts-center-title"
              className="text-lg font-extrabold text-[#16253d] truncate"
            >
              Alerts Center
            </h2>
          </div>
          {!loading && alerts.length > 0 && (
            <span className="shrink-0 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              {alerts.length}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3 p-3.5 sm:p-4 overflow-y-auto">
          {loading ? (
            <div className="flex flex-1 h-full min-h-[220px] flex-col items-center justify-center py-6 text-center text-sm text-slate-500">
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#176c55] border-t-transparent" />
                <span>Loading alerts...</span>
              </div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-1 h-full min-h-[220px] flex-col items-center justify-center py-6 text-center text-sm text-slate-500">
              <CheckCircle2 className="h-7 w-7 text-[#48675d]/40 mb-1.5" />
              <p className="font-semibold text-slate-700">No active alerts</p>
              <p className="text-xs text-slate-500">
                You are all caught up for now.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const tone = alertToneClasses[alert.tone];

              return (
                <Link
                  key={alert.id}
                  href={alert.href}
                  className="group flex items-stretch gap-3 sm:gap-3.5 rounded-md border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-2xs transition-all hover:border-[#0a4d40]/40 hover:bg-slate-50/40 hover:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a4d40]"
                >
                  {/* Left vertical accent bar */}
                  <div
                    className={`w-[3.5px] shrink-0 rounded-full my-0.5 ${tone.barColor}`}
                  />

                  {/* Alert Content Lines */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 sm:gap-1">
                    {/* Line 1: Status / Overdue & Time */}
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`text-xs sm:text-[13px] font-semibold tracking-tight leading-tight ${tone.statusColor}`}
                      >
                        {alert.statusLine}
                      </div>
                      {alert.timeAgo ? (
                        <span className="text-[11px] sm:text-xs font-normal text-slate-500 shrink-0">
                          {alert.timeAgo}
                        </span>
                      ) : null}
                    </div>

                    {/* Line 2: Reference Code / Title */}
                    <div
                      className={`text-xs sm:text-sm font-bold tracking-tight break-words [overflow-wrap:anywhere] [word-break:break-word] leading-snug group-hover:underline ${
                        alert.tone === "returned"
                          ? "text-[#10243f]"
                          : "font-mono text-[#0a4d40]"
                      }`}
                    >
                      {alert.referenceLine}
                    </div>

                    {/* Line 3: Stage / Detail or Director Note Box */}
                    {alert.directorNote ? (
                      <div className="mt-1 rounded-md bg-[#f8fafc] border border-slate-200/80 p-2.5 text-xs text-slate-700 font-mono break-words [overflow-wrap:anywhere] [word-break:break-word] leading-relaxed">
                        Director note: {alert.directorNote}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 font-normal leading-tight break-words [overflow-wrap:anywhere] [word-break:break-word]">
                        {alert.detailLine}
                      </div>
                    )}

                    {/* Action Button / Link (e.g. Review ->) */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end">
                      <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#0a4d40] group-hover:text-[#06332b] group-hover:underline">
                        {alert.actionLabel || "Review"}
                        <ArrowRight
                          aria-hidden="true"
                          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
