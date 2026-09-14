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
} from "lucide-react";
import {
  getPlanVersionHistory,
  type PlanVersionRecord,
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

  const allHistory = getPlanVersionHistory(planId);
  const history = activityReference
    ? allHistory.filter(
        (h) =>
          h.activityReference === activityReference ||
          (h.actionLabel && h.actionLabel.includes(activityReference)),
      )
    : allHistory;

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
          label: "Initial Draft",
        };
      case "SUBMITTED":
      case "RESUBMITTED":
        return {
          icon: <Send className="h-3 w-3 text-blue-600" />,
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          label: action === "RESUBMITTED" ? "Resubmitted" : "Submitted",
        };
      case "RETURNED":
        return {
          icon: <RotateCcw className="h-3 w-3 text-amber-600" />,
          bg: "bg-amber-50 text-amber-800 border-amber-300",
          label: "Returned for Revision",
        };
      case "PLAN_REVISED":
      case "ACTIVITY_REVISED":
        return {
          icon: <Edit3 className="h-3 w-3 text-emerald-600" />,
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          label:
            action === "PLAN_REVISED" ? "Plan Revised" : "Activity Revised",
        };
      case "ACTIVITY_ADDED":
        return {
          icon: <PlusCircle className="h-3 w-3 text-teal-600" />,
          bg: "bg-teal-50 text-teal-800 border-teal-200",
          label: "Activity Added",
        };
      case "APPROVED_DIRECTOR":
      case "SENT_TO_COMMITTEE":
        return {
          icon: <FileCheck2 className="h-3 w-3 text-indigo-600" />,
          bg: "bg-indigo-50 text-indigo-800 border-indigo-200",
          label: "Director Endorsed",
        };
      case "FINALLY_APPROVED":
        return {
          icon: <ShieldCheck className="h-3 w-3 text-emerald-700" />,
          bg: "bg-emerald-100 text-emerald-900 border-emerald-300",
          label: "Finally Approved",
        };
      default:
        return {
          icon: <History className="h-3 w-3 text-slate-600" />,
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          label: "Audit Event",
        };
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
    >
      {/* Subtle non-intrusive backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-900/25 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over subtle side drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-6 pointer-events-none">
        <aside className="pointer-events-auto w-screen max-w-[420px] bg-white shadow-2xl border-l border-slate-200/90 flex flex-col animate-in slide-in-from-right duration-200 ease-out">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/90 px-4 py-3 bg-[#edf5f1]/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#176c55] text-white shadow-2xs">
                <History className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#16253d] truncate">
                    {activityReference
                      ? "Activity Version History"
                      : "Version History"}
                  </h2>
                  <span className="shrink-0 rounded-full bg-[#176c55]/15 px-2 py-0.5 text-[10px] font-bold text-[#176c55]">
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
                      {activityDescription
                        ? ` • ${activityDescription}`
                        : ""}
                      {planName ? ` • Plan: ${planName}` : ""}
                    </>
                  ) : (
                    <>
                      {planName || planId} {projectCode ? `• ${projectCode}` : ""}
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              aria-label="Close version history"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition cursor-pointer"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                Version:
              </span>
              <button
                className={`rounded px-2 py-0.5 text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                  filterVersion === "ALL"
                    ? "bg-[#176c55] text-white shadow-2xs"
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
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                    filterVersion === vNum
                      ? "bg-[#176c55] text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                  onClick={() => setFilterVersion(vNum)}
                  type="button"
                >
                  v{vNum}
                </button>
              ))}
            </div>

            {currentStatus && (
              <span className="text-[11px] font-medium text-slate-500 shrink-0">
                Status:{" "}
                <strong className="font-semibold text-slate-800">
                  {currentStatus}
                </strong>
              </span>
            )}
          </div>

          {/* Body Content / Timeline */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <History className="h-4 w-4" />
                </div>
                <h3 className="mt-2.5 text-xs font-bold text-slate-800">
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
                      <div className="absolute left-1 top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white ring-2 ring-slate-100 border border-slate-300">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#176c55]" />
                      </div>

                      {/* Card */}
                      <div className="rounded-lg border border-slate-200/90 bg-white p-3 shadow-2xs transition hover:border-slate-300">
                        {/* Card Header */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}
                            >
                              {badge.icon}
                              {badge.label}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                              v{rec.versionNumber || 1}
                            </span>
                          </div>

                          {rec.activityReference && (
                            <span className="text-[11px] font-semibold font-mono text-[#0a4d40]">
                              Activity: {rec.activityReference}
                            </span>
                          )}

                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
                            <div className="flex items-center gap-1 truncate">
                              <User className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-700 truncate">
                                {rec.changedBy}
                              </span>
                              <span className="text-slate-400 shrink-0">
                                ({rec.changedByRole})
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 text-slate-400">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(rec.changedAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Reason / Remarks Box */}
                        {rec.reason && (
                          <div className="mt-2.5 rounded-md border border-amber-200/80 bg-amber-50/70 p-2 text-xs text-amber-900">
                            <div className="flex items-start gap-1.5">
                              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                              <div className="min-w-0">
                                <span className="font-bold text-amber-950 text-[11px]">
                                  {rec.action === "RETURNED"
                                    ? "Director Feedback:"
                                    : "Revision Note:"}
                                </span>{" "}
                                <span className="italic font-medium break-words text-[11px]">
                                  &ldquo;{rec.reason}&rdquo;
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Field Changes */}
                        {rec.changes && rec.changes.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700">
                                Changes ({rec.changes.length})
                              </span>
                              <button
                                className="text-[10px] font-semibold text-[#176c55] hover:underline cursor-pointer"
                                onClick={() => toggleExpand(rec.id)}
                                type="button"
                              >
                                {isExpanded ? "Collapse" : "Expand"}
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="mt-1.5 space-y-1.5">
                                {rec.changes.map((ch, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded border border-slate-100 bg-slate-50/80 p-2 text-xs"
                                  >
                                    <div className="font-semibold text-slate-700 text-[11px]">
                                      {ch.fieldName || ch.field}
                                    </div>
                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs">
                                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 line-through">
                                        {String(ch.previousValue)}
                                      </span>
                                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
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
          <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-[11px] text-slate-500">
            <span>Audit trail permanently recorded</span>
            <button
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
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
