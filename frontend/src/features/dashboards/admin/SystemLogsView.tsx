"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  fetchAuditLogs,
  type AuditLogEntry,
  type PaginatedResponse,
} from "@/lib/adminApi";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatChanges(
  changes: Record<string, unknown> | null,
  action?: string,
): string {
  if (!changes) return "—";

  const EXCLUDED_KEYS = new Set([
    "ip",
    "ipaddress",
    "useragent",
    "success",
    "tokenhash",
    "hash",
    "status",
    "createdby",
  ]);

  const filteredEntries = Object.entries(changes).filter(
    ([key]) => !EXCLUDED_KEYS.has(key.toLowerCase()),
  );

  if (filteredEntries.length === 0) {
    if (action === "LOGIN_SUCCEEDED") return "User signed in successfully";
    if (action === "LOGIN_FAILED") return "Failed sign-in attempt";
    if (action === "LOGOUT") return "User signed out";
    return "—";
  }

  return filteredEntries
    .map(([key, value]) => {
      const formattedKey = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
      const valStr =
        typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : String(value);
      return `${formattedKey}: ${valStr}`;
    })
    .join(" • ");
}

const PAGE_SIZE = 25;

export function SystemLogsView() {
  const [logsResponse, setLogsResponse] =
    useState<PaginatedResponse<AuditLogEntry> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const loadLogs = useCallback(async () => {
    try {
      const result = await fetchAuditLogs({
        page: currentPage,
        pageSize: PAGE_SIZE,
        search: searchQuery || undefined,
        action: selectedAction === "ALL" ? undefined : selectedAction,
      });
      setLogsResponse(result);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load audit logs.",
      );
    }
  }, [currentPage, searchQuery, selectedAction]);

  useEffect(() => {
    let active = true;

    fetchAuditLogs({
      page: currentPage,
      pageSize: PAGE_SIZE,
      search: searchQuery || undefined,
      action: selectedAction === "ALL" ? undefined : selectedAction,
    })
      .then((result) => {
        if (active) {
          if (result && Array.isArray(result.data)) {
            setLogsResponse(result);
          } else {
            setLogsResponse({
              data: [],
              meta: { total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 },
            });
          }
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Failed to load audit logs from database.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentPage, searchQuery, selectedAction]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleActionChange = (val: string) => {
    setSelectedAction(val);
    setCurrentPage(1);
  };

  const logs = logsResponse?.data ?? [];
  const meta = logsResponse?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
            System Audit Trail
          </h1>
          <p className="mt-1 text-sm text-[#64748b] font-medium">
            Complete history of user logins, role actions, package edits, and
            approvals.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a] tracking-tight">
              System Audit Log Trail
            </h2>
            <p className="mt-0.5 text-xs text-[#64748b] font-medium">
              Traceable timestamps and user activities across authentication and
              system operations
            </p>
          </div>

          {/* Search Bar & Action Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search logs, user, action..."
                className="bg-[#f8fafc] border border-[#e2e8f0] rounded-full pl-9 pr-4 py-2 text-xs text-[#0f172a] placeholder-slate-400 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all"
              />
            </div>

            <div className="relative w-full sm:w-auto">
              <select
                value={selectedAction}
                onChange={(e) => handleActionChange(e.target.value)}
                className="bg-[#f8fafc] border border-[#e2e8f0] rounded-full px-4 py-2 text-xs font-bold text-[#334155] focus:outline-none cursor-pointer w-full"
              >
                <option value="ALL">All Actions</option>
                <option value="LOGIN_SUCCEEDED">Login Succeeded</option>
                <option value="LOGIN_FAILED">Login Failed</option>
                <option value="LOGOUT">Logout</option>
                <option value="USER_INVITED">User Invited</option>
                <option value="PASSWORD_CHANGED">Password Changed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <span className="ml-2 text-sm font-medium text-slate-500">
              Loading audit logs…
            </span>
          </div>
        )}

        {/* Error State */}
        {!isLoading && loadError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm font-medium text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={loadLogs}
              className="px-4 py-2 text-xs font-bold rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Dark Emerald Header Table */}
        {!isLoading && !loadError && (
          <>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-[#04382c] text-white text-xs font-bold">
                      <th className="py-3.5 px-4 font-bold tracking-wide w-[220px]">
                        Timestamp
                      </th>
                      <th className="py-3.5 px-4 font-bold tracking-wide w-[180px]">
                        User & Details
                      </th>
                      <th className="py-3.5 px-4 font-bold tracking-wide w-[180px]">
                        Action
                      </th>
                      <th className="py-3.5 px-4 font-bold tracking-wide">
                        Details / Activity Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {logs.map((log, index) => {
                      const isOddRow = index % 2 === 0;

                      return (
                        <tr
                          key={log.id}
                          className={`border-b border-slate-100 transition-colors duration-150 hover:bg-[#f1f5f9] cursor-default ${
                            isOddRow ? "bg-[#f8fafc]/60" : "bg-white"
                          }`}
                        >
                          <td className="py-4 px-4 text-[#64748b] font-medium whitespace-nowrap align-middle">
                            {formatTimestamp(log.createdAt)}
                          </td>

                          <td className="py-4 px-4 font-bold text-[#0f172a] align-middle max-w-xs wrap-break-word">
                            <div>
                              <span className="wrap-break-word line-clamp-2">
                                {log.user?.name ?? "System"}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap align-middle">
                            <span className="text-[#044e3a] text-xs font-bold uppercase tracking-wider">
                              {log.action}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-[#334155] font-medium leading-relaxed align-middle wrap-break-word">
                            {formatChanges(log.changes, log.action)}
                          </td>
                        </tr>
                      );
                    })}

                    {logs.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 text-center text-xs text-slate-500 font-medium"
                        >
                          No audit log entries match your search or filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {meta && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium">
                  Showing{" "}
                  <span className="font-bold text-slate-700">
                    {meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1}
                    –{Math.min(meta.page * meta.pageSize, meta.total)}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-slate-700 font-bold">
                    {meta.total}
                  </span>{" "}
                  entries
                </p>
                {meta.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <span className="text-xs font-bold text-slate-600 min-w-[60px] text-center">
                      Page {meta.page} of {meta.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= meta.totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(meta.totalPages, p + 1))
                      }
                      className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
