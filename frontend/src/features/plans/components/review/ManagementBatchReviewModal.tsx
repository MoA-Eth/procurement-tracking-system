"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileCheck,
  FileText,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import type { ProcurementPlan } from "../../plansData";

export interface ManagementBatchReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "APPROVE" | "REJECT";
  plans: ProcurementPlan[];
  projectCode: string;
  onConfirm: (data: {
    decision: "APPROVE" | "REJECT";
    plans: ProcurementPlan[];
    minuteReference?: string;
    remarks?: string;
  }) => Promise<void> | void;
}

function getPlanActivitiesCount(p: ProcurementPlan): number {
  return Math.max(
    p.activitiesCount || 0,
    (p.activities?.length || 0) + ((p as any).parentActivities?.length || 0),
    p.activities?.length || 0,
  );
}

export function ManagementBatchReviewModal({
  isOpen,
  onClose,
  mode,
  plans,
  projectCode,
  onConfirm,
}: ManagementBatchReviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minuteReference, setMinuteReference] = useState("");
  const [remarks, setRemarks] = useState("");

  // Set of included plans for return mode
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(
    () => new Set(plans.map((p) => p.id)),
  );

  // Sync selectedPlanIds when plans change
  const activePlans = useMemo(() => {
    if (mode === "APPROVE") return plans;
    return plans.filter((p) => selectedPlanIds.has(p.id));
  }, [plans, mode, selectedPlanIds]);

  // Aggregate totals
  const totalBudget = useMemo(() => {
    return plans.reduce((acc, p) => {
      const val = Number(p.estimatedValue || p.estimatedTotal) || 0;
      return acc + val;
    }, 0);
  }, [plans]);

  const totalActivities = useMemo(() => {
    return plans.reduce((acc, p) => {
      const count = getPlanActivitiesCount(p);
      return acc + count;
    }, 0);
  }, [plans]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    plans.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [plans]);

  if (!isOpen) return null;

  const handleTogglePlan = (planId: string) => {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setError(null);

    if (mode === "REJECT") {
      if (activePlans.length === 0) {
        setError("Please select at least one plan to return.");
        return;
      }
      if (!remarks.trim()) {
        setError(
          "Executive Directives / Remarks are required when returning plans for revision.",
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        decision: mode,
        plans: activePlans,
        minuteReference: minuteReference.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to submit executive decision. Please try again.",
      );
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
                <ShieldCheck className="h-5 w-5 text-[#A3E635]" />
              ) : (
                <RotateCcw className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {mode === "APPROVE"
                  ? `Executive Management — Batch Authorization (${plans.length} Plans)`
                  : `Executive Management — Return Plans for Revision (${activePlans.length} Plans)`}
              </h3>
              <p className="text-xs text-slate-500">
                Project:{" "}
                <strong className="text-slate-800">{projectCode}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {mode === "APPROVE" ? (
            <div className="space-y-4">
              {/* Executive Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                  <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">
                    Total Authorization
                  </span>
                  <span className="text-sm sm:text-base font-bold text-[#0A3C2F] mt-1 block">
                    {totalBudget > 0
                      ? `ETB ${totalBudget.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : "—"}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                  <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">
                    Procurement Plans
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-800 mt-1 block">
                    {plans.length} Packages
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                  <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">
                    Total Activities
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-800 mt-1 block">
                    {totalActivities} Activities
                  </span>
                </div>
              </div>

              {/* Committee Verification Badge */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-start gap-3">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <p className="font-semibold text-emerald-950">
                    Committee Quorum & Vetting Complete
                  </p>
                  <p className="mt-0.5 text-emerald-800">
                    All {plans.length} selected procurement plans have passed
                    Director approval and received full Endorsement Committee
                    quorum. Granting Executive Authorization will transition
                    these plans to{" "}
                    <strong className="font-semibold">APPROVED</strong> status,
                    unlocking the live Activity Tracker, Roadmap, and Contract
                    award pipelines.
                  </p>
                </div>
              </div>

              {/* Plans Overview List */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Packages to be Authorized:
                </label>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden max-h-48 overflow-y-auto">
                  {plans.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="font-semibold text-slate-800 truncate">
                          {p.planName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">
                            {p.reference || p.id}
                          </span>
                          <span>•</span>
                          <span>{p.category}</span>
                          <span>•</span>
                          <span>
                            {getPlanActivitiesCount(p)} Activities
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-medium text-slate-700">
                        {p.estimatedValue || p.estimatedTotal
                          ? `ETB ${Number(
                              p.estimatedValue || p.estimatedTotal,
                            ).toLocaleString()}`
                          : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Minute Reference */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Executive / Board Minute Reference Number{" "}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={minuteReference}
                  onChange={(e) => setMinuteReference(e.target.value)}
                  placeholder="e.g. BD-MIN/2026/044 or EXEC-RES-012"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] outline-none"
                />
              </div>

              {/* Executive Directives */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Executive Directives / Implementation Remarks{" "}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional executive directives, implementation notes, or conditions..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Return Warning Banner */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 flex items-start gap-3">
                <RotateCcw className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 leading-relaxed">
                  <p className="font-semibold text-rose-950">
                    Return Plans for Restructuring / Revision
                  </p>
                  <p className="mt-0.5 text-rose-800">
                    You are returning the selected plans to the Director and
                    Procurement Officers. Please specify the strategic, fiscal,
                    or policy reasons for return.
                  </p>
                </div>
              </div>

              {/* Plans Inclusion Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Plans to Return ({activePlans.length} of {plans.length}{" "}
                  selected):
                </label>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden max-h-52 overflow-y-auto">
                  {plans.map((p) => {
                    const isChecked = selectedPlanIds.has(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-3 text-xs cursor-pointer hover:bg-slate-50 transition ${
                          isChecked ? "bg-rose-50/20" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePlan(p.id)}
                            className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 block truncate">
                              {p.planName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {p.reference || p.id} • {p.category} (
                              {getPlanActivitiesCount(p)} Activities)
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Executive Return Directive */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-900">
                  Executive Directives / Strategic Rejection Remarks *
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Detail the strategic reasons for return and directives for the Director and Officers..."
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
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isSubmitting || (mode === "REJECT" && activePlans.length === 0)
            }
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-5 text-xs font-semibold text-white shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === "APPROVE"
                ? "bg-[#0A3C2F] hover:bg-[#083025]"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {mode === "APPROVE" ? (
              <>
                <FileCheck className="h-4 w-4" />
                <span>
                  {isSubmitting
                    ? "Granting Authorization..."
                    : `Grant Executive Authorization (${plans.length} Plans)`}
                </span>
              </>
            ) : (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>
                  {isSubmitting
                    ? "Returning Plans..."
                    : `Return Selected Plans (${activePlans.length})`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
