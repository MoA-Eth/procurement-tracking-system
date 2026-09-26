"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  PlusCircle,
  AlertCircle,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";
import type { ProcurementPlanSummary } from "@/features/projects/data/officerProjects";
import type { ProcurementActivitySummary } from "@/features/projects/data/officerActivityDrafts";
import {
  fetchLookups,
  getInitialLookups,
  subscribeToLookups,
} from "@/lib/lookupsApi";

interface CreateAdditionalPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentPlan: ProcurementPlanSummary;
  projectCode: string;
  projectName?: string;
  assignedOfficerName?: string;
  onSubmit: (additionalPlanData: {
    planName: string;
    parentPlanId?: string;
    parentPlanReference: string;
    parentPlanName: string;
    additionalPlanReason: string;
    newActivity: Partial<ProcurementActivitySummary>;
  }) => Promise<void> | void;
}

const DEFAULT_PROCUREMENT_METHODS = [
  "RFB - National",
  "RFB - International",
  "RFQ - Shopping",
  "Direct Selection",
  "QCBS - Quality and Cost Based",
  "CQS - Consultant Qualification",
  "Individual Consultant Selection",
  "Framework Agreement",
];

export function CreateAdditionalPlanModal({
  isOpen,
  onClose,
  parentPlan,
  projectCode,
  projectName,
  assignedOfficerName,
  onSubmit,
}: CreateAdditionalPlanModalProps) {
  const [justification, setJustification] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [methodOptions, setMethodOptions] = useState<string[]>(() => {
    const list = getInitialLookups("PROCUREMENT_METHOD");
    if (list && list.length > 0) {
      return Array.from(
        new Set([...list.map((m) => m.label), ...DEFAULT_PROCUREMENT_METHODS]),
      );
    }
    return DEFAULT_PROCUREMENT_METHODS;
  });
  const [method, setMethod] = useState(
    () => methodOptions[0] || DEFAULT_PROCUREMENT_METHODS[0],
  );

  useEffect(() => {
    let isMounted = true;
    async function loadMethods() {
      try {
        const list = await fetchLookups("PROCUREMENT_METHOD");
        if (isMounted && Array.isArray(list) && list.length > 0) {
          const labels = list.map((m) => m.label);
          setMethodOptions(
            Array.from(new Set([...labels, ...DEFAULT_PROCUREMENT_METHODS])),
          );
        }
      } catch {
        // Fallback
      }
    }
    loadMethods();

    const unsub = subscribeToLookups(loadMethods);
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const defaultPlanName = `[Additional] ${parentPlan.name || parentPlan.reference} - Supplementary`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedJustification = justification.trim();
    if (!trimmedJustification || trimmedJustification.length < 10) {
      setErrorMsg(
        "Please provide a thorough justification (at least 10 characters) explaining why this activity was not included with the original procurement plan.",
      );
      return;
    }

    const trimmedDesc = activityDescription.trim();
    if (!trimmedDesc) {
      setErrorMsg("Please provide a description for the new activity.");
      return;
    }

    const budgetNum = parseFloat(estimatedBudget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      setErrorMsg("Please enter a valid estimated budget greater than 0.");
      return;
    }

    try {
      setIsSubmitting(true);
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const activityRef = `${projectCode}-${parentPlan.category.substring(0, 2).toUpperCase()}-ADD-${randomSuffix}`;

      const newActivity: Partial<ProcurementActivitySummary> &
        Record<string, any> = {
        reference: activityRef,
        description: trimmedDesc,
        category: parentPlan.category,
        method: method,
        estimatedAmount: budgetNum,
        currency: parentPlan.currency || "ETB",
        currentStage: "Planned",
        status: "Draft",
        remarks: remarks.trim() || undefined,
        createdByName: assignedOfficerName || "Procurement Officer",
        updatedByName: assignedOfficerName || "Procurement Officer",
        contractMilestones: targetDate
          ? {
              bidOpeningDate: targetDate,
              awardDate: targetDate,
            }
          : undefined,
      };

      await onSubmit({
        planName: defaultPlanName,
        parentPlanId: parentPlan.id,
        parentPlanReference: parentPlan.reference,
        parentPlanName: parentPlan.name,
        additionalPlanReason: trimmedJustification,
        newActivity,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create additional plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-900 via-teal-900 to-[#0A3C2F] px-6 py-5 text-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200 border border-emerald-300/30">
                <Sparkles className="h-3 w-3 text-emerald-300" />
                Supplementary Submission
              </span>
              <span className="text-xs text-emerald-200/80 font-mono">
                {parentPlan.reference}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white tracking-tight">
              Create Additional Procurement Plan &amp; Activity
            </h2>
            <p className="text-xs text-emerald-100/80">
              Submit an additional procurement activity for this approved plan
              along with mandatory justification.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-emerald-200 hover:bg-white/10 hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Parent Plan Summary Card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-700" />
                Approved Parent Plan:
              </span>
              <span className="rounded bg-emerald-200/80 px-2 py-0.5 font-semibold text-emerald-900 text-[10px]">
                {parentPlan.status}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {parentPlan.name}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
              <span>
                Project:{" "}
                <strong className="text-slate-800">{projectCode}</strong>
              </span>
              <span>•</span>
              <span>
                Category:{" "}
                <strong className="text-slate-800">
                  {parentPlan.category}
                </strong>
              </span>
              <span>•</span>
              <span>
                Fiscal Year:{" "}
                <strong className="text-slate-800">
                  {parentPlan.budgetYear}
                </strong>
              </span>
            </div>
          </div>

          {/* Justification Field (Mandatory) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="additional-plan-justification"
                className="block text-xs font-semibold text-slate-900"
              >
                Justification: Why was this activity not submitted with the
                original plan? <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Visible to Director &amp; Committee
              </span>
            </div>
            <textarea
              id="additional-plan-justification"
              required
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain the operational necessity or reason why this item was not included in the original annual procurement plan (e.g. newly allocated contingency funds, urgent institutional expansion, unforeseen project requirements)..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
            />
            <p className="text-[11px] text-slate-500">
              This explanation will be prominently displayed on the Director and
              Endorsement Committee review boards.
            </p>
          </div>

          {/* New Activity Inputs */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3.5">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <PlusCircle className="h-3.5 w-3.5 text-emerald-700" />
              Additional Procurement Activity Details
            </h3>

            {/* Description */}
            <div className="space-y-1">
              <label
                htmlFor="activity-description"
                className="block text-xs font-semibold text-slate-700"
              >
                Activity Description <span className="text-rose-600">*</span>
              </label>
              <input
                id="activity-description"
                type="text"
                required
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder="e.g. Procurement of 4WD field inspection vehicles and maintenance kits"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>

            {/* Method and Budget Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="procurement-method"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Procurement Method
                </label>
                <select
                  id="procurement-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
                >
                  {methodOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="estimated-budget"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Estimated Budget ({parentPlan.currency || "ETB"}){" "}
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  id="estimated-budget"
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={estimatedBudget}
                  onChange={(e) => setEstimatedBudget(e.target.value)}
                  placeholder="e.g. 2500000"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
            </div>

            {/* Target Roadmap Date */}
            <div className="space-y-1">
              <label
                htmlFor="target-date"
                className="block text-xs font-semibold text-slate-700"
              >
                Target Completion / Award Date
              </label>
              <input
                id="target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>

            {/* Remarks / Clarification */}
            <div className="space-y-1">
              <label
                htmlFor="activity-remarks"
                className="block text-xs font-semibold text-slate-700"
              >
                Technical Clarifications / Remarks (Optional)
              </label>
              <input
                id="activity-remarks"
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Fast-track bidding documents will be prepared within 14 days"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A3C2F] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#072F25] focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {isSubmitting ? (
                <span>Submitting Additional Plan...</span>
              ) : (
                <>
                  <span>Submit Additional Plan to Director</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
