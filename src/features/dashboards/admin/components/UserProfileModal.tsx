"use client";

import { useState, useEffect } from "react";
import {
  X,
  Edit3,
  Eye,
  Mail,
  User,
  Shield,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Calendar,
  Clock,
  ArrowRight,
  FolderGit2,
} from "lucide-react";
import type { ApiUser } from "@/lib/adminApi";
import { updateUser } from "@/lib/adminApi";
import {
  type ProvisionableRole,
  normalizeUserRole,
  ROLE_LABELS,
} from "@/lib/authTypes";
import {
  fetchProjects,
  assignOfficerToProject,
  removeOfficerFromProject,
  isProjectAssignedToOfficer,
  type BackendProject,
} from "@/lib/projectsApi";
import { fetchOfficers, type OfficerUserItem } from "@/lib/lookupsApi";

interface UserProfileModalProps {
  user: ApiUser | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
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

const AVAILABLE_ROLES: {
  role: ProvisionableRole;
  label: string;
  desc: string;
}[] = [
  {
    role: "OFFICER",
    label: "Officer",
    desc: "Procurement operations, tracking activities, draft submission, and roadmaps.",
  },
  {
    role: "DIRECTOR",
    label: "Director",
    desc: "Directorate oversight, project assignments, plan approvals, and reports.",
  },
  {
    role: "ENDORSING_COMMITTEE",
    label: "Endorsement Committee",
    desc: "Committee evaluations, agenda review, and endorsement voting.",
  },
  {
    role: "MANAGEMENT",
    label: "Management",
    desc: "High-level strategic review, oversight comments, and executive approvals.",
  },
  {
    role: "ADMIN",
    label: "Administrator",
    desc: "System governance, user account management, roles, and audit trails.",
  },
];

export function UserProfileModal({
  user,
  isOpen,
  onClose,
  onUserUpdated,
}: UserProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRole, setSelectedRole] =
    useState<ProvisionableRole>("OFFICER");
  const [isActiveStatus, setIsActiveStatus] = useState(true);

  // Projects and Officers state
  const [assignedProjects, setAssignedProjects] = useState<BackendProject[]>(
    [],
  );
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [availableOfficers, setAvailableOfficers] = useState<OfficerUserItem[]>(
    [],
  );
  const [loadingOfficers, setLoadingOfficers] = useState(false);

  // Handover state
  const [replacementOfficerId, setReplacementOfficerId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isOpen || !user) {
      setIsEditing(false);
      setActionError("");
      setSuccessMessage("");
      setReplacementOfficerId("");
      return;
    }

    const currentNormalized =
      (normalizeUserRole(user.authRole || user.role) as ProvisionableRole) ||
      "OFFICER";
    setSelectedRole(currentNormalized);
    setIsActiveStatus(user.isActive ?? true);
    setIsEditing(false);
    setActionError("");
    setSuccessMessage("");
    setReplacementOfficerId("");

    // Load projects to check if user is assigned to any active projects
    let isMounted = true;
    setLoadingProjects(true);

