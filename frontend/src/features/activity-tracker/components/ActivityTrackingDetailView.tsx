"use client";

import { StatusText } from "../../../components/dashboard/StatusText";
import {
  OFFICER_CONTRACTS_STORAGE_KEY,
  officerContracts,
  parseSavedContracts,
  type OfficerContract,
} from "../../contracts/data/officerContracts";
import type { OfficerTrackedActivityItem } from "./OfficerActivityTrackerView";
import {
  calculateDelayDays,
  effectiveTargetDate,
  type ActivityStageStatus,
  type ActivityStageTracking,
  type OfficerActivityTrackingRecord,
  type TrackingDateValue,
} from "../data/officerActivityTracking";
import { DualCalendarField } from "../../projects/components/CreateProcurementPlanView";
import type { ProcurementActivityRoadmapStage } from "../../projects/data/officerActivityDrafts";
import {
  recordActualStageDates,
  replanStage,
  updateStageDates,
} from "@/lib/activitiesApi";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  FileClock,
  Info,
  LockKeyhole,
  RefreshCw,
  Route,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ActivityDetailTab = "contract" | "overview" | "roadmap";

const activityDetailTabs: readonly {
  id: ActivityDetailTab;
  label: string;
}[] = [
  { id: "overview", label: "Overview" },
  { id: "roadmap", label: "Roadmap" },
  { id: "contract", label: "Contract" },
];

