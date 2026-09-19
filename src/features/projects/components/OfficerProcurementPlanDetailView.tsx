"use client";

import { StatusText } from "../../../components/dashboard/StatusText";
import type {
  OfficerProject,
  ProcurementPlanSummary,
} from "@/features/projects/data/officerProjects";
import type {
  ProcurementActivityStatus,
  ProcurementActivitySummary,
} from "@/features/projects/data/officerActivityDrafts";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  Send,
  Upload,
  History,
  Edit3,
  RotateCcw,
  MessageSquare,
  AlertCircle,
  FileCheck2,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import {
  getCurrentPlanVersionNumber,
  getPlanVersionHistory,
  recordPlanVersionEvent,
} from "@/features/plans/data/planRevisions";
import { VersionHistoryModal } from "@/features/plans/components/VersionHistoryModal";
import { exportPlanActivitiesToExcel } from "@/features/projects/utils/projectExcelUtils";
import { ExcelImportModal } from "@/features/projects/components/ExcelImportModal";
import {
  PhaseDelayBreakdownModal,
  type PhaseDelayModalData,
} from "./PhaseDelayBreakdownModal";

type ActivityStatus = ProcurementActivityStatus;

type PlanActivity = ProcurementActivitySummary;

export function OfficerProcurementPlanDetailView({
  onSubmitToDirector,
  onUpdatePlan,
  onUpdateActivity,
  onBulkImportActivities,
  plan,
  project,
  savedActivities = [],
}: {
  onSubmitToDirector?: (planReference: string, revisionReason?: string) => void;
  onUpdatePlan?: (plan: ProcurementPlanSummary) => void;
  onUpdateActivity?: (activity: ProcurementActivitySummary) => void;
  onBulkImportActivities?: (
    activities: ProcurementActivitySummary[],
  ) => Promise<void> | void;
  plan: ProcurementPlanSummary;
  project: OfficerProject;
  savedActivities?: readonly ProcurementActivitySummary[];
}) {
  const [currentPlanOverride, setCurrentPlanOverride] =
    useState<ProcurementPlanSummary | null>(null);
  const [prevPlan, setPrevPlan] = useState(plan);

  if (plan !== prevPlan) {
    setPrevPlan(plan);
    setCurrentPlanOverride(null);
  }

  const currentPlan = currentPlanOverride ?? plan;
  const setCurrentPlan = setCurrentPlanOverride;
  const [submittedPlanReference, setSubmittedPlanReference] = useState<
    string | null
  >(null);

  const activePlanStatus =
    submittedPlanReference === currentPlan.reference
      ? "Submitted to Director"
      : currentPlan.status;

  const isReturned =
    activePlanStatus === "Returned" ||
    activePlanStatus === "Returned for Revision" ||
    (activePlanStatus as string) === "RETURNED_FOR_REVISION";

  // Modals state
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [isImportExcelOpen, setIsImportExcelOpen] = useState(false);
  const [delayModalData, setDelayModalData] =
    useState<PhaseDelayModalData | null>(null);
  const [editingActivity, setEditingActivity] =
    useState<ProcurementActivitySummary | null>(null);

  const handleSelectActivityDelay = (act: PlanActivity) => {
    const rawDelay = (act as any).delayDays || (act as any).daysOverdue || 7;
    setDelayModalData({
      reference: act.reference,
      title: act.description || act.reference,
      category: act.category,
      method: act.method,
      totalDelayDays: Number(rawDelay) || 7,
      stages:
        (act as any).stages ||
        (act.details as any)?.roadmapStages ||
        (act.details as any)?.stages ||
        [],
      activityHref:
        "/workspace/projects?project=" +
        encodeURIComponent(project.code) +
        "&plan=" +
        encodeURIComponent(currentPlan.reference) +
        "&activity=" +
        encodeURIComponent(act.reference),
      planReference: currentPlan.reference,
      projectCode: project.code,
    });
  };

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [methodFilter, setMethodFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ActivityStatus>(
    "All",
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isMultiOfficerProject =
    (project.assignedOfficers?.length ?? 0) > 1 ||
    (project.assignedOfficerIds?.length ?? 0) > 1;

  const versionNumber = getCurrentPlanVersionNumber(
    currentPlan.reference || currentPlan.id || "",
  );

  const planHistory = getPlanVersionHistory(
    currentPlan.reference || currentPlan.id || "",
  );
  const hasPlanRevisions =
    versionNumber > 1 ||
    isReturned ||
    Boolean(currentPlan.version && currentPlan.version > 1) ||
    planHistory.some(
      (r) =>
        r.action === "PLAN_REVISED" ||
        r.action === "ACTIVITY_REVISED" ||
        r.action === "RETURNED" ||
        r.action === "RESUBMITTED",
    );

  const activities = useMemo(() => {
    const list = [...savedActivities];
    if (currentPlan.planActivities && currentPlan.planActivities.length > 0) {
      const existingRefs = new Set(list.map((a) => a.reference.toLowerCase()));
      currentPlan.planActivities.forEach((pa) => {
        if (!existingRefs.has(pa.reference.toLowerCase())) {
          list.push(pa);
        }
      });
    }
    return list;
  }, [savedActivities, currentPlan.planActivities]);

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(activities.map((activity) => activity.category))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [activities],
  );
  const methodOptions = useMemo(
    () =>
      Array.from(new Set(activities.map((activity) => activity.method))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [activities],
  );
  const filteredActivities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return activities.filter((activity) => {
      const matchesCategory =
        categoryFilter === "All" || activity.category === categoryFilter;
      const matchesMethod =
        methodFilter === "All" || activity.method === methodFilter;
      const matchesStatus =
        statusFilter === "All" || activity.status === statusFilter;
      const matchesSearch =
        query.length === 0 ||
        [
          activity.reference,
          activity.description,
          activity.category,
          activity.method,
          activity.currentStage,
          activity.status,
        ].some((value) => value.toLowerCase().includes(query));

      return matchesCategory && matchesMethod && matchesStatus && matchesSearch;
    });
  }, [activities, categoryFilter, methodFilter, searchQuery, statusFilter]);

  const pageSize = 5;
  const pageCount = Math.max(
    1,
    Math.ceil(filteredActivities.length / pageSize),
  );
  const safePage = Math.min(currentPage, pageCount);
  const firstResult = filteredActivities.length
    ? (safePage - 1) * pageSize + 1
    : 0;
  const lastResult = Math.min(safePage * pageSize, filteredActivities.length);
  const visibleActivities = filteredActivities.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const projectHref = `/workspace/projects?project=${encodeURIComponent(
    project.code,
  )}`;

  const handlePlanSaved = (updated: ProcurementPlanSummary) => {
    setCurrentPlan(updated);
    onUpdatePlan?.(updated);
  };

  const handleActivitySaved = (updatedAct: ProcurementActivitySummary) => {
    onUpdateActivity?.(updatedAct);
    // update local plan activities if present
    if (currentPlan.planActivities) {
      const nextActs = currentPlan.planActivities.map((a) =>
        a.reference.toLowerCase() === updatedAct.reference.toLowerCase()
          ? updatedAct
          : a,
      );
      const nextPlan = { ...currentPlan, planActivities: nextActs };
      setCurrentPlan(nextPlan);
      onUpdatePlan?.(nextPlan);
    }
  };

  const handleSubmitToDirector = (reason?: string) => {
    setSubmittedPlanReference(currentPlan.reference);

    const nextVer = isReturned ? versionNumber + 1 : versionNumber;

    // Record audit revision
    recordPlanVersionEvent({
      planId: currentPlan.id || currentPlan.reference,
      planReference: currentPlan.reference,
      projectCode: project.code,
      versionNumber: nextVer,
      action: isReturned ? "RESUBMITTED" : "SUBMITTED",
      actionLabel: isReturned
        ? `Plan Resubmitted (v${nextVer})`
        : "Plan Submitted for Director Review",
      changedBy: "Procurement Officer",
      changedByRole: "Procurement Officer",
      reason:
        reason ||
        (isReturned
          ? "Resubmitted with revisions addressing Director feedback."
          : "Submitted for review."),
    });

    onSubmitToDirector?.(currentPlan.reference, reason);
  };

  function exportActivities() {
    exportPlanActivitiesToExcel(currentPlan, filteredActivities, project.code);
  }

  function handleBulkImport(imported: ProcurementActivitySummary[]) {
    if (onBulkImportActivities) {
      void onBulkImportActivities(imported);
    } else {
      imported.forEach((act) => {
        onUpdateActivity?.(act);
      });
    }

    if (currentPlan.planActivities) {
      const nextPlan = {
        ...currentPlan,
        activities: currentPlan.activities + imported.length,
        planActivities: [...currentPlan.planActivities, ...imported],
      };
      setCurrentPlan(nextPlan);
      onUpdatePlan?.(nextPlan);
    }
  }

  return (
    <div className="min-w-0 space-y-5 pb-6">
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
              <Link className="hover:text-[#176c55]" href="/workspace/projects">
                Assigned Projects
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li>
              <Link className="hover:text-[#176c55]" href={projectHref}>
                {project.shortName}
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li aria-current="page" className="font-semibold text-slate-900">
              {currentPlan.name}
            </li>
          </ol>
        </nav>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#10243f]">
                {currentPlan.name}
              </h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-300">
                v{versionNumber}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
              <span>
                Reference:{" "}
                <strong className="font-semibold text-[#1261a8]">
                  {currentPlan.reference}
                </strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">
                •
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays aria-hidden="true" className="h-3 w-3" />
                {currentPlan.budgetYear}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                •
              </span>
              <StatusText className="text-[10px]" label={activePlanStatus} />
              <span aria-hidden="true" className="text-slate-300">
                •
              </span>
              <span>{activities.length} Activities</span>
              {isMultiOfficerProject && currentPlan.createdByName && (
                <>
                  <span aria-hidden="true" className="text-slate-300">
                    •
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                    Created by:{" "}
                    <strong className="font-semibold text-slate-800">
                      {currentPlan.createdByName}
                    </strong>
                  </span>
                </>
              )}
              {isMultiOfficerProject && currentPlan.updatedByName && (
                <>
                  <span aria-hidden="true" className="text-slate-300">
                    •
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 border border-emerald-200">
                    Last edited by:{" "}
                    <strong className="font-semibold text-emerald-950">
                      {currentPlan.updatedByName}
                    </strong>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* Version History Button (visible when plan has revisions) */}
            {hasPlanRevisions && (
              <button
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[#176c55] hover:bg-[#edf5f1] hover:text-[#176c55] transition cursor-pointer"
                onClick={() => setIsVersionHistoryOpen(true)}
                type="button"
              >
                <History className="h-3.5 w-3.5 text-[#176c55]" />
                Version History (v{versionNumber})
              </button>
            )}

            {/* Edit Plan Details Button (visible when Draft or Returned) */}
            {(activePlanStatus === "Draft" || isReturned) && (
              <Link
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[#176c55] hover:bg-[#edf5f1] hover:text-[#176c55] transition cursor-pointer"
                href={
                  "/workspace/projects?project=" +
                  encodeURIComponent(project.code) +
                  "&plan=" +
                  encodeURIComponent(currentPlan.reference) +
                  "&mode=edit-plan"
                }
              >
                <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                Edit Plan Info
              </Link>
            )}

            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
              onClick={exportActivities}
              type="button"
            >
              <Download aria-hidden="true" className="h-3.5 w-3.5" />
              Export Excel
            </button>

            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-[#176c55] shadow-2xs hover:bg-[#edf5f1] transition cursor-pointer"
              onClick={() => setIsImportExcelOpen(true)}
              type="button"
            >
              <Upload aria-hidden="true" className="h-3.5 w-3.5" />
              Import Excel
            </button>

            {/* Add Activity Button (Enabled if Draft or Returned) */}
            {(activePlanStatus === "Draft" || isReturned) && (
              <Link
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#125442] bg-[#176c55] px-4 text-xs font-bold text-white hover:bg-[#125f4c] shadow-xs transition"
                href={
                  "/workspace/projects?project=" +
                  encodeURIComponent(project.code) +
                  "&plan=" +
                  encodeURIComponent(currentPlan.reference) +
                  "&mode=create-activity"
                }
              >
                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                New Activity
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── RETURNED FEEDBACK ALERT BANNER ───────────────────────────── */}
      {isReturned && (
        <section
          aria-label="Plan returned feedback"
          className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
              <RotateCcw className="h-5 w-5 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-amber-950">
                  Plan Returned by Director for Revision
                </h2>
                <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                  Action Required
                </span>
              </div>
              <div className="mt-2 space-y-2.5">
                <div className="rounded-xl border border-amber-200 bg-white/90 p-3.5 text-xs text-amber-950 shadow-2xs">
                  <p className="font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-amber-700" />
                    Director Feedback &amp; Revision Instructions:
                  </p>
                  <p className="italic leading-relaxed text-slate-800">
                    &ldquo;
                    {currentPlan.directorRevisionComment ||
                      currentPlan.rejectionReason ||
                      "Please review the activity details, budget estimates, and milestone dates, then resubmit for approval."}
                    &rdquo;
                  </p>
                </div>

                {Boolean(currentPlan.managementComment) && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3.5 text-xs text-indigo-950 shadow-2xs">
                    <p className="font-semibold text-indigo-900 mb-1 flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-indigo-700" />
                      Executive Management Feedback:
                    </p>
                    <p className="italic leading-relaxed text-slate-800">
                      &ldquo;{currentPlan.managementComment}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200/60 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                href={
                  "/workspace/projects?project=" +
                  encodeURIComponent(project.code) +
                  "&plan=" +
                  encodeURIComponent(currentPlan.reference) +
                  "&mode=edit-plan"
                }
              >
                <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                Edit Plan Information
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                href={
                  "/workspace/projects?project=" +
                  encodeURIComponent(project.code) +
                  "&plan=" +
                  encodeURIComponent(currentPlan.reference) +
                  "&mode=create-activity"
                }
              >
                <Plus className="h-3.5 w-3.5 text-[#176c55]" />
                Add Activity
              </Link>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                onClick={() => setIsVersionHistoryOpen(true)}
                type="button"
              >
                <History className="h-3.5 w-3.5 text-[#176c55]" />
                Audit Trail &amp; Diff
              </button>
            </div>

            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#176c55] px-5 text-xs font-bold text-white shadow-xs hover:bg-[#125f4c] transition cursor-pointer"
              onClick={() => handleSubmitToDirector()}
              type="button"
            >
              <span>Resubmit Revised Plan to Director</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* ── DRAFT READY FOR INITIAL SUBMISSION ──────────────────────── */}
      {activePlanStatus === "Draft" && (
        <section
          aria-label="Submit plan for review"
          className="flex flex-col gap-4 rounded-xl border border-[#c7d7d0] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#edf5f1] text-[#176c55]">
              <CheckCircle2
                aria-hidden="true"
                className="h-5 w-5 text-[#176c55]"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#10243f]">
                Plan is ready for review
              </h2>
              <p className="text-xs text-slate-500">
                All activities have been drafted. Submit to the Director for
                final approval.
              </p>
            </div>
          </div>
          <button
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-[#125442] bg-[#176c55] px-4 text-xs font-bold text-white shadow-2xs hover:bg-[#125f4c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55] transition cursor-pointer"
            onClick={() => handleSubmitToDirector()}
            type="button"
          >
            Submit to Director
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </section>
      )}

      {/* ── SUBMITTED STATUS BANNER ─────────────────────────────────── */}
      {activePlanStatus === "Submitted to Director" && (
        <section
          aria-label="Plan submission status"
          className="flex items-center justify-between gap-3.5 rounded-xl border border-[#c7d7d0] bg-[#edf5f1] p-4 shadow-2xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d8e8e0] text-[#176c55]">
              <Send aria-hidden="true" className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#10243f]">
                Submitted to Director for Review (Version {versionNumber})
              </h2>
              <p className="text-[11px] text-[#176c55]">
                This procurement plan and all its {activities.length} activities
                are currently under review by the Director.
              </p>
            </div>
          </div>
          {hasPlanRevisions && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
              onClick={() => setIsVersionHistoryOpen(true)}
              type="button"
            >
              <History className="h-3.5 w-3.5 text-[#176c55]" />
              Audit Trail
            </button>
          )}
        </section>
      )}

      {/* ── ACTIVITIES TABLE ────────────────────────────────────────── */}
      <section
        aria-labelledby="activities-title"
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs"
        id="procurement-activities"
      >
        <h2 className="sr-only" id="activities-title">
          Procurement Activities
        </h2>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap">
            <label className="block w-full sm:max-w-xs sm:flex-1">
              <span className="sr-only">Search procurement activities</span>
              <span
                className="flex h-9 cursor-text items-center gap-2 rounded-md border border-slate-300 bg-[#fbfcff] px-3 focus-within:border-[#348267] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#348267]/15"
                onClick={() => searchInputRef.current?.focus()}
              >
                <Search
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-slate-500"
                />
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-slate-800 outline-none placeholder:text-slate-400"
                  id="activity-search"
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search activities..."
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                />
              </span>
            </label>

            <label className="relative block min-w-0">
              <span className="sr-only">Filter activities by category</span>
              <select
                className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white py-0 pr-9 pl-3 text-xs font-medium text-slate-700 outline-none hover:border-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15 sm:w-auto sm:min-w-36"
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setCurrentPage(1);
                }}
                value={categoryFilter}
              >
                <option value="All">All Categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
              />
            </label>

            <label className="relative block min-w-0">
              <span className="sr-only">Filter activities by method</span>
              <select
                className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white py-0 pr-9 pl-3 text-xs font-medium text-slate-700 outline-none hover:border-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15 sm:w-auto sm:min-w-36"
                onChange={(event) => {
                  setMethodFilter(event.target.value);
                  setCurrentPage(1);
                }}
                value={methodFilter}
              >
                <option value="All">All Methods</option>
                {methodOptions.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
              />
            </label>

            <label className="relative block min-w-0">
              <span className="sr-only">Filter activities by status</span>
              <select
                className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white py-0 pr-9 pl-3 text-xs font-medium text-slate-700 outline-none hover:border-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15 sm:w-auto sm:min-w-32"
                onChange={(event) => {
                  setStatusFilter(event.target.value as "All" | ActivityStatus);
                  setCurrentPage(1);
                }}
                value={statusFilter}
              >
                <option value="All">All Statuses</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Delayed">Delayed</option>
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[10px] font-extrabold uppercase tracking-wider">
                <th className="w-[11%] px-2 py-3" scope="col">
                  Ref
                </th>
                <th className="w-[23%] px-2 py-3" scope="col">
                  Description
                </th>
                <th className="w-[9%] px-2 py-3" scope="col">
                  Category
                </th>
                <th className="w-[9%] px-2 py-3" scope="col">
                  Method
                </th>
                <th className="w-[13%] px-2 py-3 text-right" scope="col">
                  Est. Amount ({currentPlan.currency})
                </th>
                <th className="w-[11%] px-2 py-3" scope="col">
                  Current Stage
                </th>
                <th className="w-[11%] px-2 py-3" scope="col">
                  Status
                </th>
                <th className="w-[13%] px-2 py-3 text-right" scope="col">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleActivities.length ? (
                visibleActivities.map((activity) => (
                  <ActivityRow
                    key={activity.reference}
                    activity={activity}
                    canEdit={activePlanStatus === "Draft" || isReturned}
                    isMultiOfficer={isMultiOfficerProject}
                    onSelectDelay={handleSelectActivityDelay}
                    editHref={
                      "/workspace/projects?project=" +
                      encodeURIComponent(project.code) +
                      "&plan=" +
                      encodeURIComponent(currentPlan.reference) +
                      "&activity=" +
                      encodeURIComponent(activity.reference) +
                      "&mode=edit-activity"
                    }
                    href={
                      "/workspace/projects?project=" +
                      encodeURIComponent(project.code) +
                      "&plan=" +
                      encodeURIComponent(currentPlan.reference) +
                      "&activity=" +
                      encodeURIComponent(activity.reference)
                    }
                  />
                ))
              ) : (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-xs text-slate-500"
                    colSpan={8}
                  >
                    No procurement activities match the current search and
                    filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-[#fbfcfd] px-4 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite">
            Showing {firstResult} to {lastResult} of {filteredActivities.length}{" "}
            results
          </p>
          <div aria-label="Activity pagination" className="flex items-center">
            <PaginationButton
              ariaLabel="Previous activity page"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
            </PaginationButton>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (page) => (
                <PaginationButton
                  key={page}
                  active={safePage === page}
                  ariaLabel={`Activity page ${page}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </PaginationButton>
              ),
            )}
            <PaginationButton
              ariaLabel="Next activity page"
              disabled={safePage === pageCount}
              onClick={() =>
                setCurrentPage((page) => Math.min(pageCount, page + 1))
              }
            >
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            </PaginationButton>
          </div>
        </footer>
      </section>

      {/* ── MODALS ─────────────────────────────────────────────────── */}
      <VersionHistoryModal
        currentStatus={activePlanStatus}
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        planId={currentPlan.id || currentPlan.reference}
        planName={currentPlan.name}
        projectCode={project.code}
      />

      <ExcelImportModal
        isOpen={isImportExcelOpen}
        onClose={() => setIsImportExcelOpen(false)}
        onImport={handleBulkImport}
        planName={currentPlan.name}
        projectCode={project.code}
      />

      <PhaseDelayBreakdownModal
        isOpen={Boolean(delayModalData)}
        onClose={() => setDelayModalData(null)}
        data={delayModalData}
      />
    </div>
  );
}

function ActivityRow({
  activity,
  canEdit = true,
  editHref,
  href,
  isMultiOfficer = false,
  onSelectDelay,
}: {
  activity: PlanActivity;
  canEdit?: boolean;
  editHref: string;
  href: string;
  isMultiOfficer?: boolean;
  onSelectDelay?: (activity: PlanActivity) => void;
}) {
  const isDelayed =
    activity.status === "Delayed" ||
    (activity as any).status === "DELAYED" ||
    Boolean((activity as any).delayDays) ||
    Boolean((activity as any).daysOverdue);

  return (
    <tr className="even:bg-[#fbfcff] hover:bg-[#f7fbf9] transition-colors">
      <td className="px-2 py-2.5 align-top font-mono text-[10px] font-semibold text-[#1261a8] truncate">
        {activity.reference}
      </td>
      <td className="px-2 py-2.5 align-top text-[10px] font-medium leading-4 text-slate-700 wrap-break-word">
        <p className="wrap-break-word line-clamp-2">{activity.description}</p>
        {isMultiOfficer &&
          (activity.createdByName || activity.updatedByName) && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px] text-slate-400">
              {activity.createdByName && (
                <span>
                  Created by{" "}
                  <span className="font-semibold text-slate-600">
                    {activity.createdByName}
                  </span>
                </span>
              )}
              {activity.updatedByName &&
                activity.updatedByName !== activity.createdByName && (
                  <>
                    <span>•</span>
                    <span>
                      Edited by{" "}
                      <span className="font-semibold text-slate-600">
                        {activity.updatedByName}
                      </span>
                    </span>
                  </>
                )}
            </div>
          )}
      </td>
      <td className="px-2 py-2.5 align-top text-[10px] text-slate-500">
        {activity.category}
      </td>
      <td className="px-2 py-2.5 align-top text-[10px] font-medium text-slate-500">
        {activity.method}
      </td>
      <td className="px-2 py-2.5 text-right align-top font-mono text-[10px] font-medium tabular-nums text-slate-800">
        {formatAmount(activity.estimatedAmount)}
      </td>
      <td className="px-2 py-2.5 align-top text-[10px] text-slate-500">
        {activity.currentStage}
      </td>
      <td className="px-2 py-2.5 align-top">
        <div className="flex flex-col gap-1 items-start">
          <StatusText className="text-[9px]" label={activity.status} />
          {isDelayed && (
            <button
              type="button"
              onClick={() => onSelectDelay?.(activity)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
              title="Click to view delay in phase breakdown"
            >
              <Clock className="w-2.5 h-2.5" />
              <span>Delay in Phase</span>
            </button>
          )}
        </div>
      </td>
      <td className="px-2 py-2.5 text-right align-top whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5 shrink-0">
          {canEdit && (
            <Link
              aria-label={`Edit activity ${activity.reference}`}
              className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 hover:bg-[#176c55] hover:text-white transition cursor-pointer"
              href={editHref}
              title="Edit / Revise Activity"
            >
              <Edit3 className="h-2.5 w-2.5" />
              Edit
            </Link>
          )}
          <Link
            aria-label={`Open activity ${activity.reference}`}
            className="shrink-0 text-[10px] font-semibold text-[#1261a8] hover:text-[#07523f] hover:underline"
            href={href}
          >
            Open
          </Link>
        </div>
      </td>
    </tr>
  );
}

function PaginationButton({
  active = false,
  ariaLabel,
  children,
  disabled = false,
  onClick,
}: {
  active?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={`flex h-7 min-w-7 items-center justify-center border-y border-r border-slate-300 px-2 text-[10px] first:rounded-l first:border-l last:rounded-r ${
        active
          ? "border-[#176c55] bg-[#176c55] font-bold text-white"
          : "bg-white text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function escapeCsvValue(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
