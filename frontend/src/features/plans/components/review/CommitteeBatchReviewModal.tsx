"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  RotateCcw,
  X,
} from "lucide-react";
import type { ProcurementPlan } from "../../plansData";

export interface CommitteeBatchReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "APPROVE" | "REJECT";
  plans: ProcurementPlan[];
  projectCode: string;
  onConfirm: (data: {
    decision: "APPROVE" | "REJECT";
    plans: ProcurementPlan[];
    remarks?: string;
    planDetails?: Record<
      string,
      {
        planId: string;
        scope: "ALL" | "SPECIFIC";
        rejectedActivityIds?: string[];
        rejectedActivityRefs?: string[];
        remarks?: string;
      }
    >;
  }) => Promise<void> | void;
}

export function CommitteeBatchReviewModal({
  isOpen,
  onClose,
  mode,
  plans,
  projectCode,
  onConfirm,
}: CommitteeBatchReviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remarks / notes
  const [remarks, setRemarks] = useState("");

  // Rejection specific state per plan
  // Plan inclusion in rejection (defaults to all provided plans)
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(
    () => new Set(plans.map((p) => p.id)),
  );

  // Scope per plan: "ALL" or "SPECIFIC"
  const [scopes, setScopes] = useState<Record<string, "ALL" | "SPECIFIC">>({});

  // Flagged activity IDs per plan
  const [flaggedActivityIds, setFlaggedActivityIds] = useState<
    Record<string, Set<string>>
  >(() => {
    const initial: Record<string, Set<string>> = {};
    plans.forEach((p) => {
      const acts = p.activities || [];
      if (acts.length > 0) {
        initial[p.id] = new Set([acts[0].id]);
      } else {
        initial[p.id] = new Set();
      }
    });
    return initial;
  });

  // Expanded accordions for specific activities
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(
    () => new Set(plans.map((p) => p.id)),
  );

  if (!isOpen || plans.length === 0) return null;

  const togglePlanSelected = (id: string) => {
    const next = new Set(selectedPlanIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPlanIds(next);
  };

  const toggleScope = (planId: string, scope: "ALL" | "SPECIFIC") => {
    setScopes((prev) => ({ ...prev, [planId]: scope }));
  };

  const toggleAccordion = (planId: string) => {
    const next = new Set(expandedPlanIds);
    if (next.has(planId)) {
      next.delete(planId);
    } else {
      next.add(planId);
    }
    setExpandedPlanIds(next);
  };

  const toggleActivity = (planId: string, activityId: string) => {
    const currentSet = flaggedActivityIds[planId] || new Set();
    const nextSet = new Set(currentSet);
    if (nextSet.has(activityId)) {
      nextSet.delete(activityId);
    } else {
      nextSet.add(activityId);
    }
    setFlaggedActivityIds((prev) => ({ ...prev, [planId]: nextSet }));
  };

  const selectAllActivities = (planId: string, activities: any[]) => {
    setFlaggedActivityIds((prev) => ({
      ...prev,
      [planId]: new Set(activities.map((a) => a.id)),
    }));
  };

  const clearAllActivities = (planId: string) => {
    setFlaggedActivityIds((prev) => ({
      ...prev,
      [planId]: new Set(),
    }));
  };

  const handleConfirm = async () => {
    setError(null);

    if (mode === "REJECT") {
      if (selectedPlanIds.size === 0) {
        setError("Please select at least one plan to reject.");
        return;
      }

      if (!remarks.trim()) {
        setError("Please provide committee feedback or rejection notes.");
        return;
      }

      // Check specific activity validations
      for (const plan of plans) {
        if (!selectedPlanIds.has(plan.id)) continue;
        const scope = scopes[plan.id] || "ALL";
        const flagged = flaggedActivityIds[plan.id] || new Set();
        if (
          scope === "SPECIFIC" &&
          (plan.activities || []).length > 0 &&
          flagged.size === 0
        ) {
          setError(
            `Please select at least one activity to flag in plan: ${plan.planName}`,
          );
          return;
        }
      }
    }

    const plansToProcess =
      mode === "REJECT"
        ? plans.filter((p) => selectedPlanIds.has(p.id))
        : plans;

    const planDetails: Record<
      string,
      {
        planId: string;
        scope: "ALL" | "SPECIFIC";
        rejectedActivityIds?: string[];
        rejectedActivityRefs?: string[];
        remarks?: string;
      }
    > = {};

    if (mode === "REJECT") {
      plansToProcess.forEach((p) => {
        const scope = scopes[p.id] || "ALL";
        const acts = p.activities || [];
        const flaggedSet = flaggedActivityIds[p.id] || new Set();
        const flaggedActs = acts.filter((a: any) => flaggedSet.has(a.id));

        const activityIds =
          scope === "SPECIFIC"
            ? Array.from(flaggedSet)
            : acts.map((a: any) => a.id);

        const activityRefs =
          scope === "SPECIFIC"
            ? flaggedActs.map(
                (a: any) => a.activityRefNo || a.reference || a.id,
              )
            : acts.map((a: any) => a.activityRefNo || a.reference || a.id);

        planDetails[p.id] = {
          planId: p.id,
          scope,
          rejectedActivityIds: activityIds,
          rejectedActivityRefs: activityRefs,
          remarks: remarks.trim(),
        };
      });
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        decision: mode,
        plans: plansToProcess,
        remarks: remarks.trim() || undefined,
        planDetails: mode === "REJECT" ? planDetails : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to process votes. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
      role="dialog"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            mode === "APPROVE"
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-rose-200 bg-rose-50/70"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs ${
                mode === "APPROVE" ? "bg-[#0A3C2F]" : "bg-rose-600"
              }`}
            >
              {mode === "APPROVE" ? (
                <CheckCircle2 className="h-5 w-5 text-[#A3E635]" />
              ) : (
                <RotateCcw className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {mode === "APPROVE"
                  ? `Batch Committee Endorsement (${plans.length} Plans)`
                  : `Batch Committee Rejection / Return (${plans.length} Plans)`}
              </h3>
              <p className="text-xs text-slate-500">
                Project:{" "}
                <strong className="text-slate-800">{projectCode}</strong>
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode APPROVE Content */}
          {mode === "APPROVE" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <p className="text-xs text-emerald-900 leading-relaxed">
                  You are casting an <strong>APPROVE</strong> endorsement vote
                  for the <strong>{plans.length}</strong> selected procurement
                  plans below. Each plan requires a majority of at least 3
                  committee approvals to advance to Executive Management.
                </p>
              </div>

              {/* Plans Summary List */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Plans to be Endorsed:
                </label>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between p-3 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="font-semibold text-slate-800 truncate">
                          {plan.planName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">
                            {plan.reference || plan.id}
                          </span>
                          <span>•</span>
                          <span>{plan.category}</span>
                          <span>•</span>
                          <span>
                            {Math.max(
                              plan.activitiesCount || 0,
                              (plan.activities?.length || 0) +
                                ((plan as any).parentActivities?.length || 0),
                              (plan.activities || []).length,
                            )}{" "}
                            Activities
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-semibold text-slate-700">
                          {plan.estimatedTotal || "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Remarks */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Endorsement Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional committee deliberation remarks..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] outline-none"
                />
              </div>
            </div>
          )}

          {/* Mode REJECT Content */}
          {mode === "REJECT" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Select which plans to reject. For each plan, you can reject
                    the entire plan or flag specific activities so the
                    Procurement Officer and Director know exactly which items
                    require revision.
                  </p>
                </div>
              </div>

              {/* Plans with Granular Activity Targeting */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Plans &amp; Activities to Reject:
                </label>

                {plans.map((plan) => {
                  const isPlanChecked = selectedPlanIds.has(plan.id);
                  const planScope = scopes[plan.id] || "ALL";
                  const activities = plan.activities || [];
                  const planFlagged = flaggedActivityIds[plan.id] || new Set();
                  const isExpanded = expandedPlanIds.has(plan.id);

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-xl border transition-all ${
                        isPlanChecked
                          ? "border-slate-300 bg-white shadow-2xs"
                          : "border-slate-200 bg-slate-50/50 opacity-60"
                      }`}
                    >
                      {/* Plan Header Row */}
                      <div className="flex items-center justify-between p-3.5 gap-3 border-b border-slate-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isPlanChecked}
                            onChange={() => togglePlanSelected(plan.id)}
                            className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-slate-900 block truncate">
                              {plan.planName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {plan.reference || plan.id} • {plan.category} (
                              {activities.length} Activities)
                            </span>
                          </div>
                        </div>

                        {isPlanChecked && activities.length > 0 && (
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                              <button
                                type="button"
                                onClick={() => toggleScope(plan.id, "ALL")}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                  planScope === "ALL"
                                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                Entire Plan
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleScope(plan.id, "SPECIFIC")}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                  planScope === "SPECIFIC"
                                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                Specific Activities (
                                {planScope === "SPECIFIC"
                                  ? planFlagged.size
                                  : "0"}
                                )
                              </button>
                            </div>

                            {planScope === "SPECIFIC" && (
                              <button
                                type="button"
                                onClick={() => toggleAccordion(plan.id)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition"
                                title="Expand/Collapse Activities"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Granular Activities List (when SPECIFIC is selected) */}
                      {isPlanChecked &&
                        planScope === "SPECIFIC" &&
                        isExpanded && (
                          <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1 border-b border-slate-200">
                              <span>
                                Flagged {planFlagged.size} of{" "}
                                {activities.length} activities with objections:
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    selectAllActivities(plan.id, activities)
                                  }
                                  className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                                >
                                  Select all
                                </button>
                                <span>•</span>
                                <button
                                  type="button"
                                  onClick={() => clearAllActivities(plan.id)}
                                  className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                              {activities.map((act: any) => {
                                const isActChecked = planFlagged.has(act.id);
                                return (
                                  <label
                                    key={act.id}
                                    className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition ${
                                      isActChecked
                                        ? "border-rose-300 bg-rose-50/60"
                                        : "border-slate-200 bg-white hover:bg-slate-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isActChecked}
                                      onChange={() =>
                                        toggleActivity(plan.id, act.id)
                                      }
                                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-medium text-slate-800">
                                          {act.activityRefNo ||
                                            act.reference ||
                                            act.id}
                                        </span>
                                        {act.method && (
                                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                                            {act.method}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-600 truncate mt-0.5">
                                        {act.description}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>

              {/* Mandatory Rejection Remarks */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-slate-900">
                  Committee Objection Remarks / Instructions *
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Explain the specific reasons for objection and what the officer needs to revise..."
                  className="w-full rounded-xl border border-rose-300 bg-rose-50/20 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-5 text-xs font-semibold text-white shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === "APPROVE"
                ? "bg-[#0A3C2F] hover:bg-[#083025]"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Recording Votes...</span>
              </>
            ) : mode === "APPROVE" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-[#A3E635]" />
                <span>Confirm Endorsement ({plans.length} Plans)</span>
              </>
            ) : (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>
                  Submit Rejection Votes ({selectedPlanIds.size} Plans)
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
