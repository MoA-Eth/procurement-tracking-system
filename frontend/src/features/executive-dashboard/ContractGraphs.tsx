"use client";
import { useState } from "react";
import {
  ChartCard,
  CompletionDonut,
  GroupedBars,
  HorizontalBars,
  NoChartData,
} from "./ChartPrimitives";
import { displayDate, type ExecutiveRecord } from "./model";
import {
  completionBreakdown,
  contractRows,
  matchedCosts,
  numericDate,
  progressValue,
  supplierValues,
} from "./visualizations";

const MILESTONES = [
  { field: "invitationDate", label: "Invitation", color: "#64748b" },
  { field: "bidOpeningDate", label: "Bid opening", color: "#8b5cf6" },
  { field: "signedDate", label: "Signed", color: "#2563eb" },
  {
    field: "initialCompletionDate",
    label: "Initial completion target",
    color: "#059669",
  },
] as const;

export function ContractGraphs({
  rows,
  onSelect,
}: {
  rows: ExecutiveRecord[];
  onSelect: (row: ExecutiveRecord) => void;
}) {
  const [chosen, setChosen] = useState("ETB");
  const currencies = [
    ...new Set(
      rows
        .flatMap((row) => [row.currency, row.estimateCurrency])
        .filter((value): value is string => !!value),
    ),
  ].sort();
  const currency = currencies.includes(chosen)
    ? chosen
    : currencies[0] || "ETB";
  const contracts = contractRows(rows);
  const completion = completionBreakdown(rows);
  const pairs = matchedCosts(rows, currency);
  const progress = contracts.map((row) => ({
    id: row.id,
    label: `${row.reference} · ${row.project}`,
    value: progressValue(row),
    detail: row.description,
  }));
  const datedRows = rows.filter((row) =>
    MILESTONES.some(({ field }) => numericDate(row[field]) !== null),
  );
  const dates = datedRows.flatMap((row) =>
    MILESTONES.flatMap(({ field }) => {
      const value = numericDate(row[field]);
      return value === null ? [] : [value];
    }),
  );
  const start = dates.length ? Math.min(...dates) : 0;
  const end = dates.length ? Math.max(...dates) : 0;
  const span = Math.max(86400000, end - start);
  const select = (id: string) => {
    const row = rows.find((item) => item.id === id || item.activityId === id);
    if (row) onSelect(row);
  };
  return (
    <section aria-label="Contract register graphs" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Contract values and delivery
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Graphs follow the register filters. Select a contract or value bar
            to inspect its description and all 13 fields.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          Value chart currency
          <select
            aria-label="Contract graph currency"
            value={currency}
            onChange={(event) => setChosen(event.target.value)}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3"
          >
            {(currencies.length ? currencies : ["ETB"]).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Cost estimate and initial contract amount"
          description={`Matched activities and their complete linked contract totals · ${currency}`}
          note="One comparison per activity; its estimate is counted once. Only complete, same-currency award groups are compared. Unawarded activities remain in the register; differences are not automatically savings."
        >
          <GroupedBars
            values={pairs.map((pair) => ({
              id: pair.id,
              label: `${pair.label} · ${pair.project}`,
              estimate: pair.estimate,
              amount: pair.amount,
            }))}
            currency={currency}
            onSelect={select}
          />
        </ChartCard>
        <ChartCard
          title="Complete yes or no"
          description="Registered contract completion status; pre-contract activities excluded"
        >
          <CompletionDonut
            simple
            completed={completion.completed}
            incomplete={completion.incomplete}
            unknown={completion.unknown}
          />
        </ChartCard>
        <ChartCard
          title="Percentage of completion by contract"
          description="Reported activity progress linked to each contract"
          note="Missing progress is not zero. Contracts sharing an activity share its reported percentage; this is not payment progress."
        >
          <HorizontalBars
            values={progress}
            unit="%"
            percentage
            onSelect={select}
          />
        </ChartCard>
        <ChartCard
          title="Initial awards by supplier or contractor"
          description={`Registered initial contract amounts by supplier · ${currency}`}
          note="Supplier country is unavailable in the current source, so no country comparison is inferred from project country."
        >
          <HorizontalBars
            values={supplierValues(rows, currency).map((item) => ({
              id: item.id,
              label: item.label,
              value: item.amount,
            }))}
            unit={currency}
          />
        </ChartCard>
      </div>
      <ChartCard
        title="Invitation to initial completion target"
        description="Contract and activity milestones on a common date scale · dates mm/dd/yy"
        note="The final marker is the original completion target, not actual completion. Missing dates have no marker. Recorded future dates remain visible as source milestones, not evidence that an event has occurred."
      >
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-600">
          {MILESTONES.map((item) => (
            <span key={item.field} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
        {!dates.length ? (
          <NoChartData>
            No invitation, opening, signature or initial completion dates
            recorded in this selection.
          </NoChartData>
        ) : (
          <>
            <div className="mb-4 flex justify-between gap-3 text-xs text-slate-500">
              <span>{displayDate(new Date(start).toISOString())}</span>
              <span>{displayDate(new Date(end).toISOString())}</span>
            </div>
            <div className="max-h-[32rem] space-y-5 overflow-y-auto pr-2">
              {datedRows.map((row) => (
                <div key={row.id}>
                  <button
                    onClick={() => onSelect(row)}
                    className="min-h-11 text-left text-xs font-semibold text-emerald-800 underline underline-offset-2"
                  >
                    {row.reference} · {row.project}
                  </button>
                  <p className="mb-2 text-xs leading-5 text-slate-500">
                    {row.description}
                  </p>
                  <div className="px-2">
                    <div className="relative h-7 rounded bg-slate-100">
                      {MILESTONES.map((item, index) => {
                        const date = numericDate(row[item.field]);
                        return date === null ? null : (
                          <span
                            key={item.field}
                            role="img"
                            aria-label={`${row.reference}: ${item.label} ${displayDate(row[item.field])}`}
                            title={`${item.label}: ${displayDate(row[item.field])}`}
                            className="absolute h-3 w-3 -translate-x-1/2 rounded-full border border-white"
                            style={{
                              left: `${((date - start) / span) * 100}%`,
                              top: `${index * 4}px`,
                              background: item.color,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500 sm:grid-cols-4">
                    {MILESTONES.map((item) => (
                      <span key={item.field}>
                        {item.label}
                        <strong className="mt-0.5 block font-medium text-slate-700">
                          {displayDate(row[item.field])}
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              {rows.length - datedRows.length} register rows have none of these
              milestone dates.
            </p>
          </>
        )}
      </ChartCard>
    </section>
  );
}
