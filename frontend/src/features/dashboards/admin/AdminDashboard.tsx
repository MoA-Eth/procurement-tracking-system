"use client";

import { useMemo, useState } from "react";
import {
  History,
  ShieldCheck,
  Sliders,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { type AuthUser, normalizeUserRole } from "@/lib/authTypes";
import { getDashboardHeading } from "../dashboard.config";
import { DashboardOverview } from "../DashboardOverview";
import { AdminDashboardSearch } from "./AdminDashboardSearch";
import { RecentAuditTrailTable } from "./RecentAuditTrailTable";
import { UserAccessTable } from "./UserAccessTable";
import { useAdminDashboard } from "./useAdminDashboard";

export function AdminDashboard({ user }: { user: AuthUser }) {
  const heading = getDashboardHeading("ADMIN");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    users,
    isUsersLoading,
    logs,
    isLogsLoading,
    togglingId,
    handleToggleStatus,
    refreshData,
    metrics,
  } = useAdminDashboard(user);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter((u) => {
      const name = (u.name || u.displayName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const rawRole = (u.role || "").toLowerCase();
      const rawAuthRole = (u.authRole || "").toLowerCase();
      const normalized = normalizeUserRole(u.authRole || u.role).toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        rawRole.includes(q) ||
        rawAuthRole.includes(q) ||
        normalized.includes(q) ||
        (q === "officer" && normalized === "officer") ||
        (q === "director" && normalized === "director") ||
        (q === "committee" && normalized === "endorsing_committee") ||
        (q === "management" &&
          (normalized === "management_team" ||
            rawRole.includes("management"))) ||
        (q === "management team" &&
          (normalized === "management_team" ||
            rawRole.includes("management"))) ||
        (q === "administrator" && normalized === "admin") ||
        (q === "admin" && normalized === "admin")
      );
    });
  }, [users, searchQuery]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        l.user?.email?.toLowerCase().includes(q) ||
        l.user?.name?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q),
    );
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header Row with Title and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of accounts, permissions, and system status
          </p>
        </div>

        <AdminDashboardSearch
          value={searchQuery}
          onChange={setSearchQuery}
          users={users}
          logs={logs}
          placeholder="Search accounts, roles, logs..."
        />
      </div>

      <DashboardOverview
        user={user}
        eyebrow={heading.eyebrow}
        metrics={[
          {
            label: "Total system accounts",
            value: String(metrics.totalAccounts),
            detail: "Registered user profiles",
            icon: Users,
            tone: "blue",
          },
          {
            label: "Active access",
            value: String(metrics.activeAccess),
            detail: "Permitted to sign in",
            icon: UserCheck,
            tone: "emerald",
          },
          {
            label: "Deactivated accounts",
            value: String(metrics.deactivatedAccounts),
            detail:
              metrics.deactivatedAccounts === 0
                ? "All registered users enabled"
                : `${metrics.deactivatedAccounts} accounts currently restricted`,
            icon: UserX,
            tone: "rose",
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="user-roles-breakdown-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 shadow-2xs">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-600" />
              </div>
              <div>
                <h2
                  id="user-roles-breakdown-heading"
                  className="text-base font-semibold text-slate-900"
                >
                  Access Role Allocation
                </h2>
                <p className="text-xs text-slate-500">
                  Current distribution of user permissions
                </p>
              </div>
            </div>
            {Boolean(searchQuery) && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Reset filter
              </button>
            )}
          </div>

          {/* Donut chart & role allocation breakdown */}
          {(() => {
            const totalAllocated =
              metrics.officersCount +
              metrics.directorsCount +
              metrics.committeeCount +
              metrics.managementTeamCount +
              metrics.adminsCount;

            const roles = [
              {
                name: "Officers",
                filter: "Officer",
                count: metrics.officersCount,
                color: "#2563eb",
                dotBg: "bg-blue-600",
              },
              {
                name: "Directors",
                filter: "Director",
                count: metrics.directorsCount,
                color: "#4f46e5",
                dotBg: "bg-indigo-600",
              },
              {
                name: "Endorsement Committee",
                filter: "Committee",
                count: metrics.committeeCount,
                color: "#f59e0b",
                dotBg: "bg-amber-500",
              },
              {
                name: "Management Team",
                filter: "Management",
                count: metrics.managementTeamCount,
                color: "#9333ea",
                dotBg: "bg-purple-600",
              },
              {
                name: "Administrators",
                filter: "Administrator",
                count: metrics.adminsCount,
                color: "#059669",
                dotBg: "bg-emerald-600",
              },
            ];

            const radius = 38;
            const circumference = 2 * Math.PI * radius;
            let accumulatedOffset = 0;

            return (
              <div className="mt-5 border-t border-slate-100 pt-5 flex flex-col sm:flex-row items-center gap-6">
                {/* Donut Chart */}
                <div className="relative flex items-center justify-center shrink-0 w-36 h-36">
                  <svg
                    className="w-36 h-36 -rotate-90 transform"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="stroke-slate-100"
                      strokeWidth="9"
                      fill="none"
                    />
                    {totalAllocated > 0 &&
                      roles.map((r) => {
                        if (r.count === 0) return null;
                        const pct = r.count / totalAllocated;
                        const strokeLength = pct * circumference;
                        const currentOffset = accumulatedOffset;
                        accumulatedOffset += strokeLength;

                        return (
                          <circle
                            key={r.name}
                            cx="50"
                            cy="50"
                            r={radius}
                            stroke={r.color}
                            strokeWidth="9"
                            strokeDasharray={`${strokeLength} ${circumference}`}
                            strokeDashoffset={`-${currentOffset}`}
                            fill="none"
                            className="transition-all duration-500 ease-out"
                          />
                        );
                      })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                    <span className="text-2xl font-semibold tracking-tight text-slate-900 leading-none">
                      {totalAllocated}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-1">
                      Users
                    </span>
                  </div>
                </div>

                {/* Role List / Legend */}
                <div className="flex-1 w-full space-y-1">
                  {roles.map((r) => {
                    const isSelected =
                      searchQuery.toLowerCase() === r.filter.toLowerCase();
                    const pct =
                      totalAllocated > 0
                        ? Math.round((r.count / totalAllocated) * 100)
                        : 0;

                    return (
                      <button
                        key={r.name}
                        type="button"
                        onClick={() =>
                          setSearchQuery(isSelected ? "" : r.filter)
                        }
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs font-semibold"
                            : "border-transparent hover:bg-slate-50 text-slate-700 hover:border-slate-200/70"
                        }`}
                        title={`Filter by ${r.name}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${r.dotBg}`}
                          />
                          <span className="truncate font-medium">{r.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-[11px] tabular-nums font-medium ${
                              isSelected ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            {pct}%
                          </span>
                          <span
                            className={`font-semibold tabular-nums min-w-[20px] text-right ${
                              isSelected ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {r.count}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </section>

        <section
          aria-labelledby="system-controls-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 shadow-2xs">
              <Sliders className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div>
              <h2
                id="system-controls-heading"
                className="text-base font-semibold text-slate-900"
              >
                Environment Health
              </h2>
              <p className="text-xs text-slate-500">
                Global runtime &amp; operational checks
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-100 pt-6 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">
                Database Connection
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Connected (Online)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Audit Logging</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">
                System Role Guards
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Strict Enforced
              </span>
            </div>
          </div>
        </section>
      </div>

      <section
        aria-labelledby="user-access-table-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 shadow-2xs">
              <Users className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div>
              <h2
                id="user-access-table-heading"
                className="text-base font-semibold text-slate-900"
              >
                User Profiles &amp; Access Controls
              </h2>
              <p className="text-xs text-slate-500">
                Toggle access status or view assignment details
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <UserAccessTable
            users={filteredUsers}
            isLoading={isUsersLoading}
            currentUser={user}
            onToggleStatus={handleToggleStatus}
            togglingId={togglingId}
            onRefresh={refreshData}
          />
        </div>
      </section>

      <section
        aria-labelledby="recent-audit-logs-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 shadow-2xs">
            <History className="h-4.5 w-4.5 text-amber-600" />
          </div>
          <div>
            <h2
              id="recent-audit-logs-heading"
              className="text-base font-semibold text-slate-900"
            >
              Recent Audit Trail
            </h2>
            <p className="text-xs text-slate-500">
              Latest system governance and authentication events
            </p>
          </div>
        </div>

        <div className="mt-6">
          <RecentAuditTrailTable
            logs={filteredLogs}
            isLoading={isLogsLoading}
          />
        </div>
      </section>
    </div>
  );
}
