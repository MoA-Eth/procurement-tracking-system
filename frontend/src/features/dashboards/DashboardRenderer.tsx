import type { AuthUser } from "@/lib/authTypes";
import { AdminDashboard } from "./admin/AdminDashboard";
import { CommitteeDashboard } from "./committee/CommitteeDashboard";
import { DirectorDashboard } from "./director/DirectorDashboard";
import { OfficerDashboard } from "./officer/OfficerDashboard";
import { ManagementDashboard } from "./management/ManagementDashboard";
import { ExecutiveDashboard as ExecutiveOverviewDashboard } from "../executive-dashboard/ExecutiveDashboard";

export function DashboardRenderer({ user }: { user: AuthUser }) {
  switch (user.role) {
    case "OFFICER":
      return <OfficerDashboard user={user} />;
    case "DIRECTOR":
      return <DirectorDashboard user={user} />;
    case "MANAGEMENT":
      return <ManagementDashboard user={user} />;
    case "EXECUTIVE":
      return <ExecutiveOverviewDashboard />;
    case "ENDORSING_COMMITTEE":
      return <CommitteeDashboard user={user} />;
    case "ADMIN":
      return <AdminDashboard user={user} />;
  }
}
