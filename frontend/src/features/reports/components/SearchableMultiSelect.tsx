"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { SearchableSelectOption } from "./SearchableSelect";

export interface SearchableMultiSelectProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
}

export function SearchableMultiSelect({
  label,
  values = [],
  onChange,
  options,
  placeholder = "All Projects",
  searchPlaceholder = "Search project...",
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Filter out any "ALL" sentinel option from individual selection options
  const selectableOptions = useMemo(() => {
    return options.filter((o) => o.value !== "ALL");
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return selectableOptions;
    const s = search.toLowerCase();
    return selectableOptions.filter((o) => o.label.toLowerCase().includes(s));
  }, [selectableOptions, search]);

  // Clean values excluding "ALL"
  const activeSelected = useMemo(() => {
    return values.filter((v) => v !== "ALL");
  }, [values]);

  const isAllSelected = activeSelected.length === 0;

  // Display text on the closed button
  const buttonDisplay = useMemo(() => {
    if (isAllSelected) {
      return placeholder;
    }
    if (activeSelected.length === 1) {
      const match = selectableOptions.find(
        (o) => o.value === activeSelected[0],
      );
      return match ? match.label : activeSelected[0];
    }
    return `${activeSelected.length} Projects Selected`;
  }, [isAllSelected, activeSelected, selectableOptions, placeholder]);

  const toggleOption = (val: string) => {
    if (activeSelected.includes(val)) {
      const next = activeSelected.filter((v) => v !== val);
      onChange(next);
    } else {
      onChange([...activeSelected, val]);
    }
  };

  const handleSelectAll = () => {
    const allIds = selectableOptions.map((o) => o.value);
    onChange(allIds);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[11px] font-semibold text-slate-500">
          {label}
        </label>
        {!isAllSelected && (
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
            {activeSelected.length} selected
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className={`w-full rounded-xl border px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none flex items-center justify-between text-left hover:border-slate-400 transition-colors text-xs ${
          !isAllSelected
            ? "border-emerald-500 ring-1 ring-emerald-500/20"
            : "border-slate-300"
        }`}
      >
        <span className="truncate pr-1">{buttonDisplay}</span>
        <div className="flex items-center gap-1 shrink-0">
          {!isAllSelected && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  handleClearAll();
                }
              }}
              title="Reset to All"
              className="p-0.5 text-slate-400 hover:text-rose-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[260px] max-w-[340px] bg-white rounded-xl border border-slate-200 shadow-xl p-2 space-y-2 animate-in fade-in zoom-in-95 duration-100">
          {/* Search box */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-slate-400 bg-slate-50 font-medium text-slate-900"
          />

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between px-1 text-[11px] font-medium border-b border-slate-100 pb-1.5">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[#0A3C2F] hover:underline cursor-pointer"
            >
              Select All ({selectableOptions.length})
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-slate-500 hover:text-rose-600 cursor-pointer"
            >
              Clear (All Projects)
            </button>
          </div>

          {/* List of options */}
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 pr-0.5">
            {/* "All Projects" Option */}
            <div
              role="button"
              tabIndex={0}
              onClick={handleClearAll}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleClearAll();
                }
              }}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                isAllSelected
                  ? "bg-emerald-50/70 text-[#0A3C2F] font-semibold"
                  : "hover:bg-slate-50 text-slate-700 font-medium"
              }`}
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                  isAllSelected
                    ? "bg-[#0A3C2F] border-[#0A3C2F] text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {isAllSelected && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <span className="truncate">{placeholder}</span>
            </div>

            {filteredOptions.length === 0 ? (
              <div className="px-2 py-3 text-slate-400 text-xs text-center">
                No matching projects
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = activeSelected.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleOption(opt.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        toggleOption(opt.value);
                      }
                    }}
                    title={opt.label}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : "hover:bg-slate-50 text-slate-700 font-medium"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                        isSelected
                          ? "bg-[#0A3C2F] border-[#0A3C2F] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Done button */}
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              {isAllSelected
                ? "All projects selected"
                : `${activeSelected.length} of ${selectableOptions.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 bg-[#0A3C2F] hover:bg-[#082d23] text-white font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
