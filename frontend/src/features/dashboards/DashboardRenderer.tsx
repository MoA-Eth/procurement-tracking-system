import type { AuthUser } from "@/lib/authTypes";
import { AdminDashboard } from "./admin/AdminDashboard";
import { CommitteeDashboard } from "./committee/CommitteeDashboard";
import { DirectorDashboard } from "./director/DirectorDashboard";
import { OfficerDashboard } from "./officer/OfficerDashboard";
import { ManagementDashboard } from "./management/ManagementDashboard";
import { DisbursementsListView } from "@/features/finance/components/DisbursementsListView";

export function DashboardRenderer({ user }: { user: AuthUser }) {
  switch (user.role) {
    case "OFFICER":
      return <OfficerDashboard user={user} />;
    case "DIRECTOR":
      return <DirectorDashboard user={user} />;
    case "MANAGEMENT":
      return <ManagementDashboard user={user} />;
    case "ENDORSING_COMMITTEE":
      return <CommitteeDashboard user={user} />;
    case "ADMIN":
      return <AdminDashboard user={user} />;
    case "FINANCE":
      return <DisbursementsListView currentUser={user} />;
  }
}
