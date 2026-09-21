/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { AuthUser } from "@/lib/authTypes";
import type {
  DashboardFocusItem,
  DashboardMetric,
  DashboardWorkspace,
} from "./types";

interface DashboardOverviewProps {
  user: AuthUser;
  eyebrow?: string;
  description?: string;
  metrics: readonly DashboardMetric[];
  workspaceTitle?: string;
  workspaceDescription?: string;
  workspaces?: readonly DashboardWorkspace[];
  focusTitle?: string;
  focusDescription?: string;
  focusItems?: readonly DashboardFocusItem[];
}

export function DashboardOverview({
  user: _user,
  eyebrow: _eyebrow,
  description,
  metrics,
  workspaceTitle: _workspaceTitle,
  workspaceDescription: _workspaceDescription,
  workspaces: _workspaces,
  focusTitle: _focusTitle,
  focusDescription: _focusDescription,
  focusItems: _focusItems,
}: DashboardOverviewProps) {
  const gridColsClass =
    metrics.length === 3
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="space-y-4">
      {description && (
        <p className="text-sm text-slate-500 font-normal">{description}</p>
      )}

      <section
        aria-label="Dashboard summary"
        className={`grid gap-4 sm:gap-5 ${gridColsClass}`}
      >
        {metrics.map(
          ({
            label,
            value,
            detail,
            icon: Icon,
            tone,
            actionLabel,
            actionHref,
            detailLines,
            actionLines,
          }) => {
            const numValue = Number(value);
            const isDeactivatedMetric =
              tone === "rose" ||
              label.toLowerCase().includes("deactivat") ||
              label.toLowerCase().includes("suspended");
            const isActiveMetric =
              !isDeactivatedMetric &&
              (tone === "emerald" ||
                label.toLowerCase().includes("active access") ||
                /\bactive\b/i.test(label));

            let accentBarClass = "bg-[#1d4ed8]";
            let dotBgClass = "bg-slate-300";
            let actionColorClass = "text-blue-700 hover:text-blue-800";
            let iconColorClass = "text-blue-600";

            if (isDeactivatedMetric) {
              const hasAlert = !isNaN(numValue) && numValue > 0;
              accentBarClass = hasAlert ? "bg-rose-500" : "bg-slate-300";
              dotBgClass = hasAlert ? "bg-rose-500" : "bg-slate-300";
              actionColorClass = "text-slate-600 hover:text-slate-900";
              iconColorClass = "text-rose-600";
            } else if (isActiveMetric) {
              accentBarClass = "bg-emerald-600";
              dotBgClass = "bg-emerald-600";
              actionColorClass = "text-emerald-700 hover:text-emerald-800";
              iconColorClass = "text-emerald-600";
            } else if (
              tone === "purple" ||
              tone === "violet" ||
              label.toLowerCase().includes("role") ||
              label.toLowerCase().includes("committee")
            ) {
              accentBarClass = "bg-violet-600";
              dotBgClass = "bg-violet-500";
              actionColorClass = "text-violet-700 hover:text-violet-800";
              iconColorClass = "text-violet-600";
            } else if (
              tone === "orange" ||
              label.toLowerCase().includes("awaiting")
            ) {
              accentBarClass = "bg-amber-500";
              dotBgClass = "bg-amber-500";
              actionColorClass = "text-amber-700 hover:text-amber-800";
              iconColorClass = "text-amber-600";
            } else {
              accentBarClass = "bg-[#1d4ed8]";
              dotBgClass = "bg-slate-300";
              actionColorClass = "text-blue-700 hover:text-blue-800";
              iconColorClass = "text-blue-600";
            }

            return (
              <article
                key={label}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md min-h-[160px]"
              >
                {/* Left accent bar pill */}
                <div
                  className={`absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-full ${accentBarClass}`}
                  aria-hidden="true"
                />

                {/* 1. TOP ROW: Title on Left, Icon Badge on Right */}
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-600 leading-snug max-w-[160px]">
                    {label}
                  </h3>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs group-hover:bg-slate-100/80 transition-colors">
                    <Icon
                      size={19}
                      strokeWidth={2}
                      className={iconColorClass}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* 2. MIDDLE ROW: Clean, Prominent Metric Number */}
                <div className="my-2.5">
                  <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-none">
                    {value}
                  </p>
                </div>

                {/* 3. BOTTOM ROW: Divider line + Subtext & Action link */}
                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  {detailLines && detailLines.length > 0 ? (
                    <div className="flex flex-col leading-tight text-slate-500">
                      {detailLines.map((line, idx) => (
                        <span key={idx}>{line}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 truncate text-slate-500 font-medium">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${dotBgClass}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{detail}</span>
                    </div>
                  )}

                  {actionHref && (actionLabel || actionLines) ? (
                    <Link
                      href={actionHref}
                      className={`font-semibold hover:underline flex items-center gap-0.5 text-right leading-tight cursor-pointer transition-colors ${actionColorClass}`}
                    >
                      {actionLines && actionLines.length > 0 ? (
                        <div className="flex flex-col items-end">
                          {actionLines.map((line, idx) =>
                            idx === actionLines.length - 1 ? (
                              <span
                                key={idx}
                                className="flex items-center gap-0.5"
                              >
                                {line}{" "}
                                <ChevronRight className="h-3.5 w-3.5 inline shrink-0" />
                              </span>
                            ) : (
                              <span key={idx}>{line}</span>
                            ),
                          )}
                        </div>
                      ) : (
                        <>
                          <span>{actionLabel}</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        </>
                      )}
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          },
        )}
      </section>
    </div>
  );
}
