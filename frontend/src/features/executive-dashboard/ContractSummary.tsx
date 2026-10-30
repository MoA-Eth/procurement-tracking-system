import { displayDate, money, summarize, type ExecutiveRecord } from "./model";
import { averageProgress } from "./visualizations";

export function ContractSummary({
  rows,
  asOf,
}: {
  rows: ExecutiveRecord[];
  asOf: string;
}) {
  const stats = summarize(rows, asOf);
  const progress = averageProgress(rows);
  const values = (totals: [string, number][]) =>
    totals.length
      ? totals
          .map(([currency, value]) => `${money(value, true)} ${currency}`)
          .join(" · ")
      : "Not recorded";
  return (
    <section aria-label="Contract register summary" className="space-y-3">
      <p className="text-xs leading-5 text-slate-500">
        As of {displayDate(asOf)} · {stats.contracts} registered contracts ·{" "}
        {stats.preContract} activities awaiting contracts. Register rows include
        both, with pre-contract fields clearly labelled.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Cost estimate",
            values(stats.estimates),
            "Unique activity estimates · currencies kept separate",
          ],
          [
            "Initial contract amount",
            values(stats.amounts),
            "Registered contract amounts · excluding VAT",
          ],
          [
            "Contract completion",
            `${stats.completed} of ${stats.contracts} complete`,
            `${stats.overdue} overdue against recorded completion targets`,
          ],
          [
            "Reported completion",
            progress.average === null
              ? "Not reported"
              : `${money(progress.average)}%`,
            `${progress.reported} of ${progress.total} activities report progress · average of reported values`,
          ],
        ].map(([label, value, note]) => (
          <div
            key={label}
            className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
          >
            <h2 className="text-xs font-medium text-slate-500">{label}</h2>
            <p className="mt-3 break-words text-xl font-semibold text-slate-900">
              {value}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
