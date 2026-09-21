"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type {
  ProcurementActivity,
  ActivityStage,
} from "../../../activities/activitiesData";
import { DualCalendarField } from "@/features/projects/components/DualCalendarField";

export interface ActivityQuickEditModalProps {
  activity: ProcurementActivity | null;
  userRole?: string;
  onClose: () => void;
  onSave: (id: string, updates: Partial<ProcurementActivity>) => void;
}

export function ActivityQuickEditModal({
  activity,
  userRole,
  onClose,
  onSave,
}: ActivityQuickEditModalProps) {
  const [prevActivity, setPrevActivity] = useState(activity);
  const [editingActivity, setEditingActivity] =
    useState<ProcurementActivity | null>(activity);

  if (activity !== prevActivity) {
    setPrevActivity(activity);
    setEditingActivity(activity);
  }

  if (!activity || !editingActivity) return null;

  const isManagement = userRole === "MANAGEMENT";
  const isCommittee = userRole === "ENDORSING_COMMITTEE";
  const isSpecsReadOnly = isCommittee || isManagement;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 border border-slate-200 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-[#0A3C2F] text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {editingActivity.activityRefNo}
              </span>
              <span className="text-xs font-bold text-slate-500">
                • {editingActivity.method}
              </span>
              <span className="text-xs font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {editingActivity.reviewType}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {isManagement
                ? "Management Activity Review & Comment"
                : isCommittee
                  ? "View Package Activity Details"
                  : "Edit Package Activity Details"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <div className="space-y-4">
          {/* Activity Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Activity Description
            </label>
            <textarea
              rows={3}
              value={editingActivity.description}
              disabled={isSpecsReadOnly}
              onChange={(e) =>
                setEditingActivity((prev) =>
                  prev ? { ...prev, description: e.target.value } : null,
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-xs text-slate-900 outline-none focus:border-[#0A3C2F] focus:bg-white focus:ring-2 focus:ring-[#0A3C2F]/10 transition-all leading-relaxed disabled:opacity-75 disabled:cursor-not-allowed"
              placeholder="Enter activity description..."
            />
          </div>

          {/* Target Date in Roadmap */}
          <DualCalendarField
            id="review-target-planned-date"
            label="Target Planned Date (Roadmap Milestone)"
            disabled={isSpecsReadOnly}
            gregorianValue={
              editingActivity.roadmap.find(
                (s: ActivityStage) =>
                  s.revisedTargetDate || s.originalPlannedDate,
              )?.revisedTargetDate ||
              editingActivity.roadmap[0]?.originalPlannedDate ||
              ""
            }
            onChange={(newDate) => {
              const updatedRoadmap = editingActivity.roadmap.map(
                (s: ActivityStage, sIdx: number) =>
                  sIdx === 0 ? { ...s, revisedTargetDate: newDate } : s,
              );
              setEditingActivity((prev) =>
                prev ? { ...prev, roadmap: updatedRoadmap } : null,
              );
            }}
            required={false}
          />

          {/* Clarifications / Management Comments */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              {isManagement
                ? "Management Review Comment on Activity"
                : "Clarifications (Remarks / Comments)"}
            </label>
            <textarea
              rows={2}
              value={editingActivity.remarks || ""}
              disabled={isCommittee}
              onChange={(e) =>
                setEditingActivity((prev) =>
                  prev ? { ...prev, remarks: e.target.value } : null,
                )
              }
              placeholder={
                isManagement
                  ? "Enter management feedback, directives or comments on this activity..."
                  : "Add clarification notes..."
              }
              className={`w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#0A3C2F] focus:bg-white focus:ring-2 focus:ring-[#0A3C2F]/10 transition-all leading-relaxed ${
                isCommittee
                  ? "bg-slate-50/50 opacity-75 cursor-not-allowed"
                  : "bg-white"
              }`}
            />
          </div>

          {/* Technical Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Technical Notes (Additional Details)
            </label>
            <input
              type="text"
              value={editingActivity.additionalRemarks || ""}
              disabled={isSpecsReadOnly}
              onChange={(e) =>
                setEditingActivity((prev) =>
                  prev ? { ...prev, additionalRemarks: e.target.value } : null,
                )
              }
              placeholder="Add technical notes..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#0A3C2F] focus:bg-white focus:ring-2 focus:ring-[#0A3C2F]/10 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          {isCommittee ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingActivity) {
                    onSave(editingActivity.id, {
                      description: editingActivity.description,
                      roadmap: editingActivity.roadmap,
                      remarks: editingActivity.remarks,
                      additionalRemarks: editingActivity.additionalRemarks,
                    });
                    onClose();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {isManagement
                  ? "Save Management Comment"
                  : "Save Activity Changes"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
