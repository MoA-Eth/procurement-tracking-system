import dynamicImport from "next/dynamic";

const SectionLoadingFallback = () => (
  <div className="p-6 space-y-4 animate-pulse" role="status" aria-busy="true">
    <div className="h-7 w-56 bg-slate-200 rounded-md" />
    <div className="h-4 w-80 bg-slate-100 rounded-md" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
      <div className="h-24 bg-slate-100 rounded-xl" />
      <div className="h-24 bg-slate-100 rounded-xl" />
      <div className="h-24 bg-slate-100 rounded-xl" />
      <div className="h-24 bg-slate-100 rounded-xl" />
    </div>
    <div className="h-64 bg-slate-100 rounded-xl mt-4" />
  </div>
);

const ReportsView = dynamicImport(
  () => import("@/features/reports/components/ReportsView").then((m) => m.ReportsView),
  { loading: () => <SectionLoadingFallback /> }
);
const ExecutiveDashboard = dynamicImport(
  () => import("@/features/executive-dashboard/ExecutiveDashboard").then((m) => m.ExecutiveDashboard),
  { loading: () => <SectionLoadingFallback /> }
);
const CommitteeProgressView = dynamicImport(
  () => import("@/features/plans/components/CommitteeProgressView").then((m) => m.CommitteeProgressView),
  { loading: () => <SectionLoadingFallback /> }
);
const AmendmentRequestsView = dynamicImport(
  () => import("@/features/plans/components/AmendmentRequestsView").then((m) => m.AmendmentRequestsView),
  { loading: () => <SectionLoadingFallback /> }
);
const SystemLogsView = dynamicImport(
  () => import("@/features/dashboards/admin/SystemLogsView").then((m) => m.SystemLogsView),
  { loading: () => <SectionLoadingFallback /> }
);
const UserManagementView = dynamicImport(
  () => import("@/features/dashboards/admin/UserManagementView").then((m) => m.UserManagementView),
  { loading: () => <SectionLoadingFallback /> }
);
const OfficerContractsView = dynamicImport(
  () => import("@/features/contracts/components/OfficerContractsView").then((m) => m.OfficerContractsView),
  { loading: () => <SectionLoadingFallback /> }
);
const OfficerActivityTrackerView = dynamicImport(
  () => import("@/features/activity-tracker/components/OfficerActivityTrackerView").then((m) => m.OfficerActivityTrackerView),
  { loading: () => <SectionLoadingFallback /> }
);
const DirectorActivityTrackerView = dynamicImport(
  () => import("@/features/activity-tracker/components/DirectorActivityTrackerView").then((m) => m.DirectorActivityTrackerView),
  { loading: () => <SectionLoadingFallback /> }
);
const OfficerProjectsView = dynamicImport(
  () => import("@/features/projects/components/OfficerProjectsView").then((m) => m.OfficerProjectsView),
  { loading: () => <SectionLoadingFallback /> }
);
const ProjectsManagementView = dynamicImport(
  () => import("@/features/projects/management/ProjectsManagementView").then((m) => m.ProjectsManagementView),
  { loading: () => <SectionLoadingFallback /> }
);
const PlanForReviewView = dynamicImport(
  () => import("@/features/plans/components/PlanForReviewView").then((m) => m.PlanForReviewView),
  { loading: () => <SectionLoadingFallback /> }
);
const MyDecisionsView = dynamicImport(
  () => import("@/features/plans/components/MyDecisionsView").then((m) => m.MyDecisionsView),
  { loading: () => <SectionLoadingFallback /> }
);
const NotificationsView = dynamicImport(
  () => import("@/features/notifications/components/NotificationsView").then((m) => m.NotificationsView),
  { loading: () => <SectionLoadingFallback /> }
);
const SettingsManagementView = dynamicImport(
  () => import("@/features/settings/SettingsManagementView").then((m) => m.SettingsManagementView),
  { loading: () => <SectionLoadingFallback /> }
);
import { PanelsTopLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ROLE_LABELS, normalizeUserRole } from "../../../../lib/authTypes";
import {
  canAccessWorkspaceSection,
  getWorkspaceSection,
} from "../../../../lib/navigation";
import { requireAuthenticatedSession } from "../../../../lib/serverAuth";

