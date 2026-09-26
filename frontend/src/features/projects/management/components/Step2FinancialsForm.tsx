"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  CircleDollarSign,
  Plus,
  Trash2,
  X,
  ChevronDown,
  Check,
  Search,
  AlertCircle,
} from "lucide-react";
import {
  fetchLookups,
  createLookup,
  subscribeToLookups,
  getInitialLookups,
  type LookupItem,
} from "@/lib/lookupsApi";
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
  options,
  onChange,
}: {
  selected: string[];
  options: LookupItem[];
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

  const customOptionLabel = "Other (Specify Custom Donor)";

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.code.toLowerCase().includes(q),
    );
  }, [options, search]);

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

  const hasCustom = selected.includes(customOptionLabel);

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
              .filter((s) => s !== customOptionLabel)
              .map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-emerald-200/80"
                >
                  <span className="truncate max-w-[200px]">{label}</span>
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
                    removeTag(customOptionLabel);
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search bar */}
          <div className="p-2 border-b border-slate-100 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by donor name or acronym (e.g. WB, AfDB, IFAD)..."
              className="w-full rounded-lg bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-400 outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-50">
            {filteredOptions.map((fs) => {
              const isSelected = selected.includes(fs.label);
              return (
                <button
                  key={fs.id || fs.code || fs.label}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(fs.label);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-900"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? "bg-emerald-600 border-emerald-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      {fs.code && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-semibold text-[10px] shrink-0 border border-slate-200">
                          {fs.code}
                        </span>
                      )}
                      <span className="truncate text-slate-800">{fs.label}</span>
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-xs text-slate-400 text-center">
                No configured funding sources match "{search}"
              </div>
            )}
          </div>

          {/* Custom option */}
          <div className="border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleOption(customOptionLabel);
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
              <span>{customOptionLabel}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Step2FinancialsForm({
  data,
  onChange,
}: Step2FinancialsFormProps) {
  const [fundingSourceOptions, setFundingSourceOptions] = useState<
    LookupItem[]
  >(() => getInitialLookups("FUNDING_SOURCE"));
  const [fundingTypeOptions, setFundingTypeOptions] = useState<
    LookupItem[]
  >(() => getInitialLookups("FUNDING_TYPE"));
  const [currencyOptions, setCurrencyOptions] = useState<
    LookupItem[]
  >(() => getInitialLookups("CURRENCY"));

  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickCode, setQuickCode] = useState("");
  const [quickLabel, setQuickLabel] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);

  // Quick-Add Funding Type modal state
  const [showQuickAddTypeModal, setShowQuickAddTypeModal] = useState(false);
  const [quickTypeCode, setQuickTypeCode] = useState("");
  const [quickTypeLabel, setQuickTypeLabel] = useState("");
  const [quickTypeError, setQuickTypeError] = useState<string | null>(null);
  const [isQuickTypeSubmitting, setIsQuickTypeSubmitting] = useState(false);

  // Quick-Add Currency modal state
  const [showQuickAddCurrencyModal, setShowQuickAddCurrencyModal] = useState(false);
  const [quickCurrencyCode, setQuickCurrencyCode] = useState("");
  const [quickCurrencyLabel, setQuickCurrencyLabel] = useState("");
  const [quickCurrencyError, setQuickCurrencyError] = useState<string | null>(null);
  const [isQuickCurrencySubmitting, setIsQuickCurrencySubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadLookups() {
      try {
        const [sourceList, typeList, currencyList] = await Promise.all([
          fetchLookups("FUNDING_SOURCE"),
          fetchLookups("FUNDING_TYPE"),
          fetchLookups("CURRENCY"),
        ]);
        if (isMounted) {
          if (sourceList && sourceList.length > 0) {
            setFundingSourceOptions(sourceList);
          }
          if (typeList && typeList.length > 0) {
            setFundingTypeOptions(typeList);
          }
          if (currencyList && currencyList.length > 0) {
            setCurrencyOptions(currencyList);
          }
        }
      } catch {
        // Fallback handled by API
      }
    }
    loadLookups();

    const unsubscribe = subscribeToLookups(() => {
      loadLookups();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const displayedTypes = useMemo(() => {
    const list = fundingTypeOptions.map((f) => f.label);
    if (data.fundingType && !list.includes(data.fundingType)) {
      return [data.fundingType, ...list];
    }
    return list;
  }, [fundingTypeOptions, data.fundingType]);

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

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = quickCode.trim().toUpperCase();
    const cleanLabel = quickLabel.trim();

    if (!cleanCode || !cleanLabel) {
      setQuickError("Please provide both donor acronym/code and the full name.");
      return;
    }

    if (
      fundingSourceOptions.some(
        (fs) =>
          fs.code.toUpperCase() === cleanCode ||
          fs.label.toLowerCase() === cleanLabel.toLowerCase(),
      )
    ) {
      setQuickError(`Funding source "${cleanLabel}" or code "${cleanCode}" already exists.`);
      return;
    }

    setIsQuickSubmitting(true);
    setQuickError(null);

    try {
      const created = await createLookup({
        type: "FUNDING_SOURCE",
        code: cleanCode,
        label: cleanLabel,
      });

      setFundingSourceOptions((prev) => [created, ...prev]);
      // Immediately select the newly created donor in the form
      if (!data.fundingSources.includes(created.label)) {
        onChange({
          fundingSources: [...data.fundingSources, created.label],
        });
      }
      setQuickCode("");
      setQuickLabel("");
      setShowQuickAddModal(false);
    } catch (err: any) {
      setQuickError(err?.message || "Failed to create funding source.");
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  const handleQuickAddTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = quickTypeLabel.trim();
    const cleanCode =
      quickTypeCode.trim().toUpperCase() ||
      `FT_${cleanLabel.replace(/[^A-Za-z0-9]/g, "_").toUpperCase().slice(0, 15)}`;

    if (!cleanLabel) {
      setQuickTypeError("Please provide the funding type name / instrument.");
      return;
    }

    if (
      fundingTypeOptions.some(
        (ft) =>
          ft.code.trim().toUpperCase() === cleanCode ||
          ft.label.trim().toLowerCase() === cleanLabel.toLowerCase(),
      )
    ) {
      setQuickTypeError(`Funding type "${cleanLabel}" already exists.`);
      return;
    }

    setIsQuickTypeSubmitting(true);
    setQuickTypeError(null);

    try {
      const created = await createLookup({
        type: "FUNDING_TYPE",
        code: cleanCode,
        label: cleanLabel,
      });

      setFundingTypeOptions((prev) => [created, ...prev]);
      // Immediately select the newly created type in the form
      onChange({ fundingType: created.label });
      setQuickTypeCode("");
      setQuickTypeLabel("");
      setShowQuickAddTypeModal(false);
    } catch (err: any) {
      setQuickTypeError(err?.message || "Failed to create funding type.");
    } finally {
      setIsQuickTypeSubmitting(false);
    }
  };

  const displayedCurrencies = useMemo(() => {
    const list = currencyOptions.map((c) => c.label);
    if (data.currency && !list.includes(data.currency)) {
      return [data.currency, ...list];
    }
    return list;
  }, [currencyOptions, data.currency]);

  const handleQuickAddCurrencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = quickCurrencyCode.trim().toUpperCase();
    const cleanLabelInput = quickCurrencyLabel.trim();

    if (!cleanCode) {
      setQuickCurrencyError("Please provide a currency code (e.g. GBP, CAD, JPY).");
      return;
    }

    const cleanLabel = cleanLabelInput
      ? cleanLabelInput.startsWith(cleanCode)
        ? cleanLabelInput
        : `${cleanCode} (${cleanLabelInput})`
      : `${cleanCode} (${cleanCode})`;

    if (
      currencyOptions.some(
        (c) =>
          c.code.trim().toUpperCase() === cleanCode ||
          c.label.trim().toLowerCase() === cleanLabel.toLowerCase(),
      )
    ) {
      setQuickCurrencyError(`Currency "${cleanCode}" already exists.`);
      return;
    }

    setIsQuickCurrencySubmitting(true);
    setQuickCurrencyError(null);

    try {
      const created = await createLookup({
        type: "CURRENCY",
        code: cleanCode,
        label: cleanLabel,
      });

      setCurrencyOptions((prev) => [created, ...prev]);
      onChange({ currency: created.label });
      setQuickCurrencyCode("");
      setQuickCurrencyLabel("");
      setShowQuickAddCurrencyModal(false);
    } catch (err: any) {
      setQuickCurrencyError(err?.message || "Failed to create currency.");
    } finally {
      setIsQuickCurrencySubmitting(false);
    }
  };

  const hasCustomDonor = data.fundingSources.includes(
    "Other (Specify Custom Donor)",
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 block">
                Funding Source / Donor *
              </label>
              <button
                type="button"
                onClick={() => {
                  setQuickError(null);
                  setQuickCode("");
                  setQuickLabel("");
                  setShowQuickAddModal(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006837] hover:text-[#00552c] bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                title="Quick-add a new donor or funding source"
              >
                <Plus className="h-3 w-3" />
                <span>Add Donor</span>
              </button>
            </div>
            <MultiSelectFundingSource
              selected={data.fundingSources}
              options={fundingSourceOptions}
              onChange={(val) => onChange({ fundingSources: val })}
            />
            {data.fundingSources.length > 1 && (
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                {data.fundingSources.filter(
                  (s) => s !== "Other (Specify Custom Donor)",
                ).length + (hasCustomDonor ? 1 : 0)}{" "}
                funding source(s) selected
              </p>
            )}
          </div>

          {/* Funding Type */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 block">
                Funding Instrument / Type *
              </label>
              <button
                type="button"
                onClick={() => {
                  setQuickTypeError(null);
                  setQuickTypeCode("");
                  setQuickTypeLabel("");
                  setShowQuickAddTypeModal(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006837] hover:text-[#00552c] bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                title="Quick-add a new funding type / instrument"
              >
                <Plus className="h-3 w-3" />
                <span>Add Type</span>
              </button>
            </div>
            <select
              value={data.fundingType}
              onChange={(e) => onChange({ fundingType: e.target.value })}
              className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer transition-all"
            >
              {displayedTypes.map((ft) => (
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 block">
                Primary Base Currency *
              </label>
              <button
                type="button"
                onClick={() => {
                  setQuickCurrencyError(null);
                  setQuickCurrencyCode("");
                  setQuickCurrencyLabel("");
                  setShowQuickAddCurrencyModal(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006837] hover:text-[#00552c] bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                title="Quick-add a new currency"
              >
                <Plus className="h-3 w-3" />
                <span>Add Currency</span>
              </button>
            </div>
            <select
              value={data.currency}
              onChange={(e) => onChange({ currency: e.target.value })}
              className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer transition-all"
            >
              {displayedCurrencies.map((c) => (
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

      {/* Quick-Add Funding Source Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Quick-Add Funding Source
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Saves to system and immediately selects in this wizard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {quickError && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{quickError}</span>
              </div>
            )}

            <form onSubmit={handleQuickAddSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">
                  Donor Acronym / Code *
                </label>
                <input
                  type="text"
                  value={quickCode}
                  onChange={(e) => setQuickCode(e.target.value)}
                  placeholder="e.g. FS_JICA, JICA, USAID, BGF"
                  autoFocus
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900 uppercase placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">
                  Full Official Donor / Source Name *
                </label>
                <textarea
                  rows={2}
                  value={quickLabel}
                  onChange={(e) => setQuickLabel(e.target.value)}
                  placeholder="e.g. Japan International Cooperation Agency (JICA)"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isQuickSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-[#006837] hover:bg-[#00552c] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isQuickSubmitting ? "Saving..." : "Save & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick-Add Funding Type Modal */}
      {showQuickAddTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Quick-Add Funding Type / Instrument
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Saves to system and immediately selects in this wizard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddTypeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {quickTypeError && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{quickTypeError}</span>
              </div>
            )}

            <form onSubmit={handleQuickAddTypeSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">
                  Funding Type / Instrument Name *
                </label>
                <input
                  type="text"
                  value={quickTypeLabel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuickTypeLabel(val);
                    if (!quickTypeCode || quickTypeCode.startsWith("FT_")) {
                      setQuickTypeCode(
                        val.trim()
                          ? `FT_${val.replace(/[^A-Za-z0-9]/g, "_").toUpperCase().slice(0, 15)}`
                          : "",
                      );
                    }
                  }}
                  placeholder="e.g. Concessional Credit, Blended Finance, Trust Fund"
                  autoFocus
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">
                  Acronym / Code (Optional)
                </label>
                <input
                  type="text"
                  value={quickTypeCode}
                  onChange={(e) => setQuickTypeCode(e.target.value)}
                  placeholder="e.g. FT_CONCESSIONAL, FT_BLENDED"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900 uppercase placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAddTypeModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isQuickTypeSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-[#006837] hover:bg-[#00552c] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isQuickTypeSubmitting ? "Saving..." : "Save & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick-Add Currency Modal */}
      {showQuickAddCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Quick-Add Base Currency
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Saves to system and immediately selects in this wizard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddCurrencyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {quickCurrencyError && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{quickCurrencyError}</span>
              </div>
            )}

            <form onSubmit={handleQuickAddCurrencySubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">
                  Currency Code (ISO) *
                </label>
                <input
                  type="text"
                  value={quickCurrencyCode}
                  onChange={(e) => setQuickCurrencyCode(e.target.value)}
                  placeholder="e.g. GBP, CAD, JPY, SDR"
                  autoFocus
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900 uppercase placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">
                  Display Name / Description (Optional)
                </label>
                <input
                  type="text"
                  value={quickCurrencyLabel}
                  onChange={(e) => setQuickCurrencyLabel(e.target.value)}
                  placeholder="e.g. British Pound, Canadian Dollar"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAddCurrencyModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isQuickCurrencySubmitting}
                  className="px-4 py-1.5 rounded-xl bg-[#006837] hover:bg-[#00552c] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isQuickCurrencySubmitting ? "Saving..." : "Save & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
