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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
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
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 shadow-2xs">
              <ShieldCheck className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <div>
              <h2
                id="user-roles-breakdown-heading"
                className="text-base font-bold text-slate-900"
              >
                Access Role Allocation
              </h2>
              <p className="text-xs text-slate-500">
                Current distribution of user permissions
              </p>
            </div>
          </div>

          {/* Distribution bar across all 4 roles */}
          {(() => {
            const totalAllocated =
              metrics.officersCount +
              metrics.directorsCount +
              metrics.committeeCount +
              metrics.adminsCount;

            return (
              <>
                {totalAllocated > 0 && (
                  <div className="mt-4 h-2 w-full rounded-full bg-slate-100 flex overflow-hidden">
                    <div
                      style={{
                        width: `${(metrics.officersCount / totalAllocated) * 100}%`,
                      }}
                      className="bg-blue-600 h-full transition-all"
                      title={`Officers: ${metrics.officersCount}`}
                    />
                    <div
                      style={{
                        width: `${(metrics.directorsCount / totalAllocated) * 100}%`,
                      }}
                      className="bg-indigo-600 h-full transition-all"
                      title={`Directors: ${metrics.directorsCount}`}
                    />
                    <div
                      style={{
                        width: `${(metrics.committeeCount / totalAllocated) * 100}%`,
                      }}
                      className="bg-amber-500 h-full transition-all"
                      title={`Committee: ${metrics.committeeCount}`}
                    />
                    <div
                      style={{
                        width: `${(metrics.adminsCount / totalAllocated) * 100}%`,
                      }}
                      className="bg-emerald-600 h-full transition-all"
                      title={`Administrators: ${metrics.adminsCount}`}
                    />
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 pt-5 text-center">
                  {/* 1. Officers */}
                  <button
                    type="button"
                    onClick={() =>
                      setSearchQuery(
                        searchQuery.toLowerCase() === "officer" ? "" : "Officer",
                      )
                    }
                    className={`rounded-xl p-3 transition-all text-center cursor-pointer border ${
                      searchQuery.toLowerCase() === "officer"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10"
                        : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs"
                    }`}
                    title="Filter table by Officers"
                  >
                    <p
                      className={`text-2xl font-bold ${
                        searchQuery.toLowerCase() === "officer"
                          ? "text-white"
                          : "text-slate-900"
                      }`}
                    >
                      {metrics.officersCount}
                    </p>
                    <p
                      className={`text-xs font-semibold mt-0.5 flex items-center justify-center gap-1.5 ${
                        searchQuery.toLowerCase() === "officer"
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                      Officers
                    </p>
                  </button>

                  {/* 2. Directors */}
                  <button
                    type="button"
                    onClick={() =>
                      setSearchQuery(
                        searchQuery.toLowerCase() === "director" ? "" : "Director",
                      )
                    }
                    className={`rounded-xl p-3 transition-all text-center cursor-pointer border ${
                      searchQuery.toLowerCase() === "director"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10"
                        : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs"
                    }`}
                    title="Filter table by Directors"
                  >
                    <p
                      className={`text-2xl font-bold ${
                        searchQuery.toLowerCase() === "director"
                          ? "text-white"
                          : "text-slate-900"
                      }`}
                    >
                      {metrics.directorsCount}
                    </p>
                    <p
                      className={`text-xs font-semibold mt-0.5 flex items-center justify-center gap-1.5 ${
                        searchQuery.toLowerCase() === "director"
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      Directors
                    </p>
                  </button>

                  {/* 3. Endorsement Committee */}
                  <button
                    type="button"
                    onClick={() =>
                      setSearchQuery(
                        searchQuery.toLowerCase() === "committee"
                          ? ""
                          : "Committee",
                      )
                    }
                    className={`rounded-xl p-3 transition-all text-center cursor-pointer border ${
                      searchQuery.toLowerCase() === "committee"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10"
                        : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs"
                    }`}
                    title="Filter table by Committee"
                  >
                    <p
                      className={`text-2xl font-bold ${
                        searchQuery.toLowerCase() === "committee"
                          ? "text-white"
                          : "text-slate-900"
                      }`}
                    >
                      {metrics.committeeCount}
                    </p>
                    <p
                      className={`text-xs font-semibold mt-0.5 flex items-center justify-center gap-1.5 ${
                        searchQuery.toLowerCase() === "committee"
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      Committee
                    </p>
                  </button>

                  {/* 4. Administrators */}
                  <button
                    type="button"
                    onClick={() =>
                      setSearchQuery(
                        searchQuery.toLowerCase() === "administrator"
                          ? ""
                          : "Administrator",
                      )
                    }
                    className={`rounded-xl p-3 transition-all text-center cursor-pointer border ${
                      searchQuery.toLowerCase() === "administrator"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10"
                        : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs"
                    }`}
                    title="Filter table by Administrators"
                  >
                    <p
                      className={`text-2xl font-bold ${
                        searchQuery.toLowerCase() === "administrator"
                          ? "text-white"
                          : "text-slate-900"
                      }`}
                    >
                      {metrics.adminsCount}
                    </p>
                    <p
                      className={`text-xs font-semibold mt-0.5 flex items-center justify-center gap-1.5 ${
                        searchQuery.toLowerCase() === "administrator"
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      Administrators
                    </p>
                  </button>
                </div>
              </>
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
                className="text-base font-bold text-slate-900"
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
              <span className="text-slate-600 font-medium">Database Connection</span>
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
              <span className="text-slate-600 font-medium">System Role Guards</span>
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
                className="text-base font-bold text-slate-900"
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
              className="text-base font-bold text-slate-900"
            >
              Recent Audit Trail
            </h2>
            <p className="text-xs text-slate-500">
              Latest system governance and authentication events
            </p>
          </div>
        </div>

        <div className="mt-6">
          <RecentAuditTrailTable logs={filteredLogs} isLoading={isLogsLoading} />
        </div>
      </section>
    </div>
  );
}
