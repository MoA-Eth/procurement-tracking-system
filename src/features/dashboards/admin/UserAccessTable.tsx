"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { createInvitedUser, getCurrentUser } from "@/lib/authApi";
import type { ApiUser } from "@/lib/adminApi";
import {
  type AuthUser,
  type ProvisionableRole,
  normalizeUserRole,
  ROLE_LABELS,
} from "@/lib/authTypes";

interface UserAccessTableProps {
  users: ApiUser[];
  currentUser?: AuthUser | null;
  isLoading?: boolean;
  onToggleStatus?: (user: ApiUser) => void;
  togglingId?: string | null;
  onRefresh?: () => void;
}

const PRISMA_ROLE_LABELS: Record<string, string> = {
  ProcurementOfficer: "Officer",
  ProcurementDirector: "Director",
  Administrator: "Administrator",
  EndorsingCommittee: "Endorsement Committee",
  ManagementTeam: "Management",
  ProjectManager: "Project Manager",
};

function displayRole(user: ApiUser): string {
  const normalized = normalizeUserRole(user.authRole || user.role);
  return (
    ROLE_LABELS[normalized] ??
    PRISMA_ROLE_LABELS[user.role] ??
    user.authRole ??
    user.role ??
    "Unknown"
  );
}

function displayStatus(
  user: ApiUser,
): "Active" | "Inactive" | "Pending Invitation" {
  if (user.status === "PENDING_INVITATION") return "Pending Invitation";
  return user.isActive ? "Active" : "Inactive";
}

function isCurrentUser(u: ApiUser, current?: AuthUser | null): boolean {
  if (!current) return false;
  if (current.id && u.id && current.id === u.id) return true;
  if (
    current.email &&
    u.email &&
    current.email.toLowerCase().trim() === u.email.toLowerCase().trim()
  )
    return true;
  if (
    current.username &&
    u.username &&
    current.username.toLowerCase().trim() === u.username.toLowerCase().trim()
  )
    return true;
  return false;
}

export function UserAccessTable({
  users,
  currentUser,
  isLoading,
  onToggleStatus,
  togglingId,
  onRefresh,
}: UserAccessTableProps) {
  const [resendingId, setResendingId] = useState<string | null>(null);
  const effectiveCurrentUser = currentUser ?? getCurrentUser();

  // Show recent 5 users on main dashboard
  const recentUsers = users.slice(0, 5);

  const handleResend = async (user: ApiUser) => {
    setResendingId(user.id);
    const role =
      (normalizeUserRole(user.authRole || user.role) as ProvisionableRole) ||
      "OFFICER";
    try {
      await createInvitedUser(
        user.displayName || user.name || user.email,
        user.email,
        role,
      );
      onRefresh?.();
    } catch {
      // Handle error gracefully
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="flex flex-col rounded-[20px] bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="bg-[#ecfdf5]/70 p-4 sm:px-6 sm:py-4.5 border-b border-[#a7f3d0]/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-tight truncate">
              User Access & Accounts Overview
            </h3>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="text-[#006837] hover:text-[#00552c] font-semibold text-xs flex items-center gap-1 shrink-0 transition-colors"
        >
          <span>Full Directory</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          <span className="ml-2 text-xs font-medium text-slate-500">
            Loading user accounts…
          </span>
        </div>
      ) : (
        <div className="overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-[#0A3C2F] text-white text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold tracking-wide">
                    User Name & Details
                  </th>
                  <th className="py-3.5 px-4 font-semibold tracking-wide">
                    Email Address
                  </th>
                  <th className="py-3.5 px-4 font-semibold tracking-wide">
                    Assigned Role
                  </th>
                  <th className="py-3.5 px-4 font-semibold tracking-wide">
                    Account Status
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-center tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {recentUsers.map((user, index) => {
                  const status = displayStatus(user);
                  const isActive = status === "Active";
                  const isPending = status === "Pending Invitation";
                  const isOddRow = index % 2 === 0;
                  const isWorking =
                    togglingId === user.id || resendingId === user.id;
                  const isSelf = isCurrentUser(user, effectiveCurrentUser);

                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-slate-100 transition-colors duration-150 hover:bg-slate-50/80 ${
                        isOddRow ? "bg-[#f8fafc]/60" : "bg-white"
                      }`}
                    >
                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-semibold text-[#0f172a] text-xs flex items-center gap-1.5">
                          <span>{user.displayName || user.name}</span>
                          {isSelf && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                              You
                            </span>
                          )}
                        </div>
                        {user.username && (
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            @{user.username}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#475569] font-normal align-middle">
                        {user.email}
                      </td>

                      <td className="py-3.5 px-4 align-middle font-semibold text-[#0f172a]">
                        {displayRole(user)}
                      </td>

                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap ${
                            isPending
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : isActive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                        {isPending ? (
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => handleResend(user)}
                            className="px-3 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-[#0A3C2F] hover:border-slate-300 transition-all cursor-pointer shadow-2xs disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            {isWorking ? (
                              <Loader2 className="w-3 h-3 animate-spin inline" />
                            ) : (
                              <RefreshCw className="w-3 h-3 text-slate-500 inline" />
                            )}
                            <span>
                              {isWorking ? "Resending…" : "Resend Invitation"}
                            </span>
                          </button>
                        ) : isSelf && isActive ? (
                          <button
                            type="button"
                            disabled={true}
                            title="You cannot deactivate your own administrator account."
                            className="px-3 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed shadow-none inline-flex items-center gap-1"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => onToggleStatus?.(user)}
                            className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer shadow-2xs disabled:opacity-50 ${
                              isActive
                                ? "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                            }`}
                          >
                            {isWorking ? (
                              <Loader2 className="w-3 h-3 animate-spin inline" />
                            ) : isActive ? (
                              "Deactivate"
                            ) : (
                              "Activate"
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-xs text-slate-500 font-medium"
                    >
                      No user accounts found.
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
