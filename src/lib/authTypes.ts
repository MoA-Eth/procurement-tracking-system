import type { UserRole } from "../types";

export type AuthStatus = "PASSWORD_CHANGE_REQUIRED" | "AUTHENTICATED";

export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  displayName: string;
  role: UserRole;
}

export interface AuthSession {
  status: AuthStatus;
  user: AuthUser;
  expiresAt: string;
  accessToken?: string;
}

export type ProvisionableRole =
  | UserRole
  | "MANAGEMENT_TEAM";

export interface InvitedUserResponse {
  user: AuthUser;
  invitationExpiresAt: string;
  message: string;
  invitationLink?: string;
}

export const ROLE_LABELS: Record<UserRole, string> & Record<string, string> = {
  OFFICER: "Officer",
  DIRECTOR: "Director",
  ENDORSING_COMMITTEE: "Endorsement Committee Member",
  MANAGEMENT: "Management",
  MANAGEMENT_TEAM: "Management",
  ManagementTeam: "Management",
  ADMIN: "Administrator",
};

export const ROLE_SLUGS: Record<UserRole, string> = {
  OFFICER: "officer",
  DIRECTOR: "director",
  ENDORSING_COMMITTEE: "endorsing-committee",
  MANAGEMENT: "management",
  MANAGEMENT_TEAM: "management",
  ADMIN: "admin",
};

export function normalizeUserRole(role: string): UserRole {
  const r = (role || "").toUpperCase().trim().replace(/[\s-]/g, "_");
  if (r === "OFFICER" || r === "PROCUREMENTOFFICER" || r === "PROCUREMENT_OFFICER") return "OFFICER";
  if (
    r === "DIRECTOR" ||
    r === "PROCUREMENTDIRECTOR" ||
    r === "PROCUREMENT_DIRECTOR" ||
    r === "PROJECTMANAGER" ||
    r === "PROJECT_MANAGER"
  ) {
    return "DIRECTOR";
  }
  if (
    r === "MANAGEMENT" ||
    r === "MANAGEMENT_TEAM" ||
    r === "MANAGEMENTTEAM"
  ) {
    return "MANAGEMENT";
  }
  if (
    r === "ENDORSING_COMMITTEE" ||
    r === "ENDORSINGCOMMITTEE" ||
    r === "COMMITTEE"
  ) {
    return "ENDORSING_COMMITTEE";
  }
  if (r === "ADMIN" || r === "ADMINISTRATOR") return "ADMIN";
  return "OFFICER";
}

export function dashboardPath(role: string): string {
  const norm = normalizeUserRole(role);
  return `/dashboard/${ROLE_SLUGS[norm] || "officer"}`;
}

export function roleFromSlug(slug: string): UserRole | undefined {
  if (!slug) return undefined;
  const clean = slug.toLowerCase().replace(/_/g, "-").trim();
  if (
    clean === "management" ||
    clean === "management-team" ||
    clean === "managementteam"
  ) {
    return "MANAGEMENT";
  }
  if (clean === "endorsing-committee" || clean === "committee") {
    return "ENDORSING_COMMITTEE";
  }
  if (clean === "director" || clean === "procurementdirector")
    return "DIRECTOR";
  if (clean === "officer" || clean === "procurementofficer") return "OFFICER";
  if (clean === "admin" || clean === "administrator") return "ADMIN";

  return (Object.entries(ROLE_SLUGS) as [UserRole, string][]).find(
    ([, roleSlug]) => roleSlug.toLowerCase() === clean,
  )?.[0];
}
