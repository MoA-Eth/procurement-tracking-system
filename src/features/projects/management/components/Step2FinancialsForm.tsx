"use client";

import { CircleDollarSign, Plus, Trash2 } from "lucide-react";
import {
  FUNDING_SOURCE_OPTIONS,
  FUNDING_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
} from "../projectsData";

export interface Step2FinancialsFormData {
  fundingSource: string;
  customFundingSource: string;
  fundingType: string;
  currency: string;
  loanGrantNumbers: string[];
}

interface Step2FinancialsFormProps {
  data: Step2FinancialsFormData;
  onChange: (fields: Partial<Step2FinancialsFormData>) => void;
}

export function Step2FinancialsForm({
  data,
  onChange,
}: Step2FinancialsFormProps) {
  function handleAddLoanNumber() {
    onChange({ loanGrantNumbers: [...data.loanGrantNumbers, ""] });
  }

  function handleUpdateLoanNumber(index: number, val: string) {
    const updated = [...data.loanGrantNumbers];
    updated[index] = val;
    onChange({ loanGrantNumbers: updated });
  }

  function handleRemoveLoanNumber(index: number) {
    if (data.loanGrantNumbers.length === 1) return;
    onChange({
      loanGrantNumbers: data.loanGrantNumbers.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 text-[#0A3C2F]" />
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Step 2: Financial Configuration & Donor Allocation
          </h2>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          Funding & Currency
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Funding Source / Donor */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Funding Source / Donor *
            </label>
            <select
              value={data.fundingSource}
              onChange={(e) => onChange({ fundingSource: e.target.value })}
              className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer transition-all"
            >
              {FUNDING_SOURCE_OPTIONS.map((fs) => (
                <option key={fs.label} value={fs.label}>
                  {fs.label}
                </option>
              ))}
            </select>
          </div>

          {/* Funding Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Funding Instrument / Type *
            </label>
            <select
              value={data.fundingType}
              onChange={(e) => onChange({ fundingType: e.target.value })}
              className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer transition-all"
            >
              {FUNDING_TYPE_OPTIONS.map((ft) => (
                <option key={ft} value={ft}>
                  {ft}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Donor Field */}
        {data.fundingSource === "Other (Specify Custom Donor)" && (
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1.5 animate-in fade-in">
            <label className="text-xs font-bold text-blue-900 block">
              Specify Custom Funding Source / Donor Name *
            </label>
            <input
              type="text"
              value={data.customFundingSource}
              onChange={(e) =>
                onChange({ customFundingSource: e.target.value })
              }
              placeholder="e.g. IFAD (International Fund for Agricultural Development)..."
              className="w-full rounded-xl bg-white border border-blue-300 px-4 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        )}

        {/* Currency Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Primary Base Currency *
            </label>
            <select
              value={data.currency}
              onChange={(e) => onChange({ currency: e.target.value })}
              className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer transition-all"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Repeatable Loan / Grant / Credit Numbers */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-extrabold text-[#0A3C2F] uppercase tracking-wider">
                Loan / Credit / Grant Number(s)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Add one or more official agreement IDs or loan numbers.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddLoanNumber}
              className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0A3C2F] text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200/80 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Agreement ID</span>
            </button>
          </div>

          <div className="space-y-2">
            {data.loanGrantNumbers.map((num, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={num}
                  onChange={(e) => handleUpdateLoanNumber(idx, e.target.value)}
                  placeholder={`Agreement # ${idx + 1} (e.g. 2100155042468 or IDA-6500)`}
                  className="flex-1 rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                />
                {data.loanGrantNumbers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLoanNumber(idx)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
