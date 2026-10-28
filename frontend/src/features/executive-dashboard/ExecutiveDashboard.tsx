"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Building2,
  ChevronDown,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import styles from "./responsive.module.css";
import { ProcurementRegister } from "./ProcurementRegister";
import { ExecutiveVisualizations } from "./ExecutiveVisualizations";
import { SystemDashboardSummary } from "./SystemDashboardSummary";
import { ContractSummary } from "./ContractSummary";
import { MinisterOverview } from "./MinisterOverview";
import { apiClient } from "@/lib/apiClient";
import {
  EMPTY_FILTERS,
  ITEM_TYPES,
  TYPE_LABELS,
  deliveryStatus,
  displayDate,
  filterRecords,
  projectNameLabels,
  money,
  registerCsv,
  summarize,
  type ExecutiveRecord,
  type Filters,
  type Snapshot,
} from "./model";

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-emerald-600",
  "In progress": "bg-blue-500",
  Overdue: "bg-amber-500",
  "Pre-contract": "bg-slate-300",
  Closed: "bg-slate-600",
};
const inputClass =
  "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600";

export function ExecutiveDashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [selected, setSelected] = useState<ExecutiveRecord | null>(null);
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await apiClient.get<Snapshot>("/executive-dashboard"));
    } catch (cause) {
      setSnapshot(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load procurement records.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const all = snapshot?.records ?? [];
  const asOf = snapshot?.fetchedAt ?? new Date().toISOString();
  const rows = useMemo(
    () => filterRecords(snapshot?.records ?? [], filters, asOf),
    [snapshot, filters, asOf],
  );
  const metrics = useMemo(() => summarize(rows, asOf), [rows, asOf]);
  const suppliers = [
    ...new Map(
      all
        .filter((row) => row.contractId)
        .map((row) => [
          row.supplier || "UNRECORDED",
          row.supplier || "Supplier not recorded",
        ]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const signingYears = [
    ...new Set(
      all.flatMap((row) =>
        row.signedDate ? [row.signedDate.slice(0, 4)] : [],
      ),
    ),
  ].sort();
  const completionYears = [
    ...new Set(
      all.flatMap((row) => {
        const due = row.revisedCompletionDate || row.initialCompletionDate;
        return due ? [due.slice(0, 4)] : [];
      }),
    ),
  ].sort();
  const projects = [...projectNameLabels(all).entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  const currencies = [
    ...new Set(all.map((row) => row.currency || "UNSPECIFIED")),
  ].sort();
  const update = (key: keyof Filters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };
  const reset = () => {
    setFilters({ ...EMPTY_FILTERS });
    setPage(1);
  };
  const filtered = Object.entries(filters).some(
    ([key, value]) => value !== EMPTY_FILTERS[key as keyof Filters],
  );
  const pages = Math.max(1, Math.ceil(rows.length / 15));
  const currentPage = Math.min(page, pages);
  const pageRows = rows.slice((currentPage - 1) * 15, currentPage * 15);
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([registerCsv(rows)], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `executive-procurement-${asOf.slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`${styles.dashboard} mx-auto max-w-[1600px] space-y-6 pb-8 text-slate-900`}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Executive contract dashboard
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Works, goods and services · Portfolio value, delivery and leadership
            priorities
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={loading || !rows.length}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0A3C2F] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            <ArrowDownToLine size={15} />
            Export register
          </button>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
        >
          <p className="font-semibold">Unable to load the overview</p>
          <p className="mt-1">{error}</p>
          <button onClick={() => void load()} className="mt-3 underline">
            Try again
          </button>
        </div>
      ) : loading ? (
        <div
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500"
        >
          Loading procurement overview…
        </div>
      ) : (
        <>
          {filtered && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
              <span>Showing a filtered portfolio</span>
              <button onClick={reset} className="font-semibold underline">
                Show entire portfolio
              </button>
            </div>
          )}
          <ContractSummary rows={rows} asOf={asOf} />
        </>
      )}
      {!loading && !error && (
        <section
          aria-label="Contract register and filters"
          className="min-w-0 rounded-xl border border-slate-200 bg-white"
        >
          <div className="space-y-6 border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5">
            <section
              aria-label="Dashboard filters"
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <SlidersHorizontal size={14} />
                  Portfolio filters
                </span>
                <button
                  onClick={reset}
                  disabled={!filtered}
                  className="text-xs font-semibold text-emerald-800 disabled:text-slate-400"
                >
                  Reset filters
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <label className="space-y-1 text-xs font-medium text-slate-500">
                  <span>Item type</span>
                  <select
                    className={inputClass}
                    value={filters.itemType}
                    onChange={(event) => update("itemType", event.target.value)}
                  >
                    <option value="ALL">All item types</option>
                    {ITEM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-500">
                  <span>Project</span>
                  <select
                    className={inputClass}
                    value={filters.project}
                    onChange={(event) => update("project", event.target.value)}
                  >
                    <option value="ALL">All projects</option>
                    {projects.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-500">
                  <span>Currency</span>
                  <select
                    className={inputClass}
                    value={filters.currency}
                    onChange={(event) => update("currency", event.target.value)}
                  >
                    <option value="ALL">All currencies</option>
                    {currencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency === "UNSPECIFIED" ? "Not recorded" : currency}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-500">
                  <span>Delivery status</span>
                  <select
                    className={inputClass}
                    value={filters.status}
                    onChange={(event) => update("status", event.target.value)}
                  >
                    <option value="ALL">All statuses</option>
                    {Object.keys(STATUS_COLORS).map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-500">
                  <span>Find a procurement</span>
                  <span className="relative block">
                    <Search
                      size={14}
                      className="absolute left-3 top-3 text-slate-400"
                    />
                    <input
                      value={filters.search}
                      onChange={(event) => update("search", event.target.value)}
                      placeholder="Ref., description, supplier…"
                      className={`${inputClass} pl-9`}
                    />
                  </span>
                </label>
              </div>
              <details className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <summary className="cursor-pointer font-medium">
                  Supplier and date filters
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1">
                    <span>Supplier / contractor</span>
                    <select
                      className={inputClass}
                      value={filters.supplier}
                      onChange={(event) =>
                        update("supplier", event.target.value)
                      }
                    >
                      <option value="ALL">All suppliers</option>
                      {suppliers.map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span>Contract signing year</span>
                    <select
                      className={inputClass}
                      value={filters.signingYear}
                      onChange={(event) =>
                        update("signingYear", event.target.value)
                      }
                    >
                      <option value="ALL">All signing years</option>
                      {signingYears.map((year) => (
                        <option key={year}>{year}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span>Effective completion target year</span>
                    <select
                      className={inputClass}
                      value={filters.completionYear}
                      onChange={(event) =>
                        update("completionYear", event.target.value)
                      }
                    >
                      <option value="ALL">All target years</option>
                      {completionYears.map((year) => (
                        <option key={year}>{year}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </details>
            </section>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                {rows.length} register rows · {metrics.activities} unique
                activities · {metrics.contracts} contracts
              </span>
              <span>
                As of {displayDate(asOf)} ·{" "}
                {new Date(asOf).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {!all.length ? (
              <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <Building2 size={30} className="mx-auto text-emerald-700" />
                <h2 className="mt-4 text-lg font-semibold">
                  No procurement records yet
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  This dashboard reads existing activities and contracts. Add
                  records through the system’s existing project and contract
                  workflows; they will appear here after refresh.
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  The supplied workbook is a column template and contains no
                  data rows.
                </p>
              </section>
            ) : !rows.length ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                <h2 className="font-semibold">
                  No records match these filters
                </h2>
                <button
                  onClick={reset}
                  className="mt-3 text-sm font-semibold text-emerald-800"
                >
                  Clear filters
                </button>
              </div>
            ) : null}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-semibold">Contract register</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Your 13 required columns · Dates: mm/dd/yy · Scroll
                    horizontally to see every field
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {rows.length} rows
                </span>
              </div>
              <p className="border-b border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500">
                Not recorded = missing source data. Not applicable = no contract
                yet. Supplier country is unavailable in the current system;
                project country is not substituted. Progress is reported
                activity completion, not payment progress.
              </p>
              <ProcurementRegister
                records={pageRows}
                firstRowNumber={(currentPage - 1) * 15 + 1}
                onSelect={setSelected}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5 text-xs text-slate-500">
                <span>
                  Page {currentPage} of {pages}
                </span>
                <div className="flex gap-3">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                    className="rounded border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage >= pages}
                    onClick={() => setPage(currentPage + 1)}
                    className="rounded border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
            <details className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <summary className="cursor-pointer text-sm font-semibold text-emerald-800">
                Additional charts and operational summary
              </summary>
              <div className="mt-5 space-y-5">
                {snapshot?.systemSummary && (
                  <SystemDashboardSummary summary={snapshot.systemSummary} />
                )}
                <MinisterOverview
                  rows={rows}
                  asOf={asOf}
                  onSelect={setSelected}
                />
                {!!all.length && (
                  <ExecutiveVisualizations
                    rows={rows}
                    asOf={asOf}
                    onSelect={setSelected}
                    onProjectSelect={(id) => update("project", id)}
                    onSupplierSelect={(name) => update("supplier", name)}
                  />
                )}
              </div>
            </details>
            <details className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-500">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-slate-700">
                Sources and measurement definitions
                <ChevronDown size={15} />
              </summary>
              <div className="mt-4 grid gap-4 leading-6 md:grid-cols-2">
                <p>
                  <strong>Source:</strong> {snapshot?.source}. This module is
                  read-only. Each row is one contract, or one active activity
                  without a contract. Deleted contracts and inactive activities,
                  plans and projects are excluded. Unlinked contracts remain
                  unclassified.
                </p>
                <p>
                  <strong>Money:</strong> Initial value is the original contract
                  amount excluding VAT; amendments and payments are not
                  completion measures. Currencies are never converted or
                  combined. All contract summary figures and register rows
                  follow the selected filters.
                </p>
                <p>
                  <strong>Delivery:</strong> Completed means a completed
                  contract status or a recorded actual completion date. Overdue
                  means an open contract with its revised target, or initial
                  target if not revised, before the snapshot’s UTC date.
                  Cancelled and terminated contracts are closed, not overdue.
                </p>
                <p>
                  <strong>Workbook mapping:</strong> Invitation and bid opening
                  use actual stage dates only. Progress is reported at activity
                  level and may be shared by multiple contracts. Supplier
                  country is not stored; project country is shown with its own
                  label. Missing fields are not zero. Export includes all
                  filtered rows, not just the current page.
                </p>
              </div>
            </details>
          </div>
        </section>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 sm:p-4"
          onClick={() => setSelected(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="executive-record-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700">
                  {TYPE_LABELS[selected.itemType]}
                </p>
                <h2
                  id="executive-record-title"
                  className="mt-1 text-xl font-semibold"
                >
                  {selected.reference}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {selected.description}
                </p>
              </div>
              <button
                autoFocus
                aria-label="Close record details"
                onClick={() => setSelected(null)}
                className="shrink-0 rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              {[
                ["Project", selected.project],
                [
                  "Source plan category",
                  selected.sourceCategory || "Not recorded",
                ],
                [
                  "Cost estimate (activity)",
                  selected.estimate === null
                    ? "Not recorded"
                    : `${money(selected.estimate)} ${selected.estimateCurrency || "(currency missing)"}`,
                ],
                [
                  "Initial contract amount (excl. VAT)",
                  selected.initialAmount === null
                    ? "Not awarded"
                    : `${money(selected.initialAmount)} ${selected.currency || "(currency missing)"}`,
                ],
                [
                  "Actual invitation date",
                  displayDate(selected.invitationDate),
                ],
                [
                  "Actual bid opening date",
                  displayDate(selected.bidOpeningDate),
                ],
                ["Contract signed", displayDate(selected.signedDate)],
                ["Supplier / contractor", selected.supplier || "Not recorded"],
                ["Project country", selected.country || "Not recorded"],
                ["Supplier country", "Not stored in the current system"],
                [
                  "Initial completion date",
                  displayDate(selected.initialCompletionDate),
                ],
                [
                  "Revised completion target",
                  displayDate(selected.revisedCompletionDate),
                ],
                [
                  "Actual completion date",
                  displayDate(selected.actualCompletionDate),
                ],
                [
                  "Complete",
                  selected.complete === null
                    ? "Not applicable (pre-contract)"
                    : selected.complete
                      ? "Yes"
                      : "No",
                ],
                [
                  "Reported activity completion",
                  selected.completionPct === null
                    ? "Not reported"
                    : `${selected.completionPct}%`,
                ],
                ["Delivery status", deliveryStatus(selected, asOf)],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-slate-100 pb-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <button
              onClick={() => setSelected(null)}
              className="mt-6 rounded-lg bg-[#0A3C2F] px-4 py-2 text-sm font-medium text-white"
            >
              Close details
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
