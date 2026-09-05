import { ReportsView } from "@/features/reports/components/ReportsView";
import { CommitteeProgressView } from "@/features/plans/components/CommitteeProgressView";
import { SystemLogsView } from "@/features/dashboards/admin/SystemLogsView";
import { UserManagementView } from "@/features/dashboards/admin/UserManagementView";
import { OfficerContractsView } from "@/features/contracts/components/OfficerContractsView";
import { OfficerActivityTrackerView } from "@/features/activity-tracker/components/OfficerActivityTrackerView";
import { DirectorActivityTrackerView } from "@/features/activity-tracker/components/DirectorActivityTrackerView";
import { OfficerProjectsView } from "@/features/projects/components/OfficerProjectsView";
import { ProjectsManagementView } from "@/features/projects/management/ProjectsManagementView";
import { PlanForReviewView } from "@/features/plans/components/PlanForReviewView";
import { MyDecisionsView } from "@/features/plans/components/MyDecisionsView";
import { NotificationsView } from "@/features/notifications/components/NotificationsView";
import { PanelsTopLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ROLE_LABELS } from "../../../../lib/authTypes";
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
    contract?: string | string[];
    from?: string | string[];
    mode?: string | string[];
    plan?: string | string[];
    planId?: string | string[];
    project?: string | string[];
  }>;
}) {
  const { section } = await params;
  const query = await searchParams;
  const definition = getWorkspaceSection(section);
  if (!definition) notFound();

  const session = await requireAuthenticatedSession();
  if (!canAccessWorkspaceSection(session.user.role, section)) {
    redirect("/access-denied");
  }

  if (section === "projects" && session.user.role === "OFFICER") {
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
    return (
      <PlanForReviewView
        user={session.user}
        selectedPlanId={selectedPlanId}
        selectedActivityRef={selectedActivityRef}
      />
    );
  }

  if (section === "my-decisions") {
    return <MyDecisionsView user={session.user} />;
  }

  if (section === "committee-progress") {
    return <CommitteeProgressView />;
  }

  if (section === "reports") {
    return <ReportsView />;
  }

  if (section === "system-logs") {
    return <SystemLogsView />;
  }

  if (section === "notifications") {
    return <NotificationsView />;
  }

  if (section === "user-management") {
    return <UserManagementView currentUser={session.user} />;
  }

  if (section === "projects" && session.user.role === "DIRECTOR") {
    return <ProjectsManagementView />;
  }

  if (section === "contracts" && session.user.role === "OFFICER") {
    const selectedContractNumber =
      typeof query.contract === "string" ? query.contract : undefined;
    const fromTracker =
      query.from === "tracker" || query.from === "activity-tracker";
    const mode =
      query.mode === "register" || query.mode === "add-payment"
        ? query.mode
        : undefined;
    return (
      <OfficerContractsView
        fromTracker={fromTracker}
        mode={mode}
        selectedContractNumber={selectedContractNumber}
      />
    );
  }

  if (section === "activity-tracker") {
    if (session.user.role === "DIRECTOR") {
      return (
        <DirectorActivityTrackerView
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
    if (session.user.role !== "OFFICER") {
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
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
              {ROLE_LABELS[session.user.role]}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
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
        <h2 className="mt-4 text-lg font-extrabold text-slate-900">
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
