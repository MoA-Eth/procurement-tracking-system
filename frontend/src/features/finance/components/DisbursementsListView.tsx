"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Loader2,
  Banknote,
} from "lucide-react";
import type { AuthUser } from "@/lib/authTypes";
import {
  fetchDisbursements,
  fetchDisbursementById,
  fetchSmsSettings,
  retrySms,
  formatEtb,
  CATEGORY_LABELS,
  CATEGORY_LABELS_AM,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_LABELS_AM,
  type Disbursement,
  type DisbursementCategory,
  type PaymentMethod,
  type SmsLogEntry,
} from "../api/financeApi";
import { DisbursementForm } from "./DisbursementForm";
import { SmsSettingsPanel } from "./SmsSettingsPanel";

interface DisbursementsListViewProps {
  currentUser: AuthUser;
  smsThreshold?: number;
  smsRecipientCount?: number;
}

function SmsBadge({ status }: { status: string | null }) {
  if (!status)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
        No SMS · ማሳወቂያ የለም
      </span>
    );
  if (status === "SENT")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 size={11} /> Sent · ተልኳል
      </span>
    );
  if (status === "FAILED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle size={11} /> Failed · አልተሳካም
      </span>
    );
  if (status === "PARTIAL")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertCircle size={11} /> Partial · በከፊል
      </span>
    );
  if (status === "PENDING")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        <Clock size={11} /> Pending · በመጠባበቅ ላይ
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
      {status}
    </span>
  );
}

function SmsLogRow({ log }: { log: SmsLogEntry }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700">
            {log.recipientName || "Recipient / ተቀባይ"}{" "}
            <span className="font-mono font-normal text-slate-500">
              {log.recipientPhone}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500 font-mono leading-5">{log.message}</p>
          {log.errorMessage && (
            <p className="mt-1 text-xs text-red-600">{log.errorMessage}</p>
          )}
        </div>
        <SmsBadge status={log.status} />
      </div>
      <p className="mt-1.5 text-xs text-slate-400">
        {new Date(log.sentAt).toLocaleString()}
      </p>
    </div>
  );
}

