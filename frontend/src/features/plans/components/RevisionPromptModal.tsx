"use client";

import { useState } from "react";
import { Edit3, AlertCircle, X, Check } from "lucide-react";

interface RevisionPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export function RevisionPromptModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Record Revision Reason",
  description = "Please provide a reason or justification for this revision. This will be permanently recorded in the plan audit trail.",
  confirmLabel = "Save & Record Revision",
}: RevisionPromptModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError("Please provide a revision reason or comment.");
      return;
    }
    setError(null);
    onConfirm(reason.trim());
    setReason("");
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#176c55] text-white">
              <Edit3 className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {description}
          </p>

          <div>
            <label
              htmlFor="revision-reason"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Revision Reason / Comment <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="revision-reason"
              className={`w-full rounded-lg border p-3 text-xs leading-5 text-slate-800 outline-none transition focus:ring-2 ${
                error
                  ? "border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500/15"
                  : "border-slate-300 bg-white focus:border-[#176c55] focus:ring-[#176c55]/15"
              }`}
              placeholder="e.g., Updated market estimate, adjusted stage dates per Director feedback..."
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
            />
            {error && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {error}
              </p>
            )}
          </div>
        </div>

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
            onClick={handleConfirm}
            type="button"
          >
            <Check className="h-3.5 w-3.5" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
