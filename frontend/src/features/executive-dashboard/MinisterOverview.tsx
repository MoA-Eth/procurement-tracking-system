"use client";
import styles from "./responsive.module.css";
import {
  ChartCard,
  CompletionDonut,
  HorizontalBars,
  NoChartData,
} from "./ChartPrimitives";
import {
  displayDate,
  money,
  summarize,
  TYPE_LABELS,
  type ExecutiveRecord,
  type ItemType,
} from "./model";
import {
  activityRows,
  completionBreakdown,
  contractRows,
  deadlineRows,
  procurementTimeline,
  projectGroups,
} from "./visualizations";

import { DecisionBriefing } from "./DecisionBriefing";
import { DeadlineTimeline } from "./ExecutiveVisualizations";

const TYPES: { type: ItemType; description: string; color: string }[] = [
  {
    type: "WORKS",
    description: "Construction and civil works",
    color: "bg-emerald-600",
  },
  {
    type: "GOODS",
    description: "Equipment, supplies and materials",
    color: "bg-blue-500",
  },
  {
    type: "SERVICES",
    description: "Consultancy and other services",
    color: "bg-violet-500",
  },
];
function Values({ values }: { values: [string, number][] }) {
  return values.length ? (
    <div className="space-y-1">
      {values.map(([currency, value]) => (
        <div key={currency} className="flex flex-wrap items-baseline gap-2">
          <strong className="text-2xl font-semibold">
            {money(value, true)}
          </strong>
          <span className="text-xs font-medium text-slate-500">{currency}</span>
        </div>
      ))}
    </div>
  ) : (
    <span className="text-lg text-slate-500">Not recorded</span>
  );
}
export function MinisterOverview({
  rows,
  asOf,
  onSelect,
}: {
  rows: ExecutiveRecord[];
  asOf: string;
  onSelect: (row: ExecutiveRecord) => void;
}) {
  const groups = projectGroups(rows);
  const timeline = procurementTimeline(rows, asOf);
  const summary = summarize(rows, asOf);
  const completion = completionBreakdown(rows);
  const activities = activityRows(rows);
  const max = Math.max(
    1,
    ...TYPES.map(
      (item) => activities.filter((row) => row.itemType === item.type).length,
    ),
  );
  const deadlines = deadlineRows(rows, asOf);
  const overdue = deadlines.filter((item) => item.overdue);
  const next = deadlines.find(
    (item) =>
      !item.row.complete &&
      !["CANCELLED", "TERMINATED"].includes(item.row.status) &&
      item.due !== null &&
      item.due >= Date.parse(asOf.slice(0, 10)),
  );
  const future = procurementTimeline(rows, asOf).series.signed.future;
  const missingProgress = contractRows(rows).filter(
    (row) => row.completionPct === null,
  ).length;
  const missingTargets = contractRows(rows).filter(
    (row) => !row.initialCompletionDate && !row.revisedCompletionDate,
  ).length;
  const unclassified = activities.filter(
    (row) => row.itemType === "UNCLASSIFIED",
  ).length;

  return (
    <div className={`${styles.dashboard} space-y-5`}>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Portfolio as of {displayDate(asOf)} · {summary.activities} procurement
        activities · {summary.contracts} registered{" "}
        {summary.contracts === 1 ? "contract" : "contracts"}
      </p>
      <section
        aria-label="Ministerial headline figures"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-medium text-slate-500">
            Estimated procurement value
          </h2>
          <div className="mt-4">
            <Values values={summary.estimates} />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Planned activities · currencies shown separately
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-medium text-slate-500">
            Contract commitments
          </h2>
          <div className="mt-4">
            <Values values={summary.amounts} />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Initial recorded amounts · excluding VAT
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-medium text-slate-500">
            Contracts completed
          </h2>
          <p className="mt-4 text-3xl font-semibold">
            {summary.completed}
            <span className="ml-2 text-base font-normal text-slate-400">
              of {summary.contracts}
            </span>
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {completion.rate === null
              ? "No contracts recorded"
              : `${money(completion.rate)}% of registered contracts`}
          </p>
        </div>
        <div
          className={`rounded-xl border bg-white p-4 sm:p-5 ${summary.overdue ? "border-amber-300" : "border-slate-200"}`}
        >
          <h2 className="text-sm font-medium text-slate-500">
            Overdue contracts
          </h2>
          <p
            className={`mt-4 text-3xl font-semibold ${summary.overdue ? "text-amber-800" : ""}`}
          >
            {summary.overdue}
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Incomplete contracts past their latest target
          </p>
        </div>
      </section>

      <DecisionBriefing rows={rows} asOf={asOf} onSelect={onSelect} />

      <section aria-labelledby="minister-types-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="minister-types-heading" className="text-base font-semibold">
            Procurement at a glance
          </h2>
          <span className="text-xs text-slate-500">
            {summary.preContract} activities awaiting contracts
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {TYPES.map((item) => {
            const subset = rows.filter((row) => row.itemType === item.type);
            const stats = summarize(subset, asOf);
            return (
              <div
                key={item.type}
                className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
              >
                <h3 className="font-semibold">{TYPE_LABELS[item.type]}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {item.description}
                </p>
                <div className="mt-4 flex items-baseline gap-2">
                  <strong className="text-3xl font-semibold">
                    {stats.activities}
                  </strong>
                  <span className="text-xs text-slate-500">activities</span>
                </div>
                <div
                  className="mt-3 h-2 rounded-full bg-slate-100"
                  role="img"
                  aria-label={`${TYPE_LABELS[item.type]}: ${stats.activities} activities; common count scale`}
                >
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${(stats.activities / max) * 100}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {stats.contracts}{" "}
                  {stats.contracts === 1 ? "contract" : "contracts"} ·{" "}
                  {stats.completed} completed
                </p>
              </div>
            );
          })}
        </div>
        {unclassified > 0 && (
          <p className="text-xs text-amber-800">
            {unclassified} additional activities need an item type.
          </p>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-base font-semibold">Contract delivery</h2>
          <div className="mt-4">
            <CompletionDonut
              simple
              completed={completion.completed}
              incomplete={completion.incomplete}
              unknown={completion.unknown}
            />
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Delivery status covers registered contracts; activities awaiting a
            contract are excluded.
          </p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-base font-semibold">For attention</h2>
          <div className="mt-4 space-y-4 text-sm">
            {overdue.length ? (
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="font-semibold text-amber-900">
                  {overdue.length} overdue{" "}
                  {overdue.length === 1 ? "contract needs" : "contracts need"}{" "}
                  follow-up
                </p>
                {overdue.slice(0, 3).map((item) => (
                  <button
                    key={item.row.id}
                    onClick={() => onSelect(item.row)}
                    className="mt-2 block text-left text-xs text-amber-900 underline"
                  >
                    {item.row.reference} · due{" "}
                    {displayDate(
                      item.row.revisedCompletionDate ||
                        item.row.initialCompletionDate,
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-slate-600">
                No overdue contracts identified from recorded target dates.
              </p>
            )}
            {next && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-500">
                  Next recorded completion target
                </p>
                <button
                  onClick={() => onSelect(next.row)}
                  className="mt-1 text-left font-semibold text-emerald-800 underline decoration-emerald-200 underline-offset-4"
                >
                  {displayDate(
                    next.row.revisedCompletionDate ||
                      next.row.initialCompletionDate,
                  )}
                </button>
                <p className="mt-1 text-xs text-slate-500">
                  {next.row.reference}
                </p>
              </div>
            )}
            {(future > 0 || missingProgress > 0 || missingTargets > 0) && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-600">
                  Data requiring review
                </p>
                <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-500">
                  {future > 0 && (
                    <li>
                      {future} future-dated{" "}
                      {future === 1 ? "signature needs" : "signatures need"}{" "}
                      confirmation.
                    </li>
                  )}
                  {missingProgress > 0 && (
                    <li>
                      Progress is not reported for {missingProgress}{" "}
                      {missingProgress === 1 ? "contract" : "contracts"}.
                    </li>
                  )}
                  {missingTargets > 0 && (
                    <li>
                      {missingTargets}{" "}
                      {missingTargets === 1 ? "contract has" : "contracts have"}{" "}
                      no completion target; overdue status cannot be assessed.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Contracts by project"
          description="Registered contracts grouped by project"
        >
          <HorizontalBars
            values={groups
              .filter((group) => group.count > 0)
              .map((group) => ({
                id: group.id,
                label: group.label,
                value: group.count,
              }))}
            unit="contracts"
            color="bg-blue-500"
          />
        </ChartCard>
        <ChartCard
          title="Average progress by project"
          description="Average reported activity completion; missing reports excluded"
        >
          {groups.every((group) => group.progress.reported === 0) ? (
            <NoChartData>
              Progress has not been reported for any project. Request current
              physical completion updates before assessing delivery performance.
            </NoChartData>
          ) : (
            <HorizontalBars
              values={groups
                .filter((group) => group.progress.reported > 0)
                .map((group) => ({
                  id: group.id,
                  label: group.label,
                  value: group.progress.average,
                  detail: `${group.progress.reported} of ${group.progress.total} activities reported`,
                }))}
              unit="%"
              percentage
              color="bg-blue-500"
            />
          )}
          <p className="mt-3 text-xs text-slate-500">
            {groups.filter((group) => group.progress.reported === 0).length}{" "}
            projects have no progress reports.
          </p>
        </ChartCard>
      </div>
      <ChartCard
        title="Contracts signed over time"
        description="Monthly contract signatures over the last 12 months; current month to date"
      >
        <SignatureTrend
          months={timeline.months}
          recorded={timeline.series.signed.recorded}
        />
        {timeline.series.signed.future > 0 && (
          <p className="mt-3 text-xs text-amber-800">
            {timeline.series.signed.future} future-dated signatures excluded;
            confirmation needed.
          </p>
        )}
      </ChartCard>
      <ChartCard
        title="Contract implementation tracker"
        description="Recorded implementation period and completion target; select a contract for details"
      >
        <DeadlineTimeline rows={rows} asOf={asOf} onSelect={onSelect} />
      </ChartCard>
    </div>
  );
}

function SignatureTrend({
  months,
  recorded,
}: {
  months: { label: string; signed: number }[];
  recorded: number;
}) {
  if (!recorded)
    return (
      <NoChartData>
        No historical contract signatures recorded. Missing or future dates are
        excluded.
      </NoChartData>
    );
  const max = Math.max(1, ...months.map((month) => month.signed));
  const points = months
    .map(
      (month, index) =>
        `${50 + index * 56},${195 - (month.signed / max) * 155}`,
    )
    .join(" ");
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox="0 0 720 245"
        className="min-w-[580px] w-full"
        role="img"
        aria-label="Contracts signed by month, zero-based count scale"
      >
        {[0, 1].map((tick) => (
          <g key={tick}>
            <line
              x1="50"
              x2="666"
              y1={195 - tick * 155}
              y2={195 - tick * 155}
              stroke="#e2e8f0"
            />
            <text
              x="40"
              y={199 - tick * 155}
              textAnchor="end"
              fontSize="11"
              fill="#64748b"
            >
              {max * tick}
            </text>
          </g>
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
        />
        {months.map((month, index) => (
          <g key={month.label}>
            <circle
              cx={50 + index * 56}
              cy={195 - (month.signed / max) * 155}
              r="5"
              fill="#3b82f6"
              tabIndex={0}
              aria-label={`${month.label}: ${month.signed} contracts signed`}
            >
              <title>
                {`${month.label}: ${month.signed} contracts signed`}
              </title>
            </circle>
            <text
              x={50 + index * 56}
              y="225"
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {month.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
