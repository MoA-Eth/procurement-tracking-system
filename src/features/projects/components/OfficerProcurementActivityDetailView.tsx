import { StatusText } from "../../../components/dashboard/StatusText";
import type {
  ProcurementActivityAllocation,
  ProcurementActivityRoadmapStage,
  ProcurementActivitySummary,
} from "@/features/projects/data/officerActivityDrafts";
import type {
  OfficerProject,
  ProcurementPlanSummary,
} from "@/features/projects/data/officerProjects";
import {
  ArrowLeft,
  ClipboardList,
  FolderOpen,
  MapPin,
  Route,
  Edit3,
  History,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { EditActivityModal } from "@/features/activities/components/EditActivityModal";
import { VersionHistoryModal } from "@/features/plans/components/VersionHistoryModal";
import { PhaseDelayBreakdownModal } from "./PhaseDelayBreakdownModal";
import { getPlanVersionHistory } from "@/features/plans/data/planRevisions";

interface DetailValue {
  label: string;
  value: string;
}

export function OfficerProcurementActivityDetailView({
  activity: initialActivity,
  currentUser,
  fromTracker,
  onUpdateActivity,
  plan,
  project,
}: {
  activity: ProcurementActivitySummary;
  currentUser?: { name?: string; role?: string } | null;
  fromTracker?: boolean;
  onUpdateActivity?: (updated: ProcurementActivitySummary) => void;
  plan: ProcurementPlanSummary;
  project: OfficerProject;
}) {
  const [currentActivity, setCurrentActivity] =
    useState<ProcurementActivitySummary>(initialActivity);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);

  const isMultiOfficerProject =
    (project.assignedOfficers?.length ?? 0) > 1 ||
    (project.assignedOfficerIds?.length ?? 0) > 1;

  const activity = currentActivity;

  const planHistory = getPlanVersionHistory(plan.id || plan.reference);
  const isActivityRevised =
    planHistory.some(
      (r) =>
        (r.activityReference === activity.reference ||
          (r.actionLabel && r.actionLabel.includes(activity.reference))) &&
        (r.action === "ACTIVITY_REVISED" ||
          (r.changes && r.changes.length > 0)),
    ) ||
    Boolean(
      activity.details?.roadmap?.some(
        (stage) => stage.revisions && stage.revisions.length > 0,
      ),
    ) ||
    Boolean((activity as any).version && (activity as any).version > 1) ||
    Boolean(
      activity.updatedByName &&
      activity.createdByName &&
      activity.updatedByName !== activity.createdByName,
    );
  const trackerHref =
    "/workspace/activity-tracker?project=" +
    encodeURIComponent(project.code) +
    "&plan=" +
    encodeURIComponent(plan.reference) +
    "&activity=" +
    encodeURIComponent(activity.reference);
  const planHref =
    "/workspace/projects?project=" +
    encodeURIComponent(project.code) +
    "&plan=" +
    encodeURIComponent(plan.reference);
  const backHref = fromTracker ? trackerHref : planHref;
  const backLabel = fromTracker ? "Back to Tracker" : "Back to Plan";
  const details = activity.details;
  const form = details?.form;

  const keyDetails = compactValues([
    { label: "Procurement Category", value: activity.category },
    { label: "Procurement Method", value: activity.method },
    { label: "Specific Method / Approach", value: form?.specificMethod ?? "" },
    { label: "Market Approach", value: form?.marketApproach ?? "" },
    { label: "Contract Type", value: form?.contractType ?? "" },
    {
      label: "Procurement Document Type",
      value: form?.procurementDocumentType ?? "",
    },
    {
      label: "Qualification Approach",
      value: form?.qualificationApproach ?? "",
    },
    {
      label: "Domestic / Regional Preference",
      value: form?.domesticPreference ?? "",
    },
    { label: "Review Type", value: form?.reviewType ?? "" },
    {
      label: "Oversight Classification",
      value: form?.oversightClassification ?? "",
    },
    { label: "Procurement Process", value: form?.procurementProcess ?? "" },
    ...(form
      ? [
          {
            label: "Requires UN Agency Contracting",
            value: form.requiresUnAgency ? "Yes" : "No",
          },
          {
            label: "Activity Is In-Process",
            value: form.inProcess ? "Yes" : "No",
          },
        ]
      : []),
  ]);

  const relatedInformation = compactValues([
    { label: "Activity Reference", value: activity.reference },
    { label: "Activity Description", value: activity.description },
    {
      label: `Estimated Amount (${form?.currency || plan.currency})`,
      value: formatAmount(activity.estimatedAmount),
    },
    { label: "Currency", value: form?.currency ?? plan.currency },
    {
      label: "Primary Funding Source",
      value: form?.fundingSource ?? project.fundingSource,
    },
    { label: "Pricing Basis", value: form?.pricingBasis ?? "" },
    {
      label: "Invitation / Bid Reference Number",
      value: form?.invitationReference ?? "",
    },
    { label: "Subcomponent", value: form?.subcomponent ?? "" },
    ...(form
      ? [{ label: "Lot Required", value: form.lotRequired ? "Yes" : "No" }]
      : []),
    { label: "Description / Scope Notes", value: form?.scopeNotes ?? "" },
    { label: "Comments / Remarks", value: form?.comments ?? "" },
  ]);

  const additionalDetails = compactValues([
    {
      label: "Classification Code",
      value: form?.classificationCode ?? "",
    },
    {
      label: "Evaluation Option Code",
      value: form?.evaluationOptionCode ?? "",
    },
    { label: "High-Risk Code", value: form?.highRiskCode ?? "" },
    { label: "Location / Region", value: form?.location ?? "" },
  ]);

  const selectedComponents =
    details?.componentAllocations.filter((item) => item.selected) ?? [];
  const selectedFinancing =
    details?.financingAllocations.filter((item) => item.selected) ?? [];
  const signedContractIndex =
    details?.roadmap.findIndex((stage) => stage.name === "Signed Contract") ??
    -1;
  const planningStages =
    details?.roadmap.slice(
      0,
      signedContractIndex >= 0 ? signedContractIndex + 1 : undefined,
    ) ?? [];
  const monitoringStages =
    signedContractIndex >= 0
      ? (details?.roadmap.slice(signedContractIndex + 1) ?? [])
      : [];

  return (
    <div className="min-w-0 space-y-5 pb-6">
      <header>
        <ActivityBreadcrumb
          activity={activity}
          fromTracker={fromTracker}
          plan={plan}
          planHref={planHref}
          project={project}
          trackerHref={trackerHref}
        />
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#176c55]">
              Procurement Activity
            </p>
            <h1 className="mt-1 max-w-4xl text-2xl font-extrabold tracking-tight text-[#10243f]">
              {activity.description}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                Reference:{" "}
                <strong className="font-semibold text-[#1261a8]">
                  {activity.reference}
                </strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">
                •
              </span>
              <StatusText className="text-[10px]" label={activity.status} />
              {isMultiOfficerProject && activity.createdByName && (
                <>
                  <span aria-hidden="true" className="text-slate-300">
                    •
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                    Created by:{" "}
                    <strong className="font-semibold text-slate-800">
                      {activity.createdByName}
                    </strong>
                  </span>
                </>
              )}
              {isMultiOfficerProject && activity.updatedByName && (
                <>
                  <span aria-hidden="true" className="text-slate-300">
                    •
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 border border-emerald-200">
                    Last edited by:{" "}
                    <strong className="font-semibold text-emerald-950">
                      {activity.updatedByName}
                    </strong>
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isActivityRevised && (
              <button
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[#176c55] hover:bg-[#edf5f1] hover:text-[#176c55] transition cursor-pointer"
                onClick={() => setIsHistoryModalOpen(true)}
                title="View Activity Version History"
                type="button"
              >
                <History className="h-3.5 w-3.5 text-[#176c55]" />
                Version History
              </button>
            )}

            {/* View Delay by Phase button */}
            <button
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 hover:border-rose-300 transition cursor-pointer"
              onClick={() => setIsDelayModalOpen(true)}
              type="button"
              title="View process-by-process breakdown of duration and delay"
            >
              <Clock className="h-3.5 w-3.5 text-rose-600" />
              <span>Delay in Phase</span>
            </button>

            {(plan.status === "Draft" ||
              plan.status === "Returned" ||
              plan.status === "Returned for Revision") && (
              <Link
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[#176c55] hover:bg-[#edf5f1] hover:text-[#176c55] transition"
                href={
                  "/workspace/projects?project=" +
                  encodeURIComponent(project.code) +
                  "&plan=" +
                  encodeURIComponent(plan.reference) +
                  "&activity=" +
                  encodeURIComponent(activity.reference) +
                  "&mode=edit-activity"
                }
              >
                <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                Revise Activity
              </Link>
            )}

            <Link
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#176c55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
              href={backHref}
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              {backLabel}
            </Link>
          </div>
        </div>
      </header>

      <DetailCard
        icon={<ClipboardList aria-hidden="true" className="h-4 w-4" />}
        number={1}
        title="Key Details"
      >
        <DetailGrid values={keyDetails} />
      </DetailCard>

      <DetailCard
        icon={<FolderOpen aria-hidden="true" className="h-4 w-4" />}
        number={2}
        title="Related Information"
      >
        <section className="rounded-md border border-[#cfd8e8] bg-[#f2f5ff] p-3">
          <h3 className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#07523f]">
            <FolderOpen aria-hidden="true" className="h-3.5 w-3.5" />
            Inherited Project &amp; Plan Context
          </h3>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Project" value={project.name} />
            <DetailItem label="Project Code" value={project.code} />
            <DetailItem label="Procurement Plan" value={plan.name} />
            <DetailItem label="Plan Reference" value={plan.reference} />
            <DetailItem label="Fiscal Year" value={plan.budgetYear} />
            <DetailItem
              label={
                project.assignedOfficers.length > 1
                  ? "Assigned Officers"
                  : "Responsible Officer"
              }
              value={
                project.assignedOfficers.length
                  ? project.assignedOfficers.join(", ")
                  : "Not assigned"
              }
            />
            {isMultiOfficerProject && activity.createdByName && (
              <DetailItem
                label="Activity Created By"
                value={activity.createdByName}
              />
            )}
            {isMultiOfficerProject && activity.updatedByName && (
              <DetailItem
                label="Activity Last Edited By"
                value={activity.updatedByName}
              />
            )}
          </dl>
        </section>

        <div className="mt-4">
          <DetailGrid values={relatedInformation} />
        </div>

        {details?.lots.length ? (
          <CompactTable
            columns={[
              "Lot Number",
              "Description",
              `Amount (${form?.currency})`,
            ]}
            rows={details.lots.map((lot) => [
              lot.number,
              lot.description,
              formatAmount(Number(lot.amount)),
            ])}
            title="Lots"
          />
        ) : null}
      </DetailCard>

      <DetailCard
        icon={<MapPin aria-hidden="true" className="h-4 w-4" />}
        number={3}
        title="Additional Details"
      >
        {selectedComponents.length ? (
          <AllocationList
            allocations={selectedComponents}
            title="Project Component Allocation"
          />
        ) : null}
        {selectedFinancing.length ? (
          <AllocationList
            allocations={selectedFinancing}
            title="Financing Allocation"
          />
        ) : null}
        {additionalDetails.length ? (
          <div
            className={
              selectedComponents.length || selectedFinancing.length
                ? "mt-5 border-t border-slate-200 pt-4"
                : ""
            }
          >
            <DetailGrid values={additionalDetails} />
          </div>
        ) : null}
        {!details ? (
          <UnavailableNote>
            No additional-information submission is stored for this existing
            activity.
          </UnavailableNote>
        ) : null}
      </DetailCard>

      <DetailCard
        icon={<Route aria-hidden="true" className="h-4 w-4" />}
        number={4}
        title="Roadmap"
      >
        {planningStages.length ? (
          <RoadmapTable
            allStages={details?.roadmap ?? []}
            stages={planningStages}
            title="Procurement Planning Roadmap"
          />
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Current Stage" value={activity.currentStage} />
            <DetailItem label="Status" value={activity.status} />
          </dl>
        )}
        {monitoringStages.length ? (
          <div className="mt-4">
            <RoadmapTable
              allStages={details?.roadmap ?? []}
              stages={monitoringStages}
              title="Procurement Monitoring"
            />
          </div>
        ) : null}
      </DetailCard>

      <VersionHistoryModal
        activityDescription={activity.description}
        activityReference={activity.reference}
        currentStatus={activity.status}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        planId={plan.id || plan.reference}
        planName={plan.name}
        projectCode={project.code}
      />

      {isEditModalOpen && (
        <EditActivityModal
          activity={currentActivity}
          isOpen={isEditModalOpen}
          onActivityUpdated={(updated) => {
            setCurrentActivity(updated);
            onUpdateActivity?.(updated);
          }}
          onClose={() => setIsEditModalOpen(false)}
          plan={plan}
          projectCode={project.code}
          userName={currentUser?.name || "Procurement Officer"}
          userRole={currentUser?.role || "Procurement Officer"}
        />
      )}

      <PhaseDelayBreakdownModal
        isOpen={isDelayModalOpen}
        onClose={() => setIsDelayModalOpen(false)}
        data={{
          reference: activity.reference,
          title: activity.description || activity.reference,
          category: activity.category,
          method: activity.method,
          totalDelayDays:
            (activity as any).delayDays || (activity as any).daysOverdue || 12,
          stages:
            (activity as any).stages ||
            (details as any)?.roadmapStages ||
            (details as any)?.stages ||
            [],
          activityHref: trackerHref,
          planReference: plan.reference,
          projectCode: project.code,
        }}
      />
    </div>
  );
}

function ActivityBreadcrumb({
  activity,
  fromTracker,
  plan,
  planHref,
  project,
  trackerHref,
}: {
  activity: ProcurementActivitySummary;
  fromTracker?: boolean;
  plan: ProcurementPlanSummary;
  planHref: string;
  project: OfficerProject;
  trackerHref: string;
}) {
  if (fromTracker) {
    return (
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link className="hover:text-[#176c55]" href="/dashboard/officer">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              className="hover:text-[#176c55]"
              href="/workspace/activity-tracker"
            >
              Activity Tracker
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link className="hover:text-[#176c55]" href={trackerHref}>
              {activity.reference}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-semibold text-slate-800">
            Activity Details
          </li>
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link className="hover:text-[#176c55]" href="/dashboard/officer">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link className="hover:text-[#176c55]" href="/workspace/projects">
            Projects
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link
            className="hover:text-[#176c55]"
            href={`/workspace/projects?project=${encodeURIComponent(project.code)}`}
          >
            {project.shortName}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link
            className="max-w-60 truncate hover:text-[#176c55]"
            href={planHref}
          >
            {plan.name}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="font-semibold text-slate-800">
          Activity Details
        </li>
      </ol>
    </nav>
  );
}

function DetailCard({
  children,
  icon,
  number,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  number: number;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-[#c7d8d1] bg-[#edf5f1] px-4 py-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#176c55] text-[10px] font-extrabold text-white">
          {number}
        </span>
        <span className="text-[#176c55]">{icon}</span>
        <h2 className="text-sm font-extrabold text-[#10243f]">{title}</h2>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function DetailGrid({ values }: { values: DetailValue[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {values.map((item) => (
        <DetailItem key={item.label} {...item} />
      ))}
    </dl>
  );
}

function DetailItem({ label, value }: DetailValue) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-bold uppercase tracking-[0.07em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 wrap-break-word text-xs font-semibold leading-5 text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function AllocationList({
  allocations,
  title,
}: {
  allocations: ProcurementActivityAllocation[];
  title: string;
}) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="text-[10px] font-extrabold text-slate-700">{title}</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {allocations.map((allocation) => (
          <div
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-[#fbfcfd] px-3 py-2"
            key={allocation.id}
          >
            <span className="min-w-0 wrap-break-word text-[10px] font-semibold text-slate-700">
              {allocation.id}
            </span>
            <span className="shrink-0 rounded bg-[#e8f5ef] px-2 py-0.5 text-[10px] font-bold text-[#047857]">
              {allocation.percent}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompactTable({
  columns,
  rows,
  title,
}: {
  columns: string[];
  rows: string[][];
  title: string;
}) {
  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
      <h3 className="border-b border-slate-200 bg-[#edf5f1] px-3.5 py-2.5 text-[11px] font-extrabold text-[#16253d]">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-136 border-collapse text-left">
          <thead>
            <tr className="bg-[#0A3C2F] text-white text-[10px] font-extrabold uppercase tracking-wider">
              {columns.map((column) => (
                <th className="px-3 py-2.5" key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row, rowIndex) => (
              <tr key={row.join("-") || rowIndex}>
                {row.map((value, valueIndex) => (
                  <td
                    className="px-3 py-2 text-[10px] leading-4 text-slate-700"
                    key={columns[valueIndex]}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoadmapTable({
  allStages,
  stages,
  title,
}: {
  allStages: ProcurementActivityRoadmapStage[];
  stages: ProcurementActivityRoadmapStage[];
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
      <h3 className="border-b border-slate-200 bg-[#edf5f1] px-3.5 py-2.5 text-[11px] font-extrabold text-[#16253d]">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-184 border-collapse text-left">
          <thead>
            <tr className="bg-[#0A3C2F] text-white text-[10px] font-extrabold uppercase tracking-wider">
              <th className="w-[34%] px-3 py-2.5" scope="col">
                Stage
              </th>
              <th className="w-[31%] px-3 py-2.5" scope="col">
                Original Planned Date (GC / EC)
              </th>
              <th className="w-[12%] px-3 py-2.5" scope="col">
                Duration
              </th>
              <th className="w-[13%] px-3 py-2.5" scope="col">
                Type
              </th>
              <th className="w-[10%] px-3 py-2.5" scope="col">
                N/A
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {stages.map((stage) => (
              <tr
                className={stage.notApplicable ? "bg-slate-50" : ""}
                key={stage.name}
              >
                <td className="px-3 py-2 text-[10px] font-semibold text-slate-700">
                  {stage.name}
                  {stage.remarks ? (
                    <span className="mt-0.5 block font-normal text-slate-500">
                      {stage.remarks}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-[10px] text-slate-700">
                  {stage.notApplicable
                    ? "Not applicable"
                    : formatRoadmapDate(stage)}
                </td>
                <td className="px-3 py-2 text-[10px] text-slate-500">
                  {stage.notApplicable ? "—" : formatDuration(allStages, stage)}
                </td>
                <td className="px-3 py-2 text-[10px] text-slate-500">
                  {stage.allowNotApplicable ? "Conditional" : "Required"}
                </td>
                <td className="px-3 py-2 text-[10px] font-semibold text-slate-500">
                  {stage.notApplicable ? "Yes" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UnavailableNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-[10px] leading-4 text-slate-500">
      {children}
    </p>
  );
}

function compactValues(values: DetailValue[]) {
  return values.filter((item) => item.value.trim().length > 0);
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function safeParseDate(dateStr?: string | null): Date | null {
  if (!dateStr || dateStr === "N/A" || dateStr === "Date not recorded")
    return null;
  if (dateStr.includes("T")) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(`${dateStr.trim()}T00:00:00Z`);
  if (!isNaN(d.getTime())) return d;
  const d2 = new Date(dateStr);
  return isNaN(d2.getTime()) ? null : d2;
}

function formatRoadmapDate(stage: ProcurementActivityRoadmapStage) {
  const d = safeParseDate(stage.gregorianDate);
  const gregorian = d
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
        year: "numeric",
      })
        .format(d)
        .replaceAll(" ", "-")
    : stage.gregorianDate && stage.gregorianDate !== "N/A"
      ? stage.gregorianDate
      : "Date not recorded";

  const hasEthiopian = Boolean(
    stage.ethiopianDate &&
    stage.ethiopianDate !== "N/A" &&
    stage.ethiopianDate !== "Date not recorded",
  );

  return hasEthiopian ? `${gregorian} (${stage.ethiopianDate})` : gregorian;
}

function formatDuration(
  allStages: ProcurementActivityRoadmapStage[],
  stage: ProcurementActivityRoadmapStage,
) {
  const currentIndex = allStages.findIndex((item) => item.name === stage.name);
  const currentD = safeParseDate(stage.gregorianDate);
  if (!currentD || currentIndex < 0) return "—";

  const previousStage = allStages
    .slice(0, currentIndex)
    .reverse()
    .find(
      (item) =>
        !item.notApplicable && safeParseDate(item.gregorianDate) !== null,
    );
  if (!previousStage) return "0 days";

  const previousD = safeParseDate(previousStage.gregorianDate);
  if (!previousD) return "—";

  const diffMs = currentD.getTime() - previousD.getTime();
  return `${Math.round(diffMs / 86_400_000)} days`;
}
