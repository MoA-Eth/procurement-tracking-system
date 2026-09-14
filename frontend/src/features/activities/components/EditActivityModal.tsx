"use client";

import { useState } from "react";
import { X, Save, Edit3, DollarSign } from "lucide-react";
import type { ProcurementActivitySummary } from "@/features/projects/data/officerActivityDrafts";
import type { ProcurementPlanSummary } from "@/features/projects/data/officerProjects";
import {
  calculateFieldDiffs,
  ACTIVITY_FIELD_LABELS,
  recordPlanVersionEvent,
  getCurrentPlanVersionNumber,
} from "../../plans/data/planRevisions";
import {
  updateActivity,
  resolveProcurementMethodId,
} from "@/lib/activitiesApi";

interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: ProcurementActivitySummary;
  plan: ProcurementPlanSummary;
  projectCode: string;
  onActivityUpdated: (updated: ProcurementActivitySummary) => void;
  userRole?: string;
  userName?: string;
}

export function EditActivityModal({
  isOpen,
  onClose,
  activity,
  plan,
  projectCode,
  onActivityUpdated,
  userRole = "Procurement Officer",
  userName = "Procurement Officer",
}: EditActivityModalProps) {
  const [description, setDescription] = useState(activity.description || "");
  const [method, setMethod] = useState(activity.method || "RFB - National");
  const [estimatedAmount, setEstimatedAmount] = useState(
    String(activity.estimatedAmount || ""),
  );
  const [currency, setCurrency] = useState(
    activity.details?.form?.currency || plan.currency || "ETB",
  );
  const [fundingSource, setFundingSource] = useState(
    activity.details?.form?.fundingSource || "African Development Bank (AfDB)",
  );
  const [marketApproach, setMarketApproach] = useState(
    activity.details?.form?.marketApproach || "Open - National",
  );
  const [reviewType, setReviewType] = useState(
    activity.details?.form?.reviewType || "Prior",
  );
  const [contractType, setContractType] = useState(
    activity.details?.form?.contractType || "Lump-sum",
  );
  const [revisionReason, setRevisionReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!description.trim()) {
      setError("Activity description is required.");
      return;
    }
    const numAmount = Number(estimatedAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid estimated budget greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const beforeState = {
        description: activity.description,
        method: activity.method,
        estimatedAmount: `${Number(activity.estimatedAmount).toLocaleString()} ${currency}`,
        fundingSource: activity.details?.form?.fundingSource,
        marketApproach: activity.details?.form?.marketApproach,
        reviewType: activity.details?.form?.reviewType,
        contractType: activity.details?.form?.contractType,
      };

      const afterState = {
        description: description.trim(),
        method,
        estimatedAmount: `${numAmount.toLocaleString()} ${currency}`,
        fundingSource,
        marketApproach,
        reviewType,
        contractType,
      };

      const changes = calculateFieldDiffs(
        beforeState,
        afterState,
        ACTIVITY_FIELD_LABELS,
      );

      const currentVersion = getCurrentPlanVersionNumber(
        plan.reference || plan.id || "",
      );
      const nextVersion =
        plan.status === "Returned" ? currentVersion + 1 : currentVersion;

      // Record audit trail event
      recordPlanVersionEvent({
        planId: plan.id || plan.reference,
        planReference: plan.reference,
        projectCode,
        versionNumber: nextVersion,
        action: "ACTIVITY_REVISED",
        actionLabel: `Activity ${activity.reference} Revised`,
        changedBy: userName,
        changedByRole: userRole,
        activityReference: activity.reference,
        activityDescription: description.trim(),
        reason:
          revisionReason.trim() ||
          "Updated activity budget and specifications per revision feedback.",
        changes,
      });

      // Construct updated object
      const updatedActivity: ProcurementActivitySummary = {
        ...activity,
        description: description.trim(),
        method,
        estimatedAmount: numAmount,
        details: activity.details
          ? {
              ...activity.details,
              form: {
                ...activity.details.form,
                activityDescription: description.trim(),
                method,
                estimatedAmount: String(numAmount),
                currency: currency as any,
                fundingSource,
                marketApproach: marketApproach as any,
                reviewType: reviewType as any,
                contractType: contractType as any,
              },
            }
          : undefined,
      };

      // Async backend update if activity has DB ID
      try {
        if (activity.id && !activity.id.startsWith("act-")) {
          const resolvedMethodId = await resolveProcurementMethodId(method);
          await updateActivity(activity.id, {
            description: description.trim(),
            procurementMethodId: resolvedMethodId,
            estimatedBudget: numAmount,
            currency,
            marketApproach:
              marketApproach === "Open - International"
                ? "OPEN_INTERNATIONAL"
                : marketApproach === "Open - National"
                  ? "OPEN_NATIONAL"
                  : marketApproach === "Limited"
                    ? "LIMITED"
                    : "DIRECT",
            reviewType: reviewType === "Post" ? "POST" : "PRIOR",
            contractType:
              contractType === "Time-based" ? "TIME_BASED" : "LUMP_SUM",
          });
        }
      } catch (backendErr) {
        console.warn("Backend updateActivity note:", backendErr);
      }

      onActivityUpdated(updatedActivity);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update activity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
      role="dialog"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#176c55] text-white">
              <Edit3 className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Revise Procurement Activity
                </h3>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                  {activity.reference}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Update specifications, estimated costs, and document revision
                reasons
              </p>
            </div>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Activity Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-3 text-xs leading-5 text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estimated Budget <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 pl-8 text-xs text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15 font-semibold"
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(e.target.value)}
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">
                  {currency === "USD" ? "$" : "Br"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Currency
              </label>
              <select
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15 bg-white"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="ETB">ETB (Ethiopian Birr)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Procurement Method
              </label>
              <select
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15 bg-white"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="RFB - National">RFB - National</option>
                <option value="RFB - International">RFB - International</option>
                <option value="RFQ / Shopping">RFQ / Shopping</option>
                <option value="Direct Procurement">Direct Procurement</option>
                <option value="QCBS">QCBS</option>
                <option value="FBS">FBS</option>
                <option value="LCS">LCS</option>
                <option value="CQS">CQS</option>
                <option value="Individual Consultant">
                  Individual Consultant
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Funding Source
              </label>
              <input
                type="text"
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
                value={fundingSource}
                onChange={(e) => setFundingSource(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Market Approach
              </label>
              <select
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15 bg-white"
                value={marketApproach}
                onChange={(e) => setMarketApproach(e.target.value)}
              >
                <option value="Open - National">Open - National</option>
                <option value="Open - International">
                  Open - International
                </option>
                <option value="Limited">Limited</option>
                <option value="Direct">Direct</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Review Type
              </label>
              <select
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15 bg-white"
                value={reviewType}
                onChange={(e) => setReviewType(e.target.value)}
              >
                <option value="Prior">Prior Review</option>
                <option value="Post">Post Review</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contract Type
              </label>
              <select
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15 bg-white"
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
              >
                <option value="Lump-sum">Lump-sum</option>
                <option value="Time-based">Time-based</option>
              </select>
            </div>
          </div>

          {/* Revision Reason / Justification */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 space-y-2">
            <label className="block text-xs font-bold text-amber-950">
              Revision Reason / Comment (Recorded in Audit Trail){" "}
              <span className="text-amber-700 font-normal">
                e.g. &quot;Updated market estimate&quot;
              </span>
            </label>
            <input
              type="text"
              className="w-full h-9 rounded-lg border border-amber-300 bg-white px-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
              placeholder="e.g., Updated market estimate, adjusted scope per Director request..."
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#176c55] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#125f4c] transition cursor-pointer disabled:opacity-50"
            disabled={saving}
            onClick={handleSave}
            type="button"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Revision"}
          </button>
        </div>
      </div>
    </div>
  );
}