export const dynamic = "force-dynamic";

export default async function WorkspaceSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{
    activity?: string | string[];
    amendment?: string | string[];
    contract?: string | string[];
    from?: string | string[];
    mode?: string | string[];
    origin?: string | string[];
    plan?: string | string[];
    planId?: string | string[];
    project?: string | string[];
    status?: string | string[];
  }>;
}) {
  const { section } = await params;
  const query = await searchParams;
  const definition = getWorkspaceSection(section);
  if (!definition) notFound();

  const session = await requireAuthenticatedSession();
  const userRole = normalizeUserRole(session.user.role);
  if (!canAccessWorkspaceSection(userRole, section)) {
    redirect("/access-denied");
  }

  if (section === "executive-dashboard") return <ExecutiveDashboard />;

  if (section === "projects" && userRole === "OFFICER") {
    const selectedProjectCode =
      typeof query.project === "string" ? query.project : undefined;
    const selectedPlanReference =
      typeof query.plan === "string" ? query.plan : undefined;
    const selectedActivityReference =
      typeof query.activity === "string" ? query.activity : undefined;
    const fromTracker =
      query.from === "tracker" || query.from === "activity-tracker";
    const mode =
      query.mode === "create-plan" ||
      query.mode === "create-activity" ||
      query.mode === "create-additional-activity" ||
      query.mode === "edit-plan" ||
      query.mode === "edit-activity"
        ? query.mode
        : undefined;

    return (
      <OfficerProjectsView
        currentUser={session.user}
        fromTracker={fromTracker}
        mode={mode}
        selectedActivityReference={selectedActivityReference}
        selectedPlanReference={selectedPlanReference}
        selectedProjectCode={selectedProjectCode}
      />
    );
  }

  if (section === "plan-for-review") {
    const selectedPlanId =
      typeof query.plan === "string"
        ? query.plan
        : typeof query.planId === "string"
          ? query.planId
          : undefined;
    const selectedActivityRef =
      typeof query.activity === "string" ? query.activity : undefined;
    const from = typeof query.from === "string" ? query.from : undefined;
    return (
      <PlanForReviewView
        user={session.user}
        selectedPlanId={selectedPlanId}
        selectedActivityRef={selectedActivityRef}
        from={from}
      />
    );
  }

  if (section === "my-decisions") {
    return <MyDecisionsView user={session.user} />;
  }

  if (section === "amendment-requests") {
    return <AmendmentRequestsView user={session.user} />;
  }

  if (section === "vote-progress" || section === "committee-progress") {
    return <CommitteeProgressView currentUser={session.user} />;
  }

  if (section === "reports") {
    return <ReportsView />;
  }

  if (section === "system-logs") {
    return <SystemLogsView />;
  }

  if (section === "notifications") {
    return <NotificationsView user={session.user} />;
  }

  if (section === "user-management") {
    const initialStatus =
      typeof query.status === "string" ? query.status : undefined;
    return (
      <UserManagementView
        currentUser={session.user}
        initialStatus={initialStatus}
      />
    );
  }

  if (section === "settings") {
    return <SettingsManagementView currentUser={session.user} />;
  }

  if (section === "projects" && userRole === "SUPERUSER") {
    const selectedProjectCode =
      typeof query.project === "string" ? query.project : undefined;
    const selectedPlanReference =
      typeof query.plan === "string"
        ? query.plan
        : typeof query.planId === "string"
          ? query.planId
          : undefined;
    const selectedActivityReference =
      typeof query.activity === "string" ? query.activity : undefined;
    const from = typeof query.from === "string" ? query.from : undefined;
    const fromTracker = from === "tracker" || from === "activity-tracker";
    const mode =
      query.mode === "create-plan" ||
      query.mode === "create-activity" ||
      query.mode === "create-additional-activity" ||
      query.mode === "edit-plan" ||
      query.mode === "edit-activity"
        ? query.mode
        : undefined;

    return (
      <div className="space-y-10">
        <section aria-label="Officer project and procurement operations">
          <h1 className="mb-4 text-xl font-semibold text-slate-900">
            Officer Project &amp; Procurement Operations
          </h1>
          <OfficerProjectsView
            currentUser={session.user}
            fromTracker={fromTracker}
            mode={mode}
            selectedActivityReference={selectedActivityReference}
            selectedPlanReference={selectedPlanReference}
            selectedProjectCode={selectedProjectCode}
          />
        </section>
        <section aria-label="Director project administration">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">
            Project Administration &amp; Plan Review
          </h2>
          <ProjectsManagementView
            selectedProjectCode={selectedProjectCode}
            selectedPlanReference={selectedPlanReference}
            from={from}
          />
        </section>
      </div>
    );
  }

  if (
    section === "projects" &&
    (userRole === "DIRECTOR" ||
      userRole === "MANAGEMENT" ||
      userRole === "SUPERUSER")
  ) {
    const selectedProjectCode =
      typeof query.project === "string" ? query.project : undefined;
    const selectedPlanReference =
      typeof query.plan === "string"
        ? query.plan
        : typeof query.planId === "string"
          ? query.planId
          : undefined;
    const from = typeof query.from === "string" ? query.from : undefined;
    return (
      <ProjectsManagementView
        readOnly={userRole === "MANAGEMENT"}
        selectedProjectCode={selectedProjectCode}
        selectedPlanReference={selectedPlanReference}
        from={from}
      />
    );
  }

  if (
    section === "contracts" &&
    (userRole === "OFFICER" || userRole === "SUPERUSER")
  ) {
    const selectedContractNumber =
      typeof query.contract === "string" ? query.contract : undefined;
    const fromOpen = query.from === "open";
    const fromTracker =
      query.from === "tracker" ||
      query.from === "activity-tracker" ||
      query.origin === "tracker";
    const fromProjects = query.from === "projects" || query.from === "plan";
    const mode =
      query.mode === "register" ||
      query.mode === "add-payment" ||
      query.mode === "add-amendment" ||
      query.mode === "edit-amendment" ||
      query.mode === "open" ||
      query.mode === "view"
        ? query.mode
        : undefined;
    const editAmendmentNo =
      typeof query.amendment === "string" && Number(query.amendment) > 0
        ? Number(query.amendment)
        : undefined;
    const initialActivityReference =
      typeof query.activity === "string" ? query.activity : undefined;
    const initialProjectCode =
      typeof query.project === "string" ? query.project : undefined;
    const initialPlanReference =
      typeof query.plan === "string" ? query.plan : undefined;
    return (
      <OfficerContractsView
        editAmendmentNo={editAmendmentNo}
        fromOpen={fromOpen}
        fromProjects={fromProjects}
        fromTracker={fromTracker}
        initialActivityReference={initialActivityReference}
        initialPlanReference={initialPlanReference}
        initialProjectCode={initialProjectCode}
        mode={mode}
        selectedContractNumber={selectedContractNumber}
      />
    );
  }

  if (section === "activity-tracker") {
    if (
      userRole === "DIRECTOR" ||
      userRole === "MANAGEMENT" ||
      userRole === "EXECUTIVE" ||
      userRole === "SUPERUSER"
    ) {
      return (
        <DirectorActivityTrackerView
          userRole={session.user.role}
          selectedActivityReference={
            typeof query.activity === "string" ? query.activity : undefined
          }
          selectedPlanReference={
            typeof query.plan === "string" ? query.plan : undefined
          }
          selectedProjectCode={
            typeof query.project === "string" ? query.project : undefined
          }
        />
      );
    }
    if (userRole !== "OFFICER") {
      redirect("/access-denied");
    }
    return (
      <OfficerActivityTrackerView
        currentUser={session.user}
        selectedActivityReference={
          typeof query.activity === "string" ? query.activity : undefined
        }
        selectedPlanReference={
          typeof query.plan === "string" ? query.plan : undefined
        }
        selectedProjectCode={
          typeof query.project === "string" ? query.project : undefined
        }
      />
    );
  }

  return (
    <div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              {ROLE_LABELS[session.user.role]}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {definition.label}
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              {definition.description}
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <PanelsTopLeft size={27} />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <PanelsTopLeft className="mx-auto text-emerald-600" size={34} />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          {definition.label} workspace
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
          Your role has access to this section. Its procurement records and
          actions can be connected here as the related workflow stories are
          implemented.
        </p>
      </section>
    </div>
  );
}
