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
  MANAGEMENT: {
    eyebrow: "Executive management review",
    description:
      "Review endorsed procurement plans, provide comments, and record executive approvals or rejections.",
  },
  EXECUTIVE: {
    eyebrow: "Executive oversight",
    description:
      "View the Executive Dashboard and procurement reports.",
  },
  ADMIN: {
    eyebrow: "System administration",
    description:
      "Manage authorized users and review timestamped authentication activity.",
  },
  SUPERUSER: {
    eyebrow: "System superuser",
    description:
      "Manage every workspace, system setting, user role and operational workflow.",
  },
};

export function getDashboardHeading(role: UserRole) {
  return DASHBOARD_HEADINGS[role];
}
