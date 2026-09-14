"use client";

import { useState } from "react";
import { X, Save, Edit3, Calendar } from "lucide-react";
import type { ProcurementPlanSummary } from "@/features/projects/data/officerProjects";
import {
  calculateFieldDiffs,
  PLAN_FIELD_LABELS,
  recordPlanVersionEvent,
  getCurrentPlanVersionNumber,
} from "../data/planRevisions";
import { DualCalendarField } from "@/features/projects/components/DualCalendarField";
import {
  gregorianToEthiopian,
  formatEthiopianDate,
} from "@/features/projects/utils/ethiopianCalendar";

interface EditPlanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ProcurementPlanSummary;
  projectCode: string;
  onPlanUpdated: (updatedPlan: ProcurementPlanSummary) => void;
  userRole?: string;
  userName?: string;
}

export function EditPlanDetailsModal({
  isOpen,
  onClose,
  plan,
  projectCode,
  onPlanUpdated,
  userRole = "Procurement Officer",
  userName = "Procurement Officer",
}: EditPlanDetailsModalProps) {
  const [name, setName] = useState(plan.name || "");
  const [budgetYear, setBudgetYear] = useState(plan.budgetYear || "2017 EFY");
  const [periodFrom, setPeriodFrom] = useState(
    plan.planPeriod?.from?.gregorian || "2025-07-08",
  );
  const [periodFromEthiopian, setPeriodFromEthiopian] = useState(
    plan.planPeriod?.from?.ethiopian ||
      (plan.planPeriod?.from?.gregorian &&
      gregorianToEthiopian(plan.planPeriod.from.gregorian)
        ? formatEthiopianDate(
            gregorianToEthiopian(plan.planPeriod.from.gregorian)!,
          )
        : ""),
  );
  const [periodTo, setPeriodTo] = useState(
    plan.planPeriod?.to?.gregorian || "2026-07-07",
  );
  const [periodToEthiopian, setPeriodToEthiopian] = useState(
    plan.planPeriod?.to?.ethiopian ||
      (plan.planPeriod?.to?.gregorian &&
      gregorianToEthiopian(plan.planPeriod.to.gregorian)
        ? formatEthiopianDate(
            gregorianToEthiopian(plan.planPeriod.to.gregorian)!,
          )
        : ""),
  );
  const [organizationRegion, setOrganizationRegion] = useState(
    plan.organizationRegion || "Federal / FPCU",
  );
  const [description, setDescription] = useState(plan.description || "");
  const [revisionReason, setRevisionReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      setError("Plan Name is required.");
      return;
    }
    if (new Date(periodTo) <= new Date(periodFrom)) {
      setError("Coverage end date must be after start date.");
      return;
    }

    const beforeState = {
      name: plan.name,
      budgetYear: plan.budgetYear,
      periodFrom: plan.planPeriod?.from?.gregorian,
      periodTo: plan.planPeriod?.to?.gregorian,
      organizationRegion: plan.organizationRegion,
      description: plan.description,
    };

    const afterState = {
      name: name.trim(),
      budgetYear: budgetYear.trim(),
      periodFrom,
      periodTo,
      organizationRegion: organizationRegion.trim(),
      description: description.trim(),
    };

    const changes = calculateFieldDiffs(
      beforeState,
      afterState,
      PLAN_FIELD_LABELS,
    );

    const currentVersion = getCurrentPlanVersionNumber(
      plan.reference || plan.id || "",
    );
    const nextVersion =
      plan.status === "Returned" ? currentVersion + 1 : currentVersion;

    // Record audit revision
    if (changes.length > 0 || revisionReason.trim()) {
      recordPlanVersionEvent({
        planId: plan.id || plan.reference,
        planReference: plan.reference,
        projectCode,
        versionNumber: nextVersion,
        action: "PLAN_REVISED",
        actionLabel: "Plan Information Revised",
        changedBy: userName,
        changedByRole: userRole,
        reason:
          revisionReason.trim() ||
          "Updated plan details and schedule parameters.",
        changes,
      });
    }

    const updatedPlan: ProcurementPlanSummary = {
      ...plan,
      name: name.trim(),
      budgetYear: budgetYear.trim(),
      organizationRegion: organizationRegion.trim(),
      description: description.trim(),
      planPeriod: {
        from: {
          ethiopian: periodFromEthiopian || "01 Hamle 2017",
          gregorian: periodFrom,
        },
        to: {
          ethiopian: periodToEthiopian || "30 Sene 2018",
          gregorian: periodTo,
        },
      },
    };

    onPlanUpdated(updatedPlan);
    onClose();
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
              <h3 className="text-sm font-bold text-slate-900">
                Edit Plan Details
              </h3>
              <p className="text-xs text-slate-500">
                Modify plan metadata and record revision rationale
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
              Plan Title / Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Budget Year
              </label>
              <input
                type="text"
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
                value={budgetYear}
                onChange={(e) => setBudgetYear(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Organization / Region
              </label>
              <input
                type="text"
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
                value={organizationRegion}
                onChange={(e) => setOrganizationRegion(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DualCalendarField
              id="edit-plan-period-from"
              label="Period From"
              gregorianValue={periodFrom}
              ethiopianValue={periodFromEthiopian}
              onChange={(greg, eth) => {
                setPeriodFrom(greg);
                setPeriodFromEthiopian(eth);
              }}
              required={true}
            />

            <DualCalendarField
              id="edit-plan-period-to"
              label="Period To"
              gregorianValue={periodTo}
              ethiopianValue={periodToEthiopian}
              onChange={(greg, eth) => {
                setPeriodTo(greg);
                setPeriodToEthiopian(eth);
              }}
              required={true}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description / Objectives
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-3 text-xs leading-5 text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Revision Reason / Justification */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 space-y-2">
            <label className="block text-xs font-bold text-amber-950">
              Revision Reason / Justification for Audit Trail
            </label>
            <input
              type="text"
              className="w-full h-9 rounded-lg border border-amber-300 bg-white px-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
              placeholder="e.g., Updated budget year and adjusted coverage schedule per Director feedback..."
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#176c55] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#125f4c] transition cursor-pointer"
            onClick={handleSave}
            type="button"
          >
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