function activityDetailTabFromHash(hash: string): ActivityDetailTab {
  const tab = hash.replace(/^#/, "");
  return tab === "roadmap" || tab === "contract" || tab === "overview"
    ? tab
    : "overview";
}

export function ActivityTrackingDetailView({
  item,
  onSave,
}: {
  item: OfficerTrackedActivityItem;
  onSave: (record: OfficerActivityTrackingRecord) => void;
}) {
  const roadmap = useMemo(() => trackingRoadmap(item), [item]);
  const [activeTab, setActiveTab] = useState<ActivityDetailTab>("overview");
  const [record, setRecord] = useState(item.tracking);
  const [savedMessage, setSavedMessage] = useState("");
  const [savedContracts, setSavedContracts] = useState<OfficerContract[]>([]);

  useEffect(() => {
    const loadContracts = window.setTimeout(() => {
      setSavedContracts(
        parseSavedContracts(
          window.localStorage.getItem(OFFICER_CONTRACTS_STORAGE_KEY),
        ),
      );
    }, 0);
    return () => window.clearTimeout(loadContracts);
  }, []);

  useEffect(() => {
    const syncTabFromHash = () => {
      setActiveTab(activityDetailTabFromHash(window.location.hash));
    };
    const initialSync = window.setTimeout(syncTabFromHash, 0);
    window.addEventListener("hashchange", syncTabFromHash);

    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener("hashchange", syncTabFromHash);
    };
  }, []);

  const overallStatus = detailOverallStatus(item, record, roadmap);
  const activeStageName = detailCurrentStageName(item, record, roadmap);
  const activityForm = item.activity.details?.form;
  const progress = detailStageProgress(item, record, roadmap);
  const projectActivityHref =
    "/workspace/projects?project=" +
    encodeURIComponent(item.project.code) +
    "&plan=" +
    encodeURIComponent(item.plan.reference) +
    "&activity=" +
    encodeURIComponent(item.activity.reference) +
    "&from=tracker";

  const registeredContract = useMemo(() => {
    const contracts = [
      ...savedContracts,
      ...officerContracts.filter(
        (fixture) =>
          !savedContracts.some(
            (saved) => saved.contractNumber === fixture.contractNumber,
          ),
      ),
    ];
    return contracts.find(
      (contract) =>
        (Boolean(contract.details) &&
          contract.details?.projectCode === item.project.code &&
          contract.details.planReference === item.plan.reference &&
          contract.details.activityReference === item.activity.reference) ||
        (!contract.details &&
          contract.project === item.project.shortName &&
          contract.procurementActivity === item.activity.description),
    );
  }, [item, savedContracts]);
  const contractReady =
    Boolean(registeredContract) || overallStatus === "Contracted";
  const contractHref = registeredContract
    ? `/workspace/contracts?contract=${encodeURIComponent(
        registeredContract.contractNumber,
      )}&from=tracker`
    : "/workspace/contracts?mode=register" +
      "&project=" +
      encodeURIComponent(item.project.code) +
      "&plan=" +
      encodeURIComponent(item.plan.reference) +
      "&activity=" +
      encodeURIComponent(item.activity.reference) +
      "&from=tracker";

  function selectTab(tab: ActivityDetailTab) {
    setActiveTab(tab);
    window.history.replaceState(window.history.state, "", `#${tab}`);
  }

  function updateRecord(
    changes: Partial<Pick<OfficerActivityTrackingRecord, "generalRemarks">>,
  ) {
    setSavedMessage("");
    setRecord((current) => ({ ...current, ...changes }));
  }

  function persist(nextRecord: OfficerActivityTrackingRecord, message: string) {
    const savedRecord = { ...nextRecord, updatedAt: new Date().toISOString() };
    setRecord(savedRecord);
    onSave(savedRecord);
    setSavedMessage(message);
  }

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    tab: ActivityDetailTab,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = activityDetailTabs.findIndex(({ id }) => id === tab);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (currentIndex + direction + activityDetailTabs.length) %
      activityDetailTabs.length;
    const nextTab = activityDetailTabs[nextIndex].id;
    selectTab(nextTab);
    document.getElementById(`${nextTab}-tab`)?.focus();
  }

  return (
    <div className="min-w-0 space-y-5 pb-8">
      <header>
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link className="hover:text-[#176c55]" href="/dashboard/officer">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li>
              <Link
                className="hover:text-[#176c55]"
                href="/workspace/activity-tracker"
              >
                Activity Tracker
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li aria-current="page" className="font-bold text-[#176c55]">
              {item.activity.reference}
            </li>
          </ol>
        </nav>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#176c55]">
              Execution Tracking
            </p>
            <h1 className="mt-1 max-w-5xl text-2xl font-extrabold tracking-tight text-[#10243f]">
              {item.activity.description}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="font-mono text-[#1261a8]">
                {item.activity.reference}
              </span>
              <span aria-hidden="true">•</span>
              <span>{item.project.shortName}</span>
              <span aria-hidden="true">•</span>
              <span>{item.plan.name}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <StatusText className="text-xs" label={overallStatus} />
              <span className="text-xs text-slate-500">
                Current stage:{" "}
                <strong className="font-bold text-slate-700">
                  {activeStageName}
                </strong>
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-600 hover:border-[#8db7a6] hover:text-[#176c55]"
              href={projectActivityHref}
            >
              Full activity details{" "}
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
            <Link
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-600 hover:border-[#8db7a6] hover:text-[#176c55]"
              href="/workspace/activity-tracker"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> Back to
              tracker
            </Link>
          </div>
        </div>
      </header>

      {savedMessage ? (
        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-md border border-[#b8dfcf] bg-[#edf7f2] px-4 py-3 text-xs font-bold text-[#07523f]"
        >
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> {savedMessage}
        </div>
      ) : null}

      <div
        aria-label="Activity tracking sections"
        className="flex gap-6 overflow-x-auto border-b border-slate-200 px-1 pt-1"
        role="tablist"
      >
        {activityDetailTabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              aria-controls={tab.id}
              aria-selected={selected}
              className={`shrink-0 border-b-2 px-0.5 pb-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176c55]/30 ${
                selected
                  ? "border-[#176c55] text-[#07523f]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              id={`${tab.id}-tab`}
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        aria-labelledby="overview-tab"
        className="space-y-5"
        hidden={activeTab !== "overview"}
        id="overview"
        role="tabpanel"
      >
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <SectionHeading
            icon={<CircleDot className="h-4 w-4" />}
            title="Approved Activity Overview"
          />
          <div className="grid gap-x-8 gap-y-5 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewValue
              label="Reference No."
              mono
              value={item.activity.reference}
            />
            <OverviewValue
              label="Activity Description"
              value={item.activity.description}
            />
            <OverviewValue label="Project" value={item.project.shortName} />
            <OverviewValue label="Plan" value={item.plan.name} />
            <OverviewValue label="Fiscal Year" value={item.plan.budgetYear} />
            <OverviewValue
              label="Procurement Category"
              value={item.activity.category}
            />
            <OverviewValue label="Method" value={item.activity.method} />
            <OverviewValue
              label="Estimated Amount"
              value={`${formatAmount(item.activity.estimatedAmount)} ${
                activityForm?.currency || item.plan.currency
              }`}
            />
            <OverviewValue
              label="Funding Source"
              value={activityForm?.fundingSource || item.project.fundingSource}
            />
            <OverviewValue
              label="Market Approach"
              value={activityForm?.marketApproach || "Not recorded"}
            />
            <OverviewValue
              label="Review Type"
              value={activityForm?.reviewType || "Not recorded"}
            />
            <OverviewValue
              label="Project Component"
              value={activityForm?.subcomponent || "Not recorded"}
            />
            <OverviewValue
              label="Organization / Region"
              value={
                item.plan.organizationRegion || item.project.organizationRegion
              }
            />
            <OverviewValue
              label="Assigned Officer"
              value={item.project.assignedOfficers.join(", ")}
            />
          </div>
          <div className="flex items-start gap-2 border-t border-slate-200 bg-[#fafbfc] px-4 py-3 text-[10px] leading-5 text-slate-500">
            <LockKeyhole
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
            />
            {activityForm
              ? "Approved category, method, scope, and original roadmap dates remain read-only in Activity Tracker."
              : "Only the approved summary is available for this activity. Fields not captured in the source record are marked Not recorded."}
          </div>
        </section>
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <SectionHeading
            icon={<Activity className="h-4 w-4" />}
            title="Execution Summary"
          />
          <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(18rem,2fr)]">
            <div className="border-l-2 border-[#8db7a6] pl-3">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
                Overall Status
              </p>
              <StatusText className="mt-2 text-xs" label={overallStatus} />
            </div>
            <div className="border-l-2 border-slate-200 pl-3">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
                Current Stage
              </p>
              <p className="mt-2 text-xs font-bold leading-5 text-[#10243f]">
                {activeStageName}
              </p>
            </div>
            <div className="border-l-2 border-slate-200 pl-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
                  Roadmap Progress
                </p>
                {roadmap.length > 0 ? (
                  <strong className="text-xs tabular-nums text-[#10243f]">
                    {progress.percent}%
                  </strong>
                ) : null}
              </div>
              {roadmap.length > 0 ? (
                <>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#176c55]"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[9px] text-slate-500">
                    {progress.completed} of {progress.total} applicable stages
                    complete
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs font-bold text-slate-500">
                  Schedule not recorded
                </p>
              )}
            </div>
            <label className="block">
              <span className="mb-2 block text-[10px] font-bold text-slate-600">
                General Execution Note
              </span>
              <div className="flex min-w-0 gap-2">
                <input
                  className="h-9 min-w-0 flex-1 rounded border border-slate-300 px-3 text-xs text-slate-700 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
                  onChange={(event) =>
                    updateRecord({ generalRemarks: event.target.value })
                  }
                  placeholder="Issue, follow-up, or execution note..."
                  value={record.generalRemarks}
                />
                <button
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-[#176c55] px-3 text-xs font-bold text-white hover:bg-[#125442]"
                  onClick={() => persist(record, "Execution note saved.")}
                  type="button"
                >
                  <Save aria-hidden="true" className="h-3.5 w-3.5" /> Save note
                </button>
              </div>
              <span className="mt-1 block text-[9px] text-slate-400">
                {record.updatedAt
                  ? `Last saved ${formatDateTime(record.updatedAt)}`
                  : "No execution note has been saved yet."}
              </span>
            </label>
          </div>
        </section>
      </div>

      <div
        aria-labelledby="roadmap-tab"
        className="space-y-5"
        hidden={activeTab !== "roadmap"}
        id="roadmap"
        role="tabpanel"
      >
        {roadmap.length > 0 ? (
          <RoadmapTrackingSection
            item={item}
            onRecordChange={setRecord}
            onSave={persist}
            record={record}
            roadmap={roadmap}
          />
        ) : (
          <MissingRoadmapState
            currentStage={item.activity.currentStage}
            projectActivityHref={projectActivityHref}
          />
        )}
        <div className="flex items-start gap-2 rounded-md border border-[#cbd8e6] bg-[#f4f7fb] px-4 py-3 text-[10px] leading-5 text-slate-600">
          <Info
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-[#1261a8]"
          />
          Delay uses the latest revised target when one exists; otherwise it
          uses the approved original date. Historical revisions remain available
          for baseline-variance reporting.
        </div>
      </div>

      <section
        aria-labelledby="contract-tab"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        hidden={activeTab !== "contract"}
        id="contract"
        role="tabpanel"
      >
        <SectionHeading
          icon={<BriefcaseBusiness className="h-4 w-4" />}
          title="Contract Transition"
        />
        {registeredContract ? (
          <>
            <div className="grid gap-x-8 gap-y-5 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <OverviewValue
                label="Contract Number"
                mono
                value={registeredContract.contractNumber}
              />
              <OverviewValue
                label="Supplier / Contractor"
                value={registeredContract.supplier}
              />
              <OverviewValue
                label="Current Amount"
                value={`${formatAmount(registeredContract.currentAmount)} ${registeredContract.currency}`}
              />
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
                  Contract Status
                </p>
                <StatusText
                  className="mt-2 text-xs"
                  label={registeredContract.status}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-[#fafbfc] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-5 text-slate-500">
                Payment records remain in Contract Registry; Activity Tracker
                only shows the execution handoff.
              </p>
              <Link
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-[#176c55] px-4 text-xs font-bold text-white hover:bg-[#125442]"
                href={contractHref}
              >
                View Contract
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        ) : contractReady ? (
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-[#10243f]">
                Signed contract milestone completed
              </p>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                Continue to Contract Registry to record the contract. Payment
                entry remains in the registry after registration.
              </p>
            </div>
            <Link
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-[#176c55] px-4 text-xs font-bold text-white hover:bg-[#125442]"
              href={contractHref}
            >
              Register Contract
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4">
            <LockKeyhole
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
            />
            <div>
              <p className="text-xs font-bold text-slate-700">
                Contract registration is not available yet.
              </p>
              <p className="mt-1 text-[10px] leading-5 text-slate-500">
                Complete the Signed Contract roadmap stage to enable the
                Contract Registry handoff.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function MissingRoadmapState({
  currentStage,
  projectActivityHref,
}: {
  currentStage: string;
  projectActivityHref: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <SectionHeading
        icon={<Route className="h-4 w-4" />}
        title="Procurement Roadmap Tracking"
      />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <FileClock
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
          />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#10243f]">
              Approved roadmap schedule not recorded
            </p>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              This activity has an approved summary, but no original roadmap
              stages or planned dates are stored with it. Tracking remains
              read-only until that approved schedule is available.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
              Summary Current Stage
            </p>
            <p className="mt-1 text-xs font-bold text-[#10243f]">
              {currentStage || "Not recorded"}
            </p>
          </div>
          <Link
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-bold text-slate-600 hover:border-[#8db7a6] hover:text-[#176c55]"
            href={projectActivityHref}
          >
            Open full activity details
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function RoadmapTrackingSection({
  item,
  onRecordChange,
  onSave,
  record,
  roadmap,
}: {
  item: OfficerTrackedActivityItem;
  onRecordChange: (record: OfficerActivityTrackingRecord) => void;
  onSave: (record: OfficerActivityTrackingRecord, message: string) => void;
  record: OfficerActivityTrackingRecord;
  roadmap: readonly ProcurementActivityRoadmapStage[];
}) {
  const initialStage =
    roadmap.find((stage) => stage.name === item.activity.currentStage) ??
    roadmap[0];
  const [selectedStageName, setSelectedStageName] = useState(
    initialStage?.name ?? "",
  );
  const selectedStage =
    roadmap.find((stage) => stage.name === selectedStageName) ?? roadmap[0];
  const selectedTracking = selectedStage
    ? trackingForStage(record, selectedStage, item)
    : undefined;

  function updateStage(changes: Partial<ActivityStageTracking>) {
    if (!selectedTracking) return;
    onRecordChange(
      withStageTracking(record, { ...selectedTracking, ...changes }),
    );
  }

  return (
    <section className="scroll-mt-24 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[#c7d8cf] bg-[#edf5f1] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Route aria-hidden="true" className="h-4 w-4 text-[#176c55]" />
          <h2 className="text-sm font-extrabold text-[#10243f]">
            Procurement Roadmap Tracking
          </h2>
        </div>
        <p className="inline-flex items-center gap-1.5 text-[10px] text-slate-500">
          <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
          Original planned dates are locked after approval
        </p>
      </div>

      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div
          aria-label="Activity roadmap tracking stages"
          className="min-w-0 overflow-x-auto"
          role="region"
          tabIndex={0}
        >
          <table className="w-304 min-w-304 table-fixed border-collapse text-left">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="w-64 px-4 py-3.5" scope="col">
                  Stage
                </th>
                <th className="w-44 px-4 py-3.5" scope="col">
                  Original Planned Date
                </th>
                <th className="w-44 px-4 py-3.5" scope="col">
                  Current Target
                </th>
                <th className="w-44 px-4 py-3.5" scope="col">
                  Actual Date
                </th>
                <th className="w-36 px-4 py-3.5" scope="col">
                  Stage Status
                </th>
                <th className="w-24 px-4 py-3.5 text-center" scope="col">
                  Delay
                </th>
                <th className="w-24 px-4 py-3.5 text-center" scope="col">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {roadmap.map((stage) => {
                const tracking = trackingForStage(record, stage, item);
                const original = dateFromRoadmap(stage);
                const target = effectiveTargetDate(original, tracking);
                const delay = calculateDelayDays(original, tracking);
                const selected = stage.name === selectedStage?.name;
                const isNotApplicable =
                  stage.notApplicable || tracking.status === "Not Applicable";
                return (
                  <tr
                    className={
                      selected
                        ? "bg-[#f2f8f5] text-xs text-slate-700"
                        : "text-xs text-slate-700 hover:bg-slate-50"
                    }
                    key={stage.name}
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold leading-5 text-[#10243f]">
                        {stage.name}
                      </p>
                      {tracking.revisions.length > 0 && !isNotApplicable ? (
                        <span className="mt-1 inline-flex rounded bg-[#eef2ff] px-1.5 py-0.5 text-[9px] font-bold text-[#475569]">
                          R{tracking.revisions.length}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {isNotApplicable ? (
                        <span className="text-slate-400 font-medium text-xs">
                          N/A
                        </span>
                      ) : (
                        <LockedDateValue date={original} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isNotApplicable ? (
                        <span className="text-slate-400 font-medium text-xs">
                          N/A
                        </span>
                      ) : (
                        <DateValue
                          date={target}
                          revised={tracking.revisions.length > 0}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isNotApplicable ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : (
                        <DateValue date={tracking.actualDate ?? emptyDate()} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusText
                        className="text-[9px]"
                        label={tracking.status}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isNotApplicable || delay === null ? (
                        <span className="text-slate-400">—</span>
                      ) : delay > 0 ? (
                        <span className="font-extrabold text-[#b42318]">
                          {delay}d
                        </span>
                      ) : (
                        <span className="font-bold text-[#047857]">0d</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        className="font-bold text-[#1261a8] hover:text-[#07523f] hover:underline"
                        onClick={() => setSelectedStageName(stage.name)}
                        type="button"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="border-t border-slate-200 bg-[#fafbfc] p-4 xl:border-t-0 xl:border-l">
          {selectedStage && selectedTracking ? (
            <StageEditor
              key={selectedStage.name}
              item={item}
              onSave={onSave}
              onUpdate={updateStage}
              record={record}
              roadmap={roadmap}
              stage={selectedStage}
              tracking={selectedTracking}
            />
          ) : (
            <div className="py-10 text-center text-xs text-slate-500">
              Select a roadmap stage to update it.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function detailCurrentStageName(
  item: OfficerTrackedActivityItem,
  record: OfficerActivityTrackingRecord,
  roadmap: readonly ProcurementActivityRoadmapStage[],
) {
  if (roadmap.length === 0) return item.activity.currentStage || "Not started";

  const inProgress = roadmap.find(
    (stage) => trackingForStage(record, stage, item).status === "In Progress",
  );
  if (inProgress) return inProgress.name;

  const declared = roadmap.find(
    (stage) => stage.name === item.activity.currentStage,
  );
  if (
    declared &&
    !["Completed", "Not Applicable"].includes(
      trackingForStage(record, declared, item).status,
    )
  ) {
    return declared.name;
  }

  const firstIncomplete = roadmap.find(
    (stage) =>
      !["Completed", "Not Applicable"].includes(
        trackingForStage(record, stage, item).status,
      ),
  );
  if (firstIncomplete) return firstIncomplete.name;

  return (
    [...roadmap].reverse().find((stage) => !stage.notApplicable)?.name ??
    roadmap[roadmap.length - 1]?.name ??
    "Completed"
  );
}

function detailOverallStatus(
  item: OfficerTrackedActivityItem,
  record: OfficerActivityTrackingRecord,
  roadmap: readonly ProcurementActivityRoadmapStage[],
) {
  if (
    record.processStatus === "Canceled" ||
    detailHasCompletedStage(item, record, roadmap, "contract termination")
  ) {
    return "Terminated";
  }

  const progress = detailStageProgress(item, record, roadmap);
  if (
    record.processStatus === "Completed" ||
    item.activity.status === "Completed" ||
    progress.percent === 100 ||
    detailHasCompletedStage(item, record, roadmap, "contract completion")
  ) {
    return "Completed";
  }

  if (
    record.processStatus === "Signed" ||
    detailHasCompletedStage(item, record, roadmap, "signed contract")
  ) {
    return "Contracted";
  }

  const isDelayed = roadmap.some((stage) => {
    const tracking = trackingForStage(record, stage, item);
    if (["Completed", "Not Applicable"].includes(tracking.status)) return false;
    return (calculateDelayDays(dateFromRoadmap(stage), tracking) ?? 0) > 0;
  });
  if (isDelayed || item.activity.status === "Delayed") return "Delayed";

  if (
    progress.percent > 0 ||
    record.processStatus !== "Pending Implementation" ||
    item.activity.status === "In Progress"
  ) {
    return "In Progress";
  }
  return "Not Started";
}

function detailStageProgress(
  item: OfficerTrackedActivityItem,
  record: OfficerActivityTrackingRecord,
  roadmap: readonly ProcurementActivityRoadmapStage[],
) {
  if (roadmap.length === 0) {
    return {
      completed: Math.round(record.progressPercent / 100),
      percent: record.progressPercent,
      total: 1,
    };
  }

  const applicable = roadmap.filter(
    (stage) =>
      trackingForStage(record, stage, item).status !== "Not Applicable",
  );
  const completed = applicable.filter(
    (stage) => trackingForStage(record, stage, item).status === "Completed",
  ).length;
  return {
    completed,
    percent:
      applicable.length === 0
        ? 0
        : Math.round((completed / applicable.length) * 100),
    total: applicable.length,
  };
}

function detailHasCompletedStage(
  item: OfficerTrackedActivityItem,
  record: OfficerActivityTrackingRecord,
  roadmap: readonly ProcurementActivityRoadmapStage[],
  stageName: string,
) {
  return roadmap.some(
    (stage) =>
      stage.name.toLowerCase().includes(stageName) &&
      trackingForStage(record, stage, item).status === "Completed",
  );
}

function trackingRoadmap(item: OfficerTrackedActivityItem) {
  return item.activity.details?.roadmap ?? [];
}

function trackingForStage(
  record: OfficerActivityTrackingRecord,
  stage: ProcurementActivityRoadmapStage,
  item: OfficerTrackedActivityItem,
): ActivityStageTracking {
  return (
    record.stages.find((tracking) => tracking.stageName === stage.name) ?? {
      remarks: stage.remarks || "",
      revisions: [],
      stageName: stage.name,
      status: stage.notApplicable
        ? "Not Applicable"
        : stage.name === item.activity.currentStage &&
            item.activity.status !== "Not Started"
          ? "In Progress"
          : "Not Started",
    }
  );
}

function withStageTracking(
  record: OfficerActivityTrackingRecord,
  tracking: ActivityStageTracking,
) {
  return {
    ...record,
    stages: [
      ...record.stages.filter(
        (stage) => stage.stageName !== tracking.stageName,
      ),
      tracking,
    ],
  };
}

function dateFromRoadmap(
  stage: ProcurementActivityRoadmapStage | undefined,
): TrackingDateValue {
  return {
    ethiopian: stage?.ethiopianDate ?? "",
    gregorian: stage?.gregorianDate ?? "",
  };
}

function emptyDate(): TrackingDateValue {
  return { ethiopian: "", gregorian: "" };
}

function StageEditor({
  item,
  onSave,
  onUpdate,
  record,
  roadmap,
  stage,
  tracking,
}: {
  item: OfficerTrackedActivityItem;
  onSave: (record: OfficerActivityTrackingRecord, message: string) => void;
  onUpdate: (changes: Partial<ActivityStageTracking>) => void;
  record: OfficerActivityTrackingRecord;
  roadmap: readonly ProcurementActivityRoadmapStage[];
  stage: ProcurementActivityRoadmapStage;
  tracking: ActivityStageTracking;
}) {
  const originalDate = dateFromRoadmap(stage);
  const targetDate = effectiveTargetDate(originalDate, tracking);
  const delay = calculateDelayDays(originalDate, tracking);
  const [stageError, setStageError] = useState("");
  const [revisionError, setRevisionError] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [revisedDate, setRevisedDate] =
    useState<TrackingDateValue>(emptyDate());

  function saveStage() {
    if (tracking.status === "Completed" && !tracking.actualDate?.gregorian) {
      setStageError("A completed stage must have an Actual Date.");
      return;
    }
    const orderError = actualDateOrderError(
      roadmap,
      record,
      stage.name,
      tracking.actualDate?.gregorian ?? "",
    );
    if (orderError) {
      setStageError(orderError);
      return;
    }
    setStageError("");

    // Persist to backend database if stage id exists
    const actId = item.activity.id || item.activity.reference;
    if (stage.id && actId) {
      if (tracking.status === "Completed" && tracking.actualDate?.gregorian) {
        recordActualStageDates(actId, stage.id, {
          actualStartDate: tracking.actualDate.gregorian,
          actualEndDate: tracking.actualDate.gregorian,
        }).catch((err) =>
          console.warn("Backend recordActualStageDates note:", err),
        );
      } else {
        updateStageDates(actId, stage.id, {
          plannedStartDate: tracking.actualDate?.gregorian || undefined,
        }).catch((err) => console.warn("Backend updateStageDates note:", err));
      }
    }

    onSave(withStageTracking(record, tracking), `${stage.name} updated.`);
  }

  function addRevision() {
    if (!originalDate.gregorian) {
      setRevisionError(
        "This stage has no approved baseline date, so it cannot be replanned here.",
      );
      return;
    }
    if (!revisedDate.gregorian) {
      setRevisionError("Select the revised target date.");
      return;
    }
    if (!revisionReason.trim()) {
      setRevisionError("A replanning reason is required.");
      return;
    }
    if (revisedDate.gregorian === targetDate.gregorian) {
      setRevisionError(
        "The revised target must differ from the current target.",
      );
      return;
    }

    const nextTracking: ActivityStageTracking = {
      ...tracking,
      revisions: [
        ...tracking.revisions,
        {
          createdAt: new Date().toISOString(),
          reason: revisionReason.trim(),
          revisionNumber: tracking.revisions.length + 1,
          targetDate: revisedDate,
        },
      ],
    };
    setRevisionError("");
    setRevisionReason("");
    setRevisedDate(emptyDate());

    // Persist replanning revision to backend database
    const actId = item.activity.id || item.activity.reference;
    if (stage.id && actId) {
      replanStage(actId, stage.id, {
        revisedStartDate: revisedDate.gregorian,
        reason: revisionReason.trim(),
      }).catch((err) => console.warn("Backend replanStage note:", err));
    }

    onSave(
      withStageTracking(record, nextTracking),
      `Revision R${nextTracking.revisions.length} saved.`,
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#176c55]">
          Selected Stage
        </p>
        <h3 className="mt-1 text-sm font-extrabold leading-5 text-[#10243f]">
          {stage.name}
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-3">
          <MiniDate label="Original" value={originalDate} />
          <MiniDate label="Current Target" value={targetDate} />
        </div>
        <p
          className={`mt-2 text-[10px] font-bold ${delay && delay > 0 ? "text-[#b42318]" : "text-[#047857]"}`}
        >
          {delay === null
            ? "Delay unavailable"
            : delay > 0
              ? `${delay} calendar days delayed`
              : "On target"}
        </p>
      </div>

      <div className="space-y-4 border-t border-slate-200 pt-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-[#176c55]" />
          <h4 className="text-xs font-extrabold text-[#10243f]">
            Record Stage Progress
          </h4>
        </div>
        <FieldSelect
          label="Stage Status"
          onChange={(value) => {
            const status = value as ActivityStageStatus;
            setStageError("");
            onUpdate({
              status,
              ...(status === "Not Applicable" ? { actualDate: undefined } : {}),
            });
          }}
          options={stageStatusOptions(stage)}
          value={tracking.status}
        />
        <DualCalendarField
          ethiopianValue={tracking.actualDate?.ethiopian ?? ""}
          gregorianValue={tracking.actualDate?.gregorian ?? ""}
          id="tracker-actual-date"
          label="Actual Date"
          onChange={(gregorian, ethiopian) => {
            setStageError("");
            onUpdate({
              actualDate: gregorian ? { ethiopian, gregorian } : undefined,
            });
          }}
          required={tracking.status === "Completed"}
        />
        <label className="block">
          <span className="mb-2 block text-[11px] font-bold text-slate-600">
            Stage Remarks
          </span>
          <textarea
            className="min-h-20 w-full resize-y rounded border border-slate-300 bg-white p-3 text-xs leading-5 text-slate-700 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
            onChange={(event) => onUpdate({ remarks: event.target.value })}
            placeholder="Delay, rebid, issue, or completion note..."
            value={tracking.remarks}
          />
        </label>
        {stageError ? <ErrorMessage>{stageError}</ErrorMessage> : null}
        <button
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#176c55] px-4 text-xs font-bold text-white hover:bg-[#125442]"
          onClick={saveStage}
          type="button"
        >
          <Save aria-hidden="true" className="h-3.5 w-3.5" /> Save Stage Update
        </button>
      </div>

      <div className="space-y-4 border-t border-slate-200 pt-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-[#176c55]" />
          <h4 className="text-xs font-extrabold text-[#10243f]">
            Controlled Replanning
          </h4>
        </div>
        <p className="text-[10px] leading-4 text-slate-500">
          Add a new target without replacing the approved baseline or earlier
          revisions.
        </p>
        <DualCalendarField
          ethiopianValue={revisedDate.ethiopian}
          gregorianValue={revisedDate.gregorian}
          id="tracker-revised-target"
          label="Revised Target Date"
          onChange={(gregorian, ethiopian) => {
            setRevisionError("");
            setRevisedDate({ ethiopian, gregorian });
          }}
          required
        />
        <label className="block">
          <span className="mb-2 block text-[11px] font-bold text-slate-600">
            Replanning Reason <span className="text-red-600">*</span>
          </span>
          <textarea
            className="min-h-20 w-full resize-y rounded border border-slate-300 bg-white p-3 text-xs leading-5 text-slate-700 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
            onChange={(event) => {
              setRevisionError("");
              setRevisionReason(event.target.value);
            }}
            placeholder="Why does this stage need a new target?"
            value={revisionReason}
          />
        </label>
        {revisionError ? <ErrorMessage>{revisionError}</ErrorMessage> : null}
        <button
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#176c55] bg-white px-4 text-xs font-bold text-[#176c55] hover:bg-[#edf5f1] disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          disabled={!originalDate.gregorian}
          onClick={addRevision}
          type="button"
        >
          <FileClock aria-hidden="true" className="h-3.5 w-3.5" /> Add Revision
        </button>

        {tracking.revisions.length > 0 ? (
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
              Revision History
            </p>
            {[...tracking.revisions].reverse().map((revision) => (
              <div
                className="rounded border border-slate-200 bg-white p-3"
                key={revision.revisionNumber}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] font-bold text-[#176c55]">
                    R{revision.revisionNumber}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {formatDateTime(revision.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-bold text-slate-700">
                  {formatGregorianDate(revision.targetDate.gregorian)}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  {revision.reason}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function actualDateOrderError(
  roadmap: readonly ProcurementActivityRoadmapStage[],
  record: OfficerActivityTrackingRecord,
  stageName: string,
  actualDate: string,
) {
  if (!actualDate) return "";
  const index = roadmap.findIndex((stage) => stage.name === stageName);
  for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
    const previousStage = roadmap[previousIndex];
    const previousActual = record.stages.find(
      (stage) => stage.stageName === previousStage.name,
    )?.actualDate?.gregorian;
    if (previousActual && actualDate < previousActual) {
      return `Actual Date cannot be earlier than ${previousStage.name} (${formatGregorianDate(previousActual)}).`;
    }
  }
  return "";
}

function stageStatusOptions(stage: ProcurementActivityRoadmapStage) {
  const values: ActivityStageStatus[] = [
    "Not Started",
    "In Progress",
    "Completed",
  ];
  if (stage.allowNotApplicable) values.push("Not Applicable");
  return values;
}

function OverviewValue({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1.5 text-xs font-bold leading-5 text-[#10243f] break-words [overflow-wrap:anywhere] ${
          mono ? "font-mono" : ""
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-[#c7d8cf] bg-[#edf5f1] px-4 py-3 text-[#176c55]">
      {icon}
      <h2 className="text-sm font-extrabold text-[#10243f]">{title}</h2>
    </div>
  );
}

function FieldSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-[11px] font-bold text-slate-600">
        {label}
      </span>
      <select
        className="h-10 w-full cursor-pointer rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function LockedDateValue({ date }: { date: TrackingDateValue }) {
  return (
    <div className="flex items-start gap-2">
      <LockKeyhole
        aria-hidden="true"
        className="mt-0.5 h-3 w-3 shrink-0 text-slate-400"
      />
      <DateValue date={date} />
    </div>
  );
}

function DateValue({
  date,
  revised = false,
}: {
  date: TrackingDateValue;
  revised?: boolean;
}) {
  if (!date.gregorian) return <span className="text-slate-400">—</span>;
  return (
    <div>
      <p className="font-semibold text-slate-700">
        {formatGregorianDate(date.gregorian)}
      </p>
      {date.ethiopian ? (
        <p className="mt-1 text-[9px] text-slate-500">{date.ethiopian}</p>
      ) : null}
      {revised ? (
        <p className="mt-1 text-[9px] font-bold text-[#7c3aed]">Revised</p>
      ) : null}
    </div>
  );
}

function MiniDate({
  label,
  value,
}: {
  label: string;
  value: TrackingDateValue;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-extrabold uppercase tracking-[0.06em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-[10px] font-bold text-slate-700">
        {value.gregorian
          ? formatGregorianDate(value.gregorian)
          : "Not recorded"}
      </p>
      {value.ethiopian ? (
        <p className="mt-0.5 truncate text-[9px] text-slate-500">
          {value.ethiopian}
        </p>
      ) : null}
    </div>
  );
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="flex items-start gap-1.5 rounded border border-red-200 bg-red-50 px-3 py-2 text-[10px] leading-4 text-red-700"
      role="alert"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {children}
    </p>
  );
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatGregorianDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
