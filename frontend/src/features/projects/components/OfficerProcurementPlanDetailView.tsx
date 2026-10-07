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
  FileSignature,
  Clock,
  X,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import { requestPlanCancellation } from "@/lib/plansApi";
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
  calculateRealActivityDelay,
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
  isSyncedToDatabase = true,
}: {
  onSubmitToDirector?: (
    planReference: string,
    revisionReason?: string,
  ) => Promise<void> | void;
  onUpdatePlan?: (plan: ProcurementPlanSummary) => void;
  onUpdateActivity?: (activity: ProcurementActivitySummary) => void;
  onBulkImportActivities?: (
    activities: ProcurementActivitySummary[],
  ) => Promise<void> | void;
  plan: ProcurementPlanSummary;
  project: OfficerProject;
  savedActivities?: readonly ProcurementActivitySummary[];
  isSyncedToDatabase?: boolean;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activePlanStatus =
    submittedPlanReference === currentPlan.reference
      ? "Submitted to Director"
      : currentPlan.status;

  const isReturned =
    activePlanStatus === "Returned" ||
    activePlanStatus === "Returned for Revision" ||
    (activePlanStatus as string) === "RETURNED_FOR_REVISION";

  const isDraftOrReturned =
    activePlanStatus === "Draft" ||
    (activePlanStatus as string) === "DRAFT" ||
    currentPlan.status === "Draft" ||
    (currentPlan.status as string) === "DRAFT" ||
    isReturned;

  const isFinallyApproved =
    activePlanStatus === "Finally Approved" ||
    activePlanStatus === "Approved" ||
    (activePlanStatus as string) === "APPROVED" ||
    (activePlanStatus as string) === "MANAGEMENT_APPROVED";

  const isCancellationRequested =
    activePlanStatus === "Cancellation Requested" ||
    (activePlanStatus as string) === "CANCELLATION_REQUESTED";

  const isCancelled =
    activePlanStatus === "Cancelled" ||
    (activePlanStatus as string) === "CANCELLED";

  // Modals state
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [isImportExcelOpen, setIsImportExcelOpen] = useState(false);
  const [delayModalData, setDelayModalData] =
    useState<PhaseDelayModalData | null>(null);
  const [editingActivity, setEditingActivity] =
    useState<ProcurementActivitySummary | null>(null);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [resubmitReason, setResubmitReason] = useState("");
  const [emptyPlanNotice, setEmptyPlanNotice] = useState<string | null>(null);
  const emptyNoticeRef = useRef<HTMLElement>(null);

  // Cancellation Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isRequestingCancellation, setIsRequestingCancellation] =
    useState(false);
  const [cancellationError, setCancellationError] = useState<string | null>(
    null,
  );

  const handleRequestCancellation = async () => {
    if (!cancellationReason.trim()) return;
    setIsRequestingCancellation(true);
    setCancellationError(null);
    try {
      if (currentPlan.id) {
        try {
          await requestPlanCancellation(
            currentPlan.id,
            cancellationReason.trim(),
          );
        } catch (apiErr: any) {
          console.warn("Backend requestPlanCancellation warning:", apiErr);
        }
      }

      const updatedPlan: ProcurementPlanSummary = {
        ...currentPlan,
        status: "Cancellation Requested",
        cancellationReason: cancellationReason.trim(),
        cancellationRequestedAt: new Date().toISOString(),
      };
      setCurrentPlan(updatedPlan);
      onUpdatePlan?.(updatedPlan);

      recordPlanVersionEvent({
        planId: currentPlan.id || currentPlan.reference,
        planReference: currentPlan.reference,
        projectCode: project.code,
        versionNumber: versionNumber,
        action: "CANCELLATION_REQUESTED",
        actionLabel: "Plan Cancellation Requested",
        changedBy: "Procurement Officer",
        changedByRole: "Procurement Officer",
        reason: cancellationReason.trim(),
      });

      setIsCancelModalOpen(false);
      setCancellationReason("");
    } catch (err: any) {
      setCancellationError(
        err?.message || "Failed to submit plan cancellation request",
      );
    } finally {
      setIsRequestingCancellation(false);
    }
  };

  const handleSelectActivityDelay = (act: PlanActivity) => {
    const actStages =
      (act as any).stages || act.details?.roadmap || (act as any).roadmap || [];
    const rawDelay =
      (act as any).delayDays !== undefined && (act as any).delayDays !== null
        ? Number((act as any).delayDays)
        : (act as any).daysOverdue !== undefined &&
            (act as any).daysOverdue !== null
          ? Number((act as any).daysOverdue)
          : calculateRealActivityDelay(actStages);

    const resolvedCat =
      act.category ||
      currentPlan.category ||
      (act as any).details?.form?.category;
    const resolvedMeth =
      act.method ||
      (act as any).details?.form?.method ||
      (act as any).procurementMethod?.label ||
      (act as any).procurementMethod;

    setDelayModalData({
      reference: act.reference,
      title: act.description || act.reference,
      category: resolvedCat,
      method: resolvedMeth,
      totalDelayDays: rawDelay,
      stages: actStages,
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

  const totalActivitiesCount =
    activities.length > 0 ? activities.length : (currentPlan.activities ?? 0);
  const isPlanEmpty = totalActivitiesCount === 0;

  useEffect(() => {
    if (!isPlanEmpty && emptyPlanNotice) {
      setEmptyPlanNotice(null);
    }
  }, [isPlanEmpty, emptyPlanNotice]);

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

  const visibleActivities = filteredActivities;
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

  const handleOpenSubmitModal = () => {
    if (isPlanEmpty) {
      const msg =
        "An empty plan or a plan without an activity will not be submitted to the Director. Please add at least one procurement activity before submitting.";
      setEmptyPlanNotice(msg);
      setTimeout(() => {
        emptyNoticeRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
      return;
    }
    setEmptyPlanNotice(null);
    setSubmitError(null);
    setIsConfirmSubmitOpen(true);
  };

  const handleSubmitToDirector = async (reason?: string) => {
    if (isPlanEmpty) {
      const msg =
        "An empty plan or a plan without an activity will not be submitted to the Director. Please add at least one procurement activity before submitting.";
      setEmptyPlanNotice(msg);
      setTimeout(() => {
        emptyNoticeRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
      return;
    }

    setSubmitError(null);
    setEmptyPlanNotice(null);
    setIsSubmitting(true);

    try {
      if (onSubmitToDirector) {
        await onSubmitToDirector(currentPlan.reference, reason);
      }

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
    } catch (err: any) {
      const msg =
        err?.message ||
        "Could not submit plan to the server database. Please check your backend connection.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
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
              <Link className="hover:text-[#0A3C2F]" href="/dashboard/officer">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li>
              <Link className="hover:text-[#0A3C2F]" href="/workspace/projects">
                Assigned Projects
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li>
              <Link className="hover:text-[#0A3C2F]" href={projectHref}>
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
              <h1 className="text-2xl font-semibold tracking-tight text-[#10243f]">
                {currentPlan.name}
              </h1>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-300">
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
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[#0A3C2F] hover:bg-emerald-50 hover:text-[#0A3C2F] transition cursor-pointer"
                onClick={() => setIsVersionHistoryOpen(true)}
                type="button"
              >
                <History className="h-3.5 w-3.5 text-[#0A3C2F]" />
                Version History (v{versionNumber})
              </button>
            )}

            {/* Edit Plan Details Button (visible when Draft or Returned) */}
            {(activePlanStatus === "Draft" || isReturned) && (
              <Link
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[#0A3C2F] hover:bg-emerald-50 hover:text-[#0A3C2F] transition cursor-pointer"
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
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[#0A3C2F] hover:bg-emerald-50 hover:text-[#0A3C2F] transition cursor-pointer"
              onClick={exportActivities}
              type="button"
            >
              <Download aria-hidden="true" className="h-3.5 w-3.5" />
              Export Excel
            </button>

            {/* Request Cancellation Button (visible when Finally Approved) */}
            {isFinallyApproved && (
              <button
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-50 hover:border-rose-400 transition cursor-pointer"
                onClick={() => {
                  setCancellationError(null);
                  setCancellationReason("");
                  setIsCancelModalOpen(true);
                }}
                type="button"
                title="Request cancellation for this finally approved plan"
              >
                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                <span>Request Cancellation</span>
              </button>
            )}

            {!isCancelled && (
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[#0A3C2F] hover:bg-emerald-50 hover:text-[#0A3C2F] transition cursor-pointer"
                onClick={() => setIsImportExcelOpen(true)}
                type="button"
              >
                <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                Import Excel
              </button>
            )}

            {/* Add Activity Button (Always Visible unless Cancelled: normal activity for draft/returned, additional plan & activity with justification once submitted) */}
            {!isCancelled &&
              (isDraftOrReturned ? (
                <Link
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#0A3C2F] px-4 text-xs font-semibold text-white hover:bg-[#083025] shadow-xs transition cursor-pointer"
                  href={
                    "/workspace/projects?project=" +
                    encodeURIComponent(project.code) +
                    "&plan=" +
                    encodeURIComponent(currentPlan.reference) +
                    "&mode=create-activity"
                  }
                  title="Add procurement activity to this draft plan"
                >
                  <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Add Activity</span>
                </Link>
              ) : (
                <Link
                  href={
                    "/workspace/projects?project=" +
                    encodeURIComponent(project.code) +
                    "&plan=" +
                    encodeURIComponent(currentPlan.reference) +
                    "&mode=create-additional-activity"
                  }
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#0A3C2F] px-4 text-xs font-semibold text-white hover:bg-[#083025] shadow-xs transition cursor-pointer"
                  title="Create an additional procurement plan & activity with mandatory justification"
                >
                  <Plus
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-emerald-200"
                  />
                  <span>Add Activity</span>
                </Link>
              ))}
          </div>
        </div>
      </header>

      {/* ── DATABASE SUBMISSION ERROR ALERT ───────────────────────── */}
      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900 shadow-xs animate-in fade-in"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-rose-950">
              Database Submission Failed
            </h3>
            <p className="text-xs leading-relaxed text-rose-800">
              {submitError}
            </p>
          </div>
        </div>
      )}

      {/* ── RETURNED FEEDBACK ALERT BANNER ───────────────────────────── */}
      {isReturned && (
        <section
          aria-label="Plan returned feedback"
          className="notice-card-clean space-y-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <RotateCcw className="h-5 w-5 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Plan Returned by Director for Revision
                </h2>
                <span className="badge-status-base badge-status-delayed font-medium">
                  Action Required
                </span>
              </div>
              <div className="mt-2 space-y-2.5">
                <div className="notice-quote-clean text-xs">
                  <p className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-600" />
                    Director Feedback &amp; Revision Instructions:
                  </p>
                  <p className="italic leading-relaxed text-slate-700 font-normal">
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
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
                <Plus className="h-3.5 w-3.5 text-[#0A3C2F]" />
                Add Activity
              </Link>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                onClick={() => setIsVersionHistoryOpen(true)}
                type="button"
              >
                <History className="h-3.5 w-3.5 text-[#0A3C2F]" />
                Audit Trail &amp; Diff
              </button>
            </div>

            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#0A3C2F] px-5 text-xs font-semibold text-white shadow-xs hover:bg-[#083025] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSubmitting}
              onClick={handleOpenSubmitModal}
              type="button"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Submitting to Database...</span>
                </>
              ) : (
                <>
                  <span>Resubmit Revised Plan to Director</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* ── EMPTY PLAN SUBMISSION NOTICE (ONLY DISPLAYED UPON CLICKING SUBMIT) ── */}
      {emptyPlanNotice && (
        <section
          ref={emptyNoticeRef}
          aria-label="Empty plan submission notice"
          className="flex flex-col gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-slate-700 sm:flex-row sm:items-center sm:justify-between animate-in fade-in"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <AlertCircle
                aria-hidden="true"
                className="h-5 w-5 text-slate-600"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#10243f]">
                  Plan cannot be submitted
                </h2>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {emptyPlanNotice}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              onClick={() => setEmptyPlanNotice(null)}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      {/* ── UNSYNCED LOCAL DRAFT WARNING ───────────────────────────── */}
      {activePlanStatus === "Submitted to Director" && !isSyncedToDatabase && (
        <section
          aria-label="Database sync warning"
          className="notice-card-clean border-l-4 border-l-amber-500 p-5 shadow-xs space-y-3 animate-in fade-in"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Plan Not Synced to Server Database
                </h2>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                  Local Browser Storage Only
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                This plan is marked as submitted in your local browser cache,
                but the backend server database has no confirmed record of it.
                The Director cannot see this plan in &ldquo;Plan for
                Review&rdquo; until it is successfully recorded in the database.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-amber-200/60">
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#0A3C2F] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#083025] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSubmitting}
              onClick={() => handleSubmitToDirector()}
              type="button"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Submitting to Database...</span>
                </>
              ) : (
                <>
                  <span>Submit Plan to Database Now</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* ── SUBMITTED STATUS BANNER (DATABASE CONFIRMED) ─────────────── */}
      {activePlanStatus === "Submitted to Director" && isSyncedToDatabase && (
        <section
          aria-label="Plan submission status"
          className="flex items-center justify-between gap-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#0A3C2F] border border-emerald-200">
              <Send aria-hidden="true" className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#10243f]">
                Submitted to Director for Review (Version {versionNumber})
              </h2>
              <p className="text-[11px] text-slate-600">
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
              <History className="h-3.5 w-3.5 text-[#0A3C2F]" />
              Audit Trail
            </button>
          )}
        </section>
      )}

      {/* ── CANCELLATION REQUESTED BANNER ────────────────────────────── */}
      {isCancellationRequested && (
        <section
          aria-label="Plan cancellation requested"
          className="flex items-center justify-between gap-3.5 rounded-xl border border-amber-300 bg-amber-50/80 p-4 shadow-2xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-amber-950">
                  Cancellation Requested — Awaiting Director Review
                </h2>
                <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                  Under Review
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-amber-800">
                {currentPlan.cancellationReason
                  ? `Reason: "${currentPlan.cancellationReason}"`
                  : "You have submitted a request to cancel this plan. Waiting for Director review."}
              </p>
            </div>
          </div>
          {hasPlanRevisions && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-50 transition cursor-pointer"
              onClick={() => setIsVersionHistoryOpen(true)}
              type="button"
            >
              <History className="h-3.5 w-3.5 text-amber-800" />
              Audit Trail
            </button>
          )}
        </section>
      )}

      {/* ── CANCELLED STATUS BANNER ──────────────────────────────────── */}
      {isCancelled && (
        <section
          aria-label="Plan cancelled banner"
          className="flex items-center justify-between gap-3.5 rounded-xl border border-rose-300 bg-rose-50 p-4 shadow-2xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 border border-rose-300">
              <XCircle className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-rose-950">
                  Procurement Plan Cancelled
                </h2>
                <span className="rounded bg-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-900">
                  Cancelled
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-rose-800">
                {currentPlan.cancellationReason
                  ? `This plan was cancelled by the Director. Reason: "${currentPlan.cancellationReason}"`
                  : "This procurement plan has been formally cancelled by the Director and cannot be implemented."}
              </p>
            </div>
          </div>
          {hasPlanRevisions && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 shadow-2xs hover:bg-rose-100/60 transition cursor-pointer"
              onClick={() => setIsVersionHistoryOpen(true)}
              type="button"
            >
              <History className="h-3.5 w-3.5 text-rose-700" />
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
                className="flex h-9 cursor-text items-center gap-2 rounded-md border border-slate-300 bg-[#fbfcff] px-3 focus-within:border-[#0A3C2F] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0A3C2F]/15"
                onClick={() => searchInputRef.current?.focus()}
              >
                <Search
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-slate-500"
                />
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-slate-800 outline-none placeholder:text-slate-400"
                  id="activity-search"
                  onChange={(event) => setSearchQuery(event.target.value)}
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
                className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white py-0 pr-9 pl-3 text-xs font-medium text-slate-700 outline-none hover:border-slate-400 focus:border-[#0A3C2F] focus:ring-2 focus:ring-[#0A3C2F]/15 sm:w-auto sm:min-w-36"
                onChange={(event) => setCategoryFilter(event.target.value)}
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
                className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white py-0 pr-9 pl-3 text-xs font-medium text-slate-700 outline-none hover:border-slate-400 focus:border-[#0A3C2F] focus:ring-2 focus:ring-[#0A3C2F]/15 sm:w-auto sm:min-w-36"
                onChange={(event) => setMethodFilter(event.target.value)}
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
                className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white py-0 pr-9 pl-3 text-xs font-medium text-slate-700 outline-none hover:border-slate-400 focus:border-[#0A3C2F] focus:ring-2 focus:ring-[#0A3C2F]/15 sm:w-auto sm:min-w-32"
                onChange={(event) =>
                  setStatusFilter(event.target.value as "All" | ActivityStatus)
                }
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

        <div className="overflow-x-auto max-h-[620px] overflow-y-auto border-b border-slate-200">
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="sticky top-0 z-10 shadow-xs">
              <tr className="bg-[#0A3C2F] text-white text-[10px] font-semibold uppercase tracking-wider">
                <th className="w-[10%] px-2 py-3" scope="col">
                  Ref
                </th>
                <th className="w-[22%] px-2 py-3" scope="col">
                  Description
                </th>
                <th className="w-[8%] px-2 py-3" scope="col">
                  Category
                </th>
                <th className="w-[9%] px-2 py-3" scope="col">
                  Method
                </th>
                <th className="w-[12%] px-2 py-3 text-right" scope="col">
                  Est. Amount ({currentPlan.currency})
                </th>
                <th className="w-[11%] px-2 py-3" scope="col">
                  Current Stage
                </th>
                <th className="w-[10%] px-2 py-3" scope="col">
                  Status
                </th>
                <th
                  className="w-[18%] min-w-[170px] px-2 py-3 text-right"
                  scope="col"
                >
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
                    registerContractHref={
                      "/workspace/contracts?mode=register&project=" +
                      encodeURIComponent(project.code) +
                      "&plan=" +
                      encodeURIComponent(currentPlan.reference) +
                      "&activity=" +
                      encodeURIComponent(activity.reference) +
                      "&from=projects"
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

        <footer className="flex flex-col gap-2 bg-[#fbfcfd] px-4 py-3 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="font-medium text-slate-700">
            Showing all {filteredActivities.length}{" "}
            {filteredActivities.length === 1 ? "activity" : "activities"}
            {filteredActivities.length !== activities.length && (
              <span className="text-slate-400 font-normal">
                {" "}
                (filtered from {activities.length} total)
              </span>
            )}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>All activities on one page • Scrollable list</span>
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
        plan={currentPlan}
        project={project}
        activities={currentPlan.planActivities || []}
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

      {/* ── CONFIRM SUBMISSION TO DIRECTOR MODAL ─────────────────────── */}
      {isConfirmSubmitOpen && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A3C2F] text-white">
                  <Send className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Confirm Submission to Director
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Verify plan details before proceeding
                  </p>
                </div>
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                onClick={() => setIsConfirmSubmitOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to submit this procurement plan to the
                Director for review? Once submitted, the plan will be locked for
                editing while under review.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-500 font-medium">Plan Name:</span>
                  <span className="font-semibold text-slate-900 text-right truncate max-w-[260px]">
                    {currentPlan.name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-500 font-medium">Reference:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {currentPlan.reference}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-500 font-medium">Category:</span>
                  <span className="font-semibold text-slate-900">
                    {currentPlan.category}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-500 font-medium">
                    Activities Count:
                  </span>
                  <span className="font-semibold text-emerald-800">
                    {totalActivitiesCount}{" "}
                    {totalActivitiesCount === 1 ? "activity" : "activities"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-500 font-medium">
                    Estimated Value:
                  </span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatAmount(
                      currentPlan.estimatedValue ||
                        activities.reduce(
                          (sum, a) => sum + (Number(a.estimatedAmount) || 0),
                          0,
                        ),
                    )}{" "}
                    {currentPlan.currency || "ETB"}
                  </span>
                </div>
              </div>

              {isReturned && (
                <div className="space-y-1.5 pt-1">
                  <label
                    htmlFor="resubmit-reason"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Officer Revision Comment / Note for Director (Optional)
                  </label>
                  <textarea
                    id="resubmit-reason"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F]"
                    placeholder="Briefly state revisions made before resubmitting..."
                    rows={2}
                    value={resubmitReason}
                    onChange={(e) => setResubmitReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-6 py-3.5">
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                disabled={isSubmitting}
                onClick={() => setIsConfirmSubmitOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A3C2F] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#083025] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSubmitting}
                onClick={async () => {
                  await handleSubmitToDirector(
                    resubmitReason.trim() || undefined,
                  );
                  setIsConfirmSubmitOpen(false);
                }}
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {isReturned ? "Confirm & Resubmit" : "Confirm & Submit"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REQUEST PLAN CANCELLATION MODAL ─────────────────────────── */}
      {isCancelModalOpen && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/60 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-rose-950">
                    Request Plan Cancellation
                  </h3>
                  <p className="text-[11px] text-rose-700">
                    Submit request to Director with justification
                  </p>
                </div>
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 transition"
                onClick={() => {
                  if (!isRequestingCancellation) {
                    setIsCancelModalOpen(false);
                    setCancellationReason("");
                    setCancellationError(null);
                  }
                }}
                type="button"
                disabled={isRequestingCancellation}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                This plan is currently <strong>Finally Approved</strong>. If
                this plan contains errors or cannot be implemented, provide a
                detailed reason below to request formal cancellation from the
                Director.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-500 font-medium">Plan Name:</span>
                  <span className="font-semibold text-slate-900 text-right truncate max-w-[260px]">
                    {currentPlan.name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-500 font-medium">Reference:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {currentPlan.reference}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-500 font-medium">
                    Activities:
                  </span>
                  <span className="font-semibold text-slate-900">
                    {activities.length}{" "}
                    {activities.length === 1 ? "activity" : "activities"}
                  </span>
                </div>
              </div>

              {cancellationError && (
                <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800">
                  {cancellationError}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="cancellation-reason"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Cancellation Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="cancellation-reason"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 disabled:bg-slate-50"
                  placeholder="State specifically why this plan cannot be implemented (e.g. Scope change, budgetary reallocation, or duplicated item)..."
                  rows={4}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  disabled={isRequestingCancellation}
                  required
                />
                <p className="text-[11px] text-slate-500">
                  This reason will be recorded in the version history audit
                  trail and sent to the Director for review.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-6 py-3.5">
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                disabled={isRequestingCancellation}
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setCancellationReason("");
                  setCancellationError(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={
                  isRequestingCancellation || !cancellationReason.trim()
                }
                onClick={handleRequestCancellation}
                type="button"
              >
                {isRequestingCancellation ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Submit Cancellation Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
  registerContractHref,
}: {
  activity: PlanActivity;
  canEdit?: boolean;
  editHref: string;
  href: string;
  isMultiOfficer?: boolean;
  onSelectDelay?: (activity: PlanActivity) => void;
  registerContractHref?: string;
}) {
  const rowStages =
    (activity as any).stages ||
    activity.details?.roadmap ||
    (activity as any).roadmap ||
    [];
  const isDelayed =
    activity.status === "Delayed" ||
    (activity as any).status === "DELAYED" ||
    Boolean((activity as any).delayDays) ||
    Boolean((activity as any).daysOverdue) ||
    calculateRealActivityDelay(rowStages) > 0;

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
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
              title="Click to view delay in phase breakdown"
            >
              <Clock className="w-2.5 h-2.5" />
              <span>Delay in Phase</span>
            </button>
          )}
        </div>
      </td>
      <td className="px-2 py-2.5 text-right align-top whitespace-nowrap min-w-[170px]">
        <div className="flex items-center justify-end gap-1.5 shrink-0">
          {registerContractHref && (
            <Link
              aria-label={`Register contract for activity ${activity.reference}`}
              className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-semibold text-[#0A3C2F] hover:bg-[#0A3C2F] hover:text-white transition-colors cursor-pointer shadow-2xs"
              href={registerContractHref}
              title={`Register contract for ${activity.reference}`}
            >
              <FileSignature className="h-2.5 w-2.5" />
              Register Contract
            </Link>
          )}
          {canEdit && (
            <Link
              aria-label={`Edit activity ${activity.reference}`}
              className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700 hover:bg-[#0A3C2F] hover:text-white transition cursor-pointer"
              href={editHref}
              title={`Edit activity ${activity.reference}`}
            >
              <Edit3 className="h-2.5 w-2.5" />
              Edit
            </Link>
          )}
          <Link
            aria-label={`Open activity ${activity.reference}`}
            className="shrink-0 text-[10px] font-semibold text-[#1261a8] hover:text-[#0A3C2F] hover:underline"
            href={href}
          >
            Open
          </Link>
        </div>
      </td>
    </tr>
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