    const loadData = async () => {
      try {
        const [allProjects, officers] = await Promise.all([
          fetchProjects(),
          fetchOfficers(),
        ]);

        if (!isMounted) return;

        // Filter projects assigned to this user across all backend schemas (members, officers, assignedOfficers)
        const userProjects = allProjects.filter((p: any) => {
          // 1. Built-in isProjectAssignedToOfficer helper
          if (isProjectAssignedToOfficer(p, user as any)) {
            return true;
          }

          const uId = (user.id || "").trim();
          const uEmail = (user.email || "").trim().toLowerCase();
          const uDisplayName = (user.displayName || "").trim().toLowerCase();
          const uName = (user.name || "").trim().toLowerCase();
          const uUsername = (user.username || "").trim().toLowerCase();

          // Helper to match an officer/user entity against target user
          const matchesUser = (entity: any) => {
            if (!entity) return false;
            const targetId = entity.id || entity.userId;
            if (targetId && uId && String(targetId) === String(uId))
              return true;
            if (
              entity.email &&
              uEmail &&
              String(entity.email).trim().toLowerCase() === uEmail
            )
              return true;
            const eName = String(entity.name || entity.displayName || "")
              .trim()
              .toLowerCase();
            if (
              eName &&
              ((uDisplayName && eName === uDisplayName) ||
                (uName && eName === uName))
            )
              return true;
            if (
              entity.username &&
              uUsername &&
              String(entity.username).trim().toLowerCase() === uUsername
            )
              return true;
            return false;
          };

          // 2. Check BackendProject members array (Prisma relation)
          if (Array.isArray(p.members)) {
            const hasMember = p.members.some((m: any) => {
              if (!m) return false;
              if (m.userId && uId && String(m.userId) === String(uId))
                return true;
              if (m.user && matchesUser(m.user)) return true;
              return false;
            });
            if (hasMember) return true;
          }

          // 3. Check officers array
          if (Array.isArray(p.officers)) {
            const hasOfficer = p.officers.some((off: any) => {
              if (!off) return false;
              if (matchesUser(off)) return true;
              if (off.user && matchesUser(off.user)) return true;
              return false;
            });
            if (hasOfficer) return true;
          }

          // 4. Check assignedOfficers array (objects or plain strings)
          if (Array.isArray(p.assignedOfficers)) {
            const hasAssigned = p.assignedOfficers.some((off: any) => {
              if (!off) return false;
              if (typeof off === "string") {
                const s = off.trim().toLowerCase();
                return (
                  (uDisplayName && s === uDisplayName) ||
                  (uName && s === uName) ||
                  (uEmail && s === uEmail) ||
                  (uUsername && s === uUsername)
                );
              }
              return matchesUser(off);
            });
            if (hasAssigned) return true;
          }

          // 5. Check officerAssignments array
          if (Array.isArray(p.officerAssignments)) {
            const hasOa = p.officerAssignments.some((oa: any) => {
              if (!oa) return false;
              if (oa.officerId && uId && String(oa.officerId) === String(uId))
                return true;
              if (oa.officer && matchesUser(oa.officer)) return true;
              return false;
            });
            if (hasOa) return true;
          }

          return false;
        });

        setAssignedProjects(userProjects);

        // Filter out current user from available replacement officers
        const otherOfficers = officers.filter(
          (off) =>
            off.id !== user.id &&
            off.email.toLowerCase() !== (user.email || "").toLowerCase(),
        );
        setAvailableOfficers(otherOfficers);
      } catch (err) {
        console.warn("Failed to load user project workload:", err);
      } finally {
        if (isMounted) setLoadingProjects(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const currentRole =
    (normalizeUserRole(user.authRole || user.role) as ProvisionableRole) ||
    "OFFICER";

  // Identify active projects (exclude explicitly closed, suspended, archived, or inactive)
  const activeProjects = assignedProjects.filter((p: any) => {
    if (p.isActive === false) return false;
    if (!p.status) return true;
    const s = String(p.status).trim().toUpperCase();
    return (
      s !== "CLOSED" &&
      s !== "SUSPENDED" &&
      s !== "ARCHIVED" &&
      s !== "INACTIVE"
    );
  });

  const isRoleChanging = selectedRole !== currentRole;
  const requiresOfficerHandover =
    isRoleChanging && activeProjects.length > 0 && selectedRole !== "OFFICER";

  const handleApplyChanges = async () => {
    setActionError("");
    setSuccessMessage("");

    // If handover is required, ensure a replacement officer is chosen
    if (requiresOfficerHandover && !replacementOfficerId) {
      setActionError(
        "Please select a replacement officer to hand over active projects to.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Reassign active projects if needed
      if (requiresOfficerHandover && replacementOfficerId) {
        const replacementOfficer = availableOfficers.find(
          (o) => o.id === replacementOfficerId,
        );

        for (const proj of activeProjects) {
          try {
            await assignOfficerToProject(proj.id, replacementOfficerId);
            if (user.id) {
              await removeOfficerFromProject(proj.id, user.id);
            }
          } catch (reassignErr) {
            console.warn(
              `Notice during project reassign for ${proj.code}:`,
              reassignErr,
            );
          }
        }
      }

      // 2. Update user role and status in database
      const updatePayload: { role: string; isActive?: boolean } = {
        role: selectedRole,
        isActive: isActiveStatus,
      };

      await updateUser(user.id, updatePayload);

      setSuccessMessage(
        requiresOfficerHandover
          ? `Active projects successfully handed over and role updated to ${
              ROLE_LABELS[selectedRole] || selectedRole
            }!`
          : `User profile & role successfully updated to ${
              ROLE_LABELS[selectedRole] || selectedRole
            }!`,
      );

      // Refresh parent view and transition back to view mode after short delay
      setTimeout(() => {
        onUserUpdated();
        setIsEditing(false);
      }, 1200);
    } catch (err: any) {
      setActionError(err?.message || "Failed to update user profile and role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
        {/* ─── Modal Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-[#04382c] text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-emerald-300">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                {isEditing
                  ? "Edit User Account & Role"
                  : "User Account Details"}
              </h3>
              <p className="text-[11px] text-emerald-200/80">
                Ministry of Agriculture Procurement Tracking System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Top Edit Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setIsEditing(!isEditing);
                setActionError("");
                setSuccessMessage("");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isEditing
                  ? "bg-white/20 text-white hover:bg-white/30"
                  : "bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30 border border-emerald-300/30"
              }`}
              title={isEditing ? "Switch to View Mode" : "Edit Role & Account"}
            >
              {isEditing ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Modal Body ───────────────────────────────────────────── */}
        <div className="p-6 space-y-5 max-h-[calc(85vh-120px)] overflow-y-auto">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* ─── Profile Overview Card ──────────────────────────────── */}
          <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-13 w-13 rounded-2xl bg-gradient-to-br from-[#0A3C2F] to-[#14532d] text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs">
                {(user.displayName || user.name || user.email || "U")
                  .substring(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-slate-900 truncate">
                    {user.displayName || user.name || "Unnamed User"}
                  </h4>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      user.isActive
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1 ${
                        user.isActive ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    {user.isActive ? "Active Account" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.username && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Username: @{user.username}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Current Role
              </span>
              <span className="inline-block px-3 py-1 rounded-xl text-xs font-extrabold bg-[#04382c] text-emerald-200 shadow-2xs">
                {displayRole(user)}
              </span>
            </div>
          </div>

          {/* ─── VIEW MODE: Details & Assigned Projects ──────────────── */}
          {!isEditing ? (
            <div className="space-y-4">
              {/* Account Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Account Status</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {user.status === "PENDING_INVITATION"
                      ? "Pending Invitation"
                      : user.isActive
                        ? "Active & Verified"
                        : "Deactivated"}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last Login Timestamp</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString()
                      : "Never logged in"}
                  </p>
                </div>
              </div>

              {/* Workload / Assigned Projects Section */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-[#0A3C2F]" />
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Assigned Procurement Projects
                    </h5>
                  </div>
                  <span className="text-xs font-extrabold text-[#0A3C2F] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    {assignedProjects.length} Assigned
                  </span>
                </div>

                {loadingProjects ? (
                  <div className="flex items-center justify-center py-6 text-slate-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin mr-2 text-emerald-600" />
                    <span>Checking assigned projects…</span>
                  </div>
                ) : assignedProjects.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                    No active or archived procurement projects are assigned to
                    this user.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {assignedProjects.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-extrabold text-slate-900 truncate">
                            {p.code}
                          </p>
                          <p className="text-[11px] text-slate-600 truncate">
                            {p.name}
                          </p>
                        </div>
                        {(() => {
                          const isProjActive =
                            p.isActive !== false &&
                            String(p.status || "ACTIVE").toUpperCase() !==
                              "CLOSED" &&
                            String(p.status || "ACTIVE").toUpperCase() !==
                              "SUSPENDED" &&
                            String(p.status || "ACTIVE").toUpperCase() !==
                              "INACTIVE";
                          return (
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded border shrink-0 ${
                                isProjActive
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {isProjActive ? "Active" : p.status || "Inactive"}
                            </span>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ─── EDIT MODE: Role Selection & Handover Check ─────────── */
            <div className="space-y-5">
              {/* Role Selection Options */}
              <div>
                <label className="text-xs font-bold text-slate-900 mb-2.5 flex items-center justify-between">
                  <span>Select New Role</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Determines system permissions & dashboard access
                  </span>
                </label>
                <div className="space-y-2">
                  {AVAILABLE_ROLES.map((r) => {
                    const isSelected = selectedRole === r.role;
                    return (
                      <label
                        key={r.role}
                        className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-[#04382c] bg-emerald-50/40 ring-1 ring-[#04382c]"
                            : "border-slate-200 hover:bg-slate-50/80"
                        }`}
                      >
                        <input
                          type="radio"
                          name="selectedRole"
                          value={r.role}
                          checked={isSelected}
                          onChange={() => setSelectedRole(r.role)}
                          className="mt-1 text-[#04382c] focus:ring-[#04382c]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900">
                              {r.label}
                            </span>
                            {currentRole === r.role && (
                              <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded border">
                                Current Role
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {r.desc}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Handover Notice: Displayed if changing role and has active projects */}
              {requiresOfficerHandover && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-extrabold text-amber-900">
                        Active Projects Handover Required
                      </h5>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        <strong>
                          {user.displayName || user.name || "This user"}
                        </strong>{" "}
                        is currently assigned to{" "}
                        <strong>
                          {activeProjects.length} active project(s)
                        </strong>
                        . To change their role away from Officer, you must
                        select a replacement procurement officer to hand over
                        these projects to.
                      </p>
                    </div>
                  </div>

                  {/* Active Projects List Summary */}
                  <div className="bg-white/80 rounded-xl p-2.5 border border-amber-200/80 max-h-28 overflow-y-auto">
                    <p className="text-[10px] font-bold uppercase text-amber-800 mb-1">
                      Projects to be transferred:
                    </p>
                    <ul className="text-xs space-y-1">
                      {activeProjects.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center gap-1.5 text-[11px] text-slate-700"
                        >
                          <span className="font-mono font-bold text-amber-900">
                            {p.code}:
                          </span>
                          <span className="truncate">{p.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Officer Dropdown */}
                  <div>
                    <label className="text-[11px] font-extrabold text-amber-900 mb-1.5 block">
                      Select Replacement Officer to Receive Active Projects:
                    </label>
                    <select
                      value={replacementOfficerId}
                      onChange={(e) => setReplacementOfficerId(e.target.value)}
                      className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    >
                      <option value="">-- Choose an Officer --</option>
                      {availableOfficers.map((off) => (
                        <option key={off.id} value={off.id}>
                          {off.name} ({off.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Status Toggle in Edit Mode */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-900">
                    Account Status
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Active users can log into the Procurement Tracking System
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActiveStatus(!isActiveStatus)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                    isActiveStatus
                      ? "bg-emerald-50 text-emerald-850 border-emerald-200 hover:bg-emerald-100"
                      : "bg-rose-50 text-rose-850 border-rose-200 hover:bg-rose-100"
                  }`}
                >
                  {isActiveStatus ? "Active" : "Inactive"}
                </button>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setActionError("");
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyChanges}
                  disabled={
                    isSubmitting ||
                    (requiresOfficerHandover && !replacementOfficerId)
                  }
                  className="px-5 py-2 rounded-xl bg-[#04382c] hover:bg-[#032e25] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Applying Changes…</span>
                    </>
                  ) : requiresOfficerHandover ? (
                    <>
                      <span>Transfer Projects & Apply Role</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <span>Apply Changes</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
