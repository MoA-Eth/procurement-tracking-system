"use client";

import { useState, useRef, useEffect } from "react";
import { CircleDollarSign, Plus, Trash2, X, ChevronDown, Check } from "lucide-react";
import {
  FUNDING_SOURCE_OPTIONS,
  FUNDING_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
} from "../projectsData";

export interface Step2FinancialsFormData {
  fundingSources: string[];
  customFundingSource: string;
  fundingType: string;
  currency: string;
  loanGrantNumbers: string[];
}

interface Step2FinancialsFormProps {
  data: Step2FinancialsFormData;
  onChange: (fields: Partial<Step2FinancialsFormData>) => void;
}

function MultiSelectFundingSource({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const standardOptions = FUNDING_SOURCE_OPTIONS.filter(
    (fs) => fs.category === "Standard"
  );
  const customOption = FUNDING_SOURCE_OPTIONS.find(
    (fs) => fs.category === "Custom"
  );

  const filteredOptions = standardOptions.filter((fs) =>
    fs.label.toLowerCase().includes(search.toLowerCase())
  );

  function toggleOption(label: string) {
    if (selected.includes(label)) {
      onChange(selected.filter((s) => s !== label));
    } else {
      onChange([...selected, label]);
    }
  }

  function removeTag(label: string) {
    onChange(selected.filter((s) => s !== label));
  }

  const hasCustom = selected.includes("Other (Specify Custom Donor)");

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger / display area */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[42px] rounded-xl bg-slate-50/80 border px-3.5 py-2 text-xs font-semibold text-slate-900 cursor-pointer transition-all flex items-center justify-between gap-2 flex-wrap ${
          isOpen
            ? "border-emerald-500 bg-white ring-2 ring-emerald-500/20"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        {selected.length === 0 ? (
          <span className="text-slate-400 font-medium">
            Select funding source(s)...
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5 flex-1">
            {selected
              .filter((s) => s !== "Other (Specify Custom Donor)")
              .map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-emerald-200/80"
                >
                  <span className="truncate max-w-[180px]">{label}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(label);
                    }}
                    className="hover:bg-emerald-200/60 rounded-full p-0.5 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            {hasCustom && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-blue-200/80">
                <span>Custom Donor</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag("Other (Specify Custom Donor)");
                  }}
                  className="hover:bg-blue-200/60 rounded-full p-0.5 transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search funding sources..."
              className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-400 outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filteredOptions.map((fs) => {
              const isSelected = selected.includes(fs.label);
              return (
                <button
                  key={fs.label}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(fs.label);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-900"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? "bg-emerald-600 border-emerald-600"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span>{fs.label}</span>
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-xs text-slate-400 text-center">
                No funding sources match your search
              </div>
            )}
          </div>

          {/* Custom option separator */}
          {customOption && (
            <div className="border-t border-slate-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(customOption.label);
                }}
                className={`w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  hasCustom
                    ? "bg-blue-50 text-blue-900"
                    : "text-blue-700 hover:bg-blue-50/60"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                    hasCustom
                      ? "bg-blue-600 border-blue-600"
                      : "border-blue-300 bg-white"
                  }`}
                >
                  {hasCustom && <Check className="h-3 w-3 text-white" />}
                </div>
                <span>{customOption.label}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
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

  const hasCustomDonor = data.fundingSources.includes(
    "Other (Specify Custom Donor)"
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 text-[#0A3C2F]" />
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">
            Step 2: Financial Configuration & Donor Allocation
          </h2>
        </div>
        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
          Funding & Currency
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Funding Source / Donor — Multi-Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              Funding Source / Donor *
            </label>
            <MultiSelectFundingSource
              selected={data.fundingSources}
              onChange={(val) => onChange({ fundingSources: val })}
            />
            {data.fundingSources.length > 1 && (
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                {data.fundingSources.filter(
                  (s) => s !== "Other (Specify Custom Donor)"
                ).length +
                  (hasCustomDonor ? 1 : 0)}{" "}
                funding source(s) selected
              </p>
            )}
          </div>

          {/* Funding Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
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
        {hasCustomDonor && (
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1.5 animate-in fade-in">
            <label className="text-xs font-semibold text-blue-900 block">
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
            <label className="text-xs font-semibold text-slate-800 block">
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
              <h3 className="text-xs font-semibold text-[#0A3C2F] uppercase tracking-wider">
                Loan / Credit / Grant Number(s)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Add one or more official agreement IDs or loan numbers.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddLoanNumber}
              className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0A3C2F] text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-200/80 transition-colors cursor-pointer"
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
