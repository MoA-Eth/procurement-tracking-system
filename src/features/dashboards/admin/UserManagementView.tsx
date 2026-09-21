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
} from "lucide-react";
import { createInvitedUser, getCurrentUser } from "@/lib/authApi";
import { UserProfileModal } from "./components/UserProfileModal";
import {
  fetchUsers,
  updateUser,
  type ApiUser,
  type PaginatedResponse,
} from "@/lib/adminApi";
import {
  type AuthUser,
  type ProvisionableRole,
  normalizeUserRole,
  ROLE_LABELS,
} from "@/lib/authTypes";

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
      isActive: false,
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
  const [selectedStatus, setSelectedStatus] = useState("ALL");
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
          selectedStatus === "ALL"
            ? undefined
            : selectedStatus === "Active"
              ? true
              : false,
      });
      setUsersResponse(result);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load users.",
      );
    }
  }, [currentPage, searchQuery, selectedRole, selectedStatus]);

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
        selectedStatus === "ALL"
          ? undefined
          : selectedStatus === "Active"
            ? true
            : false,
    })
      .then((result) => {
        if (active) {
          if (result && Array.isArray(result.data)) {
            setUsersResponse(result);
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
  }, [currentPage, searchQuery, selectedRole, selectedStatus]);

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

  // ─── Toggle Active/Inactive ─────────────────────────────────────────────
  const handleToggleStatus = async (user: ApiUser) => {
    if (user.isActive && isCurrentUser(user, activeUser)) {
      setErrorMessage("You cannot deactivate your own administrator account.");
      return;
    }
    setActionUserId(user.id);
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      await loadUsers();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update user status.",
      );
    } finally {
      setActionUserId(null);
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

    const targetEmail = inviteEmail.trim();
    const targetRole = inviteRole;

    try {
      await createInvitedUser(inviteFullName.trim(), targetEmail, targetRole);

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

  // Auto-dismiss success notification after 15 seconds
  useEffect(() => {
    if (!invitedInfo) return;
    const timer = setTimeout(() => {
      setInvitedInfo(null);
    }, 15000);
    return () => clearTimeout(timer);
  }, [invitedInfo]);

  const users = usersResponse?.data ?? [];
  const meta = usersResponse?.meta;

  return (
    <div className="space-y-6">
      {/* Premium Dismissable Success Notification Banner with Auto-Dismiss */}
      {invitedInfo && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <div className="relative overflow-hidden bg-linear-to-r from-[#ecfdf5] via-[#f0fdf4] to-[#e6f4ea] border border-[#a7f3d0] rounded-2xl p-5 sm:p-6 text-xs sm:text-sm shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#044e3a] text-white shrink-0 shadow-2xs mt-0.5">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base font-extrabold text-[#044e3a] tracking-tight">
                    {invitedInfo.isResend
                      ? "Invitation Email Resent Successfully"
                      : "Invitation Email Sent Successfully"}
                  </h3>
                  <p className="text-[#046c50] font-medium leading-relaxed">
                    An official registration email has been delivered to{" "}
                    <strong className="font-bold text-[#04382c] underline decoration-emerald-300">
                      {invitedInfo.email}
                    </strong>{" "}
                    for the role of{" "}
                    <strong className="font-bold text-[#04382c]">
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
                className="text-[#046c50] hover:text-[#04382c] transition-colors p-1 rounded-lg hover:bg-emerald-100/50 cursor-pointer"
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
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#044e3a] text-white shrink-0 shadow-2xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-[#044e3a] font-bold">{roleSuccessMessage}</p>
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

      {errorMessage && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-bold shadow-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* VIEW MODE 1: INVITE NEW USER FORM */}
      {viewMode === "invite" ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              User Management
            </button>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="text-[#0f172a] font-bold flex items-center gap-1.5">
              Invite New User
            </span>
          </div>

          <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#04382c] stroke-[2.5]" />
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
                <label className="text-xs font-bold text-[#0f172a] mb-1.5 block">
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
                <label className="text-xs font-bold text-[#0f172a] mb-1.5 block">
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
                <label className="text-xs font-bold text-[#0f172a] mb-1.5 block">
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
                  className="px-5 py-2.5 rounded-full border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#334155] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-6 py-2.5 rounded-full bg-[#04382c] hover:bg-[#032e25] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
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
                <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
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
                <h2 className="text-lg font-bold text-[#0f172a] tracking-tight">
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
                className="shrink-0 bg-[#04382c] hover:bg-[#032e25] text-white text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
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
                  className="bg-[#f8fafc] border border-[#e2e8f0] rounded-full px-4 py-2 text-xs font-bold text-[#334155] focus:outline-none cursor-pointer"
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
                  className="bg-[#f8fafc] border border-[#e2e8f0] rounded-full px-4 py-2 text-xs font-bold text-[#334155] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
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
                  className="px-4 py-2 text-xs font-bold rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
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
                        <tr className="bg-[#04382c] text-white text-xs font-bold">
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
                          <th className="py-3.5 px-4 font-bold tracking-wide">
                            Last Login
                          </th>
                          <th className="py-3.5 px-4 font-bold text-center tracking-wide">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {users.map((user, index) => {
                          const status = displayStatus(user);
                          const isActive = status === "Active";
                          const isPending = status === "Pending Invitation";
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
                                <div className="font-bold text-[#0f172a] text-xs wrap-break-word line-clamp-2 flex items-center gap-1.5">
                                  <span>{user.displayName || user.name}</span>
                                  {isSelf && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                                      You
                                    </span>
                                  )}
                                </div>
                                {user.username && (
                                  <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                                    @{user.username}
                                  </div>
                                )}
                              </td>

                              <td className="py-4 px-4 text-[#475569] font-normal align-middle max-w-xs truncate">
                                {user.email}
                              </td>

                              <td className="py-4 px-4 align-middle font-bold text-[#0f172a]">
                                {displayRole(user)}
                              </td>

                              <td className="py-4 px-4 align-middle">
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

                              <td className="py-4 px-4 align-middle">
                                {renderLastLogin(user.lastLoginAt, user.status)}
                              </td>

                              {/* Actions Column: Resend Invitation / Activate / Deactivate */}
                              <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2">
                                  {isPending ? (
                                    <button
                                      type="button"
                                      disabled={actionUserId === user.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResendInvitation(user);
                                      }}
                                      className="px-3.5 py-1 text-xs font-bold rounded-full border border-[#047857] bg-[#ecfdf5] text-[#044e3a] hover:bg-[#d1fae5] transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
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
                                      className="px-3.5 py-1 text-xs font-bold rounded-full border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60 shadow-none inline-flex items-center gap-1"
                                    >
                                      Deactivate
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={actionUserId === user.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleStatus(user);
                                      }}
                                      className={`px-3.5 py-1 text-xs font-bold rounded-full border transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 ${
                                        isActive
                                          ? "border-rose-200/90 bg-rose-50/90 text-rose-700 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800"
                                          : "border-blue-200/90 bg-blue-50/90 text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-800"
                                      }`}
                                    >
                                      {actionUserId === user.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin inline" />
                                      ) : isActive ? (
                                        "Deactivate"
                                      ) : (
                                        "Activate"
                                      )}
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
                              colSpan={6}
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
                      <span className="font-bold text-slate-700">
                        {meta.total === 0
                          ? 0
                          : (meta.page - 1) * meta.pageSize + 1}
                        –{Math.min(meta.page * meta.pageSize, meta.total)}
                      </span>{" "}
                      of{" "}
                      <span className="font-bold text-slate-700">
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
                        <span className="text-xs font-bold text-slate-600 min-w-15 text-center">
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
    </div>
  );
}
