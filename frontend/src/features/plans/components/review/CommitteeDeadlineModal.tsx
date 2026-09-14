"use client";

import { Mail, X, Clock, Send } from "lucide-react";
import type { ProcurementPlan } from "../../plansData";

export interface CommitteeDeadlineModalProps {
  isOpen: boolean;
  plan: ProcurementPlan | null;
  committeeDeadlineDate: string;
  onChangeDeadlineDate: (date: string) => void;
  onClose: () => void;
  onConfirm: (plan: ProcurementPlan, deadline: string) => void;
}

export function CommitteeDeadlineModal({
  isOpen,
  plan,
  committeeDeadlineDate,
  onChangeDeadlineDate,
  onClose,
  onConfirm,
}: CommitteeDeadlineModalProps) {
  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-[#0A3C2F] rounded-xl">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Forward Plan to Committee
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Set voting deadline &amp; trigger email notifications
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <p className="text-xs font-bold text-slate-900">{plan.planName}</p>
            <p className="text-[11px] font-mono text-slate-600">
              Project: {plan.projectCode} • {plan.budgetYear}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Select Committee Voting Deadline Date
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={committeeDeadlineDate}
                onChange={(e) => onChangeDeadlineDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#0A3C2F] font-medium"
              />
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-500">
                Quick Presets:
              </span>
              {[3, 7, 14].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + days);
                    onChangeDeadlineDate(d.toISOString().split("T")[0]);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  +{days} Days
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
              Endorsement Committee members will receive an automated email
              notification with a direct link and voting instructions valid
              until <strong>{committeeDeadlineDate}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(plan, committeeDeadlineDate)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Send className="h-3.5 w-3.5 text-[#A3E635]" />
            <span>Confirm &amp; Send to Committee</span>
          </button>
        </div>
      </div>
    </div>
  );
}
