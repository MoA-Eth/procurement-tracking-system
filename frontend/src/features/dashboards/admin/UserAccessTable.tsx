"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Loader2,
  RefreshCw,
  Trash2,
  Ban,
  UserCheck,
  UserX,
} from "lucide-react";
import { createInvitedUser, getCurrentUser } from "@/lib/authApi";
import type { ApiUser } from "@/lib/adminApi";
import {
  type AuthUser,
  type ProvisionableRole,
  normalizeUserRole,
  ROLE_LABELS,
} from "@/lib/authTypes";
import { UserProfileModal } from "./components/UserProfileModal";
import {
  getDetailedAccountStatus,
  removeCancelledUserId,
  removeDeletedUserId,
} from "@/lib/userAccountStatus";

interface UserAccessTableProps {
  users: ApiUser[];
  currentUser?: AuthUser | null;
  isLoading?: boolean;
  onToggleStatus?: (user: ApiUser) => void;
  togglingId?: string | null;
  onRefresh?: () => void;
  statusFilter?: "ALL" | "ACTIVE" | "DEACTIVATED" | "DELETED" | "CANCELLED";
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
  statusFilter = "ALL",
}: UserAccessTableProps) {
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [selectedModalUser, setSelectedModalUser] = useState<ApiUser | null>(
    null,
  );
  const effectiveCurrentUser = currentUser ?? getCurrentUser();

  // Show all matching users if filtered by a specific status, otherwise show top 5
  const displayedUsers = statusFilter !== "ALL" ? users : users.slice(0, 5);

  const handleResendOrReinvite = async (user: ApiUser) => {
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
      removeCancelledUserId(user.id);
      removeDeletedUserId(user.id);
      onRefresh?.();
    } catch {
      // Handle error gracefully
    } finally {
      setResendingId(null);
    }
  };

  const handleRestore = async (user: ApiUser) => {
    setRestoringId(user.id);
    try {
      removeDeletedUserId(user.id);
      removeCancelledUserId(user.id);
      await onToggleStatus?.(user);
      onRefresh?.();
    } catch {
      // Handle error gracefully
    } finally {
      setRestoringId(null);
    }
  };

  const directoryUrl =
    statusFilter && statusFilter !== "ALL"
      ? `/admin/users?status=${statusFilter}`
      : "/admin/users";

  return (
    <div className="flex flex-col rounded-[20px] bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="bg-[#ecfdf5]/70 p-4 sm:px-6 sm:py-4.5 border-b border-[#a7f3d0]/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-tight truncate">
              User Access &amp; Accounts Overview
            </h3>
          </div>
        </div>
        <Link
          href={directoryUrl}
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
                <tr className="bg-[#f8fafc] text-[#334155] text-xs font-semibold border-b border-slate-200/80">
                  <th className="py-3.5 px-4 font-semibold tracking-wide">
                    User Name &amp; Details
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
                {displayedUsers.map((user, index) => {
                  const detailedStatus = getDetailedAccountStatus(user);
                  const isActive = detailedStatus === "ACTIVE";
                  const isPending = detailedStatus === "PENDING_INVITATION";
                  const isCancelled = detailedStatus === "CANCELLED_INVITATION";
                  const isDeleted = detailedStatus === "DELETED";
                  const isDeactivated = detailedStatus === "DEACTIVATED";

                  const isOddRow = index % 2 === 0;
                  const isWorking =
                    togglingId === user.id ||
                    resendingId === user.id ||
                    restoringId === user.id;
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
                        <div className="font-semibold text-[#0f172a] text-xs flex items-center gap-1.5 flex-wrap">
                          <span>{user.displayName || user.name}</span>
                          {isSelf && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                              You
                            </span>
                          )}
                          {isCancelled && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                              Revoked
                            </span>
                          )}
                          {isDeleted && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                              Deleted
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
                        <span className={isCancelled || isDeleted ? "text-slate-400" : ""}>
                          {user.email}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 align-middle font-semibold text-[#0f172a]">
                        {displayRole(user)}
                      </td>

                      <td className="py-3.5 px-4 align-middle">
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <Ban className="w-3 h-3 text-rose-500" />
                            <span>Cancelled</span>
                          </span>
                        )}
                        {isDeleted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            <span>Deleted</span>
                          </span>
                        )}
                        {isDeactivated && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <UserX className="w-3 h-3 text-slate-500" />
                            <span>Deactivated</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Pending Invitation</span>
                          </span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                        {isCancelled ? (
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResendOrReinvite(user);
                            }}
                            className="px-3.5 py-1 text-xs font-semibold rounded-full border border-[#0A3C2F] bg-[#ecfdf5] text-[#0A3C2F] hover:bg-[#d1fae5] transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                            title="Send a fresh invitation link to this email"
                          >
                            {isWorking ? (
                              <Loader2 className="w-3 h-3 animate-spin inline" />
                            ) : (
                              <RefreshCw className="w-3 h-3 inline" />
                            )}
                            <span>
                              {isWorking ? "Re-inviting…" : "Re-invite"}
                            </span>
                          </button>
                        ) : isDeleted ? (
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(user);
                            }}
                            className="px-3.5 py-1 text-xs font-semibold rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                            title="Restore this account to active status"
                          >
                            {isWorking ? (
                              <Loader2 className="w-3 h-3 animate-spin inline" />
                            ) : (
                              <UserCheck className="w-3 h-3 inline" />
                            )}
                            <span>
                              {isWorking ? "Restoring…" : "Restore Account"}
                            </span>
                          </button>
                        ) : isPending ? (
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResendOrReinvite(user);
                            }}
                            className="px-3.5 py-1 text-xs font-semibold rounded-full border border-[#0A3C2F] bg-[#ecfdf5] text-[#0A3C2F] hover:bg-[#d1fae5] transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
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
                            className="px-3.5 py-1 text-xs font-semibold rounded-full border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60 shadow-none inline-flex items-center gap-1"
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
                            className={`px-3.5 py-1 text-xs font-semibold rounded-full border transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 ${
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

                {displayedUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-xs text-slate-500 font-medium"
                    >
                      No user accounts found matching this category.
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
