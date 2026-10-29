"use client";
import { useId, useState, type ReactNode } from "react";
import { money } from "./model";

export function ChartCard({
  title,
  description,
  children,
  note,
  controls,
}: {
  title: string;
  description: string;
  children: ReactNode;
  note?: string;
  controls?: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={id} className="font-semibold text-slate-900">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        {controls}
      </div>
      {children}
      {note && (
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
          {note}
        </p>
      )}
    </section>
  );
}
export function NoChartData({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm leading-6 text-slate-500">
      {children}
    </div>
  );
}
export interface BarValue {
  id: string;
  label: string;
  value: number | null;
  detail?: string;
}
export function HorizontalBars({
  values,
  unit,
  onSelect,
  percentage = false,
  color = "bg-emerald-600",
}: {
  values: BarValue[];
  unit: string;
  onSelect?: (id: string) => void;
  percentage?: boolean;
  color?: string;
}) {
  if (!values.length)
    return <NoChartData>No records for this comparison.</NoChartData>;
  const max = percentage
    ? 100
    : Math.max(1, ...values.map((row) => row.value ?? 0));
  return (
    <div>
      <div className="mb-3 flex justify-between text-[11px] text-slate-400">
        <span>0 {unit}</span>
        <span>
          {money(max, true)}
          {percentage ? "%" : ` ${unit}`}
        </span>
      </div>
      <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
        {values.map((row) => {
          const label =
            row.value === null
              ? "Not reported"
              : percentage
                ? `${money(row.value)}%`
                : `${money(row.value, unit !== "contracts")} ${unit}`;
          const content = (
            <>
              <div className="mb-1.5 flex items-start justify-between gap-3 text-xs">
                <span className="min-w-0 break-words font-medium text-slate-700">
                  {row.label}
                </span>
                <span className="shrink-0 text-slate-600">{label}</span>
              </div>
              <div className="h-3 rounded-sm bg-slate-100">
                {row.value !== null && (
                  <div
                    className={`h-full rounded-sm ${color}`}
                    style={{
                      width: `${Math.min(100, (Math.max(0, row.value) / max) * 100)}%`,
                    }}
                  />
                )}
              </div>
              {row.detail && (
                <p className="mt-1 text-[11px] text-slate-400">{row.detail}</p>
              )}
            </>
          );
          return onSelect ? (
            <button
              key={row.id}
              className="block w-full rounded text-left focus-visible:outline-2 focus-visible:outline-emerald-700"
              onClick={() => onSelect(row.id)}
              aria-label={`${row.label}: ${label}. Open this selection.`}
            >
              {content}
            </button>
          ) : (
            <div key={row.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
export function CompletionDonut({
  completed,
  incomplete,
  unknown,
  simple = false,
}: {
  completed: number;
  incomplete: number;
  unknown: number;
  simple?: boolean;
}) {
  const total = completed + incomplete + unknown;
  if (!total)
    return (
      <NoChartData>No registered contracts in this selection.</NoChartData>
    );
  const segments = [
    { label: "Completed", value: completed, color: "#059669" },
    { label: "Incomplete", value: incomplete, color: "#3b82f6" },
    { label: "Completion unknown", value: unknown, color: "#94a3b8" },
  ];
  let offset = 0;
  const circumference = 2 * Math.PI * 62;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg
        viewBox="0 0 180 180"
        width="180"
        height="180"
        role="img"
        aria-label={`${completed} completed, ${incomplete} incomplete, ${unknown} unknown out of ${total} contracts`}
      >
        <circle
          cx="90"
          cy="90"
          r="62"
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="20"
        />
        {segments.map((segment) => {
          const length = (segment.value / total) * circumference;
          const position = offset;
          offset += length;
          return segment.value ? (
            <circle
              key={segment.label}
              cx="90"
              cy="90"
              r="62"
              fill="none"
              stroke={segment.color}
              strokeWidth="20"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-position}
              transform="rotate(-90 90 90)"
            />
          ) : null;
        })}
        <text
          x="90"
          y="88"
          textAnchor="middle"
          fontSize="27"
          fontWeight="600"
          fill="#0f172a"
        >
          {money((completed / total) * 100)}%
        </text>
        <text x="90" y="110" textAnchor="middle" fontSize="11" fill="#64748b">
          completed
        </text>
      </svg>
      <div className="space-y-3 text-xs">
        {segments
          .filter(
            (segment) =>
              !simple ||
              segment.label !== "Completion unknown" ||
              segment.value > 0,
          )
          .map((segment) => (
            <div key={segment.label} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: segment.color }}
              />
              <span>{segment.label}</span>
              <strong className="ml-auto pl-4">{segment.value}</strong>
            </div>
          ))}
        <p className="pt-2 text-slate-400">
          {simple
            ? `${total} ${total === 1 ? "contract" : "contracts"}`
            : `Denominator: ${total} registered contracts`}
        </p>
      </div>
    </div>
  );
}
export function ProgressGauge({
  value,
  reported,
  total,
}: {
  value: number | null;
  reported: number;
  total: number;
}) {
  const arc = Math.PI * 68;
  return (
    <div>
      <svg
        viewBox="0 0 180 125"
        className="mx-auto w-56 max-w-full"
        role="img"
        aria-label={
          value === null
            ? "Average progress not reported"
            : `${money(value)} percent average reported activity progress`
        }
      >
        <path
          d="M22 90 A68 68 0 0 1 158 90"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="15"
          strokeLinecap="round"
        />
        {value !== null && (
          <path
            d="M22 90 A68 68 0 0 1 158 90"
            fill="none"
            stroke="#059669"
            strokeWidth="15"
            strokeLinecap="round"
            strokeDasharray={`${(value / 100) * arc} ${arc}`}
          />
        )}
        <text
          x="90"
          y="83"
          textAnchor="middle"
          fontSize={value === null ? "17" : "25"}
          fontWeight="600"
          fill="#0f172a"
        >
          {value === null ? "Not reported" : `${money(value)}%`}
        </text>
        <text x="16" y="113" fontSize="10" fill="#64748b">
          0%
        </text>
        <text x="143" y="113" fontSize="10" fill="#64748b">
          100%
        </text>
      </svg>
      <p className="mt-1 text-center text-xs text-slate-500">
        {reported} of {total} unique activities have a reported percentage.
      </p>
    </div>
  );
}
export function GroupedBars({
  values,
  currency,
  onSelect,
}: {
  values: {
    id: string;
    label: string;
    estimate: number | null;
    amount: number | null;
  }[];
  currency: string;
  onSelect: (id: string) => void;
}) {
  if (!values.length)
    return (
      <NoChartData>
        No estimates or contract values recorded in {currency}.
      </NoChartData>
    );
  const max = Math.max(
    1,
    ...values.flatMap((row) => [row.estimate ?? 0, row.amount ?? 0]),
  );
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 bg-slate-400" />
          Activity estimates
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 bg-emerald-600" />
          Initial contract amounts
        </span>
      </div>
      <div className="mb-3 flex justify-between text-[11px] text-slate-400">
        <span>0 {currency}</span>
        <span>
          {money(max, true)} {currency}
        </span>
      </div>
      <div className="max-h-96 space-y-5 overflow-y-auto pr-1">
        {values.map((row) => (
          <button
            key={row.id}
            onClick={() => onSelect(row.id)}
            className="block w-full rounded text-left focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            <span className="mb-2 block text-xs font-medium text-slate-700">
              {row.label}
            </span>
            {(
              [
                { key: "estimate", label: "Estimate", color: "bg-slate-400" },
                { key: "amount", label: "Contract", color: "bg-emerald-600" },
              ] as const
            ).map((series) => (
              <div
                key={series.key}
                className="mb-1.5 grid grid-cols-[3rem_minmax(0,1fr)_4.5rem] sm:grid-cols-[4rem_minmax(0,1fr)_6rem] items-center gap-2 text-[11px]"
              >
                <span className="text-slate-500">{series.label}</span>
                <span className="h-3 rounded-sm bg-slate-50">
                  {row[series.key] !== null && (
                    <span
                      className={`block h-full rounded-sm ${series.color}`}
                      style={{
                        width: `${(Math.max(0, row[series.key]!) / max) * 100}%`,
                      }}
                    />
                  )}
                </span>
                <span className="text-right text-slate-600">
                  {row[series.key] === null
                    ? "Not recorded"
                    : money(row[series.key]!, true)}
                </span>
              </div>
            ))}
          </button>
        ))}
      </div>
    </>
  );
}
export function CostScatter({
  points,
  currency,
  onSelect,
}: {
  points: {
    id: string;
    label: string;
    project: string;
    estimate: number;
    amount: number;
  }[];
  currency: string;
  onSelect: (id: string) => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const usable = points.filter(
    (point) => point.estimate >= 0 && point.amount >= 0,
  );
  if (!usable.length)
    return (
      <NoChartData>
        No complete, same-currency activity-to-contract pairs are available.
      </NoChartData>
    );
  const max = Math.max(
    1,
    ...usable.flatMap((point) => [point.estimate, point.amount]),
  );
  const selected = usable.find((point) => point.id === active);
  return (
    <>
      <svg
        viewBox="0 0 480 300"
        className="w-full"
        role="img"
        aria-label={`Matched activity estimates versus total initial contract amounts in ${currency}; same scale on both axes`}
      >
        {[0, 0.5, 1].map((tick) => (
          <g key={tick}>
            <line
              x1="70"
              y1={235 - tick * 195}
              x2="450"
              y2={235 - tick * 195}
              stroke="#e2e8f0"
            />
            <text
              x="63"
              y={239 - tick * 195}
              textAnchor="end"
              fontSize="11"
              fill="#64748b"
            >
              {money(max * tick, true)}
            </text>
            <text
              x={70 + tick * 380}
              y="255"
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
            >
              {money(max * tick, true)}
            </text>
          </g>
        ))}
        <line
          x1="70"
          y1="235"
          x2="450"
          y2="40"
          stroke="#94a3b8"
          strokeDasharray="5 4"
        />
        <text x="260" y="283" textAnchor="middle" fontSize="12" fill="#64748b">
          Activity estimate ({currency})
        </text>
        <text
          transform="translate(17 140) rotate(-90)"
          textAnchor="middle"
          fontSize="12"
          fill="#64748b"
        >
          Initial contract amounts ({currency})
        </text>
        {usable.map((point) => (
          <circle
            key={point.id}
            cx={70 + (point.estimate / max) * 380}
            cy={235 - (point.amount / max) * 195}
            r={active === point.id ? 7 : 5}
            fill="#059669"
            fillOpacity=".8"
            stroke="white"
            tabIndex={0}
            role="button"
            aria-label={`${point.label}, estimate ${money(point.estimate)} ${currency}, contract total ${money(point.amount)} ${currency}. Open details.`}
            onMouseEnter={() => setActive(point.id)}
            onFocus={() => setActive(point.id)}
            onClick={() => onSelect(point.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(point.id);
              }
            }}
          />
        ))}
      </svg>
      <div
        className="min-h-12 rounded bg-slate-50 px-3 py-2 text-xs text-slate-600"
        aria-live="polite"
      >
        {selected
          ? `${selected.label} · ${selected.project}: estimate ${money(selected.estimate)} ${currency}; contract total ${money(selected.amount)} ${currency}.`
          : `${usable.length} matched activities. Dashed line = equal estimate and contract total. Hover or focus a point for exact values.`}
      </div>
    </>
  );
}
export function MonthlyColumns({
  months,
  series,
}: {
  months: { label: string; values: (number | null)[] }[];
  series: { label: string; color: string; unit: string }[];
}) {
  if (
    !months.some((month) =>
      month.values.some((value) => value !== null && value > 0),
    )
  )
    return (
      <NoChartData>
        No recorded events in the last 12 months. Missing dates and future dates
        are not historical events.
      </NoChartData>
    );
  const max = Math.max(
    1,
    ...months.flatMap((month) => month.values.map((value) => value ?? 0)),
  );
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-500">
        {series.map((item) => (
          <span key={item.label}>
            <span
              className="mr-1.5 inline-block h-2 w-2"
              style={{ background: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 720 250"
          className="min-w-[580px] w-full"
          role="img"
          aria-label={
            series.map((item) => item.label).join(", ") +
            " by month; zero-based scale"
          }
        >
          {[0, 0.5, 1].map((tick) => (
            <g key={tick}>
              <line
                x1="53"
                x2="705"
                y1={205 - tick * 165}
                y2={205 - tick * 165}
                stroke="#e2e8f0"
              />
              <text
                x="45"
                y={209 - tick * 165}
                textAnchor="end"
                fontSize="11"
                fill="#64748b"
              >
                {money(max * tick, true)}
              </text>
            </g>
          ))}
          {months.map((month, index) => (
            <g key={month.label}>
              {month.values.map((value, seriesIndex) =>
                value === null ? null : (
                  <g key={seriesIndex}>
                    <rect
                      x={62 + index * 53 + seriesIndex * (35 / series.length)}
                      y={205 - (value / max) * 165}
                      width={Math.max(6, 32 / series.length)}
                      height={(value / max) * 165}
                      fill={series[seriesIndex]?.color}
                    >
                      <title>
                        {month.label}: {value} {series[seriesIndex]?.unit},{" "}
                        {series[seriesIndex]?.label}
                      </title>
                    </rect>
                  </g>
                ),
              )}
              <text
                x={79 + index * 53}
                y="230"
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
      <details className="mt-3 text-xs text-slate-500">
        <summary className="cursor-pointer">Monthly values</summary>
        <div className="mt-2 overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="p-2">Month</th>
                {series.map((item) => (
                  <th key={item.label} className="p-2">
                    {item.label} ({item.unit})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((month) => (
                <tr key={month.label}>
                  <td className="p-2">{month.label}</td>
                  {month.values.map((value, index) => (
                    <td key={index} className="p-2">
                      {value === null ? "Not recorded" : money(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
