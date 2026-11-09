import dynamic from "next/dynamic";
import type { AuthUser } from "@/lib/authTypes";

const DashboardLoadingFallback = () => (
  <div className="p-6 space-y-4 animate-pulse" role="status" aria-busy="true">
    <div className="h-7 w-48 bg-slate-200 rounded-md" />
    <div className="h-4 w-72 bg-slate-100 rounded-md" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
      <div className="h-28 bg-slate-100 rounded-xl" />
      <div className="h-28 bg-slate-100 rounded-xl" />
      <div className="h-28 bg-slate-100 rounded-xl" />
      <div className="h-28 bg-slate-100 rounded-xl" />
    </div>
    <div className="h-72 bg-slate-100 rounded-xl mt-4" />
  </div>
);

const AdminDashboard = dynamic(
  () => import("./admin/AdminDashboard").then((m) => m.AdminDashboard),
  { loading: () => <DashboardLoadingFallback /> }
);
const CommitteeDashboard = dynamic(
  () => import("./committee/CommitteeDashboard").then((m) => m.CommitteeDashboard),
  { loading: () => <DashboardLoadingFallback /> }
);
const DirectorDashboard = dynamic(
  () => import("./director/DirectorDashboard").then((m) => m.DirectorDashboard),
  { loading: () => <DashboardLoadingFallback /> }
);
const OfficerDashboard = dynamic(
  () => import("./officer/OfficerDashboard").then((m) => m.OfficerDashboard),
  { loading: () => <DashboardLoadingFallback /> }
);
const ManagementDashboard = dynamic(
  () => import("./management/ManagementDashboard").then((m) => m.ManagementDashboard),
  { loading: () => <DashboardLoadingFallback /> }
);
const ExecutiveOverviewDashboard = dynamic(
  () => import("../executive-dashboard/ExecutiveDashboard").then((m) => m.ExecutiveDashboard),
  { loading: () => <DashboardLoadingFallback /> }
);

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
    case "SUPERUSER":
      return <AdminDashboard user={user} />;
  }
}
