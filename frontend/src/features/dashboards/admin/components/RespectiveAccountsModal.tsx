"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  UserX,
  Trash2,
  Ban,
  UserCheck,
  Users,
  RefreshCw,
  Loader2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import type { ApiUser } from "@/lib/adminApi";
import { normalizeUserRole, ROLE_LABELS } from "@/lib/authTypes";
import { createInvitedUser } from "@/lib/authApi";
import {
  getDetailedAccountStatus,
  removeDeletedUserId,
  removeCancelledUserId,
  type DetailedAccountStatus,
} from "@/lib/userAccountStatus";

interface RespectiveAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusType: "DEACTIVATED" | "DELETED" | "CANCELLED" | "ACTIVE" | "ALL" | null;
  users: ApiUser[];
  onToggleStatus?: (user: ApiUser) => void;
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

export function RespectiveAccountsModal({
  isOpen,
  onClose,
  statusType,
  users,
  onToggleStatus,
  onRefresh,
}: RespectiveAccountsModalProps) {
  const [workingUserId, setWorkingUserId] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  if (!isOpen || !statusType) return null;

  // Filter users matching the selected status
  const filteredUsers = users.filter((u) => {
    const s = getDetailedAccountStatus(u);
    if (statusType === "ACTIVE") return s === "ACTIVE";
    if (statusType === "DEACTIVATED") return s === "DEACTIVATED";
    if (statusType === "DELETED") return s === "DELETED";
    if (statusType === "CANCELLED") return s === "CANCELLED_INVITATION";
    return true;
  });

  const getHeaderInfo = () => {
    switch (statusType) {
      case "DEACTIVATED":
        return {
          title: "Deactivated User Accounts",
          description:
            "Registered accounts whose login access has been suspended or deactivated by an administrator.",
          icon: UserX,
          badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
          iconBg: "bg-rose-100 text-rose-700",
          directoryFilter: "Deactivated",
        };
      case "DELETED":
        return {
          title: "Deleted User Accounts",
          description:
            "Accounts that were deleted by an administrator and archived out of active system operations.",
          icon: Trash2,
          badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
          iconBg: "bg-rose-100 text-rose-700",
          directoryFilter: "Deleted",
        };
      case "CANCELLED":
        return {
          title: "Cancelled Account Invitations",
          description:
            "Pending invitation links that were revoked by an administrator before registration could complete.",
          icon: Ban,
          badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
          iconBg: "bg-amber-100 text-amber-700",
          directoryFilter: "Cancelled",
        };
      case "ACTIVE":
        return {
          title: "Active Access Accounts",
          description:
            "Accounts currently authorized to sign into the system and perform procurement tasks.",
          icon: UserCheck,
          badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
          iconBg: "bg-emerald-100 text-emerald-700",
          directoryFilter: "Active",
        };
      default:
        return {
          title: "All System Accounts",
          description: "All registered and provisioned accounts in the system.",
          icon: Users,
          badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
          iconBg: "bg-blue-100 text-blue-700",
          directoryFilter: "ALL",
        };
    }
  };

  const header = getHeaderInfo();
  const IconComponent = header.icon;

  const handleReinvite = async (user: ApiUser) => {
    setWorkingUserId(user.id);
    setSuccessNote(null);
    try {
      const role =
        (normalizeUserRole(user.authRole || user.role) as any) || "OFFICER";
      await createInvitedUser(
        user.displayName || user.name || user.email,
        user.email,
        role,
      );
      removeCancelledUserId(user.id);
      removeDeletedUserId(user.id);
      setSuccessNote(`Fresh invitation sent to ${user.email}!`);
      onRefresh?.();
    } catch {
      // Ignored
    } finally {
      setWorkingUserId(null);
    }
  };

  const handleRestoreOrActivate = async (user: ApiUser) => {
    setWorkingUserId(user.id);
    setSuccessNote(null);
    try {
      removeDeletedUserId(user.id);
      removeCancelledUserId(user.id);
      await onToggleStatus?.(user);
      setSuccessNote(
        `Account for ${user.displayName || user.name} has been restored!`,
      );
      onRefresh?.();
    } catch {
      // Ignored
    } finally {
      setWorkingUserId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0A3C2F] text-white p-5 sm:px-6 sm:py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 text-emerald-300">
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold tracking-tight truncate">
                  {header.title}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white shrink-0">
                  {filteredUsers.length}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5 truncate">
                {header.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Note Banner */}
        {successNote && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs font-semibold text-emerald-800 animate-in fade-in">
            {successNote}
          </div>
        )}

        {/* Accounts List Table */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <IconComponent className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                No accounts found in this category
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                There are currently no accounts matching the &quot;{header.title}&quot; criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">User Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const detailed = getDetailedAccountStatus(user);
                    const isWorking = workingUserId === user.id;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {user.displayName || user.name || "Unnamed"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                          {user.email}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {displayRole(user)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {detailed === "CANCELLED_INVITATION" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3 text-rose-500" />
                              <span>Cancelled</span>
                            </span>
                          )}
                          {detailed === "DELETED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <Trash2 className="w-3 h-3 text-rose-500" />
                              <span>Deleted</span>
                            </span>
                          )}
                          {detailed === "DEACTIVATED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <UserX className="w-3 h-3 text-slate-500" />
                              <span>Deactivated</span>
                            </span>
                          )}
                          {detailed === "ACTIVE" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Active</span>
                            </span>
                          )}
                          {detailed === "PENDING_INVITATION" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {detailed === "CANCELLED_INVITATION" ? (
                            <button
                              type="button"
                              disabled={isWorking}
                              onClick={() => handleReinvite(user)}
                              className="px-3 py-1 text-xs font-semibold rounded-full border border-[#0A3C2F] bg-[#ecfdf5] text-[#0A3C2F] hover:bg-[#d1fae5] transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isWorking ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                              <span>Re-invite</span>
                            </button>
                          ) : detailed === "DELETED" ||
                            detailed === "DEACTIVATED" ? (
                            <button
                              type="button"
                              disabled={isWorking}
                              onClick={() => handleRestoreOrActivate(user)}
                              className="px-3 py-1 text-xs font-semibold rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              {isWorking ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <UserCheck className="w-3 h-3" />
                              )}
                              <span>
                                {detailed === "DELETED" ? "Restore" : "Activate"}
                              </span>
                            </button>
                          ) : (
                            <span className="text-slate-400 font-medium">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 sm:px-6 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 font-medium">
            Showing {filteredUsers.length} accounts
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            <Link
              href={`/workspace/user-management?status=${header.directoryFilter}`}
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-[#0A3C2F] hover:bg-[#083025] text-white font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Manage in Directory</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
