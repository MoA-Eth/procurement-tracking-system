"use client";

import { useEffect } from "react";
import {
  CheckCircle2,
  RotateCcw,
  Send,
  ListChecks,
  ArrowLeft,
  ChevronRight,
  Home,
  ShieldCheck,
  Edit,
  History,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { type ProcurementPlan, parseRejectionDetails } from "../../plansData";
import { getCurrentPlanVersionNumber } from "../../data/planRevisions";
import type {
  ProcurementActivity,
  ActivityStage,
} from "../../../activities/activitiesData";
import { ActivityQuickEditModal } from "./ActivityQuickEditModal";
import { CommitteeRejectionModal } from "../CommitteeRejectionModal";

export interface PlanFullScreenReviewViewProps {
  plan: ProcurementPlan;
  userRole?: string;
  toastMessage: string | null;
  onBackClick: () => void;
  onOpenActivitiesPlan: (plan: ProcurementPlan) => void;
  onOpenHistoryModal: (plan: ProcurementPlan) => void;
  onUpdatePlanName: (newName: string) => void;
  reviewActivities: ProcurementActivity[];
  isSaving: boolean;
  showSavedFeedback: boolean;
  selectedActivityRef?: string;
  editingActivity: ProcurementActivity | null;
  setEditingActivity: (act: ProcurementActivity | null) => void;
  onSaveActivity: (id: string, updates: Partial<ProcurementActivity>) => void;
  committeeDeadlineDate: string;
  setCommitteeDeadlineDate: (date: string) => void;
  returnRemarks: string;
  setReturnRemarks: (remarks: string) => void;
  onApprovePlan: (plan: ProcurementPlan, deadline?: string) => void;
  onReturnPlan: (plan: ProcurementPlan, remarks?: string) => void;
  onCommitteeVote: (
    plan: ProcurementPlan,
    decision: "APPROVE" | "REJECT",
    remarks?: string,
    rejectionDetails?: any,
  ) => void;
  isCommitteeRejectionModalOpen: boolean;
  setIsCommitteeRejectionModalOpen: (open: boolean) => void;
}

export function PlanFullScreenReviewView({
  plan,
  userRole,
  toastMessage,
  onBackClick,
  onOpenActivitiesPlan,
  onOpenHistoryModal,
  onUpdatePlanName,
  reviewActivities,
  isSaving,
  showSavedFeedback,
  selectedActivityRef,
  editingActivity,
  setEditingActivity,
  onSaveActivity,
  committeeDeadlineDate,
  setCommitteeDeadlineDate,
  returnRemarks,
  setReturnRemarks,
  onApprovePlan,
  onReturnPlan,
  onCommitteeVote,
  isCommitteeRejectionModalOpen,
  setIsCommitteeRejectionModalOpen,
}: PlanFullScreenReviewViewProps) {
  // Auto-scroll to selected target activity if supplied
  useEffect(() => {
    if (selectedActivityRef && reviewActivities.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(
          `review-activity-row-${selectedActivityRef}`,
        );
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
    }
  }, [selectedActivityRef, reviewActivities]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl border border-slate-700 animate-in slide-in-from-top-3 max-w-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-medium leading-relaxed">{toastMessage}</p>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <button
          onClick={onBackClick}
          className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          Plan for Review
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-bold text-[#0A3C2F]">
          Review: {plan.planName}
        </span>
      </nav>

      {/* Full Screen Header Banner */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-70">
            <div className="flex items-center gap-2">
              <button
                onClick={onBackClick}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0A3C2F] hover:underline cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Plans List
              </button>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-xs font-extrabold text-[#0A3C2F] bg-white px-2 py-0.5 rounded border border-emerald-200">
                {plan.projectCode}
              </span>
            </div>

            {/* Plan Name */}
            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold text-[#0A3C2F] uppercase tracking-wider">
                Plan Title
              </label>
              {userRole === "ENDORSING_COMMITTEE" ? (
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 tracking-tight pt-0.5">
                  {plan.planName}
                </h2>
              ) : (
                <input
                  type="text"
                  value={plan.planName}
                  onChange={(e) => onUpdatePlanName(e.target.value)}
                  className="w-full text-lg sm:text-xl font-extrabold text-slate-950 tracking-tight rounded-xl border border-emerald-300 bg-white px-3.5 py-1.5 focus:border-[#0A3C2F] outline-none"
                />
              )}
            </div>

            {/* Locked Structural Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1">
                Category:{" "}
                <strong className="text-slate-900">{plan.category}</strong>
              </span>
              <span>•</span>
              <span>
                Fiscal Year:{" "}
                <strong className="text-slate-900">{plan.budgetYear}</strong>
              </span>
              <span>•</span>
              <span>
                Region:{" "}
                <strong className="text-slate-900">
                  {plan.organizationRegion}
                </strong>
              </span>
              <span>•</span>
              <span>
                Coverage:{" "}
                <strong className="text-slate-900">
                  {plan.planPeriodFrom} to {plan.planPeriodTo}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[#0A3C2F] hover:bg-[#edf5f1] hover:text-[#0A3C2F] transition cursor-pointer"
              onClick={() => onOpenHistoryModal(plan)}
              type="button"
            >
              <History className="h-3.5 w-3.5 text-[#0A3C2F]" />
              Version History (v{getCurrentPlanVersionNumber(plan.id)})
            </button>
            <span className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              {plan.status}
            </span>
          </div>
        </div>
      </section>

      {/* Rejection Alert Banner */}
      {(() => {
        const parsed = parseRejectionDetails(plan.rejectionReason);
        if (parsed.scope === "SPECIFIC") {
          return (
            <section className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50/40 p-4 shadow-2xs space-y-2.5 animate-in fade-in">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-lg bg-amber-100 border border-amber-200 shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                      Committee Objection: Specific Activities Flagged (
                      {parsed.rejectedActivityRefs.length} item
                      {parsed.rejectedActivityRefs.length > 1 ? "s" : ""})
                    </h3>
                    <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
                      The Endorsement Committee returned this plan due to
                      objections on specific activities. Per regulations, the
                      entire plan package is on hold until these specific
                      activities are revised.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-200/70 text-amber-900 border border-amber-300 shrink-0">
                  Specific Activity Rejection
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 text-xs">
                <span className="font-bold text-amber-950 text-[11px]">
                  Flagged Activities:
                </span>
                {parsed.rejectedActivityRefs.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(
                        `review-activity-row-${ref}`,
                      );
                      if (el) {
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 font-mono font-bold text-rose-900 bg-rose-100 hover:bg-rose-200 border border-rose-300 hover:border-rose-400 px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer shadow-2xs group"
                    title={`Click to jump to activity ${ref}`}
                  >
                    <AlertCircle className="h-3 w-3 text-rose-600" />
                    <span>{ref}</span>
                    <span className="font-sans text-[10px] text-rose-700 group-hover:underline">
                      ↓ Jump to Activity
                    </span>
                  </button>
                ))}
              </div>

              {parsed.cleanRemarks && (
                <div className="text-xs bg-white/90 rounded-lg p-3 border border-amber-200/80 shadow-2xs text-amber-950">
                  <span className="font-bold text-slate-800">
                    Committee Feedback &amp; Deliberation Notes:{" "}
                  </span>
                  <span className="italic text-slate-700 font-medium">
                    &ldquo;{parsed.cleanRemarks}&rdquo;
                  </span>
                </div>
              )}
            </section>
          );
        }
        if (
          (plan.status === "Returned" || plan.rejectionReason) &&
          parsed.cleanRemarks
        ) {
          return (
            <section className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 shadow-2xs space-y-2 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-rose-100 border border-rose-200 shrink-0">
                    <RotateCcw className="h-4 w-4 text-rose-700" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-rose-950 uppercase tracking-wider">
                      Plan Returned: Common / Entire Plan Package Rejection
                    </h3>
                    <p className="text-xs text-rose-900/90 mt-0.5">
                      The Endorsement Committee returned the entire procurement
                      plan package for general revisions across all activities.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                  General Rejection (All Activities)
                </span>
              </div>

              {parsed.cleanRemarks && (
                <div className="text-xs bg-white/90 rounded-lg p-3 border border-rose-200/80 shadow-2xs text-rose-950">
                  <span className="font-bold text-slate-800">
                    Revision Notes:{" "}
                  </span>
                  <span className="italic text-slate-700 font-medium">
                    &ldquo;{parsed.cleanRemarks}&rdquo;
                  </span>
                </div>
              )}
            </section>
          );
        }
        return null;
      })()}

      {/* Main Review Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-6">
        {/* Plan Justification Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-900">
              Procurement Plan Justification &amp; Directorate Notes
            </label>
            {userRole !== "ENDORSING_COMMITTEE" && (
              <span className="text-[11px] text-slate-400">
                Auto-saved as Director edits
              </span>
            )}
          </div>
          {userRole === "ENDORSING_COMMITTEE" ? (
            <div className="w-full text-xs text-slate-800 leading-relaxed rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 italic">
              &quot;
              {plan.description ||
                "No directorate justification notes provided for this plan."}
              &quot;
            </div>
          ) : (
            <textarea
              rows={3}
              value={plan.description || ""}
              readOnly
              placeholder="Add justification notes or instructions for the procurement plan..."
              className="w-full text-xs text-slate-800 leading-relaxed rounded-xl border border-slate-300 bg-white p-3.5 focus:border-[#0A3C2F] focus:ring-2 focus:ring-[#0A3C2F]/10 outline-none transition-all"
            />
          )}
        </div>

        {/* In-Place Package Activities Directory */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  Package Activities Directory
                </h4>
                <span className="text-xs font-semibold text-slate-500">
                  ({reviewActivities.length} Items)
                </span>

                {showSavedFeedback && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 ml-1 transition-all">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{isSaving ? "Saving..." : "Auto-saved"}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Direct inline editing for activity description, clarifications,
                or technical notes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenActivitiesPlan(plan)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <ListChecks className="h-4 w-4 text-[#A3E635]" />
              <span>Inspect Package Activities</span>
            </button>
          </div>

          {/* Clean View-First Package Activities Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-[840px]">
              <thead className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5 w-8 text-center">#</th>
                  <th className="py-3 px-3.5 min-w-[170px] w-44">
                    Ref No &amp; Method
                  </th>
                  <th className="py-3 px-3.5 min-w-[240px]">
                    Activity Description
                  </th>
                  <th className="py-3 px-3.5 min-w-[150px]">
                    Target Date (Roadmap)
                  </th>
                  <th className="py-3 px-3.5 min-w-[150px]">Clarifications</th>
                  <th className="py-3 px-3.5 min-w-[150px]">Technical Notes</th>
                  <th className="py-3 px-3.5 text-center min-w-[90px]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {reviewActivities.length > 0 ? (
                  reviewActivities.map((act, idx) => {
                    const currentTargetDate =
                      act.roadmap.find(
                        (s: ActivityStage) =>
                          s.revisedTargetDate || s.originalPlannedDate,
                      )?.revisedTargetDate ||
                      act.roadmap[0]?.originalPlannedDate ||
                      "N/A";

                    const isTargeted =
                      selectedActivityRef &&
                      (act.activityRefNo?.toLowerCase().trim() ===
                        selectedActivityRef.toLowerCase().trim() ||
                        act.id.toLowerCase().trim() ===
                          selectedActivityRef.toLowerCase().trim());

                    return (
                      <tr
                        key={act.id}
                        id={`review-activity-row-${act.activityRefNo}`}
                        onClick={() => setEditingActivity(act)}
                        className={`transition-all duration-300 cursor-pointer group ${
                          isTargeted
                            ? "bg-rose-100/90 ring-3 ring-rose-500 shadow-md"
                            : "hover:bg-emerald-50/40"
                        }`}
                      >
                        <td className="py-3.5 px-3.5 text-center font-bold text-slate-400 align-top pt-4">
                          {idx + 1}
                        </td>

                        {/* Ref No & Method */}
                        <td className="py-3.5 px-3.5 align-top space-y-1.5 pt-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-extrabold text-[#0A3C2F] text-[11px] whitespace-nowrap block group-hover:text-emerald-800">
                              {act.activityRefNo}
                            </span>
                            {isTargeted && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                                Targeted Activity
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="font-bold text-slate-700 whitespace-nowrap">
                              {act.method}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-extrabold text-amber-800 whitespace-nowrap">
                              {act.reviewType}
                            </span>
                          </div>
                        </td>

                        {/* Activity Description */}
                        <td className="py-3.5 px-3.5 align-top">
                          <p className="font-medium text-slate-900 text-xs leading-relaxed">
                            {act.description}
                          </p>
                        </td>

                        {/* Target Date */}
                        <td className="py-3.5 px-3.5 align-top whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-800 text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg inline-block">
                            {currentTargetDate}
                          </span>
                        </td>

                        {/* Clarifications */}
                        <td className="py-3.5 px-3.5 align-top">
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {act.remarks || (
                              <span className="text-slate-400 italic">
                                None
                              </span>
                            )}
                          </p>
                        </td>

                        {/* Technical Notes */}
                        <td className="py-3.5 px-3.5 align-top">
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {act.additionalRemarks || (
                              <span className="text-slate-400 italic">
                                None
                              </span>
                            )}
                          </p>
                        </td>

                        {/* Action Cell */}
                        <td className="py-3.5 px-3.5 text-center align-top pt-3.5">
                          {userRole === "ENDORSING_COMMITTEE" ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold text-slate-500 bg-slate-100">
                              View Only
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingActivity(act);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-[#0A3C2F] border border-emerald-200 hover:bg-[#0A3C2F] hover:text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-4 text-center text-xs text-slate-500 italic"
                    >
                      No package activities found under this plan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Decision & Workflow Actions Card */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck className="h-5 w-5 text-[#0A3C2F]" />
          <h3 className="text-sm font-bold text-slate-900">
            {userRole === "ENDORSING_COMMITTEE"
              ? "Endorsement Committee Decision & Voting"
              : "Director Decision & Workflow Actions"}
          </h3>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            {userRole === "ENDORSING_COMMITTEE" ? (
              <>
                Committee Feedback / Deliberation Notes
                <span className="ml-1 text-rose-500 text-[10px] font-semibold">
                  (Required to reject)
                </span>
              </>
            ) : (
              <>
                Revision Notes
                <span className="ml-1 text-rose-500 text-[10px] font-semibold">
                  (Required to return to Officer)
                </span>
              </>
            )}
          </label>
          <textarea
            rows={3}
            value={returnRemarks}
            onChange={(e) => setReturnRemarks(e.target.value)}
            placeholder={
              userRole === "ENDORSING_COMMITTEE"
                ? "Enter your voting remarks or rejection reason (visible to Director)..."
                : "Specify required corrections, missing documents or revision notes for the Procurement Officer..."
            }
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#0A3C2F]"
          />
          {userRole === "ENDORSING_COMMITTEE" && !returnRemarks.trim() && (
            <p className="text-[10px] text-slate-400 font-medium">
              A comment is required before rejecting a plan.
            </p>
          )}
          {userRole !== "ENDORSING_COMMITTEE" && !returnRemarks.trim() && (
            <p className="text-[10px] text-slate-400 font-medium">
              Revision notes are required before returning a plan to the
              Procurement Officer.
            </p>
          )}
          {userRole === "ENDORSING_COMMITTEE" && (
            <p className="text-[11px] text-slate-500 font-medium pt-1">
              Note: A plan requires at least 3 approval votes from the
              Endorsement Committee to be officially endorsed. Rejection
              comments will be visible in the Director review panel.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {userRole === "ENDORSING_COMMITTEE" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onCommitteeVote(plan, "APPROVE")}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-[#A3E635]" />
              <span>Vote: Endorse &amp; Approve Plan</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCommitteeRejectionModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-colors bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Vote: Reject / Return Plan</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Committee Voting Deadline
                <span className="ml-1 text-slate-500 font-normal">
                  (Used for backend automated email reminders)
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={committeeDeadlineDate}
                  onChange={(e) => setCommitteeDeadlineDate(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#0A3C2F]"
                />
                <div className="flex items-center gap-1">
                  {[3, 7, 14].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + days);
                        setCommitteeDeadlineDate(d.toISOString().split("T")[0]);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      +{days} Days
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => onApprovePlan(plan, committeeDeadlineDate)}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4 text-[#A3E635]" />
                <span>Approve &amp; Send to Committee</span>
              </button>

              <button
                type="button"
                disabled={!returnRemarks.trim()}
                onClick={() => onReturnPlan(plan)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${
                  returnRemarks.trim()
                    ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                <span>Return to Officer for Revision</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Dedicated Activity Quick Edit Modal */}
      <ActivityQuickEditModal
        activity={editingActivity}
        userRole={userRole}
        onClose={() => setEditingActivity(null)}
        onSave={onSaveActivity}
      />

      {/* Committee Rejection Modal */}
      <CommitteeRejectionModal
        isOpen={isCommitteeRejectionModalOpen}
        onClose={() => setIsCommitteeRejectionModalOpen(false)}
        onConfirm={(scope, activityIds, activityRefs, remarks) => {
          onCommitteeVote(plan, "REJECT", remarks, {
            scope,
            rejectedActivityIds: activityIds,
            rejectedActivityRefs: activityRefs,
          });
        }}
        activities={(plan.activities || reviewActivities).map((a: any) => ({
          id: a.id,
          activityRefNo: a.activityRefNo || a.reference,
          description: a.description,
          method: a.method || a.procurementMethod?.label,
          estimatedAmount: a.estimatedAmount || a.estimatedBudget,
          currency: a.currency,
        }))}
        planName={plan.planName}
        projectCode={plan.projectCode}
      />
    </div>
  );
}
