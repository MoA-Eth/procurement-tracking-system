"use client";

import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import type { AuditLogEntry } from "@/lib/adminApi";

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

interface RecentAuditTrailTableProps {
  logs: AuditLogEntry[];
  isLoading?: boolean;
}

export function RecentAuditTrailTable({
  logs,
  isLoading,
}: RecentAuditTrailTableProps) {
  // Statically show recent 5 logs on main dashboard
  const recentLogs = logs.slice(0, 5);

  return (
    <div className="flex flex-col rounded-[20px] bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="bg-[#f8fafc] p-4 sm:px-6 sm:py-4.5 border-b border-slate-200/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
              System Audit Log Trail
            </h3>
          </div>
        </div>
        <Link
          href="/workspace/system-logs"
          className="text-[#047857] hover:text-[#065f46] font-bold text-xs flex items-center gap-1 shrink-0 transition-colors"
        >
          <span>Full Audit Logs</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          <span className="ml-2 text-xs font-medium text-slate-500">
            Loading audit logs…
          </span>
        </div>
      ) : (
        <div className="overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-[#f8fafc] text-[#334155] text-xs font-bold border-b border-slate-200/80">
                  <th className="py-3.5 px-4 font-bold tracking-wide w-[200px]">
                    Timestamp
                  </th>
                  <th className="py-3.5 px-4 font-bold tracking-wide w-[170px]">
                    User & Details
                  </th>
                  <th className="py-3.5 px-4 font-bold tracking-wide w-[170px]">
                    Action
                  </th>
                  <th className="py-3.5 px-4 font-bold tracking-wide">
                    Details / Activity Description
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {recentLogs.map((log, index) => {
                  const isOddRow = index % 2 === 0;

                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-slate-100 transition-colors duration-150 hover:bg-slate-50/80 cursor-default ${
                        isOddRow ? "bg-[#f8fafc]/60" : "bg-white"
                      }`}
                    >
                      <td className="py-3.5 px-4 text-[#64748b] font-medium whitespace-nowrap align-middle">
                        {formatTimestamp(log.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#0f172a] align-middle max-w-xs wrap-break-word">
                        <div>
                          <span className="wrap-break-word line-clamp-2">
                            {log.user?.name ?? "System"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                        <span className="text-[#044e3a] text-xs font-bold uppercase tracking-wider">
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#334155] font-medium leading-relaxed align-middle wrap-break-word">
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
                      No audit log records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
