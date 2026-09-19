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
import { UserProfileModal } from "./components/UserProfileModal";

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
  const [selectedModalUser, setSelectedModalUser] = useState<ApiUser | null>(
    null,
  );
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
            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
              User Access & Accounts Overview
            </h3>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="text-[#047857] hover:text-[#065f46] font-bold text-xs flex items-center gap-1 shrink-0 transition-colors"
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
                <tr className="bg-[#f8fafc] text-[#334155] text-xs font-bold border-b border-slate-200/80">
                  <th className="py-3.5 px-4 font-bold tracking-wide">
                    User Name & Details
                  </th>
                  <th className="py-3.5 px-4 font-bold tracking-wide">
                    Email Address
                  </th>
                  <th className="py-3.5 px-4 font-bold tracking-wide">
                    Assigned Role
                  </th>
                  <th className="py-3.5 px-4 font-bold tracking-wide">
                    Account Status
                  </th>
                  <th className="py-3.5 px-4 font-bold text-center tracking-wide">
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
                      onClick={() => setSelectedModalUser(user)}
                      className={`border-b border-slate-100 transition-colors duration-150 hover:bg-emerald-50/50 cursor-pointer ${
                        isOddRow ? "bg-[#f8fafc]/60" : "bg-white"
                      }`}
                      title={`Click to view profile & details for ${user.displayName || user.name}`}
                    >
                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-bold text-[#0f172a] text-xs flex items-center gap-1.5">
                          <span>{user.displayName || user.name}</span>
                          {isSelf && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
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

                      <td className="py-3.5 px-4 align-middle font-bold text-[#0f172a]">
                        {displayRole(user)}
                      </td>

                      <td className="py-3.5 px-4 align-middle">
                        <span
                          className={`text-xs font-bold ${
                            isPending
                              ? "text-[#b06000]"
                              : isActive
                                ? "text-[#137333]"
                                : "text-[#c5221f]"
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResend(user);
                            }}
                            className="px-3.5 py-1 text-xs font-bold rounded-full border border-[#047857] bg-[#ecfdf5] text-[#044e3a] hover:bg-[#d1fae5] transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            {isWorking ? (
                              <Loader2 className="w-3 h-3 animate-spin inline" />
                            ) : (
                              <RefreshCw className="w-3 h-3 inline" />
                            )}
                            <span>
                              {isWorking ? "Resending…" : "Resend Invitation"}
                            </span>
                          </button>
                        ) : isSelf && isActive ? (
                          <button
                            type="button"
                            disabled={true}
                            onClick={(e) => e.stopPropagation()}
                            title="You cannot deactivate your own administrator account."
                            className="px-3.5 py-1 text-xs font-bold rounded-full border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60 shadow-none inline-flex items-center gap-1"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStatus?.(user);
                            }}
                            className={`px-3.5 py-1 text-xs font-bold rounded-full border transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 ${
                              isActive
                                ? "border-rose-200/90 bg-rose-50/90 text-rose-700 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800"
                                : "border-blue-200/90 bg-blue-50/90 text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-800"
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

      {/* ─── User Profile & Protected Role Change Modal ─────────────── */}
      {selectedModalUser && (
        <UserProfileModal
          user={selectedModalUser}
          isOpen={Boolean(selectedModalUser)}
          onClose={() => setSelectedModalUser(null)}
          onUserUpdated={() => {
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
