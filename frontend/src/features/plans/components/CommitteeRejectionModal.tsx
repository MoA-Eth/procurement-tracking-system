"use client";

import { useState } from "react";
import { AlertTriangle, X, RotateCcw, AlertCircle } from "lucide-react";

export interface RejectionActivityItem {
  id: string;
  activityRefNo?: string;
  description?: string;
  method?: string;
  estimatedAmount?: number;
  currency?: string;
}

interface CommitteeRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    scope: "ALL" | "SPECIFIC",
    selectedActivityIds: string[],
    selectedActivityRefs: string[],
    remarks: string,
  ) => void;
  activities: RejectionActivityItem[];
  planName: string;
  projectCode: string;
}

export function CommitteeRejectionModal({
  isOpen,
  onClose,
  onConfirm,
  activities,
  planName,
  projectCode,
}: CommitteeRejectionModalProps) {
  const [scope, setScope] = useState<"ALL" | "SPECIFIC">("SPECIFIC");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Preselect the first activity if available
    return activities.length > 0 ? new Set([activities[0].id]) : new Set();
  });
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleActivity = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(activities.map((a) => a.id)));
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = () => {
    if (!remarks.trim()) {
      setError("Please provide committee feedback or rejection notes.");
      return;
    }

    if (scope === "SPECIFIC" && selectedIds.size === 0) {
      setError("Please select at least one specific activity to reject.");
      return;
    }

    setError(null);

    const flaggedActivities = activities.filter((a) => selectedIds.has(a.id));
    const activityRefs =
      scope === "SPECIFIC"
        ? flaggedActivities.map((a) => a.activityRefNo || a.id)
        : activities.map((a) => a.activityRefNo || a.id);
    const activityIds =
      scope === "SPECIFIC"
        ? Array.from(selectedIds)
        : activities.map((a) => a.id);

    onConfirm(scope, activityIds, activityRefs, remarks.trim());
    onClose();
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
      role="dialog"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-rose-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Committee Rejection / Return for Revision
              </h3>
              <p className="text-xs text-slate-500">
                Plan: <strong className="text-slate-800">{planName}</strong> (
                {projectCode})
              </p>
            </div>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Question: Scope Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-900">
              Which activities do you want to reject?
            </label>
            <p className="text-xs text-slate-500">
              You can reject the entire plan or target specific activities. In
              both cases the whole plan will be returned for revision, but the
              Director and Officer will see exactly which activities had
              objections.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option 1: Specific Activities */}
              <button
                type="button"
                onClick={() => setScope("SPECIFIC")}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === "SPECIFIC"
                    ? "border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/10 shadow-xs"
                    : "border-slate-200 bg-slate-50/60 hover:bg-slate-100"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    scope === "SPECIFIC"
                      ? "border-amber-600 bg-amber-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {scope === "SPECIFIC" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Specific Activities
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    Select the specific activity/activities that have defects.
                  </p>
                </div>
              </button>

              {/* Option 2: All Activities */}
              <button
                type="button"
                onClick={() => setScope("ALL")}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === "ALL"
                    ? "border-[#0A3C2F] bg-emerald-50/80 ring-2 ring-[#0A3C2F]/10 shadow-xs"
                    : "border-slate-200 bg-slate-50/60 hover:bg-slate-100"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    scope === "ALL"
                      ? "border-[#0A3C2F] bg-[#0A3C2F]"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {scope === "ALL" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    All Activities (Entire Plan)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    Reject the whole procurement package without targeting
                    specific items.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* If Specific Activities: Interactive Checklist */}
          {scope === "SPECIFIC" && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/40 p-4 space-y-3 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                  <span className="text-xs font-extrabold text-amber-950">
                    Select activities to flag ({selectedIds.size} of{" "}
                    {activities.length} selected):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Activities List */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-amber-100/70">
                {activities.map((act) => {
                  const isChecked = selectedIds.has(act.id);
                  return (
                    <label
                      key={act.id}
                      className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-rose-100/70 border border-rose-300"
                          : "bg-white hover:bg-slate-50 border border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleActivity(act.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-extrabold text-slate-900">
                            {act.activityRefNo || act.id}
                          </span>
                          {act.method && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] text-slate-600 font-semibold">
                                {act.method}
                              </span>
                            </>
                          )}
                          {act.estimatedAmount !== undefined && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] font-mono font-bold text-slate-700">
                                {act.currency || "ETB"}{" "}
                                {act.estimatedAmount.toLocaleString()}
                              </span>
                            </>
                          )}
                          {isChecked && (
                            <span className="ml-auto text-[10px] font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              Flagged for Rejection
                            </span>
                          )}
                        </div>
                        {act.description && (
                          <p className="text-slate-800 text-[11px] mt-1 line-clamp-1">
                            {act.description}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {selectedIds.size === 0 && (
                <p className="text-[11px] font-bold text-rose-600">
                  ⚠️ Please select at least one activity to reject.
                </p>
              )}
            </div>
          )}

          {/* Feedback Textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-900">
              Committee Feedback &amp; Deliberation Notes
              <span className="ml-1 text-rose-500 font-semibold">
                (Required)
              </span>
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                if (error) setError(null);
              }}
              placeholder={
                scope === "SPECIFIC"
                  ? "Specify why these particular activities were rejected (e.g., budget too high, outdated spec, missing documentation)..."
                  : "Specify required corrections or reason for returning the entire plan package..."
              }
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>
              {scope === "SPECIFIC"
                ? `Confirm Rejection (${selectedIds.size} Activity Flagged)`
                : "Confirm Rejection (All Activities)"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
