import type { UserRole } from "@/types";

export const DASHBOARD_HEADINGS: Record<
  UserRole,
  { eyebrow: string; description: string }
> = {
  OFFICER: {
    eyebrow: "Procurement operations",
    description:
      "Prepare procurement records, track activities and follow assigned contracts.",
  },
  DIRECTOR: {
    eyebrow: "Directorate oversight",
    description:
      "Review submitted plans, monitor implementation and follow committee progress.",
  },
  ENDORSING_COMMITTEE: {
    eyebrow: "Committee review",
    description:
      "Review procurement plans and record clear, traceable committee decisions.",
  },
  ADMIN: {
    eyebrow: "System administration",
    description:
      "Manage authorized users and review timestamped authentication activity.",
  },
  MANAGEMENT_TEAM: {
    eyebrow: "Management oversight",
    description:
      "Review institutional procurement progress, operational decisions, and executive workflows.",
  },
};

export function getDashboardHeading(role: UserRole) {
  return DASHBOARD_HEADINGS[role];
}
