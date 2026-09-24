"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Mail,
  Info,
  Send,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  X,
  Shield,
  Trash2,
  Pencil,
  XCircle,
  AlertTriangle,
  Ban,
  UserX,
  UserCheck,
} from "lucide-react";
import { createInvitedUser, getCurrentUser } from "@/lib/authApi";
import { UserProfileModal } from "./components/UserProfileModal";
import {
  fetchUsers,
  updateUser,
  deleteUser,
  type ApiUser,
  type PaginatedResponse,
} from "@/lib/adminApi";
import {
  type AuthUser,
  type ProvisionableRole,
  normalizeUserRole,
  ROLE_LABELS,
} from "@/lib/authTypes";
import {
  getDetailedAccountStatus,
  getCancelledUserIds,
  getDeletedUserIds,
  addCancelledUserId,
  removeCancelledUserId,
  addDeletedUserId,
  removeDeletedUserId,
} from "@/lib/userAccountStatus";

interface UserManagementViewProps {
  initialMode?: "list" | "invite";
  currentUser?: AuthUser | null;
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
  cancelledIds?: Set<string>,
  deletedIds?: Set<string>,
):
  | "Active"
  | "Deactivated"
  | "Deleted"
  | "Pending Invitation"
  | "Invitation Cancelled" {
  const status = getDetailedAccountStatus(user, cancelledIds, deletedIds);
  if (status === "CANCELLED_INVITATION") return "Invitation Cancelled";
  if (status === "DELETED") return "Deleted";
  if (status === "PENDING_INVITATION") return "Pending Invitation";
  if (status === "ACTIVE") return "Active";
  return "Deactivated";
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

function renderLastLogin(lastLoginAt: string | null, status: string) {
  if (status === "PENDING_INVITATION") {
    return (
      <span className="text-[#64748b] font-medium whitespace-nowrap">
        Awaiting Registration
      </span>
    );
  }
  if (!lastLoginAt) {
    return (
      <span className="text-[#64748b] font-medium whitespace-nowrap">
        Never
      </span>
    );
  }
  return (
    <span className="text-[#64748b] font-medium whitespace-nowrap">
      {new Date(lastLoginAt).toLocaleString()}
    </span>
  );
}

const PAGE_SIZE = 15;

const DEFAULT_USERS_RESPONSE: PaginatedResponse<ApiUser> = {
  data: [
    {
      id: "u-off-1",
      username: "officer@moa.gov.et",
      displayName: "Abebe Bikila",
      email: "officer@moa.gov.et",
      name: "Abebe Bikila",
      role: "ProcurementOfficer",
      authRole: "OFFICER",
      status: "ACTIVE",
      isActive: true,
      lastLoginAt: "2026-08-26T09:30:00Z",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-08-26T09:30:00Z",
    },
    {
      id: "u-dir-1",
      username: "director@moa.gov.et",
      displayName: "Dr. Aster Kebede",
      email: "director@moa.gov.et",
      name: "Dr. Aster Kebede",
      role: "ProcurementDirector",
      authRole: "DIRECTOR",
      status: "ACTIVE",
      isActive: true,
      lastLoginAt: "2026-08-26T10:15:00Z",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-08-26T10:15:00Z",
    },
    {
      id: "u-com-1",
      username: "genet@moa.gov.et",
      displayName: "Genet Tadesse",
      email: "genet@moa.gov.et",
      name: "Genet Tadesse",
      role: "ManagementTeam",
      authRole: "MANAGEMENT",
      status: "ACTIVE",
      isActive: true,
      lastLoginAt: "2026-08-26T11:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-08-26T11:00:00Z",
    },
    {
      id: "u-adm-1",
      username: "admin@moa.gov.et",
      displayName: "Tewodros Kassahun",
      email: "admin@moa.gov.et",
      name: "Tewodros Kassahun",
      role: "Administrator",
      authRole: "ADMIN",
      status: "ACTIVE",
      isActive: true,
      lastLoginAt: "2026-08-26T12:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-08-26T12:00:00Z",
    },
    {
      id: "u-off-2",
      username: "marta@moa.gov.et",
      displayName: "Marta Tadesse",
      email: "marta@moa.gov.et",
      name: "Marta Tadesse",
      role: "ProcurementOfficer",
      authRole: "OFFICER",
      status: "PENDING_INVITATION",
      isActive: true,
      lastLoginAt: null,
      createdAt: "2026-08-24T00:00:00Z",
      updatedAt: "2026-08-24T00:00:00Z",
    },
  ],
  meta: { total: 5, page: 1, pageSize: 15, totalPages: 1 },
};

export function UserManagementView({
  initialMode = "list",
  currentUser,
}: UserManagementViewProps) {
  const [viewMode, setViewMode] = useState<"list" | "invite">(initialMode);
  const [storedUser] = useState<AuthUser | null>(() =>
    typeof window !== "undefined" ? getCurrentUser() : null,
  );
  const activeUser = currentUser ?? storedUser;

  // Data state
  const [usersResponse, setUsersResponse] =
    useState<PaginatedResponse<ApiUser> | null>(DEFAULT_USERS_RESPONSE);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const param = new URLSearchParams(window.location.search).get("status");
        if (param) return param;
      } catch {}
    }
    return "Active";
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Invite Form State
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProvisionableRole>("OFFICER");
  const [isInviting, setIsInviting] = useState(false);
  const [invitedInfo, setInvitedInfo] = useState<{
    email: string;
    role: string;
    isResend?: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Action state (toggling status or resending invitation)
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  // User Profile / Details Modal State
  const [selectedDetailUser, setSelectedDetailUser] = useState<ApiUser | null>(
    null,
  );
  const [roleSuccessMessage, setRoleSuccessMessage] = useState<string | null>(
    null,
  );

  // Confirmation Modal state (Deactivate, Activate, Delete, Cancel Invitation)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "deactivate" | "activate" | "delete" | "cancel_invitation";
    user: ApiUser;
  } | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [confirmModalError, setConfirmModalError] = useState<string | null>(null);

  // Change Email Modal state
  const [changeEmailModal, setChangeEmailModal] = useState<{
    isOpen: boolean;
    user: ApiUser;
    email: string;
  } | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState<string | null>(null);

  // Action Success Banner
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(
    null,
  );

  // Cancelled and deleted user IDs tracked for active session & storage
  const [cancelledUserIds, setCancelledUserIds] = useState<Set<string>>(() =>
    getCancelledUserIds(),
  );
  const [deletedUserIds, setDeletedUserIds] = useState<Set<string>>(() =>
    getDeletedUserIds(),
  );

  useEffect(() => {
    const handleStatusChanged = () => {
      setCancelledUserIds(getCancelledUserIds());
      setDeletedUserIds(getDeletedUserIds());
    };
    window.addEventListener("pts:account-status-changed", handleStatusChanged);
    return () =>
      window.removeEventListener("pts:account-status-changed", handleStatusChanged);
  }, []);

  // Floating Toast Notification state
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!toastNotification) return;
    const t = setTimeout(() => setToastNotification(null), 8000);
    return () => clearTimeout(t);
  }, [toastNotification]);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ href?: string }>;
      if (
        !customEvent.detail?.href ||
        customEvent.detail.href === "/workspace/user-management"
      ) {
        setViewMode("list");
        setInvitedInfo(null);
        setErrorMessage(null);
      }
    };

    window.addEventListener("pts:sidebar-reset", handleReset);
    return () => window.removeEventListener("pts:sidebar-reset", handleReset);
  }, []);

  // ─── Fetch Users ────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    try {
      const roleFilterMap: Record<string, string | undefined> = {
        ALL: undefined,
        OFFICER: "ProcurementOfficer",
        DIRECTOR: "ProcurementDirector",
        ENDORSING_COMMITTEE: "EndorsingCommittee",
        MANAGEMENT: "ManagementTeam",
        ADMIN: "Administrator",
      };

      const result = await fetchUsers({
        page: currentPage,
        pageSize: PAGE_SIZE,
        search: searchQuery || undefined,
        role: roleFilterMap[selectedRole],
        isActive:
          selectedStatus === "Active"
            ? true
            : undefined,
      });
      setUsersResponse((prev) => {
        if (!prev) return result;
        // Keep any users from prev that are in cancelledUserIds so the user can immediately observe the "Invitation Cancelled" indication
        const cancelledInPrev = prev.data.filter((u) => cancelledUserIds.has(u.id));
        const newIds = new Set(result.data.map((u) => u.id));
        const toKeep = cancelledInPrev.filter((u) => !newIds.has(u.id));
        return {
          ...result,
          data: [...result.data, ...toKeep],
        };
      });
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load users.",
      );
    }
  }, [currentPage, searchQuery, selectedRole, selectedStatus, cancelledUserIds, deletedUserIds]);

  useEffect(() => {
    let active = true;

    const roleFilterMap: Record<string, string | undefined> = {
      ALL: undefined,
      OFFICER: "ProcurementOfficer",
      DIRECTOR: "ProcurementDirector",
      ENDORSING_COMMITTEE: "EndorsingCommittee",
      MANAGEMENT: "ManagementTeam",
      ADMIN: "Administrator",
    };

    fetchUsers({
      page: currentPage,
      pageSize: PAGE_SIZE,
      search: searchQuery || undefined,
      role: roleFilterMap[selectedRole],
      isActive:
        selectedStatus === "Active"
          ? true
          : undefined,
    })
      .then((result) => {
        if (active) {
          if (result && Array.isArray(result.data)) {
            setUsersResponse((prev) => {
              if (!prev) return result;
              const cancelledInPrev = prev.data.filter((u) => cancelledUserIds.has(u.id));
              const newIds = new Set(result.data.map((u) => u.id));
              const toKeep = cancelledInPrev.filter((u) => !newIds.has(u.id));
              return {
                ...result,
                data: [...result.data, ...toKeep],
              };
            });
          } else {
            setUsersResponse({
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
              : "Failed to load users from database.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentPage, searchQuery, selectedRole, selectedStatus, cancelledUserIds]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleRoleChange = (val: string) => {
    setSelectedRole(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val);
    setCurrentPage(1);
  };

  // ─── Modal Actions Handlers ─────────────────────────────────────────────
  const openConfirmModal = (
    type: "deactivate" | "activate" | "delete" | "cancel_invitation",
    user: ApiUser,
  ) => {
    if (type === "deactivate" && isCurrentUser(user, activeUser)) {
      setErrorMessage("You cannot deactivate your own administrator account.");
      return;
    }
    if (type === "delete" && isCurrentUser(user, activeUser)) {
      setErrorMessage("You cannot delete your own administrator account.");
      return;
    }
    setErrorMessage(null);
    setConfirmModalError(null);
    setConfirmModal({ isOpen: true, type, user });
  };

  const handleExecuteConfirmAction = async () => {
    if (!confirmModal) return;
    const { type, user } = confirmModal;
    setIsConfirmingAction(true);
    setErrorMessage(null);
    setConfirmModalError(null);

    try {
      if (type === "deactivate" || type === "activate") {
        await updateUser(user.id, { isActive: !user.isActive });
        if (type === "activate") {
          removeDeletedUserId(user.id);
          removeCancelledUserId(user.id);
        }
        setActionSuccessMessage(
          type === "deactivate"
            ? `Account for ${user.displayName || user.name} has been deactivated.`
            : `Account for ${user.displayName || user.name} has been reactivated.`,
        );
      } else if (type === "delete") {
        await deleteUser(user.id);
        addDeletedUserId(user.id);
        setActionSuccessMessage(
          `Account for ${user.displayName || user.name} has been deleted and moved to Deleted accounts.`,
        );
      } else if (type === "cancel_invitation") {
        await deleteUser(user.id);
        addCancelledUserId(user.id);

        setToastNotification({
          id: Date.now().toString(),
          title: "Account Invitation Cancelled",
          message: `The pending invitation sent to ${user.email} has been cancelled and its link invalidated.`,
        });

        setActionSuccessMessage(
          `Account invitation for ${user.email} was cancelled and the registration link has been invalidated.`,
        );
      }

      // Optimistically update local directory table state immediately
      setUsersResponse((prev) => {
        if (!prev) return prev;
        if (type === "cancel_invitation") {
          return {
            ...prev,
            data: prev.data.map((u) =>
              u.id === user.id
                ? {
                    ...u,
                    isActive: false,
                    status: "PENDING_INVITATION",
                  }
                : u,
            ),
          };
        }
        if (type === "delete" || type === "deactivate") {
          return {
            ...prev,
            data: prev.data.map((u) =>
              u.id === user.id ? { ...u, isActive: false, status: "INACTIVE" } : u,
            ),
          };
        }
        if (type === "activate") {
          return {
            ...prev,
            data: prev.data.map((u) =>
              u.id === user.id ? { ...u, isActive: true, status: "ACTIVE" } : u,
            ),
          };
        }
        return prev;
      });

      // Always close modal upon execution
      setConfirmModal(null);
      setConfirmModalError(null);
      await loadUsers();
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : "Failed to complete the requested action.";
      setConfirmModalError(errMsg);
      setErrorMessage(errMsg);
    } finally {
      setIsConfirmingAction(false);
    }
  };

  const openChangeEmailModal = (user: ApiUser) => {
    setChangeEmailError(null);
    setChangeEmailModal({
      isOpen: true,
      user,
      email: user.email,
    });
  };

  const handleSaveNewEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeEmailModal) return;
    const newEmail = changeEmailModal.email.trim().toLowerCase();
    if (!newEmail || !newEmail.includes("@")) {
      setChangeEmailError("Please provide a valid email address.");
      return;
    }
    if (newEmail === changeEmailModal.user.email.toLowerCase()) {
      setChangeEmailModal(null);
      return;
    }
    setIsUpdatingEmail(true);
    setChangeEmailError(null);

    try {
      await updateUser(changeEmailModal.user.id, { email: newEmail });
      setActionSuccessMessage(
        `Email address for ${changeEmailModal.user.displayName || changeEmailModal.user.name} was successfully changed to ${newEmail}.`,
      );
      // Optimistically update email in table state
      setUsersResponse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((u) =>
            u.id === changeEmailModal.user.id ? { ...u, email: newEmail } : u,
          ),
        };
      });
      setChangeEmailModal(null);
      await loadUsers();
    } catch (err) {
      setChangeEmailError(
        err instanceof Error ? err.message : "Failed to update email address.",
      );
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // ─── Resend Invitation ──────────────────────────────────────────────────
  const handleResendInvitation = async (user: ApiUser) => {
    setActionUserId(user.id);
    setErrorMessage(null);
    setInvitedInfo(null);

    const role =
      (normalizeUserRole(user.authRole || user.role) as ProvisionableRole) ||
      "OFFICER";

    try {
      await createInvitedUser(
        user.displayName || user.name || user.email,
        user.email,
        role,
      );

      // Remove from cancelled & deleted IDs if it was previously cancelled or deleted
      removeCancelledUserId(user.id);
      removeDeletedUserId(user.id);

      setInvitedInfo({ email: user.email, role, isResend: true });
      await loadUsers();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to resend invitation email.",
      );
    } finally {
      setActionUserId(null);
    }
  };

  // ─── Submit Invitation Form ──────────────────────────────────────────────
  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteFullName.trim() || !inviteEmail.trim()) return;

    setIsInviting(true);
    setErrorMessage(null);
    setInvitedInfo(null);

    const targetEmail = inviteEmail.trim().toLowerCase();
    const targetRole = inviteRole;

    try {
      await createInvitedUser(inviteFullName.trim(), targetEmail, targetRole);

      // Remove matching user from cancelled and deleted sets if previously there
      users.forEach((u) => {
        if (u.email.toLowerCase() === targetEmail) {
          removeCancelledUserId(u.id);
          removeDeletedUserId(u.id);
        }
      });

      setInvitedInfo({ email: targetEmail, role: targetRole, isResend: false });

      // Reset form fields
      setInviteFullName("");
      setInviteEmail("");
      setInviteRole("OFFICER");

      await loadUsers();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to send user invitation.",
      );
    } finally {
      setIsInviting(false);
    }
  };

  // Auto-dismiss role success notification after 10 seconds
  useEffect(() => {
    if (!roleSuccessMessage) return;
    const timer = setTimeout(() => {
      setRoleSuccessMessage(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [roleSuccessMessage]);

  // Auto-dismiss action success notification after 10 seconds
  useEffect(() => {
    if (!actionSuccessMessage) return;
    const timer = setTimeout(() => {
      setActionSuccessMessage(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [actionSuccessMessage]);

  // Auto-dismiss success notification after 15 seconds
  useEffect(() => {
    if (!invitedInfo) return;
    const timer = setTimeout(() => {
      setInvitedInfo(null);
    }, 15000);
    return () => clearTimeout(timer);
  }, [invitedInfo]);

  const rawUsers = usersResponse?.data ?? [];
  const users = rawUsers.filter((u) => {
    if (selectedStatus === "ALL") return true;
    const detailed = getDetailedAccountStatus(u, cancelledUserIds, deletedUserIds);
    if (selectedStatus === "Active")
      return detailed === "ACTIVE" || detailed === "PENDING_INVITATION";
    if (selectedStatus === "Deactivated") return detailed === "DEACTIVATED";
    if (selectedStatus === "Deleted") return detailed === "DELETED";
    if (selectedStatus === "Cancelled")
      return detailed === "CANCELLED_INVITATION";
    if (selectedStatus === "Inactive")
      return (
        detailed === "DEACTIVATED" ||
        detailed === "DELETED" ||
        detailed === "CANCELLED_INVITATION"
      );
    return true;
  });
  const meta = usersResponse?.meta;

  return (
    <div className="space-y-6">
      {/* Premium Dismissable Success Notification Banner with Auto-Dismiss */}
      {invitedInfo && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <div className="relative overflow-hidden bg-linear-to-r from-[#ecfdf5] via-[#f0fdf4] to-[#e6f4ea] border border-[#a7f3d0] rounded-2xl p-5 sm:p-6 text-xs sm:text-sm shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A3C2F] text-white shrink-0 shadow-2xs mt-0.5">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base font-semibold text-[#0A3C2F] tracking-tight">
                    {invitedInfo.isResend
                      ? "Invitation Email Resent Successfully"
                      : "Invitation Email Sent Successfully"}
                  </h3>
                  <p className="text-emerald-900 font-medium leading-relaxed">
                    An official registration email has been delivered to{" "}
                    <strong className="font-semibold text-[#0A3C2F] underline decoration-emerald-300">
                      {invitedInfo.email}
                    </strong>{" "}
                    for the role of{" "}
                    <strong className="font-semibold text-[#0A3C2F]">
                      {ROLE_LABELS[
                        invitedInfo.role as keyof typeof ROLE_LABELS
                      ] || invitedInfo.role}
                    </strong>
                    . The recipient can click the link in their inbox to setup
                    their password.
                  </p>
                </div>
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => setInvitedInfo(null)}
                className="text-emerald-800 hover:text-[#0A3C2F] transition-colors p-1 rounded-lg hover:bg-emerald-100/50 cursor-pointer"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Update Success Banner */}
      {roleSuccessMessage && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <div className="relative overflow-hidden bg-gradient-to-r from-[#ecfdf5] via-[#f0fdf4] to-[#e6f4ea] border border-[#a7f3d0] rounded-2xl p-4 sm:p-5 text-xs sm:text-sm shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A3C2F] text-white shrink-0 shadow-2xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-[#0A3C2F] font-semibold">
                {roleSuccessMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRoleSuccessMessage(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* General Action Success Banner */}
      {actionSuccessMessage && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <div className="relative overflow-hidden bg-linear-to-r from-[#ecfdf5] via-[#f0fdf4] to-[#e6f4ea] border border-[#a7f3d0] rounded-2xl p-4 sm:p-5 text-xs sm:text-sm shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A3C2F] text-white shrink-0 shadow-2xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-[#0A3C2F] font-semibold">
                {actionSuccessMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccessMessage(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-semibold shadow-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* VIEW MODE 1: INVITE NEW USER FORM */}
      {viewMode === "invite" ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 px-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              User Management
            </button>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="text-[#0f172a] font-semibold flex items-center gap-1.5">
              Invite New User
            </span>
          </div>

          <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-xl font-semibold text-[#0f172a] tracking-tight flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#0A3C2F] stroke-[2.5]" />
                  Invite New User
                </h1>
                <p className="mt-1 text-xs text-[#64748b] font-medium">
                  Specify user credentials and assigned PTS role to generate an
                  official registration invitation.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSendInvitation}
              className="space-y-5 max-w-3xl"
            >
              <div>
                <label className="text-xs font-semibold text-[#0f172a] mb-1.5 block">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder="e.g. Abebe Bikila"
                  className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm text-[#0f172a] w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0f172a] mb-1.5 block">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. officer@moa.gov.et"
                  className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm text-[#0f172a] w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0f172a] mb-1.5 block">
                  PTS Role Assignment
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as ProvisionableRole)
                  }
                  className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm text-[#0f172a] w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all cursor-pointer"
                >
                  <option value="OFFICER">
                    Officer (Procurement operations / workflow)
                  </option>
                  <option value="DIRECTOR">
                    Director (Directorate Oversight)
                  </option>
                  <option value="ENDORSING_COMMITTEE">
                    Endorsement Committee (Committee Review)
                  </option>
                  <option value="MANAGEMENT">
                    Management (Executive Review &amp; Approval)
                  </option>
                  <option value="ADMIN">
                    Administrator (System Administration / Governance)
                  </option>
                </select>

                <p className="text-xs text-[#64748b] font-medium mt-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#047857] shrink-0" />
                  Select the appropriate PTS role and operational permissions
                  for this account.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="px-5 py-2.5 rounded-full border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#334155] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-6 py-2.5 rounded-full bg-[#0A3C2F] hover:bg-[#083025] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {isInviting ? "Sending Invitation…" : "Send Invitation"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : (
        /* VIEW MODE 2: USER MANAGEMENT MAIN TABLE */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-[#0f172a]">
                  User Management
                </h1>
              </div>
              <p className="mt-1 text-sm text-[#64748b] font-medium">
                Manage system accounts, user permissions, and send user
                invitation links.
              </p>
            </div>
          </div>

          <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a] tracking-tight">
                  User Management Directory
                </h2>
                <p className="mt-0.5 text-xs text-[#64748b] font-medium">
                  Assign PTS roles, issue invitations, resend pending links, and
                  manage access
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewMode("invite")}
                className="shrink-0 bg-[#0A3C2F] hover:bg-[#083025] text-white text-xs font-semibold px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Invite User</span>
              </button>
            </div>

            {/* Controls: Search and Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by name or email..."
                  className="bg-[#f8fafc] border border-[#e2e8f0] rounded-full pl-9 pr-4 py-2 text-xs text-[#0f172a] placeholder-slate-400 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all"
                />
              </div>

              <div className="flex items-center gap-3 self-end md:self-auto">
                <select
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="bg-[#f8fafc] border border-[#e2e8f0] rounded-full px-4 py-2 text-xs font-semibold text-[#334155] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Roles</option>
                  <option value="OFFICER">Officer</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="ENDORSING_COMMITTEE">
                    Endorsement Committee
                  </option>
                  <option value="MANAGEMENT">Management</option>
                  <option value="ADMIN">Administrator</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="bg-[#f8fafc] border border-[#e2e8f0] rounded-full px-4 py-2 text-xs font-semibold text-[#334155] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Accounts</option>
                  <option value="Active">Active Accounts</option>
                  <option value="Deactivated">Deactivated Accounts</option>
                  <option value="Deleted">Deleted Accounts</option>
                  <option value="Cancelled">Cancelled Invitations</option>
                </select>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                <span className="ml-2 text-sm font-medium text-slate-500">
                  Loading users…
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
                  onClick={loadUsers}
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Dark Emerald Header Table (Attached Image Inspo) */}
            {!isLoading && !loadError && (
              <>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-187.5">
                      <thead>
                        <tr className="bg-[#0A3C2F] text-white text-xs font-semibold">
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
                          <th className="py-3.5 px-4 font-semibold tracking-wide">
                            Last Login
                          </th>
                          <th className="py-3.5 px-4 font-semibold text-center tracking-wide">
                            Cancel Invitation
                          </th>
                          <th className="py-3.5 px-4 font-semibold text-center tracking-wide">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {users.map((user, index) => {
                          const detailedStatus = getDetailedAccountStatus(
                            user,
                            cancelledUserIds,
                            deletedUserIds,
                          );
                          const isCancelled =
                            detailedStatus === "CANCELLED_INVITATION";
                          const isDeleted = detailedStatus === "DELETED";
                          const isDeactivated = detailedStatus === "DEACTIVATED";
                          const isActive = detailedStatus === "ACTIVE";
                          const isPending =
                            detailedStatus === "PENDING_INVITATION";
                          const isOddRow = index % 2 === 0;
                          const isSelf = isCurrentUser(user, activeUser);

                          return (
                            <tr
                              key={user.id}
                              onClick={() => setSelectedDetailUser(user)}
                              className={`border-b border-slate-100 transition-colors duration-150 hover:bg-emerald-50/50 cursor-pointer ${
                                isOddRow ? "bg-[#f8fafc]/60" : "bg-white"
                              }`}
                              title={`Click to view profile & details for ${user.displayName || user.name}`}
                            >
                              <td className="py-4 px-4 align-middle max-w-xs wrap-break-word">
                                <div className="font-semibold text-[#0f172a] text-xs wrap-break-word line-clamp-2 flex items-center gap-1.5 flex-wrap">
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
                                  <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                                    @{user.username}
                                  </div>
                                )}
                              </td>

                              <td className="py-4 px-4 text-[#475569] font-normal align-middle max-w-xs">
                                <div className="flex items-center gap-2 group">
                                  <span className={`truncate ${isCancelled || isDeleted ? "text-slate-400" : ""}`}>{user.email}</span>
                                  {!isCancelled && !isDeleted && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openChangeEmailModal(user);
                                      }}
                                      className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                                      title="Change user email"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>

                              <td className="py-4 px-4 align-middle font-semibold text-[#0f172a]">
                                {displayRole(user)}
                              </td>

                              <td className="py-4 px-4 align-middle">
                                {isCancelled ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                    <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <span>Invitation Cancelled</span>
                                  </span>
                                ) : isDeleted ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <span>Deleted</span>
                                  </span>
                                ) : isDeactivated ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    <UserX className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <span>Deactivated</span>
                                  </span>
                                ) : isPending ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                    <span>Pending Invitation</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span>Active</span>
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-4 align-middle">
                                {isCancelled ? (
                                  <div className="flex flex-col">
                                    <span className="text-slate-400 font-medium line-through whitespace-nowrap text-xs">
                                      Awaiting Registration
                                    </span>
                                    <span className="text-[10px] text-rose-600 font-semibold whitespace-nowrap">
                                      Invitation Cancelled
                                    </span>
                                  </div>
                                ) : (
                                  renderLastLogin(user.lastLoginAt, user.status)
                                )}
                              </td>

                              {/* Cancel Invitation Column */}
                              <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                                {isCancelled ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <span>Cancelled</span>
                                  </span>
                                ) : isPending ? (
                                  <button
                                    type="button"
                                    disabled={actionUserId === user.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openConfirmModal("cancel_invitation", user);
                                    }}
                                    className="px-3 py-1 text-xs font-semibold rounded-full border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                                    title="Cancel and revoke invitation link"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-amber-600 inline" />
                                    <span>Cancel Invitation</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-300 font-medium">—</span>
                                )}
                              </td>

                              {/* Actions Column: Resend Invitation / Activate / Deactivate + Delete */}
                              <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2">
                                  {isCancelled ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={actionUserId === user.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleResendInvitation(user);
                                        }}
                                        className="px-3.5 py-1 text-xs font-semibold rounded-full border border-[#0A3C2F] bg-[#ecfdf5] text-[#0A3C2F] hover:bg-[#d1fae5] transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                                        title="Send a fresh invitation email to this address"
                                      >
                                        {actionUserId === user.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin inline" />
                                        ) : (
                                          <RefreshCw className="w-3 h-3 inline" />
                                        )}
                                        <span>
                                          {actionUserId === user.id
                                            ? "Re-inviting…"
                                            : "Re-invite"}
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={actionUserId === user.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openConfirmModal("delete", user);
                                        }}
                                        className="p-1.5 rounded-full border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-40"
                                        title="Permanently remove cancelled record"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : isDeleted ? (
                                    <button
                                      type="button"
                                      disabled={actionUserId === user.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openConfirmModal("activate", user);
                                      }}
                                      className="px-3.5 py-1 text-xs font-semibold rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                                      title="Restore this account to active status"
                                    >
                                      {actionUserId === user.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin inline" />
                                      ) : (
                                        <UserCheck className="w-3.5 h-3.5 text-blue-600 inline" />
                                      )}
                                      <span>Restore</span>
                                    </button>
                                  ) : isPending ? (
                                    <button
                                      type="button"
                                      disabled={actionUserId === user.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResendInvitation(user);
                                      }}
                                      className="px-3.5 py-1 text-xs font-semibold rounded-full border border-[#0A3C2F] bg-[#ecfdf5] text-[#0A3C2F] hover:bg-[#d1fae5] transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                      {actionUserId === user.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin inline" />
                                      ) : (
                                        <RefreshCw className="w-3 h-3 inline" />
                                      )}
                                      <span>
                                        {actionUserId === user.id
                                          ? "Resending…"
                                          : "Resend Invitation"}
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
                                      disabled={actionUserId === user.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openConfirmModal(isActive ? "deactivate" : "activate", user);
                                      }}
                                      className={`px-3.5 py-1 text-xs font-semibold rounded-full border transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 ${
                                        isActive
                                          ? "border-rose-200/90 bg-rose-50/90 text-rose-700 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800"
                                          : "border-blue-200/90 bg-blue-50/90 text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-800"
                                      }`}
                                    >
                                      {isActive ? "Deactivate" : "Activate"}
                                    </button>
                                  )}

                                  {/* Delete Account Icon Button */}
                                  {!isSelf && !isCancelled && !isDeleted && (
                                    <button
                                      type="button"
                                      disabled={actionUserId === user.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openConfirmModal("delete", user);
                                      }}
                                      className="p-1.5 rounded-full border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-40"
                                      title="Delete account"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {users.length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-8 text-center text-xs text-slate-500 font-medium"
                            >
                              No user accounts match your search query or
                              filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination Controls */}
                {meta && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">
                      Showing{" "}
                      <span className="font-semibold text-slate-700">
                        {meta.total === 0
                          ? 0
                          : (meta.page - 1) * meta.pageSize + 1}
                        –{Math.min(meta.page * meta.pageSize, meta.total)}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-slate-700">
                        {meta.total}
                      </span>{" "}
                      users
                    </p>
                    {meta.totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <span className="text-xs font-semibold text-slate-600 min-w-15 text-center">
                          Page {meta.page} of {meta.totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={currentPage >= meta.totalPages}
                          onClick={() =>
                            setCurrentPage((p) =>
                              Math.min(meta.totalPages, p + 1),
                            )
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
      )}

      {/* ─── User Profile & Protected Role Change Modal ─────────────── */}
      {selectedDetailUser && (
        <UserProfileModal
          user={selectedDetailUser}
          isOpen={Boolean(selectedDetailUser)}
          onClose={() => setSelectedDetailUser(null)}
          onUserUpdated={async () => {
            await loadUsers();
          }}
        />
      )}

      {/* ─── Confirmation Modal for Deactivate / Activate / Delete / Cancel Invitation ─────────────── */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                    confirmModal.type === "activate"
                      ? "bg-emerald-100 text-emerald-700"
                      : confirmModal.type === "cancel_invitation"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {confirmModal.type === "activate" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : confirmModal.type === "cancel_invitation" ? (
                    <XCircle className="w-5 h-5" />
                  ) : confirmModal.type === "delete" ? (
                    <Trash2 className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {confirmModal.type === "deactivate"
                      ? "Deactivate User Account"
                      : confirmModal.type === "activate"
                        ? "Reactivate User Account"
                        : confirmModal.type === "delete"
                          ? "Delete User Account"
                          : "Cancel Pending Invitation"}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {confirmModal.type === "deactivate" && (
                      <>
                        Are you sure you want to deactivate the account for{" "}
                        <strong className="text-slate-900">
                          {confirmModal.user.displayName || confirmModal.user.name}
                        </strong>{" "}
                        (<span className="font-mono">{confirmModal.user.email}</span>)? The user will be immediately barred from signing into the system.
                      </>
                    )}
                    {confirmModal.type === "activate" && (
                      <>
                        Are you sure you want to reactivate the account for{" "}
                        <strong className="text-slate-900">
                          {confirmModal.user.displayName || confirmModal.user.name}
                        </strong>{" "}
                        (<span className="font-mono">{confirmModal.user.email}</span>)? The user will be granted permission to sign in again.
                      </>
                    )}
                    {confirmModal.type === "delete" && (
                      <>
                        Are you sure you want to delete the account for{" "}
                        <strong className="text-slate-900">
                          {confirmModal.user.displayName || confirmModal.user.name}
                        </strong>{" "}
                        (<span className="font-mono">{confirmModal.user.email}</span>)? This account will be removed from the active directory and visible under &quot;Deactivated or deleted accounts&quot;.
                      </>
                    )}
                    {confirmModal.type === "cancel_invitation" && (
                      <>
                        Are you sure you want to cancel the invitation sent to{" "}
                        <strong className="text-slate-900 font-mono">
                          {confirmModal.user.email}
                        </strong>
                        ? The invitation link will be permanently revoked immediately to prevent anyone from registering.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmModal(null);
                  setConfirmModalError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {confirmModalError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{confirmModalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isConfirmingAction}
                onClick={() => {
                  setConfirmModal(null);
                  setConfirmModalError(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConfirmingAction}
                onClick={handleExecuteConfirmAction}
                className={`px-5 py-2 text-xs font-semibold rounded-full text-white shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  confirmModal.type === "activate"
                    ? "bg-emerald-700 hover:bg-emerald-800"
                    : confirmModal.type === "cancel_invitation"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isConfirmingAction && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>
                  {confirmModal.type === "deactivate"
                    ? "Confirm Deactivation"
                    : confirmModal.type === "activate"
                      ? "Confirm Activation"
                      : confirmModal.type === "delete"
                        ? "Delete Account"
                        : "Cancel Invitation"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Change User Email Modal ─────────────── */}
      {changeEmailModal && changeEmailModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Change User Email Address
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {changeEmailModal.user.displayName || changeEmailModal.user.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChangeEmailModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewEmail} className="space-y-4">
              {changeEmailError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{changeEmailError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Email
                </label>
                <input
                  type="text"
                  disabled
                  value={changeEmailModal.user.email}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={changeEmailModal.email}
                  onChange={(e) =>
                    setChangeEmailModal((prev) =>
                      prev ? { ...prev, email: e.target.value } : null,
                    )
                  }
                  placeholder="e.g. user@moa.gov.et"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
                  Updating this address will change where login credentials, verification codes, and official notifications are sent.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isUpdatingEmail}
                  onClick={() => setChangeEmailModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingEmail || !changeEmailModal.email.trim()}
                  className="px-5 py-2 text-xs font-semibold rounded-full bg-[#0A3C2F] hover:bg-[#083025] text-white shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdatingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Update Email</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Floating Toast Notification for Cancelled Invitation / Key Actions ─────────────── */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm w-full">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <Ban className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 flex-1 pr-1">
              <p className="text-xs font-bold text-white">
                {toastNotification.title}
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {toastNotification.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setToastNotification(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
