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
  ADMIN: {
    eyebrow: "System administration",
    description:
      "Manage authorized users and review timestamped authentication activity.",
  },
  FINANCE: {
    eyebrow: "Finance & disbursements",
    description:
      "Record disbursements, monitor ministry payments, and review high-value SMS delivery alerts.",
  },
};

export function getDashboardHeading(role: UserRole) {
  return DASHBOARD_HEADINGS[role];
}
