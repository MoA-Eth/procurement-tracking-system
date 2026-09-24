import { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2,
  Plus,
  Search,
  Check,
  X,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import {
  fetchLookups,
  createLookup,
  subscribeToLookups,
  type LookupItem,
} from "@/lib/lookupsApi";
import {
  SECTOR_OPTIONS,
  COUNTRY_ORG_OPTIONS,
  EXECUTING_AGENCY_OPTIONS,
  REGION_OPTIONS,
} from "../projectsData";

export interface Step1IdentityFormData {
  code: string;
  name: string;
  sapNumber: string;
  sector: string;
  countryOrg: string;
  customCountryOrg: string;
  executingAgency: string;
  customExecutingAgency: string;
  region: string;
}

interface Step1IdentityFormProps {
  data: Step1IdentityFormData;
  onChange: (fields: Partial<Step1IdentityFormData>) => void;
}

export function Step1IdentityForm({ data, onChange }: Step1IdentityFormProps) {
  const [projectCodeOptions, setProjectCodeOptions] = useState<LookupItem[]>(
    [],
  );
  const [isCustomCode, setIsCustomCode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Quick-Add Modal state
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickCode, setQuickCode] = useState("");
  const [quickLabel, setQuickLabel] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadCodes() {
      try {
        const list = await fetchLookups("PROJECT_CODE");
        if (isMounted) {
          setProjectCodeOptions(list);
          if (data.code && !list.some((item) => item.code === data.code)) {
            setIsCustomCode(true);
          }
        }
      } catch {
        // Fallback handled by API
      }
    }
    loadCodes();

    // Subscribe to cross-tab and in-app lookups updates
    const unsubscribe = subscribeToLookups(() => {
      loadCodes();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [data.code]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCodes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return projectCodeOptions;
    return projectCodeOptions.filter(
      (opt) =>
        opt.code.toLowerCase().includes(q) ||
        opt.label.toLowerCase().includes(q),
    );
  }, [projectCodeOptions, searchQuery]);

  const selectedMatched = projectCodeOptions.find((p) => p.code === data.code);

  const handleSelectCode = (selectedCode: string) => {
    if (selectedCode === "CUSTOM") {
      setIsCustomCode(true);
      setIsDropdownOpen(false);
      return;
    }

    setIsCustomCode(false);
    setIsDropdownOpen(false);
    const matched = projectCodeOptions.find((p) => p.code === selectedCode);
    if (matched) {
      onChange({
        code: matched.code,
        name:
          !data.name || projectCodeOptions.some((p) => p.label === data.name)
            ? matched.label
            : data.name,
      });
    } else {
      onChange({ code: selectedCode });
    }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = quickCode.trim().toUpperCase();
    const cleanLabel = quickLabel.trim();

    if (!cleanCode || !cleanLabel) {
      setQuickError(
        "Please provide both the project code and the full official name.",
      );
      return;
    }

    if (projectCodeOptions.some((p) => p.code.toUpperCase() === cleanCode)) {
      setQuickError(`Project code "${cleanCode}" already exists.`);
      return;
    }

    setIsQuickSubmitting(true);
    setQuickError(null);

    try {
      const created = await createLookup({
        type: "PROJECT_CODE",
        code: cleanCode,
        label: cleanLabel,
      });

      setProjectCodeOptions((prev) => [created, ...prev]);
      setIsCustomCode(false);
      onChange({
        code: created.code,
        name: created.label,
      });
      setQuickCode("");
      setQuickLabel("");
      setShowQuickAddModal(false);
      setIsDropdownOpen(false);
    } catch (err: any) {
      setQuickError(err?.message || "Failed to create project code.");
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#0A3C2F]" />
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">
            Step 1: Project Identity & Regional Scope
          </h2>
        </div>
        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
          Core Metadata
        </span>
      </div>

      {/* Subsection A: Project Identity */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-[#0A3C2F] uppercase tracking-wider">
          A. Project Classification
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Project Code */}
          <div className="space-y-1.5" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 block">
                Project Code / Acronym *
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
                title="Quick-add a new code without leaving this wizard"
              >
                <Plus className="h-3 w-3" />
                <span>Add Code</span>
              </button>
            </div>

            {isCustomCode ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={data.code}
                  onChange={(e) => onChange({ code: e.target.value })}
                  placeholder="Enter custom project code (e.g. DRIVE, CALM)..."
                  className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-900 uppercase placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomCode(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
                >
                  &larr; Choose from configured codes
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Combobox Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(!isDropdownOpen);
                    setSearchQuery("");
                  }}
                  className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all flex items-center justify-between text-left cursor-pointer hover:border-slate-300"
                >
                  {selectedMatched ? (
                    <span className="flex items-center gap-2 truncate">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono font-semibold text-[11px] shrink-0">
                        {selectedMatched.code}
                      </span>
                      <span className="font-semibold text-slate-800 truncate">
                        {selectedMatched.label}
                      </span>
                    </span>
                  ) : data.code ? (
                    <span className="font-mono font-semibold text-slate-900">
                      {data.code}
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      -- Select or Search Project Short Code --
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
                </button>

                {/* Combobox Floating Menu */}
                {isDropdownOpen && (
                  <div className="absolute left-0 top-full z-40 mt-1 w-full min-w-[280px] bg-white rounded-xl border border-slate-200 shadow-xl p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search codes or names..."
                        autoFocus
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 text-slate-900"
                      />
                    </div>

                    <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                      {filteredCodes.length === 0 ? (
                        <div className="py-4 px-2 text-center text-xs text-slate-400">
                          No matching project codes found.
                        </div>
                      ) : (
                        filteredCodes.map((opt) => {
                          const isSelected = opt.code === data.code;
                          return (
                            <button
                              key={opt.id || opt.code}
                              type="button"
                              onClick={() => handleSelectCode(opt.code)}
                              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                                isSelected
                                  ? "bg-emerald-50 text-emerald-900 font-semibold"
                                  : "hover:bg-slate-50 text-slate-800"
                              }`}
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-semibold text-[10px] shrink-0 border border-slate-200">
                                  {opt.code}
                                </span>
                                <span className="truncate text-[11px] text-slate-700">
                                  {opt.label}
                                </span>
                              </div>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              Full Official Project Name *
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. De-risking, Inclusion and Value Enhancement Project..."
              className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* SAP Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              Project SAP Identification No. (Optional)
            </label>
            <input
              type="text"
              value={data.sapNumber}
              onChange={(e) => onChange({ sapNumber: e.target.value })}
              placeholder="e.g. P-Z1-C00-080 or IDA-E0380"
              className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Subsection B: Governance & Scope */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-xs font-semibold text-[#0A3C2F] uppercase tracking-wider">
          B. Governance & Operational Scope
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Country / Organisation */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              Country / Organisation Scope *
            </label>
            <select
              value={data.countryOrg}
              onChange={(e) => onChange({ countryOrg: e.target.value })}
              className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer transition-all"
            >
              {COUNTRY_ORG_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {data.countryOrg === "Other (Specify Custom Organisation)" && (
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1 animate-in fade-in mt-2">
                <label className="text-[11px] font-semibold text-blue-900 block">
                  Specify Custom Organisation Name *
                </label>
                <input
                  type="text"
                  value={data.customCountryOrg}
                  onChange={(e) =>
                    onChange({ customCountryOrg: e.target.value })
                  }
                  placeholder="e.g. IGAD Secretariat / Regional Authority..."
                  className="w-full rounded-xl bg-white border border-blue-300 px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-blue-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Executing Agency */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              Executing Agency *
            </label>
            <select
              value={data.executingAgency}
              onChange={(e) => onChange({ executingAgency: e.target.value })}
              className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer transition-all"
            >
              {EXECUTING_AGENCY_OPTIONS.map((ea) => (
                <option key={ea} value={ea}>
                  {ea}
                </option>
              ))}
            </select>

            {data.executingAgency === "Other (Specify Custom Agency)" && (
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1 animate-in fade-in mt-2">
                <label className="text-[11px] font-semibold text-blue-900 block">
                  Specify Custom Agency Name *
                </label>
                <input
                  type="text"
                  value={data.customExecutingAgency}
                  onChange={(e) =>
                    onChange({ customExecutingAgency: e.target.value })
                  }
                  placeholder="e.g. Federal Cooperative Agency / Regional Bureau..."
                  className="w-full rounded-xl bg-white border border-blue-300 px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-blue-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Organization / Region */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              Organization / Region *
            </label>
            <select
              value={data.region}
              onChange={(e) => onChange({ region: e.target.value })}
              className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer transition-all"
            >
              {REGION_OPTIONS.map((rg) => (
                <option key={rg} value={rg}>
                  {rg}
                </option>
              ))}
            </select>
          </div>

          {/* Sector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              Sector / Directorate *
            </label>
            <select
              value={data.sector}
              onChange={(e) => onChange({ sector: e.target.value })}
              className="w-full rounded-xl bg-slate-50/80 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer transition-all"
            >
              {SECTOR_OPTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quick-Add Project Code Modal */}
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
                    Quick-Add Project Code
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
                  Project Code / Acronym *
                </label>
                <input
                  type="text"
                  value={quickCode}
                  onChange={(e) => setQuickCode(e.target.value)}
                  placeholder="e.g. DRIVE, BREFONS, CALM"
                  autoFocus
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900 uppercase placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 block">
                  Full Official Project Title *
                </label>
                <textarea
                  rows={2}
                  value={quickLabel}
                  onChange={(e) => setQuickLabel(e.target.value)}
                  placeholder="e.g. De-risking, Inclusion and Value Enhancement of Pastoral Economies Project"
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
    </div>
  );
}
