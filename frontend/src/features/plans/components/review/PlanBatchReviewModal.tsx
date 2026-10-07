"use client";

import { useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileText,
  MessageSquare,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import type { ProcurementPlan } from "../../plansData";

export interface PlanBatchReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlans: ProcurementPlan[];
  unselectedPlans: ProcurementPlan[];
  committeeDeadlineDate: string;
  setCommitteeDeadlineDate: (date: string) => void;
  onConfirm: (data: {
    approvedPlanIds: string[];
    unapprovedComments: Record<string, string>;
    deadlineDate: string;
  }) => Promise<void> | void;
}

export function PlanBatchReviewModal({
  isOpen,
  onClose,
  selectedPlans,
  unselectedPlans,
  committeeDeadlineDate,
  setCommitteeDeadlineDate,
  onConfirm,
}: PlanBatchReviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comments for unselected plans (when partially approving)
  const [sharedComment, setSharedComment] = useState("");
  const [individualComments, setIndividualComments] = useState<
    Record<string, string>
  >({});
  const [useSharedComment, setUseSharedComment] = useState(true);

  if (!isOpen) return null;

  const isPartial = unselectedPlans.length > 0;

  const getCommentForPlan = (planId: string) => {
    if (useSharedComment) {
      return sharedComment.trim();
    }
    return (individualComments[planId] || "").trim();
  };

  const areRequiredCommentsProvided = () => {
    if (!isPartial) return true;
    if (useSharedComment) {
      return sharedComment.trim().length > 0;
    }
    return unselectedPlans.every(
      (p) => (individualComments[p.id] || "").trim().length > 0,
    );
  };

  const handleConfirm = async () => {
    setError(null);

    if (isPartial && !areRequiredCommentsProvided()) {
      setError(
        "Please provide revision comments for all unapproved plans before proceeding.",
      );
      return;
    }

    const unapprovedMap: Record<string, string> = {};
    if (isPartial) {
      unselectedPlans.forEach((p) => {
        unapprovedMap[p.id] =
          getCommentForPlan(p.id) || "Returned by Director for revisions.";
      });
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        approvedPlanIds: selectedPlans.map((p) => p.id),
        unapprovedComments: unapprovedMap,
        deadlineDate: committeeDeadlineDate,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to process decision. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-[#0A3C2F]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[#16253d] text-base">
                {isPartial
                  ? "Partial Plan Approval & Return Feedback"
                  : "Approve Selected Plans for Endorsement"}
              </h3>
              <p className="text-xs text-slate-500">
                {isPartial
                  ? "Approved plans continue to the Endorsement Committee; remaining plans will be returned with your comments."
                  : "All approved plans will continue to the Endorsement Committee."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-600 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Section 1: Approved Plans */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                  ✓
                </span>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                  Approved Plans ({selectedPlans.length}) — Proceed to Committee
                </h4>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Endorsement Committee
              </span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 divide-y divide-emerald-100">
              {selectedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-semibold text-slate-900 truncate">
                      {plan.planName}
                    </p>
                    <p className="font-mono text-[10px] text-slate-500">
                      {plan.reference || plan.id} • {plan.category} •{" "}
                      {plan.budgetYear}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                    {plan.activitiesCount || plan.activities?.length || 0}{" "}
                    activities
                  </span>
                </div>
              ))}
            </div>

            {/* Committee Deadline Input */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <Calendar className="h-4 w-4 text-[#0A3C2F]" />
                Committee Voting Deadline (Optional)
              </label>
              <input
                type="date"
                value={committeeDeadlineDate}
                onChange={(e) => setCommitteeDeadlineDate(e.target.value)}
                className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-[#0A3C2F]"
              />
              <p className="text-[11px] text-slate-500">
                Committee members will be notified to cast their endorsement
                vote by this deadline.
              </p>
            </div>
          </div>

          {/* Section 2: Unapproved / Returned Plans with Mandatory Feedback */}
          {isPartial && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[11px] font-bold">
                    !
                  </span>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-950">
                    Remaining Unapproved Plans ({unselectedPlans.length}) —
                    Return to Officer
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Feedback Required
                </span>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 divide-y divide-amber-100">
                {unselectedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-slate-900 truncate">
                        {plan.planName}
                      </p>
                      <p className="font-mono text-[10px] text-slate-500">
                        {plan.reference || plan.id} • {plan.category}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium text-amber-800 bg-white border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                      Will Return for Revision
                    </span>
                  </div>
                ))}
              </div>

              {/* Required Improvement Feedback */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                    <MessageSquare className="h-4 w-4 text-amber-700" />
                    Director Revision Instructions / What to Improve{" "}
                    <span className="text-rose-600 font-bold">*</span>
                  </label>
                  {unselectedPlans.length > 1 && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setUseSharedComment(true)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                          useSharedComment
                            ? "bg-[#0A3C2F] text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        Same feedback for all
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseSharedComment(false)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                          !useSharedComment
                            ? "bg-[#0A3C2F] text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        Individual feedback
                      </button>
                    </div>
                  )}
                </div>

                {useSharedComment || unselectedPlans.length === 1 ? (
                  <div>
                    <textarea
                      rows={3}
                      value={sharedComment}
                      onChange={(e) => setSharedComment(e.target.value)}
                      placeholder="Specify the revisions required by the Officer before approval (e.g. adjust activity budgets, refine procurement milestones, review scope)..."
                      className="w-full rounded-xl border border-amber-300 bg-white p-3 text-xs text-slate-800 outline-none focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F]"
                    />
                    <p className="text-[11px] text-amber-800 mt-1">
                      This feedback will be attached to each returned plan so
                      the Officer can edit and resubmit.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unselectedPlans.map((plan) => (
                      <div key={plan.id} className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 block">
                          Instructions for: {plan.planName}
                        </label>
                        <textarea
                          rows={2}
                          value={individualComments[plan.id] || ""}
                          onChange={(e) =>
                            setIndividualComments((prev) => ({
                              ...prev,
                              [plan.id]: e.target.value,
                            }))
                          }
                          placeholder={`Specify what to improve in ${plan.planName}...`}
                          className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-[#0A3C2F]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
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
            disabled={
              isSubmitting || (isPartial && !areRequiredCommentsProvided())
            }
            onClick={handleConfirm}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#0A3C2F] px-5 text-xs font-semibold text-white shadow-xs hover:bg-[#083025] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Processing Decisions...</span>
              </>
            ) : isPartial ? (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>
                  Approve {selectedPlans.length} &amp; Return{" "}
                  {unselectedPlans.length}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  Approve All {selectedPlans.length} Plans &amp; Forward
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