function DisbursementDetailPanel({
  id,
  onClose,
  canRetry,
}: {
  id: string;
  onClose: () => void;
  canRetry: boolean;
}) {
  const [data, setData] = useState<Disbursement | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchDisbursementById(id)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleRetry() {
    setRetrying(true);
    setRetryMsg(null);
    try {
      const r = await retrySms(id);
      setRetryMsg(r.message || "SMS retry initiated · መልዕክቱ በድጋሚ በመላክ ላይ ነው");
      setTimeout(() => {
        fetchDisbursementById(id)
          .then((r) => setData(r.data))
          .catch(() => {});
      }, 2000);
    } catch {
      setRetryMsg("Retry failed · መልዕክቱን እንደገና መላክ አልተሳካም");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Disbursement Detail · የክፍያ ዝርዝር መረጃ
          </h3>
          <p className="text-xs text-slate-400">Voucher & SMS audit trail</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin text-emerald-600" size={28} />
        </div>
      ) : !data ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          Could not load disbursement · መረጃውን ማግኘት አልተቻለም።
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {/* Amount */}
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
              Disbursement Amount · የክፍያ መጠን
            </p>
            <p className="mt-0.5 text-2xl font-bold text-emerald-900">
              ETB {formatEtb(data.amount)}
            </p>
          </div>

          {/* Fields */}
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Reference · ማጣቀሻ</dt>
              <dd className="font-mono font-medium text-slate-900 text-right">
                {data.referenceNo}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Payee · ተቀባይ</dt>
              <dd className="text-slate-900 text-right font-medium">{data.payeeName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Category · ምድብ</dt>
              <dd className="text-slate-900 text-right text-xs">
                {data.category
                  ? `${CATEGORY_LABELS[data.category as DisbursementCategory] || data.category} (${CATEGORY_LABELS_AM[data.category as DisbursementCategory] || ""})`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Method · ዘዴ</dt>
              <dd className="text-slate-900 text-right text-xs">
                {data.paymentMethod
                  ? `${PAYMENT_METHOD_LABELS[data.paymentMethod as PaymentMethod] || data.paymentMethod} (${PAYMENT_METHOD_LABELS_AM[data.paymentMethod as PaymentMethod] || ""})`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Date · ቀን</dt>
              <dd className="text-slate-900 text-right">
                {new Date(data.paymentDate).toLocaleDateString()}
              </dd>
            </div>
            {data.remarks && (
              <div>
                <dt className="text-slate-500">Remarks · ማስታወሻ</dt>
                <dd className="mt-1 text-slate-900 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {data.remarks}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Recorded by · መዝጋቢ</dt>
              <dd className="text-slate-900 text-right">
                {data.creator?.displayName || "—"}
              </dd>
            </div>
            {data.contract && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Contract · ውል</dt>
                <dd className="font-mono text-slate-900 text-right text-xs">
                  {data.contract.contractNo || data.contract.contractNumber}
                </dd>
              </div>
            )}
            <div className="flex justify-between items-center">
              <dt className="text-slate-500">SMS Status · የኤስኤምኤስ ሁኔታ</dt>
              <dd>
                <SmsBadge status={data.smsStatus} />
              </dd>
            </div>
          </dl>

          {/* SMS Logs */}
          {data.smsLogs && data.smsLogs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  SMS Delivery Log · የኤስኤምኤስ መላኪያ ታሪክ
                </h4>
                {canRetry &&
                  (data.smsStatus === "FAILED" ||
                    data.smsStatus === "PARTIAL") && (
                    <button
                      onClick={handleRetry}
                      disabled={retrying}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                    >
                      {retrying ? (
                        <Loader2 className="animate-spin" size={12} />
                      ) : (
                        <RotateCcw size={12} />
                      )}
                      Retry SMS
                    </button>
                  )}
              </div>
              {retryMsg && (
                <p className="mb-2 text-xs text-emerald-700">{retryMsg}</p>
              )}
              <div className="space-y-2">
                {data.smsLogs.map((log) => (
                  <SmsLogRow key={log.id} log={log} />
                ))}
              </div>
            </div>
          )}

          {data.smsTriggered && (!data.smsLogs || data.smsLogs.length === 0) && (
            <p className="text-xs text-slate-400 text-center py-2">
              SMS triggered but no delivery logs yet · ማሳወቂያው ተልኳል፤ የማረጋገጫ ታሪክ በመጠባበቅ ላይ።
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function DisbursementsListView({
  currentUser,
  smsThreshold = 20_000_000,
  smsRecipientCount = 0,
}: DisbursementsListViewProps) {
  const [activeTab, setActiveTab] = useState<"disbursements" | "settings">(
    "disbursements",
  );
  const [items, setItems] = useState<Disbursement[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [liveThreshold, setLiveThreshold] = useState(smsThreshold);
  const [liveRecipientCount, setLiveRecipientCount] = useState(smsRecipientCount);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [smsStatusFilter, setSmsStatusFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isFinanceOrAdmin =
    currentUser.role === "FINANCE" || currentUser.role === "ADMIN";
  const isAdmin = currentUser.role === "ADMIN";

  useEffect(() => {
    fetchSmsSettings()
      .then((res) => {
        if (res.data) {
          setLiveThreshold(res.data.thresholdEtb);
          setLiveRecipientCount(res.data.recipients?.length || 0);
        }
      })
      .catch(() => {});
  }, [activeTab]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchDisbursements({
        page,
        limit: 20,
        search: search || undefined,
        category: categoryFilter || undefined,
        smsStatus: smsStatusFilter || undefined,
      });
      setItems(r.items);
      setTotal(r.total);
      setTotalPages(r.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load disbursements");
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, smsStatusFilter]);

  useEffect(() => {
    if (activeTab === "disbursements") {
      load();
    }
  }, [load, activeTab]);

  function handleSearchKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      setPage(1);
      load();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Header & Tab Navigation */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 pr-4">
          <h1 className="sr-only">
            Finance Disbursements · የፋይናንስ ክፍያዎች ክትትል
          </h1>
          <p className="text-sm text-slate-500">
            Record and monitor ministry disbursements. Payments ≥ ETB{" "}
            {new Intl.NumberFormat("en-US").format(liveThreshold)} trigger SMS alerts to{" "}
            {liveRecipientCount} executive recipient{liveRecipientCount !== 1 ? "s" : ""}.
            (ከብር {new Intl.NumberFormat("en-US").format(liveThreshold)} በላይ የሆኑ ክፍያዎች ለ{liveRecipientCount} ኃላፊዎች በኤስኤምኤስ ይላካሉ።)
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isAdmin && (
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("disbursements")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === "disbursements"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Disbursements
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === "settings"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                SMS Gateway
              </button>
            </div>
          )}
          {isFinanceOrAdmin && activeTab === "disbursements" && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm"
            >
              <Plus size={16} />
              New Disbursement
            </button>
          )}
        </div>
      </div>

      {activeTab === "settings" && isAdmin ? (
        <SmsSettingsPanel />
      ) : (
        <div className="flex flex-1 gap-4">
          {/* Main panel */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={15}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKey}
                  placeholder="Search reference, payee, remarks · በማጣቀሻ ወይም በተቀባይ ፈልግ…"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">All Categories · ሁሉም ምድቦች</option>
                {(
                  Object.entries(CATEGORY_LABELS) as [DisbursementCategory, string][]
                ).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label} ({CATEGORY_LABELS_AM[val]})
                  </option>
                ))}
              </select>
              <select
                value={smsStatusFilter}
                onChange={(e) => { setSmsStatusFilter(e.target.value); setPage(1); }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">All SMS Status · ሁሉም የኤስኤምኤስ ሁኔታ</option>
                <option value="SENT">Sent · ተልኳል</option>
                <option value="FAILED">Failed · አልተሳካም</option>
                <option value="PARTIAL">Partial · በከፊል</option>
                <option value="PENDING">Pending · በመጠባበቅ ላይ</option>
              </select>
              <button
                onClick={() => load()}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-500 hover:bg-slate-50"
                title="Refresh · አድስ"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            {/* Table */}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                {error}
              </div>
            ) : loading && items.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-20">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Banknote className="text-slate-400" size={28} />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  No disbursements recorded yet · የተመዘገበ ክፍያ የለም
                </p>
                <p className="text-xs text-slate-400">
                  {isFinanceOrAdmin
                    ? 'Click "New Disbursement" to record the first payment. · አዲስ ክፍያ ለመመዝገብ "አዲስ ክፍያ መዝግብ" የሚለውን ይጫኑ።'
                    : "No disbursements have been recorded yet."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Date · ቀን
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Voucher Ref · ማጣቀሻ
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Payee · ተቀባይ
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Amount (ETB) · መጠን
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Category · ምድብ
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          SMS Alert · ማሳወቂያ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const amt = parseFloat(String(item.amount));
                        return (
                          <tr
                            key={item.id}
                            onClick={() =>
                              setSelectedId(
                                selectedId === item.id ? null : item.id,
                              )
                            }
                            className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                              selectedId === item.id ? "bg-emerald-50" : ""
                            }`}
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                              {new Date(item.paymentDate).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                              {item.referenceNo}
                            </td>
                            <td className="px-4 py-3 text-slate-900 max-w-[180px] truncate font-medium">
                              {item.payeeName}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                              <span
                                className={
                                  amt >= liveThreshold ? "text-amber-700" : ""
                                }
                              >
                                {formatEtb(item.amount)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {item.category ? (
                                <div>
                                  <span>
                                    {CATEGORY_LABELS[item.category as DisbursementCategory] || item.category}
                                  </span>
                                  {CATEGORY_LABELS_AM[item.category as DisbursementCategory] && (
                                    <span className="block text-[11px] text-slate-400">
                                      {CATEGORY_LABELS_AM[item.category as DisbursementCategory]}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <SmsBadge status={item.smsStatus} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                  <p>
                    {total} disbursement{total !== 1 ? "s" : ""} total · በድምሩ {total} ክፍያዎች
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded p-1 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="rounded p-1 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Detail side panel */}
          {selectedId && (
            <div className="w-96 shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <DisbursementDetailPanel
                id={selectedId}
                onClose={() => setSelectedId(null)}
                canRetry={isFinanceOrAdmin}
              />
            </div>
          )}

          {/* New Disbursement Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Record New Disbursement · አዲስ ክፍያ መዝግብ
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Payments ≥ ETB{" "}
                      {new Intl.NumberFormat("en-US").format(liveThreshold)} trigger
                      executive SMS alerts automatically. (ከብር {new Intl.NumberFormat("en-US").format(liveThreshold)} በላይ የሆኑ ክፍያዎች በSMS ይላካሉ።)
                    </p>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>
                <DisbursementForm
                  onSuccess={() => {
                    setShowForm(false);
                    setPage(1);
                    load();
                  }}
                  onCancel={() => setShowForm(false)}
                  smsThreshold={liveThreshold}
                  smsRecipientCount={liveRecipientCount}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
