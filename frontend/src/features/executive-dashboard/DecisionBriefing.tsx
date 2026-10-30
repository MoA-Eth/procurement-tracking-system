"use client";
import { ArrowUpRight, Flag, ShieldCheck } from "lucide-react";
import { displayDate, money, summarize, type ExecutiveRecord } from "./model";
import {
  contractRows,
  deadlineRows,
  procurementTimeline,
  progressValue,
} from "./visualizations";

export function DecisionBriefing({
  rows,
  asOf,
  onSelect,
}: {
  rows: ExecutiveRecord[];
  asOf: string;
  onSelect: (row: ExecutiveRecord) => void;
}) {
  const summary = summarize(rows, asOf);
  const contracts = contractRows(rows);
  const deadlines = deadlineRows(rows, asOf);
  const overdue = deadlines.filter((item) => item.overdue);
  const today = Date.parse(asOf.slice(0, 10));
  const upcoming = deadlines.filter(
    (item) =>
      item.due !== null &&
      item.due >= today &&
      item.due <= today + 90 * 86400000 &&
      !item.row.complete &&
      !["CANCELLED", "TERMINATED", "COMPLETED"].includes(item.row.status),
  );
  const reported = contracts.filter(
    (row) => progressValue(row) !== null,
  ).length;
  const dated = deadlines.filter((item) => item.due !== null).length;
  const future = procurementTimeline(rows, asOf).series.signed.future;
  const exposure = summarize(
    overdue.map((item) => item.row),
    asOf,
  ).amounts;
  const issues =
    future > 0 || reported < contracts.length || dated < contracts.length;
  const priorities = [
    ...(overdue.length
      ? [
          {
            label: "Escalate delivery delays",
            value: `${overdue.length} overdue contracts`,
            text: "Request recovery schedules and accountable follow-up from the responsible teams.",
            tone: "border-amber-200 bg-amber-50",
          },
        ]
      : []),
    ...(summary.preContract
      ? [
          {
            label: "Review procurement readiness",
            value: `${summary.preContract} activities awaiting contracts`,
            text: "Ask project teams to confirm procurement stages and the next planned milestones. These activities are not automatically delayed.",
            tone: "border-blue-100 bg-blue-50/60",
          },
        ]
      : []),
    ...(issues
      ? [
          {
            label: "Strengthen delivery reporting",
            value: `${reported} of ${contracts.length} contracts have progress reports`,
            text: "Request missing progress and target dates, and confirm future-dated signatures before drawing performance conclusions.",
            tone: "border-slate-200 bg-slate-50",
          },
        ]
      : []),
  ];
  return (
    <section
      aria-labelledby="decision-briefing-title"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="bg-[#0A3C2F] px-4 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Leadership briefing
            </p>
            <h2
              id="decision-briefing-title"
              className="mt-1 text-xl font-semibold tracking-tight"
            >
              Where leadership attention matters
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs">
            <Flag size={13} />
            {overdue.length
              ? "Delivery follow-up required"
              : issues
                ? "Reporting gaps require attention"
                : "Recorded delivery indicators reviewed"}
          </span>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-emerald-50">
          {overdue.length
            ? `${overdue.length} contracts have passed their recorded completion targets.`
            : "No overdue contracts identified from recorded target dates."}{" "}
          {issues
            ? "Incomplete reporting limits the assessment of overall performance."
            : "Continue monitoring upcoming milestones."}
        </p>
      </div>
      <div className="grid divide-y divide-slate-100 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
        <div className="min-w-0 space-y-3 p-4 sm:p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Recommended follow-up
          </h3>
          {priorities.length ? (
            priorities.map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border p-4 ${item.tone}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">
                    {item.label}
                  </h4>
                  <span className="text-xs font-medium text-slate-600">
                    {item.value}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {item.text}
                </p>
              </div>
            ))
          ) : (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <ShieldCheck size={18} />
              No immediate follow-up identified from these indicators.
            </p>
          )}
        </div>
        <div className="min-w-0 space-y-5 p-4 sm:p-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Overdue contract value
            </h3>
            <p className="mt-2 text-lg font-semibold">
              {exposure.length
                ? exposure
                    .map(
                      ([currency, value]) =>
                        `${money(value, true)} ${currency}`,
                    )
                    .join(" · ")
                : overdue.length
                  ? "Value not recorded"
                  : "No overdue contracts"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Initial contract amounts; this is not a measure of financial loss.
              {overdue.some((item) => item.row.initialAmount === null)
                ? " Some overdue contract values are missing."
                : ""}
            </p>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Next 90 days
            </h3>
            <p className="mt-2 text-sm font-semibold">
              {upcoming.length} contracts due for completion
            </p>
            {upcoming.slice(0, 3).map((item) => (
              <button
                key={item.row.id}
                onClick={() => onSelect(item.row)}
                className="mt-3 flex w-full items-start justify-between gap-3 rounded-lg bg-slate-50 p-3 text-left text-xs hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700"
              >
                <span className="min-w-0 break-words">
                  <strong className="block text-emerald-900">
                    {item.row.reference}
                  </strong>
                  <span className="mt-1 block text-slate-500">
                    {displayDate(
                      item.row.revisedCompletionDate ||
                        item.row.initialCompletionDate,
                    )}{" "}
                    · {item.row.project}
                  </span>
                </span>
                <ArrowUpRight size={14} className="shrink-0" />
              </button>
            ))}
            {upcoming.length > 3 && (
              <p className="mt-2 text-xs text-slate-500">
                {upcoming.length - 3} additional contracts in the implementation
                tracker.
              </p>
            )}
          </div>
          <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
            Reporting coverage: {dated} of {contracts.length} contracts have
            completion targets. Assessment uses recorded data as of{" "}
            {displayDate(asOf)}.
          </p>
        </div>
      </div>
    </section>
  );
}
