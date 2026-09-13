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

export type ProvisionableRole = UserRole;

export interface InvitedUserResponse {
  user: AuthUser;
  invitationExpiresAt: string;
  message: string;
  invitationLink?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  OFFICER: "Officer",
  DIRECTOR: "Director",
  ENDORSING_COMMITTEE: "Endorsement Committee Member",
  MANAGEMENT: "Management",
  ADMIN: "Administrator",
};

export const ROLE_SLUGS: Record<UserRole, string> = {
  OFFICER: "officer",
  DIRECTOR: "director",
  ENDORSING_COMMITTEE: "endorsing-committee",
  MANAGEMENT: "management",
  ADMIN: "admin",
};

const ROLE_MAP: Record<string, UserRole> = {
  OFFICER: "OFFICER",
  DIRECTOR: "DIRECTOR",
  ENDORSING_COMMITTEE: "ENDORSING_COMMITTEE",
  MANAGEMENT: "MANAGEMENT",
  ADMIN: "ADMIN",
  // Prisma/backend aliases safely normalized to standard roles
  PROCUREMENTOFFICER: "OFFICER",
  PROCUREMENT_OFFICER: "OFFICER",
  PROCUREMENTDIRECTOR: "DIRECTOR",
  PROCUREMENT_DIRECTOR: "DIRECTOR",
  PROJECTMANAGER: "DIRECTOR",
  PROJECT_MANAGER: "DIRECTOR",
  MANAGEMENTTEAM: "MANAGEMENT",
  MANAGEMENT_TEAM: "MANAGEMENT",
  COMMITTEE: "ENDORSING_COMMITTEE",
  ADMINISTRATOR: "ADMIN",
};

export function normalizeUserRole(role: string): UserRole {
  const clean = (role || "").toUpperCase().trim().replace(/[\s-]/g, "_");
  return ROLE_MAP[clean] || "OFFICER";
}

export function dashboardPath(role: string): string {
  const norm = normalizeUserRole(role);
  return `/dashboard/${ROLE_SLUGS[norm] || "officer"}`;
}

export function roleFromSlug(slug: string): UserRole | undefined {
  if (!slug) return undefined;
  const clean = slug.toLowerCase().replace(/_/g, "-").trim();
  return (Object.entries(ROLE_SLUGS) as [UserRole, string][]).find(
    ([, roleSlug]) => roleSlug.toLowerCase() === clean,
  )?.[0];
}
