"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import styles from "./responsive.module.css";
import { ExecutiveVisualizations } from "./ExecutiveVisualizations";
import { SystemDashboardSummary } from "./SystemDashboardSummary";
import { ContractGraphs } from "./ContractGraphs";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { ConsolidatedPortfolio } from "./ConsolidatedPortfolio";
import { ProjectPortfolioDashboard } from "./ProjectPortfolioDashboard";
import { FinancialPositionDashboard } from "./FinancialPositionDashboard";
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
  type Filters,
  type ExecutiveRecord,
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
    () => filterRecords(all, filters, asOf),
    [all, filters, asOf],
  );
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
  };
  const reset = () => setFilters({ ...EMPTY_FILTERS });
  const filtered = Object.entries(filters).some(
    ([key, value]) => value !== EMPTY_FILTERS[key as keyof Filters],
  );
  return (
    <div
      className={`${styles.dashboard} mx-auto max-w-[1600px] space-y-8 pb-8 text-slate-900`}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
         
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
          <ExecutiveSummary
            rows={all}
            totalActivities={snapshot?.systemSummary?.activities}
            projects={snapshot?.systemSummary?.projects}
          />
          <div className="min-w-0 space-y-8">
            <ConsolidatedPortfolio records={rows} />
            <ProjectPortfolioDashboard records={rows} />
            <FinancialPositionDashboard records={rows} />
          </div>
        
          {filtered && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
              <span>Showing a filtered portfolio</span>
              <button onClick={reset} className="font-semibold underline">
                Show entire portfolio
              </button>
            </div>
          )}
        </>
      )}
      {!loading && !error && (
        <>
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
              {!!rows.length && (
                <>
                  <ContractGraphs rows={rows} onSelect={setSelected} />
                  <ExecutiveVisualizations
                    rows={rows}
                    asOf={asOf}
                    onSelect={setSelected}
                    onProjectSelect={(id) => update("project", id)}
                    onSupplierSelect={(name) => update("supplier", name)}
                  />
                </>
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
                combined. Summary figures follow the selected filters.
              </p>
              <p>
                <strong>Delivery:</strong> Completed means a completed contract
                status or a recorded actual completion date. Overdue means an
                open contract with its revised target, or initial target if not
                revised, before the snapshot’s UTC date. Cancelled and
                terminated contracts are closed, not overdue.
              </p>
              <p>
                <strong>Workbook mapping:</strong> Invitation and bid opening
                use actual stage dates only. Progress is reported at activity
                level and may be shared by multiple contracts. Supplier country
                is not stored; project country is shown with its own label.
                Missing fields are not zero.
              </p>
            </div>
          </details>
        </>
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
