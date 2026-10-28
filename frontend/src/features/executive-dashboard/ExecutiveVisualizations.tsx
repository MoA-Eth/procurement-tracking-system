"use client";
import { useState } from "react";
import {
  ChartCard,
  CompletionDonut,
  CostScatter,
  GroupedBars,
  HorizontalBars,
  MonthlyColumns,
  NoChartData,
  ProgressGauge,
} from "./ChartPrimitives";
import { displayDate, money, type ExecutiveRecord } from "./model";
import {
  averageProgress,
  completionBreakdown,
  cycleTimes,
  deadlineRows,
  financialByProject,
  matchedCosts,
  matchedVariance,
  procurementTimeline,
  projectGroups,
  signingAmounts,
  supplierValues,
} from "./visualizations";

const VIEWS = [
  { id: "overview", label: "Executive overview" },
  { id: "timeline", label: "Timeline & delivery" },
  { id: "finance", label: "Finance & suppliers" },
] as const;
type View = (typeof VIEWS)[number]["id"];
type Props = {
  rows: ExecutiveRecord[];
  asOf: string;
  onSelect: (row: ExecutiveRecord) => void;
  onProjectSelect: (id: string) => void;
  onSupplierSelect: (name: string) => void;
  initialView?: View;
};

export function DeadlineTimeline({
  rows,
  asOf,
  onSelect,
}: Pick<Props, "rows" | "asOf" | "onSelect">) {
  const deadlines = deadlineRows(rows, asOf);
  if (!deadlines.length)
    return (
      <NoChartData>
        No contracts are available for deadline monitoring.
      </NoChartData>
    );
  const today = Date.parse(asOf.slice(0, 10));
  const dates = deadlines
    .filter((item) => item.valid)
    .flatMap((item) => [item.start!, item.due!]);
  const min = Math.min(today, ...dates);
  const max = Math.max(today + 86400000, ...dates);
  const span = max - min;
  return (
    <>
      <div className="mb-4 flex justify-between text-xs text-slate-500">
        <span>{displayDate(new Date(min).toISOString())}</span>
        <span>{displayDate(new Date(max).toISOString())}</span>
      </div>
      <div className="max-h-96 space-y-5 overflow-y-auto pr-1">
        {deadlines.map((item) => (
          <div key={item.row.id}>
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2 text-xs">
              <button
                className="font-semibold text-emerald-800 underline underline-offset-2"
                onClick={() => onSelect(item.row)}
              >
                {item.row.reference}
              </button>
              <span
                className={
                  item.overdue
                    ? "font-semibold text-amber-800"
                    : "text-slate-500"
                }
              >
                {item.status} · Target:{" "}
                {displayDate(
                  item.row.revisedCompletionDate ||
                    item.row.initialCompletionDate,
                )}
              </span>
            </div>
            {item.valid ? (
              <div
                className="relative h-6 rounded bg-slate-100"
                role="img"
                aria-label={`${item.row.reference}: ${item.startBasis} ${displayDate(new Date(item.start!).toISOString())} to target ${displayDate(new Date(item.due!).toISOString())}`}
              >
                <div
                  className={`absolute top-1 h-4 min-w-1 rounded ${item.overdue ? "bg-amber-500" : item.row.complete ? "bg-emerald-600" : "bg-blue-500"}`}
                  style={{
                    left: `${((item.start! - min) / span) * 100}%`,
                    width: `${((item.due! - item.start!) / span) * 100}%`,
                  }}
                />
                <span
                  className="absolute -top-1 h-8 border-l-2 border-dashed border-slate-700"
                  style={{ left: `${((today - min) / span) * 100}%` }}
                />
              </div>
            ) : (
              <p className="rounded bg-slate-50 p-3 text-xs text-slate-500">
                {item.start === null
                  ? "Start date not recorded"
                  : item.due === null
                    ? "Completion target not recorded"
                    : "Completion target precedes start: check source dates"}{" "}
                — timeline bar unavailable.
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-slate-400">
              {item.startBasis}
              {item.row.revisedCompletionDate
                ? " · Revised target used; original date remains in the register"
                : " · Original completion target"}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Dashed vertical marker: today ({displayDate(asOf)}). Signature date is
        explicitly marked as a proxy when implementation start is missing.
      </p>
    </>
  );
}

export function ExecutiveVisualizations({
  rows,
  asOf,
  onSelect,
  onProjectSelect,
  onSupplierSelect,
  initialView = "overview",
}: Props) {
  const [view, setView] = useState<View>(initialView);
  const [chosenCurrency, setChosenCurrency] = useState("ETB");
  const currencies = [
    ...new Set(
      rows
        .flatMap((row) => [row.currency, row.estimateCurrency])
        .filter((value): value is string => !!value),
    ),
  ].sort();
  const currency = currencies.includes(chosenCurrency)
    ? chosenCurrency
    : currencies[0] || "ETB";
  const groups = projectGroups(rows);
  const completion = completionBreakdown(rows);
  const progress = averageProgress(rows);
  const costs = financialByProject(rows, currency);
  const matched = matchedVariance(rows, currency);
  const suppliers = supplierValues(rows, currency);
  const timeline = procurementTimeline(rows, asOf);
  const awards = signingAmounts(rows, currency, asOf);
  const deadlines = deadlineRows(rows, asOf);
  const cycles = cycleTimes(rows, asOf);
  const futureSignatures = timeline.series.signed.future;
  const selectActivity = (id: string) => {
    const row = rows.find((item) => item.activityId === id);
    if (row) onSelect(row);
  };
  const scope = (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <span>Financial chart currency</span>
      <select
        aria-label="Financial chart currency"
        value={currency}
        onChange={(event) => setChosenCurrency(event.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
      >
        {(currencies.length ? currencies : ["ETB"]).map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </label>
  );

  return (
    <section aria-label="Procurement visualizations" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div
          role="tablist"
          aria-label="Executive visualization views"
          className="flex max-w-full flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1"
        >
          {VIEWS.map((item, index) => (
            <button
              key={item.id}
              role="tab"
              id={`executive-tab-${item.id}`}
              aria-selected={view === item.id}
              aria-controls={`executive-panel-${item.id}`}
              tabIndex={view === item.id ? 0 : -1}
              onClick={() => setView(item.id)}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? VIEWS.length - 1
                      : (index +
                          (event.key === "ArrowRight" ? 1 : -1) +
                          VIEWS.length) %
                        VIEWS.length;
                const nextView = VIEWS[next]!;
                setView(nextView.id);
                document
                  .getElementById(`executive-tab-${nextView.id}`)
                  ?.focus();
              }}
              className={`rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-emerald-700 ${view === item.id ? "bg-[#0A3C2F] text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {scope}
      </div>
      {futureSignatures > 0 && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"
        >
          {futureSignatures} contract signature{" "}
          {futureSignatures === 1 ? "date is" : "dates are"} after{" "}
          {displayDate(asOf)}. These records remain in the register and
          commitment comparisons, but are excluded from historical signing
          charts and processing-time measures.
        </div>
      )}

      {view === "overview" && (
        <div
          id="executive-panel-overview"
          role="tabpanel"
          aria-labelledby="executive-tab-overview"
          className="space-y-5"
        >
          <div className="grid gap-5 xl:grid-cols-2">
            <ChartCard
              title="Contracts by project"
              description="Distinct registered contracts, sorted by volume. Select a project to filter the dashboard."
              note="Activities without contracts are excluded from these counts; the item-type cards and register retain them. Identical project names stay separate; record suffixes identify distinct source projects."
            >
              <HorizontalBars
                unit="contracts"
                values={groups.map((group) => ({
                  id: group.id,
                  label: group.label,
                  value: group.count,
                }))}
                onSelect={onProjectSelect}
              />
            </ChartCard>
            <ChartCard
              title="Contract completion status"
              description="Completed versus incomplete registered contracts; unknown completion remains separate."
              note="Completed = completed status or recorded actual completion date. Cancelled and terminated contracts stay incomplete unless completion is recorded."
            >
              <CompletionDonut
                completed={completion.completed}
                incomplete={completion.incomplete}
                unknown={completion.unknown}
              />
            </ChartCard>
            <ChartCard
              title="Estimated cost versus contract commitments"
              description={`By project · ${currency} · same zero-based magnitude scale`}
              note="Activity estimates are deduplicated by activity ID. Estimates include pre-contract procurement; initial contract values include all registered statuses. These totals are different populations and are not used to calculate cost variance."
            >
              <GroupedBars
                values={costs}
                currency={currency}
                onSelect={onProjectSelect}
              />
            </ChartCard>
            <ChartCard
              title="Average reported activity progress"
              description="Unweighted average across unique activities with a valid reported percentage."
              note="Missing percentages are excluded, never set to zero. Activity progress is not a contract-specific physical progress measure."
            >
              <ProgressGauge
                value={progress.average}
                reported={progress.reported}
                total={progress.total}
              />
            </ChartCard>
          </div>
          <ChartCard
            title="Reported progress by project"
            description="Average reported activity percentage · fixed 0–100% scale"
            note="Each activity contributes once. Coverage is shown for every project; select a project to inspect its records."
          >
            <HorizontalBars
              percentage
              unit="%"
              values={groups.map((group) => ({
                id: group.id,
                label: group.label,
                value: group.progress.average,
                detail: `${group.progress.reported} of ${group.progress.total} activities reported`,
              }))}
              onSelect={onProjectSelect}
            />
          </ChartCard>
        </div>
      )}

      {view === "timeline" && (
        <div
          id="executive-panel-timeline"
          role="tabpanel"
          aria-labelledby="executive-tab-timeline"
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm text-slate-500">
                Invitation to signature
              </h2>
              <p className="mt-2 text-2xl font-semibold">
                {cycles.invitation.value === null
                  ? "Not available"
                  : `${money(cycles.invitation.value)} days`}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Mean across {cycles.invitation.count} contracts with valid,
                non-future signature dates and recorded invitation dates.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm text-slate-500">
                Bid opening to signature
              </h2>
              <p className="mt-2 text-2xl font-semibold">
                {cycles.opening.value === null
                  ? "Not available"
                  : `${money(cycles.opening.value)} days`}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Mean across {cycles.opening.count} contracts with valid,
                non-future signature dates and recorded bid-opening dates.
              </p>
            </div>
          </div>
          <ChartCard
            title="Procurement milestones over time"
            description="Monthly recorded invitations, bid openings and contract signatures · last 12 calendar months"
            note={`Source coverage in the selected records: ${timeline.series.invitation.recorded} historical invitation dates; ${timeline.series.opening.recorded} bid-opening dates; ${timeline.series.signed.recorded} signature dates. Invitations/openings count unique activities; signatures count unique contracts. Missing dates mean unknown timing, not no procurement.`}
          >
            <MonthlyColumns
              months={timeline.months.map((month) => ({
                label: month.label,
                values: [
                  timeline.series.invitation.recorded ? month.invitation : null,
                  timeline.series.opening.recorded ? month.opening : null,
                  timeline.series.signed.recorded ? month.signed : null,
                ],
              }))}
              series={[
                { label: "Invitations", color: "#7c3aed", unit: "activities" },
                { label: "Bid openings", color: "#3b82f6", unit: "activities" },
                {
                  label: "Contracts signed",
                  color: "#059669",
                  unit: "contracts",
                },
              ]}
            />
          </ChartCard>
          <ChartCard
            title="Contract deadlines"
            description="Contract schedule on a common date scale; incomplete overdue contracts are highlighted."
            note="Use the recorded implementation start where available, otherwise the signature date as a labelled proxy. Revised targets take precedence; original completion dates remain in the register. A schedule bar does not imply physical progress."
          >
            <DeadlineTimeline rows={rows} asOf={asOf} onSelect={onSelect} />
          </ChartCard>
          <ChartCard
            title="Contract implementation tracker"
            description="Contract-level follow-up with linked activity progress, target dates and overdue status."
            note="Missing activity progress remains Not reported even if a contract is completed. Signature dates do not substitute for physical completion."
          >
            {!deadlines.length ? (
              <NoChartData>
                No registered contracts in this selection.
              </NoChartData>
            ) : (
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full min-w-[750px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      {[
                        "Contract / project",
                        "Reported activity progress",
                        "Completion target",
                        "Status",
                      ].map((label) => (
                        <th key={label} className="p-3">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deadlines.map((item) => (
                      <tr
                        key={item.row.id}
                        className={
                          item.overdue
                            ? "border-t border-slate-100 bg-amber-50"
                            : "border-t border-slate-100"
                        }
                      >
                        <td className="max-w-60 p-3">
                          <button
                            onClick={() => onSelect(item.row)}
                            className="font-semibold text-emerald-800 underline"
                          >
                            {item.row.reference}
                          </button>
                          <p className="mt-1 text-slate-500">
                            {item.row.project}
                          </p>
                        </td>
                        <td className="w-60 p-3">
                          {item.row.completionPct === null ? (
                            <span className="text-slate-500">Not reported</span>
                          ) : (
                            <>
                              <span>{money(item.row.completionPct)}%</span>
                              <div className="mt-1 h-2 bg-slate-100">
                                <div
                                  className="h-2 bg-emerald-600"
                                  style={{
                                    width: `${item.row.completionPct}%`,
                                  }}
                                />
                              </div>
                            </>
                          )}
                        </td>
                        <td className="p-3">
                          {displayDate(
                            item.row.revisedCompletionDate ||
                              item.row.initialCompletionDate,
                          )}
                          <span className="mt-1 block text-slate-400">
                            {item.row.revisedCompletionDate
                              ? "Revised"
                              : "Initial"}{" "}
                            target
                          </span>
                        </td>
                        <td
                          className={`p-3 ${item.overdue ? "font-semibold text-amber-900" : "text-slate-600"}`}
                        >
                          {item.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {view === "finance" && (
        <div
          id="executive-panel-finance"
          role="tabpanel"
          aria-labelledby="executive-tab-finance"
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Matched activity estimates",
                value: matched.pairs.length
                  ? `${money(matched.estimate, true)} ${currency}`
                  : "Not available",
              },
              {
                label: "Matched contract commitments",
                value: matched.pairs.length
                  ? `${money(matched.amount, true)} ${currency}`
                  : "Not available",
              },
              {
                label: "Matched cost variance",
                value:
                  matched.variance === null
                    ? "Not available"
                    : `${matched.variance > 0 ? "+" : ""}${money(matched.variance)}%`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <h2 className="text-xs text-slate-500">{item.label}</h2>
                <p className="mt-3 text-xl font-semibold">{item.value}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {matched.pairs.length} complete same-currency activity/award
                  pairs
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <ChartCard
              title="Contract value by project"
              description={`Initial contract commitments · ${currency} · select a project to inspect it.`}
              note="Original values excluding VAT, grouped by project; includes all registered contract statuses, not only signed contracts. Currencies are never combined."
            >
              <HorizontalBars
                unit={currency}
                values={costs
                  .filter((group) => group.amount !== null)
                  .map((group) => ({
                    id: group.id,
                    label: group.label,
                    value: group.amount,
                    detail: `${group.contracts} contracts`,
                  }))}
                onSelect={onProjectSelect}
              />
            </ChartCard>
            <ChartCard
              title="Contract value by supplier"
              description={`Supplier commitments · ${currency} · select a supplier to filter the dashboard.`}
              note="Initial contract amount excluding VAT. A supplier name groups matching names in the source; these values do not establish supplier performance or delivery quality."
            >
              <HorizontalBars
                color="bg-blue-600"
                unit={currency}
                values={suppliers.map((supplier) => ({
                  id: supplier.id,
                  label: supplier.label,
                  value: supplier.amount,
                  detail: `${supplier.count} contracts`,
                }))}
                onSelect={onSupplierSelect}
              />
            </ChartCard>
            <ChartCard
              title="Estimate versus contract amount"
              description={`Matched activity estimates versus summed awards · ${currency}`}
              note="One point per activity with all its linked contracts included in this selection and recorded in the same currency as its estimate. Above the diagonal means awards exceed estimate; partial, missing and mixed-currency pairs are excluded."
            >
              <CostScatter
                points={matchedCosts(rows, currency)}
                currency={currency}
                onSelect={selectActivity}
              />
            </ChartCard>
            <ChartCard
              title="Signed contract value over time"
              description={`Monthly initial value for recorded historical signatures · ${currency}`}
              note="Last 12 calendar months, including the current month to date. Future-dated signatures are excluded. A signed amount is not a payment or expenditure measure."
            >
              <MonthlyColumns
                months={awards.map((month) => ({
                  label: month.label,
                  values: [
                    month.count
                      ? month.amount
                      : timeline.series.signed.recorded
                        ? 0
                        : null,
                  ],
                }))}
                series={[
                  {
                    label: "Recorded signed value",
                    color: "#059669",
                    unit: currency,
                  },
                ]}
              />
            </ChartCard>
          </div>
          <ChartCard
            title="Supplier country distribution"
            description="Country-of-origin comparison proposed in the references."
          >
            <NoChartData>
              Supplier country is not captured in the existing system. A country
              chart or map cannot be produced reliably. Project country is not
              used as a substitute.
            </NoChartData>
          </ChartCard>
          <details className="rounded-xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-500">
            <summary className="cursor-pointer font-semibold text-slate-700">
              Financial comparison definitions
            </summary>
            <p className="mt-3">
              Matched cost variance = (sum of initial contract amounts − sum of
              corresponding activity estimates) ÷ sum of corresponding estimates
              × 100. Each activity estimate contributes once; every linked
              contract must be present and use the selected currency. A zero
              estimate makes percentage variance unavailable. Unmatched
              procurement estimates are excluded from variance, not treated as
              savings. No exchange rates are assumed.
            </p>
          </details>
        </div>
      )}
    </section>
  );
}
