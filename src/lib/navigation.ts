import type { UserRole } from "../types";
import { dashboardPath } from "./authTypes";

export type NavigationIconName =
  | "activity"
  | "clipboard"
  | "contract"
  | "dashboard"
  | "decision"
  | "logs"
  | "progress"
  | "projects"
  | "reports"
  | "sliders"
  | "users";

export interface NavigationItem {
  label: string;
  href: string;
  icon: NavigationIconName;
}

export interface WorkspaceSection extends NavigationItem {
  section: string;
  description: string;
  allowedRoles: readonly UserRole[];
}

const workspaceSections = {
  projects: {
    section: "projects",
    label: "Projects",
    href: "/workspace/projects",
    icon: "projects",
    description: "View and follow procurement projects assigned to your role.",
    allowedRoles: ["OFFICER", "DIRECTOR", "MANAGEMENT"],
  },
  contracts: {
    section: "contracts",
    label: "Contracts",
    href: "/workspace/contracts",
    icon: "contract",
    description: "Review contract records and their current delivery status.",
    allowedRoles: ["OFFICER"],
  },
  "activity-tracker": {
    section: "activity-tracker",
    label: "Activity Tracker",
    href: "/workspace/activity-tracker",
    icon: "activity",
    description: "Track procurement activities, milestones and upcoming work.",
    allowedRoles: ["OFFICER", "DIRECTOR", "MANAGEMENT"],
  },
  "plan-for-review": {
    section: "plan-for-review",
    label: "Plan for Review",
    href: "/workspace/plan-for-review",
    icon: "clipboard",
    description: "Review procurement plans awaiting action from your role.",
    allowedRoles: ["DIRECTOR", "ENDORSING_COMMITTEE", "MANAGEMENT"],
  },
  "vote-progress": {
    section: "vote-progress",
    label: "Vote Progress",
    href: "/workspace/vote-progress",
    icon: "progress",
    description:
      "Monitor Endorsement Committee voting and Executive Management reviews.",
    allowedRoles: [
      "DIRECTOR",
      "MANAGEMENT",
      "ENDORSING_COMMITTEE",
      "ADMIN",
      "OFFICER",
    ],
  },
  "committee-progress": {
    section: "committee-progress",
    label: "Vote Progress",
    href: "/workspace/vote-progress",
    icon: "progress",
    description:
      "Monitor Endorsement Committee voting and Executive Management reviews.",
    allowedRoles: [
      "DIRECTOR",
      "MANAGEMENT",
      "ENDORSING_COMMITTEE",
      "ADMIN",
      "OFFICER",
    ],
  },
  reports: {
    section: "reports",
    label: "Reports",
    href: "/workspace/reports",
    icon: "reports",
    description: "Open directorate procurement reports and summaries.",
    allowedRoles: [
      "DIRECTOR",
      "MANAGEMENT",
      "OFFICER",
      "ENDORSING_COMMITTEE",
      "ADMIN",
    ],
  },
  "my-decisions": {
    section: "my-decisions",
    label: "My Decisions",
    href: "/workspace/my-decisions",
    icon: "decision",
    description: "View decisions you have recorded for submitted plans.",
    allowedRoles: ["ENDORSING_COMMITTEE"],
  },
  "user-management": {
    section: "user-management",
    label: "User Management",
    href: "/workspace/user-management",
    icon: "users",
    description: "Manage authorized users, account status and assigned roles.",
    allowedRoles: ["ADMIN"],
  },
  "system-logs": {
    section: "system-logs",
    label: "System Logs (Timestamp)",
    href: "/workspace/system-logs",
    icon: "logs",
    description: "Review timestamped system and authentication activity.",
    allowedRoles: ["ADMIN"],
  },
  notifications: {
    section: "notifications",
    label: "Notifications",
    href: "/workspace/notifications",
    icon: "clipboard",
    description:
      "View alerts, reviews, milestone deadlines and system notifications.",
    allowedRoles: [
      "OFFICER",
      "DIRECTOR",
      "MANAGEMENT",
      "ENDORSING_COMMITTEE",
      "ADMIN",
    ],
  },
} as const satisfies Record<string, WorkspaceSection>;

type WorkspaceSectionKey = keyof typeof workspaceSections;

const roleSectionOrder: Record<UserRole, readonly WorkspaceSectionKey[]> = {
  OFFICER: ["projects", "contracts", "activity-tracker"],
  DIRECTOR: ["projects", "plan-for-review", "vote-progress", "reports"],
  MANAGEMENT: ["projects", "plan-for-review", "vote-progress", "reports"],
  ENDORSING_COMMITTEE: ["plan-for-review", "my-decisions"],
  ADMIN: ["user-management", "system-logs"],
};

export function getNavigationForRole(role: UserRole): NavigationItem[] {
  return [
    {
      label: "Dashboard",
      href: dashboardPath(role),
      icon: "dashboard",
    },
    ...roleSectionOrder[role].map((section) => workspaceSections[section]),
  ];
}

export function getWorkspaceSection(
  section: string,
): WorkspaceSection | undefined {
  return workspaceSections[section as WorkspaceSectionKey];
}

export function canAccessWorkspaceSection(
  role: UserRole,
  section: string,
): boolean {
  return getWorkspaceSection(section)?.allowedRoles.includes(role) ?? false;
}
