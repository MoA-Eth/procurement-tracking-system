"use client";

import { useEffect, useState } from "react";
import {
  History,
  X,
  ArrowRight,
  User,
  Calendar,
  MessageSquare,
  FileCheck2,
  Send,
  RotateCcw,
  PlusCircle,
  Edit3,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import {
  getPlanVersionHistory,
  type PlanVersionRecord,
  type PlanActivitySnapshot,
} from "../data/planRevisions";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName?: string;
  projectCode?: string;
  currentStatus?: string;
  activityReference?: string;
  activityDescription?: string;
  plan?: any;
  project?: any;
  activity?: any;
  activities?: readonly any[];
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  planId,
  planName,
  projectCode,
  currentStatus,
  activityReference,
  activityDescription,
  plan,
  project,
  activity,
  activities,
}: VersionHistoryModalProps) {
  const [filterVersion, setFilterVersion] = useState<number | "ALL">("ALL");
  const [expandedRecordIds, setExpandedRecordIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rawActs =
    activities ||
    plan?.activities ||
    plan?.planActivities ||
    (activity ? [activity] : []);

  const allHistory = getPlanVersionHistory(planId, {
    planName,
    projectCode,
    currentStatus,
    planData: plan,
    projectData: project,
    activitiesData: rawActs,
  });

  const history = activityReference
    ? allHistory.filter(
        (h) =>
          h.activityReference === activityReference ||
          (h.actionLabel && h.actionLabel.includes(activityReference)),
      )
    : allHistory;

  // Resolve metadata for Project, Plan, and Activities
  const resolvedProjectCode =
    projectCode ||
    project?.code ||
    plan?.projectCode ||
    allHistory[0]?.projectCode ||
    "PROJECT";

  const resolvedProjectName =
    project?.name ||
    plan?.project?.name ||
    allHistory[0]?.projectName ||
    allHistory[0]?.projectDetails?.name ||
    resolvedProjectCode;

  const resolvedOrgRegion =
    project?.organizationRegion ||
    plan?.organization ||
    allHistory[0]?.projectDetails?.organizationRegion ||
    "Federal / FPCU";

  const resolvedFunding =
    project?.fundingSource ||
    plan?.fundingSource ||
    allHistory[0]?.projectDetails?.fundingSource ||
    "African Development Bank (AfDB)";

  const resolvedPlanName =
    planName ||
    plan?.planName ||
    plan?.title ||
    allHistory[0]?.planName ||
    planId;

  const resolvedCategory =
    plan?.category ||
    plan?.procurementCategory ||
    allHistory[0]?.planDetails?.category ||
    "Goods";

  const resolvedBudgetYear =
    plan?.budgetYear || allHistory[0]?.planDetails?.budgetYear || "2017 EFY";

  const resolvedAmount = Number(
    plan?.estimatedTotalValue ||
      plan?.estimatedBudget ||
      allHistory[0]?.planDetails?.estimatedTotal ||
      0,
  );

  const resolvedStatus =
    currentStatus ||
    plan?.status ||
    plan?.rawStatus ||
    allHistory[0]?.planDetails?.status ||
    "Draft";

  const mappedActivitiesList: PlanActivitySnapshot[] = Array.isArray(rawActs)
    ? rawActs.map((act: any) => ({
        id: act.id,
        activityRefNo:
          act.activityRefNo || act.reference || act.id || "ACT-REF",
        description: act.description || "Activity description",
        method:
          act.method || act.procurementMethod?.label || "Procurement Method",
        marketApproach: act.marketApproach || "Open - National",
        reviewType: act.reviewType || "Prior",
        estimatedAmount:
          Number(act.estimatedAmount || act.estimatedBudget) || 0,
        currency: act.currency || "ETB",
        status: act.status || "In Progress",
      }))
    : allHistory[0]?.activities || [];

  // Group by version
  const versionNumbers = Array.from(
    new Set(history.map((h) => h.versionNumber || 1)),
  ).sort((a, b) => b - a);

  const filteredHistory =
    filterVersion === "ALL"
      ? history
      : history.filter((h) => (h.versionNumber || 1) === filterVersion);

  const toggleExpand = (id: string) => {
    setExpandedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getActionBadge = (action: PlanVersionRecord["action"]) => {
    switch (action) {
      case "INITIAL_DRAFT":
        return {
          icon: <PlusCircle className="h-3 w-3 text-slate-600" />,
          bg: "bg-slate-100 text-slate-700 border-slate-300",
          label: "Initial Draft Created",
          rolePrefix: "Created by Officer",
        };
      case "SUBMITTED":
        return {
          icon: <Send className="h-3 w-3 text-blue-600" />,
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          label: "Submitted for Director Review",
          rolePrefix: "Submitted by Officer",
        };
      case "RESUBMITTED":
        return {
          icon: <Send className="h-3 w-3 text-cyan-700" />,
          bg: "bg-cyan-50 text-cyan-800 border-cyan-200",
          label: "Plan Resubmitted to Director",
          rolePrefix: "Resubmitted by Officer",
        };
      case "RETURNED":
        return {
          icon: <RotateCcw className="h-3 w-3 text-rose-700" />,
          bg: "bg-rose-50 text-rose-800 border-rose-200/80",
          label: "Returned for Revision",
          rolePrefix: "Returned by Director",
        };
      case "PLAN_REVISED":
      case "ACTIVITY_REVISED":
        return {
          icon: <Edit3 className="h-3 w-3 text-emerald-600" />,
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          label:
            action === "PLAN_REVISED" ? "Plan Revised" : "Activity Revised",
          rolePrefix: "Revised by",
        };
      case "ACTIVITY_ADDED":
        return {
          icon: <PlusCircle className="h-3 w-3 text-teal-600" />,
          bg: "bg-teal-50 text-teal-800 border-teal-200",
          label: "Activity Added",
          rolePrefix: "Added by Officer",
        };
      case "APPROVED_DIRECTOR":
      case "SENT_TO_COMMITTEE":
        return {
          icon: <FileCheck2 className="h-3 w-3 text-indigo-600" />,
          bg: "bg-indigo-50 text-indigo-800 border-indigo-200",
          label: "Approved by Director & Sent to Committee",
          rolePrefix: "Approved by Director",
        };
      case "COMMITTEE_VOTE":
        return {
          icon: <ShieldCheck className="h-3 w-3 text-amber-600" />,
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          label: "Committee Vote Cast",
          rolePrefix: "Voted by Committee Member",
        };
      case "COMMITTEE_ENDORSED":
        return {
          icon: <ShieldCheck className="h-3 w-3 text-emerald-700" />,
          bg: "bg-emerald-50 text-emerald-800 border-emerald-300",
          label: "Endorsed by Endorsement Committee",
          rolePrefix: "Endorsed by Committee Quorum",
        };
      case "FINALLY_APPROVED":
      case "MANAGEMENT_DECISION":
        return {
          icon: <CheckCircle2 className="h-3 w-3 text-emerald-700" />,
          bg: "bg-emerald-100 text-emerald-900 border-emerald-300",
          label: "Authorized by Executive Management",
          rolePrefix: "Authorized by Management",
        };
      case "CANCELLATION_REQUESTED":
        return {
          icon: <AlertTriangle className="h-3 w-3 text-amber-600" />,
          bg: "bg-amber-50 text-amber-800 border-amber-300",
          label: "Cancellation Requested by Officer",
          rolePrefix: "Requested by Officer",
        };
      case "PLAN_CANCELLED":
        return {
          icon: <XCircle className="h-3 w-3 text-rose-700" />,
          bg: "bg-rose-100 text-rose-900 border-rose-300",
          label: "Plan Cancelled by Director",
          rolePrefix: "Cancelled by Director",
        };
      case "CANCELLATION_REJECTED":
        return {
          icon: <RotateCcw className="h-3 w-3 text-slate-700" />,
          bg: "bg-slate-100 text-slate-800 border-slate-300",
          label: "Cancellation Request Declined by Director",
          rolePrefix: "Declined by Director",
        };
      default:
        return {
          icon: <History className="h-3 w-3 text-slate-600" />,
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          label: "Audit Event",
          rolePrefix: "Action by",
        };
    }
  };

  // Find milestones in history for the summary tracker
  const submitMilestone = history.find(
    (h) => h.action === "SUBMITTED" || h.action === "INITIAL_DRAFT",
  );
  const directorMilestone = history.find(
    (h) =>
      h.action === "APPROVED_DIRECTOR" ||
      h.action === "SENT_TO_COMMITTEE" ||
      h.action === "RETURNED",
  );
  const resubmitMilestone = history.find((h) => h.action === "RESUBMITTED");
  const committeeMilestone = history.find(
    (h) =>
      h.action === "COMMITTEE_ENDORSED" ||
      h.action === "COMMITTEE_VOTE" ||
      h.action === "FINALLY_APPROVED",
  );

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
    >
      {/* Subtle non-intrusive backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over subtle side drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-4 sm:pl-6 pointer-events-none">
        <aside className="pointer-events-auto w-screen max-w-[500px] bg-white shadow-2xl border-l border-slate-200/90 flex flex-col animate-in slide-in-from-right duration-200 ease-out">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/90 px-4 sm:px-5 py-3.5 bg-slate-50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0A3C2F] text-white shadow-2xs">
                <History className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-[#16253d] truncate">
                    {activityReference
                      ? "Activity Version History"
                      : "Version History & Audit Trail"}
                  </h2>
                  <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    {versionNumbers.length > 0
                      ? `v${Math.max(...versionNumbers)}`
                      : "v1"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {activityReference ? (
                    <>
                      <span className="font-semibold text-slate-700">
                        {activityReference}
                      </span>
                      {activityDescription ? ` • ${activityDescription}` : ""}
                      {resolvedPlanName ? ` • Plan: ${resolvedPlanName}` : ""}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-slate-700">
                        {resolvedPlanName}
                      </span>{" "}
                      • {resolvedProjectCode}
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              aria-label="Close version history"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition cursor-pointer"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 sm:px-5 py-2 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                Version:
              </span>
              <button
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                  filterVersion === "ALL"
                    ? "bg-[#0A3C2F] text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
                onClick={() => setFilterVersion("ALL")}
                type="button"
              >
                All ({history.length})
              </button>
              {versionNumbers.map((vNum) => (
                <button
                  key={vNum}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                    filterVersion === vNum
                      ? "bg-[#0A3C2F] text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                  onClick={() => setFilterVersion(vNum)}
                  type="button"
                >
                  v{vNum}
                </button>
              ))}
            </div>

            <span className="text-[11px] font-medium text-slate-500 shrink-0">
              Status:{" "}
              <span
                className={`font-semibold inline-block px-1.5 py-0.5 rounded text-[10px] ${
                  resolvedStatus.toLowerCase().includes("return")
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : resolvedStatus.toLowerCase().includes("approve") ||
                        resolvedStatus.toLowerCase().includes("endorse")
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {resolvedStatus}
              </span>
            </span>
          </div>

          {/* Body Content / Timeline */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* LIFECYCLE MILESTONES SUMMARY TRACKER */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Lifecycle Progression Audit
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {/* 1. Officer Submission */}
                <div
                  className={`p-2 rounded-lg border ${
                    submitMilestone
                      ? "bg-blue-50/70 border-blue-200 text-blue-900"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1 font-semibold text-[10px]">
                    <Send className="h-3 w-3" />
                    <span>Officer Submission</span>
                  </div>
                  <span className="font-medium text-[10px] block mt-0.5 truncate">
                    {submitMilestone
                      ? submitMilestone.changedBy
                      : "Pending submission"}
                  </span>
                  {submitMilestone && (
                    <span className="text-[9px] text-slate-500 block truncate">
                      {new Date(submitMilestone.changedAt).toLocaleDateString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                  )}
                </div>

                {/* 2. Director Review */}
                <div
                  className={`p-2 rounded-lg border ${
                    directorMilestone
                      ? directorMilestone.action === "RETURNED"
                        ? "bg-rose-50/70 border-rose-200 text-rose-900"
                        : "bg-indigo-50/70 border-indigo-200 text-indigo-900"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1 font-semibold text-[10px]">
                    {directorMilestone?.action === "RETURNED" ? (
                      <RotateCcw className="h-3 w-3" />
                    ) : (
                      <FileCheck2 className="h-3 w-3" />
                    )}
                    <span>Director Review</span>
                  </div>
                  <span className="font-medium text-[10px] block mt-0.5 truncate">
                    {directorMilestone
                      ? directorMilestone.action === "RETURNED"
                        ? "Returned for Revision"
                        : "Approved & Endorsed"
                      : "Under Director Review"}
                  </span>
                  {directorMilestone && (
                    <span className="text-[9px] text-slate-500 block truncate">
                      {new Date(directorMilestone.changedAt).toLocaleDateString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                  )}
                </div>

                {/* 3. Resubmission */}
                <div
                  className={`p-2 rounded-lg border ${
                    resubmitMilestone
                      ? "bg-cyan-50/70 border-cyan-200 text-cyan-900"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1 font-semibold text-[10px]">
                    <Send className="h-3 w-3" />
                    <span>Officer Resubmission</span>
                  </div>
                  <span className="font-medium text-[10px] block mt-0.5 truncate">
                    {resubmitMilestone ? resubmitMilestone.changedBy : "N/A"}
                  </span>
                  {resubmitMilestone && (
                    <span className="text-[9px] text-slate-500 block truncate">
                      {new Date(resubmitMilestone.changedAt).toLocaleDateString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                  )}
                </div>

                {/* 4. Committee Endorsement */}
                <div
                  className={`p-2 rounded-lg border ${
                    committeeMilestone
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1 font-semibold text-[10px]">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Committee Endorsement</span>
                  </div>
                  <span className="font-medium text-[10px] block mt-0.5 truncate">
                    {committeeMilestone
                      ? "Endorsed (3/5 Quorum)"
                      : "Awaiting Committee"}
                  </span>
                  {committeeMilestone && (
                    <span className="text-[9px] text-slate-500 block truncate">
                      {new Date(
                        committeeMilestone.changedAt,
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* TIMELINE STREAM */}
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <History className="h-4 w-4" />
                </div>
                <h3 className="mt-2.5 text-xs font-semibold text-slate-800">
                  {activityReference
                    ? "Initial Baseline (v1)"
                    : "Baseline Version (v1)"}
                </h3>
                <p className="mt-1 max-w-xs text-[11px] text-slate-500 leading-normal">
                  {activityReference
                    ? "No revisions recorded yet for this activity. When updates or returns occur, audit entries and field changes will appear here."
                    : "No revisions recorded yet. When updates or returns occur, audit entries and field changes will appear here."}
                </p>
              </div>
            ) : (
              <div className="relative space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {filteredHistory.map((rec) => {
                  const badge = getActionBadge(rec.action);
                  const isExpanded =
                    expandedRecordIds.has(rec.id) ||
                    (rec.changes && rec.changes.length > 0);

                  return (
                    <div key={rec.id} className="relative pl-7">
                      {/* Timeline Node */}
                      <div className="absolute left-1 top-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white ring-2 ring-slate-100 border border-slate-300">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            rec.action === "RETURNED"
                              ? "bg-rose-600"
                              : rec.action === "COMMITTEE_ENDORSED" ||
                                  rec.action === "FINALLY_APPROVED"
                                ? "bg-emerald-600"
                                : rec.action === "APPROVED_DIRECTOR" ||
                                    rec.action === "SENT_TO_COMMITTEE"
                                  ? "bg-indigo-600"
                                  : "bg-[#0A3C2F]"
                          }`}
                        />
                      </div>

                      {/* Card */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition hover:border-slate-300 space-y-2">
                        {/* Card Header */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[10px] font-semibold ${badge.bg}`}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            v{rec.versionNumber || 1}
                          </span>
                        </div>

                        {/* Activity or Plan Reference Callout */}
                        {rec.activityReference && (
                          <div className="text-[11px] font-semibold font-mono text-[#0A3C2F] bg-slate-50 px-2 py-1 rounded border border-slate-200">
                            Activity: {rec.activityReference}
                            {rec.activityDescription
                              ? ` — ${rec.activityDescription}`
                              : ""}
                          </div>
                        )}

                        {/* Actor & Exact Role Information */}
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 pt-0.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">
                              {rec.changedBy}
                            </span>
                            <span className="text-slate-500 shrink-0 text-[10px]">
                              ({rec.changedByRole})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 text-slate-500 font-mono text-[10px]">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>
                              {new Date(rec.changedAt).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Reason / Remarks / Feedback Box */}
                        {rec.reason && (
                          <div
                            className={`rounded-lg border p-2.5 text-xs ${
                              rec.action === "RETURNED"
                                ? "bg-rose-50/60 border-rose-200 text-rose-950"
                                : rec.action === "RESUBMITTED"
                                  ? "bg-cyan-50/60 border-cyan-200 text-cyan-950"
                                  : rec.action === "APPROVED_DIRECTOR" ||
                                      rec.action === "SENT_TO_COMMITTEE"
                                    ? "bg-indigo-50/60 border-indigo-200 text-indigo-950"
                                    : "bg-slate-50 border-slate-200 text-slate-700"
                            }`}
                          >
                            <div className="flex items-start gap-1.5">
                              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                              <div className="min-w-0">
                                <span className="font-semibold text-[11px] block">
                                  {rec.action === "RETURNED"
                                    ? "Director Feedback & Improvement Instructions:"
                                    : rec.action === "RESUBMITTED"
                                      ? "Officer Revision Notes Addressing Feedback:"
                                      : rec.action === "APPROVED_DIRECTOR" ||
                                          rec.action === "SENT_TO_COMMITTEE"
                                        ? "Director Approval Remarks & Committee Deadline:"
                                        : rec.action === "COMMITTEE_ENDORSED"
                                          ? "Endorsement Committee Deliberation Notes:"
                                          : "Audit Remarks:"}
                                </span>
                                <span className="italic font-normal break-words text-[11px]">
                                  &ldquo;{rec.reason}&rdquo;
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Documented Details Accordion (Project, Plan & Activities Snapshot) */}
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            Plan:{" "}
                            <strong className="text-slate-700 font-semibold">
                              {rec.planName || resolvedPlanName}
                            </strong>{" "}
                            • {rec.projectCode || resolvedProjectCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleExpand(rec.id)}
                            className="font-semibold text-[#0A3C2F] hover:underline cursor-pointer"
                          >
                            {isExpanded
                              ? "Collapse Snapshot"
                              : "Expand Details"}
                          </button>
                        </div>

                        {/* Expanded Snapshot Details & Field Diffs */}
                        {isExpanded && (
                          <div className="space-y-2 pt-1">
                            {/* Entity Snapshot at this version */}
                            <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200/80 text-[11px] space-y-1">
                              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                <div>
                                  <span className="text-slate-400 block">
                                    Documented Category:
                                  </span>
                                  <span className="font-semibold text-slate-700">
                                    {rec.planDetails?.category ||
                                      rec.snapshot?.category ||
                                      resolvedCategory}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">
                                    Budget Year:
                                  </span>
                                  <span className="font-semibold text-slate-700">
                                    {rec.planDetails?.budgetYear ||
                                      rec.snapshot?.budgetYear ||
                                      resolvedBudgetYear}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">
                                    Estimated Budget:
                                  </span>
                                  <span className="font-semibold text-slate-700 tabular-nums">
                                    ETB{" "}
                                    {Number(
                                      rec.planDetails?.estimatedTotal ||
                                        rec.snapshot?.estimatedTotal ||
                                        resolvedAmount,
                                    ).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">
                                    Activities in Plan:
                                  </span>
                                  <span className="font-semibold text-slate-700">
                                    {rec.activities?.length ||
                                      rec.planDetails?.activitiesCount ||
                                      rec.snapshot?.activitiesCount ||
                                      mappedActivitiesList.length}{" "}
                                    activities
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Field Diffs */}
                            {rec.changes && rec.changes.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-semibold text-slate-600 block">
                                  Field Modifications ({rec.changes.length}):
                                </span>
                                {rec.changes.map((ch, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded border border-slate-100 bg-slate-50/90 p-2 text-xs"
                                  >
                                    <div className="font-semibold text-slate-700 text-[11px]">
                                      {ch.fieldName || ch.field}
                                    </div>
                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs">
                                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 line-through">
                                        {String(ch.previousValue)}
                                      </span>
                                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                        {String(ch.newValue)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 px-4 sm:px-5 py-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <Clock className="h-3.5 w-3.5 text-[#0A3C2F]" />
              Permanent audit trail preserved
            </span>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-3xs"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export { VersionHistoryModal as VersionHistoryDrawer };
